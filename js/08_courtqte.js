/* ================= QUICKTIME LIBRARY =================
   Every quicktime is a generator: it builds its widget in #cQte, loops `yield` once per frame while reading Court.evq
   (events: ['act'] press, ['dir', 'U'|'L'|'D'|'R'], ['pick', n]) and returns { f: 0..1, label, extra? }. The round runner in 08_court.js
   turns f into points, a flash, a sound and the next line of dialogue.
   timing · mash · sequence · reaction (the originals)  +  balance · dodge · rhythm · charge · spot · simon · tug */
const QTE = {};
const lrPad = () => (TouchIn.on ? '<div class="pad lr"><button type="button" data-d="L">◀</button><button type="button" data-d="R">▶</button></div>' : '');
const lrKeys = () => (TouchIn.on ? 'tap ◀ ▶' : '<kbd>←</kbd> <kbd>→</kbd> / <kbd>A</kbd> <kbd>D</kbd>');
const dirGlyph = { U: '↑', L: '←', D: '↓', R: '→' };

/* needle sweeps back and forth: stop it inside the green (the first round of the original trial) */
QTE.timing = function* (c) {
  Court.qOff(); Court.evq.length = 0; Court.tmode = 'act'; const D = c.D, zw = lerp(c.zw || 0.2, (c.zw || 0.2) * 0.6, D), zc = 0.32 + Math.random() * 0.36, speed = lerp(c.speed || 0.95, (c.speed || 0.95) * 1.45, D);
  Court.qte('<div class="qt">' + c.title + '</div><div class="qh">' + (c.hint || reachKey() + ' when the needle is in the green') + '</div><div class="tbar"><i class="tzone" id="qZ"></i><i class="tperf" id="qP"></i><i class="tneedle" id="qN"></i></div>');
  const z = Court.q('qZ'), pf = Court.q('qP'), nd = Court.q('qN'); z.style.left = (zc - zw / 2) * 100 + '%'; z.style.width = zw * 100 + '%'; pf.style.left = (zc - zw * 0.16) * 100 + '%'; pf.style.width = zw * 0.32 * 100 + '%';
  let t = 0, hit = null; CR.focus(c.focus || 'lawyer');
  while (t < 3.8) { t += Court.dt; const ph = (t * speed) % 2, n = ph < 1 ? ph : 2 - ph; nd.style.left = n * 100 + '%'; if (Court.take('act')) { hit = n; break; } yield; }
  Court.qOff(); CR.cue('slam', 1); CR.cue('shake', 0.45); Court.sfx(c.sfx || 'obj'); Court.flash(c.flash || c.title, 'amber');
  let f = 0, lab = 'TOO SLOW'; if (hit != null) { const d = Math.abs(hit - zc); if (d <= zw * 0.16) { f = 1; lab = 'PERFECT'; } else if (d <= zw / 2) { f = 0.667; lab = 'GOOD'; } else if (d <= zw * 0.85) { f = 0.267; lab = 'CLOSE'; } else lab = 'MISSED'; }
  yield* cWait(0.7); return { f, label: lab };
};

/* button mashing against a draining bar */
QTE.mash = function* (c) {
  Court.evq.length = 0; Court.tmode = 'act'; const D = c.D;
  Court.qte('<div class="qt">' + c.title + '</div><div class="qh">' + (c.hint || (TouchIn.on ? 'Mash the button' : 'Mash <kbd>Space</kbd> / click')) + '</div><div class="mbar"><i id="qM"></i></div><div class="qs" id="qT"></div>');
  const bar = Court.q('qM'), tm = Court.q('qT'); let v = 0, best = 0, t = 0; const T = lerp(c.T || 4.4, (c.T || 4.4) * 0.86, D), gain = 0.078, decay = 0.3 + 0.12 * D;
  while (t < T) { t += Court.dt; const n = Court.take('act'); if (n) { v += n * gain; CR.rapid = 1; CR.cue('slam', (Math.random() * 2) | 0); Court.sfx('tick'); } v = Math.max(0, v - decay * Court.dt * (v > 0.01 ? 1 : 0)); if (v > 1) v = 1; best = Math.max(best, v); CR.sweat = v; bar.style.width = v * 100 + '%'; bar.className = v > 0.8 ? 'hot' : ''; tm.textContent = Math.max(0, T - t).toFixed(1) + 's'; if (v >= 1) break; yield; }
  Court.qOff(); CR.sweat = 0; const L = c.labels || ['BROKEN!', 'SHAKEN', 'WOBBLY', 'UNMOVED'];
  return { f: best, label: best >= 1 ? L[0] : best > 0.7 ? L[1] : best > 0.35 ? L[2] : L[3] };
};

