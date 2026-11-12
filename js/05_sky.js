/* ================= SKY, WATER, LIGHTS, POST-PROCESSING ================= */
const L = {};
const Sky = {};
const QUAL = {
  low: { dpr: 0.75, ms: 0, bloom: false, shadow: 0, view: 3, traffic: 5, mirror: 0, tree: 0.5, fog: 1.3, ped: 14 },
  med: { dpr: 1.15, ms: 2, bloom: true, shadow: 1024, view: 4, traffic: 9, mirror: 3, tree: 0.8, fog: 1.12, ped: 30 },
  high: { dpr: 1.75, ms: 4, bloom: true, shadow: 2048, view: 5, traffic: 14, mirror: 2, tree: 1, fog: 1, ped: 52 }
};
let Q = QUAL.high, hasPost = false;

const SKY_V = `varying vec3 vDir;
void main(){ vDir=position; vec4 p=modelViewMatrix*vec4(position,1.0); gl_Position=projectionMatrix*p; gl_Position.z=gl_Position.w*0.99999; }`;
const SKY_F = `varying vec3 vDir;
uniform vec3 uSunDir,uZen,uHor,uSunCol; uniform float uTime,uDay,uNight,uSpace,uHaze;
float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float hash3(vec3 p){ p=fract(p*0.3183099+vec3(0.1,0.2,0.3)); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float vn(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y); }
float fbm(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<5;i++){ v+=a*vn(p); p=p*2.03+vec2(17.1,9.2); a*=0.5; } return v; }
void main(){
  vec3 d=normalize(vDir); float e=d.y;
  float up=clamp(e,0.0,1.0);
  vec3 col=mix(uHor,uZen,pow(max(up-uHaze,0.0)/(1.0-uHaze),0.42))*(1.0-uSpace);   // uHaze lifts the horizon-coloured band (the rally stage's fogged valley walls sit in it)
  float sd=dot(d,uSunDir); float above=max(smoothstep(-0.06,0.02,e),uSpace);
  // horizon glow toward sun
  col+=uSunCol*(pow(max(sd,0.0),5.0)*0.18+pow(max(sd,0.0),48.0)*0.35)*above*uDay;
  col+=uSunCol*smoothstep(0.99955,0.99985,sd)*40.0*above*uDay;
  col+=uSunCol*pow(max(sd,0.0),400.0)*2.0*above*uDay;
  // moon + stars
  vec3 md=-uSunDir;
  col+=vec3(0.75,0.82,1.0)*smoothstep(0.99935,0.9997,dot(d,md))*3.0*uNight*above;
  float st=step(0.9972,hash3(floor(d*220.0))); col+=vec3(st)*(0.7+0.5*sin(uTime*2.0+hash3(floor(d*220.0))*50.0))*uNight*smoothstep(0.02,0.25,e)*1.3;
  col+=vec3(step(0.9972,hash3(floor(d*220.0))))*(0.8+0.4*sin(uTime*2.0+hash3(floor(d*220.0))*50.0))*uSpace*1.5+vec3(step(0.9993,hash3(floor(d*90.0+7.0))))*uSpace*2.4;
  // clouds
  if(e>0.0&&uSpace<0.98){
    vec2 uv=d.xz/(e+0.14)*0.55+vec2(uTime*0.004,uTime*0.0017);
    float c1=fbm(uv*1.6); float c2=fbm(uv*1.6+uSunDir.xz*0.12);
    float cov=smoothstep(0.50,0.78,c1);
    float lit=clamp((c1-c2)*3.2+0.55,0.0,1.0);
    vec3 shade=uHor*0.9+uZen*0.25+vec3(0.04);
    vec3 bright=mix(vec3(1.0),uSunCol,0.45)*1.12+vec3(0.02);
    vec3 cc=mix(shade,bright,lit)*mix(0.28,1.0,uDay)+uHor*0.15*(1.0-uDay);
    col=mix(col,cc,cov*smoothstep(0.0,0.16,e)*0.9*(1.0-uSpace));
  }
  if(e<0.0) col=mix(col,uHor*0.55*(1.0-uSpace),smoothstep(0.0,-0.25,e));
  gl_FragColor=vec4(col,1.0);
  #include <tonemapping_fragment>
  #include <encodings_fragment>
}`;

