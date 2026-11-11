/* ================= WORKSHOP SPACE: the other worlds as seen from the craft, ground on other bodies, and the maps =================
   Every body is drawn as a lit sphere at its true direction. To keep float precision and the far plane happy a body is pulled toward the camera and
   shrunk by the same factor (the same trick the home planet always used), so its angular size is exact. A flat, cratered ground disc follows the craft
   when it is close to an airless or thin-air surface. All rendering reads the simulator's per-body frame (WKSim.B, WK.posIn). */
const WKS = { ready: false, mesh: {}, halo: {}, cap: null, sunI: new THREE.Vector3(1, 0, 0), delta: 0, first: true, lab: [], pred: null, predAt: -9, predKey: '', capB: null };
const WKS_ATM = { home: { hs: 42000, a: [0.5, 0.75, 1.0], b: [0.12, 0.3, 0.8] }, rust: { hs: 38000, a: [0.98, 0.72, 0.5], b: [0.6, 0.32, 0.18] }, jove: { hs: 420000, a: [0.98, 0.84, 0.58], b: [0.62, 0.4, 0.22] } };
const WKS_PF = `uniform vec3 uSunDir,uC1,uC2,uAtmC; uniform float uKind,uTime,uSeed,uAtm,uI; varying vec3 vN; varying vec3 vW;
float h3(vec3 p){ p=fract(p*0.3183099+vec3(0.1,0.2,0.3)); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float n3(vec3 p){ vec3 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z); }
float f3(vec3 p){ float v=0.0,a=0.5; for(int i=0;i<5;i++){ v+=a*n3(p); p=p*2.02+vec3(1.7,9.2,3.1); a*=0.5; } return v; }
vec3 h33(vec3 p){ p=vec3(dot(p,vec3(127.1,311.7,74.7)),dot(p,vec3(269.5,183.3,246.1)),dot(p,vec3(113.5,271.9,124.6))); return fract(sin(p)*43758.5453); }
float wor(vec3 p){ vec3 i=floor(p),f=fract(p); float m=1.0; for(int z=-1;z<=1;z++) for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){ vec3 g=vec3(float(x),float(y),float(z)); m=min(m,length(g+h33(i+g)-f)); } return m; }
float crat(float w){ return -0.34*smoothstep(0.27,0.07,w)+0.2*smoothstep(0.27,0.33,w)*smoothstep(0.44,0.33,w); }
void main(){
  vec3 n=normalize(vN); vec3 dir=normalize(vW-cameraPosition); float ndl=dot(n,uSunDir); vec3 c;
  if(uKind>1.5){ c=uC1*(1.9+0.5*f3(n*7.0+uTime*0.05)); }
  else if(uKind>0.5){
    float lat=n.y, lon=atan(n.z,n.x);
    float turb=f3(vec3(n.x*2.5,lat*5.0,n.z*2.5)+vec3(uTime*0.002,0.0,0.0));
    float band=0.5+0.5*sin(lat*17.0+turb*5.5);
    vec3 col=mix(uC2,uC1,smoothstep(0.15,0.85,band)); col=mix(col,uC1*1.15,smoothstep(0.55,0.8,f3(n*9.0+uSeed)));
    col*=0.82+0.36*f3(vec3(n.x*34.0,lat*110.0,n.z*34.0)+uSeed);
    vec2 sd=vec2(lon-0.8,(lat+0.28)*2.4); sd.x=mod(sd.x+3.14159,6.28318)-3.14159; col=mix(col,vec3(0.6,0.2,0.1),smoothstep(0.45,0.12,length(sd*vec2(0.8,1.0)))*0.8);
    float lit=smoothstep(-0.12,0.35,ndl), limb=pow(clamp(dot(n,-dir),0.0,1.0),0.45);
    c=col*(0.02+1.05*lit)*mix(0.5,1.0,limb);
    float fr=pow(1.0-clamp(dot(n,-dir),0.0,1.0),3.0); c+=uAtmC*fr*(0.1+0.9*lit)*0.8;
  } else {
    float hg=f3(n*3.5+uSeed)*0.6+f3(n*13.0+uSeed)*0.4;
    vec3 col=mix(uC2,uC1,smoothstep(0.32,0.68,hg));
    float cr=crat(wor(n*7.0+uSeed))+0.7*crat(wor(n*21.0+uSeed*1.3));
    col*=1.0+cr*0.9;
    float lit=smoothstep(-0.02,0.1+0.3*uAtm,ndl);
    c=col*(0.012+1.2*lit*(0.3+0.7*clamp(ndl,0.0,1.0)));
    float fr=pow(1.0-clamp(dot(n,-dir),0.0,1.0),3.0); c+=uAtmC*fr*(0.1+0.9*lit)*uAtm;
  }
  gl_FragColor=vec4(c*uI,1.0);
  #include <tonemapping_fragment>
  #include <encodings_fragment>
}`;
const WKS_GV = 'varying vec3 vW; void main(){ vec4 wp=modelMatrix*vec4(position,1.0); vW=wp.xyz; gl_Position=projectionMatrix*viewMatrix*wp; }';
const WKS_GF = `uniform vec3 uSunDir,uC1,uC2,uHaze,uEdge; uniform vec2 uCtr; uniform float uOp,uHz,uSeed,uRd; varying vec3 vW;
float hs(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float vn(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hs(i),hs(i+vec2(1,0)),f.x),mix(hs(i+vec2(0,1)),hs(i+vec2(1,1)),f.x),f.y); }
float fbm(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<5;i++){ v+=a*vn(p); p=p*2.03+vec2(17.1,9.2); a*=0.5; } return v; }
float cra(vec2 p,float rad){ vec2 i=floor(p),f=fract(p); float b=0.0; for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){ vec2 g=vec2(float(x),float(y)),id=i+g; vec2 o=vec2(hs(id),hs(id+7.7)); float r=rad*(0.55+0.7*hs(id+3.1)); float d=length(g+o*0.8+0.1-f)/r; b+=-0.5*smoothstep(1.0,0.35,d)+0.35*smoothstep(0.85,1.0,d)*smoothstep(1.3,1.0,d)*step(0.2,hs(id+9.0)); } return b; }
void main(){
  vec2 p=vW.xz; vec3 dv=vW-cameraPosition; float dist=length(dv);
  float fine=smoothstep(520.0,50.0,dist), mid=smoothstep(7000.0,500.0,dist), far=smoothstep(60000.0,4000.0,dist);
  float big=fbm(p*0.00004+uSeed), md=fbm(p*0.0007+uSeed*1.7), sm=fbm(p*0.03)*fine+fbm(p*0.25)*fine*0.5;
  vec3 col=mix(uC2,uC1,smoothstep(0.3,0.72,big*0.6+md*0.4));
  col*=0.86+0.26*(md*mid+sm*0.6);
  float cr=cra(p/16.0,0.42)*fine+cra(p/230.0,0.45)*mid+cra(p/3200.0,0.45)*far;
  col*=1.0+0.65*cr;
  float el=uSunDir.y, lit=smoothstep(0.0,0.07,el)*(0.22+0.78*clamp(el,0.0,1.0));
  vec3 c=col*(0.010+1.3*lit);
  float hz=1.0-exp(-dist*uHz); c=mix(c,uHaze,hz);
  float ed=length(p-uCtr)/uRd; c=mix(c,uEdge,smoothstep(0.62,1.0,ed));
  gl_FragColor=vec4(c,uOp);
  #include <tonemapping_fragment>
  #include <encodings_fragment>
}`;
const _wksC = new THREE.Color(), _wksV = new THREE.Vector3(), _wksQ = [0, 0, 0, 1], _wksT = [0, 0, 0], _wksP = [0, 0, 0];

