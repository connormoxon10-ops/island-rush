/* ================= BUILDINGS: every town building has a door and an inside =================
   genTownLots (04_chunks.js) reports each building it raises (its footprint, height and what sort of building it is); this gives it a kind,
   a name, a front door on the street side (with a frame, a step, a lamp, an awning or a sign) and registers it, so walking up to the door and
   pressing E takes you inside (08_int_core.js). Most buildings are ordinary (offices, shops, cafés, homes, warehouses, barns: 08_int_gen.js);
   each town also has its own special ones, planned once per town on fixed lots: banks, apartment blocks, gyms, indoor pools, restaurants,
   clothing shops, car dealerships and the county jail (08_int_spec.js). Specials show on the map. */
const Bld = { lots: new Map(), plans: new Map(), near: null, sites: [], sigMat: new Map() };
/* specials by town (order follows REG: harbor, desert, farm, tropic, alpine, lake, city) */
const BLD_SPECIAL = [
  ['bank', 'apts', 'gym', 'dealer', 'resto', 'resto', 'clothes'],
  ['bank', 'apts', 'dealer', 'resto', 'clothes'],
  ['apts', 'resto', 'clothes'],
  ['apts', 'gym', 'pool', 'resto', 'resto', 'clothes'],
  ['apts', 'pool', 'resto', 'clothes'],
  ['bank', 'apts', 'gym', 'pool', 'resto', 'clothes'],
  ['reserve', 'bank', 'jail', 'apts', 'apts', 'gym', 'pool', 'dealer', 'resto', 'resto', 'clothes', 'clothes']
];
const BLD_NAMES = {
  bank: ['Harbor Trust Bank', 'Mesa Savings & Loan', '', '', '', 'Lakeshore Credit Union', 'First Fairhaven Bank'], reserve: ['', '', '', '', '', '', 'Island Reserve Bank'],
  apts: [['Quayside Apartments'], ['Red Rock Lofts'], ['Old Mill Flats'], ['Palm Court Residences'], ['Snowline Chalets'], ['Pinewater Apartments'], ['The Meridian Tower', 'Parkview Residences']],
  gym: ['Iron Harbor Gym', '', '', 'Palm Fitness', '', 'Lakeside Athletic Club', 'Pulse Fitness'],
  pool: ['', '', '', 'Cape Harlow Aquatic Centre', 'Summit Spa & Pool', 'Lakeshore Swim Centre', 'Fairhaven Natatorium'],
  dealer: ['Marlow Motors', 'Redstone Auto Ranch', '', '', '', '', 'Fairhaven Prestige Motors'], jail: ['', '', '', '', '', '', 'Island County Jail'],
  resto: [['The Salty Crab', 'Dockside Fish & Chips'], ['Cantina Roja'], ['Harvest Table'], ['Tiki Shack', 'Coral Grill'], ['Fondue Haus'], ['Lakeside Grill'], ['Kaito Sushi', 'Bistro Lumière']],
  clothes: [['Deckhand Outfitters'], ['Trail & Turquoise'], ['Barnyard Threads'], ['Sun & Sand Boutique'], ['Peak Outfitters'], ['Timberline Wear'], ['Maison Fairhaven', 'Uptown Threads']]
};
const BLD_ICO = { bank: ['🏦', 0x3fbf6a], reserve: ['🏦', 0xffd23a], apts: ['🏢', 0x8aa8ff], gym: ['🏋', 0xff7a3a], pool: ['🏊', 0x3ac8ff], dealer: ['🚗', 0xff4a6a], jail: ['⛓', 0x9a9aa6], resto: ['🍽', 0xffb23a], clothes: ['👕', 0xd07aff] };
const BLD_SUB = { bank: 'Bank', reserve: 'Bank · the island’s main vault', apts: 'Apartments · rooms for sale', gym: 'Gym', pool: 'Indoor pool', dealer: 'Car dealership', jail: 'County jail & police', resto: 'Restaurant', clothes: 'Clothing' };
/* generic kinds: name lists, signs */
const BLD_GEN = {
  office: { names: ['Harbourview House', 'Atlas Building', 'One Market Place', 'Sterling Tower', 'Northgate Plaza', 'Corwin & Vale', 'The Exchange', 'Pinnacle House'], sub: 'Offices', sign: false },
  cafe: { names: ['Daily Grind', 'Bean There', 'The Roastery', 'Steam & Crema', 'Little Cup'], sub: 'Café' },
  store: { names: ['Quik Stop', 'Corner Mart', '24/7 Market', 'Handy Shop'], sub: 'Convenience store' },
  pharmacy: { names: ['Island Pharmacy', 'Wellcare Chemist', 'Green Cross Pharmacy'], sub: 'Pharmacy' },
  books: { names: ['Dog-Eared Books', 'The Reading Room', 'Chapter & Verse'], sub: 'Bookshop' },
  barber: { names: ['Clean Cuts', 'The Barber Pole', 'Sharp & Co.'], sub: 'Barber' },
  bakery: { names: ['Rise & Shine Bakery', 'The Crusty Loaf', 'Sugar & Flour'], sub: 'Bakery' },
  electronics: { names: ['Circuit City', 'Volt Electronics', 'Pixel Shack'], sub: 'Electronics' },
  florist: { names: ['Petal & Stem', 'Bloom Florist', 'Wild Rose Flowers'], sub: 'Florist' },
  hardware: { names: ['Nuts & Bolts Hardware', 'Toolbox', 'Fix-It Depot'], sub: 'Hardware store' },
  laundry: { names: ['Spin Cycle', 'Suds Laundromat', 'Wash & Fold'], sub: 'Laundromat' },
  bar: { names: ['The Tipsy Gull', 'Last Orders', 'The Rusty Nail', 'Corner Tap'], sub: 'Bar' },
  diner: { names: ['Starlite Diner', 'Rosie’s', 'Route 9 Diner', 'Blue Plate'], sub: 'Diner' },
  home: { names: ['A house'], sub: 'Home', sign: false },
  warehouse: { names: ['Warehouse'], sub: 'Warehouse', sign: false },
  barn: { names: ['Barn'], sub: 'Farm barn', sign: false }
};
const BLD_SHOPMIX = { harbor: ['cafe', 'store', 'bar', 'hardware', 'diner', 'laundry', 'pharmacy', 'office'], desert: ['diner', 'store', 'hardware', 'bar', 'barber', 'pharmacy', 'cafe'], farm: ['bakery', 'hardware', 'store', 'diner', 'florist', 'cafe', 'barber'],
  tropic: ['cafe', 'florist', 'store', 'bar', 'books', 'bakery', 'electronics'], alpine: ['cafe', 'bakery', 'hardware', 'books', 'bar', 'store', 'pharmacy'], lake: ['cafe', 'books', 'bakery', 'store', 'diner', 'florist', 'barber'],
  city: ['office', 'cafe', 'electronics', 'books', 'pharmacy', 'bar', 'store', 'barber', 'laundry', 'office'] };

