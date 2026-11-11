/* ================= WORKSHOP EVA: climb out of the landed craft in a space suit and explore =================
   Works on any world with a surface except Home (Home has the regular on-foot mode). The astronaut lives in the same flat render frame as the
   landed craft (y = 0 is the ground), so it needs no physics world of its own: gravity is the body's, the suit has a jetpack and a limited air
   supply, and the things to find come from 10_wkevb.js. */
const WkE = { on: false, root: null, suit: null, body: null, p: new THREE.Vector3(), vx: 0, vy: 0, vz: 0, gnd: true, yaw: 0, cyaw: 0, cpit: 0.28, view: 0, o2: 1, fuel: 1, o2out: 0, heat: 0, stride: 0, speed: 0, thrust: 0, t: 0, tick: 0, lamp: null, lampMode: 0, note: null, lms: [], cells: new Set(), site: { x: 0, z: 0 }, samples: [], sPool: null, rocks: null, rcols: [], rcell: [1e9, 1e9], flagG: null, cshadow: null, jump: false, near: null, hudHint: 0 };

/* ---------- the suit ---------- */
WkE.buildSuit = function () {
  const g = new THREE.Group(), rig = new THREE.Group(), w = _wkeW(), d = _wkeD(), st = _wkeS(), org = _wkeO(), gold = _wkeMat('visor', { c: 0xe0b050, r: 0.2, m: 0.75, e: 0x3a2808, ei: 0.9 }); g.add(rig);
  _wkeM(rig, 'box', w, [0, 1.12, 0], [0.5, 0.6, 0.3]); _wkeM(rig, 'box', d, [0, 1.12, 0.155], [0.28, 0.22, 0.04]); _wkeM(rig, 'box', _wkeMat('ledG', { c: 0x000000, e: 0x30ff80, ei: 2 }), [-0.07, 1.14, 0.178], [0.05, 0.03, 0.01]); _wkeM(rig, 'box', _wkeMat('ledR', { c: 0x000000, e: 0xff3a30, ei: 2 }), [0.07, 1.14, 0.178], [0.05, 0.03, 0.01]);
  _wkeM(rig, 'cyl', st, [0, 1.43, 0], [0.15, 0.08, 0.15]); _wkeM(rig, 'box', w, [0, 1.15, -0.26], [0.42, 0.58, 0.22]); _wkeM(rig, 'cyl', st, [-0.13, 1.1, -0.39], [0.07, 0.42, 0.07]); _wkeM(rig, 'cyl', st, [0.13, 1.1, -0.39], [0.07, 0.42, 0.07]); _wkeM(rig, 'box', org, [0, 0.8, -0.26], [0.44, 0.06, 0.24]);
  const head = new THREE.Group(); head.position.set(0, 1.62, 0); rig.add(head); _wkeM(head, 'sph', w, [0, 0, 0], [0.25, 0.25, 0.25]); _wkeM(head, 'sph', gold, [0, 0, 0.09], [0.2, 0.16, 0.16]); _wkeM(head, 'box', d, [0.22, 0.04, 0], [0.04, 0.08, 0.04]);
  const arms = [], legs = [];
  for (const sx of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(sx * 0.33, 1.36, 0); rig.add(sh); _wkeM(sh, 'cyl', w, [0, -0.15, 0], [0.075, 0.3, 0.075]); _wkeM(sh, 'cyl', org, [0, -0.1, 0], [0.082, 0.05, 0.082]);
    const el = new THREE.Group(); el.position.y = -0.3; sh.add(el); _wkeM(el, 'cyl', w, [0, -0.14, 0], [0.068, 0.28, 0.068]); _wkeM(el, 'sph', d, [0, -0.3, 0], [0.085, 0.085, 0.085]); arms.push({ sh, el });
    const hp = new THREE.Group(); hp.position.set(sx * 0.13, 0.86, 0); rig.add(hp); _wkeM(hp, 'cyl', w, [0, -0.2, 0], [0.1, 0.4, 0.1]);
    const kn = new THREE.Group(); kn.position.y = -0.41; hp.add(kn); _wkeM(kn, 'cyl', w, [0, -0.2, 0], [0.085, 0.4, 0.085]); _wkeM(kn, 'box', d, [0, -0.43, 0.05], [0.15, 0.12, 0.3]); legs.push({ hp, kn });
  }
  const fm = _wkeMat('jet', { c: 0xffa040, a: true, o: 0.8 }), fl = []; for (const sx of [-1, 1]) { const f = _wkeM(rig, 'cone', fm, [sx * 0.13, 0.5, -0.39], [0.07, 0.5, 0.07], [Math.PI, 0, 0]); f.visible = false; fl.push(f); }
  const blob = new THREE.Mesh(_wkeGeo('disc'), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.38, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })); blob.scale.set(0.75, 1, 0.75); blob.position.y = 0.04; blob.castShadow = false; g.add(blob);
  g.userData = { rig, head, arms, legs, fl, blob }; return g;
};
WkE.animSuit = function (dt) {
  const U = WkE.suit.userData, sp = WkE.speed, ph = WkE.stride, k = clamp(sp / 3, 0, 1), air = !WkE.gnd, sw = Math.sin(ph) * 0.85 * k;
  U.legs[0].hp.rotation.x = air ? -0.5 : sw; U.legs[1].hp.rotation.x = air ? 0.35 : -sw; U.legs[0].kn.rotation.x = air ? 0.7 : Math.max(0, -Math.sin(ph + 1.2)) * 0.9 * k; U.legs[1].kn.rotation.x = air ? 0.3 : Math.max(0, Math.sin(ph + 1.2)) * 0.9 * k;
  U.arms[0].sh.rotation.x = air ? -0.7 : -sw * 0.8; U.arms[1].sh.rotation.x = air ? -0.7 : sw * 0.8; U.arms[0].sh.rotation.z = air ? 0.55 : 0.08; U.arms[1].sh.rotation.z = air ? -0.55 : -0.08; U.arms[0].el.rotation.x = U.arms[1].el.rotation.x = air ? -0.5 : -0.25 * k - 0.1;
  U.rig.rotation.x = 0.08 * k + (air ? 0.12 : 0); U.rig.position.y = air ? 0 : Math.abs(Math.sin(ph)) * 0.05 * k;
  const th = WkE.thrust; for (const f of U.fl) { f.visible = th > 0.05; f.scale.y = 0.2 + th * 0.9 * (0.8 + 0.2 * Math.sin(WkE.t * 60)); f.position.y = 0.5 - f.scale.y * 0.25; } void dt;
};

