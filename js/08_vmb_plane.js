/* ================= PLANE RUNS: HOOP COURSES AND DRONE DOGFIGHTS =================
   Rings are flat discs with a torus rim, oriented across the line of flight; a pass is the plane's centre crossing the ring plane inside the rim,
   in either direction (swept between frames, so a 165 m/s jet cannot skip one). Drones are kinematic: they steer with a rate-limited turn,
   patrol between random waypoints, break away when you line up on them and (the armed ones) swing round for gun passes. Guns are tracer
   pools: the muzzle speed rides on top of the plane's own velocity, hits are segment-against-sphere, and a light aim assist bends the shot
   towards the lead point when you are already close. */
const VMC = { gen: {} };
VMC.gen.oval = function () {
  const N = 10, cu = 250, cv = -380, rx = 450, ry = 330, out = [];
  for (let i = 0; i < N; i++) { const f = i / N * TAU; out.push({ u: cu + rx * Math.sin(f), v: cv + ry * Math.cos(f), alt: 26 + 34 * Math.sin(Math.PI * i / N) }); }
  return out;
};
VMC.gen.eight = function () {
  const N = 14, a = 640, cv = -560, out = [];
  for (let i = 0; i < N; i++) { const t = i / N * TAU, s = Math.sin(t), c = Math.cos(t), d = 1 + s * s; out.push({ u: a * c / d, v: cv - a * s * c / d, alt: 100 + 48 * Math.sin(t) }); }
  return out;
};
VMC.gen.gauntlet = function () {
  const N = 18, cv = -560, out = [];
  for (let i = 0; i < N; i++) { const f = i / N * TAU, r = 560 + 130 * Math.sin(3 * f); out.push({ u: r * Math.cos(f), v: cv - r * Math.sin(f), alt: 115 + 62 * Math.sin(2 * f + 0.6) }); }
  return out;
};
const VMCOL = { act: lc(0xffb02e), nxt: lc(0x33d4ff), far: lc(0xdde6f2), ok: lc(0x4be08a) };

