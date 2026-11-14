/* Moving parts on the newer hand-built cars:
   - Stinger sand rail: across rough ground its trailing arms swing, its coilovers telescope, the front knuckles ride with the wheels, the whip swings;
   - Typhoon S4 rally hatch: its mud flaps blow back at speed and flap over bumps;
   - Velvet lowrider: parked it lays its body down on the ground, it pumps up to drive, and left standing it hops its nose.
   usage: node tests/cars_rigs.js   (needs dist/test.html: bash build.sh) */
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 640, height: 360 } })).newPage(); const logs = [];
  page.on('pageerror', (e) => logs.push('PAGEERROR: ' + String(e.stack || e).slice(0, 400)));
  page.on('console', (m) => { if (m.type() === 'error' && !/net::ERR|Failed to load resource/.test(m.text())) logs.push('console: ' + m.text().slice(0, 400)); });
  await page.route('**/three.min.js', (r) => r.fulfill({ path: path.resolve(__dirname, 'three.min.js'), contentType: 'application/javascript' }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.addInitScript(() => { window.__noAdapt = true; try { localStorage.setItem('island-rush-v1', JSON.stringify({ set: { quality: 'low' } })); } catch (e) { /* ignore */ } });
  await page.goto('file://' + path.resolve(__dirname, '../dist/test.html'));
  await page.waitForFunction(() => window.__ready || window.__bootError, null, { timeout: 170000 });
  const res = await page.evaluate(() => {
    const g = window.__game, out = {}; g.App.start(); const pad = { connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 16 }, () => ({ value: 0, pressed: false })) }; navigator.getGamepads = () => [pad];
    const c = g.car, gs = { h: 0, mu: 1, rr: 0, rough: 0, road: false, water: false, loose: 0 }, H = (x, z) => { g.groundAt(x, z, gs); return gs; };
    let best = null, s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 2500; i++) { const x = (rnd() - 0.5) * 3000, z = (rnd() - 0.5) * 3000, a = H(x, z); if (a.water || a.road || a.h < 3) continue; const h0 = a.h, h1 = H(x + 3, z).h, h2 = H(x, z + 3).h, h3 = H(x + 3, z + 3).h, tw = Math.abs(h0 - h1 - h2 + h3); if (Math.abs(h0 - h3) > 1.6) continue; if (!best || tw > best.tw) best = { x, z, tw }; }
    let hold = false; const step = (n, thr, st) => { for (let i = 0; i < n; i++) { pad.axes[0] = st ? Math.sin(i / 60 * 1.2) * st : 0; pad.buttons[7].value = thr; if (hold) { c.vx = c.vz = c.w = 0; c.speed = 0; } g.stepSim(1 / 60); g.updateCamera(1 / 60, 0); g.updateWheels(1 / 60); } };
    const rng = (fn, n, thr, st) => { let lo = 1e9, hi = -1e9; for (let i = 0; i < n; i++) { step(1, thr, st); const v = fn(); lo = Math.min(lo, v); hi = Math.max(hi, v); } return +(hi - lo).toFixed(3); };
    /* sand rail */
    g.applyCar('sandrail', true); g.Cam.view = 2; g.spawnAt(best.x, best.z, 0.7); c.health = 100; c.wrecked = 0; let Pt = c.ext.userData.parts;
    const UP = new THREE.Vector3(), arm = () => Math.asin(UP.set(0, 1, 0).applyQuaternion(Pt['ra-1'].quaternion).y) * 57.3, damp = () => Pt['db' + 'r-1'].position.distanceTo(Pt['ds' + 'r-1'].position), knee = () => Pt['kn1'].position.y - c.ext.userData.wrec.sus[1];
    out.rail = { arm: rng(arm, 360, 0.6, 0.6), damp: rng(damp, 360, 0.6, 0.6), knee: rng(knee, 60, 0.6, 0.6), whip: rng(() => Pt.whip.rotation.x * 57.3, 240, 0.6, 0.6), parts: Object.keys(Pt).length };
    /* rally hatch flaps */
    g.applyCar('rallyhatch', true); g.Cam.view = 2; g.spawnAt(best.x, best.z, 0.7); c.health = 100; c.wrecked = 0; Pt = c.ext.userData.parts;
    out.hatch = { flap: rng(() => Pt[Object.keys(Pt)[0]].rotation.x * 57.3, 360, 0.7, 0.5) };
    /* lowrider: a flat road would be best, but any spot will do: park, drive, park and wait */
    g.applyCar('lowrider', true); g.Cam.view = 2; g.spawnAt(best.x + 40, best.z + 40, 0); c.health = 100; c.wrecked = 0; const dm = c.ext.userData.dm;
    hold = true; step(150, 0, 0); hold = false; out.low = { parked: +dm.P.position.y.toFixed(3) }; step(150, 0.5, 0); out.low.driving = +dm.P.position.y.toFixed(3);
    pad.buttons[7].value = 0; hold = true; step(360, 0, 0);   /* held still: parked, even on a slope */
    out.low.spd = +Math.abs(c.speed).toFixed(3); out.low.hop = rng(() => dm.P.rotation.x * 57.3, 300, 0, 0); out.low.spd2 = +Math.abs(c.speed).toFixed(3); hold = false;
    g.applyCar('rook', true); return out;
  });
  let fails = 0; const ok = (cnd, m) => { if (!cnd) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
  console.log(JSON.stringify(res)); const R = res.rail, L = res.low;
  ok(R.parts >= 20 && R.arm > 5 && R.damp > 0.08 && R.knee < 0.001 && R.whip > 5, 'sand rail: trailing arms swing ' + R.arm + ' deg, coilovers telescope ' + R.damp + ' m, knuckles stay on the wheels, whip swings ' + R.whip + ' deg');
  ok(res.hatch.flap > 8, 'rally hatch: mud flaps swing ' + res.hatch.flap + ' deg');
  ok(L.parked < -0.07 && L.driving > -0.03, 'lowrider: lays down when parked (' + L.parked + ' m) and pumps up to drive (' + L.driving + ' m)');
  ok(L.hop > 3, 'lowrider: left standing it hops its nose (' + L.hop + ' deg)');
  console.log(logs.length ? logs.slice(0, 6).join('\n') : 'no page or console errors'); console.log(fails ? fails + ' FAILED' : 'ALL OK');
  await browser.close(); process.exit(fails || logs.length ? 1 : 0);
})();