/* ---------- start / end ---------- */
WkE.begin = function () {
  WkE.cleanup(); WkE.root = new THREE.Group(); WkE.root.name = 'wkEva'; scene.add(WkE.root);
  WkE.suit = WkE.buildSuit(); WkE.suit.visible = false; WkE.root.add(WkE.suit);
  WkE.lamp = new THREE.SpotLight(0xfff2dc, 0, 140, 0.75, 0.55, 1.1); WkE.lamp.castShadow = false; WkE.root.add(WkE.lamp); WkE.root.add(WkE.lamp.target);
  const cs = new THREE.Mesh(_wkeGeo('disc'), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })); cs.visible = false; cs.castShadow = false; WkE.root.add(cs); WkE.cshadow = cs;
  WkE.on = false; WkE.body = null; WkE.note = null; WkE.o2 = 1; WkE.fuel = 1; WkE.view = 0; WkE.lampMode = 0;
};
WkE.clearWorld = function () {
  for (const lm of WkE.lms) { if (lm.grp) { WkE.root.remove(lm.grp); for (const m of lm.grp.userData.own || []) m.dispose(); } if (lm.beam) WkE.root.remove(lm.beam); } WkE.lms = []; WkE.cells.clear();
  if (WkE.rocks) { WkE.root.remove(WkE.rocks); WkE.rocks.dispose && WkE.rocks.dispose(); WkE.rocks = null; } WkE.rcols = []; WkE.rcell = [1e9, 1e9];
  if (WkE.sPool) { for (const p of WkE.sPool) WkE.root.remove(p.g); WkE.sPool = null; } WkE.samples = []; WkE.body = null;
};
WkE.cleanup = function () {
  if (WkE.root) { WkE.clearWorld(); scene.remove(WkE.root); for (const m of WkE.root.children) if (m.material && m.material.dispose && m.material.type === 'MeshBasicMaterial') m.material.dispose(); }
  WkE.root = null; WkE.suit = null; WkE.lamp = null; WkE.flagG = null; WkE.cshadow = null; WkE.on = false; WkE.body = null; WkE.note = null;
};
WkE.can = function () {
  const M = WkF.main; if (!M || WkF.over || !WkE.root) return false; const sim = M.sim, B = sim.B, I = sim.info;
  return !sim.dead && WkF.spec.mode !== 'air' && B !== WK.HOME && B !== WK.SUN && !B.crush && (I.agl || 0) < 8 && (I.speed || 0) < 2;
};
WkE.toggle = function () { if (WkE.on) WkE.board(false); else WkE.exit(); };
WkE.exit = function () {
  const M = WkF.main; if (!M || !WkE.root) return;
  if (!WkE.can()) { const sim = M.sim, B = sim.B; WkF.say(B === WK.HOME ? 'Home has the regular on-foot mode: use your car and the hangar' : B.crush || B === WK.SUN ? 'There is no surface to stand on here' : WkF.spec.mode === 'air' ? 'EVA is for rockets' : 'Land first: you need to be on the ground and stopped to open the hatch'); return; }
  const sim = M.sim, B = sim.B, c = sim.ctl; WkE.clearWorld(); WkE.body = B; WkE.on = true;
  const dir = new THREE.Vector3(WkF.camDir.x, 0, WkF.camDir.z); if (dir.lengthSq() < 1e-4) dir.set(1, 0, 0); dir.normalize(); const sx = -dir.z, sz = dir.x;
  WkE.p.set(M.P.x + sx * 4.6, 0, M.P.z + sz * 4.6); WkE.vx = WkE.vy = WkE.vz = 0; WkE.gnd = true; WkE.cyaw = Math.atan2(-sx, -sz); WkE.yaw = WkE.cyaw; WkE.cpit = 0.28; WkE.heat = 0; WkE.o2out = 0; WkE.thrust = 0; WkE.speed = 0; WkE.view = 0;
  WkE.site = { x: M.P.x, z: M.P.z }; c.thr = 0; c.brake = 1; WkF.park = true; WkF.warp = 1; WkF.wi = 0; WkF.map = false; WkF.hint = 0; WkF.snap = true; WkE.suit.visible = true;
  WkE.siteLandmarks(B); WkE.genLandmarks(B, WkE.p); WkE.streamLm(B, WkE.p, 0); WkE.updateRocks(B, WkE.p); WkE.updateSamples(B, WkE.p); WkE.syncFlags(B); WkE.tick = 0;
  WkF.say('You step out · ' + B.name.toUpperCase()); WkE.hudHint = 12;
  const pay = WKF_SOI_PAY[B.id] || 10000; WkF.reward('eva_' + B.id, pay, 'First steps on ' + B.name);
};
WkE.board = function (forced) {
  const M = WkF.main; if (!M || !WkE.on) return; const d = Math.hypot(WkE.p.x - M.P.x, WkE.p.z - M.P.z);
  if (!forced && d > 8) { WkF.say('Too far from the craft (' + Math.round(d) + ' m): walk back to it to climb in'); return; }
  WkE.on = false; WkE.suit.visible = false; WkF.snap = true; WkF.ly = WkF.lp = 0; WkE.lamp.intensity = 0; WkE.note = null;
  WkF.say(forced ? 'You blacked out and woke inside the craft. Watch your air.' : 'Back aboard'); if (forced) { WkE.o2 = 0.6; }
};

