/* ================= LAWSUITS =================
   Hit a pedestrian and you get served. Settle on the spot for a flat 40 %, or fight it in first person. The case is drawn from five venues
   (county court, small claims, a TV court show, a police interview room, a hospital bedside: 08_courtcases.js + the scenes in 08_courtroom.js /
   08_courtvenues.js), each with its own cast, lines and a mix of quick-time rounds picked from the library in 08_courtqte.js
   (timing, mash, arrow code, reaction, balance, dodge, rhythm, charge, spot the lie, memory, tug of war). Four rounds, 100 points total.
   The score decides the verdict: 70+ not liable (and costs awarded to you), 35-69 partly liable (a share of the claim), below 35 liable + court costs.
   The round script is a generator: every `yield` waits one frame, so the QTEs read top to bottom. */
const Court = { cs: null, kind: '', lastKind: '', rounds: [], facts: null, tmode: 'act', ptr: false, padHeld: false, testI: 0, pend: null, phase: 'off', fx: { speed: 0, damage: 0, chroma: 0.0008, expo: 1 }, gen: null, dt: 0.016, evq: [], actT: 0, score: 0, maxSoFar: 0, res: [], count: 0, frameN: 0, cap: null, round: 0, diff: 0, caseNo: 0, bound: false };
const CT_FIRST = ['Marge', 'Dennis', 'Priya', 'Walt', 'Lucia', 'Gus', 'Tamsin', 'Rob', 'Ines', 'Otis', 'Brenda', 'Felix', 'Noor', 'Hank', 'Yuki', 'Cora'];
const CT_LAST = ['Hollis', 'Pemberton', 'Okafor', 'Dunmore', 'Vasquez', 'Kowalski', 'Brandt', 'Nakamura', 'Fitch', 'Abernathy', 'Quigley', 'Lindqvist'];
const CT_LAW = ['Rex Sharkley', 'Vivian Vulture', 'Gideon Sharp', 'Monica Clawson', 'Dirk Biteman'];
const pickOf = (a) => a[(Math.random() * a.length) | 0];

/* ---------- filing (called when a pedestrian is hit) ---------- */
Court.file = function (p, c) {
  if (save.set.suits === 'off') return;
  const k = clamp(Math.abs(c.speed) / 14, 0.3, 1.5), add = Math.round((700 + 1900 * k + Math.random() * 700) / 50) * 50, kmh = Math.abs(c.speed) * 3.6, P = Court.pend;
  if (P) { P.claim += add; P.hits++; P.kmh = Math.max(P.kmh, kmh); return; }
  Court.pend = { claim: add, hits: 1, kmh, look: Object.assign({}, p.app || {}), t: 0, name: pickOf(CT_FIRST) + ' ' + pickOf(CT_LAST), lawyer: pickOf(CT_LAW), car: CUR.name };
  UI.toast('Someone is calling a lawyer…', 'bad');
};
/* called every sim step while driving: the notice arrives once you stop, or after a few seconds anyway */
Court.tick = function (dt) {
  const P = Court.pend; if (!P || Court.phase !== 'off' || App.mode !== 'play') return;
  if (car.wrecked > 0 || devOn('free')) return;
  P.t += dt; if (P.t > 3.4 || (P.t > 1.6 && Math.abs(car.speed) < 2.5)) Court.open();
};
/* dev / pause-menu preview: cycles through the venues unless one is named */
Court.test = function (kind) {
  const order = ['court', 'small', 'tv', 'station', 'hosp']; if (!kind) kind = order[Court.testI++ % order.length];
  Court.pend = { claim: 4200, hits: 1, kmh: 72, look: {}, t: 0, name: pickOf(CT_FIRST) + ' ' + pickOf(CT_LAST), lawyer: pickOf(CT_LAW), car: CUR.name }; Court.open(kind);
};
/* which venue? first ever case is always the county court; then weighted by how bad the crash was, never the same venue twice in a row */
Court.pickKind = function (P, force) {
  if (force && CASES[force]) return force;
  const L = save.law; if (L.won + L.part + L.lost + L.settled === 0 && Court.count === 0) return 'court';
  const heavy = P.kmh >= 85 || P.hits >= 3, light = P.kmh < 40 && P.claim < 2400;
  const w = heavy ? { court: 3.5, station: 3, hosp: 2, tv: 1.5, small: 0 } : light ? { court: 2.5, small: 5, tv: 1.5, hosp: 1, station: 0.5 } : { court: 3, small: 2, tv: 2, station: 1.5, hosp: 1.5 };
  if (w[Court.lastKind] != null) w[Court.lastKind] *= 0.15;
  let tot = 0; for (const k in w) tot += w[k]; let r = Math.random() * tot; for (const k in w) { r -= w[k]; if (r <= 0) return k; } return 'court';
};
const cNum = (n) => money(n);
Court.clearInput = function () { for (const k in Keys) Keys[k] = false; for (const k of ['l', 'r', 'gas', 'brk', 'nit', 'hand']) TouchIn[k] = 0; Cam.dragging = false; Court.evq.length = 0; };

