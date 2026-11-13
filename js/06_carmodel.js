/* ================= CAR MODELS v2 =================
   Smooth lofted bodies (cross-sections swept along the car, with wheel arches, fender flares, pillars and glass),
   decals sampled straight off the surface (lamps, grille, door cuts), clear-coat paint lit by a sky reflection probe
   (a PMREM of the live sky shader, refreshed every few seconds), and spinning / steering wheels drawn as instanced meshes. */
const Env = { mats: new Set(), rt: null, tex: null, studio: null, pm: null, scene: null, ground: null, t: 5.6, ok: false };
const sm01 = (t) => t * t * (3 - 2 * t);

function initEnv() {
  try {
    Env.pm = new THREE.PMREMGenerator(renderer);
    const sc = Env.scene = new THREE.Scene();
    const skyM = new THREE.ShaderMaterial({ vertexShader: MAT.sky.vertexShader, fragmentShader: MAT.sky.fragmentShader.replace('gl_FragColor=vec4(col,1.0);', 'gl_FragColor=vec4(min(col,vec3(2.0)),1.0);'), uniforms: MAT.sky.uniforms, side: THREE.BackSide, depthWrite: false, fog: false });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 14), skyM); sky.scale.setScalar(40); sky.frustumCulled = false; sc.add(sky);
    Env.ground = new THREE.Mesh(new THREE.CircleGeometry(90, 22), new THREE.MeshBasicMaterial({ color: 0x252b1c })); Env.ground.rotation.x = -Math.PI / 2; Env.ground.position.y = -2; sc.add(Env.ground);
    /* studio probe for garage thumbnails: soft gradient room with a big overhead box and two strip lights */
    const st = new THREE.Scene(), g = new THREE.SphereGeometry(30, 20, 12), pos = g.attributes.position, col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) / 30, up = y > 0, t = up ? Math.pow(y, 0.7) : Math.pow(-y, 0.6);
      const k = up ? [0.55 + 0.45 * t, 0.62 + 0.45 * t, 0.7 + 0.5 * t] : [0.5 - 0.44 * t, 0.52 - 0.46 * t, 0.56 - 0.5 * t]; col[i * 3] = k[0]; col[i * 3 + 1] = k[1]; col[i * 3 + 2] = k[2];
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); st.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
    const box = (w, h, x, y, z, v) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(v, v, v * 1.04), side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); st.add(m); };
    box(16, 6, 0, 18, 5, 7); box(3, 14, -20, 6, 2, 5); box(3, 14, 20, 6, -4, 4.5); box(10, 3, 0, 8, -20, 3);
    Env.studio = Env.pm.fromScene(st, 0, 0.1, 100).texture; Env.ok = true;
  } catch (e) { Env.ok = false; }
}
Env.reg = function (m, studio) { m.envMap = studio ? Env.studio : Env.tex; m.needsUpdate = true; if (!studio) Env.mats.add(m); return m; };
Env.refresh = function () {
  if (!Env.ok) return;
  try {
    const k = 0.05 + 0.2 * env.day; Env.ground.material.color.setRGB(0.5 * k, 0.56 * k, 0.38 * k);
    const rt = Env.pm.fromScene(Env.scene, 0, 0.1, 100), old = Env.rt; Env.rt = rt; Env.tex = rt.texture;
    for (const m of Env.mats) { const first = !m.envMap; m.envMap = Env.tex; if (first) m.needsUpdate = true; }
    if (old) old.dispose();
  } catch (e) { Env.ok = false; }
};
Env.update = function (dt) { Env.t += dt; if (Env.t > (Q.dpr < 1 ? 14 : 7)) { Env.t = 0; Env.refresh(); } };

function initCarMats() {
  const std = (o) => new THREE.MeshStandardMaterial(o);
  MAT.carGlass = Env.reg(std({ color: lc(0x0d141b), roughness: 0.05, metalness: 0.9, envMapIntensity: 1.25 }));
  MAT.carTrim = Env.reg(std({ vertexColors: true, roughness: 0.62, metalness: 0.15, envMapIntensity: 0.45, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }));
  MAT.carBrake = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 0.06, 0.05), polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
  MAT.carHead.polygonOffset = true; MAT.carHead.polygonOffsetFactor = -1; MAT.carHead.polygonOffsetUnits = -2;
  MAT.carTail.polygonOffset = true; MAT.carTail.polygonOffsetFactor = -1; MAT.carTail.polygonOffsetUnits = -2;
  MAT.tire = std({ vertexColors: true, roughness: 0.92, metalness: 0 });
  MAT.rim = Env.reg(std({ vertexColors: true, roughness: 0.28, metalness: 0.8, envMapIntensity: 1.1, side: THREE.DoubleSide }));
}
function mkPaint(hex, studio, fin) {
  const m = new THREE.MeshPhysicalMaterial({ color: lc(hex), roughness: 0.45, metalness: 0.25, clearcoat: 0.9, clearcoatRoughness: 0.16, vertexColors: true, envMapIntensity: 0.55 });
  if (fin && fin !== 'gloss') applyFinish(m, fin);
  return Env.reg(m, studio);
}

/* ---------- small geometry helpers ---------- */
function chaikin(pts, n) {
  for (let k = 0; k < n; k++) { const o = [pts[0]]; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; o.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); } o.push(pts[pts.length - 1]); pts = o; }
  return pts;
}
function samp(poly, z) {
  const n = poly.length; if (z <= poly[0][0]) return poly[0][1]; if (z >= poly[n - 1][0]) return poly[n - 1][1];
  let lo = 0, hi = n - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (poly[m][0] <= z) lo = m; else hi = m; }
  const t = (z - poly[lo][0]) / (poly[hi][0] - poly[lo][0] || 1); return poly[lo][1] + (poly[hi][1] - poly[lo][1]) * t;
}
function flipGeo(g) {
  const p = g.attributes.position.array, n = g.attributes.normal.array;
  for (let i = 0; i < p.length; i += 9) { for (let k = 0; k < 3; k++) { const a = p[i + 3 + k]; p[i + 3 + k] = p[i + 6 + k]; p[i + 6 + k] = a; const b = n[i + 3 + k]; n[i + 3 + k] = n[i + 6 + k]; n[i + 6 + k] = b; } }
  for (let i = 0; i < n.length; i++) n[i] = -n[i];
  return g;
}
function triOut(gb, a, b, c) {
  const ux = b.x - a.x, uy = b.y - a.y, uz = b.z - a.z, vx = c.x - a.x, vy = c.y - a.y, vz = c.z - a.z;
  const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
  if (cx * (a.nx + b.nx + c.nx) + cy * (a.ny + b.ny + c.ny) + cz * (a.nz + b.nz + c.nz) < 0) { const t = b; b = c; c = t; }
  gb.vtx(a.x, a.y, a.z, a.nx, a.ny, a.nz, a.r, a.g, a.b); gb.vtx(b.x, b.y, b.z, b.nx, b.ny, b.nz, b.r, b.g, b.b); gb.vtx(c.x, c.y, c.z, c.nx, c.ny, c.nz, c.r, c.g, c.b);
}
function insideSec(sec, x, y) {
  const X = sec.X, Y = sec.Y, n = X.length; let c = false, px = -X[0], py = Y[0];
  const tst = (qx, qy) => { if ((qy > y) !== (py > y) && x < (px - qx) * (y - qy) / (py - qy) + qx) c = !c; px = qx; py = qy; };
  for (let j = 0; j < n; j++) tst(X[j], Y[j]);
  for (let j = n - 2; j >= 0; j--) tst(-X[j], Y[j]);
  return c;
}

/* ---------- body spec: all the numbers the loft needs ---------- */
function carSpec(def) {
  const b = def.body, p = def.p || {}, hl = b.L / 2, hw = b.W / 2, wr = b.wr, y0 = b.y0 != null ? b.y0 : 0.36, y1 = b.y1 != null ? b.y1 : y0 + b.H + 0.1, C = b.C, yR = y1 + C, tww = b.tw || 0.28;
  const cb = b.cab || {}, cz = cb.cz != null ? cb.cz : -0.1, bd = cb.bd != null ? cb.bd : hl * 0.5, td = cb.td != null ? cb.td : hl * 0.3, zoff = cb.zoff != null ? cb.zoff : -0.12, inset = cb.inset != null ? cb.inset : 0.08, tw = cb.tw != null ? cb.tw : hw - 0.25;
  const zRB = Math.max(cz - bd, -hl + 0.14), zFB = Math.min(cz + bd, hl - 0.3);
  let zRT = Math.max(cz + zoff - td, zRB + 0.08), zFT = Math.min(cz + zoff + td, zFB - 0.1); if (zFT < zRT + 0.25) { const m = (zFT + zRT) / 2; zRT = m - 0.125; zFT = m + 0.125; }
  const boxy = !!b.boxy, S = { def, b, hl, hw, wr, y0, y1, yR, C, tww, cz, inset, tw, zRB, zFB, zRT, zFT, boxy };
  const wa = p.a != null ? p.a : hl - 0.85, wbk = p.b != null ? p.b : hl - 0.85;
  S.wheels = []; for (const sx of [-1, 1]) for (const [z, front] of [[wa, true], [-wbk, false]]) { const r = front && b.wrF ? b.wrF : wr, w = front && b.twF ? b.twF : tww; S.wheels.push({ x: sx * (hw - w / 2 - 0.04), z, r, w, front, side: sx }); }   /* wrF / twF: a different front tyre (hot rods, open-wheelers) */
  S.Ra = wr + 0.065; S.ySill = Math.max(0.16, y0 - 0.14);
  S.rise = Math.max(0, wr + S.Ra + 0.055 - y1); S.flare = b.flares ? 0.065 : 0; S.crown = b.crown != null ? b.crown : 0.045;
  S.noseR = b.noseR != null ? b.noseR : (boxy ? 0.32 : 0.62); S.tailR = b.tailR != null ? b.tailR : (boxy ? 0.3 : 0.5);
  S.nN = boxy ? 4.2 : 3.8; S.sEnd = boxy ? 0.9 : 0.94; S.cEnd = boxy ? 0.28 : 0.32; S.cP = boxy ? 2.2 : 3;
  const hd = b.hoodDrop != null ? b.hoodDrop : 0.12, dd = b.deckDrop != null ? b.deckDrop : 0.07; S.hoodDrop = hd;
  const gap = (z, lo, hi) => Math.min(hi, Math.max(lo, z));
  let ctrl = [[-hl, y1 - dd - 0.04], [-hl + 0.22, y1 + 0.005 - dd * 0.4], [zRB - 0.14, y1 + 0.015], [zRB, y1 + 0.02], [zRT, yR - 0.015], [(zRT + zFT) / 2, yR + 0.022], [zFT, yR - 0.015], [zFB, y1 + 0.035], [gap(zFB + 0.3, zFB + 0.05, hl - 0.4), y1 + 0.05], [hl - 0.3, y1 + 0.02 - hd * 0.35], [hl, y1 - hd]];
  ctrl = ctrl.filter((q, i) => i === 0 || i === ctrl.length - 1 || (q[0] > ctrl[0][0] + 0.05 && q[0] < hl - 0.05));
  ctrl.sort((a, c) => a[0] - c[0]); for (let i = 1; i < ctrl.length; i++) if (ctrl[i][0] < ctrl[i - 1][0] + 0.02) ctrl[i][0] = ctrl[i - 1][0] + 0.02;
  S.sil = chaikin(ctrl, 2);
  S.bpil = b.bpil != null ? b.bpil : null; const cp = b.cpil != null ? b.cpil : (b.squareback ? 0.06 : 0.3);
  S.win = b.win || [[zRB + cp, zFB - 0.04]];
  if (S.bpil != null) { const w = []; for (const q of S.win) { if (S.bpil > q[0] && S.bpil < q[1]) { w.push([q[0], S.bpil - 0.055], [S.bpil + 0.055, q[1]]); } else w.push(q); } S.win = w; }
  return S;
}

