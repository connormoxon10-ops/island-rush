/* ================= STORY MODE =================
   A second game beside the sandbox, with its own save (01_core.js: PLAY_MODE). It runs as chapters, one after another, each a list of steps:
     cut      a cutscene: letterbox bars, the camera on the scene, people speaking (Space / Enter / click for the next line, Esc skips)
     talk     find someone (a marker over them), get out of the car and press E: the conversation plays as a cutscene
     goto     get somewhere
     mission  do one of the island's runs (its marker is the objective)
     bank     rob a bank (08_int_zjob.js)
     heist    take a car off a moving train (08_heist.js)
     clean    lose the police
   The cast: Mara Quinn (your cousin, a mechanic with a garage), Dex Calloway (a fixer with a plan for everything) and Sal Ortega (forty years on
   the railway). The story: you arrive with nothing, earn Mara's trust, catch Dex's eye, rob a bank, take the gold Aurum off its train, and Dex,
   who wanted it all along, leaves you on an erupting volcano. The objective is always on screen and on the GPS; progress is saved after each step. */
const Story = { on: PLAY_MODE === 'story', npcs: {}, tg: null, cur: null, beam: null, near: null, hudEl: null, wait: 0, t: 0 };
const STORY_CAST = {
  mara: { name: 'Mara Quinn', o: () => ({ fem: true, skin: lc(0xc8906a), hair: lc(0x6a2a14), hst: 'pony', shirt: lc(0x2f6f78), pants: lc(0x2a3448), shoe: lc(0x2a2018), sleeve: false }) },
  dex: { name: 'Dex Calloway', o: () => ({ skin: lc(0xe0b090), hair: lc(0x1a1410), hst: 'short', beard: true, suit: true, tie: lc(0x8a1a22), shirt: lc(0x22252c), pants: lc(0x22252c), inner: lc(0xdddddd), glasses: true, sun: true }) },
  sal: { name: 'Sal Ortega', o: () => ({ old: true, skin: lc(0x9a6a4a), hair: lc(0xcfcfcf), hst: 'short', beard: true, coat: true, shirt: lc(0x3a4a5a), pants: lc(0x3a3428), hat: { k: 'cap', c: lc(0x24324a) } }) }
};
/* ---------- places, worked out from the world ---------- */
Story.place = function (k) {
  const o = {};
  if (k === 'garage') { o.x = GAR.ox + 6; o.z = GAR.oz + 7; o.yaw = Math.PI; o.label = 'Mara’s garage, ' + (GAR.town || towns[0].name); }
  else if (k === 'dex') { Bld.prep(); const S = Bld.sites.find((s) => (s.kind === 'resto' || s.kind === 'club') && REG[s.ti % REG.length].key === 'city') || Bld.sites.find((s) => s.kind === 'resto'); o.x = S.x + 2; o.z = S.z + (S.b ? 3.5 : -3.5); o.yaw = S.b ? 0 : Math.PI; o.label = S.name + ', ' + S.T.name; o.site = S; }
  else if (k === 'bank') { Bld.prep(); const S = Bld.sites.find((s) => s.kind === 'bank' && BJ_TIER[s.ti] === 0) || Bld.sites.find((s) => s.kind === 'bank'); o.x = S.x; o.z = S.z + (S.b ? 4 : -4); o.label = S.name + ', ' + S.T.name; o.site = S; }
  else if (k === 'sal') { const S = Heist.sites[0]; o.x = S.sx + S.rz * 9; o.z = S.sz - S.rx * 9; o.yaw = Math.atan2(S.sx - o.x, S.sz - o.z); o.label = 'the old line'; }
  else if (k === 'camp') { const m = missions.find((q) => q.id === 'mvolc'); o.x = m.x + 7; o.z = m.z; o.yaw = -Math.PI / 2; o.label = 'Mount Cinder base camp'; }
  else if (k === 'evac') { const m = missions.find((q) => q.id === 'mvolc'), f = m.cps[m.cps.length - 1]; o.x = f.x + 6; o.z = f.z + 4; o.yaw = 0; o.label = 'Ashfall'; }
  if (o.yaw == null) o.yaw = 0; o.y = terrainHeight(o.x, o.z); return o;
};
const storyMission = (type) => () => { const m = missions.find((q) => q.type === type && (type !== 'race' || q.limit < 140)) || missions.find((q) => q.type === type); return m; };
/* ---------- the chapters ---------- */
const STORY = [
  { title: 'Off the Ferry', steps: [
    { t: 'cut', shot: 'car', lines: [['', 'Six weeks ago you sold everything you owned for a one-way ticket to the island.'], ['', 'One car, a full tank and one person here who still answers your calls.'], ['Mara (phone)', 'You actually came! Okay. Come find me at the garage on the edge of town. Follow the marker, and try not to hit anything.']] },
    { t: 'talk', who: 'mara', at: 'garage', obj: 'Meet Mara at her garage', lines: [['mara', 'Look at you. Still driving that old thing?'], ['you', 'It got me here.'], ['mara', 'It got you here. Round here a car has to do a lot more than that.'], ['mara', 'I need a hand anyway. A customer across the island is waiting on parts, and my van is in pieces. Do the run and the first week’s rent is on me.']] }
  ] },
  { title: 'Earn Your Keep', steps: [
    { t: 'mission', m: storyMission('delivery'), obj: 'Do Mara’s courier run' },
    { t: 'talk', who: 'mara', at: 'garage', obj: 'Back to Mara', lines: [['mara', 'Not a scratch on the box. You might be useful after all.'], ['mara', 'Thing is, round here nobody hires a driver they have never seen race. There is a street race tonight. Win it and people will know your name.'], ['you', 'And if I lose?'], ['mara', 'Then they will know your name for a different reason.']] }
  ] },
  { title: 'Street Cred', steps: [
    { t: 'mission', m: storyMission('race'), obj: 'Win the street race' },
    { t: 'cut', shot: 'car', lines: [['Unknown (phone)', 'That was some driving. The name is Dex. I find people for jobs that pay better than parts runs.'], ['Dex (phone)', 'Come and see me. I will be outside the restaurant. Do not bring your cousin.']] }
  ] },
  { title: 'The Fixer', steps: [
    { t: 'talk', who: 'dex', at: 'dex', obj: 'Meet Dex', lines: [['dex', 'There you are. Sit, sit. You hungry? No? Straight to business. I like that.'], ['dex', 'Banks on this island lock the front and forget the back. A staff door, a vault, two old guards on a loop.'], ['you', 'You want me to rob a bank.'], ['dex', 'I want you to make a withdrawal at night. Case it in the day, go back after dark, stay out of their torchlight. Keep half.'], ['dex', 'Here is the one. Easy money. Well. Easier.']] }
  ] },
  { title: 'Night Work', steps: [
    { t: 'bank', at: 'bank', obj: 'Rob the bank: case it by day at the staff door, then go back at night' }
  ] },
  { title: 'Heat', steps: [
    { t: 'clean', obj: 'Lose the police' },
    { t: 'talk', who: 'mara', at: 'garage', obj: 'Lie low at Mara’s garage', lines: [['mara', 'You are all over the radio. A bank? Tell me this was not Dex Calloway.'], ['you', 'It was a good plan.'], ['mara', 'Dex always has a good plan. People who work for him do not always have a good ending.'], ['mara', 'Just… be careful. Please.']] },
    { t: 'cut', shot: 'car', lines: [['Dex (phone)', 'Clean work. Now the big one. There is a train on this island that carries a solid gold car. The Aurum.'], ['Dex (phone)', 'Talk to Sal, by the old line. He drove that train for forty years. He knows how it runs.']] }
  ] },
  { title: 'Gold Rush', steps: [
    { t: 'talk', who: 'sal', at: 'sal', obj: 'Find Sal by the railway', lines: [['sal', 'Dex sent you? Of course he did.'], ['sal', 'The Aurum rides in the back wagon with the side door open, for the cooling. Daft, but there you go.'], ['sal', 'There is a ramp the line crews left down here. Hit it flat out as the wagon comes by and you will land right inside.'], ['you', 'And if I miss?'], ['sal', 'Then you will meet the side of a train. Mind the timing, son.']] },
    { t: 'heist', k: 0, obj: 'Steal the Aurum off its train and bring it to your garage' }
  ] },
  { title: 'Double Cross', steps: [
    { t: 'cut', shot: 'car', lines: [['Dex (phone)', 'Ha! You did it. Bring yourself up to the observatory on Mount Cinder. We will settle up there, nice and quiet.'], ['', 'Mount Cinder has not erupted in eighty years. Everyone says so.']] },
    { t: 'talk', who: 'dex', at: 'camp', obj: 'Meet Dex at Mount Cinder base camp', lines: [['dex', 'My driver. Look at that view.'], ['dex', 'Here is the thing. The bank, the Aurum, the cops chasing a face on camera. That is all you. I was having lunch.'], ['you', 'You set me up.'], ['dex', 'I gave you a career. Short, but exciting. The rangers will run you up to the observatory. Enjoy the mountain.'], ['', 'The ground starts to shake.']] },
    { t: 'mission', m: () => missions.find((q) => q.id === 'mvolc'), obj: 'Get off the volcano alive' }
  ] },
  { title: 'Ashes', steps: [
    { t: 'talk', who: 'mara', at: 'evac', obj: 'Find Mara in Ashfall', lines: [['mara', 'I saw the smoke from across the island. I knew. I just knew you would be on that mountain.'], ['you', 'Dex is gone. The money, the Aurum, all of it is on me.'], ['mara', 'Then you will pay it back the slow way. With me. At the garage.'], ['mara', 'Honest work. Fast cars. And no more fixers.'], ['', 'THE END. The island is yours to roam.']] }
  ] }
];

