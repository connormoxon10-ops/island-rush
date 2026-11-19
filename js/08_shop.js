/* ================= CUSTOMS: one cosmetic shop in every town =================
   Each town has a Customs storefront (built into its block at row 4 / column 3, themed to the region), a marker on its forecourt and a
   map icon. Pull up or walk up and press E: the shop is its own studio scene with a turntable car and your character, a try-before-you-buy
   panel, and a stock list that is shared plus whatever that biome specialises in (see cosStock / the `reg` field of every item). */
const SHOP_I = 4, SHOP_J = 3;
const SHOP_AX = 0;
const SHOP_STY = {
  harbor: { wall: 0x6a727c, trim: 0xf2b632, roof: 0x3a4048, door: 0x9aa2aa, glass: 0x14222e },
  desert: { wall: 0xe0c08c, trim: 0xe07a3a, roof: 0xc89a68, door: 0xa8603c, glass: 0x1a2630 },
  farm: { wall: 0xa23a2c, trim: 0xf0eadb, roof: 0x4a4540, door: 0xf0eadb, glass: 0x1a2430 },
  tropic: { wall: 0xf4efe0, trim: 0x2fc4c0, roof: 0x2fc4c0, door: 0xff7a6a, glass: 0x123a44 },
  alpine: { wall: 0x8d6b48, trim: 0xd33a2a, roof: 0xf2f6fa, door: 0x5a4632, glass: 0x1a2630 },
  lake: { wall: 0x6a553f, trim: 0x3d6b3a, roof: 0x3e4a3a, door: 0x7a6650, glass: 0x142228 },
  city: { wall: 0x252b35, trim: 0x7a3ff0, roof: 0x16191f, door: 0x303844, glass: 0x0c1824 }
};
const SHOP_ICO = { wheel: '◎', kit: '▣' };
const Shop = { sites: [], ready: false, on: false, near: null, S: null, tab: 'paint', drafts: {}, cur: null, rec: null, out: {}, carId: 'rook', az: 0.55, azIdle: 0, zoom: 1, sc: null, carMesh: null, av: null, focus: null, fc: { x: 0, y: 1, D: 8, el: 0.15 }, which: 'car', fx: { speed: 0, damage: 0, chroma: 0, expo: 1 }, expo: 0.95, drag: null, vkey: '', tvis: 0 };
const _hexCss = (h) => '#' + h.toString(16).padStart(6, '0');

/* ---------- sites ---------- */
Shop.setup = function () {
  Shop.sites = towns.map((T, ti) => {
    const R = REG[ti % REG.length], bs = T.cell - 14, bx0 = T.x0 + SHOP_I * T.cell + 7, bz0 = T.z0 + SHOP_J * T.cell + 7;
    const lx0 = bx0 + 1.5, lz0 = bz0 + 1.5, ls = bs / 2 - 3;
    return { ti, T, R, lx0, lz0, ls, x: lx0 + ls / 2, z: lz0 + 6.5, y: T.baseH, bx: lx0 + 4, bz: lz0 + 13, bw: 24, bd: 15, tex: null, mat: null, ptex: null, pmat: null, mk: null };
  });
  Shop.ready = true;
};
Shop.lot = function (T, i, j, a, b) { return Shop.ready && i === SHOP_I && j === SHOP_J && a === 0 && b === 0; };

function shopSignTex(S) {
  const cv = mkCanvas(1024, 128), g = cv.getContext('2d'), col = _hexCss(S.R.col);
  g.fillStyle = '#0a0d12'; g.fillRect(0, 0, 1024, 128); g.fillStyle = col; g.fillRect(0, 0, 1024, 9); g.fillRect(0, 119, 1024, 9);
  g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillStyle = '#ffffff'; g.font = '700 74px "Chakra Petch", Rajdhani, "Arial Black", sans-serif'; g.fillText('CUSTOMS', 36, 66);
  g.textAlign = 'right'; g.fillStyle = col; g.font = '700 54px Rajdhani, "Arial Narrow", sans-serif'; g.fillText(S.R.name.toUpperCase(), 990, 69);
  const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; t.anisotropy = maxAniso; return t;
}
function shopPylonTex(S) {
  const cv = mkCanvas(256, 320), g = cv.getContext('2d'), col = _hexCss(S.R.col);
  g.fillStyle = '#0a0d12'; g.fillRect(0, 0, 256, 320); g.fillStyle = col; g.fillRect(0, 0, 256, 18); g.fillRect(0, 302, 256, 18);
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.font = '700 46px "Chakra Petch", Rajdhani, "Arial Black", sans-serif'; g.fillText('CUSTOMS', 128, 110);
  g.fillStyle = col; g.beginPath(); g.arc(128, 188, 46, 0, TAU); g.fill(); g.fillStyle = '#0a0d12'; g.beginPath(); g.arc(128, 188, 30, 0, TAU); g.fill(); g.fillStyle = col; g.beginPath(); g.arc(128, 188, 14, 0, TAU); g.fill();
  g.fillStyle = '#fff'; g.font = '700 30px Rajdhani, "Arial Narrow", sans-serif'; g.fillText(S.R.name.toUpperCase(), 128, 262);
  const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; t.anisotropy = maxAniso; return t;
}

