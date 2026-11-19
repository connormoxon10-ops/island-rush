/* Story Mode. The title screen offers both games; each keeps its own save. Starts in the sandbox (with money in its save), picks Story Mode
   (the page reloads into a fresh story save and starts), plays the opening cutscene, walks up to Mara and talks to her (a cutscene), then plays
   every chapter through to the end, finishing each step the way its kind finishes (a run done, a bank robbed, the Aurum taken, the police lost,
   a talk had), with screenshots of the people. Then back to the title and into free roam: the sandbox save is just as it was.
   usage: node tests/story.js   (needs dist/test.html) ; env OUT=dir */
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = process.env.OUT || __dirname;
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await (await browser.newContext({ viewport: { width: 960, height: 540 } })).newPage(); const logs = [];
  page.on('pageerror', (e) => logs.push('PAGEERROR: ' + String(e.stack || e).slice(0, 600)));
  await page.route('**/three.min.js', (r) => r.fulfill({ path: path.resolve(__dirname, 'three.min.js'), contentType: 'application/javascript' }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.addInitScript(() => { window.__noAdapt = true; try { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.clear(); localStorage.setItem('island-rush-v1', JSON.stringify({ money: 123456, set: { quality: 'low', traffic: 'off' } })); } } catch (e) { /* ignore */ } });
  const ready = async () => { await page.waitForFunction(() => window.__ready || window.__bootError, null, { timeout: 170000 }); await page.evaluate(() => { const g = window.__game; window.requestAnimationFrame = () => 0; window.__now = performance.now(); window.__run = (n) => { for (let i = 0; i < n; i++) { window.__now += 1000 / 30; g.frame(window.__now); } }; }); };
  let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
  const shot = async (name) => { const u = await page.evaluate(() => window.__game.renderer.domElement.toDataURL('image/jpeg', 0.85)); fs.writeFileSync(path.join(OUT, 'story_' + name + '.jpg'), Buffer.from(u.split(',')[1], 'base64')); };
  await page.goto('file://' + path.resolve(__dirname, '../dist/test.html')); await ready();
  const t0 = await page.evaluate(() => { const g = window.__game; return { mode: g.PLAY_MODE, app: g.App.mode, money: g.save.money, story: !!document.getElementById('btnStory'), start: document.getElementById('btnStart').textContent }; });
  console.log(JSON.stringify(t0));
  ok(t0.mode === 'sandbox' && t0.app === 'title' && t0.money === 123456, 'the page opens on the title screen, in the sandbox save');
  ok(t0.story && /Start engine/.test(t0.start), 'the title offers both: Start engine (free roam) and Story mode');
  /* into the story: the page reloads into its own save and starts */
  await Promise.all([page.waitForNavigation({ timeout: 60000 }), page.evaluate(() => document.getElementById('btnStory').click())]); await ready();
  await page.waitForFunction(() => window.__game.App.mode !== 'title', null, { timeout: 20000 }).catch(() => {});
  const s0 = await page.evaluate(() => { const g = window.__game; window.__run(30); return { mode: g.PLAY_MODE, app: g.App.mode, money: g.save.money, ch: g.save.story.ch, st: g.save.story.st, cut: g.Cut.on, owned: Object.keys(g.save.owned) }; });
  console.log(JSON.stringify(s0));
  ok(s0.mode === 'story' && s0.money === 600 && s0.owned.length === 1 && s0.ch === 0, 'Story mode starts a fresh save of its own (' + s0.money + ' and one car, not the sandbox’s 123456)');
  ok(s0.cut && s0.app === 'cut', 'it opens with a cutscene');
  await shot('opening');
  /* helpers: finish the cutscene; finish a step the way its kind finishes */
  const finishCut = () => page.evaluate(() => { const g = window.__game; let n = 0; while (g.Cut.on && n < 40) { g.key('Space', true); g.key('Space', false); window.__run(2); n++; } window.__run(3); return n; });
  const doStep = (pic) => page.evaluate((pic) => {
    const g = window.__game, S = g.save.story, st = g.Story.cur, r = { ch: S.ch, st: S.st, t: st && st.t, obj: st && st.obj };
    const hud = document.getElementById('storyObj'); r.hud = hud && !hud.hidden ? hud.textContent : '';
    if (!st) return r;
    if (st.t === 'talk') {
      const n = g.Story.npcs[st.who]; r.who = st.who; r.vis = !!(n && n.h.root.visible); g.loadAround(n.x, n.z, 24);
      if (!g.Foot.on) { g.spawnAt(n.x + 8, n.z, 0); window.__run(3); g.key('KeyF', true); g.key('KeyF', false); window.__run(4); }
      g.Foot.x = n.x + 2.2; g.Foot.z = n.z + 0.4; window.__run(4); r.near = g.Story.near === n; r.hud = hud && !hud.hidden ? hud.textContent : '';
      g.key('KeyE', true); g.key('KeyE', false); window.__run(3); r.cut = g.Cut.on;
      if (pic) { g.key('Space', true); g.key('Space', false); window.__run(20); r.pic = g.renderer.domElement.toDataURL('image/jpeg', 0.85); }
    } else if (st.t === 'cut') { r.cut = g.Cut.on; }
    else if (st.t === 'mission') { const m = st.m(); r.m = m && m.id; g.save.done[m.id] = { stars: 1, best: 60 }; window.__run(2); }
    else if (st.t === 'bank') { const b = g.intSave().banks; b.test = { n: 1, best: 4000, stars: 2, t: 1 }; window.__run(2); }
    else if (st.t === 'heist') { g.save.owned[g.HEIST_PRIZES[st.k].id] = true; window.__run(2); }
    else if (st.t === 'clean') { g.Wanted.set && g.Wanted.set(0); window.__run(2); }
    return r;
  }, pic);
  let n = await finishCut(); const after0 = await page.evaluate(() => ({ app: window.__game.App.mode, st: window.__game.save.story.st }));
  ok(after0.app === 'play' && after0.st === 1, 'Space moves through the lines; at the end you are driving and the next step is up (' + n + ' presses)');
  const seen = [], pics = {}; let guard = 0, talkOk = true, hudOk = true;
  while (guard++ < 60) {
    const fin = await page.evaluate(() => window.__game.save.story.fin); if (fin) break;
    const r = await doStep(true); seen.push(r.ch + '.' + r.st + ':' + r.t + (r.who ? '(' + r.who + ')' : '') + (r.m ? '[' + r.m + ']' : ''));
    if (r.t !== 'cut' && !/CHAPTER/.test(r.hud)) hudOk = false;
    if (r.t === 'talk') { if (!(r.vis && r.near && r.cut)) { talkOk = false; console.log('  talk', JSON.stringify(Object.assign({}, r, { pic: !!r.pic }))); } if (r.pic && !pics[r.who + r.ch]) { pics[r.who + r.ch] = 1; fs.writeFileSync(path.join(OUT, 'story_talk_' + r.who + '_ch' + (r.ch + 1) + '.jpg'), Buffer.from(r.pic.split(',')[1], 'base64')); } }
    await finishCut();
  }
  const end = await page.evaluate(() => { const g = window.__game; return { fin: g.save.story.fin, ch: g.save.story.ch, money: g.save.money, n: g.STORY.length, saved: JSON.parse(localStorage.getItem('island-rush-story-v1')).story, sand: JSON.parse(localStorage.getItem('island-rush-v1')).money }; });
  console.log(seen.join('  ')); console.log(JSON.stringify(end));
  ok(end.n >= 8 && seen.filter((s) => /talk/.test(s)).length >= 6 && seen.some((s) => /bank/.test(s)) && seen.some((s) => /heist/.test(s)) && seen.some((s) => /mvolc/.test(s)), end.n + ' chapters with conversations, a bank job, the train heist and the volcano');
  ok(talkOk, 'every conversation: the person is there, you walk up, E starts it as a cutscene');
  ok(hudOk, 'the objective is on screen for every step');
  ok(end.fin && end.saved.fin && end.money >= 50000, 'the story ends, and the end is saved (+50000)');
  ok(end.sand === 123456, 'the sandbox save is untouched by the story (' + end.sand + ')');
  /* back to the title, into free roam */
  await Promise.all([page.waitForNavigation({ timeout: 60000 }), page.evaluate(() => document.getElementById('btnTitle').click())]); await ready();
  const t1 = await page.evaluate(() => ({ app: window.__game.App.mode, mode: window.__game.PLAY_MODE, lbl: document.getElementById('btnStory').textContent }));
  ok(t1.app === 'title' && t1.mode === 'story' && /Complete/.test(t1.lbl), 'the pause menu’s Title screen button goes back to the title (story: ' + t1.lbl + ')');
  await Promise.all([page.waitForNavigation({ timeout: 60000 }), page.evaluate(() => document.getElementById('btnStart').click())]); await ready();
  await page.waitForFunction(() => window.__game.App.mode !== 'title', null, { timeout: 20000 }).catch(() => {});
  const f1 = await page.evaluate(() => { const g = window.__game; window.__run(10); return { app: g.App.mode, mode: g.PLAY_MODE, money: g.save.money, hud: !!document.getElementById('storyObj') && !document.getElementById('storyObj').hidden, story: g.Story.on }; });
  console.log(JSON.stringify(f1));
  ok(f1.mode === 'sandbox' && f1.app === 'play' && f1.money === 123456 && !f1.story && !f1.hud, 'Start engine: free roam, with the sandbox save as it was and no story');
  console.log(logs.length ? logs.slice(0, 10).join('\n') : 'no page errors'); ok(!logs.length, 'no page errors');
  console.log(fails ? fails + ' FAILED' : 'ALL OK'); await browser.close(); process.exit(fails ? 1 : 0);
})();
