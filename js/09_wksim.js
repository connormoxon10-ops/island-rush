/* ================= WORKSHOP SIM: 6-DOF rigid body with blade-element aerodynamics, engines, gear, staging =================
   State (doubles): COM position r and velocity v in the planet-centred inertial frame, attitude q (body -> inertial), angular velocity w (body axes).
   Every step: controls + engines + fuel burn are updated once, then RK4 integrates the forces:
     gravity (inverse square), every lifting-surface strip (lift/stall/induced/profile/wave drag, downwash, sweep, ground effect), every body strip
     (skin friction, nose/base pressure drag, Munk potential lift, cross-flow drag), thrust (jet lapse, propeller, rocket Isp vs pressure, solids),
     landing gear (spring/damper + tyre friction + brakes), hull contact, parachutes, reaction wheels. Mass, centre of mass and inertia follow the fuel. */
function _wkCf(Re, M) {
  Re = clamp(Re, 5e4, 1e10); const lam = 1.328 / Math.sqrt(Re), tur = 0.455 / Math.pow(Math.log10(Re), 2.58);
  return (lam + (tur - lam) * sstep(1e5, 1e6, Re)) / Math.pow(1 + 0.144 * M * M, 0.65);
}
const _wkMat0 = () => new Float64Array(9);
function _wkClAlpha(AR, lam, M) {
  const k = 0.97, cl = Math.cos(lam), tl = Math.tan(lam);
  const sub = (m) => { const b2 = 1 - m * m; return TAU * AR / (2 + Math.sqrt(4 + Math.pow(AR / k, 2) * b2 * (1 + tl * tl / b2))); };
  if (M < 0.8) return sub(M);
  const sup = (m) => { const bs = Math.sqrt(m * m - 1), x = AR * bs; return x >= 1 ? 4 / bs * (1 - 1 / (2 * x)) : AR * (1.5708 + 0.4292 * x); };
  const a = sub(0.8), b = sup(1.3); return a + (b - a) * sstep(0.8, 1.3, M) * 1 + (M > 1.3 ? sup(M) - b : 0);
}
function _wkWave(M, te, CLa) {
  const Mdd = 0.87 - te - 0.05 * Math.abs(CLa), Mcr = Mdd - 0.108, cap = 11.6 * te * te;
  if (M < 1) return Math.min(20 * Math.pow(Math.max(0, M - Mcr), 4), cap);
  return (16 / 3) * te * te / Math.sqrt(Math.max(M * M - 1, 0.21));
}
const _wkFlatCd = (M) => 0.8 + 0.45 * sstep(0.7, 1.2, M);
const _wkBaseCd = (M) => 0.12 + 0.13 * Math.exp(-Math.pow((M - 1) / 0.45, 2));
function _wkNoseCd(M, f, shp) { const s2 = 1 / (1 + 4 * f * f); return Math.min(1.2, 0.025 + 2 * s2 * (shp ? 1 : 0.75) * sstep(0.85, 1.25, M)); }
/* installed jet thrust lapse (Mattingly) */
function _wkJetLapse(kind, M, T0, p0, ab) {
  const th = (T0 / 288.15) * (1 + 0.2 * M * M), d0 = (p0 / 101325) * Math.pow(1 + 0.2 * M * M, 3.5);
  if (kind === 'tf') { const TR = 1.07; return Math.max(0, d0 * (1 - 0.49 * Math.sqrt(M) - (th > TR ? 3 * (th - TR) / (1.5 + M) : 0))); }
  const TR = 1.0; let a = ab ? 1 - 0.3 * (th - 1) - 0.1 * Math.sqrt(M) - (th > TR ? 1.5 * (th - TR) / th : 0) : 0.6 * (th > TR ? 1 - 3.8 * (th - TR) / th : 1) * (1 + 0.1 * Math.min(M, 1.5)); return Math.max(0, d0 * a);
}

class WKSim {
  constructor(C, o) {
    o = o || {}; this.C = C; this.env = o.env || {}; this.parts = o.parts ? o.parts.slice() : C.parts.filter((p) => p.alive !== false);
    for (const p of this.parts) p.alive = true;
    this.B = o.body || WK.HOME; this.ut = o.ut == null ? WK.UT0 : o.ut; this.envFor = o.envFor || null; this._soiN = 0; this.S = new Float64Array(13); this.S[9] = 1; this.t = 0; this.dead = false; this.deadWhy = ''; this.stageNo = 0; this.ev = []; this.isMain = o.main !== false; this.age = 0; this.burned = 0; this.mixDirty = true; this.hitParts = true; this.frags = []; this.burned = 0; this.mixDirty = true; this.hitParts = true; this.frags = [];
    this.ctl = { pitch: 0, yaw: 0, roll: 0, thr: 0, ab: 0, brake: 0, gear: 1, flap: 0, brk: 0, sas: 'stab', mode: 'air' };
    this.act = { sa: 0, sb: 0, sc: 0 }; this.air = { T: 288, p: 101325, rho: 1.225, a: 340, mu: 1.8e-5 }; this.info = {}; this.m = 1; this.c = [0, 0, 0]; this.Ib = _wkMat0(); this.Ibi = _wkMat0();
    this.K = new Float64Array(52); this.kk = [this.K.subarray(0, 13), this.K.subarray(13, 26), this.K.subarray(26, 39), this.K.subarray(39, 52)]; this.tmpS = new Float64Array(13); this.gp = { ok: false, h0: 0, gx: 0, gz: 0, n: [0, 1, 0], water: false, mu: 0.7, qL: [0, 0, 0, 1], alt0: 0, off: 0 };
    this.fAcc = [0, 0, 0]; this.tAcc = [0, 0, 0]; this.Gload = 1; this.sload = new Map(); this.contact = 0; this.impact = [];
    this.rebuild(true);
    if (o.activate !== false) for (const p of this.parts) if (p.d.eng && p.st === 0 && p.d.eng.kind !== 'solid') p.act = true;
  }

