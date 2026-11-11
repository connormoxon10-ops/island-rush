/* ================= WORKSHOP STATS: mass, thrust, stability margin, delta-v per stage, design warnings (pure maths, no DOM) ================= */
WK.massOf = function (C) { let m = 0, f = 0; for (const p of C.parts) if (p.alive !== false) { m += p.d.mass + p.fuel; f += p.fuel; } return { m, f, dry: m - f }; };
/* aerodynamic evaluation of the whole craft at a given state; returns forces / torques about the centre of mass in body axes */
WK.aeroAt = function (C, alt, V, aoa, sim) {
  const s = sim || new WKSim(C, { activate: false }); s.ctl.thr = 0; const S = s.S, ca = Math.cos(aoa), sa = Math.sin(aoa);
  S[0] = 0; S[1] = WK.R + alt; S[2] = 0; S[3] = 0; S[4] = -V * sa; S[5] = V * ca; S[6] = S[7] = S[8] = 0; S[9] = 1; S[10] = S[11] = S[12] = 0;
  for (const e of s.eng) e.F = 0; for (const p of s.parts) p.defl = 0; s.agl = 1e5; s.gp.ok = false;
  s.deriv(S, s.K.subarray(0, 13)); return { F: s.aeroF.slice(), T: s.aeroT.slice(), m: s.m, c: s.c };
};
/* neutral point behind the centre of mass (metres): d = dTx/dFy over a small angle-of-attack range */
WK.margin = function (C, sim) {
  const s = sim || new WKSim(C, { activate: false }), V = 90, h = 2.5 * DEG, a = WK.aeroAt(C, 300, V, h, s), b = WK.aeroAt(C, 300, V, -h, s);
  const dF = a.F[1] - b.F[1], dT = a.T[0] - b.T[0]; if (Math.abs(dF) < 1e-3) return { d: NaN, CLa: 0 };
  const S = Math.max(1e-6, WK.wingArea(C)), q = 0.5 * 1.225 * V * V; return { d: dT / dF, CLa: dF / (2 * h) / (q * Math.max(S, Math.PI * 0.25)), cm: a.c };
};
WK.wingArea = function (C) { let S = 0; for (const p of C.parts) if (p.alive !== false && p.d.kind === 'wing') { const n = p.strips ? p.strips[0].n : [0, 1, 0]; if (Math.abs(n[1]) > 0.5) S += p.d.wing.S; } return S; };
WK.refChord = function (C) { let S = 0, c = 0; for (const p of C.parts) if (p.alive !== false && p.d.kind === 'wing') { const n = p.strips[0].n; if (Math.abs(n[1]) > 0.5) { S += p.d.wing.S; c += p.d.wing.S * p.d.wing.S / p.d.wing.b; } } return S > 0 ? c / S : 0; };
/* ideal staging delta-v from a burn simulation: engines ignite/jettison in stage order and draw from their own section's tanks */
WK.stageBurn = function (C, g) {
  g = g || WK.G0; const P = C.parts.filter((p) => p.alive !== false), alive = new Set(P), fuel = new Map(P.map((p) => [p, p.fuel])), out = [];
  const sectionOf = () => { const sec = new Map(); const find = (a) => { let r = a; while (sec.get(r) !== r) r = sec.get(r); return r; }; for (const p of alive) sec.set(p, p); for (const p of alive) if (p.par && alive.has(p.par) && !p.cutStage) { const a = find(p), b = find(p.par); if (a !== b) sec.set(a, b); } const m = new Map(); for (const p of alive) m.set(p, find(p)); return m; };
  const mass = () => { let m = 0; for (const p of alive) m += p.d.mass + fuel.get(p); return m; };
  const maxSt = Math.max(0, ...P.map((p) => Math.max(p.st, p.cutStage || 0, p.d.eng ? p.st : 0))); let active = new Set(), total = 0;
  for (let n = 0; n <= maxSt; n++) {
    for (const p of P) if (alive.has(p) && p.cutStage === n && n > 0) { const st = [p]; while (st.length) { const q = st.pop(); if (!alive.has(q)) continue; alive.delete(q); active.delete(q); for (const k of q.kids) st.push(k); } }
    for (const p of P) if (alive.has(p) && p.d.eng && p.st === n) active.add(p);
    if (n === 0 && !active.size) continue; const sec = sectionOf(), m0 = mass(); let ts = 0, dv = 0, F0 = 0, Fsl = 0;
    const tank = (e, type) => { let a = 0; for (const q of alive) if (sec.get(q) === sec.get(e) && q.d.fuelType === type) a += fuel.get(q); return a; };
    const draw = (e, kg, type) => { let a = tank(e, type); if (a <= 0) return 0; const take = Math.min(kg, a), f = take / a; for (const q of alive) if (sec.get(q) === sec.get(e) && q.d.fuelType === type) fuel.set(q, fuel.get(q) * (1 - f)); return take; };
    let first = true, n_e = 0, ispSum = 0, tF = 0;
    for (let it = 0; it < 4000; it++) {
      let F = 0, md = 0; const dt = 0.5, m = mass();
      for (const e of active) { if (!alive.has(e)) continue; const E = e.d.eng; if (E.kind === 'jet' || E.kind === 'prop') continue;
        if (E.kind === 'solid') { const f = fuel.get(e); if (f <= 1e-6) continue; const mdot = E.F / (g * E.iv), take = Math.min(f, mdot * dt); fuel.set(e, f - take); const Fe = take / dt * g * E.iv; F += Fe; md += take / dt; if (first) { F0 += Fe; Fsl += take / dt * g * E.is; } }
        else { const mdot = E.F / (g * E.iv), take = draw(e, mdot * dt, E.fuel); const Fe = take / dt * g * E.iv; F += Fe; md += take / dt; if (first) { F0 += Fe; Fsl += take / dt * g * E.is; } } }
      if (F <= 0 || md <= 0) break; first = false; const m1 = m - md * dt; dv += F / md * Math.log(m / m1); ts += dt; tF += F * dt; ispSum += md * dt;
    }
    if (dv > 0.5 || n > 0) out.push({ n, dv, m0, m1: mass(), t: ts, twr: F0 / (m0 * g), twrSL: Fsl / (m0 * g), isp: ispSum > 0 ? tF / (ispSum * g) : 0, F: F0 });
    total += dv;
  }
  return { stages: out.filter((s) => s.dv > 0.5 || s.F > 0), dv: total };
};
WK.stats = function (C) {
  const sim = new WKSim(C, { activate: false }), M = WK.massOf(C), R = { mass: M.m, dry: M.dry, fuel: M.f, warnings: [], hints: [] };
  let Fsl = 0, Fvac = 0, jetT = 0, engines = 0, fuelCap = 0, crew = 0, gear = 0, tanks = 0, chutes = 0, rw = 0, rocketE = 0, jetE = 0, solid = 0;
  for (const p of C.parts) { const d = p.d; if (d.crew) crew++; if (d.gear) gear++; if (d.chute) chutes++; if (d.rw) rw++; if (d.fuelCap > 0 && d.fuelType !== 'solid') { tanks++; fuelCap += d.fuelCap; }
    if (d.eng) { engines++; const E = d.eng; if (E.kind === 'rocket') { rocketE++; Fvac += E.F; Fsl += E.F * E.is / E.iv; } else if (E.kind === 'solid') { solid++; Fvac += E.F; Fsl += E.F * E.is / E.iv; } else if (E.kind === 'jet') { jetE++; Fsl += E.T; } else { jetE++; Fsl += Math.cbrt(2 * 1.225 * Math.PI * E.D * E.D / 4) * Math.pow(0.45 * E.P, 2 / 3); } } }
  R.thrustSL = Fsl; R.thrustVac = Fvac; R.twr = Fsl / (M.m * WK.G0); R.engines = engines; R.fuelCap = fuelCap; R.crew = crew; R.gear = gear;
  R.com = sim.c.slice(); R.wingArea = WK.wingArea(C); R.wingLoad = R.wingArea > 0 ? M.m * WK.G0 / R.wingArea : 0; R.stall = R.wingArea > 0 ? Math.sqrt(2 * M.m * WK.G0 / (1.225 * R.wingArea * 1.35)) : 0;
  const mg = WK.margin(C, sim); R.margin = mg.d; R.chord = WK.refChord(C); R.marginPct = R.chord > 0 && isFinite(mg.d) ? mg.d / R.chord * 100 : NaN;
  let zmin = 1e9, zmax = -1e9, rmax = 0.05; for (const p of C.parts) { for (const h of p.hull) { zmin = Math.min(zmin, h[2]); zmax = Math.max(zmax, h[2]); } if (p.d.body && p.d.kind === 'body') rmax = Math.max(rmax, p.d.body.r1, p.d.body.r2); } R.len = zmax - zmin; R.diam = 2 * rmax;
  /* barycentre of the aero surfaces: where the centre of pressure lies */
  R.cop = isFinite(mg.d) ? [sim.c[0], sim.c[1], sim.c[2] - mg.d] : null;
  R.mode = C.mode; const B = WK.stageBurn(C); R.stages = B.stages; R.dv = B.dv;
  const W = R.warnings, H = R.hints, plane = jetE > 0;
  if (!crew) W.push('No command part: start the craft from a cockpit or capsule.');
  if (!engines) W.push('No engines.');
  const sim2 = sim; for (const e of sim2.eng) { const E = e.d.eng; if (E.kind === 'solid') continue; let has = false; for (const t of sim2.tanks) if (t.sec === e.sec && t.d.fuelType === E.fuel && t.fuel > 0) has = true; if (!has) W.push(E.name + ' has no ' + (WK.FUEL[E.fuel] || {}).name.toLowerCase() + ' in its section.'); }
  if (plane) {
    if (R.wingArea <= 0) W.push('Air-breathing engines but no wings: it cannot fly.');
    else {
      if (isFinite(R.margin)) { if (R.marginPct < 0) W.push('Unstable: the centre of mass is behind the aerodynamic centre (' + R.marginPct.toFixed(0) + '% of the wing chord). Add tail area or move weight forward.'); else if (R.marginPct < 5) H.push('Marginally stable (' + R.marginPct.toFixed(0) + '%): twitchy to fly.'); else if (R.marginPct > 40) H.push('Very stable (' + R.marginPct.toFixed(0) + '%): it will need a lot of elevator.'); }
      let ctl = 0; for (const p of C.parts) if (p.d.kind === 'wing' && p.d.wing.cs > 0) ctl++; if (!ctl) W.push('No control surfaces: give some wings or tail surfaces a control fraction.');
      if (!gear) H.push('No landing gear: add wheels to take off and land.');
      if (R.twr < 0.12 && !rocketE) W.push('Too little thrust for takeoff (thrust/weight ' + R.twr.toFixed(2) + ').');
      if (R.stall > 75) H.push('High stall speed (' + R.stall.toFixed(0) + ' m/s): it needs a very long runway.');
    }
  }
  if (rocketE + solid > 0) {
    if (isFinite(R.margin) && !plane) { if (R.margin < 0) H.push('Aerodynamically unstable (centre of pressure ahead of the mass centre). Bigger fins at the bottom help; the gimbal can compensate.'); else if (R.margin < R.diam) H.push('Small stability margin (under one body diameter).'); }
    if (R.twr < 1 && !plane) W.push('Thrust/weight at liftoff is ' + R.twr.toFixed(2) + ': it will not leave the pad.');
    if (C.parts.some((p) => p.d.eng && (p.d.eng.kind === 'rocket' || p.d.eng.kind === 'solid') && p.st === 0)) H.push('Some rocket engines are not in a stage: they would light at launch. Open the stage editor.');
    if (R.dv > 0 && R.dv < 1500 && !plane) H.push('Delta-v ' + R.dv.toFixed(0) + ' m/s: a suborbital hop. Low orbit needs roughly 3300 m/s including losses.');
  }
  return R;
};