/* ---------- the storefront (called while the chunk that owns the lot is built) ---------- */
Shop.build = function (ch, S, gbB, gbP) {
  const R = S.R, key = R.key, st = SHOP_STY[key], g0 = S.T.baseH, X0 = S.bx, X1 = S.bx + S.bw, Z0 = S.bz, Z1 = S.bz + S.bd;
  const pitched = key === 'farm' || key === 'alpine' || key === 'lake' || key === 'tropic', H = key === 'city' ? 10 : 8.4;
  const wall = lc(st.wall), trim = lc(st.trim), roofC = lc(st.roof), door = lc(st.door), glass = lc(st.glass), acc = lc(R.col), dark = lc(0x15181d), conc = lc(0x6b6e72);
  const B = (a, b, c, d, e, f, col, k) => { k = k == null ? 1 : k; gbP.box(a, b, c, d, e, f, col.r * k, col.g * k, col.b * k); };
  const r = mulberry32(ihash(S.ti * 131 + 7, 3, 9));
  const tree = (kind, x, z, sc) => { addTree(gbP, ch.gbF, kind, (r() * 3) | 0, x, g0, z, sc, r() * TAU, r(), 1, r(), ch); };
  /* forecourt apron + markings */
  const fx0 = S.lx0 + 0.6, fx1 = S.lx0 + S.ls - 0.6, fz0 = S.lz0 + 0.6, line = lc(0xe8e4d4);
  B(fx0, g0 - 0.2, fz0, fx1, g0 + 0.05, Z0, lc(0x30333a));
  B(fx0, g0 + 0.05, fz0, fx1, g0 + 0.075, fz0 + 0.4, acc, 1.05);
  for (let k = 0; k < 5; k++) B(S.lx0 + 4.5 + k * 5.2, g0 + 0.05, Z0 - 6.5, S.lx0 + 4.8 + k * 5.2, g0 + 0.075, Z0 - 1.6, line, 0.9);
  /* body */
  B(X0 - 0.2, g0 - 0.3, Z0 - 0.2, X1 + 0.2, g0 + 0.55, Z1 + 0.2, conc);
  B(X0, g0 - 0.3, Z0, X1, g0 + H, Z1, wall);
  if (key === 'city') for (let k = 0; k < 5; k++) B(X0 + 1.5 + k * 4.5, g0 + 0.5, Z1 + 0.01, X0 + 1.7 + k * 4.5, g0 + H, Z1 + 0.14, acc, 0.6);
  /* roll-up bays */
  for (const [a, b] of [[X0 + 1.4, X0 + 8.4], [X0 + 9.8, X0 + 16.8]]) {
    B(a - 0.35, g0, Z0 - 0.2, b + 0.35, g0 + 4.9, Z0 - 0.02, trim);
    B(a, g0, Z0 - 0.34, b, g0 + 4.5, Z0 - 0.2, door);
    for (let k = 1; k < 8; k++) B(a, g0 + k * 0.55, Z0 - 0.37, b, g0 + k * 0.55 + 0.07, Z0 - 0.33, door, 0.55);
    B(a + 0.6, g0 + 3.7, Z0 - 0.38, b - 0.6, g0 + 4.1, Z0 - 0.34, glass);
  }
  /* showroom window + entrance */
  const wx0 = X0 + 18.2, wx1 = X1 - 0.9, wm = (wx0 + wx1) / 2;
  B(wx0 - 0.25, g0, Z0 - 0.15, wx1 + 0.25, g0 + 4.5, Z0 - 0.02, trim);
  B(wx0, g0 + 0.6, Z0 - 0.3, wx1, g0 + 4.2, Z0 - 0.15, glass);
  B(wm - 0.07, g0 + 0.6, Z0 - 0.34, wm + 0.07, g0 + 4.2, Z0 - 0.3, trim, 0.85);
  B(wx0, g0 + 2.3, Z0 - 0.34, wx1, g0 + 2.38, Z0 - 0.3, trim, 0.85);
  /* canopy */
  B(wx0 - 0.8, g0 + 4.7, Z0 - 3.2, wx1 + 0.4, g0 + 5.0, Z0 - 0.02, acc, key === 'city' ? 1.6 : 1);
  for (const px of [wx0 - 0.7, wx1 + 0.3]) { B(px, g0, Z0 - 3.1, px + 0.22, g0 + 4.7, Z0 - 2.88, dark); colCyl(ch, px + 0.11, Z0 - 3, 0.2, g0, g0 + 4.7); }
  colBox(ch, wx0 - 0.8, Z0 - 3.2, wx1 + 0.4, Z0 - 0.02, g0 + 4.7, g0 + 5.0);
  /* sign band */
  B(X0 + 0.5, g0 + H - 3.3, Z0 - 0.3, X1 - 0.5, g0 + H - 0.1, Z0 - 0.04, dark);
  if (key === 'city') { B(X0 + 0.5, g0 + H - 3.38, Z0 - 0.32, X1 - 0.5, g0 + H - 3.3, Z0 - 0.28, acc, 2.2); B(X0 + 0.5, g0 + H - 0.1, Z0 - 0.32, X1 - 0.5, g0 + H - 0.02, Z0 - 0.28, acc, 2.2); }
  /* roof */
  if (pitched) houseRoof(gbB, X0, Z0, X1, Z1, g0 + H, 2.6, roofC, wall);
  else {
    B(X0 - 0.3, g0 + H, Z0 - 0.3, X1 + 0.3, g0 + H + 0.45, Z1 + 0.3, roofC);
    B(X0 + 3, g0 + H + 0.45, Z0 + 4, X0 + 6, g0 + H + 1.5, Z0 + 7, lc(0x8a8e94)); B(X0 + 9, g0 + H + 0.45, Z0 + 5, X0 + 12.5, g0 + H + 1.4, Z0 + 8, lc(0x8a8e94));
    if (key === 'city') B(X0 + 2, g0 + H + 0.45, Z0 + 2, X1 - 2, g0 + H + 1.6, Z1 - 2, dark);
    if (key === 'desert') { cylAt(gbP, X1 - 4, g0 + H + 0.45, Z1 - 4, 1.7, 2.4, 1.7, 0.55, 0.58, 0.62); }
  }
  colBox(ch, X0 - 0.3, Z0 - 0.3, X1 + 0.3, Z1 + 0.3, g0 - 0.3, g0 + H + (pitched ? 0 : key === 'city' ? 1.6 : 0.45), pitched ? 2.6 : 0);
  /* pylon sign at the road corner */
  const px = S.lx0 + 2.4, pz = S.lz0 + 2.6;
  B(px - 0.2, g0, pz - 0.2, px + 0.2, g0 + 9.2, pz + 0.2, dark); B(px - 1.5, g0 + 6.2, pz - 0.26, px + 1.5, g0 + 9.6, pz + 0.26, dark);
  B(px - 1.5, g0 + 9.6, pz - 0.3, px + 1.5, g0 + 9.72, pz + 0.3, acc, 1.5);
  colBox(ch, px - 0.2, pz - 0.2, px + 0.2, pz + 0.2, g0, g0 + 9.2); colBox(ch, px - 1.5, pz - 0.26, px + 1.5, pz + 0.26, g0 + 6.2, g0 + 9.72);
  /* region dressing */
  const bx = S.lx0 + S.ls;
  if (key === 'harbor') {
    const cc = [[0.72, 0.18, 0.14], [0.14, 0.34, 0.62], [0.9, 0.55, 0.12], [0.16, 0.5, 0.42]];
    for (let k = 0; k < 2; k++) { const c = cc[(r() * 4) | 0], c2 = cc[(r() * 4) | 0]; B(X0 + k * 12.6, g0, Z1 + 0.5, X0 + k * 12.6 + 12.2, g0 + 2.6, Z1 + 3.0, { r: c[0], g: c[1], b: c[2] }); if (k === 0) B(X0, g0 + 2.6, Z1 + 0.5, X0 + 12.2, g0 + 5.2, Z1 + 3.0, { r: c2[0], g: c2[1], b: c2[2] }); }
    colBox(ch, X0, Z1 + 0.4, X0 + 12.2, Z1 + 3.1, g0, g0 + 5.2); colBox(ch, X0 + 12.6, Z1 + 0.4, X0 + 24.8, Z1 + 3.1, g0, g0 + 2.6);
    for (let k = 0; k < 5; k++) cylAt(gbP, S.lx0 + S.ls - 2.2 - (k % 2) * 1.5, g0 + (k > 2 ? 0.8 : 0), Z0 - 5 + (k % 3) * 1.1, 0.55, 0.8, 0.55, 0.06, 0.06, 0.07);
    for (const lx of [fx0 + 1.2, fx1 - 1.2]) { B(lx - 0.15, g0, fz0 + 1.2, lx + 0.15, g0 + 1.1, fz0 + 1.5, acc, 0.9); }
  } else if (key === 'desert') {
    tree('cactus', S.lx0 + 3.5, Z0 - 5.5, 1.0); tree('cactus', bx - 3, Z0 - 8, 0.85); tree('scrub', S.lx0 + 10, S.lz0 + 2.2, 0.9);
    B(fx0, g0 + 0.05, fz0 + 4.2, fx0 + 3.6, g0 + 0.9, fz0 + 4.8, lc(0xb98558));
  } else if (key === 'farm') {
    for (let k = 0; k < 4; k++) { const hx = bx - 3.2 - (k % 2) * 2.2, hz = Z0 - 9 + ((k / 2) | 0) * 2.0; B(hx - 1, g0, hz - 0.7, hx + 1, g0 + 1.3, hz + 0.7, lc(0xd0b04a), 0.9); colBox(ch, hx - 1, hz - 0.7, hx + 1, hz + 0.7, g0, g0 + 1.3); }
    cylAt(gbP, S.lx0 + 30.4, g0, Z0 + 6, 1.4, 11, 1.4, 0.74, 0.76, 0.78); cylAt(gbP, S.lx0 + 30.4, g0 + 11, Z0 + 6, 1.5, 1, 1.5, 0.5, 0.52, 0.55); colCyl(ch, S.lx0 + 30.4, Z0 + 6, 1.45, g0, g0 + 12);
    for (let k = 0; k < 6; k++) B(S.lx0 + 6 + k * 2.4, g0, fz0 + 0.9, S.lx0 + 6.14 + k * 2.4, g0 + 1.1, fz0 + 1.05, lc(0xe8e0d0), 0.8);
    B(S.lx0 + 6, g0 + 0.7, fz0 + 0.9, S.lx0 + 18.2, g0 + 0.82, fz0 + 1.05, lc(0xe8e0d0), 0.8);
  } else if (key === 'tropic') {
    tree('palm', S.lx0 + 3.2, Z0 - 6, 1.1); tree('palm', bx - 2.6, Z0 - 5, 1.0); tree('palm', X0 - 1.6, Z0 - 1.5, 1.2);
    for (const [ux, uz, col] of [[S.lx0 + 8, S.lz0 + 3.2, [1, 0.42, 0.38]], [S.lx0 + 24, S.lz0 + 3.4, [0.18, 0.76, 0.74]]]) { cylAt(gbP, ux, g0, uz, 0.07, 2.4, 0.07, 0.7, 0.7, 0.7); cylAt(gbP, ux, g0 + 2.3, uz, 1.6, 0.18, 1.6, col[0], col[1], col[2]); }
  } else if (key === 'alpine') {
    tree('snowpine', S.lx0 + 2.8, Z0 - 4.2, 1.2); tree('snowpine', bx - 2.4, Z0 - 7.5, 1.1); tree('snowpine', X1 + 1.6, Z1 - 3, 1.3);
    for (const [mx, mz, mr] of [[S.lx0 + 8, S.lz0 + 2.6, 2.6], [bx - 6, S.lz0 + 3.2, 2.0], [X0 + 4, Z1 + 1.8, 2.4]]) cylAt(gbP, mx, g0, mz, mr, 0.7, mr * 0.8, 0.93, 0.95, 0.98);
    B(X0 - 0.1, g0 + 0.6, Z0 - 2.4, X0 + 0.1, g0 + 3.0, Z0 - 0.4, lc(0x5a4632)); B(X0 - 0.1, g0 + 3.0, Z0 - 2.4, X0 + 3.4, g0 + 3.2, Z0 - 0.4, lc(0x5a4632));
  } else if (key === 'lake') {
    tree('pine', S.lx0 + 2.8, Z0 - 4.5, 1.1); tree('pine', bx - 2.4, Z0 - 6.5, 1.0); tree('birch', bx - 1.8, Z1 + 1.6, 1.0);
    for (let lv = 0; lv < 3; lv++) for (let k = 0; k < 4 - lv; k++) B(X0 + 1 + k * 1.1 + lv * 0.55, g0 + lv * 0.62, Z0 - 2.2, X0 + 1 + k * 1.1 + lv * 0.55 + 0.95, g0 + lv * 0.62 + 0.6, Z0 - 0.6, lc(lv % 2 ? 0x6a4a2c : 0x7a5632), 0.9);
    colBox(ch, X0 + 1, Z0 - 2.3, X0 + 5.5, Z0 - 0.5, g0, g0 + 1.85);
  } else if (key === 'city') {
    for (const lx of [S.lx0 + 5, S.lx0 + 26]) { B(lx - 1.2, g0, Z0 - 5.8, lx + 1.2, g0 + 0.7, Z0 - 4.4, dark); B(lx - 1.0, g0 + 0.7, Z0 - 5.6, lx + 1.0, g0 + 0.76, Z0 - 4.6, lc(0x2c5a34)); colBox(ch, lx - 1.2, Z0 - 5.8, lx + 1.2, Z0 - 4.4, g0, g0 + 0.76); }
    for (let k = 0; k < 6; k++) B(S.lx0 + 4 + k * 4.8, g0 + 0.075, fz0 + 0.45, S.lx0 + 5.6 + k * 4.8, g0 + 0.09, fz0 + 0.6, acc, 2);
  }
  /* sign meshes (emissive, not part of the batch) */
  if (!S.tex) { S.tex = shopSignTex(S); S.mat = new THREE.MeshBasicMaterial({ map: S.tex, color: new THREE.Color(1.25, 1.25, 1.25) }); S.ptex = shopPylonTex(S); S.pmat = new THREE.MeshBasicMaterial({ map: S.ptex, color: new THREE.Color(1.25, 1.25, 1.25), side: THREE.DoubleSide }); }
  const sg = new THREE.Mesh(new THREE.PlaneGeometry(22, 2.75), S.mat); sg.position.set((X0 + X1) / 2 - ch.x0, g0 + H - 1.7, Z0 - 0.33 - ch.z0); sg.rotation.y = Math.PI; ch.group.add(sg);
  const pg = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 3.5), S.pmat); pg.position.set(px - ch.x0, g0 + 7.9, pz - 0.3 - ch.z0); pg.rotation.y = Math.PI; ch.group.add(pg);
  const pb = new THREE.Mesh(pg.geometry.clone(), S.pmat); pb.position.set(px - ch.x0, g0 + 7.9, pz + 0.3 - ch.z0); ch.group.add(pb);
};

