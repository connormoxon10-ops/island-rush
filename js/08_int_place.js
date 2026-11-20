/* ================= INTERIORS: the airport terminal, the marina boathouse, the venues and clubs =================
   These buildings are not town lots, so their doors are listed here (Bld.fixed) and found by the same door check. The airport terminal has
   check-in desks, a departures board, a café, security and a door through to the planes; the marina's boathouse a chandlery, a workshop and
   the harbour master. Every venue (the pool hall, the darts pub, the range, ...) and every dance club now opens into a walkable bar or club
   with its regulars; walk up to the table, the oche, the lanes or the dance floor and press E to play (the game itself is unchanged). */
Bld.fixed = null;
Bld.prepFixed = function () {
  if (Bld.fixed) return Bld.fixed; const L = [];
  if (Air.s) {   /* the terminal: landside doors face the car park (+z) */
    const A = Air.s, T = AIR.TERM, x0 = A.cx + T[0], x1 = A.cx + T[1], z0 = A.cz + T[2], z1 = A.cz + T[3], xm = A.cx - 50;
    L.push({ key: 'air:term', kind: 'terminal', name: Air.name || 'Airfield', sub: 'Airport terminal', seed: 4242, ti: 6, reg: 'city', x0, z0, x1, z1, y: A.H0, h: AIR.TH, cat: 'fixed', W: Math.min(40, x1 - x0), D: Math.min(26, z1 - z0), special: true,
      door: { x: xm, z: z1, nx: 0, nz: 1, ox: xm, oz: z1 + 1.6 }, air: { x: xm, z: z0 - 3 } });
  }
  if (Dock.s && Dock.s.house) {   /* the boathouse: its door faces the quay */
    const D = Dock.s, h = D.house, Y = MARINA.DY, p = Dock.toWorld((h[0] + h[1]) / 2, h[3], {}), q = Dock.toWorld((h[0] + h[1]) / 2, h[3] + 1.6, {}), r = Dock.rect(h[0], h[1], h[2], h[3]);
    L.push({ key: 'dock:house', kind: 'boathouse', name: Dock.name || 'Marina', sub: 'Boathouse · harbour master', seed: 8181, ti: 0, reg: 'harbor', x0: r[0], z0: r[1], x1: r[2], z1: r[3], y: Y, h: 4.6, cat: 'fixed', W: Math.abs(h[1] - h[0]), D: Math.abs(h[3] - h[2]), special: true,
      door: { x: p.x, z: p.z, nx: D.Sx, nz: D.Sz, ox: q.x, oz: q.z } });
  }
  if (Ven.ready) for (const S of Ven.all) {
    const xm = S.bx + S.bw / 2;
    L.push({ key: 'ven:' + S.ti + (S.club ? 'c' : 'v'), kind: S.club ? 'club' : 'venue', name: S.D.name, sub: S.D.sub, seed: 900 + S.ti * 7 + (S.club ? 3 : 0), ti: S.ti, reg: S.R.key, x0: S.bx, z0: S.bz, x1: S.bx + S.bw, z1: S.bz + S.bd, y: S.T.baseH, h: 9, cat: 'fixed', W: S.bw, D: S.bd, special: true,
      door: { x: xm, z: S.bz, nx: 0, nz: -1, ox: xm, oz: S.bz - 1.6 }, S });
  }
  Bld.fixed = L; return L;
};
Bld.fixedNear = function (lim) {
  const L = Bld.prepFixed(); let best = null, bd = lim * lim;
  for (const r of L) { if (r.S) continue; const ex = Pl.x - (r.door.x + r.door.nx * 0.9), ez = Pl.z - (r.door.z + r.door.nz * 0.9), d2 = ex * ex + ez * ez; if (d2 < bd) { bd = d2; best = r; } }
  return best;
};
/* a venue's own room: walk in, then play */
Bld.venueRec = function (S) { const L = Bld.prepFixed(); return L.find((r) => r.S === S) || null; };
function intPlayVenue(rec) { const S = rec.S; Int.leave(true); Ven.near = S; Ven.open(); }

