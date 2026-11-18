/* ================= NAMED BEACHES, BEACH ROADS AND THE SURF CLUB =================
   Four of the island's best beaches (wide, gentle sand, well away from towns and the sites) get a name, a road down to a small car park (a spur off the
   nearest road, levelled like any other), a wooden name board at the end of it and a label on the map. The first of them is Pelican Point, home of the
   Surf Club: a beach hut with boards racked outside and an orange beam. Stop by it and press E to surf.
   Surfing: three waves roll in one after another. Each is a long swell that steepens and breaks from left to right; you ride along its face to the
   right, ahead of the breaking white water. A/D carve up and down the face (down is speed, up is height), W pumps for speed. Hit the lip going up
   fast and you fly: A/D spin in the air, land straight to score it. Ride deep, near the curl, for double points. Get caught by the white water, fall
   off the back or land a spin crooked and you wipe out. Points become prize money; R or E ends the session early. */
const BEACH_NAMES = ['Pelican Point', 'Driftwood Bay', 'Sunset Strand', 'Coral Cove'];
const Surf = { beaches: [], on: false, phase: 'off', near: false, group: null, built: false, w: null, s: null, score: 0, best: 0, waves: 0, msgT: 0 };
const SURF = { WAVES: 3, WV: 4.2, A: 3.4, F: 10, D0: 105, D1: 22, BS: 5.2, U0: -60, U1: 60, M0: -100, M1: 100, PAY: 0.25 };

