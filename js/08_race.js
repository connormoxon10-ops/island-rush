/* ================= RACE FLOW =================
   Drive up to the race office in the paddock, press E, pick laps / rivals / grid size, and the field is dropped on the grid: you start in
   the middle of the pack, the gantry lights count down, and the bots (07_racers.js) race you round the circuit. Everyone is tracked by
   unwrapped distance along the centreline, so laps, positions and gaps all come from one number per car. Cars can leave the track
   only through the paddock gate; R puts you back on the circuit if you get stuck, and the Quit button abandons the race. */
const Race = { on: false, phase: 'off', cfg: { laps: 3, diff: 1, n: 5 }, near: null, ents: [], me: null, t: 0, ct: 0, goAt: 0, clock: 0, hold: false, hudT: 0, over: false, res: null, wrong: 0, gridT: 0, banner: '' };
const RACE_NAMES = ['Vega Ruiz', 'Mika Tanaka', 'Dex Calloway', 'Ines Varga', 'Boone Hart', 'Sloane Okafor', 'Rafe Lindqvist', 'Nova Reyes', 'Tobias Wren'];
const RACE_DIFF = [
  { n: 'Rookie', sk: 0.95, mult: 1, off: [0, 0, 1, 1, 0, -1, 0], lim: 1.0, rb: [0.99, 1.05], edge: 0.07, nit: true, cover: false, push: 0, pw: 1.03, gr: 1.01, react: [0.14, 0.25] },
  { n: 'Pro', sk: 0.99, mult: 1.6, off: [1, 2, 2, 2, 1, 2, 1], lim: 1.02, rb: [1.0, 1.06], edge: 0.1, nit: true, cover: true, push: 1, pw: 1.06, gr: 1.02, react: [0.08, 0.16] },
  { n: 'Elite', sk: 1.0, mult: 2.5, off: [2, 2, 3, 3, 2, 3, 2], lim: 1.03, rb: [1.0, 1.08], edge: 0.14, nit: true, cover: true, push: 2.5, pw: 1.1, gr: 1.04, react: [0.05, 0.1] },
  { n: 'Legend', sk: 1.0, mult: 4, off: [3, 3, 4, 4, 3, 4, 3], lim: 1.05, rb: [1.0, 1.1], edge: 0.18, nit: true, cover: true, push: 4, pw: 1.18, gr: 1.07, react: [0.03, 0.06] }
];
/* the dealership cars from fastest to slowest round this circuit (measured with the bots' own driving), so a rival tier that is 'two cars better' really is two cars faster */
const RACE_ORDER = [6, 5, 4, 0, 7, 1, 3, 2];
const RACE_PRIZE = [1800, 1100, 700, 450, 300, 200, 150, 100], RACE_LAPM = { 2: 0.75, 3: 1, 5: 1.7 };
const _rl = { i: 0, t: 0, s: 0, d: 0, l: 0 }, _ro = {};
const fmtLap = (t) => { if (!(t > 0)) return '–'; const m = Math.floor(t / 60), s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(2); };

