/* Story Mode: days, the wait between dates with Mara, and what you can say to her on the phone. Days pass when the clock goes past midnight
   and after eight minutes of play. After a date she wants three days before the next (the next date's call does not come until then, and
   asking her on the phone tells you how long). On the phone the things you can say change with how she feels: cold, friends, close, together.
   usage: node tests/mara_pace.js */
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await (await browser.newContext({ viewport: { width: 640, height: 360 } })).newPage(); const logs = [];
  page.on('pageerror', (e) => logs.push('PAGEERROR: ' + String(e.stack || e).slice(0, 600)));
  await page.route('**/three.min.js', (r) => r.fulfill({ path: path.resolve(__dirname, 'three.min.js'), contentType: 'application/javascript' }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.addInitScript(() => { window.__noAdapt = true; try { localStorage.setItem('island-rush-mode', 'story');
    localStorage.setItem('island-rush-story-v1', JSON.stringify({ money: 3000, set: { quality: 'low', traffic: 'off' }, story: { ch: 3, st: 0, day: 5, dateDay: 5, f: { mara: 4 }, met: { mara: 1 }, sq: { pier: { st: 2, done: 1 }, mdinner: { st: 4, done: 1, day: 5 } } } })); } catch (e) { /* ignore */ } });
  await page.goto('file://' + path.resolve(__dirname, '../dist/test.html'));
  await page.waitForFunction(() => window.__ready || window.__bootError, null, { timeout: 400000 });
  let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
  await page.evaluate(async () => { const g = window.__game; g.App.start(); await new Promise((r) => setTimeout(r, 700)); window.requestAnimationFrame = () => 0; window.__now = performance.now(); window.__run = (n) => { for (let i = 0; i < n; i++) { window.__now += 1000 / 30; g.frame(window.__now); } };
    for (let i = 0; i < 40; i++) window.__run(1); while (g.Cut.on) { g.Cut.key('Escape'); window.__run(2); } });
  const boat = () => page.evaluate(() => !!window.__game.Story.entries().find((e) => e.key === 'sq:mboat'));
  /* days */
  const days = await page.evaluate(() => { const g = window.__game, S = g.Story.S(), d0 = S.day; g.App.tod = 23.6; window.__run(3); g.App.tod = 0.4; window.__run(3); const d1 = S.day; S.dayT = 479.9; window.__run(6); return { d0, d1, d2: S.day }; });
  console.log(JSON.stringify(days));
  ok(days.d1 === days.d0 + 1 && days.d2 === days.d0 + 2, 'a day passes at midnight (' + days.d0 + ' → ' + days.d1 + ') and after eight minutes of play (→ ' + days.d2 + ')');
  /* the wait: two days after dinner, no boat ride yet; she says how long */
  const talk = async (id, label) => page.evaluate(([id, label]) => { const g = window.__game, T = g.Phone.topics(id), t = T.find((x) => x[0] === label); if (!t) return { none: true, labels: T.map((x) => x[0]) }; const r = t[1](); return { say: r.say, eff: r.eff || null, labels: T.map((x) => x[0]) }; }, [id, label]);
  let w = await talk('mara', 'When’s our next date?'); const b2 = await boat();
  console.log(JSON.stringify(w));
  ok(!b2 && /Tomorrow|1 day/.test((w.say || []).join(' ')), 'two days after dinner: no boat ride yet, and on the phone she says “' + (w.say || [''])[0] + '”');
  await page.evaluate(() => { const g = window.__game; g.Dates.newDay(); window.__run(4); });
  const b3 = await boat(); ok(b3, 'on the third day the boat ride comes up');
  const gap = await page.evaluate(() => { const g = window.__game, S = g.Story.S(); S.sq.mboat = { st: 4, done: 1 }; g.Story.advance('sq:mboat', 4); S.sq.mboat.done = 1; S.sq.mboat.day = S.day; S.dateDay = S.day; window.__run(4); return { beach: !!g.Story.entries().find((e) => e.key === 'sq:mbeach'), say: (() => { const T = g.Phone.topics('mara'), t = T.find((x) => x[0] === 'When’s our next date?'); return t ? t[1]().say[0] : ''; })() }; });
  console.log(JSON.stringify(gap));
  ok(!gap.beach && /3 days/.test(gap.say), 'and after the boat ride the wait starts again (“' + gap.say + '”)');
  /* the phone, by how she feels */
  const tiers = await page.evaluate(() => { const g = window.__game, f = g.Story.F(), out = {};
    for (const [k, v, love, tod] of [['cold', -1, 0, 14], ['friend', 2, 0, 14], ['close', 4, 0, 14], ['love', 6, 1, 22.5]]) { f.mara = v; f.maraLove = love; g.App.tod = tod; const T = g.Phone.topics('mara'); out[k] = { tier: g.Dates.tier(), labels: T.map((x) => x[0]), how: T.find((x) => x[0] === 'How are you doing?')[1]().say[0] }; }
    return out; });
  for (const k in tiers) console.log(k, JSON.stringify(tiers[k]));
  ok(tiers.cold.tier === 'cold' && tiers.cold.labels.includes('Are we okay?') && !tiers.cold.labels.includes('Tell me a secret.') && tiers.cold.how === 'Fine.', 'cold: “Are we okay?”, short answers');
  ok(tiers.friend.labels.includes('How’s the van?') && tiers.friend.labels.includes('Coffee tomorrow?') && !tiers.friend.labels.includes('I was thinking about you.'), 'friends: the van, coffee tomorrow');
  ok(tiers.close.labels.includes('I was thinking about you.') && tiers.close.labels.includes('Tell me a secret.') && /Better now/.test(tiers.close.how), 'close: thinking about you, a secret, “' + tiers.close.how + '”');
  ok(tiers.love.labels.includes('Just calling to say goodnight.') && tiers.love.labels.includes('I keep thinking about the boat.') && /Missing you/.test(tiers.love.how), 'together, late at night: goodnight calls, the boat ride, “' + tiers.love.how + '”');
  /* warming her up works once a day */
  const warm = await page.evaluate(() => { const g = window.__game, f = g.Story.F(); f.mara = 4; f.maraLove = 0; const say = () => g.Phone.topics('mara').find((x) => x[0] === 'I was thinking about you.')[1](); const a = say(), b = say(); g.Dates.newDay(); const c = say(); return { a: !!a.eff, b: !!b.eff, c: !!c.eff }; });
  ok(warm.a && !warm.b && warm.c, 'saying sweet things warms her once a day, not every call');
  console.log(logs.length ? logs.slice(0, 10).join('\n') : 'no page errors'); ok(!logs.length, 'no page errors');
  console.log(fails ? fails + ' FAILED' : 'ALL OK'); await browser.close(); process.exit(fails ? 1 : 0);
})();
