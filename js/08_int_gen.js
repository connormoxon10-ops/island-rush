/* ================= INTERIORS: the ordinary buildings =================
   Offices (a lobby and a lift up to the office floors), cafés, corner shops, pharmacies, bookshops, barbers, bakeries, electronics shops, florists,
   hardware stores, laundromats, bars, diners, homes, warehouses and barns. Each is laid out to the building's own footprint, with its staff and
   customers, and something to buy or do. Food and coffee give you a buzz (you run faster for a few minutes); a meal also tops up the car. */
const INT_KINDS = {};
function intDims(rec, wMax, dMax) { return { W: clamp(Math.round((rec.W - 0.8) * 2) / 2, 8, wMax || 30), D: clamp(Math.round((rec.D - 0.8) * 2) / 2, 7, dMax || 26) }; }
const INT_PROD = [0xd82a2a, 0x2a6ad8, 0xf2c81e, 0x3ab04a, 0xf28a1e, 0xe8e8e8, 0x8a3ad8, 0x1ab0b0, 0xd85a8a, 0x5a3a2a];
const INT_BOOK = [0x7a1a1a, 0x1a3a6a, 0x2a5a2a, 0x6a5a1a, 0x3a1a4a, 0xa8762a, 0x1a1a1a, 0xc8b88a, 0x8a2a4a];
/* things to buy: the buzz (run faster), a meal (buzz + the car topped up), a repair kit */
function intBuzz(min) { const s = intSave(); s.buzz = Math.max(s.buzz || 0, App.time) + min * 60; }
function intBuy(price, what, fx, line) {
  if (save.money < price) { Int.say('You need ' + money(price)); Snd.beep(200, 0.08); return false; }
  save.money -= price; if (fx) fx(); writeSave(); Snd.beep(660, 0.06); Int.say((line || 'Bought: ' + what) + ' · −' + money(price)); return true;
}
const intMeal = () => { intBuzz(5); car.health = Math.min(100, car.health + 25); car.nitro = tune.nitroMax; intSave().meals = (intSave().meals || 0) + 1; };
function intRunK() { const s = save.int; if (!s) return 1; return 1 + (s.fit || 0) * 0.0015 + ((s.buzz || 0) > App.time ? 0.12 : 0); }
/* staff in a uniform, customers in their own clothes */
function intStaff(K, x, z, yaw, col, o) { return K.person(Object.assign({ x, z, yaw, shirt: col, pants: 0x1c1e24, face: true, role: 'staff' }, o || {})); }
function intShoppers(K, r, n, pts) { for (let k = 0; k < n; k++) { const P = []; for (let q = 0; q < 4; q++) { const p = pts[(r() * pts.length) | 0]; P.push([p[0] + (r() - 0.5) * 0.6, p[1] + (r() - 0.5) * 0.6, 1 + r() * 4]); } K.person({ x: P[0][0], z: P[0][1], kind: 'walk', path: P }); } }
function intSeat(K, x, z, yaw, o) { return K.person(Object.assign({ x: x - Math.sin(yaw) * 0.08, z: z - Math.cos(yaw) * 0.08, yaw, kind: 'sit' }, o || {})); }