/* type a code with the arrow keys */
QTE.sequence = function* (c) {
  Court.evq.length = 0; Court.tmode = 'none'; const D = c.D, n = c.len || 4, dirs = ['U', 'L', 'D', 'R'], seq = []; for (let i = 0; i < n; i++) { let d; do d = pickOf(dirs); while (i && d === seq[i - 1]); seq.push(d); }
  Court.qte('<div class="qt">' + c.title + '</div><div class="qh">' + (c.hint || 'Enter the code (' + (TouchIn.on ? 'tap the arrows' : 'arrow keys / WASD') + ')') + '</div><div class="seq">' + seq.map((d, i) => '<b class="key" id="qk' + i + '">' + dirGlyph[d] + '</b>').join('') + '</div><div class="pad">' +
    dirs.map((d) => '<button type="button" data-d="' + d + '">' + dirGlyph[d] + '</button>').join('') + '</div><div class="tbar t2"><i class="tleft" id="qTL"></i></div>');
  const T = lerp(5.8, 4.4, D); let idx = 0, best = 0, t = 0; CR.focus(c.focus || 'table');
  const paint = () => { for (let i = 0; i < n; i++) Court.q('qk' + i).className = 'key' + (i < idx ? ' ok' : i === idx ? ' cur' : ''); }; paint();
  while (t < T && idx < n) {
    t += Court.dt; let bad = false;
    for (const d of Court.takeDirs()) { if (idx >= n) break; if (d === seq[idx]) { idx++; best = Math.max(best, idx); Court.sfx('tick'); CR.cue('slam', idx % 2); } else { idx = 0; bad = true; Court.sfx('bad'); } }
    if (bad) { for (let i = 0; i < n; i++) Court.q('qk' + i).className = 'key bad'; Court.q('qTL').style.width = (1 - t / T) * 100 + '%'; yield* cWait(0.18); paint(); } else paint();
    Court.q('qTL').style.width = (1 - t / T) * 100 + '%'; yield;
  }
  Court.qOff(); CR.cue('shake', 0.25); const L = c.labels || ['ADMITTED', 'PARTLY ADMITTED', 'REJECTED'];
  return { f: best / n, label: best >= n ? L[0] : best >= n / 2 ? L[1] : L[2] };
};

/* wait for the cue, then react as fast as you can (the original gavel round, now also a swearing-in, a falling cup, ...) */
QTE.reaction = function* (c) {
  Court.evq.length = 0; Court.tmode = 'act';
  Court.qte('<div class="qt">' + c.title + '</div><div class="qh">' + (c.hint || 'Wait for it, then react! (' + (TouchIn.on ? 'tap' : '<kbd>Space</kbd> / click') + ')') + '</div><div class="react wait" id="qR">' + (c.wait || 'WAIT') + '</div><div class="qs" id="qT"></div>');
  const circ = Court.q('qR'); const gav = c.gavel !== false; if (gav) { CR.hold = true; } CR.focus(c.focus || (gav ? 'gavel' : 'ahead')); const wait = 1.5 + Math.random() * 1.9 + (c.D ? 0.4 : 0); let t = 0, ms = null, early = false;
  while (t < wait) { t += Court.dt; if (Court.take('act')) { early = true; break; } yield; }
  if (!early) { if (gav) { CR.hold = false; CR.gavel = 0.22; } Court.sfx(c.sfx || 'knock'); CR.cue('shake', 0.3); circ.className = 'react go'; circ.textContent = c.go || 'NOW!'; const t0 = performance.now(); let to = 0; Court.actT = 0;
    while (to < 1.3) { to += Court.dt; if (Court.take('act')) { ms = Math.max(1, Math.round((Court.actT || performance.now()) - t0)); break; } yield; } }
  else { if (gav) { CR.hold = false; CR.gavel = 0; } Court.sfx('knock'); }
  Court.qOff(); CR.cue('slam', 0); CR.cue('slam', 1);
  let f = 0, lab = early ? 'TOO EARLY' : 'TOO SLOW'; if (ms != null) { if (ms < 230) { f = 1; lab = 'LIGHTNING'; } else if (ms < 350) { f = 0.75; lab = 'SHARP'; } else if (ms < 500) { f = 0.45; lab = 'OK'; } else { f = 0.2; lab = 'SLOW'; } }
  return { f, label: lab, extra: ms != null ? ms + ' ms' : '' };
};

