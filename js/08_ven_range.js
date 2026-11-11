/* ================= DUST DEVIL RANGE: frontier shooting gallery (Redstone) =================
   Sixty seconds, a six-shot revolver, four lanes of targets. Tin cans, sliding bottles, pop-up bandits (shoot) and sheriff cut-outs (don't), and the
   golden skull on the zipline. Click or tap to fire, R to reload. Beat the goal for your stake to win. */
Ven.games.range = (function () {
  const T_LEN = 60, GOALS = [300, 480, 700, 1000], MAG = 6, ZC = 5, ZB = 7.2, ZP = 9.8, ZS = 12.5;
  const G = { ready: false, sc: null, cam: null, expo: 1.15, stakeLabel: 'Entry stake',
    rules: 'Sixty seconds, six shots, then reload. Cans +10, bottles +20, bandits +30, golden skull +100. A sheriff costs you 40. Hit the goal score to win double your stake (one and a half times the goal pays triple). Casual wins pay $30.' };
  let st = null, V0 = null, pops = null, flash = null, gun = null, ray = null; const T = [];
  const rnd = () => (st ? st.rnd() : Math.random());
  const bang = () => { if (!Snd.ok || !Snd.ctx) return; const t = Snd.ctx.currentTime; Snd.noiseHit(t, 0.18, 0.5, 250, 5000, Snd.sfx); Snd.tone(t, 110, 0.16, 'sawtooth', 0.28, 700, 0.001, Snd.sfx); };
  const click = (f) => { if (Snd.ok) Snd.beep(f, 0.03); };
  function cutTex(kind) {
    return venCanvasTex(256, 320, (g, w, h) => {
      g.fillStyle = kind === 'bandit' ? '#d9c8a0' : '#9ab8d8'; g.fillRect(0, 0, w, h); g.strokeStyle = '#3a2a1a'; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8);
      g.fillStyle = '#e8b890'; g.beginPath(); g.arc(128, 150, 62, 0, TAU); g.fill();
      if (kind === 'bandit') { g.fillStyle = '#1a1a1a'; g.fillRect(52, 70, 152, 22); g.beginPath(); g.ellipse(128, 76, 80, 30, 0, Math.PI, TAU); g.fill(); g.fillStyle = '#c0332a'; g.beginPath(); g.moveTo(66, 160); g.lineTo(190, 160); g.lineTo(128, 214); g.closePath(); g.fill(); g.fillStyle = '#1a1a1a'; g.fillRect(96, 124, 14, 12); g.fillRect(146, 124, 14, 12); g.fillStyle = '#222'; g.fillRect(70, 230, 116, 70); }
      else { g.fillStyle = '#b88a4a'; g.beginPath(); g.ellipse(128, 86, 92, 24, 0, 0, TAU); g.fill(); g.fillRect(84, 40, 88, 48); g.fillStyle = '#5a3a1a'; g.fillRect(100, 168, 56, 12); g.fillStyle = '#1a1a1a'; g.fillRect(96, 130, 14, 12); g.fillRect(146, 130, 14, 12); g.fillStyle = '#f2c230'; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 24 : 52; g.lineTo(128 + Math.cos(a) * r, 262 + Math.sin(a) * r); } g.closePath(); g.fill(); g.strokeStyle = '#6a4a10'; g.lineWidth = 3; g.stroke(); }
    });
  }
  function tag(t) { t.g.traverse((o) => { o.userData.tg = t; }); }
  function build() {
    const sc = G.sc = new THREE.Scene(); sc.background = venCanvasTex(8, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#5a9ae0'); gr.addColorStop(0.55, '#f0c890'); gr.addColorStop(1, '#f6b878'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }); sc.fog = new THREE.Fog(lc(0xf0c08a), 24, 64);
    sc.add(new THREE.HemisphereLight(lc(0xffe2c0), lc(0x8a5a38), 0.75)); const sun = new THREE.DirectionalLight(lc(0xffd8a0), 1.2); sun.position.set(-6, 9, -4); sc.add(sun);
    const gr = new THREE.Mesh(new THREE.PlaneGeometry(90, 70), new THREE.MeshStandardMaterial({ color: lc(0xc79a64), roughness: 1 })); gr.rotation.x = -Math.PI / 2; gr.position.set(0, 0, 22); sc.add(gr);
    for (const [x, z, w, h, c] of [[-14, 30, 7, 9, 0xb4522e], [-4, 34, 9, 12, 0xa84a2a], [9, 31, 8, 8, 0xc0603a], [18, 36, 10, 14, 0x9a4226], [-24, 38, 8, 10, 0xb0502c]]) { venBox(sc, w, h, 5, x, h / 2, z, venMat(c, 1)); venBox(sc, w * 0.7, h * 0.4, 4, x + 1, h + h * 0.2, z, venMat(c, 1)); }
    for (let i = 0; i < 6; i++) { const x = -9 + i * 3.6 + (i % 2) * 1.2, z = 15 + (i % 3) * 3; venCyl(sc, 0.18, 0.2, 1.6, x, 0.8, z, venMat(0x3f7a3a, 0.9), 8); venCyl(sc, 0.1, 0.1, 0.8, x + 0.3, 1.2, z, venMat(0x3f7a3a, 0.9), 8).rotation.z = 0.4; }
    /* the range: counter, posts, roof boards */
    const wood = venMat(0x6a4222, 0.8), dk = venMat(0x3a2412, 0.85);
    venBox(sc, 9, 0.12, 0.7, 0, 0.95, 1.4, wood); venBox(sc, 9, 0.9, 0.12, 0, 0.45, 1.7, dk); for (const x of [-4.4, 4.4]) venBox(sc, 0.22, 3.4, 0.22, x, 1.7, 1.4, dk); venBox(sc, 9.2, 0.18, 1.6, 0, 3.45, 1.4, dk);
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.5), new THREE.MeshBasicMaterial({ map: venText('DUST DEVIL RANGE', 640, 100, '#f4e2b8', '#4a2a14'), color: new THREE.Color(0.95, 0.95, 0.95) })); banner.position.set(0, 3.2, 0.6); banner.rotation.y = Math.PI; sc.add(banner);
    /* lane 1: shelf of cans */
    venBox(sc, 8.6, 0.08, 0.6, 0, 0.82, ZC, wood); for (const x of [-4.1, 4.1]) venBox(sc, 0.14, 0.82, 0.5, x, 0.41, ZC, dk);
    const canM = venMat(0xc8ccd4, 0.3, 0.6), lblM = venMat(0xd03a2c, 0.6);
    for (let i = 0; i < 5; i++) { const g = new THREE.Group(); venCyl(g, 0.095, 0.095, 0.24, 0, 0.12, 0, canM, 14); venCyl(g, 0.0965, 0.0965, 0.1, 0, 0.12, 0, lblM, 14); g.position.set(-3.2 + i * 1.6, 0.86, ZC); sc.add(g); const t = { kind: 'can', g, state: 'up', t: 0, pts: 10, hx: g.position.x, hy: g.position.y, hz: ZC, vx: 0, vy: 0, vz: 0, sp: 0 }; tag(t); T.push(t); }
    /* lane 2: belt of bottles */
    venBox(sc, 13, 0.07, 0.6, 0, 1.28, ZB, dk); const bg = venMat(0x2f8a4a, 0.15, 0.1, 0x0a2a14);
    for (let i = 0; i < 5; i++) { const g = new THREE.Group(); venCyl(g, 0.075, 0.075, 0.34, 0, 0.17, 0, bg, 12); venCyl(g, 0.032, 0.058, 0.2, 0, 0.44, 0, bg, 10); venCyl(g, 0.034, 0.034, 0.04, 0, 0.56, 0, venMat(0xc0a040, 0.4, 0.5), 8); g.position.set(-4.8 + i * 2.4, 1.31, ZB); sc.add(g); const t = { kind: 'bottle', g, state: 'up', t: 0, pts: 20, hx: g.position.x, hy: 1.31, hz: ZB, vx: 0, vy: 0, vz: 0, sp: 0 }; tag(t); T.push(t); }
    /* lane 3: pop-up stands */
    const tb = cutTex('bandit'), ts = cutTex('sheriff');
    for (const x of [-3.4, 0, 3.4]) {
      venBox(sc, 2.0, 0.8, 0.6, x, 0.4, ZP, dk); const g = new THREE.Group(); g.position.set(x, 0.82, ZP); sc.add(g);
      const mk = (tx) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.38), new THREE.MeshStandardMaterial({ map: tx, roughness: 0.9, side: THREE.DoubleSide })); m.position.y = 0.75; m.rotation.y = Math.PI; return m; };
      const bm = mk(tb), sm = mk(ts); g.add(bm, sm); const t = { kind: 'bandit', g, state: 'down', t: 0, pts: 30, bm, sm, wait: 0.8 + Math.random() * 2, upT: 1.6, hx: x, hy: 0.82, hz: ZP }; g.rotation.x = Math.PI / 2; g.visible = false; bm.visible = sm.visible = false; tag(t); T.push(t);
    }
    /* lane 4: the skull on its wire */
    venBox(sc, 20, 0.05, 0.05, 0, 4.4, ZS, dk); const gold = venMat(0xf2c230, 0.25, 0.9, 0x6a4a08), sg = new THREE.Group();
    venCyl(sg, 0.014, 0.014, 0.7, 0, 0.4, 0, dk, 6); const sk = new THREE.Mesh(new THREE.SphereGeometry(0.36, 18, 14), gold); sk.position.y = -0.1; sg.add(sk); venBox(sg, 0.4, 0.2, 0.3, 0, -0.5, 0.04, gold);
    for (const x of [-0.14, 0.14]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), venMat(0x111111, 0.5)); e.position.set(x, -0.08, -0.29); sg.add(e); } sg.position.set(0, 3.5, ZS); sg.visible = false; sc.add(sg);
    const skull = { kind: 'skull', g: sg, state: 'down', t: 0, pts: 100, wait: 4 + Math.random() * 3, dir: 1, hx: 0, hy: 3.5, hz: ZS }; tag(skull); T.push(skull);
    /* camera and the revolver view-model */
    G.cam = new THREE.PerspectiveCamera(48, 16 / 9, 0.05, 90); G.cam.position.set(0, 1.6, 0); sc.add(G.cam);
    gun = new THREE.Group(); const gm = venMat(0x7a808c, 0.28, 0.8), gw = venMat(0x8a4a22, 0.55);
    const barrel = venBox(gun, 0.05, 0.05, 0.42, 0, 0.02, 0.2, gm), cyl = venCyl(gun, 0.062, 0.062, 0.12, 0, 0, 0.0, gm, 10); cyl.rotation.x = Math.PI / 2; const grip = venBox(gun, 0.06, 0.18, 0.08, 0, -0.1, -0.08, gw); grip.rotation.x = 0.35;
    gun.rotation.set(0, Math.PI, 0); gun.scale.setScalar(0.62); G.cam.add(gun);
    gun.traverse((o) => { o.userData.noRay = true; });
    flash = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), new THREE.MeshBasicMaterial({ color: 0xffd070, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide })); flash.position.set(0, 0.02, 0.5); flash.visible = false; gun.add(flash);
    pops = Ven.pops(sc);
  }
  G.init = function (V) { V0 = V; build(); };
  function resetTargets() {
    for (const t of T) {
      t.state = t.kind === 'bandit' || t.kind === 'skull' ? 'down' : 'up'; t.t = 0; t.g.position.set(t.hx, t.hy, t.hz); t.g.rotation.set(t.kind === 'bandit' ? Math.PI / 2 : 0, 0, 0); t.g.visible = t.kind === 'can' || t.kind === 'bottle';
      if (t.kind === 'bandit') { t.bm.visible = t.sm.visible = false; t.wait = 0.8 + rnd() * 2; } if (t.kind === 'skull') { t.g.visible = false; t.wait = 4 + rnd() * 3; }
      if (t.kind === 'bottle') t.hx = -4.8 + T.filter((x) => x.kind === 'bottle').indexOf(t) * 2.4;
    }
  }
  G.enter = function (V) { V0 = V; if (!G.sc) G.init(V); st = { rnd: mulberry32((Date.now() & 0xffff) + 11), phase: 'lobby', t: 0, score: 0, time: T_LEN, ammo: MAG, reload: 0, shots: 0, hits: 0, recoil: 0, fl: 0, ox: 0, oy: 0 }; if (G.seed) st.rnd = mulberry32(G.seed); resetTargets(); pops.clear(); flash.visible = false; };
  G.begin = function (V) { G.enter(V); st.phase = 'ready'; st.t = 0; V.say('Get ready…', 1.4); Ven.tool('reload', 'Reload (R)', () => startReload()).hidden = false; };
  G.cleanup = function () { if (pops) pops.clear(); };
  function startReload() { if (!st || st.phase !== 'go' || st.reload > 0 || st.ammo >= MAG) return; st.reload = 1.05; click(300); }
  function fire(V) {
    if (st.phase !== 'go') return; if (st.reload > 0) return; if (st.ammo <= 0) { startReload(); return; }
    st.ammo--; st.shots++; st.recoil = 1; st.fl = 0.06; bang();
    const rc = Ven.ray(G.cam), meshes = []; for (const t of T) { if (t.state === 'up' && t.g.visible) t.g.traverse((o) => { if (o.isMesh && (!t.bm || o.visible)) meshes.push(o); }); }
    const hs = rc.intersectObjects(meshes, false); if (hs.length) { const t = hs[0].object.userData.tg; if (t) hit(t, hs[0].point); }
    if (st.ammo <= 0) startReload();
  }
  function hit(t, p) {
    let pts = t.pts; if (t.kind === 'bandit' && t.sm.visible) pts = -40; st.score = Math.max(0, st.score + pts); if (pts > 0) st.hits++;
    pops.add((pts > 0 ? '+' : '') + pts, pts > 0 ? (pts >= 100 ? '#ffd23d' : '#8ff0a8') : '#ff6b6b', p.x, p.y + 0.15, p.z - 0.2, pts >= 100 ? 0.5 : 0.34); if (Snd.ok) { pts > 0 ? Snd.clank() : Snd.fail(); }
    t.state = 'hit'; t.t = 0; t.vx = (rnd() - 0.5) * 3; t.vy = 2.5 + rnd() * 1.5; t.vz = 3 + rnd() * 2; t.sp = (rnd() - 0.5) * 18;
    if (t.kind === 'bandit') t.hitFlip = true;
  }
  G.ptrdown = function (V) { if (st) fire(V); };
  G.key = function (V, code, down) { if (down && code === 'KeyR') startReload(); if (down && (code === 'Space' || code === 'Enter')) fire(V); };
  function life(dt) {
    const prog = 1 - st.time / T_LEN;
    for (const t of T) {
      t.t += dt;
      if (t.kind === 'can' || t.kind === 'bottle') {
        if (t.kind === 'bottle' && t.state === 'up') { t.g.position.x += dt * 1.35; if (t.g.position.x > 6.2) t.g.position.x = -6.2; }
        if (t.state === 'hit') { t.vy -= 9 * dt; t.g.position.x += t.vx * dt; t.g.position.y += t.vy * dt; t.g.position.z += t.vz * dt; t.g.rotation.x += t.sp * dt; t.g.rotation.z += t.sp * 0.5 * dt; if (t.t > 1.2) { t.g.visible = false; } if (t.t > 2.4) { t.state = 'up'; t.g.visible = true; t.g.rotation.set(0, 0, 0); t.g.position.set(t.kind === 'bottle' ? -6.0 : t.hx, t.hy, t.hz); } }
      } else if (t.kind === 'bandit') {
        if (t.state === 'down') { t.t = t.t; if (t.t > t.wait) { t.state = 'rise'; t.t = 0; const sheriff = rnd() < 0.28; t.bm.visible = !sheriff; t.sm.visible = sheriff; t.g.visible = true; t.upT = Math.max(0.9, 1.9 - prog * 0.9); } }
        else if (t.state === 'rise') { t.g.rotation.x = Math.PI / 2 * (1 - Math.min(1, t.t / 0.16)); if (t.t > 0.16) { t.state = 'up'; t.t = 0; t.g.rotation.x = 0; } }
        else if (t.state === 'up') { if (t.t > t.upT) { t.state = 'fall'; t.t = 0; } }
        else if (t.state === 'fall' || t.state === 'hit') { const d = t.state === 'hit' ? 0.12 : 0.2; t.g.rotation.x = Math.PI / 2 * Math.min(1, t.t / d); if (t.t > d + 0.05) { t.state = 'down'; t.t = 0; t.wait = 0.5 + rnd() * (1.8 - prog * 0.8); t.g.visible = false; } }
      } else if (t.kind === 'skull') {
        if (t.state === 'down') { if (t.t > t.wait) { t.state = 'up'; t.t = 0; t.dir = rnd() < 0.5 ? 1 : -1; t.g.visible = true; t.g.position.set(-t.dir * 9.5, 3.4, ZS); t.g.rotation.set(0, 0, 0); } }
        else if (t.state === 'up') { t.g.position.x += t.dir * dt * 4.8; t.g.position.y = 3.4 + Math.sin(t.t * 4) * 0.25; t.g.rotation.y = Math.sin(t.t * 3) * 0.6; if (Math.abs(t.g.position.x) > 10) { t.state = 'down'; t.t = 0; t.wait = 5 + rnd() * 4; t.g.visible = false; } }
        else if (t.state === 'hit') { t.vy -= 9 * dt; t.g.position.x += t.vx * dt; t.g.position.y += t.vy * dt; t.g.rotation.z += t.sp * dt; if (t.t > 1.6) { t.state = 'down'; t.t = 0; t.wait = 5 + rnd() * 4; t.g.visible = false; } }
      }
    }
  }
  function cam(dt) {
    const P = V0.ptr, c = G.cam; st.recoil = Math.max(0, st.recoil - dt * 6); st.fl = Math.max(0, st.fl - dt); flash.visible = st.fl > 0;
    const ty = -(P.x - 0.5) * 0.2, tx = (0.5 - P.y) * 0.1; st.ox += (tx - st.ox) * Math.min(1, dt * 12); st.oy += (ty - st.oy) * Math.min(1, dt * 12);
    c.position.set(0, 1.6, 0); c.rotation.set(st.ox + st.recoil * 0.03, Math.PI + st.oy, 0, 'YXZ'); gun.position.set(0.26 - (P.x - 0.5) * 0.12, -0.26 + st.recoil * 0.03 - (P.y - 0.5) * -0.04, -0.52 + st.recoil * 0.08);
    Ven.shift(c, dt);
  }
  G.update = function (V, dt) {
    dt = Math.min(dt, 0.1); st.t += dt; pops.update(dt);
    if (st.phase === 'ready') { if (st.t > 1.5) { st.phase = 'go'; st.t = 0; V.say('GO!', 0.8); if (Snd.ok) Snd.beep(880, 0.1); } }
    else if (st.phase === 'go') {
      st.time -= dt; if (st.reload > 0) { st.reload -= dt; if (st.reload <= 0) { st.ammo = MAG; click(520); } }
      life(dt); if (st.time <= 0) { st.time = 0; st.phase = 'over'; st.t = 0; V.say('Time!', 2); }
    } else if (st.phase === 'over') { life(dt); if (st.t > 1.4) finish(); }
    cam(dt);
  };
  function finish() {
    const goal = GOALS[Math.max(0, V0.D.stakes.indexOf(V0.stake))], stake = V0.stake, win = st.score >= goal, big = st.score >= goal * 1.5, acc = st.shots ? Math.round(st.hits / st.shots * 100) : 0;
    st.phase = 'done'; Ven.tools.reload.hidden = true;
    V0.finish(win, win ? (big ? 'Sharpshooter!' : 'Goal reached') : 'Not quite', ['Score ' + st.score + ' · goal ' + goal, 'Hits ' + st.hits + ' of ' + st.shots + ' shots (' + acc + '%)'], win ? (big ? (stake ? stake * 3 : 60) : (stake ? stake * 2 : 30)) : 0);
    const r = venRec('range'); r.best = Math.max(r.best || 0, st.score);
  }
  G.idle = function (V, dt) { if (G.cam && st) { cam(dt); pops.update(dt); } };
  G.hud = function () {
    if (!st) return ''; const goal = GOALS[Math.max(0, V0.D.stakes.indexOf(V0.stake))];
    return '<span class="big">' + st.score + '</span><div class="r"><span>Goal</span><b>' + goal + '</b></div><div class="r"><span>Time</span><b>' + Math.ceil(st.time) + 's</b></div><div class="r"><span>Ammo</span><b>' + (st.reload > 0 ? 'reloading…' : '▮'.repeat(st.ammo) + '▯'.repeat(MAG - st.ammo)) + '</b></div>';
  };
  G.hint = function () { return st && st.phase === 'go' ? 'Click or tap to fire · <em>R</em> reloads · shoot the bandits, spare the sheriffs' : ''; };
  G.recText = function (rec) { return ['Best score', rec.best || 0]; };
  G.dbg = () => st; G.api = { fire: () => fire(V0), T, GOALS };
  return G;
})();