/* ---------- notice card: fight or settle ---------- */
Court.open = function (force) {
  const P = Court.pend; if (!P) return; Court.kind = Court.pickKind(P, force); const C = Court.cs = CASES[Court.kind]; Court.phase = 'notice'; Court.clearInput(); Fx.speed = 0; Court.tmode = 'act'; Court.ptr = false;
  P.settle = Math.round(P.claim * 0.4 / 10) * 10; P.settleLate = Math.round(P.claim * 0.55 / 10) * 10; Court.caseNo = 1000 + ((Math.random() * 8999) | 0); Court.diff = clamp(Court.count * 0.15, 0, 0.8);
  UI.setMode('court'); E.court.className = 'screen notice'; E.cTop.hidden = true; E.cQte.hidden = true; E.cCap.hidden = true;
  const who = esc(P.name) + (P.hits > 1 ? ' and ' + (P.hits - 1) + ' other' + (P.hits > 2 ? 's' : '') : ''), v = Math.round(toUnit(P.kmh)) + ' ' + unitName().toLowerCase();
  const nR = C.slots.length, nW = ['Two', 'Three', 'Four', 'Five', 'Six'][nR - 2] || nR;
  E.cCard.innerHTML = '<div class="ck">' + C.kicker + '</div><h2 class="no">' + C.title + '</h2><p>' + C.blurb(who, P.car, v) + '</p><div class="claim">Claim <b>' + cNum(P.claim) + '</b></div>' +
    '<p class="dim">Win and you pay nothing. ' + nW + ' quick rounds' + (TouchIn.on ? ' of tapping.' : ' with <kbd>Space</kbd> / click and the arrow keys.') + ' Or settle now and be done with it.</p>' +
    '<div class="acts"><button class="btn primary" type="button" data-c="fight">' + (C.fightLabel || 'Fight it in court') + '</button><button class="btn" type="button" data-c="settle">Settle · ' + cNum(P.settle) + '</button></div>';
  E.cCard.hidden = false;
};

/* ---------- ending: pay out, stats, back to the road ---------- */
Court.end = function (kind, pay, gain) {
  const paid = Math.min(pay, save.money); save.money += gain - paid; const L = save.law;
  if (kind === 'won') L.won++; else if (kind === 'part') L.part++; else if (kind === 'lost') L.lost++; else if (kind === 'settled') L.settled++; L.paid += paid; writeSave();
  Court.count++; Court.lastKind = Court.kind; Court.pend = null; Court.phase = 'off'; Court.gen = null; Court.evq.length = 0; Court.cap = null; Court.facts = null; Court.tmode = 'act'; Court.ptr = false;
  E.cCard.hidden = true; E.cTop.hidden = true; E.cQte.hidden = true; E.cCap.hidden = true; CR.speak = ''; CR.hold = false;
  UI.setMode('play'); Court.clearInput(); last = performance.now();
  if (kind === 'settled') UI.toast('Settled · paid ' + money(paid), 'bad'); else if (kind === 'won') UI.toast('Case dismissed' + (gain ? ' · +' + money(gain) + ' costs' : ''), 'good'); else UI.toast((kind === 'lost' ? 'Liable' : 'Partly liable') + ' · paid ' + money(paid), 'bad');
};
Court.settleNow = function () { const P = Court.pend; if (P) Court.end('settled', Court.phase === 'trial' ? P.settleLate : P.settle, 0); };

