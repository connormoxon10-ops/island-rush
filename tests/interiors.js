/* Interiors: every town building has a door you can walk through into its own interior. Loads the towns, collects the registered buildings
   (every lot gets one, with a kind, a name and a street door), then for one building of every kind (offices, shops, cafés, homes, warehouses,
   barns, banks, apartments, gyms, pools, restaurants, clothing shops, dealerships, the jail) walks up to the door on foot, presses E and checks:
   the interior is built (walls, furniture to bump into, people, things to use), you can walk about but not through the walls, the street door
   lets you out where you came in. Saves a screenshot of each.   usage: node tests/interiors.js   (needs dist/test.html) ; env OUT=dir ONLY=kind */
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = process.env.OUT || __dirname, ONLY = process.env.ONLY || '';
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await (await browser.newContext({ viewport: { width: 960, height: 540 } })).newPage(); const logs = [];
  page.on('pageerror', (e) => logs.push('PAGEERROR: ' + String(e.stack || e).slice(0, 600)));
  page.on('console', (m) => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) logs.push('CONSOLE: ' + m.text().slice(0, 300)); });
  await page.route('**/three.min.js', (r) => r.fulfill({ path: path.resolve(__dirname, 'three.min.js'), contentType: 'application/javascript' }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.addInitScript(() => { window.__noAdapt = true; try { localStorage.setItem('island-rush-v1', JSON.stringify({ money: 500000, set: { quality: 'low', traffic: 'off' } })); } catch (e) { /* ignore */ } });
  await page.goto('file://' + path.resolve(__dirname, '../dist/test.html'));
  await page.waitForFunction(() => window.__ready || window.__bootError, null, { timeout: 170000 });
  let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
  /* every special is planned, on the map */
  const plan = await page.evaluate(() => { const g = window.__game; g.App.start(); window.requestAnimationFrame = () => 0; window.__now = performance.now(); g.Bld.prep(); return g.Bld.sites.map((s) => ({ kind: s.kind, name: s.name, town: s.T.name, x: s.x, z: s.z, key: s.key })); });
  const kinds = {}; for (const s of plan) kinds[s.kind] = (kinds[s.kind] || 0) + 1;
  console.log('specials', JSON.stringify(kinds));
  ok(kinds.bank >= 3 && kinds.reserve === 1 && kinds.apts >= 7 && kinds.gym >= 3 && kinds.pool >= 3 && kinds.dealer >= 3 && kinds.jail === 1 && kinds.resto >= 7 && kinds.clothes >= 7, 'special buildings in the towns: banks, apartments, gyms, pools, dealerships, a jail, restaurants and clothing shops');
  /* load each town and gather the ordinary buildings too */
  const gen = await page.evaluate(() => {
    const g = window.__game, out = {}; let n = 0;
    for (const T of g.towns) { g.loadAround(T.cx, T.cz, 400); n += 0; for (const r of g.Bld.lots.values()) (out[r.kind] || (out[r.kind] = [])).indexOf(r.key) < 0 && out[r.kind].push(r.key); }
    g.loadAround(g.car.x, g.car.z, 60);   /* (back to the start: the other towns unload) */
    n = g.Bld.lots.size; const doors = [...g.Bld.lots.values()].every((r) => r.door && isFinite(r.door.x) && r.name);
    const keys = Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v[0]])); for (const r of g.Bld.prepFixed()) if (!keys[r.kind]) keys[r.kind] = r.key;
    return { kinds: Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.length])), keys, n, doors, fixed: g.Bld.prepFixed().length };
  });
  console.log('buildings', gen.n, JSON.stringify(gen.kinds));
  ok(gen.n > 400 && gen.doors, 'every town building is registered with a name and a street door (' + gen.n + ')');
  const want = ['office', 'cafe', 'store', 'pharmacy', 'books', 'barber', 'bakery', 'electronics', 'florist', 'hardware', 'laundry', 'bar', 'diner', 'home', 'warehouse', 'barn', 'bank', 'reserve', 'apts', 'gym', 'pool', 'resto', 'clothes', 'dealer', 'kitlab', 'jail', 'terminal', 'boathouse', 'venue', 'club'];
  for (const k of want) if (!ONLY || ONLY.split(',').includes(k)) ok(!!gen.keys[k], 'there is a ' + k);
  for (const k of want) {
    if (ONLY && !ONLY.split(',').includes(k)) continue; const key = gen.keys[k]; if (!key) continue;
    const r = await page.evaluate((key) => {
      const g = window.__game, rec = g.Bld.lots.get(key) || g.Bld.prepFixed().find((q) => q.key === key), c = g.car, F = g.Foot, run = (n) => { for (let i = 0; i < n; i++) { window.__now += 1000 / 30; g.frame(window.__now); } };
      if (g.App.mode === 'int') g.Int.leave(true);
      const d = rec.door; g.loadAround(d.ox, d.oz, 30); g.spawnAt(d.ox + d.nz * 6, d.oz + d.nz * 6, 0); run(4);
      g.key('KeyF', true); g.key('KeyF', false); run(4);
      F.x = d.ox; F.z = d.oz; F.yaw = Math.atan2(-d.nx, -d.nz); run(6);
      const near = g.Bld.near === rec || (rec.S && g.Ven.near === rec.S); g.key('KeyE', true); g.key('KeyE', false); run(3);
      const I = g.Int, inside = g.App.mode === 'int' && I.rec === rec;
      if (!inside) return { near, inside, mode: g.App.mode, foot: F.on, bn: g.Bld.near && g.Bld.near.key };
      run(20); const shot0 = g.renderer.domElement.toDataURL('image/jpeg', 0.85);
      /* look around from the middle, then walk forward into the far wall */
      const st = { cols: I.cols.length, acts: I.acts.length, npcs: I.npcs.length, people: I.npcs.filter((n) => n.hu && n.hu.root.parent).length, x0: I.x, z0: I.z, B: I.bounds, room: I.room };
      g.key('KeyW', true); run(150); g.key('KeyW', false); run(2);
      st.walked = Math.hypot(I.x - st.x0, I.z - st.z0); st.inB = I.x >= I.bounds[0] && I.x <= I.bounds[2] && I.z >= I.bounds[1] && I.z <= I.bounds[3];
      /* nothing you stand in is a piece of furniture */
      st.inCol = I.cols.some((q) => I.x > q[0] + 0.05 && I.x < q[2] - 0.05 && I.z > q[1] + 0.05 && I.z < q[3] - 0.05);
      I.x = st.x0; I.z = st.z0; I.yaw = Math.PI * 1.15; I.pitch = -0.05; run(10); const shot1 = g.renderer.domElement.toDataURL('image/jpeg', 0.85);
      I.yaw = Math.PI * 0.85; run(4); const shot2 = g.renderer.domElement.toDataURL('image/jpeg', 0.85);
      /* the third-person view draws you */
      g.key('KeyC', true); g.key('KeyC', false); run(6); st.tp = !!(I.tp && I.ped && I.ped.hu && I.ped.hu.root.visible); g.key('KeyC', true); g.key('KeyC', false);
      /* out by the street door */
      g.key('Escape', true); g.key('Escape', false); run(4);
      st.out = g.App.mode === 'play' && F.on && Math.hypot(F.x - d.ox, F.z - d.oz) < 3;
      return { near, inside, st, shot0, shot1, shot2, name: rec.name, sub: rec.sub };
    }, key);
    if (!r.inside) { ok(false, k + ': walk up to the door and press E (' + JSON.stringify(r) + ')'); continue; }
    for (const [i, s] of [r.shot0, r.shot1, r.shot2].entries()) fs.writeFileSync(path.join(OUT, 'int_' + k + '_' + i + '.jpg'), Buffer.from(s.split(',')[1], 'base64'));
    const s = r.st; console.log('  [' + Math.round(process.uptime()) + ' s] ' + k + ' · ' + r.name + ' · ' + JSON.stringify({ cols: s.cols, acts: s.acts, people: s.people, walked: +s.walked.toFixed(1) }));
    ok(r.near && r.inside, k + ': walk up to ' + r.name + ' and press E: you are inside');
    ok(s.cols >= 4 && s.acts >= 2, k + ': furniture to bump into (' + s.cols + ') and things to use (' + s.acts + ')');
    ok(k === 'barn' || k === 'warehouse' || k === 'laundry' || k === 'home' || s.people >= 1, k + ': people inside (' + s.people + ')');
    ok(s.walked > 1.5 && s.inB && !s.inCol, k + ': you walk about (' + s.walked.toFixed(1) + ' m) and stop at the walls and furniture');
    ok(s.tp, k + ': the third-person view shows you');
    ok(s.out, k + ': Esc takes you back out of the street door');
  }
  console.log(logs.length ? logs.slice(0, 12).join('\n') : 'no page errors'); ok(!logs.length, 'no page errors');
  console.log(fails ? fails + ' FAILED' : 'ALL OK'); await browser.close(); process.exit(fails ? 1 : 0);
})();
