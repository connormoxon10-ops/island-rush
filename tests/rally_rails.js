/* Rock faces and stone walls with the real car: the car is pointed at each kind of wall at a shallow angle and driven flat out with the wheel straight (assist off, so nothing steers it away).
   It must never get through the face, must lose speed while it scrapes (but not stop dead), must keep moving along the wall, and must take damage only when it really hits.
   usage: node tests/rally_rails.js   (needs dist/test.html: bash build.sh) */
const { chromium } = require('playwright');
const path = require('path');
const G = path.resolve(__dirname, '../dist/test.html');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 640, height: 360 } }); const page = await ctx.newPage();
  const logs = [];
  page.on('pageerror', (e) => logs.push('PAGEERROR: ' + String(e.stack || e).slice(0, 400)));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.addInitScript(() => { window.__noAdapt = true; try { localStorage.setItem('island-rush-v1', JSON.stringify({ set: { quality: 'low' } })); } catch (e) { /* ignore */ } });
  await page.goto('file://' + G);
  await page.waitForFunction(() => window.__ready || window.__bootError, null, { timeout: 170000 });
  const R0 = await page.evaluate(async () => {
    const g = window.__game, R = g.Rally, RY = g.RY, car = g.car, out = []; out.nets = [];
    g.App.mode = 'rlobby'; g.save.rally.rivals = 0; await R.start(); R.assistOn = () => false;
    const pad = { connected: true, axes: [0, 0], buttons: Array.from({ length: 16 }, () => ({ value: 0, pressed: false })) }; navigator.getGamepads = () => [pad];
    const tmp = {}, o = {}, dt = 1 / 120;
    /* a spot in the middle of every wall (a bend or a straight), pointed at the wall by a few degrees */
    const rails = [{ e: 19, at: 14, side: -1, name: 'rock face (into the right hairpin)', curve: true }, { e: 18, at: 80, side: 1, name: 'stone wall (outside of the long right)', curve: true }, { e: 15, at: 40, side: 1, name: 'gorge (left face)' }, { e: 15, at: 40, side: -1, name: 'gorge (right face)' }];
    for (const r of rails) {
      const s = RY.starts[r.e] + r.at, q = RY.at(s, 0, tmp), ang = 7 * Math.PI / 180;
      R.phase = 'run'; R.placeAt(s, 0); g.RW.reset(R.sim); g.App.dmg = 0; car.health = 100; R.stuck = 0;
      /* yaw toward the wall: heading change toward the left is positive yaw, so +side*ang turns toward that side */
      car.yaw = q.yaw + r.side * ang; const v = 26; car.vx = Math.sin(car.yaw) * v; car.vz = Math.cos(car.yaw) * v; car.speed = v; car.w = 0;
      let maxPen = -9, minV = 99, n = 0, scrape = 0, vEnd = 0, vHit = 0;
      for (; n < 4 / dt; n++) {
        pad.axes[0] = 0; pad.buttons[7].value = 1; pad.buttons[6].value = 0; g.stepSim(dt);
        RY.nearest(car.x, car.z, -1, 0, o); const i = Math.min(RY.N - 2, o.seg), hw = RY.hw[i], R_ = r.side > 0 ? RY.rails.L : RY.rails.R, face = hw + R_.g[i];
        const pen = r.side * o.l - face; if (R_.g[i] > 0 && R_.h[i] >= 0.5) maxPen = Math.max(maxPen, pen); if (face - r.side * o.l < 1.12) { if (!scrape) vHit = Math.abs(car.speed); scrape++; } if (scrape) minV = Math.min(minV, Math.abs(car.speed));   /* touching: the centre is within a car's half width of the face */
      }
      vEnd = Math.abs(car.speed); out.push({ curve: !!r.curve, name: r.name, maxPenCentre: +maxPen.toFixed(2), scrapeSteps: scrape, speedAtFirstScrape: +vHit.toFixed(1), minSpeedAfter: +minV.toFixed(1), endSpeed: +vEnd.toFixed(1), health: +car.health.toFixed(0), s: +R.s.toFixed(0), from: +s.toFixed(0) });
    }
    /* crash nets: driven into at 30 m/s and a shallow angle they catch the car within half a metre of the net, take most of the speed and do no damage */
    for (let k = 0; k < RY.railsList().length; k++) {
      const rl = RY.railsList()[k]; if (rl.k !== 'net') continue;
      const s = RY.starts[rl.e] + rl.at + rl.len * 0.45, q = RY.at(s, 0, tmp), ang = 14 * Math.PI / 180, side = rl.side;
      R.phase = 'run'; R.placeAt(s - 20, 0); g.App.dmg = 0; car.health = 100; R.stuck = 0; car.yaw = RY.at(s - 20, 0, {}).yaw + side * ang; const v = 30; car.vx = Math.sin(car.yaw) * v; car.vz = Math.cos(car.yaw) * v; car.speed = v; car.w = 0;
      let maxPen = -9, vMin = 99;
      for (let n = 0; n < 2.5 / dt; n++) { pad.axes[0] = 0; pad.buttons[7].value = 0.5; pad.buttons[6].value = 0; g.stepSim(dt); RY.nearest(car.x, car.z, -1, 0, o); const i = Math.min(RY.N - 2, o.seg), face = RY.hw[i] + rl.gap; maxPen = Math.max(maxPen, side * o.l + 1.0 - face); if (side * o.l > face - 2.4) vMin = Math.min(vMin, Math.hypot(car.vx, car.vz)); }   /* (at an angle the front corner meets the net while the centre is still 1.5 m off it) */
      out.nets.push({ e: rl.e, maxPen: +maxPen.toFixed(2), vMin: +vMin.toFixed(1), health: Math.round(car.health) });
    }
    return { rows: out, nets: out.nets };
  });
  let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
  const res = R0.rows, nets = R0.nets || [];
  for (const n of nets) { console.log(JSON.stringify(n)); ok(n.maxPen < 0.6, 'crash net e' + n.e + ' catches the car (' + n.maxPen + ' m into it)'); ok(n.health >= 99, 'crash net e' + n.e + ' does no damage (health ' + n.health + ')'); ok(n.vMin < 25, 'crash net e' + n.e + ' takes speed off (down to ' + n.vMin + ' m/s)'); }
  ok(nets.length > 0, 'the stage has crash nets');
  for (const r of res) {
    console.log(JSON.stringify(r));
    /* the car's centre stays about a car's half width inside the face; the scrape drags it down but never stops it dead; it keeps going along the wall */
    ok(r.maxPenCentre < -0.7, r.name + ': the car never gets through the face (centre ' + (-r.maxPenCentre) + ' m inside it)');
    ok(r.scrapeSteps > 20, r.name + ': it scrapes the wall (' + r.scrapeSteps + ' sub-steps)');
    if (!r.curve) ok(r.minSpeedAfter > 4, r.name + ': it keeps moving along the wall (slowest ' + r.minSpeedAfter + ' m/s)');   /* on a bend, pointed straight at the wall with the throttle down, it is allowed to pin itself */
    ok(r.minSpeedAfter < r.speedAtFirstScrape - 2, r.name + ': the scrape takes speed off (' + r.speedAtFirstScrape + ' -> ' + r.minSpeedAfter + ' m/s)');
    ok(r.s > r.from + 25, r.name + ': it travelled on along the road (' + (r.s - r.from) + ' m)');
  }
  console.log(logs.length ? logs.join('\n') : 'no page errors');
  console.log(fails ? fails + ' FAILED' : 'ALL OK');
  await browser.close(); process.exit(fails || logs.length ? 1 : 0);
})();
