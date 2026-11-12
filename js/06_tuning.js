/* ================= TUNING: a per-car setup sheet =================
   Every owned car has its own setup (save.setup[carId]); a value that is not stored is at its stock setting. Setup.derive() turns a car definition, its upgrade-adjusted
   tune and a setup into the chassis numbers (P) and tune numbers (T) the physics in 06_car.js reads, so every slider changes something stepCar() really computes with:
     gearing      final drive and ratio spread            -> P.fd, P.gears
     engine       power band, traction control, nitro     -> P.tqSkew (where the torque peak sits), P.tc, P.nitK / P.nitDrain (a stronger shot empties the tank faster)
     aero         front and rear wing                     -> T.cl (downforce), T.cd (drag), P.ab (aero balance)
     suspension   ride height, front and rear roll bars   -> P.cgh (weight transfer), P.rsf (which axle takes the roll, so which end gives up first), cornering stiffness, off-road grip
     alignment    camber and toe, front and rear          -> P.latF/P.latR, P.lonF/P.lonR (cornering against traction and braking grip), P.cf/P.cr (response), rolling drag
     tyres        pressures, front and rear               -> the same grip factors, response, rolling resistance
     brakes       bias and pressure                       -> P.bb (front share of the braking), T.brk
     chassis      ballast, steering lock, centre diff     -> P.a/P.b (weight distribution), P.sk, P.rd (all-wheel-drive cars)
   Setup.estimate() then runs the same longitudinal model as stepCar() in one dimension (traction limit with weight transfer, the gearbox's shift rule, drag and rolling
   resistance) and the same axle-limit sums for cornering and braking, so the numbers on the tuning screen are what the car will do (tests/tuning1.js checks them against real runs). */
