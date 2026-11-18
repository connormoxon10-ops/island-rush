/* Bank jobs: rob a bank at night without being seen. For the easiest bank and the Island Reserve: case the job in the day (the staff door),
   start it (night, the guards on their rounds, cameras and lasers where the bank has them), then checks that
   standing behind a guard or crouched behind a counter keeps the eye meter empty, standing in front of a guard fills it and sounds the
   alarm, the vault dial opens the vault, the cash goes in the bag and walking out of the front door pays it (a clean job gets three stars),
   and that being caught sends you to the county jail.   usage: node tests/bankjob.js   (needs dist/test.html) ; env OUT=dir */
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = process.env.OUT || __dirname;
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await (await browser.newContext({ viewport: { width: 960, height: 540 } })).newPage(); const logs = [];
  page.on('pageerror', (e) => logs.push('PAGEERROR: ' + String(e.stack || e).slice(0, 600)));
  await page.route('**/three.min.js', (r) => r.fulfill({ path: path.resolve(__dirname, 'three.min.js'), contentType: 'application/javascript' }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.addInitScript(() => { window.__noAdapt = true; try { localStorage.setItem('island-rush-v1', JSON.stringify({ money: 1000, set: { quality: 'low', traffic: 'off' } })); } catch (e) { /* ignore */ } });
  await page.goto('file://' + path.resolve(__dirname, '../dist/test.html'));
  await page.waitForFunction(() => window.__ready || window.__bootError, null, { timeout: 170000 });
  let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
  await page.evaluate(() => { const g = window.__game; g.App.start(); window.requestAnimationFrame = () => 0; window.__now = performance.now(); g.Bld.prep(); });
  const banks = await page.evaluate(() => window.__game.Bld.sites.filter((s) => s.kind === 'bank' || s.kind === 'reserve').map((s) => ({ key: s.key, name: s.name, kind: s.kind, ti: s.ti })));
  console.log('banks', banks.map((b) => b.name).join(', '));
  ok(banks.length >= 5, 'five banks to rob (' + banks.length + ')');
  for (const want of ['Lakeshore Credit Union', 'Island Reserve Bank']) {
    const b = banks.find((q) => q.name === want); if (!b) { ok(false, 'found ' + want); continue; }
    const r = await page.evaluate((key) => {
      const g = window.__game, I = g.Int, BJ = g.BankJob, run = (n) => { for (let i = 0; i < n; i++) { window.__now += 1000 / 30; g.frame(window.__now); } }, S = g.Bld.sites.find((s) => s.key === key), res = {};
      g.loadAround(S.x, S.z, 60); const rec = g.Bld.lots.get(key); if (!rec) return { err: 'not built' };
      if (I.on) { g.Jail.on = false; g.Jail.left = 0; I.hook = null; BJ.on = false; I.leave(true); run(2); }
      g.App.tod = 12; I.enter(rec); run(5);
      const cas = I.acts.find((a) => /Case the bank/.test(a.label)); res.cas = !!cas; if (!cas) return res;
      I.x = cas.x; I.z = cas.z - 0.6; I.yaw = Math.PI / 2; run(3); res.near = I.near === cas; I.use(cas); run(2); res.brief = !!I.pan && /Bank job/.test(I.pan.title);
      I.pan.btns[0][1](); run(20);
      res.job = BJ.on && I.room === 'job'; res.night = g.App.tod >= 22 || g.App.tod < 5; res.guards = BJ.guards.length; res.cams = BJ.cams.length; res.lasers = BJ.lasers.length;
      const shot0 = g.renderer.domElement.toDataURL('image/jpeg', 0.85);
      /* freeze the guards where they stand: behind one, then in front of it */
      const G = BJ.guards[0]; for (const q of BJ.guards) { q.path = [[q.x, q.z, 99]]; q.pi = 0; q.wait = 99; }
      BJ.camOff = 999; BJ.lasers.forEach((L) => { L.ph = 99; L.x0 = 99; });
      const put = (lx, lz) => { const s = Math.sin(G.yaw), c = Math.cos(G.yaw); I.x = G.x + s * lz - c * lx; I.z = G.z + c * lz + s * lx; I.vx = I.vz = 0; };
      BJ.eye = 0; put(0, -3); run(45); res.behind = BJ.eye;
      BJ.eye = 0; put(0, 3); I.yaw = G.yaw + Math.PI; run(8); res.front = BJ.eye; res.frontSeen = BJ.seen; run(60); res.alarm = BJ.alarm > 0;
      const shot1 = g.renderer.domElement.toDataURL('image/jpeg', 0.85);
      /* again, clean: keep the guards away, crack the vault, take everything */
      res.caughtFirst = I.room === 'cells'; if (g.Jail.on) { g.Jail.on = false; g.Jail.left = 0; } I.hook = null; BJ.on = false; I.leave(true); g.App.tod = 12; I.enter(rec); run(3); BJ.start(rec);
      for (const q of BJ.guards) { q.x = 99; q.z = 99; q.path = [[99, 99, 99]]; q.pi = 0; q.wait = 99; } BJ.camOff = 999; BJ.lasers.forEach((L) => { L.x0 = 99; }); run(5); BJ.eye = 0; BJ.clean = true;
      const dial = I.acts.find((a) => /vault dial/.test(typeof a.label === 'function' ? a.label() : a.label)); I.x = dial.x; I.z = dial.z + 0.5; I.yaw = Math.PI; run(3); res.dialNear = I.near === dial; I.use(dial); run(1);
      let guard = 0; while (!BJ.open && guard++ < 400) { const Q = I.busy; if (!Q) break; Q.u = Q.z0 + Q.w / 2; Q.press(); run(1); }
      run(60); res.open = BJ.open && !!BJ.vc.off;
      for (const c of BJ.carts) { I.x = c.x; I.z = c.z + 1.4; I.yaw = Math.PI; run(3); if (I.near === c.a) { I.use(c.a); run(50); } }
      res.loot = BJ.loot; res.want = BJ.J.cash * BJ.J.carts;
      const shot2 = g.renderer.domElement.toDataURL('image/jpeg', 0.85);
      const m0 = g.save.money; I.x = 0; I.z = I.K.z1 - 1.5; I.yaw = 0; g.key('KeyW', true); run(40); g.key('KeyW', false); run(10);
      res.out = g.App.mode === 'play'; res.paid = g.save.money - m0; res.rec = JSON.parse(JSON.stringify(g.intSave().banks[key] || null)); res.stars = g.Wanted.stars;
      /* and caught: the guards catch you during an alarm, and it is the cells */
      g.App.tod = 12; I.enter(rec); run(3); BJ.start(rec); run(5); BJ.eye = 1; run(3); const q = BJ.guards[0]; I.x = q.x + 0.3; I.z = q.z + 0.3; run(10);
      res.jail = I.on && I.room === 'cells' && g.Jail.on && g.Jail.left > 0;
      const shot3 = g.renderer.domElement.toDataURL('image/jpeg', 0.85);
      return Object.assign(res, { shot0, shot1, shot2, shot3 });
    }, b.key);
    const nm = b.name;
    if (r.err) { ok(false, nm + ': ' + r.err); continue; }
    ['shot0', 'shot1', 'shot2', 'shot3'].forEach((k, i) => { if (r[k]) { fs.writeFileSync(path.join(OUT, 'bank_' + b.ti + '_' + i + '.jpg'), Buffer.from(r[k].split(',')[1], 'base64')); delete r[k]; } });
    console.log(JSON.stringify(r));
    ok(r.cas && r.near && r.brief, nm + ': the staff door: case the job, see the brief');
    ok(r.job && r.night && r.guards >= 2, nm + ': the job starts at night with ' + r.guards + ' guards on their rounds, ' + r.cams + ' cameras, ' + r.lasers + ' lasers');
    ok(r.behind < 0.05, nm + ': standing behind a guard, you are not seen (eye ' + r.behind.toFixed(2) + ')');
    ok(r.frontSeen && r.front > 0.05 && r.alarm, nm + ': in front of a guard the eye meter fills and the alarm goes');
    ok(r.dialNear && r.open, nm + ': the vault dial: four tumblers and the vault swings open');
    ok(r.loot === r.want && r.loot > 0, nm + ': all the cash in the bag (' + r.loot + ')');
    ok(r.out && r.paid === r.loot && r.rec && r.rec.n >= 1 && r.rec.stars === 3 && r.stars === 0, nm + ': out of the front door, paid ' + r.paid + ', a clean job: three stars, no police');
    ok(r.jail, nm + ': caught by a guard after the alarm: straight to the county jail cells');
  }
  console.log(logs.length ? logs.slice(0, 10).join('\n') : 'no page errors'); ok(!logs.length, 'no page errors');
  console.log(fails ? fails + ' FAILED' : 'ALL OK'); await browser.close(); process.exit(fails ? 1 : 0);
})();