/* BALANCE: wind pushes a marker around, nudge it back with left / right to stay inside the green zone */
QTE.balance = function* (c) {
  Court.qOff(); Court.evq.length = 0; Court.tmode = 'lr'; const D = c.D, T = c.T || 6, zw = lerp(0.36, 0.28, D), wind = lerp(0.6, 0.95, D);
  Court.qte('<div class="qt">' + c.title + '</div><div class="qh">' + (c.hint || 'Keep the marker in the green: ' + lrKeys()) + '</div><div class="bal"><i class="bz" id="qZ"></i><i class="bm" id="qB"></i></div><div class="tbar t2"><i class="tleft" id="qTL"></i></div>' + lrPad());
  const zone = Court.q('qZ'), mk = Court.q('qB'), tl = Court.q('qTL'); zone.style.left = (0.5 - zw / 2) * 100 + '%'; zone.style.width = zw * 100 + '%';
  let pos = (Math.random() - 0.5) * 0.3, v = 0, t = 0, inT = 0; const ph = [Math.random() * 6, Math.random() * 6]; CR.focus(c.focus || 'victim');
  while (t < T) {
    const dt = Court.dt; t += dt; const w = (Math.sin(t * 1.3 + ph[0]) * 0.6 + Math.sin(t * 2.9 + ph[1]) * 0.4) * wind;
    v += (w + pos * 0.9) * dt; for (const d of Court.takeDirs()) { if (d === 'L') { v -= 0.62; Court.sfx('tick'); } else if (d === 'R') { v += 0.62; Court.sfx('tick'); } }
    v *= Math.exp(-1.8 * dt); pos += v * dt; if (Math.abs(pos) > 1) { pos = Math.sign(pos); v = -v * 0.3; }
    const ok = Math.abs(pos) < zw; if (ok) inT += dt; mk.style.left = (pos * 0.5 + 0.5) * 100 + '%'; mk.className = 'bm' + (ok ? '' : ' out'); tl.style.width = (1 - t / T) * 100 + '%'; CR.sweat = clamp(Math.abs(pos) * 1.2, 0, 1); yield;
  }
  Court.qOff(); CR.sweat = 0; const f = clamp(inT / T / 0.95, 0, 1), L = c.labels || ['STEADY', 'SHAKY', 'RATTLED'];
  return { f, label: f >= 0.85 ? L[0] : f >= 0.5 ? L[1] : L[2] };
};

