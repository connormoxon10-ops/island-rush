/* ================= RENDERER, TEXTURES, MATERIALS, GEOMETRY BUILDER ================= */
let renderer, scene, camera, maxAniso = 4;
const MAT = {};
const env = { zen: new THREE.Color(), hor: new THREE.Color(), sunDir: new THREE.Vector3(0, 1, 0), sunCol: new THREE.Color(), day: 1, night: 0, lampOn: 0, exposure: 1 };

function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function canvasTex(c, srgb, repeat) {
  const t = new THREE.CanvasTexture(c);
  if (srgb !== false) t.encoding = THREE.sRGBEncoding;
  if (repeat !== false) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = maxAniso; return t;
}
function tileNoise(P, seed) {
  const r = mulberry32(seed), a = new Float32Array(P * P); for (let i = 0; i < a.length; i++) a[i] = r();
  return (x, y) => {
    const fx = x * P, fy = y * P, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
    const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    const i0 = ((ix % P) + P) % P, i1 = (i0 + 1) % P, j0 = ((iy % P) + P) % P, j1 = (j0 + 1) % P;
    const a0 = a[j0 * P + i0], a1 = a[j0 * P + i1], b0 = a[j1 * P + i0], b1 = a[j1 * P + i1];
    return (a0 + (a1 - a0) * sx) * (1 - sy) + (b0 + (b1 - b0) * sx) * sy;
  };
}

function makeDetailTex() {
  const S = 128, c = mkCanvas(S, S), g = c.getContext('2d'), im = g.createImageData(S, S);
  const n1 = tileNoise(8, 1), n2 = tileNoise(16, 2), n3 = tileNoise(32, 3), n4 = tileNoise(64, 4);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const u = x / S, v = y / S; const n = n1(u, v) * 0.35 + n2(u, v) * 0.3 + n3(u, v) * 0.2 + n4(u, v) * 0.15;
    const val = 175 + n * 80; const k = (y * S + x) * 4; im.data[k] = val; im.data[k + 1] = val; im.data[k + 2] = val * 0.97; im.data[k + 3] = 255;
  }
  g.putImageData(im, 0, 0); return canvasTex(c);
}

function makeRockTex() {
  const S = 256, c = mkCanvas(S, S), g = c.getContext('2d'), im = g.createImageData(S, S);
  const n1 = tileNoise(6, 11), n2 = tileNoise(14, 12), n3 = tileNoise(32, 13), n4 = tileNoise(64, 14), K = 9, r = mulberry32(99), pts = [];
  for (let j = 0; j < K; j++) for (let i = 0; i < K; i++) pts.push([(i + r() * 0.9) / K, (j + r() * 0.9) / K]);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const u = x / S, v = y / S, ci = Math.floor(u * K), cj = Math.floor(v * K); let d1 = 9, d2 = 9;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      const ii = ci + di, jj = cj + dj, p = pts[((jj + K) % K) * K + ((ii + K) % K)], px = p[0] + Math.floor(ii / K), py = p[1] + Math.floor(jj / K), d = Math.hypot(px - u, py - v);
      if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
    }
    const crack = 1 - sstep(0.0, 0.028, d2 - d1 + (n3(u * 1.0, v * 1.0) - 0.5) * 0.03), strata = 0.5 + 0.5 * Math.sin((v + n1(u, v) * 0.25) * Math.PI * 2 * 9);
    let val = 0.5 * n2(u, v) + 0.3 * n3(u, v) + 0.2 * n4(u, v); val = 0.55 + val * 0.55 + (strata - 0.5) * 0.08; val *= 1 - 0.42 * crack;
    const k = (y * S + x) * 4, b = Math.max(0, Math.min(255, val * 255)); im.data[k] = b; im.data[k + 1] = b; im.data[k + 2] = b; im.data[k + 3] = 255;
  }
  g.putImageData(im, 0, 0); return canvasTex(c, false);
}

