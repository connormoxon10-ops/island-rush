/* ================= COURT VENUES =================
   Besides the county courtroom (08_courtroom.js) the lawsuit minigame can happen in a small-claims room, on a live TV court show,
   in a police interview room or at a hospital bedside. Every venue is its own cached scene built from the same helpers; they all put you
   at the south end looking north at a cast of three animated people (authority = A.judge, opposing lawyer = A.lawyer, pedestrian = A.victim)
   plus an optional audience (A.jurors). Each returns { focus, eye, expo, lay, extra } like the courtroom does. */

/* ---- shared room helpers ---- */
function crWalls(S, P, o) {
  const up = o.up, lo = o.low || o.up, wh = o.wh || 0, hx = o.hx, hz = o.hz, hy = o.hy;
  const wall = (ax, az, bx, bz, nx, nz) => {
    S.quadA([ax, wh, az, 0, 0], [bx, wh, bz, 0, 0], [bx, hy, bz, 0, 0], [ax, hy, az, 0, 0], nx, 0, nz, up.r, up.g, up.b);
    if (wh > 0) {
      S.quadA([ax, 0, az, 0, 0], [bx, 0, bz, 0, 0], [bx, wh, bz, 0, 0], [ax, wh, az, 0, 0], nx, 0, nz, lo.r, lo.g, lo.b);
      if (o.rail) P.quadA([ax, wh, az, 0, 0], [bx, wh, bz, 0, 0], [bx + nx * 0.07, wh, bz + nz * 0.07, 0, 0], [ax + nx * 0.07, wh, az + nz * 0.07, 0, 0], 0, 1, 0, o.rail.r, o.rail.g, o.rail.b);
    }
  };
  wall(-hx, -hz, hx, -hz, 0, 1); wall(hx, hz, -hx, hz, 0, -1); wall(-hx, hz, -hx, -hz, 1, 0); wall(hx, -hz, hx, hz, -1, 0);
  const cc = o.ceil; S.quadA([-hx, hy, -hz, 0, 0], [hx, hy, -hz, 0, 0], [hx, hy, hz, 0, 0], [-hx, hy, hz, 0, 0], 0, -1, 0, cc.r, cc.g, cc.b);
}
function crTiles(S, hx, hz, nx, nz, A, B) {
  const dx = 2 * hx / nx, dz = 2 * hz / nz;
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) { const C = (i + j) % 2 ? A : B, x0 = -hx + i * dx, z0 = -hz + j * dz; S.quadA([x0, 0, z0, 0, 0], [x0 + dx, 0, z0, 0, 0], [x0 + dx, 0, z0 + dz, 0, 0], [x0, 0, z0 + dz, 0, 0], 0, 1, 0, C.r, C.g, C.b); }
}
function crTable(gb, x0, z0, x1, z1, top, leg, h) {
  h = h || 0.76; crBox(gb, x0, h - 0.05, z0, x1, h, z1, top, 1);
  for (const [lx, lz] of [[x0 + 0.06, z0 + 0.06], [x1 - 0.1, z0 + 0.06], [x0 + 0.06, z1 - 0.1], [x1 - 0.1, z1 - 0.1]]) crBox(gb, lx, 0, lz, lx + 0.04, h - 0.05, lz + 0.04, leg, 1);
}
function crChair(gb, x, z, col, w) { w = w || 0.5; crBox(gb, x - w / 2, 0, z - w / 2, x + w / 2, 0.46, z + w / 2, col, 0.95); crBox(gb, x - w / 2, 0.46, z + w / 2 - 0.05, x + w / 2, 1.0, z + w / 2, col, 0.9); }
function crPlant(gb, x, z, s) { s = s || 1; const gr = lc(0x2f6b3a), g2 = lc(0x3d8447); crCyl(gb, x, 0.22 * s, z, 0.2 * s, 0.44 * s, 0.2 * s, lc(0x8a4b2f), 0.2); crEll(gb, x, 0.75 * s, z, 0.3 * s, 0.34 * s, 0.3 * s, gr, 0.3); crEll(gb, x + 0.14 * s, 0.95 * s, z - 0.05 * s, 0.22 * s, 0.26 * s, 0.22 * s, g2, 0.3); crEll(gb, x - 0.12 * s, 0.9 * s, z + 0.08 * s, 0.2 * s, 0.24 * s, 0.2 * s, g2, 0.3); }
function crBlob(gb, x, y, z, ry, i) {
  const pal = crPal(), jc = [0x2e6fa8, 0x8e5ba8, 0x3d8b5b, 0xc0392b, 0x2b2f36, 0xe0b43a, 0x5aa6a6, 0xd96b8c, 0xf2f2f2, 0xff7a3d][(i * 7 + 3) % 10], sk = pal.skinA[(i * 3 + 1) % 5], hr = pal.hairA[(i * 5 + 2) % 6];
  crObx(gb, x, y + 0.72, z, 0.46, 0.56, 0.3, lc(jc), 0.3, 0, ry, 0); crObx(gb, x, y + 0.5, z, 0.5, 0.12, 0.34, lc(0x23262d), 0.1, 0, ry, 0);
  crEll(gb, x, y + 1.14, z, 0.1, 0.125, 0.11, sk, 0.2); crEll(gb, x, y + 1.19, z, 0.108, 0.09, 0.115, hr, 0.35);
}
function crAdd(o, x, y, z, ry) { const r = crPerson(o); r.root.position.set(x, y, z); r.root.rotation.y = ry || 0; CR.scene.add(r.root); return r; }
function crMakeJudge(o) {
  const pal = crPal(), j = crPerson({ skin: pal.skinA[o.skin == null ? 1 : o.skin], hair: pal.hairA[o.hair == null ? 2 : o.hair], jacket: lc(o.jacket || 0x0b0b0e), shirt: lc(o.shirt || 0xf4f4f4), robe: !!o.robe, tie: o.tie ? lc(o.tie) : null, hairStyle: o.style || 'short', glasses: !!o.glasses, seated: true, seat: o.seat, build: o.build || 'normal', hat: o.hat ? lc(o.hat) : null });
  j.root.position.set(o.x, 0, o.z); j.root.rotation.y = o.ry || 0; CR.scene.add(j.root); j.armL.rotation.x = -1.15; j.elL.rotation.x = -0.5; j.armR.rotation.x = -1.2; j.elR.rotation.x = -0.4;
  crProp(j, o.prop || 'gavel'); CR.A.judge = j; return j;
}
function crMakeLawyer(o) {
  const pal = crPal(), l = crPerson({ skin: pal.skinA[o.skin == null ? 0 : o.skin], hair: pal.hairA[o.hair == null ? 0 : o.hair], jacket: lc(o.jacket || 0x1a2235), shirt: lc(0xf4f4f4), tie: lc(o.tie || 0xb3202c), pants: lc(o.pants || 0x161a25), hairStyle: o.style || 'slick', glasses: !!o.glasses, build: 'stout', s: 1.04 });
  l.root.position.set(o.x, 0, o.z); CR.scene.add(l.root); CR.A.lawyer = l; return l;
}
function crMakeVictim(o) {
  const pal = crPal(), mats = CR.mats, wh = lc(0xf0eee6);
  const v = crPerson({ skin: pal.skinA[o.skin == null ? 3 : o.skin], hair: pal.hairA[o.hair == null ? 1 : o.hair], jacket: lc(o.jacket || 0x2e6fa8), shirt: lc(0xece9e0), pants: lc(o.pants || 0x3a4a63), hairStyle: o.style || 'short', seated: true, seat: o.seat || 0.8, bandage: true, brace: true });
  v.root.position.set(o.x, 0, o.z); v.root.rotation.y = o.ry || 0; CR.scene.add(v.root);
  const g = new GB(0, 0, false); crObx(g, 0, 0.15, 0.13, 0.5, 0.3, 0.05, wh, 0.2, 0, 0, 0.55); crObx(g, 0.04, 0.42, 0.14, 0.12, 0.1, 0.1, wh, 0.1); v.sling = g.mesh(mats.std, false, false); v.tor.add(v.sling);
  v.armL.rotation.x = -0.5; v.armL.rotation.z = -0.25; v.elL.rotation.x = -1.25; v.armR.rotation.x = -0.3; v.elR.rotation.x = -0.7;
  const cast = new GB(0, 0, false); crObx(cast, 0, -0.2, 0.12, 0.2, 0.46, 0.2, wh, 0.1); crObx(cast, 0, -0.45, 0.15, 0.16, 0.12, 0.3, wh, 0.1); v.legR.add(cast.mesh(mats.std, false, false));
  if (o.lean) v.tor.rotation.x = -o.lean; CR.A.victim = v; return v;
}
function crFinish(sc, S, P, E) { const mats = CR.mats; sc.add(S.mesh(mats.std, false, true), P.mesh(mats.pol, false, true), E.mesh(mats.emi, false, false)); }

