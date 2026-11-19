/* ================= WEATHER + ATMOSPHERE: each region has its own sky, haze and precipitation ================= */
/* Biome.atm is the smoothed mix of the regions around the player. updateEnvironment tints sky/fog/light from it, Weather draws
   rain / snow / blowing dust around the camera (all motion is computed in the vertex shader, nothing is updated per drop on the CPU). */
Biome.atm.traffic = 1; Biome.atm.peds = 1; Biome.atm.heat = 1; Biome.atm.fine = 1; Biome.atm.over = 0; Biome.atm.rainA = 0; Biome.atm.snowA = 0; Biome.atm.dustA = 0;
Biome.cur = -1; Biome._t = null; Biome.armed = 0;
const _wkeys = ['grey', 'mist', 'warm', 'dust', 'cold', 'smog'];
/* slow weather pulses so rain / storms come and go instead of being constant */
function wxPulse(time, seed, lo) { if (Biome.wxForce) return 1; return lo + (1 - lo) * sstep(-0.25, 0.35, noise2(time * 0.011 + seed, seed * 1.7)); }
Biome.tick = function (x, z, time) {
  const A = this.atm, first = this._t == null, dt = first ? 1 : clamp(time - this._t, 0, 0.25); this._t = time; if (!Weather.main) Weather.main = scene;
  this.at(x, z);
  const k = first ? 1 : 1 - Math.exp(-dt * 0.8), n = this.n;
  for (const key of _wkeys) A[key] += (this.num(key, 'sky', 0) - A[key]) * k;
  let rain = 0, snow = 0, dust = 0;
  for (let i = 0; i < n; i++) {
    const v = this.w[i]; if (v < 0.01) continue; const R = REG[i % REG.length], w = R.wx;
    if (w.rain) rain += v * w.rain * wxPulse(time, 3 + i, 0.3); if (w.snow) snow += v * w.snow * wxPulse(time, 11 + i, 0.55); if (w.dust) dust += v * w.dust * wxPulse(time, 19 + i, 0.0);
  }
  const indoors = typeof GAR !== 'undefined' && GAR.inside ? 0 : 1;
  A.rainA += (rain * indoors - A.rainA) * k; A.snowA += (snow * indoors - A.snowA) * k; A.dustA += (dust * indoors - A.dustA) * k;
  A.rain = A.rainA; A.snow = A.snowA; A.wdust = A.dustA;
  A.traffic += (this.num('traffic', 'mod', 1) - A.traffic) * k; A.peds += (this.num('peds', 'mod', 1) - A.peds) * k;
  A.heat += (this.num('heat', 'mod', 1) - A.heat) * k; A.fine += (this.num('fine', 'mod', 1) - A.fine) * k;
  A.over = clamp(A.grey + A.rainA * 0.85 + A.snowA * 0.55 + A.dustA * 0.5, 0, 1);
  /* "entering ..." banner when the player reaches a town */
  let near = -1, nd = 1e9;
  for (let i = 0; i < towns.length; i++) { const T = towns[i], d = Math.max(Math.abs(x - T.cx), Math.abs(z - T.cz)); if (d < nd) { nd = d; near = i; } }
  const T = towns[near];
  if (this.cur < 0) {
    if (T && nd < T.half + 40) { this.cur = near; if (!first && this.armed > 120 && App.mode === 'play') { const R = REG[near % REG.length]; UI.banner(R.tag.toUpperCase(), R.name); UI.toast(R.traits.join(' \u00b7 '), 'info'); } }
  } else { const C = towns[this.cur]; if (!C || Math.max(Math.abs(x - C.cx), Math.abs(z - C.cz)) > C.half + 260) this.cur = -1; }
  this.armed++;
};
/* sky / fog tint, called right after skyAt() */
const _tinfo = { grey: [0.86, 0.88, 0.92], dust: [1.12, 0.84, 0.52], warm: [1.1, 0.95, 0.78], cold: [0.82, 0.92, 1.08], smog: [0.95, 0.84, 0.66], mist: [0.95, 0.98, 1.0] };
function _tint(c, t, a) { if (a < 0.002) return; const l = c.r * 0.3 + c.g * 0.59 + c.b * 0.11; c.r += (l * t[0] - c.r) * a; c.g += (l * t[1] - c.g) * a; c.b += (l * t[2] - c.b) * a; }
Biome.atmSky = function (env) {
  const A = this.atm; if (A.over + A.mist + A.warm + A.dust + A.cold + A.smog < 0.004) return;
  for (const c of [env.zen, env.hor]) {
    _tint(c, _tinfo.warm, A.warm * 0.6); _tint(c, _tinfo.cold, A.cold * 0.7); _tint(c, _tinfo.smog, A.smog * 0.7); _tint(c, _tinfo.dust, clamp(A.dust + A.dustA * 0.9, 0, 1) * 0.85);
    _tint(c, _tinfo.grey, A.over * 0.8); _tint(c, _tinfo.mist, A.mist * 0.5);
  }
};
Biome.fogMul = function () { const A = this.atm; return Math.min(3.4, 1 + A.mist * 1.1 + A.dust * 0.9 + A.dustA * 2.4 + A.smog * 0.5 + A.rainA * 1.5 + A.snowA * 2.1 + A.grey * 0.25); };
Biome.atmLight = function (L, env) {
  const o = this.atm.over; if (o < 0.002) return;
  L.sun.intensity *= 1 - 0.55 * o; L.hemi.intensity *= 1 + 0.28 * o; env.exposure *= 1 + 0.06 * o;
};