  /* ---------- structure ---------- */
  rebuild(first) {
    const P = this.parts, set = new Set(P), ws = [], bs = [], eng = [], gear = [], chutes = [], rws = [], tanks = [], hull = [];
    for (const p of P) {
      const d = p.d;
      if (d.kind === 'wing') { const w = d.wing; for (const s of p.strips) { s.part = p; s.W = w; s.tau = w.cs > 0 ? Math.min(0.7, 0.95 * Math.pow(w.cs, 0.45)) : 0; ws.push(s); } }
      if (p.bstrips) for (const s of p.bstrips) bs.push(s);
      if (d.eng) eng.push(p); if (d.gear) gear.push(p); if (d.chute) chutes.push(p); if (d.rw) rws.push(p);
      if (d.fuelCap > 0 && d.fuelType !== 'none' && d.fuelType !== 'solid') tanks.push(p);
      for (const h of p.hull) hull.push({ p: h, part: p });
    }
    /* sections: parts joined by anything other than a separation joint share propellant */
    const sec = new Map(); let ns = 0; const find = (a) => { let r = a; while (sec.get(r) !== r) r = sec.get(r); return r; };
    for (const p of P) sec.set(p, p);
    for (const p of P) if (p.par && set.has(p.par) && !p.cutStage) { const a = find(p), b = find(p.par); if (a !== b) sec.set(a, b); }
    for (const p of P) p.sec = find(p);
    ws.sort((a, b) => b.pos[2] - a.pos[2]);
    this.top = P.find((p) => !p.par || !set.has(p.par)) || P[0]; for (const g of gear) g.kS = null;
    /* downwash: every strip is influenced by the lift of strips ahead of it on other parts (wing -> tail, canard -> wing) */
    for (const s of ws) {
      const list = [], Sp = s.part;
      for (const o of ws) {
        if (o.part === Sp) continue; const dz = o.pos[2] - s.pos[2]; if (dz < 0.25 * o.c) continue;
        const Wo = o.W, bo = Wo.b, rx = s.pos[0] - o.pos[0], ry = s.pos[1] - o.pos[1], rz = s.pos[2] - o.pos[2];
        const hv = rx * o.n[0] + ry * o.n[1] + rz * o.n[2], l = rx * o.s[0] + ry * o.s[1] + rz * o.s[2] + o.fr * bo;   /* l: spanwise distance of the target from the source wing's root */
        const reach = l < 0 ? 0.5 * Math.exp(-Math.pow(l / (0.5 * bo), 2)) : l <= bo ? 0.5 + 0.12 * Math.sin(Math.PI * l / bo) : 0.5 * Math.exp(-Math.pow((l - bo) / (0.4 * bo), 2));
        const vert = hv > 0 ? Math.exp(-Math.pow(hv / (0.45 * bo + 0.5), 2)) : 1, decay = 1 / (1 + dz / (2.2 * bo + 4));
        const k = (o.area / Wo.S) * reach * vert * decay * 1.8 / 1.5; if (k > 0.015) list.push({ s: o, k });
      }
      list.sort((a, b) => b.k - a.k); s.dwFrom = list.slice(0, 20);
    }
    this.ws = ws; this.bs = bs; this.eng = eng; this.gear = gear; this.chutes = chutes; this.rws = rws; this.tanks = tanks; this.hull = hull; this.nHull = hull.length;
    this.hasWing = ws.length > 0;
    for (const s of ws) {
      const W = s.W, b = W.b, AR = W.AR, lam = W.lam4, cl = Math.cos(lam);
      s.AR = AR; s.cd90 = Math.min(1.98, 1.15 + 0.1 * AR); s.kb = s.part.kb || 1; s.FF = 1 + 2 * W.tc + 60 * Math.pow(W.tc, 4);
      let e = Math.abs(lam) < 0.52 ? 1.78 * (1 - 0.045 * Math.pow(AR, 0.68)) - 0.64 : 4.61 * (1 - 0.045 * Math.pow(AR, 0.68)) * Math.pow(cl, 0.15) - 3.1; s.e = clamp(e, 0.45, 0.95);
      s.as0 = clamp((15 + clamp(0.33 * Math.abs(W.lamLE) * 180 / Math.PI, 0, 25) + 8 * sstep(3, 1, AR)) * (0.75 + 2.5 * W.tc) * Math.PI / 180, 0.14, 0.66);
    }
    for (const s of bs) { const d = s.cp.d, B = d.body; s.f = s.cp.chainF || B.f; s.FFb = s.cp.chainFF || 1.2; s.Lp = s.cp.chainL || B.L; }
    this.massProps(first); this.mixers();
  }
  massProps(first) {
    const P = this.parts; let m = 0, cx = 0, cy = 0, cz = 0;
    for (const p of P) { const mp = p.d.mass + (p.fuel || 0) + (p.extra || 0); p.mm = mp; m += mp; cx += mp * p.com[0]; cy += mp * p.com[1]; cz += mp * p.com[2]; }
    if (!(m > 0)) m = 1; const c = [cx / m, cy / m, cz / m], I = this.Ib; I.fill(0);
    for (const p of P) {
      const dx = p.com[0] - c[0], dy = p.com[1] - c[1], dz = p.com[2] - c[2], d2 = dx * dx + dy * dy + dz * dz, mp = p.mm, Ip = p.I, sc = (p.d.mass > 0 ? mp / p.d.mass : 1);
      I[0] += Ip[0] * sc + mp * (d2 - dx * dx); I[1] += Ip[1] * sc - mp * dx * dy; I[2] += Ip[2] * sc - mp * dx * dz; I[3] += Ip[3] * sc - mp * dx * dy; I[4] += Ip[4] * sc + mp * (d2 - dy * dy); I[5] += Ip[5] * sc - mp * dy * dz;
      I[6] += Ip[6] * sc - mp * dx * dz; I[7] += Ip[7] * sc - mp * dy * dz; I[8] += Ip[8] * sc + mp * (d2 - dz * dz);
    }
    _wkinv3(I, this.Ibi);
    if (!first && this.c) { /* the origin of the craft is fixed in the body: move the tracked COM when the mass distribution shifts */
      const S = this.S, dc = [c[0] - this.c[0], c[1] - this.c[1], c[2] - this.c[2]], dw = _wkqrot([S[6], S[7], S[8], S[9]], dc, [0, 0, 0]);
      S[0] += dw[0]; S[1] += dw[1]; S[2] += dw[2]; const wb = [S[10], S[11], S[12]], wi = _wkqrot([S[6], S[7], S[8], S[9]], wb, [0, 0, 0]), cr = WKV.cross(wi, dw); S[3] += cr[0]; S[4] += cr[1]; S[5] += cr[2];
    }
    this.m = m; this.c = c;
    for (const s of this.ws) { s.rel = [s.pos[0] - c[0], s.pos[1] - c[1], s.pos[2] - c[2]]; }
    for (const s of this.bs) { s.rel = [s.pos[0] - c[0], s.pos[1] - c[1], s.pos[2] - c[2]]; }
    this.mixDirty = true;
  }
  /* which actuator moves which axis, from geometry (recomputed when the mass distribution changes) */
  mixers() {
    const c = this.c, th = (v) => (Math.abs(v) < 0.22 ? 0 : v);
    const norm = (j) => { const mx = Math.max(Math.abs(j[0]), Math.abs(j[1]), Math.abs(j[2])) || 1; return [th(j[0] / mx), th(j[1] / mx), th(j[2] / mx)]; };
    for (const s of this.ws) if (s.ctl && s.tau > 0) {
      const r = [s.pos[0] - c[0], s.pos[1] - c[1], s.pos[2] - c[2]], j = WKV.cross(r, s.n); s.mix = norm(j); s.mixAuth = WKV.len(j) * s.area;
      if (s.part.d.wing.role === 1) s.mix = [0, 0, 0];
    }
    for (const p of this.parts) if (p.d.kind === 'wing' && p.strips) {
      let n = 0; const mm = [0, 0, 0]; for (const s of p.strips) if (s.ctl && s.mix) { mm[0] += s.mix[0]; mm[1] += s.mix[1]; mm[2] += s.mix[2]; n++; } p.mix = n ? [mm[0] / n, mm[1] / n, mm[2] / n] : [0, 0, 0];
    }
    for (const e of this.eng) if (e.d.eng.kind === 'rocket') {
      const r = [e.ePos[0] - c[0], e.ePos[1] - c[1], e.ePos[2] - c[2]]; e.gmx = norm(WKV.cross(r, e.eGx)); e.gmy = norm(WKV.cross(r, e.eGy));
    }
  }

  /* ---------- placement ---------- */
  lowest(qBody, up) {   /* lowest contact point along 'up' (inertial) for orientation qBody, relative to COM */
    let lo = 1e9; const v = [0, 0, 0], c = this.c;
    for (const h of this.hull) { _wkqrot(qBody, [h.p[0] - c[0], h.p[1] - c[1], h.p[2] - c[2]], v); lo = Math.min(lo, WKV.dot(v, up)); }
    for (const g of this.gear) { const tip = g.d.gear.tip, ex = g.ext == null ? 1 : g.ext; const pt = [g.gPos[0] + g.gDir[0] * tip[0] * ex - c[0], g.gPos[1] + g.gDir[1] * tip[0] * ex - c[1], g.gPos[2] + g.gDir[2] * tip[0] * ex - c[2]]; _wkqrot(qBody, pt, v); lo = Math.min(lo, WKV.dot(v, up) + 0.08 * g.d.gear.stroke / 0.3); }
    return lo;
  }

  /* ---------- environment ---------- */
  groundSample(x, z, o) { const g = this.env.ground; if (g) { g(x, z, o); } else { o.h = 0; o.water = false; o.mu = 0.8; } return o; }
  updateGround() {
    const S = this.S, gp = this.gp, pj = WK.proj([S[0], S[1], S[2]], this._pj || (this._pj = { x: 0, y: 0, z: 0, qL: [0, 0, 0, 1], th: 0 }));
    gp.alt0 = pj.y; gp.qL = pj.qL.slice(); gp.th = pj.th; gp.x = pj.x; gp.z = pj.z;
    const o = this._go || (this._go = { h: 0, water: false, mu: 0.8 });
    if (pj.y > 90) { gp.ok = false; gp.h0 = -1e6; this.agl = pj.y; return; }
    this.groundSample(pj.x, pj.z, o); const h0 = o.h; gp.water = !!o.water; gp.mu = o.mu == null ? 0.8 : o.mu; gp.surf = o;
    this.groundSample(pj.x + 2, pj.z, o); const hx = o.h; this.groundSample(pj.x, pj.z + 2, o); const hz = o.h;
    gp.h0 = Math.max(h0, gp.water ? 0 : -1e6); gp.gx = (hx - h0) / 2; gp.gz = (hz - h0) / 2; if (gp.water) { gp.h0 = 0; gp.gx = gp.gz = 0; }
    const nl = [-gp.gx, 1, -gp.gz]; WKV.norm(nl, nl); _wkqrot(gp.qL, nl, gp.n); gp.ok = true; this.agl = pj.y - gp.h0;
  }

