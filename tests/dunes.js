/* Dune Dash: a dune-buggy race track on the beach. Checks the site (on the coast, shaped into sand dunes with jump dunes on the course), that the course
   is sand to drive on and shows on the map, then races it: E at the start beam lends you the Sandviper, five rival buggies line up, the countdown runs and
   everybody races a lap (the player on a simple autopilot through the real controls). The rivals must get round on their own, the race must finish
   with a place and prize money, and your own car must come back afterwards. Saves screenshots.
   usage: node tests/dunes.js   (needs dist/test.html: bash build.sh) ; env OUT=dir, LAPS=n */
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = process.env.OUT || __dirname, LAPS = +(process.env.LAPS || 1);
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
    const g = window.__game, D = g.Dunes, S = D.s; g.App.start(); window.requestAnimationFrame = () => 0; window.__now = performance.now(); g.Cam.view = 2;
    const pad = { connected: true, axes: [0, 0], buttons: Array.from({ length: 16 }, () => ({ value: 0, pressed: false })) }; navigator.getGamepads = () => [pad]; window.__pad = pad;
    if (!S) return { none: true };
    let hmin = 1e9, hmax = -1e9, seaNear = 1e9, maxStep = 0, jump = 0; const o = {};
    for (let i = 0; i < S.n; i++) { const h = g.terrainHeight(S.px[i], S.pz[i]); hmin = Math.min(hmin, h); hmax = Math.max(hmax, h); const j = (i + 1) % S.n, h2 = g.terrainHeight(S.px[j], S.pz[j]); maxStep = Math.max(maxStep, Math.abs(h2 - h) / S.ds); }
    for (const jI of S.jumps) { const a = g.terrainHeight(S.px[(jI - 9 + S.n) % S.n], S.pz[(jI - 9 + S.n) % S.n]), b = g.terrainHeight(S.px[jI], S.pz[jI]), c = g.terrainHeight(S.px[(jI + 5) % S.n], S.pz[(jI + 5) % S.n]); jump = Math.max(jump, Math.min(b - a, b - c)); }
    for (let a = 0; a < 6.3; a += 0.1) for (let r = 0; r < 400; r += 10) { if (g.terrainHeight(S.cx + Math.sin(a) * r, S.cz + Math.cos(a) * r) < 0) { seaNear = Math.min(seaNear, r); break; } }
    g.groundAt(S.px[40], S.pz[40], o);
    let mapOk = true; try { g.Dunes.drawFull(document.createElement('canvas').getContext('2d'), 1); } catch (e) { mapOk = String(e); }
    return { L: S.L, n: S.n, hmin, hmax, maxStep, jump, seaNear, mu: o.mu, mapOk, car: g.save.car };
  });
  console.log(JSON.stringify(info));
  ok(!info.none, 'the Dune Dash site was found on the coast');
  ok(info.L > 800 && info.L < 1400, 'a closed course ' + (info.L || 0).toFixed(0) + ' m round');
  ok(info.seaNear < 300, 'by the sea (' + info.seaNear + ' m from the middle of the site)');
  ok(info.hmax - info.hmin > 2 && info.jump > 1.2, 'over the dunes: the course rises and falls ' + (info.hmax - info.hmin).toFixed(1) + ' m, with jump dunes ' + info.jump.toFixed(1) + ' m proud');
  ok(info.maxStep < 0.6, 'no wall on the course (steepest ' + (info.maxStep * 100).toFixed(0) + ' %)');
  ok(info.mu < 0.85 && info.mu > 0.55, 'driving on sand (grip ' + (info.mu || 0).toFixed(2) + ')');
  ok(info.mapOk === true, 'it draws on the map');
  const st = await page.evaluate((laps) => {
    const g = window.__game, D = g.Dunes, S = D.s, c = g.car; g.spawnAt(S.ox, S.oz, 0); for (let i = 0; i < 10; i++) { c.vx = c.vz = 0; window.__now += 1000 / 30; g.frame(window.__now); }
    const near = D.near; D.laps = laps; D.key('KeyE'); return { near, on: D.on, car: g.save.car, bots: D.bots.length };
  }, LAPS);
  console.log(JSON.stringify(st));
  ok(st.near && st.on && st.car === 'buggy' && st.bots === 5, 'E at the start beam: in a lent Sandviper on the grid with ' + st.bots + ' rival buggies');
  await page.evaluate(() => { const g = window.__game; for (let i = 0; i < 130 && g.Dunes.phase === 'grid'; i++) { window.__now += 1000 / 30; g.frame(window.__now); } });
  await shot('dunes_start.jpg');
  /* race: the player on a pure-pursuit autopilot through the gamepad */
  const race = await page.evaluate(() => {
    const g = window.__game, D = g.Dunes, S = D.s, c = g.car, pad = window.__pad; let frames = 0, pic = null, resets = 0; const r0 = {};
    for (const b of D.bots) r0[b.name] = 0;
    const R0 = g.renderer.render; g.renderer.render = function () {};   /* (no drawing while racing: much faster in software GL) */
    while (D.on && frames < 30 * 240) {
      const i = (D.me.idx + Math.round(Math.max(6, Math.abs(c.speed) * 0.35))) % S.n, dx = S.px[i] - c.x, dz = S.pz[i] - c.z, err = Math.atan2(Math.sin(Math.atan2(dx, dz) - c.yaw), Math.cos(Math.atan2(dx, dz) - c.yaw));
      const k = Math.abs(S.k[(D.me.idx + 8) % S.n]), vt = k > 0.01 ? Math.min(26, Math.sqrt(0.55 * 9.81 / k)) : 26;
      pad.axes[0] = Math.max(-1, Math.min(1, -err * 2.2)); pad.buttons[7].value = Math.abs(c.speed) < vt ? 1 : 0.2; pad.buttons[6].value = Math.abs(c.speed) > vt + 4 ? 0.6 : 0;
      window.__now += 1000 / 30; g.frame(window.__now); frames++;
      if (frames === 600) { g.renderer.render = R0; window.__now += 1000 / 30; g.frame(window.__now); pic = g.renderer.domElement.toDataURL('image/jpeg', 0.85); g.renderer.render = function () {}; }
      if (D.res && !window.__res) window.__res = { res: D.res, order: D.order().map((e) => e.name + (e.fin ? ' ' + e.time.toFixed(1) : ' @' + Math.round(e.prog))), botsFin: D.bots.filter((b) => b.fin || b.prog > D.laps * S.n * 0.75).length };
    }
    pad.buttons[7].value = 0; pad.axes[0] = 0; g.renderer.render = R0;
    return { frames, res: window.__res || null, on: D.on, car: g.save.car, pic, me: D.me && { prog: D.me.prog, lap: D.me.lap } };
  });
  if (race.pic) fs.writeFileSync(path.join(OUT, 'dunes_race.jpg'), Buffer.from(race.pic.split(',')[1], 'base64')); delete race.pic;
  console.log(JSON.stringify(race));
  ok(race.res && race.res.res.pos >= 1, 'the race finishes: P' + (race.res && race.res.res.pos) + (race.res ? ' in ' + race.res.res.time.toFixed(1) + ' s, prize ' + race.res.res.prize : ''));
  ok(race.res && race.res.botsFin >= 3, 'the rival buggies race round too (' + (race.res ? race.res.botsFin : 0) + ' of 5 home or on the last quarter when you finish): ' + (race.res ? race.res.order.join(', ') : ''));
  ok(!race.on && race.car !== 'buggy', 'afterwards your own car is given back (' + race.car + ')');
  console.log(logs.length ? logs.join('\n') : 'no page errors'); ok(!logs.length, 'no page errors');
  console.log(fails ? fails + ' FAILED' : 'ALL OK'); await browser.close(); process.exit(fails ? 1 : 0);
})();