/* ---------- rings ---------- */
function vmRingGroup(R) {
  const g = new THREE.Group(), rim = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, fog: false, depthWrite: false, side: THREE.DoubleSide });
  const rimMesh = new THREE.Mesh(new THREE.RingGeometry(R - 0.7, R + 0.7, 64, 1), rim);
  const dm = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, fog: false, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(R, 40), dm);
  const tk = new THREE.Group(); for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(R * 0.3, R * 0.06, R * 0.06), rim); const a = i * Math.PI / 2; b.position.set(Math.cos(a) * R * 0.74, Math.sin(a) * R * 0.74, 0); b.rotation.z = a; tk.add(b); }
  g.add(rimMesh, disc, tk); g.userData = { rim, dm, rimMesh, disc, tk, R, w: 0.7 }; return g;
}
/* the rim is a flat band whose width grows with distance, so a ring is still a bold shape from half a kilometre away */
function vmRimWidth(r, dist) {
  const U = r.g.userData, w = Math.round(clamp(dist * 0.011, 0.7, U.R * 0.4) * 4) / 4; if (w === U.w) return; U.w = w; U.rimMesh.geometry.dispose(); U.rimMesh.geometry = new THREE.RingGeometry(U.R - w, U.R + w, 64, 1);
}
VM.H.hoops = {
  start(M) {
    const D = M.def, P = Fly.p, S = P.spec, A = Air.s, cruise = VM.cruise(S), kR = clamp(0.75 + 0.25 * S.Vmax / 88, 0.95, 1.35), R = D.R * kR;
    const pts = VMC.gen[D.course](), N = pts.length, rings = [];
    for (const p of pts) { const x = A.cx + p.u, z = A.cz + p.v, th = terrainHeight(x, z), cl = Air.clear(x, z, 0) ? 24 : 42; rings.push({ x, z, y: Math.max(A.H0 + p.alt, th + cl), R, nx: 0, ny: 0, nz: 1, g: null, pass: -9 }); }
    for (let i = 0; i < N; i++) {
      const a = rings[(i + N - 1) % N], b = rings[(i + 1) % N], r = rings[i]; let dx = b.x - a.x, dy = (b.y - a.y) * 0.6, dz = b.z - a.z; const l = Math.hypot(dx, dy, dz) || 1; r.nx = dx / l; r.ny = dy / l; r.nz = dz / l;
    }
    let L = 0; for (let i = 0; i < N - 1; i++) L += Math.hypot(rings[i + 1].x - rings[i].x, rings[i + 1].y - rings[i].y, rings[i + 1].z - rings[i].z);
    M.rings = rings; M.idx = 0; M.miss = 0; M.missT = -9; M.len = L; M.limit = Math.round(14 + L / (0.78 * cruise) * D.slack); M.left = M.limit; M.G = new THREE.Group(); scene.add(M.G);
    for (const r of rings) { r.g = vmRingGroup(R); r.g.position.set(r.x, r.y, r.z); r.g.lookAt(r.x + r.nx, r.y + r.ny, r.z + r.nz); r.g.visible = false; M.G.add(r.g); r.beam = makeBeam('#ffb02e', 1.6, 900); r.beam.position.set(r.x, r.y + 300, r.z); r.beam.visible = false; M.G.add(r.beam); }
    if (D.air) {
      const r0 = rings[0]; let sx = r0.x - r0.nx * 260, sy = r0.y - r0.ny * 260, sz = r0.z - r0.nz * 260; sy = Math.max(sy, terrainHeight(sx, sz) + 45);
      VM.launch(P, sx, sy, sz, r0.x - sx, r0.y - sy, r0.z - sz, cruise);
    }
    M.pp = { x: P.x, y: P.y, z: P.z }; M.air = !!D.air;
    UI.toast(D.air ? 'Fly through ring 1 to start the clock' : 'Take off, then fly through ring 1 to start the clock', 'info');
  },
  update(M, dt) {
    const P = Fly.p; if (P.st !== 'flying') return; const cur = M.rings[M.idx], pp = M.pp;
    if (cur) {
      const d0 = (pp.x - cur.x) * cur.nx + (pp.y - cur.y) * cur.ny + (pp.z - cur.z) * cur.nz, d1 = (P.x - cur.x) * cur.nx + (P.y - cur.y) * cur.ny + (P.z - cur.z) * cur.nz;
      if (d0 !== d1 && ((d0 <= 0 && d1 >= 0) || (d0 >= 0 && d1 <= 0))) {
        const t = d0 / (d0 - d1), ix = pp.x + (P.x - pp.x) * t, iy = pp.y + (P.y - pp.y) * t, iz = pp.z + (P.z - pp.z) * t, off = Math.hypot(ix - cur.x, iy - cur.y, iz - cur.z);
        if (off <= cur.R) VM.H.hoops.pass(M, cur);
        else if (off <= cur.R + 60 && App.time - M.missT > 1.6) { M.missT = App.time; M.miss++; UI.toast('Missed ring ' + (M.idx + 1) + ' · turn back through it', 'bad'); Snd.beep(210, 0.12); }
      }
    }
    pp.x = P.x; pp.y = P.y; pp.z = P.z;
  },
  pass(M, r) {
    r.pass = App.time; M.idx++; save.vm.rings++; Snd.beep(760 + 38 * M.idx, 0.08); sparks(r.x, r.y, r.z, 14, 9);
    if (M.phase === 'wait') { M.phase = 'run'; M.t = 0; M.left = M.limit; UI.big('GO'); }
    if (M.idx >= M.rings.length) { writeSave(); VM.finish(true, 'COURSE CLEAR', [M.rings.length + ' rings in ' + fmtT(M.t), M.miss ? M.miss + ' missed ' + (M.miss === 1 ? 'pass' : 'passes') : 'Clean run, no misses']); }
    else if (M.idx === M.rings.length - 1) UI.toast('Last ring', 'info');
  },
  timeUp(M) { VM.fail('TIME UP', [M.idx + ' of ' + M.rings.length + ' rings cleared']); },
  visual(M, dt) {
    const t = App.time, P = Fly.p;
    for (let i = 0; i < M.rings.length; i++) {
      const r = M.rings[i], U = r.g.userData, rel = i - M.idx;
      if (r.pass > 0) {
        const a = (t - r.pass) / 0.55; r.beam.visible = false; if (a > 1) { r.g.visible = false; continue; }
        r.g.visible = true; r.g.scale.setScalar(1 + a * 0.5); U.rim.color.copy(VMCOL.ok); U.rim.opacity = 0.9 * (1 - a); U.dm.color.copy(VMCOL.ok); U.dm.opacity = 0.25 * (1 - a); continue;
      }
      if (rel < 0 || rel > 2) { r.g.visible = false; r.beam.visible = false; continue; }
      r.g.visible = true; const dist = P ? Math.hypot(r.x - P.x, r.y - P.y, r.z - P.z) : 300; vmRimWidth(r, dist);
      r.beam.visible = rel === 0; if (rel === 0) r.beam.material.opacity = lerp(0.12, 0.55, sstep(40, 500, dist));
      if (rel === 0) { U.rim.color.copy(VMCOL.act); U.rim.opacity = 1; U.dm.color.copy(VMCOL.act); U.dm.opacity = 0.14 + 0.06 * Math.sin(t * 5); r.g.scale.setScalar(1 + 0.02 * Math.sin(t * 5)); U.tk.rotation.z = t * 0.8; }
      else if (rel === 1) { U.rim.color.copy(VMCOL.nxt); U.rim.opacity = 0.75; U.dm.color.copy(VMCOL.nxt); U.dm.opacity = 0.05; r.g.scale.setScalar(1); U.tk.rotation.z = 0; }
      else { U.rim.color.copy(VMCOL.far); U.rim.opacity = 0.4; U.dm.opacity = 0; r.g.scale.setScalar(1); U.tk.rotation.z = 0; }
    }
  },
  panel(M, row) {
    const P = Fly.p, cur = M.rings[Math.min(M.idx, M.rings.length - 1)], d = Math.hypot(cur.x - P.x, cur.y - P.y, cur.z - P.z);
    return row('Ring', Math.min(M.idx + 1, M.rings.length) + ' / ' + M.rings.length) + row('Distance', Math.round(d) + ' m') + row('Missed', String(M.miss), M.miss ? 'bad' : 'good') + '<div class="bar"><i style="width:' + (M.idx / M.rings.length * 100).toFixed(0) + '%"></i></div>';
  },
  overlay(M, g, w, h) {
    const P = Fly.p, r = M.rings[M.idx]; if (!r) return; VM.marker(g, w, h, r.x, r.y, r.z, '#ffb02e', VM.dist(Math.hypot(r.x - P.x, r.y - P.y, r.z - P.z)));
    const n = M.rings[M.idx + 1]; if (n) VM.marker(g, w, h, n.x, n.y, n.z, '#33d4ff', '');
  },
  mini(M, icon) { const r = M.rings[M.idx], n = M.rings[M.idx + 1]; if (n) icon(n.x, n.z, '#33d4ff', 6, false); if (r) icon(r.x, r.z, '#ffb02e', 9, true); },
  full(M, g, k) {
    g.strokeStyle = 'rgba(255,176,46,0.55)'; g.lineWidth = 2 * k; g.setLineDash([6 * k, 6 * k]); g.beginPath(); M.rings.forEach((r, i) => { const s = FM.toScreen(r.x, r.z); if (i) g.lineTo(s[0], s[1]); else g.moveTo(s[0], s[1]); }); g.stroke(); g.setLineDash([]);
    M.rings.forEach((r, i) => { const s = FM.toScreen(r.x, r.z); g.fillStyle = i < M.idx ? '#4be08a' : i === M.idx ? '#ffb02e' : '#dde6f2'; g.strokeStyle = '#06090e'; g.lineWidth = 2 * k; g.beginPath(); g.arc(s[0], s[1], (i === M.idx ? 6 : 4) * k, 0, TAU); g.fill(); g.stroke(); });
  },
  end(M) { if (M.G) { scene.remove(M.G); M.G.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); M.G = null; } }
};

