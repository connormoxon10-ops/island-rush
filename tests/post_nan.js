/* NaN squares: one NaN or infinite pixel in the frame used to be smeared by the bloom blur into a big square, black or tinted red/yellow (NaN in only
   some colour channels), seen on rally stages from the forest floor's shader. This feeds a frame with NaN and Inf pixels through the real bloom
   bright-pass and checks that nothing non-finite comes out, and that the rally ground shader keeps its guards.
   usage: node tests/post_nan.js   (needs dist/test.html: bash build.sh) */
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await (await browser.newContext({ viewport: { width: 640, height: 360 } })).newPage(); const logs = [];
  page.on('pageerror', (e) => logs.push('PAGEERROR: ' + String(e.stack || e).slice(0, 400)));
  await page.route('**/three.min.js', (r) => r.fulfill({ path: path.resolve(__dirname, 'three.min.js'), contentType: 'application/javascript' }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.addInitScript(() => { window.__noAdapt = true; try { localStorage.setItem('island-rush-v1', JSON.stringify({ set: { quality: 'med' } })); } catch (e) { /* ignore */ } });
  await page.goto('file://' + path.resolve(__dirname, '../dist/test.html'));
  await page.waitForFunction(() => window.__ready || window.__bootError, null, { timeout: 170000 });
  const res = await page.evaluate(() => {
    const g = window.__game, rd = g.renderer, P = g.Post, N = 16, d = new Float32Array(N * N * 4);
    for (let i = 0; i < N * N; i++) { d[i * 4] = 0.5; d[i * 4 + 1] = 3.0; d[i * 4 + 2] = 0.2; d[i * 4 + 3] = 1; }
    d[(5 * N + 5) * 4 + 1] = NaN; d[(5 * N + 5) * 4 + 2] = NaN;   /* NaN in green and blue: the red square */
    d[(9 * N + 9) * 4 + 2] = NaN;                                   /* NaN in blue: the yellow square */
    d[(12 * N + 3) * 4] = Infinity;                                 /* an overflowed highlight */
    const tex = new THREE.DataTexture(d, N, N, THREE.RGBAFormat, THREE.FloatType); tex.needsUpdate = true;
    const rt = new THREE.WebGLRenderTarget(N, N, { type: THREE.FloatType, format: THREE.RGBAFormat, depthBuffer: false });
    if (!P || !P.mBright) return { skip: 'no post pipeline' };
    P.mBright.uniforms.tSrc.value = tex; P.quad.material = P.mBright; rd.setRenderTarget(rt); rd.render(P.scene, P.cam); rd.setRenderTarget(null);
    const o = new Float32Array(N * N * 4); rd.readRenderTargetPixels(rt, 0, 0, N, N, o); let bad = 0, lit = 0; for (let i = 0; i < N * N; i++) { for (let k = 0; k < 3; k++) if (!Number.isFinite(o[i * 4 + k])) bad++; if (o[i * 4 + 1] > 0.5) lit++; }
    return { bad, lit, of: N * N };
  });
  let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
  console.log(JSON.stringify(res));
  ok(res.skip || (res.bad === 0 && res.lit > res.of - 4), 'the bloom bright-pass drops NaN and infinite pixels (' + (res.skip || res.bad + ' non-finite out, ' + res.lit + '/' + res.of + ' normal bright pixels kept') + ')');
  const src = fs.readFileSync(path.resolve(__dirname, '../dist/game.js'), 'utf8');
  ok(/pow\(max\(alb, vec3\(0\.0\)\), vec3\(2\.2\)\)/.test(src) && !/pow\(alb, vec3\(2\.2\)\)/.test(src), 'the rally ground shader never takes pow() of a negative colour');
  ok(/l_ > 1e-8 \? n_ \/ l_ : surf_norm/.test(src), 'the bump-normal helper never normalises a zero vector');
  ok(/pow\(max\(col,vec3\(0\.0\)\),vec3\(1\.0\/2\.2\)\)/.test(src), 'the final colour pass never takes pow() of a negative colour');
  console.log(logs.length ? logs.join('\n') : 'no page errors'); console.log(fails ? fails + ' FAILED' : 'ALL OK');
  await browser.close(); process.exit(fails || logs.length ? 1 : 0);
})();