/* ---------- offices ---------- */
INT_KINDS.office = { name: 'Offices', rooms: {
  main(K, rec, r) {
    const { W, D } = intDims(rec, 18, 15); K.shell({ W, D, H: 4.6, floor: 0xc8c4bc, wall: 0xe8e6e0, tiles: 0xb0aca4, trim: 0x2a2c30 });
    K.counter(-3, K.z0 + 3, 3, K.z0 + 3.8, 0x2a2c30, 0xe8e4dc, 1.1); K.sign(rec.name.toUpperCase(), 0, 3.2, K.z0 + 0.02, Math.min(W - 2, 8), 0.8, 0, { fg: '#e8e2d0', bg: null });
    intStaff(K, 0, K.z0 + 2.4, 0, 0x2a3a5a, { suit: true });
    K.sofa(K.x0 + 1.4, 0, Math.PI / 2, 2.4, 0x4a5a6a); K.sofa(K.x0 + 3.6, 0, -Math.PI / 2, 2.4, 0x4a5a6a); K.table(K.x0 + 2.5, 0, 0.9, 1.6, 0x2a2a2a, 0.42);
    K.plant(K.x1 - 1, K.z1 - 1.2, 1.2); K.plant(K.x0 + 1, K.z1 - 1.2, 1.2); K.plant(K.x1 - 1, K.z0 + 1, 1.3); K.plant(K.x0 + 1, K.z0 + 1, 1.3); K.rug(-2.5, 1, 2.5, K.z1 - 1.5, 0x3a3c44, 0x4a4c56);
    for (let k = 0; k < 2; k++) K.pic(K.x0 + 0.02, 2.2, K.z0 + 4 + k * 3, Math.PI / 2, 2, 1.3, [0x6a8aa8, 0xa8846a][k]); K.box(-1.4, 0, 2.4, 1.4, 0.45, 3.0, 0x6a6c70, true); K.box(-1.4, 0, -3.4, 1.4, 0.45, -2.8, 0x6a6c70, true); intSeat(K, 0.6, 2.7, Math.PI, { sy: -0.02, suit: true, phone: true });
    /* lifts on the right wall */
    for (let k = 0; k < 2; k++) { const z = -1.5 + k * 3; K.box(K.x1 - 0.12, 0, z - 0.8, K.x1, 2.5, z + 0.8, 0xa8acb2); K.box(K.x1 - 0.14, 0, z - 0.02, K.x1 - 0.12, 2.5, z + 0.02, 0x5a5e64); K.glow(K.x1 - 0.14, 2.65, z - 0.15, K.x1 - 0.13, 2.8, z + 0.15, 0xffa840, 1.2); }
    const floors = Math.max(2, Math.min(30, Math.round(rec.h / 4)));
    K.act(K.x1 - 0.9, 0, 2.2, 'Take the lift', () => Int.panel({ title: 'Lift', sub: rec.name + ' · ' + floors + ' floors', body: '<div class="vsl"><span>Which floor?</span><div>' + Array.from({ length: Math.min(floors - 1, 12) }, (_, i) => { const f = Math.round(2 + i * (floors - 2) / Math.max(1, Math.min(floors - 1, 12) - 1)); return '<button type="button" class="vstk" data-ia="' + f + '">' + f + '</button>'; }).join('') + '</div></div>', pick: (f) => { rec.floor = +f; Int.panel(null); Snd.beep(880, 0.05); Int.go('floor', 'lift'); }, btns: [] }), { wide: true });
    K.spawn('lift', K.x1 - 1.4, 0, -Math.PI / 2);
    intShoppers(K, r, 2, [[0, 0], [K.x0 + 3, 2], [2, K.z0 + 4.5], [K.x1 - 2, 1]]);
  },
  floor(K, rec, r) {
    const { W, D } = intDims(rec, 18, 15); K.shell({ W, D, H: 3.4, floor: 0x5a6068, wall: 0xeceae4, door: false, noBackWin: false, winH: [0.6, 2.9], trim: 0x2a2c30 });
    K.sign('FLOOR ' + (rec.floor || 2), K.x1 - 0.02, 2.4, 2, 1.6, 0.5, -Math.PI / 2, { fg: '#2a2c30', bg: '#e8e6e0' });
    for (let k = 0; k < 2; k++) { const z = -1.5 + k * 3; K.box(K.x1 - 0.12, 0, z - 0.8, K.x1, 2.5, z + 0.8, 0xa8acb2); }
    K.act(K.x1 - 0.9, 0, 2.2, 'Take the lift down', () => { Snd.beep(660, 0.05); Int.go('main', 'lift'); }, { wide: true });
    K.spawn('lift', K.x1 - 1.4, 0, -Math.PI / 2);
    let n = 0; for (let x = K.x0 + 2; x < K.x1 - 4; x += 3.4) for (let z = K.z0 + 2.2; z < K.z1 - 3; z += 3.2) { K.desk(x, z, 0); K.chair(x, z + 0.6, Math.PI, 0x2a2a30); if (r() < 0.55 && n < 9) { intSeat(K, x, z + 0.62, Math.PI, { type: true, suit: r() < 0.5 }); n++; } }
    K.box(K.x0, 0, K.z1 - 2.6, K.x0 + 4, 3.4, K.z1 - 2.5, 0xd8d6d0, true); K.glass(K.x0 + 4, 0, K.z1 - 2.6, K.x0 + 4.1, 3.4, K.z1); K.col(K.x0 + 4, K.z1 - 2.6, K.x0 + 4.1, K.z1 - 0.9);
    K.table(K.x0 + 2, K.z1 - 1.2, 2.4, 1, 0xe8e4dc); K.plant(K.x1 - 1, K.z1 - 1, 1.2);
    K.counter(K.x1 - 4, K.z1 - 0.7, K.x1 - 1.6, K.z1 - 0.1, 0xd8d2c4); K.box(K.x1 - 3.6, 1.02, K.z1 - 0.6, K.x1 - 3.2, 1.4, K.z1 - 0.2, 0x2a2a2a);
    K.act(K.x1 - 2.8, K.z1 - 1.2, 1.4, 'A coffee from the office machine (free)', () => { intBuzz(2); Snd.beep(700, 0.05); Int.say('Office coffee. Not good, but free.'); });
  } } };

