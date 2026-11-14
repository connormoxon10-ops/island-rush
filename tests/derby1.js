/* The destruction derby: start a full field from the race office, let it run (you sit still, so you get rammed), and check that cars hit each other, get
   wrecked and stay in the bowl, that the field is whittled down to a result, and that leaving puts your own car back.
   usage: node tests/derby1.js   env SHOTS=1 OUT=dir for screenshots   (needs dist/test.html: bash build.sh) */
const { chromium } = require('playwright'); const path = require('path'); const OUT = process.env.OUT || __dirname;
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage(); const logs = [];
  page.on('pageerror', (e) => logs.push('PAGEERROR: ' + String(e.stack || e).slice(0, 400)));
  page.on('console', (m) => { if (m.type() === 'error' && !/net::ERR|Failed to load resource/.test(m.text())) logs.push('console: ' + m.text().slice(0, 400)); });
  await page.route('**/three.min.js', (r) => r.fulfill({ path: path.resolve(__dirname, 'three.min.js'), contentType: 'application/javascript' }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.addInitScript(() => { window.__noAdapt = true; try { localStorage.setItem('island-rush-v1', JSON.stringify({ set: { quality: 'low' } })); } catch (e) { /* ignore */ } });
  await page.goto('file://' + path.resolve(__dirname, '../dist/test.html'));
  await page.waitForFunction(() => window.__ready || window.__bootError, null, { timeout: 170000 });
  const shot = async (n) => { if (!process.env.SHOTS) return; await page.waitForTimeout(3000); await page.screenshot({ path: path.join(OUT, 'derby_' + n + '.png'), timeout: 180000 }); };
  const a = await page.evaluate(async () => {
    const g = window.__game, D = g.Derby; g.App.start(); const was = { car: g.save.car, x: g.car.x, z: g.car.z }; window.__was = was;
    const pad = { connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 16 }, () => ({ value: 0, pressed: false })) }; navigator.getGamepads = () => [pad];
    g.App.mode = 'rlobby'; g.save.derby = { n: 8, car: 'rook' }; await D.start();
    return { on: D.on, n: D.list.length, car: g.save.car, phase: D.phase };
  });
  console.log(JSON.stringify(a)); await shot('grid');
  const b = await page.evaluate(() => { const g = window.__game, D = g.Derby, DD = g.DD; let t = 0, outside = 0, nan = 0, firstHit = -1, hp0 = g.car.health;
    for (; t < 12; t += 1 / 60) { g.stepSim(1 / 60); }
    window.__mid = { hits: D.list.filter((o) => !o.me && o.hp < 100).length };
    for (; t < 200 && D.phase !== 'done'; t += 1 / 60) {
      g.stepSim(1 / 60);
      for (const o of D.list) { const c = o.c; if (!(c.x === c.x)) nan++; if (D.inside(c.x - DD.X0, c.z - DD.Z0) > 0.5) outside++; }
      if (firstHit < 0 && D.list.some((o) => !o.me && o.hp < 95)) firstHit = t;
    }
    return { t: +t.toFixed(1), phase: D.phase, out: D.list.filter((o) => o.out).length, alive: D.list.filter((o) => !o.out).length, myHp: Math.round(g.car.health), hp0, firstHit: +firstHit.toFixed(1), outside, nan, mid: window.__mid,
      kills: D.list.reduce((s, o) => s + o.kills, 0), res: !document.getElementById('rres').hidden && document.getElementById('rres').textContent.slice(0, 90) }; });
  console.log(JSON.stringify(b)); await shot('end');
  const c = await page.evaluate(() => { const g = window.__game, D = g.Derby; D.exit(false); return { on: D.on, car: g.save.car, back: Math.hypot(g.car.x - window.__was.x, g.car.z - window.__was.z) < 30, rec: g.save.derby }; });
  console.log(JSON.stringify(c));
  let fails = 0; const ok = (q, m) => { if (!q) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
  ok(a.on && a.n === 8 && a.car === 'rook', 'the derby starts with 8 cars and lends you the banger');
  ok(b.firstHit > 0 && b.firstHit < 30, 'the rivals find each other and hit (first damage at ' + b.firstHit + ' s)');
  ok(b.myHp < b.hp0, 'you get rammed (health ' + b.myHp + ')');
  ok(b.out >= 6 && b.phase === 'done' && b.res, 'cars are wrecked one by one to a result (' + b.out + ' out after ' + b.t + ' s): ' + b.res);
  ok(b.outside === 0 && b.nan === 0, 'nobody leaves the bowl or blows up the physics');
  ok(b.kills > 0, 'wrecks are credited to whoever hit last (' + b.kills + ')');
  ok(!c.on && c.car === JSON.parse(JSON.stringify(c.car)) && c.back && c.rec.runs === 1, 'leaving puts your own car back where it was and records the derby');
  console.log(logs.length ? logs.slice(0, 6).join('\n') : 'no page or console errors'); console.log(fails ? fails + ' FAILED' : 'ALL OK');
  await browser.close(); process.exit(fails || logs.length ? 1 : 0);
})();
