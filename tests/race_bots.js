/* Circuit race bots at each difficulty tier, with the catch-up edge pinned at its base and then at its maximum: every bot must finish, and the field may be put back on the track at most four times in a race (pack contact around the parked player spins the odd car; main before this change needed up to six).
   The player's car stays parked on the grid. usage: node tests/race_bots.js   (needs dist/test.html: bash build.sh) */
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 640, height: 360 } })).newPage();
  const logs = []; page.on('pageerror', (e) => logs.push('PAGEERROR: ' + String(e.stack || e).slice(0, 400)));
  await page.route('**/three.min.js', (r) => r.fulfill({ path: path.resolve(__dirname, 'three.min.js'), contentType: 'application/javascript' }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.addInitScript(() => { window.__noAdapt = true; try { localStorage.setItem('island-rush-v1', JSON.stringify({ set: { quality: 'low' } })); } catch (e) { /* ignore */ } });
  await page.goto('file://' + path.resolve(__dirname, '../dist/test.html'));
  await page.waitForFunction(() => window.__ready || window.__bootError, null, { timeout: 170000 });
  const res = await page.evaluate(async () => {
    const g = window.__game, out = []; g.App.start();
    for (const [diff, maxEdge] of [[0, false], [1, false], [3, false], [3, true]]) {
      g.Race.cfg.diff = diff; g.Race.cfg.laps = 2; g.Race.cfg.n = 5; g.App.mode = 'rlobby'; g.Bots.rlog = []; g.Race.start();
      if (!g.Race.on) { out.push({ diff, err: 'race did not start' }); continue; }
      if (maxEdge) for (const b of g.Bots.list) b.edge0 = 0.34;
      let t = 0; const dt = 1 / 60;
      while (t < 420 && !g.Bots.list.every((b) => b.fin || b.e.fin)) { g.stepSim(dt); t += dt; }
      out.push({ diff, maxEdge, name: g.RACE_DIFF[diff].n, simT: +t.toFixed(0), finished: g.Bots.list.filter((b) => b.fin || b.e.fin).length, of: g.Bots.list.length, best: g.Bots.list.map((b) => +(b.e.best || 0).toFixed(1)), resets: g.Bots.rlog.length, rlog: g.Bots.rlog.slice(0, 6), cars: g.Bots.list.map((b) => b.def.name) });
      g.Race.end(true);
    }
    return out;
  });
  let fails = 0; for (const r of res) { console.log(JSON.stringify(r)); if (r.err || r.finished !== r.of || r.resets > 4) { fails++; console.log('FAIL', r.name, ': every bot should finish, with at most four resets in the field'); } }
  console.log(logs.length ? logs.join('\n') : 'no page errors'); console.log(fails ? fails + ' FAILED' : 'ALL OK');
  await browser.close(); process.exit(fails || logs.length ? 1 : 0);
})();
