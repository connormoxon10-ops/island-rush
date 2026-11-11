/* ================= COSMETICS: catalogue, ownership and how every item changes the car / the avatar =================
   save.cos = { own: { itemId: 1 }, car: { carId: { paint, fin, wheel, rim, kit: { slot: id }, liv, glow, tint, head } }, out: { hat, glasses, top, bottom, shoes, hair } }
   An item is only worn once it is owned; the shop previews anything (try before you buy). Items marked with a region are sold in that town's Customs shop only. */
const COS = { items: [], by: {}, cats: [
  ['paint', 'Paint'], ['fin', 'Finish'], ['wheel', 'Wheels'], ['rim', 'Rims'], ['kit', 'Body kit'], ['liv', 'Livery'], ['glow', 'Underglow'], ['tint', 'Glass'], ['head', 'Headlights'], ['hat', 'Hats'], ['glasses', 'Eyewear'], ['top', 'Tops'], ['bottom', 'Bottoms'], ['shoes', 'Shoes'], ['hair', 'Hair']
], CAR: ['paint', 'fin', 'wheel', 'rim', 'kit', 'liv', 'glow', 'tint', 'head'], OUT: ['hat', 'glasses', 'top', 'bottom', 'shoes', 'hair'] };
function cosAdd(cat, key, name, price, reg, val, sw) {
  const it = { id: cat + ':' + key, cat, key, name, price, reg: reg || null, val: val || {}, sw: sw || null }; COS.items.push(it); COS.by[it.id] = it; return it;
}
const _rgbOf = (hex) => { const c = lc(hex); return [c.r, c.g, c.b]; };
(function buildCatalogue() {
  /* ---- paint (the eight garage colours stay free) ---- */
  const P = (k, n, pr, reg, hex) => cosAdd('paint', k, n, pr, reg, { hex }, hex);
  P('navy', 'Midnight Navy', 180, null, 0x14213d); P('burg', 'Burgundy', 180, null, 0x5c0f1d); P('rg', 'Racing Green', 200, null, 0x0b4a32); P('plum', 'Plum Crazy', 220, null, 0x4a1a6a); P('graph', 'Graphite', 160, null, 0x3a3d44);
  P('hivis', 'Hi-Vis Yellow', 260, 'harbor', 0xe8d21c); P('rust', 'Container Rust', 240, 'harbor', 0x9a4a2c); P('hsteel', 'Harbor Steel', 260, 'harbor', 0x5d6a74); P('buoy', 'Buoy Red', 260, 'harbor', 0xc4202a);
  P('canyon', 'Canyon Orange', 280, 'desert', 0xd2691e); P('dune', 'Dune Sand', 260, 'desert', 0xd9c08a); P('mesa', 'Mesa Clay', 260, 'desert', 0xa8603c); P('sunw', 'Sun-baked White', 240, 'desert', 0xefe6d2);
  P('barn', 'Barn Red', 260, 'farm', 0x8a2a20); P('hay', 'Hay Gold', 260, 'farm', 0xd9a93a); P('pasture', 'Pasture Green', 240, 'farm', 0x4f7a2c); P('farmsky', 'Farmhouse Blue', 240, 'farm', 0x4a7fb0);
  P('flam', 'Flamingo', 320, 'tropic', 0xff7aa8); P('lagoon', 'Lagoon', 320, 'tropic', 0x20c4c0); P('lemon', 'Lemon Sorbet', 300, 'tropic', 0xf5e060); P('coral', 'Coral', 300, 'tropic', 0xff6a5a); P('seaf', 'Seafoam', 300, 'tropic', 0x8fe0c0);
  P('snowc', 'Snowcap White', 340, 'alpine', 0xf5f8fc); P('glac', 'Glacier Blue', 340, 'alpine', 0x8ec8f0); P('slate', 'Alpine Slate', 300, 'alpine', 0x4a5260); P('pinen', 'Pine Night', 320, 'alpine', 0x143a2a);
  P('forest', 'Forest Green', 280, 'lake', 0x1f4a2a); P('moss', 'Moss', 260, 'lake', 0x6a7a3a); P('fog', 'Fog Grey', 240, 'lake', 0x9aa2a4); P('birch', 'Birch White', 260, 'lake', 0xe8e6da); P('deepl', 'Deep Lake', 300, 'lake', 0x1a3a5a);
  P('gun', 'Gunmetal', 360, 'city', 0x2a2f38); P('piano', 'Piano Black', 380, 'city', 0x0a0a0c); P('silver', 'Silver Bullet', 340, 'city', 0xc9ccd1); P('violet', 'Neon Violet', 420, 'city', 0x7a3ff0); P('elec', 'Electric Blue', 420, 'city', 0x1a5cff);
  /* ---- finish ---- */
  const F = (k, n, pr, reg, fin, sw) => cosAdd('fin', k, n, pr, reg, { fin }, sw);
  F('satin', 'Satin', 300, 'farm', 'satin', 0x9a9a9a); F('matte', 'Matte', 420, 'desert', 'matte', 0x7a7a7a); F('metal', 'Metallic', 600, 'harbor', 'metallic', 0xb8bcc4); F('pearl', 'Pearlescent', 800, 'tropic', 'pearl', 0xf0e8f4);
  F('frost', 'Frost', 700, 'alpine', 'frost', 0xdff2ff); F('candy', 'Candy', 1200, 'city', 'candy', 0xd02a4a); F('chrome', 'Mirror Chrome', 2600, 'city', 'chrome', 0xeef2f6);
  /* ---- wheels + rims ---- */
  const W = (k, n, pr, reg, style) => cosAdd('wheel', k, n, pr, reg, { rimStyle: style });
  W('multi', 'Ten-Spoke', 380, null, 'multi'); W('five', 'Five-Star', 380, null, 'five'); W('steel', 'Hauler Steel', 320, 'harbor', 'steel'); W('disc', 'Turbine Disc', 700, 'city', 'disc');
  W('mesh', 'Lattice Mesh', 560, 'tropic', 'mesh'); W('tri', 'Tri-Blade', 520, 'desert', 'tri'); W('seven', 'Heptad', 460, 'lake', 'seven'); W('alp', 'Snow Star', 480, 'alpine', 'five'); W('farmw', 'Field Steel', 300, 'farm', 'steel');
  const R = (k, n, pr, reg, hex) => cosAdd('rim', k, n, pr, reg, { rgb: _rgbOf(hex) }, hex);
  R('gun', 'Gunmetal', 160, null, 0x3a3d44); R('blk', 'Gloss Black', 160, null, 0x08090b); R('wht', 'Chalk White', 180, null, 0xe6e8ea); R('red', 'Signal Red', 200, 'harbor', 0xc4202a); R('gold', 'Desert Gold', 260, 'desert', 0xd8a838);
  R('bronze', 'Bronze', 220, 'farm', 0x8a5a2a); R('mint', 'Seafoam', 220, 'tropic', 0x6ae0c0); R('ice', 'Ice Blue', 220, 'alpine', 0x8ec8f0); R('pine', 'Pine', 200, 'lake', 0x2a5a3a); R('chr', 'Chrome', 340, 'city', 0xf2f4f8); R('neon', 'Neon Lime', 300, 'city', 0x9aff2a);
  /* ---- body kit (one item per slot is worn) ---- */
  const K = (k, n, pr, reg, slot, fn) => cosAdd('kit', k, n, pr, reg, { slot, fn });
  K('lip', 'Ducktail Lip', 260, null, 'rear', (b) => { b.lip = true; }); K('skirts', 'Side Skirts', 300, null, 'side', (b) => { b.skirts = true; });
  K('split', 'Front Splitter', 360, null, 'front', (b) => { b.splitter = true; }); K('diff', 'Rear Diffuser', 520, 'city', 'rear', (b) => { b.diffuser = true; });
  K('spoil', 'Sport Spoiler', 420, null, 'wing', (b) => { b.wing = { h: 0.2, z: 0.28, span: 0.72, chord: 0.3, plates: false }; }); K('gt', 'GT Wing', 940, 'city', 'wing', (b) => { b.wing = { h: 0.46, z: 0.34, span: 0.9, chord: 0.4, plates: true }; });
  K('scoop', 'Hood Scoop', 360, 'desert', 'hood', (b) => { b.scoop = { z: b.L * 0.2, len: 0.72, w: 0.3, h: 0.12 }; }); K('rack', 'Roof Rack', 420, 'alpine', 'roof', (b) => { b.rack = true; }); K('rackl', 'Timber Rack', 380, 'lake', 'roof', (b) => { b.rack = true; });
  K('bull', 'Bull Bar', 480, 'harbor', 'bar', (b) => { b.bullbar = true; }); K('bullf', 'Ranch Bar', 460, 'farm', 'bar', (b) => { b.bullbar = true; }); K('wide', 'Wide-body Flares', 780, 'tropic', 'body', (b) => { b.flares = true; });
  K('intk', 'Side Intakes', 340, 'city', 'vent', (b) => { b.intakes = true; });
  /* ---- livery ---- */
  const Lv = (k, n, pr, reg, pat, hex) => cosAdd('liv', k, n, pr, reg, { k: pat, rgb: _rgbOf(hex) }, hex);
  Lv('rw', 'Racing Stripes · White', 340, null, 'dual', 0xf2f2f2); Lv('rb', 'Racing Stripes · Black', 340, null, 'dual', 0x15171c); Lv('rg', 'Center Stripe · Gold', 380, null, 'center', 0xe0a020);
  Lv('dock', 'Dock Stripe', 300, 'harbor', 'sides', 0xe8d21c); Lv('dust', 'Dust Runner', 320, 'desert', 'rocker', 0xe6d3a2); Lv('hay', 'Hayride', 300, 'farm', 'sides', 0xd9a93a);
  Lv('palm', 'Palm Fade', 360, 'tropic', 'center', 0x20c4c0); Lv('sun', 'Sunset Sides', 360, 'tropic', 'sides', 0xff6a5a); Lv('ski', 'Ski Patrol', 340, 'alpine', 'sides', 0xd33a2a); Lv('frost', 'Frostbite Hood', 340, 'alpine', 'hood', 0xe8f4ff);
  Lv('trail', 'Trail Marker', 320, 'lake', 'rocker', 0x6ac27a); Lv('chk', 'Checkered Flag', 520, 'city', 'checker', 0x15171c); Lv('neon', 'Neon Line', 460, 'city', 'center', 0x2affff);
  /* ---- underglow ---- */
  const G = (k, n, pr, reg, mode, hex) => cosAdd('glow', k, n, pr, reg, { hex, mode }, hex);
  G('cyan', 'Cyan', 460, null, 'solid', 0x2affff); G('mag', 'Magenta', 460, null, 'solid', 0xff2ad0); G('lime', 'Lime', 460, null, 'solid', 0x7aff2a); G('amber', 'Amber', 440, 'desert', 'solid', 0xffa02a); G('teal', 'Lagoon', 480, 'tropic', 'solid', 0x20e0c0);
  G('ice', 'Ice', 480, 'alpine', 'solid', 0xaad8ff); G('red', 'Red', 440, null, 'solid', 0xff2a3a); G('pulse', 'Heartbeat', 900, 'city', 'pulse', 0xff2a5a); G('rain', 'Rainbow', 1800, 'city', 'rainbow', 0xffffff);
  /* ---- window tint + headlights ---- */
  const T = (k, n, pr, reg, hex) => cosAdd('tint', k, n, pr, reg, { hex }, hex);
  T('smoke', 'Smoke', 150, null, 0x020304); T('blue', 'Deep Blue', 220, 'lake', 0x0a2a60); T('green', 'Emerald', 220, 'harbor', 0x0a4a2c); T('amber', 'Amber', 240, 'desert', 0x5a360a); T('violet', 'Violet', 260, 'city', 0x30106a); T('ice', 'Ice', 240, 'alpine', 0x2a5a80);
  const H = (k, n, pr, reg, hex) => cosAdd('head', k, n, pr, reg, { hex }, hex);
  H('xenon', 'Xenon White', 320, null, 0xdff0ff); H('warm', 'Warm Amber', 300, 'desert', 0xffb050); H('ice', 'Ice Blue', 360, 'alpine', 0x9ad0ff); H('lime', 'Acid Green', 380, 'lake', 0xa0ff70); H('violet', 'Violet', 400, 'city', 0xb070ff);
  /* ---- outfit ---- */
  const Ht = (k, n, pr, reg, style, hex, hex2) => cosAdd('hat', k, n, pr, reg, { k: style, c: hex, bc: hex2 || null }, hex);
  Ht('capr', 'Cap · Red', 60, null, 'cap', 0xc0392b); Ht('capb', 'Cap · Navy', 60, null, 'cap', 0x1f3a5f); Ht('capk', 'Cap · Black', 60, null, 'cap', 0x15171c);
  Ht('beanr', 'Beanie · Red', 70, 'alpine', 'beanie', 0xd33a2a); Ht('beanw', 'Beanie · Snow', 70, 'alpine', 'beanie', 0xf2f2f2); Ht('beang', 'Beanie · Forest', 70, 'lake', 'beanie', 0x2a5a3a);
  Ht('hardy', 'Hard Hat · Yellow', 90, 'harbor', 'hard', 0xe8d21c); Ht('hardo', 'Hard Hat · Orange', 90, 'harbor', 'hard', 0xf08a1c);
  Ht('straw', 'Straw Hat', 90, 'tropic', 'straw', 0xe8d49a); Ht('sun', 'Sun Hat · Coral', 100, 'tropic', 'straw', 0xff9a8a); Ht('cowb', 'Cowboy · Brown', 150, 'desert', 'cowboy', 0x6a4a2c); Ht('cowt', 'Cowboy · Tan', 150, 'desert', 'cowboy', 0xc9a574);
  Ht('ranch', 'Ranch Hat', 130, 'farm', 'cowboy', 0x3a2a1c); Ht('top', 'Top Hat', 280, 'city', 'top', 0x111114);
  const Gl = (k, n, pr, reg, hex) => cosAdd('glasses', k, n, pr, reg, { c: hex ? hex : null }, hex || 0x1a1a20);
  Gl('shade', 'Shades', 90, null, 0); Gl('ski', 'Ski Goggles', 130, 'alpine', 0xff9a2a); Gl('mirror', 'Mirror Shades', 200, 'city', 0x9ab0c8); Gl('neon', 'Neon Shades', 160, 'tropic', 0xff3a9a); Gl('gold', 'Gold Lenses', 140, 'desert', 0xe0b040);
  Gl('hv', 'Safety Glasses', 70, 'harbor', 0xaad8e8);
  const Tp = (k, n, pr, reg, hex, sl) => cosAdd('top', k, n, pr, reg, { c: hex, sleeve: sl !== false }, hex);
  Tp('tw', 'Tee · White', 40, null, 0xf2f2f2, false); Tp('tk', 'Tee · Black', 40, null, 0x1b1d22, false); Tp('tr', 'Hoodie · Red', 80, null, 0xc0392b); Tp('tb', 'Hoodie · Blue', 80, null, 0x2e6fa8);
  Tp('vest', 'Hi-Vis Jacket', 110, 'harbor', 0xf08a1c); Tp('poncho', 'Desert Wrap', 110, 'desert', 0xd9c49a); Tp('barn', 'Barn Jacket', 110, 'farm', 0x8a5a38); Tp('hawa', 'Island Shirt', 100, 'tropic', 0xff7a6a, false); Tp('hawb', 'Lagoon Shirt', 100, 'tropic', 0x2fc4c0, false);
  Tp('ski', 'Ski Jacket', 160, 'alpine', 0xd33a2a); Tp('skib', 'Glacier Jacket', 160, 'alpine', 0x2e6fa8); Tp('flan', 'Flannel · Red', 90, 'lake', 0xb4452b); Tp('flag', 'Flannel · Green', 90, 'lake', 0x3d6b3a);
  Tp('suit', 'Charcoal Suit', 260, 'city', 0x1f2430); Tp('suitb', 'Navy Suit', 260, 'city', 0x1c2a4a); Tp('suitw', 'Ivory Suit', 300, 'city', 0xe6e0d0);
  const Bt = (k, n, pr, reg, hex, sh) => cosAdd('bottom', k, n, pr, reg, { c: hex, shorts: !!sh }, hex);
  Bt('jean', 'Jeans', 50, null, 0x3a4a63); Bt('khaki', 'Khakis', 50, null, 0x8a7a5a); Bt('black', 'Black Pants', 50, null, 0x1d1f26); Bt('work', 'Work Pants', 60, 'harbor', 0x4a5058); Bt('dsrt', 'Dust Trousers', 60, 'desert', 0xb09a72);
  Bt('ovr', 'Overalls', 60, 'farm', 0x4a5a78); Bt('shrt', 'Board Shorts', 60, 'tropic', 0x2fc4c0, true); Bt('shrp', 'Coral Shorts', 60, 'tropic', 0xff7a6a, true); Bt('snow', 'Snow Pants', 90, 'alpine', 0x2f3b4f); Bt('cord', 'Cord Trousers', 70, 'lake', 0x5b5348); Bt('slack', 'Tailored Slacks', 120, 'city', 0x2a2f3a);
  const Sh = (k, n, pr, reg, hex) => cosAdd('shoes', k, n, pr, reg, { c: hex }, hex);
  Sh('white', 'White Sneakers', 50, null, 0xe6e6e6); Sh('red', 'Red Sneakers', 60, null, 0x7a2a22); Sh('boot', 'Work Boots', 70, 'harbor', 0x3a2a1c); Sh('cbt', 'Cowboy Boots', 100, 'desert', 0x6a4a2c); Sh('fboot', 'Field Boots', 70, 'farm', 0x4a3a28);
  Sh('flip', 'Beach Sandals', 40, 'tropic', 0xf5d04a); Sh('snowb', 'Snow Boots', 90, 'alpine', 0x2a2f36); Sh('hike', 'Hiking Boots', 80, 'lake', 0x6a5a3a); Sh('dress', 'Dress Shoes', 110, 'city', 0x15151a);
  const Hr = (k, n, pr, reg, hex) => cosAdd('hair', k, n, pr, reg, { c: hex }, hex);
  Hr('black', 'Jet Black', 40, null, 0x0d0d0d); Hr('brown', 'Chestnut', 40, null, 0x4a3524); Hr('blond', 'Blonde', 50, null, 0xd0a850); Hr('ginger', 'Ginger', 50, null, 0x9a4a22); Hr('silver', 'Silver', 70, null, 0xb8b8b4);
  Hr('pink', 'Flamingo Pink', 90, 'tropic', 0xff7aa8); Hr('blue', 'Electric Blue', 100, 'city', 0x2a6aff); Hr('ice', 'Ice White', 90, 'alpine', 0xe8f0f8); Hr('lime', 'Lime', 90, 'lake', 0x8aff3a);
})();

