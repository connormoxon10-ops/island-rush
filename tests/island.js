/* The bigger island: about three times the old area, with the seven original towns in the middle and seven new towns in their own regions
   round the outer ring (Bayou Hollow's cypress swamp, Ashfall's volcano, the Sundown Plains savanna, Vellano's vineyards, Frostholm's tundra,
   Verdance's rainforest and Neo Haven, a second, bigger city). Checks the towns and their regions, the coast all round, that every town is on
   the highway network, each region's own terrain (the volcano, the swamp's bayous, the river valley), that every new town builds (buildings with
   doors, its Customs shop, its specials) and that you can drive in each. Saves the full map and a picture of each new town.
   usage: node tests/island.js   (needs dist/test.html) ; env OUT=dir */
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = process.env.OUT || __dirname;
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await (await browser.newContext({ viewport: { width: 960, height: 540 } })).newPage(); const logs = [];
  page.on('pageerror', (e) => logs.push('PAGEERROR: ' + String(e.stack || e).slice(0, 600)));
  await page.route('**/three.min.js', (r) => r.fulfill({ path: path.resolve(__dirname, 'three.min.js'), contentType: 'application/javascript' }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.addInitScript(() => { window.__noAdapt = true; try { localStorage.setItem('island-rush-v1', JSON.stringify({ set: { quality: 'low', traffic: 'off' } })); } catch (e) { /* ignore */ } });
  await page.goto('file://' + path.resolve(__dirname, '../dist/test.html'));
  await page.waitForFunction(() => window.__ready || window.__bootError, null, { timeout: 300000 });
  let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
  const w = await page.evaluate(() => {
    const g = window.__game, T = g.towns, R = (i) => g.Biome.reg(i), out = {};
    g.App.start(); window.requestAnimationFrame = () => 0; window.__now = performance.now();
    out.towns = T.map((t, i) => ({ name: t.name, key: R(i).key, r: Math.round(Math.hypot(t.cx, t.cz)), N: t.N }));
    let coast = 0, rmin = 1e9; for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8; let r = 1500; while (r < 6000 && g.terrainHeight(Math.sin(a) * r, Math.cos(a) * r) > 0) r += 20; if (r < 6000) { coast++; rmin = Math.min(rmin, r); } }
    out.coast = coast; out.rmin = rmin;
    out.linked = T.every((t, i) => i === 0 || isFinite(g.townPath ? 0 : 0)); 
    let reach = 0; for (let i = 1; i < T.length; i++) { const p = g.roads.filter((r) => r.kind === 'hw' && (r.a === i || r.b === i)).length; if (p) reach++; } out.reach = reach;
    /* region terrain */
    const at = (key) => T.find((t, i) => R(i).key === key);
    const V = at('volcano'); let peak = 0; if (V) for (let a = 0; a < Math.PI * 2; a += 0.05) for (let d = 500; d < 1100; d += 20) peak = Math.max(peak, g.terrainHeight(V.cx + Math.cos(a) * d, V.cz + Math.sin(a) * d));
    out.peak = Math.round(peak - (V ? V.baseH : 0));
    const S = at('swamp'); let wet = 0, n = 0; if (S) for (let a = 0; a < Math.PI * 2; a += 0.1) for (let d = 600; d < 1000; d += 40) { n++; if (g.terrainHeight(S.cx + Math.cos(a) * d, S.cz + Math.sin(a) * d) < -0.4) wet++; }
    out.swampWet = n ? wet / n : 0;
    return out;
  });
  console.log(JSON.stringify(w.towns));
  const keys = new Set(w.towns.map((t) => t.key)), outer = w.towns.slice(7);
  ok(w.towns.length === 14 && keys.size === 14, '14 towns, each in its own region (' + [...keys].join(', ') + ')');
  ok(outer.every((t) => t.r > 2200) && w.towns.slice(0, 7).every((t) => t.r < 2000), 'the seven originals in the middle, seven new towns round the outer ring');
  ok(w.towns[13].N === 8 && w.towns[13].key === 'metro', 'Neo Haven is a bigger city (' + w.towns[13].N + ' by ' + w.towns[13].N + ' blocks)');
  ok(w.coast === 16 && w.rmin > 3200, 'coast all round, at least ' + w.rmin + ' m out (the old coast was about 2,400 m out)');
  ok(w.reach === 13, 'every town is on the highway network');
  ok(w.peak > 150, 'Ashfall has its volcano (' + w.peak + ' m above the town)');
  ok(w.swampWet > 0.05, 'Bayou Hollow has its bayous (' + Math.round(w.swampWet * 100) + ' % of the ground round it is water)');
  /* the map */
  const url = await page.evaluate(() => { const g = window.__game; for (let i = 0; i < 400 && !g.WorldMap.ready; i++) { window.__now += 33; g.frame(window.__now); } g.UI.openMenu('map'); g.UI.mapDraw(); const u = document.getElementById('fmap').toDataURL('image/png'); g.UI.closeMenu(); return u; });
  fs.writeFileSync(path.join(OUT, 'island_map.png'), Buffer.from(url.split(',')[1], 'base64'));
  /* each new town: build it, drive in it, look at it */
  for (let i = 7; i < 14; i++) {
    const r = await page.evaluate((i) => {
      const g = window.__game, T = g.towns[i], c = g.car, run = (n) => { for (let k = 0; k < n; k++) { window.__now += 1000 / 30; g.frame(window.__now); } };
      g.loadAround(T.cx, T.cz, 40); g.spawnAt(T.x0 + T.cell * 2, T.z0 - 10, Math.PI / 2); run(8);
      const lots = [...g.Bld.lots.values()].filter((q) => q.tid === T.id), specials = lots.filter((q) => q.special).map((q) => q.kind), shop = g.Shop.sites.find((s) => s.T === T);
      const x0 = c.x; g.key('KeyW', true); run(120); g.key('KeyW', false); const moved = Math.abs(c.x - x0), nan = !isFinite(c.x + c.y + c.z);
      g.App.tod = 12; g.Cam.view = 2; const sx = T.x0 - 30, sz = T.z0 - 30, vol = g.Biome.reg(i).key === 'volcano', a = T.id * 2.39, tx = vol ? T.cx + Math.cos(a) * 760 : T.cx, tz = vol ? T.cz + Math.sin(a) * 760 : T.cz; g.spawnAt(vol ? T.cx : sx, vol ? T.cz : sz, Math.atan2(tx - (vol ? T.cx : sx), tz - (vol ? T.cz : sz))); run(10);
      const shot = g.renderer.domElement.toDataURL('image/jpeg', 0.85);
      return { name: T.name, n: lots.length, specials, shop: !!shop, moved: Math.round(moved), nan, shot };
    }, i);
    fs.writeFileSync(path.join(OUT, 'island_town_' + i + '.jpg'), Buffer.from(r.shot.split(',')[1], 'base64')); delete r.shot;
    console.log(JSON.stringify(r));
    ok(r.n > 40 && r.specials.length >= 3 && r.shop, r.name + ': ' + r.n + ' buildings with doors, its specials (' + r.specials.join(', ') + ') and a Customs shop');
    ok(r.moved > 15 && !r.nan, r.name + ': you can drive through it (' + r.moved + ' m)');
  }
  console.log(logs.length ? logs.slice(0, 10).join('\n') : 'no page errors'); ok(!logs.length, 'no page errors');
  console.log(fails ? fails + ' FAILED' : 'ALL OK'); await browser.close(); process.exit(fails ? 1 : 0);
})();
