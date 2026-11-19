/* The car interior (the view from the driver's seat): sculpted, not boxy, and dressed for the car (sport, classic, rugged, modern).
   For one car of each style: drives it in the first-person view by day and by night, checks the cabin is made of rounded parts (no plain boxes
   but the vent louvres) and its colours changed with the car, and saves a picture of each.   usage: node tests/cockpit.js   (needs dist/test.html) ; env OUT=dir */
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = process.env.OUT || __dirname;
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await (await browser.newContext({ viewport: { width: 960, height: 540 } })).newPage(); const logs = [];
  page.on('pageerror', (e) => logs.push('PAGEERROR: ' + String(e.stack || e).slice(0, 600)));
  await page.route('**/three.min.js', (r) => r.fulfill({ path: path.resolve(__dirname, 'three.min.js'), contentType: 'application/javascript' }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.addInitScript(() => { window.__noAdapt = true; try { localStorage.setItem('island-rush-v1', JSON.stringify({ money: 1, set: { quality: 'low', traffic: 'off' } })); } catch (e) { /* ignore */ } });
  await page.goto('file://' + path.resolve(__dirname, '../dist/test.html'));
  await page.waitForFunction(() => window.__ready || window.__bootError, null, { timeout: 170000 });
  let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
  const r = await page.evaluate(() => {
    const g = window.__game, C = g.Cockpit || null; g.App.start(); window.requestAnimationFrame = () => 0; window.__now = performance.now(); const run = (n) => { for (let i = 0; i < n; i++) { window.__now += 1000 / 30; g.frame(window.__now); } };
    const out = { styles: {}, pics: {} }, grp = window.__game.Cockpit ? window.__game.Cockpit.group : null; return out;
  });
  const res = await page.evaluate(() => {
    const g = window.__game, run = (n) => { for (let i = 0; i < n; i++) { window.__now += 1000 / 30; g.frame(window.__now); } }, out = { cars: [], pics: {} };
    let boxes = 0, meshes = 0; const K = g.scene.getObjectByProperty ? null : null; const cg = (() => { let f = null; g.scene.traverse((o) => { if (!f && o.userData && o.userData.ck) f = o; }); return f; })();
    const want = { sport: 'vanta', classic: 'muscle', rugged: 'hauler', modern: 'rook' };
    for (const [style, id] of Object.entries(want)) {
      g.save.owned[id] = true; g.App.setCar(id); g.UI.setView ? g.UI.setView(0, false) : (g.Cam.view = 0); g.App.tod = 12; run(20);
      const day = g.renderer.domElement.toDataURL('image/jpeg', 0.85); g.App.tod = 22; run(20); const night = g.renderer.domElement.toDataURL('image/jpeg', 0.85);
      out.cars.push({ id, style, got: g.ckThemeOf(g.CAR_BY_ID[id]) }); out.pics[style] = [day, night];
    }
    return out;
  });
  const geo = await page.evaluate(() => { const g = window.__game; let grp = null; g.scene.traverse((o) => { if (!grp && o.isGroup && o.children.some((c) => c.material && c.material.map && c.geometry && c.geometry.type === 'PlaneGeometry' && c.geometry.parameters.width === 0.5)) grp = o; });
    const t = {}; let n = 0; if (grp) grp.traverse((o) => { if (o.isMesh) { n++; t[o.geometry.type] = (t[o.geometry.type] || 0) + 1; } }); return { n, t }; });
  console.log(JSON.stringify(res.cars), JSON.stringify(geo));
  for (const [s, p] of Object.entries(res.pics)) p.forEach((u, k) => fs.writeFileSync(path.join(OUT, 'cockpit_' + s + (k ? '_night' : '') + '.jpg'), Buffer.from(u.split(',')[1], 'base64')));
  ok(res.cars.every((c) => c.got === c.style), 'each car gets its interior: ' + res.cars.map((c) => c.id + ' → ' + c.got).join(', '));
  ok(geo.n > 60 && (geo.t.BoxGeometry || 0) <= 8 && (geo.t.ExtrudeGeometry || 0) > 25 && geo.t.TubeGeometry >= 3, 'the cabin is sculpted: ' + geo.n + ' parts, ' + (geo.t.ExtrudeGeometry || 0) + ' rounded, ' + (geo.t.BoxGeometry || 0) + ' plain boxes (the vent louvres)');
  console.log(logs.length ? logs.slice(0, 10).join('\n') : 'no page errors'); ok(!logs.length, 'no page errors');
  console.log(fails ? fails + ' FAILED' : 'ALL OK'); await browser.close(); process.exit(fails ? 1 : 0);
})();
