/* ================= VENUES: one unique club, pub or stall in every town =================
   Each town has one venue (Fairhaven the Velvet Cue billiards club, Port Marlow the Rusty Anchor darts pub, ...). The storefront is built into
   the town's block at row 1 / column 3 (08_ven_front.js), with a forecourt marker and a map icon. Walk up (or pull up) and press E: the venue is its
   own interior scene with its own game (pool, darts, a shooting range, whack-a-gopher, mini golf, curling, fishing). Each game is an object in
   Ven.games with init / begin / update / ptrdown / ptrup / key / hud / cleanup, and finishes by calling Ven.finish(). There is a stake to pick in
   the lobby (paid up front, paid out by the game), a counter that sells a souvenir (counts toward the Collection) and a snack. */
const VEN_I = 1, VEN_J = 3;
/* order follows the towns / REG: harbor, desert, farm, tropic, alpine, lake, city */
const VDEF = [
  { key: 'harbor', game: 'darts', name: 'The Rusty Anchor', short: 'Rusty Anchor', sub: 'Dockside pub · darts', ico: '🎯', col: 0xf2b632, stakes: [0, 50, 150, 400],
    desc: 'A salt-stained dock pub with a board on the back wall. First to hit exactly zero from 301 wins the round. The regulars throw hard and drink harder.',
    souv: { name: 'Pub dart flights', price: 180, ico: '🎯' }, snack: { name: 'Fish supper', price: 40 } },
  { key: 'desert', game: 'range', name: 'Dust Devil Range', short: 'Dust Devil', sub: 'Frontier shooting gallery', ico: '🔫', col: 0xe07a3a, stakes: [0, 25, 100, 300],
    desc: 'Tin cans, bottles and a golden skull on rails. Sixty seconds, six shots a magazine, and the old timer watching your grouping. Leave the sheriff cut-outs alone.',
    souv: { name: 'Tin star badge', price: 220, ico: '⭐' }, snack: { name: 'Chilli and cornbread', price: 40 } },
  { key: 'farm', game: 'gopher', name: 'Harvest Fair Barn', short: 'Fair Barn', sub: 'County fair stalls', ico: '🔨', col: 0xd9a03a, stakes: [0, 20, 80, 250],
    desc: 'The county fair never left. Whack the gophers as they pop out of the board, go for the golden one, and keep your mallet away from Farmer Joe.',
    souv: { name: 'Blue ribbon', price: 160, ico: '🎗' }, snack: { name: 'Apple pie slice', price: 30 } },
  { key: 'tropic', game: 'golf', name: 'Coral Putt', short: 'Coral Putt', sub: 'Beachfront mini golf', ico: '⛳', col: 0x2fc4c0, stakes: [0, 40, 120, 350],
    desc: 'Three little holes between the palms: a windmill, a tight dog-leg and a bumper garden. Fewest strokes against par takes the cash.',
    souv: { name: 'Coral golf ball', price: 200, ico: '⛳' }, snack: { name: 'Coconut shake', price: 35 } },
  { key: 'alpine', game: 'curl', name: 'Chalet Curling Club', short: 'Curling Club', sub: 'Ice sheet and fondue', ico: '🥌', col: 0x8ec8ff, stakes: [0, 50, 150, 400],
    desc: 'Slide your stones down the sheet and park them on the button. Sweep to carry a stone further, bump the other side\'s stones out of the house.',
    souv: { name: 'Curling broom', price: 260, ico: '🧹' }, snack: { name: 'Hot chocolate', price: 30 } },
  { key: 'lake', game: 'fish', name: 'Pike & Lure Tackle', short: 'Pike & Lure', sub: 'Tackle shop and jetty', ico: '🎣', col: 0x4fa86a, stakes: [0, 20, 60, 150],
    desc: 'Rent a rod and a jetty spot. Cast, wait for the bobber to dive, set the hook and reel in without snapping the line. The big ones pay properly.',
    souv: { name: 'Lucky lure', price: 190, ico: '🪝' }, snack: { name: 'Smoked trout roll', price: 35 } },
  { key: 'city', game: 'pool', name: 'The Velvet Cue', short: 'Velvet Cue', sub: 'Members\' billiards club', ico: '🎱', col: 0x9a5cff, stakes: [0, 100, 300, 1000],
    desc: 'A velvet-rope billiards club above the financial district. Eight-ball on a full-size table, house rules, one rival at a time. Break, pot your group, sink the eight.',
    souv: { name: 'Club cue chalk', price: 300, ico: '🎱' }, snack: { name: 'Espresso martini', price: 60 } }
];
const VBY = {}; for (const d of VDEF) VBY[d.game] = d; /* club defs (CDEF) live in 08_ven_dance.js and are not part of this lookup */
const Ven = { sites: [], ready: false, on: false, near: null, S: null, D: null, g: null, phase: 'off', stake: 0, games: {}, mgroup: null, ptr: { x: 0.5, y: 0.5, down: false, id: -1, moved: 0 }, fx: { speed: 0, damage: 0, chroma: 0, expo: 1 }, expo: 1, cam: null, hudT: 0, hudH: '', botH: '', msg: '', msgT: 0, scenes: {}, lock: 0, t: 0 };
const venSave = () => save.ven || (save.ven = { rec: {}, souv: {} });
const venRec = (game) => { const v = venSave(); return v.rec[game] || (v.rec[game] = { w: 0, l: 0, best: 0, n: 0, earned: 0 }); };

