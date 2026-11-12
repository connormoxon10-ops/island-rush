/* Bank / camber bench: does the car feel the road lean? The rally stage ground is replaced by a cone around the centre of a left-hand circle (so the road leans toward or away from the
   turn by a chosen slope all the way round), the car holds the turn (throttle on a gamepad, full left lock) and we measure the lateral acceleration it settles at. Banked into the turn
   should give MORE lateral g than flat, off-camber LESS. A coasting car on a plane that leans sideways should be pulled downhill.
   usage: node tests/bench_bank.js   (needs dist/test.html: bash build.sh) */
const { chromium } = require('playwright');
const path = require('path');
const G = path.resolve(__dirname, '../dist/test.html');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 640, height: 360 } }); const page = await ctx.newPage();
  const logs = [];
  page.on('pageerror', (e) => logs.push('PAGEERROR: ' + String(e.stack || e).slice(0, 400)));
  await page.route('**/three.min.js', (r) => r.fulfill({ path: path.resolve(__dirname, 'three.min.js'), contentType: 'application/javascript' }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.addInitScript(() => { window.__noAdapt = true; try { localStorage.setItem('island-rush-v1', JSON.stringify({ set: { quality: 'low' } })); } catch (e) { /* ignore */ } });
  await page.goto('file://' + G);
  await page.waitForFunction(() => window.__ready || window.__bootError, null, { timeout: 170000 });
  const res = await page.evaluate(async () => {
    const g = window.__game, R = g.Rally, RY = g.RY, car = g.car, out = { rows: [] };
    g.App.mode = 'rlobby'; await R.start();
    R.assistOn = () => false;   /* this measures the raw tyre model: the driving assist holds the yaw rate whatever the grip, which would swamp the bank */
    const pad = { connected: true, axes: [0, 0], buttons: Array.from({ length: 16 }, () => ({ value: 0, pressed: false })) };
    navigator.getGamepads = () => [pad];
    const realGround = RY.ground, realHits = RY.hits; let cs = 0, cone = false;   /* plane: cs > 0 = the left side is higher by cs per metre. cone: cs > 0 = the circle's outside is higher (banked) */
    const X0 = 7400, Z0 = -7400, CX = X0 + 40, CZ = Z0;   /* well away from the start grid, where the rival cars wait */
    RY.ground = (x, z, o) => { realGround(x, z, o); o.h = cone ? 50 + cs * Math.hypot(x - CX, z - CZ) : 50 + cs * (x - X0); o.mu = 0.84; o.rr = 0.034; o.rough = 0.1; o.road = true; o.loose = 0.2; };
    RY.hits = (px, pz, r, o) => { o.length = 0; return o; };
    const dt = 1 / 120;
    const run = (slope, steer, v, secs, isCone) => {
      cs = slope; cone = !!isCone; R.phase = 'run'; R.clock = 0; car.x = X0; car.z = Z0; car.yaw = 0; car.vx = 0; car.vz = v; car.speed = v; car.w = 0; car.air = false; car.y = RY.heightAt(car.x, car.z) + 0; car.cs = 0; car.ayL = 0; car.steer = 0; car.rail = 0;
      let n = 0, ay = 0, na = 0, vs = 0, drift = 0;
      for (; n < secs / dt; n++) {
        pad.axes[0] = -steer; pad.buttons[7].value = Math.abs(car.speed) < v ? 0.8 : 0.25; pad.buttons[6].value = 0;
        g.stepSim(dt);
        if (n * dt > secs - 2) { ay += car.speed * car.w; vs += Math.hypot(car.vx, car.vz); na++; }
      }
      /* sideways drift velocity at the end (left positive) */
      const s = Math.sin(car.yaw), co = Math.cos(car.yaw); drift = car.vx * co - car.vz * s;
      return { ay: ay / na / 9.81, v: vs / na, drift };
    };
    for (const slope of [-0.3, -0.15, 0, 0.15, 0.3]) {   /* + = banked into the turn, - = off-camber */
      const t = run(slope, 1, 16, 7, true);   /* full left lock at 16 m/s */
      out.rows.push({ bank: slope, ay_g: +t.ay.toFixed(2), v: +t.v.toFixed(1) });
    }
    /* a car rolling straight at 14 m/s with no steering on a 0.2 slope (left high): the road pulls it to the right (negative drift) */
    for (const slope of [0, 0.2, -0.2]) { const t = run(slope, 0, 14, 3); out.rows.push({ coast: slope, drift: +t.drift.toFixed(2) }); }
    RY.ground = realGround; RY.hits = realHits;
    return out;
  });
  console.log('bank > 0: banked into the left turn; bank < 0: off-camber. coast: plane with the left side higher by that slope');
  for (const r of res.rows) console.log(JSON.stringify(r));
  const f = res.rows.filter((r) => r.bank !== undefined), flat = f.find((r) => r.bank === 0), bank = f.find((r) => r.bank === 0.3), off = f.find((r) => r.bank === -0.3);
  let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
  ok(bank.ay_g > flat.ay_g + 0.08, 'banked into the turn holds more lateral g (' + bank.ay_g + ' vs flat ' + flat.ay_g + ')');
  ok(off.ay_g < flat.ay_g - 0.05, 'off-camber holds less (' + off.ay_g + ' vs flat ' + flat.ay_g + ')');
  const c = res.rows.filter((r) => r.coast !== undefined);
  ok(c.find((r) => r.coast === 0.2).drift < -0.05 && c.find((r) => r.coast === -0.2).drift > 0.05, 'a coasting car is pulled down the cross-slope');
  console.log(logs.length ? logs.join('\n') : 'no page errors');
  console.log(fails ? fails + ' FAILED' : 'ALL OK');
  await browser.close(); process.exit(fails || logs.length ? 1 : 0);
})();
