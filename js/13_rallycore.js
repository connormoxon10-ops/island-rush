/* ================= RALLY STAGE: the pure model =================
   "Hollow Pines": a 4.5 km point-to-point forest stage. This file has no rendering in it (the node tests load it on its own): it builds the
   centreline from a list of corners, gives it a height profile with jumps, dips, whoops and a rolling base, bakes a ground heightfield
   around it (so a ground query is a bilinear lookup), scatters the forest and lays out the breakable wall gates and pace notes.
   World coordinates are the game's (x east, z south, y up); the stage lives at a far-off origin so it never touches the island.
   Left of the direction of travel is the positive lateral offset, like the raceway; heading yaw = atan2(tx, tz), and turning left raises yaw. */
const RY_ORG = [7000, -7000];                     /* where stage-local (0,0) sits in the world */
/* corners are [kind, length m, angle deg]: 'S' straight, 'C' a bend whose curvature swells and fades (sin^2) so it turns in and out progressively; + = left */
const RY0_ELEMS = [
  ['S', 150], ['C', 150, -34], ['S', 80], ['C', 100, 42], ['C', 90, -58], ['C', 100, 36], ['S', 130],
  ['C', 80, -90], ['S', 90], ['C', 78, 148], ['S', 180], ['C', 140, -52], ['S', 120], ['C', 120, 62], ['C', 76, -74],
  ['S', 130], ['C', 92, 96], ['S', 220], ['C', 170, -42], ['S', 70], ['C', 64, -118], ['S', 120], ['C', 130, 48], ['C', 100, -48],
  ['S', 150], ['C', 74, 88], ['S', 100], ['C', 180, -32], ['S', 120], ['C', 110, 54], ['S', 330]
];
/* height features: kind, element index, metres into that element, parameters. jump = kicker ramp then a landing slope; dip = hollow; whoops = rollers */
const RY0_FEATS = [
  { k: 'jump', e: 6, at: 56, rise: 0.95, up: 16, down: 11, drop: 0.9, land: 28, name: 'Jump' },
  { k: 'whoops', e: 10, at: 24, n: 4, lam: 14, amp: 0.55 },
  { k: 'dip', e: 12, at: 14, depth: 1.5, len: 24 },
  { k: 'jump', e: 12, at: 66, rise: 0.75, up: 14, down: 11, drop: 0.65, land: 30, name: 'Blind crest' },
  { k: 'jump', e: 17, at: 96, rise: 1.3, up: 16, down: 13, drop: 1.6, land: 40, name: 'Big air' },
  { k: 'whoops', e: 22, at: 10, n: 3, lam: 12, amp: 0.5 },
  { k: 'dip', e: 24, at: 34, depth: 1.3, len: 22 },
  { k: 'jump', e: 24, at: 78, rise: 1.05, up: 14, down: 11, drop: 1.1, land: 32, name: 'Jump' },
  { k: 'whoops', e: 27, at: 30, n: 5, lam: 13, amp: 0.45 },
  { k: 'jump', e: 30, at: 150, rise: 1.35, up: 18, down: 12, drop: 1.5, land: 40, name: 'Finish jump' }
];
/* breakable plank gates across the road: element index + metres in */
const RY0_WALLS = [{ e: 8, at: 70 }, { e: 10, at: 130 }, { e: 17, at: 190 }, { e: 21, at: 85 }, { e: 26, at: 72 }, { e: 30, at: 70 }];   /* all on straights, a long run-up after the previous corner */
/* surface sections by distance: 0 hard-packed dirt, 1 loose gravel, 2 wet mud, 3 sand */
const RY0_SECS = [[0, 0], [380, 1], [900, 0], [1180, 2], [1420, 0], [1900, 1], [2400, 3], [2620, 0], [3100, 2], [3300, 1], [3900, 0]];
/* road camber of the bends, by element index: b = cross-fall slope (+ banked into the bend, the outside is higher; - off-camber, the outside drops away), m = height of the dirt lip along the
   outer edge of a banked bend (a berm you can lean on). A bend that is not listed is flat. The straights between them get a crown and a cross-fall of their own (RY.sections). */
const RY0_CAMB = {
  1: { b: 0.13, m: 0.3 }, 3: { b: 0.1, m: 0.2 }, 4: { b: 0.17, m: 0.35 }, 5: { b: -0.09, m: 0 }, 7: { b: 0.3, m: 0.7 }, 9: { b: 0.34, m: 0.8 },
  11: { b: -0.11, m: 0 }, 13: { b: 0.18, m: 0.4 }, 14: { b: 0.24, m: 0.5 }, 16: { b: 0.26, m: 0.55 }, 18: { b: 0.09, m: 0.2 }, 20: { b: 0.36, m: 0.85 },
  22: { b: -0.12, m: 0 }, 23: { b: 0.17, m: 0.35 }, 25: { b: 0.3, m: 0.7 }, 27: { b: 0.07, m: 0.2 }, 29: { b: 0.2, m: 0.4 }
};
/* solid walls beside the road: element, metres into it, length, side (+1 left, -1 right, 0 both), kind ('rock' = a rock cutting with the hillside risen behind it, 'stone' = a dry-stone wall),
   height m above the verge, and the gap m between the road edge and the face. Bank and berm put the car close to them on purpose. */
const RY0_RAILS = [
  { e: 3, at: 0, len: 190, side: -1, k: 'rock', h: 4.2, gap: 1.3 },     /* the esses: a rock face down the right */
  { e: 7, at: 0, len: 84, side: 1, k: 'stone', h: 1.5, gap: 0.9 },      /* outside of the tight right: stone retaining wall */
  { e: 9, at: 12, len: 66, side: 1, k: 'rock', h: 4.6, gap: 1.6 },       /* inside of the left hairpin: cut into the hill */
  { e: 15, at: 4, len: 122, side: 0, k: 'rock', h: 5.4, gap: 1.5 },     /* the gorge: rock both sides */
  { e: 18, at: 8, len: 150, side: 1, k: 'stone', h: 1.25, gap: 1.0 },   /* long fast right: wall along the outside */
  { e: 19, at: 0, len: 134, side: -1, k: 'rock', h: 4.0, gap: 1.4 },    /* into the right hairpin */
  { e: 23, at: 6, len: 92, side: 1, k: 'stone', h: 1.4, gap: 0.9 },
  { e: 25, at: 0, len: 80, side: -1, k: 'rock', h: 4.4, gap: 1.5 },
  { e: 29, at: 6, len: 100, side: -1, k: 'stone', h: 1.3, gap: 0.9 }
];

/* ---------- the stages ----------
   Every stage is a list of corners, height features, plank gates, surface sections, camber and walls, plus a THEME that says what the land around the road is:
   which four surfaces its section numbers mean, what grows there, and (for every stage but the forest) M(x, z), the lie of the land itself. Where a theme has an M
   the road is draped over it (smoothed, and never steeper than 12 %) and the ground off the road returns to it, so a beach really shelves into the sea on one side
   and a pass really climbs a mountain. The stage in use is copied into the RY_* tables below, which the rest of the rally reads. */
/* OBSTACLES (in a stage's obs list; they are height features too):
     ravine  a timber kicker ramp, a gap across the whole valley you have to clear, and a landing deck; fall short and you are fished out before the ramp (+5 s)
     ford    a stream across the road: the bed dips under water that drags the car and throws spray
   and, laid out from the corners: crash nets (catch fences) on the outside of fast bends, tyre walls at the apex of hairpins */