/* ---------- the plan of special buildings for a town: fixed lots near the middle ---------- */
Bld.plan = function (T) {
  if (Bld.plans.has(T.id)) return Bld.plans.get(T.id);
  const ti = Math.max(0, towns.indexOf(T)), list = BLD_SPECIAL[ti % BLD_SPECIAL.length], cand = [];
  for (let i = 0; i < T.N; i++) for (let j = 0; j < T.N; j++) {
    const dn = Math.max(Math.abs(i + 0.5 - T.N / 2), Math.abs(j + 0.5 - T.N / 2)); if (dn >= 2 || Home.isBlock(T, i, j)) continue;
    for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) { if ((i === SHOP_I && j === SHOP_J) || (i === VEN_I && j === VEN_J && b === 0)) continue; cand.push({ i, j, a, b, dn, h: ihash(T.id * 71 + i * 7 + a, j * 13 + b, 99) }); }
  }
  cand.sort((p, q) => (p.dn < 1) - (q.dn < 1) || p.h - q.h);   /* the middle ring first (shorter buildings), the downtown towers last */
  const plan = new Map(), seen = {}; let ci = 0;
  for (const kind of list) {
    const want = kind === 'reserve' || (kind === 'apts' && ti === 6) ? 'down' : 'any'; let k = ci;
    if (want === 'down') { k = cand.findIndex((c, n) => n >= 0 && c.dn < 1 && !c.used); } else k = cand.findIndex((c) => !c.used && c.dn >= 1);
    if (k < 0) k = cand.findIndex((c) => !c.used); if (k < 0) break;
    const c = cand[k]; c.used = true; ci++;
    const n = seen[kind] = (seen[kind] || 0); seen[kind]++; const nm = BLD_NAMES[kind] ? BLD_NAMES[kind][ti] : null, name = Array.isArray(nm) ? nm[n % nm.length] : nm || BLD_SUB[kind];
    const ls = (T.cell - 14) / 2 - 3, lx0 = T.x0 + c.i * T.cell + 7 + c.a * (T.cell - 14) / 2 + 1.5, lz0 = T.z0 + c.j * T.cell + 7 + c.b * (T.cell - 14) / 2 + 1.5;
    const S = { kind, name, ti, T, i: c.i, j: c.j, a: c.a, b: c.b, x: lx0 + ls / 2, z: c.b ? lz0 + ls + 1 : lz0 - 1, key: T.id + ':' + c.i + ':' + c.j + ':' + c.a + ':' + c.b, n };
    plan.set(S.key, S); Bld.sites.push(S);
  }
  Bld.plans.set(T.id, plan); return plan;
};
Bld.prep = function () { if (Bld.plans.size >= towns.length) return; for (const T of towns) Bld.plan(T); };