/* =============== SMALL CLAIMS: a municipal room with fluorescent tubes, vinyl tiles and a very tired magistrate =============== */
CR.builders.small = function () {
  const mats = CR.mats, pal = crPal(), SK = pal.skinA, HR = pal.hairA, sc = crStage(0.03);
  sc.add(new THREE.HemisphereLight(0xeef2ff, 0x77705f, 1.05));
  const l1 = new THREE.PointLight(0xf6f8ff, 1.05, 16, 1.5); l1.position.set(0, 3.1, -1.5); sc.add(l1); CR.lamp = l1;
  const l2 = new THREE.PointLight(0xf6f8ff, 0.85, 14, 1.5); l2.position.set(0, 3.1, 3.2); sc.add(l2);
  const S = new GB(0, 0, false), P = new GB(0, 0, false), E = new GB(0, 0, false), HX = 5.5, HZ = 6.5, HY = 3.5;
  const WOOD = lc(0x7a5230), WOOD2 = lc(0x5b3b1e), WOOD3 = lc(0x8c6038), GOLD = lc(0xd9ae45), LEATH = lc(0x2b3a52), PAPER = lc(0xf2efe6), STEEL = lc(0x9aa0a8), NAVY = lc(0x1d2a44);
  crTiles(S, HX, HZ, 10, 12, lc(0xb9b6ac), lc(0x9d9a90));
  crWalls(S, P, { hx: HX, hz: HZ, hy: HY, up: lc(0xe4dcc6), low: lc(0x3d6a56), wh: 1.15, rail: WOOD3, ceil: lc(0xd2cdc2) });
  for (const z of [-4.2, -0.6, 3]) for (const x of [-2.2, 2.2]) E.quadA([x - 0.7, HY - 0.02, z - 0.24, 0, 0], [x + 0.7, HY - 0.02, z - 0.24, 0, 0], [x + 0.7, HY - 0.02, z + 0.24, 0, 0], [x - 0.7, HY - 0.02, z + 0.24, 0, 0], 0, -1, 0, 2.5, 2.6, 2.7);
  /* back wall: sign, flags, clock */
  crBox(P, -2.0, 2.78, -HZ, 2.0, 3.3, -HZ + 0.08, lc(0x3d6a56), 0.9);
  crSign(sc, crTex('ISLAND COUNTY · SMALL CLAIMS', 1024, 96, { size: 56, ls: '5px', fg: '#f2eddb' }), 3.7, 0.36, 0, 3.12, -HZ + 0.14);
  crSign(sc, crTex('ROOM 4', 512, 80, { size: 52, ls: '8px', fg: '#f6e3a1' }), 1.2, 0.19, 0, 2.88, -HZ + 0.14);
  for (const sx of [-3.7, 3.7]) { crBox(P, sx - 0.55, 0.95, -HZ, sx + 0.55, 2.45, -HZ + 0.04, NAVY, 0.9); crBox(P, sx - 0.55, 1.6, -HZ + 0.04, sx + 0.55, 1.75, -HZ + 0.06, GOLD, 0.8); crBox(P, sx - 0.57, 2.45, -HZ, sx + 0.57, 2.5, -HZ + 0.06, GOLD, 0.7); }
  crCyl(P, -4.4, 2.75, -HZ + 0.05, 0.3, 0.04, 0.3, lc(0xf4f4f0), 0, Math.PI / 2, 0, 0); crObx(P, -4.4, 2.8, -HZ + 0.08, 0.025, 0.2, 0.01, lc(0x1b1b1b), 0); crObx(P, -4.34, 2.75, -HZ + 0.08, 0.16, 0.025, 0.01, lc(0x1b1b1b), 0);
  /* magistrate's desk on a low platform */
  crBox(P, -3.4, 0, -HZ + 0.2, 3.4, 0.25, -4.3, WOOD3, 0.85);
  crBox(P, -2.3, 0.25, -5.65, 2.3, 1.2, -4.95, WOOD, 0.9); crBox(P, -2.4, 1.2, -5.75, 2.4, 1.27, -4.85, WOOD3, 1.0);
  crBox(S, -0.55, 0.25, -6.25, 0.55, 0.78, -5.65, LEATH, 1.0); crBox(S, -0.6, 0.75, -6.4, 0.6, 1.75, -6.2, LEATH, 0.95);
  crBox(P, -0.45, 1.27, -4.97, 0.45, 1.33, -4.86, GOLD, 0.8); crSign(sc, crTex('MAGISTRATE PRUITT', 512, 64, { size: 34, fg: '#2a1a08', bg: '#d9ae45' }), 0.9, 0.11, 0, 1.335, -4.855).rotation.x = -0.15;
  crBox(S, -1.7, 1.27, -5.4, -1.0, 1.29, -5.0, PAPER); crBox(S, 1.1, 1.27, -5.45, 1.7, 1.45, -5.1, lc(0x7a2a22)); crCyl(S, 1.9, 1.33, -5.3, 0.05, 0.1, 0.05, lc(0x2f5d9e), 0.2);
  /* clerk's desk (left) and the witness chair (right) */
  crTable(P, -4.8, -5.3, -2.9, -4.4, WOOD3, WOOD2, 0.78); crBox(S, -4.1, 0.78, -5.0, -3.5, 0.82, -4.6, lc(0x30343c)); crBox(S, -4.0, 0.82, -4.78, -3.6, 1.04, -4.74, lc(0x20242a));
  { const c = crPerson({ skin: SK[4], hair: HR[1], jacket: lc(0x4b5a7a), shirt: lc(0xf0f0f0), pants: lc(0x2a2d36), hairStyle: 'bun', seated: true, seat: 0.57, glasses: true }); c.root.position.set(-3.85, 0, -5.75); c.root.rotation.y = 0.15; c.armL.rotation.x = -1.1; c.armR.rotation.x = -1.1; c.elL.rotation.x = -0.6; c.elR.rotation.x = -0.6; crBake(c, S); crBox(S, -4.12, 0, -6.02, -3.58, 0.5, -5.48, LEATH); }
  crBox(S, 3.3, 0, -4.85, 4.1, 0.5, -4.0, lc(0x3a4a63), 0.95); crBox(S, 3.3, 0.5, -4.9, 4.1, 1.2, -4.8, lc(0x3a4a63), 0.9);
  /* tables: ours in the foreground, the plaintiff's on the right */
  crTable(P, -2.6, 3.1, 1.8, 4.3, WOOD3, WOOD2); crTable(P, 2.0, -1.4, 4.8, -0.2, WOOD3, WOOD2);
  for (let i = 0; i < 4; i++) { _q.setFromEuler(_e.set(0, 0.2 * i - 0.3, 0)); crObx(S, -1.2 + i * 0.12, 0.768 + i * 0.004, 3.7, 0.3, 0.004, 0.4, PAPER, 0, 0, 0.2 * i - 0.3, 0); }
  crBox(P, -0.4, 0.76, 3.13, 0.4, 0.83, 3.2, WOOD2, 0.8); crSign(sc, crTex('DEFENDANT', 512, 64, { size: 40, fg: '#d9ae45', bg: '#3a2410' }), 0.7, 0.07, 0, 0.8, 3.205);
  crBox(S, 3.0, 0.76, -1.1, 3.6, 0.78, -0.6, PAPER);
  /* side walls: blinds on the right, notice board + door on the left, cooler, plants */
  E.quadA([HX - 0.02, 1.3, -0.8, 0, 0], [HX - 0.02, 1.3, 2.8, 0, 0], [HX - 0.02, 3.05, 2.8, 0, 0], [HX - 0.02, 3.05, -0.8, 0, 0], -1, 0, 0, 2.0, 2.2, 2.55);
  for (let k = 0; k < 9; k++) crBox(P, HX - 0.09, 1.35 + k * 0.19, -0.8, HX - 0.04, 1.42 + k * 0.19, 2.8, lc(0xe8e4d8), 0.9);
  crBox(P, HX - 0.1, 1.25, -0.9, HX - 0.02, 3.1, -0.8, WOOD2); crBox(P, HX - 0.1, 1.25, 2.8, HX - 0.02, 3.1, 2.9, WOOD2); crBox(P, HX - 0.1, 1.25, -0.9, HX - 0.02, 1.32, 2.9, WOOD2); crBox(P, HX - 0.1, 3.05, -0.9, HX - 0.02, 3.12, 2.9, WOOD2);
  crBox(P, -HX, 0, 1.7, -HX + 0.08, 2.3, 2.9, WOOD2, 0.9); crBox(P, -HX + 0.08, 1.05, 2.65, -HX + 0.14, 1.1, 2.8, STEEL, 0.9);
  crBox(P, -HX, 1.4, -3.6, -HX + 0.05, 2.6, -1.6, lc(0x9a7b4a), 0.9);
  for (let i = 0; i < 7; i++) crBox(S, -HX + 0.05, 1.55 + (i % 3) * 0.33, -3.45 + Math.floor(i / 3) * 0.6 + (i % 2) * 0.05, -HX + 0.07, 1.8 + (i % 3) * 0.33, -3.22 + Math.floor(i / 3) * 0.6, lc([0xf2efe6, 0xf6e9a8, 0xd8e6f2][i % 3]), 0.95);
  crBox(P, -HX + 0.1, 0, -6.1, -HX + 0.6, 1.0, -5.6, STEEL, 0.9); crCyl(S, -HX + 0.35, 1.3, -5.85, 0.17, 0.32, 0.17, lc(0x9fd0ee), 0.1);
  crPlant(S, -HX + 0.5, -0.4); crPlant(S, HX - 0.5, 5.6, 1.1); crPlant(S, -HX + 0.5, 5.6, 1.1);
  { const g1 = crPerson({ skin: SK[2], hair: HR[3], jacket: lc(0x6b4a3a), shirt: lc(0xe8e8e0), pants: lc(0x2a2d36), hairStyle: 'short', seated: true, seat: 0.57 }); g1.root.position.set(4.3, 0, 2.2); g1.root.rotation.y = -1.9; g1.armL.rotation.x = -0.9; g1.armR.rotation.x = -0.9; g1.elL.rotation.x = -0.6; g1.elR.rotation.x = -0.6; crBake(g1, S); crBox(S, 4.0, 0, 1.9, 4.6, 0.46, 2.5, lc(0x3a4a63)); crBox(S, 4.5, 0.46, 1.9, 4.6, 1.0, 2.5, lc(0x3a4a63), 0.9); }
  crFinish(sc, S, P, E);
  /* cast */
  const J = crMakeJudge({ x: 0, z: -6.0, seat: 0.25 + 0.57, robe: true, jacket: 0x1c2230, skin: 4, hair: 5, glasses: true, build: 'stout' });
  crMakeLawyer({ x: 0.6, z: -0.2, jacket: 0x5a3d2e, tie: 0x2f6d4a, hair: 4, style: 'short', glasses: true });
  crMakeVictim({ x: 3.7, z: -4.4, ry: -0.5, seat: 0.57, jacket: 0x8a5a2e, skin: 0, hair: 4 });
  crHandsInit(lc(0x1a2235));
  return {
    eye: new THREE.Vector3(0, 1.2, 4.75), expo: 1.15,
    focus: { ahead: [0, 1.35, -2.5, 58], judge: [0, 1.55, -6.0, 28], lawyer: null, victim: [3.7, 1.3, -4.4, 28], jury: [-3.6, 1.2, -3, 60], table: [0, 0.95, 3.7, 66], bench: [0, 1.3, -5.2, 40], gavel: [0, 1.0, -5.1, 34] },
    lay: { lawX0: 0.8, lawFree: 0.9, lawFreeAmp: [1.3, 0.6], lawRest: -2.0, lawRestAmp: [0.5, 0.3], lawZ: -2.2, lawZAmp: 0.4, victim: [3.7, -4.4], jury: [-3.6, -3], judge: [0, -6.0] }
  };
};

