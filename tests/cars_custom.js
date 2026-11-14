/* The hand-built cars (Sandviper buggy, Goliath monster truck, Ironside hot rod, Vortex FR open-wheeler): each is for sale, builds its own model (with
   different front and rear tyres where it should), and drives the way it is meant to: the open-wheeler is the fastest thing in the game, the hot rod is
   quick off the line, the monster truck is slow but goes; none of them goes unstable on a hard slalom.   usage: node tests/cars_custom.js   (needs dist/test.html) */
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
    const c = g.car, x0 = c.x, z0 = c.z, yaw0 = c.yaw;
    for (const id of ['buggy', 'monster', 'rod', 'formula']) {
      const d = g.CAR_BY_ID[id], m = g.buildCarModel(d, 0x2a9d4a, { static: true }), bb = new THREE.Box3().setFromObject(m), S = m.userData.S, f = S.wheels.find((w) => w.front), r = S.wheels.find((w) => !w.front);
      const o = out[id] = { name: d.name, price: d.price, h: +bb.max.y.toFixed(2), len: +(bb.max.z - bb.min.z).toFixed(2), tris: Object.values(m.userData.dm).reduce((a, mm) => a + mm.geometry.attributes.position.count / 3, 0), fr: +f.r.toFixed(2), rr: +r.r.toFixed(2) };
      g.applyCar(id, true); c.x = x0; c.z = z0; c.yaw = yaw0; c.vx = c.vz = c.w = 0; c.speed = 0; c.health = 100; c.gear = 1;
      let t100 = 0, vmax = 0; for (let i = 0; i < 60 * 20; i++) { pad.axes[0] = 0; pad.buttons[7].value = 1; g.stepSim(1 / 60); const v = Math.abs(c.speed) * 3.6; if (!t100 && v >= 100) t100 = i / 60; vmax = Math.max(vmax, v); }
      o.t100 = +t100.toFixed(1); o.vmax = Math.round(vmax);
      /* slalom at speed: steer hard left and right for 6 s, nothing may go NaN or fly off */
      let bad = false, yMax = -1e9, yMin = 1e9; for (let i = 0; i < 60 * 6; i++) { pad.axes[0] = Math.sin(i / 60 * 2.6) > 0 ? 1 : -1; pad.buttons[7].value = 0.6; g.stepSim(1 / 60); if (!(c.x === c.x && c.speed === c.speed)) bad = true; yMax = Math.max(yMax, c.y); yMin = Math.min(yMin, c.y); }
      o.stable = !bad; o.yRange = +(yMax - yMin).toFixed(1); pad.axes[0] = 0; pad.buttons[7].value = 0;
    }
    return out;
  });
  let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
  for (const id in res) { const o = res[id]; console.log(id, JSON.stringify(o)); ok(o.price > 0 && o.tris > 1200, o.name + ' is for sale and builds its own model (' + Math.round(o.tris) + ' triangles, ' + o.h + ' m tall)'); ok(o.stable, o.name + ' stays stable through a hard slalom'); }
  const B = res.buggy, M = res.monster, R = res.rod, F = res.formula;
  ok(M.h > 3 && M.fr > 0.8, 'the monster truck stands ' + M.h + ' m tall on ' + (M.fr * 2).toFixed(1) + ' m tyres');
  ok(R.fr < R.rr && F.fr <= F.rr, 'the hot rod (' + R.fr + ' / ' + R.rr + ' m) and the open-wheeler have smaller front tyres than rear');
  ok(F.vmax > Math.max(B.vmax, M.vmax, R.vmax) && F.vmax > 260 && F.t100 < 3.5, 'the open-wheeler is the fastest: 0-100 in ' + F.t100 + ' s, ' + F.vmax + ' km/h');
  ok(R.t100 > 0 && R.t100 < 5, 'the hot rod is quick off the line: 0-100 in ' + R.t100 + ' s');
  ok(M.t100 > 0 && M.t100 < 12 && M.vmax > 110 && M.vmax < 200, 'the monster truck gets going: 0-100 in ' + M.t100 + ' s, ' + M.vmax + ' km/h');
  console.log(logs.length ? logs.slice(0, 6).join('\n') : 'no page or console errors'); console.log(fails ? fails + ' FAILED' : 'ALL OK');
  await browser.close(); process.exit(fails || logs.length ? 1 : 0);
})();