/* ---------- tracers ---------- */
const VMGUN = { sparrow: { rate: 12, dmg: 7, heat: 0.034 }, vixen: { rate: 15, dmg: 8, heat: 0.032 }, talon: { rate: 20, dmg: 9, heat: 0.03 }, wren: { rate: 11, dmg: 7, heat: 0.034 }, gull: { rate: 13, dmg: 7, heat: 0.034 }, meridian: { rate: 6, dmg: 6, heat: 0.04 } };
const GUNV = 430, VMNB = 140;
const VMB = { inited: false, pl: [], en: [], mp: null, me: null };
function vmBulletInit() {
  if (VMB.inited) return; VMB.inited = true; const geo = new THREE.BoxGeometry(0.5, 0.5, 1);
  const mk = (col) => { const m = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.95, fog: false, depthWrite: false, blending: THREE.AdditiveBlending }), VMNB); m.frustumCulled = false; m.count = 0; m.visible = false; scene.add(m); return m; };
  VMB.mp = mk(new THREE.Color(1.6, 1.15, 0.35)); VMB.me = mk(new THREE.Color(1.8, 0.35, 0.2));
  for (let i = 0; i < VMNB; i++) { VMB.pl.push({ on: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0 }); VMB.en.push({ on: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0 }); }
}
const _vmQ = new THREE.Quaternion(), _vmU = new THREE.Vector3(0, 0, 1), _vmD = new THREE.Vector3(), _vmS = new THREE.Vector3(), _vmPos = new THREE.Vector3(), _vmM4 = new THREE.Matrix4();
function vmBulletsDraw(arr, mesh, len) {
  let n = 0;
  for (const b of arr) {
    if (!b.on) continue; const s = Math.hypot(b.vx, b.vy, b.vz) || 1; _vmD.set(b.vx / s, b.vy / s, b.vz / s); _vmQ.setFromUnitVectors(_vmU, _vmD); _vmS.set(1, 1, len); _vmPos.set(b.x, b.y, b.z); _vmM4.compose(_vmPos, _vmQ, _vmS); mesh.setMatrixAt(n++, _vmM4);
  }
  mesh.count = n; mesh.visible = n > 0; mesh.instanceMatrix.needsUpdate = true;
}
function vmBulletNew(arr, x, y, z, vx, vy, vz, life) {
  for (const b of arr) if (!b.on) { b.on = true; b.x = x; b.y = y; b.z = z; b.vx = vx; b.vy = vy; b.vz = vz; b.life = life; return b; }
  return null;
}
function vmSeg(ax, ay, az, bx, by, bz, cx, cy, cz, r) {
  const dx = bx - ax, dy = by - ay, dz = bz - az, l2 = dx * dx + dy * dy + dz * dz || 1e-6; let t = ((cx - ax) * dx + (cy - ay) * dy + (cz - az) * dz) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
  const px = ax + dx * t - cx, py = ay + dy * t - cy, pz = az + dz * t - cz; return px * px + py * py + pz * pz <= r * r;
}
function vmBoom(x, y, z, big) {
  const R = Math.random;
  sparks(x, y, z, big ? 60 : 26, big ? 24 : 14);
  for (let i = 0; i < (big ? 14 : 7); i++) emit(Part.smoke, x + (R() - 0.5) * 3, y + (R() - 0.5) * 3, z + (R() - 0.5) * 3, (R() - 0.5) * 9, (R() - 0.2) * 8, (R() - 0.5) * 9, 1.6 + R() * 1.4, 3.4, 9, 0.12, 0.1, 0.09, 0.72, -0.4);
  for (let i = 0; i < (big ? 12 : 5); i++) emit(Part.spark, x, y, z, (R() - 0.5) * 15, (R() - 0.3) * 15, (R() - 0.5) * 15, 0.5 + R() * 0.5, 3, 4, 3.2, 1.5, 0.4, 0.95, 3);
  if (Snd.ok) { const d = Math.hypot(x - camera.position.x, y - camera.position.y, z - camera.position.z), v = clamp(1.1 - d / 1600, 0.12, 1); Snd.noiseHit(Snd.ctx.currentTime, big ? 0.9 : 0.5, 0.55 * v, 0, big ? 1100 : 1800, Snd.sfx); }
}

