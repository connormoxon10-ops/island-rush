/* The Basilisk DR drag coupe against the starter Rook GT and the Phantom R hypercar, on the drag strip's flat tarmac (the far wall moved out of the way):
   quarter-mile time, top speed after 45 s flat out, and the lateral g it holds at full lock at 25 m/s. It must be far quicker in a line than both and corner far worse.
   usage: node tests/car_basilisk.js */
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 640, height: 360 } })).newPage();
  const logs = []; page.on('pageerror', (e) => logs.push('PAGEERROR: ' + String(e.stack || e).slice(0, 500)));
  await page.route('**/three.min.js', (r) => r.fulfill({ path: path.resolve(__dirname, 'three.min.js'), contentType: 'application/javascript' }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.addInitScript(() => { window.__noAdapt = true; try { localStorage.setItem('island-rush-v1', JSON.stringify({ set: { quality: 'low' } })); } catch (e) { /* ignore */ } });
  await page.goto('file://' + path.resolve(__dirname, '../dist/test.html'));
  await page.waitForFunction(() => window.__ready || window.__bootError, null, { timeout: 170000 });
  const res = await page.evaluate(async () => {
    const g = window.__game, out = []; g.App.start(); const pad = { connected: true, axes: [0, 0], buttons: Array.from({ length: 16 }, () => ({ value: 0, pressed: false })) }; navigator.getGamepads = () => [pad];
    for (const id of ['rook', 'phantom', 'basilisk']) {
      g.save.owned[id] = true; if (g.Drag.on) g.Drag.exit(true); g.App.setCar(id); g.App.mode = 'rlobby'; g.Drag.tier = 0; await g.Drag.start();
      const D = g.Drag, car = g.car, dt = 1 / 120; g.DG.END = 9000; g.DG.HW = 400; let n = 0, vmax = 0;
      /* quarter mile, then keep the throttle down for 45 s */
      while (n++ < 120 * 60 && !(D.phase === 'run' && D.clock > D.tGreen + 45)) { const al = Math.atan2((g.DG.X0 - g.DG.LANE) - car.x, 30) - car.yaw; pad.axes[0] = -Math.max(-1, Math.min(1, al * 4)); pad.buttons[7].value = D.phase === 'run' || D.phase === 'done' ? 1 : 0; g.stepSim(dt); vmax = Math.max(vmax, Math.abs(car.speed)); if (D.phase === 'done') D.phase = 'run'; }
      const et = D.me.tFin - D.me.tBeam, trap = D.me.vFin * 3.6;
      /* cornering: 25 m/s, full left lock, average lateral g over 3 s */
      car.vx = 0; car.vz = 25; car.speed = 25; car.yaw = 0; car.w = 0; car.x = g.DG.X0; let ay = 0, k = 0;
      for (let i = 0; i < 480; i++) { pad.axes[0] = -1; pad.buttons[7].value = Math.abs(car.speed) < 25 ? 0.6 : 0.2; g.stepSim(dt); if (i > 120) { ay += Math.abs(car.speed * car.w); k++; } }
      out.push({ id, name: g.Drag.rival.def.name, et: +et.toFixed(2), trapKmh: Math.round(trap), topKmh: Math.round(vmax * 3.6), latG: +(ay / k / 9.81).toFixed(2), price: g.Drag.rival.def.price }); g.DG.END = 830; g.DG.HW = 9.4;
    }
    g.Drag.exit(true); return out;
  });
  for (const r of res) console.log(JSON.stringify(r));
  const [rook, ph, ba] = res; let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
  ok(ba.et < ph.et - 0.8 && ba.et < rook.et - 3, 'quarter mile: Basilisk ' + ba.et + ' s, Phantom ' + ph.et + ' s, Rook ' + rook.et + ' s');
  ok(ba.topKmh > ph.topKmh + 60 && ba.topKmh > 380, 'top speed: Basilisk ' + ba.topKmh + ' km/h, Phantom ' + ph.topKmh + ', Rook ' + rook.topKmh);
  ok(ba.latG < rook.latG * 0.7 && ba.latG < ph.latG * 0.5, 'cornering at full lock: Basilisk ' + ba.latG + ' g, Phantom ' + ph.latG + ' g, Rook ' + rook.latG + ' g');
  ok(ba.price > ph.price * 2, 'it is the most expensive car by far ($' + ba.price + ' vs $' + ph.price + ')');
  console.log(logs.length ? logs.join('\n') : 'no page errors'); console.log(fails ? fails + ' FAILED' : 'ALL OK');
  await browser.close(); process.exit(fails || logs.length ? 1 : 0);
})();