/* ---------- sites ---------- */
Ven.setup = function () {
  Ven.sites = towns.map((T, ti) => {
    const R = REG[ti % REG.length], D = VDEF[ti % VDEF.length], bs = T.cell - 14, bx0 = T.x0 + VEN_I * T.cell + 7, bz0 = T.z0 + VEN_J * T.cell + 7;
    const lx0 = bx0 + 1.5, lz0 = bz0 + 1.5, ls = bs / 2 - 3;
    return { ti, T, R, D, lx0, lz0, ls, x: lx0 + ls / 2, z: lz0 + 6.5, y: T.baseH, bx: lx0 + 4, bz: lz0 + 13, bw: 24, bd: 15, tex: null, mat: null, mk: null };
  });
  /* the dance club: the neighbouring lot of the same block (08_ven_dance.js) */
  Ven.clubs = Ven.sites.map((P) => {
    const sh = (P.T.cell - 14) / 2, D = CDEF[P.ti % CDEF.length];
    return { ti: P.ti, T: P.T, R: P.R, D, club: true, lx0: P.lx0 + sh, lz0: P.lz0, ls: P.ls, x: P.x + sh, z: P.z, y: P.y, bx: P.bx + sh, bz: P.bz, bw: P.bw, bd: P.bd, tex: null, mat: null, mk: null };
  });
  Ven.all = Ven.sites.concat(Ven.clubs);
  Ven.ready = true;
};
Ven.lot = function (T, i, j, a, b) { return Ven.ready && i === VEN_I && j === VEN_J && a === 0 && b === 0; };
Ven.clubLot = function (T, i, j, a, b) { return Ven.ready && i === VEN_I && j === VEN_J && a === 1 && b === 0; };