/* =============== TV STUDIO: "Rapid Justice" with a live audience, neon floor and an ON AIR sign =============== */
CR.builders.tv = function () {
  const mats = CR.mats, pal = crPal(), SK = pal.skinA, HR = pal.hairA, sc = crStage(0.01);
  sc.add(new THREE.HemisphereLight(0x6068b0, 0x1c1226, 0.75));
  const key = new THREE.PointLight(0xfff0e0, 1.7, 28, 1.4); key.position.set(0, 6.6, -1); sc.add(key); CR.lamp = key;
  const mag = new THREE.PointLight(0xff3fb0, 1.1, 18, 1.5); mag.position.set(-5.5, 5, -4); sc.add(mag);
  const cy = new THREE.PointLight(0x33d4ff, 1.1, 18, 1.5); cy.position.set(5.5, 5, -4); sc.add(cy);
  const S = new GB(0, 0, false), P = new GB(0, 0, false), E = new GB(0, 0, false), HX = 9, HZ = 10, HY = 7.5;
  const DARK = lc(0x2a1838), GOLD = lc(0xd9ae45), RED = lc(0x8e1f2c), TRUSS = lc(0x4a4d57);
  S.quadA([-HX, 0, -HZ, 0, 0], [HX, 0, -HZ, 0, 0], [HX, 0, HZ, 0, 0], [-HX, 0, HZ, 0, 0], 0, 1, 0, 0.05, 0.055, 0.075);
  crWalls(S, P, { hx: HX, hz: HZ, hy: HY, up: lc(0x0b0e1c), ceil: lc(0x07080e) });
  /* glowing rings on the floor */
  crCyl(E, 0, 0.012, -2.6, 5.3, 0.006, 5.3, new THREE.Color(2.6, 0.35, 1.7), 0); crCyl(S, 0, 0.018, -2.6, 5.1, 0.006, 5.1, lc(0x0c0f18), 0);
  crCyl(E, 0, 0.024, -2.6, 3.7, 0.006, 3.7, new THREE.Color(0.3, 1.8, 2.5), 0); crCyl(S, 0, 0.03, -2.6, 3.55, 0.006, 3.55, lc(0x0c0f18), 0);
  /* LED backdrop */
  for (let i = 0; i < 40; i++) {
    const x0 = -8 + i * 0.4, h = 0.86 - 0.5 * (i / 39), c = new THREE.Color().setHSL(h, 0.9, 0.5).convertSRGBToLinear();
    E.quadA([x0, 1.0, -HZ + 0.03, 0, 0], [x0 + 0.4, 1.0, -HZ + 0.03, 0, 0], [x0 + 0.4, 3.8, -HZ + 0.03, 0, 0], [x0, 3.8, -HZ + 0.03, 0, 0], 0, 0, 1, c.r * 1.5, c.g * 1.5, c.b * 1.5);
    E.quadA([x0, 3.8, -HZ + 0.03, 0, 0], [x0 + 0.4, 3.8, -HZ + 0.03, 0, 0], [x0 + 0.4, 6.8, -HZ + 0.03, 0, 0], [x0, 6.8, -HZ + 0.03, 0, 0], 0, 0, 1, c.r * 0.7, c.g * 0.7, c.b * 0.7);
  }
  crBox(P, -4.6, 3.3, -HZ + 0.04, 4.6, 5.9, -HZ + 0.2, lc(0x06070d), 1);
  crSign(sc, crTex('RAPID JUSTICE', 1024, 170, { size: 128, ls: '6px', fg: '#ffe14a' }), 8.2, 1.36, 0, 4.95, -HZ + 0.3);
  crSign(sc, crTex('WITH JUDGE BRONCO', 1024, 96, { size: 62, ls: '10px', fg: '#ff6bd0' }), 6, 0.56, 0, 3.85, -HZ + 0.3);
  crSign(sc, crTex('APPLAUSE', 512, 96, { bg: '#ffb02e', fg: '#1a1204', size: 64, ls: '6px' }), 2.2, 0.41, 0, 6.35, -HZ + 0.3);
  for (const z of [-8, -4, 0, 4, 8]) { crBox(E, -HX + 0.05, 0.4, z - 0.04, -HX + 0.1, 6.6, z + 0.04, new THREE.Color(2.2, 0.3, 1.6), 1); crBox(E, HX - 0.1, 0.4, z - 0.04, HX - 0.05, 6.6, z + 0.04, new THREE.Color(0.2, 1.8, 2.4), 1); }
  /* lighting truss */
  for (const z of [-6, -1, 4]) crBox(P, -HX, HY - 0.85, z - 0.08, HX, HY - 0.7, z + 0.08, TRUSS, 0.9);
  for (const x of [-5, 0, 5]) crBox(P, x - 0.08, HY - 0.85, -HZ, x + 0.08, HY - 0.7, HZ, TRUSS, 0.9);
  for (const x of [-6, -3, 0, 3, 6]) for (const z of [-6, -1, 4]) { crCyl(P, x, HY - 1.1, z, 0.22, 0.3, 0.22, lc(0x14151a), 0.2); crCyl(E, x, HY - 1.27, z, 0.17, 0.02, 0.17, new THREE.Color(3, 3, 3), 0); }
  /* judge's desk + throne */
  crBox(P, -4.6, 0, -7.6, 4.6, 0.3, -5.1, lc(0x1b1424), 0.9);
  crBox(P, -2.4, 0.3, -6.5, 2.4, 1.3, -5.5, DARK, 0.9); crBox(E, -2.4, 1.3, -5.53, 2.4, 1.34, -5.5, new THREE.Color(2.4, 1.7, 0.3), 1);
  for (const sx of [-1, 1]) { crObx(P, sx * 3.35, 0.8, -5.75, 2.0, 1.0, 0.9, DARK, 0.2, 0, sx * -0.45, 0); crObx(E, sx * 3.35, 1.31, -5.75, 2.0, 0.04, 0.9, new THREE.Color(0.3, 1.7, 2.4), 0, 0, sx * -0.45, 0); }
  crBox(S, -0.9, 0.3, -7.6, 0.9, 0.85, -6.8, RED, 0.95); crBox(S, -1.0, 0.3, -7.75, 1.0, 2.8, -7.5, RED, 0.9); crBox(P, -1.06, 2.8, -7.78, 1.06, 2.9, -7.46, GOLD, 0.8);
  crSign(sc, crTex('JUDGE BRONCO', 512, 64, { size: 36, fg: '#1a1204', bg: '#ffe14a' }), 0.9, 0.11, 0, 1.365, -5.52).rotation.x = -0.15;
  crSign(sc, crTex('RJ', 256, 128, { size: 96, fg: '#ffe14a' }), 0.9, 0.45, 0, 0.8, -5.48);
  /* guest chair (witness) */
  crBox(S, 4.1, 0, -5.1, 5.1, 0.5, -4.1, lc(0xc8372d), 0.95); crBox(S, 4.1, 0.5, -5.2, 5.1, 1.35, -5.0, lc(0xc8372d), 0.9); crBox(S, 4.05, 0.5, -5.1, 4.15, 0.85, -4.1, lc(0xa82a22), 0.9); crBox(S, 5.05, 0.5, -5.1, 5.15, 0.85, -4.1, lc(0xa82a22), 0.9);
  /* bleachers: left (animated audience) + right (baked) */
  for (const sx of [-1, 1]) for (const [a, b, y] of [[5.4, 6.6, 0.35], [6.6, 7.8, 0.7], [7.8, 9, 1.05]]) crBox(P, sx < 0 ? -b : a, 0, -6.4, sx < 0 ? -a : b, y, 1.6, lc(0x2b2f45), 0.9);
  const jc = [0x2e6fa8, 0x8e5ba8, 0x3d8b5b, 0xc0392b, 0x2b2f36, 0xe0b43a, 0x5aa6a6, 0xd96b8c].map(lc);
  for (let i = 0; i < 6; i++) {
    const row = i % 2, k = (i / 2) | 0, z = -4.6 + k * 1.6, x = row ? -7.2 : -6.0, y = row ? 0.7 : 0.35;
    const r = crPerson({ skin: SK[(i * 3) % 5], hair: HR[(i * 5 + 1) % 6], jacket: jc[(i * 3 + 1) % 8], shirt: lc(i % 2 ? 0xf2f2f2 : 0xdde6f2), pants: lc(0x2b2f3a), hairStyle: i === 2 ? 'bun' : i === 4 ? 'bald' : i === 1 ? 'long' : 'short', build: i === 3 ? 'stout' : 'normal', glasses: i === 4 || i === 1, seated: true, seat: y + 0.56 });
    r.root.position.set(x, 0, z); r.root.rotation.y = Math.PI / 2; r.armL.rotation.x = -0.3; r.armR.rotation.x = -0.3; r.elL.rotation.x = -0.85; r.elR.rotation.x = -0.85; sc.add(r.root); CR.A.jurors.push(r);
  }
  let bi = 0;
  for (const [x, y] of [[-6.0, 0.35], [-7.2, 0.7]]) for (const z of [0.2, 1.1]) crBlob(S, x, y, z, Math.PI / 2, bi++);
  for (const x of [-8.4]) for (let z = -5.4; z < 1.4; z += 1.1) crBlob(S, x, 1.05, z, Math.PI / 2, bi++);
  for (const [x, y] of [[6.0, 0.35], [7.2, 0.7], [8.4, 1.05]]) for (let z = -5.4; z < 1.4; z += 1.1) crBlob(S, x, y, z, -Math.PI / 2, bi++);
  /* two studio cameras with red tally lights, the defendant's podium, the ON AIR sign */
  for (const [cx, cz] of [[-3.6, 3.2], [3.9, 2.3]]) {
    for (let i = 0; i < 3; i++) { const a = i * TAU / 3 + 0.5; crObx(P, cx + Math.cos(a) * 0.28, 0.6, cz + Math.sin(a) * 0.28, 0.04, 1.25, 0.04, lc(0x1b1c21), 0, Math.sin(a) * 0.22, 0, -Math.cos(a) * 0.22); }
    crBox(P, cx - 0.3, 1.2, cz - 0.45, cx + 0.3, 1.62, cz + 0.35, lc(0x2a2d33), 0.9); crCyl(P, cx, 1.42, cz - 0.62, 0.14, 0.34, 0.14, lc(0x0b0b0d), 0.1, Math.PI / 2, 0, 0); crBox(E, cx - 0.04, 1.62, cz - 0.4, cx + 0.04, 1.67, cz - 0.34, new THREE.Color(3, 0.15, 0.15), 1);
  }
  crBox(P, -0.95, 0, 5.9, 0.95, 1.05, 6.4, DARK, 0.9); crBox(E, -0.95, 1.05, 5.9, 0.95, 1.075, 5.96, new THREE.Color(0.3, 2.0, 2.6), 1);
  crSign(sc, crTex('DEFENDANT', 512, 64, { size: 40, fg: '#ffe14a', bg: '#1a1224' }), 0.74, 0.09, 0, 0.88, 5.895);
  const onAir = crSign(sc, crTex('ON AIR', 512, 128, { bg: '#b3141f', fg: '#ffffff', size: 84, ls: '6px' }), 1.9, 0.48, -HX + 0.07, 5.0, 3.4, Math.PI / 2);
  crFinish(sc, S, P, E);
  crMakeJudge({ x: 0, z: -6.95, seat: 0.3 + 0.57, robe: true, jacket: 0x5a1a6a, skin: 1, hair: 5, glasses: true, build: 'stout', style: 'slick' });
  crMakeLawyer({ x: 0.8, z: -1.0, jacket: 0x1a2235, tie: 0xb3202c });
  crMakeVictim({ x: 4.6, z: -4.6, ry: -0.7, seat: 0.62, jacket: 0xe07a1e, skin: 3 });
  crHandsInit(lc(0x1a2235));
  return {
    eye: new THREE.Vector3(0.2, 1.3, 6.9), expo: 1.2,
    focus: { ahead: [0, 1.6, -3, 58], judge: [0, 1.95, -6.9, 28], lawyer: null, victim: [4.6, 1.45, -4.6, 28], jury: [-6.6, 1.7, -2.4, 62], table: [0, 1.1, 6.3, 66], bench: [0, 1.6, -5.8, 40], gavel: [0, 1.0, -5.6, 34] },
    lay: { lawX0: 0.8, lawFree: 0.6, lawFreeAmp: [2.0, 1.0], lawRest: -2.3, lawRestAmp: [0.8, 0.4], lawZ: -1.0, lawZAmp: 0.6, victim: [4.6, -4.6], jury: [-6.6, -2.4], judge: [0, -6.95] },
    extra: (dt, t) => { mag.intensity = 1.0 + 0.3 * Math.sin(t * 2.1) + CR.cheer * 0.5; cy.intensity = 1.0 + 0.3 * Math.sin(t * 2.1 + Math.PI) + CR.cheer * 0.5; onAir.visible = (t % 1.4) < 1.0; CR.cheer = Math.max(0, CR.cheer - dt * 0.8); }
  };
};