/* ---------- the things on the ground you can use ---------- */
WkE.nearest = function () {
  const P = WkE.p, B = WkE.body; let best = null, bd = 1e9;
  for (const s of WkE.samples) { const d = Math.hypot(s.x - P.x, s.z - P.z); if (d < 3.6 && d < bd) { best = { kind: 'sample', s, d }; bd = d; } }
  if (best) return best;
  for (const lm of WkE.lms) { if (!lm.grp) continue; const d = Math.hypot(lm.x - P.x, lm.z - P.z), r = lm.type === 'cache' ? 5 : lm.type === 'outpost' ? 9 : lm.rd; if (d < r && d < bd) { best = { kind: lm.type === 'cache' ? 'cache' : 'read', lm, d }; bd = d; } }
  void B; return best;
};
WkE.pay = function (B, mult, n) { return WkF.cheat ? 0 : Math.round((WKF_SOI_PAY[B.id] || 10000) * mult * Math.max(0.03, 0.22 - 0.03 * n) / 50) * 50; };
WkE.interact = function () {
  const B = WkE.body, nr = WkE.nearest(), done = save.wk.done || (save.wk.done = {});
  if (!nr) { WkF.say('Nothing to use here'); return; }
  if (nr.kind === 'sample') { const s = nr.s; done['sk:' + s.key] = 1; const n = (done['sn:' + B.id] | 0) + 1; done['sn:' + B.id] = n; const cash = WkF.cheat || n > 12 ? 0 : Math.round((WKF_SOI_PAY[B.id] || 10000) * 0.03 / 10) * 10; if (cash) { save.money += cash; } writeSave(); WkE.updateSamples(B, WkE.p); Snd.beep(880, 0.08); UI.banner('SAMPLE ' + n, cash ? '+' + money(cash) : 'collected'); return; }
  const lm = nr.lm;
  if (nr.kind === 'cache') { WkE.o2 = 1; WkE.fuel = 1; if (!lm.used) { lm.used = true; const cash = WkF.cheat ? 0 : Math.round((WKF_SOI_PAY[B.id] || 10000) * 0.05 / 50) * 50; if (cash) { save.money += cash; writeSave(); } UI.banner('SUPPLY CACHE', 'Air and fuel restored' + (cash ? ' · +' + money(cash) : '')); Snd.win(); } else WkF.say('Air and jetpack fuel restored'); return; }
  WkE.note = { title: lm.name, text: lm.lore, age: 0 };
};
WkE.discover = function (lm) {
  const B = WkE.body, done = save.wk.done || (save.wk.done = {}); lm.found = true; done['dc:' + lm.key] = 1; const n = done['dn:' + B.id] | 0; done['dn:' + B.id] = n + 1; const cash = WkE.pay(B, WKE_MULT[lm.type] || 1, n);
  if (cash) save.money += cash; writeSave(); UI.banner('DISCOVERED', lm.name + (cash ? ' · +' + money(cash) : '')); Snd.win(); WkE.note = { title: lm.name, text: lm.lore, age: 0 };
};
WkE.plant = function () {
  const B = WkE.body, M = WkF.main, done = save.wk.done || (save.wk.done = {}); if (!WkE.gnd) { WkF.say('Plant the flag with both feet on the ground'); return; }
  if (Math.hypot(WkE.p.x - M.P.x, WkE.p.z - M.P.z) < 5) { WkF.say('Walk a little way from the craft first'); return; }
  done['fl:' + B.id] = [+(WkE.p.x - WkF.ox + Math.sin(WkE.yaw) * 1.5).toFixed(2), +(WkE.p.z - WkF.oz + Math.cos(WkE.yaw) * 1.5).toFixed(2), +WkE.yaw.toFixed(2)]; writeSave(); WkE.syncFlags(B); WkF.reward('flag_' + B.id, Math.round((WKF_SOI_PAY[B.id] || 10000) * 0.5), 'Flag planted on ' + B.name); WkF.say('Flag planted'); Snd.beep(660, 0.1);
};