/* ---------- forecourt markers ---------- */
Ven.initMarkers = function () {
  if (Ven.mgroup) return; const grp = Ven.mgroup = new THREE.Group(); scene.add(grp);
  for (const S of Ven.all) {
    const col = _hexCss(S.D.col), g = new THREE.Group(); g.position.set(S.x, S.y + 0.2, S.z);
    const beam = makeBeam(col, 1.8, 110); g.add(beam);
    const ring = new THREE.Mesh(new THREE.RingGeometry(4.5, 5.3, 44), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).convertSRGBToLinear().multiplyScalar(2.4), side: THREE.DoubleSide, transparent: true, opacity: 0.9, depthWrite: false, fog: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.2; g.add(ring);
    const spr = iconSprite(S.D.ico, col); spr.position.y = 11; g.add(spr);
    grp.add(g); S.mk = { g, beam, ring, spr };
  }
};
Ven.visual = function (dt, time) {
  if (!Ven.mgroup) return;
  for (const S of Ven.all) {
    const m = S.mk, dist = Math.hypot(S.x - Pl.x, S.z - Pl.z); m.g.visible = dist < 900 && !Mi && !(Fly.on && Fly.agl > 120);
    if (!m.g.visible) continue;
    m.beam.material.opacity = lerp(0.03, 0.75, sstep(12, 260, dist)); const k = clamp(dist / 60, 4, 18);
    m.spr.scale.setScalar(k); m.spr.position.y = 9 + k * 0.5; m.ring.scale.setScalar(1 + Math.sin(time * 3) * 0.04);
  }
};
Ven.tick = function () {
  let best = null;
  if (Ven.ready && App.mode === 'play' && !Fly.on && !Boat.on && !Mi && !VM.m && !Talk.on && !GAR.edit && !Bust.on && !Tow.on && car.wrecked <= 0 && !devOn('free') && Fare.phase !== 'ride') {
    for (const S of Ven.all) { const dx = Pl.x - S.x, dz = Pl.z - S.z; if (dx * dx + dz * dz < 42 && (Foot.on || Math.abs(car.speed) < 7)) { best = S; break; } }
  }
  Ven.near = best;
};
Ven.drawMini = function (g) { if (!Ven.ready) return; for (const S of Ven.all) { g.fillStyle = _hexCss(S.D.col); g.fillRect(S.bx, S.bz, S.bw, S.bd); } };
Ven.drawFull = function (g, k) {
  if (!Ven.ready) return;
  for (const S of Ven.all) {
    const s = FM.toScreen(S.x, S.z), r = 6.5 * k; g.fillStyle = _hexCss(S.D.col); g.strokeStyle = '#06090e'; g.lineWidth = 2.5 * k; g.beginPath(); g.arc(s[0], s[1], r, 0, TAU); g.fill(); g.stroke();
    g.font = Math.round(9 * k) + 'px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText(S.D.ico, s[0], s[1] + 0.5 * k);
  }
};

/* ---------- open / close ---------- */
Ven.open = function () {
  const S = Ven.near; if (!S || Ven.on || App.mode !== 'play') return;
  if (Wanted.stars > 0) { UI.toast('The cops are on you · lose the heat first', 'bad'); return; }
  const G = Ven.games[S.D.game]; if (!G) { UI.toast(S.D.name + ' is still being fitted out · check back soon', 'info'); return; }
  for (const k in Keys) Keys[k] = false; for (const k of ['l', 'r', 'gas', 'brk', 'nit', 'hand']) TouchIn[k] = 0;
  try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) { /* ignore */ }
  Ven.S = S; Ven.D = S.D; Ven.g = G; Ven.on = true; Ven.phase = 'lobby'; Ven.stake = 0; Ven.msg = ''; Ven.ptr.down = false; Ven.t = 0;
  if (!G.ready) { G.init(Ven); G.ready = true; }
  G.enter(Ven);
  UI.setMode('venue'); E.ven.style.setProperty('--sa', _hexCss(S.D.col)); E.venTitle.textContent = S.D.name; E.venSub.textContent = S.D.sub;
  Ven.lobby(); Snd.beep(620, 0.06);
};
Ven.close = function () {
  if (!Ven.on) return; const G = Ven.g; try { if (G && G.cleanup) G.cleanup(Ven); } catch (e) { console.error(e); }
  Ven.clean(); Ven.on = false; Ven.phase = 'off'; Ven.g = null; writeSave(); UI.setMode('play'); Snd.beep(420, 0.05);
};
Ven.say = function (msg, sec) { Ven.msg = msg; Ven.msgT = sec || 2.4; };

