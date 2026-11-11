/* ================= DANCE CLUBS: a nightclub in every town (storefronts + the club's own music) =================
   Every town has a dance club next door to its pub / stall (block 1,3, lot a=1). It is a venue like the others: walk up and press E, pick a bet in the
   lobby, then match the arrows to the beat on the lit dance floor (the game itself is in 08_ven_dance_game.js). The seven clubs share one interior but
   each has its own name, colours, tempo and musical style. */
const CDEF = [
  { key: 'harbor', club: true, game: 'dance', cid: 0, name: 'The Salty Siren', short: 'Salty Siren', sub: 'Dockside dance club', ico: '💃', col: 0x2fd0ff, col2: 0xffb347, wall: 0x14263a, stakes: [0, 50, 150, 400],
    bpm: 116, root: 45, style: 'disco', pal: [0x2fd0ff, 0xffffff, 0x1aa0d8, 0xffb347],
    desc: 'Port Marlow\'s sailors come here to forget the tide tables. Sticky floor, glitter ball, and a DJ who only plays records older than the pier.', snack: { name: 'Dockside rum punch', price: 40 } },
  { key: 'desert', club: true, game: 'dance', cid: 1, name: 'Mirage Nights', short: 'Mirage Nights', sub: 'Desert dance tent', ico: '💃', col: 0xff7a3a, col2: 0xd23cff, wall: 0x3a1c14, stakes: [0, 50, 150, 400],
    bpm: 122, root: 40, style: 'latin', pal: [0xff7a3a, 0xd23cff, 0xffd23d, 0xff3a6a],
    desc: 'Redstone\'s miners dance until the sun comes up over the canyon. Hot lights, hotter percussion, and a floor that never quite stops moving.', snack: { name: 'Cactus lime cooler', price: 35 } },
  { key: 'farm', club: true, game: 'dance', cid: 2, name: 'Barn Burner Disco', short: 'Barn Burner', sub: 'Hoedown disco', ico: '💃', col: 0xffb347, col2: 0xe2342c, wall: 0x3a1410, stakes: [0, 40, 120, 350],
    bpm: 108, root: 43, style: 'hoedown', pal: [0xffb347, 0xe2342c, 0xf2e070, 0x3aa84a],
    desc: 'The hay loft got a mirror ball and the whole county turned up. Stomp, spin and keep your boots on the beat.', snack: { name: 'Cold cider', price: 30 } },
  { key: 'tropic', club: true, game: 'dance', cid: 3, name: 'Flamingo Beach Club', short: 'Flamingo Beach', sub: 'Beachfront dance floor', ico: '💃', col: 0xff5fa8, col2: 0x2fe0e0, wall: 0x14424c, stakes: [0, 60, 180, 500],
    bpm: 124, root: 47, style: 'island', pal: [0xff5fa8, 0x2fe0e0, 0xffe14a, 0xb6ff4a],
    desc: 'Sand underfoot, steel drums overhead, and a dance floor that glows all the way out to the surf. Cape Harlow\'s party never ends.', snack: { name: 'Coconut mojito', price: 45 } },
  { key: 'alpine', club: true, game: 'dance', cid: 4, name: 'Apres-Ski Disco', short: 'Apres-Ski', sub: 'Chalet nightclub', ico: '💃', col: 0x9fd8ff, col2: 0xb48cff, wall: 0x242c3e, stakes: [0, 50, 150, 400],
    bpm: 120, root: 38, style: 'disco', pal: [0x9fd8ff, 0xffffff, 0xb48cff, 0x5aa8ff],
    desc: 'Take off the ski boots and put on the dancing shoes. Summit Ridge\'s warmest room, with a floor that is actually heated.', snack: { name: 'Spiced hot cocoa', price: 30 } },
  { key: 'lake', club: true, game: 'dance', cid: 5, name: 'Neon Heron', short: 'Neon Heron', sub: 'Lakeshore dance bar', ico: '💃', col: 0x40e0a0, col2: 0xff4fd8, wall: 0x14281f, stakes: [0, 40, 120, 350],
    bpm: 112, root: 41, style: 'synth', pal: [0x40e0a0, 0xff4fd8, 0x35c0ff, 0xb6ff4a],
    desc: 'A converted boathouse with a heron in neon over the bar. Lakeshore\'s synth-pop night owls meet here.', snack: { name: 'Pine-needle tonic', price: 35 } },
  /* the one club with a cover charge: a ticketed stage show (08_ven_show.js) instead of the open dance floor */
  { key: 'city', club: true, game: 'show', ticket: { min: 100 }, cid: 6, name: 'Club Zenith', short: 'Zenith', sub: 'Rooftop showroom · live show', ico: '🎭', col: 0xb06bff, col2: 0x2fd8ff, wall: 0x16121f, stakes: [100, 250, 600], stakeNames: ['Standing', 'Front row', 'VIP booth'], h: 13,
    bpm: 124, root: 36, style: 'techno', pal: [0xb06bff, 0x2fd8ff, 0xff4fa8, 0xffd23d],
    desc: 'Fairhaven\'s rooftop showroom: velvet curtains, a lighting rig that costs more than your car, and a different headline dancer every time you visit. The curtain stays shut until you buy a ticket at the door.', snack: { name: 'Sparkling water, obviously', price: 60 } }
];