/* cross-section (right half) at height-line z: 12 points from the sill up over the body to the centre line */
function secAt(S, z) {
  const hl = S.hl, hw = S.hw, y1 = S.y1;
  let wf = 1, cv = 0;
  if (z > hl - S.noseR) { const s = clamp((z - (hl - S.noseR)) / S.noseR, 0, 1); wf = Math.pow(1 - Math.pow(s * S.sEnd, S.nN), 1 / S.nN); cv = S.cEnd * Math.pow(s, S.cP); }
  else if (z < -hl + S.tailR) { const s = clamp((-hl + S.tailR - z) / S.tailR, 0, 1); wf = Math.pow(1 - Math.pow(s * S.sEnd, S.nN), 1 / S.nN); cv = S.cEnd * Math.pow(s, S.cP); }
  const yT = samp(S.sil, z);
  let bump = 0; for (const w of S.wheels) if (w.side > 0) { const dz = z - w.z, R = S.Ra + 0.2; if (Math.abs(dz) < R) bump = Math.max(bump, 0.5 + 0.5 * Math.cos(Math.PI * dz / R)); }
  const rise = S.rise * bump, wB = hw + S.flare * bump, inCab = z > S.zRB && z < S.zFB, deckY = inCab ? y1 + 0.03 : yT;
  const u = clamp((yT - deckY) / Math.max(0.05, S.yR - (y1 + 0.03)), 0, 1), c0 = S.crown * (1 - 0.45 * u), xb = wB * 0.955;
  const ytop = (x, yc) => yc - c0 * (x / xb) * (x / xb) + rise * Math.pow(Math.min(1, x / xb), 3) * (1 - u);
  const cab0 = hw - S.inset, xCab = cab0 + (S.tw - cab0) * u, xE = Math.min(xCab, xb * 0.97), yE = ytop(xE, yT);
  const xG = xE - 0.07 * (0.4 + 0.6 * u), x10 = xE * 0.5, yB = ytop(xb, deckY) - 0.014 + rise * u;
  let yS = S.ySill; for (const w of S.wheels) if (w.side > 0) { const dz = z - w.z; if (Math.abs(dz) < S.Ra) yS = Math.max(yS, w.r + Math.sqrt(S.Ra * S.Ra - dz * dz)); }
  yS = Math.min(yS, yB - 0.14); const h = yB - yS, bul = 0.014 * u;
  const X = [wB * 0.9, wB * 0.985, wB, wB * 0.985, xb, xb + (xE - xb) * 0.16 + bul * 0.6, xb + (xE - xb) * 0.55 + bul, xb + (xE - xb) * 0.88 + bul * 0.4, xE, xG, x10, 0];
  const Y = [yS, yS + 0.18 * h, yS + 0.5 * h, yS + 0.85 * h, yB, yB + (yE - yB) * 0.16, yB + (yE - yB) * 0.55, yB + (yE - yB) * 0.88, yE, ytop(xG, yT), ytop(x10, yT), yT];
  if (cv > 0 || wf < 1) { const ym = (yS + yT) * 0.5; for (let k = 0; k < 12; k++) { Y[k] += (ym - Y[k]) * cv; X[k] *= wf; } }
  return { X, Y, u, yS, yB, yT };
}

function genStations(S, lod) {
  const hl = S.hl, zs = [], step = lod ? 0.3 : 0.14, es = lod ? 0.1 : 0.05;
  for (let z = -hl; z < hl; z += step) zs.push(z); zs.push(hl);
  for (let d = es; d < 0.45; d += es) zs.push(-hl + d, hl - d);
  for (const w of S.wheels) if (w.side > 0) { const R = S.Ra + 0.02, st = lod ? 0.13 : 0.065; for (let d = -R; d <= R + 1e-6; d += st) zs.push(w.z + d); }
  for (const z of [S.zRB, S.zRT, S.zFT, S.zFB]) zs.push(z - 0.05, z, z + 0.05);
  zs.sort((a, c) => a - c);
  const out = []; for (const z of zs) { if (z < -hl - 1e-6 || z > hl + 1e-6) continue; if (!out.length || z - out[out.length - 1] > 0.02) out.push(clamp(z, -hl, hl)); }
  out[0] = -hl; if (hl - out[out.length - 1] < 0.02) out[out.length - 1] = hl; else out.push(hl);
  return out;
}

/* ---------- body loft: paint into gP, glass into gG ---------- */
function loftBody(S, gP, gG, lod) {
  const zs = genStations(S, lod), K = zs.length, M = 12, secs = zs.map((z) => secAt(S, z)), G = [], Nn = [];
  for (let k = 0; k < K; k++) { G.push([]); for (let j = 0; j < M; j++) G[k].push([secs[k].X[j], secs[k].Y[j], zs[k]]); }
  for (let k = 0; k < K; k++) {
    Nn.push([]);
    for (let j = 0; j < M; j++) {
      const a = G[Math.max(0, k - 1)][j], b = G[Math.min(K - 1, k + 1)][j], c = G[k][Math.max(0, j - 1)], d = G[k][Math.min(M - 1, j + 1)];
      const tz = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], tp = [d[0] - c[0], d[1] - c[1], d[2] - c[2]];
      let nx = tp[1] * tz[2] - tp[2] * tz[1], ny = tp[2] * tz[0] - tp[0] * tz[2], nz = tp[0] * tz[1] - tp[1] * tz[0]; if (j === M - 1) nx = 0;
      const l = Math.hypot(nx, ny, nz) || 1; Nn[k].push([nx / l, ny / l, nz / l]);
    }
  }
  const inWin = (zc) => { for (const w of S.win) if (zc >= w[0] && zc <= w[1]) return true; return false; };
  const cls = (j, zc, um) => {
    if (j <= 4 || j === 7 || j === 8) return 0;
    if (j === 5 || j === 6) return um > 0.12 && inWin(zc) ? 1 : 0;
    return um > 0.08 && ((zc >= S.zFT - 0.01 && zc <= S.zFB + 0.01) || (zc >= S.zRB - 0.01 && zc <= S.zRT + 0.01)) ? 1 : 0;
  };
  const V = (k, j, sd, isGlass) => {
    const g = G[k][j], n = Nn[k][j], ao = isGlass ? 1 : 0.6 + 0.4 * sm01(clamp((g[1] - S.ySill) / 0.38, 0, 1));
    return { x: g[0] * sd, y: g[1], z: g[2], nx: n[0] * sd, ny: n[1], nz: n[2], r: ao, g: ao, b: ao };
  };
  for (let k = 0; k < K - 1; k++) {
    const zc = (zs[k] + zs[k + 1]) / 2, um = (secs[k].u + secs[k + 1].u) / 2;
    for (let j = 0; j < M - 1; j++) {
      const gl = cls(j, zc, um), gb = gl ? gG : gP;
      for (const sd of [1, -1]) {
        const a = V(k, j, sd, gl), b = V(k + 1, j, sd, gl), c = V(k + 1, j + 1, sd, gl), d = V(k, j + 1, sd, gl);
        triOut(gb, a, b, c); triOut(gb, a, c, d);
      }
    }
  }
  /* end caps: fan from the middle of each end ring, normals bent from the ring toward the face so the flat face blends in */
  for (const e of [0, K - 1]) {
    const sg = e ? 1 : -1, ring = [], z = zs[e];
    for (let j = 0; j < M; j++) ring.push([G[e][j], Nn[e][j]]); for (let j = M - 2; j >= 0; j--) ring.push([[-G[e][j][0], G[e][j][1], G[e][j][2]], [-Nn[e][j][0], Nn[e][j][1], Nn[e][j][2]]]);
    let cy = 0; for (const r of ring) cy += r[0][1]; cy /= ring.length;
    const ctr = { x: 0, y: cy, z, nx: 0, ny: 0, nz: sg, r: 1, g: 1, b: 1 };
    const rv = ring.map((r) => { const nx = r[1][0] * 0.35, ny = r[1][1] * 0.35, nz = r[1][2] * 0.35 + sg * 0.95, l = Math.hypot(nx, ny, nz); const ao = 0.6 + 0.4 * sm01(clamp((r[0][1] - S.ySill) / 0.38, 0, 1)); return { x: r[0][0], y: r[0][1], z, nx: nx / l, ny: ny / l, nz: nz / l, r: ao, g: ao, b: ao }; });
    for (let i = 0; i < rv.length; i++) triOut(gP, ctr, rv[i], rv[(i + 1) % rv.length]);
  }
}

/* ---------- surface sampling for decals ---------- */
function faceZ(S, sgn, x, y) {
  const hl = S.hl, R = sgn > 0 ? S.noseR : S.tailR; let lo = sgn > 0 ? hl - R : -hl + R, hi = sgn > 0 ? hl : -hl;
  if (!insideSec(secAt(S, lo), x, y)) return lo;
  if (insideSec(secAt(S, hi), x, y)) return hi;
  for (let i = 0; i < 12; i++) { const m = (lo + hi) / 2; if (insideSec(secAt(S, m), x, y)) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
function sideX(S, z, y) {
  const s = secAt(S, z), X = s.X, Y = s.Y; if (y <= Y[0]) return X[0];
  for (let j = 0; j < 4; j++) if (y <= Y[j + 1]) { const t = (y - Y[j]) / (Y[j + 1] - Y[j] || 1); return X[j] + (X[j + 1] - X[j]) * t; }
  return X[4];
}
function topY(S, x, z) {
  const s = secAt(S, z), X = s.X, Y = s.Y; x = Math.abs(x);
  for (let j = 7; j < 11; j++) if (x >= X[j + 1]) { const t = (X[j] - x) / (X[j] - X[j + 1] || 1); return Y[j] + (Y[j + 1] - Y[j]) * clamp(t, 0, 1); }
  return Y[11];
}
/* a grid of surface points (fn(s,t) -> [x,y,z]) lifted off the body by `off`, with smooth normals; hint = outward direction */
function patch(gb, fn, nu, nv, off, col, hint) {
  const P = [], N = [];
  for (let a = 0; a <= nu; a++) { P.push([]); for (let b = 0; b <= nv; b++) P[a].push(fn(a / nu, b / nv)); }
  for (let a = 0; a <= nu; a++) {
    N.push([]);
    for (let b = 0; b <= nv; b++) {
      const p0 = P[Math.max(0, a - 1)][b], p1 = P[Math.min(nu, a + 1)][b], q0 = P[a][Math.max(0, b - 1)], q1 = P[a][Math.min(nv, b + 1)];
      const du = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]], dv = [q1[0] - q0[0], q1[1] - q0[1], q1[2] - q0[2]];
      let nx = du[1] * dv[2] - du[2] * dv[1], ny = du[2] * dv[0] - du[0] * dv[2], nz = du[0] * dv[1] - du[1] * dv[0]; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
      if (nx * hint[0] + ny * hint[1] + nz * hint[2] < 0) { nx = -nx; ny = -ny; nz = -nz; }
      N[a].push([nx, ny, nz]);
    }
  }
  const V = (a, b) => ({ x: P[a][b][0] + N[a][b][0] * off, y: P[a][b][1] + N[a][b][1] * off, z: P[a][b][2] + N[a][b][2] * off, nx: N[a][b][0], ny: N[a][b][1], nz: N[a][b][2], r: col[0], g: col[1], b: col[2] });
  for (let a = 0; a < nu; a++) for (let b = 0; b < nv; b++) { const A = V(a, b), B = V(a + 1, b), C = V(a + 1, b + 1), D = V(a, b + 1); triOut(gb, A, B, C); triOut(gb, A, C, D); }
}
const pFront = (S, gb, sg, xa, xb, ya, yb, off, col, nu, nv, slant) => patch(gb, (s, t) => { const x = xa + (xb - xa) * s, y = ya + (yb - ya) * t + (slant ? slant * (s - 0.5) : 0); return [x, y, faceZ(S, sg, x, y)]; }, nu || 6, nv || 2, off, col, [0, 0, sg]);
const pSide = (S, gb, sd, za, zb, ya, yb, off, col, nu, nv) => patch(gb, (s, t) => { const z = za + (zb - za) * s, y = ya + (yb - ya) * t; return [sd * sideX(S, z, y), y, z]; }, nu || 2, nv || 4, off, col, [sd, 0, 0]);
const pTop = (S, gb, xa, xb, za, zb, off, col, nu, nv) => patch(gb, (s, t) => { const x = xa + (xb - xa) * s, z = za + (zb - za) * t; return [x, topY(S, x, z), z]; }, nu || 2, nv || 8, off, col, [0, 1, 0]);