/* ---------- lobby / results ---------- */
Ven.clean = function () { if (Ven.pw) Ven.pw.show(false); for (const k in Ven.tools) Ven.tools[k].hidden = true; };
Ven.lobby = function (note) {
  Ven.clean(); const D = Ven.D, G = Ven.g, rec = venRec(D.game), has = !!venSave().souv[D.game];
  Ven.phase = 'lobby'; E.venPow.hidden = true; if (G.lobby) G.lobby(Ven);
  const stakes = D.stakes.map((s, i) => '<button type="button" class="vstk' + (s === Ven.stake ? ' on' : '') + (s > save.money ? ' no' : '') + '" data-act="stake" data-s="' + s + '"' + (s > save.money ? ' disabled' : '') + '>' + (D.stakeNames ? esc(D.stakeNames[i]) + ' · ' + money(s) : s ? money(s) : 'Casual') + '</button>').join('');
  let h = '<div class="vmh"><b>' + esc(D.name) + '</b><small>' + esc(D.sub) + '</small></div><p>' + esc(D.desc) + '</p>';
  if (G.rules) h += '<div class="vrules">' + G.rules + '</div>';
  const rt = G.recText ? G.recText(rec) : null; h += '<div class="vrec"><div>' + (D.ticket ? '<small>Shows seen</small><b>' + (rec.shows || 0) + '</b>' : '<small>Record</small><b>' + rec.w + 'W · ' + rec.l + 'L</b>') + '</div>' + (rt ? '<div><small>' + rt[0] + '</small><b>' + rt[1] + '</b></div>' : '') + '<div>' + (D.ticket ? '<small>Spent here</small><b>' + money(rec.spent || 0) + '</b>' : '<small>Won so far</small><b>' + money(rec.earned) + '</b>') + '</div></div>';
  h += '<div class="vsl"><span>' + esc(G.stakeLabel || 'Stake') + '</span><div>' + stakes + '</div></div>';
  if (note) h += '<div class="vnote">' + note + '</div>';
  h += '<div class="vcnt"><button type="button" class="btn sm" data-act="snack"' + (save.money < D.snack.price ? ' disabled' : '') + '>' + esc(D.snack.name) + ' · ' + money(D.snack.price) + ' <small>(+25 car health, full nitro)</small></button>' +
    (D.souv ? '<button type="button" class="btn sm" data-act="souv"' + (has || save.money < D.souv.price ? ' disabled' : '') + '>' + D.souv.ico + ' ' + esc(D.souv.name) + ' · ' + (has ? 'Owned' : money(D.souv.price)) + '</button>' : '') + '</div>';
  h += '<div class="vfoot"><button type="button" class="btn primary" data-act="play">Play</button><button type="button" class="btn" data-act="leave">Leave</button></div>';
  E.venModal.innerHTML = h; E.venModal.hidden = false;
};
Ven.result = function (win, title, lines, payout) {
  Ven.clean(); const D = Ven.D, rec = venRec(D.game); Ven.phase = 'result'; E.venPow.hidden = true;
  if (D.ticket) { rec.n++; rec.shows = (rec.shows || 0) + 1; } else { if (win) rec.w++; else rec.l++; rec.n++; if (win && typeof Col !== 'undefined' && Col.onWin) Col.onWin(D, Ven.stake); }
  const spent = Ven.spent != null ? Ven.spent : Ven.stake;
  if (payout > 0) { save.money += payout; rec.earned += Math.max(0, payout - Ven.stake); }
  writeSave(); win ? Snd.win() : Snd.fail();
  let h = '<div class="vmh"><b class="' + (win ? 'vw' : 'vl') + '">' + esc(title) + '</b><small>' + esc(D.name) + '</small></div><ul class="vres">' + lines.map((l) => '<li>' + l + '</li>').join('') + '</ul>';
  h += '<div class="vpay">' + (payout > 0 ? '<b>+' + money(payout) + '</b>' : '<b class="vl">' + (spent ? '-' + money(spent) : 'No payout') + '</b>') + '<span>' + money(save.money) + ' in your wallet</span></div>';
  h += '<div class="vfoot"><button type="button" class="btn primary" data-act="again">Play again</button><button type="button" class="btn" data-act="lobby">Lobby</button><button type="button" class="btn" data-act="leave">Leave</button></div>';
  E.venModal.innerHTML = h; E.venModal.hidden = false; E.venCash.textContent = money(save.money);
};
Ven.start = function () {
  const G = Ven.g, D = Ven.D;
  if (D.ticket && (Ven.stake < D.ticket.min || Ven.stake > save.money)) { Ven.stake = D.stakes[0]; Ven.lobby('No ticket, no show · ' + money(D.ticket.min) + ' gets you in' + (save.money < D.ticket.min ? ' and you only have ' + money(save.money) : '') + '.'); return; }
  Ven.spent = null; if (Ven.stake > save.money) { Ven.stake = 0; }
  save.money -= Ven.stake; writeSave(); E.venCash.textContent = money(save.money); E.venModal.hidden = true; Ven.phase = 'play'; Ven.hudH = ''; Ven.botH = ''; Ven.msg = '';
  G.begin(Ven, Ven.stake); Snd.beep(700, 0.06);
};
Ven.finish = function (win, title, lines, payout) { if (Ven.phase !== 'play') return; Ven.result(win, title, lines, Math.max(0, Math.round(payout || 0))); };
Ven.act = function (d) {
  switch (d.act) {
    case 'stake': Ven.stake = +d.s; Snd.beep(520, 0.04); Ven.lobby(); break;
    case 'play': case 'again': if (d.act === 'again' && Ven.g && Ven.g.cleanup) Ven.g.cleanup(Ven); Ven.start(); break;
    case 'lobby': Ven.g.enter(Ven); Ven.lobby(); break;
    case 'leave': if (Ven.phase === 'play') Ven.forfeit(); else Ven.close(); break;
    case 'snack': { const p = Ven.D.snack.price; if (save.money < p) break; save.money -= p; car.health = Math.min(100, car.health + 25); car.nitro = tune.nitroMax; E.venCash.textContent = money(save.money); Snd.beep(560, 0.06); Ven.lobby('Mmm. ' + esc(Ven.D.snack.name) + '. Your car feels better already.'); break; }
    case 'souv': { const o = Ven.D.souv; if (!o) break; if (venSave().souv[Ven.D.game] || save.money < o.price) break; save.money -= o.price; venSave().souv[Ven.D.game] = 1; writeSave(); E.venCash.textContent = money(save.money); Snd.win(); if (typeof Col !== 'undefined' && Col.onSouvenir) Col.onSouvenir(Ven.D); Ven.lobby('Bought: ' + esc(o.name) + '. It is in your Collection.'); break; }
    default: if (Ven.g && Ven.g.act) Ven.g.act(Ven, d);
  }
};
Ven.key = function (code) {
  if (code === 'Escape' || code === 'KeyP') {
    if (Ven.phase === 'play') { Ven.forfeit(); return; }
    Ven.close(); return;
  }
  if (Ven.D && Ven.D.ticket && Ven.phase !== 'play') return;   /* buying a ticket is always a click, never a stray key press */
  if (Ven.phase === 'lobby' && (code === 'Enter' || code === 'Space')) { Ven.start(); return; }
  if (Ven.phase === 'result' && (code === 'Enter')) { Ven.start(); return; }
  if (Ven.phase === 'play' && Ven.g.key) Ven.g.key(Ven, code, true);
};
Ven.forfeit = function () {
  if (Ven.phase !== 'play') return; const G = Ven.g; if (G.cleanup) G.cleanup(Ven); Ven.phase = 'lobby'; G.enter(Ven); Ven.lobby(Ven.D.ticket ? 'You left the show early · tickets are not refundable.' : 'You walked out mid-game' + (Ven.stake ? ' and left your ' + money(Ven.stake) + ' stake behind.' : '.'));
};