const RY_OBS = { ravine: { rise: 1.8, up: 18, span: 14, depth: 7, land: 26, drop: 1.2 }, ford: { len: 30, depth: 1.25, water: 0.5 } };
const RY_ELEMS = [], RY_FEATS = [], RY_WALLS = [], RY_SECS = [], RY_RAILS = [], RY_CAMB = {};
const RY_THEMES = {
  forest: { surf: [0, 1, 2, 3], M: null },
  beach: { surf: [8, 3, 9, 6], open: 1, tree: 0.2, trees: [8, 9, 10], edge: [8, 9, 10], under: ['grass', 'grass'], underK: 0.5, rocks: 0.4, plainOff: -4, sea: 1, blend: 22, off: { mu: 0.55, rr: 0.14, rough: 0.4, loose: 0.8 },
    M: (x, z, B) => { const h = 3.2 + 0.06 * (x - _ryCl(B, z) + B.dev); return _ryIn(h, -3, 26) + 2.4 * fbm(x * 0.018, z * 0.018, 3) * _rySm(4.5, 9, h); },
    dust: [[0.6, 0.52, 0.4], [0.84, 0.76, 0.58], [0.7, 0.78, 0.82], [0.88, 0.8, 0.62]], fogK: 0.45, tint: [1, 1.02, 1.05],
    pal: { r: [[0.55, 0.47, 0.36], [0.80, 0.72, 0.55], [0.36, 0.40, 0.38], [0.86, 0.78, 0.60]], f: [[0.84, 0.76, 0.58], [0.76, 0.68, 0.50], [0.42, 0.50, 0.24], [0.9, 0.84, 0.7]], sh: [0.78, 0.70, 0.52], far: [0.70, 0.64, 0.48], farK: 0.4, tuftK: 0, plain: [0.05, 0.25, 0.32] } },
  mountain: { surf: [0, 1, 2, 4], open: 0.9, tree: 0.3, trees: [0, 1, 2, 3], edge: [0, 2], under: ['scrub', 'grass'], underK: 0.5, rocks: 3, plainOff: -45, blend: 30, off: { mu: 0.5, rr: 0.13, rough: 0.9, loose: 0.5 }, treeLine: 0.62,
    M: (x, z, B) => { const zc = (B.z0 + B.z1) / 2, sz = (B.z1 - B.z0) * 0.5 + 60, xc = (B.x0 + B.x1) / 2, sx = (B.x1 - B.x0) * 0.9 + 200; return 30 + 150 * Math.exp(-(((z - zc) / sz) ** 2) - (((x - xc) / sx) ** 2)) + 12 * fbm(x * 0.006 + 3, z * 0.006, 3) + 2 * fbm(x * 0.03, z * 0.03, 2); },
    dust: [[0.5, 0.44, 0.38], [0.62, 0.6, 0.56], [0.26, 0.2, 0.15], [0.92, 0.94, 0.97]], fogK: 0.9, tint: [0.96, 1, 1.06],
    pal: { r: [[0.42, 0.36, 0.30], [0.56, 0.54, 0.50], [0.24, 0.19, 0.14], [0.90, 0.92, 0.95]], f: [[0.36, 0.34, 0.30], [0.27, 0.25, 0.22], [0.20, 0.27, 0.12], [0.48, 0.46, 0.42]], sh: [0.33, 0.33, 0.26], far: [0.22, 0.23, 0.24], farK: 0.8, tuftK: 0.3, plain: [0.1, 0.14, 0.1] } },
  desert: { surf: [0, 1, 6, 3], open: 1, tree: 0.07, trees: [14, 15, 16, 17], edge: [14, 15, 16, 17], under: ['scrub', 'scrub'], underK: 0.22, rocks: 2, plainOff: -6, blend: 24, off: { mu: 0.56, rr: 0.15, rough: 0.4, loose: 0.85 },
    M: (x, z) => 30 + 8 * Math.sin(x / 90 + 1) * Math.sin(z / 120 + 2) + 5 * fbm(x * 0.012, z * 0.012, 3),
    dust: [[0.74, 0.54, 0.34], [0.74, 0.64, 0.5], [0.86, 0.7, 0.46], [0.82, 0.66, 0.44]], fogK: 0.6, tint: [1.08, 1, 0.88],
    pal: { r: [[0.66, 0.46, 0.28], [0.70, 0.60, 0.46], [0.82, 0.66, 0.42], [0.78, 0.62, 0.40]], f: [[0.80, 0.62, 0.38], [0.72, 0.52, 0.30], [0.62, 0.44, 0.26], [0.86, 0.70, 0.46]], sh: [0.74, 0.56, 0.34], far: [0.62, 0.46, 0.30], farK: 0.5, tuftK: 0, plain: [0.6, 0.44, 0.27] } },
  snow: { surf: [4, 5, 7, 1], open: 0.75, tree: 0.75, trees: [11, 12, 13], edge: [11, 12, 13], under: null, rocks: 0.8, plainOff: -14, blend: 28, off: { mu: 0.42, rr: 0.16, rough: 0.35, loose: 0.9 },
    M: (x, z, B) => 80 - 0.012 * (z - B.z0) + 16 * fbm(x * 0.004 + 3, z * 0.004, 3) + 3 * fbm(x * 0.02, z * 0.02, 2),
    dust: [[0.92, 0.94, 0.97], [0.8, 0.88, 0.95], [0.97, 0.98, 1], [0.6, 0.58, 0.55]], fogK: 1.25, tint: [1.04, 1.06, 1.1],
    pal: { r: [[0.84, 0.87, 0.92], [0.62, 0.74, 0.86], [0.95, 0.96, 0.98], [0.55, 0.52, 0.48]], f: [[0.93, 0.95, 0.98], [0.86, 0.9, 0.96], [0.80, 0.86, 0.94], [0.97, 0.98, 1]], sh: [0.9, 0.92, 0.96], far: [0.6, 0.67, 0.75], farK: 0.6, tuftK: 0, plain: [0.82, 0.86, 0.92] } }
};
/* the smoothed line the road follows across the map (x at a given z), for themes whose land is laid out along the road: a shore, a valley */
function _ryCl(B, z) { const f = _ryIn((z - B.z0) / 20, 0, B.cl.length - 1.001), i = Math.floor(f); return lerp(B.cl[i], B.cl[i + 1], f - i); }
const RY_STAGES = [
  { id: 'pines', obs: [{ k: 'ravine', e: 28, at: 50, name: 'Pine gorge' }, { k: 'ford', e: 2, at: 40, name: 'Creek' }],  name: 'Hollow Pines', sub: 'Forest rally stage', theme: 'forest', seed: 7, pace: 26, elems: RY0_ELEMS, feats: RY0_FEATS, walls: RY0_WALLS, secs: RY0_SECS, camb: RY0_CAMB, rails: RY0_RAILS,
    info: 'A 3.7 km point-to-point forest stage cut through dense pine and birch. Hard-packed dirt, loose gravel, a wet mud pocket and a sandy cut, with crests, big jumps and dips.' },
  { id: 'coral', obs: [{ k: 'ravine', e: 20, at: 44, name: 'Tidal cut' }, { k: 'ford', e: 16, at: 45, name: 'Lagoon' }],  name: 'Coral Bay', sub: 'Beach rally stage', theme: 'beach', seed: 21, pace: 27.5,
    elems: [['S', 160], ['C', 160, 30], ['S', 90], ['C', 140, -48], ['S', 120], ['C', 110, 40], ['C', 100, -36], ['S', 200], ['C', 90, 62], ['S', 70], ['C', 90, -70], ['S', 150], ['C', 150, -30], ['C', 120, 44], ['S', 180], ['C', 100, -56], ['S', 90], ['C', 110, 50], ['S', 140], ['C', 130, -38], ['S', 110], ['C', 100, 34], ['S', 300]],
    feats: [{ k: 'jump', e: 7, at: 100, rise: 1.0, up: 16, down: 11, drop: 0.9, land: 30, name: 'Dune jump' }, { k: 'whoops', e: 11, at: 20, n: 5, lam: 13, amp: 0.5 }, { k: 'jump', e: 14, at: 96, rise: 1.2, up: 16, down: 12, drop: 1.3, land: 36, name: 'Big air' }, { k: 'dip', e: 18, at: 30, depth: 1.2, len: 22 }, { k: 'jump', e: 22, at: 150, rise: 1.3, up: 18, down: 12, drop: 1.4, land: 40, name: 'Finish jump' }],
    walls: [{ e: 4, at: 74 }, { e: 11, at: 118 }, { e: 18, at: 104 }, { e: 22, at: 70 }], secs: [[0, 0], [500, 1], [900, 2], [1150, 0], [1700, 3], [2000, 0], [2450, 1], [2750, 0]],
    rails: [{ e: 5, at: 0, len: 96, side: 1, k: 'stone', h: 1.2, gap: 1.0 }, { e: 12, at: 10, len: 130, side: -1, k: 'stone', h: 1.2, gap: 1.0 }],
    info: 'A 3 km blast along the shore. Fast sweepers on hard wet sand at the waterline, soft dry sand that drags the car down, tidal shallows and dune jumps, with the sea on one side and palms on the other.' },
  { id: 'eagle', obs: [{ k: 'ravine', e: 17, at: 62, name: 'Gully' }, { k: 'ford', e: 6, at: 75, name: 'Snowmelt' }],  name: 'Eagle Pass', sub: 'Mountain rally stage', theme: 'mountain', seed: 33, pace: 23,
    elems: [['S', 150], ['C', 120, 40], ['S', 110], ['C', 84, -165], ['S', 150], ['C', 84, 165], ['S', 150], ['C', 84, -165], ['S', 140], ['C', 100, 125], ['S', 200], ['C', 140, -50], ['S', 120], ['C', 110, 60], ['C', 90, -70], ['S', 160], ['C', 84, 160], ['S', 150], ['C', 84, -160], ['S', 150], ['C', 120, 50], ['S', 120], ['C', 120, -45], ['S', 300]],
    feats: [{ k: 'jump', e: 10, at: 104, rise: 0.9, up: 16, down: 11, drop: 0.9, land: 30, name: 'Summit crest' }, { k: 'dip', e: 12, at: 50, depth: 1.3, len: 22 }, { k: 'jump', e: 15, at: 84, rise: 1.0, up: 14, down: 11, drop: 1.2, land: 32, name: 'Jump' }, { k: 'whoops', e: 21, at: 26, n: 4, lam: 13, amp: 0.45 }, { k: 'jump', e: 23, at: 150, rise: 1.2, up: 18, down: 12, drop: 1.3, land: 38, name: 'Finish jump' }],
    walls: [{ e: 4, at: 84 }, { e: 8, at: 84 }, { e: 19, at: 84 }, { e: 23, at: 70 }], secs: [[0, 1], [700, 0], [1250, 3], [1800, 0], [2300, 1], [2800, 0]],
    rails: [{ e: 3, at: 0, len: 84, side: -1, k: 'rock', h: 4.6, gap: 1.6 }, { e: 5, at: 0, len: 84, side: 1, k: 'rock', h: 4.6, gap: 1.6 }, { e: 7, at: 0, len: 84, side: -1, k: 'rock', h: 4.6, gap: 1.6 }, { e: 13, at: 0, len: 110, side: -1, k: 'stone', h: 1.3, gap: 0.9 }, { e: 16, at: 0, len: 84, side: 1, k: 'rock', h: 4.4, gap: 1.6 }, { e: 18, at: 0, len: 84, side: -1, k: 'rock', h: 4.4, gap: 1.6 }],
    info: 'A 3.1 km climb over a mountain and down the far side. Stacked hairpins cut into the rock, gravel on the way up, snow across the summit, and long drops beside the road.' },
  { id: 'dunes', obs: [{ k: 'ravine', e: 18, at: 48, name: 'Arroyo' }, { k: 'ravine', e: 0, at: 128, name: 'Dry wash' }],  name: 'Sunscorch Dunes', sub: 'Desert sand rally stage', theme: 'desert', seed: 45, pace: 25.8,
    elems: [['S', 180], ['C', 150, -38], ['S', 120], ['C', 120, 55], ['S', 100], ['C', 100, -64], ['C', 100, 48], ['S', 220], ['C', 90, -80], ['S', 110], ['C', 90, 95], ['S', 160], ['C', 140, -45], ['S', 140], ['C', 110, 58], ['C', 90, -52], ['S', 200], ['C', 100, 40], ['S', 100], ['C', 120, -50], ['S', 320]],
    feats: [{ k: 'jump', e: 2, at: 60, rise: 0.9, up: 15, down: 11, drop: 0.9, land: 28, name: 'Jump' }, { k: 'whoops', e: 4, at: 16, n: 4, lam: 14, amp: 0.5 }, { k: 'jump', e: 7, at: 120, rise: 1.5, up: 18, down: 13, drop: 1.7, land: 44, name: 'Dune crest' }, { k: 'dip', e: 11, at: 50, depth: 1.5, len: 24 }, { k: 'jump', e: 13, at: 70, rise: 1.0, up: 14, down: 11, drop: 1.1, land: 32, name: 'Jump' }, { k: 'whoops', e: 16, at: 20, n: 6, lam: 13, amp: 0.5 }, { k: 'jump', e: 20, at: 160, rise: 1.4, up: 18, down: 12, drop: 1.5, land: 40, name: 'Finish jump' }],
    walls: [{ e: 7, at: 44 }, { e: 11, at: 124 }, { e: 16, at: 150 }, { e: 20, at: 70 }], secs: [[0, 0], [450, 3], [900, 2], [1150, 3], [1500, 0], [1900, 1], [2200, 3], [2600, 0]],
    rails: [{ e: 9, at: 4, len: 100, side: 0, k: 'rock', h: 5.2, gap: 1.6 }],
    info: 'A 3 km sprint across open desert. Rolling dunes, loose sand and one stretch of deep soft sand that swallows speed, a rock canyon, cactus and the biggest jump of any stage.' },
  { id: 'frost', obs: [{ k: 'ravine', e: 7, at: 46, name: 'Frozen gorge' }, { k: 'ford', e: 18, at: 45, name: 'Icy stream', ice: 1 }],  name: 'Frostfall', sub: 'Snow rally stage', theme: 'snow', seed: 57, pace: 21.5,
    elems: [['S', 150], ['C', 130, 44], ['S', 80], ['C', 100, -70], ['C', 90, 52], ['S', 140], ['C', 80, -100], ['S', 100], ['C', 80, 120], ['S', 160], ['C', 130, -48], ['C', 110, 40], ['S', 130], ['C', 90, -84], ['S', 110], ['C', 100, 66], ['S', 180], ['C', 150, -36], ['S', 90], ['C', 76, -110], ['S', 110], ['C', 100, 95], ['S', 300]],
    feats: [{ k: 'jump', e: 5, at: 70, rise: 0.8, up: 15, down: 11, drop: 0.8, land: 28, name: 'Jump' }, { k: 'dip', e: 9, at: 36, depth: 1.3, len: 22 }, { k: 'jump', e: 9, at: 104, rise: 0.9, up: 14, down: 11, drop: 1.0, land: 30, name: 'Blind crest' }, { k: 'whoops', e: 12, at: 20, n: 4, lam: 13, amp: 0.45 }, { k: 'jump', e: 16, at: 80, rise: 1.1, up: 16, down: 12, drop: 1.2, land: 34, name: 'Big air' }, { k: 'jump', e: 22, at: 150, rise: 1.2, up: 18, down: 12, drop: 1.3, land: 38, name: 'Finish jump' }],
    walls: [{ e: 12, at: 104 }, { e: 14, at: 64 }, { e: 20, at: 64 }, { e: 22, at: 70 }], secs: [[0, 0], [400, 2], [700, 0], [1000, 1], [1250, 0], [1700, 3], [1950, 0], [2300, 1], [2500, 0]],
    rails: [{ e: 6, at: 0, len: 80, side: -1, k: 'rock', h: 4.2, gap: 1.5 }, { e: 10, at: 0, len: 124, side: 1, k: 'stone', h: 1.3, gap: 0.9 }],
    info: 'A 2.7 km stage through a snowbound pine forest. Packed snow with little grip, sheet ice where there is almost none, and deep powder that grabs the wheels. Brake early.' }
];
const RY = { ready: false, GS: 2, DS: 2, seed: 7, MAXD: 108, name: 'Hollow Pines', stage: -1 };
/* choose a stage: fill the tables the rest of the rally reads. A bend with no camber of its own gets one from its angle (tight bends are banked with a berm, and every
   fifth gentle bend falls away off-camber). */
