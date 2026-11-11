/* ================= BOAT RUNS: BUOY GATES AND THE SMUGGLER CHASE =================
   Courses are written in the marina's own frame (a along the shore, s out to sea) so they follow the harbour wherever the world generator
   put it, then every buoy is checked against the sea bed and pushed seaward until it floats in at least 2 m of water. A gate counts when the
   boat's centre crosses the line between its two buoys (swept, either direction). The smuggler is a kinematic boat: it steers between
   waypoints with a turn-rate limit, backs off from shallows with a probe ahead, and runs at a fraction of your own boat's top speed so any
   boat can catch him, a faster boat just does it sooner. */
const VMBC = {
  sprint: { w: 24, pts: [[0, 115], [80, 200], [190, 250], [300, 220], [300, 130], [190, 100], [90, 110]] },
  slalom: { w: 15, pts: [[80, 120], [150, 175], [80, 230], [150, 285], [80, 340], [150, 395], [80, 450], [150, 505], [230, 545], [300, 480], [300, 380], [300, 280], [290, 180], [220, 110]] },
  coast: { w: 28, pts: [[40, 120], [180, 100], [330, 95], [480, 110], [580, 190], [590, 320], [520, 440], [400, 520], [260, 500], [150, 420], [110, 300], [190, 220], [280, 170], [160, 130]] }
};
const VMCH = { lanes: [[160, 300], [300, 400], [460, 360], [560, 250], [500, 130], [360, 170], [220, 250], [140, 190], [330, 280], [420, 220]] };
const VMBUOY = { port: lc(0xe0322e), star: lc(0x2fcf6a), act: lc(0xffb02e), dim: lc(0x9ab0c4) };
let VMBG = null;
function vmBuoy(col) {
  if (!VMBG) VMBG = { body: new THREE.CylinderGeometry(0.55, 0.72, 1.5, 12), cone: new THREE.ConeGeometry(0.55, 1.1, 12), lamp: new THREE.SphereGeometry(0.28, 8, 6), pole: new THREE.CylinderGeometry(0.05, 0.05, 1.9, 6) };
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: col, roughness: 0.55, metalness: 0.1 }), lampM = new THREE.MeshBasicMaterial({ color: col.clone().multiplyScalar(2.2) });
  const b = new THREE.Mesh(VMBG.body, m); b.position.y = 0.45; g.add(b); const c = new THREE.Mesh(VMBG.cone, m); c.position.y = 1.75; g.add(c);
  const p = new THREE.Mesh(VMBG.pole, new THREE.MeshStandardMaterial({ color: 0x333b44, roughness: 0.6 })); p.position.y = 3.0; g.add(p); const l = new THREE.Mesh(VMBG.lamp, lampM); l.position.y = 4.05; g.add(l);
  g.userData = { m, lampM, base: col.clone() }; return g;
}
/* the chosen course in world coordinates, buoys nudged out of the shallows */
function vmGates(def) {
  const C = VMBC[def.course], gates = [], w = _vmP; const n = C.pts.length;
  for (let i = 0; i < n; i++) {
    let a = C.pts[i][0], s = C.pts[i][1], tries = 0;
    const deep = () => { for (const k of [-1, 0, 1]) { Dock.toWorld(a + k * C.w * 0.5, s, w); if (terrainHeight(w.x, w.z) > -2.0 || Math.hypot(w.x, w.z) > BLIM - 120) return false; } return true; };
    while (!deep() && tries < 10) { s += 18; tries++; }
    Dock.toWorld(a, s, w); gates.push({ a, s, x: w.x, z: w.z, w: C.w, gx: 1, gz: 0, nx: 0, nz: 1, g: null, pass: -9, ok: tries < 10 });
  }
  for (let i = 0; i < n; i++) {
    const p = gates[Math.max(0, i - 1)], q = gates[Math.min(n - 1, i + 1)], G = gates[i]; let dx = q.x - p.x, dz = q.z - p.z; const l = Math.hypot(dx, dz) || 1; G.nx = dx / l; G.nz = dz / l; G.gx = G.nz; G.gz = -G.nx;   /* the line is square to the way through */
  }
  return gates;
}
function vmGateGroup(G) {
  const grp = new THREE.Group(), L = vmBuoy(VMBUOY.port), R = vmBuoy(VMBUOY.star); L.scale.setScalar(1.45); R.scale.setScalar(1.45); L.position.set(G.x - G.gx * G.w / 2, 0, G.z - G.gz * G.w / 2); R.position.set(G.x + G.gx * G.w / 2, 0, G.z + G.gz * G.w / 2);
  const cm = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.16, fog: false, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  const cur = new THREE.Mesh(new THREE.PlaneGeometry(G.w, 6.5), cm); cur.position.set(G.x, 3.4, G.z); cur.rotation.y = Math.atan2(-G.gz, G.gx);
  const beam = makeBeam('#ffb02e', 1.2, 110); beam.position.set(G.x, 55, G.z);
  grp.add(L, R, cur, beam); grp.userData = { L, R, cur, cm, beam }; return grp;
}
VM.H.buoys = {
  start(M) {
    const D = M.def, P = Boat.p, S = P.spec, gates = vmGates(D), n = gates.length; let len = 0; for (let i = 0; i < n - 1; i++) len += Math.hypot(gates[i + 1].x - gates[i].x, gates[i + 1].z - gates[i].z);
    const vt = S.Vmax * (S.boost ? 1.06 : 1); M.gates = gates; M.idx = 0; M.miss = 0; M.missT = -9; M.len = len; M.limit = Math.round(10 + len / (0.68 * vt) * D.slack); M.left = M.limit; M.pp = { x: P.x, z: P.z };
    M.G = new THREE.Group(); scene.add(M.G); for (const G of gates) { G.g = vmGateGroup(G); G.g.visible = false; M.G.add(G.g); }
    UI.toast('Head out of the marina and through gate 1 to start the clock', 'info');
  },
  update(M, dt) {
    const P = Boat.p, cur = M.gates[M.idx], pp = M.pp;
    if (cur) {
      const s0 = (pp.x - cur.x) * cur.nx + (pp.z - cur.z) * cur.nz, s1 = (P.x - cur.x) * cur.nx + (P.z - cur.z) * cur.nz;
      if (s0 !== s1 && ((s0 <= 0 && s1 >= 0) || (s0 >= 0 && s1 <= 0))) {
        const t = s0 / (s0 - s1), ix = pp.x + (P.x - pp.x) * t, iz = pp.z + (P.z - pp.z) * t, lat = Math.abs((ix - cur.x) * cur.gx + (iz - cur.z) * cur.gz);
        if (lat <= cur.w / 2) VM.H.buoys.pass(M, cur);
        else if (lat <= cur.w / 2 + 45 && App.time - M.missT > 1.6) { M.missT = App.time; M.miss++; UI.toast('Missed gate ' + (M.idx + 1) + ' · go back through it', 'bad'); Snd.beep(210, 0.12); }
      }
    }
    pp.x = P.x; pp.z = P.z;
  },
  pass(M, G) {
    G.pass = App.time; M.idx++; Snd.beep(700 + 40 * M.idx, 0.08);
    for (let i = 0; i < 8; i++) emit(Part.smoke, G.x + (Math.random() - 0.5) * G.w, 0.4, G.z + (Math.random() - 0.5) * G.w, (Math.random() - 0.5) * 2, 3 + Math.random() * 3, (Math.random() - 0.5) * 2, 0.9, 0.8, 2, 0.9, 0.95, 1, 0.5, 6);
    if (M.phase === 'wait') { M.phase = 'run'; M.t = 0; M.left = M.limit; UI.big('GO'); }
    if (M.idx >= M.gates.length) VM.finish(true, 'RACE WON', [M.gates.length + ' gates in ' + fmtT(M.t), M.miss ? M.miss + ' missed ' + (M.miss === 1 ? 'pass' : 'passes') : 'Clean run, no misses']);
  },
  timeUp(M) { VM.fail('TIME UP', [M.idx + ' of ' + M.gates.length + ' gates cleared']); },
  visual(M, dt) {
    const t = App.time;
    for (let i = 0; i < M.gates.length; i++) {
      const G = M.gates[i], U = G.g.userData, rel = i - M.idx;
      if (G.pass > 0 && t - G.pass < 0.6) { G.g.visible = true; U.cm.color.copy(lc(0x4be08a)); U.cm.opacity = 0.35 * (1 - (t - G.pass) / 0.6); U.beam.visible = false; }
      else if (rel < 0 || rel > 2) { G.g.visible = false; continue; }
      else {
        G.g.visible = true; U.beam.visible = rel === 0; U.beam.material.opacity = rel === 0 ? 0.7 : 0;
        U.cm.color.copy(rel === 0 ? VMBUOY.act : VMBUOY.dim); U.cm.opacity = rel === 0 ? 0.2 + 0.08 * Math.sin(t * 5) : rel === 1 ? 0.07 : 0.03;
      }
      U.L.position.y = Boat.wave(U.L.position.x, U.L.position.z, t) * 1.3 - 0.2; U.R.position.y = Boat.wave(U.R.position.x, U.R.position.z, t + 1.1) * 1.3 - 0.2;
      U.L.rotation.z = Math.sin(t * 1.3 + i) * 0.05; U.R.rotation.z = Math.sin(t * 1.1 + i * 2) * 0.05;
    }
  },
  panel(M, row) {
    const P = Boat.p, cur = M.gates[Math.min(M.idx, M.gates.length - 1)], d = Math.hypot(cur.x - P.x, cur.z - P.z);
    return row('Gate', Math.min(M.idx + 1, M.gates.length) + ' / ' + M.gates.length) + row('Distance', Math.round(d) + ' m') + row('Missed', String(M.miss), M.miss ? 'bad' : 'good') + '<div class="bar"><i style="width:' + (M.idx / M.gates.length * 100).toFixed(0) + '%"></i></div>';
  },
  overlay(M, g, w, h) {
    const P = Boat.p, c = M.gates[M.idx]; if (!c) return; VM.marker(g, w, h, c.x, 5, c.z, '#ffb02e', VM.dist(Math.hypot(c.x - P.x, c.z - P.z)));
    const n = M.gates[M.idx + 1]; if (n) VM.marker(g, w, h, n.x, 5, n.z, '#33d4ff', '');
  },
  mini(M, icon) { const c = M.gates[M.idx], n = M.gates[M.idx + 1]; if (n) icon(n.x, n.z, '#33d4ff', 6, false); if (c) icon(c.x, c.z, '#ffb02e', 9, true); },
  full(M, g, k) {
    g.strokeStyle = 'rgba(51,212,255,0.6)'; g.lineWidth = 2 * k; g.setLineDash([6 * k, 6 * k]); g.beginPath(); M.gates.forEach((G, i) => { const s = FM.toScreen(G.x, G.z); if (i) g.lineTo(s[0], s[1]); else g.moveTo(s[0], s[1]); }); g.stroke(); g.setLineDash([]);
    M.gates.forEach((G, i) => { const s = FM.toScreen(G.x, G.z); g.fillStyle = i < M.idx ? '#4be08a' : i === M.idx ? '#ffb02e' : '#dde6f2'; g.strokeStyle = '#06090e'; g.lineWidth = 2 * k; g.beginPath(); g.arc(s[0], s[1], (i === M.idx ? 6 : 4) * k, 0, TAU); g.fill(); g.stroke(); });
  },
  end(M) { if (M.G) { scene.remove(M.G); M.G.traverse((o) => { if (o.geometry && o.geometry.type === 'PlaneGeometry') o.geometry.dispose(); }); M.G = null; } }
};