const WATER_V = `attribute float aDepth; varying vec3 vW; varying float vDepth;
#include <fog_pars_vertex>
void main(){ vec4 wp=modelMatrix*vec4(position,1.0); vW=wp.xyz; vDepth=aDepth; vec4 mvPosition=viewMatrix*wp; gl_Position=projectionMatrix*mvPosition;
#include <fog_vertex>
}`;
const WATER_F = `uniform float uTime,uNight,uDay; uniform vec3 uSunDir,uSunCol,uSky,uZen,uDeep,uShallow; varying vec3 vW; varying float vDepth;
#include <common>
#include <fog_pars_fragment>
float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float vn(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y); }
void main(){
  vec2 p=vW.xz; float t=uTime; vec2 g=vec2(0.0);
  g+=vec2(0.8,0.6)*cos(dot(p,vec2(0.8,0.6))*0.21+t*1.1)*0.05;
  g+=vec2(-0.5,0.85)*cos(dot(p,vec2(-0.5,0.85))*0.37+t*1.4)*0.034;
  g+=vec2(0.3,-0.95)*cos(dot(p,vec2(0.3,-0.95))*0.71+t*1.9)*0.022;
  g+=vec2(-0.9,-0.2)*cos(dot(p,vec2(-0.9,-0.2))*1.3+t*2.6)*0.014;
  g+=(vec2(vn(p*0.8+t*0.3),vn(p*0.8-t*0.25+7.0))-0.5)*0.05;
  vec3 n=normalize(vec3(-g.x,1.0,-g.y));
  vec3 v=normalize(cameraPosition-vW);
  float fres=0.025+0.975*pow(1.0-max(dot(n,v),0.0),5.0);
  float dep=max(vDepth,0.0);
  vec3 body=mix(uShallow,uDeep,1.0-exp(-dep*0.16));
  vec3 rd=reflect(-v,n);
  vec3 refl=mix(uSky,uZen,0.55*pow(clamp(rd.y,0.0,1.0),0.5));
  vec3 col=mix(body,refl,clamp(fres,0.0,1.0));
  vec3 r=reflect(-uSunDir,n); float spec=pow(max(dot(r,v),0.0),260.0);
  col+=uSunCol*spec*5.0*uDay;
  float fo=(1.0-smoothstep(0.0,1.2,dep+0.25*sin(t*1.4+dep*6.0+vn(p*0.35)*4.0)))*(0.5+0.5*vn(p*1.1+t*0.35));
  col=mix(col,vec3(0.92,0.96,1.0)*(0.25+0.75*uDay),clamp(fo*0.8,0.0,1.0));
  float alpha=clamp(smoothstep(-0.05,1.0,dep)*0.88+0.1+fo*0.4,0.0,0.97);
  gl_FragColor=vec4(col,alpha);
  #include <tonemapping_fragment>
  #include <encodings_fragment>
  #include <fog_fragment>
}`;

const SKY_KEYS = [
  [0, 0x050818, 0x0b1226], [4.5, 0x0a1030, 0x1c2646], [5.8, 0x2a3c70, 0xf29a62], [7.5, 0x4a82c8, 0xc9d8e6], [10, 0x2f6fcf, 0xaed0ef],
  [14, 0x2d6bc9, 0xb4d2ee], [17, 0x3a69b5, 0xe0cdb4], [18.5, 0x34508f, 0xff9a5a], [19.6, 0x151f4a, 0x7a4a66], [21, 0x070b22, 0x141a35], [24, 0x050818, 0x0b1226]
].map((k) => ({ t: k[0], z: lc(k[1]), h: lc(k[2]) }));

function initSky() {
  const g = new THREE.SphereGeometry(1, 40, 20);
  MAT.sky = new THREE.ShaderMaterial({ vertexShader: SKY_V, fragmentShader: SKY_F, side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uSunDir: { value: env.sunDir }, uZen: { value: env.zen }, uHor: { value: env.hor }, uSunCol: { value: env.sunCol }, uTime: { value: 0 }, uDay: { value: 1 }, uNight: { value: 0 }, uSpace: { value: 0 }, uHaze: { value: 0 } } });
  Sky.mesh = new THREE.Mesh(g, MAT.sky); Sky.mesh.scale.setScalar(2000); Sky.mesh.renderOrder = -1000; Sky.mesh.frustumCulled = false; scene.add(Sky.mesh);
  MAT.water = new THREE.ShaderMaterial({ vertexShader: WATER_V, fragmentShader: WATER_F, transparent: true, depthWrite: false, fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 }, uNight: { value: 0 }, uDay: { value: 1 }, uSunDir: { value: env.sunDir }, uSunCol: { value: env.sunCol }, uSky: { value: env.hor }, uZen: { value: env.zen },
      uDeep: { value: lc(0x06233f) }, uShallow: { value: lc(0x2fa5a0) } }]) });
  /* far sea: same shader + shared uniforms, discarded around the camera where the streamed chunks supply the water */
  MAT.waterFar = new THREE.ShaderMaterial({ vertexShader: WATER_V, transparent: true, depthWrite: false, fog: true,
    fragmentShader: 'uniform vec2 uCam; uniform float uR0;\n' + WATER_F.replace('void main(){', 'void main(){ if (length(vW.xz - uCam) < uR0) discard;'),
    uniforms: Object.assign({}, MAT.water.uniforms, { uCam: Far.uCam, uR0: Far.uR0 }) });
}

