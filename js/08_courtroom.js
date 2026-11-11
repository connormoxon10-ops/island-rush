/* ================= COURTROOM: the first-person 3D scene for the lawsuit minigame =================
   One merged static room (floor, panelled walls, bench, jury box, tables, windows) plus a handful of articulated people
   (judge, opposing lawyer, the injured pedestrian on the stand) built from boxes and ellipsoids with a small joint hierarchy.
   You sit at the defence table; the camera aims at whoever is speaking and the QTE results drive the hands, jury and judge. */
const CR = { ready: false, scene: null, cam: null, mats: null, A: {}, hands: null, V: {}, builders: {}, cur: null, kind: '', focusTab: null, lay: null, extra: null, expo: 1.1, t: 0, foc: new THREE.Vector3(0, 1.5, -3), tgt: new THREE.Vector3(0, 1.5, -3),
  fov: 58, fovT: 58, shake: 0, slam: [0, 0], gavel: -1, rapid: 0, speak: '', favor: 0.5, press: 0, look: { x: 0, y: 0, tx: 0, ty: 0 }, lawX: 0.8 };
const CRG = { sph: null, box: null, cyl: null };
const CR_EYE = new THREE.Vector3(0.3, 1.24, 5.55);
const _crW = new THREE.Color(1, 1, 1);

/* ---- tiny solid helpers: all take a THREE.Color (linear) ---- */
function crBox(gb, x0, y0, z0, x1, y1, z1, C, k) { k = k == null ? 1 : k; gb.box(Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1), Math.max(x0, x1), Math.max(y0, y1), Math.max(z0, z1), C.r * k, C.g * k, C.b * k); }
function crEll(gb, x, y, z, rx, ry, rz, C, sh) { _m4.compose(_p3.set(x, y, z), _q.identity(), _s3.set(rx, ry, rz)); gb.geo(CRG.sph, _m4, C, sh == null ? 0.28 : sh); }
function crObx(gb, x, y, z, sx, sy, sz, C, sh, ex, ey, ez) { _q.setFromEuler(_e.set(ex || 0, ey || 0, ez || 0)); _m4.compose(_p3.set(x, y, z), _q, _s3.set(sx, sy, sz)); gb.geo(CRG.box, _m4, C, sh || 0); }
function crCyl(gb, x, y, z, rx, ry, rz, C, sh, ex, ey, ez) { _q.setFromEuler(_e.set(ex || 0, ey || 0, ez || 0)); _m4.compose(_p3.set(x, y, z), _q, _s3.set(rx, ry, rz)); gb.geo(CRG.cyl, _m4, C, sh || 0); }
const crShade = (C, k) => new THREE.Color(C.r * k, C.g * k, C.b * k);