/* ---------- café, bakery ---------- */
function intCafe(K, rec, r, bake) {
  const { W, D } = intDims(rec, 15, 12); K.shell({ W, D, floor: bake ? 0xd8c8a8 : 0x6a4a34, wall: bake ? 0xf2e8d8 : 0xe0d2bc, trim: 0x4a3426, lamp: 0xffe2b0, lightI: 0.85 });
  const cz = K.z0 + 2.2; K.counter(K.x0 + 1, cz, K.x1 - 3.5, cz + 0.8, 0x5a3a28, 0xe8e0d0);
  K.glass(K.x0 + 1.2, 1.02, cz + 0.05, K.x0 + 4.6, 1.45, cz + 0.75); for (let k = 0; k < 8; k++) K.box(K.x0 + 1.4 + k * 0.4, 1.05, cz + 0.25, K.x0 + 1.7 + k * 0.4, 1.15, cz + 0.55, [0xc88a3a, 0xe8c070, 0x8a4a2a, 0xf2d8a0][k % 4]);
  if (bake) { K.box(K.x0 + 1, 0, K.z0, K.x0 + 3, 1.8, K.z0 + 0.8, 0x6a6c70, true); K.glow(K.x0 + 1.2, 0.5, K.z0 + 0.81, K.x0 + 2.8, 1.2, K.z0 + 0.82, 0xff8a30, 1.2); }
  else { K.box(K.x1 - 5.5, 1.02, cz + 0.2, K.x1 - 4.8, 1.55, cz + 0.6, 0xb0b4b8); K.box(K.x1 - 5.4, 1.4, cz + 0.6, K.x1 - 4.9, 1.45, cz + 0.75, 0x2a2a2a); }
  K.sign(bake ? 'BREAD · PASTRIES · CAKES' : 'ESPRESSO · LATTE · TEA · CAKE', (K.x0 + K.x1 - 3.5) / 2, 2.7, K.z0 + 0.02, Math.min(W - 4, 6), 0.7, 0, { fg: '#f2e8d0', bg: '#1a1410' });
  intStaff(K, K.x0 + 3, cz - 0.7, 0, bake ? 0xf2f2f2 : 0x2a1a14, { sleeve: false });
  const price = bake ? 5 : 4; K.act(K.x0 + 3, cz + 1.4, 1.8, bake ? 'Buy a pastry' : 'Buy a coffee', () => intBuy(price, bake ? 'a warm pastry' : 'a flat white', () => intBuzz(3), bake ? 'Still warm. You feel ready for anything.' : 'Flat white. You feel wide awake (run faster for a while).'), { cost: price });
  let n = 0; for (let x = K.x0 + 2.2; x < K.x1 - 1.5; x += 3.6) for (let z = cz + 3.2; z < K.z1 - 2; z += 3.4) { K.table(x, z, 0.8, 0.8, 0x3a2a20, 0.75, true); K.chair(x, z - 0.7, 0); K.chair(x, z + 0.7, Math.PI); if (r() < 0.6 && n++ < 6) intSeat(K, x, z - 0.72, 0, { eat: r() < 0.5 }); }
  K.plant(K.x1 - 1, K.z1 - 1, 1); K.pic(K.x1 - 0.02, 1.8, 0, -Math.PI / 2, 1.2, 0.9, 0x8a6a4a);
}
INT_KINDS.cafe = { name: 'Café', rooms: { main(K, rec, r) { intCafe(K, rec, r, false); } } };
INT_KINDS.bakery = { name: 'Bakery', rooms: { main(K, rec, r) { intCafe(K, rec, r, true); } } };

