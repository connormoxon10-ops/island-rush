/* ================= RACEWAY: textures and geometry =================
   Everything is static and merged into a handful of meshes: asphalt ribbon, paint, kerbs, barriers, buildings, props and the lamp glows.
   The ribbons are offset from the centreline with a mitred per-sample normal so they stay continuous round the corners. */
const TM = {};
function trackTextures() {
  const rnd = mulberry32(61);
  { const S = 256, c = mkCanvas(S, S), g = c.getContext('2d');
    g.fillStyle = '#3d3f44'; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 5200; i++) { const v = 52 + rnd() * 52 | 0; g.fillStyle = `rgba(${v},${v},${v + 4},${0.2 + rnd() * 0.3})`; g.fillRect(rnd() * S, rnd() * S, 1 + rnd() * 2, 1 + rnd() * 2); }
    for (const x of [0.3, 0.7]) { g.fillStyle = 'rgba(10,10,12,0.16)'; g.fillRect(S * (x - 0.07), 0, S * 0.14, S); }
    for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(255,255,255,0.025)'; g.fillRect(rnd() * S, 0, 2 + rnd() * 5, S); }
    TM.asph = new THREE.MeshStandardMaterial({ map: canvasTex(c), vertexColors: true, roughness: 0.88, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  }
  TM.line = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 });
  TM.kerb = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -5 });
  { const W = 1024, H = 64, c = mkCanvas(W, H), g = c.getContext('2d');
    const P = [['#d8232f', 'RUSH'], ['#f4f4f0', 'NITRO'], ['#1f5fbf', 'KESTREL'], ['#f2b632', 'PHANTOM']];
    for (let i = 0; i < 4; i++) {
      const x = i * 256; g.fillStyle = P[i][0]; g.fillRect(x, 0, 256, 46); g.fillStyle = '#d9d9d2'; g.fillRect(x, 46, 256, 18);
      g.font = '800 34px Rajdhani, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = (P[i][0] === '#f4f4f0' || P[i][0] === '#f2b632') ? '#14161a' : '#fff'; g.fillText(P[i][1], x + 128, 25);
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x + 254, 0, 2, 64);
    }
    TM.wall = new THREE.MeshStandardMaterial({ map: canvasTex(c), vertexColors: true, roughness: 0.75 });
  }
  TM.conc = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
  { const W = 256, H = 64, c = mkCanvas(W, H), g = c.getContext('2d'); g.fillStyle = '#23262c'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 1500; i++) { const hh = rnd(); g.fillStyle = `hsl(${(hh * 360) | 0},${50 + rnd() * 40}%,${40 + rnd() * 30}%)`; g.fillRect(rnd() * W, rnd() * H, 2, 2.6); }
    TM.crowd = new THREE.MeshStandardMaterial({ map: canvasTex(c), vertexColors: true, roughness: 0.95 });
  }
  { const W = 768, H = 128, c = mkCanvas(W, H), g = c.getContext('2d'); g.fillStyle = '#cfd2d4'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 6; i++) { const x = 12 + i * 126; g.fillStyle = '#e8eaeb'; g.fillRect(x, 26, 104, 96); for (let k = 0; k < 14; k++) { g.fillStyle = k & 1 ? '#b9bdc0' : '#cdd0d2'; g.fillRect(x, 26 + k * 7, 104, 4); } g.fillStyle = '#d8232f'; g.fillRect(x, 14, 104, 9); g.fillStyle = '#14161a'; g.font = '800 11px Rajdhani, Arial'; g.textAlign = 'center'; g.fillText('PIT ' + (i + 1), x + 52, 21); }
    TM.pit = new THREE.MeshStandardMaterial({ map: canvasTex(c), vertexColors: true, roughness: 0.7 });
  }
  { const W = 1024, H = 128, c = mkCanvas(W, H), g = c.getContext('2d'); g.fillStyle = '#11151c'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < W / 16; i++) for (let j = 0; j < 2; j++) { g.fillStyle = (i + j) & 1 ? '#f4f4f0' : '#15171c'; g.fillRect(i * 16, j * 16, 16, 16); g.fillRect(i * 16, H - 32 + j * 16, 16, 16); }
    g.fillStyle = '#ff3b3b'; g.fillRect(0, 40, W, 6); g.fillRect(0, 82, W, 6);
    g.font = '800 70px Rajdhani, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText(Track.name.toUpperCase(), W / 2, 66);
    TM.banner = new THREE.MeshBasicMaterial({ map: canvasTex(c, true, false), side: THREE.DoubleSide });
  }
  { const W = 512, H = 96, c = mkCanvas(W, H), g = c.getContext('2d'); g.fillStyle = '#10161f'; g.fillRect(0, 0, W, H); g.fillStyle = '#ff4d5e'; g.fillRect(0, 0, W, 8); g.fillRect(0, H - 8, W, 8);
    g.font = '800 54px Rajdhani, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText('RACE OFFICE', W / 2, 50);
    TM.office = new THREE.MeshBasicMaterial({ map: canvasTex(c, true, false) });
  }
  TM.glass = new THREE.MeshStandardMaterial({ color: lc(0x24323f), roughness: 0.15, metalness: 0.6 });
  TM.glowPts = (size, op) => new THREE.PointsMaterial({ size, map: MAT.glow, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, opacity: op, fog: false });
}

