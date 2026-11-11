/* ================= CHALET CURLING CLUB: one end of curling (Summit Ridge) =================
   Four stones each, one end. Aim down the sheet, set the weight with the power bar, pick the turn, and sweep (hold the pointer or Space) to carry a stone
   further and keep it straighter. Closest stones to the button score. The rival throws first; you have the hammer (last stone) and ties go to you. */
Ven.games.curl = (function () {
  const GN = 40, CURL = 0.03, SW = 2.2, ZS = 1.0, HOG = 14, BZ = 22, SR = 0.145, RADII = [0.15, 0.61, 1.22, 1.83], NS = 4, TS = 2.3, A0 = 0.2, A_SWEEP = 0.12;
  const WSIG = [0.03, 0.02, 0.012, 0.006], DSIG = [0.012, 0.008, 0.005, 0.003];
  const G = { ready: false, sc: null, cam: null, expo: 1.1, stakeLabel: 'Entry stake',
    rules: 'Four stones each, one end, and you throw last. Aim with the pointer, drag the power bar for weight, pick the turn, then hold the pointer (or Space) to sweep: sweeping carries a stone further and straightens it, so throw a little light. Every stone of the team nearest the button that beats the other team\'s best scores. A win pays double your stake (casual $30); a blank end returns the stake.' };
  let st = null, V0 = null, stones = [], guide = null, kd = {}, lastMv = -1; const rnd = () => (st ? st.rnd() : Math.random());
  const clunk = (v) => { if (!Snd.ok || !Snd.ctx || V0.t - (clunk.t || -1) < 0.05) return; clunk.t = V0.t; const t = Snd.ctx.currentTime; Snd.tone(t, 180, 0.1, 'triangle', clamp(v / 4, 0.05, 0.3), 1200, 0.001, Snd.sfx); Snd.noiseHit(t, 0.04, clamp(v / 5, 0.05, 0.25), 1500, 0, Snd.sfx); };
  function stone(team) {
    const g = new THREE.Group(), gr = venMat(0x8a919c, 0.35, 0.1), dk = venMat(0x3a3e46, 0.5), col = venMat(team ? 0xf2c230 : 0xd8342c, 0.4, 0.1);
    venCyl(g, SR, SR, 0.12, 0, 0.09, 0, gr, 22); venCyl(g, SR * 0.8, SR * 0.8, 0.03, 0, 0.03, 0, dk, 20); venCyl(g, SR * 0.88, SR * 0.88, 0.03, 0, 0.165, 0, col, 22); venBox(g, 0.18, 0.04, 0.04, 0, 0.2, 0, col); venBox(g, 0.04, 0.06, 0.04, 0.07, 0.185, 0, col); venBox(g, 0.04, 0.06, 0.04, -0.07, 0.185, 0, col);
    return g;
  }
  function build() {
    const sc = G.sc = new THREE.Scene(); sc.background = lc(0x0a1220); sc.fog = new THREE.Fog(lc(0x0a1220), 18, 60);
    sc.add(new THREE.HemisphereLight(lc(0xdfeaff), lc(0x405060), 0.9)); const sun = new THREE.DirectionalLight(lc(0xffffff), 0.9); sun.position.set(-3, 12, 8); sc.add(sun);
    const ice = new THREE.Mesh(new THREE.PlaneGeometry(SW * 2 + 0.4, 34), new THREE.MeshStandardMaterial({ color: lc(0xe6f2fc), roughness: 0.18, metalness: 0.05 })); ice.rotation.x = -Math.PI / 2; ice.position.set(0, 0, 12); sc.add(ice);
    const line = (z, w, col, x0, x1) => { const m = new THREE.Mesh(new THREE.PlaneGeometry((x1 || SW) * 2, w), new THREE.MeshBasicMaterial({ color: col })); m.rotation.x = -Math.PI / 2; m.position.set(0, 0.004, z); sc.add(m); };
    line(HOG, 0.14, 0xd8342c); line(BZ, 0.03, 0x2a60c8); line(BZ + 1.9, 0.03, 0x2a60c8); line(0.8, 0.03, 0x2a60c8); line(25.1, 0.06, 0x2a60c8);
    const cl = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 27), new THREE.MeshBasicMaterial({ color: 0x2a60c8 })); cl.rotation.x = -Math.PI / 2; cl.position.set(0, 0.004, 12.5); sc.add(cl);
    [[1.83, 0x2a60c8], [1.22, 0xf4f8ff], [0.61, 0xd8342c], [0.15, 0xf4f8ff]].forEach(([r, c], i) => { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 48), new THREE.MeshBasicMaterial({ color: c })); m.rotation.x = -Math.PI / 2; m.position.set(0, 0.006 + i * 0.001, BZ); sc.add(m); });
    const wall = venMat(0x3a4250, 0.8), pad = venMat(0xe0302c, 0.7); for (const sx of [-1, 1]) { venBox(sc, 0.3, 0.5, 36, sx * (SW + 0.35), 0.25, 12, wall); venBox(sc, 0.06, 0.3, 36, sx * (SW + 0.17), 0.45, 12, pad); }
    venBox(sc, SW * 2 + 1.2, 0.5, 0.3, 0, 0.25, 29.5, wall); venBox(sc, SW * 2 + 1.2, 0.5, 0.3, 0, 0.25, -4.5, wall);
    for (let i = 0; i < 8; i++) { const z = -2 + i * 4.6; for (const sx of [-1, 1]) { const b = venBox(sc, 0.06, 1.0, 1.6, sx * (SW + 0.55), 1.25, z, venMat(i % 2 ? 0x2a60c8 : 0xf2c230, 0.6, 0, i % 2 ? 0x102448 : 0x4a3a08)); b.rotation.y = 0; venBox(sc, 1.0, 3.2, 3.0, sx * (SW + 2.4), 1.6, z, venMat(0x1c2230, 0.9)); } }
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(4, 0.8), new THREE.MeshBasicMaterial({ map: venText('CHALET CURLING CLUB', 800, 160, '#cfe4ff', '#10203a', '700 80px "Chakra Petch", Arial'), color: new THREE.Color(1, 1, 1) })); sign.position.set(0, 1.7, 29.3); sign.rotation.y = Math.PI; sc.add(sign);
    for (let i = 0; i < 2 * NS; i++) { const team = i % 2 === 0 ? 1 : 0, m = stone(team); m.visible = false; sc.add(m); stones.push({ m, team, x: 0, z: 0, vx: 0, vz: 0, on: false, thrown: false }); }
    const gm = new THREE.BufferGeometry(); gm.setAttribute('position', new THREE.BufferAttribute(new Float32Array(GN * 2 * 3), 3)); const gi = []; for (let i = 0; i < GN - 1; i++) gi.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2); gm.setIndex(gi);
    guide = new THREE.Mesh(gm, new THREE.MeshBasicMaterial({ color: 0x9a1c1c, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide })); guide.frustumCulled = false; guide.renderOrder = 3; sc.add(guide);
    G.cam = new THREE.PerspectiveCamera(54, 16 / 9, 0.05, 90);
  }
  G.init = function (V) { V0 = V; build(); };
  const planePt = () => { const rc = Ven.ray(G.cam).ray, o = rc.origin, d = rc.direction; if (d.y > -1e-5) return null; const t = -o.y / d.y; return [o.x + d.x * t, o.z + d.z * t]; };
  G.enter = function (V) {
    V0 = V; if (!G.sc) G.init(V); st = { rnd: mulberry32((Date.now() & 0xffff) + 13), phase: 'lobby', t: 0, n: 0, aim: Math.PI / 2, pw: 0, handle: 1, sweep: false, cur: null, camX: 0, camZ: -3, rest: 0, plan: null, tx: 0 }; if (G.seed) st.rnd = mulberry32(G.seed);
    for (const s of stones) { s.on = false; s.thrown = false; s.m.visible = false; s.vx = s.vz = 0; } Ven.pw.show(false);
  };
  G.begin = function (V) { G.enter(V); Ven.tool('curlH', 'Turn: clockwise (Q/E)', toggleH).hidden = true; V.say('Rival throws first · you have the hammer', 3); nextStone(); };
  G.cleanup = function () { Ven.pw.show(false); for (const k in kd) kd[k] = false; };
  function toggleH() { if (!st) return; st.handle = -st.handle; Ven.tools.curlH.textContent = 'Turn: ' + (st.handle > 0 ? 'clockwise' : 'counter-clockwise') + ' (Q/E)'; Snd.beep(520, 0.03); }
  function nextStone() {
    if (st.n >= NS * 2) { score(); return; }
    st.cur = stones[st.n]; const s = st.cur; s.x = 0; s.z = ZS; s.vx = s.vz = 0; s.on = true; s.thrown = false; s.m.visible = true; s.m.position.set(0, 0, ZS);
    if (s.team === 0) { st.phase = 'aim'; st.pw = 0; st.aim = Math.PI / 2; Ven.pw.show(true, (p) => throwStone(st.aim, pwV(p), st.handle), 'Weight'); Ven.pw.mark(BTN); Ven.tools.curlH.hidden = false; V0.say('Stone ' + Math.floor(st.n / 2 + 1) + ' of ' + NS + ' · your throw', 2); }
    else { st.phase = 'ai'; st.t = 0; st.plan = null; Ven.pw.show(false); Ven.tools.curlH.hidden = true; }
  }
  const pwV = (p) => 1.8 + 2.6 * p, BTN = (Math.sqrt(2 * A0 * (BZ - ZS)) - 1.8) / 2.6;
  function throwStone(a, v, h) { const s = st.cur; s.vx = Math.cos(a) * v; s.vz = Math.sin(a) * v; s.h = h; s.thrown = true; st.phase = 'slide'; st.rest = 0; st.t = 0; Ven.pw.show(false); Ven.tools.curlH.hidden = true; if (Snd.ok) Snd.noiseHit(Snd.ctx.currentTime, 0.2, 0.1, 400, 3000, Snd.sfx); }
  function aiPlan() {
    const idx = Math.max(0, V0.D.stakes.indexOf(V0.stake)), me = stones.filter((s) => s.on && s.team === 0 && Math.hypot(s.x, s.z - BZ) < RADII[3] + SR), mine = stones.filter((s) => s.on && s.team === 1 && Math.hypot(s.x, s.z - BZ) < RADII[3] + SR);
    const bestMe = me.length ? Math.min(...me.map((s) => Math.hypot(s.x, s.z - BZ))) : 99, bestAi = mine.length ? Math.min(...mine.map((s) => Math.hypot(s.x, s.z - BZ))) : 99;
    let tx = 0, tz = BZ, v, hit = false;
    if (me.length && bestMe < bestAi && st.n < 7) { const t = me.reduce((a, b) => (Math.hypot(a.x, a.z - BZ) < Math.hypot(b.x, b.z - BZ) ? a : b)); tx = t.x; tz = t.z; v = Math.sqrt(2.4 * 2.4 + 2 * A0 * (tz - ZS)); hit = true; }
    else { tx = (rnd() < 0.5 ? -1 : 1) * (0.1 + rnd() * 0.35); v = Math.sqrt(2 * A0 * (BZ - ZS)) * 1.0; }
    const a = Math.atan2(tz - ZS, tx) + venGauss(rnd) * DSIG[idx] * (hit ? 1.4 : 1); v *= 1 + venGauss(rnd) * WSIG[idx] * (hit ? 0.5 : 1);
    return { a, v: clamp(v, 1.6, 5.2), hit };
  }
  /* the path a stone would take at button weight from this aim and turn, ignoring other stones (for the guide line) */
  function trace(a, v, h, out) {
    let x = 0, z = ZS, vx = Math.cos(a) * v, vz = Math.sin(a) * v; const dt = 1 / 120, pts = [[x, z]]; let acc = 0;
    for (let i = 0; i < 6000; i++) {
      const sp = Math.hypot(vx, vz), dec = A0 * dt; if (sp <= dec + 0.01) break; const k = (sp - dec) / sp; vx *= k; vz *= k;
      const m = h * CURL * clamp(1.3 - sp / 3.0, 0.2, 1.1) * dt, nx = -vz / sp, nz = vx / sp; vx += nx * m; vz += nz * m; const px = x, pz = z; x += vx * dt; z += vz * dt; acc += Math.hypot(x - px, z - pz);
      if (acc >= 0.55) { acc = 0; pts.push([x, z]); } if (Math.abs(x) > SW || z > 26) break;
    }
    pts.push([x, z]); return pts;
  }
  function paintGuide() {
    const key = st.aim.toFixed(4) + ':' + st.handle; if (guide.userData.key === key) return; guide.userData.key = key; const pts = trace(st.aim, pwV(BTN), st.handle), pos = guide.geometry.attributes.position.array, n = Math.min(GN, pts.length);
    for (let i = 0; i < GN; i++) { const q = pts[Math.min(i, n - 1)], w = 0.06 * (1 - 0.45 * i / GN); pos[i * 6] = q[0] - w; pos[i * 6 + 1] = 0.014; pos[i * 6 + 2] = q[1]; pos[i * 6 + 3] = q[0] + w; pos[i * 6 + 4] = 0.014; pos[i * 6 + 5] = q[1]; }
    guide.geometry.attributes.position.needsUpdate = true;
  }
  function phys(dt) {
    const n = Math.max(1, Math.ceil(dt / (1 / 240))), h = dt / n, cur = st.cur;
    for (let k = 0; k < n; k++) {
      for (const s of stones) {
        if (!s.on) continue; const sp = Math.hypot(s.vx, s.vz); if (sp > 0) {
          const sw = st.sweep && s === cur, dec = (sw ? A_SWEEP : A0) * h; if (sp <= dec + 0.01) { s.vx = s.vz = 0; continue; }
          const k2 = (sp - dec) / sp; s.vx *= k2; s.vz *= k2;
          const m = (s.h || 0) * CURL * clamp(1.3 - sp / 3.0, 0.2, 1.1) * (sw ? 0.4 : 1) * h, nx = -s.vz / sp, nz = s.vx / sp; s.vx += nx * m; s.vz += nz * m;
          s.x += s.vx * h; s.z += s.vz * h;
        }
      }
      for (let i = 0; i < stones.length; i++) for (let j = i + 1; j < stones.length; j++) {
        const a = stones[i], b = stones[j]; if (!a.on || !b.on) continue; const dx = b.x - a.x, dz = b.z - a.z, d2 = dx * dx + dz * dz; if (d2 >= 4 * SR * SR || d2 < 1e-10) continue;
        const d = Math.sqrt(d2), nx = dx / d, nz = dz / d, ov = (2 * SR - d) / 2; a.x -= nx * ov; a.z -= nz * ov; b.x += nx * ov; b.z += nz * ov; const rel = (a.vx - b.vx) * nx + (a.vz - b.vz) * nz;
        if (rel > 0) { const jn = (1 + 0.92) / 2 * rel; a.vx -= jn * nx; a.vz -= jn * nz; b.vx += jn * nx; b.vz += jn * nz; clunk(rel); }
      }
    }
    for (const s of stones) { if (s.on && (Math.abs(s.x) > SW || s.z > 26.5)) { s.on = false; s.m.visible = false; V0.say('A stone slid out of play', 1.6); } }
  }
  function score() {
    st.phase = 'end'; st.t = 0; const inH = stones.filter((s) => s.on && Math.hypot(s.x, s.z - BZ) < RADII[3] + SR).map((s) => ({ team: s.team, d: Math.hypot(s.x, s.z - BZ) })).sort((a, b) => a.d - b.d);
    st.res = { me: 0, ai: 0 }; if (inH.length) { const w = inH[0].team; let c = 0; for (const s of inH) { if (s.team === w) c++; else break; } if (w === 0) st.res.me = c; else st.res.ai = c; }
    Ven.pw.show(false); st.endT = 2.2; V0.say(st.res.me ? 'You score ' + st.res.me : st.res.ai ? 'Rival scores ' + st.res.ai : 'Blank end', 2.6);
  }
  G.update = function (V, dt) {
    dt = Math.min(dt, 0.1); st.t += dt; const P = V.ptr;
    if (st.phase === 'aim') {
      if (P.mvn !== lastMv) { lastMv = P.mvn; if (!Ven.pw.dragging() && (P.down || P.type === 'mouse')) { const pt = planePt(); if (pt && pt[1] > 2) st.aim = Math.atan2(pt[1] - ZS, pt[0]); } }
      st.aim = clamp(st.aim + ((kd.ArrowLeft || kd.KeyA ? 1 : 0) - (kd.ArrowRight || kd.KeyD ? 1 : 0)) * 0.25 * dt, 1.35, 1.8);
      if (kd.Space) { st.pw = Math.min(1, st.pw + dt * 0.5); Ven.pw.set(st.pw); }
    } else if (st.phase === 'ai') {
      if (!st.plan) st.plan = aiPlan(); if (st.t > 1.1) throwStone(st.plan.a, st.plan.v, 0);
    } else if (st.phase === 'slide') {
      st.sweep = (kd.Space || (P.down && !Ven.pw.dragging())) && st.cur.team === 0; phys(dt * TS);
      if (!stones.some((s) => s.on && (s.vx || s.vz))) { st.rest += dt; if (st.rest > 0.5) { const c = st.cur; if (c.on && c.z < HOG) { c.on = false; c.m.visible = false; V.say('Hogged · the stone did not clear the hog line', 2); } st.n++; st.sweep = false; nextStone(); } } else st.rest = 0;
    } else if (st.phase === 'end') { st.endT -= dt; if (st.endT <= 0) finish(); }
    visuals(dt);
  };
  function visuals(dt) {
    for (const s of stones) { if (s.on) { s.m.position.set(s.x, 0, s.z); } }
    const showG = st.phase === 'aim' && st.cur && st.cur.on; guide.visible = showG; if (showG) paintGuide();
    const cam = G.cam; let tx = 0, ty = 3.1, tz = -3.2, lx = 0, ly = 0, lz = 13;
    if (st.phase === 'slide' && st.cur) { const c = st.cur; const fz = clamp(c.z - 4.5, -3.2, 16.5); tz = fz; tx = c.x * 0.6; ty = 2.2 + clamp((c.z - 14) * 0.1, 0, 1.2); lx = c.x * 0.5; lz = clamp(c.z + 7, 6, 24); }
    else if (st.phase === 'end' || st.phase === 'done') { tx = 0; ty = 5.5; tz = BZ - 9; lx = 0; ly = 0; lz = BZ - 1.2; }
    if (st.phase === 'lobby') { tx = 0; ty = 3.4; tz = BZ - 11; lz = BZ - 1; ly = 0; }
    const k = 1 - Math.exp(-dt * 3.2); st.cx = (st.cx == null ? tx : st.cx + (tx - st.cx) * k); st.cy = (st.cy == null ? ty : st.cy + (ty - st.cy) * k); st.cz = (st.cz == null ? tz : st.cz + (tz - st.cz) * k); st.lx = (st.lx == null ? lx : st.lx + (lx - st.lx) * k); st.lz = (st.lz == null ? lz : st.lz + (lz - st.lz) * k);
    cam.position.set(st.cx, st.cy, st.cz); cam.lookAt(st.lx, ly, st.lz); cam.updateMatrixWorld(true); Ven.shift(cam, dt); cam.updateMatrixWorld(true);
  }
  function finish() {
    const win = st.res.me > st.res.ai, push = st.res.me === st.res.ai, stake = V0.stake; st.phase = 'done'; Ven.pw.show(false);
    const lines = [st.res.me ? 'You score ' + st.res.me + ' point' + (st.res.me > 1 ? 's' : '') : st.res.ai ? 'Rival scores ' + st.res.ai + ' point' + (st.res.ai > 1 ? 's' : '') : 'Blank end · nobody scored', 'Stones in the house: ' + stones.filter((s) => s.on && Math.hypot(s.x, s.z - BZ) < RADII[3] + SR).length];
    V0.finish(win, win ? 'You take the end' : push ? 'Blank end' : 'Rival takes the end', push ? lines.concat(stake ? ['Nobody scored · your stake is returned'] : ['Nobody scored']) : lines, win ? (stake ? stake * 2 : 30) : push ? stake : 0);
    const r = venRec('curl'); r.best = Math.max(r.best || 0, st.res.me);
  }
  G.idle = function (V, dt) { if (st) visuals(dt); };
  G.ptrdown = function () { };
  G.key = function (V, code, down) { kd[code] = down; if (down && (code === 'KeyQ' || code === 'KeyE')) toggleH(); if (!down && code === 'Space' && st.phase === 'aim' && st.pw > 0.045) { const p = st.pw; Ven.pw.set(0); throwStone(st.aim, pwV(p), st.handle); } };
  G.hud = function () {
    if (!st) return ''; const rem = (team) => stones.filter((s) => s.team === team && !s.thrown && s !== st.cur).length + (st.cur && st.cur.team === team && !st.cur.thrown ? 1 : 0);
    return '<span class="big">' + (st.phase === 'ai' || (st.cur && st.cur.team === 1 && st.phase === 'slide') ? 'Rival' : 'Your stone') + '</span><div class="r"><span>Stone</span><b>' + Math.min(st.n + 1, NS * 2) + ' / ' + NS * 2 + '</b></div><div class="r"><span>You left</span><b>' + rem(0) + '</b></div><div class="r"><span>Rival left</span><b>' + rem(1) + '</b></div>' + (st.phase === 'aim' ? '<div class="r"><span>Turn</span><b>' + (st.handle > 0 ? '⟳ clockwise' : '⟲ counter') + '</b></div>' : '');
  };
  G.hint = function () { return st ? (st.phase === 'aim' ? 'Aim with the <em>pointer</em> · drag the <em>power bar</em> for weight and release' : st.phase === 'slide' && st.cur.team === 0 ? 'Hold the <em>pointer</em> or <em>Space</em> to sweep' + (st.sweep ? ' · <em>SWEEP!</em>' : '') : '') : ''; };
  G.recText = function (rec) { return ['Best end', (rec.best || 0) + ' pts']; };
  G.dbg = () => st; G.api = { trace, pwV, throwStone, stones, aiPlan, BZ, nextStone };
  return G;
})();
