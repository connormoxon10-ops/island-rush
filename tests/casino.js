/* The casino. Finds the Golden Ace and the Neon Palace, walks in (pictures), checks the floor (slot machines, the roulette wheel, blackjack tables,
   the bar, the cashier), then plays with the luck fixed so the sums can be checked: three diamonds pay 100×, three lemons 8×, one cherry your bet
   back; roulette on red, on black and on a single number (35:1) while the wheel spins; blackjack: a natural pays 3:2, 20 beats 17, a bust loses,
   a double doubles; a drink costs $15; the cashier's record adds up.   usage: node tests/casino.js ; env OUT=dir */
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = process.env.OUT || __dirname;
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await (await browser.newContext({ viewport: { width: 800, height: 450 } })).newPage(); const logs = [];
  page.on('pageerror', (e) => logs.push('PAGEERROR: ' + String(e.stack || e).slice(0, 600)));
  await page.route('**/three.min.js', (r) => r.fulfill({ path: path.resolve(__dirname, 'three.min.js'), contentType: 'application/javascript' }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.addInitScript(() => { window.__noAdapt = true; try { localStorage.setItem('island-rush-v1', JSON.stringify({ money: 100000, set: { quality: 'low', traffic: 'off' } })); } catch (e) { /* ignore */ } });
  await page.goto('file://' + path.resolve(__dirname, '../dist/test.html'));
  await page.waitForFunction(() => window.__ready || window.__bootError, null, { timeout: 170000 });
  let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
  const shot = async (n) => { const u = await page.evaluate(() => { const g = window.__game; g.renderer.setRenderTarget(null); window.__run(1); return g.renderer.domElement.toDataURL('image/jpeg', 0.85); }); fs.writeFileSync(path.join(OUT, 'casino_' + n + '.jpg'), Buffer.from(u.split(',')[1], 'base64')); };
  const sites = await page.evaluate(() => { const g = window.__game; g.App.start(); window.requestAnimationFrame = () => 0; window.__now = performance.now(); window.__run = (n) => { for (let i = 0; i < n; i++) { window.__now += 1000 / 30; g.frame(window.__now); } };
    g.Bld.prep(); return g.Bld.sites.filter((s) => s.kind === 'casino').map((s) => ({ key: s.key, name: s.name, town: s.T.name })); });
  console.log(JSON.stringify(sites));
  ok(sites.length === 2 && sites.some((s) => /Golden Ace/.test(s.name)) && sites.some((s) => /Neon Palace/.test(s.name)), 'two casinos: ' + sites.map((s) => s.name + ' (' + s.town + ')').join(', '));
  for (const [k, S] of sites.entries()) {
    const r = await page.evaluate((key) => { const g = window.__game, I = g.Int; if (g.App.mode === 'int') I.leave(true); g.Bld.prep(); const S = g.Bld.sites.find((s) => s.key === key); g.loadAround(S.x, S.z, 12); const rec = g.Bld.lots.get(key); if (!rec) return { rec: false };
      const d = rec.door; g.spawnAt(d.ox + d.nz * 6, d.oz + d.nz * 6, 0); window.__run(3); g.key('KeyF', true); g.key('KeyF', false); window.__run(3); g.Foot.x = d.ox; g.Foot.z = d.oz; g.Foot.yaw = Math.atan2(-d.nx, -d.nz); window.__run(4);
      g.key('KeyE', true); g.key('KeyE', false); window.__run(20); const labels = I.acts.map((a) => (typeof a.label === 'function' ? a.label() : a.label)); return { rec: true, inside: g.App.mode === 'int' && I.rec === rec, labels, npcs: I.npcs.length, machines: g.Casino.machines.length };
    }, S.key);
    ok(r.inside, 'walk into ' + S.name + ' through its door');
    const L = r.labels || [];
    ok(L.filter((l) => /slot/.test(l)).length >= 4 && L.some((l) => /roulette/.test(l)) && L.filter((l) => /blackjack/.test(l)).length === 2 && L.some((l) => /drink/.test(l)) && L.some((l) => /Cashier/.test(l)) && r.npcs >= 6, S.name + ': ' + L.filter((l) => /slot/.test(l)).length + ' slot machines, roulette, two blackjack tables, a bar, the cashier, ' + r.npcs + ' people');
    await page.evaluate(() => { const g = window.__game, I = g.Int; I.yaw = Math.PI; I.pitch = -0.08; window.__run(6); }); await shot(k + '_floor');
    await page.evaluate(() => { const g = window.__game, I = g.Int; I.yaw = Math.PI * 0.7; window.__run(4); }); await shot(k + '_tables');
  }
  /* the sums, with the luck fixed */
  const slots = await page.evaluate(async () => {
    const g = window.__game, C = g.Casino, I = g.Int, M = C.machines[0], out = {}, wait = () => new Promise((r) => setTimeout(r, 1700)), q = (seq) => { let i = 0; C.rng = () => seq[i++ % seq.length]; };
    C.slots(M); out.panel = /Slot machine/.test(I.pan.title); I.pan.pick('bet:100');
    q([0.97]); let m0 = g.save.money; I.pan.btns[0][1](); await wait(); out.dia = g.save.money - m0; out.reels = document.querySelector('.csreels').textContent;
    q([0.5]); m0 = g.save.money; I.pan.btns[0][1](); await wait(); out.lem = g.save.money - m0;
    q([0.97, 0.5, 0.1]); m0 = g.save.money; I.pan.btns[0][1](); await wait(); out.one = g.save.money - m0;
    q([0.5, 0.7, 0.9]); m0 = g.save.money; I.pan.btns[0][1](); await wait(); out.none = g.save.money - m0;
    window.__run(2); out.pic = g.renderer.domElement.toDataURL('image/jpeg', 0.8); return out;
  });
  console.log(JSON.stringify(Object.assign({}, slots, { pic: undefined })));
  ok(slots.panel && slots.dia === 9900 && /💎💎💎/.test(slots.reels.replace(/\s/g, '')), 'slots: three diamonds on $100 pay 100× (+' + slots.dia + ')');
  ok(slots.lem === 700 && slots.one === 0 && slots.none === -100, 'three lemons 8× (+' + slots.lem + '), one cherry your bet back (' + slots.one + '), nothing loses the bet (' + slots.none + ')');
  const rou = await page.evaluate(() => {
    const g = window.__game, C = g.Casino, I = g.Int, out = {}, spin = (on, n) => { C.rng = () => (n + 0.5) / 37; I.pan.pick('on:' + on); const m0 = g.save.money; I.pan.btns[0][1](); const spun = C.spinT > 0, r0 = C.wheel.rotation.y; window.__run(40); const turned = Math.abs(C.wheel.rotation.y - r0) > 1; window.__run(70); return { d: g.save.money - m0, spun, turned }; };
    C.roulette(); I.pan.pick('bet:100'); out.red = spin('red', 1); out.black = spin('black', 1); out.num = spin('n17', 17); out.zero = spin('even', 0); out.hist = document.querySelector('.cshist').textContent; return out;
  });
  console.log(JSON.stringify(rou));
  ok(rou.red.d === 100 && rou.black.d === -100 && rou.num.d === 3500 && rou.zero.d === -100, 'roulette on $100: 1 red wins on red (+' + rou.red.d + ') and loses on black (' + rou.black.d + '), 17 pays 35:1 (+' + rou.num.d + '), 0 loses on even');
  ok(rou.red.spun && rou.red.turned, 'the wheel spins and the ball rolls before the number comes up');
  const bj = await page.evaluate(() => {
    const g = window.__game, C = g.Casino, I = g.Int, out = {}, fill = Array(20).fill('2♣'), play = (cards, act) => { C.deck = fill.concat(cards.slice().reverse()); const m0 = g.save.money; C.bjPlay.deal(); if (act) act(); return { d: g.save.money - m0, msg: C.bj.msg }; };
    C.blackjack(); I.pan.pick('bet:100');
    out.natural = play(['A♠', 'K♥', '9♣', '7♦']);
    out.win = play(['K♠', 'Q♥', '10♣', '7♦'], () => C.bjPlay.stand());
    out.bust = play(['10♠', '6♥', '9♣', '8♦', '9♥'], () => C.bjPlay.hit());
    out.dbl = play(['6♠', '5♥', '10♣', '7♦', '10♥'], () => C.bjPlay.dbl());
    out.push = play(['K♠', '9♥', '10♣', '9♦'], () => C.bjPlay.stand());
    out.html = document.getElementById('intPan').innerHTML.length; out.pic = g.renderer.domElement.toDataURL('image/jpeg', 0.8); return out;
  });
  console.log(JSON.stringify(Object.assign({}, bj, { pic: undefined })));
  ok(bj.natural.d === 150 && bj.win.d === 100 && bj.bust.d === -100 && bj.dbl.d === 200 && bj.push.d === 0, 'blackjack on $100: a natural pays 3:2 (+' + bj.natural.d + '), 20 beats 17 (+' + bj.win.d + '), a bust loses (' + bj.bust.d + '), 11 doubled to 21 wins double (+' + bj.dbl.d + '), 19 against 19 is a push');
  const rest = await page.evaluate(() => { const g = window.__game, I = g.Int, out = {}; const a = I.acts.find((q) => /drink/.test(q.label)), m0 = g.save.money; a.fn(); out.drink = g.save.money - m0; g.Casino.cashier(); out.cash = document.getElementById('intPan').textContent; out.rec = g.save.casino; return out; });
  console.log(JSON.stringify(rest));
  const R = rest.rec; ok(rest.drink === -15 && R.plays === 13 && R.won === 9900 + 700 + 100 + 3500 + 150 + 100 + 200 && R.lost === 100 + 100 + 100 + 100 && R.best === 9900 && /Biggest win/.test(rest.cash), 'a drink is $15; the cashier\'s record adds up (' + R.plays + ' games, won ' + R.won + ', lost ' + R.lost + ', best ' + R.best + ')');
  console.log(logs.length ? logs.slice(0, 10).join('\n') : 'no page errors'); ok(!logs.length, 'no page errors');
  console.log(fails ? fails + ' FAILED' : 'ALL OK'); await browser.close(); process.exit(fails ? 1 : 0);
})();