/* ---------- storefront ---------- */
Ven.buildClub = function (ch, S, gbB, gbP) {
  const D = S.D, g0 = S.T.baseH, X0 = S.bx, X1 = S.bx + S.bw, Z0 = S.bz, Z1 = S.bz + S.bd, XM = (X0 + X1) / 2;
  const acc = lc(D.col), alt = lc(D.col2), dark = lc(0x0b0a10), wall = lc(D.wall), skin = lc(0xc89870), brass = lc(0xd8a838), rope = lc(0x7a0f24);
  const B = (a, b, c, d, e, f, col, k) => { k = k == null ? 1 : k; gbP.box(a, b, c, d, e, f, col.r * k, col.g * k, col.b * k); };
  const H = D.h || 8.5, fx0 = S.lx0 + 0.6, fx1 = S.lx0 + S.ls - 0.6, fz0 = S.lz0 + 0.6;
  const pole = (x, z, h, col, rr) => { cylAt(gbP, x, g0, z, rr || 0.12, h, rr || 0.12, col.r, col.g, col.b); colCyl(ch, x, z, (rr || 0.12) + 0.08, g0, g0 + h); };
  /* forecourt: dark apron with a lit dance-floor checker in front of the door */
  B(fx0, g0 - 0.2, fz0, fx1, g0 + 0.05, Z0, lc(0x1a1c24));
  B(fx0, g0 + 0.05, fz0, fx1, g0 + 0.075, fz0 + 0.4, acc, 1.2);
  for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) { const x = XM - 6 + i * 2, z = Z0 - 4.4 + j * 2; B(x, g0 + 0.05, z, x + 1.9, g0 + 0.085, z + 1.9, (i + j) & 1 ? acc : alt, 1.2 + ((i * 7 + j * 3) % 3) * 0.3); }
  /* body, plinth, roof */
  B(X0 - 0.2, g0 - 0.3, Z0 - 0.2, X1 + 0.2, g0 + 0.5, Z1 + 0.2, lc(0x25272e));
  B(X0, g0 - 0.3, Z0, X1, g0 + H, Z1, wall);
  B(X0 - 0.3, g0 + H, Z0 - 0.3, X1 + 0.3, g0 + H + 0.45, Z1 + 0.3, dark);
  colBox(ch, X0 - 0.3, Z0 - 0.3, X1 + 0.3, Z1 + 0.3, g0 - 0.3, g0 + H + 0.45);
  /* door with a lit surround and a canopy */
  const DW = 4.2, dx0 = XM - DW / 2, dx1 = XM + DW / 2;
  B(dx0 - 0.4, g0, Z0 - 0.15, dx1 + 0.4, g0 + 4.2, Z0 - 0.02, acc, 1.7);
  B(dx0, g0, Z0 - 0.3, dx1, g0 + 3.8, Z0 - 0.15, dark); B(XM - 0.05, g0, Z0 - 0.34, XM + 0.05, g0 + 3.8, Z0 - 0.3, acc, 2.3);
  B(dx0 - 1.3, g0 + 4.2, Z0 - 3.3, dx1 + 1.3, g0 + 4.5, Z0 - 0.02, dark); B(dx0 - 1.3, g0 + 4.5, Z0 - 3.3, dx1 + 1.3, g0 + 4.58, Z0 - 3.2, acc, 2.4);
  colBox(ch, dx0 - 1.3, Z0 - 3.3, dx1 + 1.3, Z0 - 0.02, g0 + 4.2, g0 + 4.58);
  pole(dx0 - 1.1, Z0 - 3.0, 4.2, dark, 0.14); pole(dx1 + 1.1, Z0 - 3.0, 4.2, dark, 0.14);
  /* vertical neon strips and the sign band */
  for (const [x, c] of [[X0 + 1.0, acc], [X0 + 2.4, alt], [X1 - 2.65, alt], [X1 - 1.25, acc]]) B(x, g0 + 0.8, Z0 - 0.2, x + 0.25, g0 + H - 3.5, Z0 - 0.04, c, 2.4);
  B(X0 + 0.5, g0 + H - 3.2, Z0 - 0.3, X1 - 0.5, g0 + H - 0.1, Z0 - 0.04, dark);
  B(X0 + 0.5, g0 + H - 3.28, Z0 - 0.32, X1 - 0.5, g0 + H - 3.2, Z0 - 0.28, acc, 2.4); B(X0 + 0.5, g0 + H - 0.1, Z0 - 0.32, X1 - 0.5, g0 + H - 0.02, Z0 - 0.28, acc, 2.4);
  /* velvet rope lines, brass posts, a bouncer */
  for (const sx of [dx0 - 1.9, dx1 + 1.9]) for (let k = 0; k < 4; k++) { const z = Z0 - 5.6 + k * 1.7; cylAt(gbP, sx, g0, z, 0.09, 1.0, 0.09, brass.r, brass.g, brass.b); cylAt(gbP, sx, g0 + 1.0, z, 0.15, 0.1, 0.15, brass.r, brass.g, brass.b); if (k) B(sx - 0.03, g0 + 0.78, z - 1.7, sx + 0.03, g0 + 0.86, z, rope); }
  B(dx1 + 0.5, g0, Z0 - 1.2, dx1 + 1.1, g0 + 1.15, Z0 - 0.7, dark); B(dx1 + 0.55, g0 + 1.15, Z0 - 1.15, dx1 + 1.05, g0 + 1.5, Z0 - 0.75, skin); B(dx1 + 0.55, g0 + 1.32, Z0 - 1.2, dx1 + 1.05, g0 + 1.4, Z0 - 1.1, dark);
  /* roof: speaker stacks and a light rig */
  for (const sx of [X0 + 2.4, X1 - 2.4]) { B(sx - 1, g0 + H + 0.45, Z0 + 1.2, sx + 1, g0 + H + 2.2, Z0 + 3.0, dark); B(sx - 0.8, g0 + H + 0.6, Z0 + 1.15, sx + 0.8, g0 + H + 1.0, Z0 + 1.2, alt, 1.6); B(sx - 0.8, g0 + H + 1.4, Z0 + 1.15, sx + 0.8, g0 + H + 2.0, Z0 + 1.2, acc, 1.6); }
  B(XM - 4, g0 + H + 0.45, Z0 + 2.0, XM - 3.8, g0 + H + 3.4, Z0 + 2.2, dark); B(XM + 3.8, g0 + H + 0.45, Z0 + 2.0, XM + 4, g0 + H + 3.4, Z0 + 2.2, dark); B(XM - 4, g0 + H + 3.4, Z0 + 2.0, XM + 4, g0 + H + 3.6, Z0 + 2.2, acc, 2.2);
  for (let k = 0; k < 5; k++) B(XM - 3.4 + k * 1.7, g0 + H + 3.0, Z0 + 1.95, XM - 3.0 + k * 1.7, g0 + H + 3.4, Z0 + 2.25, k & 1 ? alt : acc, 2.2);
  /* the cover-charge club: a ticket booth by the rope line and a banner on the wall */
  if (D.ticket) {
    const bx0 = XM + 7.2, bx1 = XM + 9.4, bz0 = Z0 - 3.6, bz1 = Z0 - 1.9;
    B(bx0, g0, bz0, bx1, g0 + 2.7, bz1, dark); B(bx0 - 0.2, g0 + 2.7, bz0 - 0.2, bx1 + 0.2, g0 + 2.95, bz1 + 0.2, acc, 1.2); B(bx0 + 0.25, g0 + 1.2, bz0 - 0.04, bx1 - 0.25, g0 + 2.2, bz0 + 0.01, acc, 2.0); B(bx0 + 0.2, g0 + 1.1, bz0 - 0.2, bx1 - 0.2, g0 + 1.22, bz0 - 0.02, alt, 1.4);
    colBox(ch, bx0 - 0.2, bz0 - 0.2, bx1 + 0.2, bz1 + 0.2, g0, g0 + 2.95);
    if (!S.banMat) { S.banMat = new THREE.MeshBasicMaterial({ map: venText('LIVE SHOW · TICKETS', 1000, 260, '#fff', '#190f2a', '700 118px "Chakra Petch", Rajdhani, "Arial Black", sans-serif'), color: new THREE.Color(1.25, 1.25, 1.25) }); }
    const bn = new THREE.Mesh(new THREE.PlaneGeometry(6.0, 1.56), S.banMat); bn.position.set(XM - 7.7 - ch.x0, g0 + 3.5, Z0 - 0.36 - ch.z0); bn.rotation.y = Math.PI; ch.group.add(bn);
  }
  /* sign */
  if (!S.tex) { S.tex = venSignTex(S); S.mat = new THREE.MeshBasicMaterial({ map: S.tex, color: new THREE.Color(1.3, 1.3, 1.3) }); }
  const sg = new THREE.Mesh(new THREE.PlaneGeometry(S.bw - 1.4, (S.bw - 1.4) * 160 / 1024), S.mat); sg.position.set(XM - ch.x0, g0 + H - 1.65, Z0 - 0.34 - ch.z0); sg.rotation.y = Math.PI; ch.group.add(sg);
};