/* ---------- ownership + equip records ---------- */
function cosSave() { const s = save.cos || (save.cos = { own: {}, car: {}, out: {} }); s.own = s.own || {}; s.car = s.car || {}; s.out = s.out || {}; return s; }
function cosRec(id) { const s = cosSave(); id = id || save.car; const r = s.car[id] || (s.car[id] = {}); r.kit = r.kit || {}; return r; }
function cosClean(r) { const o = {}; for (const k of COS.CAR) if (k !== 'kit' && r[k]) o[k] = r[k]; o.kit = Object.assign({}, r.kit || {}); return o; }
/* resolve an equip record into items (owned only unless preview) */
function cosView(rec, preview) {
  const own = cosSave().own, ok = (id) => (id && COS.by[id] && (preview || own[id]) ? COS.by[id] : null);
  const V = { kits: [] }; for (const k of COS.CAR) if (k !== 'kit') V[k] = ok(rec && rec[k]);
  if (rec && rec.kit) for (const sl in rec.kit) { const it = ok(rec.kit[sl]); if (it) V.kits.push(it); }
  return V;
}
function curColor(id) { id = id || save.car; const V = cosView(cosSave().car[id]); return V.paint ? V.paint.val.hex : PAINTS[curPaint(id)]; }
function cosSig(id) { id = id || save.car; const r = cosSave().car[id]; if (!r) return ''; const V = cosView(r), a = []; for (const k of COS.CAR) if (k !== 'kit' && V[k]) a.push(V[k].id); for (const it of V.kits) a.push(it.id); return a.join(','); }
/* body flags for the car builder */
function cosDef(d, V) {
  if (!V || (!V.wheel && !V.rim && !V.kits.length && !V.liv)) return d;
  const b = Object.assign({}, d.body);
  if (V.wheel) b.rimStyle = V.wheel.val.rimStyle;
  if (V.rim) b.rim = V.rim.val.rgb;
  for (const k of V.kits) k.val.fn(b);
  if (V.liv && V.liv.val.k === 'dual') b.stripes = V.liv.val.rgb;
  return Object.assign({}, d, { body: b });
}
function cosOpts(V, studio, stat) {
  const c = {}; if (V.fin) c.fin = V.fin.val.fin; if (V.tint) c.tint = V.tint.val.hex; if (V.head) c.head = V.head.val.hex; if (V.glow) c.glow = V.glow.val;
  if (V.liv && V.liv.val.k !== 'dual') c.livery = { k: V.liv.val.k, c: V.liv.val.rgb };
  return { cos: c, studio: !!studio, static: !!(studio || stat) };
}
function buildPlayerCar(d, id, studio, rec, stat) {
  id = id || d.id; const V = cosView(rec || cosSave().car[id], !!rec), hex = V.paint ? V.paint.val.hex : (rec && rec.cc != null ? PAINTS[rec.cc] : PAINTS[curPaint(id)]);
  const m = buildCarModel(cosDef(d, V), hex, cosOpts(V, studio, stat)); m.userData.cosV = V; return m;
}

