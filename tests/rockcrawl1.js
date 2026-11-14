/* Rock crawling: the big off-roaders (Goliath monster truck, Nomad 4x4, Sandviper buggy) drive up and over rocks lower than their climb height, with the
   wheels riding up the rock and the body lifting, while an ordinary car still hits the same rock like a wall. A rock taller than the climb height still stops
   even the monster truck.   usage: node tests/rockcrawl1.js   (needs dist/test.html: bash build.sh) */
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
    const c = g.car, CH = 160, gs = { h: 0, mu: 1, rr: 0, rough: 0, road: false, water: false, loose: 0 }, H = (x, z) => { g.groundAt(x, z, gs); return gs.h; };
    let s = 3; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    /* a lone rock of a given height on fairly level, dry ground, with 16 m of clear run-up and run-out on some heading */
    const find = (h0, h1) => {
      for (let t = 0; t < 60; t++) {
        const x0 = (rnd() - 0.5) * 3600, z0 = (rnd() - 0.5) * 3600; g.loadAround(x0, z0, 30); const cx = Math.floor(x0 / CH), cz = Math.floor(z0 / CH), all = [];
        for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const ch = g.Chunks.get(cx + dx, cz + dz); if (ch) for (const o of ch.cols.c) all.push(o); }
        for (const o of all) {
          const hh = o[4] - o[3]; if (o[6] !== 1 || hh < h0 || hh > h1 || o[2] > 2.6) continue; g.groundAt(o[0], o[1], gs); if (gs.water || gs.road) continue;
          for (const yaw of [0, 1.57, 3.14, 4.71, 0.8, 2.4]) {
            const fx = Math.sin(yaw), fz = Math.cos(yaw); let okk = true; const hc = H(o[0], o[1]);
            for (let d = -18; d <= 18 && okk; d += 2) { const px = o[0] + fx * d, pz = o[1] + fz * d; if (Math.abs(H(px, pz) - hc) > 1.4) okk = false;
              for (const q of all) { if (q === o) continue; if (Math.hypot(px - q[0], pz - q[1]) < q[2] + 2.4) { okk = false; break; } } }
            if (okk) return { x: o[0], z: o[1], r: o[2], h: hh, yaw };
          }
        }
      }
      return null;
    };
    const drive = (id, R, thr) => {
      g.applyCar(id, true); g.Cam.view = 2; const fx = Math.sin(R.yaw), fz = Math.cos(R.yaw); const off = thr ? g.CARP.track / 2 : 0, rx = Math.cos(R.yaw), rz = -Math.sin(R.yaw);   /* slow runs: the left wheels go straight over the rock rather than straddling it */
      g.spawnAt(R.x - fx * (thr ? 7 : 15) + rx * off, R.z - fz * (thr ? 7 : 15) + rz * off, R.yaw); c.health = 100; c.wrecked = 0; c.nitro = 0;
      let crash = 0, lift = 0, prog = -1e9, nan = false, air = 0, vmax = 0; c.roll0 = 0;
      for (let i = 0; i < 60 * 7; i++) {
        pad.axes[0] = 0; pad.buttons[7].value = thr || 0.55; if (thr && Math.abs(c.speed) > 3.2) pad.buttons[7].value = 0; c.crashFlag = 0; g.stepSim(1 / 60); g.updateCamera(1 / 60, 0); g.updateWheels(1 / 60);
        crash = Math.max(crash, c.crashFlag || 0); const p = (c.x - R.x) * fx + (c.z - R.z) * fz; c.roll0 = Math.max(c.roll0 || 0, Math.abs(c.roll)); prog = Math.max(prog, p);
        if (Math.abs(p) < 2) lift = Math.max(lift, c.y - H(c.x, c.z)); if (!(c.x === c.x)) nan = true; if (c.air && Math.abs(p) < 4) air += 1 / 60; vmax = Math.max(vmax, Math.abs(c.speed));
      }
      pad.buttons[7].value = 0; return { id, crash: +crash.toFixed(1), lift: +lift.toFixed(2), past: +prog.toFixed(1), health: Math.round(c.health), nan, roll: +((c.roll0 || 0) * 57.3).toFixed(0), air: +air.toFixed(2), vmax: +(vmax * 3.6).toFixed(0) };
    };
    const low = find(0.6, 0.8); out.low = low;
    if (low) out.lowRuns = ['monster', 'overland', 'buggy', 'rook'].map((id) => drive(id, low));
    if (low) out.slowRuns = ['monster', 'overland', 'buggy'].map((id) => drive(id, low, 0.5));
    const tall = find(1.65, 3.5); out.tall = tall; if (tall) out.tallRun = drive('monster', tall);
    g.applyCar('rook', true);
    return out;
  });
  let fails = 0; const ok = (cnd, m) => { if (!cnd) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
  console.log('low rock', JSON.stringify(res.low)); for (const r of res.lowRuns || []) console.log(JSON.stringify(r)); console.log('tall rock', JSON.stringify(res.tall), JSON.stringify(res.tallRun));
  for (const r of res.slowRuns || []) { console.log('slow', JSON.stringify(r)); ok(r.past > 3 && r.crash < 2 && r.air < 0.2 && r.lift > 0.15 && r.roll > 5, r.id + ' crawls one side over it at walking pace (' + r.vmax + ' km/h, past by ' + r.past + ' m, body lifted ' + r.lift + ' m and rolled ' + r.roll + ' deg, ' + r.air + ' s in the air)'); }
  ok(res.low, 'found a lone rock ' + (res.low ? res.low.h.toFixed(2) + ' m tall' : '') + ' to drive at');
  const L = Object.fromEntries((res.lowRuns || []).map((r) => [r.id, r]));
  for (const id of ['monster', 'overland', 'buggy']) { const r = L[id]; ok(r && !r.nan && r.past > 6 && r.crash < 3 && r.lift > 0.2, id + ' climbs up and over it (' + (r ? 'past by ' + r.past + ' m, body lifted ' + r.lift + ' m, impact ' + r.crash + ' m/s' : '-') + ')'); }
  const rk = L.rook; ok(rk && rk.past < 1 && rk.crash > 3, 'an ordinary car still hits it like a wall (' + (rk ? 'stopped at ' + rk.past + ' m, impact ' + rk.crash + ' m/s' : '-') + ')');
  const T = res.tallRun; ok(!res.tall || (T && T.past < 1 && T.crash > 2), 'a rock taller than the monster truck can climb still stops it (' + (T ? 'stopped at ' + T.past + ' m' : 'no tall rock found') + ')');
  console.log(logs.length ? logs.slice(0, 6).join('\n') : 'no page or console errors'); console.log(fails ? fails + ' FAILED' : 'ALL OK');
  await browser.close(); process.exit(fails || logs.length ? 1 : 0);
})();