WKS.setup = function () {
  if (WKS.ready) return; WKS.ready = true; const geo = new THREE.SphereGeometry(1, 56, 36); WKS.geo = geo;
  for (const B of WK.BODIES) {
    if (B === WK.HOME) { WKS.mesh.home = WkF.space.planet; WKS.halo.home = WkF.space.atm; continue; }
    const kind = B.kind === 'gas' ? 1 : B.kind === 'star' ? 2 : 0, A = WKS_ATM[B.id];
    const mat = new THREE.ShaderMaterial({ vertexShader: WKF_PV, fragmentShader: WKS_PF, depthTest: false, depthWrite: false, fog: false, side: kind === 1 ? THREE.DoubleSide : THREE.FrontSide, uniforms: { uSunDir: { value: WKS.sunI }, uC1: { value: lc(B.c1) }, uC2: { value: lc(B.c2) }, uAtmC: { value: new THREE.Color(...(A ? A.a : [0, 0, 0])) }, uKind: { value: kind }, uI: { value: kind === 2 ? 1 : clamp(Math.sqrt(WK.HOME.a / (B.parent === WK.SUN ? B.a : B.parent.a)), 0.5, 1.8) }, uTime: { value: 0 }, uSeed: { value: 3.7 * (WK.BODIES.indexOf(B) + 1) }, uAtm: { value: B.atm ? 1 : 0 } } });
    const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; m.visible = false; scene.add(m); WKS.mesh[B.id] = m;
  }
  for (const id in WKS_ATM) {
    if (id === 'home') { const u = WkF.space.am.uniforms; u.uCa = { value: new THREE.Color(...WKS_ATM.home.a) }; u.uCb = { value: new THREE.Color(...WKS_ATM.home.b) }; continue; }
    const A = WKS_ATM[id], am = new THREE.ShaderMaterial({ vertexShader: WKF_PV, fragmentShader: WKF_AF, side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, uniforms: { uSunDir: { value: WKS.sunI }, uC: { value: new THREE.Vector3() }, uRs: { value: 1 }, uHs: { value: 0.1 }, uFade: { value: 0 }, uCa: { value: new THREE.Color(...A.a) }, uCb: { value: new THREE.Color(...A.b) } } });
    const hm = new THREE.Mesh(geo, am); hm.renderOrder = 4; hm.frustumCulled = false; hm.visible = false; hm.userData.am = am; scene.add(hm); WKS.halo[id] = hm;
  }
  WkF.space.atm.userData.am = WkF.space.am;
  /* ground disc: a polar grid, finest at the centre; it is flat because the flight code works on a flat local map */
  const NR = 44, NS = 72, pos = [], idx = []; pos.push(0, 0, 0);
  for (let i = 1; i <= NR; i++) { const r = Math.pow(i / NR, 2.4); for (let j = 0; j < NS; j++) { const a = j / NS * TAU; pos.push(Math.cos(a) * r, 0, Math.sin(a) * r); } }
  for (let j = 0; j < NS; j++) idx.push(0, 1 + (j + 1) % NS, 1 + j);
  for (let i = 1; i < NR; i++) for (let j = 0; j < NS; j++) { const a = 1 + (i - 1) * NS + j, b = 1 + (i - 1) * NS + (j + 1) % NS, c = 1 + i * NS + j, d = 1 + i * NS + (j + 1) % NS; idx.push(a, b, c, b, d, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  const gm = new THREE.ShaderMaterial({ vertexShader: WKS_GV, fragmentShader: WKS_GF, transparent: true, depthWrite: true, side: THREE.DoubleSide, fog: false, uniforms: { uSunDir: { value: env.sunDir }, uC1: { value: new THREE.Color() }, uC2: { value: new THREE.Color() }, uHaze: { value: new THREE.Color() }, uEdge: { value: new THREE.Color() }, uCtr: { value: new THREE.Vector2() }, uOp: { value: 1 }, uHz: { value: 0 }, uSeed: { value: 1 }, uRd: { value: 1e5 } } });
  WKS.cap = new THREE.Mesh(g, gm); WKS.cap.frustumCulled = false; WKS.cap.visible = false; WKS.cap.renderOrder = -2; scene.add(WKS.cap);
};
/* off Home the island, its traffic and its markers do not exist: hide everything in the scene except the craft, the sky, lights, particles and these worlds */
WKS.hideWorld = function (on) {
  if (on === !!WKS.hid) return;
  if (!on) { for (const c of WKS.hid) c.visible = true; WKS.hid = null; return; }
  const keep = new Set([WkE.root, Sky.mesh, Chunks.group, Far.group, Part.smoke.pts, Part.spark.pts, WkF.space.planet, WkF.space.atm, WKS.cap, ...Object.values(WKS.mesh), ...Object.values(WKS.halo)]); for (const b of WkF.bodies) keep.add(b.grp); for (const d of WkF.debris) keep.add(d.g);
  WKS.hid = []; for (const c of scene.children) { if (keep.has(c) || c.isLight || !c.visible || (c.parent === scene && c === L.sun.target) || c === L.moon.target) continue; c.visible = false; WKS.hid.push(c); }
};
WKS.reset = function (M) {
  WKS.hideWorld(false); WKS.first = true; WKS.pred = null; WKS.predAt = -9; WKS.capB = null; for (const id in WKS.mesh) WKS.mesh[id].visible = false; for (const id in WKS.halo) WKS.halo[id].visible = false; if (WKS.cap) WKS.cap.visible = false;
  /* the sun's drawn direction is rotated so that, at launch, it agrees with the time of day the player is flying in */
  if (M) { const sim = M.sim, S = sim.S, sd = WK.sunDir(sim.B, [S[0], S[1], S[2]], sim.ut, [0, 0, 0]), ang = (App.tod - 6) / 24 * TAU; WKS.delta = sim.B === WK.HOME ? Math.atan2(Math.sin(ang), Math.cos(ang)) - Math.atan2(sd[1], sd[0]) : 0; }
};
/* what the sky and light look like on each world: [horizon rgb, zenith rgb] by day, how strong the ambient light is */
const WKS_SKY = { rust: { hor: [0.78, 0.5, 0.34], zen: [0.4, 0.27, 0.2], amb: 0.55, fog: 0.00045 }, jove: { hor: [0.74, 0.55, 0.34], zen: [0.5, 0.34, 0.2], amb: 0.7, fog: 0.0009 } };

WKS.update = function (M, dt, s, alt) {
  const sim = M.sim, B = sim.B, S = sim.S, ut = sim.ut, ox = WkF.ox, oz = WkF.oz, cam = camera.position, qL = M.pj.qL, home = B === WK.HOME;
  WK.use(B); WKS.hideWorld(!home); const r = [S[0], S[1], S[2]];
  /* ---- sun ---- */
  const sd = WK.sunDir(B, r, ut, _wksT), cd = Math.cos(WKS.delta), sn = Math.sin(WKS.delta);
  WKS.sunI.set(sd[0] * cd - sd[1] * sn, sd[0] * sn + sd[1] * cd, sd[2]).normalize();
  const sl = _wkqrot(_wkfConj(qL), [WKS.sunI.x, WKS.sunI.y, WKS.sunI.z], _wksP); _wksV.set(sl[0], sl[1], sl[2]).lerp(WKS.sunI, s).normalize();
  const sky = B.sky, spc = sky ? _wkfSun(sky[0], sky[1], alt) : 1;
  if (home) { if (spc > 0) { env.sunDir.lerp(_wksV, spc).normalize(); WKS.sunLight(M, 1, spc); const U = MAT.sky.uniforms; U.uDay.value = lerp(U.uDay.value, 1, spc); U.uNight.value = lerp(U.uNight.value, 0, spc); L.moon.intensity *= 1 - spc; } }
  else {
    env.sunDir.copy(_wksV); const el = env.sunDir.y, ab = absPosLen(B, r, ut), dayK = _wkfSun(-0.12, 0.25, el), SK = WKS_SKY[B.id];
    const f = clamp(Math.sqrt(WK.HOME.a / ab), 0.4, 1.8); WKS.sunLight(M, f);
    env.day = 1; env.night = 0; MAT.sky.uniforms.uDay.value = 1; MAT.sky.uniforms.uNight.value = 0;
    if (SK && sky) { env.hor.setRGB(SK.hor[0] * dayK, SK.hor[1] * dayK, SK.hor[2] * dayK); env.zen.setRGB(SK.zen[0] * dayK, SK.zen[1] * dayK, SK.zen[2] * dayK); scene.fog.color.copy(env.hor); scene.fog.density = SK.fog * (1 - spc); L.hemi.intensity = (0.12 + SK.amb * dayK) * (1 - 0.8 * spc); }
    else { scene.fog.density = 0; L.hemi.intensity = 0.1; env.hor.setRGB(0, 0, 0); env.zen.setRGB(0, 0, 0); }
    L.hemi.color.setRGB(0.8, 0.8, 0.85); L.hemi.groundColor.setRGB(0.1, 0.09, 0.08); L.moon.intensity = 0; MAT.sky.uniforms.uSpace.value = spc; env.exposure = 1.0;
  }
  /* ---- bodies ---- */
  const list = []; WKS.lab.length = 0;
  for (const X of WK.BODIES) {
    const mesh = WKS.mesh[X.id], isB = X === B; let rel;
    if (isB) rel = [-r[0], -r[1], -r[2]]; else { WK.posIn(X, B, ut, _wksP); rel = [_wksP[0] - r[0], _wksP[1] - r[1], _wksP[2] - r[2]]; }
    const lc2 = _wkqrot(_wkfConj(qL), rel, [0, 0, 0]), lx = lc2[0] * (1 - s) + rel[0] * s, ly = lc2[1] * (1 - s) + rel[1] * s, lz = lc2[2] * (1 - s) + rel[2] * s, d = Math.hypot(lx, ly, lz);
    let vis = true;
    if (X === WK.SUN) vis = d < X.R * 40; /* far away the sun is the sky shader's disc */
    if (isB) vis = X.crush ? true : alt > 2500;
    if (!mesh) { WKS.lab.push({ X, dx: lx / d, dy: ly / d, dz: lz / d, d: Math.max(d - X.R, 0), ang: X.R / d, vis: true }); continue; }
    const t = Math.sqrt(Math.max(d * d - X.R * X.R, 400)), k = Math.min(1, 2400 / t); let Re = X.R; if (!isB && Re < 0.0013 * d) Re = 0.0013 * d;
    mesh.visible = vis && d < 3e11; if (!mesh.visible && X !== WK.SUN) { /* keep the label */ }
    list.push({ X, mesh, d, k, Re, lx, ly, lz, isB });
    WKS.lab.push({ X, dx: lx / d, dy: ly / d, dz: lz / d, d: Math.max(d - X.R, 0), vis: !isB, ang: Re / Math.max(d, 1) });
  }
  list.sort((a, b) => b.d - a.d); let ro = -500;
  for (const o of list) {
    const m = o.mesh; m.position.set(cam.x + o.lx * o.k, cam.y + o.ly * o.k, cam.z + o.lz * o.k); m.scale.setScalar(o.Re * o.k * 1.003); m.renderOrder = ro++;
    const X = o.X; if (X === WK.HOME) { const u = WkF.space.pm.uniforms; u.uOp.value = o.isB ? _wkfSun(5000, 26000, alt) : 1; u.uTime.value = App.time; u.uHor.value = env.hor; u.uZen.value = env.zen; } else { m.material.uniforms.uTime.value = App.time; }
    /* atmosphere halo */
    const h = WKS.halo[X.id]; if (h) {
      const A = WKS_ATM[X.id], am = h.userData.am, vis = m.visible || (o.isB && X === WK.HOME); h.visible = vis && o.d < 5e9; if (h.visible) {
        h.position.copy(m.position); h.scale.setScalar((X.R + A.hs) * o.k); am.uniforms.uC.value.copy(m.position); am.uniforms.uRs.value = X.R * o.k; am.uniforms.uHs.value = A.hs * o.k;
        am.uniforms.uFade.value = o.isB ? (X === WK.HOME ? _wkfSun(14000, 55000, alt) : _wkfSun(4000, 30000, alt) * (X.id === 'jove' ? 0.8 : 0.9)) : 1; if (X === WK.HOME && o.isB) { /* keep the original sizing */ }
      }
    }
  }
  /* ---- ground disc ---- */
  const cap = WKS.cap, hasCap = !home && !B.crush && B !== WK.SUN;
  if (hasCap && alt < 20000) {
    if (WKS.capB !== B) { WKS.capB = B; const u = cap.material.uniforms, SK = WKS_SKY[B.id]; u.uC1.value.copy(lc(B.c1)); u.uC2.value.copy(lc(B.c2)); u.uSeed.value = 1.7 * (WK.BODIES.indexOf(B) + 1); u.uHz.value = SK ? SK.fog * 0.25 : 0; }
    const u = cap.material.uniforms, Rd = clamp(1.15 * Math.sqrt(2 * B.R * (Math.max(alt, 0) + 60)), 3500, 110000), SK = WKS_SKY[B.id], dayK = _wkfSun(-0.12, 0.25, env.sunDir.y);
    const cxp = WkE.on ? WkE.p.x : M.P.x, czp = WkE.on ? WkE.p.z : M.P.z; cap.visible = true; cap.position.set(cxp, -0.03, czp); cap.scale.set(Rd, 1, Rd); u.uRd.value = Rd; u.uCtr.value.set(cxp, czp); u.uOp.value = 1 - _wkfSun(5000, 17000, alt);
    if (SK && sky) { u.uHaze.value.copy(env.hor).multiplyScalar(0.8); u.uEdge.value.copy(env.hor); } else { u.uHaze.value.setRGB(0, 0, 0); u.uEdge.value.setRGB(0, 0, 0); }
    void dayK;
  } else cap.visible = false;
};
function absPosLen(B, r, ut) { const a = WK.absPos(B, ut, [0, 0, 0]); return Math.hypot(a[0] + r[0], a[1] + r[1], a[2] + r[2]) || 1; }
/* point the scene's key light along the drawn sun direction, as updateEnvironment does for the day/night cycle */
WKS.sunLight = function (M, f, w) {
  w = w == null ? 1 : w; const fp = M.P, d = env.sunDir; L.sun.color.lerp(_wksC.setRGB(1, 0.96, 0.88), w); L.sun.intensity = lerp(L.sun.intensity, 3.3 * f, w);
  L.sun.position.set(Math.round(fp.x * 2) / 2 + d.x * 350, fp.y + d.y * 350, Math.round(fp.z * 2) / 2 + d.z * 350); L.sun.target.position.set(Math.round(fp.x * 2) / 2, fp.y, Math.round(fp.z * 2) / 2);
};
/* labels over the other worlds (drawn on the 2D overlay) */
WKS.labels = function (g, W, H, u) {
  const M = WkF.main; if (!M) return; g.textBaseline = 'alphabetic'; const cam = camera.position;
  for (const l of WKS.lab) {
    if (!l.vis || (l.dy < -0.02 && M.sim.info.alt < 15000 && !M.sim.B.crush)) continue; _wksV.set(cam.x + l.dx * 100, cam.y + l.dy * 100, cam.z + l.dz * 100).project(camera); if (_wksV.z > 1 || _wksV.z < -1) continue;
    const sx = (_wksV.x * 0.5 + 0.5) * W, sy = (-_wksV.y * 0.5 + 0.5) * H; if (sx < 20 || sx > W - 20 || sy < 20 || sy > H - 20) continue;
    const pr = (l.ang || 0) * H / (camera.fov * Math.PI / 180), rr = Math.max(7 * u, pr + 6 * u); g.strokeStyle = 'rgba(255,176,46,0.9)'; g.lineWidth = 1.5 * u; g.beginPath(); g.arc(sx, sy, rr, 0, TAU); g.stroke();
    g.font = '700 ' + Math.round(13 * u) + 'px Rajdhani, sans-serif'; g.textAlign = 'left'; g.fillStyle = '#ffb02e'; g.fillText(l.X.name.toUpperCase(), sx + rr + 6 * u, sy - 1 * u); g.fillStyle = '#93a0b2'; g.fillText(_wkfLen(l.d), sx + rr + 6 * u, sy + 13 * u);
  }
};

/* ---------- prediction of the next sphere-of-influence change ---------- */
WKS.predict = function (M, force) {
  const sim = M.sim, B = sim.B, S = sim.S, key = B.id + (WkF.map ? 'm' : ''); if (!force && App.time - WKS.predAt < 0.7 && WKS.predKey === key) return WKS.pred;
  WKS.predAt = App.time; WKS.predKey = key; const r = [S[0], S[1], S[2]], v = [S[3], S[4], S[5]], o = WK.orbitIn(B, r, v, {});
  const hz = B === WK.SUN ? 4e8 : o.hyper ? 4e8 : Math.min(12 * o.T, 60 * 86400), hmax = Math.max(hz, 3600);
  const alt = Math.hypot(r[0], r[1], r[2]) - B.R; WKS.pred = alt < B.rails * 0.5 && !o.hyper ? null : WK.predict(B, r, v, sim.ut, hmax, 12000);
  /* when the craft is about to leave this sphere of influence, look one hop further: where does it go next? */
  const p = WKS.pred; WKS.pred2 = p && p.kind === 'exit' ? WK.predict(p.body, p.r, p.v, p.ut, 4e8, 12000) : null; return p;
};
/* the largest time warp that is possible right now: coasting above the body's rails altitude */
WKS.railOK = function (sim) { return !sim.dead && (sim.info.thrust || 0) < 1 && (sim.info.alt || 0) > sim.B.rails; };

/* ---------- maps ---------- */
const _wksFmtT = (s) => { if (!isFinite(s)) return '--'; s = Math.max(0, s); if (s > 86400 * 2) return (s / 86400).toFixed(s > 86400 * 20 ? 0 : 1) + ' d'; return _wkfTime(s); };
WkF.orbitMap = function (g, W, H, u) {
  const M = WkF.main; if (!M) return; if (WkF.mapMode === 'sys') { WKS.sysMap(g, W, H, u); return; }
  const sim = M.sim, B = sim.B, I = sim.info, o = I.orb, S = sim.S; if (!o) return; const cx = W / 2, cy = H / 2 + 6 * u, R = B.R, mu = B.mu, ut = sim.ut, pred = WKS.predict(M), mz = WkF.mz || 1;
  const F = (px, w) => (w || 700) + ' ' + Math.round(px * u) + 'px Rajdhani, sans-serif';
  g.fillStyle = 'rgba(3,5,9,0.88)'; g.fillRect(0, 0, W, H);
  let ex = o.hyper ? o.rp * 4 : Math.max(o.ra, R * 1.4); if (isFinite(B.soi) && (o.hyper || (pred && pred.kind === 'exit'))) ex = Math.max(ex, B.soi * 1.08);
  const kidPos = {}; for (const c of B.kids) { WK.relState(c, ut, { r: kidPos[c.id] = [0, 0, 0], v: [0, 0, 0] }); }
  const t0 = { r: [0, 0, 0], v: [0, 0, 0] }; let evKid = null, evPos = null;
  if (pred && pred.kind === 'enter') { evKid = pred.body; WK.relState(evKid, pred.ut, t0); evPos = [t0.r[0] + pred.r[0], t0.r[1] + pred.r[1], t0.r[2] + pred.r[2]]; ex = Math.max(ex, Math.hypot(t0.r[0], t0.r[1], t0.r[2]) * 1.12 + evKid.soi * 0.5); }
  ex = Math.max(ex, R * 1.2); const sc = Math.min(W, H) * 0.42 / ex * mz;
  let xh = o.ev ? WKV.norm(o.ev.slice()) : null; const rv = [S[0], S[1], S[2]]; if (!xh || !(o.e > 1e-4)) xh = WKV.norm(rv.slice()); const hh = WKV.norm(o.hv.slice()), yh = WKV.cross(hh, xh);
  const X = (p) => cx + (p[0] * xh[0] + p[1] * xh[1] + p[2] * xh[2]) * sc, Y = (p) => cy - (p[0] * yh[0] + p[1] * yh[1] + p[2] * yh[2]) * sc;
  const body = B.kind === 'home' ? ['#0d2a4d', '#2f6fd6'] : B.kind === 'gas' ? ['#5a3d22', '#d9b27c'] : B.kind === 'star' ? ['#6b4a10', '#ffd24a'] : ['#2a2a2e', '#' + B.c1.toString(16).padStart(6, '0')];
  const atmR = R + (B.atmTop || 0);
  if (isFinite(B.soi) && B.soi * sc < 9000) { g.setLineDash([6 * u, 6 * u]); g.strokeStyle = 'rgba(255,176,46,0.5)'; g.lineWidth = 1.4; g.beginPath(); g.arc(cx, cy, B.soi * sc, 0, TAU); g.stroke(); g.setLineDash([]); g.fillStyle = 'rgba(255,176,46,0.7)'; g.font = F(12, 600); g.textAlign = 'left'; const lx = cx + B.soi * sc * 0.7071, ly = cy - B.soi * sc * 0.7071; if (lx < W - 90 && ly > 100) g.fillText(B.name + ' SOI', lx + 6, ly); }
  g.fillStyle = body[0]; g.beginPath(); g.arc(cx, cy, Math.max(R * sc, 3), 0, TAU); g.fill(); g.strokeStyle = body[1]; g.lineWidth = 2; g.stroke();
  if (B.atmTop && B.atmTop * sc > 1.5) { g.strokeStyle = 'rgba(120,180,255,0.35)'; g.lineWidth = 1.2; g.beginPath(); g.arc(cx, cy, atmR * sc, 0, TAU); g.stroke(); }
  /* the orbit: conic path, clipped to the SOI */
  const p = o.h * o.h / mu, nuMax = o.hyper ? Math.acos(-1 / Math.max(o.e, 1.0001)) * 0.985 : Math.PI, lim = isFinite(B.soi) ? B.soi : ex * 4; g.lineWidth = 2.4; let prev = null;
  for (let i = 0; i <= 360; i++) { const nu = -nuMax + 2 * nuMax * i / 360, rr = p / (1 + o.e * Math.cos(nu)); if (rr < 0 || rr > lim) { prev = null; continue; } const sx = cx + rr * Math.cos(nu) * sc, sy = cy - rr * Math.sin(nu) * sc;
    if (prev) { g.strokeStyle = rr < R ? '#ff4d5e' : rr < atmR ? '#ffb02e' : '#4be08a'; g.beginPath(); g.moveTo(prev[0], prev[1]); g.lineTo(sx, sy); g.stroke(); } prev = [sx, sy]; }
  const mark = (x, y, col, label, r0, al, dy) => { g.fillStyle = col; g.beginPath(); g.arc(x, y, r0 * u, 0, TAU); g.fill(); if (label) { g.font = F(14); g.textAlign = al || 'left'; g.fillText(label, x + (al === 'right' ? -10 : 10) * u, y + (dy == null ? -6 : dy) * u); } };
  if (!o.hyper || o.e > 1) mark(cx + o.rp * sc, cy, '#4be08a', 'Pe ' + _wkfLen(o.pe), 4, 'left', 18); if (!o.hyper) mark(cx - o.ra * sc, cy, '#4be08a', 'Ap ' + _wkfLen(o.ap), 4, 'right', 18);
  /* moons and where they will be */
  for (const c of B.kids) {
    const kp = kidPos[c.id], px = X(kp), py = Y(kp), isEv = c === evKid; g.strokeStyle = isEv ? 'rgba(75,224,138,0.35)' : 'rgba(147,160,178,0.35)'; g.lineWidth = 1.2;
    const ob = c.a * sc; if (ob < 6000) { /* its orbit */ g.beginPath(); g.arc(cx, cy, ob, 0, TAU); g.stroke(); }
    g.setLineDash([4 * u, 5 * u]); g.beginPath(); g.arc(px, py, c.soi * sc, 0, TAU); g.stroke(); g.setLineDash([]);
    g.fillStyle = '#' + c.c1.toString(16).padStart(6, '0'); g.beginPath(); g.arc(px, py, Math.max(c.R * sc, 3.5 * u), 0, TAU); g.fill(); g.fillStyle = '#c9d2de'; g.font = F(13, 600); g.textAlign = 'left'; g.fillText(c.name, px + 8 * u, py - 6 * u);
  }
  if (evKid) {
    const gp = [t0.r[0], t0.r[1], t0.r[2]], gx = X(gp), gy = Y(gp); g.strokeStyle = '#4be08a'; g.lineWidth = 1.8; g.beginPath(); g.arc(gx, gy, evKid.soi * sc, 0, TAU); g.stroke(); g.fillStyle = 'rgba(75,224,138,0.55)'; g.beginPath(); g.arc(gx, gy, Math.max(evKid.R * sc, 3 * u), 0, TAU); g.fill();
    mark(X(evPos), Y(evPos), '#4be08a', 'ENCOUNTER', 5, 'right', -12);
  }
  if (pred && pred.kind === 'exit' && pred.rB) { mark(X(pred.rB), Y(pred.rB), '#ffd24a', 'LEAVES SOI', 5, 'left', -12); }
  /* other craft */
  for (const b of WkF.bodies) { if (b === M || b.sim.dead || b.sim.B !== B) continue; const s2 = b.sim.S, q = [s2[0], s2[1], s2[2]]; mark(X(q), Y(q), '#93a0b2', '', 3); }
  mark(X(rv), Y(rv), '#ffd24a', 'YOU ' + _wkfLen(I.alt), 6, 'left', -12);
  /* text */
  g.fillStyle = _wkfFg; g.font = F(22); g.textAlign = 'center'; g.fillText('ORBIT MAP · ' + B.name.toUpperCase(), cx, 38 * u);
  g.font = F(14, 600); g.fillStyle = _wkfDim; g.fillText(o.hyper ? (B === WK.SUN ? 'Solar escape trajectory' : 'Escape trajectory') : B.atmTop ? 'Green: above the atmosphere · Amber: inside it · Red: underground' : 'Green: clear of the ground · Red: underground', cx, 60 * u);
  g.fillText('M close · N solar-system map · mouse wheel zoom', cx, 80 * u);
  g.fillStyle = _wkfFg; g.fillText('Inclination ' + (o.incl * 57.2958).toFixed(1) + '°   Eccentricity ' + o.e.toFixed(3) + (o.hyper ? '' : '   Period ' + _wkfTime(o.T)), cx, 102 * u);
  if (pred) { g.font = F(18); g.fillStyle = '#4be08a'; g.textAlign = 'center'; const dt = pred.ut - ut;
    if (pred.kind === 'enter') { const po = pred.orb; g.fillText('ENCOUNTER ' + pred.body.name.toUpperCase() + ' in ' + _wksFmtT(dt) + (po ? ' · closest approach ' + _wkfLen(po.pe) + (po.pe < 0 ? ' (impact!)' : '') : ''), cx, 130 * u); }
    else { g.fillStyle = '#ffd24a'; g.fillText('LEAVES ' + B.name.toUpperCase() + ' SPHERE OF INFLUENCE in ' + _wksFmtT(dt), cx, 130 * u); const q = WKS.pred2; if (q && q.kind === 'enter') { g.fillStyle = '#4be08a'; g.font = F(16); g.fillText('then ENCOUNTER ' + q.body.name.toUpperCase() + ' in ' + _wksFmtT(q.ut - ut) + (q.orb ? ' · closest approach ' + _wkfLen(q.orb.pe) : ''), cx, 154 * u); } } }
};
/* the whole system, drawn schematically: radii are square-rooted so the inner worlds stay visible */
WKS.sysMap = function (g, W, H, u) {
  const M = WkF.main, sim = M.sim, B = sim.B, ut = sim.ut, cx = W / 2, cy = H / 2 + 6 * u, mz = WkF.mz || 1, F = (px, w) => (w || 700) + ' ' + Math.round(px * u) + 'px Rajdhani, sans-serif';
  const rmax = 7.6e10, Rpx = Math.min(W, H) * 0.44 * Math.min(mz, 4), P = (x, y) => { const r = Math.hypot(x, y) || 1, f = Math.sqrt(r / rmax) * Rpx / r; return [cx + x * f, cy - y * f]; };
  g.fillStyle = 'rgba(3,5,9,0.9)'; g.fillRect(0, 0, W, H);
  const sun = P(0, 0); g.fillStyle = '#ffd24a'; g.beginPath(); g.arc(sun[0], sun[1], 7 * u, 0, TAU); g.fill(); g.fillStyle = '#c9d2de'; g.font = F(13, 600); g.textAlign = 'left'; g.fillText('HELIOS', sun[0] + 10 * u, sun[1] - 8 * u);
  const planets = WK.BODIES.filter((b) => b.parent === WK.SUN), t = { r: [0, 0, 0], v: [0, 0, 0] }, pos = {};
  for (const b of planets) { g.strokeStyle = 'rgba(147,160,178,0.28)'; g.lineWidth = 1; g.beginPath(); g.arc(cx, cy, Math.sqrt(b.a / rmax) * Rpx, 0, TAU); g.stroke(); }
  for (const b of planets) {
    const ap = WK.absPos(b, ut, [0, 0, 0]), q = P(ap[0], ap[1]); pos[b.id] = ap; g.fillStyle = '#' + (b.kind === 'home' ? '4a8a3a' : b.c1.toString(16).padStart(6, '0')); g.beginPath(); g.arc(q[0], q[1], (b.kind === 'gas' ? 8 : 5) * u, 0, TAU); g.fill();
    g.fillStyle = '#c9d2de'; g.font = F(13, 600); g.fillText(b.name + (b.kids.length ? ' +' + b.kids.map((k) => k.name).join(', ') : ''), q[0] + 10 * u, q[1] - 8 * u);
  }
  /* the craft's own path round the sun */
  const S = sim.S, ab = WK.absState(B, [S[0], S[1], S[2]], [S[3], S[4], S[5]], ut), mus = WK.SUN.mu, oo = WK.orbitIn(WK.SUN, ab.r, ab.v, {}), st = { r: [0, 0, 0], v: [0, 0, 0] };
  const span = oo.hyper ? 3e8 : oo.T, N = 420; g.lineWidth = 2.2; g.strokeStyle = '#ffb02e'; g.beginPath(); let first = true;
  for (let i = 0; i <= N; i++) { const tt = span * i / N; WK.kepler(ab.r, ab.v, mus, tt, st); const rr = Math.hypot(st.r[0], st.r[1]); if (!isFinite(rr) || rr > rmax * 1.4) { first = true; continue; } const q = P(st.r[0], st.r[1]); if (first) { g.moveTo(q[0], q[1]); first = false; } else g.lineTo(q[0], q[1]); } g.stroke();
  const pred = WKS.predict(M);
  const pe2 = pred && pred.kind === 'exit' ? WKS.pred2 : pred, pr0 = pe2;
  if (pr0 && pr0.kind === 'enter' && pr0.body.parent === WK.SUN) { const pred = pr0; const gp = WK.absPos(pred.body, pred.ut, [0, 0, 0]), q = P(gp[0], gp[1]); g.strokeStyle = '#4be08a'; g.lineWidth = 2; g.beginPath(); g.arc(q[0], q[1], 11 * u, 0, TAU); g.stroke(); g.fillStyle = '#4be08a'; g.font = F(13); g.fillText('ENCOUNTER ' + pred.body.name.toUpperCase() + ' in ' + _wksFmtT(pred.ut - ut), q[0] + 14 * u, q[1] + 4 * u); }
  const me = P(ab.r[0], ab.r[1]); g.fillStyle = '#ffd24a'; g.beginPath(); g.moveTo(me[0], me[1] - 8 * u); g.lineTo(me[0] + 6 * u, me[1] + 6 * u); g.lineTo(me[0] - 6 * u, me[1] + 6 * u); g.closePath(); g.fill(); g.font = F(14); g.fillText('YOU', me[0] + 10 * u, me[1] + 16 * u);
  g.fillStyle = _wkfFg; g.font = F(22); g.textAlign = 'center'; g.fillText('SOLAR SYSTEM · ' + _wksFmtT(ut) + ' since launch', cx, 38 * u);
  g.font = F(14, 600); g.fillStyle = _wkfDim; g.fillText('Schematic scale · orange: your path round the sun · M local map · N close', cx, 60 * u);
  g.fillStyle = _wkfFg; g.fillText('Sphere of influence: ' + B.name + (oo.hyper ? ' · leaving the system' : ' · solar orbit ' + _wkfLen(oo.pe + WK.SUN.R) + ' to ' + _wkfLen(oo.ap + WK.SUN.R)), cx, 82 * u);
};