/* ---------- little helpers used by the script ---------- */
Court.sfx = function (k) {
  if (!Snd.ok) return; const t = Snd.ctx.currentTime;
  if (k === 'knock') { Snd.noiseHit(t, 0.1, 0.7, 300, 3200, Snd.sfx); Snd.tone(t, 150, 0.2, 'sine', 0.35, 900, 0.002, Snd.sfx); Snd.tone(t + 0.03, 95, 0.25, 'sine', 0.3, 700, 0.002, Snd.sfx); }
  else if (k === 'good') { [660, 880].forEach((f, i) => Snd.tone(t + i * 0.08, f, 0.25, 'triangle', 0.14, 4000, 0.004, Snd.sfx)); }
  else if (k === 'perfect') { [523, 659, 784, 1047].forEach((f, i) => Snd.tone(t + i * 0.07, f, 0.3, 'triangle', 0.15, 5000, 0.004, Snd.sfx)); }
  else if (k === 'bad') { [220, 165].forEach((f, i) => Snd.tone(t + i * 0.11, f, 0.3, 'sawtooth', 0.1, 900, 0.004, Snd.sfx)); }
  else if (k === 'tick') Snd.tone(t, 900 + Math.random() * 120, 0.05, 'square', 0.05, 3000, 0.002, Snd.sfx);
  else if (k === 'obj') { Snd.noiseHit(t, 0.18, 0.5, 600, 5000, Snd.sfx); Snd.tone(t, 392, 0.35, 'sawtooth', 0.12, 2500, 0.004, Snd.sfx); Snd.tone(t + 0.12, 523, 0.4, 'sawtooth', 0.12, 2500, 0.004, Snd.sfx); }
  else if (k === 'go') Snd.tone(t, 1200, 0.12, 'square', 0.08, 4000, 0.002, Snd.sfx);
  else if (k === 'beat') { Snd.tone(t, 78, 0.2, 'sine', 0.4, 500, 0.003, Snd.sfx); Snd.tone(t, 990, 0.08, 'sine', 0.06, 3000, 0.002, Snd.sfx); }
};
Court.say = function (who, text) { Court.cap = { text, n: 0 }; E.cWho.textContent = who; E.cTxt.textContent = ''; E.cCap.hidden = false; };
Court.qte = function (html) { E.cQte.innerHTML = html; E.cCap.hidden = true; E.cQte.style.bottom = 'calc(26px + env(safe-area-inset-bottom, 0px))'; E.cQte.hidden = false; };
Court.qOff = function () { E.cQte.hidden = true; E.cQte.innerHTML = ''; Court.tmode = 'act'; };
Court.held = function () { return !!(Keys.Space || Keys.Enter || Court.ptr || Court.padHeld); };
Court.q = (id) => document.getElementById(id);
Court.flash = function (text, cls) { const b = E.cBig; b.textContent = text; b.className = 'cbig'; void b.offsetWidth; b.className = 'cbig go ' + (cls || ''); };
Court.take = function (type) { let n = 0; for (let i = Court.evq.length - 1; i >= 0; i--) if (Court.evq[i][0] === type) { n++; Court.evq.splice(i, 1); } return n; };
Court.takeDirs = function () { const out = []; for (let i = 0; i < Court.evq.length;) { if (Court.evq[i][0] === 'dir') { out.push(Court.evq[i][1]); Court.evq.splice(i, 1); } else i++; } return out; };
Court.meter = function () {
  const f = E.cJ; f.style.width = clamp(Court.score, 0, 100) + '%'; f.className = Court.score >= 70 ? 'win' : Court.score >= 35 ? 'mid' : '';
  CR.favor = Court.maxSoFar > 0 ? clamp(Court.score / Court.maxSoFar, 0, 1) : 0.5;
  E.cDots.innerHTML = Array.from({ length: Math.max(1, Court.rounds.length) }, (_, i) => i).map((i) => '<i class="' + (i < Court.round ? 'on' : i === Court.round ? 'cur' : '') + '"></i>').join('');
};
Court.award = function (name, pts, max, label) { Court.score += pts; Court.maxSoFar += max; Court.res.push({ name, pts, max, label }); Court.round++; Court.meter(); };
const reachKey = () => (TouchIn.on ? 'Tap' : 'Press <kbd>Space</kbd> / click');

