/* ================= HAIR KIT =================
   Hair that actually sits on the head. Every piece is built from the real scalp surface (the same lofted rings as the head mesh, see
   Body.init), pushed out a few millimetres along the surface normal, so nothing floats and nothing z-fights with the skull.
     - a base SHELL (grid of columns around the head, rows from the hairline up to the crown) whose lower edge follows a per-style
       HAIRLINE curve: forehead arch, temple recession, sideburn tab, clear ears, nape line
     - tapered LOCKS (flattened tubes) laid over the shell along the flow of the hair: they break up the hairline, add volume and give the
       shading some direction. Roots are darker than tips (vertex tint)
     - TAILS (long hair behind the neck, ponytail): separate segments with their own pivot so the pedestrian code can swing them
   Body.G.hair[style]  = everything merged (static; used by the courtroom people, which put one mesh on the head)
   Body.G.hairH[style] = head part only; Body.G.hairT[style] = [{ geo, pv: [x,y,z] (pivot, relative to the parent), len }] swinging segments,
                         each one hanging from the previous (the first from the head). Geometry is built around its own pivot (origin).
   Head space: origin at the chin, +y up, +z the face, the crown at y ~ .247. */
const _hSm = (t) => { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); };
const _hX = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const _hU = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const _hK = [0, 0.6, 1.0, 1.3, 1.5, 1.72, 2.0, 2.5, Math.PI];          // angles from the face centre line where the hairline height is specified
const _hAng = (t) => { t -= Math.PI / 2; while (t > Math.PI) t -= TAU; while (t < -Math.PI) t += TAU; return t; };   // column angle (x = cos, z = sin) -> angle from straight ahead
/* hairline height at an angle (smooth between the knots, with a little irregularity so it is not a drawn line) */
function hairY(Y, ph) {
  const a = Math.min(Math.PI, Math.abs(ph)); let y = Y[Y.length - 1];
  for (let k = 0; k < _hK.length - 1; k++) if (a <= _hK[k + 1]) { y = Y[k] + (Y[k + 1] - Y[k]) * _hSm((a - _hK[k]) / (_hK[k + 1] - _hK[k])); break; }
  return y + 0.0022 * Math.sin(ph * 19 + 0.7) + 0.0012 * Math.sin(ph * 37 + 2.1);
}
/* head ring parameters at any height: a smooth (Hermite) curve through the rows [y, a, b, z, e, c], so the scalp and the head mesh agree */
function headRingAt(HR, y) {
  const n = HR.length; y = Math.max(HR[0][0], Math.min(HR[n - 1][0], y));
  let k = 0; while (k < n - 2 && y > HR[k + 1][0]) k++;
  const A = HR[k], B = HR[k + 1], h = B[0] - A[0], u = (y - A[0]) / h, u2 = u * u, u3 = u2 * u, h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2, out = [y];
  const sl = (i, p) => { const i0 = Math.max(0, i - 1), i1 = Math.min(n - 1, i + 1); return (HR[i1][p] - HR[i0][p]) / (HR[i1][0] - HR[i0][0]); };
  for (let p = 1; p <= 4; p++) out.push(h00 * A[p] + h10 * h * sl(k, p) + h01 * B[p] + h11 * h * sl(k + 1, p));
  out[1] = Math.max(0.0005, out[1]); out[2] = Math.max(0.0005, out[2]); return out;
}
/* the scalp: head rings interpolated at any height; pt(y, t) / nrm(y, t) with t the column angle (x = cos t, z = sin t; the face is at t = PI / 2) */
function HeadSurf(HR) { this.HR = HR; this.top = HR[HR.length - 1][0]; }
HeadSurf.prototype.ring = function (y) { return headRingAt(this.HR, y); };
HeadSurf.prototype.pt = function (y, t) {
  const r = this.ring(y), k = 2 / r[4], cs = Math.cos(t), sn = Math.sin(t);
  return [r[1] * Math.sign(cs) * Math.pow(Math.abs(cs), k), y, r[3] + r[2] * Math.sign(sn) * Math.pow(Math.abs(sn), k)];
};
HeadSurf.prototype.nrm = function (y, t) {
  const e = 0.004, y0 = Math.max(0, y - e), y1 = Math.min(this.top, y + e), a = this.pt(y0, t), b = this.pt(y1, t), c = this.pt(y, t - 0.03), d = this.pt(y, t + 0.03);
  const n = _hU(_hX([b[0] - a[0], b[1] - a[1], b[2] - a[2]], [d[0] - c[0], d[1] - c[1], d[2] - c[2]]));
  /* make sure it points away from the head's centre */
  const p = this.pt(y, t); return (n[0] * p[0] + n[1] * (p[1] - 0.12) + n[2] * (p[2] - 0.0) < 0) ? [-n[0], -n[1], -n[2]] : n;
};
/* flip a run of triangles (added since index i0) if they face the centre (cx, cy, cz) rather than away from it */
BB.prototype.orient = function (i0, cx, cy, cz) {
  const p = this.p, I = this.i; let s = 0;
  for (let k = i0; k + 2 < I.length; k += 3) {
    const a = I[k] * 3, b = I[k + 1] * 3, c = I[k + 2] * 3, ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2], vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, mx = (p[a] + p[b] + p[c]) / 3 - cx, my = (p[a + 1] + p[b + 1] + p[c + 1]) / 3 - cy, mz = (p[a + 2] + p[b + 2] + p[c + 2]) / 3 - cz;
    s += nx * mx + ny * my + nz * mz;
  }
  if (s < 0) for (let k = i0; k + 2 < I.length; k += 3) { const t = I[k + 1]; I[k + 1] = I[k + 2]; I[k + 2] = t; }
};
/* a flattened tube along a path: P centre line, N surface normals, W half widths, H half thicknesses (0 at the tip closes it), c root->tip tint [root, tip] */
BB.prototype.tube = function (P, N, W, H, c, seg) {
  seg = seg || 6; const n = P.length, base = this.p.length / 3, i0 = this.i.length, c0 = c ? c[0] : 0.8, c1 = c ? c[1] : 1;
  for (let j = 0; j < n; j++) {
    const a = P[Math.max(0, j - 1)], d = P[Math.min(n - 1, j + 1)], T = _hU([d[0] - a[0], d[1] - a[1], d[2] - a[2]]), Bv = _hU(_hX(T, N[j])), Nn = _hX(Bv, T), col = c0 + (c1 - c0) * (j / (n - 1)), cc = [col, col, col];
    for (let s = 0; s < seg; s++) {
      const an = TAU * s / seg, cs = Math.cos(an) * W[j], sn = Math.sin(an) * H[j];
      this._v(P[j][0] + Bv[0] * cs + Nn[0] * sn, P[j][1] + Bv[1] * cs + Nn[1] * sn, P[j][2] + Bv[2] * cs + Nn[2] * sn, cc);
    }
  }
  for (let j = 0; j < n - 1; j++) for (let s = 0; s < seg; s++) {
    const s2 = (s + 1) % seg, a = base + j * seg + s, b = base + j * seg + s2, cI = base + (j + 1) * seg + s, d = base + (j + 1) * seg + s2;
    this.i.push(a, cI, b, b, cI, d);
  }
  /* wind it so the faces look away from the centre line */
  this.orient(i0, P[0][0], P[0][1], P[0][2]);
};

