/* ================= HARVEST FAIR BARN: whack-a-gopher (Eastvale) =================
   Nine holes, forty-five seconds, one big mallet. Whack the gophers as they pop up, go for the golden one, and keep your mallet off Farmer Joe. Quick
   successive hits build a streak bonus. Click or tap a hole to swing. */
Ven.games.gopher = (function () {
  const T_LEN = 45, GOALS = [450, 650, 850, 1100], TOP = 0.9, SP = 0.74;
  const G = { ready: false, sc: null, cam: null, expo: 1.1, stakeLabel: 'Entry stake',
    rules: 'Forty-five seconds, nine holes. Gophers +10, the golden gopher +50, Farmer Joe -30. Hit them in quick succession for a streak bonus. Reach the goal to win double your stake (one and a half times the goal pays triple). Casual wins pay $30.' };
  let st = null, V0 = null, pops = null, mallet = null, ctrl = null; const H = [];
  const rnd = () => (st ? st.rnd() : Math.random());
  const thump = () => { if (!Snd.ok || !Snd.ctx) return; const t = Snd.ctx.currentTime; Snd.tone(t, 95, 0.14, 'sine', 0.4, 600, 0.001, Snd.sfx); Snd.noiseHit(t, 0.06, 0.3, 400, 3000, Snd.sfx); };
  function mkGopher(kind) {
    const g = new THREE.Group(), fur = venMat(kind === 'gold' ? 0xf2c230 : 0x8a5a32, kind === 'gold' ? 0.25 : 0.9, kind === 'gold' ? 0.8 : 0, kind === 'gold' ? 0x5a3c06 : null), belly = venMat(kind === 'gold' ? 0xffe27a : 0xc8a070, 0.9, 0, kind === 'gold' ? 0x4a3406 : null);
    if (kind === 'joe') {
      const skin = venMat(0xe8b890, 0.7), hat = venMat(0xe8c868, 0.9), ov = venMat(0x2a5a9a, 0.8);
      venBox(g, 0.4, 0.34, 0.26, 0, 0.17, 0, ov); venBox(g, 0.26, 0.1, 0.02, 0, 0.3, 0.14, venMat(0xc03a2a, 0.8));
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), skin); head.position.y = 0.5; g.add(head);
      venBox(g, 0.22, 0.14, 0.05, 0, 0.42, 0.14, venMat(0xcfcfcf, 0.9)); venBox(g, 0.12, 0.03, 0.03, 0, 0.5, 0.17, venMat(0xcfcfcf, 0.9));
      venCyl(g, 0.31, 0.31, 0.02, 0, 0.62, 0, hat, 20); venCyl(g, 0.15, 0.17, 0.14, 0, 0.7, 0, hat, 16); venCyl(g, 0.152, 0.152, 0.03, 0, 0.65, 0, venMat(0xc03a2a, 0.8), 16);
      for (const x of [-0.06, 0.06]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), venMat(0x111111)); e.position.set(x, 0.54, 0.155); g.add(e); }
      return g;
    }
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 14), fur); body.scale.set(1, 1.2, 0.9); body.position.y = 0.2; g.add(body);
    const bl = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 10), belly); bl.scale.set(1, 1.1, 0.7); bl.position.set(0, 0.17, 0.09); g.add(bl);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 18, 14), fur); head.position.y = 0.45; g.add(head);
    const snout = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 10), belly); snout.scale.set(1, 0.8, 0.9); snout.position.set(0, 0.41, 0.13); g.add(snout);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), venMat(0xe88a9a, 0.5)); nose.position.set(0, 0.44, 0.205); g.add(nose);
    for (const x of [-0.07, 0.07]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), venMat(0x111111, 0.3)); e.position.set(x, 0.5, 0.14); g.add(e); const ear = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), fur); ear.position.set(x * 1.7, 0.6, 0); g.add(ear); venBox(g, 0.035, 0.05, 0.015, x * 0.5, 0.36, 0.2, venMat(0xf4f0e6, 0.5)); }
    return g;
  }
  function build() {
    const sc = G.sc = venRoom({ w: 10, d: 10, h: 4.6, bg: 0x0c0806, floor: 0xa07840, wall: 0x7a3a28, ceilc: 0x2a1a12, hemi: 0.55, sky: 0xfff0d0, gnd: 0x5a3a20 });
    const lp = new THREE.PointLight(lc(0xffc070), 1.1, 12, 1.3); lp.position.set(0, 3.4, 1.0); sc.add(lp); const l2 = new THREE.PointLight(lc(0xffe8c0), 0.5, 10, 1.4); l2.position.set(0, 2.4, 3.0); sc.add(l2);
    const bnr = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.7), new THREE.MeshBasicMaterial({ map: venText('HARVEST FAIR · WHACK-A-GOPHER', 1000, 160, '#f8ecc8', '#7a2418', '700 76px "Chakra Petch", Arial'), color: new THREE.Color(0.95, 0.95, 0.95) })); bnr.position.set(0, 3.1, -4.85); sc.add(bnr);
    const pc = [0xe2342c, 0xf2c230, 0x2c8ae2, 0x3aa84a]; for (let i = 0; i < 16; i++) { const x = -4.5 + i * 0.6, y = 3.85 - Math.sin(i / 15 * Math.PI) * 0.45; const f = venBox(sc, 0.3, 0.3, 0.02, x, y, -4.8, venMat(pc[i % 4], 0.8)); f.rotation.z = Math.PI / 4; }
    for (const [x, z] of [[-3.2, -3.4], [3.4, -3.0], [-3.6, 1.6], [3.7, 1.9]]) { venBox(sc, 1.4, 0.7, 0.8, x, 0.35, z, venMat(0xd0a840, 0.95)); venBox(sc, 1.2, 0.6, 0.7, x + 0.1, 1.0, z, venMat(0xc89c38, 0.95)); }
    const wood = venMat(0x7a4a24, 0.7), dk = venMat(0x4a2a12, 0.8);
    venBox(sc, 2.7, 0.1, 2.7, 0, TOP - 0.05, 0, wood); venBox(sc, 2.5, TOP - 0.1, 2.5, 0, (TOP - 0.1) / 2, 0, dk); for (const [x, z] of [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]]) venBox(sc, 0.16, TOP, 0.16, x, TOP / 2, z, dk);
    venBox(sc, 2.7, 0.12, 0.08, 0, TOP + 0.01, 1.31, venMat(0xc03a2a, 0.7)); venBox(sc, 2.7, 0.12, 0.08, 0, TOP + 0.01, -1.31, venMat(0xc03a2a, 0.7)); venBox(sc, 0.08, 0.12, 2.7, 1.31, TOP + 0.01, 0, venMat(0xc03a2a, 0.7)); venBox(sc, 0.08, 0.12, 2.7, -1.31, TOP + 0.01, 0, venMat(0xc03a2a, 0.7));
    const hole = new THREE.MeshBasicMaterial({ color: 0x050403 }), dirt = venMat(0x4a3220, 1);
    for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) {
      const x = (i - 1) * SP, z = (j - 1) * SP, d = new THREE.Mesh(new THREE.CircleGeometry(0.34, 24), dirt); d.rotation.x = -Math.PI / 2; d.position.set(x, TOP + 0.003, z); sc.add(d);
      const h = new THREE.Mesh(new THREE.CircleGeometry(0.25, 24), hole); h.rotation.x = -Math.PI / 2; h.position.set(x, TOP + 0.006, z); sc.add(h);
      const gs = { g: mkGopher('gopher'), gold: mkGopher('gold'), joe: mkGopher('joe') }, grp = new THREE.Group(); grp.position.set(x, TOP - 0.7, z); grp.add(gs.g, gs.gold, gs.joe); sc.add(grp);
      H.push({ x, z, grp, gs, state: 'down', kind: 'g', t: 0, up: 1, y: -0.7 });
    }
    mallet = new THREE.Group(); const hd = venCyl(mallet, 0.09, 0.09, 0.26, 0, 0, 0, venMat(0x8a4a22, 0.6), 14); hd.rotation.z = Math.PI / 2; venCyl(mallet, 0.095, 0.095, 0.03, 0.12, 0, 0, venMat(0xc03a2a, 0.5), 14).rotation.z = Math.PI / 2; venCyl(mallet, 0.095, 0.095, 0.03, -0.12, 0, 0, venMat(0xc03a2a, 0.5), 14).rotation.z = Math.PI / 2; const hnd = venCyl(mallet, 0.03, 0.03, 0.8, 0, 0.4, 0, venMat(0xb07a40, 0.7), 10); mallet.visible = false; sc.add(mallet);
    pops = Ven.pops(sc); G.cam = new THREE.PerspectiveCamera(44, 16 / 9, 0.05, 40); G.cam.position.set(0, 2.55, 2.6); G.cam.lookAt(0, TOP + 0.1, 0.1);
  }
  G.init = function (V) { V0 = V; build(); };
  function resetH() { for (const h of H) { h.state = 'down'; h.t = 0; h.y = -0.7; h.grp.position.y = TOP - 0.7; h.grp.scale.set(1, 1, 1); h.gs.g.visible = h.gs.gold.visible = h.gs.joe.visible = false; } }
  G.enter = function (V) { V0 = V; if (!G.sc) G.init(V); st = { rnd: mulberry32((Date.now() & 0xffff) + 5), phase: 'lobby', t: 0, score: 0, time: T_LEN, spawn: 0.8, hits: 0, swings: 0, streak: 0, lastHit: -9, sw: 9, mx: 0, mz: 0, joe: 0, tt: 0 }; if (G.seed) st.rnd = mulberry32(G.seed); resetH(); pops.clear(); mallet.visible = false; };
  G.begin = function (V) { G.enter(V); st.phase = 'ready'; st.t = 0; mallet.visible = true; V.say('Get ready…', 1.4); };
  G.cleanup = function () { if (pops) pops.clear(); if (mallet) mallet.visible = false; };
  function planePt() { const rc = Ven.ray(G.cam).ray, o = rc.origin, d = rc.direction; if (d.y > -1e-5) return null; const t = (TOP + 0.05 - o.y) / d.y; return [o.x + d.x * t, o.z + d.z * t]; }
  function swing() {
    if (st.phase !== 'go' && st.phase !== 'ready') return; st.sw = 0; st.swings++; thump(); const pt = planePt(); if (!pt) return; let best = null, bd = 0.33;
    for (const h of H) { if (h.state !== 'up' && h.state !== 'rise') continue; if (h.y < -0.32) continue; const d = Math.hypot(h.x - pt[0], h.z - pt[1]); if (d < bd) { bd = d; best = h; } }
    if (st.phase !== 'go') return; if (!best) { st.streak = 0; return; }
    const kind = best.kind; let pts = kind === 'gold' ? 50 : kind === 'joe' ? -30 : 10;
    if (pts > 0) { st.streak = (st.t - st.lastHit < 1.6) ? st.streak + 1 : 1; st.lastHit = st.t; pts += Math.min(10, (st.streak - 1) * 2); st.hits++; } else { st.streak = 0; st.joe++; }
    st.score = Math.max(0, st.score + pts); best.state = 'hit'; best.t = 0;
    pops.add((pts > 0 ? '+' : '') + pts, pts > 0 ? (kind === 'gold' ? '#ffd23d' : '#8ff0a8') : '#ff6b6b', best.x, TOP + 0.9, best.z, kind === 'gold' ? 0.42 : 0.32); if (Snd.ok) { pts > 0 ? Snd.pop() : Snd.fail(); }
  }
  G.ptrdown = function () { if (st) swing(); };
  G.key = function (V, code, down) { if (down && (code === 'Space' || code === 'Enter')) swing(); };
  function spawn(prog) {
    const free = H.filter((h) => h.state === 'down'); if (!free.length || H.filter((h) => h.state !== 'down').length >= (prog > 0.5 ? 4 : 3)) return;
    const h = free[(rnd() * free.length) | 0], r = rnd(); h.kind = r < 0.09 ? 'gold' : r < 0.22 ? 'joe' : 'g'; h.gs.g.visible = h.kind === 'g'; h.gs.gold.visible = h.kind === 'gold'; h.gs.joe.visible = h.kind === 'joe';
    h.state = 'rise'; h.t = 0; h.up = (h.kind === 'gold' ? 0.8 : 1.25) - prog * 0.5; h.grp.scale.set(1, 1, 1);
  }
  function life(dt) {
    const prog = 1 - st.time / T_LEN;
    st.spawn -= dt; if (st.phase === 'go' && st.spawn <= 0) { spawn(prog); st.spawn = 0.78 - prog * 0.42 + rnd() * 0.2; }
    for (const h of H) {
      if (h.state === 'down') continue; h.t += dt;
      if (h.state === 'rise') { h.y = -0.7 + Math.min(1, h.t / 0.16) * 0.72; if (h.t > 0.16) { h.state = 'up'; h.t = 0; } }
      else if (h.state === 'up') { h.y = 0.02 + Math.sin(h.t * 9) * 0.01; if (h.t > h.up) { h.state = 'fall'; h.t = 0; } }
      else if (h.state === 'fall') { h.y = 0.02 - Math.min(1, h.t / 0.22) * 0.72; if (h.t > 0.22) { h.state = 'down'; } }
      else if (h.state === 'hit') { h.y = 0.02 - Math.min(1, h.t / 0.3) * 0.74; h.grp.scale.set(1 + Math.sin(h.t * 16) * 0.08, 1 - Math.min(1, h.t / 0.1) * 0.3 * (1 - h.t / 0.3), 1); if (h.t > 0.3) { h.state = 'down'; h.grp.scale.set(1, 1, 1); } }
      h.grp.position.y = TOP + h.y;
    }
  }
  function cam(dt) {
    const pt = planePt(); if (pt) { st.mx += (pt[0] - st.mx) * Math.min(1, dt * 18); st.mz += (pt[1] - st.mz) * Math.min(1, dt * 18); }
    st.sw += dt; const sw = st.sw, rx = sw < 0.09 ? -0.8 + (sw / 0.09) * 1.45 : 0.65 - Math.min(1, (sw - 0.09) / 0.25) * 1.45;
    mallet.position.set(st.mx + 0.12, TOP + 0.42 + (sw < 0.09 ? 0.2 - (sw / 0.09) * 0.2 : 0), st.mz + 0.28); mallet.rotation.set(rx, 0, 0.05);
    Ven.shift(G.cam, dt);
  }
  G.update = function (V, dt) {
    dt = Math.min(dt, 0.1); st.t += dt; pops.update(dt);
    if (st.phase === 'ready') { life(dt); if (st.t > 1.5) { st.phase = 'go'; st.t = 0; V.say('GO!', 0.8); if (Snd.ok) Snd.beep(880, 0.1); st.spawn = 0.3; } }
    else if (st.phase === 'go') { st.time -= dt; life(dt); if (st.time <= 0) { st.time = 0; st.phase = 'over'; st.t = 0; V.say('Time!', 2); } }
    else if (st.phase === 'over') { life(dt); if (st.t > 1.3) finish(); }
    cam(dt);
  };
  function finish() {
    const goal = GOALS[Math.max(0, V0.D.stakes.indexOf(V0.stake))], stake = V0.stake, win = st.score >= goal, big = st.score >= goal * 1.5;
    st.phase = 'done'; mallet.visible = false;
    V0.finish(win, win ? (big ? 'Fair champion!' : 'Goal reached') : 'Not quite', ['Score ' + st.score + ' · goal ' + goal, 'Whacked ' + st.hits + ' · swings ' + st.swings + (st.joe ? ' · Farmer Joe got hit ' + st.joe + '×' : '')], win ? (big ? (stake ? stake * 3 : 60) : (stake ? stake * 2 : 30)) : 0);
    const r = venRec('gopher'); r.best = Math.max(r.best || 0, st.score);
  }
  G.idle = function (V, dt) { if (G.cam && st) { cam(dt); pops.update(dt); } };
  G.hud = function () {
    if (!st) return ''; const goal = GOALS[Math.max(0, V0.D.stakes.indexOf(V0.stake))];
    return '<span class="big">' + st.score + '</span><div class="r"><span>Goal</span><b>' + goal + '</b></div><div class="r"><span>Time</span><b>' + Math.ceil(st.time) + 's</b></div>' + (st.streak > 1 ? '<div class="r"><span>Streak</span><b class="good">×' + st.streak + '</b></div>' : '');
  };
  G.hint = function () { return st && st.phase === 'go' ? 'Click or tap a hole to whack · <em>golden</em> gophers pay big · don\'t hit <em>Farmer Joe</em>' : ''; };
  G.recText = function (rec) { return ['Best score', rec.best || 0]; };
  G.dbg = () => st; G.api = { swing, H, GOALS, planePt };
  return G;
})();
