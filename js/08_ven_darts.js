/* ================= THE RUSTY ANCHOR: darts (Port Marlow) =================
   A pub board on the back wall, you against the regulars' champion. Race from 141 to exactly zero (go over and the turn busts). The reticle sways
   a little while you aim, release (click or tap) to throw. The rival throws with an aim scatter that tightens as the stakes rise. */
Ven.games.darts = (function () {
  const BR = 0.2255, WZ = -4.38, BY = 1.72, CZ = WZ + 1.75, START = 141, ROUNDS = 10;
  const ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
  const SIG = [0.052, 0.042, 0.033, 0.025];
  const G = { ready: false, sc: null, cam: null, expo: 1.12, stakeLabel: 'Entry stake',
    rules: 'First from 141 down to exactly zero wins. Three darts a turn, singles, doubles (outer ring) and triples (inner ring) count. Go below zero and the turn busts. After ' + ROUNDS + ' rounds the lowest score takes it. A win pays double your stake; casual wins pay $30.' };
  let st = null, V0 = null, rt = null, dartProto = null, reticle = null, flying = null; const stuck = [];
  const rnd = () => (st ? st.rnd() : Math.random());
  const clank = (f, v) => { if (!Snd.ok || !Snd.ctx) return; const t = Snd.ctx.currentTime; Snd.tone(t, f, 0.06, 'triangle', v, 3000, 0.001, Snd.sfx); Snd.noiseHit(t, 0.03, v * 0.8, 1500, 0, Snd.sfx); };
  function scoreAt(x, y) {
    const r = Math.hypot(x, y); if (r > 0.1705) return { pts: 0, label: 'MISS', n: 0, ring: 0 };
    if (r < 0.00635) return { pts: 50, label: 'BULL', n: 25, ring: 4 }; if (r < 0.0159) return { pts: 25, label: 'OUTER BULL', n: 25, ring: 3 };
    let a = Math.atan2(x, y) * 180 / Math.PI; a = (a + 360 + 9) % 360; const n = ORDER[Math.floor(a / 18) % 20];
    if (r >= 0.099 && r <= 0.107) return { pts: n * 3, label: 'T' + n, n, ring: 3 }; if (r >= 0.162) return { pts: n * 2, label: 'D' + n, n, ring: 2 };
    return { pts: n, label: String(n), n, ring: 1 };
  }
  function boardTex() {
    return venCanvasTex(1024, 1024, (g) => {
      const c = 512, k = 512 / BR, A = (i, d) => (-90 + i * 18 + d) * Math.PI / 180;
      g.fillStyle = '#0d0d0f'; g.beginPath(); g.arc(c, c, 512, 0, TAU); g.fill();
      for (let i = 0; i < 20; i++) {
        const dark = i % 2 === 0, base = dark ? '#16161a' : '#e9dfc2', ring = dark ? '#c8302c' : '#1d8a4a';
        const sector = (r0, r1, col) => { g.fillStyle = col; g.beginPath(); g.arc(c, c, r1 * k, A(i, -9), A(i, 9)); g.arc(c, c, r0 * k, A(i, 9), A(i, -9), true); g.closePath(); g.fill(); };
        sector(0.0159, 0.162, base); sector(0.099, 0.107, ring); sector(0.162, 0.170, ring);
        g.save(); g.translate(c, c); g.rotate(A(i, 0) + Math.PI / 2); g.fillStyle = '#f2f2f2'; g.font = '700 58px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(ORDER[i]), 0, -0.2 * k); g.restore();
      }
      g.fillStyle = '#1d8a4a'; g.beginPath(); g.arc(c, c, 0.0159 * k, 0, TAU); g.fill(); g.fillStyle = '#c8302c'; g.beginPath(); g.arc(c, c, 0.00635 * k, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(210,214,220,0.8)'; g.lineWidth = 1.6; for (const r of [0.00635, 0.0159, 0.099, 0.107, 0.162, 0.170]) { g.beginPath(); g.arc(c, c, r * k, 0, TAU); g.stroke(); }
      for (let i = 0; i < 20; i++) { g.beginPath(); g.moveTo(c + Math.cos(A(i, -9)) * 0.0159 * k, c + Math.sin(A(i, -9)) * 0.0159 * k); g.lineTo(c + Math.cos(A(i, -9)) * 0.170 * k, c + Math.sin(A(i, -9)) * 0.170 * k); g.stroke(); }
    });
  }
  function build() {
    const sc = G.sc = venRoom({ w: 8, d: 9, h: 3.4, bg: 0x0a0806, floor: 0x3a2616, wall: 0x5a3626, ceilc: 0x1a1210, hemi: 0.3, sky: 0xffe2b8, gnd: 0x2a1a10 });
    const lamp = new THREE.PointLight(lc(0xffc27a), 0.55, 9, 1.4); lamp.position.set(0, 2.9, WZ + 1.2); sc.add(lamp);
    const l2 = new THREE.PointLight(lc(0xffe0b0), 0.25, 8, 1.5); l2.position.set(0, 2.2, CZ + 0.3); sc.add(l2);
    const sp = new THREE.SpotLight(lc(0xfff2d8), 1.5, 6, 0.5, 0.6, 1.2); sp.position.set(0, 2.9, WZ + 1.4); sp.target.position.set(0, BY, WZ); sc.add(sp, sp.target);
    /* panelled wall + surround */
    for (let i = -3; i <= 3; i++) venBox(sc, 1.0, 1.4, 0.04, i * 1.1, 0.8, WZ + 0.02, venMat(i % 2 ? 0x4a2a1c : 0x3e2216, 0.8));
    venBox(sc, 1.0, 1.0, 0.035, 0, BY, WZ + 0.0175, venMat(0x6a4a2c, 0.9));
    venCyl(sc, BR + 0.03, BR + 0.03, 0.04, 0, BY, WZ + 0.045, venMat(0x141416, 0.6), 48).rotation.x = Math.PI / 2;
    const bd = new THREE.Mesh(new THREE.CircleGeometry(BR, 72), new THREE.MeshStandardMaterial({ map: boardTex(), roughness: 0.85, metalness: 0 })); bd.position.set(0, BY, WZ + 0.067); sc.add(bd);
    /* decor inside the camera's view: sign above, chalkboard left, a shelf with bottles right */
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.2), new THREE.MeshBasicMaterial({ map: venText('THE RUSTY ANCHOR', 640, 160, '#f2b632', '#1a1210'), color: new THREE.Color(1.0, 1.0, 1.0) })); sign.position.set(0, BY + 0.5, WZ + 0.045); sc.add(sign);
    venBox(sc, 0.5, 0.38, 0.03, -0.92, BY - 0.02, WZ + 0.02, venMat(0x2a1a14, 0.9)); const sb = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.32), new THREE.MeshBasicMaterial({ map: venText('141 OR BUST', 440, 320, '#f4f0e6', '#1c2a22', '700 62px "Chakra Petch", Arial'), color: new THREE.Color(0.8, 0.8, 0.8) })); sb.position.set(-0.92, BY - 0.02, WZ + 0.04); sc.add(sb);
    venBox(sc, 0.5, 0.03, 0.14, 0.95, BY - 0.1, WZ + 0.09, venMat(0x3a2412, 0.6)); venBox(sc, 0.5, 0.03, 0.14, 0.95, BY + 0.26, WZ + 0.09, venMat(0x3a2412, 0.6));
    for (const [x, c] of [[0.8, 0x2f7a4a], [0.9, 0x8a3a1a], [1.0, 0x2a5a8a], [1.1, 0x9a8a2a]]) { venCyl(sc, 0.026, 0.03, 0.17, x, BY - 0.0, WZ + 0.09, venMat(c, 0.2, 0, 0x101010), 10); venCyl(sc, 0.011, 0.014, 0.07, x, BY + 0.125, WZ + 0.09, venMat(c, 0.2, 0, 0x101010), 8); }
    for (const x of [0.78, 0.98]) venCyl(sc, 0.032, 0.028, 0.07, x, BY - 0.045, WZ + 0.09, venMat(0xd8b060, 0.3, 0.3), 12);
    venBox(sc, 0.14, 0.14, 0.03, 0.85, BY + 0.5, WZ + 0.02, venMat(0x6a4a2c, 0.8)); venBox(sc, 0.11, 0.11, 0.01, 0.85, BY + 0.5, WZ + 0.04, venMat(0x7a9ab4, 0.6, 0, 0x1a2a38));
    /* oche */
    venBox(sc, 1.2, 0.012, 0.04, 0, 0.007, CZ + 0.6, venMat(0xe8e0c8, 0.6, 0, 0x403c30));
    /* dart prototype: tip at origin, flying along -z */
    const dp = dartProto = new THREE.Group(), steel = venMat(0xc8ccd2, 0.25, 0.8), fl = venMat(0xe04030, 0.8);
    const tip = venCyl(dp, 0.0012, 0.0024, 0.026, 0, 0, 0.013, steel, 8); tip.rotation.x = -Math.PI / 2; const bar = venCyl(dp, 0.0062, 0.0062, 0.05, 0, 0, 0.051, venMat(0x9a7a2c, 0.3, 0.7), 10); bar.rotation.x = Math.PI / 2;
    const sh = venCyl(dp, 0.0035, 0.0035, 0.034, 0, 0, 0.093, venMat(0x222226, 0.6), 8); sh.rotation.x = Math.PI / 2; for (const rz of [0, Math.PI / 2]) { const f = venBox(dp, 0.026, 0.0015, 0.034, 0, 0, 0.12, fl); f.rotation.z = rz; }
    const rg = new THREE.Mesh(new THREE.RingGeometry(0.008, 0.0105, 24), new THREE.MeshBasicMaterial({ color: 0xffe36a, transparent: true, opacity: 0.95, depthTest: false })); rg.renderOrder = 9; rt = rg; sc.add(rg);
    const dt = new THREE.Mesh(new THREE.CircleGeometry(0.0018, 10), new THREE.MeshBasicMaterial({ color: 0xffe36a, depthTest: false })); dt.renderOrder = 9; rg.add(dt); reticle = rg;
    G.cam = new THREE.PerspectiveCamera(42, 16 / 9, 0.05, 30); G.cam.position.set(0, BY - 0.02, CZ); G.cam.lookAt(0, BY, WZ);
  }
  G.init = function (V) { V0 = V; build(); };
  const newDart = () => { const d = dartProto.clone(); d.scale.setScalar(2.2); G.sc.add(d); return d; };
  function clearDarts() { for (const d of stuck) G.sc.remove(d); stuck.length = 0; if (flying) { G.sc.remove(flying.m); flying = null; } }
  G.enter = function (V) { V0 = V; if (!G.sc) G.init(V); clearDarts(); st = { rnd: mulberry32((Date.now() & 0xffff) + 3), phase: 'lobby', t: 0, rem: { me: START, ai: START }, left: 3, turnTot: 0, turnStart: START, who: 'me', round: 1, last: '', lastT: 0, ax: 0, ay: BY, msgT: 0, rival: 0, nextT: 0 }; if (G.seed) st.rnd = mulberry32(G.seed); reticle.visible = false; };
  G.begin = function (V) { G.enter(V); st.phase = 'throw'; reticle.visible = true; V.say('Aim with the pointer · release to throw · hold Space to steady', 3.2); };
  G.cleanup = function () { clearDarts(); if (reticle) reticle.visible = false; };
  function planePt() { const rc = Ven.ray(G.cam).ray, o = rc.origin, d = rc.direction, z = WZ + 0.08; if (d.z > -1e-5) return null; const t = (z - o.z) / d.z; return [o.x + d.x * t, o.y + d.y * t]; }
  function throwAt(who, x, y) {
    const m = newDart(); const from = who === 'me' ? [0.12, BY - 0.42, CZ - 0.5] : [-0.1, BY - 0.38, CZ - 0.5], to = [x, y, WZ + 0.075];
    m.position.set(from[0], from[1], from[2]); flying = { m, from, to, t: 0, T: 0.3, who }; if (Snd.ok) Snd.noiseHit(Snd.ctx.currentTime, 0.05, 0.12, 2500, 0, Snd.sfx);
  }
  function land(who, x, y) {
    const sc = scoreAt(x - 0, y - BY); st.last = sc.label + (sc.pts > 0 && sc.label !== 'BULL' && sc.label !== 'OUTER BULL' && sc.ring === 1 ? '' : ''); st.lastT = 2.2; st.turnTot += sc.pts; st.left--;
    clank(sc.pts ? 620 : 240, sc.pts >= 40 ? 0.3 : 0.2);
    const after = st.rem[who] - st.turnTot;
    if (after < 0) { st.msg = 'BUST'; st.phase = 'bust'; st.t = 0; V0.say((who === 'me' ? 'Bust! ' : 'Rival busts. ') + 'Back to ' + st.turnStart, 2.4); st.turnTot = 0; if (Snd.ok) Snd.fail(); return; }
    if (after === 0) { st.rem[who] = 0; st.phase = 'over'; st.t = 0; return; }
    if (st.left <= 0) { st.phase = 'endturn'; st.t = 0; }
  }
  function aiTarget(rem) {
    const tr = (n, f) => { const i = ORDER.indexOf(n), a = i * 18 * Math.PI / 180, r = f === 3 ? 0.103 : f === 2 ? 0.166 : 0.134; if (n === 25) return f === 2 ? [0, 0] : [0, 0.0]; return [Math.sin(a) * r, Math.cos(a) * r]; };
    if (rem >= 61) return tr(20, 3); if (rem === 50) return [0, 0]; if (rem === 25) return [0.004, 0.004];
    if (rem <= 20) return tr(rem, 1); if (rem <= 40 && rem % 2 === 0) return tr(rem / 2, 2); if (rem <= 60 && rem % 3 === 0 && rem / 3 <= 20) return tr(rem / 3, 3);
    if (rem <= 40) return tr(rem - 20 > 0 && rem - 20 <= 20 ? rem - 20 : 20, 1); return tr(20, 1);
  }
  G.update = function (V, dt) {
    dt = Math.min(dt, 0.1); st.t += dt; st.lastT = Math.max(0, st.lastT - dt);
    const P = V.ptr, pt = planePt(), swing = st.phase === 'throw' && st.who === 'me';
    if (pt) { st.px = pt[0]; st.py = pt[1]; }
    const k = (kdSpace ? 0.3 : 1) * 0.011, tt = V.t, sx = (Math.sin(tt * 1.9) + 0.6 * Math.sin(tt * 3.3 + 1)) * k, sy = (Math.cos(tt * 2.3) + 0.6 * Math.sin(tt * 2.9 + 2)) * k;
    st.ax = (st.px || 0) + sx; st.ay = (st.py == null ? BY : st.py) + sy;
    reticle.visible = swing; reticle.position.set(st.ax, st.ay, WZ + 0.08); Ven.shift(G.cam, dt);
    if (flying) {
      flying.t += dt; const u = Math.min(1, flying.t / flying.T), f = flying.from, to = flying.to, m = flying.m;
      m.position.set(f[0] + (to[0] - f[0]) * u, f[1] + (to[1] - f[1]) * u + Math.sin(u * Math.PI) * 0.1, f[2] + (to[2] - f[2]) * u);
      { const dx = to[0] - f[0], dy = (to[1] - f[1]) + Math.cos(u * Math.PI) * 0.1 * Math.PI, dz = to[2] - f[2], l = Math.hypot(dx, dy, dz) || 1; m.lookAt(m.position.x - dx / l, m.position.y - dy / l, m.position.z - dz / l); }
      if (u >= 1) { m.rotation.set((rnd() - 0.5) * 0.12, (rnd() - 0.5) * 0.12, 0); stuck.push(m); const who = flying.who; flying = null; land(who, to[0], to[1]); }
    }
    switch (st.phase) {
      case 'bust': case 'endturn': if (st.t > 1.25) { if (st.phase === 'endturn') st.rem[st.who] -= st.turnTot; clearDarts(); st.turnTot = 0; st.left = 3; nextTurn(); } break;
      case 'rival': if (!flying && st.t > st.nextT) { if (st.left > 0) { const tg = aiTarget(st.rem.ai - st.turnTot), s = SIG[st.sigI], x = tg[0] + venGauss(rnd) * s, y = BY + tg[1] + venGauss(rnd) * s; throwAt('ai', x, y); st.t = 0; st.nextT = 0.8; } } break;
      case 'over': if (st.t > 1.1) finish(); break;
      default:
    }
  };
  let kdSpace = false;
  function nextTurn() {
    if (st.who === 'me') { st.who = 'ai'; st.turnStart = st.rem.ai; st.phase = 'rival'; st.t = 0; st.nextT = 0.9; st.sigI = Math.max(0, V0.D.stakes.indexOf(V0.stake)); V0.say('Rival steps up', 1.6); }
    else { st.round++; if (st.round > ROUNDS) { st.phase = 'over'; st.t = 0; st.timeUp = true; return; } st.who = 'me'; st.turnStart = st.rem.me; st.phase = 'throw'; V0.say('Round ' + st.round + ' · your throw', 1.8); }
  }
  function finish() {
    const win = st.timeUp ? st.rem.me <= st.rem.ai : st.rem.me === 0, stake = V0.stake, why = st.timeUp ? 'Rounds up: ' + st.rem.me + ' to ' + st.rem.ai : (win ? 'You checked out' : 'Rival checked out');
    st.phase = 'done'; V0.finish(win, win ? 'You win the match' : 'Rival wins the match', [why, 'You scored ' + (START - st.rem.me) + ' · rival scored ' + (START - st.rem.ai), 'Rounds played: ' + Math.min(st.round, ROUNDS)], win ? (stake ? stake * 2 : 30) : 0);
  }
  G.ptrup = function () { if (st.phase === 'throw' && st.who === 'me' && st.left > 0 && !flying && st.t > 0.2) { throwAt('me', st.ax, st.ay); } };
  G.key = function (V, code, down) { if (code === 'Space') { kdSpace = down; if (!down && st.phase === 'throw' && st.who === 'me' && st.left > 0 && !flying) throwAt('me', st.ax, st.ay); } };
  G.hud = function () {
    if (!st) return '';
    return '<span class="big">' + (st.lastT > 0 ? st.last : (st.who === 'me' ? 'Your throw' : 'Rival throws')) + '</span><div class="r"><span>You</span><b>' + (st.rem.me - (st.who === 'me' ? st.turnTot : 0)) + '</b></div><div class="r"><span>Rival</span><b>' + (st.rem.ai - (st.who === 'ai' ? st.turnTot : 0)) + '</b></div><div class="r"><span>Round</span><b>' + Math.min(st.round, ROUNDS) + ' / ' + ROUNDS + '</b></div><div class="r"><span>Darts left</span><b>' + '●'.repeat(Math.max(0, st.left)) + '○'.repeat(3 - Math.max(0, st.left)) + '</b></div>';
  };
  G.hint = function () { return st && st.phase === 'throw' ? 'Move the reticle · <em>release</em> to throw · hold <em>Space</em> to steady' : ''; };
  G.idle = function (V, dt) { if (st && reticle) reticle.visible = false; if (G.cam) Ven.shift(G.cam, dt); };
  G.recText = function (rec) { return ['Matches', rec.n]; };
  G.dbg = () => st;
  G.api = { scoreAt, aiTarget, busy: () => !!flying, BY, throwAt: (w, x, y) => throwAt(w, x, y) };
  return G;
})();
