/* ================= WILDLIFE =================
   Animals live out in the countryside around you, each kind where it belongs: deer and rabbits in the woods and hills, cows, sheep and horses on
   the farms, mountain goats on the alpine slopes and on Mount Cinder, camels in the desert, zebras, elephants and giraffes on the savanna,
   flamingos and crocodiles in the swamp, penguins and white foxes in the tundra, monkeys in the jungle, crabs on the sand, gulls over the shore.
   They come in herds, graze, wander, and scatter when you come at them fast (cows and elephants hold their ground; a crocodile takes its time).
   Hit one and it is thrown, staggers up and runs off, and your car takes the knock: a rabbit is nothing, a cow is a crash, an elephant stops you.
   They are spawned around you as you go (never in towns or on roads) and leave when you are far away. Built from simple shapes; legs walk, rabbits
   hop, penguins waddle, crabs scuttle sideways and gulls flap. */
const Wild = { list: [], grp: null, t: 0, spawnT: 0, mats: {}, on: true };
const WILD_G = {};
function wildGeo() {
  if (WILD_G.sph) return WILD_G;
  WILD_G.sph = new THREE.SphereGeometry(0.5, 14, 10); WILD_G.cyl = new THREE.CylinderGeometry(0.5, 0.5, 1, 8); WILD_G.cylT = new THREE.CylinderGeometry(0.5, 0.32, 1, 8);   /* thick where it joins, thinner at the end */ WILD_G.cone = new THREE.ConeGeometry(0.5, 1, 8);
  for (const k of ['cyl', 'cylT', 'cone']) WILD_G[k].translate(0, -0.5, 0);   /* hung from the top, so it can swing from a hip or a shoulder */
  WILD_G.box = new THREE.BoxGeometry(1, 1, 1); return WILD_G;
}
function wildMat(hex, rough) { const k = hex + ':' + (rough || 0.85); return Wild.mats[k] || (Wild.mats[k] = new THREE.MeshStandardMaterial({ color: lc(hex), roughness: rough || 0.85, metalness: 0 })); }
/* zebra stripes */
function wildStripeMat() {
  if (Wild.mats.stripe) return Wild.mats.stripe; const c = mkCanvas(64, 64), g = c.getContext('2d'); g.fillStyle = '#f2f0ea'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#141414';
  for (let i = 0; i < 8; i++) { g.beginPath(); g.moveTo(i * 8, 0); g.bezierCurveTo(i * 8 + 4, 22, i * 8 - 3, 42, i * 8 + 2, 64); g.lineTo(i * 8 + 5, 64); g.bezierCurveTo(i * 8, 42, i * 8 + 7, 22, i * 8 + 3.5, 0); g.fill(); }
  const t = canvasTex(c, true, true); t.repeat.set(3, 1); return (Wild.mats.stripe = new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 }));
}
/* a part: geometry g, material m, at (x, y, z), scaled (sx, sy, sz), rotated (rx, ry, rz), into parent p */
function wp(p, g, m, x, y, z, sx, sy, sz, rx, ry, rz) { const o = new THREE.Mesh(wildGeo()[g], m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.rotation.set(rx || 0, ry || 0, rz || 0); o.castShadow = false; p.add(o); return o; }
function wpivot(p, x, y, z) { const q = new THREE.Group(); q.position.set(x, y, z); p.add(q); return q; }
/* a four-legged animal: body length L, hip height H, body width W, colours, a neck and a head, and extras */
function wildQuad(o) {
  const root = new THREE.Group(), bod = wpivot(root, 0, 0, 0), M = wildMat(o.col), Mb = o.belly ? wildMat(o.belly) : M, Md = wildMat(o.dark || 0x1a1410), L = o.L, H = o.H, W = o.W, BH = o.BH || W * 0.95;
  const by = H + BH * 0.35;
  wp(bod, 'sph', o.stripe ? wildStripeMat() : M, 0, by, 0, W, BH, L);
  if (o.belly) wp(bod, 'sph', Mb, 0, by - BH * 0.18, 0, W * 0.8, BH * 0.7, L * 0.8);
  if (o.hump) wp(bod, 'sph', M, 0, by + BH * 0.45, -L * 0.05, W * 0.6, BH * 0.7, L * 0.35);
  if (o.wool) for (const [x, y, z] of [[0, 0.2, 0.25], [0.2, 0.05, -0.2], [-0.2, 0.05, -0.2], [0, 0.25, -0.1], [0.18, 0.15, 0.15], [-0.18, 0.15, 0.15]]) wp(bod, 'sph', M, x * W * 1.2, by + y * BH, z * L, W * 0.65, BH * 0.65, L * 0.45);
  if (o.spots) for (const [x, y, z, s] of [[0.42, 0.1, 0.15, 0.4], [-0.43, 0.05, -0.2, 0.35], [0.4, 0.15, -0.3, 0.3], [-0.38, 0.2, 0.25, 0.3], [0, 0.42, -0.05, 0.38]]) wp(bod, 'sph', Md, x * W, by + y * BH, z * L, W * s * 0.6, BH * s * 0.7, L * s * 0.55);
  /* legs, hung from the hips and shoulders */
  const legs = [], lt = o.legT || W * 0.18;
  for (const [sx, sz, ph] of [[-1, 1, 0], [1, 1, Math.PI], [-1, -1, Math.PI], [1, -1, 0]]) { const pv = wpivot(bod, sx * W * 0.3, H + 0.04, sz * L * 0.32); wp(pv, 'cylT', o.legCol ? wildMat(o.legCol) : M, 0, 0, 0, lt, H, lt); if (o.hoof) wp(pv, 'cyl', Md, 0, -H + 0.04, 0, lt * 1.1, 0.06, lt * 1.1); legs.push({ pv, ph }); }
  /* neck and head */
  const nk = wpivot(bod, 0, by + BH * 0.15, L * 0.42), na = o.neckA != null ? o.neckA : 0.7, nl = o.neckL != null ? o.neckL : L * 0.3;
  nk.rotation.x = -(Math.PI / 2 + na); wp(nk, 'cylT', o.stripe ? wildStripeMat() : M, 0, 0, 0, W * (o.neckW || 0.42), nl, W * (o.neckW || 0.42));
  const hd = wpivot(nk, 0, -nl, 0); hd.rotation.x = Math.PI / 2 + na + (o.headTilt || 0.2);   /* level again, nose a little down */
  const hs = o.headS || W * 0.42; wp(hd, 'sph', M, 0, 0, hs * 0.35, hs * 0.75, hs * 0.75, hs * 1.4); wp(hd, 'sph', o.snout != null ? wildMat(o.snout) : M, 0, -hs * 0.12, hs * 1.0, hs * 0.5, hs * 0.45, hs * 0.6);
  for (const s of [-1, 1]) { wp(hd, 'sph', wildMat(0x0a0a0a, 0.3), s * hs * 0.3, hs * 0.12, hs * 0.75, hs * 0.1, hs * 0.1, hs * 0.1); if (o.ears !== false) wp(hd, 'cone', M, s * hs * 0.32, hs * (o.earLong ? 0.95 : 0.55), -hs * 0.1, hs * 0.18, o.earLong ? hs * 0.9 : hs * 0.4, hs * 0.1, 0, 0, Math.PI - s * 0.35); }
  if (o.antlers) for (const s of [-1, 1]) { const a = wpivot(hd, s * hs * 0.22, hs * 0.4, 0); a.rotation.z = -s * 0.5; wp(a, 'cyl', wildMat(0x8a6a44), 0, 0.5 * hs * 2, 0, hs * 0.07, hs * 1.0, hs * 0.07, Math.PI); for (const t of [0.4, 0.75]) wp(a, 'cyl', wildMat(0x8a6a44), 0, t * hs * 2, 0, hs * 0.05, hs * 0.45, hs * 0.05, Math.PI - 0.9, 0, 0); }
  if (o.horns) for (const s of [-1, 1]) wp(hd, 'cone', wildMat(o.hornCol || 0xd8ccb0), s * hs * 0.28, hs * 0.75, 0, hs * 0.13, hs * (o.hornL || 0.5), hs * 0.13, Math.PI - 0.3, 0, -s * 0.5);
  if (o.trunk) { let p = wpivot(hd, 0, -hs * 0.1, hs * 1.15); for (let i = 0; i < 4; i++) { wp(p, 'cylT', M, 0, 0, 0, hs * 0.22 * (1 - i * 0.15), hs * 0.4, hs * 0.22 * (1 - i * 0.15)); p = wpivot(p, 0, -hs * 0.38, 0); p.rotation.x = 0.25; } }
  if (o.bigEars) for (const s of [-1, 1]) wp(hd, 'sph', M, s * hs * 0.65, 0, hs * 0.1, hs * 0.08, hs * 0.9, hs * 0.75, 0, s * 0.35, 0);
  if (o.mane) wp(nk, 'box', Md, 0, -nl * 0.45, -W * 0.14, W * 0.06, nl * 0.9, W * 0.1);
  /* tail */
  const tl = wpivot(bod, 0, by + BH * 0.2, -L * 0.48); tl.rotation.x = o.tailUp ? 2.4 : 0.35;
  wp(tl, o.bushy ? 'sph' : 'cylT', o.tailCol ? wildMat(o.tailCol) : M, 0, o.bushy ? -L * 0.18 : 0, 0, o.bushy ? W * 0.28 : W * 0.06, o.tailL || L * 0.3, o.bushy ? W * 0.28 : W * 0.06);
  if (o.tip) wp(tl, 'sph', wildMat(o.tip), 0, -(o.tailL || L * 0.3) * 0.9, 0, W * 0.2, W * 0.25, W * 0.2);
  return { root, bod, legs, head: hd, neck: nk, tail: tl };
}
/* the odd ones: a penguin, a flamingo, a crab, a crocodile, a gull */
function wildPenguin() {
  const root = new THREE.Group(), bod = wpivot(root, 0, 0, 0), K = wildMat(0x14161c), Wt = wildMat(0xf2f2ee), Or = wildMat(0xf0a020);
  wp(bod, 'sph', K, 0, 0.36, 0, 0.36, 0.62, 0.32); wp(bod, 'sph', Wt, 0, 0.34, 0.06, 0.28, 0.5, 0.25); wp(bod, 'sph', K, 0, 0.74, 0.02, 0.24, 0.22, 0.22); wp(bod, 'cone', Or, 0, 0.74, 0.16, 0.05, 0.12, 0.05, -Math.PI / 2);
  for (const s of [-1, 1]) { wp(bod, 'sph', Wt, s * 0.06, 0.78, 0.1, 0.05, 0.05, 0.03); wp(bod, 'sph', K, s * 0.19, 0.42, 0, 0.06, 0.3, 0.14, 0, 0, s * 0.25); wp(bod, 'sph', Or, s * 0.08, 0.03, 0.06, 0.08, 0.04, 0.14); }
  return { root, bod, legs: [], head: null, waddle: true };
}
function wildFlamingo() {
  const root = new THREE.Group(), bod = wpivot(root, 0, 0, 0), P = wildMat(0xf08aa8), K = wildMat(0x1a1a1a), legs = [];
  wp(bod, 'sph', P, 0, 0.95, 0, 0.32, 0.3, 0.5);
  for (const [s, ph] of [[-1, 0], [1, Math.PI]]) { const pv = wpivot(bod, s * 0.06, 0.85, 0); wp(pv, 'cyl', wildMat(0xe07890), 0, 0, 0, 0.025, 0.85, 0.025); legs.push({ pv, ph }); }
  const nk = wpivot(bod, 0, 1.0, 0.2); nk.rotation.x = -(Math.PI / 2 + 1.35); wp(nk, 'cyl', P, 0, 0, 0, 0.05, 0.42, 0.05); const n2 = wpivot(nk, 0, -0.42, 0); n2.rotation.x = 0.9; wp(n2, 'cyl', P, 0, 0, 0, 0.045, 0.3, 0.045);
  const hd = wpivot(n2, 0, -0.32, 0); wp(hd, 'sph', P, 0, 0, 0, 0.1, 0.1, 0.12); wp(hd, 'cone', K, 0, -0.02, 0.06, 0.035, 0.14, 0.035, -2.2);
  wp(bod, 'cone', P, 0, 0.98, -0.3, 0.12, 0.2, 0.06, -1.3);
  return { root, bod, legs, head: hd, neck: nk };
}
function wildCrab() {
  const root = new THREE.Group(), bod = wpivot(root, 0, 0, 0), R = wildMat(0xc8402a), legs = [];
  wp(bod, 'sph', R, 0, 0.1, 0, 0.32, 0.1, 0.24); for (const s of [-1, 1]) { wp(bod, 'sph', wildMat(0x101010, 0.3), s * 0.05, 0.17, 0.11, 0.025, 0.04, 0.025); const c = wpivot(bod, s * 0.16, 0.1, 0.12); c.rotation.y = s * 0.5; wp(c, 'sph', R, 0, 0, 0.08, 0.08, 0.06, 0.12); legs.push({ pv: c, ph: s > 0 ? 0 : Math.PI, claw: true }); }
  for (let i = 0; i < 3; i++) for (const s of [-1, 1]) { const pv = wpivot(bod, s * 0.14, 0.1, 0.06 - i * 0.07); pv.rotation.z = s * 2.2; wp(pv, 'cyl', R, 0, 0, 0, 0.02, 0.16, 0.02); legs.push({ pv, ph: i * 2 + (s > 0 ? Math.PI : 0), side: s }); }
  return { root, bod, legs, head: null, crab: true };
}
function wildCroc() {
  const root = new THREE.Group(), bod = wpivot(root, 0, 0, 0), G = wildMat(0x5a7a3a), B = wildMat(0xb8b07a), legs = [];
  wp(bod, 'sph', G, 0, 0.22, 0, 0.55, 0.28, 1.4); wp(bod, 'sph', B, 0, 0.16, 0, 0.45, 0.16, 1.2);
  const hd = wpivot(bod, 0, 0.24, 0.65); wp(hd, 'sph', G, 0, 0, 0.35, 0.34, 0.18, 0.85); for (const s of [-1, 1]) wp(hd, 'sph', wildMat(0xd8c020, 0.3), s * 0.1, 0.09, 0.1, 0.05, 0.05, 0.05);
  const tl = wpivot(bod, 0, 0.22, -0.65); tl.rotation.x = Math.PI / 2; wp(tl, 'cylT', G, 0, 0, 0, 0.3, 1.5, 0.18);
  for (const [sx, sz, ph] of [[-1, 1, 0], [1, 1, Math.PI], [-1, -1, Math.PI], [1, -1, 0]]) { const pv = wpivot(bod, sx * 0.28, 0.2, sz * 0.38); pv.rotation.z = sx * 0.9; wp(pv, 'cylT', G, 0, 0, 0, 0.08, 0.22, 0.08); legs.push({ pv, ph }); }
  return { root, bod, legs, head: hd, tail: tl, croc: true };
}
function wildGull() {
  const root = new THREE.Group(), bod = wpivot(root, 0, 0, 0), Wt = wildMat(0xf4f4f0), Gy = wildMat(0x8a9098), Or = wildMat(0xe0b020);
  wp(bod, 'sph', Wt, 0, 0, 0, 0.18, 0.16, 0.42); wp(bod, 'sph', Wt, 0, 0.06, 0.2, 0.12, 0.12, 0.13); wp(bod, 'cone', Or, 0, 0.05, 0.28, 0.025, 0.08, 0.025, -Math.PI / 2);
  const wings = []; for (const s of [-1, 1]) { const pv = wpivot(bod, s * 0.06, 0.03, 0); const w = wp(pv, 'box', Gy, s * 0.36, 0, 0, 0.72, 0.02, 0.24); w.position.x = s * 0.36; wings.push({ pv, s }); }
  return { root, bod, legs: [], head: null, wings };
}
/* the kinds: how to build one, how big and heavy it is, how fast, how skittish, how many together, and where it lives */
const WILD_KINDS = {
  deer: { name: 'Deer', b: (r) => wildQuad({ L: 1.4, H: 0.78, W: 0.5, BH: 0.52, col: 0x8a5a34, belly: 0xd8c0a0, legT: 0.085, neckL: 0.45, neckA: 1.0, headS: 0.24, antlers: r() < 0.4, tailL: 0.15, hoof: true }), r: 0.7, m: 0.5, walk: 1.1, run: 9, flee: 34, herd: [2, 5] },
  rabbit: { name: 'Rabbit', b: () => wildQuad({ L: 0.32, H: 0.09, W: 0.2, BH: 0.2, col: 0x9a8a72, neckL: 0.04, headS: 0.12, earLong: true, tailL: 0.05, bushy: true, tailCol: 0xf2f2ee, legT: 0.04 }), r: 0.25, m: 0.03, walk: 0.8, run: 7, flee: 16, herd: [1, 3], hop: true },
  fox: { name: 'Fox', b: () => wildQuad({ L: 0.75, H: 0.3, W: 0.26, col: 0xc8642a, belly: 0xf2e8d8, legCol: 0x2a1a10, neckL: 0.14, headS: 0.17, tailL: 0.45, bushy: true, tip: 0xf2f2ee, legT: 0.05 }), r: 0.4, m: 0.08, walk: 1.2, run: 8, flee: 26, herd: [1, 1] },
  snowfox: { name: 'Arctic fox', b: () => wildQuad({ L: 0.7, H: 0.28, W: 0.26, col: 0xf2f4f6, legCol: 0xe8eaee, neckL: 0.12, headS: 0.16, tailL: 0.42, bushy: true, legT: 0.05 }), r: 0.4, m: 0.07, walk: 1.2, run: 8, flee: 26, herd: [1, 2] },
  cow: { name: 'Cow', b: () => wildQuad({ L: 2.0, H: 0.75, W: 0.75, BH: 0.8, col: 0xf0ece4, dark: 0x1c1a18, spots: true, snout: 0xd8a0a0, neckL: 0.35, neckA: 0.35, headS: 0.32, horns: true, hornL: 0.3, tailL: 0.7, tip: 0x1c1a18, hoof: true, legT: 0.13 }), r: 1.2, m: 1.0, walk: 0.7, run: 3, flee: 6, herd: [3, 6], stubborn: true },
  sheep: { name: 'Sheep', b: () => wildQuad({ L: 1.0, H: 0.4, W: 0.55, BH: 0.55, col: 0xece6d8, wool: true, legCol: 0x1a1612, snout: 0x2a2420, neckL: 0.1, neckA: 0.4, headS: 0.2, tailL: 0.1, legT: 0.06 }), r: 0.6, m: 0.3, walk: 0.7, run: 5, flee: 18, herd: [4, 8] },
  horse: { name: 'Horse', b: (r) => wildQuad({ L: 1.9, H: 1.0, W: 0.55, BH: 0.65, col: [0x6a3a1a, 0x2a1a10, 0xc8a070, 0x8a8a8a][Math.floor(r() * 4)], dark: 0x1a1210, neckL: 0.7, neckA: 1.0, headS: 0.28, mane: true, tailL: 0.7, hoof: true, legT: 0.14 }), r: 1.0, m: 0.9, walk: 1.2, run: 11, flee: 22, herd: [2, 4] },
  goat: { name: 'Mountain goat', b: () => wildQuad({ L: 1.0, H: 0.55, W: 0.42, BH: 0.5, col: 0xe8e4dc, horns: true, hornL: 0.6, hornCol: 0x3a3430, neckL: 0.25, neckA: 0.9, headS: 0.2, tailL: 0.1, hoof: true, legT: 0.1 }), r: 0.55, m: 0.35, walk: 0.9, run: 7, flee: 20, herd: [2, 5] },
  camel: { name: 'Camel', b: () => wildQuad({ L: 2.0, H: 1.25, W: 0.6, BH: 0.65, col: 0xc89a5a, hump: true, neckL: 0.85, neckA: 0.55, headTilt: 0.9, headS: 0.26, tailL: 0.5, legT: 0.14 }), r: 1.1, m: 1.0, walk: 1.0, run: 5, flee: 10, herd: [2, 4] },
  zebra: { name: 'Zebra', b: () => wildQuad({ L: 1.8, H: 0.85, W: 0.55, BH: 0.65, col: 0xf2f0ea, stripe: true, dark: 0x141414, neckL: 0.6, neckA: 1.0, headS: 0.26, mane: true, tailL: 0.5, tip: 0x141414, hoof: true, legT: 0.12, legCol: 0xe8e4dc }), r: 1.0, m: 0.8, walk: 1.1, run: 12, flee: 30, herd: [4, 8] },
  elephant: { name: 'Elephant', b: () => wildQuad({ L: 3.4, H: 1.5, W: 1.6, BH: 1.7, col: 0x7a7672, neckL: 0.2, neckA: 0.3, headS: 0.85, trunk: true, bigEars: true, horns: true, hornL: 0.9, hornCol: 0xf2ecdc, ears: false, tailL: 0.8, legT: 0.32 }), r: 2.0, m: 4.0, walk: 0.9, run: 4, flee: 0, herd: [2, 5], stubborn: true },
  giraffe: { name: 'Giraffe', b: () => wildQuad({ L: 1.9, H: 1.8, W: 0.55, BH: 0.7, col: 0xd8a050, dark: 0x6a3a14, spots: true, neckL: 2.0, neckA: 1.25, headS: 0.25, horns: true, hornL: 0.4, hornCol: 0x6a3a14, tailL: 0.7, tip: 0x2a1a10, legT: 0.12 }), r: 1.1, m: 1.5, walk: 1.0, run: 8, flee: 22, herd: [1, 3] },
  monkey: { name: 'Monkey', b: () => wildQuad({ L: 0.55, H: 0.3, W: 0.28, BH: 0.32, col: 0x6a4428, snout: 0xd8b090, neckL: 0.08, headS: 0.18, tailL: 0.7, tailUp: true, legT: 0.05 }), r: 0.35, m: 0.06, walk: 1.0, run: 6, flee: 14, herd: [3, 6], hop: true },
  penguin: { name: 'Penguin', b: wildPenguin, r: 0.35, m: 0.08, walk: 0.5, run: 1.6, flee: 10, herd: [4, 9] },
  flamingo: { name: 'Flamingo', b: wildFlamingo, r: 0.4, m: 0.08, walk: 0.6, run: 4, flee: 22, herd: [4, 9] },
  crab: { name: 'Crab', b: wildCrab, r: 0.2, m: 0.01, walk: 0.5, run: 2.5, flee: 8, herd: [2, 5] },
  croc: { name: 'Crocodile', b: wildCroc, r: 1.0, m: 1.2, walk: 0.5, run: 2.5, flee: 0, herd: [1, 2], water: true, stubborn: true },
  gull: { name: 'Gull', b: wildGull, r: 0, m: 0, walk: 9, run: 12, flee: 0, herd: [3, 6], fly: true }
};
/* who lives where: [kind, weight] for each region, the open country, and the shore */
const WILD_AT = {
  wild: [['deer', 4], ['rabbit', 3], ['fox', 1]], farm: [['cow', 4], ['sheep', 3], ['horse', 2], ['rabbit', 1]], alpine: [['goat', 3], ['deer', 3], ['sheep', 1]], lake: [['deer', 3], ['rabbit', 2], ['fox', 1]],
  desert: [['camel', 3], ['rabbit', 1]], tropic: [['monkey', 1], ['rabbit', 1]], harbor: [['rabbit', 1], ['fox', 1]], city: [['rabbit', 1]], metro: [['rabbit', 1]],
  swamp: [['croc', 2], ['flamingo', 3]], volcano: [['goat', 3]], savanna: [['zebra', 4], ['elephant', 2], ['giraffe', 2]], vineyard: [['horse', 2], ['rabbit', 3], ['fox', 1]],
  tundra: [['penguin', 3], ['snowfox', 2]], jungle: [['monkey', 4], ['croc', 1]], shore: [['crab', 3], ['gull', 3]]
};
const WILD_DESPAWN = 250, WILD_SHOW = 170, _wnr = {};
Wild.cap = () => Math.round(10 + (Q && Q.ped ? Q.ped : 30) * 0.45);
Wild.init = function () { if (Wild.grp) return; Wild.grp = new THREE.Group(); Wild.grp.name = 'wildlife'; scene.add(Wild.grp); };
Wild.clear = function () { for (const a of Wild.list) Wild.grp.remove(a.root); Wild.list.length = 0; };
/* what lives at (x, z): the region's animals, or the shore's on the sand */
Wild.kindsAt = function (x, z, h) {
  if (h < 3.2 && h > -0.4) return WILD_AT.shore; Biome.at(x, z); const key = Biome.w0 > 0.6 || Biome.top < 0 ? 'wild' : REG[Biome.top % REG.length].key;
  return WILD_AT[key] || WILD_AT.wild;
};
/* can an animal of kind K stand at (x, z)? not in a town, not on a road, not in the sea (a crocodile likes the water's edge) */
Wild.ok = function (K, x, z) {
  const h = terrainHeight(x, z); if (K.fly) return true;
  if (K.water ? h < -0.6 || h > 6 : h < 0.25) return false; if (townAt(x, z, 25)) return false;
  nearestRoad(x, z); if (NR.seg >= 0 && NR.d < NR.halfW + 5) return false; return true;
};
/* a herd (or a flock) of kind id at (x, z) */
Wild.spawn = function (id, x, z, n) {
  const K = WILD_KINDS[id]; if (!K) return []; Wild.init(); const r = Math.random, out = [], cnt = n || Math.round(K.herd[0] + r() * (K.herd[1] - K.herd[0]));
  for (let i = 0; i < cnt; i++) {
    const a = r() * TAU, d = i ? 2 + r() * 7 : 0, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d; if (!n && !Wild.ok(K, px, pz)) continue;
    const B = K.b(r), s = 0.85 + r() * 0.3; B.root.scale.setScalar(s);
    const A = Object.assign(B, { id, K, x: px, z: pz, y: terrainHeight(px, pz), yaw: r() * TAU, v: 0, vt: 0, st: 'idle', t: r() * 4, ph: r() * TAU, ax: x, az: z, tx: px, tz: pz, s, hy: 0, vy: 0, spin: 0, alt: 16 + r() * 14, ang: r() * TAU, rad: 20 + r() * 25 });
    if (K.fly) { A.y = Math.max(0, terrainHeight(x, z)) + A.alt; }
    A.root.position.set(A.x, A.y, A.z); Wild.grp.add(A.root); Wild.list.push(A); out.push(A);
  }
  return out;
};
/* new herds out ahead of you, old ones gone when you are far away */
Wild.populate = function () {
  const P = Pl; for (let i = Wild.list.length - 1; i >= 0; i--) { const A = Wild.list[i]; if (Math.hypot(A.x - P.x, A.z - P.z) > WILD_DESPAWN) { Wild.grp.remove(A.root); Wild.list.splice(i, 1); } }
  if (Wild.list.length >= Wild.cap()) return;
  for (let tries = 0; tries < 6; tries++) {
    const a = Math.random() * TAU, d = 70 + Math.random() * 110, x = P.x + Math.cos(a) * d, z = P.z + Math.sin(a) * d, h = terrainHeight(x, z);
    if (h < -2 && Math.random() > 0.3) continue; const L = Wild.kindsAt(x, z, h); let sum = 0; for (const e of L) sum += e[1]; let q = Math.random() * sum, id = L[0][0]; for (const e of L) { q -= e[1]; if (q <= 0) { id = e[0]; break; } }
    if (!Wild.ok(WILD_KINDS[id], x, z)) continue; Wild.spawn(id, x, z); return;
  }
};
/* every frame: think, move, animate, and meet the car */
Wild.update = function (dt) {
  if (!Wild.on || !Wild.grp || Rally.on || Drag.on || Derby.on) { if (Wild.grp) Wild.grp.visible = false; return; }
  Wild.grp.visible = true; Wild.t += dt; Wild.spawnT -= dt; if (Wild.spawnT <= 0) { Wild.spawnT = 0.35; Wild.populate(); }
  const c = car, onFoot = Foot.on, px = Pl.x, pz = Pl.z, cs = Math.abs(c.speed);
  for (const A of Wild.list) {
    const K = A.K, dx = A.x - px, dz = A.z - pz, dd = Math.hypot(dx, dz); A.root.visible = dd < WILD_SHOW; if (dd > WILD_SHOW + 40 && A.st !== 'thrown') continue;
    if (K.fly) { Wild.fly(A, dt); continue; }
    /* thrown by the car: fly, tumble, land, stagger up, run */
    if (A.st === 'thrown') { A.vy -= 18 * dt; A.x += A.vx * dt; A.z += A.vz * dt; A.y += A.vy * dt; A.root.rotation.x += A.spin * dt; const g = terrainHeight(A.x, A.z); if (A.y <= g) { A.y = g; A.vx *= 0.5; A.vz *= 0.5; A.vy = 0; A.st = 'daze'; A.t = 1.6; } A.root.position.set(A.x, A.y, A.z); continue; }
    if (A.st === 'daze') { A.t -= dt; A.root.rotation.x *= Math.max(0, 1 - dt * 3); A.root.rotation.z = Math.sin(Wild.t * 9) * 0.15 * A.t; if (A.t <= 0) { A.root.rotation.set(0, A.yaw, 0); A.st = K.stubborn ? 'idle' : 'flee'; A.t = 4; A.fx = A.x + (A.x - px); A.fz = A.z + (A.z - pz); } A.root.position.set(A.x, A.y, A.z); continue; }
    /* a threat: a car coming fast, or you on foot close by */
    const threat = K.flee > 0 && ((!onFoot && cs > 4 && dd < K.flee) || (onFoot && dd < K.flee * 0.35));
    if (threat && A.st !== 'flee') { A.st = 'flee'; A.t = 3 + Math.random() * 2; const k = 1 / (dd || 1); A.fx = A.x + dx * k * 60; A.fz = A.z + dz * k * 60; }
    A.t -= dt;
    if (A.st === 'flee') { A.tx = A.fx; A.tz = A.fz; A.vt = K.run; if (A.t <= 0 && !threat) { A.st = 'idle'; A.t = 2; A.ax = A.x; A.az = A.z; } }
    else if (A.st === 'walk') { A.vt = K.walk; if (Math.hypot(A.tx - A.x, A.tz - A.z) < 1 || A.t <= 0) { A.st = 'idle'; A.t = 2 + Math.random() * 6; } }
    else { A.vt = 0; if (A.t <= 0) { A.st = 'walk'; A.t = 8 + Math.random() * 6; const a = Math.random() * TAU, d = 4 + Math.random() * 18; A.tx = A.ax + Math.cos(a) * d; A.tz = A.az + Math.sin(a) * d; } }
    /* move: turn toward where it is going, keep out of the sea (and out of towns) */
    const hx = A.tx - A.x, hz = A.tz - A.z, hl = Math.hypot(hx, hz); A.v += (A.vt - A.v) * Math.min(1, dt * (A.st === 'flee' ? 4 : 2));
    if (hl > 0.3 && A.v > 0.05) {
      const want = Math.atan2(hx, hz) + (A.crab ? Math.PI / 2 : 0); A.yaw += angDiff(A.yaw, want) * Math.min(1, dt * (A.st === 'flee' ? 5 : 2));
      const mx = Math.sin(A.yaw - (A.crab ? Math.PI / 2 : 0)), mz = Math.cos(A.yaw - (A.crab ? Math.PI / 2 : 0)), nx = A.x + mx * A.v * dt, nz = A.z + mz * A.v * dt, nh = terrainHeight(nx, nz);
      if ((K.water ? nh < -0.8 : nh < 0.25) || townAt(nx, nz, 10)) { A.tx = A.x - mx * 10; A.tz = A.z - mz * 10; A.fx = A.tx; A.fz = A.tz; A.v *= 0.3; } else { A.x = nx; A.z = nz; }
    }
    A.y = terrainHeight(A.x, A.z);
    /* animate: legs, a hop, a waddle, grazing */
    A.ph += dt * (2 + A.v * (K.hop ? 2.2 : 3.2)) / Math.max(0.5, A.s); const sw = Math.min(0.7, A.v * 0.25);
    for (const L of A.legs) { if (L.side) L.pv.rotation.x = Math.sin(A.ph + L.ph) * sw * 1.2; else if (L.claw) L.pv.rotation.x = Math.sin(Wild.t * 3 + L.ph) * 0.2; else L.pv.rotation.x = Math.sin(A.ph + L.ph) * sw; }
    let bob = 0; if (K.hop && A.v > 0.3) bob = Math.abs(Math.sin(A.ph)) * 0.25 * A.s; else if (A.waddle) { A.bod.rotation.z = Math.sin(A.ph) * 0.18 * Math.min(1, A.v * 2); }
    if (A.neck && A.st === 'idle' && !A.crab && !A.croc) A.neck.rotation.y = Math.sin(Wild.t * 0.7 + A.ph) * 0.25;
    if (A.tail && !A.croc) A.tail.rotation.z = Math.sin(Wild.t * 4 + A.ph) * 0.25; if (A.croc && A.tail) A.tail.rotation.y = Math.sin(A.ph) * 0.3 * Math.min(1, A.v);
    A.root.position.set(A.x, A.y + bob, A.z); A.root.rotation.y = A.yaw;
    /* the car: thrown and hurt, and the car knocked (an elephant stops it dead) */
    if (!onFoot && K.r > 0 && dd < K.r * A.s + 1.5 && c.wrecked <= 0 && Math.abs(c.y - A.y) < 2.5) {
      if (cs > 3) Wild.hit(A, c, cs);
      else { const k = (K.r * A.s + 1.5 - dd) / (dd || 1); if (K.stubborn) { c.x -= dx * k * 0.5; c.z -= dz * k * 0.5; } else { A.x += dx * k; A.z += dz * k; } }
    }
  }
};
Wild.hit = function (A, c, cs) {
  const K = A.K, m = K.m * A.s * A.s * A.s, sev = cs * Math.min(1.6, m) * 0.9;
  if (m >= 2.5) {   /* an elephant: the car stops, the elephant barely moves */
    const sp = Math.hypot(c.vx, c.vz) || 1; c.x -= c.vx / sp * 1.2; c.z -= c.vz / sp * 1.2; c.vx *= -0.15; c.vz *= -0.15; c.speed *= -0.15; A.st = 'idle'; A.t = 3;
  } else {
    const k = 1 / (0.6 + m); A.st = 'thrown'; A.vx = c.vx * 0.8 * k + (Math.random() - 0.5) * 3; A.vz = c.vz * 0.8 * k + (Math.random() - 0.5) * 3; A.vy = 3 + cs * 0.25 * k; A.spin = (Math.random() < 0.5 ? -1 : 1) * (4 + cs * 0.2);
    if (m > 0.4) { c.vx *= 1 - Math.min(0.5, m * 0.3); c.vz *= 1 - Math.min(0.5, m * 0.3); c.speed *= 1 - Math.min(0.5, m * 0.3); }
  }
  if (sev > 2.5 && !devOn('god')) { const hp0 = c.health; c.health -= Math.pow(Math.max(0, sev - 2), 1.2) * 1.1; Dmg.hit(c, sev, hp0 - c.health); App.dmg = Math.min(1, App.dmg + sev / 30); }
  Cam.shake = Math.max(Cam.shake, Math.min(2.2, sev * 0.1)); if (Snd.ok) Snd.crash(Math.min(30, sev)); Wild.hits = (Wild.hits || 0) + 1; Wild.lastHit = K.name;
  for (let i = 0; i < 10; i++) emit(Part.smoke, A.x, A.y + 0.5, A.z, (Math.random() - 0.5) * 3, 1 + Math.random() * 2, (Math.random() - 0.5) * 3, 1, 0.6, 1.6, 0.6, 0.55, 0.45, 0.35, -0.2);   /* dust and fur */
};
/* gulls: wheel round over the shore, flapping and gliding */
Wild.fly = function (A, dt) {
  A.ang += dt * A.K.walk / A.rad; const x = A.ax + Math.cos(A.ang) * A.rad, z = A.az + Math.sin(A.ang) * A.rad, g = Math.max(0, terrainHeight(x, z));
  A.yaw = Math.atan2(-Math.sin(A.ang), Math.cos(A.ang)) + Math.PI / 2; A.x = x; A.z = z; A.y += (g + A.alt + Math.sin(Wild.t * 0.5 + A.ph) * 3 - A.y) * Math.min(1, dt);
  A.root.position.set(A.x, A.y, A.z); A.root.rotation.set(0, A.yaw, -0.25);
  const flap = Math.sin(Wild.t * 0.7 + A.ph) > 0.3 ? Math.sin(Wild.t * 9 + A.ph) * 0.6 : 0.05; for (const w of A.wings) w.pv.rotation.z = w.s * flap;
};
