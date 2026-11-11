/* ================= AIRPORT: textures, geometry, lights =================
   Everything is static and merged into a handful of meshes (runway, tarmac, concrete, paint, buildings, props, lights). */
const AM = {};
function airTextures() {
  const R = AIR.RW, RL = R.u1 - R.u0, RW2 = R.hw * 2;
  /* runway: 860 x 45 m on a 4096 x 256 canvas, drawn in metres */
  { const W = 4096, H = 256, sx = W / RL, sy = H / RW2, c = mkCanvas(W, H), g = c.getContext('2d'), rnd = mulberry32(31);
    g.fillStyle = '#34363b'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 22000; i++) { const v = 40 + rnd() * 50 | 0; g.fillStyle = `rgba(${v},${v},${v + 3},${0.1 + rnd() * 0.25})`; g.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 3, 1 + rnd() * 2); }
    for (let i = 0; i < 140; i++) { g.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.025)'; g.fillRect(rnd() * W, 0, 20 + rnd() * 200, H); }
    g.setTransform(sx, 0, 0, sy, -R.u0 * sx, R.hw * sy);
    /* rubber at both touchdown zones */
    for (const e of [-1, 1]) for (let i = 0; i < 26; i++) {
      const u = e * (R.u1 - 8 - 120 - rnd() * 230), w = 8 + rnd() * 26; g.fillStyle = `rgba(8,8,10,${0.04 + rnd() * 0.06})`; g.fillRect(u - w / 2, -3.2 + rnd() * 6.4 - 2.5, w, 2 + rnd() * 3);
      g.fillRect(u - w / 2, 5.5 + rnd() * 2, w, 0.8 + rnd() * 1.2); g.fillRect(u - w / 2, -7.5 - rnd() * 2, w, 0.8 + rnd() * 1.2);
    }
    g.fillStyle = '#e8e8e2';
    const T = 424, ln = (u0, u1, v0, v1) => g.fillRect(u0, v0, u1 - u0, v1 - v0);
    ln(-T, T, -R.hw + 0.9, -R.hw + 1.4); ln(-T, T, R.hw - 1.4, R.hw - 0.9);
    for (let u = -T + 14; u < T - 40; u += 50) ln(u, u + 30, -0.45, 0.45);
    for (const e of [-1, 1]) {
      for (let i = 0; i < 10; i++) { const v = -18.5 + i * 4.1 + (i > 4 ? 1.6 : 0); if (e < 0) ln(-T, -T + 30, v, v + 1.8); else ln(T - 30, T, v, v + 1.8); }
      const at = (d, f) => (e < 0 ? -T + d : T - d) - (e < 0 ? 0 : f);
      for (const s of [-1, 1]) { const v = s * 9.5; const u0 = e < 0 ? -T + 300 : T - 340; ln(u0, u0 + 40, v - 1.8, v + 1.8); }
      for (const d of [150, 225, 375, 450]) for (const s of [-1, 1]) for (let k = 0; k < (d === 150 ? 2 : 1); k++) { const v = s * (5.6 + k * 3.4 + (d > 300 ? 0.2 : 0)); const u0 = e < 0 ? -T + d : T - d - 22; ln(u0, u0 + 22, v - 0.9, v + 0.9); }
      /* designation: top of the digits points down the runway as seen on approach */
      g.save(); g.translate(e < 0 ? -T + 56 : T - 56, 0); g.rotate(e < 0 ? Math.PI / 2 : -Math.PI / 2);
      g.font = '700 21px Arial, Helvetica, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#e8e8e2'; g.fillText(e < 0 ? '09' : '27', 0, 0); g.restore();
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    AM.rw = new THREE.MeshStandardMaterial({ map: canvasTex(c, true, false), roughness: 0.88, metalness: 0, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  }
  { const S = 128, c = mkCanvas(S, S), g = c.getContext('2d'), rnd = mulberry32(32);
    g.fillStyle = '#4a4d53'; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 2400; i++) { const v = 55 + rnd() * 60 | 0; g.fillStyle = `rgba(${v},${v},${v + 4},0.35)`; g.fillRect(rnd() * S, rnd() * S, 1 + rnd() * 2, 1 + rnd() * 2); }
    AM.tar = new THREE.MeshStandardMaterial({ map: canvasTex(c), vertexColors: true, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  }
  { const S = 256, c = mkCanvas(S, S), g = c.getContext('2d'), rnd = mulberry32(33);
    g.fillStyle = '#85857f'; g.fillRect(0, 0, S, S);
    for (let q = 0; q < 4; q++) { const k = 118 + rnd() * 20 | 0; g.fillStyle = `rgb(${k},${k},${k - 4})`; g.fillRect((q & 1) * 128, (q >> 1) * 128, 128, 128); }
    for (let i = 0; i < 1800; i++) { const v = 100 + rnd() * 50 | 0; g.fillStyle = `rgba(${v},${v},${v - 4},0.3)`; g.fillRect(rnd() * S, rnd() * S, 1 + rnd() * 3, 1 + rnd() * 3); }
    for (let i = 0; i < 5; i++) { g.fillStyle = 'rgba(40,36,30,0.10)'; g.beginPath(); g.ellipse(rnd() * S, rnd() * S, 6 + rnd() * 14, 3 + rnd() * 6, rnd() * 3, 0, TAU); g.fill(); }
    g.fillStyle = 'rgba(40,40,40,0.55)'; g.fillRect(0, 0, S, 2); g.fillRect(0, 0, 2, S); g.fillRect(0, 127, S, 2); g.fillRect(127, 0, 2, S);
    AM.con = new THREE.MeshStandardMaterial({ map: canvasTex(c), vertexColors: true, roughness: 0.92, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  }
  AM.line = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -7, polygonOffsetUnits: -7 });
  { const S = 128, c = mkCanvas(S, S), g = c.getContext('2d');
    g.fillStyle = '#c9ced2'; g.fillRect(0, 0, S, S);
    for (let x = 0; x < S; x += 8) { g.fillStyle = 'rgba(0,0,0,0.16)'; g.fillRect(x, 0, 2, S); g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(x + 3, 0, 1, S); }
    AM.metal = new THREE.MeshStandardMaterial({ map: canvasTex(c), vertexColors: true, roughness: 0.55, metalness: 0.28 });
  }
  { const W = 512, H = 256, c = mkCanvas(W, H), g = c.getContext('2d'), ce = mkCanvas(W, H), ge = ce.getContext('2d'), rnd = mulberry32(34);
    g.fillStyle = '#d6d9db'; g.fillRect(0, 0, W, H); ge.fillStyle = '#000'; ge.fillRect(0, 0, W, H);
    for (let f = 0; f < 2; f++) for (let b = 0; b < 4; b++) {
      const x = b * 128, y = f * 128; g.fillStyle = '#bfc4c8'; g.fillRect(x, y + 118, 128, 10);
      const gr = g.createLinearGradient(0, y + 10, 0, y + 114); gr.addColorStop(0, '#9dc0d8'); gr.addColorStop(0.45, '#46667d'); gr.addColorStop(1, '#1d2e3d');
      g.fillStyle = gr; g.fillRect(x + 5, y + 10, 118, 104);
      g.fillStyle = 'rgba(255,255,255,0.14)'; g.beginPath(); g.moveTo(x + 5, y + 80); g.lineTo(x + 70, y + 10); g.lineTo(x + 96, y + 10); g.lineTo(x + 5, y + 108); g.fill();
      g.fillStyle = '#c3c8cc'; g.fillRect(x + 62, y + 10, 4, 104);
      if (rnd() < 0.85) { ge.fillStyle = rnd() < 0.8 ? `rgb(255,${200 + rnd() * 40 | 0},${130 + rnd() * 50 | 0})` : 'rgb(190,220,255)'; ge.fillRect(x + 5, y + 10, 118, 104); }
    }
    AM.term = new THREE.MeshStandardMaterial({ map: canvasTex(c), vertexColors: true, emissive: new THREE.Color(1, 1, 1), emissiveMap: canvasTex(ce), emissiveIntensity: 0, roughness: 0.3, metalness: 0.25 });
  }
  { const W = 1024, H = 128, c = mkCanvas(W, H), g = c.getContext('2d');
    g.fillStyle = '#12304f'; g.fillRect(0, 0, W, H); g.fillStyle = '#f2b632'; g.fillRect(0, 0, W, 8); g.fillRect(0, H - 8, W, 8);
    g.font = '700 74px Rajdhani, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffffff'; g.fillText(Air.name.toUpperCase(), W / 2, H / 2 + 4);
    AM.sign = new THREE.MeshBasicMaterial({ map: canvasTex(c, true, false) });
  }
  AM.glowPts = (size, op) => new THREE.PointsMaterial({ size, map: MAT.glow, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, opacity: op, fog: false });
}

function archRoof(gb, x0, x1, z0, z1, y0, rise, r, g, b) {
  const N = 9, cx = (x0 + x1) / 2, hw = (x1 - x0) / 2; let ppx = x0, ppy = y0;
  for (let i = 1; i <= N; i++) {
    const a = Math.PI * i / N, px = cx - Math.cos(a) * hw, py = y0 + Math.sin(a) * rise, dx = px - ppx, dy = py - ppy, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, k = 0.88 + 0.12 * (i & 1);
    gb.quadA([ppx, ppy, z0, 0, 0], [px, py, z0, 0, 0], [px, py, z1, 0, 0], [ppx, ppy, z1, 0, 0], nx, ny, 0, r * k, g * k, b * k);
    gb.triA([cx, y0, z0, 0, 0], [ppx, ppy, z0, 0, 0], [px, py, z0, 0, 0], 0, 0, -1, r * 0.8, g * 0.8, b * 0.8);
    gb.triA([cx, y0, z1, 0, 0], [ppx, ppy, z1, 0, 0], [px, py, z1, 0, 0], 0, 0, 1, r * 0.9, g * 0.9, b * 0.9);
    ppx = px; ppy = py;
  }
}

Air.build = function () {
  const A = Air.s; if (!A || Air.built) return; Air.built = true;
  airTextures();
  const cx = A.cx, cz = A.cz, Y = A.H0, X = (u) => cx + u, Z = (v) => cz + v;
  const grp = new THREE.Group(); Air.group = grp; scene.add(grp);
  const add = (gb, mat, cast, recv) => { if (!gb.count) return null; const m = gb.mesh(mat, cast, recv); m.matrixAutoUpdate = false; grp.add(m); return m; };
  const K = (h) => lc(h), R = AIR.RW;
  /* flat quad at height dy over the pad; uv scale t metres per texture repeat */
  const fq = (gb, u0, u1, v0, v1, dy, r, g, b, t) => {
    const y = Y + dy, a = t ? 1 / t : 0;
    gb.quadA([X(u0), y, Z(v0), X(u0) * a, Z(v0) * a], [X(u1), y, Z(v0), X(u1) * a, Z(v0) * a], [X(u1), y, Z(v1), X(u1) * a, Z(v1) * a], [X(u0), y, Z(v1), X(u0) * a, Z(v1) * a], 0, 1, 0, r, g, b);
  };
  const gbRw = new GB(0, 0, true), gbTar = new GB(0, 0, true), gbCon = new GB(0, 0, true), gbLn = new GB(0, 0, false);
  /* runway */
  { const y = Y + 0.08; gbRw.quadA([X(R.u0), y, Z(-R.hw), 0, 1], [X(R.u1), y, Z(-R.hw), 1, 1], [X(R.u1), y, Z(R.hw), 1, 0], [X(R.u0), y, Z(R.hw), 0, 0], 0, 1, 0, 1, 1, 1); }
  /* taxiways, connectors, car park */
  fq(gbTar, -AIR.TWU, AIR.TWU, AIR.TWV - AIR.TWH, AIR.TWV + AIR.TWH, 0.07, 1, 1, 1, 8);
  for (const u of AIR.CONN) fq(gbTar, u - AIR.TWH, u + AIR.TWH, R.hw, AIR.TWV - AIR.TWH, 0.07, 1, 1, 1, 8);
  fq(gbTar, AIR.LOT[0], AIR.LOT[1], AIR.LOT[2], AIR.LOT[3], 0.07, 0.95, 0.95, 0.98, 8); fq(gbTar, -60, -50, 238, 242, 0.07, 1, 1, 1, 8);
  fq(gbCon, AIR.APRON[0], AIR.APRON[1], AIR.APRON[2], AIR.APRON[3], 0.07, 1, 1, 1, 12); fq(gbCon, AIR.HAP[0], AIR.HAP[1], AIR.HAP[2], AIR.HAP[3], 0.07, 1, 1, 1, 12);
  fq(gbCon, AIR.TERM[0] - 8, AIR.TERM[1] + 8, 204, 208, 0.09, 0.95, 0.95, 0.95, 4);
  /* paint */
  const Yl = (u0, u1, v0, v1, c) => fq(gbLn, u0, u1, v0, v1, 0.1, c.r, c.g, c.b);
  const yel = K(0xf0c020), wht = K(0xe6e6e0);
  Yl(-AIR.TWU + 6, AIR.TWU - 6, AIR.TWV - 0.15, AIR.TWV + 0.15, yel);
  for (const u of AIR.CONN) {
    Yl(u - 0.15, u + 0.15, R.hw, AIR.TWV, yel);
    for (const dv of [31, 31.5, 32.3, 33]) Yl(u - AIR.TWH, u + AIR.TWH, dv, dv + 0.22, yel);
    for (const s of [-1, 1]) Yl(u + s * (AIR.TWH - 0.3) - 0.1, u + s * (AIR.TWH - 0.3) + 0.1, R.hw, AIR.TWV - AIR.TWH, yel);
  }
  for (const sp of AIR.APRON ? [[-172], [-134]] : []) { Yl(sp[0] - 0.12, sp[0] + 0.12, 88, 134, yel); Yl(sp[0] - 2.4, sp[0] + 2.4, 134, 134.3, yel); }
  for (const u of [101, 168]) { Yl(u - 0.12, u + 0.12, 88, 112, yel); Yl(u - 2.4, u + 2.4, 112, 112.3, yel); }
  Yl(-45 - 0.15, -45 + 0.15, 88, 140, yel);
  for (let u = AIR.LOT[0] + 3; u <= AIR.LOT[1] - 3; u += 2.8) { Yl(u - 0.1, u + 0.1, 210, 216.5, wht); Yl(u - 0.1, u + 0.1, 229.5, 236, wht); }
  Yl(AIR.LOT[0] + 3, AIR.LOT[1] - 3, 216.4, 216.55, wht); Yl(AIR.LOT[0] + 3, AIR.LOT[1] - 3, 229.4, 229.55, wht);
  add(gbRw, AM.rw, false, true); add(gbTar, AM.tar, false, true); add(gbCon, AM.con, false, true); add(gbLn, AM.line, false, true);

  /* ---- buildings ---- */
  const gbTm = new GB(0, 0, true), gbMt = new GB(0, 0, true), gbP = new GB(0, 0, false), gbL = new GB(0, 0, false);
  const wallBox = (gb, u0, u1, v0, v1, y0, y1, c, tw, th) => {
    const x0 = X(u0), x1 = X(u1), z0 = Z(v0), z1 = Z(v1), w = u1 - u0, d = v1 - v0, h = y1 - y0, ya = Y + y0, yb = Y + y1;
    gb.wall(x1, z1, x1, z0, ya, yb, 1, 0, c.r * 0.92, c.g * 0.92, c.b * 0.92, 0, d / tw, 0, h / th);
    gb.wall(x0, z0, x0, z1, ya, yb, -1, 0, c.r * 0.82, c.g * 0.82, c.b * 0.82, 0, d / tw, 0, h / th);
    gb.wall(x0, z1, x1, z1, ya, yb, 0, 1, c.r, c.g, c.b, 0, w / tw, 0, h / th);
    gb.wall(x1, z0, x0, z0, ya, yb, 0, -1, c.r * 0.88, c.g * 0.88, c.b * 0.88, 0, w / tw, 0, h / th);
  };
  const slab = (gb, u0, u1, v0, v1, y0, y1, c) => gb.box(X(u0), Y + y0, Z(v0), X(u1), Y + y1, Z(v1), c.r, c.g, c.b);
  const wh = K(0xf1f2f0), gry = K(0x8e9296), dk = K(0x2d3036), conc = K(0xd7d5ce);
  /* terminal */
  { const T = AIR.TERM; wallBox(gbTm, T[0], T[1], T[2], T[3], 0, AIR.TH, wh, 16, 8);
    slab(gbP, T[0] - 4, T[1] + 4, T[2] - 4, T[3] + 4, AIR.TH, AIR.TH + 0.7, gry);
    slab(gbP, T[0] + 20, T[1] - 28, T[2] + 6, T[3] - 6, AIR.TH + 0.7, AIR.TH + 2.2, K(0xc5c8cb));
    slab(gbP, T[0] - 2, T[1] + 2, T[2] - 12, T[2], 5.6, 6.1, gry); slab(gbP, T[0] - 2, T[1] + 2, T[3], T[3] + 8, 4.4, 4.9, gry);
    for (let u = T[0]; u <= T[1]; u += 12) { slab(gbP, u - 0.25, u + 0.25, T[2] - 11.5, T[2] - 11, 0, 5.6, gry); slab(gbP, u - 0.25, u + 0.25, T[3] + 7.4, T[3] + 7.9, 0, 4.4, gry); }
    const sgG = new THREE.PlaneGeometry(68, 6), sy = Y + AIR.TH + 3.8, su = X((T[0] + T[1]) / 2);
    const sg = new THREE.Mesh(sgG, AM.sign); sg.position.set(su, sy, Z(T[3] + 3.2)); grp.add(sg);
    const sg2 = new THREE.Mesh(sgG, AM.sign); sg2.rotation.y = Math.PI; sg2.position.set(su, sy, Z(T[2] - 3.2)); grp.add(sg2);
    for (const sv of [T[3] + 3.1, T[2] - 3.1]) for (const du of [-30, 0, 30]) slab(gbP, (T[0] + T[1]) / 2 + du - 0.2, (T[0] + T[1]) / 2 + du + 0.2, sv - 0.2, sv + 0.2, AIR.TH + 0.7, AIR.TH + 1.2, gry); }
  /* tower */
  { const T = AIR.TOWER; wallBox(gbP, T[0], T[1], T[2], T[3], 0, 5, conc, 8, 8);
    slab(gbP, 43, 47, 184, 188, 5, 22.2, K(0xd9d7d0)); wallBox(gbTm, 38.5, 51.5, 179.5, 192.5, 22, 26.6, K(0xb8bcc0), 16, 8);
    slab(gbP, 37, 53, 178, 194, 26.6, 27.4, K(0x6f757b)); slab(gbP, 44.8, 45.2, 185.8, 186.2, 27.4, 34, K(0xaaaaaa));
    slab(gbP, 38, 52, 179, 193, 22, 22.4, K(0x55595e)); gbL.box(X(44.6), Y + 33.4, Z(185.6), X(45.4), Y + 34.4, Z(186.4), 1, 0.2, 0.2); }
  /* hangars */
  for (const h of AIR.HANG) {
    const u0 = h[0], u1 = h[1], v0 = AIR.HV0, v1 = AIR.HV1, hc = K(0xb9c4cf);
    wallBox(gbMt, u0, u1, v0, v1, 0, AIR.HH - 2.6, hc, 4, 4);
    archRoof(gbP, X(u0), X(u1), Z(v0), Z(v1), Y + AIR.HH - 2.6, 4.4, 0.72, 0.76, 0.8);
    slab(gbP, u0 + 3, u1 - 3, v0 - 0.15, v0 - 0.05, 0, AIR.HH - 3.2, K(0x464d57));
    for (let u = u0 + 3 + 8; u < u1 - 3; u += 8.4) slab(gbP, u - 0.1, u + 0.1, v0 - 0.2, v0 - 0.1, 0, AIR.HH - 3.2, K(0x2c3138));
    slab(gbP, u0 + 3, u1 - 3, v0 - 0.22, v0 - 0.1, AIR.HH - 3.3, AIR.HH - 3.1, K(0x2c3138));
  }
  /* fuel tanks */
  for (const f of AIR.FUEL) {
    const g = ni(new THREE.CylinderGeometry(5, 5, 8.5, 22)); _m4.compose(_p3.set(X(f[0]), Y + 4.25, Z(f[1])), _q.identity(), _s3.set(1, 1, 1)); gbP.geo(g, _m4, K(0xe9eaea), 0);
    const g2 = ni(new THREE.CylinderGeometry(5.05, 5.05, 1.2, 22)); _m4.compose(_p3.set(X(f[0]), Y + 5.2, Z(f[1])), _q.identity(), _s3.set(1, 1, 1)); gbP.geo(g2, _m4, K(0xd0472f), 0);
    const g3 = ni(new THREE.CylinderGeometry(4.2, 5, 1.0, 22)); _m4.compose(_p3.set(X(f[0]), Y + 9, Z(f[1])), _q.identity(), _s3.set(1, 1, 1)); gbP.geo(g3, _m4, K(0xdadada), 0);
  }
  slab(gbP, -180, -136, 186, 202, 0, 0.35, K(0x8c8a82));
  /* light poles + floodlights */
  const poles = [[-190, 100], [-190, 168], [-100, 100], [-20, 100], [40, 100], [110, 96], [200, 96], [255, 112], [-118, 224], [-55, 224], [8, 224], [-118, 212], [8, 212]];
  const glowPts = [], glowCol = [];
  for (const p of poles) {
    const tall = p[1] < 200 ? 15 : 7.5;
    slab(gbP, p[0] - 0.18, p[0] + 0.18, p[1] - 0.18, p[1] + 0.18, 0, tall, K(0x4a4e52)); gbL.box(X(p[0] - 0.9), Y + tall, Z(p[1] - 0.45), X(p[0] + 0.9), Y + tall + 0.35, Z(p[1] + 0.45), 1, 1, 1);
    glowPts.push(X(p[0]), Y + tall - 0.2, Z(p[1])); glowCol.push(1, 0.86, 0.6);
  }
  /* parked cars */
  { const rnd = mulberry32(44), cols = [0xa9322f, 0x2f4f8f, 0xd8d8d8, 0x222428, 0x3d7a4a, 0xc9a23a, 0x8c8f94];
    for (const row of [[213, 4.3], [233, 4.3]]) for (let u = AIR.LOT[0] + 4; u < AIR.LOT[1] - 3; u += 2.8) {
      if (rnd() < 0.55) continue; const c = K(cols[(rnd() * cols.length) | 0]), v0 = row[0] - 2.1;
      slab(gbP, u - 0.9, u + 0.9, v0, v0 + 4.3, 0.28, 0.95, c); slab(gbP, u - 0.8, u + 0.8, v0 + 0.9, v0 + 3.2, 0.95, 1.45, K(0x1c2530));
      Air.boxes.push([A.cx + u - 0.9, A.cz + v0, A.cx + u + 0.9, A.cz + v0 + 4.3, A.H0 + 1.45, A.H0, 0, 0, 0]);
      slab(gbP, u - 0.88, u - 0.6, v0 + 0.4, v0 + 1.2, 0, 0.4, dk); slab(gbP, u + 0.6, u + 0.88, v0 + 0.4, v0 + 1.2, 0, 0.4, dk); slab(gbP, u - 0.88, u - 0.6, v0 + 3.1, v0 + 3.9, 0, 0.4, dk); slab(gbP, u + 0.6, u + 0.88, v0 + 3.1, v0 + 3.9, 0, 0.4, dk);
    } }
  /* ground vehicles */
  { const truck = (u, v, c) => { Air.boxes.push([A.cx + u - 1.3, A.cz + v - 4.2, A.cx + u + 1.3, A.cz + v + 4.2, A.H0 + 3.0, A.H0, 0, 0, 0]); slab(gbP, u - 1.3, u + 1.3, v - 4.2, v + 4.2, 0.5, 1.4, K(0xe8e8e8)); slab(gbP, u - 1.3, u + 1.3, v + 2.6, v + 4.2, 1.4, 3.0, K(0xe8e8e8)); slab(gbP, u - 1.25, u + 1.25, v + 3.6, v + 4.22, 1.9, 2.8, K(0x1c2530));
      const g = ni(new THREE.CylinderGeometry(1.05, 1.05, 5, 16)); _m4.compose(_p3.set(X(u), Y + 2.3, Z(v - 1.3)), _q.setFromEuler(_e.set(Math.PI / 2, 0, 0)), _s3.set(1, 1, 1)); gbP.geo(g, _m4, K(c), 0); _q.identity();
      for (const s of [-1, 1]) for (const dv of [-2.6, 2.6]) slab(gbP, u + s * 1.3 - 0.2, u + s * 1.3 + 0.2, v + dv - 0.55, v + dv + 0.55, 0, 1.0, dk); };
    truck(-100, 154, 0xd0472f); truck(150, 118, 0xe0b82a);
    const cart = (u, v) => { slab(gbP, u - 0.9, u + 0.9, v - 1.5, v + 1.5, 0.4, 0.55, K(0x5b6066)); slab(gbP, u - 0.85, u + 0.85, v - 1.4, v + 1.4, 0.55, 1.4, K(0x9fa6ae)); };
    slab(gbP, -64.8, -63.2, 150, 152.4, 0.3, 1.2, K(0x2f6fb3)); for (let i = 0; i < 3; i++) cart(-64, 154.5 + i * 3.4);
    slab(gbP, -75, -72.6, 160, 161.6, 0.3, 1.0, K(0xd0472f)); slab(gbP, -192, -189, 150, 154, 0.2, 1.6, K(0x4b8a52)); }
  /* terminal glass etc. */
  const mTm = add(gbTm, AM.term, true, true); const mMt = add(gbMt, AM.metal, true, true); const mP = add(gbP, MAT.prop, true, true); const mL = add(gbL, MAT.lamp, false, false);
  [mTm, mMt, mP].forEach((m) => { if (m) m.updateMatrix(); });

  /* ---- windsock ---- */
  { const g = new THREE.Group(); g.position.set(X(-200), Y, Z(47));
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 7, 8), new THREE.MeshStandardMaterial({ color: lc(0xd9d9d9), roughness: 0.6 })); pole.position.y = 3.5; g.add(pole);
    const piv = new THREE.Group(); piv.position.y = 6.9; g.add(piv);
    const mO = new THREE.MeshStandardMaterial({ color: lc(0xf06a18), roughness: 0.8, side: THREE.DoubleSide }), mW = new THREE.MeshStandardMaterial({ color: lc(0xf2f2f2), roughness: 0.8, side: THREE.DoubleSide });
    const segs = [];
    for (let i = 0; i < 5; i++) { const r0 = 0.46 - i * 0.07, r1 = 0.46 - (i + 1) * 0.07; const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, 0.78, 12, 1, true), i & 1 ? mW : mO); m.rotation.z = Math.PI / 2; m.position.x = -0.39 - i * 0.78; piv.add(m); segs.push(m); }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.03, 6, 14), new THREE.MeshStandardMaterial({ color: lc(0x888888) })); ring.rotation.y = Math.PI / 2; piv.add(ring);
    grp.add(g); Air.sock = { g, piv, segs }; }

  /* ---- lights: white edges, centreline, green/red thresholds, blue taxi lights, approach lights ---- */
  { const P = [], C = [], push = (u, v, y, r, g, b) => { P.push(X(u), Y + y, Z(v)); C.push(r, g, b); };
    for (let u = -420; u <= 420; u += 30) for (const s of [-1, 1]) push(u, s * (R.hw + 1.2), 0.3, 1, 0.95, 0.85);
    for (let u = -400; u <= 400; u += 15) push(u, 0, 0.14, 1, 0.97, 0.88);
    for (let i = -4; i <= 4; i++) { push(-428.5, i * 4.8, 0.2, 0.2, 1, 0.3); push(428.5, i * 4.8, 0.2, 0.2, 1, 0.3); push(-434, i * 4.8, 0.2, 1, 0.12, 0.1); push(434, i * 4.8, 0.2, 1, 0.12, 0.1); }
    for (let u = -AIR.TWU; u <= AIR.TWU; u += 22) for (const s of [-1, 1]) push(u, AIR.TWV + s * (AIR.TWH + 0.8), 0.2, 0.15, 0.35, 1);
    for (const cu of AIR.CONN) for (let v = R.hw + 6; v < AIR.TWV - AIR.TWH; v += 14) for (const s of [-1, 1]) push(cu + s * (AIR.TWH + 0.8), v, 0.2, 0.15, 0.35, 1);
    for (const gp of [[AIR.APRON[0], AIR.APRON[2]], [AIR.APRON[1], AIR.APRON[2]]]) push(gp[0], gp[1] + 1, 0.2, 0.15, 0.35, 1);
    for (let i = 0; i < glowPts.length; i += 3) { P.push(glowPts[i], glowPts[i + 1], glowPts[i + 2]); C.push(glowCol[i], glowCol[i + 1] * 0.95, glowCol[i + 2] * 0.85); }
    for (let u = 0; u < AIR.TERM[1] - AIR.TERM[0]; u += 12) { push(AIR.TERM[0] + u, AIR.TERM[2] - 11.4, 5.4, 1, 0.82, 0.55); push(AIR.TERM[0] + u, AIR.TERM[3] + 7.6, 4.2, 1, 0.82, 0.55); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); geo.computeBoundingSphere();
    Air.lights = new THREE.Points(geo, AM.glowPts(3.4, 0.2)); Air.lights.frustumCulled = false; Air.lights.renderOrder = 4; grp.add(Air.lights); }
  { const P = [], base = [], idx = [];
    for (const e of [-1, 1]) for (let k = 1; k <= 8; k++) { const u = e * (R.u1 + 4 + (k - 1) * 30); for (let j = -1; j <= 1; j++) { P.push(X(u), Y + 0.5, Z(j * 1.4)); idx.push(e < 0 ? 9 - k : 9 - k); base.push(1, 0.95, 0.85); } }
    for (const e of [-1, 1]) for (let j = -7; j <= 7; j++) if (Math.abs(j) > 1) { P.push(X(e * (R.u1 + 4 + 4 * 30)), Y + 0.5, Z(j * 1.9)); idx.push(5); base.push(1, 0.95, 0.85); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(base.slice(), 3)); geo.computeBoundingSphere();
    Air.als = { pts: new THREE.Points(geo, AM.glowPts(3.8, 0.2)), idx, base, n: idx.length }; Air.als.pts.frustumCulled = false; Air.als.pts.renderOrder = 4; grp.add(Air.als.pts); }
  /* tower beacon: alternating white / green flashes */
  { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute([X(44.2), Y + 28.4, Z(185.2), X(45.8), Y + 28.4, Z(186.8)], 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute([1, 1, 1, 0.2, 1, 0.3], 3));
    Air.beacon = new THREE.Points(geo, AM.glowPts(9, 0.0)); Air.beacon.frustumCulled = false; Air.beacon.renderOrder = 4; grp.add(Air.beacon); }
  Air.tick(0.016, true);
};

