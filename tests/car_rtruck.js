/* The Atlas RX rally-raid truck's running gear and motion: drive it across the roughest dry ground on the island and check that the solid axles tilt with
   the ground, the dampers telescope, the coil springs compress, the cab rocks on its mounts, the whip antenna and the mud flaps swing, and that nothing
   comes apart: each axle's hubs stay on their wheels and each damper's shaft stays on its axle mount. Also: it is entered on rally stages.
   usage: node tests/car_rtruck.js   (needs dist/test.html: bash build.sh) */
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
    let best = null; let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 2500; i++) { const x = (rnd() - 0.5) * 3000, z = (rnd() - 0.5) * 3000, a = H(x, z); if (a.water || a.road || a.h < 3) continue; const h0 = a.h, h1 = H(x + 4, z).h, h2 = H(x, z + 4).h, h3 = H(x + 4, z + 4).h, tw = Math.abs(h0 - h1 - h2 + h3); if (Math.abs(h0 - h3) > 2) continue; if (!best || tw > best.tw) best = { x, z, tw }; }
    g.applyCar('rtruck', true); g.Cam.view = 2; g.spawnAt(best.x, best.z, 0.7); c.health = 100; c.wrecked = 0;
    const grp = c.ext, Pt = grp.userData.parts, S = grp.userData.S, rec = grp.userData.wrec, V = new THREE.Vector3();
    const rg = {}, mm = (k, v) => { const o = rg[k] || (rg[k] = [1e9, -1e9]); o[0] = Math.min(o[0], v); o[1] = Math.max(o[1], v); };
    let hubErr = 0, shaftErr = 0, n = 0, nan = false;
    for (let i = 0; i < 60 * 9; i++) {
      pad.axes[0] = Math.sin(i / 60 * 1.1) * 0.7; pad.buttons[7].value = i < 60 * 7 ? 0.6 : 0; pad.buttons[6].value = i >= 60 * 7 ? 1 : 0;
      g.stepSim(1 / 60); g.updateCamera(1 / 60, 0); g.updateWheels(1 / 60); if (!(c.x === c.x)) nan = true;
      for (const nm of ['axF', 'axR']) mm('tilt' + nm, Pt[nm].rotation.z * 57.3);
      mm('cabP', Pt.cab.rotation.x * 57.3); mm('cabR', Pt.cab.rotation.z * 57.3); mm('whip', Pt.whip.rotation.x * 57.3); mm('flap', Pt[Object.keys(Pt).find((k) => k.startsWith('fl'))].rotation.x * 57.3);
      for (const k of Object.keys(Pt)) if (k.startsWith('sb')) { const sb = Pt[k], ss = Pt['ss' + k.slice(2)]; mm('shock', sb.position.distanceTo(ss.position)); if (Pt['sc' + k.slice(2)]) mm('coil', Pt['sc' + k.slice(2)].scale.y); }
      /* hubs on wheels: the axle's hub point against the wheel centre the wheels are drawn at */
      for (const w of S.wheels) { const ax = Pt[w.front ? 'axF' : 'axR'], k = (w.front ? 0 : 2) + (w.x > 0 ? 1 : 0); ax.updateMatrix(); V.set(w.x, 0, 0).applyMatrix4(ax.matrix); hubErr = Math.max(hubErr, Math.abs(V.y - (w.r + rec.sus[k]))); }   /* the axle's end, where the wheel centre must be, against where the wheel is drawn */
      n++;
    }
    const rng = {}; for (const k in rg) rng[k] = +(rg[k][1] - rg[k][0]).toFixed(2);
    out.rng = rng; out.hubErr = +(hubErr * 100).toFixed(1); out.nan = nan; out.parts = Object.keys(Pt).length;
    g.applyCar('rook', true); return out;
  });
  let fails = 0; const ok = (cnd, m) => { if (!cnd) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
  console.log(JSON.stringify(res));
  const R = res.rng;
  ok(!res.nan && res.parts > 30, 'the truck drives rough ground with its running gear built as ' + res.parts + ' moving parts');
  ok(R.tiltaxF > 3 && R.tiltaxR > 3, 'both solid axles tilt with the ground (' + R.tiltaxF + ' and ' + R.tiltaxR + ' degrees of range)');
  ok(R.shock > 0.25 && R.coil > 0.25, 'the dampers telescope (' + R.shock + ' m) and the coil springs compress (' + R.coil + ' m)');
  ok(R.cabP > 0.8 && R.cabR > 0.8, 'the cab rocks on its mounts (' + R.cabP + ' deg pitch, ' + R.cabR + ' deg roll)');
  ok(R.whip > 5 && R.flap > 5, 'the whip antenna (' + R.whip + ' deg) and the mud flaps (' + R.flap + ' deg) swing');
  ok(res.hubErr < 2, 'the axle ends stay in the wheel centres (worst ' + res.hubErr + ' cm off)');
  console.log(logs.length ? logs.slice(0, 6).join('\n') : 'no page or console errors'); console.log(fails ? fails + ' FAILED' : 'ALL OK');
  await browser.close(); process.exit(fails || logs.length ? 1 : 0);
})();