/* ---------- frame ---------- */
Ven.frame = function (dt) {
  App.time += dt; Ven.t += dt; if (Snd.ok) Snd.update(car, dt, true);
  const G = Ven.g; if (!G) return;
  if (Ven.phase === 'play' && G.update) G.update(Ven, dt); else if (G.idle) G.idle(Ven, dt);
  if (Ven.msgT > 0) Ven.msgT -= dt;
  Ven.hudT -= dt; if (Ven.hudT <= 0) { Ven.hudT = 0.08; Ven.paint(); }
  const cam = G.cam, W = innerWidth, H = innerHeight; cam.aspect = W / H; cam.updateProjectionMatrix();
  const s0 = scene, c0 = camera, e0 = env.exposure; scene = G.sc; camera = cam; env.exposure = G.expo || Ven.expo;
  try { renderFrame(Ven.fx, App.time); } finally { env.exposure = e0; scene = s0; camera = c0; }
};
Ven.paint = function () {
  const G = Ven.g; if (!G) return;
  let h = '', b = '';
  if (Ven.phase === 'play') { h = G.hud ? G.hud(Ven) : ''; b = Ven.msgT > 0 ? '<b>' + Ven.msg + '</b>' : (G.hint ? G.hint(Ven) : ''); }
  else if (Ven.phase === 'lobby') b = G.lobbyHint || '';
  if (h !== Ven.hudH) { Ven.hudH = h; E.venHud.innerHTML = h; E.venHud.hidden = !h; }
  if (b !== Ven.botH) { Ven.botH = b; E.venBot.innerHTML = b; E.venBot.hidden = !b; }
  E.venCash.textContent = money(save.money);
};
/* power meter helper: value 0..1, label */
Ven.power = function (v, label) { if (v == null) { E.venPow.hidden = true; return; } E.venPow.hidden = false; E.venPowI.style.width = (clamp(v, 0, 1) * 100).toFixed(0) + '%'; E.venPowL.textContent = label || ''; };