const TU = [
  { k: 'fd', g: 'Gearing', n: 'Final drive', min: 0.7, max: 1.4, step: 0.01, def: 1, fmt: (v, p) => (v * p.fd).toFixed(2) + ' : 1', tip: 'Shorter (higher number) = harder acceleration, lower top speed.' },
  { k: 'spread', g: 'Gearing', n: 'Ratio spread', min: 0.8, max: 1.25, step: 0.01, def: 1, fmt: (v) => (v < 0.995 ? 'Close ' : v > 1.005 ? 'Wide ' : 'Stock ') + Math.round(v * 100) + '%', tip: 'Close ratios keep the engine in its power band; wide ratios make first gear shorter and top gear the same.' },
  { k: 'band', g: 'Engine', n: 'Power band', min: -1, max: 1, step: 0.05, def: 0, fmt: (v) => (v < -0.02 ? 'Low-end ' : v > 0.02 ? 'Top-end ' : 'Stock ') + (v > 0 ? '+' : '') + Math.round(v * 100), tip: 'Cam and boost timing: where in the rev range the torque peaks.' },
  { k: 'tc', g: 'Engine', n: 'Traction control', min: 0, max: 10, step: 1, def: 7, fmt: (v) => (v === 0 ? 'Off' : String(v)), tip: 'How hard power is cut when the rear tyres are sliding. Off lets you steer on the throttle, and spin.' },
  { k: 'nit', g: 'Engine', n: 'Nitro jet size', min: -1, max: 1, step: 0.05, def: 0, fmt: (v) => '+' + Math.round((0.32 + 0.2 * v) * 100) + '% thrust, ' + (100 / (24 * (1 + 0.75 * v))).toFixed(1) + ' s per 100', tip: 'A bigger jet hits harder and empties the tank sooner.' },
  { k: 'wingF', g: 'Aero', n: 'Front splitter', min: 0, max: 10, step: 1, def: 3, fmt: (v) => String(v), tip: 'Front downforce: more front grip at speed, a little drag.' },
  { k: 'wingR', g: 'Aero', n: 'Rear wing', min: 0, max: 10, step: 1, def: 3, fmt: (v) => String(v), tip: 'Rear downforce: stability and traction at speed, more drag and a lower top speed.' },
  { k: 'ride', g: 'Suspension', n: 'Ride height', min: -40, max: 40, step: 5, def: 0, fmt: (v) => (v > 0 ? '+' : '') + v + ' mm', tip: 'Lower = less weight transfer and a little more downforce; higher = better off the tarmac.' },
  { k: 'arbF', g: 'Suspension', n: 'Front anti-roll bar', min: 1, max: 10, step: 1, def: 5, fmt: (v) => String(v), tip: 'Stiffer front = the front tyres take more of the roll and give up first (understeer).' },
  { k: 'arbR', g: 'Suspension', n: 'Rear anti-roll bar', min: 1, max: 10, step: 1, def: 5, fmt: (v) => String(v), tip: 'Stiffer rear = the rear gives up first (oversteer). Stiffer overall = sharper, worse on rough ground.' },
  { k: 'camF', g: 'Alignment', n: 'Front camber', min: -4, max: 0, step: 0.1, def: -1, fmt: (v) => v.toFixed(1) + '°', tip: 'Cornering grip peaks near -2.5°; more negative costs braking grip.' },
  { k: 'camR', g: 'Alignment', n: 'Rear camber', min: -4, max: 0, step: 0.1, def: -1, fmt: (v) => v.toFixed(1) + '°', tip: 'Cornering grip peaks near -2.5°; more negative costs traction.' },
  { k: 'toeF', g: 'Alignment', n: 'Front toe', min: -0.5, max: 0.5, step: 0.05, def: 0, fmt: (v) => (v < 0 ? 'out ' : v > 0 ? 'in ' : '') + Math.abs(v).toFixed(2) + '°', tip: 'Toe-out sharpens turn-in; any toe adds rolling drag.' },
  { k: 'toeR', g: 'Alignment', n: 'Rear toe', min: -0.5, max: 0.5, step: 0.05, def: 0.1, fmt: (v) => (v < 0 ? 'out ' : v > 0 ? 'in ' : '') + Math.abs(v).toFixed(2) + '°', tip: 'Toe-in settles the rear; toe-out makes it rotate.' },
  { k: 'psiF', g: 'Tyres', n: 'Front pressure', min: 20, max: 40, step: 0.5, def: 30, fmt: (v) => v.toFixed(1) + ' psi', tip: 'Grip peaks near 27 psi. Softer = more rolling resistance and a lazier response; harder = less grip, sharper.' },
  { k: 'psiR', g: 'Tyres', n: 'Rear pressure', min: 20, max: 40, step: 0.5, def: 30, fmt: (v) => v.toFixed(1) + ' psi', tip: 'As the front. Drag racers drop the rears for launch grip.' },
  { k: 'bias', g: 'Brakes', n: 'Brake bias', min: -12, max: 12, step: 1, def: 0, fmt: (v) => (v === 0 ? 'Stock' : (v > 0 ? 'Front +' : 'Rear +') + Math.abs(v) + '%'), tip: 'Rearward bias rotates the car under braking and can lock the rears; too far either way lengthens the stop.' },
  { k: 'bpres', g: 'Brakes', n: 'Brake pressure', min: 70, max: 130, step: 5, def: 100, fmt: (v) => v + '%', tip: 'How much braking a full pedal asks for.' },
  { k: 'ballast', g: 'Chassis', n: 'Ballast position', min: -4, max: 4, step: 0.5, def: 0, fmt: (v) => (v === 0 ? 'Centre' : (v > 0 ? 'Forward ' : 'Rearward ') + Math.abs(v) + '%'), tip: 'Moves weight between the axles: forward for turn-in and front-drive traction, rearward for rear-drive launches.' },
  { k: 'lock', g: 'Chassis', n: 'Steering lock', min: 80, max: 125, step: 5, def: 100, fmt: (v) => v + '%', tip: 'How far the front wheels turn at full lock.' },
  { k: 'cdiff', g: 'Chassis', n: 'Centre diff (rear share)', min: 20, max: 90, step: 5, def: (p) => Math.round(p.rd * 20) * 5, awd: true, fmt: (v) => (100 - v) + ' / ' + v, tip: 'All-wheel drive only: how much of the torque goes to the rear axle.' }
];
const TU_BY = {}; for (const t of TU) TU_BY[t.k] = t;
const TU_PRESETS = {
  Stock: {},
  Drag: { fd: 1.12, spread: 0.92, band: 0.5, nit: 1, wingF: 0, wingR: 1, ride: -20, arbF: 3, arbR: 3, camF: -0.5, camR: 0, toeF: 0, toeR: 0, psiF: 34, psiR: 24, ballast: -3, tc: 4 },
  Grip: { wingF: 7, wingR: 8, ride: -30, arbF: 6, arbR: 6, camF: -2.5, camR: -2.2, toeF: -0.1, toeR: 0.2, psiF: 27, psiR: 27, bias: 2, fd: 1.06 },
  'Top speed': { fd: 0.82, spread: 1.1, band: 0.6, wingF: 0, wingR: 0, ride: -30, psiF: 36, psiR: 36, toeF: 0, toeR: 0, camF: -0.5, camR: -0.5 },
  Drift: { tc: 0, arbF: 4, arbR: 9, camF: -3.2, camR: -0.5, toeF: -0.3, toeR: -0.1, psiF: 28, psiR: 36, bias: -6, lock: 125, wingF: 5, wingR: 0, band: -0.4, ballast: 2 },
  Rally: { ride: 35, arbF: 3, arbR: 3, fd: 1.15, spread: 0.94, band: -0.5, psiF: 25, psiR: 25, camF: -1.5, camR: -1.2, wingF: 4, wingR: 5, tc: 5 }
};
const Setup = { cache: null };
Setup.base = function (d) { return Object.assign({ awd: false, rsf: 0.5, ab: 0.5, cf: 10.2, cr: 12.2, lat: 1 }, d.p); };
Setup.defOf = function (t, p) { return typeof t.def === 'function' ? t.def(p) : t.def; };
Setup.vals = function (d) { const st = (save.setup && save.setup[d.id]) || {}, p = Setup.base(d), o = {}; for (const t of TU) { const v = st[t.k]; o[t.k] = typeof v === 'number' && isFinite(v) ? clamp(v, t.min, t.max) : Setup.defOf(t, p); } return o; };
Setup.isStock = function (d) { const st = save.setup && save.setup[d.id]; return !st || !Object.keys(st).length; };
/* the physics numbers for car d with tune T0 (stock tune plus upgrades) and setup values v. Pure: nothing is written anywhere */
Setup.derive = function (d, T0, v) {
  const p = Setup.base(d), P = Object.assign({}, p), T = Object.assign({}, T0), L = p.a + p.b;
  /* gearing: the spread pivots on top gear, so top gear keeps its ratio and the lower gears move */
  const gt = p.gears[p.gears.length - 1]; P.fd = p.fd * v.fd; P.gears = p.gears.map((g) => gt * Math.pow(g / gt, v.spread));
  P.tqSkew = Math.pow(1.6, v.band); P.tc = v.tc * 0.1; P.nitK = 1.32 + 0.2 * v.nit; P.nitDrain = 24 * (1 + 0.75 * v.nit);
  /* aero: each click of wing is downforce and drag; the split between them moves the centre of pressure */
  const wing = v.wingF + v.wingR - 6, low = -v.ride / 40;
  T.cl = Math.max(0, (T0.cl || 0) + 0.05 * wing) * (1 + 0.1 * low); T.cd = Math.max(T0.cd * 0.9, T0.cd + 0.012 * wing); P.ab = clamp(p.ab + 0.04 * (v.wingR - v.wingF), 0.2, 0.8);
  /* suspension */
  const stiff = (v.arbF + v.arbR - 10) / 10;
  P.cgh = p.cgh + v.ride / 1000; P.rsf = clamp(p.rsf + 0.035 * (v.arbF - v.arbR), 0.25, 0.75); T.off = T0.off * (1 + 0.12 * v.ride / 40) * (1 - 0.05 * stiff);
  /* tyres: camber and pressure set how much of the tyre works sideways (lat) and lengthways (lon), relative to the stock -1.0 deg and 30 psi */
  const camLat = (c) => (1 - 0.012 * (c + 2.5) * (c + 2.5)) / (1 - 0.012 * 2.25), camLon = (c) => 1 - 0.012 * (Math.abs(c) - 1), psiG = (q) => (1 - 0.0005 * (q - 27) * (q - 27)) / (1 - 0.0005 * 9);
  P.latF = camLat(v.camF) * psiG(v.psiF); P.latR = camLat(v.camR) * psiG(v.psiR); P.lonF = camLon(v.camF) * psiG(v.psiF); P.lonR = camLon(v.camR) * psiG(v.psiR);
  P.cf = p.cf * (1 + 0.06 * stiff) * (1 - 0.25 * v.toeF) * (1 + 0.012 * (v.psiF - 30)); P.cr = p.cr * (1 + 0.06 * stiff) * (1 + 0.3 * (v.toeR - 0.1)) * (1 + 0.012 * (v.psiR - 30));
  P.rrK = (1 - 0.012 * ((v.psiF + v.psiR) / 2 - 30)) * (1 + 0.12 * (Math.abs(v.toeF) + Math.abs(v.toeR - 0.1)));
  /* brakes, chassis */
  P.bb = v.bias / 100; T.brk = T0.brk * v.bpres / 100; P.sk = v.lock / 100;
  const fs = clamp(p.b / L + v.ballast / 100, 0.3, 0.7); P.b = L * fs; P.a = L - P.b; P.L = L;
  if (p.awd) P.rd = v.cdiff / 100;
  return { P, T };
};
/* write the current car's setup into the live chassis and tune (called at the end of refreshTune) */
Setup.apply = function () {
  const d = CUR; if (!d || !d.p) return; const r = Setup.derive(d, tune, Setup.vals(d));
  Object.assign(CARP, r.P); tune.cl = r.T.cl; tune.cd = r.T.cd; tune.off = r.T.off; tune.brk = r.T.brk; Setup.cache = null;
};
Setup.set = function (k, val) {
  const t = TU_BY[k], d = CUR; if (!t) return; const p = Setup.base(d), st = save.setup[d.id] || (save.setup[d.id] = {});
  val = clamp(Math.round(val / t.step) * t.step, t.min, t.max); if (Math.abs(val - Setup.defOf(t, p)) < t.step * 0.25) delete st[k]; else st[k] = +val.toFixed(3);
  refreshTune();
};
Setup.preset = function (name) {
  const pr = TU_PRESETS[name], d = CUR; if (!pr) return; const st = save.setup[d.id] = {};
  for (const k in pr) { const t = TU_BY[k]; if (t && (!t.awd || d.p.awd)) st[k] = clamp(pr[k], t.min, t.max); }
  refreshTune(); writeSave();
};

