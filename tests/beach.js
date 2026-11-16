/* Beaches: the coast all round the island is sand with people on it. Finds shore all round the island (eight compass directions), drives the player there and
   runs real frames: beach spots appear (umbrellas, towels, loungers, lifeguard towers, swimmers), the people are made and posed (lying down, sitting, standing
   in the sea, strolling), dressed for the beach (bare feet, trunks or swimsuits), and a car driven into one knocks them over. Saves a screenshot per place.
   usage: node tests/beach.js   (needs dist/test.html: bash build.sh) ; env OUT=dir for the screenshots */
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = process.env.OUT || __dirname;
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await (await browser.newContext({ viewport: { width: 960, height: 540 } })).newPage(); const logs = [];
  page.on('pageerror', (e) => logs.push('PAGEERROR: ' + String(e.stack || e).slice(0, 500)));
  await page.route('**/three.min.js', (r) => r.fulfill({ path: path.resolve(__dirname, 'three.min.js'), contentType: 'application/javascript' }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.addInitScript(() => { window.__noAdapt = true; try { localStorage.setItem('island-rush-v1', JSON.stringify({ set: { quality: 'low' } })); } catch (e) { /* ignore */ } });
  await page.goto('file://' + path.resolve(__dirname, '../dist/test.html'));
  await page.waitForFunction(() => window.__ready || window.__bootError, null, { timeout: 170000 });
  await page.evaluate(() => { const g = window.__game; g.App.start(); g.Cam.view = 2; window.requestAnimationFrame = () => 0; window.__now = performance.now(); });
  let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
  /* shore in eight directions: walk out from the middle until the land is down to beach height and the cell is open beach */
  const shores = await page.evaluate(() => {
    const g = window.__game, out = [];
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + 0.2; let hit = null;
      for (let r = 1200; r < 3000 && !hit; r += 6) { const x = Math.sin(a) * r, z = Math.cos(a) * r, h = g.terrainHeight(x, z); if (h < 2.2 && h > 0.6 && g.Beach.site(x, z) === 1) hit = { x, z, h, r, a }; }
      if (hit) out.push(hit); }
    return out;
  });
  console.log('shore found in', shores.length, 'of 8 directions');
  ok(shores.length >= 6, 'open beach all round the island (' + shores.length + '/8 compass directions reach a beach)');
  const kinds = {}, poses = {}; let people = 0, barefoot = 0, dressed = 0, lying = 0, wading = 0, hit = null;
  for (let si = 0; si < shores.length; si++) {
    const s = shores[si];
    const r = await page.evaluate(([x, z, a]) => {
      const g = window.__game, c = g.car; g.spawnAt(x - Math.sin(a) * 30, z - Math.cos(a) * 30, a); c.vx = c.vz = 0; c.speed = 0;
      for (let i = 0; i < 90; i++) { window.__now += 1000 / 30; g.frame(window.__now); c.vx = c.vz = 0; c.speed = 0; }
      const B = g.Beach, live = B.live, kinds = {}, poses = {}; let ppl = 0, bare = 0, dressed = 0, lying = 0, wading = 0;
      for (const sp of live) { kinds[sp.kind] = (kinds[sp.kind] || 0) + 1; for (const p of sp.ppl) { poses[p.pose] = (poses[p.pose] || 0) + 1; if (!p.hu || p.hu.dead) continue; ppl++;
        const a = p.app; if (a.shoe === a.skin) bare++; if (a.shorts && !a.coat && !a.sleeve) dressed++;
        const R = p.hu.root; if ((p.pose === 'lie' || p.pose === 'prone') && Math.abs(Math.abs(R.rotation.x) - Math.PI / 2) < 0.01) lying++; if (p.pose === 'swim' && p.y < -0.3) wading++; } }
      const shot = g.renderer.domElement.toDataURL('image/jpeg', 0.85);
      return { spots: live.length, meshes: live.filter((s) => s.mesh).length, kinds, poses, ppl, bare, dressed, lying, wading, posed: B.ppl, shot };
    }, [s.x, s.z, s.a]);
    fs.writeFileSync(path.join(OUT, 'beach_' + si + '.jpg'), Buffer.from(r.shot.split(',')[1], 'base64'));
    console.log('  shore', si, 'at r=' + s.r + ' m:', r.spots, 'spots,', r.meshes, 'built,', r.ppl, 'people drawn', JSON.stringify(r.kinds), JSON.stringify(r.poses));
    for (const k in r.kinds) kinds[k] = (kinds[k] || 0) + r.kinds[k]; for (const k in r.poses) poses[k] = (poses[k] || 0) + r.poses[k];
    people += r.ppl; barefoot += r.bare; dressed += r.dressed; lying += r.lying; wading += r.wading;
  }
  ok(Object.keys(kinds).length >= 5, 'the beaches have umbrellas and towels, loungers, strollers, lifeguard towers and swimmers (' + JSON.stringify(kinds) + ')');
  ok(people > 40, people + ' beachgoers drawn near the camera across the stops');
  ok(barefoot === people && dressed === people, 'all of them in beachwear: ' + barefoot + ' barefoot, ' + dressed + ' in trunks or a swimsuit');
  ok(lying > 3, lying + ' people lying flat on their towels');
  ok((poses.swim || 0) === 0 || wading > 0, wading + ' people standing in the sea');
  /* knock one over: drive the car through someone standing or sitting */
  hit = await page.evaluate(([x, z, a0]) => {
    const g = window.__game, c = g.car, B = g.Beach; let tgt = null;
    g.spawnAt(x - Math.sin(a0) * 30, z - Math.cos(a0) * 30, a0); for (let i = 0; i < 60; i++) { c.vx = c.vz = 0; c.speed = 0; window.__now += 1000 / 30; g.frame(window.__now); }
    for (const sp of B.live) for (const p of sp.ppl) if (p.hu && !p.hu.dead && p.pose !== 'swim' && p.pose !== 'walk' && p.y > 0.3) { tgt = p; break; }
    if (!tgt) return { none: true };
    const a = 0.7; g.spawnAt(tgt.x - Math.sin(a) * 9, tgt.z - Math.cos(a) * 9, a);
    let dmin = 1e9; for (let i = 0; i < 40 && tgt.state !== 'down'; i++) { c.vx = Math.sin(a) * 9; c.vz = Math.cos(a) * 9; c.vy = Math.min(c.vy || 0, 0); c.speed = 9; window.__now += 1000 / 30; g.frame(window.__now); dmin = Math.min(dmin, Math.hypot(c.x - tgt.x, c.z - tgt.z)); }
    const down = tgt.state === 'down'; for (let i = 0; i < 200; i++) { c.vx = c.vz = 0; c.speed = 0; window.__now += 1000 / 30; g.frame(window.__now); }
    return { down, after: tgt.state, back: tgt.back, pose: tgt.pose0, dmin, dy: c.y - tgt.y };
  }, [shores[0].x, shores[0].z, shores[0].a]);
  console.log(JSON.stringify(hit));
  ok(!hit.none && (hit.down && hit.after !== 'down'), 'a car knocks a beachgoer over, and they get up again');
  console.log(logs.length ? logs.join('\n') : 'no page errors'); ok(!logs.length, 'no page errors');
  console.log(fails ? fails + ' FAILED' : 'ALL OK'); await browser.close(); process.exit(fails ? 1 : 0);
})();
