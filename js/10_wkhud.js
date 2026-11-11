/* ================= WORKSHOP HUD, ORBIT MAP, AND THE WORKSHOP'S PLACE IN THE WORLD ================= */
const _wkfAmber = '#ffb02e', _wkfDim = '#93a0b2', _wkfFg = '#eef2f7';
const _wkfLen = (m) => { const a = Math.abs(m); return a < 10000 ? Math.round(m).toLocaleString('en-US') + ' m' : a < 1e8 ? (m / 1000).toFixed(a < 100000 ? 2 : a < 1e7 ? 1 : 0) + ' km' : a < 1e11 ? (m / 1e6).toFixed(a < 1e10 ? 1 : 0) + ' Mm' : (m / 1e9).toFixed(1) + ' Gm'; };
const _wkfTime = (s) => { if (!isFinite(s)) return '--'; if (s > 360000) return (s / 86400).toFixed(s > 8640000 ? 0 : 1) + ' d'; s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), ss = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(ss).padStart(2, '0'); };
WkF.hud = function (g, W, H) {
  if (WkE.on && WkF.main) { WkE.hud(g, W, H); return; }
  const M = WkF.main; if (!M) return; const sim = M.sim, I = sim.info, c = sim.ctl, u = clamp(Math.min(W / 1100, H / 650), 0.72, 1.35), F = (px, w) => (w || 700) + ' ' + Math.round(px * u) + 'px Rajdhani, "Arial Narrow", sans-serif';
  const txt = (s, x, y, font, col, al) => { g.font = font; g.fillStyle = col || _wkfFg; g.textAlign = al || 'left'; g.fillText(s, x, y); };
  const panel = (x, y, w, h) => { g.fillStyle = 'rgba(7,10,15,0.62)'; g.fillRect(x, y, w, h); g.fillStyle = _wkfAmber; g.fillRect(x, y, 3 * u, h); };
  g.textBaseline = 'alphabetic';
  if (WkF.map) WkF.orbitMap(g, W, H, u); else WKS.labels(g, W, H, u);
  /* left readouts */
  const alt = I.alt || 0, sp = I.speed || 0, rows = [['ALTITUDE', _wkfLen(alt)], ['SPEED', sp.toFixed(0) + ' m/s'], ['MACH', sim.air.rho < 1e-9 ? '—' : (I.mach || 0).toFixed(2)], ['CLIMB', (I.vs >= 0 ? '+' : '') + (I.vs || 0).toFixed(0) + ' m/s'], ['G LOAD', (I.g == null ? 1 : I.g).toFixed(1) + ' g']];
  if (I.agl < 3000) rows.splice(1, 0, ['ABOVE GROUND', _wkfLen(I.agl)]);
  panel(12 * u, 12 * u, 170 * u, (rows.length * 36 + 12) * u); rows.forEach((r, i) => { txt(r[0], 24 * u, (34 + i * 36) * u, F(12), _wkfDim); txt(r[1], 24 * u, (50 + i * 36 - 4) * u + 4 * u, F(21), _wkfFg); });
  /* orbit */
  const o = I.orb;
  const Bd = sim.B, okPe = o && o.pe > Math.max(Bd.atmTop || 0, Bd === WK.HOME ? 90000 : Bd.R * 0.02);
  if ((Bd === WK.HOME ? alt > 3000 : alt > 1500) && o) { const rr = o.hyper ? [['ESCAPE', 'hyperbolic'], ['PERIAPSIS', _wkfLen(o.pe)], ['SPEED', sp.toFixed(0) + ' m/s']] : [['APOAPSIS', _wkfLen(o.ap)], ['PERIAPSIS', _wkfLen(o.pe)], ['PERIOD', _wkfTime(o.T)], [o.tAp < o.tPe ? 'TO APOAPSIS' : 'TO PERIAPSIS', _wkfTime(Math.min(o.tAp, o.tPe))]];
    panel(W - 190 * u, 12 * u, 178 * u, (rr.length * 36 + 12) * u); rr.forEach((r, i) => { txt(r[0], W - 178 * u, (34 + i * 36) * u, F(12), _wkfDim); txt(r[1], W - 178 * u, (50 + i * 36) * u, F(20), okPe && !o.hyper ? '#4be08a' : _wkfFg); }); }
  /* attitude indicator */
  const cx = W / 2, cy = H - 92 * u, r = 70 * u, pitchDeg = (I.pitch || 0) * 57.2958, ppd = 1.5 * u;
  g.save(); g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.clip(); g.translate(cx, cy); g.rotate(-(I.roll || 0)); g.translate(0, pitchDeg * ppd);
  g.fillStyle = '#2f64b0'; g.fillRect(-300, -600, 600, 600); g.fillStyle = '#6a4a2c'; g.fillRect(-300, 0, 600, 600); g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(-300, -1, 600, 2);
  g.strokeStyle = 'rgba(255,255,255,0.7)'; g.fillStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 1.2; g.font = F(10); g.textAlign = 'center';
  for (let a = -80; a <= 80; a += 10) { if (!a) continue; const y = -a * ppd, w = (a % 20 ? 14 : 26) * u; g.beginPath(); g.moveTo(-w, y); g.lineTo(w, y); g.stroke(); if (!(a % 20)) { g.fillText(Math.abs(a), -w - 11 * u, y + 3 * u); g.fillText(Math.abs(a), w + 11 * u, y + 3 * u); } }
  g.restore(); g.lineWidth = 2.5 * u; g.strokeStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.stroke();
  g.strokeStyle = _wkfAmber; g.lineWidth = 3 * u; g.beginPath(); g.moveTo(cx - 30 * u, cy); g.lineTo(cx - 10 * u, cy); g.lineTo(cx - 10 * u, cy + 6 * u); g.moveTo(cx + 30 * u, cy); g.lineTo(cx + 10 * u, cy); g.lineTo(cx + 10 * u, cy + 6 * u); g.stroke(); g.fillStyle = _wkfAmber; g.fillRect(cx - 2 * u, cy - 2 * u, 4 * u, 4 * u);
  if (sp > 4) { const fx = cx - (I.beta || 0) * 57.2958 * ppd, fy = cy + (I.aoa || 0) * 57.2958 * ppd; g.strokeStyle = '#4be08a'; g.lineWidth = 2 * u; g.save(); g.beginPath(); g.rect(cx - r, cy - r, 2 * r, 2 * r); g.clip(); g.beginPath(); g.arc(fx, fy, 6 * u, 0, TAU); g.moveTo(fx - 13 * u, fy); g.lineTo(fx - 6 * u, fy); g.moveTo(fx + 6 * u, fy); g.lineTo(fx + 13 * u, fy); g.moveTo(fx, fy - 6 * u); g.lineTo(fx, fy - 12 * u); g.stroke(); g.restore(); }
  txt('HDG ' + String(Math.round((I.hdg || 0) * 57.2958) % 360).padStart(3, '0') + '°', cx, cy + r + 18 * u, F(16), _wkfFg, 'center');
  txt(WKF_SASN[c.sas] || '', cx, cy - r - 8 * u, F(13), c.sas === 'off' ? '#ff4d5e' : _wkfAmber, 'center');
  /* throttle / fuel / stage */
  const bx = 18 * u, by = H - 190 * u, bh = 150 * u; panel(bx - 6 * u, by - 26 * u, 230 * u, bh + 58 * u);
  g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(bx + 8 * u, by, 18 * u, bh); g.fillStyle = _wkfAmber; g.fillRect(bx + 8 * u, by + bh * (1 - c.thr), 18 * u, bh * c.thr); txt('THR', bx + 8 * u, by - 8 * u, F(12), _wkfDim); txt(Math.round(c.thr * 100) + '%', bx + 2 * u, by + bh + 16 * u, F(11), _wkfFg);
  const fr = I.fuelCap > 0 ? I.fuel / I.fuelCap : 0, sol = I.solid > 0; g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(bx + 40 * u, by, 18 * u, bh); g.fillStyle = fr < 0.1 ? '#ff4d5e' : '#4be08a'; g.fillRect(bx + 40 * u, by + bh * (1 - fr), 18 * u, bh * fr); txt('FUEL', bx + 40 * u, by - 8 * u, F(12), _wkfDim); txt(Math.round(fr * 100) + '%', bx + 38 * u, by + bh + 16 * u, F(11), fr < 0.1 ? '#ff4d5e' : _wkfFg);
  const tw = (I.thrust || 0) / (Math.max(1, sim.m) * 9.80665); txt(WkF.spec.mode === 'air' ? 'FLIGHT' : 'STAGE ' + sim.stageNo, bx + 74 * u, by + 14 * u, F(18), _wkfAmber); txt('THRUST', bx + 74 * u, by + 40 * u, F(11), _wkfDim); txt(((I.thrust || 0) / 1000).toFixed(1) + ' kN', bx + 74 * u, by + 58 * u, F(17));
  txt('TWR', bx + 74 * u, by + 82 * u, F(11), _wkfDim); txt(tw.toFixed(2), bx + 74 * u, by + 100 * u, F(17)); txt('MASS', bx + 74 * u, by + 122 * u, F(11), _wkfDim); txt((sim.m / 1000).toFixed(sim.m > 10000 ? 1 : 2) + ' t', bx + 74 * u, by + 140 * u, F(17));
  if (sol) txt('SOLID ' + Math.round(I.solid) + ' kg', bx + 74 * u, by + bh + 16 * u, F(12), _wkfDim);
  /* status chips */
  const chips = [['GEAR', c.gear ? '▼' : '▲', c.gear ? '#4be08a' : _wkfDim, sim.gear.length > 0], ['BRAKE', '', WkF.park || Keys.KeyB ? '#ff4d5e' : _wkfDim, sim.gear.length > 0], ['FLAPS ' + Math.round(c.flap * 100), '', c.flap > 0 ? _wkfAmber : _wkfDim, sim.ws.some((s) => s.part.d.wing.role === 1)], ['AIRBRAKE', '', c.brk ? _wkfAmber : _wkfDim, sim.ws.some((s) => s.part.d.wing.role === 2)], ['AFTERBURNER', '', c.ab ? _wkfAmber : _wkfDim, sim.eng.some((e) => e.d.eng.ab)]];
  let cxp = W - 12 * u, cyp = H - 66 * u; g.textAlign = 'right'; for (const ch of chips) { if (!ch[3]) continue; txt(ch[0] + (ch[1] ? ' ' + ch[1] : ''), cxp, cyp, F(14), ch[2], 'right'); cyp -= 20 * u; }
  /* aero numbers */
  const qd = (I.q || 0) / 1000; txt('AOA ' + ((I.aoa || 0) * 57.2958).toFixed(0) + '°   SLIP ' + ((I.beta || 0) * 57.2958).toFixed(0) + '°', W - 12 * u, cyp - 6 * u, F(14), _wkfFg, 'right'); txt('Q ' + qd.toFixed(1) + ' kPa', W - 12 * u, cyp - 26 * u, F(14), qd > 30 ? '#ff4d5e' : _wkfFg, 'right');
  if ((Bd !== WK.HOME || alt > 4000) && !WkF.map) txt(Bd.name.toUpperCase() + (Bd === WK.SUN ? ' · SOLAR ORBIT' : Bd === WK.HOME ? '' : ' · SPHERE OF INFLUENCE'), cx, 26 * u, F(14), _wkfDim, 'center');
  if (WkF.warp > 1) txt('TIME WARP ' + WkF.warp.toLocaleString('en-US') + 'x', cx, 54 * u, F(24), _wkfAmber, 'center');
  if ((WkF.warp > 1 || (alt > 4000 && Bd !== WK.HOME)) && !WkF.map) { const pr = WKS.predict(M); if (pr) txt((pr.kind === 'enter' ? 'ENCOUNTER ' + pr.body.name.toUpperCase() : 'LEAVES ' + Bd.name.toUpperCase() + ' SOI') + ' in ' + _wksFmtT(pr.ut - sim.ut), cx, (WkF.warp > 1 ? 74 : 54) * u, F(15), '#4be08a', 'center'); } if (WkF.paused) txt('PAUSED', cx, 90 * u, F(34), _wkfAmber, 'center');
  /* warnings */
  let wy = 120 * u; const warn = (t, col) => { txt(t, cx, wy, F(26), col || '#ff4d5e', 'center'); wy += 32 * u; }; const blink = Math.floor(App.time * 3) % 2 === 0;
  if (!WkF.over) {
    if ((I.aoa > 0.32 || I.aoa < -0.32) && sp > 12 && I.agl > 4 && sim.hasWing && alt < 25000 && blink) warn('STALL'); if (I.agl < 120 && I.vs < -Math.max(8, I.agl * 0.35) && I.agl > 2 && !sim.chutes.some((ch) => ch.ch === 2) && blink) warn('PULL UP');
    if (sim.tanks.length && fr < 0.08 && fr > 0 && blink) warn('LOW FUEL', _wkfAmber); if (sim.tanks.length && fr <= 0 && sim.eng.length && sim.burned >= 0 && sim.age > 5 && sim.eng.some((e) => e.out) && blink) warn('OUT OF FUEL');
    if (qd > 45 && blink) warn('OVER-STRESS', _wkfAmber);
  }
  g.textAlign = 'center'; if (!WkF.over) WkF.msgs.forEach((m, i) => { g.globalAlpha = clamp(1.6 - m.age / 2, 0, 1); txt(m.t, cx, (176 + i * 26) * u + (wy - 120 * u), F(19), _wkfFg, 'center'); }); g.globalAlpha = 1;
  /* hints */
  if (WkF.hint > 0 && !WkF.over && !WkF.map) {
    g.globalAlpha = clamp(WkF.hint / 3, 0, 1); const air = WkF.spec.mode === 'air', maxW = W - 24 * u;
    const fit = (str, y, px, col) => { g.font = F(px); const mw = g.measureText(str).width; txt(str, cx, y, F(mw > maxW ? px * maxW / mw : px), col, 'center'); };
    fit(air ? 'Hold SHIFT for throttle · the brakes release themselves · pull back (S) at about ' + (Wk.stats ? (Wk.stats.stall * 1.15).toFixed(0) : '30') + ' m/s' : WkF.start0 ? 'You start coasting in a circular orbit · M = orbit map, N = solar system · burn PROGRADE to climb, RETROGRADE to drop, . to time-warp' : 'Z = full throttle, SPACE lights the first stage · at ~60 m/s tap W to tip east a few degrees, then R until PROGRADE', H - 250 * u, 17, _wkfFg);
    fit(WKF_HELP + (save.set.dev && !air ? ' · K teleport (dev)' : ''), H - 228 * u, 13, _wkfDim); g.globalAlpha = 1; }
  if (!WkF.over && !WkF.map && WkE.can()) { g.globalAlpha = 0.55 + 0.45 * Math.abs(Math.sin(App.time * 2)); txt('H  open the hatch and step out onto ' + Bd.name, cx, 98 * u, F(22), _wkfFg, 'center'); g.globalAlpha = 1; }
  if (WkF.over) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, H * 0.3, W, H * 0.22); txt('CRASHED', cx, H * 0.4, F(64), '#ff4d5e', 'center'); txt(WkF.over.why, cx, H * 0.4 + 30 * u, F(22), _wkfFg, 'center'); txt('ENTER relaunch · ESC back to the workshop', cx, H * 0.4 + 58 * u, F(16), _wkfDim, 'center'); }
  else if (WkF.landed) txt('ENTER to fly again · ESC workshop', cx, H * 0.2, F(18), _wkfDim, 'center');
};
/* ---------- the workshop in the world: a beacon on the apron and a launch pad ---------- */
Wk.initMarkers = function () {
  const A = Air.s; if (!A || Wk.mgroup) return; Wk.site = { x: A.cx - 150, z: A.cz + 120, y: A.H0 }; Wk.pad = { x: A.cx - 330, z: A.cz + 150 };
  const grp = Wk.mgroup = new THREE.Group(); scene.add(grp); const col = 0xffb02e;
  const g = new THREE.Group(); g.position.set(Wk.site.x, A.H0 + 0.25, Wk.site.z);
  const beam = makeBeam(col, 1.8, 130); g.add(beam);
  const ring = new THREE.Mesh(new THREE.RingGeometry(4.5, 5.3, 44), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).convertSRGBToLinear().multiplyScalar(2.4), side: THREE.DoubleSide, transparent: true, opacity: 0.9, depthWrite: false, fog: false })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.2; g.add(ring);
  const spr = iconSprite('🚀', '#ffb02e'); spr.position.y = 11; g.add(spr); grp.add(g); Wk.mk = { g, beam, ring, spr };
  /* launch pad: concrete disc, painted rings, a service tower */
  const pad = new THREE.Group(); pad.position.set(Wk.pad.x, A.H0 + 0.17, Wk.pad.z);
  const conc = new THREE.Mesh(new THREE.CircleGeometry(16, 56), new THREE.MeshStandardMaterial({ color: lc(0x585d63), roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })); conc.rotation.x = -Math.PI / 2; conc.receiveShadow = true; pad.add(conc);
  for (const [r0, r1, c] of [[3.2, 3.7, 0xffb02e], [13.4, 14.2, 0xf1f3f6]]) { const rg = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 56), new THREE.MeshBasicMaterial({ color: lc(c), polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, fog: false })); rg.rotation.x = -Math.PI / 2; rg.position.y = 0.02; pad.add(rg); }
  const steel = new THREE.MeshStandardMaterial({ color: lc(0x8d98a6), roughness: 0.6, metalness: 0.4 }), red = new THREE.MeshStandardMaterial({ color: lc(0xd8352f), roughness: 0.6 });
  const bx = (w, h, d, x, y, z, m) => { const q = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m || steel); q.position.set(x, y, z); q.castShadow = true; q.receiveShadow = true; pad.add(q); return q; };
  for (const [sx, sz] of [[-0.9, -0.9], [0.9, -0.9], [0.9, 0.9], [-0.9, 0.9]]) bx(0.3, 34, 0.3, 11.5 + sx, 17, sz); for (let y = 4; y <= 32; y += 7) { bx(2.4, 0.2, 0.2, 11.5, y, -0.9); bx(2.4, 0.2, 0.2, 11.5, y, 0.9); bx(0.2, 0.2, 2.4, 10.6, y, 0); bx(0.2, 0.2, 2.4, 12.4, y, 0); } bx(0.5, 1.2, 0.5, 11.5, 34.6, 0, red); bx(5, 0.3, 0.5, 9, 26, 0); bx(5, 0.3, 0.5, 9, 14, 0);
  for (const a of [0.8, 2.4, 3.9, 5.5]) { const lp = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 5, 6), steel); lp.position.set(Math.cos(a) * 15, 2.5, Math.sin(a) * 15); pad.add(lp); const lh = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.4, 1.0), fog: false })); lh.position.set(Math.cos(a) * 15, 5.1, Math.sin(a) * 15); pad.add(lh); }
  grp.add(pad); Air.pave.push([-346, -314, 134, 166]);
};
Wk.visual = function (dt, time) {
  const m = Wk.mk; if (!m) return; const dist = Math.hypot(Wk.site.x - Pl.x, Wk.site.z - Pl.z); m.g.visible = dist < 1100 && !Mi; if (!m.g.visible) return;
  m.beam.material.opacity = lerp(0.03, 0.75, sstep(12, 260, dist)); const k = clamp(dist / 60, 4, 18); m.spr.scale.setScalar(k); m.spr.position.y = 9 + k * 0.5; m.ring.scale.setScalar(1 + Math.sin(time * 3) * 0.04);
};
Wk.tick = function () {
  let best = null;
  if (Wk.site && App.mode === 'play' && !Fly.on && !Boat.on && !Mi && !Talk.on && !GAR.edit && !Bust.on && !Tow.on && car.wrecked <= 0 && !devOn('free') && Fare.phase !== 'ride') {
    const dx = Pl.x - Wk.site.x, dz = Pl.z - Wk.site.z; if (dx * dx + dz * dz < 56 && (Foot.on || Math.abs(car.speed) < 7)) best = Wk.site;
  }
  Wk.near = best;
};
Wk.drawMini = function (g) {
  if (!Wk.site) return; const s = FM.toScreen(Wk.site.x, Wk.site.z); g.fillStyle = '#ffb02e'; g.strokeStyle = '#06090e'; g.lineWidth = 2; g.beginPath(); g.moveTo(s[0], s[1] - 8); g.lineTo(s[0] + 5, s[1] + 6); g.lineTo(s[0], s[1] + 3); g.lineTo(s[0] - 5, s[1] + 6); g.closePath(); g.fill(); g.stroke();
};