/* ---------- entrance ---------- */
Race.tick = function () {
  let near = null;
  if (Track.s && !Race.on && App.mode === 'play' && !Foot.on && !Fly.on && !Boat.on && !Mi && !VM.m && !Ven.on && !Talk.on && !GAR.edit && !Bust.on && !Tow.on && car.wrecked <= 0 && !devOn('free') && Fare.phase !== 'ride') {
    const dx = car.x - Track.officeX, dz = car.z - Track.officeZ; if (dx * dx + dz * dz < 64 && Math.abs(car.speed) < 7) near = true;
  }
  Race.near = near;
};
Race.refProg = function () { return Race.on && Race.me && Race.phase !== 'off' ? Race.me.prog : null; };
Race.open = function () {
  if (!Race.near || Race.on || App.mode !== 'play') return;
  if (Wanted.stars > 0) { UI.toast('The cops are on you · lose the heat first', 'bad'); return; }
  for (const k in Keys) Keys[k] = false; for (const k of ['l', 'r', 'gas', 'brk', 'nit', 'hand']) TouchIn[k] = 0;
  Race.phase = 'lobby'; UI.setMode('rlobby'); Race.paint(); Snd.beep(620, 0.06);
};
Race.leave = function () { if (App.mode !== 'rlobby' || Jack.open) return; Rally.lobby = false; Drag.lobby = false; Derby.lobby = false; Race.phase = 'off'; UI.setMode('play'); Snd.beep(420, 0.05); };
Race.key = function (code) { if (Derby.lobby) { Derby.lobbyKey(code); return; } if (Rally.lobby) { Rally.lobbyKey(code); return; } if (Drag.lobby) { Drag.lobbyKey(code); return; } if (Jack.open) { Jack.key(code); return; } if (code === 'Escape' || code === 'KeyE' && false) Race.leave(); else if (code === 'Enter') Race.start(); };
Race.paint = function () {
  const R = save.race, c = Race.cfg, seg = (k, opts) => '<div class="rseg" data-k="' + k + '">' + opts.map(([v, l]) => '<button type="button" class="' + (c[k] === v ? 'on' : '') + '" data-v="' + v + '">' + l + '</button>').join('') + '</div>';
  E.rlTitle.textContent = Track.name; E.rlCash.textContent = money(save.money); E.rlSub.textContent = 'Grand Prix'; E.rlPanel.classList.remove('jk');
  E.rlFoot.innerHTML = '<button class="btn" type="button" data-act="leave">Leave</button><button class="btn" type="button" data-act="rally">Rally stage \u25b8</button><button class="btn" type="button" data-act="drag">Drag strip \u25b8</button><button class="btn" type="button" data-act="derby">Derby \u25b8</button><button class="btn primary" type="button" data-act="start">Start race</button>';
  const base = RACE_PRIZE.slice(0, c.n + 1).map((p, i) => '<span>' + (i + 1) + '. <b>' + money(Math.round(p * RACE_DIFF[c.diff].mult * RACE_LAPM[c.laps] / 10) * 10) + '</b></span>').slice(0, 4).join('');
  E.rlBody.innerHTML = '<p class="rlp">A 2.2 km grand-prix circuit with a long start straight, a hairpin and an infield chicane. Rivals drive the same physics you do, and they are not shy about contact.</p>' +
    '<div class="rlrow"><label>Laps</label>' + seg('laps', [[2, '2'], [3, '3'], [5, '5']]) + '</div>' +
    '<div class="rlrow"><label>Rivals</label>' + seg('diff', RACE_DIFF.map((d, i) => [i, d.n])) + '</div>' +
    '<div class="rlrow"><label>Grid</label>' + seg('n', [[3, '4 cars'], [5, '6 cars'], [7, '8 cars']]) + '</div>' +
    '<div class="rlprize"><small>Prize money</small>' + base + '<span>+ <b>' + money(Math.round(300 * RACE_DIFF[c.diff].mult)) + '</b> fastest lap</span></div>' +
    '<div class="rlrec"><span>Races <b>' + R.races + '</b></span><span>Wins <b>' + R.wins + '</b></span><span>Podiums <b>' + R.podiums + '</b></span><span>Best lap <b>' + fmtLap(R.bestLap) + '</b></span><span>Winnings <b>' + money(R.earned) + '</b></span></div>' +
    '<p class="rlp dim">Your car: <b>' + esc(CUR.name) + '</b> · the field is picked to match it. ' + (TouchIn.on ? 'Use the pedals as normal; the ✕ Quit button leaves a race.' : 'R puts you back on the circuit if you get stuck.') + '</p>';
};
Race.initUI = function () {
  const rl = E.rl;
  rl.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (Jack.open) { Jack.click(b); return; }
    if (Rally.lobby) { Rally.lobbyClick(b); return; }
    if (Drag.lobby) { Drag.lobbyClick(b); return; }
    if (Derby.lobby) { Derby.lobbyClick(b); return; }
    if (b.dataset.act === 'rally') { Rally.open(); return; }
    if (b.dataset.act === 'drag') { Drag.open(); return; }
    if (b.dataset.act === 'derby') { Derby.open(); return; }
    if (b.dataset.act === 'start') Race.start(); else if (b.dataset.act === 'leave') Race.leave();
    else if (b.parentNode && b.parentNode.dataset.k) { Race.cfg[b.parentNode.dataset.k] = +b.dataset.v; Race.paint(); Snd.beep(520, 0.04); }
  });
  E.rhQuit.addEventListener('click', () => { if (Race.on) Race.end(true); });
  E.rres.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.act === 'again') { Race.end(false, true); } else if (b.dataset.act === 'done') Race.end(false); });
};

