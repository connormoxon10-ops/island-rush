/* ================= DANCE CLUB: the dance floor (every town's club) =================
   Arrows fall down four lanes to the beat of the club's own tune; press left / down / up / right (arrow keys or A S W D, or tap the lanes) as they hit the
   line. Perfect, great and good hits keep the combo going and build a x2 to x4 multiplier; the dancer on the lit floor throws a move for every hit, the
   crowd and lights follow your streak. Reach the rating goal to win double your bet (A: x2.5, S: x3). Each club has its own tempo, tune and colours. */
Ven.games.dance = (function () {
  const LANES = [
    { k: ['ArrowLeft', 'KeyA'], col: '#ff4fd8', rot: Math.PI }, { k: ['ArrowDown', 'KeyS'], col: '#35d0ff', rot: Math.PI / 2 },
    { k: ['ArrowUp', 'KeyW'], col: '#b6ff4a', rot: -Math.PI / 2 }, { k: ['ArrowRight', 'KeyD'], col: '#ffa63d', rot: 0 }];
  const KEYLANE = {}; LANES.forEach((l, i) => l.k.forEach((c) => { KEYLANE[c] = i; }));
  const GOALS = [0.5, 0.6, 0.7, 0.8], LEADS = [1.7, 1.52, 1.38, 1.26], DENS = [0.5, 0.64, 0.78, 0.9];
  const WIN = { p: 0.058, g: 0.108, o: 0.165 }, BASE = { p: 100, g: 70, o: 40 }, QN = { p: 'PERFECT', g: 'GREAT', o: 'GOOD' }, QC = { p: '#ffe14a', g: '#7dff9a', o: '#5ec8ff' };
  const FIRST_BAR = 1, LAST_BAR = 18, END_BAR = 19.6;
  const G = { ready: false, sc: null, cam: null, expo: 1.2, stakeLabel: 'Entry bet', lobbyHint: '', rules: '' };
  let st = null, V0 = null, built = -1, cv = null, cx = null, dpr = 1, S3 = null, shiftS = { x: 0, y: 0 }, D0 = null, spb = 0.5;
  const held = {}, GEO = {}, lerpf = (a, b, t) => a + (b - a) * t;
  const stakeIdx = () => Math.max(0, (V0 && V0.D ? V0.D.stakes.indexOf(V0.stake) : 0));
  const goal = () => GOALS[stakeIdx()];

  /* ---------- the chart: a seeded pattern per club and difficulty ---------- */
  function makeChart(D, lv) {
    const r = mulberry32(D.cid * 7919 + 17 + lv * 131), sp = 60 / D.bpm, bar = sp * 4, ns = [], dens = DENS[lv];
    let motif = null, last = 1, dir = 1;
    const pick = () => { if (r() < 0.45) { last += dir; if (last > 3 || last < 0) { dir = -dir; last += 2 * dir; } } else { let l; do { l = (r() * 4) | 0; } while (l === last); last = l; dir = r() < 0.5 ? 1 : -1; } return last; };
    for (let b = FIRST_BAR; b <= LAST_BAR; b++) {
      const brk = b === 12 || b === 13;
      if (!motif || (b - FIRST_BAR) % 2 === 0) { motif = []; for (let s = 0; s < 8; s++) { const on = s % 2 === 0, p = on ? Math.min(1, dens + 0.3) : Math.max(0.05, dens - 0.38); motif.push(r() < p ? pick() : -1); } }
      else { motif = motif.slice(); const k = (r() * 8) | 0; if (motif[k] >= 0) motif[k] = pick(); }
      for (let s = 0; s < 8; s++) { const l = motif[s]; if (l < 0 || (brk && s % 4 !== 0)) continue; ns.push({ t: b * bar + s * sp / 2, l, s: 0, q: '', bj: 0, skip: false }); }
    }
    return ns;
  }

  /* ---------- dancer rig: screen-left arm / leg is index 0, screen-right is 1 ---------- */
  const PK = ['y', 'hy', 'hz', 'sx', 'sy', 'sz', 'hx', 'a0x', 'a0z', 'a0e', 'a1x', 'a1z', 'a1e', 'l0x', 'l0z', 'l0k', 'l1x', 'l1z', 'l1k'];
  const newPose = () => { const p = {}; for (const k of PK) p[k] = 0; return p; };
  function mkDancer(o) {
    const root = new THREE.Group(), mskin = venMat(o.skin, 0.7), mtop = venMat(o.top, 0.55, 0, o.topEm), mpan = venMat(o.pants, 0.7), msh = venMat(o.shoes, 0.5), mhair = venMat(o.hair, 0.9), J = { a: [], e: [], l: [], k: [] };
    /* optional extras (the Zenith headliner uses them; plain dancers leave them out): o.sleeve = a contrasting arm colour, o.skirt = a skirt colour, o.hairStyle = 'puff' | 'long' | 'bun' */
    const msl = o.sleeve != null ? venMat(o.sleeve, 0.55, 0, o.sleeveEm) : mtop;
    const hips = J.hips = new THREE.Group(); root.add(hips); venBox(hips, 0.36, 0.2, 0.22, 0, 0, 0, mpan);
    if (o.skirt != null) venBox(hips, 0.5, 0.26, 0.33, 0, -0.14, 0, venMat(o.skirt, 0.6, 0, o.skirtEm));
    const torso = J.torso = new THREE.Group(); torso.position.y = 0.08; hips.add(torso); venBox(torso, 0.4, 0.52, 0.23, 0, 0.27, 0, mtop);
    const head = J.head = new THREE.Group(); head.position.y = 0.58; torso.add(head);
    const hd = new THREE.Mesh(new THREE.SphereGeometry(0.125, 14, 12), mskin); hd.position.y = 0.14; head.add(hd);
    const hr = new THREE.Mesh(new THREE.SphereGeometry(0.133, 14, 10), mhair); hr.scale.set(1, 0.7, 1.02); hr.position.set(0, 0.2, -0.015); head.add(hr);
    if (o.hairStyle === 'puff') { hr.scale.set(1.3, 1.0, 1.28); hr.position.set(0, 0.23, -0.02); }
    else if (o.hairStyle === 'long') venBox(head, 0.27, 0.4, 0.08, 0, 0.02, -0.115, mhair);
    else if (o.hairStyle === 'bun') { const bn = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 6), mhair); bn.position.set(0, 0.37, -0.02); head.add(bn); }
    for (const x of [-0.045, 0.045]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 5), venMat(0x111111)); e.position.set(x, 0.15, 0.115); head.add(e); }
    for (let i = 0; i < 2; i++) {
      const s = i ? 1 : -1, arm = new THREE.Group(); arm.position.set(s * 0.25, 0.5, 0); torso.add(arm); venBox(arm, 0.09, 0.3, 0.09, 0, -0.15, 0, msl);
      const el = new THREE.Group(); el.position.y = -0.3; arm.add(el); venBox(el, 0.08, 0.28, 0.08, 0, -0.14, 0, mskin); const hand = new THREE.Mesh(new THREE.SphereGeometry(0.052, 8, 6), mskin); hand.position.y = -0.3; el.add(hand);
      const leg = new THREE.Group(); leg.position.set(s * 0.1, -0.05, 0); hips.add(leg); venBox(leg, 0.14, 0.42, 0.14, 0, -0.21, 0, mpan);
      const kn = new THREE.Group(); kn.position.y = -0.42; leg.add(kn); venBox(kn, 0.12, 0.42, 0.12, 0, -0.21, 0, mpan); venBox(kn, 0.13, 0.06, 0.22, 0, -0.45, 0.04, msh);
      J.a.push(arm); J.e.push(el); J.l.push(leg); J.k.push(kn);
    }
    root.scale.setScalar(o.scale || 1);
    return { root, J, cur: newPose(), tgt: newPose(), mv: null, stumble: 0, ph: o.ph || 0, flip: false };
  }
  const reach = (x, k, z) => (0.42 * Math.cos(x) + 0.42 * Math.cos(x + k)) * Math.cos(z) + 0.06;
  function applyPose(d) {
    const P = d.cur, J = d.J;
    J.hips.rotation.set(0, P.hy, P.hz); J.torso.rotation.set(P.sx, P.sy, P.sz); J.head.rotation.set(P.hx, -P.sy * 0.6, -P.sz * 0.7);
    for (let i = 0; i < 2; i++) { J.a[i].rotation.set(P['a' + i + 'x'], 0, P['a' + i + 'z']); J.e[i].rotation.set(P['a' + i + 'e'], 0, 0); J.l[i].rotation.set(P['l' + i + 'x'], 0, P['l' + i + 'z']); J.k[i].rotation.set(P['l' + i + 'k'], 0, 0); }
    J.hips.position.y = 0.05 + Math.max(reach(P.l0x, P.l0k, P.l0z), reach(P.l1x, P.l1k, P.l1z)) + P.y;
  }
  function idlePose(P, bt, hype, ph) {
    const s = Math.sin((bt + ph) * Math.PI), c = Math.cos((bt + ph) * Math.PI * 2), pm = 0.5 + 0.5 * Math.sin((bt + ph) * Math.PI), up = Math.max(0, s), dn = Math.max(0, -s);
    P.y = 0.016 * c; P.hy = s * 0.2; P.hz = s * 0.05; P.sx = 0.03 + 0.03 * c; P.sy = -s * 0.1; P.sz = -s * 0.07; P.hx = 0.05 * c;
    P.a0x = -0.15 - 0.2 * s; P.a1x = -0.15 + 0.2 * s; P.a0z = -(0.3 + hype * (0.5 + 1.9 * pm)); P.a1z = 0.3 + hype * (0.5 + 1.9 * (1 - pm)); P.a0e = -0.5 - 0.9 * hype * (1 - pm); P.a1e = -0.5 - 0.9 * hype * pm;
    P.l0x = -0.1 - 0.2 * up; P.l1x = -0.1 - 0.2 * dn; P.l0k = 0.2 + 0.5 * up; P.l1k = 0.2 + 0.5 * dn; P.l0z = -0.06; P.l1z = 0.06;
  }
  /* the four moves; e = strength 0..1, flip alternates the variation, tt = seconds since the move began */
  function movePose(P, lane, e, flip, tt) {
    if (lane === 0 || lane === 3) {
      const s = lane === 0 ? -1 : 1, o = lane === 0 ? 0 : 1, n = 1 - o;
      P.sz = lerpf(P.sz, -s * 0.34, e); P.sy = lerpf(P.sy, -s * 0.4, e); P.hz = lerpf(P.hz, -s * 0.12, e);
      P['a' + o + 'z'] = lerpf(P['a' + o + 'z'], s * 2.35, e); P['a' + o + 'x'] = lerpf(P['a' + o + 'x'], -0.3, e); P['a' + o + 'e'] = lerpf(P['a' + o + 'e'], -0.15, e);
      P['a' + n + 'z'] = lerpf(P['a' + n + 'z'], flip ? -s * 0.2 : -s * 0.45, e); P['a' + n + 'e'] = lerpf(P['a' + n + 'e'], flip ? -2.1 : -1.7, e); P['a' + n + 'x'] = lerpf(P['a' + n + 'x'], flip ? -0.9 : -0.3, e);
      P['l' + o + 'z'] = lerpf(P['l' + o + 'z'], s * 0.42, e); P['l' + o + 'k'] = lerpf(P['l' + o + 'k'], 0.12, e); P['l' + n + 'k'] = lerpf(P['l' + n + 'k'], 0.6, e); P['l' + n + 'x'] = lerpf(P['l' + n + 'x'], -0.25, e);
      P.y += 0.04 * e * Math.sin(Math.min(1, tt / 0.3) * Math.PI);
    } else if (lane === 2) {
      const j = Math.sin(Math.min(1, tt / 0.46) * Math.PI);
      P.y += 0.3 * e * j; P.sx = lerpf(P.sx, -0.12, e);
      if (flip) { P.a1z = lerpf(P.a1z, 2.75, e); P.a1x = lerpf(P.a1x, -0.2, e); P.a1e = lerpf(P.a1e, -0.1, e); P.a0z = lerpf(P.a0z, -0.5, e); P.a0e = lerpf(P.a0e, -1.9, e); P.a0x = lerpf(P.a0x, -0.5, e); P.sz = lerpf(P.sz, 0.14, e); }
      else { P.a0z = lerpf(P.a0z, -2.7, e); P.a1z = lerpf(P.a1z, 2.7, e); P.a0e = P.a1e = lerpf(P.a1e, -0.15, e); P.a0x = P.a1x = lerpf(P.a1x, -0.2, e); }
      P.l0k = lerpf(P.l0k, 0.5 + 0.9 * j, e); P.l1k = lerpf(P.l1k, 0.2 + 0.4 * j, e); P.l0x = lerpf(P.l0x, -0.2 - 0.5 * j, e); P.l1x = lerpf(P.l1x, 0.1, e);
    } else {
      P.l0x = P.l1x = lerpf(P.l1x, -0.95, e); P.l0k = P.l1k = lerpf(P.l1k, 1.6, e); P.l0z = lerpf(P.l0z, -0.22, e); P.l1z = lerpf(P.l1z, 0.22, e); P.sx = lerpf(P.sx, 0.38, e); P.hx = lerpf(P.hx, 0.25, e);
      P.a0z = lerpf(P.a0z, flip ? -0.2 : -0.8, e); P.a1z = lerpf(P.a1z, flip ? 0.8 : 0.2, e); P.a0x = lerpf(P.a0x, -1.0, e); P.a1x = lerpf(P.a1x, -1.0, e); P.a0e = P.a1e = lerpf(P.a1e, -0.35, e);
    }
  }
  function stumblePose(P, e) {
    P.hx = lerpf(P.hx, 0.7, e); P.sx = lerpf(P.sx, 0.34, e); P.sz = lerpf(P.sz, 0.16, e); P.a0z = lerpf(P.a0z, -0.18, e); P.a1z = lerpf(P.a1z, 0.18, e); P.a0x = lerpf(P.a0x, 0.15, e); P.a1x = lerpf(P.a1x, 0.15, e);
    P.a0e = P.a1e = lerpf(P.a1e, -0.2, e); P.l0k = P.l1k = lerpf(P.l1k, 0.7, e); P.l0x = P.l1x = lerpf(P.l1x, -0.3, e);
  }
  function animDancer(d, bt, dt, hype, lead) {
    const T = d.tgt; idlePose(T, bt, hype, d.ph);
    if (lead) {
      if (d.mv) { d.mv.t += dt; const e = d.mv.a * Math.exp(-d.mv.t * 2.6) * Math.min(1, d.mv.t / 0.05 + 0.4); if (e > 0.02) movePose(T, d.mv.lane, e, d.mv.flip, d.mv.t); else d.mv = null; }
      if (d.stumble > 0) { d.stumble -= dt; stumblePose(T, Math.min(1, d.stumble * 2.2)); }
    }
    const f = 1 - Math.exp(-dt * (lead && d.mv && d.mv.t < 0.25 ? 26 : 12)), C = d.cur; for (const k of PK) C[k] += (T[k] - C[k]) * f;
    applyPose(d);
  }

  /* ---------- the room ---------- */
  function disposeScene(sc) { sc.traverse((o) => { if (o.material) { const ms = Array.isArray(o.material) ? o.material : [o.material]; for (const m of ms) { if (m.map) m.map.dispose(); m.dispose(); } } if (o.geometry && !o.geometry.userData.keep) o.geometry.dispose(); }); }
  function build(D) {
    if (G.sc) { disposeScene(G.sc); G.sc = null; }
    const WW = 16, DD = 18, HH = 5.6, pal = D.pal.map((h) => lc(h));
    const sc = G.sc = venRoom({ w: WW, d: DD, h: HH, bg: 0x040308, floor: 0x0b0a12, wall: D.wall, ceilc: 0x07060c, hemi: 0.4, sky: 0x8a86c8, gnd: 0x14101a, fog: [16, 34] });
    for (const o of sc.children) if (o.isMesh && o.geometry && o.geometry.parameters && o.geometry.parameters.width === WW && o.geometry.parameters.height === HH && o.position.z > 0) o.visible = false;   /* open front wall: the camera sits there */
    S3 = { pal, tiles: [], beams: [], crowd: [], speakers: [], lights: [], eq: null, ball: null, dj: null, danc: null };
    /* the dance floor: 8 x 6 glowing tiles */
    const tg = GEO.tile || (GEO.tile = (() => { const g = new THREE.BoxGeometry(0.94, 0.06, 0.94); g.userData.keep = true; return g; })());
    venBox(sc, 8.3, 0.1, 6.3, 0, 0.02, -0.2, venMat(0x050408, 0.4, 0.3));
    for (let j = 0; j < 6; j++) for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(tg, new THREE.MeshBasicMaterial({ color: pal[0].clone() })); m.position.set(-3.5 + i, 0.1, -2.7 + j); sc.add(m); S3.tiles.push({ m, i, j }); }
    /* back wall: big LED screen, speaker stacks, ceiling neon, DJ booth */
    const eqc = mkCanvas(512, 192), eqt = new THREE.CanvasTexture(eqc); eqt.encoding = THREE.sRGBEncoding;
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 3.15), new THREE.MeshBasicMaterial({ map: eqt })); scr.position.set(0, 3.15, -DD / 2 + 0.12); sc.add(scr); S3.eq = { cv: eqc, g: eqc.getContext('2d'), tex: eqt, n: 0 };
    venBox(sc, 8.7, 0.12, 0.1, 0, 4.78, -DD / 2 + 0.1, venMat(0x000000, 1, 0, D.pal[0])); venBox(sc, 8.7, 0.12, 0.1, 0, 1.52, -DD / 2 + 0.1, venMat(0x000000, 1, 0, D.pal[2]));
    const dk = venMat(0x0e0c14, 0.6, 0.2), sp = venMat(0x1a1822, 0.5, 0.3);
    for (const sx of [-6.6, 6.6]) {
      venBox(sc, 1.5, 3.2, 1.3, sx, 1.6, -7.3, dk);
      for (const [yy, rr] of [[0.9, 0.48], [2.4, 0.38]]) { const c = venCyl(sc, rr, rr * 0.8, 0.16, sx, yy, -6.62, sp, 24); c.rotation.x = Math.PI / 2; S3.speakers.push(c); }
    }
    for (const [x, c] of [[-7.85, D.pal[0]], [7.85, D.pal[2]]]) venBox(sc, 0.08, 5.2, 0.08, x, 2.7, -4, venMat(0, 1, 0, c));
    for (let i = 0; i < 3; i++) venBox(sc, WW - 0.6, 0.07, 0.07, 0, HH - 0.2, -7 + i * 5.2, venMat(0, 1, 0, D.pal[i % 4]));
    venBox(sc, 4.4, 0.34, 2.6, 0, 0.17, -6.9, dk); venBox(sc, 3.6, 1.0, 0.8, 0, 0.84, -6.0, dk); venBox(sc, 3.4, 0.07, 0.5, 0, 1.36, -6.0, venMat(0x000000, 1, 0, D.pal[1]));
    for (const x of [-0.8, 0.8]) { const t = venCyl(sc, 0.3, 0.3, 0.05, x, 1.42, -6.0, venMat(0x0a0a0a, 0.3, 0.6), 24); venCyl(sc, 0.06, 0.06, 0.06, x, 1.46, -6.0, venMat(D.pal[0], 0.5)); }
    const dj = S3.dj = mkDancer({ skin: 0xb98a64, top: 0x15151c, topEm: D.pal[2], pants: 0x101018, shoes: 0x0a0a0a, hair: 0x15100c, ph: 0 }); dj.root.position.set(0, 0.34, -6.9); sc.add(dj.root);
    /* disco ball */
    const bc = mkCanvas(256, 128), bg = bc.getContext('2d'), br = mulberry32(31 + D.cid);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 32; x++) { const v = 90 + (br() * 165) | 0; bg.fillStyle = 'rgb(' + v + ',' + v + ',' + Math.min(255, v + 20) + ')'; bg.fillRect(x * 8, y * 8, 7, 7); }
    const bt = new THREE.CanvasTexture(bc); bt.encoding = THREE.sRGBEncoding;
    const ball = S3.ball = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 14), new THREE.MeshBasicMaterial({ map: bt, color: new THREE.Color(1.5, 1.5, 1.5) })); ball.position.set(0, HH - 1.15, -0.4); sc.add(ball); venCyl(sc, 0.015, 0.015, 1.1, 0, HH - 0.55, -0.4, venMat(0x888888), 6);
    /* beams from the ceiling rig */
    const cg = GEO.cone || (GEO.cone = (() => { const g = new THREE.ConeGeometry(0.6, 5.2, 16, 1, true); g.userData.keep = true; return g; })());
    for (let i = 0; i < 6; i++) {
      const pv = new THREE.Group(); pv.position.set(-4.5 + i * 1.8, HH - 0.1, -1.2); const m = new THREE.Mesh(cg, new THREE.MeshBasicMaterial({ color: pal[i % 4].clone().multiplyScalar(0.9), transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })); m.position.y = -2.6; pv.add(m); sc.add(pv); S3.beams.push({ pv, m, i });
      venBox(sc, 0.3, 0.2, 0.3, pv.position.x, HH - 0.12, pv.position.z, dk);
    }
    /* coloured point lights that roam over the floor */
    for (let i = 0; i < 2; i++) { const l = new THREE.PointLight(pal[i * 2 % 4], 1.15, 12, 1.5); l.position.set(0, 3.2, 1); sc.add(l); S3.lights.push(l); }
    const key = new THREE.PointLight(lc(0xfff0e0), 0.7, 11, 1.4); key.position.set(0, 3.0, 4.2); sc.add(key);
    /* the lead dancer and the crowd */
    const SK = [0xf0c8a0, 0xc89870, 0x8a5a38, 0xe0b088, 0x5a3a24], HAIR = [0x15100c, 0x3a2414, 0xc8a050, 0x6a2a18, 0x222a40];
    const lead = S3.danc = mkDancer({ skin: SK[D.cid % 5], top: D.col2, topEm: ((new THREE.Color(D.col2).multiplyScalar(0.35)).getHex()), pants: 0x161a2a, shoes: 0xf2f2f2, hair: HAIR[(D.cid + 2) % 5], ph: 0 }); lead.root.position.set(0, 0.13, -0.2); sc.add(lead.root);
    const cr = mulberry32(900 + D.cid), spots = [[-4.9, -2.2], [-4.2, -0.6], [-5.0, 0.9], [-4.3, 2.2], [4.9, -2.1], [4.3, -0.5], [5.0, 1.0], [4.2, 2.3], [-2.6, -3.6], [-0.9, -3.9], [1.2, -3.8], [2.8, -3.5]];
    for (const [x, z] of spots) {
      const col = D.pal[(cr() * 4) | 0], d = mkDancer({ skin: SK[(cr() * 5) | 0], top: col, topEm: (new THREE.Color(col).multiplyScalar(0.18)).getHex(), pants: [0x1a1a2a, 0x2a1a1a, 0x1a2a20, 0x222222][(cr() * 4) | 0], shoes: 0x202020, hair: HAIR[(cr() * 5) | 0], scale: 0.9 + cr() * 0.14, ph: cr() * 2 });
      d.root.position.set(x, 0.0, z); d.root.rotation.y = Math.atan2(-x, -0.2 - z); sc.add(d.root); S3.crowd.push(d);
    }
    /* a club-specific prop or two */
    const prop = {
      farm: () => { for (const [x, z] of [[-6.8, 3.2], [6.8, 3.4], [-6.6, -1.5]]) { venCyl(sc, 0.55, 0.55, 0.9, x, 0.45, z, venMat(0xc8a040, 0.95), 14).rotation.z = Math.PI / 2; } },
      tropic: () => { for (const x of [-6.8, 6.8]) { venCyl(sc, 0.12, 0.18, 3.2, x, 1.6, 2.4, venMat(0x6a4a2a, 0.9), 8); for (let k = 0; k < 6; k++) { const a = k / 6 * TAU, lf = venBox(sc, 1.5, 0.05, 0.35, x + Math.cos(a) * 0.75, 3.25, 2.4 + Math.sin(a) * 0.75, venMat(0x2a9a4a, 0.8)); lf.rotation.y = -a; lf.rotation.z = 0.25; } } },
      desert: () => { for (const [x, z] of [[-6.9, 2.8], [6.9, 1.2]]) { venCyl(sc, 0.22, 0.26, 2.2, x, 1.1, z, venMat(0x3a8a4a, 0.8), 10); const a = venCyl(sc, 0.14, 0.14, 0.9, x + 0.4, 1.4, z, venMat(0x3a8a4a, 0.8), 8); a.rotation.z = 0.5; } },
      alpine: () => { for (const x of [-6.9, 6.9]) for (let k = 0; k < 3; k++) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.85 - k * 0.2, 1.1, 8), venMat(0x1e5a3a, 0.9)); c.position.set(x, 0.8 + k * 0.7, 3.4); sc.add(c); } },
      harbor: () => { const w = venCyl(sc, 0.6, 0.6, 0.12, 6.9, 2.3, -3.0, venMat(0x8a5a2a, 0.7), 16); w.rotation.z = Math.PI / 2; venCyl(sc, 0.08, 0.08, 0.5, 6.7, 2.3, -3.0, venMat(0x8a5a2a), 6).rotation.z = Math.PI / 2; },
      lake: () => { venBox(sc, 0.1, 1.8, 1.4, -7.9, 2.6, 2.2, venMat(0x000000, 1, 0, D.pal[0])); venBox(sc, 0.1, 1.1, 0.9, -7.9, 2.6, 2.2, venMat(0x000000, 1, 0, D.pal[1])); },
      city: () => { for (let k = 0; k < 6; k++) venBox(sc, 1.0, 1.0, 0.1, -7.9, 1.8 + (k % 3) * 1.2, -2 + (k / 3 | 0) * 2.6, venMat(0x0a0a18, 0.5, 0, [D.pal[0], D.pal[1], D.pal[2]][k % 3])); }
    }[D.key]; if (prop) prop();
    /* the club's name over the DJ */
    const nm = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 0.72), new THREE.MeshBasicMaterial({ map: venText(D.name.toUpperCase(), 900, 140, '#fff', '#0a0610', '700 84px "Chakra Petch", Rajdhani, "Arial Black", sans-serif') })); nm.position.set(0, 5.05, -DD / 2 + 0.14); sc.add(nm);
    const cam = G.cam = new THREE.PerspectiveCamera(42, 16 / 9, 0.05, 60); cam.position.set(0, 2.55, 7.6); cam.lookAt(0, 1.2, -0.6);
    built = D.cid; D0 = D; spb = 60 / D.bpm;
  }

  /* ---------- scene animation ---------- */
  const songT = () => {
    if (!G.fixed && Music.mode !== 'off' && Music.ok() && Snd.ctx.state === 'running') return Snd.ctx.currentTime - (Snd.ctx.outputLatency || Snd.ctx.baseLatency || 0.02) - Music.A0;
    return st.clock;
  };
  function hype() { return st ? st.hype : 0; }
  function sceneFrame(dt, T, lead) {
    if (!S3) return;
    const bt = T / spb, fb = bt - Math.floor(bt), pulse = Math.exp(-fb * 3.2), h = hype(), bi = Math.floor(bt), pal = S3.pal;
    for (const t of S3.tiles) { const c = pal[(((t.i + t.j * 2 + bi + ((t.i >> 1) + (t.j >> 1)) % 2) % pal.length) + pal.length) % pal.length]; t.m.material.color.copy(c).multiplyScalar(0.1 + 0.28 * pulse + 0.2 * h + (((t.i + t.j) & 1) ? 0.06 : 0)); }
    for (const b of S3.beams) { b.pv.rotation.x = Math.sin(T * 0.8 + b.i * 1.3) * 0.5; b.pv.rotation.z = Math.cos(T * 0.6 + b.i * 2.1) * 0.55; b.m.material.opacity = 0.035 + 0.045 * pulse + 0.05 * h; }
    S3.ball.rotation.y += dt * 0.7;
    S3.lights.forEach((l, i) => { l.position.set(Math.sin(T * 0.7 + i * 3.1) * 3.4, 3.1, Math.cos(T * 0.9 + i * 2.3) * 2.2 - 0.3); l.intensity = 0.9 + 0.7 * pulse + 0.4 * h; });
    for (const s of S3.speakers) s.scale.setScalar(1 + 0.07 * pulse);
    animDancer(S3.danc, bt, dt, h, lead);
    const dj = S3.dj, jc = dj.tgt; idlePose(jc, bt * 0.5, 0.2, 0); jc.a0x = -1.1 + Math.sin(T * 5.5) * 0.25; jc.a1x = -1.1 - Math.sin(T * 5.5) * 0.25; jc.a0z = -0.25; jc.a1z = 0.25; jc.a0e = jc.a1e = -0.5; { const f = 1 - Math.exp(-dt * 12); for (const k of PK) dj.cur[k] += (jc[k] - dj.cur[k]) * f; } applyPose(dj);
    S3.crowd.forEach((d, i) => { const hh = lead ? Math.min(1, h * 1.15) : 0.35; animDancer(d, bt, dt, hh, false); });
    /* equalizer screen at ~20 fps */
    const E3 = S3.eq; E3.n += dt; if (E3.n > 0.05) {
      E3.n = 0; const g = E3.g, w = 512, hgt = 192, gr = g.createLinearGradient(0, 0, 0, hgt); gr.addColorStop(0, '#07040e'); gr.addColorStop(1, '#' + (D0.pal[0] & 0xffffff).toString(16).padStart(6, '0') + '55'); g.fillStyle = gr; g.fillRect(0, 0, w, hgt);
      for (let i = 0; i < 24; i++) { const v = 0.12 + 0.88 * (0.5 + 0.5 * Math.sin(T * (2.6 + (i % 5) * 0.7) + i * 1.7)) * (0.35 + 0.65 * (pulse * 0.7 + 0.3 + h * 0.3)), x = 14 + i * 20.5; g.fillStyle = '#' + (D0.pal[i % 4] & 0xffffff).toString(16).padStart(6, '0'); g.fillRect(x, hgt - 16 - v * 120, 15, v * 120); }
      g.fillStyle = '#fff'; g.font = '700 30px "Chakra Petch", Rajdhani, sans-serif'; g.textAlign = 'center'; g.fillText(D0.short.toUpperCase() + ' · ' + D0.bpm + ' BPM', w / 2, 40); E3.tex.needsUpdate = true;
    }
    const cam = G.cam, back = Math.max(0, 1 - innerWidth / innerHeight) * 7; cam.position.x = Math.sin(T * 0.35) * 0.45; cam.position.y = 2.55 + back * 0.12 + h * 0.1 + Math.sin(T * 0.5) * 0.06; cam.position.z = 7.6 + back; cam.fov = 42 - pulse * (0.6 + h); cam.lookAt(0, 1.15, -0.6);
    shift(dt);
  }
  function shift(dt) {
    const W = innerWidth, H = innerHeight, cam = G.cam, mod = !E.venModal.hidden, sheet = W <= 760; let tx = 0, ty = 0;
    if (mod) { if (sheet) ty = E.venModal.offsetHeight / 2 + 4; else tx = (E.venModal.offsetWidth + 18) / 2; }
    else if (st && st.phase !== 'lobby') { if (layout().portrait) ty = H * 0.3; else tx = W * 0.2; }
    const k = 1 - Math.exp(-dt * 6); shiftS.x += (tx - shiftS.x) * k; shiftS.y += (ty - shiftS.y) * k; cam.aspect = W / H;
    if (Math.abs(shiftS.x) > 0.5 || Math.abs(shiftS.y) > 0.5) cam.setViewOffset(W, H, shiftS.x, shiftS.y, W, H); else cam.clearViewOffset(); cam.updateProjectionMatrix();
  }

  /* ---------- the HUD canvas ---------- */
  function layout() {
    const W = innerWidth, H = innerHeight, portrait = W < H * 1.1 || W <= 760; let hw, cxx, top, hit;
    if (portrait) { hw = Math.min(W - 16, 440); cxx = W / 2; top = H * 0.4; hit = H * 0.86; }
    else { hw = clamp(H * 0.56, 250, 410); cxx = W * 0.74; top = 70; hit = H - 100; }
    return { W, H, portrait, hw, cx: cxx, x0: cxx - hw / 2, top, hit, lw: hw / 4 };
  }
  function ensureCanvas() {
    if (cv) return; cv = document.createElement('canvas'); cv.id = 'clubCv'; cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;display:none'; cx = cv.getContext('2d');
    E.ven.insertBefore(cv, E.ven.firstChild);
  }
  function arrow(g, x, y, s, rot) {
    g.save(); g.translate(x, y); g.rotate(rot); g.beginPath(); const P = [[-0.5, -0.2], [0.04, -0.2], [0.04, -0.5], [0.5, 0], [0.04, 0.5], [0.04, 0.2], [-0.5, 0.2]];
    P.forEach((p, i) => { i ? g.lineTo(p[0] * s, p[1] * s) : g.moveTo(p[0] * s, p[1] * s); }); g.closePath(); g.restore();
  }
  function draw(T) {
    ensureCanvas(); const L = layout(), W = L.W, H = L.H, g = cx;
    dpr = Math.min(2, window.devicePixelRatio || 1); const cw = Math.round(W * dpr), ch = Math.round(H * dpr); if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    const lw = L.lw, x0 = L.x0, top = L.top, hit = L.hit, bot = L.portrait ? H : hit + 44, lead = st.lead, ac = _hexCss(D0.col);
    /* lane panel */
    g.fillStyle = 'rgba(5,3,12,0.62)'; g.fillRect(x0, top, L.hw, bot - top);
    for (let i = 0; i < 4; i++) { g.globalAlpha = 0.07 + st.press[i] * 1.2; g.fillStyle = LANES[i].col; g.fillRect(x0 + i * lw, top, lw, bot - top); }
    g.globalAlpha = 1; g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 1; g.beginPath(); for (let i = 1; i < 4; i++) { g.moveTo(x0 + i * lw, top); g.lineTo(x0 + i * lw, bot); } g.stroke();
    g.strokeStyle = ac; g.lineWidth = 2; g.strokeRect(x0, top, L.hw, bot - top);
    const fade = g.createLinearGradient(0, top, 0, top + 70); fade.addColorStop(0, 'rgba(5,3,12,0.9)'); fade.addColorStop(1, 'rgba(5,3,12,0)'); g.fillStyle = fade; g.fillRect(x0, top, L.hw, 70);
    /* progress */
    const pr = clamp(T / st.endT, 0, 1); g.fillStyle = 'rgba(255,255,255,0.14)'; g.fillRect(x0, top - 7, L.hw, 4); g.fillStyle = ac; g.fillRect(x0, top - 7, L.hw * pr, 4);
    /* portrait phones: the score line lives above the lanes instead of in the corner box */
    if (L.portrait) {
      const r = Math.round(ratingNow() * 100), gl = Math.round(goal() * 100); g.textBaseline = 'alphabetic'; g.textAlign = 'left'; g.font = '800 30px "Chakra Petch", Rajdhani, "Arial Black", sans-serif'; g.fillStyle = ac; g.strokeStyle = 'rgba(0,0,0,0.8)'; g.lineWidth = 5; g.strokeText(String(st.score), x0 + 2, top - 16); g.fillText(String(st.score), x0 + 2, top - 16);
      g.textAlign = 'right'; g.font = '700 17px Rajdhani, "Arial Narrow", sans-serif'; g.fillStyle = '#fff'; const tx = 'Rating ' + (st.nj ? r + '%' : '—') + ' / ' + gl + '%  ·  ×' + st.mult; g.strokeText(tx, x0 + L.hw - 2, top - 16); g.fillText(tx, x0 + L.hw - 2, top - 16); g.textBaseline = 'middle';
    }
    /* hit line glow */
    g.fillStyle = 'rgba(255,255,255,0.2)'; g.fillRect(x0, hit - 1, L.hw, 2);
    /* receptors */
    const sz = lw * 0.62;
    for (let i = 0; i < 4; i++) { const px = x0 + (i + 0.5) * lw, k = 1 + st.press[i] * 1.4; arrow(g, px, hit, sz * k, LANES[i].rot); g.lineWidth = 3; g.strokeStyle = LANES[i].col; g.globalAlpha = 0.85; g.stroke(); if (st.press[i] > 0) { g.globalAlpha = Math.min(1, st.press[i] * 5); g.fillStyle = LANES[i].col; g.fill(); } g.globalAlpha = 1; }
    /* notes */
    for (let i = st.first; i < st.notes.length; i++) {
      const n = st.notes[i], dtn = n.t - T; if (dtn > lead + 0.05) break; if (n.s === 1) continue;
      const y = hit - dtn / lead * (hit - top); if (y > bot + 30) continue;
      arrow(g, x0 + (n.l + 0.5) * lw, y, sz * 1.02, LANES[n.l].rot); g.globalAlpha = n.s === 2 ? 0.28 : 1; g.fillStyle = LANES[n.l].col; g.fill(); g.lineWidth = 3; g.strokeStyle = n.s === 2 ? 'rgba(255,255,255,0.3)' : '#fff'; g.stroke(); g.globalAlpha = 1;
    }
    /* bursts */
    for (const b of st.fx) { const u = b.t / 0.4; g.globalAlpha = 1 - u; g.strokeStyle = b.col; g.lineWidth = 4 * (1 - u) + 1; g.beginPath(); g.arc(b.x, hit, sz * (0.5 + u * 1.1), 0, TAU); g.stroke(); } g.globalAlpha = 1;
    /* combo + judgement */
    g.textAlign = 'center'; g.textBaseline = 'middle'; const cy = top + (hit - top) * 0.42;
    if (st.combo >= 4) { g.globalAlpha = 0.3; g.fillStyle = '#fff'; g.font = '800 ' + Math.round(lw * 0.95) + 'px "Chakra Petch", Rajdhani, "Arial Black", sans-serif'; g.fillText(String(st.combo), L.cx, cy); g.font = '700 ' + Math.round(lw * 0.2) + 'px Rajdhani, sans-serif'; g.fillText('COMBO' + (st.mult > 1 ? ' · ×' + st.mult : ''), L.cx, cy + lw * 0.55); g.globalAlpha = 1; }
    if (st.jd && st.jd.t < 0.7) { const u = st.jd.t / 0.7, s = 1 + (1 - Math.min(1, u * 5)) * 0.35; g.globalAlpha = 1 - Math.max(0, (u - 0.5) * 2); g.fillStyle = st.jd.col; g.strokeStyle = 'rgba(0,0,0,0.8)'; g.lineWidth = 6; g.font = '800 ' + Math.round(lw * 0.42 * s) + 'px "Chakra Petch", Rajdhani, "Arial Black", sans-serif'; g.strokeText(st.jd.txt, L.cx, hit - lw * 1.15); g.fillText(st.jd.txt, L.cx, hit - lw * 1.15); g.globalAlpha = 1; }
    /* count-in */
    const bar = spb * 4;
    if (T < bar * FIRST_BAR) { const k = T < 0 ? 4 : 4 - Math.floor(T / spb); g.fillStyle = '#fff'; g.strokeStyle = 'rgba(0,0,0,0.85)'; g.lineWidth = 8; g.font = '800 ' + Math.round(lw * 1.5) + 'px "Chakra Petch", Rajdhani, "Arial Black", sans-serif'; g.strokeText(String(Math.max(1, k)), L.cx, cy); g.fillText(String(Math.max(1, k)), L.cx, cy); }
    else if (T < bar * FIRST_BAR + 0.8) { g.fillStyle = ac; g.strokeStyle = 'rgba(0,0,0,0.85)'; g.lineWidth = 8; g.font = '800 ' + Math.round(lw * 1.0) + 'px "Chakra Petch", Rajdhani, "Arial Black", sans-serif'; g.strokeText('DANCE!', L.cx, cy); g.fillText('DANCE!', L.cx, cy); }
  }

  /* ---------- play ---------- */
  const note = (lane, root, big) => { if (!Snd.ok || !Snd.ctx || !Music.bus) return; const t = Snd.ctx.currentTime; Snd.tone(t, mtof(root + 48 + [0, 3, 7, 12][lane]), 0.14, 'square', 0.05, 3200, 0.002, Music.bus); if (big) Snd.tone(t, mtof(root + 72 + [0, 3, 7, 12][lane]), 0.12, 'sine', 0.05, 6000, 0.002, Music.bus); };
  function judge(txt, col) { st.jd = { txt, col, t: 0 }; }
  function press(l) {
    if (!st || st.phase !== 'play') return; const T = songT(), tol = st.touch ? 1.2 : 1; st.press[l] = 0.16;
    let best = null, bd = 9;
    for (let i = st.first; i < st.notes.length; i++) { const n = st.notes[i]; if (n.t > T + WIN.o * tol + 0.02) break; if (n.s || n.l !== l) continue; const d = Math.abs(n.t - T); if (d <= WIN.o * tol && d < bd) { bd = d; best = n; } }
    if (!best) { if (T > spb * 4 * FIRST_BAR - 0.4) { st.score = Math.max(0, st.score - 10); st.ghost++; judge('OFF BEAT', '#b0b8c8'); } return; }
    const q = bd <= WIN.p * tol ? 'p' : bd <= WIN.g * tol ? 'g' : 'o'; best.s = 1; best.q = q; st.cnt[q]++; st.nj++;
    st.score += BASE[q] * st.mult; st.combo++; st.bestCombo = Math.max(st.bestCombo, st.combo); st.mult = Math.min(4, 1 + Math.floor(st.combo / 10));
    st.hype = clamp(st.hype + (q === 'p' ? 0.05 : q === 'g' ? 0.035 : 0.02), 0, 1); judge(QN[q], QC[q]); st.fx.push({ x: layout().x0 + (l + 0.5) * layout().lw, t: 0, col: LANES[l].col });
    S3.danc.mv = { lane: l, t: 0, a: q === 'p' ? 1 : q === 'g' ? 0.85 : 0.68, flip: (S3.danc.flip = !S3.danc.flip) }; S3.danc.stumble = 0; note(l, D0.root, q === 'p');
  }
  function miss(n) {
    n.s = 2; st.cnt.m++; st.nj++; st.combo = 0; st.mult = 1; st.hype = clamp(st.hype - 0.14, 0, 1); judge('MISS', '#ff6b6b'); S3.danc.stumble = 0.55; S3.danc.mv = null;
  }
  function ratingNow() { return st.nj ? clamp(st.score / st.cum[st.nj - 1], 0, 1) : 0; }
  G.init = function (V) { V0 = V; };
  G.enter = function (V) {
    V0 = V; const D = V.D; if (built !== D.cid) build(D); D0 = D; spb = 60 / D.bpm;
    ensureCanvas(); cv.style.display = 'none'; for (const k in held) held[k] = false;
    st = { phase: 'lobby', clock: 0, notes: [], first: 0, press: [0, 0, 0, 0], fx: [], jd: null, score: 0, combo: 0, bestCombo: 0, mult: 1, hype: 0.15, cnt: { p: 0, g: 0, o: 0, m: 0 }, ghost: 0, nj: 0, cum: [], endT: 1, lead: 1.5, t: 0, touch: false, flip: false };
    Music.start(D, 'idle'); G.cam.clearViewOffset();
  };
  G.begin = function (V, stake) {
    const D = V.D; if (built !== D.cid) build(D); V0 = V; D0 = D; spb = 60 / D.bpm; const lv = Math.max(0, D.stakes.indexOf(stake));
    ensureCanvas(); const notes = makeChart(D, lv), nr = mulberry32(D.cid * 31 + lv * 7 + 5); let cum = 0; const cumA = [];
    notes.forEach((n, i) => { cum += 100 * Math.min(4, 1 + Math.floor(i / 10)); cumA.push(cum); n.bj = (nr() - 0.5) * 0.02; });
    st = { phase: 'play', clock: -0.3, notes, first: 0, press: [0, 0, 0, 0], fx: [], jd: null, score: 0, combo: 0, bestCombo: 0, mult: 1, hype: 0.2, cnt: { p: 0, g: 0, o: 0, m: 0 }, ghost: 0, nj: 0, cum: cumA, endT: spb * 4 * END_BAR, lead: LEADS[lv], t: 0, touch: !!(typeof TouchIn !== 'undefined' && TouchIn.on), flip: false, lv };
    S3.danc.mv = null; S3.danc.stumble = 0; for (const k in held) held[k] = false; cv.style.display = 'block';
    Music.start(D, 'song'); V.say('Get ready…', 1.6);
  };
  G.cleanup = function () { Music.release(); if (cv) cv.style.display = 'none'; for (const k in held) held[k] = false; };
  G.key = function (V, code, down) {
    const l = KEYLANE[code]; if (l == null) return;
    if (!down) { held[code] = false; return; } if (held[code]) return; held[code] = true; press(l);
  };
  function onPtr(e) {
    if (!st || st.phase !== 'play' || App.mode !== 'venue' || Ven.g !== G) return;
    const L = layout(), x = e.clientX - E.gl.getBoundingClientRect().left; if (x < L.x0 - 8 || x > L.x0 + L.hw + 8) return;
    st.touch = e.pointerType === 'touch' || st.touch; press(clamp(Math.floor((x - L.x0) / L.lw), 0, 3)); e.preventDefault();
  }
  let ptrBound = false;
  function bindPtr() { if (ptrBound) return; ptrBound = true; E.gl.addEventListener('pointerdown', onPtr); }
  G.lobby = function (V) {
    bindPtr(); const i = stakeIdx(); G.rules = 'Arrows fall down four lanes to the club\'s own beat. Hit <b>← ↓ ↑ →</b> (or <b>A S W D</b>, or tap the lanes) as they reach the line. Perfect, great and good hits build a combo and a ×2 to ×4 multiplier. Reach a rating of <b>' + Math.round(GOALS[i] * 100) + '%</b> to win ×2 your bet · <b>A</b> pays ×2.5 · <b>S</b> pays ×3.';
  };
  G.update = function (V, dt) {
    dt = Math.min(dt, 0.1); st.clock += dt; const T = songT(); st.t += dt;
    for (let i = 0; i < 4; i++) st.press[i] = Math.max(0, st.press[i] - dt); if (st.jd) st.jd.t += dt;
    for (let i = st.fx.length - 1; i >= 0; i--) { st.fx[i].t += dt; if (st.fx[i].t > 0.4) st.fx.splice(i, 1); }
    if (st.phase === 'play') {
      if (G.bot) for (let i = st.first; i < st.notes.length; i++) { const n = st.notes[i]; if (n.t > T + 0.3) break; if (n.s || n.skip) continue; if (T >= n.t + n.bj + (G.bot.late || 0)) press(n.l); }
      for (let i = st.first; i < st.notes.length; i++) { const n = st.notes[i]; if (n.t > T - WIN.o * (st.touch ? 1.2 : 1)) break; if (!n.s) miss(n); }
      while (st.first < st.notes.length && (st.notes[st.first].s || st.notes[st.first].t < T - WIN.o * 1.3)) st.first++;
      if (T >= st.endT) { st.phase = 'over'; st.t = 0; V.say(st.nj ? 'Song over!' : 'Song over', 1.6); }
    } else if (st.phase === 'over') { if (st.t > 1.3) finish(); }
    sceneFrame(dt, T, true); if (cv && st.phase !== 'done') draw(T);
  };
  function finish() {
    const rating = ratingNow(), g = goal(), stake = V0.stake, win = rating >= g, grade = rating >= 0.92 ? 'S' : rating >= 0.82 ? 'A' : rating >= 0.68 ? 'B' : rating >= 0.5 ? 'C' : 'D';
    st.phase = 'done'; cv.style.display = 'none'; st.grade = grade; st.rating = rating;
    const pay = !win ? 0 : stake ? Math.round(stake * (grade === 'S' ? 3 : grade === 'A' ? 2.5 : 2)) : (grade === 'S' ? 60 : grade === 'A' ? 40 : 25);
    S3.danc.stumble = 0; if (win) st.hype = 1; else st.hype = 0.05;
    const r = venRec('dance'); r.best = Math.max(r.best || 0, st.score); r.bc = r.bc || {}; r.bc[V0.D.cid] = Math.max(r.bc[V0.D.cid] || 0, st.score); r.grade = r.grade || {}; { const old = r.grade[V0.D.cid]; if (!old || 'SABCD'.indexOf(grade) < 'SABCD'.indexOf(old)) r.grade[V0.D.cid] = grade; }
    V0.finish(win, win ? (grade === 'S' ? 'Show stopper!' : 'Crowd pleaser') : 'Off the beat', ['Rating ' + Math.round(rating * 100) + '% (goal ' + Math.round(g * 100) + '%) · grade ' + grade + ' · ' + st.score + ' pts', 'Perfect ' + st.cnt.p + ' · Great ' + st.cnt.g + ' · Good ' + st.cnt.o + ' · Miss ' + st.cnt.m, 'Best combo ' + st.bestCombo + (st.ghost ? ' · ' + st.ghost + ' stray taps' : '')], pay);
  }
  G.idle = function (V, dt) { if (!st || !S3) return; dt = Math.min(dt, 0.1); st.clock += dt; const T = songT(); st.hype += (((st.phase === 'done' && st.rating >= goal()) ? 1 : 0.2) - st.hype) * Math.min(1, dt * 0.5); sceneFrame(dt, T, false); };
  G.hud = function () {
    if (!st || layout().portrait) return ''; const r = Math.round(ratingNow() * 100), gl = Math.round(goal() * 100);
    return '<span class="big">' + st.score + '</span><div class="r"><span>Combo</span><b>' + st.combo + '</b></div><div class="r"><span>Multiplier</span><b class="' + (st.mult > 1 ? 'good' : '') + '">×' + st.mult + '</b></div><div class="r"><span>Rating</span><b class="' + (st.nj && r >= gl ? 'good' : '') + '">' + (st.nj ? r + '%' : '—') + ' / ' + gl + '%</b></div>';
  };
  G.hint = function () { return st && st.phase === 'play' ? (st.touch ? 'Tap the lanes in time with the music' : 'Hit <em>← ↓ ↑ →</em> (or <em>A S W D</em>) as the arrows reach the line') : ''; };
  G.recText = function (rec) { const D = (V0 && V0.D) || Ven.D, b = (rec.bc && D && rec.bc[D.cid]) || 0, g = rec.grade && D ? rec.grade[D.cid] : ''; return ['Best here', b ? b + (g ? ' · ' + g : '') : '—']; };
  G.dbg = () => st;
  G.rig = { mkDancer, applyPose, idlePose, movePose, newPose, PK, animDancer };
  G.api = { press, makeChart, Music, GOALS, LEADS, rating: ratingNow, songT, layout, S3: () => S3, st: () => st, advance(sec, step) { step = step || 1 / 60; for (let t = 0; t < sec; t += step) { if (Ven.phase !== 'play' && (!st || st.phase !== 'over')) break; G.update(Ven, step); } } };
  return G;
})();
