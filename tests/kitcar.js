/* Custom Car Works: build your own car from parts. Checks the parts catalogue (shells, engines, gearboxes, wheels, ...), that every engine
   in every shell makes a drivable car with sane numbers, that the parts matter (a hypercar engine in a hatch is quicker than the hatch, drag
   radials corner worse, a lift raises the car), then in the workshop: design a car at the station (the car on the turntable changes as you
   pick parts), name it, build it, find it parked at the door and drive it; reload the page and it is still yours; change its engine (you pay
   only for the new part); scrap it (40 % back).   usage: node tests/kitcar.js   (needs dist/test.html) ; env OUT=dir */
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = process.env.OUT || __dirname;
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } }); const page = await ctx.newPage(); const logs = [];
  page.on('pageerror', (e) => logs.push('PAGEERROR: ' + String(e.stack || e).slice(0, 600)));
  await page.route('**/three.min.js', (r) => r.fulfill({ path: path.resolve(__dirname, 'three.min.js'), contentType: 'application/javascript' }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.addInitScript(() => { window.__noAdapt = true; try { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('island-rush-v1', JSON.stringify({ money: 200000, set: { quality: 'low', traffic: 'off' } })); } } catch (e) { /* ignore */ } });
  const boot = async () => { await page.goto('file://' + path.resolve(__dirname, '../dist/test.html')); await page.waitForFunction(() => window.__ready || window.__bootError, null, { timeout: 170000 }); await page.evaluate(() => { const g = window.__game; g.App.start(); window.requestAnimationFrame = () => 0; window.__now = performance.now(); }); };
  await boot();
  let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
  const cat = await page.evaluate(() => {
    const g = window.__game, P = g.kitParts(), n = {}; for (const k in P) n[k] = P[k].length;
    let bad = []; const D = g.kitDefault();
    for (const s of P.shell) for (const e of P.engine) { const parts = Object.assign({}, D, { shell: s.id, engine: e.id, kit: [] }), d = g.kitDef('t', 't', 0, parts), q = d.est; if (!(q.top > 10 && q.top < 200 && isFinite(q.gLo) && d.p.m > 300)) bad.push(s.id + '+' + e.id + ' ' + JSON.stringify(q)); }
    const mk = (o) => g.kitDef('t', 't', 0, Object.assign({}, D, o)), hatch = mk({ shell: 's:kestrel', engine: 'e:kestrel', gears: 'g:kestrel', drive: 'fwd' }), hot = mk({ shell: 's:kestrel', engine: 'e:phantom', gears: 'g:phantom', drive: 'awd', tyre: 'semi' });
    const drag = mk({ tyre: 'drag' }), street = mk({}), lift = mk({ susp: 'lift', wheel: 'w:0.42bead', tyre: 'mud' });
    return { n, bad: bad.slice(0, 5), nbad: bad.length, pairs: P.shell.length * P.engine.length, hatch: hatch.est, hot: hot.est, dragG: drag.est.gLo, streetG: street.est.gLo, liftY: lift.body.y0, streetY: street.body.y0, liftOff: lift.stats.off, streetOff: street.stats.off };
  });
  console.log(JSON.stringify(cat.n));
  ok(cat.n.shell >= 12 && cat.n.engine >= 20 && cat.n.gears >= 10 && cat.n.wheel >= 15 && cat.n.kit >= 10 && cat.n.susp >= 5 && cat.n.tyre >= 6, 'the parts: ' + cat.n.shell + ' shells, ' + cat.n.engine + ' engines, ' + cat.n.gears + ' gearboxes, ' + cat.n.wheel + ' wheels, ' + cat.n.kit + ' body-kit pieces and more');
  ok(cat.nbad === 0, 'every engine in every shell makes a drivable car (' + cat.pairs + ' combinations)' + (cat.nbad ? ' ' + cat.bad.join('; ') : ''));
  ok(cat.hot.t100 < cat.hatch.t100 - 2 && cat.hot.top > cat.hatch.top, 'parts matter: the hypercar engine in the hatch shell does 0-100 in ' + cat.hot.t100.toFixed(1) + ' s (the stock hatch ' + cat.hatch.t100.toFixed(1) + ' s)');
  ok(cat.dragG < cat.streetG - 0.2, 'drag radials corner worse (' + cat.dragG.toFixed(2) + ' g against ' + cat.streetG.toFixed(2) + ' g)');
  ok(cat.liftY > cat.streetY + 0.15 && cat.liftOff > cat.streetOff, 'a lift and big off-road wheels raise the car and make it better off-road');
  /* the workshop */
  const r = await page.evaluate(() => {
    const g = window.__game, I = g.Int, run = (n) => { for (let i = 0; i < n; i++) { window.__now += 1000 / 30; g.frame(window.__now); } }, res = {};
    g.Bld.prep(); const S = g.Bld.sites.find((s) => s.kind === 'kitlab'); res.site = S && S.name; if (!S) return res; g.loadAround(S.x, S.z, 40); const rec = g.Bld.lots.get(S.key);
    const d = rec.door; g.spawnAt(d.ox + d.nz * 6, d.oz + d.nz * 6, 0); run(3); g.key('KeyF', true); g.key('KeyF', false); run(3); g.Foot.x = d.ox; g.Foot.z = d.oz; g.Foot.yaw = Math.atan2(-d.nx, -d.nz); run(4);
    res.near = g.Bld.near === rec; g.key('KeyE', true); g.key('KeyE', false); run(10); res.inside = I.on && I.rec === rec;
    const st = I.acts.find((a) => /Design/.test(typeof a.label === 'function' ? a.label() : a.label)); I.x = st.x; I.z = st.z; I.yaw = Math.PI; run(2); I.use(st); run(2); res.panel = !!I.pan && /Design a car/.test(I.pan.title);
    const meshes = (m) => { let n = 0; m.traverse((o) => { if (o.isMesh) n++; }); return n; };
    const box = () => { const B = new g.THREE_.Box3().setFromObject(I.K.sc.children.find((o) => o.userData && o.userData.paint)); return B.max.x - B.min.x + B.max.z - B.min.z; };
    const m0 = box(); I.pan.pick('cat:shell'); I.pan.pick('set:shell:s:hauler'); run(2); res.preview = Math.abs(box() - m0) > 0.3;
    I.pan.pick('set:shell:s:vanta'); I.pan.pick('cat:engine'); I.pan.pick('set:engine:e:phantom'); I.pan.pick('set:gears:g:phantom'); I.pan.pick('set:drive:awd'); I.pan.pick('set:tyre:semi'); I.pan.pick('set:aero:big'); I.pan.pick('kit:splitter'); I.pan.pick('kit:stripes'); I.pan.pick('paint:6'); run(2);
    const inp = document.querySelector('#intPan [data-kitname]'); inp.value = 'Test Rocket'; inp.dispatchEvent(new Event('input', { bubbles: true }));
    const shot0 = g.renderer.domElement.toDataURL('image/jpeg', 0.85);
    const money0 = g.save.money, b = I.pan.btns[0]; res.btn = b[0]; b[1](); run(3);
    const id = Object.keys(g.save.kit.cars)[0], def = g.CAR_BY_ID[id]; res.id = id; res.paid = money0 - g.save.money; res.price = def && def.price; res.owned = !!g.save.owned[id]; res.name = def && def.name;
    res.garage = (() => { I.leave(); run(6); g.UI.openMenu('garage'); const h = document.getElementById('pane').innerHTML; g.UI.closeMenu(); return h.indexOf('Test Rocket') >= 0; })();
    res.driving = g.save.car === id && Math.hypot(g.car.x - d.ox, g.car.z - d.oz) < 12; if (g.Foot.on) { g.Foot.x = g.car.x - 2; g.Foot.z = g.car.z; run(2); g.Foot.board(); }
    const z0 = { x: g.car.x, z: g.car.z }; g.key('KeyW', true); run(60); g.key('KeyW', false); res.moved = Math.hypot(g.car.x - z0.x, g.car.z - z0.z); res.kmh = Math.round(Math.abs(g.car.speed) * 3.6); res.nan = !isFinite(g.car.x + g.car.y + g.car.z);
    res.awd = g.CARP.awd; res.Tmax = g.tune.Tmax >= 640;
    const shot1 = g.renderer.domElement.toDataURL('image/jpeg', 0.85);
    return Object.assign(res, { shot0, shot1 });
  });
  for (const k of ['shot0', 'shot1']) if (r[k]) { fs.writeFileSync(path.join(OUT, 'kitcar_' + k + '.jpg'), Buffer.from(r[k].split(',')[1], 'base64')); delete r[k]; }
  console.log(JSON.stringify(r));
  ok(r.site && r.near && r.inside, 'the workshop: ' + r.site + ', walk in');
  ok(r.panel && r.preview, 'the design station: the car on the turntable changes as you pick a shell');
  ok(r.owned && r.paid === r.price && r.price > 5000 && r.name === 'Test Rocket', 'built: ' + r.name + ' for ' + r.paid + ' (the price of its parts), and it is yours');
  ok(r.garage, 'it is in the garage menu');
  ok(r.driving && r.moved > 10 && !r.nan && r.awd && r.Tmax, 'parked at the door and drivable: ' + r.moved.toFixed(0) + ' m in 2 s, ' + r.kmh + ' km/h, all-wheel drive with the hypercar engine');
  /* a reload: still yours, still the car you drive */
  await page.evaluate(() => { window.__game.UI && localStorage.setItem('island-rush-v1', JSON.stringify(window.__game.save)); });
  await boot();
  const r2 = await page.evaluate((id) => {
    const g = window.__game, I = g.Int, run = (n) => { for (let i = 0; i < n; i++) { window.__now += 1000 / 30; g.frame(window.__now); } }, res = {}; const d = g.CAR_BY_ID[id];
    res.kept = !!d && g.save.owned[id] && g.save.car === id && d.name === 'Test Rocket' && d.parts.engine === 'e:phantom';
    g.Bld.prep(); const S = g.Bld.sites.find((s) => s.kind === 'kitlab'); g.loadAround(S.x, S.z, 40); const rec = g.Bld.lots.get(S.key); I.enter(rec); run(4);
    const bl = I.acts.find((a) => /Your builds/.test(typeof a.label === 'function' ? a.label() : a.label)); I.x = bl.x; I.z = bl.z; run(1); I.use(bl); run(1); res.list = !!I.pan && /Your builds/.test(I.pan.title);
    I.pan.pick('edit:' + id); I.pan.pick('set:engine:e:bruiser'); const P = g.kitParts(), m0 = g.save.money; I.pan.btns[0][1](); run(2); res.repay = m0 - g.save.money; res.want = P.engine.by['e:bruiser'].price; res.newEngine = g.CAR_BY_ID[id].parts.engine === 'e:bruiser';
    const m1 = g.save.money; const back = g.KIT.scrap(id); res.scrap = !g.CAR_BY_ID[id] && !g.save.owned[id] && g.save.money === m1 + back && back > 0 && g.save.car !== id;
    return res;
  }, r.id);
  console.log(JSON.stringify(r2));
  ok(r2.kept, 'after a reload the build is still yours and still the car you drive');
  ok(r2.list && r2.newEngine && r2.repay === r2.want, 'change parts: a new engine costs just the engine (' + r2.repay + ')');
  ok(r2.scrap, 'scrap it: gone from the garage, 40 % of its parts back');
  console.log(logs.length ? logs.slice(0, 10).join('\n') : 'no page errors'); ok(!logs.length, 'no page errors');
  console.log(fails ? fails + ' FAILED' : 'ALL OK'); await browser.close(); process.exit(fails ? 1 : 0);
})();