/* ---------- pointer ---------- */
Ven.ray = (function () { const rc = new THREE.Raycaster(), v = new THREE.Vector2(); return function (cam) { v.set(Ven.ptr.x * 2 - 1, -(Ven.ptr.y * 2 - 1)); rc.setFromCamera(v, cam); return rc; }; })();
Ven.initUI = function () {
  E.ven.addEventListener('click', (e) => { const b = e.target.closest ? e.target.closest('[data-act]') : null; if (!b || b.disabled || !E.ven.contains(b)) return; Ven.act(b.dataset); });
  const gl = E.gl, P = Ven.ptr, upd = (e) => { const r = gl.getBoundingClientRect(); P.x = clamp((e.clientX - r.left) / r.width, 0, 1); P.y = clamp((e.clientY - r.top) / r.height, 0, 1); };
  gl.addEventListener('pointerdown', (e) => {
    if (App.mode !== 'venue' || Ven.phase !== 'play' || P.down) return; upd(e); P.down = true; P.id = e.pointerId; P.btn = e.button; P.moved = 0; P.type = e.pointerType; P.mvn = (P.mvn || 0) + 1; try { gl.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ }
    const G = Ven.g; if (G && G.ptrdown) G.ptrdown(Ven, e);
  });
  gl.addEventListener('pointermove', (e) => { if (App.mode !== 'venue') return; upd(e); P.type = e.pointerType; P.mvn = (P.mvn || 0) + 1; if (P.down && e.pointerId === P.id) P.moved++; });
  const up = (e) => { if (App.mode !== 'venue' || !P.down || e.pointerId !== P.id) return; upd(e); P.down = false; const G = Ven.g; if (G && Ven.phase === 'play' && G.ptrup) G.ptrup(Ven, e); };
  gl.addEventListener('pointerup', up); gl.addEventListener('pointercancel', (e) => { if (P.down && e.pointerId === P.id) { P.down = false; const G = Ven.g; if (G && G.ptrcancel) G.ptrcancel(Ven); } });
  gl.addEventListener('wheel', (e) => { if (App.mode !== 'venue') return; const G = Ven.g; if (G && G.wheel) { e.preventDefault(); G.wheel(Ven, e.deltaY); } }, { passive: false });
  window.addEventListener('keyup', (e) => { if (App.mode === 'venue' && Ven.phase === 'play' && Ven.g && Ven.g.key) Ven.g.key(Ven, e.code, false); });
};