/* DODGE: three lanes, things fly down at you, slide left / right out of the way */
QTE.dodge = function* (c) {
  Court.qOff(); Court.evq.length = 0; Court.tmode = 'lr'; const D = c.D, T = 5.6, N = 10 + (D > 0.4 ? 2 : 0), FT = lerp(1.15, 0.85, D), H = 128, item = c.item || 'tom';
  Court.qte('<div class="qt">' + c.title + '</div><div class="qh">' + (c.hint || 'Dodge! ' + lrKeys()) + '</div><div class="dg" id="qD"><i class="dl" style="left:0"></i><i class="dl" style="left:33.33%"></i><i class="dl" style="left:66.66%"></i><b class="dp" id="qP"></b></div>' + lrPad());
  const field = Court.q('qD'), me = Court.q('qP'); let lane = 1, t = 0, hits = 0, hitT = 0, last = -1; const items = []; let tt = 0.45;
  for (let i = 0; i < N; i++) { let l; do l = (Math.random() * 3) | 0; while (l === last && Math.random() < 0.6); last = l; items.push({ t0: tt, lane: l, el: null, done: false }); tt += 0.28 + Math.random() * 0.3 - D * 0.06; }
  const end = items[N - 1].t0 + FT + 0.2; CR.focus(c.focus || 'jury');
  me.style.left = (lane * 33.333 + 16.667) + '%';
  while (t < end) {
    t += Court.dt; for (const d of Court.takeDirs()) { if (d === 'L') lane = Math.max(0, lane - 1); else if (d === 'R') lane = Math.min(2, lane + 1); }
    me.style.left = (lane * 33.333 + 16.667) + '%';
    for (const it of items) {
      if (it.done) continue; const p = (t - it.t0) / FT; if (p < 0) continue;
      if (!it.el) { it.el = document.createElement('i'); it.el.className = item; it.el.style.left = (it.lane * 33.333 + 16.667) + '%'; field.appendChild(it.el); }
      it.el.style.top = (p * (H - 26)) + 'px';
      if (p >= 0.86) { it.done = true; if (it.lane === lane) { hits++; hitT = 0.28; Court.sfx('bad'); CR.cue('shake', 0.35); CR.cue('flinch'); it.el.className = item + ' splat'; setTimeout(((el) => () => el.remove())(it.el), 160); } else { Court.sfx('tick'); it.el.remove(); } }
    }
    hitT = Math.max(0, hitT - Court.dt); field.className = 'dg' + (hitT > 0 ? ' hit' : ''); yield;
  }
  Court.qOff(); const f = clamp(1 - hits / N * 1.3, 0, 1), L = c.labels || ['UNTOUCHABLE', 'DODGY', 'SPLATTERED'];
  return { f, label: hits === 0 ? L[0] : f >= 0.4 ? L[1] : L[2], extra: hits ? hits + ' hit' + (hits > 1 ? 's' : '') : '' };
};

/* RHYTHM: rings shrink onto a target, tap as each one lands */
QTE.rhythm = function* (c) {
  Court.qOff(); Court.evq.length = 0; Court.tmode = 'act'; const D = c.D, N = c.beats || 7, gap = c.gap || lerp(0.82, 0.68, D), lead = 0.95, t0 = 1.5;
  Court.qte('<div class="qt">' + c.title + '</div><div class="qh">' + (c.hint || 'Tap as each ring lands (' + (TouchIn.on ? 'tap' : '<kbd>Space</kbd> / click') + ')') + '</div><div class="rh"><i class="rt"></i>' + Array.from({ length: N }, (_, i) => '<i class="rr" id="qRR' + i + '"></i>').join('') + '</div><div class="beats">' + Array.from({ length: N }, (_, i) => '<i id="qBt' + i + '"></i>').join('') + '</div>');
  const rings = [], dots = [], bt = [], got = new Array(N).fill(-1), ticked = new Array(N).fill(false); for (let i = 0; i < N; i++) { rings.push(Court.q('qRR' + i)); dots.push(Court.q('qBt' + i)); bt.push(t0 + i * gap); }
  let t = 0; CR.focus(c.focus || 'victim'); const tEnd = bt[N - 1] + 0.5;
  while (t < tEnd) {
    t += Court.dt;
    for (let i = 0; i < N; i++) {
      const a = bt[i] - lead, r = rings[i]; if (t < a || t > bt[i] + 0.3) { if (r.style.opacity !== '0') r.style.opacity = '0'; } else { const k = clamp((t - a) / lead, 0, 1.3); r.style.opacity = String(t > bt[i] ? clamp(1 - (t - bt[i]) / 0.3, 0, 1) : 0.35 + 0.65 * k); r.style.transform = 'scale(' + (2.7 - 1.7 * Math.min(1, k)).toFixed(3) + ')'; }
      if (!ticked[i] && t >= bt[i]) { ticked[i] = true; Court.sfx(c.beatSfx || 'tick'); if (c.pulse) CR.pulse = 1; }
      if (got[i] < 0 && t > bt[i] + 0.26) { got[i] = 0; dots[i].className = 'x'; }
    }
    const n = Court.take('act');
    if (n) { let bi = -1, bd = 9; for (let i = 0; i < N; i++) if (got[i] < 0) { const d = Math.abs(t - bt[i]); if (d < bd) { bd = d; bi = i; } } if (bi >= 0 && bd <= 0.26) { const s = bd < 0.07 ? 1 : bd < 0.13 ? 0.7 : bd < 0.2 ? 0.4 : 0.15; got[bi] = s; dots[bi].className = s >= 1 ? 'p' : s >= 0.7 ? 'g' : 'o'; if (s >= 0.7) { CR.cue('slam', bi % 2); Court.sfx('good'); } } }
    yield;
  }
  Court.qOff(); let sum = 0; for (let i = 0; i < N; i++) sum += Math.max(0, got[i]); const f = sum / N, L = c.labels || ['IN THE GROOVE', 'CLOSE', 'OFF BEAT'];
  return { f, label: f >= 0.8 ? L[0] : f >= 0.4 ? L[1] : L[2] };
};