/* ---------- paint finishes ---------- */
const FIN = {
  gloss: { r: 0.45, m: 0.25, cc: 0.9, ccr: 0.16, e: 0.55 }, matte: { r: 0.92, m: 0.04, cc: 0.0, ccr: 0.6, e: 0.12 }, satin: { r: 0.56, m: 0.2, cc: 0.3, ccr: 0.4, e: 0.3 },
  metallic: { r: 0.3, m: 0.85, cc: 1.0, ccr: 0.1, e: 0.95 }, pearl: { r: 0.3, m: 0.5, cc: 1.0, ccr: 0.06, e: 0.9, sheen: 0.9 }, frost: { r: 0.4, m: 0.35, cc: 0.8, ccr: 0.3, e: 0.7, sheen: 0.6 },
  candy: { r: 0.16, m: 0.6, cc: 1.0, ccr: 0.03, e: 1.0, deep: true }, chrome: { r: 0.05, m: 1.0, cc: 0.0, ccr: 0.0, e: 1.7, bright: true }
};
function applyFinish(m, fin) {
  const f = FIN[fin] || FIN.gloss; m.roughness = f.r; m.metalness = f.m; m.clearcoat = f.cc; m.clearcoatRoughness = f.ccr; m.envMapIntensity = f.e;
  if (f.deep) { m.color.multiplyScalar(0.8); } if (f.bright) { m.color.lerp(new THREE.Color(1, 1, 1), 0.55); }
  m.needsUpdate = true;
}