/* ---------- the trial script ---------- */
function* cWait(s) { let t = 0; while (t < s) { t += Court.dt; yield; } }
function* cTalk(key, who, text, focus, hold) { CR.speak = key; if (focus) CR.focus(focus); Court.say(who, text); yield* cWait(Math.max(1.5, text.length / 40 + 0.9) + (hold || 0)); }

/* one round: its lines, the quicktime, the points, the reaction */
function* cRound(R, tpl, spk, D) {
  for (const l of R.pre) yield* cTalk(l[0], spk[l[0]], tpl(l[1]), l[2], l[3]);
  Court.qOff(); Court.evq.length = 0;
  const r = yield* QTE[R.q](Object.assign({ D }, R.cfg, { title: tpl(R.cfg.title || ''), hint: R.cfg.hint ? tpl(R.cfg.hint) : null }));
  Court.qOff(); CR.sweat = 0; CR.hold = false;
  const f = clamp(r.f, 0, 1), pts = Math.round(f * R.max), tier = f >= 0.65 ? 'great' : f >= 0.2 ? 'ok' : 'bad';
  Court.award(R.name, pts, R.max, r.label);
  Court.flash(r.label + (r.extra ? ' · ' + r.extra : '') + (pts ? '  +' + pts : ''), tier === 'great' ? 'good' : tier === 'ok' ? 'amber' : 'bad');
  Court.sfx(tier === 'great' ? 'perfect' : tier === 'ok' ? 'good' : 'bad'); if (tier === 'bad') CR.cue('cringe'); else if (tier === 'great') CR.cue('cheer');
  yield* cWait(0.6);
  const post = R.post && R.post[tier]; if (post) yield* cTalk(post[0], spk[post[0]], tpl(post[1]), post[2], post[3]);
}