/* CHARGE: press and hold to fill a bar, let go inside the green */
QTE.charge = function* (c) {
  Court.qOff(); Court.evq.length = 0; Court.tmode = 'act'; const D = c.D, zc = 0.62 + Math.random() * 0.24, zw = lerp(0.18, 0.12, D), rate = lerp(0.6, 0.8, D);
  Court.qte('<div class="qt">' + c.title + '</div><div class="qh">' + (c.hint || (TouchIn.on ? 'Press and hold, let go in the green' : 'Hold <kbd>Space</kbd> / mouse, release in the green')) + '</div><div class="tbar"><i class="tzone" id="qZ"></i><i class="tperf" id="qP"></i><i class="tneedle" id="qN"></i></div><div class="qs" id="qT">HOLD…</div>');
  const z = Court.q('qZ'), pf = Court.q('qP'), nd = Court.q('qN'), tx = Court.q('qT'); z.style.left = (zc - zw / 2) * 100 + '%'; z.style.width = zw * 100 + '%'; pf.style.left = (zc - zw * 0.2) * 100 + '%'; pf.style.width = zw * 0.4 * 100 + '%'; nd.style.left = '0%';
  CR.focus(c.focus || 'table'); let t = 0; while (Court.held() && t < 1.2) { t += Court.dt; yield; } t = 0; Court.evq.length = 0;
  while (!Court.held() && t < 4.5) { t += Court.dt; yield; }
  let f = 0, lab = 'TOO SLOW';
  if (Court.held()) {
    let v = 0; tx.textContent = ''; CR.rapid = 1;
    while (Court.held() && v < 1) { v += Court.dt * rate; nd.style.left = Math.min(1, v) * 100 + '%'; CR.rapid = 1; tx.textContent = Math.round(Math.min(1, v) * 100) + '%'; yield; }
    const d = Math.abs(v - zc);
    if (v >= 1) { f = 0.1; lab = c.over || 'OVERDONE'; } else if (d <= zw * 0.2) { f = 1; lab = 'PERFECT'; } else if (d <= zw / 2) { f = 0.75; lab = 'GOOD'; } else if (d <= zw) { f = 0.4; lab = 'CLOSE'; } else { f = 0.15; lab = v < zc ? 'TOO SOON' : 'TOO LATE'; }
    CR.cue('slam', 0); CR.cue('slam', 1); CR.cue('shake', f >= 0.75 ? 0.4 : 0.2); Court.sfx(f >= 0.75 ? 'perfect' : f >= 0.4 ? 'good' : 'bad');
  }
  Court.qOff(); return { f, label: lab };
};