RY.use = function (i) {
  i = Math.max(0, Math.min(RY_STAGES.length - 1, i | 0)); const st = RY_STAGES[i];
  const fill = (dst, src) => { dst.length = 0; for (const v of src) dst.push(v); };
  fill(RY_ELEMS, st.elems); fill(RY_FEATS, st.feats.concat((st.obs || []).map((o) => Object.assign({}, RY_OBS[o.k], o)))); fill(RY_WALLS, st.walls); fill(RY_SECS, st.secs); fill(RY_RAILS, st.rails);
  /* crash nets: the outside of every other fast bend that has no wall there already (all of them if there are only a few), a catch fence two metres off the road */
  const nc = []; st.elems.forEach((el, e) => { if (el[0] !== 'C' || el[1] < 90 || Math.abs(el[2]) < 28 || Math.abs(el[2]) > 80) return; const out = el[2] > 0 ? -1 : 1; if (!st.rails.some((r) => r.e === e && (r.side === 0 || r.side === out))) nc.push([e, out, el[1]]); });
  (nc.length <= 3 ? nc : nc.filter((c, i) => i % 2 === 0)).slice(0, 5).forEach(([e, out, len]) => RY_RAILS.push({ e, at: Math.round(len * 0.15), len: Math.round(len * 0.8), side: out, k: 'net', h: 1.8, gap: 2.0 }));
  for (const k of Object.keys(RY_CAMB)) delete RY_CAMB[k];
  if (st.camb) Object.assign(RY_CAMB, st.camb);
  else st.elems.forEach((el, e) => { if (el[0] !== 'C') return; const a = Math.abs(el[2]), kp = 2 * a * Math.PI / 180 / el[1]; if (e % 5 === 3 && a < 60) RY_CAMB[e] = { b: -0.09, m: 0 }; else { const b = Math.round(_ryIn(0.06 + kp * 4.2, 0.07, 0.34) * 100) / 100; RY_CAMB[e] = { b, m: Math.round(b * 2.3 * 20) / 20 }; } });
  RY.stage = i; RY.st = st; RY.T = RY_THEMES[st.theme]; RY.name = st.name; RY.seed = st.seed; RY.ready = false; return st;
};
RY.railsList = function () { return RY_RAILS; };
RY.stageLen = function (i) { let L = 0; for (const e of RY_STAGES[i].elems) L += e[1]; return Math.floor(L / RY.DS) * RY.DS; };
RY.stagePar = function (i) { return RY.stageLen(i) / RY_STAGES[i].pace; };
const _ryIn = (v, a, b) => (v < a ? a : v > b ? b : v);
const _rySm = (a, b, x) => { const t = _ryIn((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/* ---------- 1. the centreline ---------- */
RY.path = function () {
  const ds = RY.DS, el = RY_ELEMS, starts = [], ang = []; let L = 0;
  for (const e of el) { starts.push(L); L += e[1]; ang.push(e[0] === 'C' ? e[2] * Math.PI / 180 : 0); }
  const N = Math.floor(L / ds) + 1, px = new Float32Array(N), pz = new Float32Array(N), th = new Float32Array(N), kk = new Float32Array(N), tx = new Float32Array(N), tz = new Float32Array(N);
  let x = 0, z = 0, h = 0, ei = 0;
  for (let i = 0; i < N; i++) {
    const s = i * ds; while (ei < el.length - 1 && s >= starts[ei] + el[ei][1]) ei++;
    px[i] = x; pz[i] = z; th[i] = h;
    let k = 0; if (el[ei][0] === 'C') { const t = (s + ds / 2 - starts[ei]) / el[ei][1], sn = Math.sin(Math.PI * _ryIn(t, 0, 1)); k = ang[ei] * 2 * sn * sn / el[ei][1]; }
    kk[i] = k; const hm = h + k * ds / 2; x += Math.sin(hm) * ds; z += Math.cos(hm) * ds; h += k * ds;
  }
  for (let i = 0; i < N; i++) { tx[i] = Math.sin(th[i]); tz[i] = Math.cos(th[i]); }
  /* the road is the polyline through the samples: each segment runs along its chord (the tangent at its start would leave a step of up to 8 cm between segments on a tight bend, which a
     banked road turns into a washboard of bumps) */
  const cx = new Float32Array(N), cz = new Float32Array(N);
  for (let i = 0; i < N; i++) { if (i < N - 1) { const dx = px[i + 1] - px[i], dz = pz[i + 1] - pz[i], l = Math.hypot(dx, dz) || 1; cx[i] = dx / l; cz[i] = dz / l; } else { cx[i] = tx[i]; cz[i] = tz[i]; } }
  RY.cx = cx; RY.cz = cz;
  RY.N = N; RY.L = (N - 1) * ds; RY.px = px; RY.pz = pz; RY.th = th; RY.kap = kk; RY.tx = tx; RY.tz = tz; RY.starts = starts;
};

/* ---------- 2. height profile ---------- */
const _ryHerm = (t, p0, p1, m0, m1, L) => { const t2 = t * t, t3 = t2 * t; return (2 * t3 - 3 * t2 + 1) * p0 + (t3 - 2 * t2 + t) * m0 * L + (-2 * t3 + 3 * t2) * p1 + (t3 - t2) * m1 * L; };
RY.featureH = function (f, u) {
  /* u = metres from the feature start. Returns [transient, permanent]: the permanent part is the step down the valley that a jump leaves behind */
  if (f.k === 'jump') {
    const up = f.up, dn = f.down, ld = f.land, tot = 1.35 * f.drop, m0 = 1.8 * f.rise / up;
    const P = u <= dn ? 0 : -tot * _rySm(0, ld, u - dn);
    let v;
    if (u <= -up) v = 0;
    else if (u < 0) v = f.rise * Math.pow((u + up) / up, 1.8);                                           /* the kicker: gets steeper toward the lip */
    else if (u < dn) v = _ryHerm(u / dn, f.rise, -f.drop, m0, -0.1, dn);                                /* rolls over the lip and the ground falls away */
    else if (u < dn + ld) v = _ryHerm((u - dn) / ld, -f.drop, -tot, -0.1, 0, ld);                       /* landing slope, then the new valley line */
    else v = -tot;
    return [v - P, P];
  }
  if (f.k === 'ravine') {   /* kicker to the lip (u = 0), the gap is cut by RY.cutH, then a landing deck that slopes away and leaves the road f.drop lower */
    const P = u <= f.span ? 0 : -f.drop * _rySm(0, f.land, u - f.span); let v;
    if (u <= -f.up) v = 0; else if (u < 0) v = f.rise * Math.pow((u + f.up) / f.up, 1.8); else if (u <= f.span) v = f.rise;
    else if (u < f.span + f.land) v = _ryHerm((u - f.span) / f.land, f.rise * 0.45, -f.drop, -0.12, 0, f.land); else v = -f.drop;
    return [v - P, P];
  }
  if (f.k === 'dip') { if (u < 0 || u > f.len) return [0, 0]; const s = Math.sin(Math.PI * u / f.len); return [-f.depth * s * s, 0]; }
  if (f.k === 'whoops') { const w = f.n * f.lam; if (u < 0 || u > w) return [0, 0]; const s = Math.sin(Math.PI * u / f.lam); return [f.amp * s * s * _rySm(0, f.lam, u) * (1 - _rySm(w - f.lam, w, u) * 0.6), 0]; }
  return [0, 0];
};
/* the cuts across the whole valley (added after the road has been fitted to the land): a ravine's trench, a stream's bed. Its walls stand 2.6 m inside the gap so the
   2 m ground grid keeps the lip and the landing edge sharp */
RY.cutH = function (f, u) {
  if (f.k === 'ravine') { if (u < 0 || u > f.span) return 0; return -(f.depth + f.rise) * _rySm(2.6, 4.4, u) * (1 - _rySm(f.span - 4.4, f.span - 2.6, u)); }
  if (f.k === 'ford') { if (u < 0 || u > f.len) return 0; const q = Math.sin(Math.PI * u / f.len); return -f.depth * Math.pow(q, 1.4); }
  return 0;
};
RY.profile = function () {
  const N = RY.N, ds = RY.DS, rnd = mulberry32(RY.seed * 31 + 5), p1 = rnd() * 6.28, p2 = rnd() * 6.28, p3 = rnd() * 6.28;
  const base = new Float32Array(N), hy = new Float32Array(N), feats = RY_FEATS.map((f) => Object.assign({ s0: RY.starts[f.e] + f.at }, f));
  const T = RY.T; let land = null;
  if (T.M) {   /* the road follows the land: sampled along the path, smoothed over 100 m, and held to a 12 % grade */
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (let i = 0; i < N; i++) { const x = RY.px[i] - RY.px[0], z = RY.pz[i] - RY.pz[0]; x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    { const nb = Math.ceil((z1 - z0) / 20) + 2, sx = new Float32Array(nb), sn = new Float32Array(nb), cl = new Float32Array(nb); for (let i = 0; i < N; i++) { const k = Math.round((RY.pz[i] - RY.pz[0] - z0) / 20); sx[k] += RY.px[i] - RY.px[0]; sn[k]++; }
      for (let k = 0; k < nb; k++) { let a = 0, n = 0; for (let j = k - 10; j <= k + 10; j++) if (j >= 0 && j < nb) { a += sx[j]; n += sn[j]; } cl[k] = n ? a / n : 0; }
      RY.B = { x0, x1, z0, z1, cl, dev: 0 }; for (let i = 0; i < N; i++) RY.B.dev = Math.max(RY.B.dev, Math.abs(RY.px[i] - RY.px[0] - _ryCl(RY.B, RY.pz[i] - RY.pz[0]))); }
    land = new Float32Array(N); for (let i = 0; i < N; i++) land[i] = T.M(RY.px[i] - RY.px[0], RY.pz[i] - RY.pz[0], RY.B);
    for (let pass = 0; pass < 2; pass++) { const src = Float32Array.from(land), W = 25; let acc = 0; for (let i = -W; i <= W; i++) acc += src[_ryIn(i, 0, N - 1)]; for (let i = 0; i < N; i++) { land[i] = acc / (2 * W + 1); acc += src[_ryIn(i + W + 1, 0, N - 1)] - src[_ryIn(i - W, 0, N - 1)]; } }
    for (let pass = 0; pass < 3; pass++) { for (let i = 1; i < N; i++) land[i] = _ryIn(land[i], land[i - 1] - 0.12 * ds, land[i - 1] + 0.12 * ds); for (let i = N - 2; i >= 0; i--) land[i] = _ryIn(land[i], land[i + 1] - 0.12 * ds, land[i + 1] + 0.12 * ds); }
    for (let pass = 0; pass < 2; pass++) { const src = Float32Array.from(land); for (let i = 0; i < N; i++) { let a = 0; for (let k = -6; k <= 6; k++) a += src[_ryIn(i + k, 0, N - 1)]; land[i] = a / 13; } }
  } else { RY.B = null; RY.plain = null; RY.sea = null; }
  for (let i = 0; i < N; i++) {
    const s = i * ds; let b = land ? land[i] : 70 - 0.011 * s + 9 * Math.sin(s / 310 + p1) + 4.2 * Math.sin(s / 137 + p2) + 1.5 * Math.sin(s / 58 + p3), t = 0;
    for (const f of feats) { const r = RY.featureH(f, s - f.s0); t += r[0]; b += r[1]; }
    base[i] = b; hy[i] = b + t;
  }
  if (land) {   /* each jump lands lower than it took off; over a whole stage that would sink the road into the land, so the drops are taken back out over the next few hundred metres */
    const d = new Float32Array(N), W = 90; for (let i = 0; i < N; i++) d[i] = base[i] - land[i];
    let acc = 0; for (let i = -W; i <= W; i++) acc += d[_ryIn(i, 0, N - 1)];
    for (let i = 0; i < N; i++) { const m = acc / (2 * W + 1); base[i] -= m; hy[i] -= m; acc += d[_ryIn(i + W + 1, 0, N - 1)] - d[_ryIn(i - W, 0, N - 1)]; }
    let lo = 1e9; for (let i = 0; i < N; i++) lo = Math.min(lo, base[i]); RY.plain = lo + (T.plainOff || 0); RY.sea = T.sea ? lo - 1.2 : null;
  }
  const cut = new Float32Array(N), wl = new Float32Array(N).fill(-1e9), mask = new Uint8Array(N);
  for (const f of feats) { if (f.k !== 'ravine' && f.k !== 'ford') continue; const a = f.s0 - (f.up || 0) - 4, b = f.s0 + (f.span || f.len) + (f.land || 0) + 4;
    let lo = 1e9; for (let i = Math.max(0, Math.floor(a / ds)); i <= Math.min(N - 1, Math.ceil(b / ds)); i++) { const c = RY.cutH(f, i * ds - f.s0); cut[i] += c; base[i] += c; hy[i] += c; mask[i] = 1; if (f.k === 'ford' && c < 0) lo = Math.min(lo, hy[i]); }
    if (f.k === 'ford') { f.wl = lo + f.water; for (let i = Math.floor(f.s0 / ds); i <= Math.ceil((f.s0 + f.len) / ds) && i < N; i++) wl[i] = f.wl; } }
  RY.cut = cut; RY.wl = wl; RY.cutMask = mask;
  RY.base = base; RY.py = hy; RY.feats = feats;
  let mx = 0, ma = 0; for (let i = 1; i < N - 1; i++) { if (RY.cutMask[i - 1] || RY.cutMask[i] || RY.cutMask[i + 1]) continue; mx = Math.max(mx, Math.abs(hy[i + 1] - hy[i]) / ds); ma = Math.max(ma, Math.abs(hy[i + 1] - 2 * hy[i] + hy[i - 1]) / (ds * ds)); }
  RY.maxSlope = mx; RY.maxCurv = ma;
};

/* ---------- 3. width, camber, rails, surface, openness ---------- */
const RY_START_S = 62, RY_FIN_IN = 46;            /* stage-distance of the start line, and metres from the end to the finish line */
const RY_RAIL_T = { rock: 2.4, stone: 0.8, net: 0.3 };      /* how thick each kind of wall is (the face stands at the gap, the cap runs this far behind it) */
/* the cross-section of the road at lateral offset l (+ left), measured from the centre line: a cross-fall (bank), a crown that lowers both edges (negative = dished, the middle lower),
   and the lip of a berm along the outer edge (lip > 0 lifts the left edge, lip < 0 the right) */
RY.cross = function (l, hw, bank, crown, lip) {
  const u = l / hw; let h = -bank * l - crown * u * u;
  if (lip > 0 && u > 0.35) { const t = (u - 0.35) / 0.65; h += lip * t * t * (1 + 0.25 * t); }
  else if (lip < 0 && u < -0.35) { const t = (-u - 0.35) / 0.65; h += -lip * t * t * (1 + 0.25 * t); }
  return h;
};
RY.sections = function () {
  const N = RY.N, ds = RY.DS, hw = new Float32Array(N), bank = new Float32Array(N), crown = new Float32Array(N), lip = new Float32Array(N), sec = new Uint8Array(N), open = new Float32Array(N), rnd = mulberry32(RY.seed * 77 + 1);
  const p = rnd() * 50, ph = [rnd() * 6.28, rnd() * 6.28, rnd() * 6.28, rnd() * 6.28];
  const win = (s, a, b, ra, rb) => _rySm(a - ra, a, s) * (1 - _rySm(b, b + rb, s));
  /* camber stays flat where the car has to leave the ground straight (the run-in and landing of a jump), at the plank gates, and at the start and finish */
  const flatW = (s) => {
    let f = _rySm(RY_START_S + 6, RY_START_S + 40, s) * (1 - _rySm(RY.L - 112, RY.L - 72, s));
    for (const jf of RY.feats) if (jf.k === 'jump') f *= 1 - win(s, jf.s0 - jf.up, jf.s0 + jf.down + 6, 12, 14); else if (jf.k === 'ravine') f *= 1 - win(s, jf.s0 - jf.up, jf.s0 + jf.span + jf.land, 14, 14); else if (jf.k === 'ford') f *= 1 - win(s, jf.s0, jf.s0 + jf.len, 12, 12);
    for (const w of RY_WALLS) { const c = RY.starts[w.e] + w.at; f *= 1 - win(s, c - 8, c + 8, 18, 18); }
    return f;
  };
  RY.bendW = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const s = i * ds, k = Math.abs(RY.kap[i]);
    hw[i] = 3.9 + Math.min(1.1, k * 30);                              /* bends open up a little */
    /* bends: the camber table, blended in before the turn-in and out after the exit */
    let cb = 0, cl = 0, cw = 0;
    for (let e = 0; e < RY_ELEMS.length; e++) {
      const el = RY_ELEMS[e]; if (el[0] !== 'C') continue; const S0 = RY.starts[e], len = el[1];
      if (s < S0 - 36 || s > S0 + len + 36) continue;
      const w = win(s, S0 + 0.16 * len, S0 + 0.84 * len, 0.16 * len + 18, 0.16 * len + 18); cw = Math.max(cw, w);
      const cc = RY_CAMB[e]; if (!cc) continue; const sg = el[2] > 0 ? 1 : -1;
      cb += sg * cc.b * w; cl += -sg * Math.sign(cc.b) * cc.m * w;
    }
    /* straights: a crown that comes and goes (some stretches dished, some heavily crowned) and a cross-fall that tilts the whole road for a while */
    const fl = flatW(s), crn = 0.12 + 0.21 * Math.sin(s / 97 + ph[0]) * (0.65 + 0.35 * Math.sin(s / 311 + ph[1]));
    const fall = 0.085 * Math.sin(s / 131 + ph[2]) * _rySm(0.3, 0.7, 0.5 + 0.5 * Math.sin(s / 333 + ph[3]));
    bank[i] = _ryIn(cb + fall * (1 - cw), -0.4, 0.4) * fl; crown[i] = crn * (1 - 0.7 * cw) * fl; lip[i] = cl * fl; RY.bendW[i] = cw;
    hw[i] += 0.8 * _rySm(0.07, 0.3, Math.abs(bank[i])) * cw;          /* a banked bend is cut wider */
    let sc = 0; for (const r of RY_SECS) if (s >= r[0]) sc = r[1]; sec[i] = sc;
    open[i] = RY.T.open != null ? RY.T.open : _rySm(0.52, 0.78, 0.5 + 0.9 * fbm(s * 0.0046 + p, 3.3, 3));    /* 1 = a glade where the sun gets down to the road, 0 = canopy tunnel */
  }
  /* soften the width changes */
  for (let pass = 0; pass < 6; pass++) { const t = Float32Array.from(hw); for (let i = 1; i < N - 1; i++) hw[i] = (t[i - 1] + 2 * t[i] + t[i + 1]) / 4; }
  RY.hw = hw; RY.bank = bank; RY.crown = crown; RY.lip = lip; RY.sec = sec; RY.open = open;
  /* the solid walls: per sample and side, the gap to the face, the height (tapering to nothing at both ends, so a wall sinks into the hillside) and the kind (0 none, 1 rock, 2 stone) */
  const mk = () => ({ g: new Float32Array(N), h: new Float32Array(N), k: new Uint8Array(N), cut: new Float32Array(N), band: new Float32Array(N) });
  const R = RY.rails = { L: mk(), R: mk() }; let maxGap = 0;
  for (const rl of RY_RAILS) {
    const sA = RY.starts[rl.e] + rl.at, sB = sA + rl.len, th = RY_RAIL_T[rl.k];
    for (let i = Math.max(0, Math.floor(sA / ds)); i <= Math.min(N - 1, Math.ceil(sB / ds)); i++) {
      const s = i * ds, h = rl.h * _rySm(0, 12, s - sA) * _rySm(0, 12, sB - s); if (h <= 0) continue;
      for (const side of rl.side === 0 ? [1, -1] : [rl.side]) {
        const o = side > 0 ? R.L : R.R; if (h < o.h[i]) continue;
        o.g[i] = rl.gap; o.h[i] = h; o.k[i] = rl.k === 'rock' ? 1 : rl.k === 'net' ? 3 : 2; o.cut[i] = rl.k === 'rock' ? h : 0; o.band[i] = rl.gap + th + 0.9;
      }
    }
    maxGap = Math.max(maxGap, rl.gap + th);
  }
  RY.railReach = maxGap + 1.2; RY.hwMax = 0; for (let i = 0; i < N; i++) RY.hwMax = Math.max(RY.hwMax, hw[i]);
};

/* ---------- 4. spatial index of the path ---------- */
RY.index = function () {
  const N = RY.N, C = 24; let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
  for (let i = 0; i < N; i++) { x0 = Math.min(x0, RY.px[i]); x1 = Math.max(x1, RY.px[i]); z0 = Math.min(z0, RY.pz[i]); z1 = Math.max(z1, RY.pz[i]); }
  const m = RY.MAXD + 30; x0 -= m; z0 -= m; x1 += m; z1 += m;
  RY.bx0 = x0; RY.bz0 = z0; RY.bw = Math.ceil((x1 - x0) / C); RY.bh = Math.ceil((z1 - z0) / C); RY.BC = C;
  const cells = new Array(RY.bw * RY.bh); for (let i = 0; i < N; i++) { const c = Math.floor((RY.pz[i] - z0) / C) * RY.bw + Math.floor((RY.px[i] - x0) / C); (cells[c] || (cells[c] = [])).push(i); }
  RY.cells = cells;
};
/* nearest path sample to (x,z), optionally skipping samples within `skip` indices of `ex` (to find the other arm of a hairpin); fills o.i, o.d (unsigned), o.l (signed, + = left) */
RY.nearest = function (x, z, ex, skip, o) {
  const C = RY.BC, cx = Math.floor((x - RY.bx0) / C), cz = Math.floor((z - RY.bz0) / C), px = RY.px, pz = RY.pz, tx = RY.cx, tz = RY.cz, N = RY.N;
  let best = 1e18, bi = -1;
  for (let r = 0; r <= 5; r++) {
    for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
      const gx = cx + dx, gz = cz + dz; if (gx < 0 || gz < 0 || gx >= RY.bw || gz >= RY.bh) continue;
      const cell = RY.cells[gz * RY.bw + gx]; if (!cell) continue;
      for (let k = 0; k < cell.length; k++) { const i = cell[k]; if (ex >= 0 && Math.abs(i - ex) <= skip) continue; const ax = x - px[i], az = z - pz[i], d2 = ax * ax + az * az; if (d2 < best) { best = d2; bi = i; } }
    }
    if (bi >= 0 && best < (r * C) * (r * C)) break;
  }
  if (bi < 0) { o.i = -1; o.d = 1e9; o.l = 0; return o; }
  /* refine onto the segment so the distance is continuous between samples */
  let i = bi, ax = x - px[i], az = z - pz[i], t = ax * tx[i] + az * tz[i];
  if (t < 0 && i > 0) { i--; ax = x - px[i]; az = z - pz[i]; t = ax * tx[i] + az * tz[i]; }
  const sl = RY.DS; t = _ryIn(t, 0, sl); const qx = ax - tx[i] * t, qz = az - tz[i] * t;
  o.i = t > sl * 0.5 && i < N - 1 ? i + 1 : i; o.t = t; o.seg = i; o.d = Math.sqrt(qx * qx + qz * qz); o.l = qx * tz[i] - qz * tx[i]; o.s = i * RY.DS + t;
  return o;
};

/* ---------- 5. the baked ground ---------- */
const _ryA = { i: 0, d: 0, l: 0 }, _ryB = { i: 0, d: 0, l: 0 };
/* the terrain height the path would give at (x,z), from a nearest() result (interpolated along the segment so the road profile is exact between samples) */
RY.heightFrom = function (o, x, z) {
  const sg = Math.min(o.seg, RY.N - 2), fr = o.t / RY.DS, i = o.i, l = o.l, d = o.d;
  const hw = lerp(RY.hw[sg], RY.hw[sg + 1], fr), bank = lerp(RY.bank[sg], RY.bank[sg + 1], fr), py = lerp(RY.py[sg], RY.py[sg + 1], fr), base = lerp(RY.base[sg], RY.base[sg + 1], fr);
  const crown = lerp(RY.crown[sg], RY.crown[sg + 1], fr), lip = lerp(RY.lip[sg], RY.lip[sg + 1], fr);
  const e = Math.max(0, d - hw), roadH = py + RY.cross(_ryIn(l, -hw, hw), hw, bank, crown, lip);
  if (e <= 0) return roadH;
  const sd = l < 0 ? -1 : 1, edgeH = py + RY.cross(sd * hw, hw, bank, crown, lip);
  if (RY.T.M) {   /* a themed stage: the verge runs out into the land itself, and far from the road the land settles onto a plain (the sea bed, the desert floor, the valley) */
    const T = RY.T, m = T.M(x - RY.px[0], z - RY.pz[0], RY.B), R2 = sd > 0 ? RY.rails.L : RY.rails.R, cut2 = lerp(R2.cut[sg], R2.cut[sg + 1], fr);
    let h = lerp(edgeH, m, _rySm(1.2, T.blend || 26, e)) - 0.2 * _rySm(0, 0.5, e) * (1 - _rySm(0.5, 2.2, e));
    if (cut2 > 0.05) { const eW = e - Math.max(R2.g[sg], R2.g[sg + 1]); h += cut2 * _rySm(2.4, 8.0, eW) * (1 - _rySm(18, 46, eW)); }
    h += lerp(RY.cut[sg], RY.cut[sg + 1], fr) * (1 - _rySm(32, 80, e));   /* the ravine or the stream bed runs on across the land */
    return lerp(h, RY.plain, _rySm(RY.MAXD - 40, RY.MAXD - 8, e));
  }
  /* verge: a shallow ditch, then the bank climbs into the hillside; the valley floor follows the smoothed base so jumps blend away */
  const ditch = -0.22 * _rySm(0, 0.5, e) * (1 - _rySm(0.5, 2.2, e));
  const rise = 0.17 * Math.min(e, 18) + 0.42 * _ryIn(e - 18, 0, 24) + 0.12 * Math.max(0, e - 42);
  const f = _rySm(1.5, 15, e), hills = (fbm(x * 0.021 + 5.1, z * 0.021 - 2.7, 3) * 7.5 + fbm(x * 0.09, z * 0.09, 2) * 1.1) * _rySm(2, 20, e);
  const feat = lerp(edgeH, base - bank * sd * hw * 0.5, f);
  /* behind a rock cutting the hillside stands higher than the face (it starts well behind the face so the road's grid cells never see it) */
  const R = sd > 0 ? RY.rails.L : RY.rails.R, cut = lerp(R.cut[sg], R.cut[sg + 1], fr);
  let up = 0; if (cut > 0.05) { const eW = e - Math.max(R.g[sg], R.g[sg + 1]); up = cut * _rySm(2.4, 8.0, eW) * (1 - _rySm(18, 46, eW)); }
  return feat + ditch + rise + hills + up;
};
RY.bake = function () {
  const GS = RY.GS, x0 = Math.floor(RY.bx0 / GS) * GS, z0 = Math.floor(RY.bz0 / GS) * GS, gw = Math.ceil((RY.bx0 + RY.bw * RY.BC - x0) / GS) + 1, gh = Math.ceil((RY.bz0 + RY.bh * RY.BC - z0) / GS) + 1;
  const H = new Float32Array(gw * gh), D = new Float32Array(gw * gh), I = new Int32Array(gw * gh).fill(-1);
  const A = _ryA, B = _ryB, MAXD = RY.MAXD; let hiH = -1e9;
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    const x = x0 + i * GS, z = z0 + j * GS, k = j * gw + i; RY.nearest(x, z, -1, 0, A);
    if (A.i < 0 || A.d > MAXD) { D[k] = 999; H[k] = NaN; continue; }
    const hA = RY.heightFrom(A, x, z);
    let h = hA;
    if (A.d - RY.hw[A.i] > 3) {   /* the other arm of a hairpin or esses nearby: blend smoothly so there is no cliff between two stretches at different heights */
      RY.nearest(x, z, A.i, 12, B);
      if (B.i >= 0 && B.d < A.d + 40) {
        const hB = RY.heightFrom(B, x, z), wA = 1 / Math.pow(Math.max(A.d - RY.hw[A.i], 0) + 0.8, 3), wB = 1 / Math.pow(Math.max(B.d - RY.hw[B.i], 0) + 0.8, 3);
        h = (hA * wA + hB * wB) / (wA + wB);
      }
    }
    D[k] = A.d; I[k] = A.i; H[k] = h; if (h > hiH) hiH = h;
  }
  /* the hillside away from the road is smoothed so the hairpin blends leave no crease (the road itself is untouched) */
  const W = new Float32Array(gw * gh);   /* smoothing weight per node: none on or beside the road, full on the far hillside, where two stretches of road disagree about the height */
  for (let k = 0; k < W.length; k++) W[k] = D[k] > MAXD - 4 ? 0 : _rySm(3, 9, D[k] - RY.hw[Math.max(0, I[k])]) * 0.45 + _rySm(20, 55, D[k] - RY.hw[Math.max(0, I[k])]) * 0.55;
  for (let pass = 0; pass < 28; pass++) {
    const T = Float32Array.from(H);
    for (let j = 1; j < gh - 1; j++) for (let i = 1; i < gw - 1; i++) {
      const k = j * gw + i, w = W[k]; if (w === 0 || (pass > 3 && w < 0.5)) continue;
      const nb = (T[k - 1] + T[k + 1] + T[k - gw] + T[k + gw]) * 0.25; if (nb === nb && T[k] === T[k]) H[k] = T[k] + (nb - T[k]) * w;
    }
  }
  /* the void beyond the bake range becomes a wall of hillside so nothing can wander into it */
  for (let k = 0; k < H.length; k++) if (!(H[k] === H[k])) H[k] = RY.T.M ? RY.plain : hiH + 40;
  RY.gx0 = x0; RY.gz0 = z0; RY.gw = gw; RY.gh = gh; RY.H = H; RY.D = D; RY.I = I; RY.hiH = hiH;
};

/* surface constants per section: mu (x asphalt), rolling resistance, roughness, looseness */
const RY_SURF = [
  { mu: 0.84, rr: 0.034, rough: 0.30, loose: 0.30 },   /* hard-packed */
  { mu: 0.72, rr: 0.046, rough: 0.42, loose: 0.62 },   /* loose gravel */
  { mu: 0.56, rr: 0.07, rough: 0.5, loose: 0.42 },     /* mud */
  { mu: 0.64, rr: 0.09, rough: 0.34, loose: 0.55 },    /* sand */
  { mu: 0.52, rr: 0.05, rough: 0.22, loose: 0.5 },     /* 4 packed snow */
  { mu: 0.34, rr: 0.022, rough: 0.1, loose: 0.1 },     /* 5 ice */
  { mu: 0.58, rr: 0.13, rough: 0.3, loose: 0.8 },      /* 6 deep soft sand */
  { mu: 0.46, rr: 0.12, rough: 0.3, loose: 0.85 },     /* 7 powder snow */
  { mu: 0.8, rr: 0.04, rough: 0.2, loose: 0.3 },       /* 8 hard wet sand */
  { mu: 0.6, rr: 0.1, rough: 0.3, loose: 0.4 }         /* 9 tidal shallows */
];
/* ground query used by the car physics: fills the same fields groundAt() does, plus `loose` */
RY.ground = function (x, z, o) {
  const gs = 1 / RY.GS, gx = (x - RY.gx0) * gs, gz = (z - RY.gz0) * gs, ix = Math.floor(gx), iz = Math.floor(gz), gw = RY.gw;
  if (ix < 0 || iz < 0 || ix >= gw - 1 || iz >= RY.gh - 1) { o.h = RY.T.M ? RY.plain : RY.hiH + 30; o.mu = 0.5; o.rr = 0.1; o.rough = 0.5; o.road = false; o.water = false; o.loose = 0.5; o.sec = 0; return; }
  const fx = gx - ix, fz = gz - iz, k = iz * gw + ix, H = RY.H, D = RY.D;
  const h = (H[k] * (1 - fx) + H[k + 1] * fx) * (1 - fz) + (H[k + gw] * (1 - fx) + H[k + gw + 1] * fx) * fz;
  const d = (D[k] * (1 - fx) + D[k + 1] * fx) * (1 - fz) + (D[k + gw] * (1 - fx) + D[k + gw + 1] * fx) * fz;
  const idx = RY.I[k + (fx > 0.5 ? 1 : 0) + (fz > 0.5 ? gw : 0)];
  o.h = h; o.water = false; o.road = false; o.wade = 0;
  if (idx < 0) { o.mu = 0.5; o.rr = 0.12; o.rough = 0.5; o.loose = 0.6; o.sec = 0; return; }
  const hw = RY.hw[idx], e = d - hw, S = RY_SURF[RY.T.surf[RY.sec[idx]]], OF = RY.T.off; o.sec = RY.sec[idx];
  if (RY.wl[idx] > h) {   /* wading through a stream: the water drags, and the bed is slick */
    const wd = Math.min(0.9, RY.wl[idx] - h); o.wade = wd; o.mu = S.mu * (1 - Math.min(0.32, wd * 0.5)); o.rr = S.rr + 0.22 * wd + 0.06; o.rough = 0.4; o.loose = 0.5; return;
  }
  if (e <= 0) {
    /* the road: two wheel ruts a little looser and rougher, a berm of loose gravel along both edges, hard line down the middle */
    const a = Math.abs(d), rut = _rySm(0.5, 0.9, a) * (1 - _rySm(1.5, 1.9, a)), edge = _rySm(hw - 1.6, hw - 0.4, a);
    o.mu = S.mu * (1 - 0.07 * rut - 0.16 * edge); o.rr = S.rr * (1 + 0.25 * rut + 0.5 * edge); o.rough = S.rough * (1 + 0.5 * rut + 0.7 * edge); o.loose = Math.min(1, S.loose + 0.3 * edge);
  } else {
    const t = _rySm(0, 2.5, e);   /* from the gravel shoulder out to the forest floor: soft, rough, slow */
    if (OF) { o.mu = lerp(S.mu * 0.85, OF.mu, t); o.rr = lerp(S.rr * 1.4, OF.rr, t); o.rough = lerp(0.45, OF.rough, t); o.loose = lerp(0.6, OF.loose, t); if (RY.sea != null && h < RY.sea - 0.25) { o.rr = 0.34; o.mu = 0.5; } }
    else { o.mu = lerp(S.mu * 0.78, 0.5, t); o.rr = lerp(0.07, 0.15, t); o.rough = lerp(0.55, 0.9, t); o.loose = lerp(0.6, 0.45, t); }
  }
};
RY.heightAt = function (x, z) { RY.ground(x, z, _ryG); return _ryG.h; };
const _ryG = { h: 0, mu: 0, rr: 0, rough: 0, road: false, water: false, loose: 0 };
/* distance from the path (cheap, from the bake) */
RY.distAt = function (x, z) {
  const gs = 1 / RY.GS, gx = (x - RY.gx0) * gs, gz = (z - RY.gz0) * gs, ix = Math.floor(gx), iz = Math.floor(gz), gw = RY.gw;
  if (ix < 0 || iz < 0 || ix >= gw - 1 || iz >= RY.gh - 1) return 999;
  const fx = gx - ix, fz = gz - iz, k = iz * gw + ix, D = RY.D;
  return (D[k] * (1 - fx) + D[k + 1] * fx) * (1 - fz) + (D[k + gw] * (1 - fx) + D[k + gw + 1] * fx) * fz;
};
/* position and heading at distance s along the stage with a lateral offset (+ = left) */
RY.at = function (s, off, o) {
  s = _ryIn(s, 0, RY.L); const i = Math.min(RY.N - 2, Math.floor(s / RY.DS)), t = s - i * RY.DS;
  const tx = RY.cx[i], tz = RY.cz[i]; o.i = i; o.s = s; o.tx = tx; o.tz = tz; o.yaw = Math.atan2(tx, tz);
  o.x = RY.px[i] + tx * t + tz * off; o.z = RY.pz[i] + tz * t - tx * off; o.hw = RY.hw[i]; return o;
};
/* progress tracking: search a window around the last known sample (two stretches of road that run close never get confused) */
RY.locate = function (x, z, hint, o) {
  const N = RY.N, px = RY.px, pz = RY.pz, tx = RY.cx, tz = RY.cz; let best = 1e18, bi = 0, bt = 0;
  const a = Math.max(0, hint - 12), b = Math.min(N - 2, hint + 40);
  for (let i = a; i <= b; i++) {
    const ax = x - px[i], az = z - pz[i]; let t = ax * tx[i] + az * tz[i]; t = t < 0 ? 0 : t > RY.DS ? RY.DS : t;
    const qx = ax - tx[i] * t, qz = az - tz[i] * t, d2 = qx * qx + qz * qz; if (d2 < best) { best = d2; bi = i; bt = t; }
  }
  const ax = x - px[bi] - tx[bi] * bt, az = z - pz[bi] - tz[bi] * bt;
  o.i = bi; o.s = bi * RY.DS + bt; o.d = Math.sqrt(best); o.l = ax * tz[bi] - az * tx[bi]; return o;
};

/* ---------- 6. forest, undergrowth, rocks, trunks ---------- */
/* tree kinds: conifers dominate, birch lines the road, a few oak and autumn clumps. v = variant index into the game's TREE[kind] sources. */
const RY_KINDS = [{ n: 'pine', v: 0 }, { n: 'pine', v: 1 }, { n: 'pine', v: 2 }, { n: 'pine', v: 3 }, { n: 'birch', v: 0 }, { n: 'birch', v: 1 }, { n: 'oak', v: 0 }, { n: 'autumn', v: 0 },
  { n: 'palm', v: 0 }, { n: 'palm', v: 1 }, { n: 'palm', v: 2 }, { n: 'snowpine', v: 0 }, { n: 'snowpine', v: 1 }, { n: 'snowpine', v: 2 }, { n: 'cactus', v: 0 }, { n: 'cactus', v: 1 }, { n: 'cactus', v: 2 }, { n: 'cactus', v: 3 }];
RY.forest = function (density) {
  density = density == null ? 1 : density; const T = RY.T, tk = T.tree == null ? 1 : T.tree, uk = T.under === null ? 0 : T.underK == null ? 1 : T.underK, un = T.under || ['bush', 'grass'];
  const rnd = mulberry32(RY.seed * 131 + 9), GS = 3.4, tr = [], und = [], rocks = [];
  const x0 = RY.gx0, z0 = RY.gz0, x1 = x0 + (RY.gw - 1) * RY.GS, z1 = z0 + (RY.gh - 1) * RY.GS, A = _ryA;
  for (let z = z0 + GS; z < z1 - GS; z += GS) for (let x = x0 + GS; x < x1 - GS; x += GS) {
    const jx = x + (rnd() - 0.5) * GS * 0.95, jz = z + (rnd() - 0.5) * GS * 0.95, d = RY.distAt(jx, jz); if (d > RY.MAXD - 6) continue;
    RY.nearest(jx, jz, -1, 0, A); if (A.i < 0) continue;
    const hw = RY.hw[A.i], e = d - hw, op = RY.open[A.i], hy = RY.heightAt(jx, jz);
    if (e < (A.l > 0 ? RY.rails.L.band[A.i] : RY.rails.R.band[A.i])) continue;   /* the wall and its cap stand here */
    const clear = fbm(jx * 0.016 + 11, jz * 0.016 + 4, 2) > 0.18 ? 0.3 : 1;              /* the odd natural clearing */
    /* undergrowth first: bushes and ferns crowd the verge, thin out into the forest */
    if (RY.sea != null && hy < RY.sea + 0.5) continue;   /* nothing grows in the sea */
    if (RY.wl[A.i] > hy - 0.4) continue;                   /* or in a stream */
    if (e > 1.4 && e < 36 && rnd() < (0.5 * density * (1 - _rySm(8, 36, e)) + 0.06) * uk) {
      const kind = rnd() < 0.3 ? un[0] : un[1]; und.push({ k: kind, v: (rnd() * 4) | 0, x: jx + (rnd() - 0.5) * 1.6, z: jz + (rnd() - 0.5) * 1.6, sc: kind !== 'grass' ? 0.7 + rnd() * 0.8 : 0.9 + rnd() * 0.9, rot: rnd() * TAU, t: rnd() });
    }
    /* trunks stay off the road with a margin, and thin out inside glades */
    const edge = _rySm(2.4, 9, e), p = edge * (0.28 + 0.72 * _rySm(2, 22, e)) * (1 - 0.55 * _rySm(44, 80, e)) * (e > 84 ? 0 : 1) * clear * lerp(1, T.M ? 1 : 0.32, op * (1 - _rySm(6, 20, e))) * density * tk * (T.treeLine ? 1 - _rySm(T.treeLine - 0.12, T.treeLine, (hy - RY.plain) / 200) : 1);
    if (e < 2.4 || rnd() > p * 1.25) continue;
    const r = rnd(); let ki;
    if (e < 9 && r < 0.3) ki = 4 + ((rnd() * 2) | 0);                            /* birch along the road edge */
    else if (r < 0.08) ki = 6; else if (r < 0.13) ki = 7; else ki = (rnd() * 4) | 0;
    if (T.trees) { const set = e < 9 ? T.edge : T.trees; ki = set[(rnd() * set.length) | 0]; }
    const big = e < 9 ? 1.05 + rnd() * 0.4 : 0.75 + rnd() * 0.65;                 /* the avenue trees are the big ones */
    const kd = RY_KINDS[ki], sc = kd.n === 'pine' || kd.n === 'snowpine' ? big * (0.85 + rnd() * 0.5) : kd.n === 'cactus' ? 0.8 + rnd() * 0.7 : big * 0.9;
    tr.push({ k: ki, x: jx, y: hy, z: jz, sc, rot: rnd() * TAU, t: rnd(), rad: (kd.n === 'pine' ? 0.34 : 0.3) * sc + 0.06, e });
  }
  /* rocks, mostly just off the road, some in the ditch */
  for (let i = 0; i < Math.round(RY.L / 26 * (T.rocks == null ? 1 : T.rocks)); i++) {
    const s = rnd() * RY.L, side = rnd() < 0.5 ? -1 : 1, off = RY.at(s, 0, {}), hw = off.hw, l = side * (hw + 1.2 + rnd() * rnd() * 14);
    if (hw + (side > 0 ? RY.rails.L : RY.rails.R).band[off.i] > Math.abs(l)) continue;
    const q = RY.at(s, l, {}); rocks.push({ v: (rnd() * 12) | 0, x: q.x, z: q.z, sc: 0.5 + rnd() * rnd() * 2.6, rot: rnd() * TAU });
  }
  RY.trees = tr; RY.under = und; RY.rocks = rocks;
  /* trunk hash for the collision */
  const TH = RY.TH = 8, map = RY.thash = new Map();
  const add = (cx, cz, id) => { const key = cx * 8192 + cz; let a = map.get(key); if (!a) map.set(key, a = []); a.push(id); };
  for (let i = 0; i < tr.length; i++) { const t = tr[i]; if (t.e > 40) continue; add(Math.floor((t.x - x0) / TH), Math.floor((t.z - z0) / TH), i); }
  /* rocks that are big enough to matter are solid too (circle) */
  RY.solidRocks = rocks.filter((r) => r.sc > 1.1);
  /* tyre walls: a row of tyre stacks round the inside of every hairpin's apex, just off the road */
  const ty = RY.tyres = [];
  for (let e = 0; e < RY_ELEMS.length; e++) {
    const el = RY_ELEMS[e]; if (el[0] !== 'C' || Math.abs(el[2]) < 85) continue; const side = el[2] > 0 ? 1 : -1, R_ = side > 0 ? RY.rails.L : RY.rails.R;
    for (let k = -3; k <= 3; k++) { const s = RY.starts[e] + el[1] * 0.5 + k * 3.2, q = RY.at(s, 0, {}); if (R_.g[q.i] > 0 && R_.g[q.i] < 2.4) continue; const p = RY.at(s, side * (q.hw + 1.25), {}); ty.push({ x: p.x, z: p.z, n: 3 + ((k + e) & 1), red: (k + 3) % 2 === 0 }); }
  }
};
/* every solid within reach of a circle; out is an array that gets {nx,nz,pen,hard} pushed (hard = the trunk side of the collision) */
RY.hits = function (px, pz, R, out) {
  out.length = 0; const TH = RY.TH, cx = Math.floor((px - RY.gx0) / TH), cz = Math.floor((pz - RY.gz0) / TH), tr = RY.trees;
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
    const a = RY.thash.get((cx + dx) * 8192 + cz + dz); if (!a) continue;
    for (let k = 0; k < a.length; k++) { const t = tr[a[k]], ax = px - t.x, az = pz - t.z, rr = t.rad + R, d2 = ax * ax + az * az; if (d2 < rr * rr) { const d = Math.sqrt(d2) || 0.01; out.push({ nx: ax / d, nz: az / d, pen: rr - d }); } }
  }
  for (const t of RY.tyres) { const ax = px - t.x, az = pz - t.z, rr = 0.5 + R, d2 = ax * ax + az * az; if (d2 < rr * rr) { const d = Math.sqrt(d2) || 0.01; out.push({ nx: ax / d, nz: az / d, pen: rr - d, tyre: true }); } }
  for (const r of RY.solidRocks) { const ax = px - r.x, az = pz - r.z, rr = r.sc * 0.78 + R; if (Math.abs(ax) < rr && Math.abs(az) < rr) { const d2 = ax * ax + az * az; if (d2 < rr * rr) { const d = Math.sqrt(d2) || 0.01; out.push({ nx: ax / d, nz: az / d, pen: rr - d }); } } }
  const d = RY.distAt(px, pz);
  /* rock cuttings and stone walls beside the road: a plane at the face, the normal points back across the road. Heights under 0.5 m (a wall sinking into the hillside at its end) are not solid */
  if (d < RY.hwMax + RY.railReach) {
    const A = _ryA; RY.nearest(px, pz, -1, 0, A);
    if (A.i >= 0) {
      const sg = Math.min(A.seg, RY.N - 2), fr = A.t / RY.DS, hw = lerp(RY.hw[sg], RY.hw[sg + 1], fr), tx = RY.cx[sg], tz = RY.cz[sg];
      for (let k = 0; k < 2; k++) {
        const side = k ? -1 : 1, R_ = k ? RY.rails.R : RY.rails.L; if (Math.min(R_.h[sg], R_.h[sg + 1]) < 0.5) continue;
        const pen = side * A.l + R - (hw + Math.max(R_.g[sg], R_.g[sg + 1]));
        if (pen > -0.12) out.push({ nx: -side * tz, nz: side * tx, pen, rail: true, net: R_.k[sg] === 3 });   /* a hair short of the face still counts, so a car sliding along a wall is scraped (the caller only pushes out of a positive pen) */
      }
    }
  }
  /* the outer boundary of the stage: a steep wooded hillside, pushes back toward the road */
  if (d > RY.MAXD - 14) { RY.nearest(px, pz, -1, 0, _ryA); if (_ryA.i >= 0) { const ax = RY.px[_ryA.i] - px, az = RY.pz[_ryA.i] - pz, l = Math.hypot(ax, az) || 1; out.push({ nx: ax / l, nz: az / l, pen: d - (RY.MAXD - 14) + R }); } }
  return out;
};

