/* Suspension travel: every wheel reaches for the ground under it. Drive a few cars across rough, uneven ground and check that each wheel moves on its own
   (left and right, front and rear differently), that the tyres meet the ground far better than with the wheels fixed to the body, that travel stays inside
   each car's limit (a monster truck moves a lot, an open-wheeler hardly at all), that the wheels hang down in the air, and that on a flat road they sit still.
   usage: node tests/suspension1.js   (needs dist/test.html: bash build.sh) */
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 640, height: 360 } })).newPage(); const logs = [];
  page.on('pageerror', (e) => logs.push('PAGEERROR: ' + String(e.stack || e).slice(0, 400)));
  page.on('console', (m) => { if (m.type() === 'error' && !/net::ERR|Failed to load resource/.test(m.text())) logs.push('console: ' + m.text().slice(0, 400)); });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.addInitScript(() => { window.__noAdapt = true; try { localStorage.setItem('island-rush-v1', JSON.stringify({ set: { quality: 'low' } })); } catch (e) { /* ignore */ } });
  await page.goto('file://' + path.resolve(__dirname, '../dist/test.html'));
  await page.waitForFunction(() => window.__ready || window.__bootError, null, { timeout: 170000 });
  const res = await page.evaluate(() => {
    const g = window.__game, out = {}; g.App.start(); const pad = { connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 16 }, () => ({ value: 0, pressed: false })) }; navigator.getGamepads = () => [pad];
    const c = g.car, gs = { h: 0, mu: 1, rr: 0, rough: 0, road: false, water: false, loose: 0 }, H = (x, z) => { g.groundAt(x, z, gs); return gs; };
    /* find rough, dry, off-road ground: the biggest diagonal twist over a 3 m square, away from the sea */
    let best = null; const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
    for (let i = 0; i < 2500; i++) { const x = (rnd() - 0.5) * 3000, z = (rnd() - 0.5) * 3000, a = H(x, z); if (a.water || a.road || a.h < 3) continue;
      const h0 = a.h, h1 = H(x + 3, z).h, h2 = H(x, z + 3).h, h3 = H(x + 3, z + 3).h, tw = Math.abs(h0 - h1 - h2 + h3), sl = Math.abs(h0 - h3); if (sl > 1.6) continue; if (!best || tw > best.tw) best = { x, z, tw }; }
    out.spot = best;
    const run = (id, x, z, yaw, secs, thr, steer) => {
      g.applyCar(id, true); g.Cam.view = 2; g.spawnAt(x, z, yaw); c.health = 100; c.wrecked = 0; c.nitro = 0; const rec = c.ext.userData.wrec, S = rec.S, tr = S.b.susp != null ? S.b.susp : 0.1;
      let n = 0, gapS = 0, gap0 = 0, maxAbs = 0, indep = 0, airDroop = 1e9, steps = Math.round(secs * 60); const lo = [9, 9, 9, 9], hi = [-9, -9, -9, -9];
      for (let i = 0; i < steps; i++) {
        pad.axes[0] = steer ? Math.sin(i / 60 * 1.3) * steer : 0; pad.buttons[7].value = thr; g.stepSim(1 / 60); g.updateCamera(1 / 60, 0); g.updateWheels(1 / 60);
        const s = rec.sus, e = rec.obj.matrixWorld.elements;
        for (let k = 0; k < 4; k++) { lo[k] = Math.min(lo[k], s[k]); hi[k] = Math.max(hi[k], s[k]); maxAbs = Math.max(maxAbs, Math.abs(s[k])); }
        if (c.air) { airDroop = Math.min(airDroop, Math.min(...s)); continue; }
        if (i < 30) continue;
        for (const w of S.wheels) { const k = (w.front ? 0 : 2) + (w.x > 0 ? 1 : 0), yb = (y) => e[1] * w.x + e[5] * y + e[9] * w.z + e[13] - w.r;
          gapS += Math.abs(yb(w.r + s[k]) - c.wh[k]); gap0 += Math.abs(yb(w.r) - c.wh[k]); n++; }
        indep = Math.max(indep, Math.abs((s[0] - s[1]) - (s[2] - s[3])));   /* front and rear axles twisting differently */
      }
      pad.buttons[7].value = 0; pad.axes[0] = 0;
      return { id, tr, gap: +(gapS / Math.max(1, n) * 100).toFixed(1), gap0: +(gap0 / Math.max(1, n) * 100).toFixed(1), range: lo.map((l, k) => +((hi[k] - l) * 100).toFixed(1)), maxAbs: +(maxAbs * 100).toFixed(1), indep: +(indep * 100).toFixed(1), airDroop: airDroop < 1e8 ? +(airDroop * 100).toFixed(1) : null, nan: !(c.x === c.x) };
    };
    const B = best; out.rough = ['buggy', 'monster', 'overland', 'rook', 'formula'].map((id) => run(id, B.x, B.z, 0.7, 7, 0.45, 0.6));
    /* a flat road: find a straight bit of road, drive along it gently */
    let road = null; for (let i = 0; i < 4000 && !road; i++) { const x = (rnd() - 0.5) * 2500, z = (rnd() - 0.5) * 2500, a = H(x, z); if (!a.road) continue; for (const yaw of [0, Math.PI / 2]) { let ok = true, h0 = a.h; for (let d = -12; d <= 40 && ok; d += 2) { const q = H(x + Math.sin(yaw) * d, z + Math.cos(yaw) * d); if (!q.road || Math.abs(q.h - h0) > 0.6) ok = false; } if (ok) { road = { x, z, yaw }; break; } } }
    out.road = road && run('rook', road.x, road.z, road.yaw, 3, 0.25, 0);
    /* in the air: drop the buggy from a height */
    g.applyCar('buggy', true); g.Cam.view = 2; g.spawnAt(B.x, B.z, 0); c.y += 4; c.air = true; c.vy = 0; const rec = c.ext.userData.wrec; for (let i = 0; i < 20; i++) { g.stepSim(1 / 60); g.updateCamera(1 / 60, 0); g.updateWheels(1 / 60); }
    out.drop = { air: c.air, droop: +(Math.min(...rec.sus) * 100).toFixed(1), tr: rec.S.b.susp * 100 };
    g.applyCar('rook', true);
    return out;
  });
  let fails = 0; const ok = (cnd, m) => { if (!cnd) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
  console.log('rough spot', JSON.stringify(res.spot)); for (const r of res.rough) console.log(JSON.stringify(r)); console.log('road', JSON.stringify(res.road)); console.log('drop', JSON.stringify(res.drop));
  const R = Object.fromEntries(res.rough.map((r) => [r.id, r]));
  for (const r of res.rough) {
    ok(!r.nan, r.id + ': physics stays sane');
    ok(r.gap < r.gap0 * 0.75 || r.gap0 < 1.5, r.id + ': tyres meet the ground better (mean gap ' + r.gap + ' cm against ' + r.gap0 + ' cm with fixed wheels)');
    ok(r.maxAbs <= r.tr * 100 + 0.5, r.id + ': travel stays within its ' + Math.round(r.tr * 100) + ' cm (max ' + r.maxAbs + ' cm)');
  }
  for (const id of ['buggy', 'monster', 'overland', 'rook']) ok(Math.min(...R[id].range) > 1.5 && R[id].indep > 1, id + ': every wheel moves on its own over rough ground (ranges ' + R[id].range.join('/') + ' cm, axle twist ' + R[id].indep + ' cm)');
  ok(Math.max(...R.monster.range) > Math.max(...R.formula.range) * 3, 'the monster truck moves far more than the open-wheeler (' + Math.max(...R.monster.range) + ' vs ' + Math.max(...R.formula.range) + ' cm)');
  ok(res.road && Math.max(...res.road.range) < 6, 'on a flat road the wheels stay nearly still (ranges ' + (res.road ? res.road.range.join('/') : '-') + ' cm)');
  ok(res.drop.air && res.drop.droop < -res.drop.tr * 0.6, 'in the air the wheels hang down (' + res.drop.droop + ' cm of ' + res.drop.tr + ')');
  console.log(logs.length ? logs.slice(0, 6).join('\n') : 'no page or console errors'); console.log(fails ? fails + ' FAILED' : 'ALL OK');
  await browser.close(); process.exit(fails || logs.length ? 1 : 0);
})();