/* ---------- small helpers the games share ---------- */
function venMat(col, rough, metal, em) { const m = new THREE.MeshStandardMaterial({ color: lc(col), roughness: rough == null ? 0.7 : rough, metalness: metal || 0 }); if (em != null) { m.emissive = lc(em); m.emissiveIntensity = 1; } return m; }
function venBox(parent, w, h, d, x, y, z, mat) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); parent.add(m); return m; }
function venCyl(parent, rt, rb, h, x, y, z, mat, seg) { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 20), mat); m.position.set(x, y, z); parent.add(m); return m; }
function venBlob(parent, r, x, z, y, op) { const cv = mkCanvas(64, 64), g = cv.getContext('2d'), gr = g.createRadialGradient(32, 32, 2, 32, 32, 31); gr.addColorStop(0, 'rgba(0,0,0,' + (op == null ? 0.6 : op) + ')'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.set(x, y == null ? 0.003 : y, z); parent.add(m); return m; }
function venText(txt, w, h, col, bg, font) { const cv = mkCanvas(Math.round(w * 2), Math.round(h * 2)), g = cv.getContext('2d'); if (bg) { g.fillStyle = bg; g.fillRect(0, 0, cv.width, cv.height); } g.fillStyle = col || '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = font || ('700 ' + Math.round(h * 1.1) + 'px "Chakra Petch", Rajdhani, "Arial Black", sans-serif'); g.fillText(txt, cv.width / 2, cv.height / 2 + 2); const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; return t; }
/* a lit room shell: floor, walls, ceiling, with neon strips; returns the scene */
function venRoom(o) {
  const sc = new THREE.Scene(); sc.background = lc(o.bg != null ? o.bg : 0x07090d);
  if (o.fog) sc.fog = new THREE.Fog(lc(o.bg != null ? o.bg : 0x07090d), o.fog[0], o.fog[1]);
  sc.add(new THREE.HemisphereLight(lc(o.sky || 0xcfd8ff), lc(o.gnd || 0x1a1410), o.hemi == null ? 0.55 : o.hemi));
  const W = o.w || 12, D = o.d || 14, H = o.h || 3.6;
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(W, D), venMat(o.floor || 0x2a2018, 0.8, 0.05)); fl.rotation.x = -Math.PI / 2; sc.add(fl);
  if (o.walls !== false) {
    const wm = venMat(o.wall || 0x3a2a24, 0.9, 0);
    venBox(sc, W, H, 0.2, 0, H / 2, -D / 2, wm); venBox(sc, W, H, 0.2, 0, H / 2, D / 2, wm); venBox(sc, 0.2, H, D, -W / 2, H / 2, 0, wm); venBox(sc, 0.2, H, D, W / 2, H / 2, 0, wm);
  }
  if (o.ceil !== false) venBox(sc, W, 0.15, D, 0, H, 0, venMat(o.ceilc || 0x14110f, 0.9, 0));
  return sc;
}