/* ---------- shops with aisles: corner shop, pharmacy, hardware, electronics, books ---------- */
function intAisles(K, r, pal, h, step) { const pts = []; for (let x = K.x0 + 3; x < K.x1 - 2.5; x += step || 2.8) { K.shelf(x - 0.35, K.z0 + 4, x + 0.35, K.z1 - 3.5, h || 1.7, 4, r, pal); pts.push([x + 1.35, K.z0 + 5], [x + 1.35, K.z1 - 4]); } return pts; }
INT_KINDS.store = { name: 'Convenience store', rooms: { main(K, rec, r) {
  const { W, D } = intDims(rec, 16, 14); K.shell({ W, D, floor: 0xd8d8d0, wall: 0xf0f0ec, tiles: 0xc0c0b8, lamp: 0xf0f8ff, lightI: 0.95 });
  const pts = intAisles(K, r, INT_PROD); for (let x = K.x0 + 1; x < K.x1 - 1; x += 1) K.fridge(x + 0.5, K.z0 + 0.4, 0, true);
  K.counter(K.x1 - 4, K.z1 - 3, K.x1 - 1, K.z1 - 2.2, 0x2a6a4a, 0xe8e8e0); K.box(K.x1 - 3.4, 1.02, K.z1 - 2.9, K.x1 - 2.9, 1.3, K.z1 - 2.5, 0x2a2a2a); intStaff(K, K.x1 - 2.5, K.z1 - 3.6, 0, 0x2a8a5a);
  K.act(K.x1 - 2.5, K.z1 - 1.5, 1.6, 'Buy an energy drink', () => intBuy(6, 'an energy drink', () => intBuzz(4), 'Tastes like a battery. You feel fast.'), { cost: 6, wide: true });
  intShoppers(K, r, 3, pts);
} } };
INT_KINDS.pharmacy = { name: 'Pharmacy', rooms: { main(K, rec, r) {
  const { W, D } = intDims(rec, 15, 12); K.shell({ W, D, floor: 0xe8e8e4, wall: 0xffffff, tiles: 0xd0d0cc, lamp: 0xf4fbff, lightI: 1 });
  const pts = intAisles(K, r, [0xffffff, 0x2a8ad8, 0x3ab04a, 0xe8e8e8, 0xd82a4a], 1.6, 3); K.counter(K.x0 + 1, K.z0 + 1.6, K.x1 - 1, K.z0 + 2.4, 0xffffff, 0x3ab04a);
  K.shelf(K.x0 + 1, K.z0 + 0.1, K.x1 - 1, K.z0 + 0.5, 2.2, 5, r, [0xffffff, 0xf2f2f2, 0x2a8ad8, 0x3ab04a]); K.sign('✚ PHARMACY', 0, 2.9, K.z0 + 0.52, 3, 0.6, 0, { fg: '#3ab04a', bg: '#ffffff' });
  intStaff(K, 0, K.z0 + 1, 0, 0xf2f2f2, { sleeve: true });
  K.act(0, K.z0 + 3.2, 1.8, 'Buy vitamins (a little fitter)', () => intBuy(25, 'vitamins', () => { const s = intSave(); s.fit = Math.min(100, (s.fit || 0) + 2); }, 'Vitamins. +2 fitness.'), { cost: 25 });
  intShoppers(K, r, 2, pts);
} } };
INT_KINDS.hardware = { name: 'Hardware store', rooms: { main(K, rec, r) {
  const { W, D } = intDims(rec, 18, 15); K.shell({ W, D, floor: 0x9a9890, wall: 0xd8d4c8, tiles: 0x8a8880, lamp: 0xfff8e8 });
  const pts = intAisles(K, r, [0xd82a2a, 0xf2c81e, 0x5a5a5a, 0x2a5aa8, 0x9a6a3a, 0x3a3a3a], 2.2, 3); K.counter(K.x1 - 4, K.z1 - 3, K.x1 - 1, K.z1 - 2.2, 0xd85a1a); intStaff(K, K.x1 - 2.5, K.z1 - 3.6, 0, 0xd85a1a);
  for (let k = 0; k < 4; k++) K.box(K.x0 + 1 + k * 1.2, 0, K.z1 - 1.5, K.x0 + 1.9 + k * 1.2, 0.9, K.z1 - 0.7, [0x6a8a3a, 0xc8302a, 0x3a5a9a, 0x9a9a9a][k], true);
  K.act(K.x1 - 2.5, K.z1 - 1.5, 1.6, 'Buy a repair kit (car +40 health)', () => intBuy(60, 'a repair kit', () => { car.health = Math.min(100, car.health + 40); }, 'Repair kit. Your car is in better shape.'), { cost: 60, wide: true });
  intShoppers(K, r, 2, pts);
} } };
INT_KINDS.electronics = { name: 'Electronics', rooms: { main(K, rec, r) {
  const { W, D } = intDims(rec, 16, 14); K.shell({ W, D, floor: 0x2a2c30, wall: 0xe8e8ec, lamp: 0xeef4ff, lightI: 1 });
  for (let x = K.x0 + 1.5; x < K.x1 - 1; x += 1.9) K.tv(x, 1.9, K.z0 + 0.05, 0, 1.6, [0x3a7ac0, 0xc04a3a, 0x3ac07a, 0xc0a03a][((x * 7) | 0) & 3]);
  const pts = []; for (let x = K.x0 + 3; x < K.x1 - 2; x += 4) { K.table(x, 0, 2.2, 1, 0xf2f2f2, 0.9); for (let k = 0; k < 4; k++) K.glow(x - 0.9 + k * 0.5, 0.91, -0.15, x - 0.65 + k * 0.5, 0.92, 0.25, 0x6a9ad8, 1.1); pts.push([x, 1.4], [x, -1.4]); }
  K.counter(K.x1 - 4, K.z1 - 3, K.x1 - 1, K.z1 - 2.2, 0x1a5cff); intStaff(K, K.x1 - 2.5, K.z1 - 3.6, 0, 0x1a5cff);
  K.act(K.x1 - 2.5, K.z1 - 1.5, 1.6, 'Buy headphones', () => intBuy(80, 'headphones', null, 'Nice headphones. The music sounds better already.'), { cost: 80, wide: true });
  intShoppers(K, r, 3, pts);
} } };
INT_KINDS.books = { name: 'Bookshop', rooms: { main(K, rec, r) {
  const { W, D } = intDims(rec, 15, 12); K.shell({ W, D, floor: 0x5a3a24, wall: 0xe8dcc4, lamp: 0xffe2b0, lightI: 0.8 });
  for (const sx of [-1, 1]) K.shelf(sx < 0 ? K.x0 + 0.05 : K.x1 - 0.45, K.z0 + 1, sx < 0 ? K.x0 + 0.45 : K.x1 - 0.05, K.z1 - 2, 2.6, 6, r, INT_BOOK, 0x4a2a1a);
  K.shelf(K.x0 + 1, K.z0 + 0.05, K.x1 - 1, K.z0 + 0.45, 2.6, 6, r, INT_BOOK, 0x4a2a1a);
  const pts = []; for (let x = K.x0 + 3; x < K.x1 - 2; x += 3.2) { K.shelf(x - 0.3, K.z0 + 3, x + 0.3, K.z1 - 4, 1.6, 4, r, INT_BOOK, 0x4a2a1a); pts.push([x + 1.4, 0]); }
  K.rug(K.x0 + 1, K.z1 - 3.4, K.x0 + 4.6, K.z1 - 1.4, 0x7a2a24, 0x9a4a34); K.sofa(K.x0 + 2.8, K.z1 - 1.6, Math.PI, 2, 0x6a3a2a); K.lamp(K.x0 + 4.9, K.z1 - 1.4);
  K.counter(K.x1 - 4, K.z1 - 3, K.x1 - 1.5, K.z1 - 2.3, 0x4a2a1a); intStaff(K, K.x1 - 2.8, K.z1 - 3.6, 0, 0x6a7a5a, { sleeve: true });
  K.act(K.x1 - 2.8, K.z1 - 1.6, 1.6, 'Buy a paperback', () => intBuy(12, 'a paperback', null, 'A thriller about a bank job. Research.'), { cost: 12, wide: true });
  intShoppers(K, r, 2, pts);
} } };
INT_KINDS.barber = { name: 'Barber', rooms: { main(K, rec, r) {
  const { W, D } = intDims(rec, 12, 10); K.shell({ W, D, floor: 0xe8e8e8, wall: 0xf2efe8, tiles: 0x1a1a1a, lamp: 0xffffff });
  for (let k = 0; k < 3; k++) { const x = K.x0 + 2 + k * 2.4; K.glow(x - 0.7, 1.0, K.z0 + 0.02, x + 0.7, 2.2, K.z0 + 0.03, 0xc8d4dc, 0.9); K.box(x - 0.8, 0.8, K.z0, x + 0.8, 0.86, K.z0 + 0.4, 0xf2f2f2); K.box(x - 0.32, 0, K.z0 + 1.1, x + 0.32, 0.55, K.z0 + 1.7, 0x8a1a1a, true); K.box(x - 0.32, 0.55, K.z0 + 1.6, x + 0.32, 1.25, K.z0 + 1.75, 0x8a1a1a); if (k < 2) { intSeat(K, x, K.z0 + 1.45, Math.PI, { sy: 0.12 }); intStaff(K, x + 0.6, K.z0 + 2.1, Math.PI, 0xf2f2f2, { kind: 'work' }); } }
  K.sofa(K.x1 - 1, 0, -Math.PI / 2, 2.2, 0x2a2a2a); K.cyl(K.x1 - 0.3, 1.2, K.z1 - 0.6, 0.12, 1, 0xd82a2a);
  K.act(K.x0 + 6.8, K.z0 + 2.4, 1.6, 'Get a haircut', () => intBuy(25, 'a haircut', () => { const ids = COS.items.filter((i) => i.cat === 'hair' && i.price <= 0).map((i) => i.id); const o = cosSave().out; if (ids.length) { const k = (ids.indexOf(o.hair) + 1) % (ids.length + 1); o.hair = ids[k] || null; } if (Int.ped) Int.mkPed(); }, 'Fresh cut. Looking sharp.'), { cost: 25 });
} } };
INT_KINDS.florist = { name: 'Florist', rooms: { main(K, rec, r) {
  const { W, D } = intDims(rec, 12, 10); K.shell({ W, D, floor: 0x8a7a68, wall: 0xf2f0e6, lamp: 0xfff4e0 });
  for (let x = K.x0 + 1.2; x < K.x1 - 1; x += 1.1) for (const z of [K.z0 + 0.8, K.z0 + 3]) { K.cyl(x, 0, z, 0.25, 0.5, 0x4a5a6a, true); for (let k = 0; k < 7; k++) { const a = k * 0.9; K.cyl(x + Math.sin(a) * 0.12, 0.5, z + Math.cos(a) * 0.12, 0.01, 0.35, 0x3a7a2a); K.cyl(x + Math.sin(a) * 0.14, 0.85, z + Math.cos(a) * 0.14, 0.06, 0.08, [0xd82a4a, 0xf2c81e, 0xf2f2f2, 0xd85ad8, 0xf28a1e][(k + ((x * 3) | 0)) % 5]); } }
  K.counter(K.x1 - 4, K.z1 - 3, K.x1 - 1, K.z1 - 2.3, 0x6a8a5a); intStaff(K, K.x1 - 2.5, K.z1 - 3.6, 0, 0x6a8a5a);
  K.act(K.x1 - 2.5, K.z1 - 1.6, 1.6, 'Buy a bunch of flowers', () => intBuy(15, 'flowers', () => { save.int.flowers = (save.int.flowers || 0) + 1; }, 'Lovely. Someone will be pleased.'), { cost: 15, wide: true });
} } };
INT_KINDS.laundry = { name: 'Laundromat', rooms: { main(K, rec, r) {
  const { W, D } = intDims(rec, 13, 10); K.shell({ W, D, floor: 0xd8d8d0, wall: 0xa8d8e8, tiles: 0xc0c0b8, lamp: 0xf4fbff });
  for (let x = K.x0 + 1; x < K.x1 - 0.8; x += 1) { K.box(x - 0.45, 0, K.z0, x + 0.45, 1.0, K.z0 + 0.75, 0xf2f2f2, true); K.cyl(x, 0.3, K.z0 + 0.76, 0.28, 0.02, 0x2a3a4a, false); K.box(x - 0.45, 1.0, K.z0, x + 0.45, 1.9, K.z0 + 0.75, 0xe8e8e8); }
  K.table(0, 1, 3, 0.9, 0xd8d2c4); for (const x of [-2.5, -1.5, 1.5, 2.5]) K.chair(x, K.z1 - 2, Math.PI, 0xd8a83a); intSeat(K, -1.5, K.z1 - 2, Math.PI, { phone: true });
  K.act(0, 2.2, 1.6, 'Wash your clothes', () => intBuy(4, 'a wash', null, 'Spin cycle. Smells of lavender.'), { cost: 4 });
} } };
/* ---------- bar, diner ---------- */
INT_KINDS.bar = { name: 'Bar', rooms: { main(K, rec, r) {
  const { W, D } = intDims(rec, 15, 12); K.shell({ W, D, floor: 0x3a2618, wall: 0x4a2a20, ceil: 0x1a120c, trim: 0x2a1a10, lamp: 0xffc070, lightI: 0.55, hemi: 0.4 });
  K.counter(K.x0 + 1, K.z0 + 2, K.x1 - 3, K.z0 + 2.7, 0x5a3420, 0x2a1a10, 1.1); K.box(K.x0 + 1, 0, K.z0, K.x1 - 3, 2.4, K.z0 + 0.4, 0x3a2416, true);
  for (let x = K.x0 + 1.3; x < K.x1 - 3.2; x += 0.22) for (const y of [1.2, 1.7]) K.glow(x, y, K.z0 + 0.15, x + 0.08, y + 0.32, K.z0 + 0.25, [0x8ad84a, 0xd8a83a, 0x8a3a1a, 0xd8d8f0][((x * 13) | 0) & 3], 0.7);
  for (let x = K.x0 + 1.6; x < K.x1 - 3.4; x += 1.1) { K.chair(x, K.z0 + 3.3, 0, 0x8a1a1a, true); if (r() < 0.45) intSeat(K, x, K.z0 + 3.35, Math.PI, { sy: 0.25, sy0: 0.0, eat: r() < 0.5 }); }
  intStaff(K, 0, K.z0 + 1.3, 0, 0x1a1a1a, { sleeve: false });
  for (let z = K.z0 + 6; z < K.z1 - 2; z += 2.6) { K.table(K.x1 - 2, z, 1, 1, 0x3a2416, 0.75); K.box(K.x1 - 0.7, 0, z - 0.6, K.x1 - 0.1, 1.1, z + 0.6, 0x6a1a1a, true); }
  K.tv(K.x0 + 0.05, 2.2, 0, Math.PI / 2, 1.6, 0x3a9a4a); K.glow(-1.5, 2.6, K.z0 + 0.41, 1.5, 3.0, K.z0 + 0.42, 0xff3a6a, 2);
  K.act(0, K.z0 + 3.2, 1.8, 'Order a soda', () => intBuy(5, 'a soda', () => intBuzz(2), 'A cold soda with lime.'), { cost: 5 });
} } };
INT_KINDS.diner = { name: 'Diner', rooms: { main(K, rec, r) { intDiner(K, rec, r); } } };
function intDiner(K, rec, r, th) {
  th = th || { floor: 0xe8e8e8, tiles: 0x1a1a1a, wall: 0xf2e6d0, seat: 0xc8202a, top: 0xe8e4dc, staff: 0xf2f2f2, menu: 'BURGERS · FRIES · SHAKES · PIE', price: 12, meal: 'a burger and a shake' };
  const { W, D } = intDims(rec, 18, 15); K.shell({ W, D, floor: th.floor, tiles: th.tiles, wall: th.wall, trim: th.trim || 0xc8202a, lamp: th.lamp || 0xfff2d8, lightI: th.lightI || 0.85 });
  K.counter(K.x0 + 1, K.z0 + 2.2, K.x1 - 1, K.z0 + 2.9, th.counter || 0xc8202a, th.top);
  K.box(K.x0 + 1, 0, K.z0, K.x1 - 1, 1.0, K.z0 + 0.7, 0xb0b4b8, true); K.box(K.x0 + 1, 1.4, K.z0 + 0.05, K.x1 - 1, 1.42, K.z0 + 0.5, 0xb0b4b8); K.glow(K.x0 + 2, 1.7, K.z0 + 0.02, K.x0 + 3.5, 2.1, K.z0 + 0.03, 0xff8a3a, 1);
  K.sign(th.menu, 0, 2.8, K.z0 + 0.03, Math.min(W - 3, 9), 0.6, 0, { fg: th.menuFg || '#fff', bg: th.menuBg || '#c8202a' });
  intStaff(K, -1, K.z0 + 1.5, 0, th.staff, { sleeve: false }); intStaff(K, 2, K.z0 + 1.4, Math.PI / 2, th.staff, { kind: 'work', sleeve: false });
  for (let x = K.x0 + 1.5; x < K.x1 - 1.5; x += 1.2) { K.chair(x, K.z0 + 3.5, 0, th.seat, true); if (r() < 0.3) intSeat(K, x, K.z0 + 3.55, Math.PI, { sy: 0.25, eat: true }); }
  let n = 0; for (let z = K.z0 + 5.5; z < K.z1 - 1.8; z += 2.4) for (const sx of [-1, 1]) {
    const x = sx < 0 ? K.x0 + 1.4 : K.x1 - 1.4; K.table(x, z, 1.2, 0.8, th.top, 0.75); K.box(x - 0.75, 0, z - 1.0, x + 0.75, 0.48, z - 0.55, th.seat, true); K.box(x - 0.75, 0.48, z - 1.0, x + 0.75, 1.15, z - 0.85, th.seat); K.box(x - 0.75, 0, z + 0.55, x + 0.75, 0.48, z + 1.0, th.seat, true); K.box(x - 0.75, 0.48, z + 0.85, x + 0.75, 1.15, z + 1.0, th.seat);
    if (r() < 0.65 && n++ < 7) { intSeat(K, x, z - 0.7, 0, { eat: true }); if (r() < 0.5) intSeat(K, x, z + 0.7, Math.PI, { eat: true, talk: true }); }
  }
  K.act(0, K.z0 + 3.4, 2, 'Order ' + th.meal, () => intBuy(th.price, th.meal, intMeal, 'You eat ' + th.meal + '. Car topped up, and you feel great.'), { cost: th.price });
}

