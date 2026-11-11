/* ================= CLUB ZENITH SHOWROOM: a ticketed live show (Fairhaven) =================
   The one club with a cover charge. The curtain stays shut until you buy a ticket at the door: Standing (the floor), Front row (right at the stage) or
   VIP booth (roaming cameras, an encore and a free drink). Then the curtain goes up on tonight's headliner for a choreographed set to the club's own
   beat: a disco strut, a spinning number, a slow burn and a grand finale. The headliner is random: every visit to the lobby hires a different dancer (name,
   hair, outfit, colours) with a freshly shuffled routine (rollStar). You can throw tips as they dance (Space, Enter or the Tip button): every tip costs real
   money, gets a reaction from the stage and sets the crowd off. Built on the same dancer rig as the dance floor (08_ven_dance_game.js). */
Ven.games.show = (function () {
  const TIP = 20, BARS = [24, 24, 32], PZ = -7.4;
  const TIERN = ['Standing', 'Front row', 'VIP booth'], ACTN = ['Curtain up', 'Number one · Disco strut', 'Number two · Spin city', 'Slow burn', 'Grand finale', 'Bows', 'Encore', 'Final bow'];
  const HYPE = [0.2, 0.45, 0.65, 0.3, 0.95, 0.7, 1, 0.9];
  /* tonight's headliner: random name, look and routine (lanes 0/3 = side moves, 1 = crouch, 2 = jump; one 8-beat phrase per act, repeated) */
  const NAMES = ['Vega', 'Nova', 'Onyx', 'Sable', 'Juno', 'Echo', 'Lux', 'Zephyr', 'Indigo', 'Mirage', 'Rio', 'Kestrel'];
  const SKINS = [0xf6d3b0, 0xe8b88a, 0xc89870, 0xa8704a, 0x7a4a2e, 0x4a2c1c], HAIRC = [0x15100c, 0x3a2414, 0x7a4a22, 0xd8b060, 0xe8e0d0, 0xc8205a, 0x2fb8c8, 0x7a3fd0];
  const TOPC = [0xffc83d, 0xff4fa8, 0x2fd8ff, 0xb06bff, 0xff6a3d, 0x4dff9a, 0xf2f2f8, 0xff3030], PANC = [0x2a1a4a, 0x14141c, 0x1a2a4a, 0x4a1a2a, 0x1e3a34, 0x3a3a48], SHOEC = [0xe8e8f0, 0x15151a, 0xffd23d, 0xff4fa8, 0x2fd8ff];
  const HAIRS = ['short', 'puff', 'long', 'bun'], OUTF = ['suit', 'skirt', 'jumpsuit', 'sleeves'];
  const SPINS = { 2: [[7], [3], [5], [1, 5]], 4: [[3, 7], [1, 5], [2, 6], [3, 6], [1, 7]], 6: [[3, 7], [1, 5], [2, 6], [3, 6], [1, 7]] };
  const emi = (c, k) => new THREE.Color(c).multiplyScalar(k || 0.35).getHex();
  function rollPat(r, act) {
    const W = { 1: [5, 2, 1], 2: [3, 2, 3], 4: [2, 2, 4], 6: [2, 3, 3] }[act], tot = W[0] + W[1] + W[2], cats = [];
    for (let m = 0; m < 8; m++) { let k, n = 0; do { const x = r() * tot; k = x < W[0] ? 0 : x < W[0] + W[1] ? 1 : 2; } while (++n < 8 && m >= 2 && cats[m - 1] === k && cats[m - 2] === k); cats.push(k); }
    if (act !== 1 && cats.indexOf(2) < 0) cats[7] = 2;
    if (cats.indexOf(0) < 0) cats[(r() * 8) | 0] = 0;
    let side = r() < 0.5 ? 0 : 3; return cats.map((k) => (k === 0 ? (side = r() < 0.75 ? 3 - side : side) : k));
  }
  function rollStar(seed, lastName) {
    const r = mulberry32(seed), pick = (a) => a[(r() * a.length) | 0];
    let ni = (r() * NAMES.length) | 0; if (NAMES[ni] === lastName) ni = (ni + 1) % NAMES.length;
    const outfit = pick(OUTF), top = pick(TOPC); let pants = pick(PANC), sleeve = null, skirt = null;
    if (outfit === 'jumpsuit') pants = top; else if (outfit === 'sleeves') { do { sleeve = pick(TOPC); } while (sleeve === top); } else if (outfit === 'skirt') skirt = pick(TOPC);
    const opts = { skin: pick(SKINS), top, topEm: emi(top), pants, shoes: pick(SHOEC), hair: pick(HAIRC), hairStyle: pick(HAIRS), scale: 0.98 + r() * 0.12, ph: 0 };
    if (sleeve != null) { opts.sleeve = sleeve; opts.sleeveEm = emi(sleeve); } if (skirt != null) { opts.skirt = skirt; opts.skirtEm = emi(skirt); }
    const pat = {}, spin = {}; for (const a of [1, 2, 4, 6]) pat[a] = rollPat(r, a); for (const a of [2, 4, 6]) spin[a] = pick(SPINS[a]);
    return { name: NAMES[ni], outfit, hairStyle: opts.hairStyle, opts, pat, spin, entry: r() < 0.5 ? -1 : 1, dir: r() < 0.5 ? -1 : 1, per: pick([8, 8, 16]), amp: 0.8 + r() * 0.45, seed };
  }
  const FANS = [[0, 'Newcomer'], [100, 'Regular'], [400, 'Superfan'], [1000, 'Number one fan']];
  const SHOTS = [
    [{ p: [0, 1.75, -1.3], l: [0, 2.2, PZ], fov: 38 }],
    [{ p: [0, 1.55, -2.5], l: [0, 2.2, PZ], fov: 44 }],
    [{ p: [-7.0, 3.5, -1.5], l: [0.5, 2.2, PZ], fov: 42 }, { p: [0.3, 1.8, -3.0], l: [0, 2.3, PZ], fov: 46 }, { p: [-5.4, 2.0, -6.3], l: [1.0, 2.1, -7.6], fov: 46 }, { p: [0, 5.0, -3.2], l: [0, 1.5, PZ], fov: 42 }, { p: [3.5, 1.7, -3.2], l: [-0.5, 2.3, PZ], fov: 44 }]
  ];
  const G = { ready: false, sc: null, cam: null, expo: 1.2, stakeLabel: 'Ticket', lobbyHint: 'The curtain is down · pick a ticket and press Play to see the show', rules: '' };
  let st = null, V0 = null, S3 = null, D0 = null, spb = 60 / 124, perf = null, conf = null, pops = null, star = null, seedNext = null;
  const held = {}, GEO = {}, lerpf = (a, b, t) => a + (b - a) * t, ease = (u) => u * u * (3 - 2 * u);
  const rig = () => Ven.games.dance.rig;
  const mkSec = (total) => (bar) => (bar === 0 ? 0 : bar === 1 ? 1 : (bar === 14 || bar === 15) ? 2 : (bar >= total - 2 || (total > 24 && (bar === 22 || bar === 23))) ? 1 : 3);
  const actOf = (bar, total) => (bar < 2 ? 0 : bar < 8 ? 1 : bar < 14 ? 2 : bar < 16 ? 3 : bar < 22 ? 4 : bar >= total - 2 ? 7 : bar < 24 ? 5 : 6);
  const fanName = (tips) => { let n = FANS[0][1]; for (const f of FANS) if (tips >= f[0]) n = f[1]; return n; };
  const songT = () => {
    if (!G.fixed && Music.mode !== 'off' && Music.ok() && Snd.ctx.state === 'running') return Snd.ctx.currentTime - (Snd.ctx.outputLatency || Snd.ctx.baseLatency || 0.02) - Music.A0;
    return st.clock;
  };

  /* ---------- the room ---------- */
  function mkCurtain(side) {
    const g = new THREE.Group(), m1 = venMat(0x7a1440, 0.95), m2 = venMat(0x4c0c2a, 0.95), w = 0.5625; g.position.set(side * 4.5, 0, -4.55);
    for (let i = 0; i < 8; i++) venBox(g, w * 0.98, 6.9, 0.3 + (i & 1) * 0.12, -side * (i * w + w / 2), 3.45, 0, i & 1 ? m2 : m1);
    return g;
  }
  function mkConfetti(sc) {
    const N = 240, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), vel = [], life = new Float32Array(N);
    for (let i = 0; i < N; i++) { pos[i * 3 + 1] = -50; vel.push([0, 0, 0]); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.17, vertexColors: true, transparent: true, depthWrite: false, fog: false })); pts.frustumCulled = false; sc.add(pts);
    const r = mulberry32(77);
    return {
      pts,
      burst(n, cx, cy, cz, pal) {
        for (let k = 0, i = 0; k < n && i < N; i++) {
          if (life[i] > 0) continue; k++; const c = pal[(r() * pal.length) | 0]; pos[i * 3] = cx + (r() - 0.5) * 6; pos[i * 3 + 1] = cy + r() * 0.8; pos[i * 3 + 2] = cz + (r() - 0.5) * 3; col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
          vel[i][0] = (r() - 0.5) * 3.2; vel[i][1] = 0.5 + r() * 2.8; vel[i][2] = (r() - 0.5) * 3; life[i] = 3.2 + r() * 1.6;
        }
        geo.attributes.color.needsUpdate = true;
      },
      update(dt) {
        let any = false;
        for (let i = 0; i < N; i++) { if (life[i] <= 0) continue; any = true; life[i] -= dt; const v = vel[i]; v[1] -= 2.6 * dt; v[0] *= 0.995; pos[i * 3] += v[0] * dt; pos[i * 3 + 1] += v[1] * dt; pos[i * 3 + 2] += v[2] * dt; if (pos[i * 3 + 1] < 0.95 || life[i] <= 0) { life[i] = 0; pos[i * 3 + 1] = -50; } }
        if (any) geo.attributes.position.needsUpdate = true;
      }
    };
  }
  function build(D) {
    const RG = rig(), pal = D.pal.map((h) => lc(h)), WW = 18, DD = 22, HH = 7.6;
    const sc = G.sc = venRoom({ w: WW, d: DD, h: HH, bg: 0x050309, floor: 0x0c0a12, wall: 0x1a1024, ceilc: 0x07050c, hemi: 0.4, sky: 0x8a7ac8, gnd: 0x120e1a, fog: [18, 42] });
    S3 = { pal, tiles: [], beams: [], crowd: [], curt: [mkCurtain(-1), mkCurtain(1)], led: null, tables: [] };
    const dk = venMat(0x0e0c14, 0.6, 0.2);
    /* stage */
    venBox(sc, 9.4, 0.9, 6.0, 0, 0.45, PZ - 0.2, venMat(0x120e1c, 0.5, 0.3)); venBox(sc, 9.5, 0.06, 0.1, 0, 0.88, -4.55, venMat(0x000000, 1, 0, D.pal[0]));
    const tg = GEO.tile || (GEO.tile = (() => { const g = new THREE.BoxGeometry(0.94, 0.06, 0.94); g.userData.keep = true; return g; })());
    for (let j = 0; j < 5; j++) for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(tg, new THREE.MeshBasicMaterial({ color: pal[0].clone() })); m.position.set(-3.5 + i, 0.93, -9.7 + j); sc.add(m); S3.tiles.push({ m, i, j }); }
    for (const x of [-4.9, 4.9]) venBox(sc, 0.5, 7.2, 0.5, x, 3.6, -4.5, dk);
    venBox(sc, 10.4, 1.3, 0.5, 0, 6.95, -4.5, dk); venBox(sc, 10.2, 0.08, 0.1, 0, 6.28, -4.2, venMat(0x000000, 1, 0, D.pal[2])); venBox(sc, 10.2, 0.08, 0.1, 0, 7.55, -4.2, venMat(0x000000, 1, 0, D.pal[0]));
    sc.add(S3.curt[0], S3.curt[1]);
    /* the LED wall behind the stage */
    const lc2 = mkCanvas(512, 256), lt = new THREE.CanvasTexture(lc2); lt.encoding = THREE.sRGBEncoding;
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 4.8), new THREE.MeshBasicMaterial({ map: lt, color: new THREE.Color(0.62, 0.62, 0.62) })); wall.position.set(0, 3.7, -DD / 2 + 0.12); sc.add(wall); S3.led = { cv: lc2, g: lc2.getContext('2d'), tex: lt, n: 1 };
    venBox(sc, 9.9, 0.1, 0.1, 0, 6.15, -DD / 2 + 0.1, venMat(0x000000, 1, 0, D.pal[1])); venBox(sc, 9.9, 0.1, 0.1, 0, 1.25, -DD / 2 + 0.1, venMat(0x000000, 1, 0, D.pal[0]));
    /* speakers either side of the stage */
    for (const sx of [-6.6, 6.6]) { venBox(sc, 1.6, 3.4, 1.4, sx, 1.7, -8.2, dk); for (const [yy, rr] of [[0.9, 0.5], [2.5, 0.4]]) { const c = venCyl(sc, rr, rr * 0.8, 0.16, sx, yy, -7.47, venMat(0x1a1822, 0.5, 0.3), 24); c.rotation.x = Math.PI / 2; } }
    /* neon on the side walls */
    for (const [x, c] of [[-8.85, D.pal[0]], [8.85, D.pal[2]]]) for (let k = 0; k < 3; k++) venBox(sc, 0.08, 5.6, 0.08, x, 3.4, -2 + k * 4.5, venMat(0, 1, 0, c));
    /* VIP balcony on the left, cocktail tables on the right */
    venBox(sc, 2.4, 0.2, 5.4, -7.8, 2.4, -1.5, venMat(0x1a1424, 0.7, 0.1)); for (const [x, z] of [[-8.8, -4], [-8.8, 1], [-6.8, -4], [-6.8, 1]]) venCyl(sc, 0.09, 0.09, 2.4, x, 1.2, z, dk, 8);
    venBox(sc, 0.06, 0.9, 5.4, -6.62, 2.95, -1.5, venMat(0x000000, 1, 0, D.pal[0])); venBox(sc, 0.9, 0.5, 2.0, -8.4, 2.75, -2.4, venMat(0x5a1038, 0.9)); venBox(sc, 0.9, 0.5, 2.0, -8.4, 2.75, 0.2, venMat(0x5a1038, 0.9));
    for (const [x, z] of [[6.2, -1.2], [6.8, 2.0], [-5.6, 3.4], [5.4, 4.6]]) { venCyl(sc, 0.04, 0.04, 0.95, x, 0.48, z, dk, 6); venCyl(sc, 0.42, 0.42, 0.05, x, 0.98, z, venMat(0x20182c, 0.4, 0.4), 18); const cd = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), venMat(0xffc060, 0.5, 0, 0xff9a30)); cd.position.set(x, 1.06, z); sc.add(cd); }
    /* beams and follow spots hang from a truss above the stage */
    const cg = GEO.cone || (GEO.cone = (() => { const g = new THREE.ConeGeometry(0.55, 9, 14, 1, true); g.userData.keep = true; return g; })());
    const fg = GEO.fcone || (GEO.fcone = (() => { const g = new THREE.ConeGeometry(1.2, 14, 16, 1, true); g.userData.keep = true; return g; })());
    venBox(sc, 11, 0.16, 0.16, 0, 7.1, -5.4, dk);
    for (let i = 0; i < 6; i++) {
      const pv = new THREE.Group(); pv.position.set(-4.5 + i * 1.8, 6.95, -5.4); const m = new THREE.Mesh(cg, new THREE.MeshBasicMaterial({ color: pal[i % 4].clone().multiplyScalar(0.9), transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })); m.rotation.x = -Math.PI / 2; m.position.z = 4.5; pv.add(m); sc.add(pv); S3.beams.push({ pv, m, i, spot: false });
    }
    for (const sx of [-6, 6]) { const pv = new THREE.Group(); pv.position.set(sx, 7.2, 1.0); const m = new THREE.Mesh(fg, new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.92, 0.75).multiplyScalar(0.8), transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })); m.rotation.x = -Math.PI / 2; m.position.z = 7; pv.add(m); sc.add(pv); S3.beams.push({ pv, m, i: 9, spot: true }); }
    /* lights */
    S3.lights = []; for (let i = 0; i < 2; i++) { const l = new THREE.PointLight(pal[i * 2 % 4], 1.2, 13, 1.5); l.position.set(0, 4, -5.5); sc.add(l); S3.lights.push(l); }
    const key = new THREE.PointLight(lc(0xfff0e0), 0.6, 12, 1.4); key.position.set(0, 3.4, -3.2); sc.add(key);
    /* tonight's headliner (a new one is hired on every visit, see hire) */
    hire();
    /* the audience, facing the stage */
    const SK = [0xf0c8a0, 0xc89870, 0x8a5a38, 0xe0b088, 0x5a3a24], HAIR = [0x15100c, 0x3a2414, 0xc8a050, 0x6a2a18, 0x222a40], cr = mulberry32(600 + D.cid);
    for (const [x, z] of [[-3.2, -1.2], [-2.0, -2.2], [2.2, -2.0], [3.3, -1.0], [-4.4, 0.8], [-1.8, 1.4], [1.6, 1.8], [4.2, 1.2], [-3.0, 3.2], [0.4, 3.6], [3.0, 3.0], [-5.5, -2.6], [5.4, -2.4], [-2.5, -3.4], [2.7, -3.5]]) {
      const col = D.pal[(cr() * 4) | 0], d = RG.mkDancer({ skin: SK[(cr() * 5) | 0], top: col, topEm: (new THREE.Color(col).multiplyScalar(0.16)).getHex(), pants: [0x1a1a2a, 0x2a1a1a, 0x1a2a20, 0x222222][(cr() * 4) | 0], shoes: 0x202020, hair: HAIR[(cr() * 5) | 0], scale: 0.9 + cr() * 0.14, ph: cr() * 2 });
      d.root.position.set(x, 0, z); d.root.rotation.y = Math.atan2(-x, PZ - z); sc.add(d.root); S3.crowd.push(d);
    }
    conf = mkConfetti(sc); pops = Ven.pops(sc);
    const cam = G.cam = new THREE.PerspectiveCamera(40, 16 / 9, 0.05, 70); cam.position.set(0, 1.7, 0.8); cam.lookAt(0, 2.3, PZ);
    D0 = D; spb = 60 / D.bpm;
  }

  /* ---------- the headliner ---------- */
  function dress() {
    const old = perf; if (old) { G.sc.remove(old.root); old.root.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); }
    perf = rig().mkDancer(star.opts); perf.root.position.set(star.entry * 4.3, 0.96, PZ); perf.root.visible = false; G.sc.add(perf.root); perf.bow = 0;
  }
  function hire(seed) {
    if (seed == null) { seed = seedNext != null ? seedNext : (Math.random() * 4294967296) >>> 0; seedNext = null; }
    star = rollStar(seed, star ? star.name : ''); dress();
    G.lobbyHint = 'Tonight\'s headliner: ' + star.name + ' · pick a ticket and press Play to open the curtain';
  }

  /* ---------- state ---------- */
  function newSt(tier) {
    const sh = SHOTS[tier][0];
    return { phase: 'lobby', clock: 0, tier, bars: BARS[tier], endT: 0, t: 0, cur: 0, hype: 0.15, tipB: 0, tipTotal: 0, tipN: 0, shout: false, lastBeat: -1, spinT: -1, px: -4.3, act: 0, cp: { p: sh.p.slice(), l: sh.l.slice(), fov: sh.fov }, ledN: 0, did: {} };
  }
  G.init = function (V) { V0 = V; };
  G.enter = function (V) {
    V0 = V; const D = V.D; if (!G.sc) build(D); else hire(); D0 = D; spb = 60 / D.bpm;
    for (const k in held) held[k] = false; st = newSt(Math.max(0, D.stakes.indexOf(V.stake))); for (const c of S3.curt) c.scale.x = 1;
    conf.burst(0, 0, 0, 0, S3.pal); pops.clear(); Music.start(D, 'idle'); G.cam.clearViewOffset();
  };
  G.begin = function (V, stake) {
    V0 = V; const D = V.D, tier = Math.max(0, D.stakes.indexOf(stake)), rec = venRec('show'); if (!G.sc) build(D); D0 = D; spb = 60 / D.bpm;
    rec.spent = (rec.spent || 0) + stake; writeSave(); for (const k in held) held[k] = false;
    st = newSt(tier); st.phase = 'play'; st.clock = -0.3; st.endT = BARS[tier] * spb * 4; perf.root.visible = false; perf.root.position.x = star.entry * 4.3; perf.root.rotation.y = 0; perf.mv = null; perf.bow = 0; pops.clear();
    Music.start(D, 'song', BARS[tier], mkSec(BARS[tier])); Ven.tool('tip', 'Tip ' + money(TIP) + ' (Space)', tip).hidden = false;
    V.say(tier === 2 ? 'VIP booth · enjoy the show' : tier === 1 ? 'Front row · enjoy the show' : 'Doors open · enjoy the show', 3);
  };
  G.cleanup = function () { Music.release(); for (const k in held) held[k] = false; if (pops) pops.clear(); if (S3) { for (const c of S3.curt) c.scale.x = 1; if (perf) perf.root.visible = false; } };
  function tip() {
    if (!st || st.phase !== 'play' || st.cur < 0.6) return;
    if (save.money < TIP) { V0.say('Not enough cash for a tip', 1.4); return; }
    save.money -= TIP; st.tipTotal += TIP; st.tipN++; const rec = venRec('show'); rec.tips = (rec.tips || 0) + TIP; rec.spent = (rec.spent || 0) + TIP; writeSave();
    perf.mv = { lane: 2, t: 0, a: 1, flip: true }; st.tipB = Math.min(0.5, st.tipB + 0.18);
    pops.add('$' + TIP, '#ffe14a', perf.root.position.x + (Math.random() - 0.5) * 1.6, 3.5, PZ + 0.8, 0.36); conf.burst(14, perf.root.position.x, 4.6, PZ + 1, S3.pal);
    if (Snd.ok) { const t = Snd.ctx.currentTime; Snd.tone(t, 1320, 0.1, 'triangle', 0.14, 6000, 0.002, Snd.sfx); Snd.tone(t + 0.07, 1760, 0.14, 'triangle', 0.12, 6000, 0.002, Snd.sfx); }
    if (!st.shout && st.tipTotal >= 100) { st.shout = true; conf.burst(70, 0, 5.4, PZ + 1, S3.pal); V0.say(star.name + ': "Look at you! Thank you, Fairhaven!"', 3.2); }
  }
  G.key = function (V, code, down) {
    if (down) { if (held[code]) return; held[code] = true; if (code === 'Space' || code === 'Enter' || code === 'KeyT') tip(); } else held[code] = false;
  };

  /* ---------- the choreography ---------- */
  function onBeat(b) {
    const bar = b >> 2, act = actOf(bar, st.bars), m = b & 7; st.act = act; let lane = -1, a = 1;
    if (star.pat[act]) lane = star.pat[act][m]; else if (act === 3 && (b & 1) === 0) { lane = [1, 2][(b >> 1) & 1]; a = 0.65; }
    if (lane >= 0 && !perf.mv) perf.mv = { lane, t: 0, a, flip: ((b >> 3) & 1) === 1 ? (b & 1) === 0 : (b & 1) === 1 };
    else if (lane >= 0 && perf.mv.t > 0.18) perf.mv = { lane, t: 0, a, flip: ((b >> 3) & 1) === 1 ? (b & 1) === 0 : (b & 1) === 1 };
    if (star.spin[act] && star.spin[act].indexOf(m) >= 0) st.spinT = 0;
    const burstAt = (key, n) => { if (!st.did[key]) { st.did[key] = 1; conf.burst(n, 0, 5.6, PZ + 1, S3.pal); } };
    if (b === 64) burstAt('fin', 80); if (b === (st.bars - 2) * 4) burstAt('bow', 120); if (st.bars > 24 && b === 96) burstAt('enc', 90);
  }
  function animPerf(dt, bt, T, h) {
    const RG = rig(), d = perf, P = d.tgt; RG.idlePose(P, bt, h, 0);
    if (d.mv) { d.mv.t += dt; const e = d.mv.a * Math.exp(-d.mv.t * 2.2) * Math.min(1, d.mv.t / 0.05 + 0.4); if (e > 0.02) RG.movePose(P, d.mv.lane, e, d.mv.flip, d.mv.t); else d.mv = null; }
    if (d.bow > 0.01) { const e = d.bow; P.sx = lerpf(P.sx, 0.75, e); P.hx = lerpf(P.hx, 0.45, e); P.a0z = lerpf(P.a0z, -0.75, e); P.a1z = lerpf(P.a1z, 0.75, e); P.a0x = lerpf(P.a0x, 0.3, e); P.a1x = lerpf(P.a1x, 0.3, e); P.a0e = P.a1e = lerpf(P.a1e, -0.3, e); P.l0k = P.l1k = lerpf(P.l1k, 0.25, e); }
    const f = 1 - Math.exp(-dt * (d.mv && d.mv.t < 0.25 ? 26 : 12)), C = d.cur; for (const k of RG.PK) C[k] += (P[k] - C[k]) * f; RG.applyPose(d);
  }

  /* ---------- per frame ---------- */
  function drawLed(T, playing) {
    const L = S3.led; L.n += 1 / 60; if (L.n < 0.07) return; L.n = 0; const g = L.g, w = 512, h = 256, pal = D0.pal, hx = (c) => '#' + (c & 0xffffff).toString(16).padStart(6, '0'), bt = T / spb, pulse = Math.exp(-(bt - Math.floor(bt)) * 3.2);
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#07040e'); gr.addColorStop(1, hx(pal[0]) + '66'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.textAlign = 'center'; g.fillStyle = '#fff';
    if (!playing) {
      g.font = '700 46px "Chakra Petch", Rajdhani, "Arial Black", sans-serif'; g.fillText('LIVE TONIGHT', w / 2, 88); g.fillStyle = hx(pal[3]); g.font = '700 64px "Chakra Petch", Rajdhani, "Arial Black", sans-serif'; g.fillText(star.name.toUpperCase(), w / 2, 158);
      g.fillStyle = '#fff'; g.font = '600 26px Rajdhani, "Arial Narrow", sans-serif'; g.fillText('TICKETS FROM ' + money(D0.ticket.min) + ' · AT THE DOOR', w / 2, 212); return;
    }
    for (let i = 0; i < 28; i++) { const v = 0.15 + 0.85 * (0.5 + 0.5 * Math.sin(T * (2.4 + (i % 5) * 0.7) + i * 1.7)) * (0.35 + 0.65 * (pulse * 0.7 + 0.3 + st.hype * 0.3)); g.fillStyle = hx(pal[(i + st.act) % 4]); g.fillRect(10 + i * 17.7, h - 14 - v * 130, 13, v * 130); }
    g.fillStyle = '#fff'; g.font = '700 38px "Chakra Petch", Rajdhani, sans-serif'; g.fillText(star.name.toUpperCase() + ' · LIVE', w / 2, 50); g.font = '600 22px Rajdhani, sans-serif'; g.fillText(ACTN[st.act].toUpperCase(), w / 2, 84);
  }
  function frame(dt, T, playing) {
    const bt = T / spb, fb = bt - Math.floor(bt), pulse = Math.exp(-fb * 3.2), bar = Math.floor(T / (spb * 4)), pal = S3.pal, barLen = spb * 4, running = playing && (st.phase === 'play' || st.phase === 'over');
    /* act, hype, curtain */
    if (running && T >= 0) { const bi = Math.floor(bt); if (bi !== st.lastBeat) { st.lastBeat = bi; if (st.phase === 'play') onBeat(bi); } st.act = actOf(Math.max(0, bar), st.bars); }
    const baseH = st.phase === 'lobby' ? 0.12 : running ? HYPE[st.act] : 0.15; st.tipB = Math.max(0, st.tipB - dt * 0.08); st.hype += (clamp(baseH + st.tipB, 0, 1) - st.hype) * Math.min(1, dt * 1.5);
    const wantOpen = st.phase === 'play' || (st.phase === 'over' && st.t < 1.6) ? 1 : 0; st.cur = clamp(st.cur + (wantOpen ? 1 : -1) * dt / 1.8, 0, 1);
    const cs = lerpf(1, 0.1, ease(st.cur)); S3.curt[0].scale.x = cs; S3.curt[1].scale.x = cs;
    /* performer */
    const showP = running && st.cur > 0.3 && T > barLen * 0.7 || (st.phase === 'done' && st.cur > 0.3); perf.root.visible = !!showP;
    if (perf.root.visible) {
      const act = st.act; let tx = 0; const A = star.amp * star.dir, sw = (amp) => Math.sin(bt * Math.PI * 2 / star.per) * amp * A;
      if (act === 0) tx = lerpf(star.entry * 4.3, 0, clamp(T / barLen - 1, 0, 1)); else if (act === 1) tx = sw(1.0); else if (act === 2) tx = sw(2.2); else if (act === 4 || act === 6) tx = sw(3.0); else tx = 0;
      perf.root.position.x += (tx - perf.root.position.x) * (1 - Math.exp(-dt * 4)); st.px = perf.root.position.x;
      if (st.spinT >= 0) { st.spinT += dt; const u = Math.min(1, st.spinT / 0.95); perf.root.rotation.y = ease(u) * TAU; if (u >= 1) { st.spinT = -1; perf.root.rotation.y = 0; } }
      perf.bow = (act === 5 || act === 7) && running ? 0.5 - 0.5 * Math.cos((T / barLen) * TAU) : 0;
      animPerf(dt, bt, T, st.hype);
    }
    S3.crowd.forEach((d) => rig().animDancer(d, bt, dt, running ? clamp(st.hype * 1.1, 0, 1) : 0.15, false));
    /* tiles, beams, lights */
    const bi = Math.floor(bt), lit = st.phase === 'lobby' ? 0.35 : 1;
    for (const t of S3.tiles) { const c = pal[(((t.i + t.j * 2 + bi + st.act) % pal.length) + pal.length) % pal.length]; t.m.material.color.copy(c).multiplyScalar((0.06 + 0.17 * pulse + 0.15 * st.hype + (((t.i + t.j) & 1) ? 0.04 : 0)) * lit); }
    for (const b of S3.beams) {
      if (b.spot) { b.pv.lookAt(perf.root.position.x * 0.8 + (b.pv.position.x > 0 ? -0.4 : 0.4), 1.9, PZ); b.m.material.opacity = running ? 0.035 + 0.015 * pulse : 0.01; }
      else { b.pv.lookAt(Math.sin(T * 0.8 + b.i * 1.3) * 3.6, 0.9, PZ + Math.cos(T * 0.6 + b.i * 2.1) * 2.6); b.m.material.opacity = (0.018 + 0.03 * pulse + 0.03 * st.hype) * (running ? 1 : 0.4); }
    }
    S3.lights.forEach((l, i) => { l.position.set(Math.sin(T * 0.7 + i * 3.1) * 3.6, 4, PZ + 1 + Math.cos(T * 0.9 + i * 2.3) * 1.6); l.intensity = (0.55 + 0.45 * pulse + 0.35 * st.hype) * (running ? 1 : 0.3); });
    drawLed(T, running); S3.led.tex.needsUpdate = true; conf.update(dt); pops.update(dt);
    /* camera */
    const tier = st.tier, shots = SHOTS[tier], shot = st.phase === 'lobby' || st.phase === 'done' || st.phase === 'over' && st.t > 1.6 ? SHOTS[0][0] : tier < 2 ? shots[0] : shots[Math.floor(Math.max(0, T) / (spb * 8)) % shots.length], k = 1 - Math.exp(-dt * 2.4), c = st.cp;
    for (let i = 0; i < 3; i++) { c.p[i] += (shot.p[i] - c.p[i]) * k; c.l[i] += (shot.l[i] - c.l[i]) * k; } c.fov += (shot.fov - c.fov) * k;
    const cam = G.cam, asp = innerWidth / innerHeight, sway = tier === 0 || !running ? 1 : 0.5;
    cam.position.set(c.p[0] + Math.sin(T * 0.3) * 0.3 * sway, c.p[1] + Math.sin(T * 0.43) * 0.06, c.p[2]); cam.fov = c.fov - pulse * 0.5 + (asp < 1 ? (1 - asp) * 26 : 0);
    cam.lookAt(c.l[0] + (running ? perf.root.position.x * 0.55 : 0), c.l[1], c.l[2]); Ven.shift(cam, dt);
  }
  G.update = function (V, dt) {
    dt = Math.min(dt, 0.1); st.clock += dt; const T = songT(); st.t += dt;
    if (st.phase === 'play') { if (T >= st.endT) { st.phase = 'over'; st.t = 0; V.say('Thank you, Fairhaven!', 3); } }
    else if (st.phase === 'over') { if (st.t > 3.4) finish(); }
    frame(dt, T, true);
  };
  G.idle = function (V, dt) { if (!st || !S3) return; dt = Math.min(dt, 0.1); st.clock += dt; if (st.phase === 'done') st.t += dt; frame(dt, songT(), false); };
  function finish() {
    const D = V0.D, tier = st.tier, rec = venRec('show'), spent = V0.stake + st.tipTotal, fan = fanName(rec.tips || 0);
    st.phase = 'done'; st.t = 0; if (Ven.tools.tip) Ven.tools.tip.hidden = true; Ven.spent = spent; const vip = tier === 2;
    const lines = ['Watched ' + star.name + ' from ' + ['the standing floor', 'the front row', 'the VIP booth'][tier] + (vip ? ', encore included' : ', start to finish'), 'Tips thrown: ' + money(st.tipTotal) + (st.tipN ? ' (' + st.tipN + '×)' : ''), 'Total spent tonight: ' + money(spent) + ' · fan level ' + fan];
    if (vip) { car.health = Math.min(100, car.health + 25); car.nitro = tune.nitroMax; lines.push('Complimentary drink: +25 car health and a full nitro tank'); }
    V0.finish(true, st.tipTotal >= 100 ? 'Standing ovation' : 'Curtain call', lines, 0);
  }
  G.lobby = function (V) {
    const D = V.D; if (V.stake < D.ticket.min) V.stake = D.stakes[0];
    G.rules = 'Tonight\'s headliner: <b>' + (star ? star.name : 'a surprise') + '</b>. <b>Standing</b> watches from the floor · <b>Front row</b> stands right at the stage · <b>VIP booth</b> gets roaming cameras, an encore and a free drink. Once the show is on you can throw a <b>' + money(TIP) + '</b> tip with <b>Space</b> or the Tip button.';
  };
  G.hud = function () {
    if (!st) return ''; const pctv = clamp(Math.round(songT() / st.endT * 100), 0, 100);
    return '<span class="big">' + TIERN[st.tier] + '</span><div class="r"><span>Now</span><b>' + ACTN[st.act] + '</b></div><div class="r"><span>Tips</span><b class="good">' + money(st.tipTotal) + '</b></div><div class="r"><span>Show</span><b>' + pctv + '%</b></div>';
  };
  G.hint = function () { return st && st.phase === 'play' ? 'Press <em>Space</em> or tap <em>Tip</em> to throw ' + money(TIP) + ' · <em>Esc</em> leaves the show (no refunds)' : ''; };
  G.recText = function (rec) { return ['Fan level', fanName(rec.tips || 0)]; };
  G.dbg = () => st;
  G.api = { tip, songT, S3: () => S3, st: () => st, perf: () => perf, star: () => star, hire, seed(n) { seedNext = n; }, rollStar, NAMES, BARS, TIP, advance(sec, step) { step = step || 1 / 60; for (let t = 0; t < sec; t += step) { if (Ven.phase !== 'play') break; G.update(Ven, step); } } };
  return G;
})();