/* ---------- forecourt markers (one per town) ---------- */
Shop.initMarkers = function () {
  if (Shop.mgroup) return; const grp = Shop.mgroup = new THREE.Group(); scene.add(grp);
  for (const S of Shop.sites) {
    const col = S.R.col, g = new THREE.Group(); g.position.set(S.x, S.y + 0.2, S.z);
    const beam = makeBeam(col, 1.8, 110); g.add(beam);
    const ring = new THREE.Mesh(new THREE.RingGeometry(4.5, 5.3, 44), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).convertSRGBToLinear().multiplyScalar(2.4), side: THREE.DoubleSide, transparent: true, opacity: 0.9, depthWrite: false, fog: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.2; g.add(ring);
    const spr = iconSprite('🎨', _hexCss(col)); spr.position.y = 11; g.add(spr);
    grp.add(g); S.mk = { g, beam, ring, spr };
  }
};
Shop.visual = function (dt, time) {
  if (!Shop.mgroup) return;
  for (const S of Shop.sites) {
    const m = S.mk, dist = Math.hypot(S.x - Pl.x, S.z - Pl.z); m.g.visible = dist < 900 && !Mi;
    if (!m.g.visible) continue;
    m.beam.material.opacity = lerp(0.03, 0.75, sstep(12, 260, dist)); const k = clamp(dist / 60, 4, 18);
    m.spr.scale.setScalar(k); m.spr.position.y = 9 + k * 0.5; m.ring.scale.setScalar(1 + Math.sin(time * 3) * 0.04);
  }
};