/* ---------- wheel meshes (shared geometry, drawn instanced) ---------- */
const Wheels = { recs: [], sets: null, ready: false, cap: 200, geo: null };
function lathe(pts, seg) { const g = new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p[0], p[1])), seg); g.rotateZ(-Math.PI / 2); return ni(g); }
const TIRE_RHO = { std: 0.62, sport: 0.7, knobby: 0.56 };   /* rim radius as a share of the tyre's */
function wheelGeos() {
  const out = { tire: {}, rim: {} }, M = new THREE.Matrix4(), c = new THREE.Color();
  const tireProfile = (rho, shoulder) => [[rho - 0.02, -0.4], [rho + 0.01, -0.46], [rho + 0.07, -0.5], [0.8, -0.5], [0.93, -0.49 + shoulder], [0.985, -0.43], [1, -0.32], [1, 0.32], [0.985, 0.43], [0.93, 0.49 - shoulder], [0.8, 0.5], [rho + 0.07, 0.5], [rho + 0.01, 0.46], [rho - 0.02, 0.4]];
  for (const kind of ['std', 'sport']) {
    const rho = kind === 'sport' ? 0.7 : 0.62, gb = new GB(0, 0, false);
    c.setRGB(0.028, 0.028, 0.03); gb.geo(lathe(tireProfile(rho, kind === 'sport' ? 0.0 : 0.02), 22), M.identity(), c, 0);
    /* backing plate + brake rotor + caliper, seen through the spokes */
    const cyl = ni(new THREE.CylinderGeometry(1, 1, 1, 16)); cyl.rotateZ(Math.PI / 2);
    c.setRGB(0.02, 0.02, 0.022); M.compose(new THREE.Vector3(0.1, 0, 0), new THREE.Quaternion(), new THREE.Vector3(0.05, rho * 0.97, rho * 0.97)); gb.geo(cyl, M, c, 0);
    c.setRGB(0.3, 0.3, 0.32); M.compose(new THREE.Vector3(0.17, 0, 0), new THREE.Quaternion(), new THREE.Vector3(0.05, rho * 0.8, rho * 0.8)); gb.geo(cyl, M, c, 0);
    c.setRGB(0.07, 0.07, 0.08); M.compose(new THREE.Vector3(0.2, 0, 0), new THREE.Quaternion(), new THREE.Vector3(0.05, rho * 0.3, rho * 0.3)); gb.geo(cyl, M, c, 0);
    if (kind === 'sport') { const bx = ni(new THREE.BoxGeometry(1, 1, 1)); c.setRGB(0.75, 0.04, 0.03); M.compose(new THREE.Vector3(0.2, rho * 0.62, 0.12), new THREE.Quaternion(), new THREE.Vector3(0.14, rho * 0.34, rho * 0.4)); gb.geo(bx, M, c, 0); }
    out.tire[kind] = gb.mesh(MAT.tire).geometry;
  }
  { /* knobby off-road tyre: a tall sidewall, two staggered rows of square tread blocks and shoulder lugs */
    const gb = new GB(0, 0, false), rho = TIRE_RHO.knobby, bx = ni(new THREE.BoxGeometry(1, 1, 1)), q2 = new THREE.Quaternion(), e2 = new THREE.Euler();
    c.setRGB(0.03, 0.03, 0.032); gb.geo(lathe(tireProfile(rho, 0.03).map((p) => [p[0] * 0.95, p[1]]), 22), M.identity(), c, 0);
    const cyl = ni(new THREE.CylinderGeometry(1, 1, 1, 16)); cyl.rotateZ(Math.PI / 2); c.setRGB(0.02, 0.02, 0.022); M.compose(new THREE.Vector3(0.1, 0, 0), new THREE.Quaternion(), new THREE.Vector3(0.05, rho * 0.97, rho * 0.97)); gb.geo(cyl, M, c, 0);
    c.setRGB(0.035, 0.035, 0.038);
    for (let i = 0; i < 22; i++) for (const row of [-1, 1]) {
      const a = (i + (row > 0 ? 0.5 : 0)) * TAU / 22; e2.set(a, 0, 0); q2.setFromEuler(e2);
      M.compose(new THREE.Vector3(row * 0.22, Math.sin(a) * 0.975, Math.cos(a) * 0.975), q2, new THREE.Vector3(0.36, 0.1, 0.16)); gb.geo(bx, M, c, 0);
      M.compose(new THREE.Vector3(row * 0.47, Math.sin(a) * 0.9, Math.cos(a) * 0.9), q2, new THREE.Vector3(0.1, 0.12, 0.1)); gb.geo(bx, M, c, 0);
    }
    out.tire.knobby = gb.mesh(MAT.tire).geometry;
  }
  const bx = ni(new THREE.BoxGeometry(1, 1, 1)), cyl = ni(new THREE.CylinderGeometry(1, 1, 1, 18)); cyl.rotateZ(Math.PI / 2);
  const q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3(), e = new THREE.Euler();
  const barrel = (gb) => { c.setRGB(1, 1, 1); gb.geo(lathe([[0.78, -0.4], [0.97, -0.38], [1, -0.3], [1, 0.4], [0.97, 0.47], [0.9, 0.46], [0.86, 0.38]], 22), M.identity(), c, 0); };
  const hub = (gb, cap) => { c.setRGB(0.85, 0.85, 0.85); M.compose(v.set(0.36, 0, 0), q.identity(), s.set(0.16, 0.2, 0.2)); gb.geo(cyl, M, c, 0); c.setRGB(cap, cap, cap); M.compose(v.set(0.44, 0, 0), q.identity(), s.set(0.08, 0.11, 0.11)); gb.geo(cyl, M, c, 0); };
  const spokes = (gb, n, ws, th, r0) => { for (let i = 0; i < n; i++) { const a = i * TAU / n; e.set(a, 0, 0); q.setFromEuler(e); v.set(0.36, 0, 0); M.compose(v, q, s.set(th, 1, 1)); const sp = new THREE.Matrix4().compose(new THREE.Vector3(0.36, Math.sin(a) * 0, 0), q, new THREE.Vector3(1, 1, 1)); c.setRGB(1, 1, 1);
      const L = 0.97 - r0, m2 = new THREE.Matrix4().compose(new THREE.Vector3(0.36, 0, 0), q, new THREE.Vector3(1, 1, 1)); const off = new THREE.Matrix4().compose(new THREE.Vector3(0, 0, (r0 + L / 2)), new THREE.Quaternion(), new THREE.Vector3(th, ws, L)); gb.geo(bx, m2.multiply(off), c, 0); } };
  const dish = (gb, r1, r0, a1, a0) => { c.setRGB(0.95, 0.95, 0.95); gb.geo(lathe([[r0, a0], [r1 * 0.5, (a0 + a1) / 2], [r1, a1]], 22), M.identity(), c, 0); };
  { const gb = new GB(0, 0, false); barrel(gb); spokes(gb, 10, 0.075, 0.06, 0.15); hub(gb, 0.4); out.rim.multi = gb.mesh(MAT.rim).geometry; }
  { const gb = new GB(0, 0, false); barrel(gb); spokes(gb, 5, 0.2, 0.07, 0.15); hub(gb, 0.4); out.rim.five = gb.mesh(MAT.rim).geometry; }
  { /* beadlock: eight flat spokes and a bolted ring clamping the bead */
    const gb = new GB(0, 0, false); barrel(gb); spokes(gb, 8, 0.12, 0.07, 0.15); hub(gb, 0.35); c.setRGB(0.6, 0.6, 0.62); gb.geo(lathe([[0.84, 0.42], [1.0, 0.42], [1.0, 0.5], [0.84, 0.5]], 22), M.identity(), c, 0);
    c.setRGB(0.95, 0.95, 0.95); for (let i = 0; i < 16; i++) { const a = i * TAU / 16; M.compose(v.set(0.52, Math.sin(a) * 0.92, Math.cos(a) * 0.92), q.identity(), s.set(0.04, 0.035, 0.035)); gb.geo(cyl, M, c, 0); }
    out.rim.bead = gb.mesh(MAT.rim).geometry; }
  { const gb = new GB(0, 0, false); barrel(gb); spokes(gb, 18, 0.042, 0.04, 0.15); hub(gb, 0.45); out.rim.mesh = gb.mesh(MAT.rim).geometry; }
  { const gb = new GB(0, 0, false); barrel(gb); spokes(gb, 3, 0.4, 0.08, 0.15); hub(gb, 0.4); out.rim.tri = gb.mesh(MAT.rim).geometry; }
  { const gb = new GB(0, 0, false); barrel(gb); spokes(gb, 7, 0.14, 0.06, 0.15); hub(gb, 0.4); out.rim.seven = gb.mesh(MAT.rim).geometry; }
  { const gb = new GB(0, 0, false); barrel(gb); dish(gb, 0.92, 0.12, 0.3, 0.42); hub(gb, 0.35); for (let i = 0; i < 6; i++) { const a = i * TAU / 6; e.set(a, 0, 0); q.setFromEuler(e); const m2 = new THREE.Matrix4().compose(new THREE.Vector3(0.38, 0, 0), q, new THREE.Vector3(1, 1, 1)); const off = new THREE.Matrix4().compose(new THREE.Vector3(0, 0, 0.58), new THREE.Quaternion(), new THREE.Vector3(0.04, 0.12, 0.17)); c.setRGB(0.06, 0.06, 0.06); gb.geo(bx, m2.multiply(off), c, 0); } out.rim.steel = gb.mesh(MAT.rim).geometry; }
  { const gb = new GB(0, 0, false); barrel(gb); dish(gb, 0.97, 0.1, 0.36, 0.44); hub(gb, 0.25); for (let i = 0; i < 12; i++) { const a = i * TAU / 12; e.set(a, 0, 0); q.setFromEuler(e); const m2 = new THREE.Matrix4().compose(new THREE.Vector3(0.375, 0, 0), q, new THREE.Vector3(1, 1, 1)); const off = new THREE.Matrix4().compose(new THREE.Vector3(0, 0, 0.74), new THREE.Quaternion(), new THREE.Vector3(0.03, 0.05, 0.16)); c.setRGB(0.08, 0.08, 0.08); gb.geo(bx, m2.multiply(off), c, 0); } out.rim.disc = gb.mesh(MAT.rim).geometry; }
  return out;
}
function wheelsInit() {
  if (Wheels.ready) return; const geo = wheelGeos(), white = new THREE.Color(1, 1, 1); Wheels.geo = geo; Wheels.sets = {}; Wheels.group = new THREE.Group();
  const mk = (key, g, mat) => { const m = new THREE.InstancedMesh(g, mat, Wheels.cap); m.frustumCulled = false; m.castShadow = false; m.receiveShadow = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); if (mat === MAT.rim) { for (let i = 0; i < Wheels.cap; i++) m.setColorAt(i, white); m.instanceColor.setUsage(THREE.DynamicDrawUsage); } m.count = 0; Wheels.group.add(m); Wheels.sets[key] = { m, n: 0 }; };
  for (const k in geo.tire) mk('t:' + k, geo.tire[k], MAT.tire); for (const k in geo.rim) mk('r:' + k, geo.rim[k], MAT.rim);
  scene.add(Wheels.group); Wheels.ready = true;
}
function wheelsAdd(grp, S) { wheelsInit(); const b = S.b, rec = { obj: grp, S, roll: 0, tire: TIRE_RHO[b.tire] ? b.tire : 'std', rimKey: b.rimStyle || 'multi', col: new THREE.Color(...(b.rim || [0.6, 0.6, 0.64])), player: false }; Wheels.recs.push(rec); grp.userData.wrec = rec; return rec; }
function wheelsRemove(grp) { const r = grp.userData && grp.userData.wrec; if (!r) return; const i = Wheels.recs.indexOf(r); if (i >= 0) Wheels.recs.splice(i, 1); grp.userData.wrec = null; }
const _wm = new THREE.Matrix4(), _wl = new THREE.Matrix4(), _wq = new THREE.Quaternion(), _we = new THREE.Euler(), _wp = new THREE.Vector3(), _ws = new THREE.Vector3();
function updateWheels(dt) {
  if (!Wheels.ready) return;
  for (const k in Wheels.sets) Wheels.sets[k].n = 0;
  for (const rec of Wheels.recs) {
    const o = rec.obj; let vis = true; for (let q = o; q; q = q.parent) if (!q.visible) { vis = false; break; } if (!vis || !o.parent) continue; o.updateWorldMatrix(true, false);
    let v, steer = 0, brake = false; if (rec.player) { v = car.speed; steer = clamp(car.delta || 0, -0.6, 0.6); brake = (car.brk > 0.1 && !car.rev) || car.braking; } else { v = o.userData.v || 0; brake = !!o.userData.brake; steer = o.userData.steer || 0; }
    rec.roll = (rec.roll + v * dt / rec.S.wr) % TAU;
    const tail = o.userData.tail; if (tail) tail.material = brake ? MAT.carBrake : MAT.carTail;
    const ts = Wheels.sets['t:' + rec.tire], rs = Wheels.sets['r:' + rec.rimKey], rho = TIRE_RHO[rec.tire];
    for (const w of rec.S.wheels) {
      const left = w.side < 0; _we.set(left ? -rec.roll : rec.roll, (w.front ? steer : 0) + (left ? Math.PI : 0), 0, 'YXZ'); _wq.setFromEuler(_we);
      _wl.compose(_wp.set(w.x, w.r, w.z), _wq, _ws.set(w.w, w.r, w.r)); _wm.multiplyMatrices(o.matrixWorld, _wl); ts.m.setMatrixAt(ts.n++, _wm);
      _wl.compose(_wp, _wq, _ws.set(w.w, w.r * rho * 1.0, w.r * rho * 1.0)); _wm.multiplyMatrices(o.matrixWorld, _wl); rs.m.setColorAt(rs.n, rec.col); rs.m.setMatrixAt(rs.n++, _wm);
    }
  }
  for (const k in Wheels.sets) { const s = Wheels.sets[k]; s.m.count = s.n; s.m.instanceMatrix.needsUpdate = true; if (s.m.instanceColor) s.m.instanceColor.needsUpdate = true; }
}

/* ---------- a dune buggy: no body, a painted tube frame ----------
   An open space frame on a lifted long-travel chassis: the floor rails, a main hoop behind the seats, A-pillars and roof bars, a nose cone of tubes and a bumper,
   side bars, the rear stays over a flat-four engine with upswept exhaust, double wishbones and coilovers to every wheel, two bucket seats, a wheel and a dash,
   a light bar on the roof, round lamps on the nose and a spare tyre on the back. The tubes take the paint colour. Car-local: x right is -side, z forward, y up. */
