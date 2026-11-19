/* ================= THE PHONE =================
   A phone icon at the top left (or O) opens your phone. The game keeps running while it is open; Esc or O puts it away. Apps:
     Contacts  call people. In Story Mode: the people you have met (Mara, Rico, Nina, Sal, Jax, Hal, Dex). What they say depends on where the
               story is and how they feel about you, and a friendly call now and then brings you a little closer. In free roam: a mechanic (fixes
               your car where it stands), roadside assist (puts you back on the nearest road) and a taxi home.
     Messages  everything said on the phone and the radio.       Quests  the story's quest log (Story Mode).
     Map, Garage (the pause menu's), Bank (your money and reputation), Camera (saves a picture of the screen), Music (on / off). */
const Phone = { open: false, app: 'home', el: null, btn: null, call: null, called: {} };
const PHONE_APPS = [['contacts', '📇', 'Contacts'], ['messages', '💬', 'Messages'], ['quests', '📖', 'Quests'], ['map', '🗺️', 'Map'], ['garage', '🚗', 'Garage'], ['bank', '🏦', 'Bank'], ['camera', '📷', 'Camera'], ['music', '🎵', 'Music']];
/* ---------- calls: they pick up, and you talk ----------
   A call rings, then they answer (what they say first depends on where the story is and how they feel about you). You pick what to say from the
   buttons; each answer can move the relationship, and some set things going (ask Mara out and the dinner is on; say sorry to Rico and you may be
   even). Topics you have used drop off the list; Hang up whenever you like. Every call is kept in Messages. */
const PH_GREET = {
  mara: (v, f) => f.maraLove && v >= 4 ? 'Hey, you. I was just thinking about you.' : v >= 3 ? 'Hey! I was hoping it was you.' : v >= 1 ? 'Mara’s garage. Oh, hi! What’s up?' : v < 0 ? 'What? I’m elbow-deep in a gearbox.' : 'Mara’s garage.',
  rico: (v, f) => f.ricoS === 'shamed' ? 'You’ve got some nerve calling me.' : f.ricoS ? 'Ferry kid! What’s up?' : 'Who is this?',
  nina: (v) => v >= 3 ? 'Hi! It’s nice to hear from you when it isn’t about work.' : 'Nina speaking. …Oh. This isn’t a good time, I’m at the counter.',
  sal: () => 'Sal here. My grandson set this phone up. I hate it. What is it, son?',
  jax: () => '…Yeah.',
  hal: () => 'Brody Haulage! Oh, it’s the fast one.',
  dex: () => 'Make it quick.'
};
/* calling the same person again and again: a second call in a few minutes gets "again?", a third gets an irritated answer and little to say,
   after that they let it ring out to voicemail (and keep at it and they think less of you) */
