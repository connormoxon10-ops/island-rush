const { chromium } = require('playwright');
const path = require('path');
const G = path.resolve(__dirname, '../dist/test.html');
const Q = process.argv[2] || 'low';
const steps = JSON.parse(process.argv[3] || '[]');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: +(process.env.VW||1280), height: +(process.env.VH||720) }, hasTouch: !!process.env.MOBILE, isMobile: !!process.env.MOBILE, deviceScaleFactor: process.env.MOBILE ? 2 : 1 }); const page = await ctx.newPage();
  const logs = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(m.type() + ': ' + m.text().slice(0, 400)); });
  page.on('pageerror', (e) => logs.push('PAGEERROR: ' + String(e.stack || e).slice(0, 800)));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.addInitScript(([q, extra]) => { window.__noAdapt = true; try { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('island-rush-v1', JSON.stringify(Object.assign({ set: { quality: q } }, extra))); sessionStorage.setItem('seeded', '1'); } } catch (e) {} }, [Q, JSON.parse(process.env.SAVE || '{}')]);
  await page.goto('file://' + G);
  await page.waitForFunction(() => window.__ready || window.__bootError, null, { timeout: 170000 });
  console.log('boot err', await page.evaluate(() => window.__bootError || null));
  for (const st of steps) {
    if (st.js) { const r = await page.evaluate(st.js); if (r !== undefined) console.log('js ->', JSON.stringify(r)); }
    if (st.wait) await page.waitForTimeout(st.wait);
    if (st.click) await page.click(st.click, { timeout: 120000 });
    if (st.shot) await page.screenshot({ path: st.shot, timeout: 120000 });
  }
  console.log(logs.join('\n'));
  await browser.close();
})();