/* ---------- a home ---------- */
INT_KINDS.home = { name: 'Home', rooms: { main(K, rec, r) {
  const { W, D } = intDims(rec, 12, 10); const wall = [0xf2ead8, 0xdce8e0, 0xe8dcd0, 0xdce0ec][rec.seed & 3];
  K.shell({ W, D, H: 2.8, floor: 0x8a6a4a, wall, trim: 0xf2f2f2, lamp: 0xffe8c0, lightI: 0.8, noBackWin: true });
  const mx = K.x0 + W * 0.58; K.wallZ(mx, K.z0, K.z1, [[K.z1 - 3.2, K.z1 - 2.2]], wall);
  /* living room */
  K.rug(K.x0 + 1, -1.2, mx - 1, 1.6, 0x7a4a3a, 0x9a6a4a); K.sofa((K.x0 + mx) / 2, 1.2, Math.PI, 2.2, [0x5a6a7a, 0x7a5a4a, 0x4a6a4a][rec.seed % 3]); K.table((K.x0 + mx) / 2, 0, 1.2, 0.6, 0x5a3a24, 0.42);
  K.box((K.x0 + mx) / 2 - 0.9, 0, K.z0 + 0.1, (K.x0 + mx) / 2 + 0.9, 0.55, K.z0 + 0.55, 0x4a3424, true); K.tv((K.x0 + mx) / 2, 1.05, K.z0 + 0.35, 0, 1.3, 0x4a8ac0); K.lamp(K.x0 + 0.6, 1.4); K.plant(mx - 0.6, K.z1 - 0.8, 0.9);
  K.pic(K.x0 + 0.02, 1.6, 0, Math.PI / 2, 1.0, 0.7, [0x6a8aa8, 0xa86a4a, 0x6aa86a][rec.seed % 3]);
  /* kitchen and bedroom beyond the wall */
  K.counter(mx + 0.1, K.z0 + 0.1, K.x1 - 0.1, K.z0 + 0.7, 0xe8e4dc, 0x6a6a6a, 0.92); K.fridge(K.x1 - 0.5, K.z0 + 1.3, -Math.PI / 2); K.stove(mx + 1, K.z0 + 0.4, 0);
  K.table((mx + K.x1) / 2, -0.4, 1.2, 0.8, 0x8a6a4a); K.chair((mx + K.x1) / 2 - 0.4, 0.2, Math.PI); K.chair((mx + K.x1) / 2 + 0.4, 0.2, Math.PI);
  K.wallX(1.6, mx, K.x1, [[mx + 0.3, mx + 1.2]], wall); K.bed((mx + K.x1) / 2 + 0.3, K.z1 - 1.3, Math.PI / 2, [0x4a6aa0, 0xa04a5a, 0x5a8a5a][rec.seed % 3], true);
  const who = K.person({ x: (K.x0 + mx) / 2, z: 1.2, yaw: Math.PI, kind: 'sit', sy0: 0, talk: false });
  if (who) who.after = (n) => { if (Int.t > 1.5 && Int.t < 4.5) { n.talk = true; Int.say('“Er… can I help you? This is my house.”', 0.2); } else n.talk = false; };
  if (r() < 0.6) K.person({ x: mx + 1, z: K.z0 + 1.1, yaw: 0, kind: 'work' });
  K.act((K.x0 + mx) / 2, -0.4, 1.6, 'Watch their TV', () => Int.say(intNews() + ' · “Do you mind?”', 5));
  K.act((mx + K.x1) / 2, 0.6, 1.6, 'Ask for a glass of water', () => { intBuzz(1); Snd.beep(600, 0.05); Int.say('“Er… sure. Here. And then you’ll be going?”', 3); });
} } };
/* ---------- warehouse, barn ---------- */
INT_KINDS.warehouse = { name: 'Warehouse', rooms: { main(K, rec, r) {
  const { W, D } = intDims(rec, 28, 22); K.shell({ W, D, H: 6, floor: 0x7a7a74, wall: 0x9a9a94, ceil: 0x5a5a56, trim: 0xe8c81e, lamp: 0xf4f8ff, lightI: 0.9, winH: [3.5, 5.2] });
  for (let x = K.x0 + 2; x < K.x1 - 2; x += 4.5) { K.box(x - 0.6, 0, K.z0 + 1, x - 0.5, 4.5, K.z1 - 4, 0x2a5aa8); K.box(x + 0.5, 0, K.z0 + 1, x + 0.6, 4.5, K.z1 - 4, 0x2a5aa8); for (const y of [1.5, 3, 4.5]) K.box(x - 0.6, y - 0.08, K.z0 + 1, x + 0.6, y, K.z1 - 4, 0xe86a1a); K.col(x - 0.6, K.z0 + 1, x + 0.6, K.z1 - 4); for (let z = K.z0 + 1.6; z < K.z1 - 4.5; z += 1.3) for (const y of [0, 1.5, 3]) if (r() < 0.75) K.crate(x, z, 1.0, [0xa07a4a, 0x8a6a3a, 0x6a7a8a][(r() * 3) | 0], y + 0.02); }
  K.box(K.x1 - 4, 0, K.z1 - 3, K.x1 - 2.4, 1.3, K.z1 - 1.2, 0xe8b81e, true); K.box(K.x1 - 3.9, 1.3, K.z1 - 2.2, K.x1 - 2.5, 2.3, K.z1 - 1.3, 0x2a2a2a); K.box(K.x1 - 4.2, 0, K.z1 - 3.6, K.x1 - 4.1, 2.6, K.z1 - 3.0, 0x2a2a2a);
  K.person({ x: K.x0 + 3, z: K.z1 - 2.5, kind: 'walk', shirt: 0xe8b81e, pants: 0x2a3a5a, path: [[K.x0 + 3, K.z1 - 2.5, 2], [K.x1 - 6, K.z1 - 2.5, 3]] });
  K.act(K.x1 - 5, K.z1 - 2, 1.6, 'Lend a hand shifting boxes (earn $30)', (a) => { if (a.t && App.time - a.t < 30) { Int.say('“That’s plenty for now, thanks.”'); return; } a.t = App.time; save.money += 30; writeSave(); Snd.beep(700, 0.05); Int.say('Ten minutes of lifting. The foreman hands you $30.'); });
} } };
INT_KINDS.barn = { name: 'Barn', rooms: { main(K, rec, r) {
  const { W, D } = intDims(rec, 22, 16); K.shell({ W, D, H: 5.5, floor: 0x8a7050, wall: 0x7a3a2a, ceil: 0x4a2a1a, trim: 0x4a2a1a, lamp: 0xffd8a0, lightI: 0.7, win: false });
  for (let x = K.x0 + 1; x < K.x1 - 1; x += 1.4) for (let y = 0; y < 3; y++) if (x < K.x0 + 6 || y === 0) K.box(x, y * 0.6, K.z0 + 0.3, x + 1.2, y * 0.6 + 0.58, K.z0 + 1.1, 0xd8b84a, y === 0);
  for (let z = K.z0 + 3; z < K.z1 - 2; z += 3) { K.box(K.x1 - 3, 0, z - 0.05, K.x1, 1.3, z + 0.05, 0x6a4a2a, true); } K.box(K.x1 - 3, 0, K.z0 + 3, K.x1 - 2.95, 1.3, K.z1 - 2, 0x6a4a2a);
  K.box(K.x0 + 2, 0.5, 0, K.x0 + 5, 1.6, 1.8, 0x2a7a3a, true); K.cyl(K.x0 + 2.3, 0, -0.1, 0.55, 0.12, 0x1a1a1a); K.cyl(K.x0 + 4.6, 0, 1.9, 0.8, 0.14, 0x1a1a1a); K.box(K.x0 + 4, 1.6, 0.2, K.x0 + 5, 2.6, 1.6, 0x2a7a3a);
  K.person({ x: 0, z: 1.5, kind: 'work', shirt: 0x3a5a8a, pants: 0x2a3a5a, hat: { k: 'cap', c: lc(0xd8302a), bc: null } });
  K.act(0, 2.5, 1.6, 'Help with the hay (earn $25)', (a) => { if (a.t && App.time - a.t < 30) { Int.say('“We’re good for now, thanks partner.”'); return; } a.t = App.time; save.money += 25; writeSave(); Snd.beep(700, 0.05); Int.say('You stack bales until your arms ache. $25.'); });
} } };