Track.build = function () {
  const A = Track.s; if (!A || Track.built) return; Track.built = true;
  trackTextures();
  const cx = A.cx, cz = A.cz, Y = A.H0, n = Track.n, L = Track.L, px = Track.px, pz = Track.pz, nx = Track.nx, nz = Track.nz, cum = Track.cum;
  const grp = new THREE.Group(); Track.group = grp; scene.add(grp);
  const add = (gb, mat, cast, recv) => { if (!gb.count) return null; const m = gb.mesh(mat, cast, recv); m.matrixAutoUpdate = false; grp.add(m); return m; };
  const K = (h) => lc(h), X = (u) => cx + u, Z = (v) => cz + v;
  /* mitred vertex normals */
  const vx = new Float32Array(n), vz = new Float32Array(n);
  for (let i = 0; i < n; i++) { const a = (i + n - 1) % n; let ax = nx[a] + nx[i], az = nz[a] + nz[i]; const l = Math.hypot(ax, az) || 1; ax /= l; az /= l; const d = ax * nx[i] + az * nz[i]; vx[i] = ax / Math.max(0.6, d); vz[i] = az / Math.max(0.6, d); }
  const P = (i, off, y, o) => { o[0] = px[i % n] + vx[i % n] * off; o[1] = y; o[2] = pz[i % n] + vz[i % n] * off; return o; };
  const _a = [0, 0, 0, 0, 0], _b = [0, 0, 0, 0, 0], _c = [0, 0, 0, 0, 0], _d = [0, 0, 0, 0, 0];
  /* flat ribbon between two lateral offsets; uvT = metres per texture repeat along the track; sel(i) false skips a sample; col(i) -> colour */
  const ribbon = (gb, o0, o1, y, uvT, col, sel) => {
    for (let i = 0; i < n; i++) {
      if (sel && !sel(i)) continue; const j = i + 1, c0 = col(i), s0 = cum[i] / uvT, s1 = (i === n - 1 ? L : cum[j]) / uvT;
      P(i, o0, y, _a); P(j, o0, y, _b); P(j, o1, y, _c); P(i, o1, y, _d); _a[3] = 0; _a[4] = s0; _b[3] = 0; _b[4] = s1; _c[3] = 1; _c[4] = s1; _d[3] = 1; _d[4] = s0;
      gb.quadA(_a.slice(), _b.slice(), _c.slice(), _d.slice(), 0, 1, 0, c0.r, c0.g, c0.b);
    }
  };
  /* vertical face along one side (lateral offset o, bottom y0, top y1), normal facing the centreline */
  const wallFace = (gb, o, y0, y1, uvT, col, sel, sg) => {
    for (let i = 0; i < n; i++) {
      if (sel && !sel(i)) continue; const j = i + 1, c0 = col(i), s0 = cum[i] / uvT, s1 = (i === n - 1 ? L : cum[j]) / uvT;
      P(i, o, y0, _a); P(j, o, y0, _b); P(j, o, y1, _c); P(i, o, y1, _d); _a[3] = s0; _a[4] = 0; _b[3] = s1; _b[4] = 0; _c[3] = s1; _c[4] = 1; _d[3] = s0; _d[4] = 1;
      gb.quadA(_a.slice(), _b.slice(), _c.slice(), _d.slice(), nx[i] * -sg, 0, nz[i] * -sg, c0.r, c0.g, c0.b);
    }
  };
  const wh = K(0xf1f1ec), rd = K(0xd23030), blk = K(0x14161a), one = K(0xffffff);
  /* ---- asphalt ---- */
  const gbA = new GB(0, 0, true), gbLn = new GB(0, 0, false), gbK = new GB(0, 0, false), gbCo = new GB(0, 0, true), gbW = new GB(0, 0, true), gbWc = new GB(0, 0, false);
  ribbon(gbA, -TRK.HW, TRK.HW, Y + 0.07, 14, () => one);
  for (const sg of [-1, 1]) ribbon(gbLn, sg * (TRK.HW - 0.65), sg * (TRK.HW - 0.35), Y + 0.075, 10, () => wh);
  /* kerbs in the bends, plain white edge on the straights */
  const kc = (i) => Math.abs(Track.k[i]) > 1 / 320 || Math.abs(Track.k[(i + 1) % n]) > 1 / 320 || Math.abs(Track.k[(i + n - 1) % n]) > 1 / 320;
  for (const sg of [-1, 1]) ribbon(gbK, sg === 1 ? TRK.HW - 0.35 : -TRK.HW - TRK.KERB, sg === 1 ? TRK.HW + TRK.KERB : -TRK.HW + 0.35, Y + 0.085, 10, (i) => (i >> 1) & 1 ? rd : wh, kc);
  /* start / finish: chequer line, grid boxes */
  { const seg = (s) => Track.at(s, 0, {});
    for (let r = 0; r < 2; r++) for (let q = 0; q < 17; q++) {
      const s0 = seg(r * 1.0 - 1.0), o0 = -TRK.HW + q * 1.0, o1 = o0 + 1.0, col = ((q + r) & 1) ? blk : wh, i = s0.i, y = Y + 0.09;
      const a = [s0.x + nx[i] * o0, y, s0.z + nz[i] * o0, 0, 0], b = [s0.x + nx[i] * o1, y, s0.z + nz[i] * o1, 0, 0], c2 = [b[0] + s0.tx * 1.0, y, b[2] + s0.tz * 1.0, 0, 0], d2 = [a[0] + s0.tx * 1.0, y, a[2] + s0.tz * 1.0, 0, 0];
      gbLn.quadA(a, b, c2, d2, 0, 1, 0, col.r, col.g, col.b);
    }
    for (let k = 0; k < 14; k++) {
      const sl = Track.slot(k, {}); const t = [sl.tx, sl.tz], nn = [nx[sl.i], nz[sl.i]];
      const box = (a0, a1, b0, b1) => { const q = (u, v) => [sl.x + t[0] * u + nn[0] * v, Y + 0.09, sl.z + t[1] * u + nn[1] * v, 0, 0]; gbLn.quadA(q(a0, b0), q(a1, b0), q(a1, b1), q(a0, b1), 0, 1, 0, wh.r, wh.g, wh.b); };
      box(-2.9, -2.8, -1.25, 1.25); box(-2.9, -1.6, -1.25, -1.15); box(-2.9, -1.6, 1.15, 1.25);
    }
  }
  /* paddock car park and the connector road */
  { const t = 8, fq = (r, dy) => { const a = (u, v) => [X(u), Y + dy, Z(v), X(u) / t, Z(v) / t]; gbCo.quadA(a(r[0], r[2]), a(r[1], r[2]), a(r[1], r[3]), a(r[0], r[3]), 0, 1, 0, 1, 1, 1); };
    fq(TRK.LOT, 0.07); fq(TRK.CONN, 0.07);
    const yl = (u0, u1, v0, v1) => { const a = (u, v) => [X(u), Y + 0.09, Z(v), 0, 0]; gbLn.quadA(a(u0, v0), a(u1, v0), a(u1, v1), a(u0, v1), 0, 1, 0, wh.r, wh.g, wh.b); };
    for (let u = TRK.LOT[0] + 6; u <= TRK.LOT[1] - 6; u += 3) { if (u > -204 && u < -150) continue; yl(u - 0.08, u + 0.08, 203, 210); yl(u - 0.08, u + 0.08, 258, 265); }
    yl(TRK.LOT[0] + 6, TRK.LOT[1] - 6, 202.9, 203.05); yl(TRK.LOT[0] + 6, TRK.LOT[1] - 6, 264.95, 265.1);
  }
  /* ---- barriers: concrete wall with ad boards on the track face, open at the paddock gate ---- */
  const hgt = 1.15, gate = (i) => !(cum[i] > Track.gap0 - 4 && cum[i] < Track.gap1);
  for (const sg of [-1, 1]) {
    const o = sg * (TRK.WALL - 0.3), sel = sg === -1 ? gate : null;
    wallFace(gbW, o, Y, Y + hgt, 24, () => one, sel, sg);
    ribbon(gbWc, sg * (TRK.WALL - 0.3), sg * (TRK.WALL + 0.4), Y + hgt, 10, () => K(0xcfcfc8), sel);
    wallFace(gbWc, sg * (TRK.WALL + 0.4), Y, Y + hgt, 10, () => K(0x9a9a94), sel, -sg);
  }
  add(gbA, TM.asph, false, true); add(gbLn, TM.line, false, true); add(gbK, TM.kerb, false, true); add(gbCo, TM.asph, false, true);
  add(gbW, TM.wall, true, true); add(gbWc, TM.conc, true, true);
  /* ---- buildings ---- */
  const gbB = new GB(0, 0, false), gbG = new GB(0, 0, true), gbS = new GB(0, 0, true), gbT = new GB(0, 0, false), gbPit = new GB(0, 0, true);
  const slab = (gb, u0, u1, v0, v1, y0, y1, c) => gb.box(X(u0), Y + y0, Z(v0), X(u1), Y + y1, Z(v1), c.r, c.g, c.b);
  const gry = K(0x8a8f95), lgr = K(0xc9ccd0), dgr = K(0x2d3036), red = K(0xc92c35);
  /* grandstand: ten stepped tiers facing the circuit, crowd on the risers, a roof on posts */
  { const u0 = -34, u1 = 156, v0 = 193, T = 10, dp = 2.6, rz = 0.88, sw = 0.95;
    for (let t = 0; t < T; t++) {
      const va = v0 + t * dp, vb = va + dp, ya = 0.0 + t * rz, yb = (t + 1) * rz + 0.1;
      /* riser (faces the track, -z) with the crowd texture */
      gbG.quadA([X(u0), Y + ya, Z(va), 0, 0], [X(u1), Y + ya, Z(va), (u1 - u0) / 7, 0], [X(u1), Y + yb, Z(va), (u1 - u0) / 7, 1], [X(u0), Y + yb, Z(va), 0, 1], 0, 0, -1, 0.95, 0.95, 0.95);
      /* tread: alternating seat blocks */
      for (let u = u0; u < u1; u += 4.75) { const c = ((u - u0) / 4.75 | 0) % 2 ? red : K(0x1f4f99); gbB.box(X(u + 0.2), Y + yb - 0.1, Z(va + 0.7), X(Math.min(u + 4.55, u1)), Y + yb + 0.04, Z(vb - 0.2), c.r, c.g, c.b); }
      gbB.box(X(u0), Y + ya, Z(va), X(u1), Y + yb - 0.1, Z(vb), lgr.r * 0.9, lgr.g * 0.9, lgr.b * 0.9);
    }
    const yTop = T * rz + 0.1, vEnd = v0 + T * dp;
    gbB.box(X(u0 - 0.4), Y, Z(vEnd), X(u1 + 0.4), Y + yTop + 2.6, Z(vEnd + 0.7), gry.r, gry.g, gry.b);                 /* back wall */
    for (const uu of [u0 - 0.4, u1 - 0.1]) gbB.box(X(uu), Y, Z(v0), X(uu + 0.5), Y + yTop, Z(vEnd), gry.r * 0.9, gry.g * 0.9, gry.b * 0.9);   /* ends */
    slab(gbB, u0 - 3, u1 + 3, v0 - 1, vEnd + 1.4, yTop + 2.6, yTop + 3.0, lgr);                                             /* roof */
    slab(gbB, u0 - 3, u1 + 3, v0 - 1.1, v0 - 0.7, yTop + 1.2, yTop + 3.0, red);                                              /* fascia */
    for (let u = u0; u <= u1; u += 19) { slab(gbB, u - 0.2, u + 0.2, v0 + 1.2, v0 + 1.6, 0, yTop + 2.6, dgr); slab(gbB, u - 0.15, u + 0.15, v0 + 12, v0 + 12.3, T * rz * 0.5, yTop + 2.6, dgr); }
    slab(gbB, u0, u1, v0 - 0.6, v0 - 0.45, 0, 1.0, lgr);                                                                     /* front rail */
  }
  add(gbG, TM.crowd, false, true);
  /* pit building: garages facing the circuit, race-control tower on top */
  { const u0 = -72, u1 = 168, v0 = 140, v1 = 152, h = 5.2;
    gbPit.wall(X(u1), Z(v1), X(u0), Z(v1), Y, Y + h, 0, 1, 1, 1, 1, 0, (u1 - u0) / 76, 0, 1);
    gbB.box(X(u0), Y + h, Z(v0), X(u1), Y + h + 0.5, Z(v1 + 0.9), lgr.r, lgr.g, lgr.b);
    for (const [a, b, c2, d] of [[u1, v1, u1, v0], [u0, v0, u0, v1], [u1, v0, u0, v0]]) gbB.box(Math.min(X(a), X(c2)) - 0.01, Y, Math.min(Z(b), Z(d)) - 0.01, Math.max(X(a), X(c2)) + 0.01, Y + h, Math.max(Z(b), Z(d)) + 0.01, 0.8, 0.8, 0.8);
    slab(gbB, 34, 52, 140, 152, h + 0.5, h + 7.3, K(0xe6e7e4)); slab(gbB, 32, 54, 138.5, 153.5, h + 7.3, h + 7.8, gry);
    gbT.box(X(34.3), Y + h + 3.2, Z(152.01), X(51.7), Y + h + 5.6, Z(152.12), 0.04, 0.07, 0.1); slab(gbB, 36, 50, 154, 154.4, h + 7.8, h + 8.2, dgr);
    slab(gbB, 42.8, 43.2, 144, 144.4, h + 7.8, h + 14, gry);
  }
  add(gbPit, TM.pit, true, true); add(gbT, TM.glass, false, true);
  /* race office + hospitality + gantry legs + lamp posts */
  slab(gbB, -252, -222, 238, 262, 0, 5, K(0xe9eaec)); slab(gbB, -254, -220, 236, 264, 5, 5.5, red); slab(gbB, -122, -98, 214, 252, 0, 4.2, K(0xd9dcdf)); slab(gbB, -124, -96, 212, 254, 4.2, 4.6, gry);
  for (const sv of [-1, 1]) slab(gbB, -0.55, 0.55, 172 + sv * 11.6 - 0.55, 172 + sv * 11.6 + 0.55, 0, 8.2, K(0xd7d9dc));
  slab(gbB, -0.8, 0.8, 172 - 12.4, 172 + 12.4, 7.2, 8.5, K(0xd7d9dc));
  const officeSign = new THREE.Mesh(new THREE.PlaneGeometry(14, 2.6), TM.office); officeSign.position.set(X(-222 + 0.1), Y + 6.9, Z(250)); officeSign.rotation.y = Math.PI / 2; grp.add(officeSign);
  const g2 = new THREE.Mesh(new THREE.PlaneGeometry(22, 2.9), TM.banner); g2.position.set(X(-0.85), Y + 10.2, Z(172)); g2.rotation.y = -Math.PI / 2; grp.add(g2);
  const g3 = new THREE.Mesh(g2.geometry, TM.banner); g3.position.set(X(0.85), Y + 10.2, Z(172)); g3.rotation.y = Math.PI / 2; grp.add(g3);
  slab(gbB, -0.3, 0.3, 172 - 11.2, 172 - 10.6, 8.5, 11.8, dgr); slab(gbB, -0.3, 0.3, 172 + 10.6, 172 + 11.2, 8.5, 11.8, dgr);
  /* lamp posts on the outside of the circuit */
  const lampP = [], lampC = [];
  for (let s = 20; s < L; s += 64) {
    const q = Track.at(s, -(TRK.WALL + 2.6), {}); if (s > Track.gap0 - 30 && s < Track.gap1 + 30) continue; if (q.x > cx - 40 && q.x < cx + 170 && q.z > cz + 180) continue;
    slab(gbB, q.x - cx - 0.15, q.x - cx + 0.15, q.z - cz - 0.15, q.z - cz + 0.15, 0, 10.5, dgr);
    lampP.push(q.x, Y + 10.9, q.z); lampC.push(1, 0.93, 0.78);
  }
  for (let u = -30; u <= 150; u += 30) { lampP.push(X(u), Y + 14.4, Z(194)); lampC.push(1, 0.93, 0.78); }
  add(gbB, TM.conc, true, true);
  { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(lampP, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(lampC, 3)); geo.computeBoundingSphere();
    Track.lamps = new THREE.Points(geo, TM.glowPts(3.4, 0.2)); Track.lamps.frustumCulled = false; Track.lamps.renderOrder = 4; grp.add(Track.lamps); }
  /* starting lights on the gantry, facing the grid */
  Track.light = [];
  for (let k = 0; k < 5; k++) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(0.62, 18), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.05, 0.01, 0.01), fog: false }));
    m.position.set(X(-0.88), Y + 7.7, Z(172 + (k - 2) * 3.0)); m.rotation.y = -Math.PI / 2; grp.add(m); Track.light.push(m);
    const hb = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.2, 14), new THREE.MeshStandardMaterial({ color: 0x111317, roughness: 0.6 })); hb.rotation.z = Math.PI / 2; hb.position.set(X(-0.78), Y + 7.7, Z(172 + (k - 2) * 3.0)); grp.add(hb);
  }
  /* race-office marker (beam, ring, icon) */
  { const mg = new THREE.Group(), ox = Track.officeX, oz = Track.officeZ; mg.position.set(ox, Y + 0.1, oz);
    const ring = new THREE.Mesh(new THREE.RingGeometry(2.7, 3.2, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff4d5e').convertSRGBToLinear().multiplyScalar(2.2), side: THREE.DoubleSide, transparent: true, opacity: 0.9, depthWrite: false, fog: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.12; mg.add(ring);
    const beam = makeBeam('#ff4d5e', 1.9, 150); mg.add(beam); const spr = iconSprite('🏁', '#ff4d5e'); spr.position.y = 11; mg.add(spr);
    grp.add(mg); Track.mk = { g: mg, beam, spr, ring, x: ox, z: oz }; }
  Track.setLights(0, false); Track.tick(0.016, true);
};
/* starting lights: n red lamps lit (0-5); green = all lamps green */
Track.setLights = function (n, green) {
  for (let k = 0; k < Track.light.length; k++) { const c = Track.light[k].material.color; if (green) c.setRGB(0.2, 3, 0.45); else if (k < n) c.setRGB(3.6, 0.08, 0.06); else c.setRGB(0.05, 0.012, 0.012); }
  Track.lit = green ? 6 : n;
};
Track.tick = function (dt, force) {
  if (!Track.built) return; const A = Track.s, lamp = env.lampOn;
  const far = Math.hypot(Pl.x - A.cx, Pl.z - A.cz) > 2400; Track.group.visible = !far; if (far && !force) return;
  Track.lamps.material.opacity = 0.2 + 0.9 * lamp; Track.lamps.material.size = 2.6 + 4 * lamp;
  const m = Track.mk, d = Math.hypot(m.x - Pl.x, m.z - Pl.z), on = !Race.on && !Mi && !(Fly.on && Fly.agl > 120);
  m.g.visible = on && d < 900; if (!m.g.visible) return;
  m.beam.material.opacity = lerp(0.03, 0.75, sstep(12, 260, d)); const k = clamp(d / 60, 4, 18); m.spr.scale.setScalar(k); m.spr.position.y = 9 + k * 0.5; m.ring.scale.setScalar(1 + Math.sin(App.time * 3) * 0.04);
};
