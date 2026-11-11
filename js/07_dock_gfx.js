/* ================= MARINA: textures and geometry =================
   Static meshes merged per material: concrete quay, timber pier and fingers on piles, boathouse, storage shed, fuel pumps and canopy,
   sign gantry, lamps, parked cars, a flagpole on the T-head. All drawn in marina-local coordinates (a along the shore, s out to sea). */
const DM = {};
function dockTextures() {
  const rnd = mulberry32(61);
  { const S = 256, c = mkCanvas(S, S), g = c.getContext('2d');
    g.fillStyle = '#8d8c85'; g.fillRect(0, 0, S, S);
    for (let q = 0; q < 4; q++) { const k = 128 + rnd() * 18 | 0; g.fillStyle = `rgb(${k},${k},${k - 4})`; g.fillRect((q & 1) * 128, (q >> 1) * 128, 128, 128); }
    for (let i = 0; i < 2600; i++) { const v = 105 + rnd() * 60 | 0; g.fillStyle = `rgba(${v},${v},${v - 5},0.3)`; g.fillRect(rnd() * S, rnd() * S, 1 + rnd() * 3, 1 + rnd() * 3); }
    for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(40,36,30,0.10)'; g.beginPath(); g.ellipse(rnd() * S, rnd() * S, 8 + rnd() * 18, 4 + rnd() * 8, rnd() * 3, 0, TAU); g.fill(); }
    g.fillStyle = 'rgba(40,40,40,0.55)'; g.fillRect(0, 0, S, 2); g.fillRect(0, 0, 2, S); g.fillRect(0, 127, S, 2); g.fillRect(127, 0, 2, S);
    DM.con = new THREE.MeshStandardMaterial({ map: canvasTex(c), vertexColors: true, roughness: 0.93, metalness: 0 });
  }
  { const S = 256, c = mkCanvas(S, S), g = c.getContext('2d'), n = 8, h = S / n;
    for (let i = 0; i < n; i++) {
      const k = 118 + rnd() * 34 | 0; g.fillStyle = `rgb(${k + 14},${k - 4},${k - 34})`; g.fillRect(0, i * h, S, h);
      for (let j = 0; j < 120; j++) { const v = rnd() * 40 | 0; g.fillStyle = `rgba(${40 + v},${28 + v * 0.7},${14 + v * 0.4},0.16)`; g.fillRect(rnd() * S, i * h + rnd() * h, 6 + rnd() * 40, 1); }
      g.fillStyle = 'rgba(20,14,8,0.78)'; g.fillRect(0, i * h, S, 2.5); g.fillStyle = 'rgba(255,240,210,0.07)'; g.fillRect(0, i * h + 3, S, 2);
      const sx = rnd() * S; g.fillStyle = 'rgba(20,14,8,0.35)'; g.fillRect(sx, i * h, 1.5, h);
      g.fillStyle = 'rgba(50,50,52,0.7)'; g.fillRect(18, i * h + h / 2 - 1, 3, 3); g.fillRect(S - 20, i * h + h / 2 - 1, 3, 3);
    }
    DM.deck = new THREE.MeshStandardMaterial({ map: canvasTex(c), vertexColors: true, roughness: 0.88, metalness: 0 });
  }
  /* boathouse wall: one 4 m x 4.6 m panel of white clapboard with a window, lit at night */
  { const W = 256, H = 256, c = mkCanvas(W, H), g = c.getContext('2d'), ce = mkCanvas(W, H), ge = ce.getContext('2d');
    g.fillStyle = '#ece8de'; g.fillRect(0, 0, W, H); ge.fillStyle = '#000'; ge.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 12) { g.fillStyle = 'rgba(70,64,52,0.20)'; g.fillRect(0, y, W, 2); g.fillStyle = 'rgba(255,255,255,0.28)'; g.fillRect(0, y + 2, W, 2); }
    for (let i = 0; i < 700; i++) { const v = 150 + rnd() * 80 | 0; g.fillStyle = `rgba(${v},${v - 4},${v - 14},0.10)`; g.fillRect(rnd() * W, rnd() * H, 2 + rnd() * 10, 1); }
    g.fillStyle = 'rgba(60,70,84,0.55)'; g.fillRect(0, H - 34, W, 34);
    const x = 70, y = 70, w = 116, hh = 104; g.fillStyle = '#2b3a46'; g.fillRect(x - 8, y - 8, w + 16, hh + 16);
    const gr = g.createLinearGradient(0, y, 0, y + hh); gr.addColorStop(0, '#9dc0d8'); gr.addColorStop(0.5, '#46667d'); gr.addColorStop(1, '#1d2e3d'); g.fillStyle = gr; g.fillRect(x, y, w, hh);
    g.fillStyle = 'rgba(255,255,255,0.15)'; g.beginPath(); g.moveTo(x, y + hh * 0.7); g.lineTo(x + w * 0.55, y); g.lineTo(x + w * 0.78, y); g.lineTo(x, y + hh * 0.95); g.fill();
    g.fillStyle = '#ece8de'; g.fillRect(x + w / 2 - 2, y, 4, hh); g.fillRect(x, y + hh / 2 - 2, w, 4);
    ge.fillStyle = 'rgb(255,214,140)'; ge.fillRect(x, y, w, hh);
    DM.wall = new THREE.MeshStandardMaterial({ map: canvasTex(c), vertexColors: true, emissive: new THREE.Color(1, 1, 1), emissiveMap: canvasTex(ce), emissiveIntensity: 0, roughness: 0.82, metalness: 0 });
  }
  { const S = 256, c = mkCanvas(S, S), g = c.getContext('2d');
    g.fillStyle = '#b8c3cc'; g.fillRect(0, 0, S, S);
    for (let x = 0; x < S; x += 16) { const gr = g.createLinearGradient(x, 0, x + 16, 0); gr.addColorStop(0, 'rgba(0,0,0,0.20)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.20)'); gr.addColorStop(1, 'rgba(0,0,0,0.12)'); g.fillStyle = gr; g.fillRect(x, 0, 16, S); }
    for (let i = 0; i < 160; i++) { g.fillStyle = 'rgba(90,60,40,0.07)'; g.fillRect(rnd() * S, rnd() * S, 1 + rnd() * 2, 8 + rnd() * 40); }
    g.fillStyle = 'rgba(20,30,40,0.35)'; g.fillRect(0, S - 22, S, 22);
    DM.metal = new THREE.MeshStandardMaterial({ map: canvasTex(c), vertexColors: true, roughness: 0.6, metalness: 0.06 });
  }
  const sign = (W, H, f, draw) => { const c = mkCanvas(W, H), g = c.getContext('2d'); g.fillStyle = '#0e3a5c'; g.fillRect(0, 0, W, H); g.fillStyle = '#f2b632'; g.fillRect(0, 0, W, H * 0.06); g.fillRect(0, H * 0.94, W, H * 0.06); draw(g, W, H); return new THREE.MeshBasicMaterial({ map: canvasTex(c, true, false), side: THREE.DoubleSide }); };
  const anchor = (g, x, y, r) => { g.save(); g.strokeStyle = '#fff'; g.lineWidth = r * 0.16; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y - r * 0.62); g.lineTo(x, y + r * 0.7); g.moveTo(x - r * 0.34, y - r * 0.3); g.lineTo(x + r * 0.34, y - r * 0.3); g.moveTo(x - r * 0.72, y + r * 0.2); g.quadraticCurveTo(x - r * 0.6, y + r * 0.78, x, y + r * 0.78); g.quadraticCurveTo(x + r * 0.6, y + r * 0.78, x + r * 0.72, y + r * 0.2); g.stroke(); g.beginPath(); g.arc(x, y - r * 0.76, r * 0.14, 0, TAU); g.stroke(); g.restore(); };
  DM.sign = sign(1024, 160, 0, (g, W, H) => { anchor(g, 80, H / 2, 46); anchor(g, W - 80, H / 2, 46); const txt = Dock.name.toUpperCase(); let fs = 84; g.font = '700 ' + fs + 'px Rajdhani, Arial, sans-serif'; while (fs > 36 && g.measureText(txt).width > W - 300) { fs -= 2; g.font = '700 ' + fs + 'px Rajdhani, Arial, sans-serif'; } g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText(txt, W / 2, H / 2 + 5); });
  DM.sign2 = sign(1024, 160, 0, (g, W, H) => { g.font = '700 70px Rajdhani, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText('BOAT SALES', W / 2, H * 0.37); g.font = '700 44px Rajdhani, Arial, sans-serif'; g.fillStyle = '#ffd36a'; g.fillText('SLIPS  ·  FUEL  ·  CHANDLERY', W / 2, H * 0.74); });
  { const c = mkCanvas(256, 150), g = c.getContext('2d'); g.fillStyle = '#0e5fa8'; g.fillRect(0, 0, 256, 150); g.fillStyle = '#f2b632'; g.fillRect(0, 118, 256, 14); anchor(g, 128, 62, 52); DM.flag = new THREE.MeshStandardMaterial({ map: canvasTex(c, true, false), side: THREE.DoubleSide, roughness: 0.9 }); }
  DM.lineM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  DM.glow = (size, op) => new THREE.PointsMaterial({ size, map: MAT.glow, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, opacity: op, fog: false });
}

Dock.build = function () {
  const D = Dock.s; if (!D || Dock.built) return; Dock.built = true;
  dockTextures();
  const M = MARINA, Y = M.DY, grp = new THREE.Group(); Dock.group = grp; scene.add(grp);
  const add = (gb, mat, cast, recv) => { if (!gb.count) return null; const m = gb.mesh(mat, cast, recv); m.matrixAutoUpdate = false; grp.add(m); return m; };
  const K = (h) => lc(h), W = { x: 0, z: 0 };
  const gbCon = new GB(0, 0, true), gbDeck = new GB(0, 0, true), gbWall = new GB(0, 0, true), gbMet = new GB(0, 0, true), gbP = new GB(0, 0, false), gbLn = new GB(0, 0, false), gbL = new GB(0, 0, false);
  const nrm = (na, ns, ny) => [na * D.Ax + ns * D.Sx, ny, na * D.Az + ns * D.Sz];
  const V = (a, s, y, u, v) => { Dock.toWorld(a, s, W); return [W.x, y, W.z, u || 0, v || 0]; };
  /* horizontal quad over a local rectangle; uv in metres / t, optionally swapped so planks run along s */
  const top = (gb, a0, a1, s0, s1, y, col, t, swap) => {
    const k = t ? 1 / t : 0, uv = (a, s) => (swap ? [s * k, a * k] : [a * k, s * k]);
    const q = (a, s) => { const u = uv(a, s); return V(a, s, y, u[0], u[1]); };
    gb.quadA(q(a0, s0), q(a1, s0), q(a1, s1), q(a0, s1), 0, 1, 0, col.r, col.g, col.b);
  };
  const lbox = (gb, a0, a1, s0, s1, y0, y1, col) => { const r = Dock.rect(a0, a1, s0, s1); gb.box(r[0], y0, r[1], r[2], y1, r[3], col.r, col.g, col.b); };
  /* vertical wall between two local points; (nA, nS) is its outward normal in local terms */
  const lwall = (gb, a0, s0, a1, s1, y0, y1, nA, nS, col, tw, th, v0) => {
    Dock.toWorld(a0, s0, W); const ax = W.x, az = W.z; Dock.toWorld(a1, s1, W); const bx = W.x, bz = W.z, n = nrm(nA, nS, 0), len = Math.hypot(a1 - a0, s1 - s0);
    gb.wall(ax, az, bx, bz, y0, y1, n[0], n[2], col.r, col.g, col.b, 0, len / tw, v0 || 0, (v0 || 0) + (y1 - y0) / th);
  };
  const ltri = (gb, A, B, C, n, col) => gb.triA(A, B, C, n[0], n[1], n[2], col.r, col.g, col.b);
  const lquad = (gb, A, B, C, Dd, n, col) => gb.quadA(A, B, C, Dd, n[0], n[1], n[2], col.r, col.g, col.b);
  const white = K(0xffffff), concrete = K(0xffffff), timber = K(0xffffff);

  /* ---- quay slab: textured top, plain sides, seawall down into the basin ---- */
  { const S = M.SLAB; top(gbCon, S[0], S[1], S[2], S[3], Y, concrete, 4);
    lbox(gbP, S[0], S[1], S[2], S[3], -3.6, Y - 0.03, K(0x7c7b74));
    lbox(gbP, S[0] - 0.4, S[1] + 0.4, S[3] - 0.5, S[3] + 0.35, Y - 1.6, Y + 0.05, K(0x6a6963));                       /* capping beam along the quay edge */
    lbox(gbP, S[0], S[1], S[3] + 0.3, S[3] + 0.6, 0.15, 0.55, K(0x1f2226));                                         /* black rubbing strake */
  }
  /* ---- pier, T-head, fingers: planks on a dark timber frame, standing on piles ---- */
  const pile = (a, s, y1) => { const g = ni(new THREE.CylinderGeometry(0.2, 0.25, y1 + 3.6, 7)); Dock.toWorld(a, s, W); _m4.compose(_p3.set(W.x, (y1 - 3.6) / 2, W.z), _q.identity(), _s3.set(1, 1, 1)); gbP.geo(g, _m4, K(0x3a2f26), 0); };
  for (const d of Dock.decks) {
    if (d === M.SLAB || d === Dock.decks[0]) continue;
    const swap = (d[1] - d[0]) > (d[3] - d[2]);   /* long in a: planks run across it, i.e. along s */
    top(gbDeck, d[0], d[1], d[2], d[3], Y, timber, 2, swap);
    lbox(gbP, d[0], d[1], d[2], d[3], Y - 0.42, Y - 0.04, K(0x2f261e));
  }
  for (let s = 6; s <= 62; s += 8) for (const sd of [-1, 1]) pile(sd * 2.3, s, Y - 0.42);
  for (const f of M.FING) for (const sd of [-1, 1]) { pile(sd * (M.FA - 0.4), f, Y - 0.42); pile(sd * 11, f, Y - 0.42); }
  for (const a of [-12, -6, 0, 6, 12]) for (const s of [63, 66]) pile(a, s, Y - 0.42);
  for (let a = -56; a <= 56; a += 8) pile(a, 3.4, Y - 0.04);
  /* rails (solid footprint comes from the collider plan) and bollards */
  for (const r of D.rails) { if (r[4] > 0.6) { lbox(gbP, r[0], r[1], r[2], r[3], Y + 0.9, Y + 1.0, K(0xe8e8e2)); lbox(gbP, r[0], r[1], r[2], r[3], Y + 0.45, Y + 0.5, K(0xe8e8e2)); const L = Math.max(r[1] - r[0], r[3] - r[2]), n = Math.max(2, Math.round(L / 2.4)); for (let i = 0; i <= n; i++) { const a = r[0] + (r[1] - r[0]) * i / n, s = r[2] + (r[3] - r[2]) * i / n; lbox(gbP, a - 0.07, a + 0.07, s - 0.07, s + 0.07, Y, Y + 1.0, K(0xe8e8e2)); } } else lbox(gbP, r[0], r[1], r[2], r[3], Y, Y + 0.5, K(0xd9b44a)); }
  for (let a = -52; a <= 52; a += 8) { if (Math.abs(a) < 5) continue; const g = ni(new THREE.CylinderGeometry(0.17, 0.21, 0.5, 8)); Dock.toWorld(a, 2.3, W); _m4.compose(_p3.set(W.x, Y + 0.25, W.z), _q.identity(), _s3.set(1, 1, 1)); gbP.geo(g, _m4, K(0x2a2d31), 0); }
  for (const f of M.FING) for (const sd of [-1, 1]) for (const a of [sd * 3.6, sd * (M.FA - 0.6)]) { const g = ni(new THREE.CylinderGeometry(0.1, 0.13, 0.32, 8)); Dock.toWorld(a, f, W); _m4.compose(_p3.set(W.x, Y + 0.16, W.z), _q.identity(), _s3.set(1, 1, 1)); gbP.geo(g, _m4, K(0x2a2d31), 0); }

  /* ---- boathouse: clapboard walls, gable roof, door, plinth ---- */
  { const H = D.house, a0 = H[0], a1 = H[1], s0 = H[2], s1 = H[3], h = 4.6, rise = 1.9, sm = (s0 + s1) / 2, ov = 0.8, wc = K(0xf0ece2);
    lwall(gbWall, a1, s1, a1, s0, Y, Y + h, 1, 0, new THREE.Color(wc.r * 0.92, wc.g * 0.92, wc.b * 0.92), 4, h);
    lwall(gbWall, a0, s0, a0, s1, Y, Y + h, -1, 0, new THREE.Color(wc.r * 0.82, wc.g * 0.82, wc.b * 0.82), 4, h);
    lwall(gbWall, a0, s1, a1, s1, Y, Y + h, 0, 1, wc, 4, h);
    lwall(gbWall, a1, s0, a0, s0, Y, Y + h, 0, -1, new THREE.Color(wc.r * 0.88, wc.g * 0.88, wc.b * 0.88), 4, h);
    lbox(gbP, a0 - 0.15, a1 + 0.15, s0 - 0.15, s1 + 0.15, Y, Y + 0.5, K(0x6f7a84));
    const roof = K(0x3d4a58), roofD = new THREE.Color(roof.r * 0.8, roof.g * 0.8, roof.b * 0.8), len = Math.hypot(sm - s0 + ov, rise);
    const rA = a0 - ov, rB = a1 + ov, e0 = s0 - ov, e1 = s1 + ov, yT = Y + h, yR = Y + h + rise + 0.2;
    lquad(gbP, V(rA, e0, yT - 0.1), V(rB, e0, yT - 0.1), V(rB, sm, yR), V(rA, sm, yR), nrm(0, -rise / len, (sm - s0 + ov) / len), roof);
    lquad(gbP, V(rA, e1, yT - 0.1), V(rB, e1, yT - 0.1), V(rB, sm, yR), V(rA, sm, yR), nrm(0, rise / len, (e1 - sm) / len), roofD);
    ltri(gbP, V(a0, s0, yT), V(a0, s1, yT), V(a0, sm, Y + h + rise), nrm(-1, 0, 0), wc); ltri(gbP, V(a1, s0, yT), V(a1, s1, yT), V(a1, sm, Y + h + rise), nrm(1, 0, 0), wc);
    lbox(gbP, a0 - ov, a1 + ov, sm - 0.1, sm + 0.1, yR - 0.05, yR + 0.12, K(0x2c3640));
    /* door and sign on the seaward face */
    const da = (a0 + a1) / 2 + 6; lquad(gbP, V(da - 1, s1 + 0.04, Y), V(da + 1, s1 + 0.04, Y), V(da + 1, s1 + 0.04, Y + 2.7), V(da - 1, s1 + 0.04, Y + 2.7), nrm(0, 1, 0), K(0x24303b));
    lbox(gbP, da - 1.2, da + 1.2, s1 + 0.02, s1 + 0.9, Y + 2.7, Y + 2.85, K(0x2c3640));
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(13, 2), DM.sign2); Dock.toWorld((a0 + a1) / 2 - 3, s1 + 0.1, W); sg.position.set(W.x, Y + h - 0.5, W.z); sg.rotation.y = Math.atan2(D.Sx, D.Sz); grp.add(sg);
    Dock.houseSign = sg;
  }
  /* ---- dry-storage shed: ribbed steel, shallow roof, big dark door ---- */
  { const H = D.shed, a0 = H[0], a1 = H[1], s0 = H[2], s1 = H[3], h = 7.6, rise = 2.0, sm = (s0 + s1) / 2, mc = K(0xdfe6ea);
    lwall(gbMet, a1, s1, a1, s0, Y, Y + h, 1, 0, new THREE.Color(mc.r * 0.92, mc.g * 0.92, mc.b * 0.92), 4, 6);
    lwall(gbMet, a0, s0, a0, s1, Y, Y + h, -1, 0, new THREE.Color(mc.r * 0.82, mc.g * 0.82, mc.b * 0.82), 4, 6);
    lwall(gbMet, a0, s1, a1, s1, Y, Y + h, 0, 1, mc, 4, 6);
    lwall(gbMet, a1, s0, a0, s0, Y, Y + h, 0, -1, new THREE.Color(mc.r * 0.88, mc.g * 0.88, mc.b * 0.88), 4, 6);
    const roof = K(0x7f8b94), roofD = new THREE.Color(roof.r * 0.82, roof.g * 0.82, roof.b * 0.82), yT = Y + h, yR = Y + h + rise, ov = 0.5, len = Math.hypot(sm - s0 + ov, rise);
    lquad(gbP, V(a0 - ov, s0 - ov, yT - 0.05), V(a1 + ov, s0 - ov, yT - 0.05), V(a1 + ov, sm, yR), V(a0 - ov, sm, yR), nrm(0, -rise / len, (sm - s0 + ov) / len), roof);
    lquad(gbP, V(a0 - ov, s1 + ov, yT - 0.05), V(a1 + ov, s1 + ov, yT - 0.05), V(a1 + ov, sm, yR), V(a0 - ov, sm, yR), nrm(0, rise / len, (s1 + ov - sm) / len), roofD);
    ltri(gbP, V(a0, s0, yT), V(a0, s1, yT), V(a0, sm, yR), nrm(-1, 0, 0), K(0xc9d2d8)); ltri(gbP, V(a1, s0, yT), V(a1, s1, yT), V(a1, sm, yR), nrm(1, 0, 0), K(0xc9d2d8));
    const dc = (a0 + a1) / 2; lquad(gbP, V(dc - 7.5, s1 + 0.04, Y), V(dc + 7.5, s1 + 0.04, Y), V(dc + 7.5, s1 + 0.04, Y + 5.6), V(dc - 7.5, s1 + 0.04, Y + 5.6), nrm(0, 1, 0), K(0x20262c));
    lbox(gbP, dc - 7.8, dc - 7.5, s1, s1 + 0.12, Y, Y + 5.8, K(0xb0b6bb)); lbox(gbP, dc + 7.5, dc + 7.8, s1, s1 + 0.12, Y, Y + 5.8, K(0xb0b6bb)); lbox(gbP, dc - 7.8, dc + 7.8, s1, s1 + 0.12, Y + 5.6, Y + 5.85, K(0xb0b6bb));
    for (let i = 0; i < 3; i++) { const a = dc - 5 + i * 5; lbox(gbP, a - 2, a + 2, s1 + 0.03, s1 + 0.07, Y + 0.6, Y + 4.8, K(0x2b333a)); }
    /* a stored hull on a rack, glimpsed through the door */
    lbox(gbP, dc - 4.5, dc + 4.5, s1 - 6, s1 - 1.5, Y + 0.4, Y + 1.9, K(0xe8e8ea)); lbox(gbP, dc - 3.8, dc + 3.8, s1 - 5.5, s1 - 2.0, Y + 1.9, Y + 2.7, K(0x2e5a8c));
  }
  /* ---- fuel pumps under a canopy ---- */
  { for (const p of D.pumps) { lbox(gbP, p[0] - 0.45, p[0] + 0.45, p[1] - 0.35, p[1] + 0.35, Y, Y + 1.7, K(0xd0472f)); lbox(gbP, p[0] - 0.47, p[0] + 0.47, p[1] - 0.37, p[1] + 0.37, Y + 1.5, Y + 1.72, K(0xf2f2f0)); lquad(gbP, V(p[0] - 0.3, p[1] + 0.372, Y + 0.95), V(p[0] + 0.3, p[1] + 0.372, Y + 0.95), V(p[0] + 0.3, p[1] + 0.372, Y + 1.35), V(p[0] - 0.3, p[1] + 0.372, Y + 1.35), nrm(0, 1, 0), K(0x101418)); }
    lbox(gbP, 8, 15, -6, -0.5, Y + 3.5, Y + 4.0, K(0xf0f0ec)); lbox(gbP, 8, 15, -6, -0.5, Y + 3.78, Y + 3.9, K(0xd0472f));
    for (const [a, s] of [[8.2, -5.7], [14.8, -5.7], [8.2, -0.8], [14.8, -0.8]]) lbox(gbP, a - 0.15, a + 0.15, s - 0.15, s + 0.15, Y, Y + 3.5, K(0xd8d8d4)); }
  /* ---- sign gantry across the entrance ---- */
  { const g = D.gantry; for (const a of g.a) lbox(gbP, a - 0.32, a + 0.32, g.s - 0.32, g.s + 0.32, Y, Y + 7.4, K(0x4a5058));
    lbox(gbP, g.a[0], g.a[1], g.s - 0.2, g.s + 0.2, Y + 4.8, Y + 7.4, K(0x1b2a38));
    for (const sd of [-1, 1]) { const sg = new THREE.Mesh(new THREE.PlaneGeometry(17.2, 2.4), DM.sign); Dock.toWorld(0, g.s + sd * 0.23, W); sg.position.set(W.x, Y + 6.1, W.z); sg.rotation.y = Math.atan2(D.Sx * sd, D.Sz * sd); grp.add(sg); } }
  /* ---- lamps ---- */
  const glowP = [], glowC = [];
  for (const p of Dock.poles) {
    lbox(gbP, p[0] - 0.12, p[0] + 0.12, p[1] - 0.12, p[1] + 0.12, Y, Y + p[2], K(0x464b50));
    const tall = p[2] > 6; if (tall) { lbox(gbP, p[0] - 0.9, p[0] + 0.9, p[1] - 0.14, p[1] + 0.14, Y + p[2] - 0.05, Y + p[2] + 0.12, K(0x464b50)); Dock.toWorld(p[0] - 0.8, p[1], W); glowP.push(W.x, Y + p[2] - 0.1, W.z); glowC.push(1, 0.86, 0.6); Dock.toWorld(p[0] + 0.8, p[1], W); glowP.push(W.x, Y + p[2] - 0.1, W.z); glowC.push(1, 0.86, 0.6); }
    else { lbox(gbL, p[0] - 0.25, p[0] + 0.25, p[1] - 0.25, p[1] + 0.25, Y + p[2], Y + p[2] + 0.35, K(0xfff3d6)); Dock.toWorld(p[0], p[1], W); glowP.push(W.x, Y + p[2] + 0.2, W.z); glowC.push(1, 0.86, 0.6); }
  }
  for (let s = 8; s <= 62; s += 6) for (const sd of [-1, 1]) { Dock.toWorld(sd * 2.5, s, W); glowP.push(W.x, Y + 0.3, W.z); glowC.push(1, 0.78, 0.5); }
  for (const f of M.FING) for (const sd of [-1, 1]) { Dock.toWorld(sd * (M.FA - 0.6), f, W); glowP.push(W.x, Y + 0.36, W.z); glowC.push(0.6, 1, 0.6); }
  for (const sd of [-1, 1]) { Dock.toWorld(sd * 12.6, 66.2, W); glowP.push(W.x, Y + 1.2, W.z); glowC.push(sd < 0 ? 1 : 0.2, sd < 0 ? 0.15 : 1, sd < 0 ? 0.1 : 0.3); }   /* port red, starboard green */
  for (const w of [[-39, D.house[3] + 0.3], [-33, D.house[3] + 0.3]]) { Dock.toWorld(w[0], w[1], W); glowP.push(W.x, Y + 3.0, W.z); glowC.push(1, 0.82, 0.55); }
  /* ---- parked cars and crates ---- */
  { const dk = K(0x16181b);
    for (const c of D.cars) { const col = K(c.c), a = c.a, s = c.s;
      lbox(gbP, a - 0.9, a + 0.9, s - 2.1, s + 2.1, Y + 0.28, Y + 0.95, col); lbox(gbP, a - 0.8, a + 0.8, s - 1.0, s + 1.2, Y + 0.95, Y + 1.45, K(0x1c2530));
      for (const sa of [-1, 1]) for (const ss of [-1.3, 1.3]) lbox(gbP, a + sa * 0.9 - 0.14, a + sa * 0.9 + 0.14, s + ss - 0.4, s + ss + 0.4, Y, Y + 0.7, dk); }
    for (const c of D.crates) lbox(gbP, c.a - 1.2, c.a + 1.2, c.s - 1.2, c.s + 1.2, Y, Y + c.h, K(c.h > 2 ? 0x2f6fb3 : 0xb9822e)); }
  /* ---- paint: parking bays and a yellow edge line along the quay ---- */
  { const wh = K(0xe6e6e0), ye = K(0xf0c020), fl = (a0, a1, s0, s1, c) => top(gbLn, a0, a1, s0, s1, Y + 0.012, c, 0);
    for (const row of [-24, -36]) { for (let a = -25.5; a <= 21; a += 3.1) fl(a - 0.05, a + 0.05, row - 2.4, row + 2.4, wh); }
    fl(-25.5, 21, -26.55, -26.45, wh); fl(-25.5, 21, -33.55, -33.45, wh);
    fl(-57, -3.6, 2.2, 2.35, ye); fl(3.6, 57, 2.2, 2.35, ye);
    for (let s = -40; s < -4; s += 5) fl(-0.12, 0.12, s, s + 2.4, wh); }
  add(gbCon, DM.con, false, true); add(gbDeck, DM.deck, false, true); add(gbWall, DM.wall, true, true); add(gbMet, DM.metal, true, true);
  const mP = add(gbP, MAT.prop, true, true), mL = add(gbL, MAT.lamp, false, false); add(gbLn, DM.lineM, false, true); if (mP) mP.updateMatrix(); void mL;
  /* ---- glow lights ---- */
  { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(glowP, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(glowC, 3)); geo.computeBoundingSphere();
    Dock.lights = new THREE.Points(geo, DM.glow(3.2, 0.2)); Dock.lights.frustumCulled = false; Dock.lights.renderOrder = 4; grp.add(Dock.lights); }
  /* ---- flagpole on the T-head ---- */
  { const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 8.6, 8), new THREE.MeshStandardMaterial({ color: lc(0xe4e4e0), roughness: 0.5 })); Dock.toWorld(0, 65.2, W); pole.position.set(W.x, Y + 4.3, W.z); grp.add(pole);
    const fg = new THREE.PlaneGeometry(2.4, 1.4, 10, 4); fg.translate(1.2, 0, 0); const flag = new THREE.Mesh(fg, DM.flag); flag.position.set(W.x, Y + 7.7, W.z); flag.rotation.y = Math.atan2(D.Ax, D.Az); grp.add(flag);
    Dock.flag = { mesh: flag, base: fg.attributes.position.array.slice() };
    Dock.cyls.push([0, 65.2, 0.1, Y, Y + 8.6]); }
  Dock.tick(0.016, true);
};

Dock.tick = function (dt, force) {
  if (!Dock.built) return; const lamp = env.lampOn, px = typeof Pl !== 'undefined' ? Pl.x : Dock.s.ox, pz = typeof Pl !== 'undefined' ? Pl.z : Dock.s.oz;
  const far = Math.hypot(px - Dock.s.ox, pz - Dock.s.oz) > 2600; Dock.group.visible = !far; if (far && !force) return;
  DM.wall.emissiveIntensity = lamp * 1.4;
  Dock.lights.material.opacity = 0.2 + 0.9 * lamp; Dock.lights.material.size = 2.4 + 3.6 * lamp;
  const F = Dock.flag, p = F.mesh.geometry.attributes.position, t = App.time;
  for (let i = 0; i < p.count; i++) { const x = F.base[i * 3]; p.array[i * 3 + 2] = Math.sin(x * 2.6 - t * 5.2 + F.base[i * 3 + 1] * 1.3) * 0.11 * (x / 2.4); p.array[i * 3 + 1] = F.base[i * 3 + 1] - (x / 2.4) * 0.05; }
  p.needsUpdate = true;
};
