/* Building variety. Tours six towns (the city, Neo Haven, the harbor, the desert, the farm, the alpine town) and checks every building has a
   look of its own: several facade styles in each town (glass, brick, ribbon windows, siding, stucco beside the classic), many footprints and
   heights, towers of different shapes, signs of different kinds (neon, painted boards, bright plates; Neo Haven all neon), blade and OPEN signs, and that neon and
   lit windows come up at night. Pictures of each town by day, the city and Neo Haven by night.   usage: node tests/buildings.js ; env OUT=dir */
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = process.env.OUT || __dirname;
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await (await browser.newContext({ viewport: { width: 800, height: 450 } })).newPage(); const logs = [];
  page.on('pageerror', (e) => logs.push('PAGEERROR: ' + String(e.stack || e).slice(0, 600)));
  await page.route('**/three.min.js', (r) => r.fulfill({ path: path.resolve(__dirname, 'three.min.js'), contentType: 'application/javascript' }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.addInitScript(() => { window.__noAdapt = true; try { localStorage.setItem('island-rush-v1', JSON.stringify({ set: { quality: 'low', traffic: 'off' } })); } catch (e) { /* ignore */ } });
  await page.goto('file://' + path.resolve(__dirname, '../dist/test.html'));
  await page.waitForFunction(() => window.__ready || window.__bootError, null, { timeout: 170000 });
  let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
  const save = (n, u) => fs.writeFileSync(path.join(OUT, 'bld_' + n + '.jpg'), Buffer.from(u.split(',')[1], 'base64'));
  await page.evaluate(() => { const g = window.__game; g.App.start(); window.requestAnimationFrame = () => 0; window.__now = performance.now(); window.__run = (n) => { for (let i = 0; i < n; i++) { window.__now += 1000 / 30; g.frame(window.__now); } }; });
  const towns = [[6, 'city'], [13, 'metro'], [0, 'harbor'], [1, 'desert'], [2, 'farm'], [4, 'alpine']];
  for (const [ti, reg] of towns) {
    const r = await page.evaluate(([ti]) => {
      const g = window.__game, T = g.towns[ti], THREE = g.THREE_, M = g.MAT; g.App.tod = 13;
      g.spawnAt(T.cx - T.cell, T.cz - T.cell, 0); g.loadAround(T.cx, T.cz, 4); window.__run(4);
      /* every building of the town that is built */
      const L = [...g.Bld.lots.values()].filter((b) => b.tid === T.id), styles = {}, signs = {}, foot = new Set(), hts = new Set();
      for (const b of L) { if (b.signStyle) signs[b.signStyle] = (signs[b.signStyle] || 0) + 1; if (b.cat !== 'tower') foot.add(b.W + 'x' + b.D); hts.add(Math.round(b.h)); }
      let neonV = 0, haloV = 0, blades = 0, open = 0;
      for (const ch of g.Chunks.map.values()) ch.group.traverse((o) => {
        if (!o.isMesh) return; const m = o.material, nv = o.geometry.attributes.position ? o.geometry.attributes.position.count : 0;
        for (const s in M.bv) if (m === M.bv[s] && nv) styles[s] = (styles[s] || 0) + nv;
        if (m === M.neon) neonV += nv; if (m === M.halo) haloV += nv;
        if (o.geometry.type === 'PlaneGeometry' && m.map && m.map.image) { const im = m.map.image; if (im.height > im.width * 2) blades++; if (o.geometry.parameters.width === 1.5) open++; }
      });
      /* pictures: down a street, and from the air */
      const y = T.baseH, cam = new THREE.PerspectiveCamera(60, 16 / 9, 0.3, 3000), shoot = () => { g.renderer.setRenderTarget(null); g.renderer.render(g.scene, cam); return g.renderer.domElement.toDataURL('image/jpeg', 0.85); };
      cam.position.set(T.cx + 4, y + 3, T.cz + T.cell * 1.5); cam.lookAt(T.cx + 4, y + 14, T.cz - T.cell); const street = shoot();
      cam.position.set(T.cx + T.cell * 2.2, y + 95, T.cz + T.cell * 2.6); cam.lookAt(T.cx, y + 10, T.cz); const air = shoot();
      let night = null, nAir = null, glow = null;
      if (ti === 6 || ti === 13) {
        g.App.tod = 22.5; window.__run(4); glow = { neon: M.neon.color.r, halo: M.halo.opacity, win: M.bv.glass.emissiveIntensity };
        cam.position.set(T.cx + 4, y + 3, T.cz + T.cell * 1.5); cam.lookAt(T.cx + 4, y + 14, T.cz - T.cell); night = shoot();
        cam.position.set(T.cx + T.cell * 2.2, y + 95, T.cz + T.cell * 2.6); cam.lookAt(T.cx, y + 10, T.cz); nAir = shoot(); g.App.tod = 13; window.__run(3);
      }
      return { name: T.name, n: L.length, styles, signs, foot: foot.size, hts: hts.size, neonV, haloV, blades, open, street, air, night, nAir, glow };
    }, [ti]);
    save(reg + '_street', r.street); save(reg + '_air', r.air); if (r.night) { save(reg + '_night', r.night); save(reg + '_night_air', r.nAir); }
    const st = Object.keys(r.styles);
    console.log(reg + ' (' + r.name + '): ' + r.n + ' buildings; facades ' + JSON.stringify(r.styles) + '; signs ' + JSON.stringify(r.signs) + '; ' + r.foot + ' footprints, ' + r.hts + ' heights; blades ' + r.blades + ', OPEN ' + r.open + ', neon verts ' + r.neonV);
    ok(r.n > 20 && st.length >= 2, r.name + ': ' + r.n + ' buildings in ' + (st.length + 1) + ' facade styles (' + st.join(', ') + ' and classic)');
    ok(r.foot >= 5 && r.hts >= 3, r.name + ': ' + r.foot + ' different footprints, ' + r.hts + ' different heights');
    ok((Object.keys(r.signs).length >= 2 || (reg === 'metro' && r.signs.neon > 10)) && r.open > 0, r.name + ': signs of ' + Object.keys(r.signs).length + ' kinds (' + Object.keys(r.signs).join(', ') + '), ' + r.blades + ' blade signs, ' + r.open + ' OPEN signs');
    if (reg === 'city' || reg === 'metro') {
      ok(r.styles.glass > 0 && r.neonV > 0 && r.haloV > 0 && (r.signs.neon || 0) >= 5, r.name + ': glass towers, neon (' + (r.signs.neon || 0) + ' neon signs) and its glow');
      ok(r.glow && r.glow.neon > 1.4 && r.glow.halo > 0.4 && r.glow.win > 1, r.name + ' at night: neon brightens (' + (r.glow && r.glow.neon.toFixed(2)) + '), the glow comes on (' + (r.glow && r.glow.halo.toFixed(2)) + '), windows light up');
    }
    if (reg === 'farm' || reg === 'alpine') ok((r.styles.siding || 0) > 0 || (r.styles.brick || 0) > 0, r.name + ': country houses in siding or brick');
    if (reg === 'desert') ok((r.styles.stucco || 0) > 0, r.name + ': stucco');
  }
  /* the same town twice comes out the same */
  const same = await page.evaluate(() => { const g = window.__game, T = g.towns[6], k = [...g.Bld.lots.values()].filter((b) => b.tid === T.id).map((b) => b.key + b.W + b.D + b.h + b.signStyle).sort().join();
    g.spawnAt(g.towns[2].cx, g.towns[2].cz, 0); g.loadAround(g.towns[2].cx, g.towns[2].cz, 4); window.__run(3); g.spawnAt(T.cx - T.cell, T.cz - T.cell, 0); g.loadAround(T.cx, T.cz, 4); window.__run(3);
    const k2 = [...g.Bld.lots.values()].filter((b) => b.tid === T.id).map((b) => b.key + b.W + b.D + b.h + b.signStyle).sort().join(); return k === k2 && k.length > 100; });
  ok(same, 'driving away and back: the city is built exactly the same');
  /* can still walk into a building */
  const walk = await page.evaluate(() => { const g = window.__game, I = g.Int, T = g.towns[6]; const rec = [...g.Bld.lots.values()].find((b) => b.tid === T.id && b.kind === 'cafe') || [...g.Bld.lots.values()].find((b) => b.tid === T.id && !b.special && b.kind !== 'home');
    const d = rec.door; g.spawnAt(d.ox + d.nz * 6, d.oz + d.nz * 6, 0); window.__run(3); g.key('KeyF', true); g.key('KeyF', false); window.__run(3); g.Foot.x = d.ox; g.Foot.z = d.oz; g.Foot.yaw = Math.atan2(-d.nx, -d.nz); window.__run(4);
    g.key('KeyE', true); g.key('KeyE', false); window.__run(20); const inside = g.App.mode === 'int'; if (inside) I.leave(true); return { inside, name: rec.name }; });
  ok(walk.inside, 'and walk into ' + walk.name + ' through its door');
  console.log(logs.length ? logs.slice(0, 10).join('\n') : 'no page errors'); ok(!logs.length, 'no page errors');
  console.log(fails ? fails + ' FAILED' : 'ALL OK'); await browser.close(); process.exit(fails ? 1 : 0);
})();