/* ---------- drones ---------- */
const VMDR = {
  scout: { name: 'Scout', hp: 55, sp: 30, turn: 0.5, shoot: false, evade: 0.5, r: 3.8, col: 0x4f8f5b },
  striker: { name: 'Striker', hp: 90, sp: 38, turn: 0.85, shoot: true, dmg: 4, burst: 3, gap: 3.0, acc: 4.2, evade: 0.9, r: 3.8, col: 0xd4912a },
  ace: { name: 'Ace', hp: 160, sp: 46, turn: 1.15, shoot: true, dmg: 6, burst: 4, gap: 2.0, acc: 2.8, evade: 1.5, r: 4.0, col: 0xc23a3a }
};
const VMEBV = 300;
let VMDG = null;
function vmDroneModel(T) {
  if (!VMDG) {
    const c = mkCanvas(64, 64), g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    const gt = new THREE.CanvasTexture(c);
    VMDG = { body: new THREE.CylinderGeometry(0.46, 0.34, 4.2, 10), nose: new THREE.ConeGeometry(0.46, 1.5, 10), wing: new THREE.BoxGeometry(3.4, 0.09, 1.5), fin: new THREE.BoxGeometry(0.09, 1.25, 1.1), tail: new THREE.BoxGeometry(1.7, 0.08, 0.8), pod: new THREE.CylinderGeometry(0.17, 0.17, 1.4, 8), blade: new THREE.BoxGeometry(2.6, 0.14, 0.04), glow: gt,
      dark: new THREE.MeshStandardMaterial({ color: 0x232a33, roughness: 0.5, metalness: 0.55 }), eye: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 0.3, 0.2) }) };
  }
  const D = VMDG, g = new THREE.Group(), acc = new THREE.MeshStandardMaterial({ color: T.col, roughness: 0.45, metalness: 0.3 });
  const body = new THREE.Mesh(D.body, D.dark); body.rotation.x = Math.PI / 2; g.add(body);
  const nose = new THREE.Mesh(D.nose, acc); nose.rotation.x = Math.PI / 2; nose.position.z = 2.85; g.add(nose);
  for (const s of [-1, 1]) {
    const w = new THREE.Mesh(D.wing, acc); w.position.set(s * 1.85, 0, -0.1); w.rotation.y = -s * 0.32; g.add(w);
    const p = new THREE.Mesh(D.pod, D.dark); p.rotation.x = Math.PI / 2; p.position.set(s * 1.3, -0.22, 0.2); g.add(p);
    const t = new THREE.Mesh(D.tail, acc); t.position.set(s * 0.8, 0.1, -1.95); g.add(t);
  }
  const fin = new THREE.Mesh(D.fin, acc); fin.position.set(0, 0.62, -1.9); g.add(fin);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), D.eye); eye.position.set(0, 0.22, 2.0); g.add(eye);
  const prop = new THREE.Group(); prop.position.z = -2.25; const b1 = new THREE.Mesh(D.blade, D.dark), b2 = b1.clone(); b2.rotation.z = Math.PI / 2; prop.add(b1, b2); g.add(prop);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: D.glow, color: new THREE.Color(1, 0.25, 0.15), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.85 })); glow.scale.set(26, 26, 1); g.add(glow);
  g.userData = { prop, glow }; return g;
}
function vmDroneSpawn(M, kind, i, n, A, P) {
  const T = VMDR[kind], R = Math.random, ang = (i / n) * TAU + R() * 0.6, r = 520 + R() * 300, x = M.arena.x + Math.cos(ang) * r, z = M.arena.z + Math.sin(ang) * r;
  const y = Math.max(terrainHeight(x, z) + 150, A.H0 + 220 + R() * 170), g = vmDroneModel(T), spd = T.sp * clamp(0.55 + P.spec.Vmax / 200, 0.8, 1.4);
  const d = { kind, T, g, x, y, z, yaw: R() * TAU, pitch: 0, bank: 0, sp: spd, spd, hp: T.hp, hpMax: T.hp, dead: false, deadT: 0, vx: 0, vy: 0, vz: 0, wp: { x, y, z }, wpT: 0, evT: 0, evYaw: 0, evPitch: 0, mode: 'patrol', modeT: 4 + R() * 7, fireCd: 2 + R() * 3, burst: 0, burstT: 0, spin: 0, gone: false, side: R() < 0.5 ? -1 : 1 };
  g.position.set(x, y, z); M.G.add(g); return d;
}
function vmDroneNewWp(M, d) {
  const R = Math.random, W = M.arena, A = Air.s; d.wp.x = W.x + (R() * 2 - 1) * W.r * 0.75; d.wp.z = W.z + (R() * 2 - 1) * W.r * 0.75;
  d.wp.y = clamp(terrainHeight(d.wp.x, d.wp.z) + 110 + R() * 230, A.H0 + 150, A.H0 + 480); d.wpT = 7 + R() * 6;
}
const _vmFw = new THREE.Vector3();
function vmDroneStep(M, d, dt, P) {
  const T = d.T, R = Math.random, t = M.t;
  if (d.dead) {
    d.deadT += dt; d.vy -= 22 * dt; d.pitch = Math.min(1.3, d.pitch + 0.9 * dt); d.bank += d.spin * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt;
    if (R() < dt * 70) emit(Part.smoke, d.x, d.y, d.z, (R() - 0.5) * 2, 0.5 + R(), (R() - 0.5) * 2, 2.2 + R(), 1.8, 4.5, 0.07, 0.07, 0.07, 0.65, -0.3);
    if (R() < dt * 40) emit(Part.spark, d.x, d.y, d.z, (R() - 0.5) * 3, (R() - 0.5) * 3, (R() - 0.5) * 3, 0.45, 1.2, 1.6, 3, 1.4, 0.4, 0.9, 2);
    const gh = Math.max(terrainHeight(d.x, d.z), 0);
    if (d.y < gh + 2 || d.deadT > 4.5) { vmBoom(d.x, Math.max(d.y, gh + 1), d.z, true); d.gone = true; d.g.visible = false; }
    return;
  }
  const dx = P.x - d.x, dy = P.y - d.y, dz = P.z - d.z, dist = Math.hypot(dx, dy, dz) || 1;
  _vmFw.set(0, 0, 1).applyQuaternion(P.q); const cosA = (-(dx * _vmFw.x + dy * _vmFw.y + dz * _vmFw.z)) / dist;
  d.evT -= dt; d.wpT -= dt; d.modeT -= dt; d.fireCd -= dt;
  if (cosA > 0.965 && dist < 850 && d.evT <= 0 && R() < T.evade * dt * 1.6) { d.evT = 1.3 + R() * 1.4; d.side = -d.side; d.evYaw = d.yaw + d.side * (0.9 + R() * 0.9); d.evPitch = (R() - 0.5) * 0.9; }
  if (T.shoot && d.modeT <= 0) { d.mode = d.mode === 'patrol' ? 'attack' : 'patrol'; d.modeT = d.mode === 'attack' ? 11 + R() * 6 : 4 + R() * 4; }
  let tyaw = d.yaw, tpit = 0, mult = 1, sp = d.spd;
  if (d.evT > 0) { tyaw = d.evYaw; tpit = d.evPitch; mult = 1.6; sp *= 1.12; }
  else if (d.mode === 'attack') {
    const tt = clamp(dist / VMEBV, 0, 2.5), px = P.x + P.vx * tt, py = P.y + P.vy * tt, pz = P.z + P.vz * tt; tyaw = Math.atan2(px - d.x, pz - d.z); tpit = Math.atan2(py - d.y, Math.hypot(px - d.x, pz - d.z));
    if (dist < 150) { d.evT = 1.6 + R() * 0.8; d.side = -d.side; d.evYaw = d.yaw + d.side * 1.3; d.evPitch = (R() - 0.3) * 0.6; }
  } else {
    if (d.wpT <= 0 || Math.hypot(d.wp.x - d.x, d.wp.z - d.z) < 150) vmDroneNewWp(M, d);
    tyaw = Math.atan2(d.wp.x - d.x, d.wp.z - d.z); tpit = Math.atan2(d.wp.y - d.y, Math.hypot(d.wp.x - d.x, d.wp.z - d.z));
  }
  if (Math.hypot(d.x - M.arena.x, d.z - M.arena.z) > M.arena.r) { tyaw = Math.atan2(M.arena.x - d.x, M.arena.z - d.z); mult = Math.max(mult, 1.3); d.evT = Math.min(d.evT, 0); }
  const fx = Math.sin(d.yaw), fz = Math.cos(d.yaw), ahead = Math.max(terrainHeight(d.x + fx * sp * 3, d.z + fz * sp * 3), terrainHeight(d.x, d.z), 0);
  if (d.y < ahead + 70) tpit = Math.max(tpit, 0.55); if (d.y > Air.s.H0 + 520) tpit = Math.min(tpit, -0.3);
  const yr = clamp(angDiff(d.yaw, tyaw) * 2.6, -T.turn * mult, T.turn * mult); d.yaw += yr * dt;
  d.pitch += clamp((clamp(tpit, -0.6, 0.6) - d.pitch) * 2, -0.7, 0.7) * dt; d.bank += (clamp(-yr * 0.9, -1.05, 1.05) - d.bank) * Math.min(1, dt * 4);
  const cp = Math.cos(d.pitch); d.vx = Math.sin(d.yaw) * cp * sp; d.vy = Math.sin(d.pitch) * sp; d.vz = Math.cos(d.yaw) * cp * sp; d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt;
  const gh = Math.max(terrainHeight(d.x, d.z), 0); if (d.y < gh + 22) { d.y = gh + 22; d.pitch = Math.max(d.pitch, 0.1); }
  /* gun passes */
  if (T.shoot) {
    if (d.burst > 0) {
      d.burstT -= dt;
      if (d.burstT <= 0) {
        d.burst--; d.burstT = 0.11; const tt = clamp(dist / VMEBV, 0, 2.2), ex = (R() - 0.5) * 2 * Math.tan(T.acc * DEG) * dist, ey = (R() - 0.5) * 2 * Math.tan(T.acc * DEG) * dist, ez = (R() - 0.5) * 2 * Math.tan(T.acc * DEG) * dist;
        let ax = P.x + P.vx * tt - d.x + ex, ay = P.y + P.vy * tt - d.y + ey, az = P.z + P.vz * tt - d.z + ez; const l = Math.hypot(ax, ay, az) || 1; ax /= l; ay /= l; az /= l;
        vmBulletNew(VMB.en, d.x + ax * 3, d.y + ay * 3, d.z + az * 3, ax * VMEBV + d.vx * 0.3, ay * VMEBV + d.vy * 0.3, az * VMEBV + d.vz * 0.3, 2.2);
        if (Snd.ok && dist < 900) Snd.noiseHit(Snd.ctx.currentTime, 0.05, 0.1 * clamp(1.2 - dist / 900, 0.1, 1), 800, 0, Snd.sfx);
      }
    } else if (d.evT <= 0 && d.fireCd <= 0 && dist < 520 && dist > 90) {
      const cosD = (dx * Math.sin(d.yaw) * cp + dy * Math.sin(d.pitch) + dz * Math.cos(d.yaw) * cp) / dist;
      if (cosD > 0.985) { d.burst = T.burst; d.burstT = 0; d.fireCd = T.gap + R(); }
    }
  }
  d.g.position.set(d.x, d.y, d.z);
}
function vmDronePose(d, dt) {
  d.g.rotation.set(-d.pitch, d.yaw, d.bank, 'YXZ'); d.g.userData.prop.rotation.z += dt * 70;
  const gl = d.g.userData.glow; gl.material.opacity = d.dead ? 0.5 : 0.55 + 0.35 * Math.sin(App.time * 7 + d.x);
}
const _vmQp = { x: 0, y: 0, z: 0 };
/* where the guns need to point to hit a drone: the drone's position when the shot arrives, in the plane's own moving frame */
function vmLead(P, d, out) {
  const rx = d.x - P.x, ry = d.y - P.y, rz = d.z - P.z, vx = d.vx - P.vx, vy = d.vy - P.vy, vz = d.vz - P.vz, a = vx * vx + vy * vy + vz * vz - GUNV * GUNV, b = 2 * (rx * vx + ry * vy + rz * vz), c = rx * rx + ry * ry + rz * rz;
  let t = Math.sqrt(c) / GUNV;
  if (Math.abs(a) > 1e-3) { const disc = b * b - 4 * a * c; if (disc >= 0) { const sq = Math.sqrt(disc), t1 = (-b - sq) / (2 * a), t2 = (-b + sq) / (2 * a), tt = Math.min(t1 > 0 ? t1 : 1e9, t2 > 0 ? t2 : 1e9); if (tt < 3) t = tt; } } else if (b < 0) t = clamp(-c / b, 0, 3);
  out.x = d.x + vx * t; out.y = d.y + vy * t; out.z = d.z + vz * t; out.t = t; return out;
}
VM.firing = function () {
  if (Keys.Enter || Keys.KeyG || VM.mouse || TouchIn.fire) return true;
  let pads = null; try { pads = navigator.getGamepads ? navigator.getGamepads() : null; } catch (e) { pads = null; }
  if (pads) for (const p of pads) if (p && p.connected) { const b = p.buttons[1]; if (b && (b.pressed || b.value > 0.5)) return true; break; }
  return false;
};
const _vmLd = { x: 0, y: 0, z: 0, t: 0 }, _vmAim = new THREE.Vector3(), _vmRt = new THREE.Vector3();
VM.H.dog = {
  start(M) {
    const D = M.def, P = Fly.p, A = Air.s; vmBulletInit(); for (const b of VMB.pl) b.on = false; for (const b of VMB.en) b.on = false;
    M.G = new THREE.Group(); scene.add(M.G); M.arena = { x: A.cx + 40, z: A.cz - 360, r: 1300 }; M.phase = 'run'; M.t = 0; M.limit = D.limit; M.left = D.limit; M.kills = 0; M.hull = 100; M.heat = 0; M.over = false; M.shotT = 0; M.side = 1; M.lock = null; M.hitMark = 0; M.dead = false;
    M.drones = D.drones.map((k, i) => vmDroneSpawn(M, k, i, D.drones.length, A, P));
    let cx = 0, cz = 0; for (const d of M.drones) { cx += d.x; cz += d.z; } cx /= M.drones.length; cz /= M.drones.length;
    const sx = M.arena.x, sz = M.arena.z + 120, sy = A.H0 + 300, hx = cx - sx, hz = cz - sz, hl = Math.hypot(hx, hz) || 1; VM.launch(P, sx, sy, sz, hx / hl, 0, hz / hl, VM.cruise(P.spec));
    M.total = M.drones.length; UI.toast(TouchIn.on ? 'FIRE button to shoot · brackets show where the drones are' : 'Click, Enter or G to fire · keep the bracket on the circle', 'info');
  },
  update(M, dt) {
    const P = Fly.p; if (P.st !== 'flying') return; const S = P.spec, gun = VMGUN[S.id] || VMGUN.sparrow, t = App.time;
    /* guns */
    M.heat = Math.max(0, M.heat - 0.3 * dt); if (M.over && M.heat < 0.45) M.over = false; M.shotT -= dt;
    if (VM.firing() && !M.over && M.shotT <= 0) {
      M.shotT = 1 / gun.rate; M.heat += gun.heat; if (M.heat >= 1) { M.heat = 1; M.over = true; UI.toast('Guns overheated', 'bad'); }
      _vmFw.set(0, 0, 1).applyQuaternion(P.q); _vmRt.set(1, 0, 0).applyQuaternion(P.q); if (!S.cannon) M.side = -M.side;   /* twin-wing guns alternate; a nose cannon fires from the centreline */
      /* aim assist: bend the shot towards the lead point of the drone nearest the nose */
      _vmAim.copy(_vmFw); let best = null, bc = Math.cos(6 * DEG);
      for (const d of M.drones) { if (d.dead) continue; const rx = d.x - P.x, ry = d.y - P.y, rz = d.z - P.z, l = Math.hypot(rx, ry, rz); if (l < 60 || l > 900) continue; const c = (rx * _vmFw.x + ry * _vmFw.y + rz * _vmFw.z) / l; if (c > bc) { bc = c; best = d; } }
      if (best) { vmLead(P, best, _vmLd); _vmAim.set(_vmLd.x - P.x, _vmLd.y - P.y, _vmLd.z - P.z).normalize(); _vmAim.multiplyScalar(0.7).addScaledVector(_vmFw, 0.3).normalize(); }
      const so = S.cannon ? 0 : M.side * S.span * 0.17, ox = P.x + _vmFw.x * (S.len * 0.5 + 1) + _vmRt.x * so, oy = P.y + _vmFw.y * (S.len * 0.5 + 1) + _vmRt.y * so - (S.cannon ? 0.08 : 0.1), oz = P.z + _vmFw.z * (S.len * 0.5 + 1) + _vmRt.z * so;
      if (S.cannon) P.fireT = 0.07;   /* lights the muzzle flash on the Talon's nose cannon (Planes.pose) */
      vmBulletNew(VMB.pl, ox, oy, oz, P.vx + _vmAim.x * GUNV, P.vy + _vmAim.y * GUNV, P.vz + _vmAim.z * GUNV, 1.7);
      if (Snd.ok && (Math.floor(t * gun.rate) & 1)) Snd.noiseHit(Snd.ctx.currentTime, 0.05, 0.17, 1500, 0, Snd.sfx);
      Cam.shake = Math.max(Cam.shake, 0.18);
    }
    /* player tracers */
    for (const b of VMB.pl) {
      if (!b.on) continue; const px = b.x, py = b.y, pz = b.z; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; b.life -= dt; if (b.life <= 0) { b.on = false; continue; }
      for (const d of M.drones) {
        if (d.dead || !vmSeg(px, py, pz, b.x, b.y, b.z, d.x, d.y, d.z, d.T.r)) continue;
        b.on = false; d.hp -= gun.dmg; VM.hitT = 0.25; sparks(b.x, b.y, b.z, 5, 7); if (Snd.ok) Snd.noiseHit(Snd.ctx.currentTime, 0.05, 0.12, 0, 3200, Snd.sfx);
        if (d.hp <= 0) {
          d.dead = true; d.spin = (Math.random() - 0.5) * 7; M.kills++; save.vm.kills++; vmBoom(d.x, d.y, d.z, false); Snd.beep(1040, 0.1);
          const left = M.total - M.kills; if (left > 0) UI.toast(d.T.name + ' drone down · ' + left + ' left', 'good');
        } else if (d.hp < d.hpMax * 0.4 && Math.random() < 0.5) emit(Part.smoke, d.x, d.y, d.z, 0, 1, 0, 1.6, 1.4, 3, 0.1, 0.1, 0.1, 0.5, -0.2);
        break;
      }
    }
    /* drones */
    for (const d of M.drones) { if (d.gone) continue; vmDroneStep(M, d, dt, P); vmDronePose(d, dt); }
    /* enemy tracers against the plane */
    const hr = Math.max(S.span * 0.34, 3.4);
    for (const b of VMB.en) {
      if (!b.on) continue; const px = b.x, py = b.y, pz = b.z; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; b.life -= dt; if (b.life <= 0) { b.on = false; continue; }
      if (vmSeg(px, py, pz, b.x, b.y, b.z, P.x, P.y, P.z, hr)) {
        b.on = false; const dm = M.def.diff === 3 ? 6 : 4; M.hull = devOn('god') ? M.hull : Math.max(0, M.hull - dm); Cam.shake = Math.max(Cam.shake, 1.2); App.dmg = Math.min(1, App.dmg + 0.25); sparks(P.x, P.y, P.z, 8, 8); Snd.clank();
        if (M.hull <= 0 && !M.dead) { M.dead = true; Fly.crash('Shot down by a drone', false); return; }
      }
    }
    /* collisions */
    for (const d of M.drones) if (!d.dead && !d.gone && Math.hypot(d.x - P.x, d.y - P.y, d.z - P.z) < d.T.r * 0.7 + S.span * 0.2) { d.hp = 0; d.dead = true; M.kills++; vmBoom(d.x, d.y, d.z, true); M.dead = true; Fly.crash('Collided with a drone', false); return; }
    vmBulletsDraw(VMB.pl, VMB.mp, 16); vmBulletsDraw(VMB.en, VMB.me, 12);
    if (M.kills >= M.total) {
      const lines = [M.total + ' drones shot down in ' + fmtT(M.t), 'Hull left ' + Math.round(M.hull) + '%']; VM.finish(true, 'SKY CLEAR', lines);
    }
  },
  timeUp(M) { VM.fail('TIME UP', [M.total - M.kills + (M.total - M.kills === 1 ? ' drone' : ' drones') + ' got away']); },
  panel(M, row) {
    const hh = Math.round(M.hull), cl = hh > 60 ? 'good' : hh > 30 ? '' : 'bad';
    return row('Drones', (M.total - M.kills) + ' left') + row('Hull', hh + '%', cl) + row('Guns', M.over ? 'OVERHEAT' : Math.round(M.heat * 100) + '%', M.over ? 'bad' : M.heat > 0.7 ? '' : 'good') + '<div class="bar"><i style="width:' + (M.kills / M.total * 100).toFixed(0) + '%"></i></div>';
  },
  overlay(M, g, w, h) {
    const P = Fly.p; if (!P || P.st === 'wreck') return; _vmFw.set(0, 0, 1).applyQuaternion(P.q);
    /* gun pipper: where the nose points, 450 m out */
    _vmv.set(P.x + _vmFw.x * 450, P.y + _vmFw.y * 450, P.z + _vmFw.z * 450).project(camera);
    if (_vmv.z < 1) {
      const x = (_vmv.x * 0.5 + 0.5) * w, y = (-_vmv.y * 0.5 + 0.5) * h; g.save(); g.translate(x, y); g.strokeStyle = M.over ? 'rgba(255,90,90,0.95)' : 'rgba(255,255,255,0.9)'; g.fillStyle = g.strokeStyle; g.lineWidth = 2;
      g.beginPath(); g.arc(0, 0, 13, 0, TAU); g.stroke(); g.beginPath(); g.arc(0, 0, 1.8, 0, TAU); g.fill(); for (const a of [0, 1, 2, 3]) { g.beginPath(); g.moveTo(Math.cos(a * Math.PI / 2) * 13, Math.sin(a * Math.PI / 2) * 13); g.lineTo(Math.cos(a * Math.PI / 2) * 19, Math.sin(a * Math.PI / 2) * 19); g.stroke(); }
      g.lineWidth = 4; g.strokeStyle = 'rgba(10,14,20,0.6)'; g.beginPath(); g.arc(0, 0, 25, -Math.PI / 2, -Math.PI / 2 + TAU); g.stroke(); g.strokeStyle = M.over ? '#ff5a5a' : M.heat > 0.7 ? '#ffb02e' : '#4be08a'; g.beginPath(); g.arc(0, 0, 25, -Math.PI / 2, -Math.PI / 2 + TAU * M.heat); g.stroke(); g.restore();
    }
    /* drone brackets */
    let near = null, nd = 1e9;
    for (const d of M.drones) {
      if (d.dead || d.gone) continue; const dist = Math.hypot(d.x - P.x, d.y - P.y, d.z - P.z); if (dist < nd) { nd = dist; near = d; }
      _vmv.set(d.x, d.y, d.z).project(camera); if (_vmv.z >= 1 || Math.abs(_vmv.x) > 1.05 || Math.abs(_vmv.y) > 1.05) continue;
      const x = (_vmv.x * 0.5 + 0.5) * w, y = (-_vmv.y * 0.5 + 0.5) * h, half = clamp(1400 / dist, 13, 40), cos = ((d.x - P.x) * _vmFw.x + (d.y - P.y) * _vmFw.y + (d.z - P.z) * _vmFw.z) / dist, locked = cos > Math.cos(6 * DEG) && dist < 900;
      g.save(); g.translate(x, y); g.strokeStyle = locked ? '#ff4d5e' : 'rgba(255,120,110,0.85)'; g.lineWidth = locked ? 3 : 2; const c = half * 0.4;
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { g.beginPath(); g.moveTo(sx * half, sy * (half - c)); g.lineTo(sx * half, sy * half); g.lineTo(sx * (half - c), sy * half); g.stroke(); }
      g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(-half, half + 5, half * 2, 5); g.fillStyle = '#ff4d5e'; g.fillRect(-half + 1, half + 6, (half * 2 - 2) * clamp(d.hp / d.hpMax, 0, 1), 3);
      g.font = '700 15px Rajdhani, sans-serif'; g.textAlign = 'center'; g.fillStyle = '#fff'; g.strokeStyle = 'rgba(0,0,0,0.8)'; g.lineWidth = 3.5; const lab = d.T.name.toUpperCase() + ' · ' + VM.dist(dist); g.strokeText(lab, 0, -half - 6); g.fillText(lab, 0, -half - 6);
      if (dist < 950) { vmLead(P, d, _vmLd); _vmv.set(_vmLd.x, _vmLd.y, _vmLd.z).project(camera); if (_vmv.z < 1) { const lx = (_vmv.x * 0.5 + 0.5) * w - x, ly = (-_vmv.y * 0.5 + 0.5) * h - y; g.strokeStyle = locked ? '#ffb02e' : 'rgba(255,176,46,0.6)'; g.lineWidth = 2; g.beginPath(); g.arc(lx, ly, 7, 0, TAU); g.stroke(); if (locked) { g.beginPath(); g.moveTo(0, 0); g.lineTo(lx, ly); g.stroke(); } } }
      g.restore();
    }
    /* arrows for the ones off screen */
    for (const d of M.drones) { if (d.dead || d.gone) continue; _vmv.set(d.x, d.y, d.z).project(camera); if (_vmv.z < 1 && Math.abs(_vmv.x) <= 1.05 && Math.abs(_vmv.y) <= 1.05) continue; VM.marker(g, w, h, d.x, d.y, d.z, '#ff4d5e', d === near ? VM.dist(nd) : ''); }
  },
  mini(M, icon) { for (const d of M.drones) if (!d.dead && !d.gone) icon(d.x, d.z, '#ff4d5e', 6, true); },
  full(M, g, k) { for (const d of M.drones) { if (d.dead || d.gone) continue; const s = FM.toScreen(d.x, d.z); g.fillStyle = '#ff4d5e'; g.strokeStyle = '#06090e'; g.lineWidth = 2 * k; g.beginPath(); g.arc(s[0], s[1], 5 * k, 0, TAU); g.fill(); g.stroke(); } },
  visual(M, dt) { if (VMB.inited) { /* tracers are redrawn in update; keep them hidden when paused */ } },
  end(M) {
    if (M.G) { scene.remove(M.G); M.G = null; } for (const b of VMB.pl) b.on = false; for (const b of VMB.en) b.on = false;
    if (VMB.inited) { VMB.mp.count = 0; VMB.mp.visible = false; VMB.me.count = 0; VMB.me.visible = false; }
  }
};