/* ---- a person: pivots for head, both arms (shoulder + elbow) and both legs (hip + knee); feet at y = 0 when standing ---- */
/* hats for the articulated people (head space; used by the cosmetic shop preview and the booking scene) */
function crHat(g, h) {
  const c = h.c, bc = h.bc || h.c, k = h.k;
  if (k === 'cap') { crEll(g, 0, 0.105, -0.004, 0.118, 0.082, 0.125, c, 0.3); crObx(g, 0, 0.098, 0.12, 0.2, 0.014, 0.1, bc, 0.2, 0.22, 0, 0); }
  else if (k === 'beanie') { crEll(g, 0, 0.11, -0.004, 0.122, 0.105, 0.128, c, 0.4); crCyl(g, 0, 0.083, -0.004, 0.124, 0.022, 0.13, crShade(c, 0.8), 0.2); crEll(g, 0, 0.205, -0.004, 0.03, 0.03, 0.03, crShade(c, 1.1), 0.2); }
  else if (k === 'hard') { crEll(g, 0, 0.115, -0.004, 0.124, 0.09, 0.13, c, 0.5); crCyl(g, 0, 0.09, 0, 0.135, 0.012, 0.14, c, 0.3); crObx(g, 0, 0.12, 0.12, 0.2, 0.012, 0.09, c, 0.3); crObx(g, 0, 0.2, -0.005, 0.028, 0.018, 0.2, crShade(c, 0.85), 0.3); }
  else if (k === 'straw') { crEll(g, 0, 0.115, 0, 0.108, 0.07, 0.115, c, 0.2); crCyl(g, 0, 0.098, 0, 0.27, 0.01, 0.27, crShade(c, 1.05), 0.1); crCyl(g, 0, 0.105, 0, 0.112, 0.014, 0.118, crShade(c, 0.62), 0.1); }
  else if (k === 'cowboy') { crEll(g, 0, 0.13, 0, 0.1, 0.085, 0.112, c, 0.3); crCyl(g, 0, 0.1, 0, 0.23, 0.012, 0.2, c, 0.3); crCyl(g, 0, 0.108, 0, 0.104, 0.016, 0.116, crShade(c, 0.6), 0.2); }
  else if (k === 'top') { crCyl(g, 0, 0.2, 0, 0.095, 0.12, 0.1, c, 0.3); crCyl(g, 0, 0.098, 0, 0.17, 0.012, 0.17, c, 0.3); crCyl(g, 0, 0.12, 0, 0.098, 0.018, 0.103, lc(0x7a1a22), 0.2); }
}
/* the same lofted body kit the street people use (06_body.js), assembled into a jointed rig: suit or robe, shirt and tie, face, hair, glasses, hands, shoes */
const _crI = new THREE.Matrix4(), _crT = new THREE.Matrix4(), _crS = new THREE.Matrix4();
function crPerson(o) {
  const BG = Body.init(), M = (fn) => { const gb = new GB(0, 0, false); fn(gb); return gb.mesh(CR.mats.std, false, false); };
  const B = (g, key, C, mx) => g.geo(BG[key], mx || _crI, C, 0);
  const skin = o.skin, hair = o.hair, jacket = o.jacket, shirt = o.shirt || lc(0xeeeeee), pants = o.pants || jacket, shoe = o.shoe || lc(0x15151a), tie = o.tie, sleeve = o.sleeve || jacket;
  const w = (o.build === 'stout' ? 1.16 : o.build === 'slim' ? 0.9 : 1) * (o.robe ? 1.1 : 1), s = o.s || 1, fem = !!o.fem;
  const root = new THREE.Group(), hips = new THREE.Group(); hips.position.y = 0.955; root.add(hips); root.scale.setScalar(s);
  hips.add(M((g) => {
    B(g, 'hips', o.robe ? jacket : pants, _crS.makeScale(w, 1, (w + 1) / 2));
    if (o.robe) B(g, 'skirt', jacket, _crS.makeScale(w * 1.12, 2.05, w * 1.08));
  }));
  const tor = new THREE.Group(); tor.position.y = 0.085; hips.add(tor);
  tor.add(M((g) => {
    const tm = _crS.makeScale(w, 1, (w + 1) / 2);
    B(g, o.robe ? 'torsoC' : fem ? 'torsoF' : 'torsoM', jacket, tm);
    if (!o.robe && !o.casual) {
      const zf = fem ? 0.108 : 0.103;
      crObx(g, 0, 0.36, zf * (w + 1) / 2 + 0.01, 0.1 * w, 0.26, 0.012, shirt, 0); if (tie) { crObx(g, 0, 0.34, zf * (w + 1) / 2 + 0.017, 0.04, 0.24, 0.01, tie, 0); crObx(g, 0, 0.455, zf * (w + 1) / 2 + 0.017, 0.05, 0.04, 0.014, crShade(tie, 0.85), 0); }
      crObx(g, -0.065 * w, 0.43, zf * (w + 1) / 2 + 0.012, 0.055, 0.12, 0.01, jacket, 0, 0, 0, 0.42); crObx(g, 0.065 * w, 0.43, zf * (w + 1) / 2 + 0.012, 0.055, 0.12, 0.01, jacket, 0, 0, 0, -0.42);
    } else if (o.robe) { crObx(g, 0, 0.33, 0.12 * (w + 1) / 2, 0.16, 0.3, 0.012, lc(0xf2f2f2), 0); crObx(g, 0, 0.5, 0.0, 0.16, 0.05, 0.12, lc(0xf2f2f2), 0); }
  }));
  const head = new THREE.Group(); head.position.set(0, 0.545, 0.004); tor.add(head);
  head.add(M((g) => {
    B(g, 'head', skin); B(g, 'eyes', _crW); B(g, 'brow', hair);
    const st = o.hairStyle || 'short', hk = st === 'slick' ? 'buzz' : st === 'bald' ? '' : o.hat && !o.hat.isColor ? 'rim' : st;
    if (hk && BG.hair[hk]) g.geo(BG.hair[hk], _crI, hair, 0);
    if (o.beard) B(g, 'beard', hair);
    if (o.glasses) { const gc = o.glassC || new THREE.Color(0.02, 0.02, 0.025); B(g, 'gls', gc); if (o.glassC) B(g, 'lens', gc); }
  }));
  /* extras written in the old head space (bandage, neck brace, hats), moved and scaled onto the new head */
  const ex = new THREE.Group(); ex.position.y = 0.106; ex.scale.setScalar(0.9); head.add(ex);
  if (o.bandage || o.brace || o.hat) ex.add(M((g) => {
    if (o.bandage) { crObx(g, 0, 0.095, 0.01, 0.2, 0.05, 0.215, lc(0xf4f4ee), 0.1); crObx(g, 0.06, 0.02, 0.1, 0.07, 0.05, 0.02, lc(0xf4f4ee), 0); }
    if (o.brace) crCyl(g, 0, -0.17, 0, 0.082, 0.07, 0.082, lc(0xe9e6dc), 0.2);
    if (o.hat) { if (o.hat.isColor) { crCyl(g, 0, 0.14, 0, 0.12, 0.03, 0.125, o.hat, 0.2); crObx(g, 0, 0.12, 0.1, 0.22, 0.02, 0.1, o.hat, 0.2); } else crHat(g, o.hat); }
  }));
  const arm = (sx) => {
    const sh = new THREE.Group(); sh.position.set(sx * 0.198 * w, 0.46, 0); tor.add(sh);
    const wide = o.robe ? _crS.makeScale(1.3, 1, 1.3) : null, lower = o.shortSl ? skin : sleeve;
    sh.add(M((g) => { B(g, 'uarm', sleeve, wide); B(g, 'uarm2', lower, wide); }));
    const el = new THREE.Group(); el.position.y = -0.31; sh.add(el);
    el.add(M((g) => { B(g, 'farm', lower, wide); B(g, 'hand', skin, _crT.makeTranslation(0, -0.3, 0)); if (!o.shortSl && !o.robe) crObx(g, 0, -0.275, 0, 0.082, 0.03, 0.082, shirt, 0); }));
    return { sh, el };
  };
  const aL = arm(-1), aR = arm(1);
  const leg = (sx) => {
    const hp = new THREE.Group(); hp.position.set(sx * 0.098, -0.02, 0); hips.add(hp);
    hp.add(M((g) => { B(g, 'thigh', o.shorts ? pants : pants); }));
    const kn = new THREE.Group(); kn.position.y = -0.43; hp.add(kn);
    kn.add(M((g) => { B(g, 'shin', o.shorts ? skin : pants); }));
    const an = new THREE.Group(); an.position.y = -0.43; kn.add(an);
    an.add(M((g) => { B(g, 'foot', shoe); }));
    return { hp, kn };
  };
  const lL = leg(-1), lR = leg(1);
  const rig = { root, hips, tor, head, armL: aL.sh, elL: aL.el, armR: aR.sh, elR: aR.el, legL: lL.hp, knL: lL.kn, legR: lR.hp, knR: lR.kn };
  if (o.seated) { hips.position.y = o.seat || 0.62; for (const l of [rig.legL, rig.legR]) l.rotation.x = -Math.PI / 2; for (const k of [rig.knL, rig.knR]) k.rotation.x = Math.PI / 2; }
  return rig;
}
function crBake(rig, gb) {
  rig.root.updateMatrixWorld(true);
  rig.root.traverse((m) => { if (m.isMesh) { gb.geo(m.geometry, m.matrixWorld, _crW, 0); m.geometry.dispose(); } });
}
function crTex(text, w, h, o) {
  o = o || {}; const cv = mkCanvas(w, h), g = cv.getContext('2d');
  if (o.bg) { g.fillStyle = o.bg; g.fillRect(0, 0, w, h); }
  g.fillStyle = o.fg || '#e8c46a'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '700 ' + (o.size || Math.round(h * 0.55)) + 'px ' + (o.font || 'Rajdhani, "Arial Narrow", sans-serif');
  if (o.ls && 'letterSpacing' in g) g.letterSpacing = o.ls; g.fillText(text, w / 2, h / 2 + 2);
  const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; t.anisotropy = maxAniso; return t;
}
function crSign(parent, tex, w, h, x, y, z, ry) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  m.position.set(x, y, z); m.rotation.y = ry || 0; parent.add(m); return m;
}

