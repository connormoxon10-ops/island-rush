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
  /* the answers this run gives (by the words in the choice's prompt line; anything else takes the first answer) */
  const PLAN = [['Tell her', 1], ['crowd is watching', 1], ['Your answer', 2], ['Ask Sal', 2], ['What do you do', 2], ['Talk back', 3]];
  const finishCut = () => page.evaluate((PLAN) => { const g = window.__game, C = g.Cut; let n = 0; window.__chose = window.__chose || [];
    while (C.on && n < 80) { if (C.choosing) { const L = C.lines[C.i], p = PLAN.find((q) => L[1].indexOf(q[0]) >= 0), k = p ? Math.min(p[1], L[3].length) : 1; window.__chose.push(L[1] + ' → ' + L[3][k - 1][0]); g.key('Digit' + k, true); g.key('Digit' + k, false); } else { g.key('Space', true); g.key('Space', false); } window.__run(2); n++; }
    window.__run(3); return n; }, PLAN);
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
    else if (st.t === 'run') {
      const m = g.Story.def(st.id); r.m = m.id; g.loadAround(m.x, m.z, 30); if (g.Foot.on) g.Foot.board(true); g.spawnAt(m.x + 4, m.z + 4, 0); window.__run(4); r.near = g.Story.near === 'run';
      g.key('KeyE', true); g.key('KeyE', false); window.__run(2); r.cut = g.Cut.on; r.mi = !!g.Mi; r.rival = !!g.Story.rivalH; r.rivalCar = m.rivalCar || null;
      if (pic && g.Story.rivalH) { let k = 0; while (g.Cut.on && k++ < 40 && g.Cut.lines[g.Cut.i][2] !== 'rival') { if (g.Cut.choosing) { g.key('Digit1', true); g.key('Digit1', false); } else { g.key('Space', true); g.key('Space', false); } window.__run(1); } window.__run(24); r.pic = g.renderer.domElement.toDataURL('image/jpeg', 0.85); }
    }
    else if (st.t === 'mission') { const m = st.m(); r.m = m && m.id; g.save.done[m.id] = { stars: 1, best: 60 }; window.__run(2); }
    else if (st.t === 'bank') { const b = g.intSave().banks; b.test = { n: 1, best: 4000, stars: 2, t: 1 }; window.__run(2); }
    else if (st.t === 'heist') { g.save.owned[g.HEIST_PRIZES[st.k].id] = true; window.__run(2); }
    else if (st.t === 'clean') { g.Wanted.set && g.Wanted.set(0); window.__run(2); }
    return r;
  }, pic);
  let n = await finishCut(); const after0 = await page.evaluate(() => ({ app: window.__game.App.mode, st: window.__game.save.story.st }));
  ok(after0.app === 'play' && after0.st === 1, 'Space moves through the lines; at the end you are driving and the next step is up (' + n + ' presses)');
  const seen = [], pics = {}; let guard = 0, talkOk = true, hudOk = true, runOk = true;
  while (guard++ < 60) {
    const fin = await page.evaluate(() => window.__game.save.story.fin); if (fin) break;
    const r = await doStep(true); seen.push(r.ch + '.' + r.st + ':' + r.t + (r.who ? '(' + r.who + ')' : '') + (r.m ? '[' + r.m + ']' : ''));
    if (r.t !== 'cut' && !/CHAPTER/.test(r.hud)) hudOk = false;
    if (r.t === 'run') { await finishCut(); const q = await page.evaluate(() => { const g = window.__game, M = g.Mi; const o = { phase: M && M.phase, cd: M && M.cd, story: !!(M && M.def.story) }; if (M) g.endMission(true, 'YOU WON', [], 100); window.__run(4); return o; }); r.after = q; if (!(r.near && r.cut && r.mi && q.story && q.cd < 5 && (r.m === 'sm_parts' || r.rival))) { runOk = false; console.log('  run', JSON.stringify(Object.assign({}, r, { pic: !!r.pic }))); } if (r.pic) fs.writeFileSync(path.join(OUT, 'story_' + r.m + '_rival.jpg'), Buffer.from(r.pic.split(',')[1], 'base64')); }
    if (r.t === 'talk') { if (!(r.vis && r.near && r.cut)) { talkOk = false; console.log('  talk', JSON.stringify(Object.assign({}, r, { pic: !!r.pic }))); } if (r.pic && !pics[r.who + r.ch]) { pics[r.who + r.ch] = 1; fs.writeFileSync(path.join(OUT, 'story_talk_' + r.who + '_ch' + (r.ch + 1) + '.jpg'), Buffer.from(r.pic.split(',')[1], 'base64')); } }
    await finishCut();
  }
  const end = await page.evaluate(() => { const g = window.__game; return { f: g.save.story.f, chose: window.__chose, aurum: !!g.save.owned[g.HEIST_PRIZES[0].id], fin: g.save.story.fin, ch: g.save.story.ch, money: g.save.money, n: g.STORY.length, saved: JSON.parse(localStorage.getItem('island-rush-story-v1')).story, sand: JSON.parse(localStorage.getItem('island-rush-v1')).money }; });
  console.log(seen.join('  ')); console.log(JSON.stringify(end));
  ok(end.n >= 8 && seen.filter((s) => /talk/.test(s)).length >= 6 && seen.some((s) => /bank/.test(s)) && seen.some((s) => /heist/.test(s)) && seen.some((s) => /mvolc/.test(s)), end.n + ' chapters with conversations, a bank job, the train heist and the volcano');
  ok(talkOk, 'every conversation: the person is there, you walk up, E starts it as a cutscene');
  ok(runOk && seen.some((x) => /sm_race1/.test(x)) && seen.some((x) => /sm_race2/.test(x)) && seen.some((x) => /sm_parts/.test(x)), 'the story’s own runs (a parts run and two races against named rivals): E at the start plays the intro with the rival leaning out of the window, then the countdown');
  console.log('  choices: ' + (end.chose || []).join(' | '));
  ok((end.chose || []).length >= 8, 'dialogue choices all through the story (' + (end.chose || []).length + ' made)');
  ok(end.f && end.f.rico === 'ally' && end.f.cut === 70 && end.f.aurum === 'kept' && end.f.sal === 'asked' && end.f.mara >= 2 && end.aurum, 'the choices stick: Rico a friend, a seventy percent cut, Sal asked, the Aurum kept (and still in the garage)');
  ok(hudOk, 'the objective is on screen for every step');
  ok(end.fin && end.saved.fin && end.money >= 56000 && end.saved.f && end.saved.f.rico === 'ally', 'the good ending (Mara stays, +50000, and the seventy percent paid), saved with your choices');
  /* the other roads: a shamed Rico tips off the police; Aurum keys handed to Dex take it out of your garage for good */
  const alt = await page.evaluate(() => { const g = window.__game, f = g.save.story.f, keep = Object.assign({}, f), r = {}; f.rico = 'shamed'; g.Wanted.set && g.Wanted.set(0); g.STORY[5].steps[0].enter(); r.stars = g.Wanted.stars;
    g.Wanted.set && g.Wanted.set(0); if (g.Police && g.Police.reset) g.Police.reset(); f.aurum = 'given'; f.mara = 0; const A = g.HEIST_PRIZES[0].id; g.save.owned[A] = true; const pay = g.Story.finish(); r.gone = !g.save.owned[A]; r.pay = pay; g.save.story.f = keep; g.save.owned[A] = true; return r; });
  ok(alt.stars >= 3, 'the other road: humiliate Rico and he tips off the police after the bank (' + alt.stars + ' stars)');
  ok(alt.gone && alt.pay === 20000, 'the other road: hand Dex the keys and the Aurum is gone from your garage for good; lose Mara’s trust and she leaves (the smaller ending)');
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