function initLights() {
  scene.fog = new THREE.FogExp2(0x9ab8d8, 0.001);
  L.hemi = new THREE.HemisphereLight(0xaaccff, 0x445533, 0.8); scene.add(L.hemi);
  L.sun = new THREE.DirectionalLight(0xfff0dd, 3); L.sun.castShadow = true;
  L.sun.shadow.camera.left = -110; L.sun.shadow.camera.right = 110; L.sun.shadow.camera.top = 110; L.sun.shadow.camera.bottom = -110; L.sun.shadow.camera.near = 20; L.sun.shadow.camera.far = 800;
  L.sun.shadow.bias = -0.0004; L.sun.shadow.normalBias = 0.5;
  scene.add(L.sun); scene.add(L.sun.target);
  L.moon = new THREE.DirectionalLight(0x8fa4ff, 0.3); scene.add(L.moon); scene.add(L.moon.target);
}

function skyAt(t) {
  let i = 0; while (i < SKY_KEYS.length - 2 && SKY_KEYS[i + 1].t <= t) i++;
  const a = SKY_KEYS[i], b = SKY_KEYS[i + 1], f = clamp((t - a.t) / (b.t - a.t), 0, 1);
  env.zen.copy(a.z).lerp(b.z, f); env.hor.copy(a.h).lerp(b.h, f);
}
const _col = new THREE.Color(), _warm = new THREE.Color(1.0, 0.5, 0.22), _white = new THREE.Color(1.0, 0.95, 0.86);
function updateEnvironment(tod, focus, time) {
  if (Rally.on) { Rally.env(tod, focus, time); return; }
  skyAt(tod); Biome.tick(focus.x, focus.z, time); Biome.atmSky(env);
  const ang = (tod - 6) / 24 * TAU;
  env.sunDir.set(Math.cos(ang), Math.sin(ang), 0.32).normalize();
  const el = env.sunDir.y;
  env.day = sstep(-0.1, 0.2, el); env.night = 1 - sstep(-0.2, 0.05, el); env.lampOn = 1 - sstep(-0.12, 0.14, el);
  env.sunCol.copy(_warm).lerp(_white, sstep(0.02, 0.4, el));
  scene.fog.color.copy(env.hor); scene.fog.density = lerp(0.0013, 0.0009, env.day) * (Q.fog || 1) * Biome.fogMul();
  if (!hasPost) scene.fog.color.convertLinearToSRGB();
  L.sun.color.copy(env.sunCol); L.sun.intensity = 3.3 * sstep(-0.02, 0.2, el);
  L.moon.intensity = 0.55 * env.night;
  _col.copy(env.zen).lerp(env.hor, 0.4); L.hemi.color.copy(_col); L.hemi.groundColor.setRGB(0.1 * env.day + 0.012, 0.09 * env.day + 0.012, 0.06 * env.day + 0.02);
  L.hemi.intensity = lerp(0.55, 1.15, env.day);
  const f = focus;
  L.sun.position.set(Math.round(f.x * 2) / 2 + env.sunDir.x * 350, f.y + env.sunDir.y * 350, Math.round(f.z * 2) / 2 + env.sunDir.z * 350); L.sun.target.position.set(Math.round(f.x * 2) / 2, f.y, Math.round(f.z * 2) / 2);
  L.moon.position.set(f.x - env.sunDir.x * 300, f.y - env.sunDir.y * 300 + 50, f.z - env.sunDir.z * 300); L.moon.target.position.copy(f);
  env.exposure = lerp(2.1, 1.0, env.day); Biome.atmLight(L, env);
  Wind.t.value = time; Far.uCam.value.set(camera.position.x, camera.position.z); Far.uR0.value = (Chunks.radius - 0.9) * CHUNK - 10;
  MAT.sky.uniforms.uTime.value = time; MAT.sky.uniforms.uDay.value = env.day; MAT.sky.uniforms.uNight.value = env.night;
  MAT.water.uniforms.uTime.value = time; MAT.water.uniforms.uDay.value = env.day; MAT.water.uniforms.uNight.value = env.night;
  MAT.water.uniforms.uDeep.value.copy(_deepDay).lerp(_deepNight, env.night); MAT.water.uniforms.uShallow.value.copy(_shDay).lerp(_shNight, env.night);
  MAT.build.emissiveIntensity = env.lampOn * 1.6;
  MAT.lamp.color.setRGB(0.25 + 4.5 * env.lampOn, 0.23 + 3.6 * env.lampOn, 0.2 + 2.2 * env.lampOn);
  MAT.pool.opacity = env.lampOn * 0.55;
  Sky.mesh.position.copy(camera.position);
}
const _deepDay = lc(0x06233f), _deepNight = lc(0x010610), _shDay = lc(0x2fa5a0), _shNight = lc(0x04201f);