Air.tick = function (dt, force) {
  if (!Air.built) return; const A = Air.s, lamp = env.lampOn;
  const px = typeof Pl !== 'undefined' ? Pl.x : A.cx, pz = typeof Pl !== 'undefined' ? Pl.z : A.cz; const far = Math.hypot(px - A.cx, pz - A.cz) > 2600;
  Air.group.visible = !far; if (far && !force) return;
  AM.term.emissiveIntensity = lamp * 1.5;
  const day = 0.2 + 0.9 * lamp; Air.lights.material.opacity = day; Air.lights.material.size = 2.6 + 4 * lamp;
  const t = App.time, ph = (t * 1.6) % 2.2, al = Air.als; al.pts.material.opacity = day; al.pts.material.size = 3 + 4.4 * lamp;
  const ca = al.pts.geometry.attributes.color; for (let i = 0; i < al.n; i++) { const k = 0.25 + 0.75 * Math.max(0, 1 - Math.abs(al.idx[i] * 0.22 - ph) * 2.4); ca.array[i * 3] = al.base[i * 3] * k; ca.array[i * 3 + 1] = al.base[i * 3 + 1] * k; ca.array[i * 3 + 2] = al.base[i * 3 + 2] * k; } ca.needsUpdate = true;
  const bc = Air.beacon.geometry.attributes.color, bt = (t * 0.9) % 2, w = bt < 0.18 ? 1 : 0, gr = bt > 1 && bt < 1.18 ? 1 : 0;
  bc.array[0] = bc.array[1] = bc.array[2] = w; bc.array[3] = 0.2 * gr; bc.array[4] = gr; bc.array[5] = 0.3 * gr; bc.needsUpdate = true; Air.beacon.material.opacity = 0.35 + 0.65 * lamp + (w + gr) * 0.4;
  const S = Air.sock, wd = Math.PI + Math.sin(t * 0.21) * 0.28 + Math.sin(t * 0.77) * 0.07; S.piv.rotation.y = wd;
  for (let i = 0; i < S.segs.length; i++) S.segs[i].rotation.y = Math.sin(t * 5 + i * 0.9) * 0.04 * (i + 1);
};