CR.init = function () {
  if (CR.ready) return; CR.ready = true;
  CRG.sph = ni(new THREE.SphereGeometry(1, 10, 8)); CRG.box = ni(new THREE.BoxGeometry(1, 1, 1)); CRG.cyl = ni(new THREE.CylinderGeometry(1, 1, 1, 12));
  const mats = CR.mats = {
    std: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 }),
    pol: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.06 }),
    emi: new THREE.MeshBasicMaterial({ vertexColors: true }),
    shaft: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.055, 0.05, 0.04), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })
  };
};
/* ---- venues: each builder fills CR.scene / CR.cam / CR.A / CR.hands and returns its layout; CR.build(kind) caches them ---- */
const crPal = () => CR._pal || (CR._pal = { skinA: [0xf0c8a8, 0xdba67a, 0xb07a4f, 0x7a4e30, 0xf3d5bd].map(lc), hairA: [0x1b1511, 0x4a3524, 0x8a8a88, 0xb08a4a, 0x0d0d0d, 0xd8d8d4].map(lc) });
function crStage(bg) {
  const sc = CR.scene = new THREE.Scene(); sc.background = new THREE.Color(bg); CR.cam = new THREE.PerspectiveCamera(58, 16 / 9, 0.1, 80); sc.add(CR.cam); CR.A = { jurors: [] }; return sc;
}
function crHandsInit(sleeve) {
  const mats = CR.mats, hands = CR.hands = [], SK = crPal().skinA[2], CF = lc(0xf0f0f0);
  for (const sx of [-1, 1]) {
    const gp = new THREE.Group(), gm = new GB(0, 0, false);
    crObx(gm, 0, 0, 0.32, 0.12, 0.1, 0.5, sleeve, 0.25); crObx(gm, 0, -0.002, 0.04, 0.115, 0.095, 0.06, CF, 0); crEll(gm, 0, -0.005, -0.04, 0.062, 0.035, 0.085, SK, 0.2);
    for (let i = 0; i < 4; i++) crObx(gm, -0.04 + i * 0.027, -0.012, -0.135, 0.022, 0.026, 0.1, SK, 0.1);
    crObx(gm, sx * -0.06, -0.01, -0.05, 0.03, 0.028, 0.08, SK, 0.1, 0, sx * 0.5, 0);
    gp.add(gm.mesh(mats.std, false, false)); gp.userData.sx = sx; CR.cam.add(gp); hands.push(gp);
  }
}
/* what the speaker's right hand holds when they "slam": a gavel by default */
function crProp(rig, kind) {
  const mats = CR.mats, g = new GB(0, 0, false); let m;
  if (kind === 'folder') { crObx(g, 0, 0.05, 0.02, 0.24, 0.02, 0.32, lc(0xc9a55a), 0); crObx(g, 0, 0.065, 0.02, 0.22, 0.004, 0.3, lc(0xf2efe6), 0); m = g.mesh(mats.std, false, false); m.position.set(0, -0.36, 0.06); m.rotation.x = -1.2; }
  else if (kind === 'clip') { crObx(g, 0, 0.1, 0.02, 0.22, 0.016, 0.3, lc(0x6b4426), 0); crObx(g, 0, 0.11, 0.02, 0.19, 0.004, 0.26, lc(0xf2efe6), 0); crObx(g, 0, 0.115, -0.12, 0.08, 0.02, 0.03, lc(0xb8b8c0), 0); m = g.mesh(mats.std, false, false); m.position.set(0, -0.36, 0.06); m.rotation.x = -1.2; }
  else { crObx(g, 0, 0, 0, 0.04, 0.34, 0.04, lc(0x573619), 0); crCyl(g, 0, 0.17, 0, 0.045, 0.1, 0.045, lc(0x6b4426), 0, 0, 0, Math.PI / 2); m = g.mesh(mats.pol, false, false); m.position.set(0, -0.36, 0.04); m.rotation.x = -1.2; }
  rig.elR.add(m); rig.gavel = m; return m;
}
function crYawAt(rig, tx, tz) { const p = rig.root.position; let a = Math.atan2(tx - p.x, tz - p.z) - rig.root.rotation.y; a = Math.atan2(Math.sin(a), Math.cos(a)); return clamp(a, -1.1, 1.1); }
function crYawTo(rig, sp) {
  const lay = CR.lay; let tx, tz;
  if (sp === 'victim') { tx = lay.victim[0]; tz = lay.victim[1]; } else if (sp === 'lawyer') { tx = CR.A.lawyer.root.position.x; tz = CR.A.lawyer.root.position.z; } else if (sp === 'you') { tx = CR_EYE.x; tz = CR_EYE.z; } else return 0;
  return crYawAt(rig, tx, tz);
}
CR.build = function (kind) {
  kind = kind || 'court'; CR.init();
  if (!CR.V[kind]) {
    CR.scene = CR.cam = CR.hands = CR.lamp = null; CR.A = { jurors: [] };
    const V = CR.builders[kind](); V.scene = CR.scene; V.cam = CR.cam; V.A = CR.A; V.hands = CR.hands; V.lamp = CR.lamp; CR.V[kind] = V;
  }
  const V = CR.V[kind]; CR.cur = V; CR.kind = kind; CR.scene = V.scene; CR.cam = V.cam; CR.A = V.A; CR.hands = V.hands; CR.lamp = V.lamp; CR.focusTab = V.focus; CR.lay = V.lay; CR.extra = V.extra || null; CR.expo = V.expo || 1.1; CR_EYE.copy(V.eye);
};
CR.builders.court = function () {
  const mats = CR.mats;
  const sc = crStage(0.02);
  sc.background = new THREE.Color(0.02, 0.018, 0.016);
  /* lights */
  sc.add(new THREE.HemisphereLight(0xfff0dc, 0x4a3a2c, 0.95));
  const sun = new THREE.DirectionalLight(0xfff0d8, 1.5); sun.position.set(9, 6, 1); sc.add(sun); sc.add(sun.target);
  const lamp = new THREE.PointLight(0xffd6a0, 1.15, 16, 1.6); lamp.position.set(0, 4.6, -5.4); sc.add(lamp);
  const lamp2 = new THREE.PointLight(0xffe0b8, 0.85, 14, 1.6); lamp2.position.set(0.5, 5.0, 1.8); sc.add(lamp2);
  CR.lamp = lamp;

  const WOOD = lc(0x6b4426), WOOD2 = lc(0x573619), WOOD3 = lc(0x7e5230), CREAM = lc(0xd8cdb4), GOLD = lc(0xd9ae45), NAVY = lc(0x1d2a44), LEATH = lc(0x2a1a14), CARPET = lc(0x5a1f26);
  const S = new GB(0, 0, false), P = new GB(0, 0, false), E = new GB(0, 0, false);
  const HX = 8, HZ = 9, HY = 6.2;
  /* floor: planks (alternating tones) with a carpet runner down the middle */
  for (let i = 0; i < 36; i++) { const z0 = -HZ + i * (2 * HZ / 36), z1 = z0 + 2 * HZ / 36, k = 0.85 + 0.18 * ((i * 7) % 5) / 4; S.quadA([-HX, 0, z0, 0, 0], [HX, 0, z0, 0, 0], [HX, 0, z1, 0, 0], [-HX, 0, z1, 0, 0], 0, 1, 0, WOOD2.r * k, WOOD2.g * k, WOOD2.b * k); }
  crBox(S, -1.1, 0.003, -9, 1.1, 0.012, 9, CARPET); crBox(S, -1.2, 0.002, -9, -1.1, 0.01, 9, GOLD, 0.7); crBox(S, 1.1, 0.002, -9, 1.2, 0.01, 9, GOLD, 0.7);
  /* walls: plaster above, panelled wainscot below with a dark gap between panels, rail on top */
  const wall = (ax, az, bx, bz, nx, nz) => {
    S.quadA([ax, 2.3, az, 0, 0], [bx, 2.3, bz, 0, 0], [bx, HY, bz, 0, 0], [ax, HY, az, 0, 0], nx, 0, nz, CREAM.r, CREAM.g, CREAM.b);
    const L = Math.hypot(bx - ax, bz - az), n = Math.round(L / 1.1), dx = (bx - ax) / n, dz = (bz - az) / n;
    for (let i = 0; i < n; i++) { const k = 0.9 + 0.12 * ((i * 5) % 3) / 2; const ox = nx * 0.025, oz = nz * 0.025, x0 = ax + dx * i + ox, z0 = az + dz * i + oz, x1 = x0 + dx * 0.94, z1 = z0 + dz * 0.94; S.quadA([x0, 0.05, z0, 0, 0], [x1, 0.05, z1, 0, 0], [x1, 2.25, z1, 0, 0], [x0, 2.25, z0, 0, 0], nx, 0, nz, WOOD.r * k, WOOD.g * k, WOOD.b * k); }
    S.quadA([ax, 0, az, 0, 0], [bx, 0, bz, 0, 0], [bx, 2.3, bz, 0, 0], [ax, 2.3, az, 0, 0], nx, 0, nz, WOOD2.r * 0.55, WOOD2.g * 0.55, WOOD2.b * 0.55);
    P.quadA([ax, 2.27, az, 0, 0], [bx, 2.27, bz, 0, 0], [bx + nx * 0.14, 2.3, bz + nz * 0.14, 0, 0], [ax + nx * 0.14, 2.3, az + nz * 0.14, 0, 0], 0, 1, 0, WOOD3.r, WOOD3.g, WOOD3.b);
  };
  wall(-HX, -HZ, HX, -HZ, 0, 1); wall(HX, HZ, -HX, HZ, 0, -1); wall(-HX, HZ, -HX, -HZ, 1, 0); wall(HX, -HZ, HX, HZ, -1, 0);
  S.quadA([-HX, HY, -HZ, 0, 0], [HX, HY, -HZ, 0, 0], [HX, HY, HZ, 0, 0], [-HX, HY, HZ, 0, 0], 0, -1, 0, 0.1, 0.07, 0.05);
  for (let z = -8; z <= 8; z += 3.2) crBox(P, -HX, HY - 0.4, z - 0.16, HX, HY, z + 0.16, WOOD2, 0.8);
  /* pilasters on the back wall + the raised panel with the seal */
  for (const x of [-6.8, -4.6, 4.6, 6.8]) { crBox(S, x - 0.22, 0, -HZ, x + 0.22, HY - 0.4, -HZ + 0.22, CREAM, 0.95); crBox(P, x - 0.3, 0, -HZ, x + 0.3, 0.5, -HZ + 0.3, WOOD3, 0.9); crBox(P, x - 0.3, 3.3, -HZ, x + 0.3, 3.4, -HZ + 0.3, WOOD3, 0.9); }
  crBox(P, -3.8, 0, -HZ, 3.8, 5.0, -HZ + 0.14, WOOD2, 0.9); crBox(P, -3.8, 4.9, -HZ, 3.8, 5.2, -HZ + 0.3, WOOD3, 0.9);
  for (const x of [-2.4, 0, 2.4]) crBox(P, x - 0.5, 0.6, -HZ + 0.14, x + 0.5, 4.2, -HZ + 0.2, WOOD, 0.8);
  const seal = new THREE.Group(); seal.position.set(0, 3.55, -HZ + 0.24); sc.add(seal);
  { const g = new GB(0, 0, false); crCyl(g, 0, 0, 0, 0.95, 0.035, 0.95, GOLD, 0.1, Math.PI / 2, 0, 0); crCyl(g, 0, 0, 0.03, 0.78, 0.03, 0.78, crShade(GOLD, 0.55), 0, Math.PI / 2, 0, 0); crCyl(g, 0, 0, 0.055, 0.52, 0.03, 0.52, GOLD, 0, Math.PI / 2, 0, 0);
    for (let i = 0; i < 5; i++) { const a = i * TAU / 5 + Math.PI / 2; crObx(g, Math.cos(a) * 0.3, Math.sin(a) * 0.3, 0.08, 0.12, 0.3, 0.02, crShade(GOLD, 0.55), 0, 0, 0, a - Math.PI / 2); }
    seal.add(g.mesh(mats.pol, false, false)); }
  crSign(sc, crTex('ISLAND COUNTY COURT', 1024, 128, { size: 66, ls: '6px' }), 3.6, 0.45, 0, 4.62, -HZ + 0.18);
  crSign(sc, crTex('JUSTICE · LAW · ORDER', 1024, 96, { size: 44, ls: '8px', fg: '#c9a85a' }), 3.1, 0.26, 0, 2.2, -HZ + 0.22);
  /* windows on the right wall with mullions, plus faint light shafts into the room */
  for (const z of [-6.2, -2.0, 2.2, 6.4]) {
    E.quadA([HX - 0.02, 1.5, z - 0.95, 0, 0], [HX - 0.02, 1.5, z + 0.95, 0, 0], [HX - 0.02, 4.8, z + 0.95, 0, 0], [HX - 0.02, 4.8, z - 0.95, 0, 0], -1, 0, 0, 2.4, 2.65, 3.1);
    crBox(S, HX - 0.1, 1.4, z - 1.02, HX, 4.9, z - 0.92, WOOD2); crBox(S, HX - 0.1, 1.4, z + 0.92, HX, 4.9, z + 1.02, WOOD2); crBox(S, HX - 0.1, 1.4, z - 1.02, HX, 1.55, z + 1.02, WOOD2); crBox(S, HX - 0.1, 4.75, z - 1.02, HX, 4.9, z + 1.02, WOOD2);
    crBox(S, HX - 0.08, 1.5, z - 0.03, HX, 4.8, z + 0.03, WOOD2); crBox(S, HX - 0.08, 3.1, z - 0.95, HX, 3.16, z + 0.95, WOOD2);
    if (z < 3) { const sh = new GB(0, 0, false); sh.quadA([HX - 0.1, 1.5, z - 0.9, 0, 0], [HX - 0.1, 1.5, z + 0.9, 0, 0], [4.6, 0.02, z + 2.1, 0, 0], [4.6, 0.02, z + 0.3, 0, 0], 0, 1, 0, 1, 1, 1); CR.shaft = CR.shaft || []; const mm = sh.mesh(mats.shaft, false, false); mm.renderOrder = 3; sc.add(mm); }
  }
  /* left wall: framed pictures + door */
  for (const z of [-3.0, 2.0]) { crBox(P, -HX, 2.9, z - 0.7, -HX + 0.08, 4.5, z + 0.7, GOLD, 0.7); crBox(S, -HX + 0.08, 3.0, z - 0.6, -HX + 0.1, 4.4, z + 0.6, NAVY); }
  /* judge's platform, bench, high-backed chair, nameplate, gavel block */
  crBox(P, -3.4, 0, -HZ + 0.3, 3.4, 0.45, -5.6, WOOD3, 0.85);
  crBox(P, -2.7, 0.45, -8.4, 2.7, 1.5, -6.5, WOOD, 0.9); crBox(P, -2.8, 1.5, -8.4, 2.8, 1.58, -6.4, WOOD3, 1.0);
  for (const x of [-1.9, -0.65, 0.65, 1.9]) crBox(P, x - 0.5, 0.65, -6.52, x + 0.5, 1.3, -6.47, WOOD2, 0.8);
  crBox(S, -0.7, 0.45, -8.55, 0.7, 2.05, -8.0, LEATH, 1.0); crBox(P, -0.8, 1.9, -8.6, 0.8, 2.3, -8.1, LEATH, 1.0);
  crBox(S, -0.6, 0.45, -8.0, 0.6, 0.93, -7.3, LEATH, 1.0);
  crBox(P, -0.45, 1.58, -6.78, 0.45, 1.64, -6.64, GOLD, 0.8); crSign(sc, crTex('HON. J. HAMMERSTONE', 512, 64, { size: 36, fg: '#2a1a08', bg: '#d9ae45' }), 0.9, 0.11, 0, 1.612 + 0.012, -6.649).rotation.x = -0.15;
  crBox(P, 0.9, 1.58, -7.0, 1.2, 1.62, -6.75, WOOD2, 0.7);
  /* witness stand (right) */
  crBox(P, 3.3, 0, -6.7, 5.7, 0.25, -4.3, WOOD3, 0.85);
  crBox(P, 3.3, 0.25, -4.45, 5.7, 1.15, -4.3, WOOD, 0.9); crBox(P, 3.3, 0.25, -6.7, 3.45, 1.15, -4.3, WOOD, 0.9); crBox(P, 3.25, 1.15, -4.5, 5.75, 1.22, -4.25, WOOD3, 1.0); crBox(P, 3.25, 1.15, -6.7, 3.5, 1.22, -4.25, WOOD3, 1.0);
  crBox(S, 4.0, 0.25, -6.5, 5.0, 0.7, -5.6, LEATH, 1.0);
  /* jury box (left) : two tiers, rail, six chairs */
  crBox(P, -HX, 0, -5.6, -5.4, 0.36, 0.2, WOOD3, 0.8); crBox(P, -HX, 0, -5.6, -6.9, 0.75, 0.2, WOOD3, 0.8);
  crBox(P, -5.75, 0, -5.6, -5.55, 0.95, 0.2, WOOD, 0.9); crBox(P, -5.8, 0.95, -5.6, -5.5, 1.02, 0.2, WOOD3, 1.0);
  for (let i = 0; i < 3; i++) { const z = -4.5 + i * 1.8; for (const [x, y] of [[-6.4, 0.36], [-7.5, 0.75]]) { crBox(S, x - 0.35, y, z - 0.3, x + 0.35, y + 0.46, z + 0.3, LEATH, 0.95); crBox(S, x - 0.4, y, z - 0.3, x - 0.3, y + 1.0, z + 0.3, LEATH, 0.9); } }
  /* tables: ours (foreground) and the plaintiff's; the court reporter's desk; the lectern in the well */
  const table = (x0, z0, x1, z1) => { crBox(P, x0, 0.72, z0, x1, 0.78, z1, WOOD3, 1.0); crBox(P, x0 + 0.05, 0, z0 + 0.04, x1 - 0.05, 0.72, z0 + 0.1, WOOD2, 0.8); crBox(P, x0 + 0.05, 0, z1 - 0.1, x1 - 0.05, 0.72, z1 - 0.04, WOOD2, 0.8); crBox(P, x0 + 0.05, 0, z0 + 0.04, x0 + 0.12, 0.72, z1 - 0.04, WOOD2, 0.8); crBox(P, x1 - 0.12, 0, z0 + 0.04, x1 - 0.05, 0.72, z1 - 0.04, WOOD2, 0.8); };
  table(-2.8, 3.5, 1.9, 4.9); table(2.2, 1.0, 5.2, 2.4); table(-3.5, -5.1, -1.5, -4.5);
  crBox(P, -0.3, 0, -1.2, 0.3, 1.1, -0.7, WOOD, 0.9); crBox(P, -0.4, 1.1, -1.3, 0.4, 1.16, -0.6, WOOD3, 1.0);
  /* papers, mug and plaque on the foreground table */
  const PAPER = lc(0xf2efe6);
  for (let i = 0; i < 4; i++) { _q.setFromEuler(_e.set(0, 0.15 * i - 0.2, 0)); crObx(S, -0.9 + i * 0.07, 0.788 + i * 0.004, 4.3, 0.3, 0.004, 0.4, PAPER, 0, 0, 0.12 * i - 0.2, 0); }
  crObx(S, 1.2, 0.788, 4.4, 0.28, 0.004, 0.38, PAPER, 0, 0, 0.3, 0); crCyl(S, 1.35, 0.84, 3.95, 0.05, 0.1, 0.05, lc(0x2f5d9e), 0.2); crCyl(S, -1.8, 0.8, 4.2, 0.02, 0.03, 0.02, lc(0x1b1b1b), 0);
  crBox(P, -0.36, 0.78, 3.63, 0.36, 0.865, 3.7, WOOD2, 0.8); crSign(sc, crTex('DEFENDANT', 512, 64, { size: 40, fg: '#d9ae45', bg: '#3a2410' }), 0.66, 0.072, 0, 0.822, 3.705);
  crBox(S, 3.0, 0.78, 1.2, 3.5, 0.8, 1.6, PAPER); crBox(S, 3.6, 0.78, 1.6, 4.2, 0.9, 2.1, lc(0x7a2a22));
  /* extra furniture bits: bailiff rail, door on the back-left, gallery bench rows (visible when you look round) */
  crBox(P, 1.5, 0, 6.2, 7.6, 0.45, 6.6, WOOD, 0.9); crBox(P, 1.5, 0.45, 6.55, 7.6, 1.0, 6.6, WOOD, 0.85); crBox(P, 1.5, 0, 7.6, 7.6, 0.45, 8.0, WOOD, 0.9); crBox(P, 1.5, 0.45, 7.95, 7.6, 1.0, 8.0, WOOD, 0.85);
  crBox(P, -7.4, 0, 6.2, -1.5, 0.45, 6.6, WOOD, 0.9); crBox(P, -7.4, 0.45, 6.55, -1.5, 1.0, 6.6, WOOD, 0.85);
  /* ceiling lamps */
  for (const [x, z] of [[0, -4.8], [0, 0.2], [0, 5.2]]) { crCyl(S, x, HY - 0.9, z, 0.025, 1.0, 0.025, WOOD2, 0); crCyl(P, x, HY - 1.4, z, 0.55, 0.18, 0.55, GOLD, 0.2); crCyl(E, x, HY - 1.52, z, 0.45, 0.04, 0.45, new THREE.Color(3, 2.5, 1.7), 0); }

  /* ----- people ----- */
  const skinA = [0xf0c8a8, 0xdba67a, 0xb07a4f, 0x7a4e30, 0xf3d5bd].map(lc), hairA = [0x1b1511, 0x4a3524, 0x8a8a88, 0xb08a4a, 0x0d0d0d, 0xd8d8d4].map(lc);
  const jurorCols = [0x2e6fa8, 0x8e5ba8, 0x3d8b5b, 0xc0392b, 0x2b2f36, 0xe0b43a, 0x5aa6a6, 0xd96b8c].map(lc);
  CR.A.jurors = [];
  for (let i = 0; i < 6; i++) {
    const row = i % 2, k = (i / 2) | 0, z = -4.5 + k * 1.8, x = row ? -7.5 : -6.4, seatY = (row ? 0.75 : 0.36) + 0.46;
    const o = { skin: skinA[(i * 3) % 5], hair: hairA[(i * 5 + 1) % 6], jacket: jurorCols[(i * 3 + 1) % 8], shirt: lc(i % 2 ? 0xf2f2f2 : 0xdde6f2), pants: lc(0x2b2f3a), hairStyle: i === 2 ? 'bun' : i === 4 ? 'bald' : i === 1 ? 'long' : 'short', build: i === 3 ? 'stout' : 'normal', glasses: i === 4 || i === 1, seated: true, seat: seatY + 0.1, tie: i % 3 === 0 ? lc(0x7a1f2b) : null };
    const r = crPerson(o); r.root.position.set(x, 0, z); r.root.rotation.y = Math.PI / 2; r.armL.rotation.x = -0.3; r.armR.rotation.x = -0.3; r.elL.rotation.x = -0.85; r.elR.rotation.x = -0.85;
    sc.add(r.root); CR.A.jurors.push(r);
  }
  /* bailiff + court reporter: baked into the static room */
  { const b = crPerson({ skin: skinA[2], hair: hairA[4], jacket: lc(0x7b6a4e), shirt: lc(0xd8d2c0), pants: lc(0x4a4030), hairStyle: 'short', build: 'stout', hat: lc(0x4a3f2a) }); b.root.position.set(-3.4, 0, -5.9); b.root.rotation.y = 0.8; b.armL.rotation.x = -0.15; b.armR.rotation.x = -0.15; b.elR.rotation.x = -0.1; crBake(b, S); }
  { const b = crPerson({ skin: skinA[4], hair: hairA[1], jacket: lc(0x40485a), shirt: lc(0xf0f0f0), pants: lc(0x2a2d36), hairStyle: 'bun', seated: true, seat: 0.57, glasses: true }); b.root.position.set(-2.5, 0, -5.55); b.root.rotation.y = 1.2; b.armL.rotation.x = -1.1; b.armR.rotation.x = -1.1; b.elL.rotation.x = -0.6; b.elR.rotation.x = -0.6; crBake(b, S); crBox(S, -2.78, 0, -5.82, -2.22, 0.5, -5.28, LEATH); }
  { const b = crPerson({ skin: skinA[0], hair: hairA[3], jacket: lc(0x39465c), shirt: lc(0xf0f0f0), pants: lc(0x23262d), hairStyle: 'short', seated: true, seat: 0.57, tie: lc(0x1f5a3a), build: 'slim' }); b.root.position.set(3.6, 0, 3.0); b.root.rotation.y = Math.PI; b.armL.rotation.x = -1.2; b.armR.rotation.x = -1.2; b.elL.rotation.x = -0.4; b.elR.rotation.x = -0.4; crBake(b, S); crBox(S, 3.35, 0, 2.7, 3.85, 0.5, 3.3, LEATH); }
  /* animated principals */
  const judge = CR.A.judge = crPerson({ skin: skinA[1], hair: hairA[2], jacket: lc(0x0b0b0e), shirt: lc(0xf4f4f4), robe: true, hairStyle: 'short', glasses: true, seated: true, seat: 0.45 + 0.47 + 0.1, build: 'stout' });
  judge.root.position.set(0, 0, -7.45); sc.add(judge.root); judge.armL.rotation.x = -1.15; judge.elL.rotation.x = -0.5; judge.armR.rotation.x = -1.2; judge.elR.rotation.x = -0.4;
  { const g = new GB(0, 0, false); crObx(g, 0, 0, 0, 0.04, 0.34, 0.04, WOOD2, 0); crCyl(g, 0, 0.17, 0, 0.045, 0.1, 0.045, WOOD, 0, 0, 0, Math.PI / 2); const gv = g.mesh(mats.pol, false, false); gv.position.set(0, -0.36, 0.0); judge.elR.add(gv); judge.gavel = gv; gv.rotation.x = -1.2; gv.position.set(0, -0.36, 0.04); }
  const law = CR.A.lawyer = crPerson({ skin: skinA[0], hair: hairA[0], jacket: lc(0x1a2235), shirt: lc(0xf4f4f4), tie: lc(0xb3202c), pants: lc(0x161a25), hairStyle: 'slick', glasses: false, build: 'stout', s: 1.04 });
  law.root.position.set(0.8, 0, -0.6); sc.add(law.root);
  const vic = CR.A.victim = crPerson({ skin: skinA[3], hair: hairA[1], jacket: lc(0x2e6fa8), shirt: lc(0xece9e0), pants: lc(0x3a4a63), hairStyle: 'short', seated: true, seat: 0.25 + 0.47 + 0.08, bandage: true, brace: true, tie: null });
  vic.root.position.set(4.35, 0, -5.4); vic.root.rotation.y = -0.75; sc.add(vic.root);
  { const wh = lc(0xf0eee6); const g = new GB(0, 0, false); crObx(g, 0, 0.15, 0.13, 0.5, 0.3, 0.05, wh, 0.2, 0, 0, 0.55); crObx(g, 0.04, 0.42, 0.14, 0.12, 0.1, 0.1, wh, 0.1); vic.sling = g.mesh(mats.std, false, false); vic.tor.add(vic.sling);
    vic.armL.rotation.x = -0.5; vic.armL.rotation.z = -0.25; vic.elL.rotation.x = -1.25; vic.armR.rotation.x = -0.3; vic.elR.rotation.x = -0.7;
    const cr = new GB(0, 0, false); crObx(cr, 0, 0.55, 0, 0.04, 1.1, 0.04, lc(0xb8b8c0), 0); crObx(cr, 0, 1.0, 0, 0.22, 0.04, 0.04, lc(0x30343c), 0); const cm = cr.mesh(mats.std, false, false); cm.position.set(5.3, 0.25, -4.7); cm.rotation.set(-0.12, 0.2, 0.2); sc.add(cm);
    const cr2 = cm.clone(); cr2.position.set(5.5, 0.25, -4.75); cr2.rotation.set(-0.1, 0.1, 0.12); sc.add(cr2);
    const cast = new GB(0, 0, false); crObx(cast, 0, -0.2, 0.12, 0.2, 0.46, 0.2, wh, 0.1); crObx(cast, 0, -0.45, 0.15, 0.16, 0.12, 0.3, wh, 0.1); const cmesh = cast.mesh(mats.std, false, false); vic.legR.add(cmesh); }
  const sMesh = S.mesh(mats.std, false, true), pMesh = P.mesh(mats.pol, false, true), eMesh = E.mesh(mats.emi, false, false); sc.add(sMesh, pMesh, eMesh);
  /* first-person hands (children of the camera) */
  const hands = CR.hands = [];
  const SK = skinA[2], SL = lc(0x1a2235), CF = lc(0xf0f0f0);
  for (const sx of [-1, 1]) {
    const gp = new THREE.Group();
    const gm = new GB(0, 0, false);
    crObx(gm, 0, 0, 0.32, 0.12, 0.1, 0.5, SL, 0.25); crObx(gm, 0, -0.002, 0.04, 0.115, 0.095, 0.06, CF, 0); crEll(gm, 0, -0.005, -0.04, 0.062, 0.035, 0.085, SK, 0.2);
    for (let i = 0; i < 4; i++) crObx(gm, -0.04 + i * 0.027, -0.012, -0.135, 0.022, 0.026, 0.1, SK, 0.1);
    crObx(gm, sx * -0.06, -0.01, -0.05, 0.03, 0.028, 0.08, SK, 0.1, 0, sx * 0.5, 0);
    const mm = gm.mesh(mats.std, false, false); gp.add(mm); gp.userData.sx = sx; CR.cam.add(gp); hands.push(gp);
  }
  return { focus: CR_FOCUS_COURT, eye: new THREE.Vector3(0.3, 1.24, 5.55), expo: 1.1, lay: { lawX0: 0.8, lawFree: 0.6, lawFreeAmp: [1.9, 0.9], lawRest: -2.3, lawRestAmp: [0.7, 0.35], lawZ: -0.7, lawZAmp: 0.35, victim: [4.35, -5.4], jury: [-6.4, -2.6], judge: [0, -7.4] } };
};