function buggyFrame(S, gP, gG, gT, gD, gLt, tl, lod) {
  const seg = lod ? 5 : 8, cyl = ni(new THREE.CylinderGeometry(1, 1, 1, seg, 1)), box = ni(new THREE.BoxGeometry(1, 1, 1)), up = new THREE.Vector3(0, 1, 0), d = new THREE.Vector3(), m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  const col = (r, g, b) => _tcol.setRGB(r, g, b), WH = [1, 1, 1];
  const tube = (gb, a, b, r, c) => { d.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); const L = d.length(); q.setFromUnitVectors(up, d.normalize()); m.compose(_p3.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), q, _s3.set(r, L, r)); gb.geo(cyl, m, col(...(c || WH)), 0); };
  const path = (gb, P, r, c) => { for (let i = 0; i < P.length - 1; i++) tube(gb, P[i], P[i + 1], r, c); };
  const both = (fn) => { for (const sx of [-1, 1]) fn(sx); };
  const blk = (gb, x, y, z, sx, sy, sz, c, rx, ry, rz) => { e.set(rx || 0, ry || 0, rz || 0, 'YXZ'); q.setFromEuler(e); m.compose(_p3.set(x, y, z), q, _s3.set(sx, sy, sz)); gb.geo(box, m, col(...c), 0); };
  const R = 0.024, R2 = 0.03, DK = [0.035, 0.035, 0.04], MET = [0.5, 0.52, 0.55], ST = [0.75, 0.62, 0.1];
  const zF = S.wheels.find((w) => w.front).z, zR = S.wheels.find((w) => !w.front).z, xW = Math.abs(S.wheels[0].x), yH = S.wr;   /* hub positions */
  /* the frame */
  both((sx) => {
    path(gP, [[sx * 0.48, 0.62, -0.95], [sx * 0.5, 0.6, -0.55], [sx * 0.5, 0.6, 0.6], [sx * 0.3, 0.66, 1.42]], R2);           /* floor rail into the nose */
    path(gP, [[sx * 0.52, 0.6, -0.55], [sx * 0.5, 1.5, -0.55], [sx * 0.38, 1.72, -0.55]], R2);                              /* main hoop */
    path(gP, [[sx * 0.52, 0.96, 0.58], [sx * 0.42, 1.66, 0.04], [sx * 0.38, 1.72, -0.55]], R2);                             /* A-pillar and roof bar */
    path(gP, [[sx * 0.5, 0.6, 0.6], [sx * 0.52, 0.96, 0.58], [sx * 0.3, 0.88, 1.42], [sx * 0.3, 0.66, 1.42]], R);            /* cowl and nose */
    tube(gP, [sx * 0.54, 0.92, -0.55], [sx * 0.54, 0.92, 0.58], R); tube(gP, [sx * 0.53, 0.62, -0.5], [sx * 0.54, 0.92, 0.5], R);   /* side bar and its diagonal */
    path(gP, [[sx * 0.38, 1.72, -0.55], [sx * 0.4, 1.08, -1.55]], R2); path(gP, [[sx * 0.48, 0.62, -0.95], [sx * 0.4, 0.72, -1.55], [sx * 0.4, 1.08, -1.55]], R);   /* rear stays and rear frame */
    tube(gP, [sx * 0.5, 1.4, -0.55], [sx * 0.4, 1.08, -1.2], R);                                                           /* engine-bay brace */
    tube(gP, [sx * 0.3, 0.88, 1.42], [sx * 0.42, 0.66, 1.66], R); tube(gP, [sx * 0.3, 0.66, 1.42], [sx * 0.42, 0.62, 1.66], R);   /* bumper horns */
  });
  for (const [y, z, w] of [[1.72, -0.55, 0.38], [1.66, 0.04, 0.42], [0.96, 0.58, 0.52], [0.6, 0.6, 0.5], [0.6, -0.55, 0.5], [0.88, 1.42, 0.3], [0.66, 1.42, 0.3], [1.08, -1.55, 0.4], [0.72, -1.55, 0.4], [1.5, -0.55, 0.5]]) tube(gP, [-w, y, z], [w, y, z], R);
  tube(gP, [-0.44, 0.64, 1.66], [0.44, 0.64, 1.66], R2); tube(gP, [-0.38, 1.72, -0.55], [0.5, 1.5, -0.55], R);                 /* front bumper; harness bar diagonal in the main hoop */
  tube(gP, [-0.42, 1.66, 0.04], [0.38, 1.72, -0.55], R);                                                                   /* roof X */
  /* floor pan, nose panel, dash, seats, steering */
  blk(gD, 0, 0.6, 0.02, 1.0, 0.025, 1.15, DK);
  blk(gP, 0, 0.93, 1.0, 0.62, 0.02, 0.82, WH, -0.1); blk(gD, 0, 0.98, 0.56, 0.98, 0.16, 0.06, DK);
  blk(gG, -0.26, 1.02, 0.52, 0.22, 0.08, 0.02, [0.5, 0.55, 0.6]);                                                          /* gauge glass */
  both((sx) => { const x = sx * 0.26, SEAT = [0.06, 0.06, 0.07], BOL = [0.5, 0.05, 0.04];
    blk(gD, x, 0.7, -0.22, 0.42, 0.1, 0.46, SEAT); blk(gD, x, 1.05, -0.47, 0.42, 0.68, 0.1, SEAT, -0.18);
    for (const bx of [-1, 1]) { blk(gD, x + bx * 0.2, 1.0, -0.42, 0.05, 0.62, 0.16, BOL, -0.18); blk(gD, x + bx * 0.2, 0.78, -0.2, 0.05, 0.14, 0.42, BOL); }
    blk(gD, x, 1.33, -0.5, 0.2, 0.18, 0.08, SEAT, -0.18); });
  tube(gD, [-0.26, 0.98, 0.56], [-0.26, 1.12, 0.28], 0.018, MET);
  { const tor = ni(new THREE.TorusGeometry(0.17, 0.018, 6, 18)); e.set(-0.95, 0, 0); q.setFromEuler(e); m.compose(_p3.set(-0.26, 1.13, 0.26), q, _s3.set(1, 1, 1)); gD.geo(tor, m, col(0.02, 0.02, 0.025), 0); tor.dispose(); }
  /* the engine out back: a flat-four block, heads, a pod air filter and two upswept pipes with megaphone tips */
  blk(gT, 0, 0.9, -1.22, 0.62, 0.32, 0.5, MET); both((sx) => blk(gT, sx * 0.36, 0.86, -1.22, 0.12, 0.2, 0.42, [0.32, 0.33, 0.35])); blk(gT, 0, 1.08, -1.18, 0.42, 0.06, 0.3, [0.05, 0.05, 0.055]);
  tube(gT, [0, 1.12, -1.15], [0, 1.28, -1.12], 0.1, [0.75, 0.08, 0.06]); tube(gT, [0, 1.12, -0.98], [0, 1.18, -0.92], 0.03, MET);
  both((sx) => { path(gT, [[sx * 0.2, 0.82, -1.45], [sx * 0.22, 0.95, -1.62], [sx * 0.24, 1.32, -1.72]], 0.032, [0.55, 0.52, 0.48]); tube(gT, [sx * 0.24, 1.3, -1.72], [sx * 0.25, 1.46, -1.76], 0.055, [0.65, 0.62, 0.58]); });
  /* suspension: double wishbones to the front hubs, trailing arms at the back, a coilover to every corner */
  both((sx) => {
    for (const [y0, yH2] of [[0.66, yH - 0.08], [0.88, yH + 0.12]]) { tube(gD, [sx * 0.3, y0, zF - 0.2], [sx * (xW - 0.12), yH2, zF], 0.02, DK); tube(gD, [sx * 0.3, y0, zF + 0.12], [sx * (xW - 0.12), yH2, zF], 0.02, DK); }
    tube(gD, [sx * 0.48, 0.66, -0.4], [sx * (xW - 0.12), yH - 0.04, zR], 0.03, DK); tube(gD, [sx * 0.48, 0.92, -0.45], [sx * (xW - 0.12), yH + 0.12, zR], 0.022, DK);
    tube(gD, [sx * (xW - 0.12), yH - 0.12, zF], [sx * (xW - 0.12), yH + 0.16, zF], 0.04, MET); tube(gD, [sx * (xW - 0.12), yH - 0.12, zR], [sx * (xW - 0.12), yH + 0.16, zR], 0.04, MET);   /* uprights */
    for (const [top, bot] of [[[sx * 0.4, 1.32, zF - 0.1], [sx * (xW - 0.2), yH + 0.02, zF]], [[sx * 0.42, 1.42, zR + 0.32], [sx * (xW - 0.2), yH + 0.06, zR + 0.05]]]) {
      tube(gT, top, bot, 0.026, [0.7, 0.72, 0.75]); const mid = [(top[0] + bot[0]) / 2, (top[1] + bot[1]) / 2, (top[2] + bot[2]) / 2], a = [lerp(top[0], bot[0], 0.25), lerp(top[1], bot[1], 0.25), lerp(top[2], bot[2], 0.25)];
      tube(gT, a, mid, 0.055, ST); tube(gT, top, a, 0.04, [0.12, 0.12, 0.13]); }   /* coilover: shaft, spring, remote body */
    tube(gP, [sx * 0.42, 0.96, 0.58], [sx * 0.4, 1.32, zF - 0.1], R);   /* shock tower */
  });
  /* lamps: a light bar on the roof, a pair of round lamps on the nose, small tail lamps; a spare on the back */
  blk(gD, 0, 1.8, -0.5, 0.92, 0.1, 0.1, DK); for (let k = 0; k < 4; k++) blk(gLt, -0.33 + k * 0.22, 1.8, -0.448, 0.17, 0.07, 0.01, WH);
  both((sx) => { const lamp = ni(new THREE.CylinderGeometry(0.075, 0.085, 0.09, 14)); lamp.rotateX(Math.PI / 2); m.compose(_p3.set(sx * 0.2, 0.98, 1.4), q.identity(), _s3.set(1, 1, 1)); gD.geo(lamp, m, col(0.04, 0.04, 0.045), 0);
    const lens = ni(new THREE.CylinderGeometry(0.066, 0.066, 0.01, 14)); lens.rotateX(Math.PI / 2); m.compose(_p3.set(sx * 0.2, 0.98, 1.448), q.identity(), _s3.set(1, 1, 1)); gLt.geo(lens, m, col(1, 1, 1), 0); lamp.dispose(); lens.dispose();
    blk(tl, sx * 0.36, 1.08, -1.58, 0.1, 0.06, 0.02, WH); });
  { const sp = ni(new THREE.CylinderGeometry(0.4, 0.4, 0.24, 16)), hb = ni(new THREE.CylinderGeometry(0.24, 0.24, 0.25, 12)); e.set(-1.2, 0, Math.PI / 2, 'YXZ'); e.set(1.15, 0, 0, 'YXZ'); q.setFromEuler(e);
    m.compose(_p3.set(0, 1.38, -1.5), q, _s3.set(1, 1, 1)); gD.geo(sp, m, col(0.03, 0.03, 0.033), 0); m.compose(_p3.set(0, 1.38, -1.5), q, _s3.set(1.02, 1.02, 1.02)); gT.geo(hb, m, col(0.7, 0.7, 0.72), 0); sp.dispose(); hb.dispose(); }
  cyl.dispose(); box.dispose();
}
/* ---------- hand-built cars: a kit of parts, then one builder per car ----------
   For cars whose shape is not a body shell over four wheels (the buggy above, a monster truck, a hot rod, an open-wheel racer) the model is assembled from
   tubes, blocks, balls and lofted shells. A loft is a run of superellipse rings along z ({ z, x, y, a half width, b half height, e exponent }) with smooth
   normals, for noses, cabs, sidepods and fenders. Colours are linear; paint parts go in gP with white so the paint colour shows. */