/* SPOT THE LIE: three statements, one contradicts the exhibit */
Court.mkFacts = function () {
  const P = Court.pend, unit = unitName().toLowerCase(), kmh = Math.max(15, Math.round(toUnit(P.kmh)));
  const hh = Math.floor(App.tod) % 24, mm = Math.floor((App.tod % 1) * 60), fmt = (h, m) => { const H = ((h % 24) + 24) % 24; return ((H % 12) || 12) + ':' + String(m).padStart(2, '0') + ' ' + (H < 12 ? 'AM' : 'PM'); };
  const alt = (arr, v) => pickOf(arr.filter((x) => x !== v)), carNames = (typeof CARS !== 'undefined' ? CARS.map((c) => c.name) : ['Rook GT', 'Kestrel', 'Vanta']);
  const sig = pickOf(['green', 'red']), wx = pickOf(['clear', 'raining', 'foggy']), shift = (Math.random() < 0.5 ? -1 : 1) * (2 + ((Math.random() * 3) | 0)), dv = (Math.random() < 0.5 ? -1 : 1) * (18 + ((Math.random() * 18) | 0));
  Court.facts = {
    time: { v: fmt(hh, mm), f: fmt(hh + shift, mm), lab: 'Time', lines: ['It was about {v} when it happened.', 'I looked at my watch. {v}.', 'Around {v}, I remember the clock.'] },
    speed: { v: kmh + ' ' + unit, f: Math.max(8, kmh + dv) + ' ' + unit, lab: 'Speed', lines: ['That car was doing {v}, easy.', 'He must have been going {v}.', "I'd say {v}. I know speed."] },
    signal: { v: sig, f: sig === 'green' ? 'red' : 'green', lab: 'Light', lines: ['The light was {v}, I saw it.', 'I swear the signal was {v}.'] },
    car: { v: P.car, f: alt(carNames, P.car), lab: 'Car', lines: ["It was a {v}. I'd know it anywhere.", 'Some kind of {v}, definitely.'] },
    weather: { v: wx, f: alt(['clear', 'raining', 'foggy'], wx), lab: 'Weather', lines: ['It was {v} that day.', 'The weather? {v}, no question.'] }
  };
};
QTE.spot = function* (c) {
  Court.qOff(); Court.evq.length = 0; Court.tmode = 'none'; const D = c.D; if (!Court.facts) Court.mkFacts();
  const F = Court.facts, keys = Object.keys(F).sort(() => Math.random() - 0.5).slice(0, 3), lie = (Math.random() * 3) | 0;
  const lines = keys.map((k, i) => pickOf(F[k].lines).replace('{v}', i === lie ? F[k].f : F[k].v));
  Court.qte('<div class="qt">' + c.title + '</div><div class="qh">' + (c.hint || 'One statement contradicts the exhibit. Pick it (' + (TouchIn.on ? 'tap' : 'keys <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> or click') + ')') + '</div><div class="facts">' + (c.exhibit || 'EXHIBIT') + ' ' + keys.map((k) => '<span>' + F[k].lab + ' · ' + esc(String(F[k].v)) + '</span>').join('') + '</div><div class="stm">' + lines.map((l, i) => '<button type="button" data-p="' + i + '"><b>' + (i + 1) + '</b>' + esc(l) + '</button>').join('') + '</div><div class="tbar t2"><i class="tleft" id="qTL"></i></div>');
  const T = lerp(9.5, 7, D), tl = Court.q('qTL'); let t = 0, pick = -1; CR.focus(c.focus || 'victim');
  while (t < T && pick < 0) { t += Court.dt; for (let i = Court.evq.length - 1; i >= 0; i--) if (Court.evq[i][0] === 'pick') { pick = Court.evq[i][1]; } Court.evq.length = 0; tl.style.width = (1 - t / T) * 100 + '%'; yield; }
  const btns = [...document.querySelectorAll('#cQte .stm button')]; btns.forEach((b, i) => { if (i === lie) b.className = 'ok'; else if (i === pick) b.className = 'bad'; });
  let f = 0, lab = pick < 0 ? 'TOO SLOW' : 'WRONG'; if (pick === lie) { f = 0.65 + 0.35 * (1 - t / T); lab = c.win || 'CAUGHT IT'; Court.sfx('good'); CR.cue('slam', 1); } else Court.sfx('bad');
  yield* cWait(0.95); Court.qOff(); return { f, label: lab };
};

