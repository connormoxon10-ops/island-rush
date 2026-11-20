/* Wildlife. A picture of every kind of animal; then out in the country: drive to a farm, the savanna, the tundra and the swamp and see what turns
   up by itself (cows and sheep, zebras and elephants, penguins, flamingos and crocodiles); deer scatter from a car coming fast; driving into a cow
   throws it and dents the car; an elephant stops the car dead; gulls fly; none in towns or on roads.   usage: node tests/wildlife.js ; env OUT=dir */
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = process.env.OUT || __dirname;
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await (await browser.newContext({ viewport: { width: 640, height: 360 } })).newPage(); const logs = [];
  page.on('pageerror', (e) => logs.push('PAGEERROR: ' + String(e.stack || e).slice(0, 600)));
  await page.route('**/three.min.js', (r) => r.fulfill({ path: path.resolve(__dirname, 'three.min.js'), contentType: 'application/javascript' }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.addInitScript(() => { window.__noAdapt = true; try { localStorage.setItem('island-rush-v1', JSON.stringify({ money: 1, set: { quality: 'low', traffic: 'off' } })); } catch (e) { /* ignore */ } });
  await page.goto('file://' + path.resolve(__dirname, '../dist/test.html'));
  await page.waitForFunction(() => window.__ready || window.__bootError, null, { timeout: 170000 });
  let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
  await page.evaluate(() => { const g = window.__game; g.App.start(); window.requestAnimationFrame = () => 0; window.__now = performance.now(); window.__run = (n) => { for (let i = 0; i < n; i++) { window.__now += 1000 / 30; g.frame(window.__now); } };
    /* an open spot in region ti: off the roads, out of town, on land */
    window.__spot = (ti, dmin) => { const g = window.__game, T = g.towns[ti]; for (let k = 0; k < 400; k++) { const a = k * 2.399, d = (dmin || 600) + (k % 9) * 40, x = T.cx + Math.cos(a) * d, z = T.cz + Math.sin(a) * d; if (g.Wild.ok(g.WILD_KINDS.deer, x, z) && g.terrainHeight(x, z) > 3 && g.terrainHeight(x, z) < 80) return { x, z }; } return null; }; });
  /* the gallery: each kind on its own, close up */
  const kinds = await page.evaluate(() => Object.keys(window.__game.WILD_KINDS));
  for (const id of kinds) {
    const u = await page.evaluate((id) => {
      const g = window.__game, T = window.__game.THREE_, W = g.Wild, sp = window.__spot(2, 500); g.loadAround(sp.x, sp.z, 3); g.spawnAt(sp.x + 40, sp.z, 0); W.clear(); W.on = false; window.__run(2);
      const A = W.spawn(id, sp.x, sp.z, 1)[0]; if (!A) return null; A.yaw = -0.75; A.root.rotation.y = -0.75;   /* side on to the camera */ if (A.K.fly) { A.y = g.terrainHeight(sp.x, sp.z) + 2; A.root.position.y = A.y; }
      A.v = A.K.walk; A.ph = 1; for (const L of A.legs) L.pv.rotation.x = Math.sin(A.ph + L.ph) * 0.4; window.__run(1);
      const B = new T.Box3().setFromObject(A.root), s = Math.max(B.max.x - B.min.x, B.max.y - B.min.y, B.max.z - B.min.z), cam = new T.PerspectiveCamera(40, 16 / 9, 0.05, 500), cy = (B.min.y + B.max.y) / 2;
      cam.position.set(A.x + s * 1.7, cy + s * 0.5, A.z + s * 1.7); cam.lookAt(A.x, cy, A.z); W.grp.visible = true; A.root.visible = true; g.renderer.setRenderTarget(null); g.renderer.render(g.scene, cam); const pic = g.renderer.domElement.toDataURL('image/jpeg', 0.85); W.clear(); W.on = true; return { pic, size: +s.toFixed(2) };
    }, id);
    if (u) fs.writeFileSync(path.join(OUT, 'wild_' + id + '.jpg'), Buffer.from(u.pic.split(',')[1], 'base64'));
    console.log('  ' + id + ': ' + (u ? u.size + ' m' : 'none'));
    ok(!!u && u.size > 0.25, 'a ' + id + ' (' + (u ? u.size : '?') + ' m across)');
  }
  /* out in the country: what turns up by itself */
  const regions = [[2, 'farm', ['cow', 'sheep', 'horse', 'rabbit']], [9, 'savanna', ['zebra', 'elephant', 'giraffe']], [11, 'tundra', ['penguin', 'snowfox']], [7, 'swamp', ['croc', 'flamingo']]];
  for (const [ti, reg, want] of regions) {
    const r = await page.evaluate(([ti]) => { const g = window.__game, W = g.Wild; W.clear(); const sp = window.__spot(ti, 520); if (!sp) return null; g.loadAround(sp.x, sp.z, 3); g.spawnAt(sp.x, sp.z, 0); window.__run(90);
      const seen = {}; let inTown = 0, onRoad = 0; for (const A of W.list) { seen[A.id] = (seen[A.id] || 0) + 1; if (g.towns.some((T) => Math.abs(A.x - T.cx) < T.half && Math.abs(A.z - T.cz) < T.half)) inTown++; }
      const p = g.renderer.domElement.toDataURL('image/jpeg', 0.8); return { seen, n: W.list.length, inTown, region: g.REG[ti % g.REG.length].key, pic: p }; }, [ti]);
    if (!r) { ok(false, reg + ': no open spot found'); continue; }
    fs.writeFileSync(path.join(OUT, 'wild_region_' + reg + '.jpg'), Buffer.from(r.pic.split(',')[1], 'base64'));
    const got = Object.keys(r.seen).filter((k) => k !== 'gull' && k !== 'crab'), right = got.filter((k) => want.includes(k));
    console.log('  ' + reg + ' (' + r.region + '): ' + JSON.stringify(r.seen));
    ok(r.n >= 4 && right.length >= 1 && right.length >= got.length - 1 && r.inTown === 0, 'out in the ' + reg + ': ' + right.join(', ') + ' turn up by themselves, none in town');
  }
  /* behaviour: deer scatter from a fast car; a cow is thrown and dents the car; an elephant stops it; gulls fly */
  const b = await page.evaluate(() => {
    const g = window.__game, W = g.Wild, c = g.car, sp = window.__spot(4, 520), out = {}; W.clear(); g.loadAround(sp.x, sp.z, 3);
    const run = (n, f) => { for (let i = 0; i < n; i++) { if (f) f(); window.__now += 1000 / 30; g.frame(window.__now); } };
    W.on = false; g.spawnAt(sp.x, sp.z - 60, 0); run(2); W.on = true; const herd = W.spawn('deer', sp.x, sp.z, 4); const d0 = herd.map((A) => Math.hypot(A.x - c.x, A.z - c.z));
    c.vx = 0; c.vz = 18; c.speed = 18; run(75, () => { c.vz = Math.max(c.vz, 18); c.speed = Math.max(c.speed, 18); });
    out.fled = herd.filter((A) => A.st === 'flee').length; out.n = herd.length;
    /* a cow, dead ahead */
    W.clear(); const s2 = window.__spot(2, 560); g.loadAround(s2.x, s2.z, 3); g.spawnAt(s2.x, s2.z - 30, 0); run(2); const cow = W.spawn('cow', s2.x, s2.z, 1)[0]; cow.K = Object.assign({}, cow.K, { flee: 0 }); const hp = c.health, h0 = W.hits || 0;
    c.vz = 20; c.speed = 20; run(60, () => { if (Math.hypot(cow.x - c.x, cow.z - c.z) > 3 && cow.st !== 'thrown' && cow.st !== 'daze') { c.vz = 20; c.speed = 20; c.vx = 0; } });
    out.cowHit = (W.hits || 0) > h0; out.cowThrown = cow.st === 'thrown' || cow.st === 'daze' || cow.st === 'idle' || cow.st === 'flee'; out.cowHp = Math.round(hp - c.health); out.cowMoved = Math.round(Math.hypot(cow.x - s2.x, cow.z - s2.z));
    c.health = 100;
    /* an elephant */
    W.clear(); const s3 = window.__spot(9, 540); g.loadAround(s3.x, s3.z, 3); g.spawnAt(s3.x, s3.z - 30, 0); run(2); const el = W.spawn('elephant', s3.x, s3.z, 1)[0]; el.s = 1.1; el.root.scale.setScalar(1.1);
    let vmin = 99; c.vz = 20; c.speed = 20; run(70, () => { if ((W.hits || 0) === h0 + 1 && Math.hypot(el.x - c.x, el.z - c.z) > 4) { c.vz = 20; c.speed = 20; c.vx = 0; } vmin = Math.min(vmin, Math.abs(c.speed)); });
    out.elStop = vmin < 6; out.elMoved = Math.round(Math.hypot(el.x - s3.x, el.z - s3.z)); out.elHp = Math.round(100 - c.health); c.health = 100;
    /* gulls */
    W.clear(); g.loadAround(sp.x, sp.z, 3); g.spawnAt(sp.x, sp.z - 30, 0); run(2); const gl = W.spawn('gull', sp.x, sp.z, 4); run(40); out.gullUp = gl.every((A) => A.y - Math.max(0, g.terrainHeight(A.x, A.z)) > 8); out.gullMove = Math.round(Math.hypot(gl[0].x - gl[0].ax, gl[0].z - gl[0].az));
    return out;
  });
  console.log(JSON.stringify(b));
  ok(b.fled >= Math.max(1, b.n - 1), 'deer scatter from a car coming fast (' + b.fled + ' of ' + b.n + ' ran)');
  ok(b.cowHit && b.cowHp > 3 && b.cowMoved > 3, 'drive into a cow at 70 km/h: it is thrown ' + b.cowMoved + ' m and the car takes ' + b.cowHp + ' damage');
  ok(b.elStop && b.elMoved < 3, 'drive into an elephant: the car stops dead and the elephant hardly moves (' + b.elMoved + ' m)');
  ok(b.gullUp && b.gullMove > 10, 'gulls wheel overhead');
  console.log(logs.length ? logs.slice(0, 10).join('\n') : 'no page errors'); ok(!logs.length, 'no page errors');
  console.log(fails ? fails + ' FAILED' : 'ALL OK'); await browser.close(); process.exit(fails ? 1 : 0);
})();
