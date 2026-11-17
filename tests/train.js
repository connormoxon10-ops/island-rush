/* The island railway: one closed loop round the island on a viaduct, and a full-size freight train running round it.
   Checks the line (a closed loop of sensible length that goes all the way round, clear of the towns, high enough over the ground and every road for traffic
   to pass under, never steeper than its grade, piers never standing in a road), the train (a locomotive and ten wagons, each several car-lengths
   long, coupled nose to tail, every vehicle sitting on the rails), that it really runs round, and that a car driven at a pier is stopped by it.
   Saves screenshots of the train passing.   usage: node tests/train.js   (needs dist/test.html: bash build.sh) ; env OUT=dir */
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = process.env.OUT || __dirname;
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await (await browser.newContext({ viewport: { width: 960, height: 540 } })).newPage(); const logs = [];
  page.on('pageerror', (e) => logs.push('PAGEERROR: ' + String(e.stack || e).slice(0, 500)));
  await page.route('**/three.min.js', (r) => r.fulfill({ path: path.resolve(__dirname, 'three.min.js'), contentType: 'application/javascript' }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.addInitScript((q) => { window.__noAdapt = true; try { localStorage.setItem('island-rush-v1', JSON.stringify({ set: { quality: q } })); } catch (e) { /* ignore */ } }, process.env.Q || 'low');
  await page.goto('file://' + path.resolve(__dirname, '../dist/test.html'));
  await page.waitForFunction(() => window.__ready || window.__bootError, null, { timeout: 170000 });
  let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
  const r = await page.evaluate(() => {
    const g = window.__game, R = g.Rail, P = R.pts, n = P.n; g.App.start(); window.requestAnimationFrame = () => 0; window.__now = performance.now();
    let minClr = 1e9, maxGrade = 0, minR = 1e9, maxR = 0, ang = 0, nearTown = 1e9, roadClr = 1e9;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n, gr = Math.abs(P.y[j] - P.y[i]) / R.dsR; maxGrade = Math.max(maxGrade, gr);
      const rr = Math.hypot(P.x[i], P.z[i]); minR = Math.min(minR, rr); maxR = Math.max(maxR, rr);
      let d = Math.atan2(P.x[j], P.z[j]) - Math.atan2(P.x[i], P.z[i]); if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; ang += d;
      if (i % 3 === 0) { const h = g.terrainHeight(P.x[i], P.z[i]); minClr = Math.min(minClr, P.y[i] - 1.3 - Math.max(h, 0)); }
      for (const T of g.towns) nearTown = Math.min(nearTown, Math.max(Math.abs(P.x[i] - T.cx), Math.abs(P.z[i] - T.cz)) - T.half);
    }
    let onRoad = 0; for (const p of R.piers) { g.terrainHeight(p.x, p.z); if (g.NR.seg >= 0 && g.NR.d < g.NR.halfW + 1) onRoad++; }
    const T = R.train, gaps = []; for (let k = 1; k < T.length; k++) gaps.push(T[k].off - T[k - 1].off - (T[k].L + T[k - 1].L) / 2);
    const carL = (() => { const b = new THREE.Box3().setFromObject(g.car.body); return Math.max(b.max.z - b.min.z, b.max.x - b.min.x) || 4.5; })();
    const sizes = T.map((t) => { t.m.geometry.computeBoundingBox(); const b = t.m.geometry.boundingBox; const s = new THREE.Vector3(); b.getSize(s); return [+s.x.toFixed(1), +s.y.toFixed(1), +s.z.toFixed(1)]; });
    const s0 = R.s, p0 = T[0].m.position.clone(); for (let i = 0; i < 300; i++) { window.__now += 1000 / 30; g.frame(window.__now); }
    const moved = T[0].m.position.distanceTo(p0), ds = ((R.s - s0) + R.L) % R.L;
    /* every vehicle on the rails: the middle of each vehicle is on the line, at rail height */
    let off = 0; const q = {}; for (const t of T) { R.at(R.s - t.off, q); off = Math.max(off, Math.hypot(t.m.position.x - q.x, t.m.position.z - q.z), Math.abs(t.m.position.y - q.y)); }
    return { L: R.L, n, piers: R.piers.length, minClr, maxGrade, minR, maxR, turns: ang / (2 * Math.PI), nearTown, onRoad, cars: T.length, gaps, sizes, carL, moved, ds, off, v: R.v };
  });
  console.log(JSON.stringify(r));
  ok(r.L > 7000 && r.L < 16000, 'one closed loop of track ' + (r.L / 1000).toFixed(1) + ' km round, ' + r.piers + ' piers');
  ok(Math.abs(Math.abs(r.turns) - 1) < 0.01, 'it goes right round the island (' + r.turns.toFixed(3) + ' turns), between ' + r.minR.toFixed(0) + ' and ' + r.maxR.toFixed(0) + ' m from the middle');
  ok(r.nearTown > 40, 'it keeps clear of every town (' + r.nearTown.toFixed(0) + ' m at the closest)');
  ok(r.minClr > 5, 'the underside of the deck is at least ' + r.minClr.toFixed(1) + ' m over the ground or the sea everywhere, so traffic passes under');
  ok(r.maxGrade < 0.045, 'no steeper than ' + (r.maxGrade * 100).toFixed(1) + ' %');
  ok(r.onRoad === 0, 'no pier stands in a road (' + r.onRoad + ')');
  ok(r.cars === 11, 'a freight train: a locomotive and ten wagons (' + r.cars + ' vehicles)');
  ok(r.sizes.every((s, i) => s[2] > 14.5 && s[2] < 20 && s[0] > 2.8 && s[0] < (i === r.sizes.length - 1 ? 5.6 : 3.6) && s[1] > 3.9 && s[1] < 4.8), 'every vehicle full size: ' + r.sizes.map((s) => s.join('x')).join(', ') + ' m');
  ok(r.sizes[1][2] / r.carL > 3.2, 'a boxcar is ' + (r.sizes[1][2] / r.carL).toFixed(1) + ' car-lengths long (car ' + r.carL.toFixed(1) + ' m)');
  ok(r.gaps.every((gp) => gp > 0.3 && gp < 1.2), 'coupled nose to tail (gaps ' + r.gaps.map((x) => x.toFixed(1)).join(' ') + ' m)');
  ok(r.moved > 150 && Math.abs(r.ds - r.v * 10) < 5, 'it runs: ' + r.ds.toFixed(0) + ' m along the line in 10 s (' + (r.v * 3.6).toFixed(0) + ' km/h)');
  ok(r.off < 0.3, 'every vehicle sits on the rails (worst ' + r.off.toFixed(2) + ' m off)');
  /* a car driven straight at a pier is stopped by it */
  const hit = await page.evaluate(() => {
    const g = window.__game, R = g.Rail, c = g.car; let pr = null;
    for (const p of R.piers) { if (p.g > 1 && p.top - p.g > 6) { g.terrainHeight(p.x, p.z); if (!(g.NR.seg >= 0 && g.NR.d < 30)) { pr = p; break; } } }
    if (!pr) return { none: true };
    const a = 0.3; g.spawnAt(pr.x - Math.sin(a) * 25, pr.z - Math.cos(a) * 25, a);
    for (let i = 0; i < 150; i++) { if (i < 60) { c.vx = Math.sin(a) * 12; c.vz = Math.cos(a) * 12; } window.__now += 1000 / 30; g.frame(window.__now); }
    const along = (c.x - pr.x) * Math.sin(a) + (c.z - pr.z) * Math.cos(a), side = Math.abs((c.x - pr.x) * Math.cos(a) - (c.z - pr.z) * Math.sin(a));
    return { along, side };
  });
  console.log(JSON.stringify(hit));
  ok(!hit.none && (hit.along < 0 || hit.side > 1.5), 'a car driven at a pier is stopped by it (or glances off it)');
  /* screenshots of the train going by */
  for (let k = 0; k < 3; k++) {
    const u = await page.evaluate((k) => {
      const g = window.__game, R = g.Rail, c = g.car, q = {}, q2 = {}; const T = R.train; R.at(R.s - T[3].off, q); R.at(R.s - T[3].off + 4, q2);
      const tx = q2.x - q.x, tz = q2.z - q.z, l = Math.hypot(tx, tz), nx = tz / l, nz = -tx / l, d = [55, 30, 90][k], sd = k === 1 ? -1 : 1;
      g.spawnAt(q.x + nx * d * sd + tx / l * 20, q.z + nz * d * sd + tz / l * 20, Math.atan2(-nx * sd, -nz * sd)); c.vx = c.vz = 0;
      g.Cam.view = 2; for (let i = 0; i < 20; i++) { c.vx = c.vz = 0; window.__now += 1000 / 30; g.frame(window.__now); }
      const cam = g.camera; cam.position.set(q.x + nx * d * sd, Math.max(g.terrainHeight(q.x + nx * d * sd, q.z + nz * d * sd), 0) + 3 + k * 6, q.z + nz * d * sd); cam.lookAt(q.x, q.y + 1, q.z); cam.updateMatrixWorld();
      g.renderer.setRenderTarget(null); g.renderer.render(g.scene, cam); return g.renderer.domElement.toDataURL('image/jpeg', 0.88);
    }, k);
    fs.writeFileSync(path.join(OUT, 'train_' + k + '.jpg'), Buffer.from(u.split(',')[1], 'base64'));
  }
  console.log(logs.length ? logs.join('\n') : 'no page errors'); ok(!logs.length, 'no page errors');
  console.log(fails ? fails + ' FAILED' : 'ALL OK'); await browser.close(); process.exit(fails ? 1 : 0);
})();