/* ---------- people standing in the world for the story ---------- */
Story.npc = function (id, P) {
  let n = Story.npcs[id]; if (!n) { const h = Human.make(STORY_CAST[id].o()); n = Story.npcs[id] = { id, h, x: 0, z: 0, y: 0, yaw: 0 }; scene.add(h.root); }
  n.x = P.x; n.z = P.z; n.y = P.y; n.yaw = P.yaw; n.h.root.position.set(P.x, P.y, P.z); n.h.root.rotation.y = P.yaw; n.h.root.visible = true; return n;
};
Story.hideNpcs = function (but) { for (const k in Story.npcs) if (k !== but) Story.npcs[k].h.root.visible = false; };

/* ---------- running the steps ---------- */
Story.S = () => save.story || (save.story = { ch: 0, st: 0, base: {}, fin: 0 });
Story.step = function () { const S = Story.S(), C = STORY[S.ch]; return C ? C.steps[S.st] : null; };
Story.begin = function () {
  if (!Story.on) return; Story.ui(); const S = Story.S();
  if (S.fin) { UI.toast('Story complete · the island is yours', 'good'); Story.enter(); return; }
  setTimeout(() => { if (S.st === 0) UI.banner('CHAPTER ' + (S.ch + 1), STORY[S.ch].title); Story.enter(); }, 400);
};
/* a step starts: its marker, its person, and what it starts from */
Story.enter = function () {
  const S = Story.S(), st = Story.step(); Story.cur = st; Story.tg = null; Story.near = null; Story.wait = 0;
  if (!st) { Story.hideNpcs(); Story.setBeam(null); return; }
  if (st.t === 'talk') { const P = Story.place(st.at); Story.npc(st.who, P); Story.hideNpcs(st.who); Story.tg = { x: P.x, z: P.z, label: STORY_CAST[st.who].name }; }
  else Story.hideNpcs();
  if (st.t === 'mission') { const m = st.m(); if (m) Story.tg = { x: m.x, z: m.z, label: m.title }; }
  if (st.t === 'bank') { const P = Story.place('bank'); Story.tg = { x: P.x, z: P.z, label: P.label }; S.base.bank = Object.values(intSave().banks || {}).reduce((s, r) => s + (r.n | 0), 0); }
  if (st.t === 'heist') { const H = Heist.sites[st.k]; if (H) Story.tg = { x: H.sx, z: H.sz, label: 'The ramp by the line' }; }
  if (st.t === 'cut') setTimeout(() => Story.playCut(st), 300);
  Story.setBeam(Story.tg); writeSave(); GPS.t = 0;
};
Story.next = function () {
  const S = Story.S(); S.st++;
  if (S.st >= STORY[S.ch].steps.length) {
    S.ch++; S.st = 0; S.base = {};
    if (S.ch >= STORY.length) { S.fin = 1; save.money += 50000; writeSave(); Story.enter(); UI.banner('STORY COMPLETE', 'Thanks for playing · +' + money(50000)); Snd.win(); return; }
    UI.banner('CHAPTER ' + (S.ch + 1), STORY[S.ch].title); Snd.win();
  }
  Story.enter();
};
/* is the current step done? */
Story.tick = function (dt) {
  if (!Story.on || App.mode !== 'play') return; const st = Story.cur, S = Story.S(); if (!st || S.fin) return; Story.t += dt;
  Story.near = null;
  if (st.t === 'talk') { const n = Story.npcs[st.who]; if (n) { const d = Math.hypot(Pl.x - n.x, Pl.z - n.z); if (d < 3.2 && Foot.on) Story.near = n; else if (d < 12 && !Foot.on) Story.near = 'car'; } }
  else if (st.t === 'mission') { const m = st.m(); if (m && save.done[m.id] && !Mi) Story.next(); }
  else if (st.t === 'bank') { const n = Object.values(intSave().banks || {}).reduce((s, r) => s + (r.n | 0), 0); if (n > (S.base.bank | 0)) Story.next(); }
  else if (st.t === 'heist') { const P = HEIST_PRIZES[st.k]; if (P && save.owned[P.id] && Heist.phase === 'idle') Story.next(); }
  else if (st.t === 'clean') { if (Wanted.stars === 0) Story.next(); }
  else if (st.t === 'goto') { const P = Story.place(st.at); if (Math.hypot(Pl.x - P.x, Pl.z - P.z) < (st.r || 15)) Story.next(); }
};
Story.key = function (code) {
  if (!Story.on || code !== 'KeyE' || !Story.near || Story.near === 'car') return false;
  const st = Story.cur; Story.playCut(st, Story.near); return true;
};
/* ---------- cutscenes ---------- */
const Cut = { on: false, lines: null, i: 0, typed: 0, t: 0, shot: null, npc: null, el: null, done: null, ca: 0 };
Story.playCut = function (st, npc) {
  if (Cut.on) return; const S = Story.S(), step = S.st, ch = S.ch;
  Cut.play(st.lines, npc || null, st.shot || (npc ? 'two' : 'car'), () => { const S2 = Story.S(); if (S2.ch === ch && S2.st === step) Story.next(); });
};
Cut.play = function (lines, npc, shot, done) {
  Story.ui(); Cut.on = true; Cut.lines = lines; Cut.i = -1; Cut.npc = npc; Cut.shot = shot; Cut.done = done; Cut.ca = 0;
  for (const k in Keys) Keys[k] = false; car.thr = car.brk = 0;
  if (npc && Foot.on) { Foot.yaw = Math.atan2(npc.x - Foot.x, npc.z - Foot.z); npc.h.root.rotation.y = Math.atan2(Foot.x - npc.x, Foot.z - npc.z); }
  UI.setMode('cut'); Cut.el.hidden = false; Cut.next();
};
Cut.next = function () {
  if (Cut.i >= 0 && Cut.typed < Cut.lines[Cut.i][1].length) { Cut.typed = 1e9; return; }   /* the first press finishes the line, the next one moves on */
  Cut.i++; Cut.t = 0; Cut.typed = 0;
  if (Cut.i >= Cut.lines.length) { Cut.end(); return; }
  Snd.beep(520, 0.03);
};
Cut.end = function () { Cut.on = false; Cut.el.hidden = true; UI.setMode('play'); const d = Cut.done; Cut.done = null; if (d) d(); };
Cut.key = function (code) { if (code === 'Escape') { Cut.i = Cut.lines.length; Cut.typed = 0; Cut.end(); return; } if (code === 'Space' || code === 'Enter' || code === 'KeyE') Cut.next(); };
Cut.whoName = (w) => (w === 'you' ? 'You' : STORY_CAST[w] ? STORY_CAST[w].name : w);
const _cutV = new THREE.Vector3();
Cut.frame = function (dt) {
  if (!Cut.on) { titleCamera(dt); return; }
  const L = Cut.lines[Cut.i]; if (!L) return; Cut.t += dt; Cut.typed = Math.min(L[1].length, Cut.typed + dt * 46);
  const auto = 2.4 + L[1].length * 0.055; if (Cut.typed >= L[1].length && Cut.t > auto) Cut.next();
  const sp = Cut.el.querySelector('b'), tx = Cut.el.querySelector('p'); sp.textContent = Cut.whoName(L[0]); sp.hidden = !L[0]; tx.textContent = L[1].slice(0, Math.floor(Cut.typed));
  /* the camera */
  const me = Foot.on ? { x: Foot.x, y: Foot.y, z: Foot.z } : { x: car.x, y: car.y, z: car.z }, n = Cut.npc; Cut.ca += dt;
  if (n && Cut.shot === 'two') {
    const spk = L[0] === n.id ? n : L[0] === 'you' ? me : null, mx = (me.x + n.x) / 2, mz = (me.z + n.z) / 2, dx = n.x - me.x, dz = n.z - me.z, d = Math.hypot(dx, dz) || 1;
    const side = Cut.i % 2 ? 1 : -1, px = -dz / d, pz = dx / d, back = spk === n ? -1 : spk === me ? 1 : 0;
    camera.position.set(mx + px * 3.4 * side + dx / d * back * 1.4, (me.y + n.y) / 2 + 1.75, mz + pz * 3.4 * side + dz / d * back * 1.4);
    const f = spk || { x: mx, y: (me.y + n.y) / 2, z: mz }; _cutV.set(f.x, f.y + 1.55, f.z); camera.lookAt(_cutV);
    if (n.h) { n.h.b.jaw.rotation.x = L[0] === n.id && Cut.typed < L[1].length ? 0.08 + 0.08 * Math.sin(App.time * 22) : 0.02; }
  } else {
    const a = Cut.ca * 0.12 + 0.6, R = 9.5; camera.position.set(me.x + Math.sin(a) * R, me.y + 2.6, me.z + Math.cos(a) * R); _cutV.set(me.x, me.y + 1, me.z); camera.lookAt(_cutV);
    placeBody(); car.ext.visible = !Foot.on || true;
  }
  if (Math.abs(camera.fov - 46) > 0.1) { camera.fov = 46; camera.updateProjectionMatrix(); }
};
/* ---------- what is on screen ---------- */
Story.setBeam = function (tg) {
  if (!Story.beam) { Story.beam = makeBeam('#ffd34d', 2.6, 200); scene.add(Story.beam); }
  Story.beam.visible = !!tg; if (tg) Story.beam.position.set(tg.x, terrainHeight(tg.x, tg.z), tg.z);
};
Story.visual = function (dt) {
  if (!Story.on) return;
  for (const k in Story.npcs) { const n = Story.npcs[k]; if (n.h.root.visible) Human.alive(n.h, dt, App.time, n.h.id * 0.37); }
  if (Story.beam && Story.beam.visible) Story.beam.material.opacity = clamp(Math.hypot(Pl.x - Story.beam.position.x, Pl.z - Story.beam.position.z) / 200, 0.08, 0.85);
  const el = Story.hudEl; if (!el) return; const S = Story.S(), st = Story.cur, show = App.mode === 'play' && !!st && !S.fin && !(Mi && st.t !== 'mission');
  el.hidden = !show; if (!show) return;
  let tx = st.obj || (st.t === 'cut' ? '' : ''), hint = '';
  if (st.t === 'talk' && Story.near === 'car') hint = 'Get out (F) to talk to ' + STORY_CAST[st.who].name.split(' ')[0];
  else if (st.t === 'talk' && Story.near) hint = (TouchIn.on ? 'Tap TALK' : 'E') + ' · Talk to ' + STORY_CAST[st.who].name.split(' ')[0];
  else if (Story.tg) { const d = Math.hypot(Pl.x - Story.tg.x, Pl.z - Story.tg.z); hint = Story.tg.label + ' · ' + (d > 1000 ? (d / 1000).toFixed(1) + ' km' : Math.round(d) + ' m'); }
  el.innerHTML = '<small>CHAPTER ' + (S.ch + 1) + ' · ' + STORY[S.ch].title.toUpperCase() + '</small><b>' + tx + '</b>' + (hint ? '<i>' + hint + '</i>' : '');
};
Story.ui = function () {
  if (Cut.el) return;
  const css = document.createElement('style');
  css.textContent = '#cut{position:fixed;inset:0;z-index:60;pointer-events:auto;cursor:pointer}#cut::before,#cut::after{content:"";position:absolute;left:0;right:0;height:11vh;background:#000}#cut::before{top:0}#cut::after{bottom:0}' +
    '#cut .sub{position:absolute;left:50%;bottom:14vh;transform:translateX(-50%);width:min(860px,92vw);text-align:center;font:600 20px/1.35 Rajdhani,system-ui,sans-serif;color:#fff;text-shadow:0 2px 6px #000}' +
    '#cut .sub b{display:block;color:#ffd34d;font-size:15px;letter-spacing:.12em;text-transform:uppercase;margin-bottom:4px}#cut .sub p{margin:0;min-height:2.7em}#cut .skip{position:absolute;right:18px;bottom:3.5vh;color:#aaa;font:500 13px Rajdhani,system-ui,sans-serif;z-index:2}' +
    '#storyObj{position:fixed;top:60px;left:50%;transform:translateX(-50%);z-index:30;background:rgba(8,12,20,.72);border:1px solid rgba(255,211,77,.45);border-radius:10px;padding:7px 16px 8px;text-align:center;font-family:Rajdhani,system-ui,sans-serif;color:#fff;pointer-events:none;max-width:88vw}' +
    '#storyObj small{display:block;color:#ffd34d;font-size:11px;letter-spacing:.14em}#storyObj b{display:block;font-size:17px;font-weight:600}#storyObj i{display:block;font-style:normal;font-size:13px;color:#cfd6e4}';
  document.head.appendChild(css);
  const c = Cut.el = document.createElement('div'); c.id = 'cut'; c.hidden = true; c.innerHTML = '<div class="sub"><b></b><p></p></div><div class="skip">Space / click: next · Esc: skip</div>'; document.body.appendChild(c);
  c.addEventListener('pointerdown', (e) => { e.preventDefault(); Cut.next(); });
  const h = Story.hudEl = document.createElement('div'); h.id = 'storyObj'; h.hidden = true; document.body.appendChild(h);
};
/* ---------- the title screen: free roam or the story, each its own save ---------- */
Story.switchTo = function (mode) { try { writeSave(); localStorage.setItem(MODE_KEY, mode); sessionStorage.setItem('island-rush-go', '1'); } catch (e) { /* ignore */ } location.reload(); };
Story.initTitle = function () {
  const b = document.getElementById('btnStart'); if (!b || document.getElementById('btnStory')) return;
  let has = false, ch = 0; try { const o = JSON.parse(localStorage.getItem(STORY_KEY) || 'null'); has = !!(o && o.story); ch = has ? (o.story.ch | 0) : 0; } catch (e) { /* ignore */ }
  b.innerHTML = 'Start engine<small style="display:block;font-size:11px;opacity:.75;font-weight:500">Free roam</small>';
  const s = document.createElement('button'); s.className = 'btn primary'; s.id = 'btnStory'; s.type = 'button';
  s.innerHTML = 'Story mode<small style="display:block;font-size:11px;opacity:.75;font-weight:500">' + (has ? (ch >= STORY.length ? 'Complete · replay from the end' : 'Continue · Chapter ' + (ch + 1)) : 'New story · its own save') + '</small>';
  b.after(s);
  b.onclick = () => { if (PLAY_MODE === 'sandbox') App.start(); else Story.switchTo('sandbox'); };
  s.onclick = () => { if (PLAY_MODE === 'story') App.start(); else Story.switchTo('story'); };
  const mh = document.getElementById('menuHead'); if (mh && !document.getElementById('btnTitle')) { const t = document.createElement('button'); t.className = 'btn sm'; t.id = 'btnTitle'; t.type = 'button'; t.textContent = '⏏ Title screen'; t.title = 'Back to the title: switch between free roam and the story'; t.onclick = () => { writeSave(); location.reload(); }; mh.appendChild(t); }
  if (PLAY_MODE === 'story') { const tg = document.getElementById('tagline'); if (tg) tg.textContent = 'Story mode: ' + (has ? 'chapter ' + Math.min(ch + 1, STORY.length) + ' of ' + STORY.length : 'a new life on the island') + '. Free roam keeps its own save.'; }
};
Story.autoStart = function () { let go = false; try { go = sessionStorage.getItem('island-rush-go') === '1'; sessionStorage.removeItem('island-rush-go'); } catch (e) { /* ignore */ } if (go) setTimeout(() => App.start(), 60); };