/* ---------- near / enter ---------- */
Shop.tick = function () {
  let best = null;
  if (Shop.ready && App.mode === 'play' && !Fly.on && !Boat.on && !Mi && !Talk.on && !GAR.edit && !Bust.on && !Tow.on && car.wrecked <= 0 && !devOn('free') && Fare.phase !== 'ride') {
    for (const S of Shop.sites) { const dx = Pl.x - S.x, dz = Pl.z - S.z; if (dx * dx + dz * dz < 42 && (Foot.on || Math.abs(car.speed) < 7)) { best = S; break; } }
  }
  Shop.near = best;
};
Shop.open = function () {
  const S = Shop.near; if (!S || Shop.on || App.mode !== 'play') return;
  if (Wanted.stars > 0) { UI.toast('The cops are on you · lose the heat first', 'bad'); return; }
  for (const k in Keys) Keys[k] = false; for (const k of ['l', 'r', 'gas', 'brk', 'nit', 'hand']) TouchIn[k] = 0;
  try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) { /* ignore */ }
  Shop.S = S; Shop.on = true; Shop.carId = save.car; Shop.drafts = {}; Shop.use(save.car);
  Shop.out = Object.assign({}, cosSave().out); Shop.az = 0.55; Shop.zoom = 1; Shop.azIdle = 0;
  if (!COS.CAR.includes(Shop.tab) && !COS.OUT.includes(Shop.tab)) Shop.tab = 'paint';
  Shop.stage(S); Shop.rebuildCar(); Shop.rebuildAvatar();
  Shop.which = COS.OUT.includes(Shop.tab) ? 'av' : 'car'; Shop.snap();
  UI.setMode('shop'); Shop.paint(); Snd.beep(620, 0.06);
};
Shop.use = function (id) {
  Shop.carId = id; let d = Shop.drafts[id];
  if (!d) { const rec = cosClean(cosSave().car[id] || {}); d = Shop.drafts[id] = { rec, cc: curPaint(id) }; }
  Shop.cur = d; Shop.rec = d.rec;
};
Shop.total = function () {
  const own = cosSave().own, ids = new Set();
  for (const id in Shop.drafts) { const r = Shop.drafts[id].rec; for (const k of COS.CAR) { if (k === 'kit') { for (const s in r.kit) if (r.kit[s]) ids.add(r.kit[s]); } else if (r[k]) ids.add(r[k]); } }
  for (const k of COS.OUT) if (Shop.out[k]) ids.add(Shop.out[k]);
  let sum = 0, n = 0; for (const id of ids) if (!own[id] && COS.by[id]) { sum += COS.by[id].price; n++; }
  const dc = Rel.perk('shop'); if (dc > 0 && sum > 0) sum = Math.round(sum * (1 - dc));
  return { sum, n, ids, dc };
};
Shop.buy = function () {
  const t = Shop.total(); if (!t.n) return;
  if (save.money < t.sum) { UI.toast('Not enough cash · need ' + money(t.sum - save.money) + ' more', 'bad'); Snd.beep(200, 0.12); return; }
  save.money -= t.sum; const own = cosSave().own; for (const id of t.ids) own[id] = 1;
  writeSave(); Snd.win(); UI.toast('Bought ' + t.n + (t.n === 1 ? ' item' : ' items') + ' · ' + money(t.sum), 'good'); Shop.paint();
};
function shopStrip(rec, own) {
  let n = 0;
  for (const k of COS.CAR) { if (k === 'kit') { for (const s in rec.kit) if (!own[rec.kit[s]]) { delete rec.kit[s]; n++; } } else if (rec[k] && !own[rec[k]]) { rec[k] = null; n++; } }
  return n;
}
Shop.commit = function () {
  const s = cosSave(), own = s.own; let lost = 0;
  for (const id in Shop.drafts) { const d = Shop.drafts[id]; lost += shopStrip(d.rec, own); const rec = {}; for (const k of COS.CAR) if (k !== 'kit' && d.rec[k]) rec[k] = d.rec[k]; rec.kit = Object.assign({}, d.rec.kit); s.car[id] = rec; save.cc[id] = d.cc; }
  for (const k of COS.OUT) { const id = Shop.out[k]; if (id && !own[id]) { lost++; delete Shop.out[k]; } }
  s.out = {}; for (const k of COS.OUT) if (Shop.out[k]) s.out[k] = Shop.out[k];
  return lost;
};
Shop.close = function () {
  if (!Shop.on) return; const lost = Shop.commit(); Shop.on = false; Shop.cleanup();
  applyCar(save.car, true); Cosm.paintPlayer(); if (Foot.ped) Foot.ped.app = footApp(); GAR.dirty = true; GAR.sigT = 0;
  UI.setMode('play'); writeSave(); Snd.beep(480, 0.06);
  if (lost) UI.toast(lost + (lost === 1 ? ' previewed item' : ' previewed items') + ' left in the shop', 'info');
};
Shop.reset = function () {
  Shop.drafts = {}; Shop.use(Shop.carId); Shop.out = Object.assign({}, cosSave().out); Shop.rebuildCar(); Shop.rebuildAvatar(); Shop.paint();
};