const PH_SPAM = {
  again: { mara: 'Again? What did you forget?', rico: 'You again? Miss me already?', nina: 'You just called. Is something wrong?', sal: 'Twice in one day. Must be my birthday.', jax: 'What now.', hal: 'Back again! Forget something?', dex: 'You are wasting my minutes.' },
  annoyed: { mara: 'Seriously. I have a customer standing right here. What?', rico: 'Okay, this is getting weird, ferry kid.', nina: 'Please stop calling me at work. Please.', sal: 'Son, I’m old, not lonely. What is it?', jax: 'Stop calling this number.', hal: 'I’m driving! What?!', dex: 'Call me again and you will regret it.' },
  vmail: { mara: 'Hi, this is Mara. Leave a message. …If this is you again: stop calling, I’m working.', rico: 'Yo, it’s Rico. If you’re fast, leave a message. If you’re the ferry kid, chill.', nina: 'You’ve reached Nina Park. Please leave a message.', sal: 'This is Sal’s telephone. I don’t know how to check these.', jax: '[A long beep. No greeting.]', hal: 'Brody Haulage, leave it after the horn. HONK.', dex: 'The number you have called is busy.' }
};
/* small talk once the real topics are used up: something different each time */
const PH_SMALL = [
  ['Just wanted to hear your voice.', { mara: ['Smooth. Very smooth. I’m blushing at a gearbox.', 'Well, now you’ve heard it. Go do something useful.'], rico: ['Weird. But okay. Hi.'], nina: ['That’s… actually lovely. Thank you.'], sal: ['It’s an old voice, son. Same as yesterday.'], hal: ['Ha! Sounds like a diesel, doesn’t it?'], jax: ['Don’t.'], dex: ['Flattery is free. My time isn’t.'] }],
  ['Nothing, I’m bored.', { mara: ['Bored? Come sweep the garage.', 'Bored people find trouble. Come here instead.'], rico: ['Bored? Race me!', 'Go do donuts in the car park, works for me.'], nina: ['Lucky you. I’m counting coins.'], sal: ['Watch a train go by. Best thing for boredom.'], hal: ['Bored? Load my truck, then.'], jax: ['Then be bored quietly.'], dex: ['Then go and earn something.'] }],
  ['Seen anything weird today?', { mara: ['A goat on the coast road again. I swear it’s the same goat.', 'Someone brought in a car full of sand. Full. Of sand.'], rico: ['A cop doing the speed limit. Spooky.'], nina: ['A man tried to deposit a fish. A whole fish.'], sal: ['A teenager waved at the train. Nobody waves any more.'], hal: ['A seagull stole my sandwich. Whole thing. Bread and all.'], jax: ['Every day is weird working for Dex.'], dex: ['Only you.'] }]
];
/* the topics you can bring up with someone: [what you say, what happens] (the result: lines they answer with, a change to how they feel, end the call) */
Phone.topics = function (id) {
  const S = Story.S(), f = Story.F(), v = f[id] | 0, st = Story.step(), obj = st && st.obj ? st.obj.charAt(0).toLowerCase() + st.obj.slice(1) : 'enjoy the island', T = [];
  const chOnce = (k) => { S.calls = S.calls || {}; const key = id + ':' + k + ':' + S.ch; if (S.calls[key]) return false; S.calls[key] = 1; return true; };
  T.push(['How are you doing?', () => { const up = v >= 0 && id !== 'dex' && !(id === 'rico' && f.ricoS === 'shamed') && chOnce('how');
    const a = { mara: v >= 2 ? 'Better now. The van finally runs. Mostly. How are you holding up?' : 'Busy. Fine. Why?', rico: f.ricoS === 'shamed' ? 'Like you care.' : 'Bored! Nobody on this island can drive except you, and you never race me.', nina: 'Tired. Mum had a good day, though.', sal: 'My knees say rain. My knees are always wrong.', jax: 'Alive. That’s a good day, working for Dex.', hal: 'Hauling. Always hauling.', dex: 'Rich. Next question.' }[id];
    return { say: [a], eff: up ? { [id]: 1 } : null, note: up ? 'They seemed glad you asked.' : '' }; }]);
  T.push(['Any advice?', () => ({ say: [{ mara: 'Next thing you’re doing is ' + obj + '. Do it carefully. For me.', rico: 'Advice? Brake late, lie later. And for ' + obj + '? Don’t blink.', nina: 'For ' + obj + '? Be the most boring person in the room. Nobody remembers boring.', sal: 'Whatever ' + obj + ' is, son, do it before dark if you can.', jax: 'Don’t trust anything Dex says about ' + obj + '.', hal: 'Check your tyres. That’s my advice for everything.', dex: 'My advice is ' + obj + '. Chop chop.' }[id]] })]);
  if (id === 'mara') {
    if (!f.maraLove && v >= 3) T.push(['I miss you when I’m not at the garage.', () => v >= 4 ? { say: ['…Yeah?', 'Me too. A bit. A lot. Get back here soon.'], eff: { mara: 1, maraHint: 1 } } : { say: ['That’s sweet. Don’t get weird on me.'] }]);
    if (f.maraLove) T.push(['I love you.', () => ({ say: ['Say it in person, idiot.', '…I love you too.'] })]);
    if (!((S.sq.pier || {}).done) && !f.pierAsk && S.ch >= 3) T.push(['Want to get dinner some time?', () => v >= 1 ? { say: ['…Like a date?', 'Okay. The pier. I’ll book a table, you wear a shirt.'], eff: { pierAsk: 1 } } : { say: ['Ha. Ask me again when you’ve earned it.'], eff: { mara: 0 } }]);
    if (S.ch >= 4 && !f.maraDex) T.push(['What do you know about Dex?', () => ({ say: ['Enough to stay away. He finds people when they’re broke and keeps them that way.', 'Please tell me you’re not working for him.'], eff: { maraDex: 1 } })]);
  } else if (id === 'rico') {
    if (f.ricoS === 'shamed') T.push(['I’m sorry about the race. That was a jerk move.', () => f.ricoSorry ? { say: ['You said that already.'] } : v >= -3 ? { say: ['…', 'You mean that?', 'Fine. We’re even. Don’t make it weird.'], eff: { rico: 3, ricoS: 'even', ricoSorry: 1 } } : { say: ['Sorry doesn’t fix my reputation.'], eff: { ricoSorry: 1 } }]);
    else if (f.ricoS) { T.push(['Know any good roads?', () => ({ say: ['The coast road at dawn. No traffic, no cops, and the sun comes up right in your mirrors.'] })]); T.push(['Want to race again?', () => ({ say: [(S.sq.rico2 || {}).done ? 'And lose a third time? Ask me next month.' : 'Always. Come find me. You know where.'] })]); }
  } else if (id === 'nina') {
    T.push(['How’s your mum?', () => ({ say: [(S.sq.nina || {}).done ? 'Much better, thanks to you. She asks about “the fast one” every day.' : 'Not great. The medicine is the expensive kind. That’s… why I do what I do.'], eff: (S.sq.nina || {}).done && chOnce('mum') ? { nina: 1 } : null })]);
    if (f.ninaF && !f.ninaDate) T.push(['Dinner some time? Somewhere that isn’t a bank.', () => v >= 3 ? { say: ['…Okay. Yes. You pick.', 'Somewhere with tablecloths. I want to feel fancy.'], eff: { nina: 1, ninaDate: 1 } } : { say: ['Let’s see if you’re still around next week.'] }]);
  } else if (id === 'sal') {
    T.push(['Tell me about the train.', () => ({ say: ['Forty years. Forty-one, if you count the year I trained.', 'Best job in the world. You see the whole island twice a day and nobody can phone you.'], eff: chOnce('train') ? { sal: 1 } : null })]);
  } else if (id === 'jax') {
    if (f.jaxA) T.push(['Are you getting out?', () => ({ say: [(S.sq.jax || {}).done ? 'Ferry’s booked. Thanks to you. Don’t tell Dex.' : 'Working on it. Don’t ask on this line.'] })]);
  } else if (id === 'hal') {
    T.push(['Any work going?', () => ({ say: ['Mara keeps you busy enough. But if she ever lets you go, I pay in diesel and sandwiches.'] })]);
  } else if (id === 'dex') {
    T.push(['We need to talk.', () => ({ say: ['No, we don’t. I call you. That’s how this works.'], end: true })]);
  }
  /* small talk: one at a time, a different line each call */
  { const C = Phone.call, sm = PH_SMALL.filter((x) => !(C && C.used[x[0]])); if (sm.length) { const x = sm[(C ? C.n : 0) % sm.length], pool = x[1][id] || ['Huh.']; T.push([x[0], () => ({ say: [pool[Math.floor(Math.random() * pool.length)]] })]); } }
  if (Phone.call && Phone.call.annoyed) { T.length = 0; T.push(['Sorry, wrong button.', () => ({ say: ['Mm-hm. Sure.'], end: true })]); }
  T.push(['Bye.', () => ({ say: [{ mara: v >= 3 ? 'Bye, you. Drive safe.' : 'Bye.', rico: 'Later, ferry kid.', nina: 'Bye. Be careful.', sal: 'Mind the timing, son.', jax: '…', hal: 'Keep it on the black stuff!', dex: '' }[id] || 'Bye.'], end: true })]);
  return T;
};
Phone.dial = function (id) {
  if (Phone.call || !STORY_CAST[id]) return; const S = Story.S();
  const now = Date.now(), R = Phone.recent || (Phone.recent = {}), L = (R[id] = (R[id] || []).filter((t) => now - t < 180000)), n = L.length; L.push(now);
  Phone.call = { id, st: 'ring', t: App.time, log: [], used: {}, n: (Phone.nCalls = (Phone.nCalls || 0) + 1), spam: n }; Phone.render(); Snd.beep(880, 0.05);
  setTimeout(() => { const C = Phone.call; if (!C || C.id !== id) return;
    if (id === 'dex' && (S.ch >= 8 || S.fin)) { C.st = 'none'; C.log.push(['', 'The number you have called is not in service.']); Phone.render(); return; }
    if (C.spam >= 3) { C.st = 'none'; C.log.push(['', 'Voicemail']); Phone.hear(id, [PH_SPAM.vmail[id]]); if (C.spam >= 4 && !Phone.spamHit) { Phone.spamHit = id; if (STORY_CAST[id] && id !== 'dex') Story.applyEff({ [id]: -1 }); C.log.push(['', (STORY_CAST[id].name.split(' ')[0]) + ' is getting tired of your calls.']); } Phone.render(); return; }
    C.st = 'talk'; C.t0 = App.time; C.annoyed = C.spam === 2; const g = C.spam === 1 ? PH_SPAM.again[id] : C.spam === 2 ? PH_SPAM.annoyed[id] : PH_GREET[id](Story.F()[id] | 0, Story.F()); Phone.hear(id, [g]); Phone.render(); }, 1400);
};
/* they say something: into the call, and into Messages */
Phone.hear = function (id, lines) { const C = Phone.call; for (const t of lines) { if (!t) continue; C.log.push([id, t]); Story.comm.log.push({ who: id, text: t }); } Snd.beep(660, 0.03); };
Phone.say = function (k) {
  const C = Phone.call; if (!C || C.st !== 'talk') return; const T = Phone.topics(C.id).filter((x) => !C.used[x[0]]), o = T[k]; if (!o) return;
  C.used[o[0]] = 1; C.log.push(['you', o[0]]); Story.comm.log.push({ who: 'you', text: o[0] }); const r = o[1]();
  if (r.eff) Story.applyEff(r.eff); Phone.hear(C.id, r.say || []); if (r.note) C.log.push(['', r.note]); if (r.end) { C.st = 'ended'; setTimeout(() => { if (Phone.call === C) { Phone.call = null; Phone.render(); } }, 1600); }
  writeSave(); Phone.render();
};
Phone.hang = function () { if (Phone.call && Phone.call.spam < 3) Phone.spamHit = null; const C = Phone.call; if (!C) return; if (C.st === 'talk') C.log.push(['', 'Call ended']); Phone.call = null; Snd.beep(420, 0.05); Phone.render(); };
/* free roam services */
Phone.service = function (k) {
  const c = car;
  if (k === 'mech') { const cost = Math.ceil((100 - c.health) * 6); if (c.health >= 99.5) { UI.toast('Mechanic: your car is fine', 'info'); return; } if (save.money < cost) { UI.toast('Mechanic: that will be ' + money(cost) + '. You are short.', 'bad'); return; } save.money -= cost; c.health = 100; writeSave(); UI.toast('Mechanic: patched up · −' + money(cost), 'good'); Snd.beep(700, 0.1); }
  else if (k === 'road') { if (Mi || Foot.on || Fly.on || Boat.on) { UI.toast('Roadside assist: not right now', 'bad'); return; } if (save.money < 150) { UI.toast('Roadside assist: $150, please', 'bad'); return; } save.money -= 150; findNearestRoadPoint(c.x, c.z, _stNp); spawnAt(_stNp.x, _stNp.z, Math.atan2(_stNp.tx, _stNp.tz)); writeSave(); UI.toast('Back on the road · −$150', 'good'); }
  else if (k === 'taxi') { if (Mi) { UI.toast('Finish your run first', 'bad'); return; } if (save.money < 60) { UI.toast('Taxi: $60, please', 'bad'); return; } save.money -= 60; writeSave(); Phone.toggle(false); Home.warp(); }
};
/* ---------- the screen ---------- */
Phone.toggle = function (on) {
  Phone.open = on == null ? !Phone.open : !!on; if (!Phone.open && Phone.call) Phone.hang(); if (Phone.open) { Phone.app = 'home'; Phone.render(); Snd.beep(1200, 0.03); }
  Phone.el.hidden = !Phone.open;
};
Phone.go = function (app) {
  if (app === 'map' || app === 'garage') { Phone.toggle(false); UI.openMenu(app); return; }
  if (app === 'quests' && !Story.on) { UI.toast('The quest log is for Story Mode', 'info'); return; }
  if (app === 'camera') { try { const u = renderer.domElement.toDataURL('image/jpeg', 0.92), a = document.createElement('a'); a.href = u; a.download = 'island-rush-' + Date.now() + '.jpg'; a.click(); } catch (e) { /* ignore */ } Phone.flash = 1; Snd.beep(1500, 0.04); UI.toast('Photo saved', 'good'); return; }
  if (app === 'music') { save.set.music = !save.set.music; if (App.onSetting) App.onSetting('music'); writeSave(); UI.toast('Music ' + (save.set.music ? 'on' : 'off'), 'info'); Phone.render(); return; }
  Phone.app = app; Phone.render();
};
Phone.render = function () {
  if (!Phone.el || !Phone.open) return; const scr = Phone.el.querySelector('.scr'), a = Phone.app; let h = '';
  const top = (t) => '<div class="ph-top"><button type="button" data-ph="home">‹</button><b>' + t + '</b><span></span></div>';
  if (Phone.call) { const C = Phone.call, nm = STORY_CAST[C.id].name, sec = C.t0 ? Math.floor(App.time - C.t0) : 0;
    h = '<div class="ph-call"><div class="ph-av s2">' + nm.charAt(0) + '</div><b>' + nm + '</b><small>' + (C.st === 'ring' ? 'Calling…' : C.st === 'none' ? 'No answer' : C.st === 'ended' ? 'Call ended' : 'On call · ' + Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0')) + '</small></div><div class="ph-chat">' +
      C.log.map((l) => (l[0] === 'you' ? '<p class="me">' + l[1] + '</p>' : l[0] ? '<p>' + l[1] + '</p>' : '<p class="sys">' + l[1] + '</p>')).join('') + '</div>' +
      (C.st === 'talk' ? '<div class="ph-opts">' + Phone.topics(C.id).filter((x) => !C.used[x[0]]).map((x, k) => '<button type="button" data-say="' + k + '">' + x[0] + '</button>').join('') + '</div>' : '') + '<button type="button" class="ph-hang" data-hang="1">' + (C.st === 'talk' || C.st === 'ring' ? 'Hang up' : 'Close') + '</button>'; }
  else if (a === 'home') h = '<div class="ph-clock">' + String(Math.floor(App.tod)).padStart(2, '0') + ':' + String(Math.floor((App.tod % 1) * 60)).padStart(2, '0') + '</div><div class="ph-sub">' + (Story.on ? 'Story mode' : 'Free roam') + ' · ' + money(save.money) + '</div><div class="ph-grid">' + PHONE_APPS.filter((p) => p[0] !== 'quests' || Story.on).map((p) => '<button type="button" data-ph="' + p[0] + '"><i>' + p[1] + '</i><small>' + (p[0] === 'music' ? 'Music ' + (save.set.music ? 'on' : 'off') : p[2]) + '</small></button>').join('') + '</div>';
  else if (a === 'contacts') {
    h = top('Contacts');
    if (Story.on) { const S = Story.S(), ids = ['mara', 'rico', 'nina', 'sal', 'jax', 'hal', 'dex'].filter((id) => S.met[id] || id === 'mara'); h += ids.map((id) => '<button type="button" class="ph-row" data-call="' + id + '"><span class="ph-av s">' + STORY_CAST[id].name.charAt(0) + '</span><span><b>' + STORY_CAST[id].name + '</b><small>' + Story.relLabel(id) + '</small></span><i>📞</i></button>').join(''); }
    h += [['mech', 'Mobile mechanic', 'Fixes your car where it stands'], ['road', 'Roadside assist', 'Back on the nearest road · $150'], ['taxi', 'Island Taxi', 'Home to your garage · $60']].map((s) => '<button type="button" class="ph-row" data-svc="' + s[0] + '"><span class="ph-av s">☎</span><span><b>' + s[1] + '</b><small>' + s[2] + '</small></span><i>📞</i></button>').join('');
  } else if (a === 'messages') { const L = Story.comm.log.slice(-30).reverse(); h = top('Messages') + (L.length ? L.map((m) => '<div class="ph-msg"><b>' + (STORY_CAST[m.who] ? STORY_CAST[m.who].name : m.who || '—') + '</b>' + m.text + '</div>').join('') : '<p class="ph-empty">No messages yet.</p>'); }
  else if (a === 'quests') h = top('Quests') + '<div class="ph-log">' + Story.logHtml() + '</div>';
  else if (a === 'bank') h = top('Bank') + '<div class="ph-bank"><small>Balance</small><b>' + money(save.money) + '</b><small>Reputation ' + save.rep + '</small>' + (save.int && save.int.acct ? '<small>Savings ' + money(save.int.acct) + '</small>' : '') + '</div>';
  scr.innerHTML = h;
};
Phone.init = function () {
  if (Phone.el) return;
  const css = document.createElement('style');
  css.textContent = '#phBtn{position:fixed;left:max(16px,env(safe-area-inset-left,0px));top:16px;z-index:34;width:44px;height:44px;border-radius:12px;border:1px solid rgba(255,255,255,.25);background:rgba(8,12,20,.78);font-size:22px;cursor:pointer;color:#fff}#phBtn:hover{background:rgba(30,40,60,.9)}' +
    '#phone{position:fixed;left:max(16px,env(safe-area-inset-left,0px));top:68px;z-index:36;width:min(290px,82vw);height:min(560px,calc(100vh - 90px));border-radius:30px;background:#0b0e14;border:3px solid #2a2f3a;box-shadow:0 18px 50px rgba(0,0,0,.6);padding:14px 10px;font-family:Rajdhani,system-ui,sans-serif;color:#fff}' +
    '#phone .scr{height:100%;overflow:auto;border-radius:20px;background:linear-gradient(160deg,#1b2a44,#0e1626 60%,#2a1a2a);padding:12px}#phone .ph-clock{font-size:52px;font-weight:600;text-align:center;margin-top:6px}#phone .ph-sub{text-align:center;color:#a8b6cc;font-size:13px;margin-bottom:16px}' +
    '#phone .ph-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}#phone .ph-grid button{background:none;border:0;color:#fff;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:4px}#phone .ph-grid i{font-style:normal;font-size:26px;width:54px;height:54px;display:grid;place-items:center;border-radius:15px;background:rgba(255,255,255,.12)}#phone .ph-grid small{font-size:12px;color:#d8e0ee}' +
    '#phone .ph-top{display:flex;align-items:center;gap:8px;margin-bottom:10px}#phone .ph-top button{background:none;border:0;color:#8fd0ff;font-size:26px;cursor:pointer;width:28px}#phone .ph-top b{font-size:18px}' +
    '#phone .ph-row{display:flex;align-items:center;gap:10px;width:100%;background:rgba(255,255,255,.06);border:0;border-radius:12px;padding:8px;margin-bottom:6px;color:#fff;cursor:pointer;text-align:left}#phone .ph-row span:nth-child(2){flex:1}#phone .ph-row b{display:block;font-size:15px}#phone .ph-row small{color:#a8b6cc}#phone .ph-row i{font-style:normal}' +
    '#phone .ph-av{width:64px;height:64px;border-radius:50%;background:#2f6f78;display:grid;place-items:center;font-size:28px;font-weight:700;margin:40px auto 10px}#phone .ph-av.s{width:34px;height:34px;font-size:15px;margin:0}#phone .ph-call{text-align:center}#phone .ph-call b{display:block;font-size:20px}#phone .ph-call small{color:#8fd0ff}' +
    '#phone .ph-av.s2{width:54px;height:54px;font-size:24px;margin:6px auto 6px}#phone .ph-chat{margin:10px 0;display:flex;flex-direction:column;gap:6px}#phone .ph-chat p{margin:0;max-width:85%;padding:6px 10px;border-radius:12px 12px 12px 3px;background:rgba(255,255,255,.12);font-size:14px;align-self:flex-start}#phone .ph-chat p.me{align-self:flex-end;background:#2a6fdb;border-radius:12px 12px 3px 12px}#phone .ph-chat p.sys{align-self:center;background:none;color:#a8b6cc;font-size:12px}' +
    '#phone .ph-opts{display:flex;flex-direction:column;gap:6px;margin-bottom:8px}#phone .ph-opts button{background:rgba(255,211,77,.12);border:1px solid rgba(255,211,77,.45);color:#fff;border-radius:10px;padding:7px 10px;text-align:left;font:600 14px Rajdhani,system-ui,sans-serif;cursor:pointer}#phone .ph-hang{width:100%;background:#c0392b;border:0;color:#fff;border-radius:12px;padding:9px;font:700 15px Rajdhani,system-ui,sans-serif;cursor:pointer}' +
    '#phone .ph-msg{background:rgba(255,255,255,.07);border-radius:10px;padding:6px 9px;margin-bottom:6px;font-size:14px}#phone .ph-msg b{display:block;color:#8fd0ff;font-size:12px}#phone .ph-empty{color:#a8b6cc}#phone .ph-bank{text-align:center;margin-top:30px}#phone .ph-bank b{display:block;font-size:34px;margin:6px 0}#phone .ph-bank small{display:block;color:#a8b6cc}' +
    '#phone .ph-log .sect{color:#ffd34d;font-size:12px;letter-spacing:.12em;text-transform:uppercase;margin:10px 0 4px}#phone .ph-log .row{display:flex;align-items:center;gap:8px;justify-content:space-between;background:rgba(255,255,255,.06);border-radius:10px;padding:6px 8px;margin-bottom:5px;font-size:14px}#phone .ph-log small{color:#a8b6cc}#phone .ph-log p{margin:4px 0;font-size:13px}';
  document.head.appendChild(css);
  const b = Phone.btn = document.createElement('button'); b.id = 'phBtn'; b.type = 'button'; b.title = 'Phone (O)'; b.textContent = '📱'; b.hidden = true; document.body.appendChild(b);
  b.addEventListener('click', () => Phone.toggle());
  const p = Phone.el = document.createElement('div'); p.id = 'phone'; p.hidden = true; p.innerHTML = '<div class="scr"></div>'; document.body.appendChild(p);
  p.addEventListener('click', (e) => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.say) Phone.say(+t.dataset.say); else if (t.dataset.hang) Phone.hang(); else if (t.dataset.ph) { if (Phone.call) Phone.hang(); Phone.go(t.dataset.ph); } else if (t.dataset.call) Phone.dial(t.dataset.call); else if (t.dataset.svc) Phone.service(t.dataset.svc);
    else if (t.dataset.act === 'sqt') { Story.trackSet(t.dataset.id); Phone.render(); }
  });
};
Phone.key = function (code) { if (code === 'KeyO') { Phone.toggle(); return true; } if (Phone.open && code === 'Escape') { Phone.toggle(false); return true; } return false; };
/* every frame: the button shows in play, and moves below the run panel when one is up */
Phone.tick = function () {
  if (!Phone.btn) return; const on = App.mode === 'play'; Phone.btn.hidden = !on; if (!on && Phone.open) Phone.toggle(false);
  const mp = document.getElementById('mp'), r = mp && !mp.hidden && mp.offsetParent ? mp.getBoundingClientRect() : null, top = r && r.left < 80 ? r.bottom + 8 : 16;
  Phone.btn.style.top = top + 'px'; Phone.el.style.top = (top + 52) + 'px';
  if (Phone.open && (Phone.app === 'home' || (Phone.call && Phone.call.st === 'talk')) && ((Phone.rt = (Phone.rt || 0) + 1) % 30 === 0)) Phone.render();
};
