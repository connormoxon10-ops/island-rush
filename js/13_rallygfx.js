/* ================= RALLY: RENDERING (terrain tiles, instanced forest, plank gates, light shafts) =================
   Everything the stage looks like. The stage model (13_rallycore.js) provides the ground grid, the tree list and the gate layout; this file
   turns them into meshes. The forest is the expensive part: ~40k trees are split into 128 m cells, each cell holds one InstancedMesh per tree
   variant, and every frame the cells near the car are drawn with full foliage (and cast shadows) while the ones further out are drawn as
   cheap trunk + cone silhouettes. Cells outside the view never reach the GPU. All of it sits in one THREE.Group (RYG.group). */
const RYG = { built: false, group: null, tiles: [], cells: [], rocks: [], gates: null, shafts: null, motes: null, far: 380, near: 92 };
const RYG_CELL = 128, RYG_TILE = 32;
RYG.U = {
  time: { value: 0 }, dap: { value: 0.6 }, bump: { value: 0.12 }, wet: { value: 0 },
  sunV: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: new THREE.Color(1, 0.8, 0.5) }, sunAmt: { value: 1 }
};

/* ---------------- shader pieces ---------------- */
const RYG_NOISE = `
float rh_(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float rn_(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(rh_(i), rh_(i + vec2(1.0, 0.0)), f.x), mix(rh_(i + vec2(0.0, 1.0)), rh_(i + vec2(1.0, 1.0)), f.x), f.y); }
float rf_(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * rn_(p); p = p * 2.03 + 17.1; a *= 0.5; } return v; }
vec3 perturbN_(vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection){
  vec3 vSigmaX = vec3(dFdx(surf_pos.x), dFdx(surf_pos.y), dFdx(surf_pos.z)); vec3 vSigmaY = vec3(dFdy(surf_pos.x), dFdy(surf_pos.y), dFdy(surf_pos.z));
  vec3 vN = surf_norm; vec3 R1 = cross(vSigmaY, vN); vec3 R2 = cross(vN, vSigmaX); float fDet = dot(vSigmaX, R1) * faceDirection;
  vec3 vGrad = sign(fDet) * (dHdxy.x * R1 + dHdxy.y * R2); return normalize(abs(fDet) * surf_norm - vGrad);
}`;