/* SIMON: watch four coloured arrows light up, repeat the order */
QTE.simon = function* (c) {
  Court.qOff(); Court.evq.length = 0; Court.tmode = 'none'; const D = c.D, n = c.len || (D > 0.4 ? 5 : 4), dirs = ['U', 'L', 'D', 'R'], seq = []; for (let i = 0; i < n; i++) seq.push(pickOf(dirs));
  Court.qte('<div class="qt">' + c.title + '</div><div class="qh" id="qH">WATCH…</div><div class="sim">' + dirs.map((d) => '<button type="button" data-d="' + d + '" id="qS' + d + '">' + dirGlyph[d] + '</button>').join('') + '</div><div class="tbar t2"><i class="tleft" id="qTL"></i></div>');
  const tile = (d) => Court.q('qS' + d), hint = Court.q('qH'), tl = Court.q('qTL'), freq = { U: 523, L: 440, D: 392, R: 659 }; CR.focus(c.focus || 'table'); tl.style.width = '0%';
  yield* cWait(0.6);
  for (const d of seq) { tile(d).className = 'lit'; if (Snd.ok) Snd.tone(Snd.ctx.currentTime, freq[d], 0.3, 'triangle', 0.14, 4000, 0.004, Snd.sfx); yield* cWait(0.5); tile(d).className = ''; yield* cWait(0.2); }
  Court.evq.length = 0; hint.innerHTML = 'YOUR TURN: ' + (TouchIn.on ? 'tap the arrows' : 'arrow keys / WASD'); const T = lerp(7, 5.5, D); let idx = 0, t = 0, ok = true;
  while (t < T && idx < n && ok) {
    t += Court.dt; tl.style.width = (1 - t / T) * 100 + '%';
    for (const d of Court.takeDirs()) { if (idx >= n) break; const tt = tile(d); if (d === seq[idx]) { idx++; tt.className = 'lit'; Court.sfx('tick'); if (Snd.ok) Snd.tone(Snd.ctx.currentTime, freq[d], 0.2, 'triangle', 0.12, 4000, 0.004, Snd.sfx); setTimeout(() => { if (tt) tt.className = ''; }, 140); } else { ok = false; tt.className = 'bad'; Court.sfx('bad'); break; } }
    yield;
  }
  if (!ok) yield* cWait(0.4); Court.qOff(); const f = idx / n, L = c.labels || ['PERFECT RECALL', 'PARTLY RIGHT', 'FORGOTTEN'];
  return { f, label: idx >= n ? L[0] : idx >= n / 2 ? L[1] : L[2] };
};

/* TUG OF WAR: alternate left and right as fast as you can */
QTE.tug = function* (c) {
  Court.qOff(); Court.evq.length = 0; Court.tmode = 'lr'; const D = c.D, T = c.T || 6.5;
  Court.qte('<div class="qt">' + c.title + '</div><div class="qh">' + (c.hint || 'Alternate ' + lrKeys() + ' as fast as you can') + '</div><div class="tug"><span>YOU</span><div class="tb"><i id="qTM"></i></div><span>THEM</span></div><div class="qs" id="qT"></div>' + lrPad());
  const bar = Court.q('qTM'), tm = Court.q('qT'); let pos = 0.4, t = 0, last = ''; CR.focus(c.focus || 'victim');
  while (t < T) {
    const dt = Court.dt; t += dt; pos -= lerp(0.24, 0.4, D) * (1 + 0.2 * Math.sin(t * 3.1)) * dt;
    for (const d of Court.takeDirs()) { if (d !== 'L' && d !== 'R') continue; if (d !== last) { pos += 0.062; last = d; CR.rapid = 1; CR.cue('slam', d === 'L' ? 0 : 1); Court.sfx('tick'); } else pos += 0.008; }
    pos = clamp(pos, 0, 1); bar.style.width = pos * 100 + '%'; tm.textContent = Math.max(0, T - t).toFixed(1) + 's'; CR.sweat = clamp(1 - pos, 0, 1) * 0.8;
    if (pos >= 1 || pos <= 0) break; yield;
  }
  Court.qOff(); CR.sweat = 0; const f = pos >= 1 ? 1 : pos <= 0 ? 0 : pos, L = c.labels || ['WINNER', 'STALEMATE', 'DRAGGED OVER'];
  return { f, label: f >= 0.85 ? L[0] : f >= 0.35 ? L[1] : L[2] };
};