/* ---------- precipitation ---------- */
const Weather = { ready: false, group: null, rain: null, snow: null, dust: null, main: null };
const WX_COMMON = `uniform vec3 uCam; uniform float uTime, uAmt, uScale;
float wrp(float v, float c, float s){ return c + mod(v - c + s * 0.5, s) - s * 0.5; }
float hsh(vec3 b){ return fract(b.x * 7.31 + b.y * 13.7 + b.z * 3.1); }`;
Weather.init = function () {
  if (this.ready) return; this.ready = true;
  const g = this.group = new THREE.Group(); g.frustumCulled = false;
  const rnd = (n, per) => { const a = new Float32Array(n * per * 3); for (let i = 0; i < n; i++) { const x = Math.random(), y = Math.random(), z = Math.random(); for (let k = 0; k < per; k++) { a[(i * per + k) * 3] = x; a[(i * per + k) * 3 + 1] = y; a[(i * per + k) * 3 + 2] = z; } } return a; };
  const uni = () => ({ uCam: { value: new THREE.Vector3() }, uTime: { value: 0 }, uAmt: { value: 0 }, uScale: { value: 600 }, uLight: { value: 1 } });
  /* rain streaks */
  { const n = 2400, geo = new THREE.BufferGeometry(), end = new Float32Array(n * 2); for (let i = 0; i < n; i++) end[i * 2 + 1] = 1;
    geo.setAttribute('position', new THREE.BufferAttribute(rnd(n, 2), 3)); geo.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
    const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: uni(), fog: false,
      vertexShader: WX_COMMON + `attribute float aEnd; varying float vA; uniform float uLight;
        void main(){ vec3 b = position; float W = 28.0, H = 20.0; float h = hsh(b);
          if (h > uAmt) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); vA = 0.0; return; }
          vec3 p; p.x = wrp(b.x * W, uCam.x, W); p.z = wrp(b.z * W, uCam.z, W); p.y = wrp(b.y * H - uTime * (19.0 + b.x * 6.0), uCam.y + 4.0, H);
          p += aEnd * vec3(0.22, 1.15, 0.08); vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
          vA = (1.0 - aEnd * 0.85) * smoothstep(0.6, 2.5, -mv.z) * (0.55 + 0.45 * h); }`,
      fragmentShader: 'varying float vA; uniform float uLight; void main(){ gl_FragColor = vec4(vec3(0.7, 0.76, 0.86) * uLight, 0.42 * vA); }' });
    this.rain = new THREE.LineSegments(geo, m); this.rain.frustumCulled = false; this.rain.renderOrder = 6; g.add(this.rain); }
  /* snow flakes */
  { const n = 1500, geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(rnd(n, 1), 3));
    const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: uni(), fog: false,
      vertexShader: WX_COMMON + `varying float vA;
        void main(){ vec3 b = position; float W = 36.0, H = 24.0, t = uTime; float h = hsh(b);
          if (h > uAmt) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; vA = 0.0; return; }
          vec3 p; p.x = wrp(b.x * W + sin(t * 0.9 + b.z * 40.0) * 1.3 + t * 1.6, uCam.x, W); p.z = wrp(b.z * W + cos(t * 0.7 + b.x * 30.0) * 1.3, uCam.z, W);
          p.y = wrp(b.y * H - t * (1.5 + b.x * 1.3), uCam.y + 5.0, H);
          vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = clamp(uScale * (0.05 + 0.05 * b.y) / (-mv.z), 1.6, 8.0); vA = smoothstep(0.7, 2.5, -mv.z); }`,
      fragmentShader: 'varying float vA; uniform float uLight; void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; float a = 1.0 - smoothstep(0.35, 1.0, d); gl_FragColor = vec4(vec3(0.96, 0.98, 1.0) * (0.45 + 0.55 * uLight), a * vA * 0.9); }' });
    this.snow = new THREE.Points(geo, m); this.snow.frustumCulled = false; this.snow.renderOrder = 6; g.add(this.snow); }
  /* wind-blown dust */
  { const n = 300, geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(rnd(n, 1), 3));
    const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: uni(), fog: false,
      vertexShader: WX_COMMON + `varying float vA;
        void main(){ vec3 b = position; float W = 60.0, H = 12.0, t = uTime; float h = hsh(b);
          if (h > uAmt) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; vA = 0.0; return; }
          vec3 p; p.x = wrp(b.x * W + t * (11.0 + b.y * 6.0), uCam.x, W); p.z = wrp(b.z * W + sin(t * 0.4 + b.x * 20.0) * 2.0, uCam.z, W); p.y = uCam.y - 2.0 + b.y * H + sin(t * 0.8 + b.z * 30.0) * 0.6;
          vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = clamp(uScale * (1.4 + 1.6 * b.z) / (-mv.z), 4.0, 150.0); vA = smoothstep(3.0, 14.0, -mv.z) * (0.5 + 0.5 * b.x); }`,
      fragmentShader: 'varying float vA; uniform float uLight; void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; float a = 1.0 - smoothstep(0.0, 1.0, d); gl_FragColor = vec4(vec3(0.82, 0.62, 0.38) * (0.35 + 0.65 * uLight), a * a * vA * 0.16); }' });
    this.dust = new THREE.Points(geo, m); this.dust.frustumCulled = false; this.dust.renderOrder = 6; g.add(this.dust); }
  this.main.add(g);
};
/* called from renderFrame for every frame drawn with the main scene */
Weather.pre = function (time) {
  const A = Biome.atm; if (!this.main || scene !== this.main) { if (this.ready) for (const o of [this.rain, this.snow, this.dust]) o.visible = false; return; } if (!this.ready) { if (A.rainA + A.snowA + A.dustA < 0.02) return; this.init(); }
  const u = 0.5 * (renderer.domElement.height || 720) / Math.tan(camera.fov * DEG / 2), c = camera.position, lt = 0.25 + 0.75 * env.day;
  for (const [o, a] of [[this.rain, A.rainA], [this.snow, A.snowA], [this.dust, A.dustA]]) {
    o.visible = a > 0.02; if (!o.visible) continue;
    const U = o.material.uniforms; U.uCam.value.copy(c); U.uTime.value = time; U.uAmt.value = Math.min(1, a); U.uScale.value = u; U.uLight.value = lt;
  }
};