function makeFacade() {
  const S = 256, c = mkCanvas(S, S), g = c.getContext('2d'), ce = mkCanvas(S, S), ge = ce.getContext('2d');
  g.fillStyle = '#e8e6e0'; g.fillRect(0, 0, S, S);
  const rnd = mulberry32(77);
  for (let i = 0; i < 700; i++) { const v = 120 + rnd() * 110 | 0; g.fillStyle = `rgba(${v},${v},${v},0.06)`; g.fillRect(rnd() * S, rnd() * S, 2 + rnd() * 12, 2 + rnd() * 12); }
  ge.fillStyle = '#000'; ge.fillRect(0, 0, S, S);
  for (let r = 0; r < 4; r++) for (let q = 0; q < 4; q++) {
    const x = q * 64 + 12, y = r * 64 + 10, w = 40, h = 40;
    g.fillStyle = 'rgba(0,0,0,0.10)'; g.fillRect(q * 64, r * 64 + 54, 64, 10);
    g.fillStyle = '#c4c1ba'; g.fillRect(x - 3, y - 3, w + 6, h + 6);
    const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#86a9c6'); gr.addColorStop(0.5, '#33495f'); gr.addColorStop(1, '#1b2a3b');
    g.fillStyle = gr; g.fillRect(x, y, w, h);
    g.fillStyle = 'rgba(255,255,255,0.16)'; g.beginPath(); g.moveTo(x, y + h * 0.55); g.lineTo(x + w * 0.6, y); g.lineTo(x + w * 0.85, y); g.lineTo(x, y + h * 0.85); g.fill();
    g.fillStyle = '#b3b0a9'; g.fillRect(x + w / 2 - 1, y, 2, h);
    if (rnd() < 0.5) { const warm = rnd() < 0.85; ge.fillStyle = warm ? `rgb(255,${180 + rnd() * 55 | 0},${100 + rnd() * 70 | 0})` : 'rgb(150,195,255)'; ge.fillRect(x, y, w, h); }
  }
  return [canvasTex(c), canvasTex(ce)];
}

function makeHwTex() {
  const c = mkCanvas(128, 256), g = c.getContext('2d'), rnd = mulberry32(5);
  g.fillStyle = '#464950'; g.fillRect(0, 0, 128, 256);
  for (let i = 0; i < 2600; i++) { const v = 55 + rnd() * 55 | 0; g.fillStyle = `rgba(${v},${v},${v + 3},0.35)`; g.fillRect(rnd() * 128, rnd() * 256, 1 + rnd() * 2, 1 + rnd() * 2); }
  g.fillStyle = 'rgba(0,0,0,0.10)'; g.fillRect(24, 0, 14, 256); g.fillRect(90, 0, 14, 256);
  g.fillStyle = '#ddd9cc'; g.fillRect(8, 0, 3, 256); g.fillRect(117, 0, 3, 256);
  g.fillStyle = '#e8c230'; g.fillRect(62, 0, 4, 100);
  return canvasTex(c);
}
function makeStTex() {
  const c = mkCanvas(128, 128), g = c.getContext('2d'), rnd = mulberry32(6);
  g.fillStyle = '#969690'; g.fillRect(0, 0, 56, 128);
  g.fillStyle = '#3b3e44'; g.fillRect(72, 0, 56, 128);
  const gr = g.createLinearGradient(56, 0, 72, 0); gr.addColorStop(0, '#969690'); gr.addColorStop(1, '#3b3e44'); g.fillStyle = gr; g.fillRect(56, 0, 16, 128);
  for (let i = 0; i < 1400; i++) { const v = 50 + rnd() * 45 | 0; g.fillStyle = `rgba(${v},${v},${v + 4},0.35)`; g.fillRect(72 + rnd() * 56, rnd() * 128, 1 + rnd() * 2, 1 + rnd() * 2); }
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, 0, 56, 2); g.fillRect(0, 62, 56, 2);
  for (let i = 0; i < 500; i++) { const v = 120 + rnd() * 50 | 0; g.fillStyle = `rgba(${v},${v},${v},0.3)`; g.fillRect(rnd() * 56, rnd() * 128, 1 + rnd() * 2, 1 + rnd() * 2); }
  return canvasTex(c);
}
function radialTex(size, inner, outer) {
  const c = mkCanvas(size, size), g = c.getContext('2d'); const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gr.addColorStop(0, inner); gr.addColorStop(1, outer); g.fillStyle = gr; g.fillRect(0, 0, size, size); return canvasTex(c, true, false);
}
function beamTex() {
  const c = mkCanvas(16, 256), g = c.getContext('2d'); const gr = g.createLinearGradient(0, 256, 0, 0);
  gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.15, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 16, 256);
  const t = canvasTex(c, true, false); return t;
}


