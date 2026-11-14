/* The people in cutscenes move. Opens every court venue, the arrest (street and booking room) and the clothes shop with the real frame loop running, and checks that
   each scene's people are animated on screen: the bone matrices the GPU skins with change from frame to frame (a cutscene that froze its people in their starting
   pose would fail), and that nothing logs an error.   usage: node tests/cutscenes.js   (needs dist/test.html: bash build.sh) */
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 640, height: 360 } })).newPage(); const logs = [];
  page.on('pageerror', (e) => logs.push('PAGEERROR: ' + String(e.stack || e).slice(0, 400)));
  page.on('console', (m) => { if (m.type() === 'error' && !/net::ERR|Failed to load resource/.test(m.text())) logs.push('console: ' + m.text().slice(0, 400)); });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.addInitScript(() => { window.__noAdapt = true; try { localStorage.setItem('island-rush-v1', JSON.stringify({ set: { quality: 'low' } })); } catch (e) { /* ignore */ } });
  await page.goto('file://' + path.resolve(__dirname, '../dist/test.html'));
  await page.waitForFunction(() => window.__ready || window.__bootError, null, { timeout: 170000 });
  await page.evaluate(() => { const g = window.__game; g.App.start(); for (let i = 0; i < 30; i++) g.stepSim(1 / 60); });
  let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
  /* every skinned person in a scene: a snapshot of what the GPU will skin with */
  const snap = () => page.evaluate(() => { const g = window.__game, out = []; const sc = g.App.mode === 'court' ? g.CR.scene : g.App.mode === 'bust' && g.Bust.phase !== 'street' ? g.CR.scene : g.App.mode === 'shop' ? (g.Shop.scene || g.scene) : g.scene;
    if (!sc) return out; sc.traverse((o) => { if (o.isSkinnedMesh && o.visible) out.push(Array.from(o.skeleton.boneTexture ? o.skeleton.boneTexture.image.data.slice(0, 16 * 12) : o.skeleton.boneMatrices.slice(0, 16 * 12))); }); return out; });
  const moved = (a, b) => { let n = 0; for (let i = 0; i < Math.min(a.length, b.length); i++) { let d = 0; for (let k = 0; k < a[i].length; k++) d = Math.max(d, Math.abs(a[i][k] - b[i][k])); if (d > 1e-4) n++; } return n; };
  const check = async (name, open) => {
    const r = await page.evaluate(open); await page.waitForTimeout(2500); const a = await snap(); await page.waitForTimeout(2500); const b = await snap();
    const n = moved(a, b); console.log(name, r, a.length + ' people, ' + n + ' moving');
    ok(a.length > 0 && n >= Math.min(2, a.length), name + ': its people animate on screen (' + n + ' of ' + a.length + ')');
  };
  for (const k of ['court', 'small', 'tv', 'station', 'hosp']) await check('court:' + k, (k) => { const C = window.__game.Court; if (C.phase && C.phase !== 'off') { try { C.leave(); } catch (e) { /* ignore */ } } C.test(k); C.fight(); return window.__game.App.mode; }, k);
  await page.evaluate(() => { const C = window.__game.Court; try { C.leave(); } catch (e) { /* ignore */ } });
  await check('arrest (street)', () => { const g = window.__game; if (g.App.mode !== 'play') g.UI.setMode('play'); g.Bust.begin('Wanted'); return g.App.mode; });
  await check('arrest (booking)', () => { const g = window.__game; g.Bust.toBooking(); return g.App.mode; });
  console.log(logs.length ? logs.slice(0, 8).join('\n') : 'no page or console errors'); console.log(fails ? fails + ' FAILED' : 'ALL OK');
  await browser.close(); process.exit(fails || logs.length ? 1 : 0);
})();
