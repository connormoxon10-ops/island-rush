/* Gold Rush: the golden car on the freight train. Checks the site (a ramp beside the viaduct whose lip sits a few metres under the open wagon's floor,
   a clear run-up), that the train is a freight train with the heist wagon last, then flies the real car physics up the ramp at a range of timings
   and finds the window that lands it inside the wagon through the open door; then takes the gold car (grand theft auto: wanted), drives it out of
   the back onto the viaduct deck (which holds it up), and delivers it into the garage for the reward and the car. Also checks a car is bounced
   off a closed wagon, not let through it. Saves screenshots.   usage: node tests/heist.js   (needs dist/test.html: bash build.sh) ; env OUT=dir */
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = process.env.OUT || __dirname;
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await (await browser.newContext({ viewport: { width: 960, height: 540 } })).newPage(); const logs = [];
  page.on('pageerror', (e) => logs.push('PAGEERROR: ' + String(e.stack || e).slice(0, 500)));
  await page.route('**/three.min.js', (r) => r.fulfill({ path: path.resolve(__dirname, 'three.min.js'), contentType: 'application/javascript' }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.addInitScript(() => { window.__noAdapt = true; try { localStorage.setItem('island-rush-v1', JSON.stringify({ set: { quality: 'low' } })); } catch (e) { /* ignore */ } });
  await page.goto('file://' + path.resolve(__dirname, '../dist/test.html'));
  await page.waitForFunction(() => window.__ready || window.__bootError, null, { timeout: 170000 });
  let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
  const shot = async (name) => { const u = await page.evaluate(() => { const g = window.__game; window.__now += 1000 / 30; g.frame(window.__now); return g.renderer.domElement.toDataURL('image/jpeg', 0.85); }); fs.writeFileSync(path.join(OUT, name), Buffer.from(u.split(',')[1], 'base64')); };
  const info = await page.evaluate(() => {
    const g = window.__game; g.App.start(); window.requestAnimationFrame = () => 0; window.__now = performance.now(); g.Cam.view = 2;
    const pad = { connected: true, axes: [0, 0], buttons: Array.from({ length: 16 }, () => ({ value: 0, pressed: false })) }; navigator.getGamepads = () => [pad]; window.__pad = pad;
    const H = g.Heist, S = H.site, R = g.Rail; if (!S) return { none: true };
    return { mode: g.App.mode, kinds: R.train.map((t) => t.kind), lip: S.g + S.RH, floor: S.floor, g0: S.g, RH: S.RH, run: Math.hypot(S.sx - S.lipX, S.sz - S.lipZ), owned: !!g.save.owned.aurum, aurum: !!g.CAR_BY_ID.aurum, gold: !!H.gold };
  });
  console.log(JSON.stringify(info));
  ok(!info.none, 'the Gold Rush site was found beside the viaduct');
  ok(info.kinds && info.kinds[0] === 'loco' && info.kinds[info.kinds.length - 1] === 'heist' && info.kinds.includes('tank') && info.kinds.includes('flat') && info.kinds.includes('box'), 'a freight train: ' + (info.kinds || []).join(', '));
  ok(info.floor - info.lip > 2.5 && info.floor - info.lip < 5, 'the ramp lip is ' + (info.floor - info.lip).toFixed(1) + ' m under the wagon floor (' + info.RH.toFixed(1) + ' m tall ramp)');
  ok(info.aurum && info.gold && !info.owned, 'the Aurum Spectre rides in the heist wagon, not yet yours');
  /* the jump, at a range of timings: drive from 40 m before the foot of the ramp at full throttle; the train is placed so the door arrives `dt` s after a nominal arrival */
  const tryJump = (off) => page.evaluate((off) => {
    const g = window.__game, c = g.car, H = g.Heist, S = H.site, R = g.Rail, pad = window.__pad;
    H.phase = 'armed'; R.v = 16; H.wasAir = false; H.ride = null; window.__cross = null; c.health = 100; c.wrecked = 0; g.Wanted.set && g.Wanted.set(0);
    const back = 40; g.spawnAt(S.bx + S.rx * back, S.bz + S.rz * back, S.yaw); c.vx = -S.rx * 26; c.vz = -S.rz * 26; c.speed = 26; c.air = false; H.rampT = -9;
    /* nominal: about (back + RL) / 27 s to the lip, and the flight */
    const tNom = (back + 24) / 27 + 13 / 25; const t = R.heist, want = S.s - 3.25 + t.off - (tNom + off) * R.v; R.s = ((want % R.L) + R.L) % R.L; R.update(0);
    let caught = false, minLat = 1e9, maxY = -1e9, pics = 0;
    for (let i = 0; i < 150; i++) {
      pad.buttons[7].value = 1; pad.axes[0] = 0; window.__now += 1000 / 30; g.frame(window.__now); maxY = Math.max(maxY, c.y); { const L = {}; R.toLocal(R.heist, c.x, c.y, c.z, L); if (Math.abs(L.x) < 4 && !window.__cross) window.__cross = { x: +L.x.toFixed(1), y: +L.y.toFixed(1), z: +L.z.toFixed(1) }; if (window.__pic && L.x < 12 && L.x > 6 && !window.__picU) window.__picU = g.renderer.domElement.toDataURL('image/jpeg', 0.85); }
      if (H.phase === 'aboard') { caught = true; break; } if (H.tries > 0) break;
    }
    pad.buttons[7].value = 0; return { caught, maxY: +maxY.toFixed(1), tries: H.tries, phase: H.phase, cross: window.__cross };
  }, off);
  const res = [], ins = [];
  for (const off of [-0.75, -0.6, -0.45, -0.3, -0.15, 0, 0.15, 0.3]) {
    const r = await tryJump(off); res.push(off + ':' + (r.caught ? 'IN' : 'miss') + '(' + r.maxY + ' ' + JSON.stringify(r.cross) + ')'); if (r.caught) ins.push(off);
    await page.evaluate(() => { const g = window.__game, H = g.Heist; H.tries = 0; H.ride = null; H.phase = 'armed'; });
  }
  const caughtAt = ins.length ? ins[Math.floor(ins.length / 2)] : null;
  if (caughtAt != null) { await page.evaluate(() => { window.__pic = true; window.__picU = null; }); await tryJump(caughtAt); const u = await page.evaluate(() => window.__picU); if (u) fs.writeFileSync(path.join(OUT, 'heist_jump.jpg'), Buffer.from(u.split(',')[1], 'base64')); }
  console.log('  jumps:', res.join(' '));
  ok(ins.length >= 2, 'a well-timed jump off the ramp lands the car in the wagon through the open door (' + ins.length + ' of 8 timings 0.15 s apart get in: a window of about ' + (ins.length * 0.15).toFixed(2) + ' s)');
  if (caughtAt != null) {
    await page.evaluate(() => { const g = window.__game; for (let i = 0; i < 30; i++) { window.__now += 1000 / 30; g.frame(window.__now); } }); await shot('heist_aboard.jpg');
    const a = await page.evaluate(() => { const g = window.__game, c = g.car, R = g.Rail, q = {}; R.toLocal(R.heist, c.x, c.y, c.z, q); return { lx: q.x, ly: q.y, lz: q.z, phase: g.Heist.phase }; });
    ok(a.phase === 'aboard' && Math.abs(a.lx) < 0.3 && Math.abs(a.ly - 1.32) < 0.2, 'the car rides in the wagon, parked on its floor (' + a.lx.toFixed(2) + ', ' + a.ly.toFixed(2) + ', ' + a.lz.toFixed(2) + ')');
    const tk = await page.evaluate(() => { const g = window.__game; const prev = g.save.car; g.Heist.key('KeyF'); return { phase: g.Heist.phase, car: g.save.car, prev, stars: g.Wanted.stars }; });
    ok(tk.phase === 'ride' && tk.car === 'aurum' && tk.prev !== 'aurum', 'F: out of the ' + tk.prev + ' and into the Aurum Spectre');
    ok(tk.stars >= 3, 'grand theft auto: ' + tk.stars + ' stars');
    const out = await page.evaluate(() => {
      const g = window.__game, c = g.car, pad = window.__pad, R = g.Rail; let t = 0;
      for (let i = 0; i < 120 && g.Heist.phase === 'ride'; i++) { pad.buttons[7].value = 1; window.__now += 1000 / 30; g.frame(window.__now); t++; }
      pad.buttons[7].value = 0; const ph = g.Heist.phase;
      for (let i = 0; i < 60; i++) { pad.buttons[6].value = 1; window.__now += 1000 / 30; g.frame(window.__now); } pad.buttons[6].value = 0;
      const n = {}; R.near(c.x, c.z, n); return { ph, frames: t, y: c.y, deck: n.y + 0.05, lat: n.lat, health: c.health };
    });
    console.log(JSON.stringify(out));
    ok(out.ph === 'escape', 'throttle: the Aurum drives out of the back of the wagon (' + out.frames + ' frames)');
    ok(Math.abs(out.y - out.deck) < 0.6, 'and lands on the viaduct deck, which holds it up (car ' + out.y.toFixed(1) + ' m, deck ' + out.deck.toFixed(1) + ' m)');
    await shot('heist_escape.jpg');
    const win = await page.evaluate(() => {
      const g = window.__game, c = g.car, G = g.GAR, m0 = g.save.money; g.spawnAt(G.ox, G.oz - 6, Math.PI); c.vx = c.vz = 0;
      for (let i = 0; i < 40 && g.Heist.phase === 'escape'; i++) { window.__now += 1000 / 30; g.frame(window.__now); }
      return { phase: g.Heist.phase, owned: !!g.save.owned.aurum, paid: g.save.money - m0, inside: G.inside };
    });
    console.log(JSON.stringify(win));
    ok(win.owned && win.paid >= 250000 && win.phase === 'idle', 'driven into the garage: the Aurum is yours and $' + win.paid + ' paid');
  }
  /* a car driven at a closed wagon bounces off it */
  const bump = await page.evaluate(() => {
    const g = window.__game, c = g.car, R = g.Rail, t = R.train[3]; g.Heist.phase = 'idle';
    R.v = 0; R.update(0); const q = {}; R.toWorld(t, -1.6, 0, 0, q); const yaw = t.yaw + Math.PI / 2;
    g.spawnAt(q.x, q.z, yaw); c.y = q.y; c.vx = Math.sin(yaw) * 3; c.vz = Math.cos(yaw) * 3;
    let pen = 0; for (let i = 0; i < 40; i++) { window.__now += 1000 / 30; g.frame(window.__now); const L = {}; R.toLocal(t, c.x, c.y, c.z, L); pen = Math.max(pen, -(L.x + 1.5)); }
    R.v = 22; const L = {}; R.toLocal(t, c.x, c.y, c.z, L); return { lx: L.x, pen };
  });
  console.log(JSON.stringify(bump));
  ok(bump.lx < -2.3, 'a car that runs into a wagon on the viaduct is shoved back out of it, never through it (it ends ' + (-bump.lx).toFixed(1) + ' m from the middle of the wagon)');
  console.log(logs.length ? logs.join('\n') : 'no page errors'); ok(!logs.length, 'no page errors');
  console.log(fails ? fails + ' FAILED' : 'ALL OK'); await browser.close(); process.exit(fails ? 1 : 0);
})();