/* ---------- the studio ---------- */
function shopStage(tableR, wallR) {
  const sc = new THREE.Scene(), o = { sc, bars: [] }; sc.background = new THREE.Color(0x06080c);
  sc.add(new THREE.HemisphereLight(0xcfe0ff, 0x14171d, 0.5));
  const key = new THREE.DirectionalLight(0xfff0dc, 1.25); key.position.set(-6, 9, 7); sc.add(key);
  const rim = new THREE.DirectionalLight(0x8fbaff, 0.85); rim.position.set(7, 4, -7); sc.add(rim);
  const fill = new THREE.DirectionalLight(0xffffff, 0.2); fill.position.set(6, 3, 7); sc.add(fill);
  const fl = new THREE.Mesh(new THREE.CircleGeometry(wallR, 56), new THREE.MeshStandardMaterial({ color: 0x07090d, roughness: 0.5, metalness: 0.3 })); fl.rotation.x = -Math.PI / 2; fl.position.y = -0.2; sc.add(fl);
  const tb = new THREE.Mesh(new THREE.CylinderGeometry(tableR, tableR * 1.03, 0.2, 56), new THREE.MeshStandardMaterial({ color: 0x141922, roughness: 0.35, metalness: 0.5 })); tb.position.y = -0.1; sc.add(tb);
  o.ringM = new THREE.MeshBasicMaterial({ color: 0xffffff }); const rg = new THREE.Mesh(new THREE.TorusGeometry(tableR * 0.97, 0.035, 8, 90), o.ringM); rg.rotation.x = Math.PI / 2; rg.position.y = 0.012; sc.add(rg);
  o.wallM = new THREE.MeshBasicMaterial({ side: THREE.BackSide, fog: false }); const wl = new THREE.Mesh(new THREE.CylinderGeometry(wallR, wallR, wallR * 0.8, 56, 1, true), o.wallM); wl.position.y = wallR * 0.4 - 0.2; sc.add(wl);
  o.barM = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const n = 26; for (let k = 0; k < n; k++) { const a = k / n * TAU, b = new THREE.Mesh(new THREE.PlaneGeometry(0.5, wallR * 0.5), o.barM); b.position.set(Math.sin(a) * (wallR - 0.4), wallR * 0.3, Math.cos(a) * (wallR - 0.4)); b.rotation.y = a + Math.PI; sc.add(b); }
  const cv = mkCanvas(128, 128), g = cv.getContext('2d'), gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  gr.addColorStop(0, 'rgba(0,0,0,0.75)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.32)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  o.blob = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false })); o.blob.rotation.x = -Math.PI / 2; o.blob.position.y = 0.022; sc.add(o.blob);
  return o;
}
Shop.stage = function (S) {
  CR.init();
  if (!Shop.sc) { Shop.sc = { car: shopStage(4.7, 30), av: shopStage(1.9, 12) }; Shop.cam = new THREE.PerspectiveCamera(34, 16 / 9, 0.1, 160); }
  const col = new THREE.Color(S.R.col).convertSRGBToLinear(), cs = '#' + new THREE.Color(S.R.col).getHexString();
  for (const k of ['car', 'av']) {
    const o = Shop.sc[k]; o.ringM.color.copy(col).multiplyScalar(2.2); o.barM.color.copy(col).multiplyScalar(1.1);
    const cv = mkCanvas(8, 256), g = cv.getContext('2d'), gr = g.createLinearGradient(0, 256, 0, 0);
    gr.addColorStop(0, 'rgb(' + Math.round(col.r * 52 + 8) + ',' + Math.round(col.g * 52 + 10) + ',' + Math.round(col.b * 52 + 13) + ')'); gr.addColorStop(0.45, '#0c1119'); gr.addColorStop(1, '#04060a');
    g.fillStyle = gr; g.fillRect(0, 0, 8, 256); if (o.wallM.map) o.wallM.map.dispose(); o.wallM.map = new THREE.CanvasTexture(cv); o.wallM.needsUpdate = true;
  }
  Shop.cs = cs;
};
Shop.cleanup = function () {
  if (Shop.carMesh) { Shop.sc.car.sc.remove(Shop.carMesh); disposeCar(Shop.carMesh); Shop.carMesh = null; }
  if (Shop.av) { Shop.sc.av.sc.remove(Shop.av.root); Shop.av.root.traverse((m) => { if (m.geometry) m.geometry.dispose(); }); Shop.av = null; }
};
Shop.rebuildCar = function () {
  if (Shop.carMesh) { Shop.sc.car.sc.remove(Shop.carMesh); disposeCar(Shop.carMesh); Shop.carMesh = null; }
  const d = CAR_BY_ID[Shop.carId], rec = Object.assign({}, Shop.rec, { cc: Shop.cur.cc });
  const m = Shop.carMesh = buildPlayerCar(d, d.id, true, rec); m.position.y = 0.02; Shop.sc.car.sc.add(m);
  const b = Shop.sc.car.blob; b.scale.set(d.body.L * 1.45, d.body.W * 2.6, 1);
};
Shop.baseApp = function () { return footBase(); };
Shop.rebuildAvatar = function () {
  if (Shop.av) { Shop.sc.av.sc.remove(Shop.av.root); Shop.av.root.traverse((m) => { if (m.geometry) m.geometry.dispose(); }); Shop.av = null; }
  const a = cosApplyOutfit(footBase(), cosView2(Shop.out, true));
  const r = Shop.av = crPerson({ skin: a.skin, hair: a.hair, jacket: a.shirt, sleeve: a.shirt, shortSl: !a.sleeve, shirt: lc(0xe8e8ee), pants: a.pants, shoe: a.shoe, hairStyle: a.hst || 'short', hat: a.hat, glasses: a.glasses, glassC: a.glassC, shorts: a.shorts, casual: true, fem: a.fem, beard: a.beard });
  r.root.position.set(0, 0.02, 0); r.root.scale.setScalar(1.0); Shop.sc.av.sc.add(r.root); Shop.sc.av.blob.scale.set(1.4, 1.1, 1);
};
Shop.focusFor = function (tab) {
  if (COS.CAR.includes(tab)) {
    const d = CAR_BY_ID[Shop.carId], L = d.body.L; let D = L * 1.8, y = d.top * 0.42, el = 0.17;
    if (tab === 'wheel' || tab === 'rim') { D = L * 1.4; y = 0.5; el = 0.07; } else if (tab === 'head' || tab === 'kit') { D = L * 1.5; y = d.top * 0.38; el = 0.12; } else if (tab === 'glow') { D = L * 1.5; y = 0.3; el = 0.3; }
    return { which: 'car', y, D, el };
  }
  const f = { hat: [1.6, 1.45], glasses: [1.62, 1.25], hair: [1.58, 1.55], top: [1.25, 2.4], bottom: [0.7, 2.6], shoes: [0.3, 2.0] }[tab] || [1.0, 3.3];
  return { which: 'av', y: f[0], D: f[1], el: 0.06 };
};
Shop.snap = function () { const f = Shop.focus = Shop.focusFor(Shop.tab); Shop.which = f.which; Shop.fc.y = f.y; Shop.fc.D = f.D * 1.5; Shop.fc.el = f.el + 0.1; };
Shop.frame = function (dt) {
  App.time += dt; if (Snd.ok) Snd.update(car, dt, true);
  const K = Keys; Shop.az += ((K.ArrowLeft || K.KeyA ? 1 : 0) - (K.ArrowRight || K.KeyD ? 1 : 0)) * dt * 1.6;
  if (!Shop.drag) { Shop.azIdle += dt; if (Shop.azIdle > 1.5) Shop.az += dt * 0.22; }
  const f = Shop.focus || (Shop.focus = Shop.focusFor(Shop.tab)), portrait = innerHeight > innerWidth * 1.1, k = 1 - Math.exp(-dt * 4.5), c = Shop.fc;
  const cam = Shop.cam, W = innerWidth, H = innerHeight; cam.aspect = W / H;
  const pw0 = E.shopPanel ? (E.shopPanel.offsetWidth || 0) : 0, effA = portrait ? W / H : Math.max(0.6, (W - pw0 - 12) / H);
  let tD = f.D; if (f.which === 'car') tD = Math.max(tD, CAR_BY_ID[Shop.carId].body.L * 0.68 / (0.3057 * effA)); else if (portrait) tD *= 1.9; else if (H < 560) tD *= 1.25;
  c.y += (f.y - c.y) * k; c.D += (tD * Shop.zoom - c.D) * k; c.el += (f.el - c.el) * k;
  const o = Shop.which === 'car' ? Shop.sc.car : Shop.sc.av, cosE = Math.cos(c.el);
  cam.position.set(Math.sin(Shop.az) * c.D * cosE, c.y + Math.sin(c.el) * c.D, Math.cos(Shop.az) * c.D * cosE); cam.lookAt(0, c.y, 0);
  const pw = pw0, vk = W + 'x' + H + ':' + (portrait ? 'p' : pw);
  if (portrait) cam.setViewOffset(W, H, 0, H * 0.24, W, H); else cam.setViewOffset(W, H, (pw + 12) / 2, 0, W, H);
  Shop.vkey = vk; cam.updateProjectionMatrix();
  if (Shop.which === 'car' && Shop.carMesh) glowTick(Shop.carMesh, App.time, 1);
  if (Shop.av) { const t = App.time, r = Shop.av; r.tor.rotation.z = Math.sin(t * 0.9) * 0.012; r.head.rotation.y = Math.sin(t * 0.5) * 0.12; r.armL.rotation.z = 0.07; r.armR.rotation.z = -0.07; r.elL.rotation.x = -0.12; r.elR.rotation.x = -0.12; r.hips.position.y = 0.95 + Math.sin(t * 1.8) * 0.003; }
  const s0 = scene, c0 = camera, e0 = env.exposure; scene = o.sc; camera = cam; env.exposure = Shop.expo; Shop.fx.expo = 1;
  try { renderFrame(Shop.fx, App.time); } finally { env.exposure = e0; scene = s0; camera = c0; }
};

/* ---------- panel ---------- */
const SHOP_GROUPS = [['Car', 'car'], ['You', 'out']];
Shop.list = function (cat) {
  const own = cosSave().own, key = Shop.S.R.key;
  return COS.items.filter((it) => it.cat === cat && (!it.reg || it.reg === key || own[it.id]));
};
Shop.isSel = function (it) {
  const c = it.cat; if (COS.OUT.includes(c)) return Shop.out[c] === it.id; if (c === 'kit') return Shop.rec.kit[it.val.slot] === it.id; return Shop.rec[c] === it.id;
};
Shop.pick = function (id) {
  const it = COS.by[id]; if (!it) return; const c = it.cat, on = Shop.isSel(it);
  if (COS.OUT.includes(c)) { if (on) delete Shop.out[c]; else Shop.out[c] = id; Shop.rebuildAvatar(); }
  else {
    if (c === 'kit') { const s = it.val.slot; if (on) delete Shop.rec.kit[s]; else Shop.rec.kit[s] = id; }
    else Shop.rec[c] = on ? null : id;
    Shop.rebuildCar();
  }
  const own = !!cosSave().own[id]; Snd.beep(own ? 520 : 680, 0.04); Shop.paint();
};
Shop.clearCat = function () {
  const c = Shop.tab; if (COS.OUT.includes(c)) { delete Shop.out[c]; Shop.rebuildAvatar(); } else { if (c === 'kit') Shop.rec.kit = {}; else Shop.rec[c] = null; Shop.rebuildCar(); }
  Snd.beep(420, 0.04); Shop.paint();
};
Shop.setTab = function (tab) {
  Shop.tab = tab; const f = Shop.focus = Shop.focusFor(tab);
  if (f.which !== Shop.which) { Shop.which = f.which; Shop.fc.y = f.y; Shop.fc.D = f.D * 1.6; Shop.fc.el = f.el + 0.12; Shop.azIdle = 0; }
  Shop.paint();
};
Shop.nextCar = function (d) {
  const ids = CARS.filter((c) => save.owned[c.id]).map((c) => c.id); if (ids.length < 2) return;
  Shop.use(ids[(ids.indexOf(Shop.carId) + d + ids.length) % ids.length]); Shop.rebuildCar(); Shop.focus = Shop.focusFor(Shop.tab); Snd.beep(560, 0.04); Shop.paint();
};
Shop.paint = function () {
  const S = Shop.S, own = cosSave().own, tab = Shop.tab, key = S.R.key, accent = _hexCss(S.R.col);
  E.shop.style.setProperty('--sa', accent);
  E.shopTitle.textContent = S.R.name + ' Customs'; E.shopSub.textContent = S.R.tag; E.shopCash.textContent = money(save.money);
  let h = '';
  for (const [name, grp] of SHOP_GROUPS) {
    const cats = grp === 'car' ? COS.cats.slice(0, COS.CAR.length) : COS.cats.slice(COS.CAR.length);
    h += '<div class="shg"><span>' + name + '</span>' + cats.map((c) => '<button type="button" role="tab" class="sht' + (c[0] === tab ? ' on' : '') + '" data-act="tab" data-k="' + c[0] + '" aria-selected="' + (c[0] === tab) + '">' + c[1] + '</button>').join('') + '</div>';
  }
  E.shopTabs.innerHTML = h;
  /* car switcher */
  const owned = CARS.filter((c) => save.owned[c.id]);
  E.shopCar.innerHTML = COS.CAR.includes(tab) ? '<span class="shn">' + esc(CAR_BY_ID[Shop.carId].name) + '</span>' + (owned.length > 1 ? '<button type="button" class="btn sm" data-act="car" data-d="-1" aria-label="Previous car">&#9664;</button><button type="button" class="btn sm" data-act="car" data-d="1" aria-label="Next car">&#9654;</button>' : '') : '<span class="shn">Your look</span>';
  /* items */
  const items = Shop.list(tab); let g = '';
  const hasNone = tab !== 'paint';
  if (hasNone) g += '<button type="button" class="sit none" data-act="none"><span class="sw sw0">&#8855;</span><b>' + (tab === 'kit' ? 'No body kit' : COS.OUT.includes(tab) ? 'Default' : 'Stock') + '</b><em>Free</em></button>';
  if (tab === 'paint') for (let i = 0; i < PAINTS.length; i++) {
    const on = !Shop.rec.paint && Shop.cur.cc === i;
    g += '<button type="button" class="sit' + (on ? ' on' : '') + ' own" data-act="cc" data-i="' + i + '" aria-pressed="' + on + '"><span class="sw" style="background:' + _hexCss(PAINTS[i]) + '"></span><b>Factory ' + (i + 1) + '</b><em class="ok">' + (on ? 'Equipped' : 'Free') + '</em></button>';
  }
  for (const it of items) {
    const sel = Shop.isSel(it), o = !!own[it.id], ex = it.reg ? REG.find((q) => q.key === it.reg) : null;
    const sw = it.sw != null ? '<span class="sw" style="background:' + _hexCss(it.sw) + '"></span>' : '<span class="sw sw0">' + (SHOP_ICO[it.cat] || '◆') + '</span>';
    const st = o ? '<em class="ok">' + (sel ? 'Equipped' : 'Owned') + '</em>' : '<em>' + (sel ? 'Preview · ' : '') + money(it.price) + '</em>';
    const sub = it.cat === 'kit' ? it.val.slot : ex ? ex.name : '';
    g += '<button type="button" class="sit' + (sel ? ' on' : '') + (o ? ' own' : '') + (ex && ex.key === key ? ' ex' : '') + '" data-act="pick" data-id="' + it.id + '" aria-pressed="' + sel + '">' + sw + '<b>' + esc(it.name) + '</b>' + st + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</button>';
  }
  E.shopGrid.innerHTML = g;
  /* stock note */
  const away = {}; let nAway = 0; for (const it of COS.items) if (it.cat === tab && it.reg && it.reg !== key && !own[it.id]) { const q = REG.find((r) => r.key === it.reg); if (q) { away[q.name] = 1; nAway++; } }
  E.shopNote.textContent = nAway ? nAway + ' more here are sold only in ' + Object.keys(away).join(', ') + '.' : 'You have everything this category offers.';
  /* bar */
  const t = Shop.total(), need = t.sum - save.money;
  E.shopBar.innerHTML = '<div class="shtot">' + (t.n ? '<b>' + money(t.sum) + '</b><span>' + t.n + (t.n === 1 ? ' item' : ' items') + ' to buy' + (need > 0 ? ' · need ' + money(need) + ' more' : '') + '</span>' : '<span>Tap anything to try it on · owned parts equip free</span>') + '</div>' +
    '<button type="button" class="btn primary sm" data-act="buy"' + (t.n && need <= 0 ? '' : ' disabled') + '>Buy</button><button type="button" class="btn sm" data-act="reset">Reset</button><button type="button" class="btn sm" data-act="done">Done</button>';
};
Shop.act = function (d) {
  switch (d.act) {
    case 'tab': Shop.setTab(d.k); break;
    case 'pick': Shop.pick(d.id); break;
    case 'none': Shop.clearCat(); break;
    case 'cc': Shop.cur.cc = +d.i; Shop.rec.paint = null; Shop.rebuildCar(); Snd.beep(520, 0.04); Shop.paint(); break;
    case 'car': Shop.nextCar(+d.d); break;
    case 'buy': Shop.buy(); break;
    case 'reset': Shop.reset(); break;
    case 'done': Shop.close(); break;
    default:
  }
};
Shop.key = function (code) { if (code === 'Escape' || code === 'KeyP') Shop.close(); };
Shop.initUI = function () {
  E.shop.addEventListener('click', (e) => { const b = e.target.closest ? e.target.closest('[data-act]') : null; if (!b || b.disabled || !E.shop.contains(b)) return; Shop.act(b.dataset); });
  const gl = E.gl;
  gl.addEventListener('pointerdown', (e) => { if (!Shop.on || Shop.drag) return; Shop.drag = { id: e.pointerId, x: e.clientX }; Shop.azIdle = 0; try { gl.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ } });
  gl.addEventListener('pointermove', (e) => { const d = Shop.drag; if (!Shop.on || !d || d.id !== e.pointerId) return; Shop.az -= (e.clientX - d.x) * 0.009; d.x = e.clientX; Shop.azIdle = 0; });
  const up = (e) => { if (Shop.drag && Shop.drag.id === e.pointerId) Shop.drag = null; };
  gl.addEventListener('pointerup', up); gl.addEventListener('pointercancel', up);
  gl.addEventListener('wheel', (e) => { if (!Shop.on) return; e.preventDefault(); Shop.zoom = clamp(Shop.zoom * (e.deltaY > 0 ? 1.08 : 0.926), 0.55, 1.6); }, { passive: false });
};

/* ---------- world map icons ---------- */
Shop.drawMini = function (g) { if (!Shop.ready) return; for (const S of Shop.sites) { g.fillStyle = _hexCss(S.R.col); g.fillRect(S.bx, S.bz, S.bw, S.bd); } };
Shop.drawMap = function (g, k) {
  if (!Shop.ready) return;
  for (const S of Shop.sites) {
    const s = FM.toScreen(S.x, S.z), u = k * 1.05; g.fillStyle = _hexCss(S.R.col); g.strokeStyle = '#06090e'; g.lineWidth = 2.5 * k;
    g.beginPath(); g.arc(s[0], s[1], 8.5 * u, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#06090e'; g.beginPath(); g.arc(s[0], s[1], 4.6 * u, 0, TAU); g.fill(); g.fillStyle = _hexCss(S.R.col); g.beginPath(); g.arc(s[0], s[1], 2 * u, 0, TAU); g.fill();
    if (FM.zoom > 1.8) { g.fillStyle = '#fff'; g.strokeStyle = 'rgba(0,0,0,0.85)'; g.lineWidth = 3 * k; g.strokeText('CUSTOMS', s[0], s[1] + 19 * u); g.fillText('CUSTOMS', s[0], s[1] + 19 * u); }
  }
};
