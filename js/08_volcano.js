/* ================= MOUNT CINDER: lava, smoke and the Eruption Escape =================
   The volcano's shape is in the terrain (02_volcano.js). This is what lives on it:
     · a lava lake in the crater, and three lava rivers glowing down their channels; a plume of smoke always rising, and a glow over the crater
       that lights up the night. Lava is hot: drive into it and the car burns.
     · the Eruption Escape (a mission, 🌋): from base camp at the foot the rangers run you up to the observatory shelf. The mountain wakes up,
       blows, and you race down to Ashfall's evacuation point. A lava flow pours over the rim and down the slope after you (if it catches you,
       you are done), and lava bombs rain round you: each one shows where it will land with a red ring a moment before it hits. A hit costs a lot
       of health; enough of them wreck the car. */
const VOL = { LAVA_END: 1000, BASE: 1020, EVAC: 1180, W0: 26, WK: 0.062 };
const Volc = { built: false, grp: null, lake: null, chans: [], front: null, fMat: null, mat: null, puffs: [], glow: null, bombs: [], erupt: 0, puffT: 0, cool: 0, run: null, burnT: 0, near: false };
const _vpS = {};

/* ---------- the lava shader: dark crust with glowing cracks, hotter where heat (aHeat) is high, and the advancing edge of a flow (uFront) ---------- */
function volcLavaMat(front) {
  return new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uFront: { value: front ? 0 : -1 }, uDay: { value: 1 }, uFogC: { value: new THREE.Color(0x9ab8d8) }, uFogD: { value: 0.001 } },
    vertexShader: 'attribute float aHeat; attribute float aS; attribute float aL; varying float vH; varying float vS; varying float vL; varying vec3 vP;\n' +
      'void main(){ vH=aHeat; vS=aS; vL=aL; vec4 w=modelMatrix*vec4(position,1.0); vP=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
    fragmentShader: 'uniform float uT; uniform float uFront; uniform float uDay; uniform vec3 uFogC; uniform float uFogD; varying float vH; varying float vS; varying float vL; varying vec3 vP;\n' +
      'float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }\n' +
      'float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h21(i),h21(i+vec2(1.0,0.0)),f.x), mix(h21(i+vec2(0.0,1.0)),h21(i+vec2(1.0,1.0)),f.x), f.y); }\n' +
      'void main(){\n' +
      ' float heat=vH;\n' +
      ' if (uFront >= 0.0) { float edge = uFront - 9.0*vL*vL - 5.0*vn(vec2(vL*4.0, uT*0.6)); if (vS > edge) discard; heat *= 1.0 - clamp((edge - vS)/240.0, 0.0, 0.7); heat = max(heat, 1.0 - clamp((edge - vS)/12.0, 0.0, 1.0)); }\n' +
      ' vec2 p = vP.xz*0.11 + vec2(uT*0.05, -uT*0.12);\n' +
      ' float n = vn(p)*0.6 + vn(p*2.7 + 3.1)*0.3 + vn(p*7.0 - uT*0.4)*0.1;\n' +
      ' float crack = smoothstep(0.40, 0.49, n) * (1.0 - smoothstep(0.51, 0.62, n));\n' +
      ' float glow = clamp(heat*(0.35 + 1.1*crack) + heat*heat*0.55*(1.0 - n), 0.0, 1.6);\n' +
      ' vec3 crust = vec3(0.06,0.042,0.036) * (0.35 + 0.65*uDay);\n' +
      ' vec3 hot = mix(vec3(1.5,0.32,0.05), vec3(2.0,1.15,0.35), clamp(glow - 0.75, 0.0, 1.0));\n' +
      ' vec3 col = mix(crust, hot, clamp(glow, 0.0, 1.0));\n' +
      ' float fd = length(vP - cameraPosition), ff = 1.0 - exp(-uFogD*uFogD*fd*fd);\n' +
      ' col = mix(col, uFogC, ff * (1.0 - 0.7*clamp(glow,0.0,1.0)*(1.0 - uDay)));\n' +
      ' gl_FragColor = vec4(col, 1.0);\n' +
      '}',
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4
  });
}
/* a strip of lava draped on the ground along pts ({x, z, w, heat, s, nx, nz}: centre, width, heat, distance along, the across direction) */
function volcRibbon(pts, lift, mat) {
  const M = 7, n = pts.length, pos = new Float32Array(n * M * 3), heat = new Float32Array(n * M), sA = new Float32Array(n * M), lA = new Float32Array(n * M), idx = [];
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    for (let j = 0; j < M; j++) {
      const l = j / (M - 1) * 2 - 1, x = p.x + p.nx * l * p.w / 2, z = p.z + p.nz * l * p.w / 2, k = i * M + j;
      pos[k * 3] = x; pos[k * 3 + 1] = terrainHeight(x, z) + lift; pos[k * 3 + 2] = z; heat[k] = p.heat * (1 - 0.35 * l * l); sA[k] = p.s; lA[k] = l;
      if (i < n - 1 && j < M - 1) idx.push(k, k + M, k + 1, k + 1, k + M, k + M + 1);
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aHeat', new THREE.BufferAttribute(heat, 1));
  g.setAttribute('aS', new THREE.BufferAttribute(sA, 1)); g.setAttribute('aL', new THREE.BufferAttribute(lA, 1)); g.setIndex(idx); g.computeBoundingSphere();
  const m = new THREE.Mesh(g, mat); m.frustumCulled = false; return m;
}
/* where the escape line is: s metres from the vent towards Ashfall, l metres to its side */
function volcLine(s, l, o) { const V = VOLC; o.x = V.x + V.ux * s - V.uz * l; o.z = V.z + V.uz * s + V.ux * l; o.h = terrainHeight(o.x, o.z); return o; }
function volcFrontW(s) { return VOL.W0 + Math.max(0, s - 120) * VOL.WK; }

Volc.build = function () {
  if (Volc.built || typeof THREE === 'undefined') return; Volc.built = true;
  const V = VOLC, grp = Volc.grp = new THREE.Group(); grp.name = 'volcano'; scene.add(grp);
  Volc.mat = volcLavaMat(false); Volc.fMat = volcLavaMat(true);
  /* the lava lake */
  const lk = new THREE.CircleGeometry(V.CR * 0.96, 56); lk.rotateX(-Math.PI / 2); const nv = lk.attributes.position.count;
  lk.setAttribute('aHeat', new THREE.BufferAttribute(new Float32Array(nv).fill(0.95), 1)); lk.setAttribute('aS', new THREE.BufferAttribute(new Float32Array(nv), 1)); lk.setAttribute('aL', new THREE.BufferAttribute(new Float32Array(nv), 1));
  Volc.lake = new THREE.Mesh(lk, Volc.mat); Volc.lake.position.set(V.x, volcLakeY(), V.z); grp.add(Volc.lake);
  /* the three rivers down their channels, hottest at the rim */
  for (let k = 0; k < 3; k++) {
    const pts = []; for (let d = V.RIM - 14; d <= V.CHEND[k]; d += 6) { const a = volcChanA(k, d), f = (d - V.RIM) / (V.CHEND[k] - V.RIM); pts.push({ x: V.x + Math.cos(a) * d, z: V.z + Math.sin(a) * d, w: 9.5 - 3 * clamp(f, 0, 1), heat: 1 - 0.55 * clamp(f, 0, 1), s: d, nx: -Math.sin(a), nz: Math.cos(a) }); }
    const m = volcRibbon(pts, 0.55, Volc.mat); grp.add(m); Volc.chans.push(m);
  }
  /* the flow that chases you in the escape (hidden until then) */
  const fp = []; for (let s = V.RIM - 10; s <= VOL.LAVA_END + 20; s += 5) { volcLine(s, 0, _vpS); fp.push({ x: _vpS.x, z: _vpS.z, w: volcFrontW(s), heat: 1, s, nx: -V.uz, nz: V.ux }); }
  Volc.front = volcRibbon(fp, 0.7, Volc.fMat); Volc.front.visible = false; grp.add(Volc.front);
  /* smoke and the glow over the crater */
  const c = mkCanvas(64, 64), g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 2, 32, 32, 31);
  gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const tex = canvasTex(c, true, false); Volc.tex = tex;
  for (let i = 0; i < 26; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: 0x8a8580, transparent: true, depthWrite: false, opacity: 0 })); s.visible = false; s.userData = { age: 1e9, life: 1, v: 0, s0: 1, s1: 1, dx: 0, dz: 0 }; grp.add(s); Volc.puffs.push(s); }
  Volc.glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: 0xff6a20, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.4, fog: false }));
  Volc.glow.position.set(V.x, volcLakeY() + 14, V.z); Volc.glow.scale.setScalar(190); grp.add(Volc.glow);
  /* lava bombs and their warning rings */
  const bg = new THREE.SphereGeometry(1.3, 10, 8), rg = new THREE.RingGeometry(3.6, 5, 32); rg.rotateX(-Math.PI / 2);
  for (let i = 0; i < 10; i++) {
    const m = new THREE.Mesh(bg, new THREE.MeshBasicMaterial({ color: new THREE.Color(2.0, 0.55, 0.12) })); m.visible = false; grp.add(m);
    const r = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 0.25, 0.1), transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })); r.visible = false; grp.add(r);
    Volc.bombs.push({ m, r, on: false, t: 0, ft: 1, x0: 0, y0: 0, z0: 0, x1: 0, y1: 0, z1: 0, vy: 0 });
  }
};