/* ---------- starting a race ---------- */
Race.start = function () {
  if (App.mode !== 'rlobby' && !Race.again) return; Race.again = false;
  const cfg = Race.cfg, D = RACE_DIFF[cfg.diff], rank = CUR.stolen ? CUR.rank : Math.max(0, CARS.indexOf(CUR)), n = cfg.n;
  const pr = Math.max(0, RACE_ORDER.indexOf(clamp(rank, 0, BASE_N - 1)));
  Bots.clear(); const used = new Set([curPaint()]); const hexes = PAINTS.map((_, i) => i).filter((i) => !used.has(i));
  const playerSlot = Math.min(n, 3);
  Race.ents = []; let k = 0;
  const pe = { me: true, name: 'You', def: CUR, prog: 0, k: -1, cross: [], laps: [], best: 0, fin: false, tFin: 0, pos: 0, speed: 0 }; Race.me = pe;
  const slots = []; for (let i = 0; i <= n; i++) slots.push(i);
  for (let i = 0; i <= n; i++) {
    if (i === playerSlot) { Track.slot(i, _ro); pe.slot = i; Race.slotO = Object.assign({}, _ro); continue; }
    const bi = k++, def = CARS[RACE_ORDER[clamp(pr - D.off[bi % D.off.length], 0, RACE_ORDER.length - 1)]], hex = PAINTS[hexes[(bi * 3 + 1) % hexes.length]];
    const b = Bots.make(def, hex, RACE_NAMES[bi % RACE_NAMES.length], clamp(D.sk + (Math.random() - 0.5) * 0.03, 0.7, 1), bi); Bots.tier(b, D);
    Track.slot(i, _ro); Bots.place(b, _ro); b.slot = i; Bots.list.push(b); b.e = { bot: b, name: b.name, def, prog: b.prog, k: -1, cross: [], laps: [], best: 0, fin: false, tFin: 0, pos: 0, speed: 0 }; Race.ents.push(b.e);
  }
  Race.ents.push(pe);
  const o = Race.slotO; loadAround(o.x, o.z, 14); spawnAt(o.x, o.z, o.yaw); Track.locate(car.x, car.z, o.i, _rl); pe.prog = _rl.s > Track.L / 2 ? _rl.s - Track.L : _rl.s; pe.idx = _rl.i; pe.sPrev = _rl.s;
  Bots.on = true; Bots.go = false; Bots.time = 0; Race.on = true; Race.phase = 'grid'; Race.t = 0; Race.ct = 0; Race.clock = 0; Race.hold = true; Race.over = false; Race.res = null; Race.wrong = 0; Race.goAt = 0.9 + 5 * 0.8 + 0.7 + Math.random() * 1.1; Race.gridT = 0;
  document.body.classList.add('racing'); if (App.mode === 'rlobby') UI.setMode('play'); E.rhud.hidden = false; E.rres.hidden = true; E.rcount.hidden = false; E.rcount.textContent = 'GET READY'; E.rcount.className = ''; Race.hudT = 0; Race.hud(true);
  Track.setLights(0, false); UI.banner('GRAND PRIX', Track.name + ' · ' + cfg.laps + ' laps');
};
Race.again = false;