/* ---------- planning (from genWorld, before the road hash and the chunks): find the beaches and lay their roads ---------- */
Surf.plan = function () {
  const cands = [];
  for (let a = 0; a < TAU; a += 0.025) {
    const sx = Math.sin(a), sz = Math.cos(a); let r = 5600; while (r > 1300 && terrainNoRoad(sx * r, sz * r) < 0.6) r -= 6; if (r <= 1300) continue;
    const x0 = sx * r, z0 = sz * r, gx = terrainNoRoad(x0 + 5, z0) - terrainNoRoad(x0 - 5, z0), gz = terrainNoRoad(x0, z0 + 5) - terrainNoRoad(x0, z0 - 5), gl = Math.hypot(gx, gz) || 1, ix = gx / gl, iz = gz / gl;   /* inland */
    const h30 = terrainNoRoad(x0 + ix * 30, z0 + iz * 30), h60 = terrainNoRoad(x0 + ix * 60, z0 + iz * 60), hs = terrainNoRoad(x0 - ix * 40, z0 - iz * 40);
    if (h30 < 0.8 || h30 > 4.5 || h60 > 10 || hs > -0.8) continue;   /* a gentle beach with real sea in front of it */
    let bad = false; for (const T of towns) if (Math.hypot(x0 - T.cx, z0 - T.cz) < T.half * 1.5 + 220) bad = true;
    for (const S of [Air.s && [(Air.s.x0 + Air.s.x1) / 2, (Air.s.z0 + Air.s.z1) / 2, 650], Track.s && [(Track.s.x0 + Track.s.x1) / 2, (Track.s.z0 + Track.s.z1) / 2, 600], Dock.s && [Dock.s.ox, Dock.s.oz, 400]]) if (S && Math.hypot(x0 - S[0], z0 - S[1]) < S[2]) bad = true;
    if (bad) continue;
    /* the nearest road point */
    const px = x0 + ix * 55, pz = z0 + iz * 55; let best = null, bd = 1e18;
    for (const rd of roads) for (const p of rd.pts) { const d = (p.x - px) ** 2 + (p.z - pz) ** 2; if (d < bd) { bd = d; best = p; } }
    if (!best) continue; const dist = Math.sqrt(bd); if (dist < 90 || dist > 1100) continue;
    cands.push({ a, x: x0, z: z0, ix, iz, px, pz, to: best, dist, c: Math.abs(h30 - 2) + h60 * 0.15 + dist / 900 });
  }
  cands.sort((p, q) => p.c - q.c);
  for (const c of cands) { if (Surf.beaches.length >= BEACH_NAMES.length) break; if (Surf.beaches.some((b) => Math.abs(Math.atan2(Math.sin(b.a - c.a), Math.cos(b.a - c.a))) < 0.7)) continue; Surf.beaches.push(c); }
  Surf.beaches.forEach((b, k) => { b.name = BEACH_NAMES[k]; b.surf = k === 0; surfRoad(b); });
};
/* a road from the nearest road down to the beach car park, like the raceway's: a gently wandering line, its height smoothed and held to a grade */
function surfRoad(b) {
  const sx = b.px, sz = b.pz, best = b.to, L = b.dist, nx0 = best.x - sx, nz0 = best.z - sz, px = -nz0 / L, pz = nx0 / L, n = Math.max(3, Math.round(L / 30)), mid = [{ x: sx, z: sz }];
  for (let i = 1; i < n; i++) { const t = i / n, dev = Math.sin(Math.PI * t) * L * 0.06 * noise2(t * 2.1 + b.a * 3, 4.7); mid.push({ x: sx + nx0 * t + px * dev, z: sz + nz0 * t + pz * dev }); }
  mid.push({ x: best.x, z: best.z });
  const pts = resample(mid, 25), N = pts.length, h = new Float32Array(N);
  for (let i = 0; i < N; i++) h[i] = terrainNoRoad(pts[i].x, pts[i].z);
  for (let pass = 0; pass < 6; pass++) { const t = Float32Array.from(h); for (let i = 2; i < N - 2; i++) h[i] = (t[i - 2] + 2 * t[i - 1] + 3 * t[i] + 2 * t[i + 1] + t[i + 2]) / 9; }
  h[N - 1] = best.h != null ? best.h : h[N - 1]; const maxStep = 0.08 * 25;
  for (let pass = 0; pass < 3; pass++) { for (let i = 1; i < N - 1; i++) h[i] = clamp(h[i], h[i - 1] - maxStep, h[i - 1] + maxStep); for (let i = N - 2; i > 0; i--) h[i] = clamp(h[i], h[i + 1] - maxStep, h[i + 1] + maxStep); }
  for (let i = 0; i < N; i++) pts[i].h = Math.max(h[i], 1.6); pts[N - 1].h = h[N - 1];
  b.road = addRoad('hw', pts, 4.6, { name: b.name + ' Road', spur: true }); b.ph = pts[0].h;
}