function carKit(lod) {
  const seg = lod ? 6 : 12, cyl = ni(new THREE.CylinderGeometry(1, 1, 1, seg, 1)), box = ni(new THREE.BoxGeometry(1, 1, 1)), sph = ni(new THREE.SphereGeometry(1, seg, Math.max(4, seg >> 1)));
  const up = new THREE.Vector3(0, 1, 0), d = new THREE.Vector3(), m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  const col = (c) => _tcol.setRGB(c[0], c[1], c[2]);
  const K = {
    seg, WH: [1, 1, 1],
    tube(gb, a, b, r, c) { d.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); const L = d.length(); if (L < 1e-5) return; q.setFromUnitVectors(up, d.normalize()); m.compose(_p3.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), q, _s3.set(r, L, r)); gb.geo(cyl, m, col(c || K.WH), 0); },
    path(gb, P, r, c) { for (let i = 0; i < P.length - 1; i++) K.tube(gb, P[i], P[i + 1], r, c); },
    blk(gb, x, y, z, sx, sy, sz, c, rx, ry, rz) { e.set(rx || 0, ry || 0, rz || 0, 'YXZ'); q.setFromEuler(e); m.compose(_p3.set(x, y, z), q, _s3.set(sx, sy, sz)); gb.geo(box, m, col(c), 0); },
    ball(gb, x, y, z, rx, ry, rz, c) { m.compose(_p3.set(x, y, z), q.identity(), _s3.set(rx, ry, rz)); gb.geo(sph, m, col(c), 0); },
    /* a cylinder of radius r and length len whose axis is x (ax 'x'), y or z */
    drum(gb, x, y, z, r, len, c, ax) { e.set(ax === 'z' ? Math.PI / 2 : 0, 0, ax === 'x' ? Math.PI / 2 : 0); q.setFromEuler(e); m.compose(_p3.set(x, y, z), q, _s3.set(r, len, r)); gb.geo(cyl, m, col(c), 0); },
    loft(gb, rings, c, o) {
      o = o || {}; const n = o.seg || seg * 2, tA = o.tA != null ? o.tA : 0, tB = o.tB != null ? o.tB : TAU, full = o.tB == null, cols = full ? n : n + 1, P = [], cc = col(c).clone();
      for (const r of rings) { const row = [], k = 2 / (r.e || 2); for (let s = 0; s < cols; s++) { const t = tA + (tB - tA) * s / n, cs = Math.cos(t), sn = Math.sin(t); row.push([(r.x || 0) + r.a * Math.sign(cs) * Math.pow(Math.abs(cs), k), r.y + r.b * Math.sign(sn) * Math.pow(Math.abs(sn), k), r.z]); } P.push(row); }
      const at = (j, s) => P[Math.max(0, Math.min(P.length - 1, j))][full ? (s + cols) % cols : Math.max(0, Math.min(cols - 1, s))];
      const N = P.map((row, j) => row.map((p, s) => { const a = at(j, s + 1), b = at(j, s - 1), f = at(j + 1, s), g = at(j - 1, s); const u = [a[0] - b[0], a[1] - b[1], a[2] - b[2]], v = [f[0] - g[0], f[1] - g[1], f[2] - g[2]];
        let nx = u[1] * v[2] - u[2] * v[1], ny = u[2] * v[0] - u[0] * v[2], nz = u[0] * v[1] - u[1] * v[0]; const r = rings[j], ox = p[0] - (r.x || 0), oy = p[1] - r.y; if (nx * ox + ny * oy < 0) { nx = -nx; ny = -ny; nz = -nz; } const l = Math.hypot(nx, ny, nz) || 1; return [nx / l, ny / l, nz / l]; }));
      const V = (j, s) => { const p = P[j][s % cols], nn = N[j][s % cols]; return [p[0], p[1], p[2], nn[0], nn[1], nn[2]]; };
      const tri = (A, B, C) => { const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2], vx = C[0] - A[0], vy = C[1] - A[1], vz = C[2] - A[2], fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
        const L = (fx * (A[3] + B[3] + C[3]) + fy * (A[4] + B[4] + C[4]) + fz * (A[5] + B[5] + C[5])) < 0 ? [A, C, B] : [A, B, C]; for (const W of L) gb.vtx(W[0], W[1], W[2], W[3], W[4], W[5], cc.r, cc.g, cc.b); };
      for (let j = 0; j < P.length - 1; j++) for (let s = 0; s < n; s++) { const a = V(j, s), b = V(j, s + 1), f = V(j + 1, s), g = V(j + 1, s + 1); tri(a, b, g); tri(a, g, f); }
      if (o.cap) for (const j of [0, P.length - 1]) { if (!o.cap[j ? 1 : 0]) continue; const r = rings[j], dz = j === 0 ? Math.sign(rings[0].z - rings[1].z) : Math.sign(rings[j].z - rings[j - 1].z), C0 = [r.x || 0, r.y, r.z, 0, 0, dz];
        for (let s = 0; s < n; s++) { const a = P[j][s % cols], b = P[j][(s + 1) % cols]; tri(C0, [a[0], a[1], a[2], 0, 0, dz], [b[0], b[1], b[2], 0, 0, dz]); } }
    },
    /* an arc of sheet metal round a wheel (a fender): from angle a0 to a1 about the axle at (x, y, z), radius r, width w */
    arc(gb, x, y, z, r, w, a0, a1, c) { const g = ni(new THREE.CylinderGeometry(r, r, w, seg * 2, 1, true, a0, a1 - a0)); g.rotateZ(Math.PI / 2); m.compose(_p3.set(x, y, z), q.identity(), _s3.set(1, 1, 1)); gb.geo(g, m, col(c), 0); const g2 = flipGeo(ni(new THREE.CylinderGeometry(r - 0.012, r - 0.012, w, seg * 2, 1, true, a0, a1 - a0))); g2.rotateZ(Math.PI / 2); gb.geo(g2, m, col(c), 0);   /* the inside face sits a little in, so the two never fight */ g.dispose(); g2.dispose(); },
    done() { cyl.dispose(); box.dispose(); sph.dispose(); }
  };
  return K;
}

/* a monster truck: a pickup shell perched two metres up on a tube chassis, four-link solid axles, two shocks a corner, knobby tyres taller than a person */
function monsterTruck(S, gP, gG, gT, gD, gLt, tl, lod) {
  const K = carKit(lod), DK = [0.03, 0.03, 0.035], CHR = [0.75, 0.76, 0.78], RED = [0.6, 0.04, 0.03], STL = [0.18, 0.19, 0.2], GL = [1, 1, 1];
  const zF = S.wheels.find((w) => w.front).z, zR = S.wheels.find((w) => !w.front).z, xW = Math.abs(S.wheels[0].x), yA = S.wr;
  /* chassis: two rails, a hoop at each axle, cross members, bumpers */
  for (const sx of [-1, 1]) { K.path(gD, [[sx * 0.45, 1.25, -2.35], [sx * 0.45, 1.15, -1.0], [sx * 0.45, 1.15, 1.0], [sx * 0.45, 1.25, 2.35]], 0.055, STL); }
  for (const z of [-2.35, zR, -0.4, 0.6, zF, 2.35]) K.tube(gD, [-0.45, 1.18, z], [0.45, 1.18, z], 0.045, STL);
  for (const z of [zF, zR]) K.path(gD, [[-0.45, 1.18, z], [-0.62, 1.95, z], [0.62, 1.95, z], [0.45, 1.18, z]], 0.045, STL);
  for (const z of [2.45, -2.45]) { K.tube(gT, [-1.0, 1.3, z], [1.0, 1.3, z], 0.07, CHR); for (const sx of [-1, 1]) K.tube(gT, [sx * 0.45, 1.25, z * 0.96], [sx * 0.8, 1.3, z], 0.05, CHR); }
  /* axles with a differential, four links each, and two shocks plus a bump stop per corner */
  for (const [z, sg] of [[zF, 1], [zR, -1]]) {
    K.drum(gD, 0, yA, z, 0.085, 2 * xW - 0.3, DK, 'x'); K.ball(gD, 0.08, yA, z, 0.26, 0.24, 0.24, DK); K.drum(gT, 0.08, yA, z + sg * 0.22, 0.09, 0.14, CHR, 'z');
    for (const sx of [-1, 1]) {
      for (const [y0, x0] of [[yA - 0.05, 0.6], [yA + 0.2, 0.3]]) K.tube(gT, [sx * x0, y0, z], [sx * 0.45, 1.18, z - sg * 1.05], 0.035, CHR);
      for (const dx of [0.62, 0.84]) { const a = [sx * dx, yA + 0.1, z + (dx > 0.7 ? 0.15 : -0.15) * sg], b = [sx * (dx - 0.18), 1.95, z + (dx > 0.7 ? 0.1 : -0.1) * sg]; K.tube(gT, a, b, 0.045, CHR); K.tube(gT, [lerp(a[0], b[0], 0.15), lerp(a[1], b[1], 0.15), lerp(a[2], b[2], 0.15)], [lerp(a[0], b[0], 0.6), lerp(a[1], b[1], 0.6), lerp(a[2], b[2], 0.6)], 0.085, RED); K.tube(gT, [lerp(a[0], b[0], 0.62), lerp(a[1], b[1], 0.62), lerp(a[2], b[2], 0.62)], b, 0.06, [0.12, 0.12, 0.13]); }
    }
  }
  K.ball(gD, 0, 1.35, 0.9, 0.42, 0.3, 0.55, [0.25, 0.26, 0.28]); K.drum(gT, 0, 1.35, 0.35, 0.22, 0.4, [0.5, 0.05, 0.04], 'z');   /* the engine and its transmission */
  /* the shell: a pickup, boxy with rounded edges, floating over it all (base 1.85) */
  const yB = 1.85, rg = (z, top, a, e) => ({ z, x: 0, y: (yB + top) / 2, a, b: (top - yB) / 2, e: e || 5 });
  K.loft(gP, [rg(2.48, 2.3, 1.12, 4), rg(2.4, 2.45, 1.22), rg(1.8, 2.5, 1.24), rg(0.75, 2.56, 1.24), rg(0.62, 2.6, 1.2), rg(0.2, 3.08, 1.12), rg(-0.62, 3.1, 1.12), rg(-0.72, 2.64, 1.22), rg(-0.78, 2.52, 1.24), rg(-2.38, 2.52, 1.24), rg(-2.46, 2.4, 1.14, 4)], K.WH, { seg: lod ? 12 : 20, cap: [1, 1] });
  K.blk(gD, 0, 2.53, -1.55, 2.2, 0.03, 1.5, [0.04, 0.04, 0.045]);                                                        /* bed cover */
  K.blk(gG, 0, 2.86, 0.45, 2.02, 0.5, 0.05, GL, -0.86); K.blk(gG, 0, 2.86, -0.66, 1.9, 0.38, 0.04, GL, 0.25);           /* windscreen, back light */
  for (const sx of [-1, 1]) K.blk(gG, sx * 1.135, 2.82, -0.2, 0.03, 0.38, 0.62, GL);                                     /* side windows */
  K.blk(gD, 0, 2.18, 2.49, 1.5, 0.36, 0.04, DK); for (let k = 0; k < 4; k++) K.blk(gT, 0, 2.05 + k * 0.09, 2.51, 1.42, 0.025, 0.02, CHR);   /* grille */
  for (const sx of [-1, 1]) { K.blk(gLt, sx * 0.92, 2.25, 2.5, 0.3, 0.14, 0.02, GL); K.blk(tl, sx * 1.1, 2.3, -2.47, 0.14, 0.24, 0.02, GL); K.path(gT, [[sx * 0.85, 2.4, -0.8], [sx * 0.85, 3.45, -0.8]], 0.07, CHR); K.drum(gT, sx * 0.85, 3.5, -0.8, 0.09, 0.12, [0.1, 0.1, 0.1], 'y'); }   /* lamps, stacks */
  K.blk(gD, 0, 3.17, 0.05, 1.7, 0.1, 0.14, DK); for (let k = 0; k < 6; k++) K.blk(gLt, -0.7 + k * 0.28, 3.17, 0.125, 0.2, 0.07, 0.01, GL);   /* roof light bar */
  K.done();
}

/* a hot rod: a chopped, channelled roadster-coupe on exposed rails, a blown V8 standing out of where the bonnet would be, zoomie headers, a dropped I-beam
   front axle on a transverse leaf, cycle fenders over skinny front tyres and fat rear tyres under the body's rear wings */