/* ---------- per-frame ---------- */
WkE.update = function (dt) {
  const M = WkF.main; if (!M || !WkE.root) return; const sim = M.sim, B = sim.B, I = sim.info, btn = E.wkEva; WkE.t += dt;
  const can = WkE.can(); if (btn) { const show = WkE.on || can; if (btn.hidden === show) btn.hidden = !show; const tx = WkE.on ? 'Climb in (H)' : 'Exit craft (H)'; if (btn.textContent !== tx) btn.textContent = tx; }
  if (WkE.on && (WkF.over || sim.dead || sim.B !== WkE.body)) { WkE.on = false; WkE.suit.visible = false; WkF.snap = true; }
  /* a soft blob shadow under the craft on every world (there are no real shadows off Home) */
  const cs = WkE.cshadow, ag = I.agl == null ? 99 : I.agl; if (cs) { const show = B !== WK.HOME && ag < 70 && !B.crush && B !== WK.SUN; cs.visible = show; if (show) { const r = Math.max(2.2, WkF.radius * 0.42) * (1 + ag * 0.02); cs.position.set(M.P.x, 0.03, M.P.z); cs.scale.set(r, 1, r); cs.material.opacity = 0.42 * (1 - ag / 70); } }
  if (!WkE.on) { if (WkE.suit) WkE.suit.visible = false; if (WkE.lamp) WkE.lamp.intensity = 0; if (WkE.body && (B !== WkE.body || (I.alt || 0) > 600)) WkE.clearWorld(); if (WkE.flagG) { if (B !== WK.HOME && (I.alt || 0) < 3000) WkE.syncFlags(B); else WkE.flagG.visible = false; } return; }
  if (WkF.paused) { WkE.place(); return; }
  const g = B.g0, K = Keys; let fw = ((K.KeyW || K.ArrowUp) ? 1 : 0) - ((K.KeyS || K.ArrowDown) ? 1 : 0), sd = (K.KeyD ? 1 : 0) - (K.KeyA ? 1 : 0); const run = !!(K.ShiftLeft || K.ShiftRight);
  WkE.cyaw += (((K.KeyQ || K.ArrowLeft) ? 1 : 0) - ((K.KeyE || K.ArrowRight) ? 1 : 0)) * 1.9 * dt; const cy = WkE.cyaw, f = [Math.sin(cy), Math.cos(cy)], rt = [-Math.cos(cy), Math.sin(cy)];
  let mx = f[0] * fw + rt[0] * sd, mz = f[1] * fw + rt[1] * sd; const ml = Math.hypot(mx, mz); if (ml > 1) { mx /= ml; mz /= ml; }
  const sub = Math.max(1, Math.ceil(dt / (1 / 90))), h = dt / sub, vmax = run ? 5.6 : 2.7, jet = (K.Space && !WkE.gnd && WkE.fuel > 0) ? 1 : 0; WkE.thrust += (jet - WkE.thrust) * Math.min(1, dt * 12);
  for (let i = 0; i < sub; i++) {
    const acc = WkE.gnd ? 16 : 3.2 + jet * 4;
    if (ml > 0.05) { WkE.vx += (mx * vmax - WkE.vx) * Math.min(1, acc * h / vmax); WkE.vz += (mz * vmax - WkE.vz) * Math.min(1, acc * h / vmax); }
    else if (WkE.gnd) { const dmp = Math.max(0, 1 - 9 * h); WkE.vx *= dmp; WkE.vz *= dmp; }
    if (jet) { WkE.vy += (g * 1.35 + 1.2) * h; WkE.fuel = Math.max(0, WkE.fuel - h * 0.085); if (WkE.vy > 9) WkE.vy = 9; }
    WkE.vy -= g * h; WkE.p.x += WkE.vx * h; WkE.p.z += WkE.vz * h; WkE.p.y += WkE.vy * h;
    /* obstacles: the craft, boulders and landmark pieces are upright circles */
    const P = WkE.p, push = (x, z, r, hh) => { if (P.y > hh) return; const dx = P.x - x, dz = P.z - z, d = Math.hypot(dx, dz), R = r + 0.38; if (d < R && d > 1e-4) { const nx = dx / d, nz = dz / d; P.x = x + nx * R; P.z = z + nz * R; const vn = WkE.vx * nx + WkE.vz * nz; if (vn < 0) { WkE.vx -= vn * nx; WkE.vz -= vn * nz; } } };
    push(M.P.x, M.P.z, 2.4, 40); for (const c of WkE.rcols) push(c[0], c[1], c[2], c[2] * 0.55 + 0.1); for (const lm of WkE.lms) for (const c of lm.cols) push(c[0], c[1], c[2], 30);
    if (P.y <= 0) { if (WkE.vy < -5.5 && !WkE.gnd) Snd.foot(false, 1.3, true); P.y = 0; if (WkE.vy < 0) WkE.vy = 0; WkE.gnd = true; } else WkE.gnd = false;
  }
  if (WkE.gnd) WkE.fuel = Math.min(1, WkE.fuel + dt * 0.06);
  WkE.speed = Math.hypot(WkE.vx, WkE.vz); if (WkE.gnd && WkE.speed > 0.3) { const before = Math.floor(WkE.stride / Math.PI); WkE.stride += WkE.speed * dt * 1.9; if (Math.floor(WkE.stride / Math.PI) !== before) Snd.foot(false, 0.35 + WkE.speed * 0.05, false); } else if (WkE.gnd) WkE.stride *= 0.9;
  const tyaw = WkE.view === 1 ? cy : (ml > 0.1 || WkE.speed > 0.8 ? Math.atan2(WkE.vx, WkE.vz) : WkE.yaw); let dy = tyaw - WkE.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); WkE.yaw += dy * Math.min(1, dt * 9);
  if (WkE.jump) { WkE.jump = false; if (WkE.gnd) { WkE.vy = Math.min(4.3, Math.sqrt(2 * g * 6.5)); WkE.gnd = false; WkE.p.y = 0.02; Snd.foot(false, 0.9, true); } }
  /* air, heat, signals */
  const dc = Math.hypot(WkE.p.x - M.P.x, WkE.p.z - M.P.z); let hot = 0; for (const lm of WkE.lms) if (lm.hot && lm.grp) { const d = Math.hypot(lm.x - WkE.p.x, lm.z - WkE.p.z); hot = Math.max(hot, 1 - clamp((d - 3) / lm.hot, 0, 1)); } WkE.heat += (hot - WkE.heat) * Math.min(1, dt * 3);
  if (dc < 7) WkE.o2 = Math.min(1, WkE.o2 + dt * 0.3); else WkE.o2 = Math.max(0, WkE.o2 - dt / 1500 * (run ? 1.4 : 1) * (1 + WkE.heat * 3));
  if (WkE.o2 <= 0) { WkE.o2out += dt; if (WkE.o2out > 4) { WkE.board(true); return; } } else WkE.o2out = 0; if (WkE.o2 < 0.15 && Math.floor(WkE.t * 1.2) !== Math.floor((WkE.t - dt) * 1.2)) Snd.beep(520, 0.05);
  for (const lm of WkE.lms) if (!lm.found && lm.grp && Math.hypot(lm.x - WkE.p.x, lm.z - WkE.p.z) < lm.rd) WkE.discover(lm);
  if (WkE.note) { WkE.note.age += dt; if (WkE.note.age > 11) WkE.note = null; }
  WkE.tick -= dt; if (WkE.tick <= 0) { WkE.tick = 0.45; WkE.genLandmarks(B, WkE.p); WkE.streamLm(B, WkE.p, WkE.t); WkE.updateSamples(B, WkE.p); }
  WkE.updateRocks(B, WkE.p); WkE.tickSamples(WkE.t); for (const lm of WkE.lms) if (lm.tick && lm.grp && Math.hypot(lm.x - WkE.p.x, lm.z - WkE.p.z) < 260) lm.tick(WkE.t, dt);
  if (WkE.hudHint > 0) WkE.hudHint -= dt; WkE.near = WkE.nearest(); WkE.place(); WkE.animSuit(dt);
};
/* put the suit, the lamp and the ground decal where they belong */
WkE.place = function () {
  const s = WkE.suit, P = WkE.p; s.position.copy(P); s.rotation.y = WkE.yaw; s.userData.blob.position.y = 0.04 - P.y; s.userData.blob.material.opacity = 0.4 * clamp(1 - P.y / 12, 0.1, 1); s.userData.blob.rotation.y = -WkE.yaw;
  const env_ = env.sunDir.y, auto = 1 - _wkfSun(-0.06, 0.14, env_), k = WkE.lampMode === 1 ? 1 : WkE.lampMode === 2 ? 0 : auto; const L2 = WkE.lamp; L2.intensity = 2.6 * k; const cy = WkE.cyaw, cp = WkE.view === 1 ? WkE.cpit - 0.25 : -0.1;
  L2.position.set(P.x, P.y + 1.55, P.z); L2.target.position.set(P.x + Math.sin(cy) * Math.cos(cp) * 20, P.y + 1.55 - Math.sin(cp) * 20, P.z + Math.cos(cy) * Math.cos(cp) * 20); L2.target.updateMatrixWorld();
};
WkE.camera = function (dt) {
  const cam = camera, P = WkE.p, zm = WkF.zoom1 || 1, cy = WkE.cyaw; let pos, look;
    if (WkE.view === 1) { const cp = WkE.cpit - 0.25; pos = new THREE.Vector3(P.x + Math.sin(cy) * 0.12, P.y + 1.64, P.z + Math.cos(cy) * 0.12); look = pos.clone().add(new THREE.Vector3(Math.sin(cy) * Math.cos(cp), -Math.sin(cp), Math.cos(cy) * Math.cos(cp))); cam.fov = 80; WkE.suit.userData.rig.visible = false; }
  else { WkE.suit.userData.rig.visible = true; const D = 5.4 * zm, cp = clamp(WkE.cpit, -0.4, 1.3); pos = new THREE.Vector3(P.x - Math.sin(cy) * Math.cos(cp) * D, P.y + 1.4 + Math.sin(cp) * D, P.z - Math.cos(cy) * Math.cos(cp) * D); if (pos.y < 0.4) pos.y = 0.4; look = new THREE.Vector3(P.x, P.y + 1.3, P.z); cam.fov = 62; }
  cam.position.copy(pos); cam.up.set(0, 1, 0); cam.lookAt(look); cam.near = 0.06; cam.far = 125000; cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); WkF.cpos = pos.clone(); if (WkF.main) WkF.coff = pos.clone().sub(WkF.main.P); void dt;
};
WkE.cycle = function () { WkE.key('KeyC'); };
WkE.drag = function (dx, dy) { WkE.cyaw -= dx * 0.006; WkE.cpit = clamp(WkE.cpit + dy * 0.005, -0.6, 1.35); };
WkE.key = function (code) {
  switch (code) {
    case 'Escape': WkF.back(); break; case 'KeyH': WkE.board(false); break; case 'Space': WkE.jump = true; break; case 'KeyE': WkE.interact(); break; case 'KeyF': WkE.plant(); break;
    case 'KeyC': WkE.view = WkE.view ? 0 : 1; WkF.say(WkE.view ? 'HELMET CAMERA' : 'THIRD PERSON'); break; case 'KeyL': WkE.lampMode = (WkE.lampMode + 1) % 3; WkF.say(['HELMET LAMP: AUTO', 'HELMET LAMP: ON', 'HELMET LAMP: OFF'][WkE.lampMode]); break;
    case 'KeyP': WkF.paused = !WkF.paused; WkF.say(WkF.paused ? 'PAUSED' : 'RESUMED'); break; default:
  }
};