/* ---------------- renderer + post ---------------- */
const Post = { on: false, dyn: 1 };
const FS_V = 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }';
const FS_BRIGHT = 'uniform sampler2D tSrc; uniform float uThr; varying vec2 vUv; void main(){ vec3 c=texture2D(tSrc,vUv).rgb; float l=max(max(c.r,c.g),c.b); float k=max(l-uThr,0.0)/max(l,1e-4); gl_FragColor=vec4(c*k,1.0); }';
const FS_BLUR = 'uniform sampler2D tSrc; uniform vec2 uDir; varying vec2 vUv; void main(){ vec3 c=texture2D(tSrc,vUv).rgb*0.227027; c+=texture2D(tSrc,vUv+uDir*1.3846).rgb*0.316216; c+=texture2D(tSrc,vUv-uDir*1.3846).rgb*0.316216; c+=texture2D(tSrc,vUv+uDir*3.2308).rgb*0.070270; c+=texture2D(tSrc,vUv-uDir*3.2308).rgb*0.070270; gl_FragColor=vec4(c,1.0); }';
const FS_COMP = `uniform sampler2D tScene,tB1,tB2; uniform float uBloom,uSpeed,uExposure,uTime,uVig,uDamage,uChroma; uniform vec2 uRes; varying vec2 vUv;
vec3 aces(vec3 x){ const float a=2.51,b=0.03,c=2.43,d=0.59,e=0.14; return clamp((x*(a*x+b))/(x*(c*x+d)+e),0.0,1.0); }
float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
void main(){
  vec2 c=vUv-0.5; float r=length(c*vec2(uRes.x/uRes.y,1.0));
  float blur=uSpeed*0.07; vec3 col=vec3(0.0);
  for(int i=0;i<6;i++){ float t=float(i)/5.0; float s=1.0-blur*t*smoothstep(0.1,0.75,r);
    col+=vec3(texture2D(tScene,0.5+c*s*(1.0+uChroma)).r,texture2D(tScene,0.5+c*s).g,texture2D(tScene,0.5+c*s*(1.0-uChroma)).b); }
  col/=6.0;
  col+=(texture2D(tB1,vUv).rgb*0.5+texture2D(tB2,vUv).rgb*0.8)*uBloom;
  col*=uExposure; col=aces(col);
  float l=dot(col,vec3(0.2126,0.7152,0.0722));
  col=mix(vec3(l),col,1.12);
  col=mix(col*vec3(0.95,1.0,1.06),col*vec3(1.05,1.0,0.94),smoothstep(0.2,0.8,l));
  col*=1.0-uVig*smoothstep(0.35,1.0,r*1.3);
  col=mix(col,vec3(0.75,0.03,0.03),uDamage*smoothstep(0.15,0.9,r*1.4));
  col=pow(col,vec3(1.0/2.2));
  col+=(hash(vUv*uRes+fract(uTime))-0.5)*0.022;
  gl_FragColor=vec4(col,1.0);
}`;
function fsMat(f, u) { return new THREE.ShaderMaterial({ uniforms: u, vertexShader: FS_V, fragmentShader: f, depthTest: false, depthWrite: false }); }
const rtOpt = (depth) => ({ type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: depth, stencilBuffer: false });