/* ---------- register a building raised by genTownLots and give it a door ---------- */
/* cat: 'tower' | 'down' | 'mid' | 'house' | 'shed' | 'barn' */
Bld.reg = function (ch, T, i, j, a, b, x0, z0, x1, z1, y0, h, cat, gbP) {
  const key = T.id + ':' + i + ':' + j + ':' + a + ':' + b, ti = Math.max(0, towns.indexOf(T)), R = REG[ti % REG.length], plan = Bld.plan(T), sp = plan.get(key), seed = (ihash(T.id * 37 + i, j * 11 + a * 3 + b, 5) * 4294967296) >>> 0;
  let rec = Bld.lots.get(key);
  if (!rec) {
    let kind, name, sub;
    if (sp) { kind = sp.kind; name = sp.name; sub = BLD_SUB[kind]; }
    else {
      kind = cat === 'tower' ? 'office' : cat === 'house' ? 'home' : cat === 'shed' ? 'warehouse' : cat === 'barn' ? 'barn' : null;
      if (!kind) { const mix = BLD_SHOPMIX[R.key] || BLD_SHOPMIX.city; kind = mix[(seed >>> 5) % mix.length]; }
      const G = BLD_GEN[kind]; name = G.names[(seed >>> 4) % G.names.length]; sub = G.sub;
      if (kind === 'home') { const st = ['Maple', 'Harbor', 'Cedar', 'Hill', 'Bay', 'Ridge', 'Mill', 'Shore'][seed % 8]; name = (10 + (seed >>> 3) % 180) + ' ' + st + ' ' + ['Street', 'Lane', 'Road', 'Avenue'][(seed >>> 7) & 3]; }
    }
    const nz = b ? 1 : -1, xm = (x0 + x1) / 2, zf = b ? z1 : z0;
    rec = { key, kind, name, sub, seed, ti, tid: T.id, town: T.name, reg: R.key, x0, z0, x1, z1, y: T.baseH, h, cat, W: x1 - x0, D: z1 - z0, special: !!sp,
      door: { x: xm, z: zf, nx: 0, nz, ox: xm, oz: zf + nz * 1.4 } };
    Bld.lots.set(key, rec);
  }
  (ch.doors || (ch.doors = [])).push(rec);
  Bld.dress(ch, rec, gbP, R);
  return rec;
};
/* the door: a frame, the door itself, a step, a lamp; shops get an awning, specials and shops a sign */
Bld.dress = function (ch, rec, gbP, R) {
  const d = rec.door, g0 = rec.y, x = d.x, z = d.z, n = d.nz, wide = rec.kind === 'dealer' || rec.kind === 'bank' || rec.kind === 'reserve' || rec.kind === 'jail' || rec.cat === 'tower', dw = wide ? 1.6 : rec.kind === 'home' ? 0.6 : rec.kind === 'barn' || rec.kind === 'warehouse' ? 1.6 : 1.1, dh = rec.kind === 'barn' || rec.kind === 'warehouse' ? 3.4 : 2.7;
  const B = (a0, b0, c0, a1, b1, c1, col, k) => { const C = typeof col === 'number' ? lc(col) : col; k = k == null ? 1 : k; gbP.box(Math.min(a0, a1), b0, Math.min(c0, c1), Math.max(a0, a1), b1, Math.max(c0, c1), C.r * k, C.g * k, C.b * k); };
  const glassy = rec.cat === 'tower' || rec.kind === 'bank' || rec.kind === 'reserve' || rec.kind === 'dealer' || rec.kind === 'pool' || rec.kind === 'gym' || rec.kind === 'clothes' || rec.kind === 'electronics' || rec.kind === 'pharmacy';
  const trim = rec.kind === 'home' ? 0xe8e2d4 : rec.kind === 'barn' ? 0xf0eadb : 0x2a2d33, door = glassy ? 0x1a2a38 : rec.kind === 'home' ? [0x7a2a24, 0x2a4a6a, 0x3a5a3a, 0x5a3a24][rec.seed & 3] : rec.kind === 'barn' ? 0x8a2a20 : 0x4a3a2c;
  B(x - dw - 0.18, g0, z + n * 0.0, x + dw + 0.18, g0 + dh + 0.2, z + n * 0.08, trim);
  B(x - dw, g0, z + n * 0.08, x + dw, g0 + dh, z + n * 0.12, door, glassy ? 1.4 : 1);
  if (glassy) B(x - 0.03, g0, z + n * 0.12, x + 0.03, g0 + dh, z + n * 0.14, trim);
  else if (rec.kind !== 'barn') B(x + dw * 0.6, g0 + 1.0, z + n * 0.12, x + dw * 0.7, g0 + 1.1, z + n * 0.17, 0xc8a050);
  B(x - dw - 0.4, g0 - 0.2, z, x + dw + 0.4, g0 + 0.12, z + n * 0.9, 0x8a8a86);
  B(x + dw + 0.35, g0 + 2.2, z + n * 0.08, x + dw + 0.5, g0 + 2.5, z + n * 0.25, 0xfff0c8, 1.6);   /* a lamp by the door */
  const shop = !BLD_GEN[rec.kind] || BLD_GEN[rec.kind].sign !== false;
  if (shop && rec.kind !== 'office') {   /* an awning */
    const col = rec.special ? lc(BLD_ICO[rec.kind] ? BLD_ICO[rec.kind][1] : 0x4a6a8a) : lc([0xc8302a, 0x2a6a4a, 0x2a4a8a, 0xd89a2a, 0x6a2a6a, 0x2a8a8a][rec.seed % 6]);
    for (let k = 0; k < 6; k++) B(x - dw - 0.9 + k * (2 * dw + 1.8) / 6, g0 + dh + 0.35, z + n * 0.1, x - dw - 0.9 + (k + 1) * (2 * dw + 1.8) / 6, g0 + dh + 0.45, z + n * 1.3, k % 2 ? col : lc(0xf2efe6), 1);
  }
  if (shop || rec.special) {
    const W = Math.min(rec.W - 2, Math.max(6, rec.name.length * 0.62)), H = 1.15, yy = g0 + dh + (shop && rec.kind !== 'office' ? 1.35 : 0.9);
    const key = rec.name + '|' + rec.kind; let mat = Bld.sigMat.get(key);
    if (!mat) { const ic = BLD_ICO[rec.kind], fg = rec.special && ic ? _hexCss(ic[1]) : '#f4f0e6'; mat = new THREE.MeshBasicMaterial({ map: ikText(rec.name.toUpperCase(), { w: 1024, h: 160, fg, bg: '#101318', bar: rec.special && ic ? _hexCss(ic[1]) : null }), color: new THREE.Color(1.2, 1.2, 1.2) }); Bld.sigMat.set(key, mat); }
    const m = new THREE.Mesh(new THREE.PlaneGeometry(W, H), mat); m.position.set(x - ch.x0, yy, z + n * 0.14 - ch.z0); m.rotation.y = n > 0 ? 0 : Math.PI; ch.group.add(m);
  }
};