function hotRod(S, gP, gG, gT, gD, gLt, tl, lod) {
  const K = carKit(lod), DK = [0.025, 0.025, 0.03], CHR = [0.82, 0.83, 0.85], BLK = [0.02, 0.02, 0.022], RED = [0.45, 0.03, 0.03], GL = [1, 1, 1];
  const wf = S.wheels.find((w) => w.front), wr = S.wheels.find((w) => !w.front), xR = Math.abs(wr.x), xF = Math.abs(wf.x);
  /* frame rails, kicked up over the rear axle */
  for (const sx of [-1, 1]) K.path(gD, [[sx * 0.36, 0.42, -1.95], [sx * 0.36, 0.55, wr.z], [sx * 0.38, 0.32, -0.6], [sx * 0.36, 0.3, 1.0], [sx * 0.3, 0.32, wf.z + 0.15]], 0.04, DK);
  /* body: the tub and a chopped top with narrow glass */
  K.loft(gP, [{ z: -1.92, y: 0.68, a: 0.62, b: 0.22, e: 3 }, { z: -1.8, y: 0.68, a: 0.72, b: 0.3, e: 3.5 }, { z: -0.8, y: 0.68, a: 0.76, b: 0.32, e: 4 }, { z: 0.15, y: 0.7, a: 0.74, b: 0.3, e: 4 }, { z: 0.32, y: 0.74, a: 0.62, b: 0.26, e: 3.5 }], K.WH, { seg: lod ? 12 : 22, cap: [1, 1] });
  K.loft(gP, [{ z: -1.25, y: 1.12, a: 0.6, b: 0.14, e: 5 }, { z: -1.12, y: 1.16, a: 0.64, b: 0.18, e: 5 }, { z: -0.1, y: 1.16, a: 0.64, b: 0.18, e: 5 }, { z: 0.02, y: 1.08, a: 0.62, b: 0.1, e: 5 }], K.WH, { seg: lod ? 10 : 18, cap: [1, 1] });
  for (const sx of [-1, 1]) { K.blk(gG, sx * 0.645, 1.15, -0.62, 0.02, 0.13, 0.86, GL); K.blk(gP, sx * 0.65, 1.15, -0.16, 0.035, 0.18, 0.06, K.WH);
    K.blk(gT, sx * 0.765, 0.9, -0.82, 0.012, 0.025, 2.1, CHR); for (const z of [-0.95, 0.05]) K.blk(gD, sx * 0.768, 0.66, z, 0.008, 0.48, 0.012, DK); K.blk(gT, sx * 0.77, 0.82, -0.82, 0.02, 0.025, 0.1, CHR); }   /* belt-line strip, door cuts, handle */
  K.blk(gG, 0, 1.13, 0.06, 1.1, 0.12, 0.03, GL, -0.35); K.blk(gG, 0, 1.15, -1.22, 1.0, 0.1, 0.03, GL, 0.3);
  /* rear wings over the fat tyres, cycle fenders over the skinny fronts, running boards between */
  for (const sx of [-1, 1]) { K.arc(gP, sx * xR, wr.r, wr.z, wr.r + 0.1, wr.w + 0.12, Math.PI * 0.05, Math.PI * 0.98, K.WH); K.arc(gP, sx * xF, wf.r, wf.z, wf.r + 0.07, wf.w + 0.08, Math.PI * 0.25, Math.PI * 0.85, K.WH);
    K.tube(gD, [sx * (xF - 0.05), wf.r + 0.05, wf.z], [sx * 0.4, 0.62, wf.z - 0.1], 0.018, CHR); K.blk(gD, sx * 0.82, 0.38, -0.4, 0.22, 0.03, 1.2, BLK); }
  /* the engine: block, chrome valve covers, a blower with its belt, two carbs and a scoop, zoomie headers */
  const zE = 0.9; K.blk(gD, 0, 0.62, zE, 0.5, 0.36, 0.62, RED); for (const sx of [-1, 1]) { K.blk(gT, sx * 0.24, 0.84, zE, 0.14, 0.12, 0.62, CHR, 0, 0, sx * 0.55); for (let k = 0; k < 4; k++) { const z = zE - 0.24 + k * 0.16; K.path(gT, [[sx * 0.3, 0.68, z], [sx * 0.46, 0.62, z - 0.05], [sx * 0.6, 0.78, z - 0.25]], 0.024, CHR); } }
  K.blk(gT, 0, 1.0, zE, 0.3, 0.2, 0.62, CHR); for (let k = 0; k < 8; k++) K.blk(gT, 0, 1.11, zE - 0.27 + k * 0.077, 0.32, 0.02, 0.025, [0.6, 0.6, 0.62]);
  K.drum(gT, 0, 1.0, zE + 0.4, 0.08, 0.06, CHR, 'z'); K.drum(gT, 0, 0.62, zE + 0.4, 0.09, 0.06, CHR, 'z'); K.blk(gD, 0, 0.81, zE + 0.43, 0.06, 0.42, 0.04, BLK);
  for (const dz of [-0.14, 0.14]) K.drum(gT, 0, 1.2, zE + dz, 0.07, 0.18, CHR, 'y'); K.blk(gD, 0, 1.36, zE + 0.05, 0.22, 0.14, 0.52, BLK, -0.1);   /* carbs and the scoop */
  /* the grille shell and radiator, bucket headlamps on stalks */
  K.loft(gT, [{ z: zE + 0.62, y: 0.78, a: 0.27, b: 0.34, e: 3 }, { z: zE + 0.66, y: 0.78, a: 0.27, b: 0.34, e: 3 }], CHR, { cap: [0, 1] }); K.blk(gD, 0, 0.78, zE + 0.665, 0.42, 0.56, 0.02, DK);
  for (let k = 0; k < 9; k++) K.blk(gT, -0.2 + k * 0.05, 0.78, zE + 0.672, 0.008, 0.52, 0.01, [0.5, 0.5, 0.52]);
  for (const sx of [-1, 1]) { K.tube(gT, [sx * 0.26, 0.6, zE + 0.6], [sx * 0.46, 0.84, zE + 0.62], 0.02, CHR); K.ball(gT, sx * 0.48, 0.9, zE + 0.6, 0.12, 0.12, 0.12, CHR); K.drum(gLt, sx * 0.48, 0.9, zE + 0.705, 0.1, 0.01, GL, 'z'); }
  /* front axle: dropped I-beam, transverse leaf, hairpins, shocks */
  K.path(gD, [[-xF + 0.06, wf.r, wf.z], [-0.4, wf.r - 0.08, wf.z], [0.4, wf.r - 0.08, wf.z], [xF - 0.06, wf.r, wf.z]], 0.04, CHR); K.blk(gD, 0, 0.42, wf.z + 0.06, 0.8, 0.04, 0.07, BLK);
  for (const sx of [-1, 1]) { K.path(gT, [[sx * 0.42, wf.r - 0.06, wf.z], [sx * 0.34, 0.3, wf.z - 0.9]], 0.02, CHR); K.tube(gT, [sx * 0.5, wf.r, wf.z - 0.05], [sx * 0.34, 0.62, wf.z - 0.12], 0.03, CHR); }
  /* rear: quick-change diff, axle, roll pan, tail lamps, exhaust */
  K.drum(gD, 0, wr.r, wr.z, 0.07, 2 * xR - 0.3, DK, 'x'); K.ball(gT, 0, wr.r, wr.z, 0.18, 0.17, 0.2, CHR); K.blk(gT, 0, wr.r, wr.z - 0.2, 0.2, 0.16, 0.08, CHR);
  for (const sx of [-1, 1]) { K.drum(gD, sx * 0.42, 0.62, -1.96, 0.065, 0.04, DK, 'z'); K.drum(tl, sx * 0.42, 0.62, -1.985, 0.052, 0.01, GL, 'z'); }
  /* inside: tuck-and-roll seat, a chrome steering wheel */
  K.blk(gD, 0, 0.88, -0.55, 1.0, 0.32, 0.12, [0.32, 0.02, 0.02], -0.2); K.blk(gD, 0, 0.66, -0.35, 1.0, 0.12, 0.42, [0.32, 0.02, 0.02]);
  { const tor = ni(new THREE.TorusGeometry(0.16, 0.014, 6, 20)); _q.setFromEuler(new THREE.Euler(-0.9, 0, 0)); _m4.compose(_p3.set(-0.28, 1.0, 0.0), _q, _s3.set(1, 1, 1)); gT.geo(tor, _m4, _tcol.setRGB(...CHR), 0); tor.dispose(); }
  K.done();
}

/* an open-wheel single seater: a carbon tub and needle nose, sidepods, an airbox over the driver's head, a halo, front and rear wings, a flat floor and
   diffuser, pushrod wishbones to each corner. The bodywork takes the paint; carbon parts are dark */
function formulaCar(S, gP, gG, gT, gD, gLt, tl, lod) {
  const K = carKit(lod), CF = [0.02, 0.02, 0.024], TI = [0.3, 0.31, 0.33], GL = [1, 1, 1], WHT = [0.85, 0.85, 0.86];
  const wf = S.wheels.find((w) => w.front), wr = S.wheels.find((w) => !w.front), xF = Math.abs(wf.x), xR = Math.abs(wr.x), sg = lod ? 12 : 22;
  /* nose, tub and engine cover in one loft */
  K.loft(gP, [{ z: 2.42, y: 0.3, a: 0.05, b: 0.035, e: 2.2 }, { z: 2.3, y: 0.31, a: 0.1, b: 0.07, e: 2.4 }, { z: 1.8, y: 0.34, a: 0.16, b: 0.11, e: 2.6 }, { z: 1.1, y: 0.4, a: 0.25, b: 0.18, e: 2.8 }, { z: 0.55, y: 0.44, a: 0.33, b: 0.23, e: 3 }, { z: -0.1, y: 0.46, a: 0.4, b: 0.27, e: 3.2 }, { z: -0.8, y: 0.48, a: 0.36, b: 0.3, e: 3 }, { z: -1.45, y: 0.44, a: 0.22, b: 0.24, e: 2.6 }, { z: -1.95, y: 0.4, a: 0.1, b: 0.13, e: 2.4 }, { z: -2.05, y: 0.4, a: 0.05, b: 0.07, e: 2.2 }], K.WH, { seg: sg, cap: [1, 1] });
  K.loft(gD, [{ z: 0.72, y: 0.69, a: 0.22, b: 0.025, e: 3 }, { z: 0.2, y: 0.71, a: 0.27, b: 0.025, e: 3 }, { z: -0.05, y: 0.71, a: 0.24, b: 0.025, e: 3 }], CF, { seg: sg, cap: [1, 1] });   /* the cockpit opening */
  K.ball(gT, 0, 0.8, 0.12, 0.13, 0.14, 0.15, WHT); K.blk(gT, 0, 0.84, 0.12, 0.27, 0.035, 0.2, [0.55, 0.04, 0.03]);   /* a white helmet with a red stripe */ K.blk(gG, 0, 0.82, 0.24, 0.2, 0.06, 0.04, GL, -0.25);                  /* helmet and visor */
  /* airbox and roll hoop, a shark fin down the engine cover */
  K.loft(gP, [{ z: -0.02, y: 0.96, a: 0.11, b: 0.12, e: 2.6 }, { z: -0.12, y: 0.95, a: 0.13, b: 0.14, e: 2.6 }, { z: -0.6, y: 0.8, a: 0.15, b: 0.16, e: 2.6 }, { z: -1.2, y: 0.62, a: 0.12, b: 0.1, e: 2.4 }], K.WH, { seg: sg, cap: [0, 0] });
  K.drum(gD, 0, 0.96, -0.015, 0.1, 0.01, CF, 'z'); K.blk(gP, 0, 0.84, -1.2, 0.02, 0.26, 0.9, K.WH, 0.18);
  /* halo */
  K.path(gD, [[0, 0.66, 0.72], [0, 0.88, 0.55], [0.2, 0.9, 0.42], [0.29, 0.88, 0.2], [0.31, 0.84, 0.0], [0.33, 0.66, -0.12]], 0.022, TI); K.path(gD, [[0.2, 0.9, 0.42], [-0.2, 0.9, 0.42], [-0.29, 0.88, 0.2], [-0.31, 0.84, 0.0], [-0.33, 0.66, -0.12]], 0.022, TI);
  /* sidepods with dark intakes, mirrors */
  for (const sx of [-1, 1]) {
    K.loft(gP, [{ z: 0.32, x: sx * 0.6, y: 0.4, a: 0.16, b: 0.16, e: 3 }, { z: 0.15, x: sx * 0.62, y: 0.38, a: 0.2, b: 0.19, e: 3.2 }, { z: -0.5, x: sx * 0.58, y: 0.36, a: 0.2, b: 0.18, e: 3 }, { z: -1.15, x: sx * 0.44, y: 0.3, a: 0.12, b: 0.12, e: 2.6 }, { z: -1.5, x: sx * 0.34, y: 0.26, a: 0.05, b: 0.06, e: 2.4 }], K.WH, { seg: sg, cap: [0, 1] });
    K.loft(gD, [{ z: 0.33, x: sx * 0.6, y: 0.4, a: 0.14, b: 0.14, e: 3 }, { z: 0.31, x: sx * 0.6, y: 0.4, a: 0.135, b: 0.135, e: 3 }], CF, { cap: [1, 0] });
    K.tube(gD, [sx * 0.36, 0.62, 0.5], [sx * 0.5, 0.74, 0.52], 0.012, CF); K.blk(gP, sx * 0.52, 0.76, 0.52, 0.14, 0.07, 0.04, K.WH); K.blk(gG, sx * 0.52, 0.76, 0.497, 0.12, 0.05, 0.005, GL);
  }
  /* floor and diffuser, front and rear wings */
  K.blk(gD, 0, 0.06, -0.3, 1.5, 0.02, 2.4, CF); K.blk(gD, 0, 0.14, -1.72, 1.1, 0.02, 0.5, CF, -0.3); for (const fx of [-0.4, -0.15, 0.15, 0.4]) K.blk(gD, fx, 0.15, -1.72, 0.01, 0.16, 0.48, CF, -0.3);
  K.blk(gD, 0, 0.09, 2.22, 1.9, 0.02, 0.32, CF, 0.04); K.blk(gP, 0, 0.16, 2.08, 1.82, 0.015, 0.16, K.WH, 0.3); K.blk(gP, 0, 0.21, 1.98, 1.74, 0.012, 0.12, K.WH, 0.55);
  for (const sx of [-1, 1]) { K.blk(gP, sx * 0.96, 0.17, 2.18, 0.015, 0.22, 0.46, K.WH); K.blk(gLt, sx * 0.97, 0.25, 2.4, 0.012, 0.02, 0.06, GL); K.tube(gD, [sx * 0.08, 0.27, 2.0], [sx * 0.12, 0.1, 2.05], 0.012, CF); }
  for (const sx of [-1, 1]) K.blk(gP, sx * 0.5, 0.74, -1.9, 0.015, 0.56, 0.5, K.WH);
  K.blk(gD, 0, 0.92, -1.86, 1.0, 0.02, 0.3, CF, -0.12); K.blk(gP, 0, 0.99, -2.02, 1.0, 0.015, 0.16, K.WH, -0.45); K.blk(gD, 0, 0.6, -1.95, 1.0, 0.015, 0.16, CF, -0.2);
  K.tube(gD, [0, 0.44, -1.92], [0, 0.92, -1.86], 0.025, CF); K.blk(tl, 0, 0.34, -2.06, 0.08, 0.06, 0.01, GL);   /* wing pylon, rain light */
  /* suspension: upper and lower wishbones and a pushrod to each upright */
  for (const sx of [-1, 1]) for (const [w, x0, zs, zb] of [[wf, 0.22, wf.z - 0.25, wf.z + 0.2], [wr, 0.3, wr.z - 0.2, wr.z + 0.25]]) {
    const xh = (w.front ? xF : xR) - w.w / 2 - 0.04;
    for (const [y0, yh] of [[0.3, w.r - 0.1], [0.5, w.r + 0.12]]) { K.tube(gD, [sx * x0, y0, zs], [sx * xh, yh, w.z], 0.014, CF); K.tube(gD, [sx * x0, y0, zb], [sx * xh, yh, w.z], 0.014, CF); }
    K.tube(gD, [sx * (xh - 0.03), w.r - 0.08, w.z], [sx * x0, 0.56, w.z + (w.front ? 0.1 : -0.1)], 0.012, TI); K.drum(gD, sx * xh, w.r, w.z, 0.07, 0.16, TI, 'y');
  }
  K.done();
}
const CUSTOM_CARS = { buggy: buggyFrame, monster: monsterTruck, rod: hotRod, formula: formulaCar };