/* terrain: world-space multi-octave detail (macro patches to blade-scale), micro bump, rock texture triplanar on steep slopes; far variant lowers + discards near the camera */
function terrainMat(dtex, far) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, map: dtex, bumpMap: dtex, bumpScale: 0.05, roughness: 1, metalness: 0 });
  m.customProgramCacheKey = () => far ? 'terrainFar' : 'terrain';
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uRockMap = { value: MAT.rockTex };
    if (far) { sh.uniforms.uCam = Far.uCam; sh.uniforms.uR0 = Far.uR0; }
    const fu = far ? 'uniform vec2 uCam; uniform float uR0;\n' : '';
    sh.vertexShader = 'varying vec3 vWp;\n' + fu + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vWp = (modelMatrix * vec4(transformed, 1.0)).xyz;' + (far ? '\n transformed.y -= 3.5 * (1.0 - smoothstep(uR0 + 150.0, uR0 + 450.0, length(vWp.xz - uCam)));' : ''));
    sh.fragmentShader = 'varying vec3 vWp;\nuniform sampler2D uRockMap;\n' + fu + sh.fragmentShader
      .replace('#include <map_fragment>', (far ? 'if (length(vWp.xz - uCam) < uR0) discard;\n' : '') + `
      float dist_ = length(vViewPosition);
      float nearF_ = 1.0 - smoothstep(25.0, 140.0, dist_), midF_ = 1.0 - smoothstep(140.0, 900.0, dist_);
      vec2 w_ = vWp.xz;
      float a_ = (texture2D(map, w_ * 0.0143).g - 0.84) * 3.2;
      float b_ = (texture2D(map, w_ * 0.083 + 0.31).g - 0.84) * 3.2;
      float c_ = (texture2D(map, w_ * 0.47 + 0.7).g - 0.84) * 3.2;
      float d_ = (texture2D(map, w_ * 2.3 + 0.2).g - 0.84) * 3.2;
      float hg_ = 0.34 * a_ + 0.3 * b_ * midF_ + 0.22 * c_ * nearF_ + 0.16 * d_ * nearF_;
      vec3 wn_ = inverseTransformDirection(normalize(vNormal), viewMatrix);
      float st_ = 1.0 - smoothstep(0.6, 0.93, wn_.y);
      vec3 tw_ = pow(abs(wn_), vec3(4.0)); tw_ /= (tw_.x + tw_.y + tw_.z + 1e-4);
      float rk_ = texture2D(uRockMap, vWp.zy * 0.07).g * tw_.x + texture2D(uRockMap, vWp.xz * 0.07).g * tw_.y + texture2D(uRockMap, vWp.xy * 0.07).g * tw_.z;
      float rk2_ = texture2D(uRockMap, vWp.zy * 0.33).g * tw_.x + texture2D(uRockMap, vWp.xz * 0.33).g * tw_.y + texture2D(uRockMap, vWp.xy * 0.33).g * tw_.z;
      float rl_ = clamp(0.2 + 1.35 * rk_ + (rk2_ - 0.7) * 1.2 * nearF_, 0.25, 1.6);
      diffuseColor.rgb *= 0.7 * clamp(1.0 + hg_ * 0.5, 0.5, 1.6) * mix(1.0, rl_ * 1.1, st_);
      hg_ += st_ * ((rk_ - 0.7) * 1.8 + (rk2_ - 0.7) * 0.9) * nearF_;
      `)
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n normal = perturbNormalArb(-vViewPosition, normal, vec2(dFdx(hg_), dFdy(hg_)) * 0.1, faceDirection);');
  };
  return m;
}
/* foliage cards: alpha-tested atlas, flutter in the wind, lighting ignores which side of the card you see */
function foliageMat(atlas) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, map: atlas, alphaTest: 0.42, side: THREE.DoubleSide, roughness: 1, metalness: 0, envMapIntensity: 0 });
  if (Q.ms > 0) { m.alphaToCoverage = true; m.alphaTest = 0.3; }
  m.customProgramCacheKey = () => 'foliage';
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uWind = Wind.t;
    sh.vertexShader = 'uniform float uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vec3 wp_ = (modelMatrix * vec4(transformed, 1.0)).xyz;
      vec2 tid_ = floor(uv * 2.0);
      float amp_ = tid_.y > 0.5 ? (tid_.x < 0.5 ? 0.06 : 0.035) : (tid_.x < 0.5 ? 0.12 : 0.16);
      float w_ = amp_ * fract(uv.y * 2.0);
      float ph_ = wp_.x * 0.31 + wp_.z * 0.23;
      transformed.x += (sin(uWind * 1.7 + ph_) + 0.45 * sin(uWind * 3.3 + ph_ * 2.1)) * w_;
      transformed.z += cos(uWind * 1.4 + ph_ * 1.3) * w_ * 0.7;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', THREE.ShaderChunk.normal_fragment_begin.replace('gl_FrontFacing ? 1.0 : - 1.0', '1.0'));
  };
  return m;
}