/* region traffic colours */
const TCOL_BY = {
  harbor: [0xe0b020, 0xc9ccd1, 0x2f5d9e, 0x6a6e75, 0xd8d8d0, 0xb4452b], desert: [0xe6dcc0, 0xc9a574, 0xb4452b, 0xd8d8d0, 0x8a6a3a, 0xe0b020],
  farm: [0x3b6b4a, 0x8f1f1f, 0xd8d8d0, 0x2f5d9e, 0x6a6e75, 0xb9892f], tropic: [0xf0ede4, 0x2fc4c0, 0xf2b0a0, 0xf0d060, 0x8fd0e0, 0xe0e0e0],
  alpine: [0xd8d8d0, 0x2f5d9e, 0xb4452b, 0x2a2f36, 0xe0e4ea, 0x3b6b4a], lake: [0x3b6b4a, 0x2a2f36, 0x6a6e75, 0x8f1f1f, 0xd8d8d0, 0x4a3a2a],
  city: [0x2a2f36, 0xc9ccd1, 0xf2f2f2, 0x1a1a1e, 0x6a6e75, 0x2f5d9e]
};
function trafficColorAt(x, z) {
  Biome.at(x, z); const R = Biome.pick(Math.random());
  if (!R || Math.random() < 0.25) return TRAFFIC_COL[(Math.random() * TRAFFIC_COL.length) | 0];
  const a = TCOL_BY[R.key]; return a[(Math.random() * a.length) | 0];
}