/* ---------- the club's music: a small step sequencer, one groove per style ---------- */
const CMS = {
  disco:   { k: '1000100010001000', s: '0000100000001000', h: '1010101010101010', o: '0010001000100010', b: [0, -1, 12, -1, 0, -1, 12, -1, 0, -1, 12, -1, 0, 12, 0, -1], c: '1000001000100000', bw: 'sawtooth', cw: 'triangle', lead: 'triangle', prog: [[0, 3, 7], [5, 8, 12], [3, 7, 10], [7, 10, 14]] },
  latin:   { k: '1000001000100000', s: '0000100000001000', h: '1010101010101010', r: '1001001000101000', b: [0, -1, -1, 7, -1, -1, 0, -1, -1, -1, 5, -1, 7, -1, -1, -1], c: '1001001000100100', bw: 'sawtooth', cw: 'square', lead: 'triangle', prog: [[0, 3, 7], [3, 7, 10], [5, 8, 12], [7, 10, 14]] },
  hoedown: { k: '1000000010000000', s: '0000100000001000', h: '0010001000100010', b: [0, -1, -1, -1, 7, -1, -1, -1, 0, -1, -1, -1, 7, -1, -1, -1], c: '0010001000100010', bw: 'triangle', cw: 'square', lead: 'square', prog: [[0, 4, 7], [5, 9, 12], [0, 4, 7], [7, 11, 14]] },
  island:  { k: '1000100010001000', s: '0000100000001000', h: '0010001000100010', o: '1000100010001000', b: [0, -1, 7, -1, 0, -1, 7, 5, 0, -1, 7, -1, 0, 5, 7, -1], c: '0010010000100100', bw: 'triangle', cw: 'triangle', lead: 'triangle', prog: [[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]] },
  synth:   { k: '1000100010001000', s: '0000100000001000', h: '0010001000100010', b: [0, 0, -1, 0, -1, 0, 7, -1, 0, 0, -1, 0, -1, 0, 10, -1], c: '1000000010000000', bw: 'sawtooth', cw: 'sawtooth', lead: 'square', prog: [[0, 3, 7], [8, 12, 15], [5, 8, 12], [10, 14, 17]] },
  techno:  { k: '1000100010001000', s: '0000100000001000', h: '0010001000100010', o: '0010001000100010', b: [-1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0, 12, 0], c: '0000000100000000', bw: 'sawtooth', cw: 'square', lead: 'sawtooth', prog: [[0, 3, 7], [0, 3, 7], [8, 12, 15], [7, 10, 14]] }
};
const CLUB_BARS = 22;   /* count-in bar + warm-up + 18 bars of notes + two outro bars */
const Music = { mode: 'off', bus: null, timer: 0, A0: 0, next: 0, s: 0, D: null, M: null, end: 0, bars: CLUB_BARS, secFn: null };
Music.ok = () => !!(Snd.ok && Snd.ctx);
Music.kick = function (t) { const ctx = Snd.ctx, o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(155, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.14); g.gain.setValueAtTime(0.95, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24); o.connect(g); g.connect(Music.bus); o.start(t); o.stop(t + 0.27); };
Music.step = function (s, t) {
  const M = Music.M, D = Music.D, bar = s >> 4, k = s & 15, song = Music.mode === 'song', bus = Music.bus, on = (str) => str && str[k] === '1';
  /* sections: 0 count-in, 1 warm-up, 2 breakdown, 3 full groove; the idle loop is always the full groove without the lead */
  const sec = song ? (Music.secFn ? Music.secFn(bar) : bar === 0 ? 0 : bar === 1 ? 1 : (bar === 12 || bar === 13) ? 2 : 3) : 3;
  if (sec !== 2 && on(M.k)) Music.kick(t);
  if (sec >= 1 && on(M.s)) { Snd.noiseHit(t, 0.13, 0.4, 1800, 0, bus); Snd.tone(t, 195, 0.09, 'triangle', 0.22, 2200, 0.002, bus); }
  if (sec !== 2 && on(M.h)) Snd.noiseHit(t, 0.035, 0.1, 7500, 0, bus);
  if (sec >= 1 && on(M.o)) Snd.noiseHit(t, 0.12, 0.09, 6000, 0, bus);
  if (sec >= 1 && on(M.r)) Snd.tone(t, 1500, 0.05, 'square', 0.05, 3200, 0.001, bus);
  const root = D.root, ch = M.prog[bar & 3];
  if (sec >= 1 && sec !== 2 && M.b[k] >= 0) Snd.tone(t, mtof(root + M.b[k]), 0.2, M.bw, 0.3, 480, 0.004, bus);
  if (sec >= 1 && on(M.c)) for (const n of ch) Snd.tone(t, mtof(root + 24 + n), 0.22, M.cw, sec === 2 ? 0.05 : 0.03, 1500, 0.01, bus);
  if (sec === 2 && k === 0) for (const n of ch) Snd.tone(t, mtof(root + 24 + n), 1.6, 'triangle', 0.035, 1200, 0.4, bus);
  if (M.lead && ((song && sec === 3 && bar >= 4) || (!song && ((bar >> 2) & 1))) && k % 2 === 0) Snd.tone(t, mtof(root + 36 + ch[(k >> 1) % 3] + (k === 14 ? 12 : 0)), 0.16, M.lead, 0.05, 2600, 0.004, bus);
};
Music.stop = function () {
  if (Music.timer) { clearInterval(Music.timer); Music.timer = 0; }
  if (Music.bus && Snd.ctx) { const b = Music.bus; try { b.gain.cancelScheduledValues(Snd.ctx.currentTime); b.gain.setTargetAtTime(0, Snd.ctx.currentTime, 0.06); } catch (e) { /* ignore */ } }
  Music.mode = 'off';
};
/* mode 'idle' loops the groove softly in the lobby; 'song' starts at A0 with the count-in and ends after CLUB_BARS bars */
Music.start = function (D, mode, bars, secFn) {
  Music.stop(); Snd.hush = true; Music.bars = bars || CLUB_BARS; Music.secFn = secFn || null; Music.D = D; Music.M = CMS[D.style] || CMS.disco; Music.mode = mode;
  if (!Music.ok()) return false;
  const ctx = Snd.ctx; if (ctx.state === 'suspended') { try { ctx.resume(); } catch (e) { /* ignore */ } }
  if (!Music.bus) { Music.bus = ctx.createGain(); Music.bus.connect(Snd.sfx); }
  Music.bus.gain.cancelScheduledValues(ctx.currentTime); Music.bus.gain.setValueAtTime(mode === 'song' ? 0.85 : 0.4, ctx.currentTime);
  const sd = 60 / D.bpm / 4; Music.s = 0; Music.A0 = ctx.currentTime + (mode === 'song' ? 0.3 : 0.1); Music.next = Music.A0; Music.end = Music.bars * 16;
  Music.timer = setInterval(() => {
    if (!Snd.ctx || Music.mode === 'off') return;
    while (Music.next < Snd.ctx.currentTime + 0.14) {
      if (Music.mode === 'song' && Music.s >= Music.end) { Music.stop(); return; }
      Music.step(Music.s, Music.next); Music.s++; Music.next += sd;
    }
  }, 30);
  return true;
};
Music.release = function () { Music.stop(); Snd.hush = false; };