/* ---------- airport terminal ---------- */
INT_KINDS.terminal = { name: 'Airport terminal', rooms: { main(K, rec, r) {
  const W = 34, D = 22; K.shell({ W, D, H: 7, floor: 0xd8d8d4, tiles: 0xbcbcb6, wall: 0xe8eaec, trim: 0x2a3a5a, lamp: 0xf4f8ff, lightI: 1, winH: [0.3, 6.4], noBackWin: true, hemi: 0.95 });
  /* the airside wall is all glass: the apron and planes beyond */
  K.glow(K.x0 + 1, 0.2, K.z0 + 0.01, K.x1 - 1, 6.5, K.z0 + 0.02, K.night ? 0x1a2433 : 0xc8dcec, K.night ? 1 : 1.2); for (let x = K.x0 + 1; x <= K.x1 - 1; x += 3) K.box(x - 0.06, 0, K.z0, x + 0.06, 7, K.z0 + 0.15, 0x2a3a5a);
  K.sign(rec.name.toUpperCase(), 0, 6.1, K.z1 - 0.04, 12, 1, Math.PI, { fg: '#ffffff', bg: '#2a3a5a' });
  /* check-in: a long desk with belts and staff */
  for (let k = 0; k < 4; k++) { const x = K.x0 + 3 + k * 3.2; K.counter(x - 1.2, K.z1 - 6.5, x + 1.2, K.z1 - 5.8, 0x2a3a5a, 0xe8e8e8, 1.05); K.glow(x - 0.5, 1.6, K.z1 - 6.2, x + 0.5, 2.0, K.z1 - 6.15, 0x1a5cff, 1.2); intStaff(K, x, K.z1 - 7.2, Math.PI, 0x2a3a5a, { suit: true }); }
  for (let z = K.z1 - 4.5; z < K.z1 - 1.5; z += 1) { K.cyl(K.x0 + 2, 0, z, 0.04, 1, 0x9a9aa0); K.cyl(K.x0 + 14, 0, z, 0.04, 1, 0x9a9aa0); }
  /* departures board */
  K.box(-4.5, 3.4, K.z1 - 0.3, 4.5, 6, K.z1 - 0.15, 0x101418); const fl = ['09:40  HARBOUR HOP      ON TIME', '10:15  SUMMIT SHUTTLE   BOARDING', '11:00  ISLAND TOUR      ON TIME', '12:30  CAPE EXPRESS     DELAYED', '13:45  CARGO RUN        ON TIME'];
  K.sign('DEPARTURES\n' + fl.join('\n'), 0, 4.7, K.z1 - 0.32, 8.6, 2.4, Math.PI, { fg: '#ffcf3a', bg: '#101418', font: '600 ', h: 512, w: 1024, size: 46 });
  /* seats, a café, a shop, security */
  for (let x = 3; x < K.x1 - 2; x += 3.4) for (const z of [-2, 0.5]) for (let k = 0; k < 4; k++) K.chair(x - 1.2 + k * 0.6, z, z < 0 ? 0 : Math.PI, 0x2a5aa8);
  intSeat(K, 3 - 0.6, 0.5, Math.PI, { phone: true }); intSeat(K, 6.4, -2, 0, {}); intSeat(K, 9.8 + 0.6, 0.5, Math.PI, { eat: true });
  K.counter(K.x1 - 6, K.z1 - 3, K.x1 - 1, K.z1 - 2.2, 0x6a4a34, 0xe8e0d0); intStaff(K, K.x1 - 3.5, K.z1 - 1.5, Math.PI, 0x2a1a14); K.sign('CAFÉ', K.x1 - 3.5, 3, K.z1 - 0.04, 2, 0.6, Math.PI, { fg: '#ffcf6a', bg: '#2a1a14' });
  K.act(K.x1 - 3.5, K.z1 - 3.8, 1.6, 'Buy an airport coffee', () => intBuy(7, 'a coffee', () => { intBuzz(3); Vit.eat(0, 18); }, 'Airport prices. Still, you feel awake.'), { cost: 7 });
  K.shelf(K.x0 + 0.05, K.z0 + 3, K.x0 + 0.5, K.z0 + 9, 2, 4, r, INT_PROD); K.sign('NEWS · TRAVEL', K.x0 + 0.04, 2.5, K.z0 + 6, 2.4, 0.4, Math.PI / 2, { fg: '#fff', bg: '#c8302a' });
  for (let k = 0; k < 2; k++) { const x = -4 + k * 4; K.box(x - 0.5, 0, K.z0 + 6, x - 0.35, 2.2, K.z0 + 7, 0x9a9aa0, true); K.box(x + 0.35, 0, K.z0 + 6, x + 0.5, 2.2, K.z0 + 7, 0x9a9aa0, true); K.box(x - 0.5, 2.2, K.z0 + 6, x + 0.5, 2.4, K.z0 + 7, 0x9a9aa0); K.box(x + 0.7, 0, K.z0 + 5.5, x + 1.4, 0.9, K.z0 + 7.5, 0x3a3c40, true); }
  K.person({ x: -1.5, z: K.z0 + 6.5, yaw: 0, shirt: 0x1a2a4a, pants: 0x1a1c24, face: true, role: 'guard' });
  intShoppers(K, r, 4, [[0, K.z1 - 3], [-8, K.z1 - 3], [8, 2], [-6, 3], [K.x1 - 4, K.z1 - 5]]);
  /* through security to the apron */
  const ax = 0; K.box(ax - 1.2, 0, K.z0 + 0.15, ax + 1.2, 2.7, K.z0 + 0.3, 0x2a3a5a); K.sign('GATES · APRON ▸', ax, 3.0, K.z0 + 0.32, 2.6, 0.4, 0, { fg: '#fff', bg: '#2a3a5a' });
  K.act(ax, K.z0 + 1.2, 1.8, 'Through to the planes (the apron)', () => { const d = rec.door, ox = d.ox, oz = d.oz; d.ox = rec.air.x; d.oz = rec.air.z; Int.leave(); d.ox = ox; d.oz = oz; Foot.yaw = Math.PI; }, { wide: true });
  K.act(0, K.z1 - 0.8, 1.6, 'Read the departures board', () => Int.say('Every flight leaves from the apron. Your own planes are parked out there: walk up to one and press F.', 4));
} } };