Court.script = function* () {
  const P = Court.pend, C = Court.cs, D = Court.diff, unit = unitName().toLowerCase(), kmh = Math.round(toUnit(P.kmh));
  const V = { VIC: P.name, LAW: P.lawyer, J: C.judge, car: P.car, kmh, unit, claim: cNum(P.claim) }, tpl = (s) => s.replace(/\{(\w+)\}/g, (m, k) => (V[k] != null ? V[k] : m));
  const spk = { judge: C.judge, lawyer: P.lawyer, victim: P.name, you: 'You' };
  Court.score = 0; Court.maxSoFar = 0; Court.res = []; Court.round = 0; Court.meter();
  yield* cWait(0.5); CR.cue('gavel'); Court.sfx('knock');
  for (const l of C.open) yield* cTalk(l[0], spk[l[0]], tpl(l[1]), l[2], l[3]);
  for (const R of Court.rounds) yield* cRound(R, tpl, spk, D);
  for (const l of C.retire) yield* cTalk(l[0], spk[l[0]], tpl(l[1]), l[2], l[3]);
  Court.say('', C.wait); CR.speak = ''; yield* cWait(2.3); CR.focus('bench');

  /* verdict */
  const sc = Court.score, P2 = Court.pend; let kind, title, pay = 0, gain = 0, line;
  if (sc >= 70) { kind = 'won'; title = C.titles[0]; gain = Math.round(P2.claim * 0.08 / 10) * 10; line = C.res.won(gain); }
  else if (sc >= 35) { kind = 'part'; title = C.titles[1]; pay = Math.round(P2.claim * clamp((72 - sc) / 72 + 0.12, 0.12, 0.9) / 10) * 10; line = C.res.part(pay); }
  else { kind = 'lost'; title = C.titles[2]; pay = P2.claim + 300; line = C.res.lost(P2.claim); }
  { const wd = Rel.perk('witness'); if (pay > 0 && wd > 0) { const cut = Math.round(pay * wd / 10) * 10; if (cut > 0) { pay -= cut; line += ' Friends vouched for your character: ' + cNum(cut) + ' off.'; } } }
  CR.cue('gavel'); Court.sfx('knock'); CR.cue(kind === 'won' ? 'cheer' : 'cringe');
  yield* cTalk('judge', C.judge, C.say[kind], 'judge');
  Court.phase = 'verdict'; E.cCap.hidden = true; E.cTop.hidden = true;
  E.cCard.innerHTML = '<div class="ck">' + C.vk + ' · case #' + Court.caseNo + '</div><h2 class="' + (kind === 'won' ? 'ok' : 'no') + '">' + title + '</h2><div class="score"><b>' + sc + '</b> / 100</div>' +
    '<div class="rows">' + Court.res.map((r) => '<div><span>' + r.name + '</span><em>' + r.label + '</em><b>' + r.pts + '/' + r.max + '</b></div>').join('') + '</div><p>' + line + '</p>' +
    (pay > save.money ? '<p class="dim">That is more than you have, so the court takes all of it.</p>' : '') + '<div class="rw ' + (pay ? 'neg' : 'pos') + '">' + (pay ? '−' + cNum(Math.min(pay, save.money)) : gain ? '+' + cNum(gain) : cNum(0)) + '</div><div class="acts"><button class="btn primary" type="button" data-c="leave">' + (Court.kind === 'court' ? 'Leave court' : 'Leave') + '</button></div>';
  E.cCard.hidden = false; Court.out = { kind, pay, gain };
  while (Court.phase === 'verdict') yield;
};