  /* ---------- the force model ---------- */
  deriv(S, out) {
    const A = this.air, W = WK, gp = this.gp, c = this.c, m = this.m;
    const r0 = S[0], r1 = S[1], r2 = S[2], rr = Math.sqrt(r0 * r0 + r1 * r1 + r2 * r2), alt = rr - W.R, g = W.MU / (rr * rr * rr);
    W.atm(alt, A); const rho = A.rho, a = A.a, mu = A.mu;
    const q = this._q || (this._q = [0, 0, 0, 1]); q[0] = S[6]; q[1] = S[7]; q[2] = S[8]; q[3] = S[9];
    const vI = this._vI || (this._vI = [0, 0, 0]); vI[0] = S[3]; vI[1] = S[4]; vI[2] = S[5];
    const vb = this._vb || (this._vb = [0, 0, 0]); _wkqrotInv(q, vI, vb);
    const w0 = S[10], w1 = S[11], w2 = S[12];
    let Fx = 0, Fy = 0, Fz = 0, Tx = 0, Ty = 0, Tz = 0;
    const V = this._V || (this._V = [0, 0, 0]);
    const upI = this._up || (this._up = [0, 0, 0]); upI[0] = r0 / rr; upI[1] = r1 / rr; upI[2] = r2 / rr;
    const agl = this.agl == null ? 1e4 : this.agl;
    /* --- lifting surfaces --- */
    const ws = this.ws, nw = ws.length;
    if (rho > 1e-7) {
      for (let i = 0; i < nw; i++) {
        const s = ws[i], rl = s.rel; V[0] = vb[0] + w1 * rl[2] - w2 * rl[1]; V[1] = vb[1] + w2 * rl[0] - w0 * rl[2]; V[2] = vb[2] + w0 * rl[1] - w1 * rl[0];
        /* downwash from surfaces ahead */
        if (s.dwFrom) for (let k = 0; k < s.dwFrom.length; k++) { const dw = s.dwFrom[k], src = dw.s; if (src.dw > 0) { const wd = src.dw * dw.k; V[0] += wd * src.Lx; V[1] += wd * src.Ly; V[2] += wd * src.Lz; } }
        const Vm = Math.sqrt(V[0] * V[0] + V[1] * V[1] + V[2] * V[2]); s.dw = 0;
        if (Vm < 0.4) { s.f0 = 0; continue; }
        const iv = 1 / Vm, vx = V[0] * iv, vy = V[1] * iv, vz = V[2] * iv, n = s.n, fw = s.fw, sp = s.s, vn = vx * n[0] + vy * n[1] + vz * n[2], M = Vm / a, Wg = s.W;
        const alpha = Math.asin(clamp(-vn, -1, 1)), ux = vx - vn * n[0], uy = vy - vn * n[1], uz = vz - vn * n[2], ul = Math.sqrt(ux * ux + uy * uy + uz * uz);
        let lam = Wg.lam4, uf = 1;
        if (ul > 1e-3) { uf = (ux * fw[0] + uy * fw[1] + uz * fw[2]) / ul; const us = (ux * sp[0] + uy * sp[1] + uz * sp[2]) / ul; lam = clamp(Wg.lam4 - Math.atan2(us, uf), -1.3, 1.3); }
        const CLa = _wkClAlpha(s.AR, lam, M) * s.kb, defl = s.ctl ? s.part.defl || 0 : 0, dal = s.tau * defl, ae = alpha + dal;
        let as = s.as0 * (1 - 0.45 * sstep(0.6, 1.0, M)) - 0.4 * Math.abs(dal); as = Math.max(as, 0.12);
        let sig = sstep(as - 0.03, as + 0.12, Math.abs(ae)); if (uf < -0.05) sig = 1;
        const CLatt = CLa * clamp(ae, -as, as), sa = Math.sin(ae), ca = Math.cos(ae), CLpl = s.cd90 * sa * ca, CDpl = s.cd90 * sa * sa;
        const CL = (1 - sig) * CLatt + sig * CLpl, ge = agl < 60 ? (() => { const x = 16 * Math.max(agl, 0.5) / (2 * Wg.b); return x * x / (1 + x * x); })() : 1;
        const Re = rho * Vm * s.c / mu, CD0 = 2.04 * _wkCf(Re, M) * s.FF;
        const cosl = Math.max(0.2, Math.cos(Wg.lam4)), CDw = M > 0.45 ? _wkWave(M * cosl, Wg.tc / cosl, CLatt) * cosl : 0, CDi = (1 - sig) * CLatt * CLatt / (Math.PI * s.AR * s.e) * ge;
        const CD = CD0 + CDi + sig * CDpl + CDw, qd = 0.5 * rho * Vm * Vm, qS = qd * s.area;
        /* lift direction: n minus its component along the velocity */
        let lx = n[0] - vn * vx, ly = n[1] - vn * vy, lz = n[2] - vn * vz; const ll = Math.sqrt(lx * lx + ly * ly + lz * lz) || 1; lx /= ll; ly /= ll; lz /= ll;
        const Lm = qS * CL, Dm = qS * CD; let fx = Lm * lx - Dm * vx, fy = Lm * ly - Dm * vy, fz = Lm * lz - Dm * vz;
        s.Lx = lx * (CL >= 0 ? 1 : -1); s.Ly = ly * (CL >= 0 ? 1 : -1); s.Lz = lz * (CL >= 0 ? 1 : -1); s.dw = Math.abs(CL) * Vm * 1.5 / (Math.PI * s.AR) * (1 - sig);
        /* flap lift acts further back: split it out to give the right pitching moment */
        const CLf = (1 - sig) * CLa * dal; let px = rl[0], py = rl[1], pz = rl[2];
        if (CLf !== 0 && s.ctl) { const fL = qS * CLf; const gx = fL * lx, gy = fL * ly, gz = fL * lz, ax = -0.35 * s.c * fw[0], ay = -0.35 * s.c * fw[1], az = -0.35 * s.c * fw[2];
          const ox = rl[0] + ax, oy = rl[1] + ay, oz = rl[2] + az; Tx += oy * gz - oz * gy; Ty += oz * gx - ox * gz; Tz += ox * gy - oy * gx; fx -= gx; fy -= gy; fz -= gz; Fx += gx; Fy += gy; Fz += gz; }
        Fx += fx; Fy += fy; Fz += fz; Tx += py * fz - pz * fy; Ty += pz * fx - px * fz; Tz += px * fy - py * fx;
        s.f0 = Math.sqrt(fx * fx + fy * fy + fz * fz) + Math.abs(CLf) * qS; s.fx = fx; s.fy = fy; s.fz = fz; s.CL = CL; s.alpha = alpha;
      }
    }
    /* --- body strips --- */
    const bs = this.bs, nb = bs.length;
    if (rho > 1e-7) {
      for (let i = 0; i < nb; i++) {
        const s = bs[i], rl = s.rel; V[0] = vb[0] + w1 * rl[2] - w2 * rl[1]; V[1] = vb[1] + w2 * rl[0] - w0 * rl[2]; V[2] = vb[2] + w0 * rl[1] - w1 * rl[0];
        const Vm = Math.sqrt(V[0] * V[0] + V[1] * V[1] + V[2] * V[2]); if (Vm < 0.4) continue;
        const iv = 1 / Vm, ax = s.ax, vx = V[0] * iv, vy = V[1] * iv, vz = V[2] * iv, ca = vx * ax[0] + vy * ax[1] + vz * ax[2], sa2 = Math.max(0, 1 - ca * ca), sa = Math.sqrt(sa2), M = Vm / a, qd = 0.5 * rho * Vm * Vm, cp = s.cp, B = cp.d.body;
        const Re = rho * Vm * s.Lp / mu, Cf = _wkCf(Re, M), Sw = Math.PI * (s.rf + s.rb) * Math.sqrt(s.len * s.len + (s.rf - s.rb) * (s.rf - s.rb));
        let ax_f = -Math.sign(ca) * qd * Cf * Sw * s.FFb * Math.abs(ca);   /* skin friction along the axis */
        const fwd = ca >= 0, ca2 = ca * ca;
        if (s.first && cp.exF > 0) { if (fwd) ax_f -= qd * (B.nose ? _wkNoseCd(M, B.f, B.shp) : _wkFlatCd(M)) * cp.exF * ca2; else ax_f += qd * _wkBaseCd(M) * cp.exF * ca2; }
        if (s.last && cp.exB > 0) { if (fwd) ax_f -= qd * _wkBaseCd(M) * cp.exB * ca2; else ax_f += qd * _wkFlatCd(M) * cp.exB * ca2; }
        let fx = ax_f * ax[0], fy = ax_f * ax[1], fz = ax_f * ax[2];
        if (sa > 1e-4) {
          const tx = (vx - ca * ax[0]) / sa, ty = (vy - ca * ax[1]) / sa, tz = (vz - ca * ax[2]) / sa;
          const dA = Math.PI * (s.rb * s.rb - s.rf * s.rf), Cdc = 1.2 + 0.4 * sstep(0.8, 1.4, M), N = -qd * (dA * 2 * sa * ca + Cdc * 2 * s.rm * s.len * sa2);
          fx += N * tx; fy += N * ty; fz += N * tz;
        }
        Fx += fx; Fy += fy; Fz += fz; Tx += rl[1] * fz - rl[2] * fy; Ty += rl[2] * fx - rl[0] * fz; Tz += rl[0] * fy - rl[1] * fx;
        s.f0 = Math.sqrt(fx * fx + fy * fy + fz * fz); s.fx = fx; s.fy = fy; s.fz = fz;
      }
      /* gear drag, chutes */
      for (const gp0 of this.gear) if ((gp0.ext || 0) > 0.05) {
        const rl = [gp0.gPos[0] - c[0], gp0.gPos[1] - c[1], gp0.gPos[2] - c[2]]; V[0] = vb[0] + w1 * rl[2] - w2 * rl[1]; V[1] = vb[1] + w2 * rl[0] - w0 * rl[2]; V[2] = vb[2] + w0 * rl[1] - w1 * rl[0];
        const Vm = Math.sqrt(V[0] * V[0] + V[1] * V[1] + V[2] * V[2]); if (Vm < 0.4) continue; const k = -0.5 * rho * Vm * gp0.d.gear.CdA * gp0.ext; const fx = k * V[0], fy = k * V[1], fz = k * V[2];
        Fx += fx; Fy += fy; Fz += fz; Tx += rl[1] * fz - rl[2] * fy; Ty += rl[2] * fx - rl[0] * fz; Tz += rl[0] * fy - rl[1] * fx;
      }
      for (const ch of this.chutes) if (ch.ch === 1 || ch.ch === 2) {
        const rl = [ch.cPos[0] - c[0], ch.cPos[1] - c[1], ch.cPos[2] - c[2]]; V[0] = vb[0] + w1 * rl[2] - w2 * rl[1]; V[1] = vb[1] + w2 * rl[0] - w0 * rl[2]; V[2] = vb[2] + w0 * rl[1] - w1 * rl[0];
        const Vm = Math.sqrt(V[0] * V[0] + V[1] * V[1] + V[2] * V[2]); if (Vm < 0.4) continue; const k = -0.5 * rho * Vm * ch.d.chute.CdA * (ch.open || 0) * 1.0; const fx = k * V[0], fy = k * V[1], fz = k * V[2];
        Fx += fx; Fy += fy; Fz += fz; Tx += rl[1] * fz - rl[2] * fy; Ty += rl[2] * fx - rl[0] * fz; Tz += rl[0] * fy - rl[1] * fx;
      }
    }
    /* --- thrust --- */
    for (const e of this.eng) {
      const F = e.F || 0; if (F <= 0) { if (e.qTorque) { Tx += e.qTorque[0]; Ty += e.qTorque[1]; Tz += e.qTorque[2]; } continue; }
      const gx = e.gx || 0, gy = e.gy || 0, d = e.eDir, X = e.eGx, Y = e.eGy; let dx = d[0] + gx * X[0] + gy * Y[0], dy = d[1] + gx * X[1] + gy * Y[1], dz = d[2] + gx * X[2] + gy * Y[2]; const dl = 1 / Math.sqrt(dx * dx + dy * dy + dz * dz); dx *= dl; dy *= dl; dz *= dl;
      const fx = F * dx, fy = F * dy, fz = F * dz, rx = e.ePos[0] - c[0], ry = e.ePos[1] - c[1], rz = e.ePos[2] - c[2];
      Fx += fx; Fy += fy; Fz += fz; Tx += ry * fz - rz * fy; Ty += rz * fx - rx * fz; Tz += rx * fy - ry * fx;
      if (e.qTorque) { Tx += e.qTorque[0]; Ty += e.qTorque[1]; Tz += e.qTorque[2]; }
    }
    for (const rw of this.rws) { const t = rw.d.rw.tq; Tx += t * this.act.rx; Ty += t * this.act.ry; Tz += t * this.act.rz; }
    /* --- ground: landing gear and hull --- */
    let Fix = 0, Fiy = 0, Fiz = 0;
    if (gp.ok && agl < 60 + 0) {
      const qL = gp.qL, nI = gp.n, pb = this._pb || (this._pb = [0, 0, 0]), pI = this._pI || (this._pI = [0, 0, 0]), vp = this._vp || (this._vp = [0, 0, 0]), lc = this._lc || (this._lc = [0, 0, 0]), wI = this._wI || (this._wI = [0, 0, 0]), fb = this._fb || (this._fb = [0, 0, 0]), wbv = this._wbv || (this._wbv = [0, 0, 0]);
      wbv[0] = w0; wbv[1] = w1; wbv[2] = w2; _wkqrot(q, wbv, wI);
      const kH = m * 245, cH = m * 12;
      const water = gp.water, mu0 = gp.mu * 0.8;
      const contact = (pcraft, kN, cN, mus, isGear, ge) => {   /* point on craft (craft axes) against the local ground plane */
        const rx = pcraft[0] - c[0], ry = pcraft[1] - c[1], rz = pcraft[2] - c[2]; pb[0] = rx; pb[1] = ry; pb[2] = rz; _wkqrot(q, pb, pI);
        _wkqrotInv(qL, pI, lc);   /* offset in the local level frame */
        const h = gp.alt0 + lc[1] - (gp.h0 + gp.gx * lc[0] + gp.gz * lc[2]); const pen = -h; if (pen <= 0) return 0;
        vp[0] = vI[0] + wI[1] * pI[2] - wI[2] * pI[1]; vp[1] = vI[1] + wI[2] * pI[0] - wI[0] * pI[2]; vp[2] = vI[2] + wI[0] * pI[1] - wI[1] * pI[0];
        const vn = vp[0] * nI[0] + vp[1] * nI[1] + vp[2] * nI[2]; let N = kN * pen - cN * vn; if (N < 0) N = 0;
        if (isGear && isGear.stroke && pen > isGear.stroke) N += kN * 8 * (pen - isGear.stroke);
        let tx = vp[0] - vn * nI[0], ty = vp[1] - vn * nI[1], tz = vp[2] - vn * nI[2];
        let fx = N * nI[0], fy = N * nI[1], fz = N * nI[2];
        if (isGear && isGear.dirs) { /* tyre: rolling direction + sideways */
          const D = isGear.dirs, lon = D.lon, lat = D.lat, vl = tx * lon[0] + ty * lon[1] + tz * lon[2], vs = tx * lat[0] + ty * lat[1] + tz * lat[2];
          const muy = mus * 1.1, fl0 = -N * (isGear.crr * Math.tanh(vl / 0.3) + isGear.brk * 0.6 * mus * Math.tanh(vl / 0.4)), fs0 = -N * muy * Math.tanh(vs / 0.35); let fl = fl0, fs = fs0; const mag = Math.sqrt(fl * fl + fs * fs), lim = N * muy;
          if (mag > lim) { fl *= lim / mag; fs *= lim / mag; }
          fx += fl * lon[0] + fs * lat[0]; fy += fl * lon[1] + fs * lat[1]; fz += fl * lon[2] + fs * lat[2];
        } else {
          const tv = Math.sqrt(tx * tx + ty * ty + tz * tz), k = tv > 1e-6 ? -N * mus * Math.tanh(tv / 0.2) / tv : 0; fx += k * tx; fy += k * ty; fz += k * tz;
        }
        Fix += fx; Fiy += fy; Fiz += fz;
        _wkqrotInv(q, [fx, fy, fz], fb); Tx += ry * fb[2] - rz * fb[1]; Ty += rz * fb[0] - rx * fb[2]; Tz += rx * fb[1] - ry * fb[0];
        this.contact = Math.max(this.contact, pen); this._pen = pen; return N;
      };
      /* hull points */
      const nh = this.hull.length, nw8 = Math.max(6, nh * 0.35); const kh = water ? m * 9.81 / (0.7 * nw8) : kH, ch = water ? m * 4 / nw8 * 2.2 : cH;
      for (let i = 0; i < nh; i++) { const hp = this.hull[i]; this._pen = 0; contact(hp.p, kh, ch, water ? 0.12 : mu0 * 0.75, null); if (this._pen > hp.part.pen) hp.part.pen = this._pen; }
      for (const gr of this.gear) {
        const ex = gr.ext || 0; if (ex < 0.9) continue; const G = gr.d.gear, tip = G.tip[0];
        const pt = this._gp || (this._gp = [0, 0, 0]); pt[0] = gr.gPos[0] + gr.gDir[0] * tip; pt[1] = gr.gPos[1] + gr.gDir[1] * tip; pt[2] = gr.gPos[2] + gr.gDir[2] * tip;
        const kg = gr.kS, cg = gr.cS; if (!gr.dirs) gr.dirs = { lon: [0, 0, 1], lat: [1, 0, 0] };
        /* ground-plane tyre axes from the craft's forward vector, steered */
        const fwdI = _wkqrot(q, gr.gFwd, this._tmpf || (this._tmpf = [0, 0, 0])), dn = fwdI[0] * nI[0] + fwdI[1] * nI[1] + fwdI[2] * nI[2];
        let lx = fwdI[0] - dn * nI[0], ly = fwdI[1] - dn * nI[1], lz = fwdI[2] - dn * nI[2]; const ll = Math.sqrt(lx * lx + ly * ly + lz * lz) || 1; lx /= ll; ly /= ll; lz /= ll;
        const st = gr.steerA || 0, cs = Math.cos(st), sn = Math.sin(st), sx = ly * nI[2] - lz * nI[1], sy = lz * nI[0] - lx * nI[2], sz = lx * nI[1] - ly * nI[0];   /* lat = n x lon... */
        const D = gr.dirs; D.lon[0] = lx * cs + sx * sn; D.lon[1] = ly * cs + sy * sn; D.lon[2] = lz * cs + sz * sn; D.lat[0] = -(lx * sn) + sx * cs; D.lat[1] = -(ly * sn) + sy * cs; D.lat[2] = -(lz * sn) + sz * cs;
        const mus = water ? 0.12 : G.leg ? mu0 * 1.0 : mu0 * 1.25; const info = { stroke: G.stroke, dirs: G.leg ? null : D, crr: G.leg ? 0 : (gp.surf && gp.surf.rr != null ? Math.min(0.1, gp.surf.rr * 1.2) : 0.03), brk: G.brake ? (this.ctl.brake || 0) : (G.leg ? 0 : 0) };
        const N = contact(pt, water ? kg * 0.2 : kg, water ? cg * 2 : cg, mus, info); gr.N = N;
      }
    }
    /* parachute weight etc: gravity */
    const aI = this._aI || (this._aI = [0, 0, 0]); const fbv = this._fbv || (this._fbv = [Fx, Fy, Fz]); fbv[0] = Fx; fbv[1] = Fy; fbv[2] = Fz; _wkqrot(q, fbv, aI);
    const im = 1 / m; out[0] = S[3]; out[1] = S[4]; out[2] = S[5];
    out[3] = (aI[0] + Fix) * im - g * r0; out[4] = (aI[1] + Fiy) * im - g * r1; out[5] = (aI[2] + Fiz) * im - g * r2;
    /* quaternion rate = 0.5 * q * (0, w) */
    out[6] = 0.5 * (q[3] * w0 + q[1] * w2 - q[2] * w1); out[7] = 0.5 * (q[3] * w1 + q[2] * w0 - q[0] * w2); out[8] = 0.5 * (q[3] * w2 + q[0] * w1 - q[1] * w0); out[9] = -0.5 * (q[0] * w0 + q[1] * w1 + q[2] * w2);
    /* Euler: Ib dw/dt = T - w x (Ib w) */
    const I = this.Ib, Iw0 = I[0] * w0 + I[1] * w1 + I[2] * w2, Iw1 = I[3] * w0 + I[4] * w1 + I[5] * w2, Iw2 = I[6] * w0 + I[7] * w1 + I[8] * w2;
    const rx = Tx - (w1 * Iw2 - w2 * Iw1), ry = Ty - (w2 * Iw0 - w0 * Iw2), rz = Tz - (w0 * Iw1 - w1 * Iw0), Ii = this.Ibi;
    out[10] = Ii[0] * rx + Ii[1] * ry + Ii[2] * rz; out[11] = Ii[3] * rx + Ii[4] * ry + Ii[5] * rz; out[12] = Ii[6] * rx + Ii[7] * ry + Ii[8] * rz;
    this.aeroF = this.aeroF || [0, 0, 0]; this.aeroF[0] = Fx; this.aeroF[1] = Fy; this.aeroF[2] = Fz; this.aeroT = this.aeroT || [0, 0, 0]; this.aeroT[0] = Tx; this.aeroT[1] = Ty; this.aeroT[2] = Tz; this.lastFi = [Fix, Fiy, Fiz];
  }
}