/* ---------- marina boathouse ---------- */
INT_KINDS.boathouse = { name: 'Boathouse', rooms: { main(K, rec, r) {
  const W = 20, D = 14; K.shell({ W, D, H: 4.6, floor: 0x8a6a4a, wall: 0x6a7a8a, ceil: 0x4a3a2a, trim: 0xf2f2f2, lamp: 0xfff0d8, lightI: 0.85 });
  K.sign(rec.name.toUpperCase() + ' · HARBOUR MASTER', 0, 3.6, K.z0 + 0.04, 9, 0.7, 0, { fg: '#fff', bg: '#1a3a5a' });
  K.counter(-3, K.z0 + 2.4, 3, K.z0 + 3.1, 0x1a3a5a, 0xe8e0d0); intStaff(K, 0, K.z0 + 1.6, 0, 0x1a3a5a, { hat: { k: 'cap', c: lc(0xf2f2f2), bc: lc(0x1a1a1a) } });
  K.shelf(K.x0 + 0.05, K.z0 + 1, K.x0 + 0.5, K.z1 - 3, 2.2, 4, r, [0xf2c81e, 0xd85a1a, 0xf2f2f2, 0x1a5ad8, 0x6a4a2a]);
  for (let k = 0; k < 6; k++) K.cyl(K.x0 + 1.5 + k * 0.7, 0, K.z1 - 1.5, 0.28, 0.5, 0xf2f2f2); for (let k = 0; k < 4; k++) K.cyl(K.x0 + 1.6 + k * 0.9, 2.6, K.z0 + 0.25, 0.3, 0.6, [0xd82a2a, 0xf2f2f2][k & 1]);
  /* a dinghy on stands in the workshop */
  K.box(K.x1 - 6, 0, -1.5, K.x1 - 5.8, 0.8, 1.5, 0x5a5a5a, true); K.box(K.x1 - 2.2, 0, -1.5, K.x1 - 2, 0.8, 1.5, 0x5a5a5a, true); K.box(K.x1 - 6.4, 0.8, -0.9, K.x1 - 1.6, 1.5, 0.9, 0xf2f2f2, true); K.box(K.x1 - 6.2, 1.5, -0.8, K.x1 - 1.8, 1.55, 0.8, 0x6a4a2a);
  K.person({ x: K.x1 - 4, z: 1.6, yaw: Math.PI, kind: 'work', shirt: 0x3a5a7a, pants: 0x2a3a5a });
  K.pic(K.x1 - 0.02, 2.2, K.z0 + 3, -Math.PI / 2, 2.4, 1.6, 0x4a7aa8);
  K.act(0, K.z0 + 3.8, 1.6, 'Ask the harbour master about boats', () => Int.say('“Boats are moored on the pier. Walk out to a slip and press F to buy or take one out.”', 4));
  K.act(K.x0 + 1.2, 0, 1.6, 'Buy a fishing licence', () => intBuy(30, 'a fishing licence', null, 'A fishing licence. The fish are not impressed.'), { cost: 30 });
} } };