/* ---------- start the trial / per-frame / input ---------- */
Court.fight = function () {
  const C = Court.cs; CR.build(C.venue); CR.reset(); CR.pulse = 0; Court.facts = null; Court.tmode = 'act'; Court.ptr = false;
  C.last = C.last || []; Court.rounds = C.slots.map((alts, i) => { let k = (Math.random() * alts.length) | 0; if (alts.length > 1 && k === C.last[i]) k = (k + 1) % alts.length; C.last[i] = k; return alts[k]; });
  E.cJL.textContent = C.meter[0]; E.cJT.textContent = C.meter[1];
  Court.phase = 'trial'; E.court.className = 'screen trial'; E.cCard.hidden = true; E.cTop.hidden = false; E.cQte.hidden = true; E.cCap.hidden = true;
  const P = Court.pend; E.cCase.textContent = C.short + ' · #' + Court.caseNo; E.cPl.textContent = C.plate(P); E.cClaim.textContent = 'Claim ' + cNum(P.claim); E.cSettle.textContent = 'Settle · ' + cNum(P.settleLate);
  Court.evq.length = 0; Court.gen = Court.script(); Court.dt = 0.016; Court.score = 0; Court.maxSoFar = 0; Court.round = 0; Court.meter();
};
Court.pad = function () {
  let gp = null; try { const ps = navigator.getGamepads ? navigator.getGamepads() : null; if (ps) for (const p of ps) if (p && p.connected) { gp = p; break; } } catch (e) { gp = null; }
  if (!gp) { Court.padHeld = false; return; } const pp = Court.pp || (Court.pp = []), b = (i) => !!(gp.buttons[i] && gp.buttons[i].pressed); Court.padHeld = b(0);
  const edge = (i, code) => { const on = b(i); if (on && !pp[i]) Court.key(code); pp[i] = on; };
  edge(0, 'Space'); edge(12, 'ArrowUp'); edge(13, 'ArrowDown'); edge(14, 'ArrowLeft'); edge(15, 'ArrowRight'); if (Court.phase === 'notice') edge(1, 'KeyS');
};
Court.frame = function (dt) {
  Court.frameN++; if (Snd.ok) Snd.update(car, dt, true); Court.pad();
  if (Court.phase === 'notice') { if (Court.frameN % 8 === 0) renderFrame(Fx, App.time); return; }
  Court.dt = Math.min(dt, 0.05);
  if (Court.gen) { try { if (Court.gen.next().done) Court.gen = null; } catch (e) { console.error(e); Court.end('settled', Court.pend ? Court.pend.settle : 0, 0); return; } }
  if (Court.cap) { const c = Court.cap; c.n = Math.min(c.text.length, c.n + dt * 70); const s = c.text.slice(0, Math.floor(c.n)); if (E.cTxt.textContent !== s) E.cTxt.textContent = s; }
  CR.update(dt); CR.render();
};
Court.key = function (code) {
  const ph = Court.phase, now = performance.now();
  if (ph === 'notice') { if (code === 'Enter' || code === 'Space') Court.fight(); else if (code === 'KeyS') Court.settleNow(); return; }
  if (ph === 'verdict') { if (code === 'Enter' || code === 'Space') Court.leave(); return; }
  if (ph !== 'trial') return;
  if (code === 'Space' || code === 'Enter') { Court.evq.push(['act']); Court.actT = now; }
  else if (/^(Digit|Numpad)[1-3]$/.test(code)) Court.evq.push(['pick', +code.slice(-1) - 1]);
  else if (code === 'ArrowUp' || code === 'KeyW') Court.evq.push(['dir', 'U']); else if (code === 'ArrowDown' || code === 'KeyS') Court.evq.push(['dir', 'D']);
  else if (code === 'ArrowLeft' || code === 'KeyA') Court.evq.push(['dir', 'L']); else if (code === 'ArrowRight' || code === 'KeyD') Court.evq.push(['dir', 'R']);
};
Court.leave = function () { const o = Court.out || { kind: 'settled', pay: 0, gain: 0 }; Court.phase = 'closing'; Court.end(o.kind, o.pay, o.gain); };
Court.bind = function () {
  if (Court.bound) return; Court.bound = true;
  E.cCard.addEventListener('click', (e) => { const b = e.target.closest('[data-c]'); if (!b) return; const c = b.dataset.c; if (c === 'fight') Court.fight(); else if (c === 'settle') Court.settleNow(); else if (c === 'leave') Court.leave(); });
  E.cSettle.addEventListener('click', () => { if (Court.phase === 'trial') Court.settleNow(); });
  E.cQte.addEventListener('pointerdown', (e) => { const b = e.target.closest('[data-d],[data-p]'); if (!b) return; e.stopPropagation(); e.preventDefault(); if (b.dataset.p != null) Court.evq.push(['pick', +b.dataset.p]); else Court.evq.push(['dir', b.dataset.d]); });
  E.court.addEventListener('pointerdown', (e) => {
    if (Court.phase !== 'trial' || e.target.closest('button,[data-d],[data-p]')) return; Court.ptr = true;
    if (Court.tmode === 'lr') Court.evq.push(['dir', e.clientX < window.innerWidth / 2 ? 'L' : 'R']); else if (Court.tmode === 'act') { Court.evq.push(['act']); Court.actT = performance.now(); }
  });
  const rel = () => { Court.ptr = false; }; E.court.addEventListener('pointerup', rel); E.court.addEventListener('pointercancel', rel); window.addEventListener('blur', rel);
  window.addEventListener('pointermove', (e) => { if (App.mode !== 'court') return; CR.look.tx = -((e.clientX / window.innerWidth) - 0.5) * 0.42; CR.look.ty = -((e.clientY / window.innerHeight) - 0.5) * 0.24; });
};