/* ---- the base shell ---- */
function hairShell(b, S, o) {
  const M = o.M || 36, R = o.R || 9, ytop = o.top == null ? S.top - 0.002 : o.top, base = b.p.length / 3, i0 = b.i.length, tint = o.c == null ? 0.85 : o.c;
  for (let j = 0; j <= R; j++) {
    const u = j / R;
    for (let i = 0; i < M; i++) {
      const t = TAU * i / M, ph = _hAng(t), yh = hairY(o.Y, ph), y = Math.max(yh, yh + (ytop - yh) * u), edge = _hSm(u / 0.16);
      const tau = o.tau * (0.55 + 0.45 * edge) + (o.vol || 0) * Math.sin(Math.PI * Math.min(1, u * 0.95)) * (0.55 + 0.45 * Math.cos(ph));
      const p = S.pt(y, t), n = S.nrm(y, t), c = tint * (0.8 + 0.2 * u);
      b._v(p[0] + n[0] * tau, p[1] + n[1] * tau, p[2] + n[2] * tau, [c, c, c]);
    }
  }
  for (let j = 0; j < R; j++) for (let i = 0; i < M; i++) { const i2 = (i + 1) % M, a = base + j * M + i, bb = base + j * M + i2, c = base + (j + 1) * M + i, d = base + (j + 1) * M + i2; b.i.push(a, c, bb, bb, c, d); }
  if (o.top == null) {   // close the crown with a fan
    const t = Math.PI / 2, p = S.pt(S.top, t), ctr = b._v(p[0], S.top + o.tau * 0.9 + (o.vol || 0) * 0.15, p[2], [tint, tint, tint]), r0 = base + R * M;
    for (let i = 0; i < M; i++) b.i.push(ctr, r0 + (i + 1) % M, r0 + i);
  }
  b.orient(i0, 0, 0.12, -0.004);
}
/* ---- a lock lying on the scalp: from a root near the crown down to the hairline (or short of it) ---- */
function hairLock(b, S, o) {
  const n = o.n || 7, P = [], N = [], W = [], H = [];
  for (let k = 0; k < n; k++) {
    const s = k / (n - 1), t = o.t0 + (o.t1 - o.t0) * _hSm(s), y = o.y0 + (o.y1 - o.y0) * Math.pow(s, o.curve || 1);
    const p = S.pt(y, t), nn = S.nrm(y, t), off = o.tau + o.h * 0.55 + (o.lift || 0) * s * s;
    P.push([p[0] + nn[0] * off, p[1] + nn[1] * off, p[2] + nn[2] * off]); N.push(nn);
    const last = k === n - 1; W.push(last ? 0 : o.w0 + (o.w1 - o.w0) * s * s * s); H.push(last ? 0 : o.h * (1 - 0.45 * s * s * s));
  }
  b.tube(P, N, W, H, o.tint || [0.78, 1.04], 6);
}
/* scatter of locks around the whole head, flowing from the crown to the hairline */
function hairLocks(b, S, Y, o, rnd) {
  const N = o.N, topY = S.top - 0.02;
  for (let k = 0; k < N; k++) {
    const t1 = TAU * (k + rnd() * 0.6) / N, ph = _hAng(t1);
    if (o.skipFront && Math.abs(ph) < o.skipFront) continue;
    const front = Math.abs(ph) < 0.9, sweep = (o.sweep || 0.4) * (rnd() - 0.5) + (o.swirl || 0) * Math.sin(ph * 0.9), yh = hairY(Y, ph);
    const y1 = yh + (o.endMin + (o.endMax - o.endMin) * rnd()) * (front && o.fringeHigh ? 0.4 : 1);
    hairLock(b, S, { t0: t1 - sweep, t1, y0: topY - rnd() * 0.02, y1, curve: 0.85, tau: o.tau, h: o.h * (0.85 + rnd() * 0.4), w0: o.w * (0.9 + rnd() * 0.3), w1: o.w * 0.3, lift: o.lift * rnd(), n: o.rings || 7 });
  }
}
/* the torso's back surface at head-local height y and sideways offset x (for hair that hangs behind the neck); Infinity above the neck */
const _hTF = [[-0.03, 0.178, 0.108, -0.004], [0.01, 0.176, 0.107, -0.004], [0.10, 0.132, 0.092, -0.002], [0.21, 0.15, 0.1, 0.002], [0.30, 0.168, 0.116, 0.016], [0.36, 0.172, 0.118, 0.02], [0.42, 0.172, 0.104, 0.006], [0.46, 0.172, 0.088, -0.002], [0.495, 0.136, 0.072, -0.006], [0.515, 0.07, 0.054, -0.008], [0.53, 0.054, 0.05, -0.006]];
function hairTorsoBack(y, x) {
  const yt = y + Body.NECK; if (yt >= 0.53) return Infinity; if (yt < -0.03) return -0.2;
  let k = 0; while (k < _hTF.length - 2 && yt > _hTF[k + 1][0]) k++;
  const A = _hTF[k], B = _hTF[k + 1], u = (yt - A[0]) / (B[0] - A[0]), a = A[1] + (B[1] - A[1]) * u, bb = A[2] + (B[2] - A[2]) * u, z = A[3] + (B[3] - A[3]) * u;
  const r = Math.min(0.98, Math.abs(x) / a); return z - 0.004 - bb * Math.pow(Math.max(0, 1 - Math.pow(r, 2.5)), 0.4);
}

