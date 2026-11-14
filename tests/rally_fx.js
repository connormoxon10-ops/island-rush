/* Rally stage effects that used to show up as flashing coloured squares in the chase view:
   1. stream (ford) water was one 140 m sheet at the waterline, showing through the hillsides as pale rectangles and flickering against the ground far
      away. It must now cover only ground that is really under water (where the car wades), a small fraction of the old sheet.
   2. light shafts were placed across the road, laid flat by a low sun, and faded per corner, so the car drove through bright rectangles. They must stand
      beside the road, never on it, and the shader must fade them per pixel near the camera and when seen end-on.
   Run on every stage.   usage: node tests/rally_fx.js   (needs dist/test.html: bash build.sh) */
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 640, height: 360 } })).newPage(); const logs = [];
  page.on('pageerror', (e) => logs.push('PAGEERROR: ' + String(e.stack || e).slice(0, 400)));
  page.on('console', (m) => { if (m.type() === 'error' && !/net::ERR|Failed to load resource/.test(m.text())) logs.push('console: ' + m.text().slice(0, 400)); });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.addInitScript(() => { window.__noAdapt = true; try { localStorage.setItem('island-rush-v1', JSON.stringify({ set: { quality: 'med' } })); } catch (e) { /* ignore */ } });
  await page.goto('file://' + path.resolve(__dirname, '../dist/test.html'));
  await page.waitForFunction(() => window.__ready || window.__bootError, null, { timeout: 170000 });
  const res = await page.evaluate(async () => {
    const g = window.__game, R = g.Rally, RY = g.RY, out = [];
    for (let st = 0; st < g.RY_STAGES.length; st++) {
      if (R.on) R.exit(true); g.App.mode = 'rlobby'; g.save.rally.stage = st; g.save.rally.car = 'ridge'; g.save.rally.rivals = 0; g.save.rally.tod = 2; R.tod = 2; await R.start();
      const o = { st, name: g.RY_STAGES[st].name || st, fords: RY.fords.length, meshes: g.RYG.fordMeshes || 0, area: 0, sheet: 0, dry: 0, onRoad: 0, shafts: 0 }, go = {};
      /* water meshes: their area, and how many of their visible vertices stand on dry ground */
      g.RYG.group.traverse((m) => { if (!m.isMesh || !m.geometry.attributes.color || m.geometry.attributes.color.itemSize !== 4 || !m.material.transparent) return;
        const P = m.geometry.attributes.position.array, C = m.geometry.attributes.color.array, I = m.geometry.index.array;
        for (let k = 0; k < I.length; k += 3) { const a = I[k] * 3, b = I[k + 1] * 3, c = I[k + 2] * 3; o.area += Math.abs((P[b] - P[a]) * (P[c + 2] - P[a + 2]) - (P[c] - P[a]) * (P[b + 2] - P[a + 2])) / 2; }
        for (let v = 0; v < C.length / 4; v++) if (C[v * 4 + 3] > 0.05) { RY.ground(P[v * 3], P[v * 3 + 2], go); if (!(go.wade > 0)) o.dry++; } });
      for (const f of RY.fords) o.sheet += 140 * f.len * 0.92;
      /* shafts: run the placement a few times with the car moving up the stage, then check where they stand */
      const c = g.car, S = g.RYG.shafts; o.shafts = S ? S.n : 0;
      if (S) { for (let k = 0; k < 6; k++) { const q = RY.at(RY.startS + k * 120, 0, {}); g.spawnAt(q.x, q.z, q.yaw); for (let i = 0; i < S.n; i++) S.life[i] = 0; g.RYG.update(1 / 60, g.camera, { x: q.x, z: q.z, yaw: q.yaw, rs: RY.startS + k * 120 }, R.sunInfo(), g.App.tod);
          for (let i = 0; i < S.n; i++) { RY.ground(S.base[i * 12], S.base[i * 12 + 2], go); if (go.road) o.onRoad++; } }
        const vs = S.mat.vertexShader, fs = S.mat.fragmentShader; o.shader = /sl > 1e-4/.test(vs) && /smoothstep\(0\.35, 0\.75, sl\)/.test(vs) && /length\(vW - uCam\)/.test(fs) && /max\(uSun\.y/.test(vs); }
      out.push(o);
    }
    if (R.on) R.exit(true); return out;
  });
  let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
  for (const o of res) {
    console.log(JSON.stringify(o));
    ok(o.meshes === o.fords || o.fords === 0, o.name + ': every stream has its water (' + o.meshes + ' / ' + o.fords + ')');
    ok(o.fords === 0 || (o.area < o.sheet * 0.7 && o.dry === 0), o.name + ': stream water covers only ground that is really under water (' + Math.round(o.area) + ' m² against the old ' + Math.round(o.sheet) + ' m² sheets; ' + o.dry + ' visible points on dry ground)');
    ok(o.shafts === 0 || (o.onRoad === 0 && o.shader), o.name + ': light shafts stand beside the road (' + o.onRoad + ' on it) and fade near the camera and end-on');
  }
  console.log(logs.length ? logs.slice(0, 6).join('\n') : 'no page or console errors'); console.log(fails ? fails + ' FAILED' : 'ALL OK');
  await browser.close(); process.exit(fails || logs.length ? 1 : 0);
})();