/* ---------- underglow ---------- */
let _glowTex = null;
function glowTexture() {
  if (_glowTex) return _glowTex; const cv = mkCanvas(128, 128), g = cv.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 6, 64, 64, 62); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.55)'); gr.addColorStop(0.82, 'rgba(255,255,255,0.14)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); _glowTex = new THREE.CanvasTexture(cv); return _glowTex;
}
function makeGlow(S, hex, mode) {
  const L = S.b.L, W = S.b.W, geo = new THREE.PlaneGeometry(W * 1.75, L * 1.45); geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({ map: glowTexture(), color: lc(hex).multiplyScalar(1.6), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: true });
  mat.opacity = 0.7; const m = new THREE.Mesh(geo, mat); m.position.y = 0.09; m.renderOrder = 3; m.frustumCulled = false; m.userData.glow = { mode, base: lc(hex) }; return m;
}
const _gc = new THREE.Color();
function glowTick(grp, time, night) {
  const g = grp && grp.userData.glowM; if (!g) return; const d = g.userData.glow;
  let k = 0.5 + 0.75 * night;
  if (d.mode === 'pulse') k *= 0.55 + 0.45 * Math.sin(time * 5.2);
  g.material.opacity = Math.min(1, k * 0.9);
  if (d.mode === 'rainbow') _gc.setHSL((time * 0.12) % 1, 1, 0.55).convertSRGBToLinear(); else _gc.copy(d.base);
  g.material.color.copy(_gc).multiplyScalar(1.6);
}
/* headlight tint for the player's car, called every frame */
const _hc = new THREE.Color();
function headTick(grp) {
  const hm = grp && grp.userData.headMat; if (!hm) return;
  const t = grp.userData.headTint; _hc.copy(MAT.carHead.color); const mx = Math.max(t.r, t.g, t.b, 0.001); hm.color.setRGB(_hc.r * (t.r / mx), _hc.g * (t.g / mx), _hc.b * (t.b / mx));
}

