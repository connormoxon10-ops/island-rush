/* Story Mode. The title screen offers both games; each keeps its own save. Starts in the sandbox (with money in its save), picks Story Mode (the
   page reloads into a fresh story save and starts), plays the opening cutscene, then plays the whole story through: every main step and every side
   quest as it opens up, finishing each the way its kind finishes (a run started at its line, with its intro, then won; a bank robbed; the Aurum
   taken; the police lost; a conversation had; a call heard; somewhere reached), answering the choices to a plan that should end with Mara and
   you together. Checks the choices stick and change things, the other roads (Rico tips off the police; Dex drives off with the Aurum; Mara
   leaves), the phone (calls, messages, quests), the quest log in the pause menu, and that free roam's save is untouched.
   usage: node tests/story.js   (needs dist/test.html) ; env OUT=dir */
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = process.env.OUT || __dirname;
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await (await browser.newContext({ viewport: { width: 960, height: 540 } })).newPage(); const logs = [];
  page.on('pageerror', (e) => logs.push('PAGEERROR: ' + String(e.stack || e).slice(0, 600)));
  await page.route('**/three.min.js', (r) => r.fulfill({ path: path.resolve(__dirname, 'three.min.js'), contentType: 'application/javascript' }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.addInitScript(() => { window.__noAdapt = true; try { if (!localStorage.getItem('test-seeded')) { localStorage.clear(); localStorage.setItem('test-seeded', '1'); localStorage.setItem('island-rush-v1', JSON.stringify({ money: 123456, set: { quality: 'low', traffic: 'off' } })); } } catch (e) { /* ignore */ } });
  const ready = async () => { await page.waitForFunction(() => window.__ready || window.__bootError, null, { timeout: 170000 }); await page.evaluate(() => { const g = window.__game; window.requestAnimationFrame = () => 0; window.__now = performance.now(); window.__run = (n) => { for (let i = 0; i < n; i++) { window.__now += 1000 / 30; g.frame(window.__now); } }; }); };
  let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
  const shot = async (name) => { const u = await page.evaluate(() => window.__game.renderer.domElement.toDataURL('image/jpeg', 0.85)); fs.writeFileSync(path.join(OUT, 'story_' + name + '.jpg'), Buffer.from(u.split(',')[1], 'base64')); };
  await page.goto('file://' + path.resolve(__dirname, '../dist/test.html')); await ready();
  const t0 = await page.evaluate(() => { const g = window.__game; return { mode: g.PLAY_MODE, app: g.App.mode, money: g.save.money, story: !!document.getElementById('btnStory'), start: document.getElementById('btnStart').textContent }; });
  console.log(JSON.stringify(t0));
  ok(t0.mode === 'sandbox' && t0.app === 'title' && t0.money === 123456, 'the page opens on the title screen, in the sandbox save');
  ok(t0.story && /Start engine/.test(t0.start), 'the title offers both: Start engine (free roam) and Story mode');
  await Promise.all([page.waitForNavigation({ timeout: 60000 }), page.evaluate(() => document.getElementById('btnStory').click())]); await ready();
  await page.waitForFunction(() => window.__game.PLAY_MODE === 'story' && window.__game.App.mode !== 'title', null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(600);
  const s0 = await page.evaluate(() => { const g = window.__game; window.__run(60); return { key: localStorage.getItem('island-rush-mode'), mode: g.PLAY_MODE, app: g.App.mode, money: g.save.money, ch: g.save.story.ch, cut: g.Cut.on, owned: Object.keys(g.save.owned), phone: !!document.getElementById('phBtn') }; });
  console.log(JSON.stringify(s0));
  ok(s0.mode === 'story' && s0.money === 600 && s0.owned.length === 1 && s0.ch === 0, 'Story mode starts a fresh save of its own (' + s0.money + ' and one car, not the sandbox’s 123456)');
  ok(s0.cut && s0.app === 'cut', 'it opens with a cutscene');
  await shot('opening');
  /* the answers this run gives (by the words in the choice's prompt line; anything else takes the first answer) */
  const PLAN = [['Tell her…', 1], ['crowd is watching', 1], ['Your answer', 2], ['Ask Sal', 2], ['What do you do', 2], ['Talk back', 3], ['What do you tell her', 2], ['What do you ask', 3]];
  const finishCut = () => page.evaluate((PLAN) => { const g = window.__game, C = g.Cut; let n = 0; window.__chose = window.__chose || [];
    while (C.on && n < 90) { if (C.choosing) { const L = C.lines[C.i], p = PLAN.find((q) => L[1].indexOf(q[0]) >= 0), k = p ? Math.min(p[1], L[3].length) : 1; window.__chose.push(L[1] + ' → ' + L[3][k - 1][0]); g.key('Digit' + k, true); g.key('Digit' + k, false); } else { g.key('Space', true); g.key('Space', false); } window.__run(2); n++; }
    window.__run(3); return n; }, PLAN);
  const n0 = await finishCut(); const after0 = await page.evaluate(() => ({ app: window.__game.App.mode, st: window.__game.save.story.st }));
  ok(after0.app === 'play' && after0.st === 1, 'Space moves through the lines; at the end you are driving and the next step is up (' + n0 + ' presses)');
  /* one step of whichever quest is up: side quests first, as a player who takes them on would */
  const doStep = () => page.evaluate(() => {
    const g = window.__game, S = g.save.story, E = g.Story.entries(), e = E.find((x) => x.key !== 'main') || E.find((x) => x.key === 'main'); if (!e) return { none: true };
    const st = e.st, r = { key: e.key, i: e.i, t: st.t, obj: st.obj }, hud = () => { const h = document.getElementById('storyObj'); return h && !h.hidden ? h.textContent : ''; };
    if (e.key !== 'main') g.Story.trackSet(e.key);
    window.__run(3); r.hud = hud();
    if (st.t === 'talk') {
      const n = g.Story.npcs['n:' + e.key]; r.who = st.who; r.vis = !!(n && n.h.root.visible); if (!n) return r; g.loadAround(n.x, n.z, 24);
      if (!g.Foot.on) { g.spawnAt(n.x + 8, n.z, 0); window.__run(3); g.key('KeyF', true); g.key('KeyF', false); window.__run(4); }
      g.Foot.x = n.x + 2.2; g.Foot.z = n.z + 0.4; window.__run(4); r.near = !!(g.Story.near && g.Story.near.n === n); r.hud = hud();
      g.key('KeyE', true); g.key('KeyE', false); window.__run(3); r.cut = g.Cut.on;
      if (r.cut) { g.key('Space', true); g.key('Space', false); window.__run(20); r.pic = g.renderer.domElement.toDataURL('image/jpeg', 0.75); }
    } else if (st.t === 'cut') { window.__run(40); r.cut = g.Cut.on; }
    else if (st.t === 'call') { let k = 0, onPhone = false, inBox = false; while (k++ < 900 && g.Story.entries().some((x) => x.key === e.key && x.i === e.i)) { window.__run(1); const P = document.getElementById('phone'), B = document.getElementById('storyComm'); if (g.Phone.inc && !P.hidden && P.querySelector('.ph-chat p')) onPhone = true; if (B && !B.hidden && /📱/.test(B.textContent)) inBox = true; } r.calls = g.Story.comm.log.length; r.took = k; r.onPhone = onPhone; r.inBox = inBox; window.__run(80); r.closed = document.getElementById('phone').hidden; }
    else if (st.t === 'goto') { const P = g.Story.place(st.at); g.loadAround(P.x, P.z, 20); if (g.Foot.on) g.Foot.board(true); g.spawnAt(P.x + 3, P.z + 3, 0); window.__run(5); }
    else if (st.t === 'run') {
      const m = g.Story.def(st.id); r.m = m.id; g.loadAround(m.x, m.z, 30); if (g.Foot.on) g.Foot.board(true); g.spawnAt(m.x + 4, m.z + 4, 0); window.__run(4); r.near = !!(g.Story.near && g.Story.near.what === 'run');
      g.key('KeyE', true); g.key('KeyE', false); window.__run(2); r.cut = g.Cut.on; r.mi = !!g.Mi; r.rival = !!g.Story.rivalH;
      if (g.Story.rivalH) { let k = 0; while (g.Cut.on && k++ < 40 && g.Cut.lines[g.Cut.i][2] !== 'rival') { if (g.Cut.choosing) { g.key('Digit1', true); g.key('Digit1', false); } else { g.key('Space', true); g.key('Space', false); } window.__run(1); } window.__run(24); r.pic = g.renderer.domElement.toDataURL('image/jpeg', 0.8); }
    }
    else if (st.t === 'mission') { const m = st.m(); r.m = m && m.id; g.save.done[m.id] = { stars: 1, best: 60 }; window.__run(2); }
    else if (st.t === 'bank') { const b = g.intSave().banks; b.test = { n: ((b.test && b.test.n) | 0) + 1, best: 4000, stars: 2, t: 1 }; window.__run(2); }
    else if (st.t === 'heist') { g.save.owned[g.HEIST_PRIZES[st.k].id] = true; window.__run(2); }
    else if (st.t === 'clean') { g.Wanted.set && g.Wanted.set(0); if (g.Police && g.Police.reset) g.Police.reset(); window.__run(2); }
    return r;
  });
  const seen = [], pics = {}; let guard = 0, talkOk = true, hudOk = true, runOk = true, events = 0, calls = 0, callsOnPhone = 0, callsInBox = 0, callsOpen = 0;
  while (guard++ < 140) {
    const fin = await page.evaluate(() => window.__game.save.story.fin && !window.__game.Story.entries().length); if (fin) break;
    const r = await doStep(); if (r.none) break; seen.push(r.key + ':' + r.t + (r.who ? '(' + r.who + ')' : '') + (r.m ? '[' + r.m + ']' : ''));
    if (r.t !== 'cut' && r.t !== 'call' && !/CHAPTER|SIDE QUEST/.test(r.hud)) { hudOk = false; console.log('  hud', r.key, r.t, JSON.stringify(r.hud)); }
    if (r.t === 'run') {
      await finishCut();
      const q = await page.evaluate(() => { const g = window.__game, M = g.Mi; const o = { phase: M && M.phase, cd: M && M.cd, story: !!(M && M.def.story) }; if (M) { M.phase = 'run'; M.idx = M.cps.length - 1; for (let i = 0; i < 6; i++) window.__run(1); o.ev = Object.keys(g.Story.ev).length; g.endMission(true, 'YOU WON', [], 100); } window.__run(4); return o; });
      events += q.ev || 0; if (!(r.near && r.cut && r.mi && q.story && q.cd < 5 && (!/race|rico2/.test(r.m) || r.rival))) { runOk = false; console.log('  run', JSON.stringify(Object.assign({}, r, { pic: !!r.pic }))); }
      if (r.pic) fs.writeFileSync(path.join(OUT, 'story_' + r.m + '_intro.jpg'), Buffer.from(r.pic.split(',')[1], 'base64'));
    }
    if (r.t === 'call') { calls++; if (r.onPhone) callsOnPhone++; if (r.inBox) callsInBox++; if (r.onPhone && !r.closed) callsOpen++; }
    if (r.t === 'talk') { if (!(r.vis && r.near && r.cut)) { talkOk = false; console.log('  talk', JSON.stringify(Object.assign({}, r, { pic: !!r.pic }))); } if (r.pic && !pics[r.who]) { pics[r.who] = 1; fs.writeFileSync(path.join(OUT, 'story_talk_' + r.who + '.jpg'), Buffer.from(r.pic.split(',')[1], 'base64')); } }
    await finishCut();
  }
  const end = await page.evaluate(() => { const g = window.__game, S = g.save.story; return { f: S.f, sq: S.sq, chose: window.__chose, aurum: !!g.save.owned[g.HEIST_PRIZES[0].id], fin: S.fin, money: g.save.money, n: g.STORY.length, nSide: g.SIDE.length, sum: g.Story.summary(), saved: JSON.parse(localStorage.getItem('island-rush-story-v1')).story, sand: JSON.parse(localStorage.getItem('island-rush-v1')).money }; });
  console.log(seen.join('  ')); console.log(JSON.stringify(Object.assign({}, end, { chose: undefined })));
  console.log('  choices: ' + (end.chose || []).join(' | '));
  const mainSeen = seen.filter((s) => s.indexOf('main:') === 0), sideDone = Object.keys(end.sq || {}).filter((k) => end.sq[k].done);
  ok(end.n >= 9 && mainSeen.filter((s) => /talk/.test(s)).length >= 9 && mainSeen.some((s) => /bank/.test(s)) && mainSeen.some((s) => /heist/.test(s)) && mainSeen.some((s) => /mvolc/.test(s)), end.n + ' chapters, ' + mainSeen.length + ' main steps: conversations, calls, a bank job, the train heist and the volcano');
  ok(sideDone.length === end.nSide, 'every side quest offered and finished (' + sideDone.join(', ') + ')');
  ok(calls >= 8 && callsOnPhone === calls && callsInBox === 0 && callsOpen === 0, 'story calls and texts come in on the phone screen, not over the game, and the phone puts itself away after (' + callsOnPhone + ' of ' + calls + ')');
  ok(talkOk, 'every conversation: the person is there, you walk up, E starts it as a cutscene');
  ok(runOk && ['sm_parts', 'sm_race1', 'sm_race2', 'sm_rico2', 'sm_nina'].every((id) => seen.some((x) => x.indexOf(id) >= 0)), 'the story’s own runs: E at the start plays the intro (rivals leaning out of the window), then the countdown');
  ok(events >= 8, 'during the races the radio chatter, nitro bursts and police fire (' + events + ' events)');
  ok(hudOk, 'the objective (chapter or side quest) is on screen for every step');
  ok((end.chose || []).length >= 12, 'dialogue choices all through the story (' + (end.chose || []).length + ' made)');
  ok(end.f && end.f.ricoS === 'ally' && end.f.cut === 70 && end.f.aurum === 'kept' && end.f.salA && end.f.maraLove && end.f.maraR && end.f.mara >= 5 && end.aurum, 'the choices stick: Rico a friend, a seventy percent cut, Sal asked, the Aurum kept, and Mara (' + (end.f && end.f.mara) + ') more than a friend');
  ok(end.fin && end.saved.fin && end.sum.includes('Mara: together') && end.money >= 56000, 'the ending follows: Mara and you together (' + end.sum.join(' · ') + ')');
  ok(end.sand === 123456, 'the sandbox save is untouched by the story (' + end.sand + ')');
  /* the phone and the quest log */
  const ph = await page.evaluate(async () => {
    const g = window.__game, r = {}; g.key('KeyO', true); g.key('KeyO', false); window.__run(2); const P = document.getElementById('phone'); r.open = !P.hidden; r.apps = P.querySelectorAll('.ph-grid button').length;
    P.querySelector('[data-ph="contacts"]').click(); r.contacts = P.querySelectorAll('[data-call]').length + '+' + P.querySelectorAll('[data-svc]').length;
    const n0 = g.Story.comm.log.length; P.querySelector('[data-call="mara"]').click(); r.ring = /Calling/.test(P.textContent); await new Promise((res) => setTimeout(res, 1600)); window.__run(4);
    r.answered = !!g.Phone.call && g.Phone.call.st === 'talk'; r.line = (g.Phone.call && g.Phone.call.log[0] || [])[1]; r.opts = P.querySelectorAll('[data-say]').length; r.optTxt = [...P.querySelectorAll('[data-say]')].map((b) => b.textContent);
    P.querySelector('[data-say="0"]').click(); r.chat = P.querySelectorAll('.ph-chat p').length; r.me = P.querySelectorAll('.ph-chat p.me').length; r.callShot = g.renderer.domElement.toDataURL('image/jpeg', 0.8);
    const bye = [...P.querySelectorAll('[data-say]')].find((b) => /Bye/.test(b.textContent)); if (bye) bye.click(); await new Promise((res) => setTimeout(res, 1800)); window.__run(2); r.hungUp = !g.Phone.call; r.called = g.Story.comm.log.length >= n0 + 4;
    P.querySelector('[data-ph="home"]').click(); P.querySelector('[data-ph="messages"]').click(); r.msgs = P.querySelectorAll('.ph-msg').length;
    P.querySelector('[data-ph="home"]').click(); P.querySelector('[data-ph="quests"]').click(); r.log = /Chapters/.test(P.textContent) && /Side quests/.test(P.textContent) && /People/.test(P.textContent);
    /* keep calling Rico: "again?", then irritated, then voicemail */
    const ring = async () => { P.querySelector('[data-ph="home"]').click(); P.querySelector('[data-ph="contacts"]').click(); P.querySelector('[data-call="rico"]').click(); await new Promise((res) => setTimeout(res, 1600)); window.__run(2); const C = g.Phone.call, o = { st: C && C.st, first: C && C.log.find((l) => l[0] === 'rico'), opts: P.querySelectorAll('[data-say]').length }; g.Phone.hang(); return o; };
    r.spam = []; for (let i = 0; i < 4; i++) r.spam.push(await ring());
    r.shot = g.renderer.domElement.toDataURL('image/jpeg', 0.8); g.key('Escape', true); g.key('Escape', false); r.closed = P.hidden;
    g.UI.openMenu('quests'); const pane = document.getElementById('pane').innerHTML; r.tab = /Chapters/.test(pane) && /Mara Quinn/.test(pane) && /More than friends/.test(pane); g.UI.closeMenu(); return r;
  });
  console.log(JSON.stringify(Object.assign({}, ph, { shot: undefined, callShot: undefined }))); if (ph.callShot) fs.writeFileSync(path.join(OUT, 'story_call.jpg'), Buffer.from(ph.callShot.split(',')[1], 'base64'));
  ok(ph.open && ph.apps >= 7 && ph.closed, 'the phone: O opens it (' + ph.apps + ' apps), Esc puts it away');
  ok(ph.ring && ph.answered && ph.opts >= 3 && ph.contacts.split('+')[0] >= 6, 'call Mara from the contacts (' + ph.contacts + '): it rings, she answers (“' + ph.line + '”), and you pick what to say (' + (ph.optTxt || []).join(' / ') + ')');
  ok(ph.chat >= 3 && ph.me >= 1 && ph.hungUp && ph.called, 'your answer and hers in the chat; Bye ends the call; it is all in Messages');
  console.log('  spam: ' + JSON.stringify(ph.spam));
  ok(ph.spam && ph.spam[1].st === 'talk' && /again|Miss me/i.test((ph.spam[1].first || [])[1]) && ph.spam[2].opts <= 2 && ph.spam[3].st === 'none', 'call Rico over and over: a normal answer, then “again?”, then irritated (only sorry or bye), then voicemail');
  ok(ph.msgs >= 10 && ph.log, 'Messages keeps every call and radio line (' + ph.msgs + '); the Quests app shows the chapters, side quests and people');
  ok(ph.tab, 'the pause menu’s Story tab: chapters, and Mara “More than friends”');
  /* the other roads */
  const alt = await page.evaluate(() => { const g = window.__game, f = g.save.story.f, keep = JSON.parse(JSON.stringify(f)), r = {}; f.ricoS = 'shamed'; g.Wanted.set && g.Wanted.set(0); g.STORY[5].steps[0].enter(); r.stars = g.Wanted.stars;
    g.Wanted.set && g.Wanted.set(0); if (g.Police && g.Police.reset) g.Police.reset(); f.aurum = 'given'; f.mara = 1; f.lie = true; const A = g.HEIST_PRIZES[0].id; g.save.owned[A] = true; const pay = g.Story.finish(); r.gone = !g.save.owned[A]; r.pay = pay; r.sum = g.Story.summary(); g.save.story.f = keep; g.save.owned[A] = true; return r; });
  ok(alt.stars >= 3, 'the other road: humiliate Rico and he tips off the police after the bank (' + alt.stars + ' stars)');
  ok(alt.gone && alt.pay === 20000 && alt.sum.includes('Mara: left the island'), 'the other road: hand Dex the keys and the Aurum is gone for good; lie to Mara and she leaves (' + alt.sum.join(' · ') + ')');
  fs.writeFileSync(path.join(OUT, 'story_phone.jpg'), Buffer.from(ph.shot.split(',')[1], 'base64'));
  /* back to the title, into free roam */
  await Promise.all([page.waitForNavigation({ timeout: 60000 }), page.evaluate(() => document.getElementById('btnTitle').click())]); await ready();
  const t1 = await page.evaluate(() => ({ app: window.__game.App.mode, mode: window.__game.PLAY_MODE, lbl: document.getElementById('btnStory').textContent }));
  ok(t1.app === 'title' && t1.mode === 'story' && /Complete/.test(t1.lbl), 'the pause menu’s Title screen button goes back to the title (story: ' + t1.lbl + ')');
  await Promise.all([page.waitForNavigation({ timeout: 60000 }), page.evaluate(() => document.getElementById('btnStart').click())]); await ready();
  await page.waitForFunction(() => window.__game.App.mode !== 'title', null, { timeout: 20000 }).catch(() => {});
  const f1 = await page.evaluate(() => { const g = window.__game; window.__run(10); g.key('KeyO', true); g.key('KeyO', false); const P = document.getElementById('phone'); const o = { app: g.App.mode, mode: g.PLAY_MODE, money: g.save.money, hud: !!document.getElementById('storyObj') && !document.getElementById('storyObj').hidden, story: g.Story.on, phone: !P.hidden, quests: !!P.querySelector('[data-ph="quests"]') };
    P.querySelector('[data-ph="contacts"]').click(); o.svc = P.querySelectorAll('[data-svc]').length; o.people = P.querySelectorAll('[data-call]').length; g.car.health = 50; const m0 = g.save.money; P.querySelector('[data-svc="mech"]').click(); o.fixed = g.car.health === 100 && g.save.money === m0 - 300; return o; });
  console.log(JSON.stringify(f1));
  ok(f1.mode === 'sandbox' && f1.app === 'play' && !f1.story && !f1.hud, 'Start engine: free roam, with no story');
  ok(f1.phone && !f1.quests && f1.svc === 3 && f1.people === 0 && f1.fixed, 'free roam’s phone: services, no story contacts; the mechanic fixes the car where it stands (−$300)');
  console.log(logs.length ? logs.slice(0, 10).join('\n') : 'no page errors'); ok(!logs.length, 'no page errors');
  console.log(fails ? fails + ' FAILED' : 'ALL OK'); await browser.close(); process.exit(fails ? 1 : 0);
})();