/* ---------------- what the car will do ---------------- */
/* flat dry tarmac (grip 1.0, rolling resistance 0.014): the same sums as stepCar(), full throttle in a straight line */
Setup.run = function (P, T, nitro) {
  const m = P.m, L = P.L || P.a + P.b, Nf0 = m * G * P.b / L, Nr0 = m * G * P.a / L, mu = T.mu, dt = 1 / 120, o = { t100: 0, t200: 0, qm: 0, qmV: 0, top: 0 };
  let v = 0, x = 0, t = 0, gear = 1, shift = 0, axL = 0, tank = nitro ? T.nitroMax || 100 : 0;
  let t0 = -1;   /* the clock for the distance figures starts 0.3 m off the line, the way a strip's start beam times a run */
  for (let n = 0; n < 120 * 120; n++) {
    const down = (T.cl || 0) * v * v, dN = clamp(m * axL * P.cgh / L, -0.35 * Nf0, 0.35 * Nr0), Nf = Nf0 - dN + down * (1 - P.ab), Nr = Nr0 + dN + down * P.ab;
    const ratio = P.gears[gear - 1] * P.fd, rpm = Math.max(P.idle, v / (TAU * P.rw) * 60 * ratio);
    if (shift > 0) shift -= dt; else if (rpm > P.red * 0.93 && gear < P.gears.length) { gear++; shift = 0.16; }
    const rpmT = Math.max(rpm, P.red * (gear === 1 ? 0.46 : 0.243));
    let tq = T.Tmax * (0.62 + 0.38 * Math.sin(Math.PI * Math.pow(clamp((rpmT - 800) / (P.red - 700), 0, 1), P.tqSkew || 1))); if (rpm > P.red) tq = 0;
    const rdE = clamp(P.awd ? 0.7 * Nr / (Nf + Nr) + 0.3 * P.rd : P.rd, 0.06, 0.94), Fmax = 0.93 * Math.min(mu * (P.lonR || 1) * Nr / rdE, mu * (P.lonF || 1) * Nf / (1 - rdE));
    const nOn = tank > 0 && t > 0.9; if (nOn) tank -= (P.nitDrain || 24) * dt;
    const F = Math.min(tq * ratio * 0.9 / P.rw * (shift > 0 ? 0.15 : 1) * (nOn ? P.nitK || 1.32 : 1), Fmax), R = T.cd * v * v + 0.014 * (P.rrK || 1) * m * G * (1 + 0.012 * v) * (v > 0.05 ? 1 : 0);
    const a = (F - R) / m; axL += (a - axL) * Math.min(1, dt * 6); v = Math.max(0, v + a * dt); x += v * dt; t += dt;
    if (!o.t100 && v >= 27.78) o.t100 = t; if (!o.t200 && v >= 55.56) o.t200 = t; if (t0 < 0 && x >= 0.3) t0 = t; if (!o.qm && x >= 402.636) { o.qm = t - t0; o.qmV = v; }
    if (v > o.top) o.top = v; if (t > 25 && shift <= 0 && a < 0.004) break;   /* (never stop on the dip of a gear change) */
  }
  return o;
};
/* the cornering limit of each axle at speed v (lateral g), and which one gives up first */
Setup.corner = function (P, T, v) {
  const m = P.m, L = P.L || P.a + P.b, Nf0 = m * G * P.b / L, Nr0 = m * G * P.a / L, down = (T.cl || 0) * v * v, lat = P.lat || 1; let ay = T.mu * G, aF = ay, aR = ay;
  for (let i = 0; i < 12; i++) {
    const lq = Math.min(1.2, 2 * ay * P.cgh / (G * P.track)), lq2 = 0.2 * lq * lq, kF = 1 - lq2 * 2 * P.rsf, kR = 1 - lq2 * 2 * (1 - P.rsf);
    aF = T.mu * (Nf0 + down * (1 - P.ab)) * kF * lat * (P.latF || 1) / (m * P.b / L); aR = T.mu * (Nr0 + down * P.ab) * kR * lat * (P.latR || 1) / (m * P.a / L); ay += (Math.min(aF, aR) - ay) * 0.6;
  }
  return { g: Math.min(aF, aR) / G, bal: (aR - aF) / Math.max(aF, aR) };   /* bal > 0: the front runs out first (understeer); < 0: the rear does (oversteer) */
};
Setup.stop = function (P, T, v0) {
  const m = P.m, L = P.L || P.a + P.b, Nf0 = m * G * P.b / L, Nr0 = m * G * P.a / L, mu = T.mu, dt = 1 / 120; let v = v0, x = 0, axL = 0;
  for (let n = 0; n < 120 * 20 && v > 0.2; n++) {
    const down = (T.cl || 0) * v * v, dN = clamp(m * axL * P.cgh / L, -0.35 * Nf0, 0.35 * Nr0), Nf = Nf0 - dN + down * (1 - P.ab), Nr = Nr0 + dN + down * P.ab, fbf = clamp(Nf / (Nf + Nr) + 0.05 + (P.bb || 0), 0.3, 0.85);
    const Fb = Math.min(mu * (m * G + down) * 0.9 * T.brk, 0.88 * Math.min(mu * (P.lonF || 1) * Nf / fbf, mu * (P.lonR || 1) * Nr / (1 - fbf))), a = -(Fb + T.cd * v * v + 0.014 * (P.rrK || 1) * m * G * (1 + 0.012 * v)) / m;
    axL += (a - axL) * Math.min(1, dt * 6); v += a * dt; x += v * dt;
  }
  return x;
};
Setup.estimate = function (P, T) {
  const r = Setup.run(P, T, false), rn = Setup.run(P, T, true), lo = Setup.corner(P, T, 22), hi = Setup.corner(P, T, 55), L = P.L || P.a + P.b;
  const Nf0 = P.m * G * P.b / L, Nr0 = P.m * G * P.a / L;
  return { top: r.top, t100: r.t100, t200: r.t200, qm: r.qm, qmV: r.qmV, qmN: rn.qm, gLo: lo.g, gHi: hi.g, balLo: lo.bal, balHi: hi.bal, stop: Setup.stop(P, T, 27.78), front: P.b / L, turnIn: (Nf0 / (P.cf * Nf0) - Nr0 / (P.cr * Nr0)) * 57.3 * G / 9.81 * 10 };
};
Setup.both = function () {
  if (Setup.cache) return Setup.cache; const d = CUR, T0 = { Tmax: tune.Tmax, mu: tune.mu, cd: d.t.cd, cl: d.t.cl || 0, brk: d.t.brk, off: d.t.off, nitroMax: tune.nitroMax }, p0 = Setup.base(d), sv = {}; for (const t of TU) sv[t.k] = Setup.defOf(t, p0);
  const s = Setup.derive(d, T0, sv), n = Setup.derive(d, T0, Setup.vals(d));
  return (Setup.cache = { stock: Setup.estimate(s.P, s.T), now: Setup.estimate(n.P, n.T), P: n.P, T: n.T });
};

