/* Mount Cinder and the Eruption Escape. Checks the volcano's shape (a tall cone, a deep crater, the observatory shelf flat, well clear of the towns
   and the roads), that it is alive (a lava lake, three lava rivers, smoke), that lava burns a car, then the mission: start it at base camp and you
   are at the observatory; it erupts; a lava bomb that lands on you hurts; sit still and the lava flow catches you; drive down (an autopilot
   steering for each checkpoint) and you escape to Ashfall with bombs falling all the way. Saves screenshots.
   usage: node tests/volcano.js   (needs dist/test.html) ; env OUT=dir */
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = process.env.OUT || __dirname;
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await (await browser.newContext({ viewport: { width: 960, height: 540 } })).newPage(); const logs = [];
  page.on('pageerror', (e) => logs.push('PAGEERROR: ' + String(e.stack || e).slice(0, 600)));
  await page.route('**/three.min.js', (r) => r.fulfill({ path: path.resolve(__dirname, 'three.min.js'), contentType: 'application/javascript' }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.addInitScript(() => {
    window.__noAdapt = true; try { localStorage.setItem('island-rush-v1', JSON.stringify({ money: 50000, set: { quality: 'low', traffic: 'off' } })); } catch (e) { /* ignore */ }
    const pad = { connected: true, axes: [0, 0], buttons: Array.from({ length: 16 }, () => ({ value: 0, pressed: false })) }; navigator.getGamepads = () => [pad]; window.__pad = pad;
  });
  await page.goto('file://' + path.resolve(__dirname, '../dist/test.html'));
  await page.waitForFunction(() => window.__ready || window.__bootError, null, { timeout: 170000 });
  let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
  const shot = async (name) => { const u = await page.evaluate(() => window.__game.renderer.domElement.toDataURL('image/jpeg', 0.85)); fs.writeFileSync(path.join(OUT, 'volcano_' + name + '.jpg'), Buffer.from(u.split(',')[1], 'base64')); };
  await page.evaluate(() => {
    const g = window.__game; g.App.start(); window.requestAnimationFrame = () => 0; window.__now = performance.now();
    window.__run = (n, f) => { for (let i = 0; i < n; i++) { if (f && f(i) === false) return i; window.__now += 1000 / 30; g.frame(window.__now); } return n; };
    window.__res = []; const r0 = g.UI.result; g.UI.result = function (ok, title) { window.__res.push({ ok, title }); return r0.apply(this, arguments); };
    window.__fired = 0; const f0 = g.Volc.fire; g.Volc.fire = function () { window.__fired++; return f0.apply(this, arguments); };
  });
  /* the shape */
  const sh = await page.evaluate(() => {
    const g = window.__game, V = g.VOLC, th = g.terrainHeight; let top = -1e9;
    for (let a = 0; a < 6.28; a += 0.2) top = Math.max(top, th(V.x + Math.cos(a) * V.RIM, V.z + Math.sin(a) * V.RIM));
    const floor = th(V.x + 20, V.z - 10), pad = [0, 1, 2, 3].map((k) => th(V.px + Math.cos(k * 1.57) * 10, V.pz + Math.sin(k * 1.57) * 10)), padS = (Math.max(...pad) - Math.min(...pad)) / 20;
    const town = Math.min(...g.towns.map((t) => Math.hypot(t.cx - V.x, t.cz - V.z))); let road = 1e9; for (const r of g.roads) for (const p of r.pts) road = Math.min(road, Math.hypot(p.x - V.x, p.z - V.z));
    return { B: V.B, top, floor, padS, town, road, lake: g.volcLakeY() };
  });
  console.log(JSON.stringify(sh));
  ok(sh.top - sh.B > 260, 'a tall cone: the rim stands ' + Math.round(sh.top - sh.B) + ' m over its foot');
  ok(sh.top - sh.floor > 45 && sh.lake > sh.floor && sh.lake < sh.top - 30, 'a crater ' + Math.round(sh.top - sh.floor) + ' m deep, with its lava lake inside');
  ok(sh.padS < 0.05, 'the observatory shelf is flat (' + sh.padS.toFixed(3) + ')');
  ok(sh.town > 1200 && sh.road > 950, 'clear of the towns (' + Math.round(sh.town) + ' m) and the roads (' + Math.round(sh.road) + ' m)');
  /* alive: lake, rivers, smoke; and a view of it from base camp */
  const vis = await page.evaluate(() => {
    const g = window.__game, Vo = g.Volc, def = g.missions.find((m) => m.id === 'mvolc'); g.loadAround(def.x, def.z, 30);
    const V = g.VOLC; g.spawnAt(def.x, def.z, Math.atan2(V.x - def.x, V.z - def.z) + Math.PI); window.__run(240);
    return { lake: !!Vo.lake, chans: Vo.chans.length, puffs: Vo.puffs.filter((p) => p.visible).length, mission: !!def, title: def && def.title, cps: def && def.cps.length };
  });
  await page.evaluate(() => { const g = window.__game; g.Cam.lookYaw = Math.PI; window.__run(8); }); await shot('basecamp');
  ok(vis.lake && vis.chans === 3 && vis.puffs >= 3, 'a lava lake, three lava rivers and smoke rising (' + vis.puffs + ' puffs)');
  ok(vis.mission && vis.cps === 5, 'the mission: ' + vis.title);
  /* lava burns */
  const burn = await page.evaluate(() => {
    const g = window.__game, V = g.VOLC, c = g.car, d = 330, a = V.chan[0] + 0.11 * Math.sin(d * 0.0075); const x = V.x + Math.cos(a) * d, z = V.z + Math.sin(a) * d;
    g.loadAround(x, z, 20); g.spawnAt(x, z, a + Math.PI / 2); c.health = 100; const on = g.Volc.lava(x, z, g.terrainHeight(x, z)); window.__run(30); const hp = c.health; c.health = 100; return { on, hp };
  });
  ok(burn.on && burn.hp < 85, 'drive into a lava river and the car burns (health ' + Math.round(burn.hp) + ')');
  /* steering: which way the stick turns the car */
  const sgn = await page.evaluate(() => {
    const g = window.__game, c = g.car, pad = window.__pad, def = g.missions.find((m) => m.id === 'mvolc'); g.spawnAt(def.x, def.z, 0); const y0 = c.yaw;
    window.__run(40, (i) => { pad.buttons[7].value = 0.6; pad.axes[0] = i > 15 ? 1 : 0; }); pad.buttons[7].value = 0; pad.axes[0] = 0; const dy = c.yaw - y0; window.__run(20, () => { pad.buttons[6].value = 1; }); pad.buttons[6].value = 0; return dy > 0 ? 1 : -1;
  });
  /* the mission: sit still and the lava gets you (and a bomb on the car hurts) */
  const still = await page.evaluate(() => {
    const g = window.__game, c = g.car, def = g.missions.find((m) => m.id === 'mvolc'), V = g.VOLC, res = {}; window.__res.length = 0; c.health = 100; g.save.set.dev = true; g.Dev.god = true;   /* only the lava can end this one */
    g.startMission(def); res.atPad = Math.hypot(c.x - V.px, c.z - V.pz) < 3; res.started = !!g.Mi;
    window.__run(200, () => g.Mi && g.Mi.phase === 'countdown'); res.run = g.Mi && g.Mi.phase === 'run';
    window.__run(20); res.front = g.Volc.front.visible && g.Volc.fMat.uniforms.uFront.value > V.RIM - 20;
    const b = g.Volc.bombs[0]; g.Volc.fire(); b.on = true; b.x1 = c.x + 1; b.z1 = c.z; b.y1 = g.terrainHeight(b.x1, b.z1); const hp = c.health; g.Volc.land(b); res.bombHp = hp - c.health; res.hits = g.Mi && g.Mi.vol.hits; c.health = 100;
    window.__run(60); res.shotT = 1;
    return res;
  });
  await shot('erupting');
  const still2 = await page.evaluate(() => { const g = window.__game; const n = window.__run(1500, () => !!g.Mi); g.Dev.god = false; g.save.set.dev = false; return { n, res: window.__res.slice(), done: !!g.save.done.mvolc, health: g.car.health }; });
  console.log(JSON.stringify(still), JSON.stringify(still2));
  ok(still.started && still.atPad && still.run, 'start it at base camp: you are up at the observatory, and after the countdown it erupts');
  ok(still.front, 'a lava flow pours over the rim');
  ok(still.bombHp > 20 && still.hits === 1, 'a lava bomb that lands on you hurts (−' + Math.round(still.bombHp) + ')');
  ok(still2.res.length === 1 && !still2.res[0].ok && still2.res[0].title === 'ENGULFED' && !still2.done, 'sit still and the lava catches you (' + (still2.res[0] && still2.res[0].title) + ' after ' + Math.round(still2.n / 30) + ' s)');
  /* the escape: an autopilot steers for each checkpoint, holding about 25 m/s down the slope */
  const esc = await page.evaluate((sgn) => {
    const g = window.__game, c = g.car, pad = window.__pad, def = g.missions.find((m) => m.id === 'mvolc'); window.__res.length = 0; window.__fired = 0;
    g.save.set.dev = true; g.Dev.god = true; c.health = 100; if (c.wrecked > 0) { c.wrecked = 0; }
    g.startMission(def); let maxGap = 1e9, rings = 0, pic = 0;
    const n = window.__run(3200, (i) => {
      const M = g.Mi; if (!M) return false; if (M.phase !== 'run') { pad.buttons[7].value = 0; return; }
      const cp = M.cps[M.idx]; const want = Math.atan2(cp.x - c.x, cp.z - c.z); let e = want - c.yaw; e -= Math.round(e / (2 * Math.PI)) * 2 * Math.PI;
      pad.axes[0] = Math.max(-1, Math.min(1, e * 2.2)) * sgn; const v = Math.abs(c.speed); pad.buttons[7].value = v < 24 ? 1 : 0; pad.buttons[6].value = v > 30 ? 0.6 : 0;
      const V = g.VOLC, s = (c.x - V.x) * V.ux + (c.z - V.z) * V.uz; maxGap = Math.min(maxGap, s - g.Volc.fMat.uniforms.uFront.value); rings = Math.max(rings, g.Volc.bombs.filter((b) => b.on).length);
      if (i % 90 === 0) (window.__tr || (window.__tr = [])).push([Math.round(M.t), Math.round(s), Math.round(g.Volc.fMat.uniforms.uFront.value), Math.round(Math.abs(c.speed)), M.idx]);
      if (!pic && M.t > 12) { pic = 1; window.__pic = g.renderer.domElement.toDataURL('image/jpeg', 0.85); }
    });
    pad.buttons[7].value = 0; pad.buttons[6].value = 0; pad.axes[0] = 0; g.Dev.god = false; g.save.set.dev = false;
    return { n, res: window.__res.slice(), done: g.save.done.mvolc, fired: window.__fired, maxGap: Math.round(maxGap), rings, mi: !!g.Mi, tr: window.__tr };
  }, sgn);
  { const u = await page.evaluate(() => window.__pic); if (u) fs.writeFileSync(path.join(OUT, 'volcano_escape.jpg'), Buffer.from(u.split(',')[1], 'base64')); }
  await shot('escaped');
  console.log(JSON.stringify(esc));
  ok(esc.res.length === 1 && esc.res[0].ok && esc.res[0].title === 'YOU ESCAPED' && esc.done, 'drive down ahead of the lava: ' + (esc.res[0] && esc.res[0].title) + ' in ' + Math.round(esc.n / 30) + ' s');
  ok(esc.fired >= 15 && esc.rings >= 1, 'lava bombs rain down all the way (' + esc.fired + ' fired, warning rings on the ground)');
  ok(esc.maxGap < 120, 'the lava stays close behind you (' + esc.maxGap + ' m at its closest)');
  console.log(logs.length ? logs.slice(0, 10).join('\n') : 'no page errors'); ok(!logs.length, 'no page errors');
  console.log(fails ? fails + ' FAILED' : 'ALL OK'); await browser.close(); process.exit(fails ? 1 : 0);
})();