/* ---------- 7. gates, pace notes ---------- */
RY.layout = function () {
  RY.walls = RY_WALLS.map((w) => { const s = RY.starts[w.e] + w.at, q = RY.at(s, 0, {}); return { s, x: q.x, z: q.z, yaw: q.yaw, hw: q.hw, y: RY.heightAt(q.x, q.z) }; });
  /* pace notes: every bend gets a call (direction + severity 1 hairpin .. 6 flat), every feature too */
  const notes = [];
  for (let e = 0; e < RY_ELEMS.length; e++) {
    const el = RY_ELEMS[e]; if (el[0] !== 'C' || Math.abs(el[2]) < 18) continue;
    const kp = 2 * Math.abs(el[2]) * Math.PI / 180 / el[1], R = 1 / kp, sev = R >= 130 ? 6 : R >= 85 ? 5 : R >= 55 ? 4 : R >= 36 ? 3 : R >= 22 ? 2 : 1;
    let dir = el[2] > 0 ? 'LEFT' : 'RIGHT', txt = dir + ' ' + sev; if (sev === 1) txt = dir + ' HAIRPIN'; if (Math.abs(el[2]) > 100 && sev > 1) txt += ' LONG';
    const nxt = RY_ELEMS[e + 1]; if (nxt && nxt[0] === 'C' && Math.sign(nxt[2]) !== Math.sign(el[2])) txt += ' INTO ' + (nxt[2] > 0 ? 'LEFT' : 'RIGHT');
    const cc = RY_CAMB[e]; if (cc && cc.b >= 0.15) txt += ' · BANKED'; else if (cc && cc.b <= -0.08) txt += ' · OFF-CAMBER';
    notes.push({ s: RY.starts[e] + el[1] * 0.18, t: txt, sev, dir: el[2] > 0 ? 1 : -1, k: 'bend' });
  }
  RY.ravines = RY.feats.filter((f) => f.k === 'ravine').map((f) => { const q = RY.at(f.s0, 0, {}), i = Math.round(f.s0 / RY.DS), j = Math.round((f.s0 + f.span) / RY.DS) + 1;
    return { f, s0: f.s0, span: f.span, x: q.x, z: q.z, tx: Math.sin(q.yaw), tz: Math.cos(q.yaw), lipY: RY.py[i], deckY: RY.py[Math.min(RY.N - 1, j)], back: f.s0 - f.up - 55 }; });
  RY.fords = RY.feats.filter((f) => f.k === 'ford');
  { const r = mulberry32(RY.seed * 17 + 3); for (const rv of RY.ravines) for (let k = 0; k < 26; k++) { const u = rv.s0 + 3 + r() * (rv.span - 6), l = (r() - 0.5) * 70, q = RY.at(u, l, {}); RY.rocks.push({ v: (r() * 12) | 0, x: q.x, z: q.z, sc: 0.8 + r() * 1.8, rot: r() * TAU }); } }   /* boulders down in the ravine */
  for (const f of RY.feats) {
    if (f.k === 'ravine') notes.push({ s: f.s0 - f.up - 40, t: (f.name || 'Ravine').toUpperCase() + ' · RAVINE JUMP · FLAT OUT', sev: 6, dir: 0, k: 'jump' });
    else if (f.k === 'ford') notes.push({ s: f.s0 - 30, t: (f.name || 'Stream').toUpperCase() + ' · WATER SPLASH', sev: 6, dir: 0, k: 'dip' });
    else if (f.k === 'jump') notes.push({ s: f.s0 - f.up - 2, t: (f.name || 'JUMP').toUpperCase() + ' · KEEP IT STRAIGHT', sev: 6, dir: 0, k: 'jump' });
    else if (f.k === 'dip') notes.push({ s: f.s0 - 6, t: 'DIP', sev: 6, dir: 0, k: 'dip' });
    else if (f.k === 'whoops') notes.push({ s: f.s0 - 8, t: 'WHOOPS', sev: 6, dir: 0, k: 'dip' });
  }
  for (const w of RY.walls) notes.push({ s: w.s - 24, t: 'WALL · GO THROUGH', sev: 6, dir: 0, k: 'wall' });
  for (const rl of RY_RAILS) notes.push({ s: RY.starts[rl.e] + rl.at - 30, t: (rl.k === 'rock' ? 'ROCK FACE ' : rl.k === 'net' ? 'CRASH NET ' : 'STONE WALL ') + (rl.side === 0 ? 'BOTH SIDES' : rl.side > 0 ? 'LEFT' : 'RIGHT'), sev: 5, dir: rl.side, k: 'rail' });
  notes.sort((a, b) => a.s - b.s); RY.notes = notes;
  RY.startS = RY_START_S; RY.finishS = RY.L - RY_FIN_IN; RY.cps = [0.26, 0.52, 0.76].map((f) => RY.startS + (RY.finishS - RY.startS) * f);
};

/* ---------- everything ---------- */
RY.build = function (density) {
  if (RY.stage < 0) RY.use(0);
  RY.path(); RY.profile(); RY.sections(); RY.index(); RY.bake(); RY.forest(density); RY.layout();
  /* a rough par: what an average run looks like (used for the splits and medals) */
  RY.par = RY.L / RY.st.pace; RY.ready = true; return RY;   /* ~148 s par: bronze 2:30.8, silver 2:16.0, gold 2:05.7 (RY_MEDAL); silver and gold need a real line, nitro and the jumps flat out */
};
RY.use(0);
