/* ================= PIKE & LURE TACKLE: jetty fishing (Lakeshore) =================
   A 100 second round on the jetty. Rippling spots hold fish: cast into one, wait for the bobber to dive, tap to set the hook, then hold to reel while watching the line tension.
   Reel while the fish pulls and the line snaps; let go and it runs. Bring in enough value to beat the goal. Every new species goes in your Collection. */
Ven.games.fish = (function () {
  const T_LEN = 100, GOALS = [110, 190, 290, 420], LN = 12;
  const SPEC = {
    bluegill: { n: 'Bluegill', v: 8, s: 0.5, kg: [0.2, 0.6], c: 0x4d8fc4, len: 0.5 },
    perch: { n: 'Yellow perch', v: 14, s: 0.6, kg: [0.3, 0.9], c: 0xd8b43a, len: 0.6, stripes: 0x3a3a1a },
    crappie: { n: 'Crappie', v: 18, s: 0.65, kg: [0.4, 1.0], c: 0xb4bcc8, len: 0.62 },
    bass: { n: 'Smallmouth bass', v: 35, s: 0.9, kg: [0.9, 2.4], c: 0x7a6a3a, len: 0.8, stripes: 0x4a3a1a },
    trout: { n: 'Rainbow trout', v: 45, s: 1.0, kg: [1.0, 3.0], c: 0x9aa6b0, len: 0.9, stripes: 0xd45a7a },
    catfish: { n: 'Channel catfish', v: 60, s: 1.2, kg: [2, 6], c: 0x6a7480, len: 1.0 },
    pike: { n: 'Northern pike', v: 90, s: 1.5, kg: [3, 9], c: 0x4a8a4a, len: 1.3, stripes: 0xc8d890 },
    muskie: { n: 'Muskellunge', v: 120, s: 1.6, kg: [5, 14], c: 0x5a7a52, len: 1.5, stripes: 0x2a3a22 },
    carp: { n: 'Golden carp', v: 160, s: 1.7, kg: [6, 12], c: 0xf0c030, len: 1.2 },
    boot: { n: 'Old boot', v: 1, s: 0.3, kg: [0.3, 0.6], junk: 1 },
    can: { n: 'Rusty can', v: 1, s: 0.3, kg: [0.1, 0.2], junk: 1 }
  };
  const POOLS = { near: [['bluegill', 5], ['perch', 4], ['crappie', 3], ['boot', 1]], mid: [['bass', 4], ['trout', 4], ['catfish', 3]], deep: [['pike', 4], ['muskie', 2], ['carp', 1.4]], open: [['bluegill', 4], ['perch', 3], ['boot', 2], ['can', 2], ['crappie', 1]] };
  const TIERS = { near: [6.5, 11], mid: [12.5, 18], deep: [19.5, 25] }, SPOT_R = 3.0, XR = 11;
  const G = { ready: false, sc: null, cam: null, expo: 1.15, stakeLabel: 'Rod rental',
    rules: 'You get 100 seconds on the jetty. Move the pointer over the water and tap to cast; rippling spots hold fish and the deeper ones hold the big ones. When the bobber dives, tap to set the hook, then hold the pointer (or Space) to reel. Let go when the fish pulls or the line snaps. Beat the goal haul to win double your stake (casual wins pay $30). New species fill your Collection.' };
  let st = null, V0 = null, kd = {}, tip = null, rodP = null, bob = null, line = null, lineA = null, pops = null, ripples = [], spots = [], shadow = null, aimRing = null, held = null, water = null, wtex = null, fightEl = null, fw = null, lastMv = -1;
  const rnd = () => (st ? st.rnd() : Math.random());
  const pick = (pool) => { let tot = 0; for (const p of pool) tot += p[1]; let r = rnd() * tot; for (const p of pool) { r -= p[1]; if (r <= 0) return p[0]; } return pool[0][0]; };
  const sfx = (k) => {
    if (!Snd.ok || !Snd.ctx) return; const t = Snd.ctx.currentTime;
    if (k === 'cast') Snd.noiseHit(t, 0.22, 0.12, 700, 3200, Snd.sfx); else if (k === 'plop') { Snd.tone(t, 330, 0.12, 'sine', 0.22, 1500, 0.002, Snd.sfx); Snd.noiseHit(t, 0.08, 0.14, 600, 3000, Snd.sfx); }
    else if (k === 'bite') { Snd.tone(t, 880, 0.1, 'square', 0.12, 3500, 0.002, Snd.sfx); Snd.tone(t + 0.1, 1175, 0.14, 'square', 0.12, 3500, 0.002, Snd.sfx); }
    else if (k === 'pull') Snd.tone(t, 220, 0.2, 'sawtooth', 0.08, 700, 0.004, Snd.sfx); else if (k === 'snap') { Snd.noiseHit(t, 0.12, 0.4, 1400, 0, Snd.sfx); Snd.tone(t, 140, 0.2, 'sawtooth', 0.12, 600, 0.002, Snd.sfx); }
  };
  function fishMesh(id) {
    const sp = SPEC[id], g = new THREE.Group();
    if (sp.junk) {
      if (id === 'boot') { const m = venMat(0x5a3a22, 0.9); venBox(g, 0.18, 0.4, 0.16, 0, 0.2, 0, m); venBox(g, 0.38, 0.14, 0.17, 0.12, 0.05, 0, m); venBox(g, 0.2, 0.05, 0.19, 0, 0.42, 0, venMat(0x2a1a10, 0.9)); }
      else { venCyl(g, 0.13, 0.13, 0.28, 0, 0.14, 0, venMat(0x9a6a40, 0.5, 0.6), 14); venCyl(g, 0.115, 0.115, 0.02, 0, 0.28, 0, venMat(0x30241a, 0.9), 14); }
      return g;
    }
    const col = venMat(sp.c, 0.35, 0.2), belly = venMat(0xe6e2d4, 0.5), dk = venMat(0x1a1a1a, 0.5);
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 10), col); body.scale.set(1.0, 0.36, 0.22); g.add(body);
    const bl = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8, 0, TAU, Math.PI * 0.55, Math.PI * 0.45), belly); bl.scale.set(1.012, 0.366, 0.228); g.add(bl);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.34, 3), col); tail.rotation.z = -Math.PI / 2; tail.rotation.x = Math.PI / 2; tail.position.set(-0.58, 0, 0); g.add(tail);
    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 3), col); fin.position.set(-0.05, 0.22, 0); fin.rotation.z = -0.3; g.add(fin);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), dk); eye.position.set(0.37, 0.05, 0.1); g.add(eye); const eye2 = eye.clone(); eye2.position.z = -0.1; g.add(eye2);
    if (sp.stripes) { const band = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 6), venMat(sp.stripes, 0.5)); band.scale.set(0.8, 0.1, 0.228); band.position.set(0, 0.03, 0); g.add(band); }
    g.scale.setScalar(sp.len); return g;
  }
  function addRipple(x, z, size, life) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.85, 1.0, 28), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.03, z); m.renderOrder = 2; G.sc.add(m); ripples.push({ m, t: 0, life: life || 1.2, sz: size || 1.2 });
  }
  function relocate(sp) {
    const R = TIERS[sp.tier]; for (let k = 0; k < 20; k++) { const x = (rnd() * 2 - 1) * XR, z = R[0] + rnd() * (R[1] - R[0]); if (spots.every((o) => o === sp || Math.hypot(o.x - x, o.z - z) > 5)) { sp.x = x; sp.z = z; break; } }
    sp.n = 3; if (sp.g) { sp.g.position.set(sp.x, 0.02, sp.z); }
  }
  function build() {
    const sc = G.sc = new THREE.Scene(); sc.background = lc(0x6fa8dc); sc.fog = new THREE.Fog(lc(0x9cc6e8), 60, 320);
    sc.add(new THREE.HemisphereLight(lc(0xdff0ff), lc(0x5a7a62), 0.8)); const sun = new THREE.DirectionalLight(lc(0xfff2d8), 0.9); sun.position.set(-12, 18, -6); sc.add(sun);
    wtex = venCanvasTex(256, 256, (g, w, h) => { g.fillStyle = '#2d7aa0'; g.fillRect(0, 0, w, h); for (let i = 0; i < 170; i++) { const x = Math.random() * w, y = Math.random() * h, r = 3 + Math.random() * 10; g.strokeStyle = 'rgba(255,255,255,' + (0.03 + Math.random() * 0.06).toFixed(2) + ')'; g.lineWidth = 1 + Math.random() * 2; for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) { g.beginPath(); g.ellipse(x + ox, y + oy, r * 1.7, r * 0.45, 0, 0, TAU); g.stroke(); } } });
    wtex.wrapS = wtex.wrapT = THREE.RepeatWrapping; wtex.repeat.set(26, 26);
    water = new THREE.Mesh(new THREE.PlaneGeometry(420, 420), new THREE.MeshStandardMaterial({ map: wtex, roughness: 0.3, metalness: 0.1, color: lc(0xa8cadc) })); water.rotation.x = -Math.PI / 2; sc.add(water);
    const wood = venMat(0x8a6a44, 0.85), dkw = venMat(0x5a4228, 0.9);
    for (let i = 0; i < 12; i++) venBox(sc, 3.4, 0.1, 0.42, 0, 0.5, -6 + i * 0.6, i % 2 ? wood : venMat(0x7d5e3a, 0.85)); for (const sx of [-1, 1]) { venBox(sc, 0.12, 0.2, 7.4, sx * 1.6, 0.4, -2.4, dkw); for (let i = 0; i < 4; i++) venCyl(sc, 0.1, 0.12, 1.5, sx * 1.6, -0.1, -5.5 + i * 2.2, dkw, 8); }
    const post = venBox(sc, 0.14, 1.3, 0.14, 1.65, 1.1, 0.4, dkw); const sg = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.24), new THREE.MeshBasicMaterial({ map: venText('PIKE & LURE', 360, 96, '#f4f0d8', '#2a4a34'), color: new THREE.Color(1, 1, 1) })); sg.position.set(1.65, 1.55, 0.2); sg.rotation.y = Math.PI; sc.add(sg);
    venBox(sc, 0.5, 0.35, 0.36, -1.1, 0.72, -1.2, venMat(0x3a6a8a, 0.6)); venCyl(sc, 0.03, 0.03, 0.5, -1.1, 1.05, -1.2, dkw, 6);
    // far shore, pines and mountains
    const pine = venMat(0x2c5a3a, 0.9), pine2 = venMat(0x386a42, 0.9), rock = venMat(0x7c8896, 0.9), snow = venMat(0xf4f8ff, 0.8);
    for (let i = 0; i < 70; i++) { const a = -1.15 + (i / 69) * 2.3 + Math.sin(i * 7.1) * 0.02, r = 118 + Math.sin(i * 3.3) * 10, h = 5 + (i % 5) * 1.4; const t = new THREE.Mesh(new THREE.ConeGeometry(1.7 + (i % 3) * 0.3, h, 7), i % 2 ? pine : pine2); t.position.set(Math.sin(a) * r, h / 2 - 0.4, Math.cos(a) * r); sc.add(t); }
    for (let i = 0; i < 7; i++) { const a = -0.95 + i * 0.32, r = 175, h = 42 + (i % 3) * 16, w = 30 + (i % 2) * 10; const m = new THREE.Mesh(new THREE.ConeGeometry(w, h, 6), rock); m.position.set(Math.sin(a) * r, h / 2 - 2, Math.cos(a) * r); sc.add(m); const c = new THREE.Mesh(new THREE.ConeGeometry(w * 0.34, h * 0.3, 6), snow); c.position.set(m.position.x, h * 0.85 - 2, m.position.z); sc.add(c); }
    for (const sx of [-1, 1]) for (let i = 0; i < 9; i++) { const t = new THREE.Mesh(new THREE.ConeGeometry(1.5, 6.5, 7), i % 2 ? pine : pine2); t.position.set(sx * (16 + i * 2.6), 3, -2 + i * 3.4); sc.add(t); }
    // rod: pivot at the hands, the tip is where the line leaves
    rodP = new THREE.Group(); rodP.position.set(-0.8, 1.45, 0.3); sc.add(rodP); const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.036, 3.3, 8), venMat(0x24282e, 0.4, 0.3)); rod.position.y = 1.65; rodP.add(rod);
    venCyl(rodP, 0.05, 0.05, 0.5, 0, 0.0, 0, venMat(0xb4783c, 0.7), 10); venCyl(rodP, 0.07, 0.07, 0.08, -0.06, 0.55, 0, venMat(0xc8ccd2, 0.3, 0.7), 14).rotation.z = Math.PI / 2;
    tip = new THREE.Object3D(); tip.position.set(0, 3.3, 0); rodP.add(tip); rodP.rotation.set(1.12, 0, 0.2);
    bob = new THREE.Group(); const bt = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8, 0, TAU, 0, Math.PI / 2), venMat(0xe03a2c, 0.4)), bb = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8, 0, TAU, Math.PI / 2, Math.PI / 2), venMat(0xf4f4f0, 0.4)); bob.add(bt, bb); venCyl(bob, 0.012, 0.012, 0.2, 0, 0.17, 0, venMat(0xe03a2c, 0.4), 6); bob.visible = false; sc.add(bob);
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(LN * 3), 3)); line = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: 0xf0f0f0 })); line.frustumCulled = false; line.visible = false; sc.add(line); lineA = lg.attributes.position.array;
    aimRing = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.72, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75, depthWrite: false, side: THREE.DoubleSide })); aimRing.rotation.x = -Math.PI / 2; aimRing.renderOrder = 3; sc.add(aimRing);
    shadow = new THREE.Mesh(new THREE.CircleGeometry(0.5, 16), new THREE.MeshBasicMaterial({ color: 0x103848, transparent: true, opacity: 0.45, depthWrite: false })); shadow.rotation.x = -Math.PI / 2; shadow.renderOrder = 2; shadow.visible = false; sc.add(shadow);
    for (const tier of ['near', 'near', 'mid', 'mid', 'deep']) {
      const g = new THREE.Group(); const ring = new THREE.Mesh(new THREE.RingGeometry(1.7, 1.95, 36), new THREE.MeshBasicMaterial({ color: 0xcdf4ff, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.renderOrder = 2; g.add(ring);
      const sh = []; for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(new THREE.CircleGeometry(0.5, 12), new THREE.MeshBasicMaterial({ color: 0x0e3444, transparent: true, opacity: 0.4, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.scale.set(1, 0.38, 1); m.renderOrder = 2; g.add(m); sh.push(m); }
      sc.add(g); spots.push({ tier, x: 0, z: 10, n: 3, g, ring, sh, ph: Math.random() * 6 });
    }
    pops = Ven.pops(sc);
    G.cam = new THREE.PerspectiveCamera(58, 16 / 9, 0.1, 500);
  }
  function ui() {
    if (fightEl) return; const s = document.createElement('style');
    s.textContent = '#venFish{position:absolute;left:50%;bottom:58px;transform:translateX(-50%);width:min(440px,78vw);pointer-events:none;color:#dfe6ee;font-size:11px;letter-spacing:.14em;text-transform:uppercase}#venFish[hidden]{display:none}' +
      '#venFish .fr{margin:4px 0}#venFish .fr b{display:block;font-weight:600;margin-bottom:2px;opacity:.85}#venFish .fb{position:relative;height:14px;border-radius:7px;background:#121a24;border:1px solid rgba(255,255,255,.35);overflow:hidden}' +
      '#venFish .tz{background:linear-gradient(90deg,#2e8b57 0,#58d68d 40%,#f4d03f 72%,#e74c3c 90%)}#venFish .fb i{position:absolute;left:0;top:0;bottom:0;background:rgba(255,255,255,.9)}#venFish .tz i{width:3px;background:#fff;box-shadow:0 0 6px #000}#venFish .cb i{background:#5bd0ff}' +
      '#venFish .alert{color:#ff6a5c;font-weight:700;text-align:center;height:16px;letter-spacing:.2em}';
    document.head.appendChild(s); fightEl = document.createElement('div'); fightEl.id = 'venFish'; fightEl.hidden = true;
    fightEl.innerHTML = '<div class="alert"></div><div class="fr"><b>Line tension</b><div class="fb tz"><i></i></div></div><div class="fr"><b>Fish on the line</b><div class="fb cb"><i style="width:0%"></i></div></div>'; E.ven.appendChild(fightEl);
    fw = { al: fightEl.querySelector('.alert'), tn: fightEl.querySelector('.tz i'), pg: fightEl.querySelector('.cb i') };
  }
  const planePt = () => { const rc = Ven.ray(G.cam).ray, o = rc.origin, d = rc.direction; if (d.y > -1e-4) return [clamp(o.x + d.x * 40, -XR - 3, XR + 3), 27]; const t = -o.y / d.y; return [clamp(o.x + d.x * t, -XR - 3, XR + 3), clamp(o.z + d.z * t, 4.5, 27)]; };
  G.init = function (V) { V0 = V; build(); ui(); };
  G.enter = function (V) {
    V0 = V; if (!G.sc) G.init(V); ui();
    st = { rnd: mulberry32((Date.now() & 0xffff) + 29), phase: 'lobby', t: 0, time: 0, total: 0, catches: [], ax: 0, az: 12, bx: 0, bz: 10, lx: 0, lz: 10, sx: 0, sz: 0, tension: 0, prog: 0, surge: 0, nextSurge: 2, id: null, kg: 0, spot: null, hookT: 0, waitT: 0, msg: '', best: null, nCast: 0, camX: 0, endT: 0, over: false, tmark: 0, fx: 0, fz: 0 };
    if (G.seed) st.rnd = mulberry32(G.seed);
    spots.forEach((sp, i) => { sp.n = 3; relocate(sp); }); bob.visible = false; line.visible = false; fightEl.hidden = true; if (held) { G.sc.remove(held); held = null; } shadow.visible = false; pops.clear();
    for (const r of ripples) G.sc.remove(r.m); ripples.length = 0;
  };
  G.begin = function (V) { G.enter(V); st.phase = 'idle'; st.t = 0; V.say('100 seconds on the jetty · cast into a rippling spot', 3.2); };
  G.cleanup = function () { if (fightEl) fightEl.hidden = true; for (const k in kd) kd[k] = false; };
  const tipPos = (() => { const v = new THREE.Vector3(); return () => { rodP.updateMatrixWorld(true); return tip.getWorldPosition(v); }; })();
  function cast(x, z) {
    if (st.phase !== 'idle') return; const idx = Math.max(0, V0.D.stakes.indexOf(V0.stake)); st.nCast++;
    const lx = clamp(x + venGauss(rnd) * 0.55, -XR - 2, XR + 2), lz = clamp(z + venGauss(rnd) * 0.7, 4.5, 28), tp = tipPos();
    st.sx = tp.x; st.sy = tp.y; st.sz = tp.z; st.lx = lx; st.lz = lz; st.phase = 'cast'; st.t = 0; bob.visible = true; line.visible = true; sfx('cast');
    let best = null, bd = SPOT_R; for (const sp of spots) { const d = Math.hypot(sp.x - lx, sp.z - lz); if (d < bd) { bd = d; best = sp; } }
    st.spot = best; st.id = pick(best ? POOLS[best.tier] : POOLS.open); st.waitT = best ? 1.0 + rnd() * 2.0 : 3.2 + rnd() * 3.4; st.hookT = 1.05 - idx * 0.06;
  }
  function retract(msg) { st.phase = 'reel'; st.t = 0; st.rx = st.bx; st.rz = st.bz; if (msg) V0.say(msg, 1.6); }
  function hook() {
    st.phase = 'fight'; st.t = 0; const sp = SPEC[st.id]; st.tension = 0.3; st.prog = 0.14; st.surge = 0; st.nextSurge = 0.9 + rnd() * 1.2; st.kg = +(sp.kg[0] + (sp.kg[1] - sp.kg[0]) * Math.pow(rnd(), 1.4)).toFixed(1); st.fx = 0; st.fz = 0;
    sfx('plop'); addRipple(st.bx, st.bz, 1.6); V0.say('Hooked! Hold to reel · let go when it pulls', 2.2); fightEl.hidden = false;
  }
  function lose(why) { fightEl.hidden = true; st.phase = 'lost'; st.t = 0; V0.say(why, 2.0); sfx('snap'); line.visible = false; bob.visible = false; shadow.visible = false; }
  function land() {
    fightEl.hidden = true; const sp = SPEC[st.id]; const val = Math.max(1, Math.round(sp.v * (0.75 + 0.5 * (st.kg - sp.kg[0]) / Math.max(0.1, sp.kg[1] - sp.kg[0]))));
    st.total += val; st.catches.push({ id: st.id, kg: st.kg, v: val }); if (!st.best || val > st.best.v) st.best = { id: st.id, kg: st.kg, v: val };
    if (!sp.junk) { const F = save.col.fish, isNew = !F[st.id]; if (!F[st.id] || F[st.id] < st.kg) F[st.id] = st.kg; writeSave(); if (typeof Col !== 'undefined' && Col.onFish) Col.onFish(st.id, st.kg, isNew); }
    st.phase = 'land'; st.t = 0; if (st.spot) { st.spot.n--; if (st.spot.n <= 0) relocate(st.spot); }
    if (held) G.sc.remove(held); held = fishMesh(st.id); held.userData.v = val; G.sc.add(held); line.visible = false; bob.visible = false; shadow.visible = false;
    if (Snd.ok) Snd.beep(sp.junk ? 260 : 900 + Math.min(500, sp.v * 3), 0.16);
    pops.add(sp.junk ? 'Junk' : '$' + val, sp.junk ? '#b4b4b4' : '#9be58b', 0, 2.3, 2.7, 0.5); V0.say(sp.n + ' · ' + st.kg + ' kg' + (sp.junk ? '' : ' · $' + val), 2.4);
  }
  G.update = function (V, dt) {
    dt = Math.min(dt, 0.1); st.t += dt; const P = V.ptr, down = P.down || kd.Space;
    if (st.phase !== 'lobby' && st.phase !== 'over' && st.phase !== 'done') { st.time += dt; }
    if (st.phase === 'idle') {
      if (st.time >= T_LEN) { endRound(); } else if (P.mvn !== lastMv) { lastMv = P.mvn; const pt = planePt(); st.ax = pt[0]; st.az = pt[1]; }
    } else if (st.phase === 'cast') {
      const u = clamp(st.t / 0.8, 0, 1); st.bx = st.sx + (st.lx - st.sx) * u; st.bz = st.sz + (st.lz - st.sz) * u; st.by = st.sy + (0.05 - st.sy) * u + Math.sin(u * Math.PI) * 3.2 * (1 - 0.25 * u);
      if (u >= 1) { st.phase = 'wait'; st.t = 0; sfx('plop'); addRipple(st.bx, st.bz, 1.3); }
    } else if (st.phase === 'wait') {
      st.by = 0.03 + Math.sin(st.t * 2.4) * 0.02; if (Math.floor(st.t * 0.65) !== Math.floor((st.t - dt) * 0.65)) addRipple(st.bx, st.bz, 0.6, 1.4);
      if (st.t >= st.waitT) { st.phase = 'bite'; st.t = 0; sfx('bite'); addRipple(st.bx, st.bz, 1.2); }
    } else if (st.phase === 'bite') {
      st.by = -0.07 + Math.sin(st.t * 40) * 0.025; if (st.t >= st.hookT) { st.phase = 'got'; st.t = 0; V.say('It got away · tap faster when the bobber dives', 2); }
    } else if (st.phase === 'got') {
      if (st.t > 0.5) retract();
    } else if (st.phase === 'reel') {
      const u = clamp(st.t / 0.7, 0, 1), tp = tipPos(); st.bx = st.rx + (tp.x - st.rx) * u; st.bz = st.rz + (tp.z - st.rz) * u; st.by = 0.05 + u * 1.6;
      if (u >= 1) { bob.visible = false; line.visible = false; st.phase = 'idle'; st.t = 0; if (st.time >= T_LEN) endRound(); }
    } else if (st.phase === 'fight') {
      const sp = SPEC[st.id], str = sp.s;
      if (st.surge > 0) st.surge -= dt; else { st.nextSurge -= dt; if (st.nextSurge <= 0) { st.surge = 0.5 + rnd() * 0.4; st.nextSurge = (1.7 + rnd() * 1.5) * (1.15 - 0.15 * str); sfx('pull'); } }
      st.warn = st.surge <= 0 && st.nextSurge < 0.45;
      const pull = st.surge > 0;
      st.tension = clamp(st.tension + ((down ? 0.6 : -0.7) + (pull ? (down ? 0.35 + 0.45 * str : 0.35) : 0)) * dt, 0, 1.2);
      st.prog += ((down && !pull ? 0.4 / str : down && pull ? 0.03 : -0.045 * str * (pull ? 2.5 : 1)) * dt);
      st.fx = Math.sin(st.t * (pull ? 9 : 3.2)) * (pull ? 1.6 : 0.8); st.fz = 0;
      if (st.tension >= 1) lose('The line snapped!'); else if (st.prog >= 1) land(); else if (st.prog <= 0) lose('It shook the hook');
      if (st.phase === 'fight') { const u = clamp(st.prog, 0, 1), tp = tipPos(); st.bx = st.lx + (tp.x - st.lx) * u * 0.8 + st.fx * (1 - u) * 0.6; st.bz = st.lz + (tp.z - st.lz) * u * 0.92; st.by = 0.02; }
    } else if (st.phase === 'land') {
      if (st.t > 2.3) { if (st.time >= T_LEN) endRound(); else { st.phase = 'idle'; st.t = 0; } }
    } else if (st.phase === 'lost') {
      if (st.t > 1.3) { if (st.time >= T_LEN) endRound(); else { st.phase = 'idle'; st.t = 0; } }
    } else if (st.phase === 'over') { st.endT -= dt; if (st.endT <= 0) finish(); }
    visuals(dt);
  };
  function endRound() { st.phase = 'over'; st.endT = 1.8; st.over = true; fightEl.hidden = true; bob.visible = false; line.visible = false; V0.say("Time! That's the haul", 2.4); }
  function visuals(dt) {
    const cam = G.cam; wtex.offset.x += dt * 0.004; wtex.offset.y += dt * 0.0027;
    for (let i = ripples.length - 1; i >= 0; i--) { const r = ripples[i]; r.t += dt; const u = r.t / r.life; r.m.scale.setScalar(0.3 + u * r.sz * 1.4); r.m.material.opacity = 0.7 * (1 - u); if (u >= 1) { G.sc.remove(r.m); r.m.geometry.dispose(); r.m.material.dispose(); ripples.splice(i, 1); } }
    const tt = (performance.now ? performance.now() : Date.now()) / 1000;
    for (const sp of spots) { sp.g.position.set(sp.x, 0.025, sp.z); sp.ring.material.opacity = 0.18 + 0.14 * Math.sin(tt * 2 + sp.ph); sp.ring.scale.setScalar(1 + 0.06 * Math.sin(tt * 2 + sp.ph)); sp.sh.forEach((m, i) => { const a = tt * (0.5 + i * 0.13) * (i % 2 ? -1 : 1) + i * 2.1 + sp.ph, r = 0.7 + i * 0.4; m.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); m.rotation.z = a + Math.PI / 2 * (i % 2 ? -1 : 1); }); sp.g.visible = st.phase !== 'lobby' || true; }
    const idle = st.phase === 'idle'; aimRing.visible = idle; if (idle) { aimRing.position.set(st.ax, 0.04, st.az); aimRing.scale.setScalar(1 + 0.08 * Math.sin(tt * 4)); }
    const showB = st.phase === 'cast' || st.phase === 'wait' || st.phase === 'bite' || st.phase === 'got' || st.phase === 'reel' || st.phase === 'fight';
    const tp = tipPos();
    if (showB) {
      bob.visible = true; bob.position.set(st.bx, st.by == null ? 0.03 : st.by, st.bz); line.visible = true; const taut = st.phase === 'fight' ? clamp(0.5 + st.tension * 0.5, 0, 1) : (st.phase === 'cast' ? 0.6 : 0.15), sag = 0.9 * (1 - taut);
      for (let i = 0; i < LN; i++) { const u = i / (LN - 1); lineA[i * 3] = tp.x + (bob.position.x - tp.x) * u; lineA[i * 3 + 1] = Math.max(tp.y + (bob.position.y - tp.y) * u - Math.sin(u * Math.PI) * sag, bob.position.y + 0.03); lineA[i * 3 + 2] = tp.z + (bob.position.z - tp.z) * u; } line.geometry.attributes.position.needsUpdate = true;
    }
    if (st.phase === 'fight') { shadow.visible = true; const sp = SPEC[st.id]; shadow.position.set(st.bx, 0.04, st.bz + 0.25); shadow.scale.set(sp.len * 1.6, sp.len * 0.9, 1); shadow.rotation.z = Math.sin(st.t * 6) * 0.4; if (Math.floor(st.t * 3) !== Math.floor((st.t - dt) * 3)) addRipple(st.bx, st.bz, 0.8, 0.8); rodP.rotation.x = 1.12 + st.tension * 0.36; fightEl.hidden = false; fw.tn.style.left = clamp(st.tension / 1.0, 0, 1) * 98 + '%'; fw.pg.style.width = clamp(st.prog, 0, 1) * 100 + '%'; fw.al.textContent = st.surge > 0 ? 'Fish pulling · let go!' : st.warn ? 'Easy…' : ''; fw.al.style.color = st.surge > 0 ? '#ff6a5c' : '#f4d03f'; }
    else { rodP.rotation.x += (1.12 - rodP.rotation.x) * Math.min(1, dt * 6); }
    if (held) { if (st.phase === 'land') { const u = clamp(st.t / 0.5, 0, 1), e = 1 - Math.pow(1 - u, 3); held.position.set(0.1, 0.4 + e * 1.35 + Math.sin(st.t * 2) * 0.04, 2.6); held.rotation.set(0, Math.PI / 2 + Math.sin(st.t * 1.5) * 0.5, Math.sin(st.t * 7) * 0.12 * (1 - u)); held.scale.setScalar(0.9 + 0.5 * e); held.visible = true; } else held.visible = false; }
    pops.update(dt);
    const lx = st.phase === 'fight' || st.phase === 'wait' || st.phase === 'bite' || st.phase === 'cast' ? clamp(st.bx * 0.3, -3.2, 3.2) : clamp(st.ax * 0.18, -2, 2); st.camX += (lx - st.camX) * Math.min(1, dt * 2);
    const shake = st.phase === 'fight' ? Math.sin(st.t * 31) * 0.004 * (st.surge > 0 ? 3 : 1) : 0;
    cam.position.set(0 + shake, 2.25, -0.7); cam.lookAt(st.camX, 0.1, 12.5); cam.updateMatrixWorld(true); Ven.shift(cam, dt); cam.updateMatrixWorld(true);
  }
  function finish() {
    const idx = Math.max(0, V0.D.stakes.indexOf(V0.stake)), goal = GOALS[idx], win = st.total >= goal, stake = V0.stake; st.phase = 'done'; fightEl.hidden = true;
    const n = st.catches.filter((c) => !SPEC[c.id].junk).length, lines = ['Haul $' + st.total + ' · goal $' + goal, n + ' fish landed' + (st.catches.length > n ? ' · ' + (st.catches.length - n) + ' junk' : ''), st.best ? 'Best catch: ' + SPEC[st.best.id].n + ' · ' + st.best.kg + ' kg' : 'Nothing worth keeping'];
    const r = venRec('fish'); r.best = Math.max(r.best || 0, st.total);
    V0.finish(win, win ? 'Goal reached' : 'Short of the goal', lines, win ? (stake ? stake * 2 : 30) : 0);
  }
  G.idle = function (V, dt) { if (st && G.sc) visuals(dt); else if (G.cam) Ven.shift(G.cam, dt); };
  G.ptrdown = function () { if (!st) return; if (st.phase === 'bite') hook(); else if (st.phase === 'wait') retract('Reeled in'); };
  G.ptrup = function () { if (!st || st.phase !== 'idle' || st.t < 0.25) return; const pt = planePt(); st.ax = pt[0]; st.az = pt[1]; cast(pt[0], pt[1]); };
  G.key = function (V, code, down) {
    kd[code] = down; if (!down || code !== 'Space') return;
    if (st.phase === 'bite') hook(); else if (st.phase === 'wait') retract('Reeled in'); else if (st.phase === 'idle' && st.t > 0.25) { cast(st.ax, st.az); }
  };
  G.hud = function () {
    if (!st) return ''; const left = Math.max(0, Math.ceil(T_LEN - st.time)), idx = Math.max(0, V0.D.stakes.indexOf(V0.stake)), n = st.catches.filter((c) => !SPEC[c.id].junk).length;
    const head = st.phase === 'bite' ? '<span class="big" style="color:#ff6a5c">BITE!</span>' : '<span class="big">$' + st.total + '</span>';
    return head + '<div class="r"><span>Time</span><b>' + left + ' s</b></div><div class="r"><span>Goal</span><b>$' + GOALS[idx] + '</b></div><div class="r"><span>Fish</span><b>' + n + '</b></div>';
  };
  G.hint = function () {
    if (!st) return ''; switch (st.phase) {
      case 'idle': return 'Aim at a <em>rippling spot</em> · <em>tap</em> or <em>Space</em> to cast';
      case 'cast': case 'wait': return 'Wait for the bobber to dive…';
      case 'bite': return '<em>TAP NOW!</em>';
      case 'fight': return 'Hold to <em>reel</em> · release when it <em>pulls</em>';
      default: return '';
    }
  };
  G.recText = function (rec) { return ['Best haul', '$' + (rec.best || 0)]; };
  G.dbg = () => st; G.api = { cast, hook, spots, SPEC, GOALS, T_LEN };
  return G;
})();
