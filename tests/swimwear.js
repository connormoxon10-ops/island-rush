/* Swimwear: men and boys wear swim trunks (bare chest, trunks down the thighs), women wear bikinis (a band over the bust with halter straps, and a brief:
   bare belly, shoulders and legs), girls a swimsuit. Builds them in a line, checks which parts of each body are cloth and which skin, and saves a close-up.
   Then checks every person on a real beach is dressed that way.   usage: node tests/swimwear.js   (needs dist/test.html) ; env OUT=dir */
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = process.env.OUT || __dirname;
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await (await browser.newContext({ viewport: { width: 960, height: 540 } })).newPage(); const logs = [];
  page.on('pageerror', (e) => logs.push('PAGEERROR: ' + String(e.stack || e).slice(0, 500)));
  await page.route('**/three.min.js', (r) => r.fulfill({ path: path.resolve(__dirname, 'three.min.js'), contentType: 'application/javascript' }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.addInitScript(() => { window.__noAdapt = true; try { localStorage.setItem('island-rush-v1', JSON.stringify({ set: { quality: 'med' } })); } catch (e) { /* ignore */ } });
  await page.goto('file://' + path.resolve(__dirname, '../dist/test.html'));
  await page.waitForFunction(() => window.__ready || window.__bootError, null, { timeout: 170000 });
  let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
  const r = await page.evaluate(() => {
    const g = window.__game, T = g.THREE_, c = g.car; g.App.start(); window.requestAnimationFrame = () => 0; window.__now = performance.now();
    const run = (n) => { for (let i = 0; i < n; i++) { window.__now += 1000 / 30; g.frame(window.__now); } };
    run(5); const col = (h) => new T.Color(h), skin = col(0xc89070);
    const base = { s: 1, hs: 1, stout: 1, skin, hair: col(0x3a2414), shoe: skin, shorts: true, swim: true, hst: 'long', seed: 1 };
    const who = [['woman, bikini', { fem: true, shirt: col(0xe0306a), pants: col(0xe0306a) }], ['man, trunks', { fem: false, shirt: skin, pants: col(0x1f6fd1), hst: 'short' }],
      ['woman, two-colour bikini', { fem: true, shirt: col(0xf2c81e), pants: col(0x18a89a), hst: 'pony' }], ['girl, swimsuit', { fem: true, kid: true, s: 0.7, hs: 1.26, shirt: col(0x7a3fd0), pants: col(0x7a3fd0) }], ['boy, trunks', { kid: true, s: 0.7, hs: 1.26, shirt: skin, pants: col(0xe07a1a), hst: 'short' }]];
    /* which slots each body's torso and pelvis are cloth in, by height (from the built geometry: vertex colour = palette slot colour) */
    const res = [], grp = new T.Group(); g.scene.add(grp); const gx = c.x + Math.sin(c.yaw) * 6, gz = c.z + Math.cos(c.yaw) * 6, gy = g.terrainHeight(gx, gz);
    who.forEach(([label, o], i) => {
      const spec = Object.assign({}, base, o), h = g.Human.make(spec), geo = h.mesh ? h.mesh.geometry : h.root.getObjectByProperty('isSkinnedMesh', true).geometry;
      const P = geo.attributes.position, Tt = geo.attributes.tint || geo.attributes.aTint, sc = spec.shirt, pc = spec.pants; const band = {};
      for (let k = 0; k < P.count; k++) { const y = P.getY(k), x = P.getX(k); if (Math.abs(x) > 0.15) continue; const yy = Math.round(y * 20) / 20; const t = [Tt.getX(k), Tt.getY(k), Tt.getZ(k)];
        const d = (C) => Math.abs(t[0] - C.r) + Math.abs(t[1] - C.g) + Math.abs(t[2] - C.b); const isS = d(skin) < 0.12, isT = d(sc) < 0.12 && !isS, isB = d(pc) < 0.12 && !isS; band[yy] = band[yy] || { s: 0, t: 0, b: 0 }; if (isS) band[yy].s++; if (isT) band[yy].t++; if (isB) band[yy].b++; }
      res.push({ label, band });
      h.root.position.set(gx + (i - 2) * 0.9 * Math.cos(c.yaw), gy, gz - (i - 2) * 0.9 * Math.sin(c.yaw)); h.root.rotation.y = c.yaw + Math.PI; grp.add(h.root); if (h.update) h.update(0, 0);
    });
    const cam = g.camera; cam.position.set(c.x + Math.sin(c.yaw) * 2.2, gy + 1.15, c.z + Math.cos(c.yaw) * 2.2); cam.lookAt(gx, gy + 0.95, gz); cam.updateMatrixWorld(); g.renderer.render(g.scene, cam);
    const shot = g.renderer.domElement.toDataURL('image/jpeg', 0.9); g.scene.remove(grp);
    return { res, shot, attrs: Object.keys(g.Human.make(base).root.getObjectByProperty('isSkinnedMesh', true).geometry.attributes) };
  });
  fs.writeFileSync(path.join(OUT, 'swimwear.jpg'), Buffer.from(r.shot.split(',')[1], 'base64'));
  const B = Object.fromEntries(r.res.map((p) => [p.label, p.band])), at = (lab, y) => B[lab][String(y)] || { s: 0, t: 0, b: 0 };
  const belly = (lab) => [1.1, 1.15, 1.2, 1.25].every((y) => at(lab, y).t === 0 && at(lab, y).b === 0 && at(lab, y).s > 0);
  for (const lab of ['woman, bikini', 'woman, two-colour bikini']) {
    ok(belly(lab) && at(lab, 1.35).t > 0 && at(lab, 1.5).t === 0, lab + ': a bikini top over the bust, a bare belly and bare shoulders');
    ok(at(lab, 0.9).b > 0 && at(lab, 0.75).b === 0 && at(lab, 0.75).s > 0, lab + ': bikini bottoms, bare legs');
  }
  for (const lab of ['man, trunks', 'boy, trunks']) ok([1.1, 1.2, 1.3, 1.4].every((y) => at(lab, y).b === 0 && at(lab, y).s > 0) && [0.65, 0.75, 0.85].every((y) => at(lab, y).b > 0), lab + ': bare chest, swim trunks down the thighs');
  ok(at('girl, swimsuit', 1.2).t > 0 && at('girl, swimsuit', 1.55).t === 0 && at('girl, swimsuit', 0.75).b === 0, 'girl: a one-piece swimsuit with bare shoulders and legs');
  console.log(logs.length ? logs.join('\n') : 'no page errors'); ok(!logs.length, 'no page errors');
  console.log(fails ? fails + ' FAILED' : 'ALL OK'); await browser.close(); process.exit(fails ? 1 : 0);
})();