/* ---------- per-frame ---------- */
Race.update = function (dt) {
  if (!Race.on) return;
  const me = Race.me, L = Track.L, N = Race.cfg.laps;
  Race.t += dt;
  /* the lights */
  if (Race.phase === 'grid') { Race.gridT += dt; if (Race.gridT > 1.6) { Race.phase = 'count'; Race.ct = 0; } }
  else if (Race.phase === 'count') {
    Race.ct += dt; const lit = clamp(Math.floor((Race.ct - 0.9) / 0.8) + 1, 0, 5); if (lit !== Track.lit) { Track.setLights(lit, false); if (lit > 0) Snd.beep(420 + lit * 40, 0.09); }
    E.rcount.textContent = lit >= 5 ? 'LIGHTS…' : 'GET READY';
    if (Race.ct >= Race.goAt) {
      Race.phase = 'run'; Race.hold = false; Bots.go = true; Race.clock = 0; Track.setLights(0, true); Snd.beep(900, 0.35); E.rcount.textContent = 'GO!'; E.rcount.className = 'go'; Race.greenT = 1.4;
    }
  } else if (Race.greenT > 0) { Race.greenT -= dt; if (Race.greenT <= 0) { Track.setLights(0, false); E.rcount.hidden = true; } }
  if (Race.phase === 'run' || Race.phase === 'finish') Race.clock += dt;
  /* progress for everyone */
  const live = Race.phase !== 'grid' && Race.phase !== 'count';
  for (const e of Race.ents) {
    if (e.bot) { e.prog = e.bot.prog; e.speed = e.bot.c.speed; e.l = e.bot.l; }
    else { Track.locate(car.x, car.z, e.idx, _rl); let ds = _rl.s - e.sPrev; if (ds < -L / 2) ds += L; else if (ds > L / 2) ds -= L; e.sPrev = _rl.s; e.idx = _rl.i; e.prog += ds; e.speed = car.speed; e.l = _rl.l; }
    while (live && e.k < N && e.prog >= (e.k + 1) * L) {
      e.k++; e.cross[e.k] = Race.clock;
      if (e.k >= 1) { const lt = e.cross[e.k] - e.cross[e.k - 1], was = e.best; e.laps.push(lt); if (!e.best || lt < e.best) e.best = lt; if (e.me && e.k < N) UI.toast('Lap ' + e.k + ' · ' + fmtLap(lt) + (!was || lt <= was ? ' · best' : ''), 'good'); }
      if (e.k >= N && !e.fin) { e.fin = true; e.tFin = Race.clock; if (e.bot) e.bot.fin = true; }
    }
  }
  /* standings: finished cars by finishing time, the rest by distance covered */
  const ord = Race.ents.slice().sort((a, b) => (a.fin && b.fin ? a.tFin - b.tFin : a.fin ? -1 : b.fin ? 1 : b.prog - a.prog)); ord.forEach((e, i) => { e.pos = i + 1; }); Race.ord = ord;
  /* wrong way */
  const tI = me.idx || 0, along = Math.sin(car.yaw) * Track.tx[tI] + Math.cos(car.yaw) * Track.tz[tI]; Race.wrong = along < -0.25 && Math.abs(car.speed) > 4 ? Race.wrong + dt : Math.max(0, Race.wrong - dt * 2);
  /* the player's race ends; the results wait a moment for the bots to cross */
  if (me.fin && !Race.over) { Race.over = true; Race.overT = 0; Race.phase = 'finish'; UI.banner('FINISH', 'P' + me.pos + ' of ' + Race.ents.length); Snd.beep(760, 0.3); }
  if (Race.over && !Race.res) { Race.overT += dt; if (Race.overT > 3.2) Race.showResults(); }
  Race.hudT -= dt; if (Race.hudT <= 0) { Race.hudT = 0.1; Race.hud(); }
};
/* ---------- HUD ---------- */
Race.hud = function (force) {
  const me = Race.me, N = Race.cfg.laps, ord = Race.ord || Race.ents, cnt = Race.ents.length; if (!me) return;
  const lap = clamp(me.k + 1, 1, N), cur = me.k >= 0 && Race.phase !== 'grid' && Race.phase !== 'count' ? Race.clock - (me.cross[me.k] || 0) : 0;
  const i = ord.indexOf(me), ahead = i > 0 ? ord[i - 1] : null, behind = i < ord.length - 1 ? ord[i + 1] : null, spd = Math.max(12, Math.abs(car.speed));
  const gap = (o, sg) => (o && !me.fin ? (sg > 0 ? '+' : '–') + (Math.abs(o.prog - me.prog) / spd).toFixed(1) + 's' : '');
  let h = '<div class="rhsp">' + Math.round(Math.abs(car.speed) * 3.6) + '<small>KM/H</small></div><div class="rhpos"><b>' + (me.pos || 1) + '</b><span>/' + cnt + '</span></div><div class="rhlap">LAP <b>' + lap + '</b>/' + N + '</div><div class="rhtm">' + (me.fin ? fmtLap(me.tFin) : fmtLap(cur)) + ' <i>best ' + fmtLap(me.best) + '</i></div>';
  if (ahead && !me.fin) h += '<div class="rhgap up">' + esc(ahead.name) + ' ' + gap(ahead, -1) + '</div>'; if (behind && !me.fin) h += '<div class="rhgap dn">' + esc(behind.name) + ' ' + gap(behind, 1) + '</div>';
  if (Race.wrong > 0.8) h += '<div class="rhwarn">WRONG WAY</div>';
  if (h !== Race._h) { Race._h = h; E.rhMain.innerHTML = h; }
  let b = ''; for (let k = 0; k < Math.min(ord.length, 8); k++) { const e = ord[k]; b += '<div class="' + (e.me ? 'me' : '') + '"><i>' + (k + 1) + '</i><span>' + esc(e.name) + '</span><em>' + (e.fin ? 'FIN' : e.k >= 0 || e.prog > 0 ? (k === 0 ? '' : '+' + (Math.abs(ord[0].prog - e.prog) / spd).toFixed(1)) : '') + '</em></div>'; }
  if (b !== Race._b) { Race._b = b; E.rhBoard.innerHTML = b; }
};
/* ---------- results ---------- */
Race.showResults = function () {
  const me = Race.me, N = Race.cfg.laps, D = RACE_DIFF[Race.cfg.diff], ord = Race.ord, win = ord[0], spd = 40;
  const prize = Math.round(RACE_PRIZE[Math.min(RACE_PRIZE.length - 1, me.pos - 1)] * D.mult * RACE_LAPM[N] / 10) * 10;
  let fl = null; for (const e of Race.ents) if (e.best && (!fl || e.best < fl.best)) fl = e; const flBonus = fl && fl.me ? Math.round(300 * D.mult) : 0;
  const total = prize + flBonus, R = save.race; R.races++; if (me.pos === 1) R.wins++; if (me.pos <= 3) R.podiums++; R.earned += total; if (me.best && (!R.bestLap || me.best < R.bestLap)) R.bestLap = me.best;
  const key = N + ':' + Race.cfg.diff; if (me.fin && (!R.best[key] || me.tFin < R.best[key])) R.best[key] = me.tFin; save.money += total; writeSave();
  let rows = ''; ord.forEach((e, i) => { rows += '<tr class="' + (e.me ? 'me' : '') + '"><td>' + (i + 1) + '</td><td>' + esc(e.name) + '<small>' + esc(e.def.name) + '</small></td><td>' + (e.fin ? (i === 0 ? fmtLap(e.tFin) : '+' + (e.tFin - ord[0].tFin).toFixed(2)) : '+' + Math.max(0.1, (Math.min(ord[0].prog, N * Track.L) - e.prog) / spd).toFixed(1) + '~') + '</td><td>' + fmtLap(e.best) + (fl === e ? ' ★' : '') + '</td></tr>'; });
  const title = me.pos === 1 ? 'VICTORY' : me.pos <= 3 ? 'PODIUM' : 'FINISHED';
  E.rres.innerHTML = '<div id="rresP" class="cham"><h2 class="' + (me.pos <= 3 ? 'ok' : '') + '">' + title + ' · P' + me.pos + '</h2><table><thead><tr><th></th><th>Driver</th><th>Time</th><th>Best lap</th></tr></thead><tbody>' + rows + '</tbody></table>' +
    '<div class="rw">+' + money(total) + (flBonus ? ' <small>incl. fastest-lap bonus</small>' : '') + '</div><div class="racts"><button class="btn" type="button" data-act="done">Back to paddock</button><button class="btn primary" type="button" data-act="again">Race again</button></div></div>';
  E.rres.hidden = false; Race.res = { prize: total }; Snd.beep(me.pos <= 3 ? 1000 : 600, 0.3);
};
/* ---------- leaving ---------- */
Race.end = function (quit, again) {
  Bots.clear(); Race.on = false; Race.phase = 'off'; Race.hold = false; Race.over = false; Race.res = null; Race.me = null; Race._h = ''; Race._b = '';
  document.body.classList.remove('racing'); E.rhud.hidden = true; E.rres.hidden = true; E.rcount.hidden = true; Track.setLights(0, false);
  const x = Track.s.cx + TRK.OFFICE[0], z = Track.s.cz + TRK.OFFICE[1] - 16; loadAround(x, z, 12); spawnAt(x, z, Math.PI);
  if (quit) UI.toast('Race abandoned', 'bad');
  if (again) { Race.near = true; Race.again = true; Race.start(); }
};
/* R during a race: back on the circuit, facing the way round, rolling */
Race.reset = function () {
  const i = Track.nearestIdx(car.x, car.z), ds = Track.cum[i]; Track.at(ds, 0, _ro);
  car.x = _ro.x; car.z = _ro.z; car.yaw = _ro.yaw; car.vx = Math.sin(car.yaw) * 4; car.vz = Math.cos(car.yaw) * 4; car.w = 0; car.speed = 4; car.pitch = car.roll = 0; car.steer = 0; car.air = false;
  if (Race.me) { Race.me.idx = i; Race.me.sPrev = ds; }
  UI.toast('Back on the circuit', 'info');
};