/* ---------- the world: name boards, the surf hut, the beam ---------- */
function surfSignTex(name, sub) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 192; const g = c.getContext('2d');
  g.fillStyle = '#8a5a34'; g.fillRect(0, 0, 512, 192); for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? '#7a4e2c' : '#94643c'; g.fillRect(0, i * 32, 512, 30); }
  g.strokeStyle = '#f4ead2'; g.lineWidth = 8; g.strokeRect(10, 10, 492, 172);
  g.fillStyle = '#fff4dc'; g.font = '700 70px Rajdhani, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(name.toUpperCase(), 256, 82);
  g.font = '600 32px Rajdhani, Arial, sans-serif'; g.fillStyle = '#ffd27a'; g.fillText(sub, 256, 146);
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
}
Surf.build = function () {
  if (Surf.built) return; Surf.built = true; Surf.group = new THREE.Group(); Surf.group.name = 'beaches'; scene.add(Surf.group);
  const wood = new THREE.MeshStandardMaterial({ color: 0x6a4a2c, roughness: 0.9 }), post = new THREE.CylinderGeometry(0.09, 0.11, 3.2, 8);
  for (const b of Surf.beaches) {
    const yaw = Math.atan2(-b.ix, -b.iz), x = b.px + b.ix * -6 + b.iz * 5, z = b.pz + b.iz * -6 - b.ix * 5, y = terrainHeight(x, z);   /* beside the car park, facing the arrivals */
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = yaw + Math.PI;
    for (const sd of [-1, 1]) { const p = new THREE.Mesh(post, wood); p.position.set(sd * 1.7, 1.6, 0); p.castShadow = true; g.add(p); }
    const board = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 1.42), new THREE.MeshStandardMaterial({ map: surfSignTex(b.name, b.surf ? 'SURF CLUB · BEACH' : 'BEACH · PARKING'), roughness: 0.85, side: THREE.DoubleSide })); board.position.set(0, 2.45, 0.1); g.add(board);
    Surf.group.add(g); b.sign = g;
  }
  const B = Surf.beaches.find((b) => b.surf); if (!B) return;
  /* the surf hut on the sand, boards racked against it, the orange beam */
  const hx = B.x + B.ix * 18, hz = B.z + B.iz * 18, hy = terrainHeight(hx, hz), hut = new THREE.Group(), gb = new GB(0, 0, false), box = ni(new THREE.BoxGeometry(1, 1, 1)), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(0, 0, 0, 'YXZ'), V = new THREE.Vector3(), Sc = new THREE.Vector3();
  const brd = ni(new THREE.SphereGeometry(1, 12, 8)), put = (g2, px, py, pz, sx, sy, sz, col, ry, rz) => { M.compose(V.set(px, py, pz), Q.setFromEuler(E.set(0, ry || 0, rz || 0)), Sc.set(sx, sy, sz)); gb.geo(g2, M, col, 0.2); };
  put(box, 0, 1.4, 0, 4, 2.8, 3, lc(0x2aa8c8)); put(box, 0, 3.0, 0, 4.8, 0.2, 3.8, lc(0xf4ead2)); put(box, 0, 1.0, 1.51, 1.2, 2.0, 0.04, lc(0x6a4a2c)); put(box, 1.3, 1.6, 1.51, 0.9, 0.7, 0.04, lc(0x30485e));
  for (let k = 0; k < 5; k++) put(brd, -2.3 - 0.05 * k, 1.1, -1.2 + k * 0.6, 0.26, 1.05, 0.045, BCH_SWIM[k % BCH_SWIM.length], 0, 0.12);
  const m = gb.mesh(MAT.prop, true, true); hut.add(m); hut.position.set(hx, hy, hz); hut.rotation.y = Math.atan2(-B.ix, -B.iz); Surf.group.add(hut);
  B.hx = hx; B.hz = hz; const beam = Surf.beam = makeBeam('#ff9a2a', 4, 40); beam.position.set(hx - B.ix * 6, hy + 20, hz - B.iz * 6); Surf.group.add(beam);
  B.ox = hx - B.ix * 6; B.oz = hz - B.iz * 6;
};
Surf.setup = function () { if (Surf.beaches.length) Surf.build(); };

