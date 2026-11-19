/* Resetting Story Mode. With a story save part way through (chapter 4, money, a car) and a free-roam save beside it: the title shows Reset story
   under Story mode; one click only asks, a second erases the story and the page comes back with a fresh one (free roam untouched). Then from
   inside the game: the quest log's Reset story (pause menu → Story) does the same, and the story starts over at chapter 1.
   usage: node tests/story_reset.js   (needs dist/test.html) */
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await (await browser.newContext({ viewport: { width: 640, height: 360 } })).newPage(); const logs = [];
  page.on('pageerror', (e) => logs.push('PAGEERROR: ' + String(e.stack || e).slice(0, 600)));
  await page.route('**/three.min.js', (r) => r.fulfill({ path: path.resolve(__dirname, 'three.min.js'), contentType: 'application/javascript' }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.addInitScript(() => { window.__noAdapt = true; try { if (!localStorage.getItem('test-seeded')) { localStorage.clear(); localStorage.setItem('test-seeded', '1'); localStorage.setItem('island-rush-mode', 'story');
    localStorage.setItem('island-rush-v1', JSON.stringify({ money: 777, set: { quality: 'low', traffic: 'off' } }));
    localStorage.setItem('island-rush-story-v1', JSON.stringify({ money: 9000, owned: { rook: true, kestrel: true }, set: { quality: 'low', traffic: 'off' }, story: { ch: 3, st: 0, f: { mara: 4 }, met: { mara: 1 } } })); } } catch (e) { /* ignore */ } });
  const waitReady = async () => { for (let i = 0; i < 240; i++) { try { if (await page.evaluate(() => !!window.__ready)) return; } catch (e) { /* navigating */ } await page.waitForTimeout(1000); } };
  let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
  await page.goto('file://' + path.resolve(__dirname, '../dist/test.html')); await waitReady();
  const t0 = await page.evaluate(() => { const r = document.querySelector('[data-act="sqreset"]'); return { label: document.getElementById('btnStory').textContent, reset: !!r, money: window.__game.save.money, ch: window.__game.save.story.ch }; });
  console.log(JSON.stringify(t0));
  ok(t0.reset && /Chapter 4/.test(t0.label) && t0.money === 9000, 'the title, with a story under way: Story mode “' + t0.label + '” and a Reset story button');
  const once = await page.evaluate(() => { const b = document.querySelector('[data-act="sqreset"]'); b.click(); return { asks: /Click again/.test(b.textContent), still: !!localStorage.getItem('island-rush-story-v1') }; });
  ok(once.asks && once.still, 'one click only asks (“Click again…”); nothing is erased yet');
  await page.evaluate(() => document.querySelector('[data-act="sqreset2"]').click()).catch(() => {}); await page.waitForTimeout(1500); await waitReady();
  const t1 = await page.evaluate(() => { const g = window.__game, s = JSON.parse(localStorage.getItem('island-rush-story-v1') || 'null'); return { mode: g.PLAY_MODE, app: g.App.mode, money: g.save.money, ch: g.save.story.ch, owned: Object.keys(g.save.owned), saved: s && s.story ? s.story.ch : null, label: document.getElementById('btnStory').textContent, sandbox: JSON.parse(localStorage.getItem('island-rush-v1')).money, reset: !!document.querySelector('[data-act="sqreset"]') }; });
  console.log(JSON.stringify(t1));
  ok(t1.mode === 'story' && t1.app === 'title' && t1.money === 600 && t1.ch === 0 && t1.owned.length === 1 && /New story/.test(t1.label) && !t1.reset, 'a second click erases it: back on the title with a new story ($600, one car, chapter 1)');
  ok(t1.sandbox === 777, 'free roam’s save is untouched (' + t1.sandbox + ')');
  /* from inside the game: the quest log */
  const g1 = await page.evaluate(async () => { const g = window.__game; g.App.start(); window.requestAnimationFrame = () => 0; window.__now = performance.now(); await new Promise((r) => setTimeout(r, 600)); for (let i = 0; i < 40; i++) { window.__now += 1000 / 30; g.frame(window.__now); }
    while (g.Cut.on) { g.key('Escape', true); g.key('Escape', false); for (let i = 0; i < 3; i++) { window.__now += 1000 / 30; g.frame(window.__now); } }
    g.save.money = 4321; g.save.story.ch = 2; g.writeSave ? g.writeSave() : localStorage.setItem('island-rush-story-v1', JSON.stringify(g.save));
    g.UI.openMenu('quests'); const b = document.querySelector('#pane [data-act="sqreset"]'); return { btn: !!b, ch: g.save.story.ch }; });
  ok(g1.btn, 'in the game: the quest log (pause menu → Story) has Reset story at the bottom');
  await page.evaluate(() => { const b = document.querySelector('#pane [data-act="sqreset"]'); b.click(); document.querySelector('#pane [data-act="sqreset2"]').click(); }).catch(() => {}); await page.waitForTimeout(1500); await waitReady();
  const t2 = await page.evaluate(() => { const g = window.__game; return { mode: g.PLAY_MODE, money: g.save.money, ch: g.save.story.ch, sandbox: JSON.parse(localStorage.getItem('island-rush-v1')).money }; });
  console.log(JSON.stringify(t2));
  ok(t2.mode === 'story' && t2.money === 600 && t2.ch === 0 && t2.sandbox === 777, 'and it starts the story over (chapter 1, $600), free roam still untouched');
  console.log(logs.length ? logs.slice(0, 10).join('\n') : 'no page errors'); ok(!logs.length, 'no page errors');
  console.log(fails ? fails + ' FAILED' : 'ALL OK'); await browser.close(); process.exit(fails ? 1 : 0);
})();