/* ---------- the car ---------- */
function buildCarModel(def, hex, opts) {
  opts = opts || {};
  const cs = opts.cos || null;
  const S = carSpec(def), b = S.b, hl = S.hl, hw = S.hw, y0 = S.y0, y1 = S.y1, wr = S.wr, C = S.C, lod = opts.lod ? 1 : 0, tww = S.tww;
  const gP = new GB(0, 0, false), gG = new GB(0, 0, false), gT = new GB(0, 0, false), gD = new GB(0, 0, false), gLt = new GB(0, 0, false), tl = new GB(0, 0, false);
  const DK = [0.03, 0.03, 0.034], CH = [0.62, 0.64, 0.68];
  if (b.custom || b.buggy) CUSTOM_CARS[b.custom || 'buggy'](S, gP, gG, gT, gD, gLt, tl, lod); else {
  loftBody(S, gP, gG, lod);
  const tbx = (x0, ya, z0, x1, yb, z1, k) => gT.box(Math.min(x0, x1), Math.min(ya, yb), Math.min(z0, z1), Math.max(x0, x1), Math.max(ya, yb), Math.max(z0, z1), k == null ? 0.03 : k, k == null ? 0.03 : k, k == null ? 0.034 : k);
  /* hollow body: dark chassis block seen through the wheel arches, plus a dark liner round each wheel */
  tbx(-(hw - 0.16), S.ySill - 0.04, -(hl - 0.5), hw - 0.16, y1 - 0.14, hl - 0.5, 0.025);
  for (const w of S.wheels) {
    const xi = Math.abs(w.x) - tww / 2 - 0.1, xo = hw - 0.015, lg = ni(new THREE.CylinderGeometry(S.Ra - 0.012, S.Ra - 0.012, xo - xi, 16, 1, true, 0, Math.PI)); lg.rotateZ(Math.PI / 2); flipGeo(lg);
    _m4.compose(_p3.set(w.side * (xi + xo) / 2, wr, w.z), _q.identity(), _s3.set(1, 1, 1)); gT.geo(lg, _m4, _tcol.setRGB(0.02, 0.02, 0.022), 0); lg.dispose();
  }
  /* ---- front / rear fascia decals ---- */
  const yN = samp(S.sil, hl - 0.05), yTl = samp(S.sil, -hl + 0.05), lw = b.lw || 0.4, lh = Math.max(b.lh || 0.13, 0.1), tlh = Math.max(b.tlh || 0.1, 0.08), xin = Math.min(0.42 * hw, hw - lw - 0.1);
  for (const sx of [-1, 1]) {
    pFront(S, gLt, 1, sx * xin, sx * (xin + lw), yN - 0.09 - lh, yN - 0.09, 0.006, [1, 1, 1], 7, 2, sx * 0.05);
    pFront(S, gD, 1, sx * (xin + 0.04), sx * (xin + lw - 0.04), yN - 0.09 - lh * 0.3 - 0.01, yN - 0.09 - lh * 0.3 + 0.012, 0.011, [0.55, 0.57, 0.6], 5, 1);
    if (b.tailBar) { if (sx > 0) pFront(S, tl, -1, -(hw - 0.2), hw - 0.2, yTl - 0.06 - tlh, yTl - 0.06, 0.006, [1, 1, 1], 12, 2); }
    else pFront(S, tl, -1, sx * (hw * 0.35), sx * (hw - 0.1), yTl - 0.07 - tlh, yTl - 0.07, 0.006, [1, 1, 1], 7, 2);
    /* lower intakes */ pFront(S, gD, 1, sx * hw * 0.52, sx * hw * 0.88, S.ySill + 0.12, yN - 0.09 - lh - 0.05, 0.005, DK, 5, 2);
  }
  pFront(S, gD, 1, -hw * 0.34, hw * 0.34, yN - 0.07 - Math.max(lh, 0.12), yN - 0.1, 0.007, DK, 8, 2);
  for (let k = 0; k < 2; k++) { const yy = yN - 0.12 - k * 0.045 - (Math.max(lh, 0.12) - 0.1) * 0.5; pFront(S, gD, 1, -hw * 0.32, hw * 0.32, yy - 0.006, yy + 0.006, 0.011, [0.55, 0.57, 0.6], 8, 1); }
  pFront(S, gD, 1, -hw * 0.28, hw * 0.28, S.ySill + 0.1, S.ySill + 0.2, 0.005, DK, 8, 1);
  pFront(S, gD, -1, -0.26, 0.26, S.ySill + 0.2, S.ySill + 0.33, 0.007, [0.92, 0.92, 0.88], 4, 1);
  pFront(S, gD, -1, -hw * 0.9, hw * 0.9, S.ySill + 0.05, S.ySill + 0.17, 0.004, DK, 10, 1);
  /* ---- door cuts, handles, side trim ---- */
  const doorZ = [S.zFB - 0.36, S.bpil != null ? S.bpil : null, S.zRB + (b.squareback ? 0.3 : 0.62)].filter((z) => z != null);
  for (const sd of [-1, 1]) {
    for (const z of doorZ) pSide(S, gD, sd, z - 0.006, z + 0.006, S.ySill + 0.16, y1 - 0.02, 0.004, [0.02, 0.02, 0.024], 1, 6);
    for (const z of [doorZ[0] - 0.2, doorZ[doorZ.length - 1] - 0.18]) pSide(S, gD, sd, z - 0.07, z + 0.07, y1 - 0.12, y1 - 0.095, 0.011, CH, 2, 1);
    pSide(S, gD, sd, -S.wheels[1].z * 0 + S.wheels[1].z + S.Ra + 0.05, S.wheels[0].z - S.Ra - 0.05, S.ySill + 0.02, S.ySill + 0.1, 0.006, [0.04, 0.04, 0.045], 8, 1);
    /* mirror */ { const mx = sd * (hw - S.inset + 0.03), mz = S.zFB - 0.12, my = y1 + 0.08; gP.box(Math.min(mx, mx + sd * 0.17), my, mz - 0.06, Math.max(mx, mx + sd * 0.17), my + 0.1, mz + 0.06, 0.9, 0.9, 0.9); tbx(mx, my + 0.01, mz - 0.062, mx + sd * 0.15, my + 0.09, mz - 0.058, 0.05); tbx(mx - sd * 0.03, my - 0.03, mz - 0.02, mx + sd * 0.02, my + 0.0, mz + 0.02, 0.04); }
  }
  /* exhaust tips */
  const ex = b.exhaust != null ? b.exhaust : 2;
  if (ex > 0) { const eg = ni(new THREE.CylinderGeometry(0.048, 0.052, 0.14, 12)); eg.rotateX(Math.PI / 2); for (let k = 0; k < ex; k++) { const xx = ex === 1 ? 0.5 * hw : (ex === 2 ? (k ? 1 : -1) * 0.52 * hw : (k - 1.5) * 0.28 * hw); _m4.compose(_p3.set(xx, S.ySill + 0.12, -hl + 0.0), _q.identity(), _s3.set(1, 1, 1)); gD.geo(eg, _m4, _tcol.setRGB(0.32, 0.33, 0.36), 0); } eg.dispose(); }
  /* ---- optional body kit (as the old recipe, placed on the new surface) ---- */
  const dk = (x0, ya, z0, x1, yb, z1, k) => tbx(x0, ya, z0, x1, yb, z1, k), sy0 = Math.max(0.05, y0 - 0.2), topAt = (z) => samp(S.sil, z) - 0.02;
  if (b.stripes) { const s = b.stripes; for (const sx of [-1, 1]) { const xa = sx * 0.05, xb2 = sx * 0.2; pTop(S, gD, xa, xb2, S.zFB + 0.04, hl - 0.06, 0.006, s, 1, 8); pTop(S, gD, xa, xb2, -hl + 0.06, S.zRB - 0.04, 0.006, s, 1, 8); pTop(S, gD, xa, xb2, S.zRT + 0.02, S.zFT - 0.02, 0.006, s, 1, 8); } }
  if (cs && cs.livery) {
    const lv = cs.livery, c = lv.c, zH0 = S.zFB + 0.04, zH1 = hl - 0.06, zT0 = -hl + 0.06, zT1 = S.zRB - 0.04, zR0 = S.zRT + 0.02, zR1 = S.zFT - 0.02;
    if (lv.k === 'center') for (const [a, z0, z1] of [[0, zH0, zH1], [0, zT0, zT1], [0, zR0, zR1]]) pTop(S, gD, -0.14, 0.14, z0, z1, 0.006, c, 1, 8);
    else if (lv.k === 'hood') { pTop(S, gD, -0.32, 0.32, zH0, zH1, 0.006, c, 2, 8); pTop(S, gD, -0.32, 0.32, zR0, zR1, 0.006, c, 2, 8); }
    else if (lv.k === 'sides') for (const sd of [-1, 1]) pSide(S, gD, sd, S.wheels[3].z + S.Ra + 0.12, S.wheels[0].z - S.Ra - 0.12, S.ySill + 0.3, S.ySill + 0.4, 0.007, c, 8, 1);
    else if (lv.k === 'rocker') for (const sd of [-1, 1]) pSide(S, gD, sd, S.wheels[3].z + S.Ra + 0.1, S.wheels[0].z - S.Ra - 0.1, S.ySill + 0.11, S.ySill + 0.2, 0.007, c, 8, 1);
    else if (lv.k === 'checker') {
      const cell = 0.13, dk2 = [c[0], c[1], c[2]], lt = [0.92, 0.92, 0.92];
      for (const [z0, z1] of [[zH0, zH1], [zR0, zR1]]) { let row = 0; for (let z = z0; z < z1 - 0.02; z += cell, row++) for (let k = -3; k < 3; k++) if (((row + k) & 1) === 0) pTop(S, gD, k * cell, (k + 1) * cell, z, Math.min(z + cell, z1), 0.006, row & 1 ? dk2 : dk2, 1, 1); }
      for (const [z0, z1] of [[zH0, zH1], [zR0, zR1]]) { let row = 0; for (let z = z0; z < z1 - 0.02; z += cell, row++) for (let k = -3; k < 3; k++) if (((row + k) & 1) === 1) pTop(S, gD, k * cell, (k + 1) * cell, z, Math.min(z + cell, z1), 0.006, lt, 1, 1); }
    }
  }
  if (b.scoop) { const s = b.scoop, yb = topAt(s.z + s.len / 2); dk(-s.w, yb, s.z, s.w, yb + s.h + 0.02, s.z + s.len, 0.02); }
  if (b.lip) { const yb = samp(S.sil, -hl + 0.12) - 0.01; gP.box(-hw + 0.14, yb, -hl + 0.02, hw - 0.14, yb + 0.07, -hl + 0.22, 1, 1, 1); }
  if (b.skirts) for (const sx of [-1, 1]) dk(sx * (hw - 0.02), S.ySill - 0.04, S.wheels[3].z + 0.5, sx * (hw + 0.045), S.ySill + 0.12, S.wheels[0].z - 0.5, 0.03);
  if (b.splitter) { const zs0 = hl - 0.45, sw = hw * 0.55; dk(-sw, sy0, zs0, sw, sy0 + 0.03, hl + 0.04, 0.02); for (const sx of [-1, 1]) dk(sx * sw - 0.02, sy0, zs0 + 0.05, sx * sw + 0.02, sy0 + 0.1, hl + 0.04, 0.03); }
  if (b.diffuser) { dk(-hw + 0.28, sy0, -hl - 0.12, hw - 0.28, S.ySill + 0.14, -hl + 0.3, 0.02); for (const fx of [-0.45, -0.15, 0.15, 0.45]) dk(fx - 0.015, sy0, -hl - 0.14, fx + 0.015, S.ySill + 0.14, -hl + 0.15, 0.05); }
  if (b.intakes) for (const sx of [-1, 1]) pSide(S, gD, sx, S.wheels[3].z + 0.15, S.wheels[3].z + 0.85, S.ySill + 0.2, y1 - 0.08, 0.008, [0.015, 0.015, 0.02], 6, 3);
  if (b.deck) { const d = b.deck; for (let z = d.z0; z < d.z1; z += 0.16) { const yb = topAt(z + 0.035) + 0.012; dk(-0.42, yb, z, 0.42, yb + 0.014, z + 0.07, 0.02); } }
  if (b.wing) {
    const w = b.wing, wz = -hl + (w.z != null ? w.z : 0.3), wy = y1 + w.h, ww = hw * (w.span || 0.86), ch = w.chord || 0.4, yb = samp(S.sil, wz) - 0.03;
    for (const sx of [-1, 1]) dk(sx * ww * 0.6 - 0.03, yb, wz - 0.05, sx * ww * 0.6 + 0.03, wy, wz + 0.05, 0.03);
    gP.box(-ww, wy, wz - ch / 2, ww, wy + 0.05, wz + ch / 2, 1, 1, 1);
    if (w.plates) for (const sx of [-1, 1]) dk(sx * ww - 0.02, wy - 0.1, wz - ch / 2, sx * ww + 0.02, wy + 0.16, wz + ch / 2, 0.03);
  }
  if (b.bed) {
    const z1 = b.bed.z1, z0 = -hl + 0.02, yb = y1 - 0.02;
    dk(-hw + 0.12, yb, z0 + 0.1, hw - 0.12, yb + 0.03, z1, 0.015);
    for (const sx of [-1, 1]) gP.box(Math.min(sx * (hw - 0.02), sx * (hw - 0.14)), yb - 0.1, z0, Math.max(sx * (hw - 0.02), sx * (hw - 0.14)), y1 + 0.3, z1, 1, 1, 1);
    gP.box(-hw + 0.02, yb - 0.1, z0, hw - 0.02, y1 + 0.3, z0 + 0.12, 1, 1, 1);
    gP.box(-hw + 0.02, yb - 0.1, z1 - 0.1, hw - 0.02, y1 + 0.2, z1, 1, 1, 1);
  }
  if (b.rack) {
    const rz0 = S.zRT + 0.05, rz1 = S.zFT - 0.05, ry = S.yR + 0.015;
    for (const sx of [-1, 1]) dk(sx * (S.tw - 0.14) - 0.025, ry, rz0, sx * (S.tw - 0.14) + 0.025, ry + 0.07, rz1, 0.025);
    for (let k = 0; k < 4; k++) { const z = rz0 + (rz1 - rz0) * k / 3; dk(-(S.tw - 0.14), ry + 0.04, z - 0.025, S.tw - 0.14, ry + 0.08, z + 0.025, 0.025); }
  }
  if (b.lightbar) { const z = S.zFT - 0.18, ry = S.yR + 0.08; gLt.box(-0.55, ry, z - 0.05, 0.55, ry + 0.09, z + 0.05, 1, 1, 1); for (const sx of [-1, 1]) dk(sx * 0.5 - 0.02, S.yR, z - 0.05, sx * 0.5 + 0.02, ry, z + 0.05, 0.03); }
  if (b.bullbar) {
    dk(-0.62, y0 - 0.06, hl + 0.02, 0.62, y0 + 0.04, hl + 0.14, 0.03); dk(-0.62, y0 + 0.26, hl + 0.02, 0.62, y0 + 0.34, hl + 0.14, 0.03);
    for (const sx of [-1, 1]) dk(sx * 0.62 - 0.04, y0 - 0.06, hl + 0.02, sx * 0.62 + 0.04, y0 + 0.46, hl + 0.14, 0.03);
  }
  if (b.drag) {
    /* parachute pack on the tail and a pair of wheelie bars trailing to small wheels just off the ground */
    const yT = topAt(-hl + 0.12) + 0.02; dk(-0.2, yT - 0.3, -hl - 0.3, 0.2, yT - 0.04, -hl - 0.02, 0.03); gD.box(-0.17, yT - 0.27, -hl - 0.33, 0.17, yT - 0.07, -hl - 0.3, 0.55, 0.05, 0.04);
    for (const sx of [-1, 1]) { dk(sx * 0.16 - 0.015, yT - 0.06, -hl - 0.2, sx * 0.16 + 0.015, yT + 0.0, -hl + 0.2, 0.05); dk(sx * 0.42 - 0.022, 0.11, -hl - 1.05, sx * 0.42 + 0.022, 0.155, -hl + 0.5, 0.25); dk(sx * 0.42 - 0.02, 0.13, -hl + 0.05, sx * 0.42 + 0.02, S.ySill + 0.05, -hl + 0.09, 0.25); }
    dk(-0.44, 0.11, -hl - 0.62, 0.44, 0.15, -hl - 0.58, 0.25);
    { const wg = ni(new THREE.CylinderGeometry(0.085, 0.085, 0.05, 12)); wg.rotateZ(Math.PI / 2); for (const sx of [-1, 1]) { _m4.compose(_p3.set(sx * 0.47, 0.09, -hl - 1.02), _q.identity(), _s3.set(1, 1, 1)); gD.geo(wg, _m4, _tcol.setRGB(0.05, 0.05, 0.055), 0); } wg.dispose(); }
  }
  if (b.rally) {
    const yN2 = samp(S.sil, hl - 0.05);
    /* bonnet vents: a pair of louvred slots, and a roof air intake */
    for (const sx of [-1, 1]) for (let k = 0; k < 4; k++) { const z = S.zFB + 0.3 + k * 0.1; pTop(S, gD, sx * 0.2, sx * 0.5, z, z + 0.05, 0.012, [0.012, 0.012, 0.015], 3, 1); }
    dk(-0.17, S.yR - 0.005, S.zRT + 0.12, 0.17, S.yR + 0.1, S.zRT + 0.5, 0.03);
    gD.box(-0.12, S.yR + 0.06, S.zRT + 0.48, 0.12, S.yR + 0.095, S.zRT + 0.512, 0.01, 0.01, 0.012);
    /* mud flaps behind every wheel */
    for (const w of S.wheels) { const zf = w.z + (w.front ? -1 : -1) * (S.Ra + 0.03), xf = w.side * (hw - 0.2); dk(xf - 0.16, S.ySill - 0.08, zf - 0.012, xf + 0.16, S.ySill + 0.2, zf + 0.012, 0.02); }
    /* door roundels (white number panels), tow loops, and a pair of driving lamps on the nose */
    for (const sd of [-1, 1]) { const zc = S.zFB - 0.5; pSide(S, gD, sd, zc - 0.17, zc + 0.17, S.ySill + 0.34, S.ySill + 0.68, 0.009, [0.93, 0.93, 0.9], 3, 3); pSide(S, gD, sd, zc - 0.07, zc + 0.07, S.ySill + 0.4, S.ySill + 0.62, 0.012, [0.04, 0.04, 0.05], 2, 3); }
    pTop(S, gD, -0.36, 0.36, S.zRT - 0.02, S.zRT + 0.02, 0.01, [0.9, 0.9, 0.88], 4, 1);
    for (const sx of [-1, 1]) { gT.box(Math.min(sx * 0.58, sx * 0.64), yN2 - 0.42, hl - 0.05, Math.max(sx * 0.58, sx * 0.64), yN2 - 0.36, hl + 0.14, 0.9, 0.2, 0.1); gLt.box(sx * 0.34 - 0.09, yN2 - 0.3, hl - 0.06, sx * 0.34 + 0.09, yN2 - 0.2, hl + 0.025, 1, 1, 1); }
  }
  }
  const grp = new THREE.Group(), paint = mkPaint(hex, !!opts.studio, cs && cs.fin);
  const mP = gP.mesh(paint, true, true), mG = gG.mesh(MAT.carGlass, true, false), mT = gT.mesh(MAT.carTrim, false, true), mD = gD.mesh(MAT.carTrim, false, true), mH = gLt.mesh(MAT.carHead, false, false), mTl = tl.mesh(MAT.carTail, false, false);
  if (opts.studio) { const gm = MAT.carGlass.clone(); gm.envMap = Env.studio; mG.material = gm; grp.userData.studioMats = [gm]; }
  grp.add(mP, mG, mT, mD, mH, mTl);
  grp.userData.paint = paint; grp.userData.hl = hl; grp.userData.tail = mTl; grp.userData.dm = { P: mP, G: mG, T: mT, D: mD, H: mH, TL: mTl };
  if (cs) {
    if (cs.tint != null) { const gm = (opts.studio ? mG.material : Env.reg(MAT.carGlass.clone(), false)); gm.color.copy(lc(cs.tint)); mG.material = gm; grp.userData.studioMats = (grp.userData.studioMats || []).concat(opts.studio ? [] : [gm]); if (!opts.studio) grp.userData.envMats = [gm]; }
    if (cs.head != null) { const hm = new THREE.MeshBasicMaterial({ color: MAT.carHead.color.clone() }); hm.polygonOffset = true; hm.polygonOffsetFactor = -1; hm.polygonOffsetUnits = -2; mH.material = hm; grp.userData.headMat = hm; grp.userData.headTint = lc(cs.head); if (opts.studio) hm.color.copy(lc(cs.head)).multiplyScalar(1.4); grp.userData.studioMats = (grp.userData.studioMats || []).concat([hm]); }
    if (cs.glow) { const gm2 = makeGlow(S, cs.glow.hex, cs.glow.mode); grp.add(gm2); grp.userData.glowM = gm2; grp.userData.studioMats = (grp.userData.studioMats || []).concat([gm2.material]); gm2.userData.geoOwn = gm2.geometry; }
  }
  if (opts.static) {
    /* thumbnails: ordinary wheel meshes (no instancing) */
    wheelsInit(); const geo = Wheels.geo, rim = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.28, metalness: 0.8, envMapIntensity: 1.1, side: THREE.DoubleSide, envMap: Env.studio, color: new THREE.Color(...(b.rim || [0.6, 0.6, 0.64])) });
    grp.userData.studioMats = (grp.userData.studioMats || []).concat([rim]);
    for (const w of S.wheels) {
      const left = w.side < 0, tk = TIRE_RHO[b.tire] ? b.tire : 'std', rho = TIRE_RHO[tk];
      const t = new THREE.Mesh(geo.tire[tk], MAT.tire), r = new THREE.Mesh(geo.rim[b.rimStyle || 'multi'], rim);
      for (const m of [t, r]) { m.position.set(w.x, w.r, w.z); m.rotation.y = left ? Math.PI : 0; m.castShadow = false; grp.add(m); }
      t.scale.set(w.w, w.r, w.r); r.scale.set(w.w, w.r * rho, w.r * rho);
    }
  } else wheelsAdd(grp, S);
  grp.userData.S = S;
  return grp;
}
function disposeCar(g) {
  if (!g) return; wheelsRemove(g);
  g.traverse((o) => { if (o.geometry && !(Wheels.geo && (o.geometry === Wheels.geo.tire.std || o.geometry === Wheels.geo.tire.sport || Object.values(Wheels.geo.rim).includes(o.geometry)))) o.geometry.dispose(); });
  const p = g.userData.paint; if (p) { Env.mats.delete(p); p.dispose(); } if (g.userData.studioMats) for (const m of g.userData.studioMats) m.dispose(); if (g.userData.envMats) for (const m of g.userData.envMats) { Env.mats.delete(m); m.dispose(); }
}