/* ---------- the session ---------- */
Surf.at = function (q, u, o) {   /* world position of the wave-frame point: q shoreward of the crest, u along it, at the current wave */
  const B = Surf.B, w = Surf.w, d = w.d - q; o.x = B.x - B.ix * d + B.iz * u; o.z = B.z - B.iz * d - B.ix * u; return o;
};
/* the wave's height at (q, u): a long swell with a steep face, standing up as it runs in; white water behind the break collapses it */
Surf.H = function (q, u) {
  const w = Surf.w, A = SURF.A * w.grow * (1 - sstep(SURF.U1 - 5, SURF.M1, Math.abs(u))) * (u < w.bu ? 0.55 : 1);
  if (q < 0) return A * Math.exp(-((q / 9) ** 2)); const f = 1 - sstep(0, SURF.F, q); return A * Math.pow(f, 1.5);
};
function surfLook() {
  const r = mulberry32(17), R0 = Math.random; let a; Math.random = r; try { a = pedRandomLook(); } finally { Math.random = R0; }
  a.kid = false; a.old = false; a.coat = false; a.skirt = 0; a.bag = false; a.sleeve = false; a.shorts = true; a.swim = true; a.hat = null; a.glasses = false; a.shoe = a.skin;
  a.pants = lc(0x1f6fd1); a.shirt = a.fem ? lc(0x18a89a) : a.skin; return a;
}
Surf.start = function () {
  const B = Surf.B = Surf.beaches.find((b) => b.surf); if (!B || Surf.on) return;
  Surf.on = true; Surf.score = 0; Surf.waves = 0; Surf.prev = { x: car.x, z: car.z, yaw: car.yaw };
  if (!Surf.mesh) {
    const nu = 101, nq = 31, g = new THREE.BufferGeometry(), pos = new Float32Array(nu * nq * 3), col = new Float32Array(nu * nq * 4), idx = [];
    for (let j = 0; j < nq - 1; j++) for (let i = 0; i < nu - 1; i++) { const a = j * nu + i; idx.push(a, a + nu, a + 1, a + 1, a + nu, a + nu + 1); }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 4)); g.setIndex(idx);
    Surf.mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.18, metalness: 0.05, transparent: true, opacity: 1, depthWrite: false, side: THREE.DoubleSide })); Surf.mesh.frustumCulled = false; Surf.mesh.renderOrder = 4; Surf.mesh.nu = nu; Surf.mesh.nq = nq;
    const hu = Surf.hu = Human.make(Object.assign(pedSpec(surfLook(), 3), {})); Surf.surfer = new THREE.Group(); Surf.surfer.add(hu.root);
    const bd = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8), new THREE.MeshStandardMaterial({ color: 0xf2c81e, roughness: 0.4 })); bd.scale.set(0.3, 0.05, 1.15); bd.position.y = 0.04; Surf.surfer.add(bd); Surf.boardM = bd;
  }
  Surf.group.add(Surf.mesh, Surf.surfer); Surf.mesh.visible = Surf.surfer.visible = true; car.body.visible = false;
  Surf.newWave(); UI.banner('SURF CLUB', 'Three waves · ride the face ahead of the white water · A/D carve, W pumps, hit the lip to fly');
};
Surf.newWave = function () {
  Surf.w = { d: SURF.D0, bu: SURF.U0 - 6, grow: 0.3, t: 0 };
  Surf.s = { u: SURF.U0 + 14, v: 0.55, phi: 0.25, spd: 7, air: false, ay: 0, avy: 0, spin: 0, pts: 0, tube: 0, wipe: 0, done: false };
  Surf.phase = 'ride'; Surf.waves++; Surf.msgT = 0; Snd.whoosh();
};
Surf.end = function (early) {
  Surf.on = false; Surf.phase = 'off'; if (Surf.mesh) Surf.mesh.visible = false; if (Surf.surfer) Surf.surfer.visible = false; car.body.visible = true;
  const pay = Math.round(Surf.score * SURF.PAY / 10) * 10; save.money += pay; const R = save.surf || (save.surf = { best: 0, sessions: 0 }); R.sessions++; if (Surf.score > R.best) R.best = Math.round(Surf.score); writeSave();
  UI.banner(early ? 'SESSION OVER' : 'SURF’S DONE', Math.round(Surf.score) + ' points · ' + money(pay)); Snd.win();
};
/* the controls, read straight from the keys, touch and the pad */
function surfInput() {
  const K = Keys; let st = ((K.KeyA || K.ArrowLeft) ? 1 : 0) - ((K.KeyD || K.ArrowRight) ? 1 : 0) + TouchIn.l - TouchIn.r, pump = (K.KeyW || K.ArrowUp) ? 1 : TouchIn.gas || 0;
  let pads = null; try { pads = navigator.getGamepads ? navigator.getGamepads() : null; } catch (er) { pads = null; }
  if (pads) for (const p of pads) if (p && p.connected) { if (Math.abs(p.axes[0]) > 0.1) st = -p.axes[0]; const b = p.buttons[7]; if (b) pump = Math.max(pump, b.value || (b.pressed ? 1 : 0)); break; }
  return { st: clamp(st, -1, 1), pump };
}
const _sfA = {};
Surf.step = function (dt) {
  if (!Surf.on) return; const w = Surf.w, s = Surf.s, I = Surf.in || surfInput();
  w.t += dt; w.d -= SURF.WV * dt; w.grow = Math.min(1, w.grow + dt * 0.25); w.bu += SURF.BS * dt * (w.grow > 0.8 ? 1 : 0.4);
  if (Surf.phase === 'wait') { Surf.msgT -= dt; if (Surf.msgT <= 0) { if (Surf.waves >= SURF.WAVES) Surf.end(false); else Surf.newWave(); } return; }
  if (s.air) {
    s.ay += s.avy * dt; s.avy -= 9.81 * dt; s.spin += I.st * 7 * dt; s.u += Math.cos(s.phi) * s.spd * dt * 0.6;
    const face = Surf.H((1 - s.v) * SURF.F, s.u); if (s.ay <= face && s.avy < 0) {
      s.air = false; s.ay = 0; const turns = Math.round(s.spin / TAU), off = Math.abs(s.spin - turns * TAU);
      if (off < 0.7) { const p = 250 + Math.abs(turns) * 600; s.pts += p; Surf.score += p; UI.toast((turns ? (Math.abs(turns) * 360) + ' AIR' : 'AIR') + ' +' + p, 'good'); Snd.beep(900, 0.1); s.phi = 0.5; s.v = 0.9; }
      else Surf.wipe('Landed it crooked');
      s.spin = 0;
    }
    return;
  }
  s.phi = clamp(s.phi + I.st * -2.4 * dt, -1.25, 1.25);   /* A (left) turns up the face, D (right) down it: you ride to the right */
  const down = Math.sin(s.phi), grav = 9.81 * 0.55 * down * (0.35 + s.v), drag = 0.22 * s.spd + (s.v < 0.12 ? 2.6 : 0), pump = I.pump > 0.2 && s.v > 0.25 ? 1.6 * I.pump : 0;
  s.spd = clamp(s.spd + (grav - drag + pump) * dt, 0, 17); s.v -= down * s.spd / SURF.F * dt * 0.9; s.u += Math.cos(s.phi) * s.spd * dt;
  if (s.v >= 1) { if (s.spd > 6.5 && s.phi < -0.35) { s.air = true; s.v = 1; s.ay = 0; s.avy = s.spd * Math.sin(-s.phi) * 0.75; s.spin = 0; Snd.whoosh(); } else { s.v = 1; s.phi = Math.max(s.phi, 0.2); s.spd *= 0.85; } }
  if (s.v <= 0) { s.v = 0; if (s.spd < 1.4) { Surf.over('The wave left you behind'); return; } }
  /* the curl: right behind the break is the best place on the wave, in it you are gone */
  const gap = s.u - w.bu, mult = gap < 7 && s.v > 0.35 && s.v < 0.85 ? 2 : 1; if (mult > 1) s.tube += dt;
  if (gap < 1.5) { Surf.wipe('Caught by the white water'); return; }
  s.pts += s.spd * dt * 10 * mult; Surf.score += s.spd * dt * 10 * mult;
  if (w.d < SURF.D1 || s.u > SURF.U1 - 8) Surf.over('Rode it all the way in');
};
Surf.wipe = function (why) { const s = Surf.s; s.wipe = 1; Surf.phase = 'wait'; Surf.msgT = 3; Cam.shake = 0.8; Snd.splash(); UI.toast('WIPEOUT · ' + why, 'bad'); };
Surf.over = function (why) { Surf.phase = 'wait'; Surf.msgT = 2.5; UI.toast(why + ' · ' + Math.round(Surf.s.pts) + ' points' + (Surf.s.tube > 1 ? ' · ' + Surf.s.tube.toFixed(1) + ' s in the curl' : ''), 'good'); };
/* the wave mesh and the surfer, every frame */
Surf.visual = function (dt, time) {
  if (!Surf.on) return; const m = Surf.mesh, B = Surf.B, w = Surf.w, s = Surf.s, pos = m.geometry.attributes.position.array, col = m.geometry.attributes.color.array, nu = m.nu, nq = m.nq;
  for (let j = 0; j < nq; j++) for (let i = 0; i < nu; i++) {
    const u = SURF.M0 + (SURF.M1 - SURF.M0) * i / (nu - 1), q = -16 + 30 * j / (nq - 1), k = (j * nu + i) * 3, kc = (j * nu + i) * 4, h = Surf.H(q, u) + 0.06 * Math.sin(u * 0.4 + time * 2 + q * 0.3); Surf.at(q, u, _sfA);
    pos[k] = _sfA.x; pos[k + 1] = h + 0.05; pos[k + 2] = _sfA.z;
    const white = u < w.bu ? clamp(0.7 + 0.3 * Math.sin(u * 1.7 + time * 6 + q), 0, 1) * (1 - sstep(4, 12, q)) : sstep(-0.8, 0, q) * (1 - sstep(0, 1.2, q)) * 0.75 * w.grow, lift = clamp(h / SURF.A, 0, 1);
    col[kc] = lerp(0.04 + 0.12 * lift, 0.95, white); col[kc + 1] = lerp(0.3 + 0.35 * lift, 0.97, white); col[kc + 2] = lerp(0.36 + 0.3 * lift, 1.0, white);
    col[kc + 3] = Math.max(white, (0.25 + 0.75 * sstep(0.05, 0.8, h)) * (1 - sstep(70, 100, Math.abs(u))) * (1 - sstep(8, 14, q)) * sstep(-16, -9, q));   /* the swell fades into the sea round its edges */
  }
  m.geometry.attributes.position.needsUpdate = true; m.geometry.attributes.color.needsUpdate = true; m.geometry.computeVertexNormals();
  /* the surfer: on the face, turned along the wave by the carve, leaning into it */
  const q = (1 - s.v) * SURF.F, y = Surf.H(q, s.u) + (s.air ? s.ay : 0) - (s.wipe ? 1.2 : 0); Surf.at(q, s.u, _sfA);
  const yawWave = Math.atan2(B.iz, -B.ix), yaw = yawWave + s.phi * 0.9 + (s.air ? s.spin : 0); Surf.surfer.position.set(_sfA.x, y, _sfA.z); Surf.surfer.rotation.set(0, yaw, s.wipe ? 1.3 : -s.phi * 0.25, 'YXZ');
  const h = Surf.hu, b = h.b; h.root.rotation.y = Math.PI / 2; h.root.position.y = 0.06;
  b.hips.position.set(0, 0.78, 0); b.hips.rotation.set(0, 0, 0); b.tor.rotation.set(0.25, 0, 0); b.chest.rotation.set(0.1, 0.2, 0);
  b.legL.rotation.set(-0.5, 0, -0.35); b.knL.rotation.set(0.9, 0, 0); b.footL.rotation.set(-0.4, 0, 0); b.legR.rotation.set(0.3, 0, 0.35); b.knR.rotation.set(0.8, 0, 0); b.footR.rotation.set(-0.5, 0, 0);
  b.armL.rotation.set(-0.3, 0, -1.2 - 0.2 * Math.sin(time * 2)); b.armR.rotation.set(-0.2, 0, 1.1 + 0.2 * Math.sin(time * 2.3)); b.elL.rotation.set(-0.3, 0, 0); b.elR.rotation.set(-0.3, 0, 0); b.head.rotation.set(-0.15, -1.2, 0);
  Human.alive(h, dt, time, 3);
};
Surf.camera = function () {
  const s = Surf.s, q = (1 - s.v) * SURF.F; Surf.at(q + 9, s.u - 9, _sfA); const cx = _sfA.x, cz = _sfA.z; Surf.at(q, s.u + 6, _sfA);
  camera.position.set(cx, Math.max(3.2, Surf.H(q, s.u) + 3.2), cz); camera.lookAt(_sfA.x, Surf.H(q, s.u) + 1.0, _sfA.z);
};
Surf.update = function (dt) {
  const B = Surf.beaches.find((b) => b.surf); if (!B || !Surf.built) return;
  if (!Surf.on) { Surf.near = App.mode === 'play' && !Fly.on && !Boat.on && !Mi && !Race.on && Math.hypot(Pl.x - B.ox, Pl.z - B.oz) < 10 && (Foot.on || Math.abs(car.speed) < 5); if (Surf.beam) Surf.beam.visible = true; return; }
  Surf.near = false; if (Surf.beam) Surf.beam.visible = false;
};
Surf.key = function (code) {
  if (!Surf.on) { if (Surf.near && (code === 'KeyE' || code === 'Enter')) { if (Foot.on) Foot.toCar(); Surf.start(); return true; } return false; }
  if (code === 'KeyR' || code === 'KeyE' || code === 'Escape') { Surf.end(true); return true; }
  return /^(KeyF|KeyG|KeyQ|KeyC)$/.test(code);
};
Surf.prompt = function (pr) {
  let h = null;
  if (Surf.on) { const s = Surf.s; h = '<em>SURF</em> wave ' + Surf.waves + ' / ' + SURF.WAVES + ' · ' + Math.round(Surf.score) + ' points · ' + (s.spd * 3.6).toFixed(0) + ' km/h' + (Surf.w && s.u - Surf.w.bu < 7 && !s.air && Surf.phase === 'ride' ? ' · <b style="color:#5df">IN THE CURL ×2</b>' : '') + ' · R: paddle in'; }
  else if (Surf.near) h = (TouchIn.on ? '<em>TAP</em> ' : '<em>E</em> ') + 'Surf Club · ride three waves for prize money';
  if (!h) return false; if (pr._h !== h) { pr._h = h; pr.innerHTML = h; } pr.hidden = false; return true;
};
/* the map: beach names, the surf club */
Surf.drawMini = function (g) { for (const b of Surf.beaches) { g.fillStyle = b.surf ? '#ff9a2a' : '#f2e2a8'; g.beginPath(); g.arc(b.x, b.z, b.surf ? 22 : 16, 0, TAU); g.fill(); } };
Surf.drawFull = function (g, k) {
  g.save(); g.textAlign = 'center'; g.textBaseline = 'middle';
  for (const b of Surf.beaches) {
    const s = FM.toScreen(b.x, b.z), r = 6 * k; g.fillStyle = b.surf ? '#ff9a2a' : '#f2e2a8'; g.strokeStyle = '#06090e'; g.lineWidth = 2 * k; g.beginPath(); g.arc(s[0], s[1], r, 0, TAU); g.fill(); g.stroke();
    g.font = Math.round(8 * k) + 'px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif'; g.fillStyle = '#fff'; g.fillText(b.surf ? '🏄' : '🏖', s[0], s[1] + 0.5 * k);
    g.font = '700 ' + Math.round(12 * k) + 'px Rajdhani, sans-serif'; g.strokeStyle = 'rgba(0,0,0,0.85)'; g.lineWidth = 3.5 * k; const t = b.name.toUpperCase() + (b.surf ? ' · SURF CLUB' : ''); g.strokeText(t, s[0], s[1] - 14 * k); g.fillStyle = b.surf ? '#ffb35c' : '#f8ecc4'; g.fillText(t, s[0], s[1] - 14 * k);
  }
  g.restore();
};
