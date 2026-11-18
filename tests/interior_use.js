/* Using the special buildings: buy a flat and sleep in it, buy a car at a dealership (and it is outside when you leave; the garage menu
   sends you to a dealer instead of selling cars), work out at a gym, swim laps in an indoor pool, put money in the bank, eat at a restaurant,
   buy and wear clothes, and do time in the county jail (the door stays locked until you have slept it off, then your car is by the door).
   usage: node tests/interior_use.js   (needs dist/test.html) */
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await (await browser.newContext({ viewport: { width: 960, height: 540 } })).newPage(); const logs = [];
  page.on('pageerror', (e) => logs.push('PAGEERROR: ' + String(e.stack || e).slice(0, 600)));
  await page.route('**/three.min.js', (r) => r.fulfill({ path: path.resolve(__dirname, 'three.min.js'), contentType: 'application/javascript' }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.addInitScript(() => { window.__noAdapt = true; try { localStorage.setItem('island-rush-v1', JSON.stringify({ money: 900000, set: { quality: 'low', traffic: 'off' } })); } catch (e) { /* ignore */ } });
  await page.goto('file://' + path.resolve(__dirname, '../dist/test.html'));
  await page.waitForFunction(() => window.__ready || window.__bootError, null, { timeout: 170000 });
  let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
  const r = await page.evaluate(() => {
    const g = window.__game, I = g.Int, run = (n) => { for (let i = 0; i < n; i++) { window.__now += 1000 / 30; g.frame(window.__now); } }, res = {};
    g.App.start(); window.requestAnimationFrame = () => 0; window.__now = performance.now(); g.Bld.prep();
    const go = (kind) => { if (I.on) I.leave(true); const S = g.Bld.sites.find((s) => s.kind === kind); g.loadAround(S.x, S.z, 40); const rec = kind === 'jail' ? g.Jail.rec() : g.Bld.lots.get(S.key); g.App.tod = 12; I.enter(rec); run(4); return rec; };
    const act = (re) => I.acts.find((a) => re.test(typeof a.label === 'function' ? a.label() : a.label));
    const use = (a) => { I.x = a.x; I.z = a.z; run(1); I.use(a); run(2); };
    const errs = res.errs = []; const step = (n, f) => { try { f(); } catch (e) { errs.push(n + ': ' + String(e && e.message || e)); } };
    step('flat', () => {
    const ap = go('apts'); use(act(/Take the lift/)); I.pan.pick('3'); run(4); res.hall = I.room === 'hall';
    const door = act(/Flat 3A/); use(door); res.forSale = !!I.pan && /Flat 3A/.test(I.pan.title); const m0 = g.save.money; I.pan.btns[0][1](); run(4);
    res.bought = I.room === 'flat' && Object.keys(g.intSave().apts).some((k) => k.indexOf(ap.key + '#3-0') === 0) && g.save.money < m0;
    g.App.tod = 23; const n0 = g.intSave().nights || 0; use(act(/Sleep until/)); run(70); res.slept = (g.intSave().nights || 0) === n0 + 1 && g.App.tod > 6 && g.App.tod < 9;
    /* back out, and the flat is still yours */
    use(act(/Back to the corridor/)); run(3); res.backHall = I.room === 'hall'; res.mine = /yours/.test(act(/[Ff]lat 3A/).label());
    });
    step('car', () => {
    if (I.on) I.leave(true); run(2);
    const pane = (() => { g.UI.openMenu('garage'); const h = document.getElementById('pane').innerHTML; g.UI.closeMenu(); return h; })(); res.noBuy = !/data-act="buycar"/.test(pane) && /data-act="dealer"/.test(pane);
    const dr = go('dealer'); const looks = I.acts.filter((a) => /Look at the/.test(typeof a.label === 'function' ? a.label() : a.label)); const pick = looks.find((a) => { const nm = a.label().replace(/^Look at the /, ''); const d = g.CARS.find((c) => c.name === nm); return d && !g.save.owned[d.id]; });
    use(pick); const nm = pick.label().replace(/^Look at the /, ''), d = g.CARS.find((c) => c.name === nm); res.carPanel = !!I.pan && I.pan.title === d.name; I.pan.btns[0][1](); run(2); res.carOwned = !!g.save.owned[d.id];
    I.leave(); run(10); res.carHere = g.save.car === d.id && Math.hypot(g.car.x - dr.door.ox, g.car.z - dr.door.oz) < 12 && g.Foot.on;
    });
    step('gym', () => {
    go('gym'); const f0 = g.intSave().fit || 0; use(act(/Bench press/)); let k = 0; while (I.busy && I.busy.press && !I.busy.done && k++ < 40) { const B = I.busy; B.u = (B.zone[0] + B.zone[1]) / 2; B.press(); run(1); } run(80); res.fit = (g.intSave().fit || 0) - f0; res.gymFree = !I.busy;
    });
    step('pool', () => {
    go('pool'); const s0 = g.intSave().swims || 0; let sw = null; for (let x = -12; x <= 12 && !sw; x += 0.5) for (let z = -12; z <= 12 && !sw; z += 0.5) if (I.swim && I.swim.at(x, z) && I.swim.at(x, z + 11)) sw = [x, z];
    if (sw) { I.x = sw[0]; I.z = sw[1]; I.yaw = 0; run(10); res.inWater = I.y < -0.2; for (let n = 0; n < 6; n++) { I.z = sw[1]; I.x = sw[0]; run(1); for (let q = 0; q < 20; q++) { I.z += 0.5; run(1); } } }
    res.swims = (g.intSave().swims || 0) - s0;
    });
    step('bank', () => {
    go('bank'); const w0 = g.save.money; use(act(/Banking at window/)); const dep = I.pan.btns.find((b) => /Deposit all/.test(b[0])); dep[1](); run(1); res.bank = g.save.money === 0 && g.intSave().acct === w0;
    const wd = I.pan.btns.find((b) => /Withdraw all/.test(b[0])); wd[1](); run(1); res.unbank = g.save.money === w0 && g.intSave().acct === 0; I.panel(null);
    });
    step('resto', () => {
    go('resto'); g.car.health = 40; const mm = g.save.money; use(act(/^Order /)); res.ate = g.save.money < mm && g.car.health > 40;
    });
    step('clothes', () => {
    go('clothes'); use(act(/Browse the collection/)); const btn = document.querySelector('#intPan [data-ia]:not([disabled])'); const id = btn && btn.dataset.ia; if (id) I.pan.pick(id); run(2); res.wear = !!id && !!g.save.cos.own[id] && Object.values(g.save.cos.out).includes(id);
    I.panel(null);
    });
    step('jail', () => {
    if (I.on) I.leave(true); g.Jail.serve(4, 'test'); run(5); res.cells = I.on && I.room === 'cells' && g.Jail.left > 3;
    I.leave(); run(2); res.locked = I.on && I.room === 'cells';
    use(act(/Sleep on the bunk/)); run(60); res.served = g.Jail.left === 0;
    const jr = I.rec; use(act(/Walk out a free person/)); run(10); res.free = g.App.mode === 'play' && !g.Jail.on && g.Foot.on && Math.hypot(g.car.x - jr.door.ox, g.car.z - jr.door.oz) < 12;
    });
    return res;
  });
  console.log(JSON.stringify(r)); for (const e of r.errs) console.log('ERROR in', e);
  ok(r.hall && r.forSale && r.bought, 'apartments: the lift to floor 3, flat 3A for sale on its door, bought');
  ok(r.slept, 'apartments: sleep in your flat until morning');
  ok(r.backHall && r.mine, 'apartments: out to the corridor, and the door says it is yours');
  ok(r.noBuy, 'the garage menu no longer sells cars: it sends you to a dealership');
  ok(r.carPanel && r.carOwned && r.carHere, 'dealership: look at a car on the floor, buy it, and it is waiting outside the door when you leave');
  ok(r.fit > 2 && r.gymFree, 'gym: a set of bench presses in time makes you fitter (+' + (r.fit || 0).toFixed(1) + ')');
  ok(r.inWater && r.swims >= 1, 'indoor pool: walk into the water and swim; every 50 m counts (' + r.swims + ')');
  ok(r.bank && r.unbank, 'bank: deposit everything and take it out again');
  ok(r.ate, 'restaurant: order a meal (paid, the car topped up)');
  ok(r.wear, 'clothing shop: buy something and wear it');
  ok(r.cells && r.locked, 'jail: doing time in the cells, and the door is locked');
  ok(r.served && r.free, 'jail: sleep off your time, walk out a free person, your car by the door');
  console.log(logs.length ? logs.slice(0, 10).join('\n') : 'no page errors'); ok(!logs.length, 'no page errors');
  console.log(fails ? fails + ' FAILED' : 'ALL OK'); await browser.close(); process.exit(fails ? 1 : 0);
})();