/* =============== INTERVIEW ROOM: one hanging lamp, a steel table, a one-way mirror and a detective who has seen it all =============== */
CR.builders.station = function () {
  const mats = CR.mats, pal = crPal(), SK = pal.skinA, HR = pal.hairA, sc = crStage(0.008);
  sc.add(new THREE.HemisphereLight(0x6a7a8a, 0x1a1a1a, 0.42));
  const cold = new THREE.PointLight(0x8ab0d8, 0.35, 9, 1.5); cold.position.set(0, 2.6, 2.6); sc.add(cold);
  const lampG = new THREE.Group(); lampG.position.set(0, 2.9, 0.1); sc.add(lampG);
  const lamp = new THREE.PointLight(0xffc880, 2.3, 11, 1.4); lamp.position.set(0, -0.98, 0); lampG.add(lamp); CR.lamp = lamp;
  const S = new GB(0, 0, false), P = new GB(0, 0, false), E = new GB(0, 0, false), HX = 3.2, HZ = 4.6, HY = 2.9;
  const STEEL = lc(0x8d949c), DARKM = lc(0x23262c);
  S.quadA([-HX, 0, -HZ, 0, 0], [HX, 0, -HZ, 0, 0], [HX, 0, HZ, 0, 0], [-HX, 0, HZ, 0, 0], 0, 1, 0, lc(0x54575c).r, lc(0x54575c).g, lc(0x54575c).b);
  crCyl(S, 0, 0.005, -3.4, 0.3, 0.004, 0.3, lc(0x2b2d31), 0);
  crWalls(S, P, { hx: HX, hz: HZ, hy: HY, up: lc(0x8a9096), low: lc(0x4d5964), wh: 1.2, rail: lc(0x2f3a44), ceil: lc(0x2a2c30) });
  /* the long table with a recorder, two cups and a stack of folders */
  crTable(P, -1.15, -0.75, 1.15, 0.95, STEEL, DARKM, 0.76);
  crBox(S, -0.2, 0.76, 0.0, 0.2, 0.8, 0.26, lc(0x1a1b1e), 0.9); crBox(E, 0.12, 0.8, 0.04, 0.16, 0.815, 0.08, new THREE.Color(3, 0.1, 0.1), 1);
  crCyl(S, -0.7, 0.82, 0.3, 0.05, 0.1, 0.05, lc(0xf2f2ee), 0.2); crCyl(S, 0.75, 0.82, -0.3, 0.05, 0.1, 0.05, lc(0xf2f2ee), 0.2);
  crBox(S, -0.55, 0.76, -0.45, -0.05, 0.84, -0.1, lc(0xc9a55a), 0.9); crBox(S, -0.5, 0.84, -0.42, -0.08, 0.86, -0.12, lc(0xf2efe6), 0);
  crBox(S, 0.3, 0.76, 0.3, 0.75, 0.78, 0.7, lc(0xf2efe6), 0); crBox(S, 0.4, 0.78, 0.4, 0.85, 0.79, 0.8, lc(0xe8e0c8), 0);
  /* pendant lamp (swings a little around its ceiling mount) */
  { const g = new GB(0, 0, false); crCyl(g, 0, -0.45, 0, 0.012, 0.9, 0.012, DARKM, 0); crCyl(g, 0, -0.95, 0, 0.32, 0.22, 0.32, lc(0x3a3d42), 0.3); lampG.add(g.mesh(mats.pol, false, false)); const e = new GB(0, 0, false); crCyl(e, 0, -1.07, 0, 0.12, 0.04, 0.12, new THREE.Color(3.2, 2.5, 1.5), 0); lampG.add(e.mesh(mats.emi, false, false)); }
  /* one-way mirror on the left wall */
  crBox(P, -HX, 0.95, -2.7, -HX + 0.06, 2.5, 1.7, lc(0x1c1e22), 0.9);
  S.quadA([-HX + 0.07, 1.05, -2.6, 0, 0], [-HX + 0.07, 1.05, 1.6, 0, 0], [-HX + 0.07, 2.4, 1.6, 0, 0], [-HX + 0.07, 2.4, -2.6, 0, 0], 1, 0, 0, 0.02, 0.03, 0.045);
  E.quadA([-HX + 0.075, 1.2, -1.8, 0, 0], [-HX + 0.075, 1.2, -1.2, 0, 0], [-HX + 0.075, 2.3, -0.3, 0, 0], [-HX + 0.075, 2.3, -0.9, 0, 0], 1, 0, 0, 0.1, 0.13, 0.17);
  /* back wall: height chart, door and camera on the right, clock */
  crBox(S, -1.4, 0.0, -HZ + 0.01, 1.4, 2.4, -HZ + 0.03, lc(0xe8e6de), 0.95);
  for (let i = 0; i < 9; i++) crBox(S, -1.4, 0.3 + i * 0.22, -HZ + 0.03, 1.4, 0.32 + i * 0.22, -HZ + 0.04, lc(0x1b1d22), 0);
  crBox(P, HX - 0.1, 0, -3.9, HX, 2.15, -2.7, lc(0x6f7780), 0.9); crBox(E, HX - 0.11, 1.5, -3.5, HX - 0.1, 1.9, -3.1, new THREE.Color(0.45, 0.55, 0.65), 1); crBox(P, HX - 0.13, 0.95, -3.0, HX - 0.1, 1.05, -2.8, STEEL, 0.9);
  crBox(P, HX - 0.35, 2.5, -HZ + 0.2, HX - 0.05, 2.75, -HZ + 0.6, lc(0x1b1d22), 0.9); crBox(E, HX - 0.28, 2.6, -HZ + 0.6, HX - 0.24, 2.64, -HZ + 0.62, new THREE.Color(3, 0.1, 0.1), 1);
  crCyl(P, HX - 0.04, 2.4, 1.0, 0.24, 0.04, 0.24, lc(0xf4f4f0), 0, 0, 0, Math.PI / 2); crObx(P, HX - 0.07, 2.45, 1.0, 0.01, 0.17, 0.02, lc(0x1b1b1b), 0); crObx(P, HX - 0.07, 2.4, 1.07, 0.01, 0.02, 0.13, lc(0x1b1b1b), 0);
  crSign(sc, crTex('INTERVIEW 2', 512, 80, { size: 52, ls: '6px', fg: '#e8e4d8', bg: '#2a3038' }), 0.9, 0.14, 0, 2.5, -HZ + 0.12);
  /* chairs: the detective's, the witness's and yours (behind the camera) */
  crBox(S, -0.3, 0, -2.1, 0.3, 0.46, -1.55, lc(0x3a3d42), 0.95); crBox(S, -0.3, 0.46, -2.15, 0.3, 1.1, -2.05, lc(0x3a3d42), 0.9);
  crBox(S, 1.9, 0, -1.4, 2.5, 0.46, -0.8, lc(0x3a3d42), 0.95); crBox(S, 2.45, 0.46, -1.4, 2.55, 1.1, -0.8, lc(0x3a3d42), 0.9);
  crFinish(sc, S, P, E);
  crMakeJudge({ x: 0, z: -1.5, seat: 0.57, jacket: 0x6a5238, shirt: 0xd8d2c0, tie: 0x7a2a2a, skin: 2, hair: 4, style: 'short', build: 'stout', prop: 'folder' });
  crMakeLawyer({ x: -2.0, z: -2.9, jacket: 0x3a3f4c, tie: 0x2a2f3a, hair: 3, style: 'slick' });
  crMakeVictim({ x: 2.15, z: -1.05, ry: -Math.PI / 2 + 0.15, seat: 0.57, jacket: 0x6a7a4a, skin: 4, hair: 1 });
  crHandsInit(lc(0x2a2f3a));
  return {
    eye: new THREE.Vector3(0, 1.15, 3.1), expo: 1.05,
    focus: { ahead: [0, 1.15, -1.5, 56], judge: [0, 1.3, -1.5, 30], lawyer: null, victim: [2.15, 1.2, -1.05, 32], jury: [-3.2, 1.5, -0.7, 58], table: [0, 0.85, 0.2, 62], bench: [0, 0.9, 0.0, 40], gavel: [0, 0.85, -0.3, 36] },
    lay: { lawX0: -2.0, lawFree: -1.7, lawFreeAmp: [0.35, 0.2], lawRest: -2.0, lawRestAmp: [0.2, 0.15], lawZ: -2.9, lawZAmp: 0.35, victim: [2.15, -1.05], jury: [-3.2, -0.7], judge: [0, -1.5] },
    extra: (dt, t) => { lampG.rotation.z = Math.sin(t * 0.55) * 0.025; lampG.rotation.x = Math.sin(t * 0.43 + 1) * 0.02; }
  };
};