/* ---------- the door in reach ---------- */
Bld.tick = function () {
  let best = null;
  if (App.mode === 'play' && !Fly.on && !Boat.on && !Mi && !Talk.on && !GAR.edit && !Bust.on && !Tow.on && !Rally.on && !Derby.on && !Drag.on && !Surf.on && !Dunes.on && car.wrecked <= 0 && !devOn('free') && Fare.phase !== 'ride' && Heist.phase === 'idle' && (Foot.on || Math.abs(car.speed) < 2.5)) {
    const ccx = Math.floor(Pl.x / CHUNK), ccz = Math.floor(Pl.z / CHUNK), lim = Foot.on ? 2.2 : 7; let bd = lim * lim;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const ch = Chunks.get(ccx + dx, ccz + dz); if (!ch || !ch.doors) continue;
      for (const r of ch.doors) { const ex = Pl.x - (r.door.x + r.door.nx * 0.9), ez = Pl.z - (r.door.z + r.door.nz * 0.9), d2 = ex * ex + ez * ez; if (d2 < bd) { bd = d2; best = r; } }
    }
  }
  Bld.near = best;
};
Bld.enter = function () { const r = Bld.near; if (!r) return; Int.enter(r); };

/* ---------- map ---------- */
Bld.drawMini = function (g) { };
Bld.drawFull = function (g, k) {
  Bld.prep();
  for (const S of Bld.sites) {
    const ic = BLD_ICO[S.kind]; if (!ic) continue; const s = FM.toScreen(S.x, S.z), r = 5.5 * k;
    g.fillStyle = _hexCss(ic[1]); g.strokeStyle = '#06090e'; g.lineWidth = 2 * k; g.beginPath(); g.arc(s[0], s[1], r, 0, TAU); g.fill(); g.stroke();
    g.font = Math.round(7.5 * k) + 'px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText(ic[0], s[0], s[1] + 0.5 * k);
  }
};
/* the nearest special of a kind (for GPS) */
Bld.nearest = function (kind, x, z) { Bld.prep(); let best = null, bd = 1e18; for (const S of Bld.sites) if (S.kind === kind || (kind === 'bank' && S.kind === 'reserve')) { const d = (S.x - x) ** 2 + (S.z - z) ** 2; if (d < bd) { bd = d; best = S; } } return best; };