/* the dirt road, the gravel berms and the forest floor, all procedural from three vertex attributes (aRD = distance from the centre line and from the road edge, aSec = surface type weights) */
function _rygGroundMat() {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });
  m.extensions = { derivatives: true };
  m.customProgramCacheKey = () => 'rygound';
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = RYG.U.time; sh.uniforms.uDap = RYG.U.dap; sh.uniforms.uBump = RYG.U.bump; sh.uniforms.uWet = RYG.U.wet;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 aRD; attribute vec4 aSec; varying vec2 vRD; varying vec4 vSec; varying vec3 vWp;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n vRD = aRD; vSec = aSec; vWp = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = 'uniform float uTime, uDap, uBump, uWet; varying vec2 vRD; varying vec4 vSec; varying vec3 vWp;\n' + RYG_NOISE + '\n' + sh.fragmentShader
      .replace('#include <color_fragment>', `#include <color_fragment>
      vec2 w_ = vWp.xz + vWp.y * vec2(0.73, 0.52); float d_ = vRD.x, e_ = vRD.y, a_ = abs(d_);
      float fw_ = length(fwidth(w_));
      float f3_ = 1.0 - smoothstep(0.17 / 4.3, 0.55 / 4.3, fw_), f4_ = 1.0 - smoothstep(0.17 / 17.0, 0.55 / 17.0, fw_), f5_ = 1.0 - smoothstep(0.17 / 61.0, 0.55 / 61.0, fw_);
      float n1 = rf_(w_ * 0.21), n2 = rf_(w_ * 0.9 + 3.7), n3 = mix(0.5, rn_(w_ * 4.3), f3_), n4 = mix(0.5, rn_(w_ * 17.0), f4_), n5 = mix(0.5, rn_(w_ * 61.0), f5_);
      vec3 cHard = vec3(0.50, 0.36, 0.22), cGrav = vec3(0.60, 0.55, 0.46), cMud = vec3(0.26, 0.18, 0.11), cSand = vec3(0.72, 0.60, 0.42);
      vec3 road = cHard * vSec.x + cGrav * vSec.y + cMud * vSec.z + cSand * vSec.w;
      road *= 0.76 + 0.5 * n1 + 0.2 * (n3 - 0.5);
      float rut_ = smoothstep(0.42, 0.85, a_) * (1.0 - smoothstep(1.35, 1.85, a_));
      road = mix(road, road * vec3(0.6, 0.57, 0.55), rut_ * 0.72);
      road = mix(road, road * 1.16 + vec3(0.03), (1.0 - smoothstep(0.0, 0.45, a_)) * 0.45);
      road += (n5 - 0.5) * 0.11 + (n4 - 0.5) * 0.08;
      float berm_ = smoothstep(-1.9, -0.5, e_) * (1.0 - smoothstep(-0.2, 0.7, e_));
      road = mix(road, cGrav * (0.78 + 0.45 * n3), berm_ * 0.62);
      float tuft_ = (1.0 - smoothstep(0.3, 0.8, a_)) * smoothstep(0.62, 0.82, n2) * (1.0 - vSec.z * 0.6);
      road = mix(road, vec3(0.20, 0.27, 0.10) * (0.7 + 0.6 * n4), tuft_ * 0.8);
      vec3 cNeedle = vec3(0.32, 0.20, 0.10), cMoss = vec3(0.11, 0.19, 0.06), cLeaf = vec3(0.36, 0.18, 0.06), cDirt = vec3(0.19, 0.13, 0.08);
      vec3 flo = mix(cNeedle, cDirt, smoothstep(0.35, 0.7, n1));
      flo = mix(flo, cMoss, smoothstep(0.5, 0.75, rf_(w_ * 0.43 + 9.0)) * 0.9);
      flo = mix(flo, cLeaf, smoothstep(0.62, 0.85, n3) * 0.45);
      flo *= 0.62 + 0.75 * n4; flo += (n5 - 0.5) * 0.05;
      vec3 shoulder = vec3(0.25, 0.27, 0.10) * (0.7 + 0.7 * n3);
      flo = mix(shoulder, flo, smoothstep(0.5, 5.0, e_));
      float t_ = smoothstep(-0.2, 0.9, e_);
      vec3 alb = mix(road, flo, t_) * (1.0 - 0.3 * smoothstep(8.0, 46.0, e_));
      alb = mix(alb, vec3(0.05, 0.085, 0.045), smoothstep(34.0, 96.0, e_) * 0.88);   /* the far hillside under the haze reads as dark conifer forest, not a pale cut-off slab */
      alb = mix(alb, alb * vec3(0.55, 0.5, 0.47), uWet * (1.0 - t_) * 0.6);
      diffuseColor.rgb *= pow(alb, vec3(2.2));
      float hg_ = (n2 - 0.5) * 0.55 + (n4 - 0.5) * 0.35 + (n5 - 0.5) * 0.2 - rut_ * 0.9 + berm_ * 0.5 * n3;
      hg_ = mix(hg_, (n3 - 0.5) * 1.1 + (n2 - 0.5) * 0.8, t_);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      normal = perturbN_(-vViewPosition, normal, vec2(dFdx(hg_), dFdy(hg_)) * uBump * (1.0 - smoothstep(25.0, 95.0, length(vViewPosition))), faceDirection);`)
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
      { float cp_ = rf_(vWp.xz * 0.55 + vec2(uTime * 0.07, uTime * 0.045)) * 0.65 + rn_(vWp.xz * 2.3 + vec2(-uTime * 0.19, uTime * 0.12)) * 0.35;
        float dap_ = mix(1.0, smoothstep(0.3, 0.62, cp_) * 1.3 + 0.2, uDap * (0.45 + 0.55 * smoothstep(-2.0, 6.0, e_)));
        reflectedLight.directDiffuse *= dap_; }`);
  };
  return m;
}

/* leaf cards for instanced trees: wind from the instance's world position (gusts travel through the forest), backlit glow when you look toward the sun */
function _rygLeafMat() {
  const src = MAT.foliage;
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, map: src.map, alphaTest: src.alphaTest, side: THREE.DoubleSide, roughness: 1, metalness: 0, envMapIntensity: 0 });
  if (src.alphaToCoverage) m.alphaToCoverage = true;
  m.customProgramCacheKey = () => 'ryleaf';
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uWind = Wind.t; sh.uniforms.uSunV = RYG.U.sunV; sh.uniforms.uSunCol = RYG.U.sunCol; sh.uniforms.uSunAmt = RYG.U.sunAmt;
    sh.vertexShader = 'uniform float uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vec3 wp_ = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
      vec2 tid_ = floor(uv * 2.0);
      float amp_ = tid_.y > 0.5 ? (tid_.x < 0.5 ? 0.06 : 0.035) : (tid_.x < 0.5 ? 0.12 : 0.16);
      float gust_ = 0.55 + 1.1 * pow(0.5 + 0.5 * sin(wp_.x * 0.043 + wp_.z * 0.031 - uWind * 1.05), 2.0);
      float w_ = amp_ * fract(uv.y * 2.0) * gust_;
      float ph_ = wp_.x * 0.31 + wp_.z * 0.23;
      transformed.x += (sin(uWind * 1.7 + ph_) + 0.45 * sin(uWind * 3.3 + ph_ * 2.1)) * w_;
      transformed.z += cos(uWind * 1.4 + ph_ * 1.3) * w_ * 0.7;`);
    sh.fragmentShader = 'uniform vec3 uSunV, uSunCol; uniform float uSunAmt;\n' + sh.fragmentShader
      .replace('#include <color_fragment>', `#include <color_fragment>
      diffuseColor.rgb *= 0.6;
      /* cards right in front of the lens (camera pushed into a canopy after a crash) dissolve in a screen-door pattern instead of washing the whole view with one big backlit leaf */
      float nd_ = length(vViewPosition);
      if (nd_ < 3.2) { vec2 dq_ = floor(mod(gl_FragCoord.xy, 4.0)); float th_ = (dq_.x * 4.0 + dq_.y + 0.5) / 16.0; if (smoothstep(0.9, 3.2, nd_) < th_) discard; }`)
      .replace('#include <normal_fragment_begin>', THREE.ShaderChunk.normal_fragment_begin.replace('gl_FrontFacing ? 1.0 : - 1.0', '1.0'))
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      { float bl_ = pow(max(dot(normalize(-vViewPosition), uSunV), 0.0), 3.0); totalEmissiveRadiance += diffuseColor.rgb * uSunCol * bl_ * uSunAmt * 0.5 * smoothstep(1.5, 8.0, length(vViewPosition)); }`);
  };
  return m;
}

/* rock cuttings and dry-stone walls: world-space noise for the grain, strata and moss, and a block pattern for the stone from the uv (metres along the wall, world height) */
function _rygRockMat(stone) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0, side: THREE.DoubleSide });
  m.extensions = { derivatives: true };
  m.customProgramCacheKey = () => (stone ? 'rystone' : 'ryrock');
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp; varying vec3 vNw; varying vec2 vUv2;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n vWp = (modelMatrix * vec4(transformed, 1.0)).xyz; vNw = normalize(mat3(modelMatrix) * objectNormal); vUv2 = uv;');
    sh.fragmentShader = 'varying vec3 vWp; varying vec3 vNw; varying vec2 vUv2;\n' + RYG_NOISE + '\n' + sh.fragmentShader
      .replace('#include <color_fragment>', `#include <color_fragment>
      float nA_ = rf_(vWp.xy * 0.8 + vWp.z * 0.37), nB_ = rf_(vWp.zy * 1.9 + vWp.x * 0.61), nC_ = rn_(vWp.xz * 6.0 + vWp.y * 3.1), nD_ = rn_(vWp.xy * 17.0 + vWp.z * 11.0);
      float moss_ = smoothstep(0.52, 0.78, rf_(vWp.xz * 0.9 + vWp.y * 0.35)) * (0.35 + 0.65 * smoothstep(-0.2, 0.9, vNw.y));
      float hg_ = 0.0; vec3 mul_ = vec3(1.0);
      ${stone ? `
      vec2 p_ = vec2(vUv2.x, vUv2.y / 0.36); float row_ = floor(p_.y), len_ = 0.55 + 0.7 * rh_(vec2(row_, 5.0));
      float x_ = (p_.x + rh_(vec2(row_, 11.0)) * 3.0) / len_, col_ = floor(x_); vec2 f_ = vec2(fract(x_), fract(p_.y));
      float edge_ = min(min(f_.x, 1.0 - f_.x) * len_, min(f_.y, 1.0 - f_.y) * 0.36), bid_ = rh_(vec2(col_ + row_ * 17.0, row_));
      float mort_ = 1.0 - smoothstep(0.014, 0.05, edge_), dome_ = smoothstep(0.0, 0.1, edge_);
      mul_ = mix(vec3(0.78, 0.74, 0.7), vec3(1.2, 1.12, 0.98), bid_) * (0.78 + 0.44 * nB_);
      mul_ = mix(mul_, vec3(0.3, 0.27, 0.24), mort_);
      hg_ = dome_ * 0.7 - mort_ * 0.5 + (nC_ - 0.5) * 0.35 + (nD_ - 0.5) * 0.15;
      moss_ *= 0.8 + 0.6 * mort_;` : `
      float str_ = 0.5 + 0.5 * sin(vWp.y * 4.6 + nA_ * 3.4 + nB_ * 1.2);
      mul_ = vec3(0.74 + 0.5 * nB_) * mix(0.78, 1.14, str_) * (0.85 + 0.3 * nC_);
      mul_ *= mix(vec3(1.0), vec3(1.12, 0.98, 0.84), smoothstep(0.55, 0.8, nA_) * 0.6);
      hg_ = (nA_ - 0.5) * 1.1 + (nB_ - 0.5) * 0.8 + (nC_ - 0.5) * 0.45 + (nD_ - 0.5) * 0.2 - smoothstep(0.62, 0.7, str_) * 0.25;`}
      diffuseColor.rgb = mix(diffuseColor.rgb * mul_, vec3(0.045, 0.075, 0.025) * (0.6 + 0.8 * nC_), moss_ * 0.55);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      normal = perturbN_(-vViewPosition, normal, vec2(dFdx(hg_), dFdy(hg_)) * ${stone ? '0.1' : '0.14'} * (1.0 - smoothstep(18.0, 80.0, length(vViewPosition))), faceDirection);`);
  };
  return m;
}

/* ---------------- small geometry helpers ---------------- */
function _rygGeoFromGB(gb) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(gb.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(gb.n, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(gb.c, 3));
  if (gb.u) g.setAttribute('uv', new THREE.Float32BufferAttribute(gb.u, 2));
  g.computeBoundingSphere(); return g;
}
/* flat-shaded triangle soup builder with uv + colour (used for the plank pieces) */
class _RygSoup {
  constructor() { this.p = []; this.n = []; this.u = []; this.c = []; }
  tri(a, b, c, ua, ub, uc, col) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    for (const [P, U] of [[a, ua], [b, ub], [c, uc]]) { this.p.push(P[0], P[1], P[2]); this.n.push(nx, ny, nz); this.u.push(U[0], U[1]); this.c.push(col[0], col[1], col[2]); }
  }
  quad(a, b, c, d, ua, ub, uc, ud, col) { this.tri(a, b, c, ua, ub, uc, col); this.tri(a, c, d, ua, uc, ud, col); }
  geo() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3)); g.computeBoundingSphere(); return g;
  }
}
/* unit box (centred), outward winding checked by the normal test below */
function _rygUnitBox() {
  const s = new _RygSoup(), W = [1, 1, 1], h = 0.5;
  const f = (a, b, c, d, ua, ub, uc, ud, k) => { s.quad(a, b, c, d, ua, ub, uc, ud, [k, k, k]); };
  f([-h, -h, h], [h, -h, h], [h, h, h], [-h, h, h], [0, 0], [1, 0], [1, 1], [0, 1], 1);
  f([h, -h, -h], [-h, -h, -h], [-h, h, -h], [h, h, -h], [0, 0], [1, 0], [1, 1], [0, 1], 0.95);
  f([h, -h, h], [h, -h, -h], [h, h, -h], [h, h, h], [0, 0], [1, 0], [1, 1], [0, 1], 0.88);
  f([-h, -h, -h], [-h, -h, h], [-h, h, h], [-h, h, -h], [0, 0], [1, 0], [1, 1], [0, 1], 0.88);
  f([-h, h, h], [h, h, h], [h, h, -h], [-h, h, -h], [0, 0], [1, 0], [1, 1], [0, 1], 1.05);
  f([-h, -h, -h], [h, -h, -h], [h, -h, h], [-h, -h, h], [0, 0], [1, 0], [1, 1], [0, 1], 0.7);
  return s.geo();
}
/* a plank end that has snapped: unit box whose top (or bottom) edge is a zig-zag of splinters, different at the front and back so the break runs diagonally */
function _rygJagged(top, seed) {
  const r = mulberry32(seed), s = new _RygSoup(), N = 7, sg = top ? 1 : -1, fr = [], bk = [], bright = [1.5, 1.3, 1.0], base = [1, 1, 1];
  for (let i = 0; i <= N; i++) {
    const x = -0.5 + i / N, spike = (i % 2 ? 0.1 + r() * 0.2 : r() * 0.05);
    fr.push([x, sg * (0.5 - spike)]); bk.push([x, sg * (0.5 - Math.max(0, spike + (r() - 0.5) * 0.28))]);
  }
  const yb = -sg * 0.5;
  for (let i = 0; i < N; i++) {
    const a = fr[i], b = fr[i + 1], c = bk[i], d = bk[i + 1], u0 = i / N, u1 = (i + 1) / N;
    /* front and back faces: from the flat end up to the zig-zag */
    if (top) {
      s.quad([a[0], yb, 0.5], [b[0], yb, 0.5], [b[0], b[1], 0.5], [a[0], a[1], 0.5], [u0, 0], [u1, 0], [u1, 0.5 + b[1]], [u0, 0.5 + a[1]], base);
      s.quad([d[0], yb, -0.5], [c[0], yb, -0.5], [c[0], c[1], -0.5], [d[0], d[1], -0.5], [u1, 0], [u0, 0], [u0, 0.5 + c[1]], [u1, 0.5 + d[1]], base);
      s.quad([a[0], a[1], 0.5], [b[0], b[1], 0.5], [d[0], d[1], -0.5], [c[0], c[1], -0.5], [u0, 0.5], [u1, 0.5], [u1, 0.9], [u0, 0.9], bright);
    } else {
      s.quad([b[0], yb, 0.5], [a[0], yb, 0.5], [a[0], a[1], 0.5], [b[0], b[1], 0.5], [u1, 1], [u0, 1], [u0, 0.5 + a[1]], [u1, 0.5 + b[1]], base);
      s.quad([c[0], yb, -0.5], [d[0], yb, -0.5], [d[0], d[1], -0.5], [c[0], c[1], -0.5], [u0, 1], [u1, 1], [u1, 0.5 + d[1]], [u0, 0.5 + c[1]], base);
      s.quad([b[0], b[1], 0.5], [a[0], a[1], 0.5], [c[0], c[1], -0.5], [d[0], d[1], -0.5], [u1, 0.5], [u0, 0.5], [u0, 0.9], [u1, 0.9], bright);
    }
  }
  /* sides and the flat end */
  const e0 = fr[0], f0 = bk[0], e1 = fr[N], f1 = bk[N];
  if (top) {
    s.quad([-0.5, yb, -0.5], [-0.5, yb, 0.5], [e0[0], e0[1], 0.5], [f0[0], f0[1], -0.5], [0, 0], [1, 0], [1, 1], [0, 1], base);
    s.quad([0.5, yb, 0.5], [0.5, yb, -0.5], [f1[0], f1[1], -0.5], [e1[0], e1[1], 0.5], [0, 0], [1, 0], [1, 1], [0, 1], base);
    s.quad([-0.5, yb, -0.5], [0.5, yb, -0.5], [0.5, yb, 0.5], [-0.5, yb, 0.5], [0, 0], [1, 0], [1, 1], [0, 1], base);
  } else {
    s.quad([-0.5, yb, 0.5], [-0.5, yb, -0.5], [f0[0], f0[1], -0.5], [e0[0], e0[1], 0.5], [0, 0], [1, 0], [1, 1], [0, 1], base);
    s.quad([0.5, yb, -0.5], [0.5, yb, 0.5], [e1[0], e1[1], 0.5], [f1[0], f1[1], -0.5], [0, 0], [1, 0], [1, 1], [0, 1], base);
    s.quad([-0.5, yb, 0.5], [0.5, yb, 0.5], [0.5, yb, -0.5], [-0.5, yb, -0.5], [0, 0], [1, 0], [1, 1], [0, 1], base);
  }
  return s.geo();
}
/* a splinter: long thin prism along y with a pointed tip */
function _rygSplinter() {
  const s = new _RygSoup(), h = 0.5, c = [1.35, 1.15, 0.85];
  const B = [[-h, -h, -h], [h, -h, -h], [h, -h, h], [-h, -h, h]], tip = [0, h, 0];
  for (let i = 0; i < 4; i++) { const a = B[i], b = B[(i + 1) % 4]; s.tri(a, b, tip, [0, 0], [1, 0], [0.5, 1], c); }
  s.quad(B[3], B[2], B[1], B[0], [0, 0], [1, 0], [1, 1], [0, 1], c);
  return s.geo();
}
function _rygPlankTex() {
  const W = 128, H = 512, c = mkCanvas(W, H), g = c.getContext('2d'), r = mulberry32(81);
  g.fillStyle = '#8c6f4b'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 90; i++) { const x = r() * W, w = 1 + r() * 4, v = 100 + r() * 70 | 0; g.fillStyle = `rgba(${v},${v * 0.78 | 0},${v * 0.52 | 0},${0.12 + r() * 0.22})`; g.fillRect(x, 0, w, H); }
  for (let i = 0; i < 40; i++) { const x = r() * W, v = 40 + r() * 40 | 0; g.strokeStyle = `rgba(${v},${v * 0.7 | 0},${v * 0.45 | 0},${0.25 + r() * 0.3})`; g.lineWidth = 0.6 + r() * 1.3; g.beginPath(); g.moveTo(x, 0); let xx = x; for (let y = 0; y <= H; y += 24) { xx += (r() - 0.5) * 4; g.lineTo(xx, y); } g.stroke(); }
  for (let k = 0; k < 3; k++) { const x = 20 + r() * (W - 40), y = 30 + r() * (H - 60), rad = 5 + r() * 7; const gr = g.createRadialGradient(x, y, 1, x, y, rad); gr.addColorStop(0, 'rgba(40,26,14,0.9)'); gr.addColorStop(0.5, 'rgba(70,48,28,0.55)'); gr.addColorStop(1, 'rgba(70,48,28,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, rad * 0.8, rad * 1.7, 0, 0, TAU); g.fill(); }
  /* weathering: grey streaks, dark edge lines, nail heads where the rails cross (rails sit at 0.55 and 1.45 m of 2.05 m) */
  for (let i = 0; i < 18; i++) { g.fillStyle = `rgba(170,170,160,${0.04 + r() * 0.08})`; g.fillRect(r() * W, r() * H, 2 + r() * 10, 30 + r() * 120); }
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, 0, 3, H); g.fillRect(W - 3, 0, 3, H);
  for (const f of [0.55 / 2.05, 1.45 / 2.05]) for (const dx of [0.3, 0.7]) { const y = H * (1 - f); g.fillStyle = 'rgba(20,16,12,0.85)'; g.beginPath(); g.arc(W * dx, y, 3, 0, TAU); g.fill(); g.fillStyle = 'rgba(150,130,100,0.7)'; g.beginPath(); g.arc(W * dx - 0.8, y - 0.8, 1.2, 0, TAU); g.fill(); }
  const t = canvasTex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}
function _rygBannerTex(text, sub, col) {
  const c = mkCanvas(1024, 192), g = c.getContext('2d');
  g.fillStyle = col || '#d83a1e'; g.fillRect(0, 0, 1024, 192);
  for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? '#111' : '#f5f5f0'; g.fillRect(i * 64, 0, 64, 14); g.fillRect(i * 64, 178, 64, 14); }
  g.fillStyle = '#fff'; g.font = '800 96px Rajdhani, Arial Black, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 512, 84);
  g.font = '600 34px Rajdhani, Arial, sans-serif'; g.fillStyle = 'rgba(255,255,255,0.88)'; g.fillText(sub, 512, 150);
  return canvasTex(c, true, false);
}

/* ---------------- terrain ---------------- */
RYG.buildTerrain = function (group, mat) {
  const gw = RY.gw, gh = RY.gh, GS = RY.GS, H = RY.H, D = RY.D, I = RY.I, T = RYG_TILE;
  let verts = 0, tris = 0;
  for (let tj = 0; tj * T < gh - 1; tj++) for (let ti = 0; ti * T < gw - 1; ti++) {
    const i0 = ti * T, j0 = tj * T, i1 = Math.min(gw - 1, i0 + T), j1 = Math.min(gh - 1, j0 + T);
    let dmin = 1e9; for (let j = j0; j <= j1; j += 3) for (let i = i0; i <= i1; i += 3) dmin = Math.min(dmin, D[j * gw + i]);
    if (dmin > RY.MAXD - 4) continue;
    const st = dmin < 26 ? 1 : dmin < 70 ? 2 : 4, nx = Math.ceil((i1 - i0) / st), nz = Math.ceil((j1 - j0) / st);
    const vx = nx + 1, vz = nz + 1, nBase = vx * vz, nSkirt = 2 * (vx + vz), nv = nBase + nSkirt;
    const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), col = new Float32Array(nv * 3), rd = new Float32Array(nv * 2), sec = new Float32Array(nv * 4);
    const vi = (a, b) => b * vx + a, gi = (a, b) => Math.min(gh - 1, j0 + b * st) * gw + Math.min(gw - 1, i0 + a * st);
    let ymin = 1e9, ymax = -1e9;
    for (let b = 0; b < vz; b++) for (let a = 0; a < vx; a++) {
      const gi_ = gi(a, b), i = Math.min(gw - 1, i0 + a * st), j = Math.min(gh - 1, j0 + b * st), v = vi(a, b);
      const x = RY.gx0 + i * GS, z = RY.gz0 + j * GS, y = H[gi_];
      pos[v * 3] = x; pos[v * 3 + 1] = y; pos[v * 3 + 2] = z; ymin = Math.min(ymin, y); ymax = Math.max(ymax, y);
      const hl = H[j * gw + Math.max(0, i - st)], hr = H[j * gw + Math.min(gw - 1, i + st)], hd = H[Math.max(0, j - st) * gw + i], hu = H[Math.min(gh - 1, j + st) * gw + i];
      let ax = hl - hr, az = hd - hu; const ay = 2 * st * GS, l = 1 / Math.hypot(ax, ay, az); nor[v * 3] = ax * l; nor[v * 3 + 1] = ay * l; nor[v * 3 + 2] = az * l;
      const idx = I[gi_], d = D[gi_] > 900 ? 120 : D[gi_]; let e = d - 4;
      if (idx >= 0) { e = d - RY.hw[idx]; const sc = RY.sec[idx]; sec[v * 4 + sc] = 1; } else sec[v * 4] = 1;
      rd[v * 2] = d; rd[v * 2 + 1] = e;
      const m = 0.86 + 0.28 * noise2(x * 0.031 + 4, z * 0.031 - 9) - 0.1 * Math.max(0, noise2(x * 0.011, z * 0.013) - 0.55); col[v * 3] = col[v * 3 + 1] = col[v * 3 + 2] = m;
    }
    /* skirts hide the cracks between tiles of different detail */
    let k = nBase; const skirt = [];
    const edge = (list) => { for (const v of list) { const s = k++; for (let q = 0; q < 3; q++) { pos[s * 3 + q] = pos[v * 3 + q]; nor[s * 3 + q] = nor[v * 3 + q]; col[s * 3 + q] = col[v * 3 + q]; } pos[s * 3 + 1] -= 3.5 + 1.5 * st; rd[s * 2] = rd[v * 2]; rd[s * 2 + 1] = rd[v * 2 + 1]; for (let q = 0; q < 4; q++) sec[s * 4 + q] = sec[v * 4 + q]; skirt.push([v, s]); } };
    const south = [], north = [], west = [], east = []; for (let a = 0; a < vx; a++) { south.push(vi(a, 0)); north.push(vi(a, vz - 1)); } for (let b = 0; b < vz; b++) { west.push(vi(0, b)); east.push(vi(vx - 1, b)); }
    edge(south); edge(north); edge(west); edge(east);
    const idxArr = new Uint16Array((nx * nz * 6) + (nSkirt * 6)); let q = 0;
    for (let b = 0; b < nz; b++) for (let a = 0; a < nx; a++) {
      const v00 = vi(a, b), v10 = vi(a + 1, b), v01 = vi(a, b + 1), v11 = vi(a + 1, b + 1);
      if ((a + b) & 1) { idxArr[q++] = v00; idxArr[q++] = v01; idxArr[q++] = v11; idxArr[q++] = v00; idxArr[q++] = v11; idxArr[q++] = v10; }
      else { idxArr[q++] = v00; idxArr[q++] = v01; idxArr[q++] = v10; idxArr[q++] = v10; idxArr[q++] = v01; idxArr[q++] = v11; }
    }
    /* skirt quads: each consecutive pair along a side; winding follows the side so the face points outward */
    let base = nBase; const sideDef = [[south, true], [north, false], [west, false], [east, true]];
    for (const [list, flip] of sideDef) {
      for (let n = 0; n < list.length - 1; n++) {
        const t0 = list[n], t1 = list[n + 1], b0 = base + n, b1 = base + n + 1;
        if (flip) { idxArr[q++] = t0; idxArr[q++] = b0; idxArr[q++] = t1; idxArr[q++] = t1; idxArr[q++] = b0; idxArr[q++] = b1; } else { idxArr[q++] = t0; idxArr[q++] = t1; idxArr[q++] = b0; idxArr[q++] = t1; idxArr[q++] = b1; idxArr[q++] = b0; }
      }
      base += list.length;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aRD', new THREE.BufferAttribute(rd, 2)); g.setAttribute('aSec', new THREE.BufferAttribute(sec, 4));
    g.setIndex(new THREE.BufferAttribute(idxArr.subarray(0, q), 1));
    const x0 = RY.gx0 + i0 * GS, z0 = RY.gz0 + j0 * GS, x1 = RY.gx0 + i1 * GS, z1 = RY.gz0 + j1 * GS;
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3((x0 + x1) / 2, (ymin + ymax) / 2, (z0 + z1) / 2), Math.hypot((x1 - x0) / 2, (z1 - z0) / 2, (ymax - ymin) / 2 + 4));
    const mesh = new THREE.Mesh(g, mat); mesh.receiveShadow = true; mesh.castShadow = false; mesh.userData.cx = (x0 + x1) / 2; mesh.userData.cz = (z0 + z1) / 2; mesh.userData.r = g.boundingSphere.radius;
    group.add(mesh); RYG.tiles.push(mesh); verts += nv; tris += q / 3;
  }
  RYG.stats.terrainVerts = verts; RYG.stats.terrainTris = tris;
};

/* ---------------- forest ---------------- */
RYG.treeVariant = function (key) {
  const V = RYG.vars[key]; if (V) return V;
  const name = key.replace(/\d+$/, ''), vi = +key.slice(name.length), src = TREE[name][vi % TREE[name].length], I4 = new THREE.Matrix4();
  const g0 = new GB(0, 0, false), g1 = new GB(0, 0, false);
  for (let i = 0; i < src.wood.length; i++) { const p = src.wood[i]; g0.geo(p.g, I4, p.c, p.s); if (i > 0 || name !== 'pine') g1.geo(p.g, I4, p.c, p.s); }
  return (RYG.vars[key] = { wood: _rygGeoFromGB(g0), far: _rygGeoFromGB(g1), leaf: src.leaf, name });
};
RYG.buildForest = function (group) {
  RYG.vars = {};
  const cells = new Map(), X0 = RY.gx0, Z0 = RY.gz0;
  const cellOf = (x, z) => { const ix = Math.floor((x - X0) / RYG_CELL), iz = Math.floor((z - Z0) / RYG_CELL), key = ix * 4096 + iz; let c = cells.get(key); if (!c) cells.set(key, c = { tr: [], un: [] }); return c; };
  for (const t of RY.trees) cellOf(t.x, t.z).tr.push(t);
  for (const u of RY.under) cellOf(u.x, u.z).un.push(u);
  const woodMat = RYG.mats.wood, leafMat = RYG.mats.leaf, m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), col = new THREE.Color();
  let nTrees = 0, nMesh = 0;
  for (const c of cells.values()) {
    const cell = { lod0: [], lod1: [], under: [], minx: 1e9, maxx: -1e9, minz: 1e9, maxz: -1e9, miny: 1e9, maxy: -1e9, shown: 0, sphere: new THREE.Sphere() };
    const byV = {};
    for (const t of c.tr) {
      const kd = RY_KINDS[t.k], vi = kd.n === 'pine' ? (kd.v & 2) : kd.v, key = kd.n + vi; (byV[key] || (byV[key] = [])).push(t);
      cell.minx = Math.min(cell.minx, t.x); cell.maxx = Math.max(cell.maxx, t.x); cell.minz = Math.min(cell.minz, t.z); cell.maxz = Math.max(cell.maxz, t.z); cell.miny = Math.min(cell.miny, t.y); cell.maxy = Math.max(cell.maxy, t.y + 16);
    }
    for (const key in byV) {
      const list = byV[key], V = RYG.treeVariant(key), n = list.length;
      const wood = new THREE.InstancedMesh(V.wood, woodMat, n), far = new THREE.InstancedMesh(V.far, woodMat, n), leaf = new THREE.InstancedMesh(V.leaf, leafMat, n);
      for (let i = 0; i < n; i++) {
        const t = list[i]; q.setFromAxisAngle(up, t.rot); p.set(t.x, t.y - 0.12, t.z); s.set(t.sc, t.sc * (0.92 + 0.16 * ((t.t * 5.3) % 1)), t.sc); m4.compose(p, q, s);
        wood.setMatrixAt(i, m4); const k = 0.82 + t.t * 0.36, h = (t.t * 7.7) % 1; col.setRGB(k * (1 + (h - 0.5) * 0.35), k, k * (1 - (h - 0.5) * 0.45)); wood.setColorAt(i, col);
      }
      wood.instanceMatrix.needsUpdate = true; wood.instanceColor.needsUpdate = true;
      far.instanceMatrix = leaf.instanceMatrix = wood.instanceMatrix; far.instanceColor = leaf.instanceColor = wood.instanceColor;
      for (const m of [wood, far, leaf]) { m.frustumCulled = false; m.visible = false; m.receiveShadow = true; group.add(m); nMesh++; }
      wood.castShadow = true; leaf.castShadow = true; far.castShadow = false;
      cell.lod0.push(wood, leaf); cell.lod1.push(far); nTrees += n;
    }
    /* undergrowth: ferns, bushes and grass tufts (leaf cards only) */
    const byU = {};
    for (const u of c.un) { const key = u.k === 'bush' ? 'bush' + (u.v & 1) * 2 : 'grass' + (u.v % 3); (byU[key] || (byU[key] = [])).push(u); cell.minx = Math.min(cell.minx, u.x); cell.maxx = Math.max(cell.maxx, u.x); cell.minz = Math.min(cell.minz, u.z); cell.maxz = Math.max(cell.maxz, u.z); }
    for (const key in byU) {
      const list = byU[key], name = key.replace(/\d+$/, ''), vi = +key.slice(name.length), src = TREE[name][vi % TREE[name].length], n = list.length;
      const mesh = new THREE.InstancedMesh(src.leaf, leafMat, n);
      for (let i = 0; i < n; i++) {
        const u = list[i], y = RY.heightAt(u.x, u.z); q.setFromAxisAngle(up, u.rot); p.set(u.x, y - 0.05, u.z); s.set(u.sc, u.sc * (name === 'grass' ? 0.8 + 0.4 * (u.t) : 1), u.sc); m4.compose(p, q, s); mesh.setMatrixAt(i, m4);
        const k = 0.78 + u.t * 0.44; if (name === 'grass') col.setRGB(k * 0.9, k * 0.95, k * 0.62); else col.setRGB(k, k * 1.02, k * 0.85); mesh.setColorAt(i, col);
        cell.miny = Math.min(cell.miny, y); cell.maxy = Math.max(cell.maxy, y + 3);
      }
      mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true; mesh.frustumCulled = false; mesh.visible = false; mesh.castShadow = false; mesh.receiveShadow = true; group.add(mesh); cell.under.push(mesh); nMesh++;
    }
    if (cell.minx > 1e8) continue;
    const cx = (cell.minx + cell.maxx) / 2, cz = (cell.minz + cell.maxz) / 2, cy = (cell.miny + cell.maxy) / 2;
    cell.sphere.set(new THREE.Vector3(cx, cy, cz), Math.hypot((cell.maxx - cell.minx) / 2 + 6, (cell.maxz - cell.minz) / 2 + 6, (cell.maxy - cell.miny) / 2 + 6));
    RYG.cells.push(cell);
  }
  RYG.stats.cells = RYG.cells.length; RYG.stats.trees = nTrees; RYG.stats.forestMeshes = nMesh;
};
RYG.buildRocks = function (group) {
  const by = {};
  for (const r of RY.rocks) (by[r.v % TREE.rock.length] || (by[r.v % TREE.rock.length] = [])).push(r);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), col = new THREE.Color();
  for (const v in by) {
    const list = by[v], src = TREE.rock[v], mesh = new THREE.InstancedMesh(src.g, RYG.mats.wood, list.length);
    for (let i = 0; i < list.length; i++) { const r = list[i], y = RY.heightAt(r.x, r.z); q.setFromAxisAngle(up, r.rot); p.set(r.x, y + 0.05 * r.sc, r.z); s.set(r.sc * 1.25, r.sc * 1.1, r.sc * 1.25); m4.compose(p, q, s); mesh.setMatrixAt(i, m4); const k = 0.85 + 0.3 * ((r.rot * 3) % 1); col.setRGB(k * 0.66, k * 0.62, k * 0.56); mesh.setColorAt(i, col); }
    mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true; mesh.frustumCulled = false; mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); RYG.rocks.push(mesh);
  }
};
/* fallen logs and stumps along the verge (decoration; trunks and rocks are the solid things) */
RYG.buildLogs = function (group) {
  const r = mulberry32(RY.seed * 31 + 5), n = Math.round(RY.L / 34), list = [];
  for (let i = 0; i < n; i++) {
    const s = r() * RY.L, side = r() < 0.5 ? -1 : 1, hw = RY.at(s, 0, {}).hw, off = side * (hw + 1.6 + r() * r() * 9), q = RY.at(s, off, {});
    if (RY.hits(q.x, q.z, 1.4, []).length) continue;
    list.push({ x: q.x, z: q.z, yaw: r() * TAU, len: 1.8 + r() * 4, rad: 0.12 + r() * 0.2, stump: r() < 0.3 });
  }
  const geo = new THREE.CylinderGeometry(1, 1, 1, 7, 1); geo.rotateZ(Math.PI / 2);
  const gb = new GB(0, 0, false); const ng = ni(geo); const I4 = new THREE.Matrix4();
  gb.geo(ng, I4, new THREE.Color(0.2, 0.14, 0.09), 0.4);
  const g2 = _rygGeoFromGB(gb), mesh = new THREE.InstancedMesh(g2, RYG.mats.wood, list.length), m4 = new THREE.Matrix4(), qq = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), tmp = new THREE.Quaternion();
  for (let i = 0; i < list.length; i++) {
    const l = list[i], y = RY.heightAt(l.x, l.z); if (l.stump) { qq.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2); p.set(l.x, y + 0.2, l.z); s.set(0.5 + l.rad, l.rad * 1.2, l.rad * 1.2); }
    else { qq.setFromAxisAngle(up, l.yaw); p.set(l.x, y + l.rad * 0.7, l.z); s.set(l.len, l.rad, l.rad); }
    if (l.stump) { tmp.setFromAxisAngle(up, l.yaw); qq.premultiply(tmp); qq.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2); s.set(0.4 + l.rad * 2, l.rad * 1.3, l.rad * 1.3); }
    m4.compose(p, qq, s); mesh.setMatrixAt(i, m4);
  }
  mesh.instanceMatrix.needsUpdate = true; mesh.frustumCulled = false; mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); RYG.logs = mesh;
};

/* ---------------- rock cuttings and stone walls ---------------- */
/* Each wall is one mesh per side: the face (flat-shaded facets for rock, a straight course-laid face for stone), the cap on top, and the back. The terrain behind a rock cutting is raised in the
   stage model, so the cap is a ledge with the hillside climbing out of it. */
RYG.buildRails = function (group) {
  const hash = (a, b, c) => { let h = Math.imul(a * 73856093 ^ b * 19349663 ^ c * 83492791, 1) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  let tris = 0, ri = 0; RYG.rails = [];
  for (const rl of RY_RAILS) {
    ri++;
    const rock = rl.k === 'rock', stepS = rock ? 1.5 : 1.0, th = RY_RAIL_T[rl.k], sA = RY.starts[rl.e] + rl.at, n = Math.max(2, Math.round(rl.len / stepS));
    for (const side of rl.side === 0 ? [1, -1] : [rl.side]) {
      const R = side > 0 ? RY.rails.L : RY.rails.R, cols = [], sid = side > 0 ? 1 : 2;
      for (let c = 0; c <= n; c++) {
        const s = sA + rl.len * c / n, i = Math.min(RY.N - 2, Math.floor(s / RY.DS)), fr = s / RY.DS - i, hw = lerp(RY.hw[i], RY.hw[i + 1], fr), h = lerp(R.h[i], R.h[i + 1], fr);
        const q = RY.at(s, side * (hw + rl.gap), {}), qb = RY.at(s, side * (hw + rl.gap + th), {});
        cols.push({ s, h, x: q.x, z: q.z, bx: qb.x, bz: qb.z, ox: side * q.tz, oz: -side * q.tx, tx: q.tx, tz: q.tz, yb: RY.heightAt(q.x, q.z), ybb: RY.heightAt(qb.x, qb.z), u: c * rl.len / n });
      }
      if (!rock) for (let pass = 0; pass < 2; pass++) { const t = cols.map((k) => k.yb); for (let c = 1; c < n; c++) cols[c].yb = (t[c - 1] + 2 * t[c] + t[c + 1]) / 4; }
      const face = new _RygSoup(), cap = new _RygSoup(), F = rock ? [0, 0.3, 0.6, 0.84, 1] : [0, 1], NR = F.length;
      const lean = rock ? 0.3 : 0.05, grid = [];
      for (let c = 0; c <= n; c++) {
        const k = cols[c], row = [];
        for (let r = 0; r < NR; r++) {
          const f = F[r], end = c === 0 || c === n, jl = rock && !end ? (hash(ri, c, r * 7 + sid) - 0.5) * (0.5 + 0.7 * f) : 0, ja = rock && !end ? (hash(ri, c, r * 7 + 3 + sid) - 0.5) * 0.9 : 0, jy = rock && r > 0 && r < NR - 1 ? (hash(ri, c, r * 7 + 5 + sid) - 0.5) * 0.5 : 0;
          const set = lean * f * k.h + jl, y = k.yb - 0.45 + f * (k.h + 0.45) + jy + (rock && r === NR - 1 ? (hash(ri, c, 99 + sid) - 0.5) * 0.5 : 0);
          row.push([k.x + k.ox * set + k.tx * ja, y, k.z + k.oz * set + k.tz * ja]);
        }
        grid.push(row);
      }
      /* colours: strata darkening toward the foot, sun-bleached facets near the top; stone is one even tone (the shader lays the courses) */
      const colFor = (c, r, t) => { const v = hash(ri, c * 3 + t, r + sid * 5); if (!rock) return [0.2 + 0.03 * v, 0.19 + 0.03 * v, 0.17 + 0.03 * v]; const g = 0.1 + 0.07 * v + 0.05 * F[r]; return [g * 1.04, g * 0.98, g * 0.9]; };
      for (let c = 0; c < n; c++) for (let r = 0; r < NR - 1; r++) {
        const a = grid[c][r], b = grid[c + 1][r], d = grid[c + 1][r + 1], e = grid[c][r + 1];
        const uvf = (p, k) => [cols[k].u, p[1]];
        const col = colFor(c, r, 0), col2 = colFor(c, r, 1);
        face.tri(a, b, d, uvf(a, c), uvf(b, c + 1), uvf(d, c + 1), col); face.tri(a, d, e, uvf(a, c), uvf(d, c + 1), uvf(e, c), col2);
      }
      /* cap: from the top of the face back to the far edge, then the back wall down to the ground */
      for (let c = 0; c < n; c++) {
        const k0 = cols[c], k1 = cols[c + 1], t0 = grid[c][NR - 1], t1 = grid[c + 1][NR - 1];
        const lift0 = rock ? 0.12 : 0.04, b0 = [k0.bx, t0[1] + lift0, k0.bz], b1 = [k1.bx, t1[1] + lift0, k1.bz];
        const gc = rock ? [0.075, 0.095, 0.04] : [0.17, 0.17, 0.14], g2 = rock ? [0.06, 0.08, 0.03] : [0.14, 0.15, 0.1];
        cap.tri(t0, t1, b1, [0, 0], [1, 0], [1, 1], gc); cap.tri(t0, b1, b0, [0, 0], [1, 1], [0, 1], g2);
        const bb0 = [k0.bx, Math.min(k0.ybb, t0[1] - 0.6) - 0.3, k0.bz], bb1 = [k1.bx, Math.min(k1.ybb, t1[1] - 0.6) - 0.3, k1.bz];
        const bc = rock ? [0.09, 0.075, 0.06] : [0.19, 0.18, 0.16];
        face.tri(b0, b1, bb1, [k0.u, b0[1]], [k1.u, b1[1]], [k1.u, bb1[1]], bc); face.tri(b0, bb1, bb0, [k0.u, b0[1]], [k1.u, bb1[1]], [k0.u, bb0[1]], bc);
      }
      const mf = new THREE.Mesh(face.geo(), rock ? RYG.mats.rock : RYG.mats.stone), mc = new THREE.Mesh(cap.geo(), RYG.mats.wood);
      for (const m of [mf, mc]) { m.castShadow = true; m.receiveShadow = true; group.add(m); }
      RYG.rails.push(mf, mc); tris += (face.p.length + cap.p.length) / 9;
    }
  }
  RYG.stats.railTris = tris;
};

/* ---------------- gates ---------------- */
RYG.buildGates = function (group, sim) {
  const tex = _rygPlankTex(), pm = new THREE.MeshStandardMaterial({ map: tex, vertexColors: true, roughness: 0.9, metalness: 0 });
  const plank = _rygUnitBox(), stub = _rygJagged(true, 11), upper = _rygJagged(false, 23), rail = _rygUnitBox(), spl = _rygSplinter();
  const kinds = [plank, stub, upper, rail, spl], meshes = [];
  for (let k = 0; k < 5; k++) {
    const mesh = new THREE.InstancedMesh(kinds[k], pm, sim.cap[k]);
    mesh.instanceMatrix = new THREE.InstancedBufferAttribute(sim.mats[k], 16); mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.instanceColor = new THREE.InstancedBufferAttribute(sim.tint[k], 3); mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    mesh.count = Math.max(sim.count[k], k === 4 ? RW.SHARDS : 0); mesh.frustumCulled = false; mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); meshes.push(mesh);
  }
  /* posts: chunky logs with a yellow-black warning band and a cap */
  const gb = new GB(0, 0, false), post = new THREE.CylinderGeometry(0.22, 0.26, 1, 9, 1), pg = ni(post), I4 = new THREE.Matrix4(), m = new THREE.Matrix4();
  for (const G of sim.walls) for (const P of G.posts) {
    const y = RY.heightAt(P.x, P.z);
    m.compose(new THREE.Vector3(P.x, y + 1.5, P.z), new THREE.Quaternion(), new THREE.Vector3(1, 3.2, 1)); gb.geo(pg, m, new THREE.Color(0.2, 0.15, 0.1), 0.35);
    m.compose(new THREE.Vector3(P.x, y + 2.75, P.z), new THREE.Quaternion(), new THREE.Vector3(1.12, 0.5, 1.12)); gb.geo(pg, m, new THREE.Color(0.9, 0.62, 0.05), 0.1);
    m.compose(new THREE.Vector3(P.x, y + 2.4, P.z), new THREE.Quaternion(), new THREE.Vector3(1.1, 0.12, 1.1)); gb.geo(pg, m, new THREE.Color(0.03, 0.03, 0.03), 0);
    m.compose(new THREE.Vector3(P.x, y + 3.2, P.z), new THREE.Quaternion(), new THREE.Vector3(1.05, 0.12, 1.05)); gb.geo(pg, m, new THREE.Color(0.2, 0.15, 0.1), 0);
  }
  if (gb.count) { const pmesh = gb.mesh(RYG.mats.wood, true, true); pmesh.geometry.setAttribute('color', pmesh.geometry.attributes.color); group.add(pmesh); RYG.gatePosts = pmesh; }
  RYG.gates = { sim, meshes };
};
RYG.syncGates = function () {
  const G = RYG.gates; if (!G) return; const sim = G.sim;
  for (let k = 0; k < 5; k++) {
    if (!sim.dirty[k]) continue; sim.dirty[k] = false; const m = G.meshes[k]; m.instanceMatrix.needsUpdate = true; if (k === 4) m.instanceColor.needsUpdate = true; m.count = Math.max(sim.count[k], k === 4 ? RW.SHARDS : 0);
  }
};

/* ---------------- start / finish gantries, checkpoint banners ---------------- */
RYG.buildGantries = function (group) {
  const gb = new GB(0, 0, false), cyl = ni(new THREE.CylinderGeometry(0.2, 0.2, 1, 8, 1)), I = new THREE.Matrix4(), m = new THREE.Matrix4();
  const mk = (s, tex, sub, col, label) => {
    const q = RY.at(s, 0, {}), hw = q.hw + 1.4, y = RY.heightAt(q.x, q.z), c = Math.cos(q.yaw), sn = Math.sin(q.yaw), lx = c, lz = -sn;
    const yaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), q.yaw);
    for (const side of [-1, 1]) { const px = q.x + lx * hw * side, pz = q.z + lz * hw * side, py = RY.heightAt(px, pz); m.compose(new THREE.Vector3(px, py + 3.1, pz), new THREE.Quaternion(), new THREE.Vector3(1, 6.4, 1)); gb.geo(cyl, m, new THREE.Color(0.55, 0.57, 0.6), 0.2); }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(hw * 2 + 0.8, 0.5, 0.35), new THREE.MeshStandardMaterial({ color: lc(0x2a2d33), roughness: 0.6, metalness: 0.4 }));
    beam.position.set(q.x, y + 6.1, q.z); beam.quaternion.copy(yaw); beam.castShadow = true; group.add(beam);
    const ban = new THREE.Mesh(new THREE.PlaneGeometry(hw * 2 - 0.3, (hw * 2 - 0.3) * 0.19), new THREE.MeshBasicMaterial({ map: _rygBannerTex(label, sub, col), side: THREE.DoubleSide, fog: true, toneMapped: false }));
    ban.position.set(q.x, y + 5.0, q.z); ban.quaternion.copy(yaw).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI)); group.add(ban);  /* text reads from the approach side */
  };
  mk(RY.startS, null, 'WRC-STYLE FOREST STAGE · 3.7 KM', '#d83a1e', 'HOLLOW PINES');
  mk(RY.finishS, null, 'STAGE FINISH · FLYING FINISH', '#1e5fd8', 'FINISH');
  for (let i = 0; i < RY.cps.length; i++) mk(RY.cps[i], null, 'SPLIT ' + (i + 1), '#2a2d33', 'SPLIT ' + (i + 1));
  if (gb.count) { const mesh = gb.mesh(RYG.mats.wood, true, true); group.add(mesh); }
};

/* ---------------- light shafts + floating motes ---------------- */
RYG.buildShafts = function (group, n) {
  const pos = new Float32Array(n * 4 * 3), uvs = new Float32Array(n * 4 * 2), seed = new Float32Array(n * 4), idx = new Uint16Array(n * 6), base = new Float32Array(n * 4 * 3);
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < 4; k++) { const v = i * 4 + k; uvs[v * 2] = k === 1 || k === 2 ? 1 : 0; uvs[v * 2 + 1] = k >= 2 ? 1 : 0; seed[v] = Math.random(); }
    const o = i * 4; idx.set([o, o + 1, o + 2, o, o + 2, o + 3], i * 6);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aBase', new THREE.BufferAttribute(base, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2)); g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1)); g.setIndex(new THREE.BufferAttribute(idx, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    uniforms: { uSun: { value: new THREE.Vector3(0, 1, 0) }, uCol: { value: new THREE.Color(1, 0.8, 0.5) }, uAmt: { value: 1 }, uTime: RYG.U.time, uCam: { value: new THREE.Vector3() }, uFog: { value: 0.005 } },
    vertexShader: `attribute vec3 aBase; attribute float aSeed; varying vec2 vUv; varying float vA; uniform vec3 uSun, uCam; uniform float uTime, uAmt, uFog;
      void main(){ vUv = uv; vec3 b = aBase; float W = 1.4 + 3.6 * fract(aSeed * 91.7), L = 16.0 + 26.0 * fract(aSeed * 37.1);
        vec3 toC = normalize(uCam - b); vec3 side = normalize(cross(uSun, toC)); float v = uv.y, u = uv.x * 2.0 - 1.0;
        vec3 p = b + uSun * L * v + side * u * W * (0.55 + 0.45 * v);
        vec4 mv = viewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; float d = length(p - uCam);
        float fl = 0.6 + 0.4 * sin(uTime * (0.7 + fract(aSeed * 13.0)) + aSeed * 40.0) * sin(uTime * 0.37 + aSeed * 17.0);
        vA = uAmt * fl * smoothstep(3.0, 14.0, d) * exp(-d * uFog * 1.4) * (1.0 - v * 0.85) * smoothstep(0.0, 0.12, v); }`,
    fragmentShader: `varying vec2 vUv; varying float vA; uniform vec3 uCol;
      void main(){ float u = abs(vUv.x * 2.0 - 1.0); float a = (1.0 - smoothstep(0.0, 1.0, u)); a *= a; gl_FragColor = vec4(uCol * 0.55, a * vA * 0.5); }`
  });
  const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; mesh.renderOrder = 4; group.add(mesh);
  RYG.shafts = { mesh, n, pos, base, geo: g, mat, next: 0, life: new Float32Array(n) };
  /* drifting motes: pollen, dust and flying seeds in the light, animated entirely in the shader around the camera */
  const m = 360, mp = new Float32Array(m * 3); for (let i = 0; i < m * 3; i++) mp[i] = Math.random();
  const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.BufferAttribute(mp, 3));
  const mm = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    uniforms: { uCam: { value: new THREE.Vector3() }, uTime: RYG.U.time, uCol: { value: new THREE.Color(1, 0.85, 0.6) }, uAmt: { value: 1 }, uScale: { value: 600 }, uSun: { value: new THREE.Vector3(0, 1, 0) } },
    vertexShader: `uniform vec3 uCam; uniform float uTime, uScale; varying float vA; uniform vec3 uSun;
      float wr(float v, float c, float s){ return c + mod(v - c + s * 0.5, s) - s * 0.5; }
      void main(){ vec3 b = position; float W = 46.0, H = 16.0; float t = uTime;
        vec3 p; p.x = wr(b.x * W + sin(t * 0.4 + b.z * 30.0) * 1.2 + t * 0.7, uCam.x, W); p.z = wr(b.z * W + cos(t * 0.35 + b.x * 25.0) * 1.2 + t * 0.4, uCam.z, W); p.y = wr(b.y * H - t * (0.12 + b.x * 0.15) , uCam.y + 1.5, H);
        vec4 mv = viewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = clamp(uScale * (0.025 + 0.03 * b.y) / max(0.5, -mv.z), 1.0, 5.0);
        vec3 v = normalize(p - uCam); float sunAl = pow(max(dot(v, uSun), 0.0), 2.0); vA = (0.2 + 0.8 * sunAl) * smoothstep(1.5, 5.0, -mv.z) * (0.4 + 0.6 * fract(b.x * 91.0 + t * 0.2 + b.z * 7.0)); }`,
    fragmentShader: `varying float vA; uniform vec3 uCol; uniform float uAmt; void main(){ vec2 c = gl_PointCoord - 0.5; float a = 1.0 - smoothstep(0.0, 0.5, length(c)); gl_FragColor = vec4(uCol, a * a * vA * uAmt * 0.55); }`
  });
  const pts = new THREE.Points(mg, mm); pts.frustumCulled = false; pts.renderOrder = 5; group.add(pts); RYG.motes = { pts, mat: mm };
};
RYG.placeShaft = function (i, x, z) {
  const S = RYG.shafts, y = RY.heightAt(x, z) - 1; for (let k = 0; k < 4; k++) { const v = i * 4 + k; S.base[v * 3] = x; S.base[v * 3 + 1] = y; S.base[v * 3 + 2] = z; S.pos[v * 3] = x; S.pos[v * 3 + 1] = y; S.pos[v * 3 + 2] = z; }
  S.geo.attributes.aBase.needsUpdate = true; S.geo.attributes.position.needsUpdate = true;
};

/* ---------------- build / dispose ---------------- */
RYG.stats = {};
RYG.build = function (sim, opts) {
  if (RYG.built) return RYG.group; opts = opts || {};
  const t0 = performance.now(), g = RYG.group = new THREE.Group(); g.name = 'rally'; g.visible = false;
  RYG.mats = { ground: _rygGroundMat(), leaf: _rygLeafMat(), rock: _rygRockMat(false), stone: _rygRockMat(true), wood: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 }) };
  RYG.far = opts.far || 380; RYG.tiles.length = 0; RYG.cells.length = 0; RYG.rocks.length = 0;
  RYG.buildTerrain(g, RYG.mats.ground); const t1 = performance.now();
  RYG.buildForest(g); RYG.buildRocks(g); RYG.buildLogs(g); RYG.buildRails(g); const t2 = performance.now();
  RYG.buildGates(g, sim); RYG.buildGantries(g); RYG.buildShafts(g, opts.shafts == null ? 46 : opts.shafts);
  /* three r128 reuses a material's program across instanced meshes without re-checking instanceColor: give every instanced mesh one */
  g.traverse((o) => { if (o.isInstancedMesh && !o.instanceColor) { const a = new Float32Array(o.count * 3).fill(1); o.instanceColor = new THREE.InstancedBufferAttribute(a, 3); } });
  RYG.stats.msTerrain = Math.round(t1 - t0); RYG.stats.msForest = Math.round(t2 - t1); RYG.stats.msTotal = Math.round(performance.now() - t0);
  RYG.built = true; return g;
};
RYG.dispose = function () {
  if (!RYG.built) return; const g = RYG.group;
  g.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material.map) { /* shared atlas stays */ } });
  if (g.parent) g.parent.remove(g);
  RYG.built = false; RYG.group = null; RYG.tiles.length = 0; RYG.cells.length = 0; RYG.rocks.length = 0; RYG.gates = null; RYG.shafts = null; RYG.motes = null; RYG.vars = {};
};

/* ---------------- per-frame ---------------- */
const _rygFr = new THREE.Frustum(), _rygM = new THREE.Matrix4(), _rygS = new THREE.Sphere();
RYG.update = function (dt, cam, car, sun, tod) {
  if (!RYG.built) return;
  const cx = cam.position.x, cz = cam.position.z, px = car.x, pz = car.z, FAR = RYG.far, NEAR = RYG.near;
  cam.updateMatrixWorld(); _rygM.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse.copy(cam.matrixWorld).invert()); _rygFr.setFromProjectionMatrix(_rygM);
  RYG.U.time.value = App.time;
  let nt = 0, nc0 = 0, nc1 = 0;
  for (const t of RYG.tiles) { const u = t.userData, d = Math.hypot(u.cx - cx, u.cz - cz) - u.r; t.visible = d < FAR + 30 && _rygFr.intersectsSphere(t.geometry.boundingSphere); if (t.visible) nt++; }
  for (const c of RYG.cells) {
    const dxc = Math.max(c.minx - px, 0, px - c.maxx), dzc = Math.max(c.minz - pz, 0, pz - c.maxz), dCar = Math.hypot(dxc, dzc);
    const dxm = Math.max(c.minx - cx, 0, cx - c.maxx), dzm = Math.max(c.minz - cz, 0, cz - c.maxz), dCam = Math.hypot(dxm, dzm);
    const inView = _rygFr.intersectsSphere(c.sphere);
    let show = 0;                                          /* 0 hidden, 1 far silhouette, 2 full foliage */
    if (dCar < NEAR || (dCam < NEAR && inView)) show = 2; else if (dCam < FAR && inView) show = 1;
    if (show !== c.shown) { c.shown = show; for (const m of c.lod0) m.visible = show === 2; for (const m of c.lod1) m.visible = show === 1; }
    const ug = (dCar < 70 || (dCam < 120 && inView)); if (ug !== c.ug) { c.ug = ug; for (const m of c.under) m.visible = ug; }
    if (show === 2) nc0++; else if (show === 1) nc1++;
  }
  RYG.stats.tilesVisible = nt; RYG.stats.cellsNear = nc0; RYG.stats.cellsFar = nc1;
  RYG.syncGates();
  /* lighting uniforms for the leaf material + shafts + motes */
  const U = RYG.U; U.sunV.value.copy(sun.viewDir); U.sunCol.value.copy(sun.col); U.sunAmt.value = sun.amt;
  if (RYG.shafts) {
    const S = RYG.shafts, mat = S.mat; mat.uniforms.uSun.value.copy(sun.dir); mat.uniforms.uCol.value.copy(sun.col); mat.uniforms.uAmt.value = sun.shaft; mat.uniforms.uCam.value.copy(cam.position); mat.uniforms.uFog.value = scene.fog.density;
    /* recycle shafts that fell behind or drifted away: they reappear ahead of the car in the lit gaps */
    const fx = Math.sin(car.yaw), fz = Math.cos(car.yaw);
    for (let i = 0; i < S.n; i++) {
      const bx = S.base[i * 12], bz = S.base[i * 12 + 2], dx = bx - px, dz = bz - pz, d2 = dx * dx + dz * dz, ahead = dx * fx + dz * fz;
      if (S.life[i] === 0 || d2 > 260 * 260 || ahead < -60) {
        const loc = car.rs != null ? car.rs : 0, s = loc + 15 + Math.random() * 230, off = (Math.random() - 0.5) * 2 * (RY.at(s, 0, {}).hw + 11), q = RY.at(s, off, {});
        RYG.placeShaft(i, q.x, q.z); S.life[i] = 1;
      }
    }
  }
  if (RYG.motes) { const m = RYG.motes.mat; m.uniforms.uCam.value.copy(cam.position); m.uniforms.uSun.value.copy(sun.dir); m.uniforms.uCol.value.copy(sun.col); m.uniforms.uAmt.value = sun.shaft; m.uniforms.uScale.value = 0.5 * (renderer.domElement.height || 720) / Math.tan(cam.fov * DEG / 2); }
};