/* ---------- is (x, z) on lava? the crater lake, the rivers, and the escape's flow while it is out ---------- */
Volc.lava = function (x, z, y) {
  const V = VOLC, dx = x - V.x, dz = z - V.z, d2 = dx * dx + dz * dz; if (d2 > V.R * V.R) return false;
  const d = Math.sqrt(d2); if (d < V.CR * 0.94 && y < volcLakeY() + 2.5) return true;
  const a = Math.atan2(dz, dx); for (let k = 0; k < 3; k++) if (d > V.RIM - 12 && d < V.CHEND[k] && volcChanW(k, d, a) < 4.4 - 1.4 * clamp((d - V.RIM) / (V.CHEND[k] - V.RIM), 0, 1)) return true;
  if (Volc.front && Volc.front.visible) {
    const s = dx * V.ux + dz * V.uz, l = Math.abs(-dx * V.uz + dz * V.ux), w = volcFrontW(s) / 2, F = Volc.fMat.uniforms.uFront.value;
    if (s > V.RIM - 10 && l < w * 0.92 && s < F - 9 * (l / w) * (l / w) - 2) return true;
  }
  return false;
};

/* ---------- the mission ---------- */
Volc.mission = function () {
  const pts = [[560, -16], [700, 22], [850, -10], [VOL.LAVA_END + 10, 4], [VOL.EVAC, 26]], cps = pts.map(([s, l], i) => { volcLine(s, l, _vpS); return { x: _vpS.x, z: _vpS.z, h: _vpS.h, r: i === pts.length - 1 ? 22 : 18, finish: i === pts.length - 1 }; });
  volcLine(VOL.BASE, 70, _vpS);
  return { id: 'mvolc', type: 'erupt', from: 'Mount Cinder', to: 'Ashfall', x: _vpS.x, z: _vpS.z, h: _vpS.h, cps, limit: 70, reward: 7500, title: 'Eruption Escape: Mount Cinder', desc: MT.erupt.blurb, rep: 40 };
};
Volc.start = function (M) {
  const V = VOLC; spawnAt(V.px, V.pz, Math.atan2(V.ux, V.uz)); loadAround(V.px, V.pz, 10); M.cd = 6.2;
  M.vol = { front: -1, bombT: 2, hits: 0, dodged: 0, boom: false }; Volc.run = M.vol; Volc.cool = 0; Volc.front.visible = false;
  UI.banner('ERUPTION ESCAPE', 'The rangers drop you at the observatory. The mountain is waking up…');
};
Volc.stop = function () {
  Volc.run = null; Volc.cool = Volc.front.visible ? 25 : 0;
  for (const b of Volc.bombs) { b.on = false; b.m.visible = b.r.visible = false; }
};
/* a bomb: from the crater, landing near where the car will be (sometimes right on it), with a red ring where it will hit */
Volc.fire = function () {
  const b = Volc.bombs.find((q) => !q.on); if (!b) return; const c = car, V = VOLC;
  const ft = 2.0 + Math.random() * 1.3, lead = ft * 0.8, direct = Math.random() < 0.38, r = direct ? Math.random() * 4 : 9 + Math.random() * 26, a = Math.random() * TAU;
  b.x1 = c.x + c.vx * lead + Math.cos(a) * r; b.z1 = c.z + c.vz * lead + Math.sin(a) * r; b.y1 = terrainHeight(b.x1, b.z1);
  b.x0 = V.x + (Math.random() - 0.5) * 30; b.z0 = V.z + (Math.random() - 0.5) * 30; b.y0 = volcLakeY() + 6; b.ft = ft; b.t = 0; b.vy = (b.y1 - b.y0 + 0.5 * 16 * ft * ft) / ft; b.on = true;
  b.m.visible = true; b.r.visible = true; b.r.position.set(b.x1, b.y1 + 0.35, b.z1);
};
Volc.land = function (b) {
  const c = car, M = Volc.run; b.on = false; b.m.visible = b.r.visible = false;
  const x = b.x1, y = b.y1, z = b.z1, dd = Math.hypot(c.x - x, c.z - z);
  sparks(x, y + 1, z, 50, 22); Snd.crash(Math.max(4, 26 * (1 - dd / 220)));
  for (let i = 0; i < 18; i++) emit(Part.fire, x + (Math.random() - 0.5) * 3, y + Math.random() * 2, z + (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 12, 3 + Math.random() * 9, (Math.random() - 0.5) * 12, 0.6 + Math.random() * 0.6, 1.4, 2.4, 2.6, 1.0, 0.2, 0.8, 4);
  for (let i = 0; i < 12; i++) emit(Part.smoke, x + (Math.random() - 0.5) * 4, y + Math.random() * 2, z + (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 6, 2 + Math.random() * 5, (Math.random() - 0.5) * 6, 2.4 + Math.random() * 1.5, 2.6, 7, 0.06, 0.05, 0.05, 0.7, -0.2);
  if (dd < 60) Cam.shake = Math.max(Cam.shake, 2.6 * (1 - dd / 60));
  if (!M || Foot.on) return;
  if (dd < 8 && Math.abs(c.y - y) < 6) {
    const dmg = 14 + 48 * (1 - dd / 8), hp0 = c.health; if (!devOn('god')) { c.health -= dmg; Dmg.hit(c, 12, hp0 - c.health); }
    const nx = (c.x - x) / (dd || 1), nz = (c.z - z) / (dd || 1); c.vx += nx * 6; c.vz += nz * 6; if (!c.air) { c.air = true; c.vy = 4.5; }
    M.hits++; UI.toast('HIT BY A LAVA BOMB −' + Math.round(dmg), 'bad');
  } else if (dd < 30) M.dodged++;
};

Volc.update = function (dt) {
  if (!Volc.built) return;
  const V = VOLC, c = car, t = App.time, day = typeof L !== 'undefined' && L.hemi ? clamp(L.hemi.intensity / 0.8, 0.1, 1) : 1, dv = Math.hypot(Pl.x - V.x, Pl.z - V.z);
  Volc.near = dv < 2600; Volc.grp.visible = dv < 6000;
  for (const m of [Volc.mat, Volc.fMat]) { const u = m.uniforms; u.uT.value = t; u.uDay.value = day; if (scene.fog) { u.uFogC.value.copy(scene.fog.color); u.uFogD.value = scene.fog.density || 0.001; } }
  const M = Mi && Mi.type === 'erupt' ? Mi : null, R = M && M.vol;
  /* the eruption: rumbling through the countdown, then it blows */
  if (R && M.phase === 'countdown') { Cam.shake = Math.max(Cam.shake, 0.25 + (6.2 - M.cd) * 0.12); Volc.erupt = Math.max(Volc.erupt, (6.2 - M.cd) / 12); if (M.cd < 3.2 && !R.warned) { R.warned = true; UI.toast('The ground is shaking. Get ready!', 'bad'); } }
  if (R && M.phase === 'run') {
    if (!R.boom) {
      R.boom = true; Volc.erupt = 1; Cam.shake = 4; Snd.crash(40); if (Snd.ok && Snd.noiseHit) Snd.noiseHit(Snd.ctx.currentTime, 1.6, 0.9, 0, 700, Snd.sfx);
      sparks(V.x, volcLakeY() + 8, V.z, 120, 60); UI.banner('IT’S ERUPTING!', 'Get down the mountain, ahead of the lava'); R.front = V.RIM - 10; Volc.front.visible = true;
    }
    const s = (c.x - V.x) * V.ux + (c.z - V.z) * V.uz, l = Math.abs(-(c.x - V.x) * V.uz + (c.z - V.z) * V.ux);
    const v = Math.min(23, 9 + M.t * 0.42); R.front = Math.min(VOL.LAVA_END, Math.max(R.front + v * dt, s - 170)); Volc.fMat.uniforms.uFront.value = R.front;
    Cam.shake = Math.max(Cam.shake, 0.22);
    if (!Foot.on && s < R.front - 1 && s > V.RIM && l < volcFrontW(s) / 2 * 0.9) return endMission(false, 'ENGULFED', ['The lava caught you on the slope.', 'Bombs dodged ' + R.dodged], 0);
    R.bombT -= dt; if (R.bombT <= 0) { Volc.fire(); R.bombT = Math.max(0.42, 1.0 - M.t * 0.012) * (0.75 + Math.random() * 0.5); }
  } else if (Volc.cool > 0) { Volc.cool -= dt; if (Volc.cool <= 0) Volc.front.visible = false; }
  if (!R || M.phase === 'done') Volc.erupt = Math.max(0, Volc.erupt - dt * 0.04);
  /* bombs in flight: a fiery trail, and the ring tightening as it comes */
  for (const b of Volc.bombs) {
    if (!b.on) continue; b.t += dt; const k = b.t / b.ft;
    if (k >= 1) { Volc.land(b); continue; }
    const x = b.x0 + (b.x1 - b.x0) * k, z = b.z0 + (b.z1 - b.z0) * k, y = b.y0 + b.vy * b.t - 8 * b.t * b.t; b.m.position.set(x, y, z);
    if (Math.random() < dt * 40) emit(Part.fire, x, y, z, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, 0.4, 1.6, 1.2, 2.4, 0.8, 0.15, 0.7, 0);
    if (Math.random() < dt * 14) emit(Part.smoke, x, y, z, 0, 1, 0, 2.2, 1.8, 4.5, 0.08, 0.07, 0.07, 0.5, -0.1);
    b.r.scale.setScalar(1.6 - 0.8 * k); b.r.material.opacity = 0.45 + 0.45 * Math.abs(Math.sin(b.t * (6 + 10 * k)));
  }
  /* smoke: a steady plume, a towering black column while it erupts */
  const E = Volc.erupt; Volc.puffT -= dt;
  if (Volc.puffT <= 0) {
    Volc.puffT = E > 0.3 ? 0.14 : 0.75; const p = Volc.puffs.find((q) => q.userData.age >= q.userData.life);
    if (p) { const u = p.userData; u.age = 0; u.life = E > 0.3 ? 9 : 20; u.v = E > 0.3 ? 26 + Math.random() * 10 : 4 + Math.random() * 2; u.s0 = E > 0.3 ? 60 : 30; u.s1 = E > 0.3 ? 260 : 150; u.dx = 2.2 + Math.random(); u.dz = 0.6 * (Math.random() - 0.5); u.dark = E > 0.3; p.position.set(V.x + (Math.random() - 0.5) * 30, volcLakeY() + 12, V.z + (Math.random() - 0.5) * 30); p.visible = true; }
  }
  for (const p of Volc.puffs) {
    const u = p.userData; if (u.age >= u.life) { p.visible = false; continue; }
    u.age += dt; const f = u.age / u.life; p.position.x += u.dx * dt * (1 + f * 3); p.position.z += u.dz * dt; p.position.y += u.v * dt * (1 - f * 0.6);
    p.scale.setScalar(u.s0 + (u.s1 - u.s0) * Math.sqrt(f)); p.material.opacity = (u.dark ? 0.8 : 0.5) * sstep(0, 0.08, f) * (1 - f);
    const g = (u.dark ? 0.16 : 0.55) * (0.35 + 0.65 * day), hot = u.dark ? Math.max(0, 1 - f * 4) * 0.9 : 0; p.material.color.setRGB(g + hot, g + hot * 0.35, g + hot * 0.08);
  }
  Volc.glow.material.opacity = (0.18 + 0.5 * (1 - day)) * (1 + E * 1.4) * (0.9 + 0.1 * Math.sin(t * 2.3)); Volc.glow.scale.setScalar(170 + E * 160);
  /* the lava burns: drive in and the car catches fire */
  if (Volc.near && !Foot.on && !Fly.on && !Boat.on && c.wrecked <= 0 && App.mode === 'play' && Volc.lava(c.x, c.z, c.y) && c.y < terrainHeight(c.x, c.z) + 3) {
    if (!devOn('god')) c.health -= 38 * dt; Volc.burnT -= dt;
    if (Math.random() < dt * 30) emit(Part.fire, c.x + (Math.random() - 0.5) * 2, c.y + 0.4, c.z + (Math.random() - 0.5) * 2, c.vx * 0.3, 2 + Math.random() * 2, c.vz * 0.3, 0.5, 1, 1.5, 2.4, 0.9, 0.2, 0.8, -1);
    if (Volc.burnT <= 0) { Volc.burnT = 3; UI.toast('LAVA! Get out of it', 'bad'); }
  }
};
