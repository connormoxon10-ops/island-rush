/* ================= CORAL PUTT: three-hole mini golf (Cape Harlow) =================
   A windmill, a dog-leg and a bumper garden. Aim with the pointer, pull the power bar down and let go. Fewest strokes beats the rival's card (ties go
   to the guest). Walls, bumpers and the spinning windmill arm all bounce; a ball that is going too fast will lip over the cup. */
Ven.games.golf = (function () {
  const BR = 0.04, CUP = 0.075, E_W = 0.72, MAXS = 7;
  const outline = (x0, z0, x1, z1) => [[x0, z0, x1, z0], [x1, z0, x1, z1], [x1, z1, x0, z1], [x0, z1, x0, z0]];
  const HOLES = [
    { name: 'The Windmill', par: 2, tee: [0, 0.9], cup: [0, 8.3], rects: [[-0.85, 0, 0.85, 9.2]], walls: outline(-0.85, 0, 0.85, 9.2), bumpers: [], mill: { x: 0, z: 4.7, len: 1.35, w: 1.5 }, col: 0x2e9a4a },
    { name: 'The Dog-leg', par: 3, tee: [0, 0.9], cup: [6.0, 5.9], rects: [[-0.85, 0, 0.85, 6.8], [-0.85, 5.0, 6.8, 6.8]], walls: [[-0.85, 0, 0.85, 0], [0.85, 0, 0.85, 5.0], [0.85, 5.0, 6.8, 5.0], [6.8, 5.0, 6.8, 6.8], [6.8, 6.8, -0.85, 6.8], [-0.85, 6.8, -0.85, 0]], bumpers: [{ x: 3.4, z: 5.9, r: 0.2 }], mill: null, col: 0x34a85a },
    { name: 'The Bumper Garden', par: 3, tee: [0, 0.9], cup: [0, 7.9], rects: [[-2.3, 0, 2.3, 8.8]], walls: outline(-2.3, 0, 2.3, 8.8), bumpers: [{ x: -1.1, z: 3.0, r: 0.3 }, { x: 1.1, z: 3.0, r: 0.3 }, { x: 0, z: 4.3, r: 0.3 }, { x: -1.4, z: 5.7, r: 0.28 }, { x: 1.4, z: 5.7, r: 0.28 }, { x: 0, z: 6.6, r: 0.24 }], mill: null, col: 0x2a9a60 }
  ];
  const BIAS = [0.9, 0.55, 0.2, -0.15];
  const G = { ready: false, sc: null, cam: null, expo: 1.15, stakeLabel: 'Entry stake',
    rules: 'Three holes against a rival. Aim with the pointer, drag the power bar down and release. Fewest strokes wins (ties go to you), seven strokes max a hole. A win pays double your stake; casual wins pay $30.' };
  let st = null, V0 = null, ball = null, flag = null, armG = null, guide = null, hg = []; const kd = {}; let camKey = '', camD = 8, lastMv = -1;
  const rnd = () => (st ? st.rnd() : Math.random());
  const ang = (a) => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
  const tock = (v) => { if (!Snd.ok || !Snd.ctx || V0.t - (tock.t || -1) < 0.03) return; tock.t = V0.t; const t = Snd.ctx.currentTime; Snd.tone(t, 900 + v * 120, 0.04, 'triangle', clamp(v / 8, 0.05, 0.25), 4000, 0.001, Snd.sfx); };
  function build() {
    const sc = G.sc = new THREE.Scene(); sc.background = venCanvasTex(8, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#3a9ad8'); gr.addColorStop(1, '#8ad8e8'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    sc.add(new THREE.HemisphereLight(lc(0xfff4e0), lc(0xc8b890), 0.85)); const sun = new THREE.DirectionalLight(lc(0xfff0d0), 1.1); sun.position.set(-4, 10, -3); sc.add(sun);
    const sand = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshStandardMaterial({ color: lc(0xe6d6a8), roughness: 1 })); sand.rotation.x = -Math.PI / 2; sand.position.y = -0.02; sc.add(sand);
    const rail = venMat(0xf4f0e6, 0.5), coral = venMat(0xff6a7a, 0.5), post = venMat(0x2fc4c0, 0.5);
    HOLES.forEach((H, hi) => {
      const g = new THREE.Group(); sc.add(g); hg.push(g); const felt = venMat(H.col, 0.95);
      for (const [x0, z0, x1, z1] of H.rects) venBox(g, x1 - x0, 0.06, z1 - z0, (x0 + x1) / 2, 0, (z0 + z1) / 2, felt);
      H.walls.forEach(([x0, z0, x1, z1], k) => { const l = Math.hypot(x1 - x0, z1 - z0), m = venBox(g, l + 0.1, 0.14, 0.09, (x0 + x1) / 2, 0.05, (z0 + z1) / 2, k % 2 ? coral : rail); m.rotation.y = -Math.atan2(z1 - z0, x1 - x0); });
      for (const b of H.bumpers) { venCyl(g, b.r, b.r, 0.18, b.x, 0.08, b.z, hi === 2 ? venMat(0xf2c230, 0.4) : coral, 20); venCyl(g, b.r * 0.9, b.r * 0.9, 0.02, b.x, 0.18, b.z, rail, 20); }
      venBox(g, 0.5, 0.02, 0.8, H.tee[0], 0.04, H.tee[1], venMat(0x1a4a2a, 0.9)); const cup = new THREE.Mesh(new THREE.CircleGeometry(CUP * 0.9, 20), new THREE.MeshBasicMaterial({ color: 0x050505 })); cup.rotation.x = -Math.PI / 2; cup.position.set(H.cup[0], 0.032, H.cup[1]); g.add(cup);
      const fp = venCyl(g, 0.012, 0.012, 0.9, H.cup[0] + 0.08, 0.45, H.cup[1] + 0.06, rail, 6); const fl = venBox(g, 0.28, 0.17, 0.01, H.cup[0] + 0.22, 0.82, H.cup[1] + 0.06, venMat(0xe0302c, 0.6)); H.flag = [fp, fl];
      for (const [x, z] of palmSpots(H)) { venCyl(g, 0.08, 0.14, 2.4, x, 1.2, z, venMat(0x8a6038, 0.9), 8).rotation.z = (x > 0 ? 0.12 : -0.12); for (let a = 0; a < 6; a++) { const lf = venBox(g, 1.3, 0.04, 0.22, x + Math.cos(a * 1.05) * 0.5 + (x > 0 ? -0.15 : 0.15), 2.45 - Math.abs(Math.sin(a)) * 0.15, z + Math.sin(a * 1.05) * 0.5, venMat(0x2f8a3a, 0.8)); lf.rotation.y = a * 1.05; lf.rotation.z = -0.28; } }
      if (H.mill) { const m = H.mill; venCyl(g, 0.12, 0.2, 1.5, m.x, 0.75, m.z, rail, 12); venBox(g, 0.5, 0.35, 0.5, m.x, 1.55, m.z, coral); venBox(g, 0.4, 0.08, 0.4, m.x, 1.78, m.z, rail); }
    });
    armG = new THREE.Group(); const am = HOLES[0].mill; venBox(armG, am.len * 2 > 0 ? am.len : 1.35, 0.1, 0.1, 0, 0, 0, venMat(0xf2c230, 0.4)); venBox(armG, 0.12, 0.1, 0.5, am.len / 2 - 0.1, 0, 0, venMat(0xe0302c, 0.5)); venBox(armG, 0.12, 0.1, 0.5, -am.len / 2 + 0.1, 0, 0, venMat(0xe0302c, 0.5)); armG.position.set(am.x, 0.6, am.z); hg[0].add(armG);
    ball = new THREE.Mesh(new THREE.SphereGeometry(BR * 1.5, 16, 12), venMat(0xffffff, 0.2, 0.05)); sc.add(ball);
    const gm = new THREE.PlaneGeometry(1, 0.03); gm.rotateX(-Math.PI / 2); gm.translate(0.5, 0, 0); guide = new THREE.Mesh(gm, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false })); guide.position.y = 0.075; guide.renderOrder = 3; sc.add(guide);
    G.cam = new THREE.PerspectiveCamera(38, 16 / 9, 0.05, 90);
  }
  G.init = function (V) { V0 = V; build(); };
  const palmSpots = (H) => { const b = bounds(H), w = b[2] - b[0], d = b[3] - b[1]; return [[b[2] + 1.5, b[1] + d * 0.18], [b[2] + 1.9, b[1] + d * 0.78], [b[0] + w * 0.22, b[3] + 1.5], [b[0] + w * 0.82, b[3] + 1.9]]; };
  const bounds = (H) => { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const [x0, z0, x1, z1] of H.rects) { a = Math.min(a, x0); b = Math.min(b, z0); c = Math.max(c, x1); d = Math.max(d, z1); } return [a - 0.6, b - 0.5, c + 0.6, d + 0.5]; };
  const tv = new THREE.Vector3();
  function placeCam(cam, D, H, port) {
    const bb = bounds(H), cx = (bb[0] + bb[2]) / 2, cz = (bb[1] + bb[3]) / 2, th = 1.12;
    if (!port) cam.position.set(cx - Math.cos(th) * D, Math.sin(th) * D, cz); else cam.position.set(cx, Math.sin(th) * D, cz - Math.cos(th) * D);
    cam.up.set(0, 1, 0); cam.lookAt(cx, 0, cz); cam.updateMatrixWorld(true);
  }
  function fit(cam, H, W, Hh, port) {
    const bb = bounds(H);
    for (let D = 2; D < 60; D += 0.1) { placeCam(cam, D, H, port); let ok = true; for (const x of [bb[0], bb[2]]) for (const z of [bb[1], bb[3]]) { tv.set(x, 0, z).project(cam); if (Math.abs(tv.x) > 0.78 || Math.abs(tv.y) > 0.74) ok = false; } if (ok) return D; }
    return 20;
  }
  function setHole(i) {
    st.hole = i; const H = HOLES[i]; hg.forEach((g, k) => { g.visible = k === i; }); st.b = { x: H.tee[0], z: H.tee[1], vx: 0, vz: 0 }; st.strokes[i] = 0; st.phase = 'aim'; st.sink = 0; st.aim = Math.atan2(H.cup[1] - H.tee[1], H.cup[0] - H.tee[0]); st.pw = 0; ball.scale.setScalar(1); camKey = '';
    V0.say('Hole ' + (i + 1) + ' · ' + H.name + ' · par ' + H.par, 2.6);
  }
  G.enter = function (V) { V0 = V; if (!G.sc) G.init(V); st = { rnd: mulberry32((Date.now() & 0xffff) + 9), phase: 'lobby', t: 0, hole: 0, strokes: [0, 0, 0], ai: [0, 0, 0], b: { x: 0, z: 0, vx: 0, vz: 0 }, aim: 0, pw: 0, sink: 0, done: [false, false, false], drag: false }; if (G.seed) st.rnd = mulberry32(G.seed); setHole(0); st.phase = 'lobby'; camKey = ''; Ven.pw.show(false); };
  G.begin = function (V, stake) {
    G.enter(V); const idx = Math.max(0, V.D.stakes.indexOf(stake));
    for (let i = 0; i < 3; i++) { const g = venGauss(rnd) * 0.75 + BIAS[idx]; st.ai[i] = clamp(HOLES[i].par + Math.round(g), 1, 6); }
    setHole(0); Ven.pw.show(true, shoot, 'Power'); V.say('Aim with the pointer · drag the power bar down and release', 3.6);
  };
  G.cleanup = function () { Ven.pw.show(false); for (const k in kd) kd[k] = false; };
  function shoot(p) { if (!st || st.phase !== 'aim') return; const v = 0.45 + 6.4 * Math.pow(p, 1.25); st.b.vx = Math.cos(st.aim) * v; st.b.vz = Math.sin(st.aim) * v; st.strokes[st.hole]++; st.phase = 'roll'; st.rest = 0; st.t = 0; tock(v); Ven.pw.show(false); }
  function seg(x0, z0, x1, z1, b, e) {
    const dx = x1 - x0, dz = z1 - z0, l2 = dx * dx + dz * dz; let t = l2 ? ((b.x - x0) * dx + (b.z - z0) * dz) / l2 : 0; t = clamp(t, 0, 1); const px = x0 + dx * t, pz = z0 + dz * t, ex = b.x - px, ez = b.z - pz, d = Math.hypot(ex, ez);
    if (d < BR && d > 1e-6) { const nx = ex / d, nz = ez / d; b.x = px + nx * BR; b.z = pz + nz * BR; const vn = b.vx * nx + b.vz * nz; if (vn < 0) { b.vx -= (1 + e) * vn * nx; b.vz -= (1 + e) * vn * nz; tock(-vn); return true; } }
    return false;
  }
  function physics(dt) {
    const H = HOLES[st.hole], b = st.b, n = Math.max(1, Math.ceil(dt / (1 / 240))), h = dt / n;
    for (let s = 0; s < n; s++) {
      const sp = Math.hypot(b.vx, b.vz); if (sp > 0) { const dec = (0.55 + 0.25 * sp) * h; if (sp <= dec + 0.02) { b.vx = b.vz = 0; } else { const k = (sp - dec) / sp; b.vx *= k; b.vz *= k; } }
      b.x += b.vx * h; b.z += b.vz * h;
      for (const w of H.walls) seg(w[0], w[1], w[2], w[3], b, E_W);
      for (const bp of H.bumpers) { const dx = b.x - bp.x, dz = b.z - bp.z, d = Math.hypot(dx, dz), m = bp.r + BR; if (d < m && d > 1e-6) { const nx = dx / d, nz = dz / d; b.x = bp.x + nx * m; b.z = bp.z + nz * m; const vn = b.vx * nx + b.vz * nz; if (vn < 0) { b.vx -= 1.9 * vn * nx; b.vz -= 1.9 * vn * nz; tock(-vn * 1.3); } } }
      if (H.mill) { const m = H.mill, a = st.arm || 0, ca = Math.cos(a) * m.len / 2, sa = Math.sin(a) * m.len / 2; seg(m.x - ca, m.z - sa, m.x + ca, m.z + sa, b, 0.8); const dx = b.x - m.x, dz = b.z - m.z, d = Math.hypot(dx, dz); if (d < 0.14 + BR && d > 1e-6) { b.x = m.x + dx / d * (0.14 + BR); b.z = m.z + dz / d * (0.14 + BR); const vn = (b.vx * dx + b.vz * dz) / d; if (vn < 0) { b.vx -= 1.8 * vn * dx / d; b.vz -= 1.8 * vn * dz / d; } } }
      const cx = H.cup[0] - b.x, cz = H.cup[1] - b.z, cd = Math.hypot(cx, cz), spd = Math.hypot(b.vx, b.vz);
      if (cd < CUP && spd < 2.7) { st.phase = 'sink'; st.sink = 0; b.vx = b.vz = 0; if (Snd.ok) Snd.pop(); return; }
      if (cd < 0.16 && spd < 3.2 && spd > 0) { const pull = 1.1 * h / Math.max(0.05, cd); b.vx += cx / cd * pull * 0.5; b.vz += cz / cd * pull * 0.5; }
    }
  }
  const planePt = (cam) => { const rc = Ven.ray(cam).ray, o = rc.origin, d = rc.direction; if (d.y > -1e-5) return null; const t = (0.07 - o.y) / d.y; return [o.x + d.x * t, o.z + d.z * t]; };
  G.update = function (V, dt) {
    dt = Math.min(dt, 0.1); st.t += dt; st.arm = (st.arm || 0) + dt * 1.55; const P = V.ptr, H = HOLES[st.hole];
    if (st.phase === 'aim') {
      if (P.mvn !== lastMv) { lastMv = P.mvn; if (P.down || P.type === 'mouse') { const pt = planePt(G.cam); if (pt && Math.hypot(pt[0] - st.b.x, pt[1] - st.b.z) > 0.08) st.aim = Math.atan2(pt[1] - st.b.z, pt[0] - st.b.x); } }
      const fine = kd.ShiftLeft || kd.ShiftRight ? 0.1 : 0.7; st.aim = ang(st.aim + ((kd.ArrowRight || kd.KeyD ? 1 : 0) - (kd.ArrowLeft || kd.KeyA ? 1 : 0)) * fine * dt);
      if (kd.Space) { st.pw = Math.min(1, st.pw + dt * 0.6); Ven.pw.set(st.pw); }
    } else if (st.phase === 'roll') {
      physics(dt); if (st.phase === 'roll') { if (st.b.vx === 0 && st.b.vz === 0) { st.rest += dt; if (st.rest > 0.25) { if (st.strokes[st.hole] >= MAXS) holeOut(true); else { st.phase = 'aim'; st.pw = 0; Ven.pw.show(true); Ven.pw.set(0); const pt = HOLES[st.hole].cup; st.aim = Math.atan2(pt[1] - st.b.z, pt[0] - st.b.x); } } } else st.rest = 0; }
    } else if (st.phase === 'sink') { st.sink += dt; const k = Math.min(1, st.sink / 0.35); st.b.x += (H.cup[0] - st.b.x) * Math.min(1, dt * 14); st.b.z += (H.cup[1] - st.b.z) * Math.min(1, dt * 14); ball.scale.setScalar(1 - k * 0.7); if (st.sink > 0.4) holeOut(false); }
    else if (st.phase === 'next') { if (st.t > 1.5) { if (st.hole >= 2) finish(); else setHole(st.hole + 1), Ven.pw.show(true), Ven.pw.set(0), st.t = 0; } }
    visuals(dt);
  };
  function holeOut(pickup) {
    const s = st.strokes[st.hole], par = HOLES[st.hole].par, d = s - par; st.done[st.hole] = true; st.phase = 'next'; st.t = 0; Ven.pw.show(false); ball.scale.setScalar(0.3);
    V0.say((pickup ? 'Pick up · ' : s === 1 ? 'Hole in one! · ' : '') + s + ' stroke' + (s > 1 ? 's' : '') + ' (' + (d === 0 ? 'par' : d < 0 ? Math.abs(d) + ' under' : d + ' over') + ') · rival ' + st.ai[st.hole], 2.8); if (Snd.ok) (d <= 0 ? Snd.win() : Snd.beep(420, 0.08));
  }
  function visuals(dt) {
    const H = HOLES[st.hole], b = st.b; ball.position.set(b.x, 0.03 + BR * 1.5, b.z); const sp = Math.hypot(b.vx, b.vz); if (sp > 0) { ball.rotation.x += b.vz * dt / BR; ball.rotation.z -= b.vx * dt / BR; }
    if (H.mill) armG.rotation.y = -(st.arm || 0);
    const gv = st.phase === 'aim'; guide.visible = gv; if (gv) { const len = 0.9 + st.pw * 1.6; guide.position.x = b.x; guide.position.z = b.z; guide.rotation.y = -st.aim; guide.scale.x = len; }
    st.pull = 0;
    const W = innerWidth, Ht = innerHeight, port = W < Ht * 1.05, cam = G.cam, key = st.hole + ':' + W + 'x' + Ht;
    cam.aspect = W / Ht; cam.fov = 38; cam.updateProjectionMatrix(); cam.clearViewOffset(); if (key !== camKey) { camKey = key; camD = fit(cam, H, W, Ht, port); }
    placeCam(cam, camD, H, port); Ven.shift(cam, dt); cam.updateMatrixWorld(true);
  }
  function finish() {
    const mine = st.strokes.reduce((a, b) => a + b, 0), rival = st.ai.reduce((a, b) => a + b, 0), win = mine <= rival, stake = V0.stake, par = HOLES.reduce((a, h) => a + h.par, 0);
    st.phase = 'done'; Ven.pw.show(false);
    V0.finish(win, win ? (mine < rival ? 'You win the round' : 'Tie goes to you') : 'Rival wins the round', ['You ' + st.strokes.join(' · ') + ' = ' + mine + ' (par ' + par + ')', 'Rival ' + st.ai.join(' · ') + ' = ' + rival], win ? (stake ? stake * 2 : 30) : 0);
    const r = venRec('golf'); if (!r.best || mine < r.best) r.best = mine;
  }
  G.idle = function (V, dt) { if (st) { st.arm = (st.arm || 0) + dt * 1.55; visuals(dt); } };
  G.ptrdown = function () { };
  G.key = function (V, code, down) { kd[code] = down; if (!down && code === 'Space' && st.phase === 'aim' && st.pw > 0.045) { const p = st.pw; Ven.pw.set(0); shoot(p); } };
  G.hud = function () {
    if (!st) return ''; const H = HOLES[st.hole], me = st.strokes.map((v, i) => (st.done[i] || i === st.hole ? v : '–')).join(' · '), ai = st.ai.map((v, i) => (st.done[i] ? v : '–')).join(' · ');
    return '<span class="big">' + (st.hole + 1) + ' · ' + H.name + '</span><div class="r"><span>Par ' + H.par + '</span><b>Strokes ' + st.strokes[st.hole] + '</b></div><div class="r"><span>You</span><b>' + me + '</b></div><div class="r"><span>Rival</span><b>' + ai + '</b></div>';
  };
  G.hint = function () { return st && st.phase === 'aim' ? 'Aim with the <em>pointer</em> (or ← →) · drag the <em>power bar</em> down and release · hold <em>Space</em> to charge' : ''; };
  G.recText = function (rec) { return ['Best round', rec.best ? rec.best + ' strokes' : '–']; };
  G.dbg = () => st; G.api = { shoot, HOLES, physics: (dt) => physics(dt) };
  return G;
})();