/* =============== HOSPITAL WARD: a bedside hearing with a beeping monitor, balloons and a mediator with a clipboard =============== */
CR.builders.hosp = function () {
  const mats = CR.mats, pal = crPal(), SK = pal.skinA, HR = pal.hairA, sc = crStage(0.03);
  sc.add(new THREE.HemisphereLight(0xe6f4ff, 0x7a8a82, 1.1));
  const l1 = new THREE.PointLight(0xeaf4ff, 1.0, 12, 1.5); l1.position.set(0, 2.8, -1.5); sc.add(l1); CR.lamp = l1;
  const l2 = new THREE.PointLight(0xeaf4ff, 0.8, 12, 1.5); l2.position.set(0, 2.8, 2.6); sc.add(l2);
  const sun = new THREE.DirectionalLight(0xdfeeff, 0.7); sun.position.set(-6, 3, -1); sc.add(sun); sc.add(sun.target);
  const S = new GB(0, 0, false), P = new GB(0, 0, false), E = new GB(0, 0, false), HX = 3.8, HZ = 5.4, HY = 3.1;
  const WHITE = lc(0xeef2f4), STEEL = lc(0xb4bcc4), BLUE = lc(0x7aa6c8);
  crTiles(S, HX, HZ, 8, 12, lc(0xb4c0b8), lc(0xa6b4ac));
  crWalls(S, P, { hx: HX, hz: HZ, hy: HY, up: lc(0xd8e8e0), low: lc(0x9ec2b4), wh: 1.0, rail: WHITE, ceil: lc(0xe8ecee) });
  for (const z of [-3.2, 0.2, 3.4]) E.quadA([-0.7, HY - 0.02, z - 0.28, 0, 0], [0.7, HY - 0.02, z - 0.28, 0, 0], [0.7, HY - 0.02, z + 0.28, 0, 0], [-0.7, HY - 0.02, z + 0.28, 0, 0], 0, -1, 0, 2.4, 2.55, 2.7);
  /* window with blinds on the left wall */
  E.quadA([-HX + 0.02, 1.2, -2.2, 0, 0], [-HX + 0.02, 1.2, 1.2, 0, 0], [-HX + 0.02, 2.2, 1.2, 0, 0], [-HX + 0.02, 2.2, -2.2, 0, 0], 1, 0, 0, 2.0, 2.2, 2.35);
  E.quadA([-HX + 0.02, 2.2, -2.2, 0, 0], [-HX + 0.02, 2.2, 1.2, 0, 0], [-HX + 0.02, 2.9, 1.2, 0, 0], [-HX + 0.02, 2.9, -2.2, 0, 0], 1, 0, 0, 1.1, 1.6, 2.4);
  for (let k = 0; k < 6; k++) crBox(P, -HX + 0.03, 2.15 + k * 0.13, -2.2, -HX + 0.09, 2.2 + k * 0.13, 1.2, lc(0xf2f2ee), 0.9);
  crBox(P, -HX, 1.15, -2.3, -HX + 0.1, 3.0, -2.2, WHITE); crBox(P, -HX, 1.15, 1.2, -HX + 0.1, 3.0, 1.3, WHITE); crBox(P, -HX, 1.1, -2.3, -HX + 0.1, 1.2, 1.3, WHITE);
  /* back wall: ward sign + bunting, sanitiser */
  crSign(sc, crTex('WARD 3 · ST. MARLOW GENERAL', 1024, 90, { size: 52, ls: '4px', fg: '#2e6d5a' }), 3.4, 0.3, -0.9, 2.55, -HZ + 0.12);
  const flags = [0xff6b6b, 0xffd166, 0x4ecdc4, 0x7aa6ff, 0xc792ea];
  for (let i = 0; i < 10; i++) { const x0 = 0.5 + i * 0.3, c = lc(flags[i % 5]), dy = Math.sin(i / 9 * Math.PI) * -0.18; S.triA([x0, 2.4 + dy, -HZ + 0.03, 0, 0], [x0 + 0.24, 2.4 + dy - 0.0, -HZ + 0.03, 0, 0], [x0 + 0.12, 2.15 + dy, -HZ + 0.03, 0, 0], 0, 0, 1, c.r, c.g, c.b); }
  crBox(P, HX - 0.1, 1.15, 2.2, HX, 1.6, 2.4, WHITE); crBox(S, HX - 0.14, 1.3, 2.25, HX - 0.1, 1.5, 2.35, lc(0x4ecdc4));
  /* the bed: frame, mattress, blanket, pillow, head and foot boards */
  crBox(P, 0.9, 0.2, -5.0, 3.0, 0.5, -2.0, STEEL, 0.9); crBox(S, 0.95, 0.5, -4.95, 2.95, 0.78, -2.05, WHITE, 0.95); crBox(S, 0.93, 0.78, -4.05, 2.97, 0.94, -2.03, BLUE, 0.9); crBox(S, 0.93, 0.94, -4.08, 2.97, 0.97, -4.02, lc(0xe8f0f6), 0.9);
  crBox(S, 1.35, 0.78, -4.9, 2.55, 0.98, -4.35, WHITE, 0.95); crBox(P, 0.85, 0.3, -5.1, 3.05, 1.45, -5.0, STEEL, 0.9); crBox(P, 0.85, 0.3, -2.05, 3.05, 0.9, -1.97, STEEL, 0.9);
  for (const x of [1.0, 2.9]) for (const z of [-4.9, -2.1]) crCyl(P, x, 0.1, z, 0.04, 0.2, 0.04, lc(0x2a2d33), 0.2);
  /* monitor on a stand with a live trace, IV pole, bedside cabinet with flowers, balloons */
  crBox(P, 0.35, 0, -4.8, 0.45, 1.3, -4.7, STEEL, 0.9); crBox(P, 0.15, 0, -4.9, 0.65, 0.06, -4.6, STEEL, 0.9); crBox(S, 0.05, 1.3, -4.95, 0.75, 1.75, -4.7, lc(0x2a2d33), 0.9);
  const ekg = mkCanvas(256, 128), ec = ekg.getContext('2d'), et = new THREE.CanvasTexture(ekg); et.encoding = THREE.sRGBEncoding;
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.36), new THREE.MeshBasicMaterial({ map: et })); scr.position.set(0.4, 1.53, -4.69); sc.add(scr);
  crBox(P, 3.3, 0, -4.4, 3.35, 2.1, -4.35, STEEL, 0.9); crBox(P, 3.2, 2.05, -4.45, 3.5, 2.1, -4.3, STEEL, 0.9); crBox(S, 3.18, 1.55, -4.42, 3.42, 1.9, -4.36, lc(0xcfe6f4), 0.9);
  crBox(P, 3.2, 0, -5.3, 3.75, 0.7, -4.7, WHITE, 0.95); crBox(P, 3.2, 0.7, -5.3, 3.75, 0.74, -4.7, lc(0x6b4426), 0.9); crCyl(S, 3.45, 0.86, -5.0, 0.07, 0.24, 0.07, lc(0x8ec9e0), 0.2);
  [[0xff6b8a, 0], [0xffd166, 0.08], [0xff9f4a, -0.07]].forEach(([c, d], i) => crEll(S, 3.45 + d * 2, 1.06 + i * 0.03, -5.0 + d, 0.09, 0.09, 0.09, lc(c), 0.3));
  [[0xff6b6b, 3.2, 2.2], [0x7aa6ff, 3.45, 2.5], [0xffd166, 3.62, 2.3]].forEach(([c, x, y]) => { crEll(S, x, y, -5.0, 0.2, 0.24, 0.2, lc(c), 0.25); crObx(S, x - 0.04, (y + 0.74) / 2 - 0.12, -5.0, 0.008, y - 0.74, 0.008, lc(0xf4f4f4), 0, 0, 0, 0.06); });
  /* the mediator's chair, our chair, a trolley, a plant */
  crBox(S, -2.0, 0, -3.8, -1.2, 0.46, -3.0, lc(0x3a6b7a), 0.95); crBox(S, -2.0, 0.46, -3.85, -1.2, 1.1, -3.78, lc(0x3a6b7a), 0.9);
  crTable(P, -3.2, -0.2, -2.4, 0.5, lc(0xd0d4d8), STEEL, 0.8); crBox(S, -3.0, 0.8, 0.0, -2.6, 0.84, 0.35, lc(0xf2efe6)); crPlant(S, -3.3, -4.6, 1.0); crPlant(S, 3.3, 4.7, 1.1);
  crFinish(sc, S, P, E);
  crMakeJudge({ x: -1.6, z: -3.3, ry: 0.25, seat: 0.57, jacket: 0x59606e, shirt: 0xe8e8e8, tie: 0x2e6d5a, skin: 3, hair: 0, style: 'short', glasses: true, prop: 'clip' });
  crMakeLawyer({ x: 0.4, z: -1.3, jacket: 0x1a2235, tie: 0xb3202c });
  crMakeVictim({ x: 1.95, z: -4.3, ry: 0.0, seat: 0.82, jacket: 0xcfe0ee, pants: 0x7aa6c8, lean: 0.25, skin: 2, hair: 5, style: 'long' });
  crHandsInit(lc(0x1a2235));
  /* EKG sweep: spikes on its own about once a second, or when a quicktime pulses CR.pulse */
  const buf = new Float32Array(256).fill(64); let cur = 0, spike = -1, idle = 0, acc = 0;
  const shape = (u) => u < 0.15 ? Math.sin(u / 0.15 * Math.PI) * 0.1 : u < 0.35 ? 0 : u < 0.45 ? -0.12 * Math.sin((u - 0.35) / 0.1 * Math.PI) : u < 0.55 ? Math.sin((u - 0.45) / 0.1 * Math.PI) * 1.0 : u < 0.65 ? -0.3 * Math.sin((u - 0.55) / 0.1 * Math.PI) : u < 0.85 ? 0 : Math.sin((u - 0.85) / 0.15 * Math.PI) * 0.16;
  return {
    eye: new THREE.Vector3(0.3, 1.15, 3.7), expo: 1.15,
    focus: { ahead: [0.6, 1.25, -3, 58], judge: [-1.6, 1.2, -3.3, 32], lawyer: null, victim: [1.95, 1.2, -4.3, 30], jury: [-3.3, 1.6, -1.5, 60], table: [0, 0.8, 2.4, 66], bench: [0, 1.0, -3.4, 40], gavel: [-1.4, 0.8, -3.1, 36] },
    lay: { lawX0: 0.4, lawFree: 0.5, lawFreeAmp: [1.0, 0.5], lawRest: -0.6, lawRestAmp: [0.4, 0.2], lawZ: -1.3, lawZAmp: 0.3, victim: [1.95, -4.3], jury: [-3.3, -1.5], judge: [-1.6, -3.3] },
    extra: (dt, t) => {
      idle += dt; if (CR.pulse > 0) { CR.pulse = 0; if (spike < 0) spike = 0; idle = 0; } else if (idle > 1.0 && !CR.noIdlePulse) { idle = 0; if (spike < 0) spike = 0; }
      if (spike >= 0) { spike += dt / 0.55; if (spike > 1) spike = -1; }
      acc += dt * 95; while (acc >= 1) { acc -= 1; buf[cur] = 64 - (spike >= 0 ? shape(spike) * 46 : 0); cur = (cur + 1) % 256; }
      ec.fillStyle = '#031208'; ec.fillRect(0, 0, 256, 128); ec.strokeStyle = '#5dff9a'; ec.lineWidth = 3; ec.beginPath();
      for (let i = 0; i < 256; i++) { const y = buf[(cur + i) % 256]; if (i === 0) ec.moveTo(i, y); else ec.lineTo(i, y); }
      ec.stroke(); et.needsUpdate = true;
    }
  };
};