/* ---------------- the tuning screen (pause menu, Tuning tab) ---------------- */
const TU_CSS = `
.tuStats{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin:6px 0 14px;position:sticky;top:0;background:var(--panel,#10151c);padding:8px 0;z-index:2}
.tuStats div{background:rgba(255,255,255,.05);padding:8px 10px;border-left:3px solid var(--amber,#ffb02e)}.tuStats small{display:block;font-size:11px;letter-spacing:.08em;opacity:.7;text-transform:uppercase}
.tuStats b{font-size:19px;font-variant-numeric:tabular-nums}.tuStats em{font-style:normal;font-size:12px;margin-left:6px;opacity:.9}.tuStats em.up{color:#5dff8a}.tuStats em.dn{color:#ff7a6e}
.tuBal{height:8px;background:rgba(255,255,255,.12);position:relative;margin-top:7px}.tuBal i{position:absolute;top:-3px;width:4px;height:14px;background:var(--amber,#ffb02e)}.tuBal:before{content:"";position:absolute;left:50%;top:-2px;width:1px;height:12px;background:rgba(255,255,255,.5)}
.tuRow{display:grid;grid-template-columns:minmax(120px,190px) minmax(120px,1fr) minmax(96px,150px);gap:10px;align-items:center;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.06)}
.tuRow label{font-weight:600}.tuRow small{grid-column:1 / -1;opacity:.6;font-size:12px;margin-top:-4px}.tuRow input{width:100%}.tuRow span{text-align:right;font-variant-numeric:tabular-nums}.tuRow span.ch{color:var(--amber,#ffb02e)}
.tuPre{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 10px}`;
Setup.statsHtml = function () {
  const B = Setup.both(), n = B.now, s = B.stock, mph = save.set.units === 'mph', sp = (v) => Math.round(v * (mph ? 2.23694 : 3.6)) + (mph ? ' mph' : ' km/h');
  const d = (a, b, digits, lowGood, unit) => { const x = a - b; if (Math.abs(x) < Math.pow(10, -digits) * 0.5) return ''; return '<em class="' + ((x < 0) === !!lowGood ? 'up' : 'dn') + '">' + (x > 0 ? '+' : '−') + Math.abs(x).toFixed(digits) + (unit || '') + '</em>'; };
  const tile = (l, v, dl) => '<div><small>' + l + '</small><b>' + v + '</b>' + (dl || '') + '</div>';
  const bal = (l, v) => '<div><small>' + l + '</small><b style="font-size:14px">' + (Math.abs(v) < 0.015 ? 'Neutral' : v > 0 ? 'Understeer ' + Math.round(v * 100) + '%' : 'Oversteer ' + Math.round(-v * 100) + '%') + '</b><div class="tuBal"><i style="left:calc(' + clamp(50 - v * 250, 2, 98) + '% - 2px)"></i></div></div>';
  return tile('Top speed', sp(n.top), d(n.top * (mph ? 2.23694 : 3.6), s.top * (mph ? 2.23694 : 3.6), 0, false)) + tile(mph ? '0–62 mph' : '0–100 km/h', n.t100 ? n.t100.toFixed(2) + ' s' : '–', d(n.t100, s.t100, 2, true)) +
    tile(mph ? '0–124 mph' : '0–200 km/h', n.t200 ? n.t200.toFixed(2) + ' s' : '–', n.t200 && s.t200 ? d(n.t200, s.t200, 2, true) : '') + tile('Quarter mile', n.qm.toFixed(2) + ' s @ ' + sp(n.qmV), d(n.qm, s.qm, 2, true)) + tile('Quarter mile, nitro', n.qmN.toFixed(2) + ' s', d(n.qmN, s.qmN, 2, true)) +
    tile('Grip at 80 km/h', n.gLo.toFixed(2) + ' g', d(n.gLo, s.gLo, 2, false)) + tile('Grip at 200 km/h', n.gHi.toFixed(2) + ' g', d(n.gHi, s.gHi, 2, false)) + tile('100–0 km/h', n.stop.toFixed(1) + ' m', d(n.stop, s.stop, 1, true)) +
    tile('Weight F / R', Math.round(n.front * 100) + ' / ' + Math.round(100 - n.front * 100), '') + bal('Balance, slow corners', n.balLo) + bal('Balance, fast corners', n.balHi) + tile('Turn-in', n.turnIn > 0.02 ? 'Lazy ' + n.turnIn.toFixed(2) : n.turnIn < -0.02 ? 'Darty ' + (-n.turnIn).toFixed(2) : 'Neutral', '');
};
Setup.pane = function () {
  if (!Setup.css) { Setup.css = document.createElement('style'); Setup.css.textContent = TU_CSS; document.head.appendChild(Setup.css); }
  const d = CUR, p = Setup.base(d), v = Setup.vals(d); let h = '<div class="sect">Tuning · ' + esc(d.name) + '<span class="hint">each car keeps its own setup · figures are for dry tarmac, with your upgrades</span></div>';
  h += '<div class="tuStats" id="tuStats">' + Setup.statsHtml() + '</div><div class="tuPre">' + Object.keys(TU_PRESETS).map((n) => '<button class="btn sm" type="button" data-act="tupre" data-id="' + n + '">' + n + '</button>').join('') + '</div>';
  let g = '';
  for (const t of TU) {
    if (t.awd && !p.awd) continue; if (t.g !== g) { g = t.g; h += '<div class="sect">' + g + '</div>'; }
    const def = Setup.defOf(t, p), ch = Math.abs(v[t.k] - def) > t.step * 0.25;
    h += '<div class="tuRow"><label for="tu_' + t.k + '">' + t.n + '</label><input id="tu_' + t.k + '" type="range" min="' + t.min + '" max="' + t.max + '" step="' + t.step + '" value="' + v[t.k] + '" data-slider="tu:' + t.k + '"><span id="tuv_' + t.k + '" class="' + (ch ? 'ch' : '') + '">' + t.fmt(v[t.k], p) + '</span><small>' + t.tip + ' Stock: ' + t.fmt(def, p) + '.</small></div>';
  }
  return h;
};
Setup.onSlider = function (k, val) {
  Setup.set(k, val); const t = TU_BY[k], p = Setup.base(CUR), v = Setup.vals(CUR)[k], el = document.getElementById('tuv_' + k), st = document.getElementById('tuStats');
  clearTimeout(Setup.saveT); Setup.saveT = setTimeout(writeSave, 600);   /* keep the setup once the slider comes to rest */
  if (el) { el.textContent = t.fmt(v, p); el.className = Math.abs(v - Setup.defOf(t, p)) > t.step * 0.25 ? 'ch' : ''; } if (st) st.innerHTML = Setup.statsHtml();
};