/* ================= controls, engines, integration, staging ================= */
const _wkSasAxes = { stab: 1, hold: 1, pro: 1, retro: 1, radial: 1, anti: 1, normal: 1, antinormal: 1 };
WKSim.prototype.demand = function (dt) {
  const S = this.S, ctl = this.ctl, d = this.dem || (this.dem = [0, 0, 0]), p = ctl.pitch || 0, y = ctl.yaw || 0, r = ctl.roll || 0, mode = ctl.sas;
  if (!this.isMain || mode === 'off' || !_wkSasAxes[mode]) { d[0] = -p; d[1] = -y; d[2] = r; return d; }
  const w = [S[10], S[11], S[12]], q = [S[6], S[7], S[8], S[9]], big = this.m > 8000 ? 0.55 : 1, des = [-p * 0.9 * big, -y * 0.5 * big, r * 1.6 * big];
  const rs = Math.hypot(S[0], S[1], S[2]);
  const aim = (tI) => {   /* turn body +Z toward inertial direction tI */
    const tb = _wkqrotInv(q, tI, [0, 0, 0]), ang = Math.acos(clamp(tb[2], -1, 1)), ex = -tb[1], ey = tb[0], el = Math.hypot(ex, ey);
    if (el < 1e-6) return; const k = Math.min(1.2 * ang, 0.7 * big) / el; des[0] = ex * k + des[0] * 0.5; des[1] = ey * k + des[1] * 0.5;
  };
  if (mode === 'hold') {
    if (Math.abs(p) + Math.abs(y) + Math.abs(r) > 0.05 || !this.holdQ) this.holdQ = q.slice();
    else { const t = this.holdQ, qc = [-q[0], -q[1], -q[2], q[3]], qe = _wkqmul(qc, t, [0, 0, 0, 1]); const sg = qe[3] < 0 ? -1 : 1; const k = 1.2; des[0] = clamp(2 * qe[0] * sg * k, -0.6 * big, 0.6 * big); des[1] = clamp(2 * qe[1] * sg * k, -0.6 * big, 0.6 * big); des[2] = clamp(2 * qe[2] * sg * k, -0.8, 0.8) + r * 1.6; }
  } else if (mode !== 'stab') {
    const v = [S[3], S[4], S[5]], vl = WKV.len(v) || 1, vh = [v[0] / vl, v[1] / vl, v[2] / vl], up = [S[0] / rs, S[1] / rs, S[2] / rs], hn = WKV.norm(WKV.cross(WKV.cross(up, vh), up));
    let t = vh; if (mode === 'retro') t = [-vh[0], -vh[1], -vh[2]]; else if (mode === 'radial') t = up; else if (mode === 'anti') t = [-up[0], -up[1], -up[2]];
    else if (mode === 'normal' || mode === 'antinormal') { const h = WKV.norm(WKV.cross([S[0], S[1], S[2]], v)); t = mode === 'normal' ? h : [-h[0], -h[1], -h[2]]; }
    aim(t); des[2] = r * 1.6;
  }
  for (let i = 0; i < 3; i++) { const v = clamp((des[i] - w[i]) * 2.2, -1, 1); d[i] = v === v ? v : 0; }
  return d;
};
WKSim.prototype.takeFuel = function (e, kg, type) {
  if (kg <= 0) return 0; const sec = e.sec; let avail = 0; const L = this.tanks;
  for (let i = 0; i < L.length; i++) { const t = L[i]; if (t.sec === sec && t.d.fuelType === type) avail += t.fuel; }
  if (avail <= 0) return 0; const take = Math.min(kg, avail), f = take / avail;
  for (let i = 0; i < L.length; i++) { const t = L[i]; if (t.sec === sec && t.d.fuelType === type) t.fuel -= t.fuel * f; }
  this.burned += take; return take;
};
WKSim.prototype.fuelLeft = function (sec, type) { let a = 0; for (const t of this.tanks) if (t.sec === sec && t.d.fuelType === type) a += t.fuel; return a; };
WKSim.prototype.prepare = function (dt) {
  const S = this.S, ctl = this.ctl, A = this.air, q = this._pq || (this._pq = [0, 0, 0, 1]);
  q[0] = S[6]; q[1] = S[7]; q[2] = S[8]; q[3] = S[9];
  if (this.burned > this.m * 0.0006) { this.massProps(false); this.burned = 0; }
  if (this.mixDirty) { this.mixers(); this.mixDirty = false; }
  this.updateGround(); const alt = Math.hypot(S[0], S[1], S[2]) - WK.R; WK.atm(alt, A);
  const v = Math.hypot(S[3], S[4], S[5]), M = v / A.a;
  this.alt = alt; this.speed = v; this.mach = M; this.qdyn = 0.5 * A.rho * v * v;
  const d = this.demand(dt), sm = Math.min(1, dt * 18), D = this.dS || (this.dS = [0, 0, 0]); for (let i = 0; i < 3; i++) { D[i] += (d[i] - D[i]) * sm; if (D[i] !== D[i]) D[i] = 0; }
  /* control surfaces: role 0 = mixed control (elevon / aileron / elevator / rudder by geometry), 1 = flap, 2 = airbrake, 3 = fixed */
  for (const p of this.parts) if (p.d.kind === 'wing' && p.strips) {
    let tgt = 0; const role = p.d.wing.role | 0;
    if (p.d.wing.cs > 0) {
      if (role === 0 && p.mix) tgt = clamp(p.mix[0] * D[0] + p.mix[1] * D[1] + p.mix[2] * D[2], -1, 1) * 0.5;
      else if (role === 1) tgt = ctl.flap * 0.6; else if (role === 2) tgt = ctl.brk * 0.7;
    }
    const cur = p.defl || 0; p.defl = cur + clamp(tgt - cur, -1.3 * dt, 1.3 * dt);
  }
  this.act.rx = D[0]; this.act.ry = D[1]; this.act.rz = D[2];
  const th = clamp(ctl.thr || 0, 0, 1), aA = A.rho > 1e-6, vi = this._pv || (this._pv = [0, 0, 0]), vbb = this._pvb || (this._pvb = [0, 0, 0]); vi[0] = S[3]; vi[1] = S[4]; vi[2] = S[5]; _wkqrotInv(q, vi, vbb);
  for (const e of this.eng) {
    const E = e.d.eng; e.F = 0; e.mdot = 0; e.qTorque = null; e.out = false;
    if (!e.act) { e.spool = (e.spool || 0) * Math.exp(-dt / 0.4); if (E.kind === 'rocket') { e.gx = (e.gx || 0) * 0.8; e.gy = (e.gy || 0) * 0.8; } continue; }
    if (E.kind === 'jet') {
      if (!aA) { e.spool = 0; continue; }
      const tgt = th > 0.01 ? Math.max(th, 0.06) : 0.05, s0 = e.spool == null ? tgt : e.spool; e.spool = s0 + (tgt - s0) * (1 - Math.exp(-dt / (E.jt === 'tf' ? 2.2 : 1.4)));
      const useAB = !!(E.ab && ctl.ab && th > 0.9), lap = _wkJetLapse(E.jt, M, A.T, A.p, useAB), Tmax = E.jt === 'tj' ? E.T / 0.6 : E.T;
      let F = Tmax * lap * e.spool;
      const tsfc = (useAB ? E.atsfc : E.tsfc) * Math.sqrt(A.T / 288.15) * (1 + 0.25 * Math.min(M, 2)), need = F * tsfc * dt, got = this.takeFuel(e, need, 'jet');
      if (got < need * 0.999) { F *= need > 0 ? got / need : 0; e.out = true; } e.F = F; e.mdot = got / dt; e.ab = useAB;
    } else if (E.kind === 'prop') {
      if (!aA) { e.spool = 0; continue; }
      const tgt = th > 0.01 ? th * 0.97 + 0.03 : 0.04, s0 = e.spool == null ? tgt : e.spool; e.spool = s0 + (tgt - s0) * (1 - Math.exp(-dt / 0.6));
      const sig = A.rho / 1.225, Pav = E.P * (E.tp ? Math.pow(sig, 0.82) : Math.max(0.02, sig - (1 - sig) / 7.55)) * e.spool;
      const T0 = Math.cbrt(2 * A.rho * Math.PI * E.D * E.D / 4) * Math.pow(0.45 * Pav, 2 / 3), Vf = Math.max(0, WKV.dot(vbb, e.eDir));
      const tipM = Math.sqrt(Vf * Vf + 220 * 220) / A.a, eta = 0.82 * (1 - 0.55 * sstep(0.62, 0.98, tipM)), Fp = Pav > 1 ? eta * Pav / Math.max(Vf, 0.5) : 0;
      let F = Pav > 1 ? 1 / Math.sqrt(1 / (T0 * T0 + 1) + 1 / (Fp * Fp + 1)) : 0;   /* static thrust at low speed, eta*P/V at speed, smooth blend */ const need = E.bsfc * Pav * dt, got = this.takeFuel(e, need, 'jet'); if (got < need * 0.999) { F *= need > 0 ? got / need : 0; e.out = true; }
      e.F = F; e.mdot = got / dt; const Q = got > 0 ? -Pav / 240 : 0; e.qTorque = [e.eDir[0] * Q, e.eDir[1] * Q, e.eDir[2] * Q];
    } else if (E.kind === 'rocket') {
      const tgt = th > 0.01 ? Math.max(th, E.mt) : 0, s0 = e.spool || 0; e.spool = s0 + (tgt - s0) * (1 - Math.exp(-dt / 0.35)); if (e.spool < 0.01) continue;
      const mdotMax = E.F / (WK.G0 * E.iv), need = mdotMax * e.spool * dt, got = this.takeFuel(e, need, E.fuel); if (got < need * 0.999) e.out = true;
      const isp = E.iv - (E.iv - E.is) * Math.min(1, A.p / 101325); e.F = got / dt * WK.G0 * isp; e.mdot = got / dt;
      for (const k of ['gx', 'gy']) { const m = k === 'gx' ? e.gmx : e.gmy; let t = 0; if (m) t = clamp(m[0] * D[0] + m[1] * D[1] + m[2] * D[2], -1, 1) * E.gim; e[k] = (e[k] || 0) + clamp(t - (e[k] || 0), -0.77 * dt, 0.77 * dt); }
    } else if (E.kind === 'solid') {
      if (e.fuel <= 1e-6) { e.act = false; this.ev.push('burnout:' + e.id); continue; }
      e.tb = (e.tb || 0) + dt; const prof = 1 + 0.08 * Math.max(0, 1 - e.tb / 4), isp = E.iv - (E.iv - E.is) * Math.min(1, A.p / 101325);
      const mdot = E.F / (WK.G0 * E.iv) * prof, got = Math.min(e.fuel, mdot * dt); e.fuel -= got; this.burned += got; e.F = got / dt * WK.G0 * isp; e.mdot = got / dt;
    }
  }
  /* landing gear */
  for (const g of this.gear) {
    const G = g.d.gear; if (g.ext == null) g.ext = 1; if (!G.leg) { const tg = ctl.gear ? 1 : 0; g.ext += clamp(tg - g.ext, -dt / 3, dt / 3); } else g.ext = 1;
    g.steerA = G.steer ? clamp(ctl.yaw || 0, -1, 1) * 0.5 / (1 + v / 20) : 0;
    if (!g.kS) { const n = Math.max(2, this.gear.length); g.kS = this.m * 9.81 / (n * 0.35 * G.stroke); g.cS = 2 * 0.55 * Math.sqrt(g.kS * this.m / n); }
  }
  /* parachutes */
  for (const ch of this.chutes) {
    if (ch.ch === 1) { ch.open = Math.min(1, (ch.open || 0) + dt / 3.2); if (ch.open >= 1) ch.ch = 2; }
    if ((ch.ch === 1 || ch.ch === 2) && this.qdyn > 7500 * (0.4 + 0.6 * ch.open)) { ch.ch = 3; ch.open = 0; this.ev.push('chute-torn:' + ch.id); }
  }
};
WKSim.prototype.rk4 = function (h) {
  const S = this.S, n = 13, [k1, k2, k3, k4] = this.kk, T = this.tmpS;
  this.contact = 0; for (const p of this.parts) p.pen = 0;
  this.deriv(S, k1);
  for (let i = 0; i < n; i++) T[i] = S[i] + 0.5 * h * k1[i]; this.deriv(T, k2);
  for (let i = 0; i < n; i++) T[i] = S[i] + 0.5 * h * k2[i]; this.deriv(T, k3);
  for (let i = 0; i < n; i++) T[i] = S[i] + h * k3[i]; this.deriv(T, k4);
  const rr0 = Math.hypot(S[0], S[1], S[2]), g0 = WK.MU / (rr0 * rr0 * rr0), sx = k1[3] + g0 * S[0], sy = k1[4] + g0 * S[1], sz = k1[5] + g0 * S[2]; this.Gspec = Math.hypot(sx, sy, sz) / 9.80665;
  for (let i = 0; i < n; i++) S[i] += h / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
  const l = 1 / Math.hypot(S[6], S[7], S[8], S[9]); S[6] *= l; S[7] *= l; S[8] *= l; S[9] *= l;
};
/* one simulation step of dt seconds (substepped at 120 Hz) */
WKSim.prototype.step = function (dt) {
  if (this.dead) return; WK.use(this.B); const nsub = Math.max(1, Math.ceil(dt / (1 / 120) - 1e-9)), h = dt / nsub;
  for (let i = 0; i < nsub; i++) { this.prepare(h); this.rk4(h); this.t += h; this.ut += h; this.age += h; this.post(h); if (this.dead) break; if ((++this._soiN & 7) === 0) this.soiCheck(); }
  this.derive();
};
/* sphere-of-influence handover: the craft's state is re-expressed in the frame of the body it has just entered or left */
WKSim.prototype.soiCheck = function () { const T = WK.soiTarget(this.B, this.S, this.ut); if (!T) return false; this.switchTo(T); return true; };
WKSim.prototype.switchTo = function (T) {
  const S = this.S, o = WK.reframe(this.B, T, [S[0], S[1], S[2]], [S[3], S[4], S[5]], this.ut); S[0] = o.r[0]; S[1] = o.r[1]; S[2] = o.r[2]; S[3] = o.v[0]; S[4] = o.v[1]; S[5] = o.v[2];
  this.B = T; WK.use(T); this.ev.push('soi:' + T.id); if (this.envFor) this.env = this.envFor(T, this.env); this.gp.ok = false;
};
/* one exact Kepler step of up to h seconds (vacuum coast); stops at an SOI boundary and hands over. returns the time actually advanced */
WKSim.prototype.rail = function (h) {
  const S = this.S, B = this.B, r0 = [S[0], S[1], S[2]], v0 = [S[3], S[4], S[5]], st = this._rst || (this._rst = { r: [0, 0, 0], v: [0, 0, 0] });
  WK.kepler(r0, v0, B.mu, h, st); let adv = h, tgt = WK.soiTarget(B, st.r, this.ut + h);
  if (tgt) { let lo = 0, hi = h; for (let k = 0; k < 30; k++) { const mid = (lo + hi) / 2; WK.kepler(r0, v0, B.mu, mid, st); if (WK.soiTarget(B, st.r, this.ut + mid)) hi = mid; else lo = mid; } adv = hi; WK.kepler(r0, v0, B.mu, adv, st); tgt = WK.soiTarget(B, st.r, this.ut + adv) || tgt; }
  S[0] = st.r[0]; S[1] = st.r[1]; S[2] = st.r[2]; S[3] = st.v[0]; S[4] = st.v[1]; S[5] = st.v[2]; this.t += adv; this.ut += adv; this.age += adv;
  if (tgt) this.switchTo(tgt); return adv;
};
/* time warp: when coasting (no thrust, thin air) take big steps */
WKSim.prototype.warp = function (dt, k) {
  if (this.dead) return; WK.use(this.B); let left = dt * k, guard = 0; const S = this.S;
  while (left > 1e-9 && guard++ < 20000) {
    const B = this.B, rr = Math.hypot(S[0], S[1], S[2]), alt = rr - B.R, v = Math.hypot(S[3], S[4], S[5]);
    if (alt < B.rails) { this.warpStop = true; break; }
    const adv = this.rail(Math.min(left, Math.max(0.5, 0.04 * Math.min(rr, alt + 4000) / Math.max(v, 1)))); left -= adv; if (this.dead) break;
    if (this.B !== B) { this.warpStop = true; break; } /* crossed into another sphere of influence: hand control back */
  }
  for (const e of this.eng) e.F = 0; WK.atm(Math.hypot(S[0], S[1], S[2]) - WK.R, this.air);
  this.derive();
};
WKSim.prototype.post = function (h) {
  const S = this.S, gp = this.gp, Bd = this.B;
  if (Bd.crush || Bd === WK.SUN) { const al = Math.hypot(S[0], S[1], S[2]) - Bd.R; if (al < (Bd.crush ? -20000 : 0)) { this.destroy(Bd.crush ? 'Crushed deep in the gas giant' : 'Burned up in the sun'); return; } }
  /* structural limits: a wing that carries more than its design load for a moment folds; gear torn off by speed */
  if (this.qdyn > 600) for (const p of this.parts) {
    if (p.d.kind === 'wing' && p.strips) { let f = 0; for (const s of p.strips) f += s.f0 || 0; p.load = f; p.ovr = f > p.d.wing.Fmax ? (p.ovr || 0) + h : 0; if (p.ovr > 0.12) { this.ev.push('overload:' + p.id); this.breakPart(p, 'Wing overload'); if (this.dead) return; break; } }
  }
  for (const g of this.gear) if ((g.ext || 0) > 0.2 && this.qdyn > 9000 && !g.d.gear.leg) { this.ev.push('gear-torn:' + g.id); this.breakPart(g, 'Gear torn off'); if (this.dead) return; break; }
  if (this.contact > 0.015) {
    if (!this.wasHit) { /* first touch: closing speed into the ground plane */
      const n = gp.n, vc = -(S[3] * n[0] + S[4] * n[1] + S[5] * n[2]), vt = Math.sqrt(Math.max(0, S[3] * S[3] + S[4] * S[4] + S[5] * S[5] - vc * vc)); this.impactV = Math.max(0, vc); this.impactH = vt;
      this.ev.push('touch:' + this.impactV.toFixed(2) + ':' + vt.toFixed(1));
      for (const g of this.gear) if (g.N > 0 && this.impactV > 3.2 + g.d.gear.stroke * 12) { this.ev.push('gear-broke:' + g.id); this.breakPart(g, 'Landing gear collapsed'); if (this.dead) return; break; }
      if (gp.water && this.impactV > 22) { this.destroy('Water impact'); return; }
    }
    this.wasHit = true;
    const vn = this.impactV || 0;
    if (vn > 5 || (this.impactH || 0) > 25) { let n = 0; for (const p of this.parts.slice()) { if (p.pen > 0.04 && p.d.lim && !p.d.gear && this.parts.includes(p)) { const lim = p.d.lim * (p.d.dec ? 2 : 1), sp = Math.max(vn, (this.impactH || 0) * 0.35); if (sp > lim) { this.breakPart(p, 'Impact'); n++; if (this.dead) return; if (n > 2) break; } } } }
  } else if (this.contact < 0.002) { this.wasHit = false; this.impactV = 0; }
};