/* ---------- avatar outfit ---------- */
function cosOutfitView(rec, preview) { return cosView2(rec || cosSave().out, preview); }
function cosView2(rec, preview) { const own = cosSave().own, V = {}; for (const k of COS.OUT) { const id = rec && rec[k]; V[k] = id && COS.by[id] && (preview || own[id]) ? COS.by[id] : null; } return V; }
function cosApplyOutfit(app, V) {
  if (V.hat) app.hat = { k: V.hat.val.k, c: lc(V.hat.val.c), bc: V.hat.val.bc ? lc(V.hat.val.bc) : null }; else app.hat = null;
  if (V.glasses) { app.glasses = true; app.glassC = V.glasses.val.c ? lc(V.glasses.val.c) : null; } else { app.glasses = false; app.glassC = null; }
  if (V.top) { app.shirt = lc(V.top.val.c); app.sleeve = V.top.val.sleeve; }
  if (V.bottom) { app.pants = lc(V.bottom.val.c); app.shorts = !!V.bottom.val.shorts; } else app.shorts = false;
  if (V.shoes) app.shoe = lc(V.shoes.val.c);
  if (V.hair) app.hair = lc(V.hair.val.c);
  return app;
}
/* stock for a region's shop */
function cosStock(regKey) { return COS.items.filter((it) => !it.reg || it.reg === regKey); }

/* ---------- the player's own car: shared paint material (cockpit) + per-frame effects ---------- */
const Cosm = {
  paintPlayer() {
    const m = MAT.paintPlayer; if (!m) return; const V = cosView(cosSave().car[save.car]);
    m.color.copy(lc(curColor())); m.roughness = 0.45; m.metalness = 0.25; m.clearcoat = 0.9; m.clearcoatRoughness = 0.16; m.envMapIntensity = 0.45;
    if (V.fin && V.fin.val.fin !== 'gloss') applyFinish(m, V.fin.val.fin);
  },
  tick() {
    const g = car.ext; if (!g || !L.head) return;
    glowTick(g, App.time, env.night); headTick(g);
    const t = g.userData.headTint; if (t) L.head.color.setRGB(0.35 + 0.65 * t.r, 0.35 + 0.65 * t.g, 0.35 + 0.65 * t.b); else L.head.color.setRGB(1, 0.94, 0.85);
  }
};