/* ---------- traffic bodies (same builder, simpler lod) ---------- */
const TRAFFIC_DEFS = [
  { name: 'sedan', p: { a: 1.3, b: 1.3 }, body: { L: 4.5, W: 1.82, H: 0.5, C: 0.5, wr: 0.33, y0: 0.36, tw: 0.26, rim: [0.62, 0.62, 0.66], rimStyle: 'multi', cab: { cz: -0.15, bd: 1.1, tw: 0.68, td: 0.62, zoff: -0.12, inset: 0.08 }, bpil: -0.15, exhaust: 1 } },
  { name: 'hatch', p: { a: 1.15, b: 1.15 }, body: { L: 3.9, W: 1.76, H: 0.55, C: 0.55, wr: 0.32, y0: 0.36, tw: 0.24, rim: [0.66, 0.66, 0.7], rimStyle: 'five', cab: { cz: -0.35, bd: 1.35, tw: 0.66, td: 0.95, zoff: -0.12, inset: 0.06 }, squareback: true, noseR: 0.7, exhaust: 0 } },
  { name: 'suv', p: { a: 1.4, b: 1.4 }, body: { L: 4.6, W: 1.92, H: 0.7, C: 0.6, wr: 0.38, y0: 0.38, tw: 0.3, rim: [0.45, 0.46, 0.5], rimStyle: 'five', boxy: true, noseR: 0.5, cab: { cz: -0.3, bd: 1.72, tw: 0.8, td: 1.15, zoff: -0.2, inset: 0.07 }, squareback: true, bpil: -0.1, exhaust: 0 } },
  { name: 'van', p: { a: 1.55, b: 1.45 }, body: { L: 5.0, W: 1.95, H: 0.64, y1: 1.0, C: 0.95, wr: 0.36, y0: 0.3, tw: 0.28, rim: [0.55, 0.56, 0.6], rimStyle: 'steel', boxy: true, noseR: 0.4, hoodDrop: 0.2, deckDrop: 0.0, cab: { cz: -0.5, bd: 2.2, tw: 0.9, td: 1.75, zoff: -0.4, inset: 0.05 }, squareback: true, win: [[0.15, 1.5]], exhaust: 0 } }
];
const CAR_VARIANTS = TRAFFIC_DEFS.map((d) => d.body);
function buildCarMesh(hex, vi) { return buildCarModel(TRAFFIC_DEFS[vi || 0], hex, { lod: 1 }); }