/* ---- all the styles ---- */
function buildHair(G, HR) {
  const S = new HeadSurf(HR), HY = {
    short: [0.208, 0.204, 0.192, 0.106, 0.139, 0.14, 0.104, 0.078, 0.066],
    buzz: [0.202, 0.198, 0.184, 0.112, 0.139, 0.138, 0.098, 0.07, 0.06],
    long: [0.208, 0.205, 0.196, 0.15, 0.085, 0.07, 0.06, 0.05, 0.05],
    pony: [0.218, 0.215, 0.207, 0.17, 0.145, 0.132, 0.118, 0.1, 0.09],
    curly: [0.202, 0.202, 0.194, 0.146, 0.139, 0.142, 0.108, 0.08, 0.07],
    rim: [0.15, 0.15, 0.15, 0.15, 0.142, 0.13, 0.105, 0.08, 0.068]
  };
  G.hair = {}; G.hairH = {}; G.hairT = {};
  const done = (k, bH, tails) => {
    G.hairH[k] = bH.geo(); G.hairT[k] = tails || [];
    const all = new BB(); all.p = bH.p.slice(); all.c = bH.c.slice(); all.i = bH.i.slice();
    if (tails) for (const tl of tails) { const g = tl.geoSrc; const o = all.p.length / 3; for (let q = 0; q < g.p.length; q += 3) all._v(g.p[q] + tl.abs[0], g.p[q + 1] + tl.abs[1], g.p[q + 2] + tl.abs[2], [g.c[q], g.c[q + 1], g.c[q + 2]]); for (const ix of g.i) all.i.push(o + ix); }
    G.hair[k] = all.geo();
  };
  /* short */
  { const rnd = mulberry32(101), b = new BB();
    hairShell(b, S, { Y: HY.short, tau: 0.0095, vol: 0.008, c: 0.8 });
    hairLocks(b, S, HY.short, { N: 40, w: 0.0125, h: 0.0042, tau: 0.0095, lift: 0.004, endMin: -0.002, endMax: 0.016, sweep: 0.45, swirl: 0.25, rings: 7 }, rnd);
    /* side-swept fringe: front locks that lie across the forehead */
    for (let k = 0; k < 7; k++) { const t1 = Math.PI / 2 + (k - 3) * 0.19, ph = _hAng(t1); hairLock(b, S, { t0: t1 - 0.55, t1: t1 + 0.12, y0: S.top - 0.03, y1: hairY(HY.short, ph) - 0.004 + 0.006 * Math.abs(k - 3) * 0.3, curve: 0.8, tau: 0.0095, h: 0.0048, w0: 0.013, w1: 0.004, lift: 0.011, n: 8 }); }
    done('short', b); }
  /* buzz cut: a thin pelt, no locks */
  { const b = new BB(); hairShell(b, S, { Y: HY.buzz, tau: 0.0035, vol: 0, c: 0.9, R: 8 }); done('buzz', b); }
  /* rim: what shows under a hat (sides and back only) */
  { const b = new BB(); hairShell(b, S, { Y: HY.rim, tau: 0.008, vol: 0, c: 0.85, top: 0.15, R: 4 }); done('rim', b); }
  /* long: shell + locks on the head, and a hanging curtain behind the neck in two swinging segments */
  { const rnd = mulberry32(303), b = new BB();
    hairShell(b, S, { Y: HY.long, tau: 0.01, vol: 0.006, c: 0.8 });
    hairLocks(b, S, HY.long, { N: 38, w: 0.0135, h: 0.0045, tau: 0.01, lift: 0.004, endMin: 0.0, endMax: 0.02, sweep: 0.3, swirl: 0.0, rings: 7 }, rnd);
    for (let k = 0; k < 7; k++) { const t1 = Math.PI / 2 + (k - 3) * 0.2; hairLock(b, S, { t0: t1 - (k - 3) * 0.12, t1, y0: S.top - 0.025, y1: hairY(HY.long, _hAng(t1)) + 0.002, curve: 0.8, tau: 0.01, h: 0.0048, w0: 0.014, w1: 0.006, lift: 0.006, n: 8 }); }
    const tails = [];
    const pivot0 = [0, 0.06, -0.082], pivot1 = [0, -0.1, -0.118];
    for (let seg = 0; seg < 2; seg++) {
      const tb = new BB(), pv = seg ? pivot1 : pivot0, y0 = seg ? -0.1 : 0.062, y1 = seg ? -0.29 : -0.1, cnt = 15;
      for (let k = 0; k < cnt; k++) {
        const f = (k + 0.5) / cnt * 2 - 1, t = -Math.PI / 2 + f * 1.25, len = seg ? (0.19 - 0.035 * Math.abs(f) - 0.02 * ((k * 7) % 3)) : 1, P = [], N = [], W = [], H = [], m = 6;
        for (let q = 0; q < m; q++) {
          const s = q / (m - 1), y = y0 + (seg ? -len * s : (y1 - y0) * s), sp = S.pt(Math.max(0.05, Math.min(y, S.top)), t), x0 = sp[0] * (1 + (y < 0.0 ? 0.0 : 0)), xx = x0 * (1 + 0.2 * _hSm(-y / 0.25));
          let zz = Math.min(sp[2] - 0.013, hairTorsoBack(y, xx) - 0.015); if (y > 0.05) zz = S.pt(y, t)[2] - 0.012;
          P.push([xx - pv[0], y - pv[1], zz - pv[2]]); N.push(_hU([Math.cos(t) * 0.6, 0, Math.sin(t)]));
          const last = q === m - 1 && seg === 1; W.push(last ? 0 : 0.0165 * (1 - 0.35 * (seg ? s : 0))); H.push(last ? 0 : 0.0075 - 0.002 * s * seg);
        }
        tb.tube(P, N, W, H, seg ? [0.82, 1.02] : [0.72, 0.9], 6);
      }
      tails.push({ geoSrc: { p: tb.p, c: tb.c, i: tb.i }, geo: tb.geo(), pv: seg ? [pivot1[0] - pivot0[0], pivot1[1] - pivot0[1], pivot1[2] - pivot0[2]] : pivot0.slice(), abs: pv.slice(), len: 0.19 });
    }
    done('long', b, tails); }
  /* ponytail: hair combed back from the hairline over the crown to a tie at the back, then a tail in two swinging segments */
  { const rnd = mulberry32(404), b = new BB(), tie = [0, 0.172, -0.114], yTop = S.top - 0.004, yTie = tie[1] + 0.012;
    hairShell(b, S, { Y: HY.pony, tau: 0.007, vol: 0.004, c: 0.82 });
    for (let k = 0; k < 24; k++) {
      const t1 = TAU * (k + rnd() * 0.5) / 24, ph = _hAng(t1), front = Math.abs(ph) < 1.9, yh = hairY(HY.pony, ph), tb = -Math.PI / 2 + Math.cos(t1) * 0.7, m = 10, P = [], N = [], W = [], H = [];
      for (let q = 0; q < m; q++) {
        const s = q / (m - 1); let y, t;
        if (front) { if (s < 0.5) { y = yh + (yTop - yh) * _hSm(s / 0.5); t = t1; } else { y = yTop + (yTie - yTop) * _hSm((s - 0.5) / 0.5); t = tb; } }
        else { y = yh + (yTie - yh) * _hSm(s); t = t1; }
        y = Math.min(y, S.top - 0.002);
        const p = S.pt(y, t), nn = S.nrm(Math.min(y, S.top - 0.003), t), off = 0.011, g = _hSm(front ? Math.max(0, (s - 0.5) / 0.5) : s);
        const px = p[0] + nn[0] * off, py = p[1] + nn[1] * off, pz = p[2] + nn[2] * off;
        P.push([px + (tie[0] - px) * g * 0.9, py + (tie[1] - py) * g * 0.7, pz + (tie[2] - pz) * g * 0.85]); N.push(nn);
        const last = q === m - 1; W.push(last ? 0 : 0.012 * (1 - 0.55 * s * s)); H.push(last ? 0 : 0.0042);
      }
      b.tube(P, N, W, H, [0.74, 1.0], 6);
    }
    b.ell(0, 0.172, -0.1095, 0.021, 0.011, 0.016, 0.3, [0.5, 0, 0], { seg: 8 });   // the hair tie
    /* the tail: segment 0 hangs from the tie, segment 1 from the end of segment 0 (pivot offsets are relative to the parent's origin) */
    const END0 = [0, -0.1, -0.03], tails = [];
    for (let seg = 0; seg < 2; seg++) {
      const tb = new BB(), cnt = 7;
      for (let k = 0; k < cnt; k++) {
        const f = (k + 0.5) / cnt * 2 - 1, P = [], N = [], W = [], H = [], m = 6;
        for (let q = 0; q < m; q++) {
          const s = q / (m - 1), yy = seg ? -0.1 * s : -0.1 * s, zz = seg ? -0.014 * s : -0.03 * Math.sin(s * 1.6), xx = f * 0.016 * (1 + (seg ? s * 0.4 : s * 0.6)), last = q === m - 1 && seg === 1;
          P.push([xx, yy, zz]); N.push([0, 0, -1]);
          W.push(last ? 0 : 0.0125 * (1 - 0.1 * s - (seg ? 0.4 * s : 0))); H.push(last ? 0 : 0.0095 * (1 - 0.3 * seg * s));
        }
        tb.tube(P, N, W, H, seg ? [0.86, 1.04] : [0.7, 0.9], 6);
      }
      tails.push({ geoSrc: { p: tb.p, c: tb.c, i: tb.i }, geo: tb.geo(), pv: seg ? END0.slice() : tie.slice(), abs: seg ? [tie[0] + END0[0], tie[1] + END0[1], tie[2] + END0[2]] : tie.slice(), len: 0.1 });
    }
    done('pony', b, tails); }
  /* curly / afro-textured: thick shell plus clusters of curls that sit on the scalp, small ones along the hairline */
  { const rnd = mulberry32(777), b = new BB();
    hairShell(b, S, { Y: HY.curly, tau: 0.0165, vol: 0.011, c: 0.78, M: 30 });
    for (let k = 0; k < 64; k++) {
      const ph = (rnd() * 2 - 1) * Math.PI, t = Math.PI / 2 + ph, yh = hairY(HY.curly, ph), u = Math.pow(rnd(), 0.7), y = yh + (S.top - 0.006 - yh) * u;
      const front = Math.abs(ph) < 1.0 && u < 0.35, r = front ? 0.0135 + rnd() * 0.006 : 0.018 + rnd() * 0.009, p = S.pt(y, t), n = S.nrm(y, t), off = 0.0165 + 0.011 * Math.sin(Math.PI * Math.min(1, u)) * 0.7 + r * 0.55;
      if (Math.abs(ph) < 0.35 && u < 0.25) continue;
      b.ell(p[0] + n[0] * off, p[1] + n[1] * off, p[2] + n[2] * off, r, r * 0.92, r, 0.84 + rnd() * 0.2, [rnd() * 3, rnd() * 3, 0], { seg: 7, lat: 4 });
    }
    done('curly', b); }
  /* bun: combed back like the ponytail, gathered into a bun on top at the back */
  { const rnd = mulberry32(505), b = new BB();
    hairShell(b, S, { Y: HY.pony, tau: 0.007, vol: 0.004, c: 0.82 });
    hairLocks(b, S, HY.pony, { N: 28, w: 0.0125, h: 0.004, tau: 0.007, lift: 0.002, endMin: 0.0, endMax: 0.014, sweep: 0.2, rings: 6 }, rnd);
    b.ell(0, 0.228, -0.074, 0.05, 0.047, 0.05, 1, null, { seg: 12, lat: 6 }); b.ell(0, 0.2, -0.074, 0.048, 0.012, 0.048, 0.3, null, { seg: 12, lat: 3 });
    for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; b.ell(Math.cos(a) * 0.038, 0.232 + Math.sin(a * 2) * 0.006, -0.074 + Math.sin(a) * 0.038, 0.016, 0.011, 0.02, 0.86 + 0.14 * (k % 2), [0, -a, 0.4], { seg: 6, lat: 3 }); }
    done('bun', b); }
  return G.hair;
}