/* ---------- staging, separation, breakage ---------- */
WKSim.prototype.subtree = function (root) { const set = new Set(this.parts), out = [], st = [root]; while (st.length) { const p = st.pop(); if (!set.has(p)) continue; out.push(p); for (const k of p.kids) st.push(k); } return out; };
WKSim.prototype.stageNext = function () {
  const n = ++this.stageNo, cuts = []; let any = false;
  for (const p of this.parts) {
    if (p.st === n) { any = true; if (p.d.eng) { p.act = true; p.spool = p.spool || 0; this.ev.push('ignite:' + p.id); } if (p.d.chute && p.ch !== 3) { p.ch = 1; p.open = 0.02; this.ev.push('chute:' + p.id); } }
    if (p.cutStage === n) { any = true; cuts.push(p); }
  }
  const frags = []; for (const p of cuts) { const f = this.split(p, 'sep'); if (f) frags.push(f); }
  this.ev.push('stage:' + n); return { any, frags };
};
WKSim.prototype.split = function (root, why) {
  const sub = this.subtree(root); if (!sub.length || sub.length === this.parts.length) return null;
  const S = this.S, q = [S[6], S[7], S[8], S[9]], oldC = this.c.slice(), crewSub = sub.some((x) => x.d.crew);
  const keep = new Set(this.parts); for (const p of sub) keep.delete(p); this.parts = this.parts.filter((p) => keep.has(p));
  /* fragment: same attitude and rates, positioned by its own COM */
  const f = new WKSim(this.C, { parts: sub, env: this.env, main: false, activate: false, body: this.B, ut: this.ut, envFor: this.envFor });
  const cF = f.c, dc = [cF[0] - oldC[0], cF[1] - oldC[1], cF[2] - oldC[2]], dw = _wkqrot(q, dc, [0, 0, 0]), wI = _wkqrot(q, [S[10], S[11], S[12]], [0, 0, 0]), cr = WKV.cross(wI, dw);
  const FS = f.S; FS[0] = S[0] + dw[0]; FS[1] = S[1] + dw[1]; FS[2] = S[2] + dw[2]; FS[3] = S[3] + cr[0]; FS[4] = S[4] + cr[1]; FS[5] = S[5] + cr[2]; for (let i = 6; i < 13; i++) FS[i] = S[i];
  const mF = f.m; this.rebuild(false);
  if (why === 'sep') { /* push the two halves apart gently along the joint */
    const par = root.par, dir = par ? [root.com[0] - par.com[0], root.com[1] - par.com[1], root.com[2] - par.com[2]] : [0, 0, -1], dl = WKV.len(dir) || 1, db = [dir[0] / dl, dir[1] / dl, dir[2] / dl], di = _wkqrot(q, db, [0, 0, 0]), dv = 1.4, fm = this.m / (this.m + mF);
    FS[3] += di[0] * dv * fm; FS[4] += di[1] * dv * fm; FS[5] += di[2] * dv * fm; S[3] -= di[0] * dv * (1 - fm); S[4] -= di[1] * dv * (1 - fm); S[5] -= di[2] * dv * (1 - fm);
    for (const p of sub) if (p.d.eng && p.d.eng.kind !== 'solid') p.act = false;
  } else { for (const p of sub) if (p.d.eng) p.act = false; FS[3] += (Math.random() - 0.5) * 3; FS[4] += (Math.random() - 0.5) * 3; FS[5] += (Math.random() - 0.5) * 3; }
  f.why = why; f.ctl.gear = this.ctl.gear; f.ctl.sas = 'off';
  if (crewSub && this.isMain) { f.isMain = true; f.ctl = this.ctl; this.isMain = false; this.ctl = Object.assign({}, this.ctl, { thr: 0, ab: 0, sas: 'off' }); f.holdQ = null; f.stageNo = this.stageNo; this.ev.push('takeover'); }
  this.frags.push(f); this.ev.push('split:' + root.id + ':' + why); return f;
};
WKSim.prototype.breakPart = function (p, why) {
  const sub = this.subtree(p); if (!sub.length) return;
  if (p === this.top || (sub.some((x) => x.d.crew) && !this.parts.some((x) => x.d.crew && !sub.includes(x)))) { this.destroy(why); return; }
  const f = this.split(p, 'break'); if (f) { this.broken = (this.broken || 0) + sub.length; this.lastBreak = why; }
};
WKSim.prototype.destroy = function (why) { if (this.dead) return; this.dead = true; this.deadWhy = why || 'Destroyed'; this.ev.push('destroyed:' + this.deadWhy); };