/* ---------- venues and clubs: walk in, play when you are ready ---------- */
INT_KINDS.venue = { name: 'Venue', rooms: { main(K, rec, r) {
  const S = rec.S, D = S.D, g = D.game, col = D.col, W = 22, Dd = 14, warm = g === 'darts' || g === 'pool' || g === 'fish';
  K.shell({ W, D: Dd, H: 4.2, floor: warm ? 0x4a2a18 : 0x2a2c30, wall: warm ? 0x5a3424 : 0x1e2228, ceil: 0x141210, trim: col, lamp: warm ? 0xffc070 : 0xf4f8ff, lightI: 0.6, hemi: 0.45, win: !warm });
  K.sign(D.name.toUpperCase(), 0, 3.3, K.z0 + 0.04, 9, 0.8, 0, { fg: _hexCss(col), bg: null }); K.glow(K.x0 + 0.5, 3.75, K.z0 + 0.02, K.x1 - 0.5, 3.8, K.z0 + 0.04, col, 1.6);
  /* the bar on the left, the regulars */
  K.counter(K.x0 + 0.5, -3, K.x0 + 1.3, K.z1 - 2, 0x3a2416, 0x1a120c, 1.1); K.shelf(K.x0 + 0.05, -3, K.x0 + 0.35, K.z1 - 2, 2.2, 3, r, [0x8ad84a, 0xd8a83a, 0x8a3a1a, 0xd8d8f0], 0x2a1a10);
  intStaff(K, K.x0 + 0.85 - 0.5 + 0.2, 0.5, Math.PI / 2, 0x1a1a1a, { sleeve: false });
  for (let z = -2; z < K.z1 - 2.5; z += 1.1) { K.chair(K.x0 + 1.8, z, 0, col, true); if (r() < 0.4) intSeat(K, K.x0 + 1.85, z, -Math.PI / 2, { sy: 0.25, eat: r() < 0.5 }); }
  /* what the place is about, on the far side */
  const px = 4, pz = -1.5;
  if (g === 'pool') { for (const x of [0.5, 6]) { K.box(x - 1.4, 0.7, pz - 0.75, x + 1.4, 0.85, pz + 0.75, 0x4a2a14, true); K.box(x - 1.3, 0.85, pz - 0.65, x + 1.3, 0.86, pz + 0.65, 0x1a6a3a); K.cyl(x, 0, pz, 0.25, 0.7, 0x2a1a0a); } K.glow(-1, 2.6, pz - 0.4, 7.5, 2.65, pz + 0.4, 0xffe0a0, 1.4); }
  else if (g === 'darts') { for (const x of [2, 6]) { K.cyl(x, 1.73, K.z0 + 0.05, 0.23, 0.04, 0x1a1a1a); K.box(x - 0.22, 1.5, K.z0 + 0.06, x + 0.22, 1.96, K.z0 + 0.09, 0x2a6a2a); K.box(x - 0.3, 0, K.z0 + 2.37, x + 0.3, 0.02, K.z0 + 2.43, 0xf2f2f2); } }
  else if (g === 'range') { for (let k = 0; k < 4; k++) { const x = 1 + k * 2; K.box(x - 0.05, 0, K.z0, x + 0.05, 2.4, K.z0 + 5, 0x3a3c40, true); K.box(x + 0.6, 1.0, K.z0 + 0.3, x + 1.4, 1.9, K.z0 + 0.35, 0xf2f2f2); K.cyl(x + 1, 1.45, K.z0 + 0.36, 0.25, 0.01, 0xd82a2a); } K.counter(0.5, K.z0 + 5, 9, K.z0 + 5.6, 0x3a3c40, 0x5a5c60); }
  else if (g === 'gopher') { for (let k = 0; k < 4; k++) { const x = 1 + k * 2; K.box(x - 0.6, 0, K.z0 + 0.2, x + 0.6, 1.9, K.z0 + 1.2, [0xd82a4a, 0x2a8ad8, 0xf2c81e, 0x3ab04a][k], true); K.glow(x - 0.45, 1.2, K.z0 + 1.21, x + 0.45, 1.75, K.z0 + 1.22, 0x6ad8ff, 1.2); } }
  else if (g === 'golf') { K.box(-1, 0, K.z0 + 0.5, 9, 0.04, pz + 2.5, 0x3a8a3a, true); K.cyl(7.5, 0.04, K.z0 + 1.5, 0.12, 0.01, 0x1a1a1a); K.cyl(7.5, 0.04, K.z0 + 1.5, 0.015, 1.4, 0xd8d8d8); K.box(7.52, 1.1, K.z0 + 1.5, 7.9, 1.4, K.z0 + 1.52, 0xd82a2a); }
  else if (g === 'curl') { K.box(-1, 0, K.z0 + 0.4, 9, 0.03, pz + 2.5, 0xe8f2fa, true); K.cyl(4, 0.03, K.z0 + 1.5, 1.2, 0.005, 0x2a5ad8); K.cyl(4, 0.035, K.z0 + 1.5, 0.8, 0.005, 0xf2f2f2); K.cyl(4, 0.04, K.z0 + 1.5, 0.4, 0.005, 0xd82a2a); }
  else if (g === 'fish') { K.glow(-1, 0.8, K.z0 + 0.05, 9, 2.6, K.z0 + 0.1, 0x2a7ab0, 0.9); K.shelf(-1, K.z0 + 3, 4, K.z0 + 3.4, 1.8, 4, r, [0x6a4a2a, 0x2a6a3a, 0xd8a83a, 0x5a5a5a]); }
  for (let k = 0; k < 3; k++) { const x = 1 + k * 3; K.table(x, K.z1 - 2.8, 0.8, 0.8, 0x3a2416, 0.75, true); K.chair(x - 0.6, K.z1 - 2.8, -Math.PI / 2 + Math.PI, 0x3a2416); if (r() < 0.6) intSeat(K, x - 0.62, K.z1 - 2.8, Math.PI / 2, { eat: r() < 0.5, talk: true }); }
  K.person({ x: px + 1, z: pz + 1.5, kind: 'walk', path: [[px - 2, pz + 1.6, 3], [px + 3, pz + 1.4, 3]] });
  K.act(px, pz + 2.4, 2.4, 'Play: ' + D.sub.replace(/^[^·]*· ?/, '') + ' (pick your stake)', () => intPlayVenue(rec), { wide: true });
  K.act(K.x0 + 2.2, 0.5, 1.6, 'Order: ' + D.snack.name, () => intBuy(D.snack.price, D.snack.name, () => { car.health = Math.min(100, car.health + 25); car.nitro = tune.nitroMax; intBuzz(2); Vit.eat(40, 15); }, D.snack.name + '. Your car feels better already.'), { cost: D.snack.price });
} } };
INT_KINDS.club = { name: 'Club', rooms: { main(K, rec, r) {
  const S = rec.S, D = S.D, col = D.col, W = 22, Dd = 14, show = D.game === 'show';
  K.shell({ W, D: Dd, H: 4.6, floor: 0x121418, wall: 0x0e1014, ceil: 0x08090c, trim: col, lamp: col, lightI: 0.5, hemi: 0.3, win: false, lights: false });
  K.light(0, 3.8, -1, col, 1.2, 14); K.light(-6, 3.5, 3, 0xff3aa8, 0.8, 10); K.light(6, 3.5, 3, 0x3ad8ff, 0.8, 10);
  K.sign(D.name.toUpperCase(), 0, 3.6, K.z0 + 0.04, 9, 0.8, 0, { fg: _hexCss(col) });
  /* the floor (or the stage) glows in squares; the DJ booth behind */
  const tiles = []; for (let i = -3; i < 3; i++) for (let j = 0; j < 4; j++) tiles.push([i * 1.2, K.z0 + 2.4 + j * 1.2]);
  for (const [x, z] of tiles) K.glow(x + 0.04, 0.005, z + 0.04, x + 1.16, 0.02, z + 1.16, [col, 0xff3aa8, 0x3ad8ff, 0xffcf3a][((x * 7 + z * 3) | 0) & 3], 0.55);
  K.box(-2, 0, K.z0 + 0.3, 2, 1.2, K.z0 + 1.3, 0x1a1c22, true); K.glow(-1.8, 1.21, K.z0 + 0.4, 1.8, 1.22, K.z0 + 1.2, col, 0.8); K.person({ x: 0, z: K.z0 + 0.8, yaw: 0, kind: 'dance', shirt: 0x1a1a1a, pants: 0x1a1a1a, hat: { k: 'cap', c: lc(0x1a1a1a), bc: null } });
  if (show) { K.box(-3.6, 0, K.z0 + 1.6, 3.6, 0.6, K.z0 + 3.4, 0x2a1a24, true); }
  for (let k = 0; k < 9; k++) { const t = tiles[(k * 5 + 3) % tiles.length]; K.person({ x: t[0] + 0.6 + (r() - 0.5) * 0.4, z: t[1] + 0.6 + (r() - 0.5) * 0.4, yaw: r() * TAU, kind: 'dance' }); }
  K.counter(K.x1 - 1.3, -3, K.x1 - 0.5, K.z1 - 2, 0x1a1c22, 0x2a2c34, 1.1); K.glow(K.x1 - 1.32, 0.1, -3, K.x1 - 1.3, 0.15, K.z1 - 2, col, 1.4); intStaff(K, K.x1 - 0.2, 0.2, -Math.PI / 2, 0x1a1a1a, { sleeve: false });
  for (let k = 0; k < 2; k++) K.sofa(K.x0 + 1, -1 + k * 3, Math.PI / 2, 2.4, 0x3a1a2a);
  K.act(0, K.z0 + 4.6, 2.6, (show ? 'Watch the show (buy a ticket)' : 'Hit the dance floor (the dance game)'), () => intPlayVenue(rec), { wide: true });
  K.act(K.x1 - 1.9, 0.2, 1.6, 'Buy a mocktail', () => intBuy(9, 'a mocktail', () => { intBuzz(2); Vit.eat(0, 30); }, 'Something blue with an umbrella in it.'), { cost: 9 });
  let ph = 0; K.tick((dt) => { ph += dt; });
} } };