/* ---- per-frame: poses, camera, cues ---- */
CR.reset = function () {
  CR.t = 0; CR.hold = false; CR.shake = 0; CR.slam = [0, 0]; CR.gavel = -1; CR.rapid = 0; CR.speak = ''; CR.favor = 0.5; CR.press = 0; CR.lawX = CR.lay ? CR.lay.lawX0 : 0.8; CR.flinch = 0; CR.sweat = 0; CR.focusName = 'ahead';
  CR.look.x = CR.look.y = CR.look.tx = CR.look.ty = 0; { const a = CR.focusTab ? CR.focusTab.ahead : [0, 1.5, -3, 58]; CR.foc.set(a[0], a[1], a[2]); CR.tgt.set(a[0], a[1], a[2]); CR.fov = CR.fovT = a[3]; } CR.cheer = 0; CR.cringe = 0;
};
const CR_FOCUS_COURT = { ahead: [0, 1.45, -3.2, 58], judge: [0, 1.78, -7.4, 27], lawyer: null, victim: [4.35, 1.45, -5.4, 26], jury: [-6.8, 1.35, -2.6, 62], table: [0, 1.0, 4.2, 66], bench: [0, 1.45, -6.6, 36], gavel: [0, 0.6, -7.0, 32] };
CR.focus = function (name) { CR.focusName = name; };
CR.cue = function (n, v) {
  if (n === 'slam') { CR.slam[v === 0 ? 0 : 1] = 1; CR.shake = Math.max(CR.shake, 0.35); }
  else if (n === 'gavel') CR.gavel = 0;
  else if (n === 'shake') CR.shake = Math.max(CR.shake, v || 0.5);
  else if (n === 'cheer') CR.cheer = 1;
  else if (n === 'cringe') CR.cringe = 1;
  else if (n === 'flinch') CR.flinch = 1;
};
CR.update = function (dt) {
  const t = CR.t += dt, A = CR.A, ease = (a, b, k) => a + (b - a) * (1 - Math.exp(-k * dt));
  const sp = CR.speak;
  /* judge: head follows the speaker, gavel swing */
  const J = A.judge, lay = CR.lay; { const hy = crYawTo(J, sp) * 0.85; J.head.rotation.y = ease(J.head.rotation.y, hy + Math.sin(t * 0.3) * 0.06, 3); J.head.rotation.x = Math.sin(t * 0.5) * 0.03 + (sp === 'judge' ? -0.05 : 0.04); J.tor.scale.y = 1 + Math.sin(t * 1.4) * 0.006;
    let ga = -1.2, ea = -0.4; if (CR.hold) { CR.gavel = Math.min(Math.max(CR.gavel, 0) + dt, 0.215); const k = CR.gavel / 0.22; ga = -1.2 - 0.9 * k; ea = -0.4 - 0.4 * k; } else if (CR.gavel >= 0) { CR.gavel += dt; const g = CR.gavel; if (g < 0.22) { const k = g / 0.22; ga = -1.2 - 0.9 * k; ea = -0.4 - 0.4 * k; } else if (g < 0.3) { const k = (g - 0.22) / 0.08; ga = -2.1 + 1.0 * k; ea = -0.8 + 0.5 * k; } else if (g < 0.7) { const k = (g - 0.3) / 0.4; ga = -1.1 - 0.1 * k; ea = -0.3 - 0.1 * k; } else CR.gavel = -1; }
    J.armR.rotation.x = ga; J.elR.rotation.x = ea; J.armL.rotation.x = -1.15 + Math.sin(t * 0.7) * 0.03; }
  /* opposing lawyer paces and gestures; faces the jury, the witness or you depending on who is talking */
  const L = A.lawyer; {
    const talk = sp === 'lawyer', pace = talk ? 1 : 0.25;
    const free = CR.focusName === 'lawyer', tx = free ? lay.lawFree + Math.sin(t * 0.33 * (talk ? 1.4 : 0.8)) * lay.lawFreeAmp[talk ? 0 : 1] : lay.lawRest + Math.sin(t * 0.4) * lay.lawRestAmp[talk ? 0 : 1]; CR.lawX = ease(CR.lawX, tx, 1.5); L.root.position.x = CR.lawX; L.root.position.z = lay.lawZ + Math.sin(t * 0.21) * lay.lawZAmp;
    const jr = lay.jury, fx = sp === 'victim' ? lay.victim[0] : talk ? (Math.sin(t * 0.25) > 0.2 ? jr[0] : CR_EYE.x) : lay.judge[0]; const fz = sp === 'victim' ? lay.victim[1] : talk ? (Math.sin(t * 0.25) > 0.2 ? jr[1] : CR_EYE.z) : lay.judge[1];
    const want = Math.atan2(fx - L.root.position.x, fz - L.root.position.z); let dy = want - L.root.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); L.root.rotation.y += dy * (1 - Math.exp(-2.4 * dt));
    const g = Math.sin(t * 2.3) * pace, g2 = Math.sin(t * 1.7 + 1.2) * pace;
    L.armR.rotation.x = -0.55 - 0.45 * g - (talk ? 0.35 : 0); L.armR.rotation.z = -0.15 - 0.2 * Math.abs(g2) * (talk ? 1 : 0.2); L.elR.rotation.x = -0.9 - 0.4 * g2 * pace;
    L.armL.rotation.x = -0.25 - 0.3 * g2 * (talk ? 1 : 0.2); L.elL.rotation.x = -0.6 - 0.2 * g; L.armL.rotation.z = 0.1 + (talk ? 0.15 : 0);
    L.head.rotation.x = 0.05 + (talk ? Math.sin(t * 3.1) * 0.05 : 0) + (CR.cringe > 0 ? -0.1 : 0); L.head.rotation.y = Math.sin(t * 0.7) * 0.15 * pace;
    const walk = Math.sin(t * 4.2 * (talk ? 1 : 0.6)) * (talk ? 0.35 : 0.2); L.legL.rotation.x = walk; L.legR.rotation.x = -walk; L.knL.rotation.x = Math.max(0, -walk) * 0.6; L.knR.rotation.x = Math.max(0, walk) * 0.6;
    L.tor.rotation.z = Math.sin(t * 2.3) * 0.02 * pace; if (CR.cringe > 0) { L.tor.rotation.x = 0.12 * CR.cringe; CR.cringe = Math.max(0, CR.cringe - dt * 0.6); } else L.tor.rotation.x = ease(L.tor.rotation.x, 0, 3);
  }
  /* the injured pedestrian: breathes, winces; shakes when you grill them */
  const V = A.victim; { const sw = CR.sweat; V.head.rotation.y = Math.sin(t * 0.4) * 0.12 + (sp === 'victim' || sp === 'lawyer' ? crYawAt(V, L.root.position.x, L.root.position.z) : crYawAt(V, lay.judge[0], lay.judge[1])) * 0.8; V.head.rotation.x = 0.08 + (sp === 'victim' ? Math.sin(t * 5) * 0.03 : 0) + sw * 0.1; V.tor.rotation.z = Math.sin(t * 30) * 0.012 * sw; V.tor.position.x = Math.sin(t * 34) * 0.012 * sw; V.root.position.y = 0;
    V.tor.scale.y = 1 + Math.sin(t * 1.6) * 0.008 + sw * Math.sin(t * 9) * 0.01; V.armR.rotation.x = -0.3 - 0.4 * sw * (0.5 + 0.5 * Math.sin(t * 8)); }
  /* jurors react to how you're doing */
  CR.A.jurors.forEach((j, i) => { const f = CR.favor, mood = f > 0.62 ? 1 : f < 0.36 ? -1 : 0; const nod = mood > 0 ? Math.sin(t * 2.2 + i * 1.3) * 0.12 : 0, shake = mood < 0 ? Math.sin(t * 3 + i) * 0.2 : 0; const look = crYawTo(j, sp);
    j.head.rotation.x = ease(j.head.rotation.x, 0.05 + nod + (mood < 0 ? 0.1 : 0), 4); j.head.rotation.y = ease(j.head.rotation.y, shake + look * (0.65 + 0.2 * Math.sin(i)) + Math.sin(t * 0.3 + i * 2) * 0.1, 3); j.tor.scale.y = 1 + Math.sin(t * 1.3 + i) * 0.006; });
  /* camera: looks at the focus target, with mouse look, breathing and shake */
  let fa = CR.focusTab[CR.focusName]; if (fa === undefined) fa = CR.focusTab.ahead; let fx = fa ? fa[0] : L.root.position.x, fy = fa ? fa[1] : 1.35, fz = fa ? fa[2] : L.root.position.z, fv = fa ? fa[3] : 42;
  CR.tgt.set(fx, fy, fz); CR.foc.x = ease(CR.foc.x, CR.tgt.x, 3.2); CR.foc.y = ease(CR.foc.y, CR.tgt.y, 3.2); CR.foc.z = ease(CR.foc.z, CR.tgt.z, 3.2); CR.fovT = fv; CR.fov = ease(CR.fov, CR.fovT, 3.5);
  CR.look.x = ease(CR.look.x, CR.look.tx, 5); CR.look.y = ease(CR.look.y, CR.look.ty, 5);
  if (CR.extra) CR.extra(dt, t); CR.shake = Math.max(0, CR.shake - dt * 1.7); const sh = CR.shake * CR.shake;
  const cam = CR.cam; cam.position.set(CR_EYE.x + Math.sin(t * 0.6) * 0.012 + (Math.random() - 0.5) * sh * 0.05, CR_EYE.y + Math.sin(t * 1.1) * 0.01 + (Math.random() - 0.5) * sh * 0.05, CR_EYE.z);
  cam.up.set(0, 1, 0); cam.lookAt(CR.foc.x, CR.foc.y, CR.foc.z); cam.rotation.y += CR.look.x; cam.rotation.x += CR.look.y; cam.rotation.z += (Math.random() - 0.5) * sh * 0.03 + Math.sin(t * 0.5) * 0.002;
  const a = window.innerWidth / Math.max(1, window.innerHeight), baseV = Math.max(CR.fov, 2 * Math.atan(Math.tan(20 * DEG) / Math.max(0.1, a)) / DEG);
  if (Math.abs(cam.aspect - a) > 1e-3 || Math.abs(cam.fov - baseV) > 0.01) { cam.aspect = a; cam.fov = baseV; cam.updateProjectionMatrix(); }
  /* hands */
  CR.slam[0] = Math.max(0, CR.slam[0] - dt * 3.4); CR.slam[1] = Math.max(0, CR.slam[1] - dt * 3.4);
  CR.rapid = Math.max(0, CR.rapid - dt * 2.2);
  CR.hands.forEach((h, i) => {
    const sx = h.userData.sx, s = CR.slam[i], bump = Math.sin(t * 22 + i * Math.PI) * 0.5 + 0.5, rp = CR.rapid * bump, hop = Math.sin(clamp(s, 0, 1) * Math.PI) * 0.09;
    h.position.set(sx * 0.24 + Math.sin(t * 0.7 + sx) * 0.004, -0.255 + Math.sin(t * 1.1 + i) * 0.004 + hop - rp * 0.035, -0.5 - s * 0.06);
    h.rotation.set(-0.08 - s * 0.3 + rp * 0.08, -sx * 0.18, sx * 0.03);
  });
};
CR.render = function () {
  const s0 = scene, c0 = camera, e0 = env.exposure; scene = CR.scene; camera = CR.cam;
  const fx = Court.fx; fx.expo = 1; env.exposure = CR.expo; renderFrame(fx, App.time); env.exposure = e0;
  scene = s0; camera = c0;
};