/* ---------- suit display ---------- */
WkE.hud = function (g, W, H) {
  const u = clamp(Math.min(W / 1100, H / 650), 0.72, 1.35), F = (px, w) => (w || 700) + ' ' + Math.round(px * u) + 'px Rajdhani, "Arial Narrow", sans-serif', cx = W / 2, B = WkE.body, P = WkE.p, M = WkF.main, done = save.wk.done || {};
  const txt = (s, x, y, font, col, al) => { g.font = font; g.fillStyle = col || _wkfFg; g.textAlign = al || 'left'; g.fillText(s, x, y); };
  const panel = (x, y, w, h) => { g.fillStyle = 'rgba(7,10,15,0.62)'; g.fillRect(x, y, w, h); g.fillStyle = _wkfAmber; g.fillRect(x, y, 3 * u, h); };
  g.textBaseline = 'alphabetic'; const blink = Math.floor(App.time * 3) % 2 === 0;
  /* compass */
  const hd = (Math.atan2(Math.sin(WkE.cyaw), -Math.cos(WkE.cyaw)) * 180 / Math.PI + 360) % 360; g.fillStyle = 'rgba(7,10,15,0.55)'; g.fillRect(cx - 190 * u, 10 * u, 380 * u, 30 * u); g.save(); g.beginPath(); g.rect(cx - 190 * u, 10 * u, 380 * u, 30 * u); g.clip();
  for (let d = Math.floor((hd - 100) / 15) * 15; d <= hd + 100; d += 15) { const x = cx + (d - hd) * 2.1 * u, dd = ((d % 360) + 360) % 360, lab = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' }[dd]; if (lab) txt(lab, x, 33 * u, F(18), lab === 'N' ? '#ff7a6a' : _wkfFg, 'center'); else { g.fillStyle = 'rgba(200,210,225,0.5)'; g.fillRect(x - 0.5, 24 * u, 1, 8 * u); } } g.restore();
  g.fillStyle = _wkfAmber; g.beginPath(); g.moveTo(cx, 42 * u); g.lineTo(cx - 5 * u, 49 * u); g.lineTo(cx + 5 * u, 49 * u); g.fill(); txt(B.name.toUpperCase() + ' · ON FOOT', cx, 66 * u, F(15), _wkfDim, 'center');
  /* left: suit systems */
  const dc = Math.hypot(P.x - M.P.x, P.z - M.P.z), samp = done['sn:' + B.id] | 0, disc = done['dn:' + B.id] | 0, bar = (y, label, v, col) => { txt(label, 24 * u, y, F(12), _wkfDim); g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(24 * u, y + 5 * u, 150 * u, 9 * u); g.fillStyle = col; g.fillRect(24 * u, y + 5 * u, 150 * u * clamp(v, 0, 1), 9 * u); };
  const rows = [['SPEED', WkE.speed.toFixed(1) + ' m/s'], ['TO CRAFT', dc < 1000 ? dc.toFixed(0) + ' m' : (dc / 1000).toFixed(2) + ' km'], ['GRAVITY', (B.g0 / 9.80665).toFixed(2) + ' g'], ['SAMPLES', String(samp)], ['DISCOVERIES', String(disc)]]; const ph = (rows.length * 34 + 90) * u;
  panel(12 * u, 76 * u, 190 * u, ph); const o2c = WkE.o2 < 0.15 ? '#ff4d5e' : WkE.o2 < 0.35 ? _wkfAmber : '#5fd6ff'; bar(98 * u, 'OXYGEN ' + Math.round(WkE.o2 * 100) + '%', WkE.o2, o2c); bar(134 * u, 'JETPACK ' + Math.round(WkE.fuel * 100) + '%', WkE.fuel, '#7cf08a');
  rows.forEach((r, i) => { txt(r[0], 24 * u, (176 + i * 34) * u, F(12), _wkfDim); txt(r[1], 24 * u, (192 + i * 34) * u, F(19), _wkfFg); });
  /* nearest signal arrow */
  let tg = null, td = 1e9; for (const lm of WkE.lms) { if (lm.found) continue; const d = Math.hypot(lm.x - P.x, lm.z - P.z); if (d < td && d < 3200) { td = d; tg = lm; } }
  const ay = 112 * u; if (tg) { const brg = Math.atan2(tg.x - P.x, tg.z - P.z), rel = brg - WkE.cyaw; g.save(); g.translate(cx, ay); g.rotate(-rel); g.fillStyle = _wkfAmber; g.beginPath(); g.moveTo(0, -20 * u); g.lineTo(-13 * u, 14 * u); g.lineTo(0, 7 * u); g.lineTo(13 * u, 14 * u); g.closePath(); g.fill(); g.restore(); txt('SIGNAL ' + (td < 1000 ? td.toFixed(0) + ' m' : (td / 1000).toFixed(2) + ' km'), cx, ay + 36 * u, F(16), _wkfAmber, 'center'); }
  else txt('NO SIGNAL IN RANGE · keep walking', cx, ay + 12 * u, F(15), _wkfDim, 'center');
  /* warnings, prompts, messages */
  let wy = 190 * u; const warn = (t, col) => { txt(t, cx, wy, F(26), col || '#ff4d5e', 'center'); wy += 32 * u; };
  if (WkE.o2 <= 0) warn('OUT OF AIR · ' + Math.max(0, 4 - WkE.o2out).toFixed(0) + ' s', '#ff4d5e'); else if (WkE.o2 < 0.15 && blink) warn('LOW OXYGEN: head back to the craft', '#ff4d5e'); if (WkE.heat > 0.25 && blink) warn('SUIT OVERHEATING', _wkfAmber);
  const nr = WkE.near, pr = []; if (nr) { if (nr.kind === 'sample') pr.push('E  collect the sample'); else if (nr.kind === 'cache') pr.push('E  restock air and fuel'); else pr.push('E  read the log'); } if (dc < 8) pr.push('H  climb in'); else if (WkE.gnd && dc > 5 && !done['fl:' + B.id]) pr.push('F  plant a flag'); else if (WkE.gnd && dc > 5) pr.push('F  move your flag');
  pr.forEach((t, i) => txt(t, cx, H - 150 * u - i * 28 * u, F(21), _wkfFg, 'center'));
  g.textAlign = 'center'; WkF.msgs.forEach((m, i) => { g.globalAlpha = clamp(1.6 - m.age / 2, 0, 1); txt(m.t, cx, (wy + 20 * u) + i * 26 * u, F(19), _wkfFg, 'center'); }); g.globalAlpha = 1;
  if (WkE.note) { const n = WkE.note, mw = Math.min(W - 40 * u, 600 * u); g.font = F(17); const words = n.text.split(' '), lines = []; let cur = ''; for (const w of words) { const t2 = cur ? cur + ' ' + w : w; if (g.measureText(t2).width > mw - 28 * u) { lines.push(cur); cur = w; } else cur = t2; } lines.push(cur); const bh = (44 + lines.length * 24) * u, by = H - 140 * u - bh - 40 * u; g.globalAlpha = clamp(3 - n.age / 4, 0, 1) * clamp(n.age * 4, 0, 1); panel(cx - mw / 2, by, mw, bh); txt(n.title.toUpperCase(), cx - mw / 2 + 16 * u, by + 26 * u, F(19), _wkfAmber); lines.forEach((l, i) => txt(l, cx - mw / 2 + 16 * u, by + (52 + i * 24) * u, F(17), _wkfFg)); g.globalAlpha = 1; }
  txt('WASD walk · Shift run · Space jump (hold in the air for the jetpack) · E use · F flag · H climb in · C camera · L lamp · drag to look', cx, H - 12 * u, F(13), _wkfDim, 'center');
};