/* ---------- derived flight data for HUD / logic ---------- */
WKSim.prototype.derive = function () {
  WK.use(this.B); const S = this.S, I = this.info, rr = Math.hypot(S[0], S[1], S[2]), up = [S[0] / rr, S[1] / rr, S[2] / rr], q = [S[6], S[7], S[8], S[9]], v = [S[3], S[4], S[5]];
  I.alt = rr - WK.R; I.speed = Math.hypot(v[0], v[1], v[2]); I.vs = WKV.dot(v, up); I.hs = Math.sqrt(Math.max(0, I.speed * I.speed - I.vs * I.vs)); I.mach = I.speed / this.air.a; I.q = 0.5 * this.air.rho * I.speed * I.speed;
  const vb = _wkqrotInv(q, v, [0, 0, 0]); I.aoa = I.speed > 3 ? Math.atan2(-vb[1], vb[2]) : 0; I.beta = I.speed > 3 ? Math.asin(clamp(vb[0] / I.speed, -1, 1)) : 0;
  const f = _wkqrot(q, [0, 0, 1], [0, 0, 0]), yb = _wkqrot(q, [0, 1, 0], [0, 0, 0]), xb = _wkqrot(q, [1, 0, 0], [0, 0, 0]);
  I.pitch = Math.asin(clamp(WKV.dot(f, up), -1, 1)); I.roll = Math.atan2(WKV.dot(xb, up), WKV.dot(yb, up));
  const pj = WK.proj([S[0], S[1], S[2]], this._pj || (this._pj = { x: 0, y: 0, z: 0, qL: [0, 0, 0, 1], th: 0 })), fl = _wkqrotInv(pj.qL, f, [0, 0, 0]); I.hdg = (Math.atan2(fl[0], -fl[2]) + TAU) % TAU;
  I.agl = this.agl == null ? I.alt : this.agl; I.g = this.Gspec || 1; I.m = this.m; I.x = pj.x; I.z = pj.z;
  let fuel = 0, cap = 0; for (const t of this.tanks) { fuel += t.fuel; cap += t.d.fuelCap; } I.fuel = fuel; I.fuelCap = cap; let sol = 0; for (const e of this.eng) if (e.d.eng.kind === 'solid') sol += e.fuel; I.solid = sol;
  I.thrust = 0; for (const e of this.eng) I.thrust += e.F || 0;
  I.orb = WK.orbit([S[0], S[1], S[2]], v, I.orb || {});
};
WKSim.prototype.setState = function (r, v, q, w) { const S = this.S; S[0] = r[0]; S[1] = r[1]; S[2] = r[2]; S[3] = v[0]; S[4] = v[1]; S[5] = v[2]; S[6] = q[0]; S[7] = q[1]; S[8] = q[2]; S[9] = q[3]; S[10] = w[0]; S[11] = w[1]; S[12] = w[2]; };
WK.Sim = WKSim;