function initRenderer(canvas) {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.info.autoReset = false;
  maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  hasPost = !!(renderer.capabilities.isWebGL2 && renderer.extensions.has('EXT_color_buffer_float'));
  if (hasPost) { renderer.toneMapping = THREE.NoToneMapping; renderer.outputEncoding = THREE.LinearEncoding; }
  else { renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMappingExposure = 1.0; }
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(76, 16 / 9, 0.1, 5000);
  if (hasPost) {
    Post.scene = new THREE.Scene(); Post.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    Post.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null); Post.quad.frustumCulled = false; Post.scene.add(Post.quad);
    const blk = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1, THREE.RGBAFormat); blk.needsUpdate = true; Post.black = blk;
    Post.mBright = fsMat(FS_BRIGHT, { tSrc: { value: null }, uThr: { value: 1.25 } });
    Post.mBlur = fsMat(FS_BLUR, { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } });
    Post.mComp = fsMat(FS_COMP, { tScene: { value: null }, tB1: { value: blk }, tB2: { value: blk }, uBloom: { value: 0 }, uSpeed: { value: 0 }, uExposure: { value: 1 }, uTime: { value: 0 }, uVig: { value: 0.35 }, uDamage: { value: 0 }, uChroma: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) } });
  }
}
const _v2 = new THREE.Vector2();
function resizeRenderer() {
  const w = Math.max(2, window.innerWidth), h = Math.max(2, window.innerHeight);
  const pr = Math.max(0.4, Math.min(window.devicePixelRatio || 1, Q.dpr) * Post.dyn);
  renderer.setPixelRatio(pr); renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  if (hasPost) {
    renderer.getDrawingBufferSize(_v2); const bw = Math.max(2, _v2.x | 0), bh = Math.max(2, _v2.y | 0);
    for (const k of ['rt', 'a1', 'b1', 'a2', 'b2']) if (Post[k]) { Post[k].dispose(); Post[k] = null; }
    let rt = null;
    try { if (Q.ms > 0) { rt = new THREE.WebGLMultisampleRenderTarget(bw, bh, rtOpt(true)); rt.samples = Q.ms; } else rt = new THREE.WebGLRenderTarget(bw, bh, rtOpt(true)); } catch (e) { rt = new THREE.WebGLRenderTarget(bw, bh, rtOpt(true)); }
    Post.rt = rt;
    Post.a1 = new THREE.WebGLRenderTarget(Math.max(2, bw >> 1), Math.max(2, bh >> 1), rtOpt(false)); Post.b1 = Post.a1.clone();
    Post.a2 = new THREE.WebGLRenderTarget(Math.max(2, bw >> 2), Math.max(2, bh >> 2), rtOpt(false)); Post.b2 = Post.a2.clone();
    Post.mComp.uniforms.uRes.value.set(bw, bh); Post.bw = bw; Post.bh = bh;
  }
}
function pass(mat, target) { Post.quad.material = mat; renderer.setRenderTarget(target); renderer.render(Post.scene, Post.cam); }
function renderFrame(fx, time) {
  Weather.pre(time);
  if (!hasPost) { renderer.toneMappingExposure = env.exposure; renderer.render(scene, camera); return; }
  renderer.setRenderTarget(Post.rt); renderer.render(scene, camera);
  const u = Post.mComp.uniforms;
  if (Q.bloom) {
    Post.mBright.uniforms.tSrc.value = Post.rt.texture; pass(Post.mBright, Post.a1);
    Post.mBlur.uniforms.tSrc.value = Post.a1.texture; Post.mBlur.uniforms.uDir.value.set(1 / Post.a1.width, 0); pass(Post.mBlur, Post.b1);
    Post.mBlur.uniforms.tSrc.value = Post.b1.texture; Post.mBlur.uniforms.uDir.value.set(0, 1 / Post.a1.height); pass(Post.mBlur, Post.a1);
    Post.mBlur.uniforms.tSrc.value = Post.a1.texture; Post.mBlur.uniforms.uDir.value.set(1.5 / Post.a2.width, 0); pass(Post.mBlur, Post.a2);
    Post.mBlur.uniforms.tSrc.value = Post.a2.texture; Post.mBlur.uniforms.uDir.value.set(0, 1.5 / Post.a2.height); pass(Post.mBlur, Post.b2);
    Post.mBlur.uniforms.tSrc.value = Post.b2.texture; Post.mBlur.uniforms.uDir.value.set(2 / Post.a2.width, 0); pass(Post.mBlur, Post.a2);
    Post.mBlur.uniforms.tSrc.value = Post.a2.texture; Post.mBlur.uniforms.uDir.value.set(0, 2 / Post.a2.height); pass(Post.mBlur, Post.b2);
    u.tB1.value = Post.a1.texture; u.tB2.value = Post.b2.texture; u.uBloom.value = lerp(0.55, 0.9, env.night);
  } else { u.tB1.value = Post.black; u.tB2.value = Post.black; u.uBloom.value = 0; }
  u.tScene.value = Post.rt.texture; u.uSpeed.value = fx.speed; u.uExposure.value = env.exposure * (fx.expo || 1); u.uTime.value = time; u.uDamage.value = fx.damage; u.uChroma.value = fx.chroma; u.uVig.value = 0.3 + fx.speed * 0.25;
  pass(Post.mComp, null);
}