/* ---------- smuggler chase ---------- */
const _vmQb = { x: 0, z: 0 };
function vmSea(x, z, min) { return terrainHeight(x, z) < -(min || 2) && Math.hypot(x, z) < BLIM - 140; }
VM.H.chase = {
  start(M) {
    const D = M.def, P = Boat.p, S = P.spec, vt = S.Vmax * (S.boost ? 1.08 : 1), spd = clamp(D.pace * vt, 11, 27), id = 'marlin', o = Boats.create(id, 2), BS = BSPEC[id];
    const lanes = []; for (const l of VMCH.lanes) { Dock.toWorld(l[0], l[1], _vmQb); if (vmSea(_vmQb.x, _vmQb.z, 3)) lanes.push({ x: _vmQb.x, z: _vmQb.z }); }
    if (lanes.length < 4) throw new Error('no open water for the chase');
    const st = lanes[0], nx = lanes[1];
    const Q = { id, spec: BS, holder: o.holder, model: o.model, parts: o.parts, x: st.x, z: st.z, y: 0, yaw: Math.atan2(nx.x - st.x, nx.z - st.z), vx: 0, vz: 0, speed: 0, thr: 0, u: 0, sy: 0, cy: 1, pitch: 0, roll: 0, dynP: 0, dynR: 0, rise: 0, ph: 1.7, r: 0, hdg: 0 };
    Q.sy = Math.sin(Q.yaw); Q.cy = Math.cos(Q.yaw); scene.add(o.holder); Boat.attitude(Q, 1, App.time);
    M.Q = Q; M.lanes = lanes; M.wi = 1; M.spd = spd; M.pur = 0; M.far = 0; M.state = 'idle'; M.jinkT = 3; M.jink = 0; M.range = D.diff === 3 ? 36 : 40; M.need = D.need; M.limit = D.limit; M.left = D.limit; M.gap = 999; M.hot = 0;
    UI.toast('The smuggler is out in the bay. Get within ' + M.range + ' m and stay there', 'info');
  },
  update(M, dt) {
    const P = Boat.p, Q = M.Q, D = M.def, dx = Q.x - P.x, dz = Q.z - P.z, dist = Math.hypot(dx, dz); M.gap = dist;
    if (M.state === 'idle') { if (dist < 150) { M.state = 'flee'; M.phase = 'run'; M.t = 0; M.left = M.limit; UI.banner('HE\'S RUNNING', 'Stay on him'); Snd.beep(520, 0.1); } else { Q.thr = 0.15; VM.H.chase.move(M, dt, 0); return; } }
    if (M.state === 'caught') { VM.H.chase.move(M, dt, 0); M.catchT -= dt; if (M.catchT <= 0) VM.finish(true, 'BUSTED', ['The smuggler cut his engine after ' + fmtT(M.t), 'Closest approach ' + Math.round(M.best) + ' m']); return; }
    M.best = Math.min(M.best == null ? 1e9 : M.best, dist);
    /* the pursuit meter fills while you hold him inside the range, and drains faster when you do not */
    if (dist < M.range) { M.pur += dt; M.hot = 1; } else { M.pur = Math.max(0, M.pur - dt * 0.5); M.hot = 0; }
    if (dist > 280) M.far += dt; else M.far = Math.max(0, M.far - dt * 2);
    if (M.far > 7) { VM.fail('HE GOT AWAY', ['You lost him in the open sea']); return; }
    if (M.pur >= M.need) { M.state = 'caught'; M.catchT = 2.2; UI.banner('CAUGHT UP', 'He is giving up'); Snd.beep(1000, 0.1); return; }
    /* steering: next lane point, a jink every few seconds on the hard one, away from shallows */
    let L = M.lanes[M.wi % M.lanes.length]; if (Math.hypot(L.x - Q.x, L.z - Q.z) < 90) { M.wi = (D.diff === 3 ? Math.floor(Math.random() * M.lanes.length) : M.wi + 1); L = M.lanes[M.wi % M.lanes.length]; }
    M.jinkT -= dt; if (D.diff === 3 && M.jinkT <= 0) { M.jinkT = 3 + Math.random() * 3; M.jink = (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 0.5); M.jinkLeft = 1.1; }
    let tyaw = Math.atan2(L.x - Q.x, L.z - Q.z); if (M.jinkLeft > 0) { M.jinkLeft -= dt; tyaw += M.jink; }
    const look = 12 + Q.speed * 2.6, tests = [[0, 0], [0.5, 0], [-0.5, 0]];
    const fx = Math.sin(Q.yaw), fz = Math.cos(Q.yaw); if (!vmSea(Q.x + fx * look, Q.z + fz * look, 2.5)) {
      let pick = null; for (const a of [0.5, -0.5, 1.0, -1.0, 1.6, -1.6]) { const yy = Q.yaw + a; if (vmSea(Q.x + Math.sin(yy) * look, Q.z + Math.cos(yy) * look, 2.5)) { pick = yy; break; } }
      tyaw = pick == null ? Q.yaw + 2.2 : pick;
    }
    VM.H.chase.move(M, dt, tyaw);
  },
  move(M, dt, tyaw) {
    const Q = M.Q, D = M.def, S = Q.spec, want = M.state === 'flee' ? M.spd : 0, rate = Math.min(D.diff === 3 ? 1.35 : 0.95, (Boat.p ? Boat.p.spec.yawMax : 1.2) * (D.diff === 3 ? 1.0 : 0.9)); if (M.state === 'idle') { Q.thr = approach(Q.thr, 0.1, dt); Q.speed = approach(Q.speed, 0.6, 6 * dt); tyaw = Q.yaw; }
    const dy = angDiff(Q.yaw, tyaw), yr = clamp(dy * 2.4, -rate, rate); Q.yaw += yr * dt; Q.r = yr;
    const wt = want * (1 - 0.4 * Math.abs(yr) / rate);   /* he scrubs speed in a hard turn, which is where you catch him */
    Q.speed = approach(Q.speed, wt, (wt > Q.speed ? 5.5 : 7) * dt); Q.thr = want > 0 ? approach(Q.thr, 1, 2 * dt) : approach(Q.thr, 0, 3 * dt); Q.u = Q.speed;
    Q.sy = Math.sin(Q.yaw); Q.cy = Math.cos(Q.yaw); Q.vx = Q.sy * Q.speed; Q.vz = Q.cy * Q.speed; Q.x += Q.vx * dt; Q.z += Q.vz * dt;
    const f = Q.speed / (0.5 * S.Vmax); Q.dynP = S.hump * (f < 1 ? Math.sin(f * Math.PI / 2) : 0.35 + 0.65 * Math.exp(-(f - 1) * 2.2)); Q.dynR = clamp(S.lean * yr * Q.speed * 0.02, -0.5, 0.5); Q.rise = S.hump * 0.9 * clamp(Q.speed / S.Vmax, 0, 1.2); Q.hdg = Air.hdg(Q.yaw);
  },
  timeUp(M) { VM.fail('TIME UP', ['The smuggler made it to open water']); },
  visual(M, dt) { const Q = M.Q; if (!Q) return; Boat.attitude(Q, dt, App.time); if (Q.parts.nav) Q.parts.nav.visible = env.lampOn > 0.3; Boat.fx(dt, Q); },
  panel(M, row) {
    const pct = clamp(M.pur / M.need * 100, 0, 100), g = M.gap;
    if (M.state === 'idle') return row('Target', 'Smuggler') + row('Distance', Math.round(g) + ' m') + '<div class="bar"><i style="width:0%"></i></div>';
    return row('Distance', Math.round(g) + ' m', g < M.range ? 'good' : g > 220 ? 'bad' : '') + row('Pursuit', Math.round(pct) + '%', M.hot ? 'good' : '') + row('Status', M.state === 'caught' ? 'CAUGHT' : M.far > 0.5 ? 'LOSING HIM' : M.hot ? 'HOLD HIM' : 'CLOSE IN', M.hot ? 'good' : M.far > 0.5 ? 'bad' : '') + '<div class="bar"><i style="width:' + pct.toFixed(0) + '%"></i></div>';
  },
  overlay(M, g, w, h) { const Q = M.Q; if (Q && M.state !== 'caught') VM.marker(g, w, h, Q.x, 6, Q.z, '#c07bff', VM.dist(M.gap)); },
  mini(M, icon) { if (M.Q) icon(M.Q.x, M.Q.z, '#c07bff', 8, true); },
  full(M, g, k) { if (!M.Q) return; const s = FM.toScreen(M.Q.x, M.Q.z); g.fillStyle = '#c07bff'; g.strokeStyle = '#06090e'; g.lineWidth = 2.5 * k; g.beginPath(); g.arc(s[0], s[1], 7 * k, 0, TAU); g.fill(); g.stroke(); },
  end(M) { if (M.Q) { scene.remove(M.Q.holder); M.Q = null; } }
};