function initMaterials() {
  const [fac, facE] = makeFacade();
  MAT.rockTex = makeRockTex();
  const dtex = makeDetailTex();
  MAT.terrain = terrainMat(dtex, false); MAT.terrainFar = terrainMat(dtex, true);
  MAT.foliage = foliageMat(makeFoliageAtlas());
  MAT.prop = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0 });
  MAT.build = new THREE.MeshStandardMaterial({ vertexColors: true, map: fac, emissive: new THREE.Color(1, 1, 1), emissiveMap: facE, emissiveIntensity: 0, roughness: 0.7, metalness: 0.05 });
  MAT.hw = new THREE.MeshStandardMaterial({ map: makeHwTex(), roughness: 0.78, metalness: 0, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  MAT.st = new THREE.MeshStandardMaterial({ map: makeStTex(), roughness: 0.82, metalness: 0, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  MAT.lamp = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: true });
  MAT.pool = new THREE.MeshBasicMaterial({ map: radialTex(64, 'rgba(255,214,150,1)', 'rgba(255,214,150,0)'), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -5 });
  MAT.beam = beamTex();
  MAT.glow = radialTex(64, 'rgba(255,255,255,1)', 'rgba(255,255,255,0)');
}

/* ---------------- geometry builder (merged static meshes) ---------------- */
class GB {
  constructor(ox, oz, uv) { this.p = []; this.n = []; this.c = []; this.u = uv ? [] : null; this.ox = ox || 0; this.oz = oz || 0; }
  vtx(x, y, z, nx, ny, nz, r, g, b, u, v) {
    this.p.push(x - this.ox, y, z - this.oz); this.n.push(nx, ny, nz); this.c.push(r, g, b); if (this.u) this.u.push(u || 0, v || 0);
  }
  quadA(V0, V1, V2, V3, nx, ny, nz, r, g, b) {
    const ax = V1[0] - V0[0], ay = V1[1] - V0[1], az = V1[2] - V0[2], bx = V2[0] - V0[0], by = V2[1] - V0[1], bz = V2[2] - V0[2];
    const cx = ay * bz - az * by, cy = az * bx - ax * bz, cz = ax * by - ay * bx;
    const o = (cx * nx + cy * ny + cz * nz) < 0 ? [V0, V2, V1, V0, V3, V2] : [V0, V1, V2, V0, V2, V3];
    for (let i = 0; i < 6; i++) { const V = o[i]; this.vtx(V[0], V[1], V[2], nx, ny, nz, r, g, b, V[3], V[4]); }
  }
  triA(V0, V1, V2, nx, ny, nz, r, g, b) {
    const ax = V1[0] - V0[0], ay = V1[1] - V0[1], az = V1[2] - V0[2], bx = V2[0] - V0[0], by = V2[1] - V0[1], bz = V2[2] - V0[2];
    const cx = ay * bz - az * by, cy = az * bx - ax * bz, cz = ax * by - ay * bx;
    const o = (cx * nx + cy * ny + cz * nz) < 0 ? [V0, V2, V1] : [V0, V1, V2];
    for (let i = 0; i < 3; i++) { const V = o[i]; this.vtx(V[0], V[1], V[2], nx, ny, nz, r, g, b, V[3], V[4]); }
  }
  /* axis-aligned box, no bottom */
  box(x0, y0, z0, x1, y1, z1, r, g, b, uvs) {
    const u = uvs ? uvs : null; const tu = (a, s) => (u ? [a, s] : [0, 0]);
    const q = (A, B, C, D, nx, ny, nz, k) => this.quadA([...A, 0, 0], [...B, 0, 0], [...C, 0, 0], [...D, 0, 0], nx, ny, nz, r * k, g * k, b * k);
    q([x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0], 1, 0, 0, 0.85);
    q([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], -1, 0, 0, 0.8);
    q([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], 0, 0, 1, 0.9);
    q([x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], 0, 0, -1, 0.75);
    q([x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1], 0, 1, 0, 1.0);
  }
  /* textured building wall */
  wall(ax, az, bx, bz, y0, y1, nx, nz, r, g, b, u0, u1, v0, v1) {
    this.quadA([ax, y0, az, u0, v0], [bx, y0, bz, u1, v0], [bx, y1, bz, u1, v1], [ax, y1, az, u0, v1], nx, 0, nz, r, g, b);
  }
  /* source geometry (non-indexed: positions, normals, optional baked colour + uv) with transform */
  geo(geo, m4, col, shade) {
    if (!geo.__ih) { geo.computeBoundingBox(); geo.__y0 = geo.boundingBox.min.y; geo.__ih = 1 / Math.max(1e-6, geo.boundingBox.max.y - geo.boundingBox.min.y); }
    const pos = geo.attributes.position.array, nor = geo.attributes.normal.array, cA = geo.attributes.color ? geo.attributes.color.array : null, uA = this.u && geo.attributes.uv ? geo.attributes.uv.array : null;
    _n3.getNormalMatrix(m4); const e = _n3.elements;
    for (let i = 0, j = 0; i < pos.length; i += 3, j += 2) {
      _v3.set(pos[i], pos[i + 1], pos[i + 2]); const t = (pos[i + 1] - geo.__y0) * geo.__ih; _v3.applyMatrix4(m4);
      const nx = nor[i], ny = nor[i + 1], nz = nor[i + 2];
      let X = e[0] * nx + e[3] * ny + e[6] * nz, Y = e[1] * nx + e[4] * ny + e[7] * nz, Z = e[2] * nx + e[5] * ny + e[8] * nz; const l = 1 / (Math.hypot(X, Y, Z) || 1);
      const k = 1 - shade * (1 - t);
      this.vtx(_v3.x, _v3.y, _v3.z, X * l, Y * l, Z * l, col.r * k * (cA ? cA[i] : 1), col.g * k * (cA ? cA[i + 1] : 1), col.b * k * (cA ? cA[i + 2] : 1), uA ? uA[j] : 0, uA ? uA[j + 1] : 0);
    }
  }
  get count() { return this.p.length / 3; }
  mesh(mat, shadowCast, shadowRecv) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    if (this.u) g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2));
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, mat); m.castShadow = !!shadowCast; m.receiveShadow = shadowRecv !== false; return m;
  }
}
const _n3 = new THREE.Matrix3(), _v3 = new THREE.Vector3(), _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p3 = new THREE.Vector3(), _s3 = new THREE.Vector3(), _e = new THREE.Euler();
function ni(g) { return g.index ? g.toNonIndexed() : g; }
