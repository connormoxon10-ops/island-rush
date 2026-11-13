/* The Sandviper dune buggy: it is for sale, its model builds as a tube frame on knobby tyres with a lot of ground clearance, it drives like a light buggy (quick to
   100 km/h, not a top-speed car), and it can be chosen as the rally car (the lobby choice is saved, and the stage hands it to you).
   usage: node tests/car_buggy.js   (needs dist/test.html: bash build.sh) */
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
  const r = await page.evaluate(async () => {
    const g = window.__game, d = g.CAR_BY_ID.buggy, out = { name: d && d.name, price: d && d.price };
    const m = g.buildCarModel(d, 0xff6a13, { static: true }); const bb = new THREE.Box3().setFromObject(m); out.h = +bb.max.y.toFixed(2); out.paintTris = m.userData.dm.P.geometry.attributes.position.count / 3; out.clear = +(d.body.y0 - 0.1).toFixed(2);
    g.App.start(); g.applyCar('buggy', true); const pad = { connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 16 }, () => ({ value: 0, pressed: false })) }; navigator.getGamepads = () => [pad];
    const c = g.car; let t100 = 0, vmax = 0; for (let i = 0; i < 60 * 16; i++) { pad.buttons[7].value = 1; g.stepSim(1 / 60); const v = Math.abs(c.speed) * 3.6; if (!t100 && v >= 100) t100 = i / 60; vmax = Math.max(vmax, v); }
    out.t100 = +t100.toFixed(1); out.vmax = Math.round(vmax); pad.buttons[7].value = 0;
    g.applyCar('rook', true); g.App.mode = 'rlobby'; g.save.rally.car = 'buggy'; g.save.rally.rivals = 0; await g.Rally.start(); out.rallyCar = g.save.car; out.rallyOn = g.Rally.on; g.Rally.exit(true); out.after = g.save.car;   /* back in the Rook you arrived in */
    return out;
  });
  console.log(JSON.stringify(r));
  let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
  ok(r.name === 'Sandviper' && r.price > 0, 'the Sandviper is in the dealership ($' + r.price + ')');
  ok(r.paintTris > 1500 && r.h > 1.7 && r.clear > 0.5, 'it builds as a painted tube frame ' + r.h + ' m tall with ' + r.clear + ' m of ground clearance');
  ok(r.t100 > 0 && r.t100 < 8 && r.vmax > 140 && r.vmax < 220, 'it drives like a light buggy: 0-100 km/h in ' + r.t100 + ' s, ' + r.vmax + ' km/h after 16 s');
  ok(r.rallyOn && r.rallyCar === 'buggy' && r.after === 'rook', 'chosen in the rally lobby, the stage hands it to you, and you get your own car back after');
  console.log(logs.length ? logs.slice(0, 6).join('\n') : 'no page or console errors'); console.log(fails ? fails + ' FAILED' : 'ALL OK');
  await browser.close(); process.exit(fails || logs.length ? 1 : 0);
})();
