/* A look at every rally stage: starts each one in turn, drops the car at a few places along it and takes a screenshot there. Also the switch-over check: building
   a second stage takes the first one down (no leftover meshes), and nothing logs an error.
   usage: node tests/rally_tour.js   env STAGES=1,2 (default all), AT=0.2,0.55 (fractions of the stage), OUT=dir, TOD=0..3   (needs dist/test.html: bash build.sh) */
const { chromium } = require('playwright'); const path = require('path');
const OUT = process.env.OUT || __dirname, AT = (process.env.AT || '0.2,0.55').split(',').map(Number), TOD = +(process.env.TOD || 1);
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); const logs = [];
  page.on('pageerror', (e) => logs.push('PAGEERROR: ' + String(e.stack || e).slice(0, 400)));
  page.on('console', (m) => { if (m.type() === 'error' && !/net::ERR|Failed to load resource/.test(m.text())) logs.push('console: ' + m.text().slice(0, 500)); });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.addInitScript(() => { window.__noAdapt = true; try { localStorage.setItem('island-rush-v1', JSON.stringify({ set: { quality: 'low' } })); } catch (e) { /* ignore */ } });
  await page.goto('file://' + path.resolve(__dirname, '../dist/test.html'));
  await page.waitForFunction(() => window.__ready || window.__bootError, null, { timeout: 170000 });
  const n = await page.evaluate(() => { window.__game.App.start(); return window.__game.RY_STAGES.length; });
  const list = process.env.STAGES ? process.env.STAGES.split(',').map(Number) : Array.from({ length: n }, (_, i) => i);
  let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
  for (const si of list) {
    const r = await page.evaluate(async ([si, tod]) => {
      const g = window.__game, R = g.Rally; if (R.on) R.exit ? R.exit() : 0;
      g.App.mode = 'rlobby'; g.save.rally.stage = si; g.save.rally.tod = tod; g.save.rally.rivals = 0; R.tod = tod; await R.start();
      for (let i = 0; i < 30; i++) g.stepSim(1 / 60);
      return { on: R.on, name: g.RY.name, stage: g.RY.stage, L: g.RY.L, trees: g.RYG.stats.trees, tiles: g.RYG.tiles.length, groups: g.scene.children.filter((o) => o.name === 'rally').length, y: g.car.y, air: g.car.air };
    }, [si, TOD]);
    console.log(JSON.stringify(r));
    ok(r.on && r.stage === si, r.name + ' starts'); ok(r.groups === 1, r.name + ': one stage in the scene (the last was taken down)');
    for (const f of AT) {
      await page.evaluate(([f]) => { const g = window.__game, R = g.Rally; R.phase = 'run'; R.placeAt(g.RY.startS + (g.RY.finishS - g.RY.startS) * f, 0); for (let i = 0; i < 20; i++) g.stepSim(1 / 60); }, [f]);
      await page.waitForTimeout(3000); await page.screenshot({ path: path.join(OUT, 'stage' + si + '_' + Math.round(f * 100) + '.png') });
    }
    await page.evaluate(() => { const R = window.__game.Rally; if (R.leave) R.leave(); else if (R.exit) R.exit(); else if (R.quit) R.quit(); });
  }
  console.log(logs.length ? logs.slice(0, 8).join('\n') : 'no page or console errors'); console.log(fails ? fails + ' FAILED' : 'ALL OK');
  await browser.close(); process.exit(fails || logs.length ? 1 : 0);
})();
