/* ================= WORKSHOP FLIGHT: fly what you built, in the real island world and out to space =================
   The simulator works in a planet-centred inertial frame (a 1/10-scale planet: 637 km radius, 9.8 m/s² at the surface). The island is a flat map, so
   rendering maps the state back: near the ground the craft is drawn at its local (x, altitude, z) with a horizon-relative attitude; above ~8-25 km it
   blends to the true inertial position, where a scaled planet sphere, an atmosphere shell and a starry sky take over. Several simulators can be alive
   at once: a staged-away booster or a broken-off wing is its own body with its own physics, and the craft that holds the crew is the main one. */
const WKF_HELP = 'W/S pitch · A/D roll · Q/E yaw · Shift/X throttle · 0-9 set throttle · Space stage · G gear · B brake · F flaps · R SAS mode · C camera · M orbit map · N solar system · , . time warp · H step out (landed on another world)';
const WKF_SAS = ['stab', 'hold', 'pro', 'retro', 'radial', 'anti', 'normal', 'antinormal', 'off'];
const WKF_SASN = { stab: 'STABILITY', hold: 'ATTITUDE HOLD', pro: 'PROGRADE', retro: 'RETROGRADE', radial: 'RADIAL OUT', anti: 'RADIAL IN', normal: 'NORMAL', antinormal: 'ANTI-NORMAL', off: 'SAS OFF' };
const WKF_WARPS = [1, 2, 4, 10, 50, 200, 1000, 10000, 100000, 1000000];
const WKF_SOI_PAY = { luna: 8000, ember: 20000, rust: 30000, pebble: 40000, jove: 50000, cinder: 60000 };
const WKF_TP_ALT = { sun: 6e8, ember: 40e3, home: 150e3, luna: 30e3, rust: 110e3, pebble: 30e3, jove: 300e3, cinder: 45e3 };   /* developer teleport: circular-orbit altitude per body */
const WKF_START_ALT = { home: 150e3, luna: 30e3, ember: 40e3, rust: 110e3, pebble: 30e3, jove: 300e3, cinder: 45e3 };
const WkF = { mapMode: 'local', mz: 1, on: false, bodies: [], main: null, debris: [], view: 0, map: false, warp: 1, wi: 0, paused: false, time: 0, over: null, park: true, ly: 0, lp: 0, zoom: 1, camDir: new THREE.Vector3(1, 0, 0), snap: true, drag: false, msgs: [], rec: null, ox: 0, oz: 0, space: null, lastSpawn: null, hint: 0 };
const _wkV1 = new THREE.Vector3(), _wkV2 = new THREE.Vector3(), _wkV3 = new THREE.Vector3(), _wkV4 = new THREE.Vector3(), _wkQ1 = new THREE.Quaternion(), _wkQ2 = new THREE.Quaternion();
const _wkfSun = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const _wkfConj = (q) => [-q[0], -q[1], -q[2], q[3]];

/* ---------- space: planet sphere, atmosphere shell, star sky ---------- */
const WKF_PV = 'varying vec3 vN; varying vec3 vW; void main(){ vN=normalize(position); vec4 wp=modelMatrix*vec4(position,1.0); vW=wp.xyz; gl_Position=projectionMatrix*viewMatrix*wp; }';
const WKF_PF = `uniform vec3 uSunDir,uHome,uHor,uZen; uniform float uOp,uTime; varying vec3 vN; varying vec3 vW;
float h3(vec3 p){ p=fract(p*0.3183099+vec3(0.1,0.2,0.3)); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float n3(vec3 p){ vec3 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z); }
float f3(vec3 p){ float v=0.0,a=0.5; for(int i=0;i<5;i++){ v+=a*n3(p); p=p*2.02+vec3(1.7,9.2,3.1); a*=0.5; } return v; }
void main(){
  vec3 n=normalize(vN); vec3 dir=normalize(vW-cameraPosition);
  float hg=f3(n*5.0+3.0)*0.62+f3(n*17.0)*0.38, land=smoothstep(0.55,0.585,hg);
  vec3 ocean=mix(vec3(0.008,0.04,0.1),vec3(0.03,0.19,0.27),smoothstep(0.45,0.56,hg));
  vec3 grd=mix(vec3(0.09,0.22,0.06),vec3(0.42,0.34,0.2),smoothstep(0.6,0.78,hg));
  float polar=smoothstep(0.8,0.94,abs(n.z));
  vec3 col=mix(ocean,grd,land); col=mix(col,vec3(0.88,0.92,0.97),polar);
  float hd=acos(clamp(dot(n,uHome),-1.0,1.0)); col=mix(col,vec3(0.12,0.5,0.1),smoothstep(0.018,0.009,hd)); col+=vec3(0.5,0.45,0.2)*smoothstep(0.0032,0.0015,hd);
  float cl=smoothstep(0.55,0.78,f3(n*8.0+vec3(uTime*0.0015,0.0,0.0))); col=mix(col,vec3(0.95),cl*0.85);
  float ndl=dot(n,uSunDir), lit=smoothstep(-0.05,0.32,ndl);
  float spec=(1.0-land)*(1.0-cl)*pow(max(dot(reflect(-uSunDir,n),-dir),0.0),50.0)*0.7;
  vec3 c=col*(0.012+1.1*lit)+vec3(spec)*lit;
  float fr=pow(1.0-clamp(dot(n,-dir),0.0,1.0),3.0); c+=vec3(0.28,0.5,1.0)*fr*(0.12+0.9*lit)*0.9;
  vec3 sky=dir.y>0.0?mix(uHor,uZen,pow(clamp(dir.y,0.0,1.0),0.42)):uHor*0.55;
  gl_FragColor=vec4(mix(sky,c,uOp),1.0);
  #include <tonemapping_fragment>
  #include <encodings_fragment>
}`;
const WKF_AF = `uniform vec3 uSunDir,uC,uCa,uCb; uniform float uRs,uHs,uFade; varying vec3 vN; varying vec3 vW;
void main(){
  vec3 d=normalize(vW-cameraPosition); float t=dot(uC-cameraPosition,d); vec3 cp=cameraPosition+d*t; float b=length(cp-uC);
  if(b<uRs) discard;
  float x=clamp((b-uRs)/uHs,0.0,1.0), g=pow(1.0-x,2.6); vec3 nl=normalize(cp-uC); float sd=dot(nl,uSunDir), lit=smoothstep(-0.3,0.45,sd);
  vec3 col=mix(uCb,uCa,pow(1.0-x,4.0)); col=mix(col,vec3(1.0,0.5,0.2),smoothstep(0.25,0.0,abs(sd))*0.55);
  gl_FragColor=vec4(col*g*lit*uFade*1.7,1.0);
  #include <tonemapping_fragment>
  #include <encodings_fragment>
}`;
WkF.setupSpace = function () {
  if (WkF.space) return; const geo = new THREE.SphereGeometry(1, 64, 40);
  const pm = new THREE.ShaderMaterial({ vertexShader: WKF_PV, fragmentShader: WKF_PF, depthTest: false, depthWrite: false, fog: false, uniforms: { uSunDir: { value: env.sunDir }, uHome: { value: new THREE.Vector3(0, 1, 0) }, uHor: { value: env.hor }, uZen: { value: env.zen }, uOp: { value: 0 }, uTime: { value: 0 } } });
  const planet = new THREE.Mesh(geo, pm); planet.renderOrder = -500; planet.frustumCulled = false; planet.visible = false;
  const am = new THREE.ShaderMaterial({ vertexShader: WKF_PV, fragmentShader: WKF_AF, side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, uniforms: { uSunDir: { value: env.sunDir }, uC: { value: new THREE.Vector3() }, uRs: { value: 1 }, uHs: { value: 0.1 }, uFade: { value: 0 } } });
  const atm = new THREE.Mesh(geo, am); atm.renderOrder = 4; atm.frustumCulled = false; atm.visible = false;
  scene.add(planet, atm); WkF.space = { planet, atm, pm, am }; WKS.setup();
  /* debris / canopy materials */
  WkF.canopyGeo = new THREE.SphereGeometry(1, 20, 8, 0, TAU, 0, Math.PI / 2); const pa = WkF.canopyGeo.attributes.position, cols = []; for (let i = 0; i < pa.count; i++) { const seg = Math.floor((Math.atan2(pa.getZ(i), pa.getX(i)) / TAU + 1) * 12 + 1e-4) % 2; cols.push(seg ? 1 : 0.95, seg ? 0.42 : 0.95, seg ? 0.16 : 0.92); }
  WkF.canopyGeo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); WkF.canopyMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0, side: THREE.DoubleSide });
};
/* ---------- start / stop ---------- */
WkF.start = function (spec, after) { UI.fade(true, 'LAUNCH', spec.name || 'Craft'); setTimeout(() => { WkF.begin(spec); if (after) after(); UI.fade(false); }, 380); };
WkF.begin = function (spec) {
  WkF.cleanup(false); WkF.setupSpace(); WkE.begin(); const A = Air.s; WkF.ox = A ? A.cx : 0; WkF.oz = A ? A.cz : 0; WkF.spec = spec; WkF.lastSpawn = spec;
  const C = WK.compile(spec), G = {}, air = spec.mode === 'air';
  const homeEnv = { ground: (x, z, o) => { groundAt(WkF.ox + x, WkF.oz + z, G); o.h = G.h; o.water = G.water; o.mu = G.mu; o.rr = G.rr; return o; } };
  const envFor = (B, prev) => (B === WK.HOME ? homeEnv : B.crush || B === WK.SUN ? { ground: (x, z, o) => { o.h = -1e9; o.water = false; o.mu = 0.3; o.rr = 0.05; return o; } } : { ground: (x, z, o) => { o.h = 0; o.water = false; o.mu = 0.85; o.rr = 0.03; return o; } });
  const start = !air && spec.start && WK.BY[spec.start] && WKF_START_ALT[spec.start] ? WK.BY[spec.start] : null, sx = air ? -405 : -330, sz = air ? 0 : 150, g0 = {};
  const sim = new WKSim(C, { body: start || WK.HOME, ut: WK.UT0, env: start ? envFor(start) : homeEnv, envFor });
  const qe = air || start ? qfromAxes3([0, 0, -1], [0, 1, 0], [1, 0, 0]) : qfromAxes3([0, 0, -1], [-1, 0, 0], [0, 1, 0]);
  if (start) { const os = WK.orbitState(start, WKF_START_ALT[start.id]); sim.setState(os.r, os.v, qe, [0, 0, 0]); sim.ctl.sas = 'hold'; sim.ctl.gear = 0; sim.ctl.brake = 0; sim.ctl.thr = 0; for (const g of sim.gear) g.ext = 0; sim.holdQ = null; }
  else {
    groundAt(WkF.ox + sx, WkF.oz + sz, g0); loadAround(WkF.ox + sx, WkF.oz + sz, 8);
    const pj = WK.proj(WK.unproj(sx, 0, sz)); const q = _wkqmul(pj.qL, qe, [0, 0, 0, 1]); const low = sim.lowest(qe, [0, 1, 0]);
    sim.setState(WK.unproj(sx, g0.h - low + 0.03, sz), [0, 0, 0], q, [0, 0, 0]);
    sim.ctl.sas = 'stab'; sim.ctl.gear = 1; sim.ctl.brake = 1; sim.ctl.thr = 0; for (const g of sim.gear) g.ext = 1;
  }
  sim.step(1 / 60); sim.ev.length = 0;
  Wk.ph = 'fly'; WkF.on = true; WkF.over = null; WkF.warp = 1; WkF.wi = 0; WkF.paused = false; WkF.park = true; WkF.time = 0; WkF.landed = 0; WkF.debris = []; WkF.msgs = []; WkF.snap = true; WkF.ly = WkF.lp = 0; WkF.view = air ? 0 : 0; WkF.map = false; WkF.hint = 14; WkF.mapMode = 'local'; WkF.mz = 1; WkF.start0 = start; WkF.cheat = false;
  WkF.rec = { maxAlt: 0, maxSpd: 0, t: 0, air: false, ground: false, space: false, sound: false };
  E.wkBuild.hidden = true; E.wkFly.hidden = false; E.wkTp.hidden = !(save.set.dev && !air); Wk.modal(null); for (const k in Keys) Keys[k] = false;
  const b = WkF.addBody(sim, C); WkF.main = b; WkF.radius = Math.max(2.5, (Wk.stats ? Wk.stats.len : 8) * 0.5, spec.parts.reduce((m, p) => Math.max(m, ((p.par || {}).span || 0) * 0.6), 0)); WkF.camDir.set(1, 0, 0);
  save.wk.flights = (save.wk.flights || 0) + 1; App.tod = air ? Math.min(Math.max(App.tod, 7), 17) : App.tod; WkF.place(b, start ? 1 : 0); WKS.reset(b); if (start) { WkF.hint = 9; WkF.say('IN ORBIT OF ' + start.name.toUpperCase() + ' · M for the map · . to time-warp'); }
};
WkF.addBody = function (sim, C, from) {
  const b = { sim, C, P: new THREE.Vector3(), Q: new THREE.Quaternion(), pj: { x: 0, y: 0, z: 0, qL: [0, 0, 0, 1], th: 0 }, vel: new THREE.Vector3(), age: 0, canopies: {}, exploded: false, still: 0 };
  if (from) { b.grp = new THREE.Group(); b.pm = {}; for (const p of sim.parts) { const g = from.pm[p.id]; if (g) { b.grp.add(g); b.pm[p.id] = g; delete from.pm[p.id]; } } }
  else { const cr = WKG.craft(C); b.grp = cr.root; b.pm = cr.parts; }
  scene.add(b.grp); WkF.bodies.push(b); return b;
};
WkF.adopt = function () {
  for (const b of WkF.bodies.slice()) { const fr = b.sim.frags; if (!fr.length) continue; for (const f of fr.splice(0)) { const nb = WkF.addBody(f, b.C, b); nb.born = WkF.time; if (f.isMain) { WkF.main = nb; WkF.snapSoft = true; } if (WkF.bodies.length > 28) { const old = WkF.bodies.find((x) => x !== WkF.main && x.sim.dead); if (old) WkF.removeBody(old); } } }
};
WkF.removeBody = function (b) { const i = WkF.bodies.indexOf(b); if (i >= 0) WkF.bodies.splice(i, 1); if (b.grp.parent) b.grp.parent.remove(b.grp); b.grp.traverse((o) => { if (o.isMesh && o.geometry) o.geometry.dispose(); }); for (const k in b.canopies) { const c = b.canopies[k]; if (c.parent) c.parent.remove(c); } };
WkF.cleanup = function (full) {
  WK.use(WK.HOME); WkE.cleanup();
  for (const b of WkF.bodies.slice()) WkF.removeBody(b); WkF.bodies = []; WkF.main = null;
  for (const d of WkF.debris) { if (d.g.parent) d.g.parent.remove(d.g); d.g.traverse((o) => { if (o.isMesh && o.geometry) o.geometry.dispose(); }); } WkF.debris = [];
  if (WkF.space) { WkF.space.planet.visible = false; WkF.space.atm.visible = false; WKS.reset(null); }
  if (full !== false) { try { Chunks.group.visible = true; Far.group.visible = true; } catch (er) { /* ignore */ } MAT.sky.uniforms.uSpace.value = 0; camera.near = 0.1; camera.far = 5000; camera.fov = save.set.fov || 76; camera.up.set(0, 1, 0); camera.updateProjectionMatrix(); }
  WkF.on = false;
};
WkF.back = function (toWorld) {
  if (!WkF.on && Wk.ph !== 'fly') return; UI.fade(true, '', ''); setTimeout(() => {
    WkF.cleanup(true); Wk.ph = 'build'; if (toWorld === true) { Wk.persist(); Wk.on = false; UI.setMode('play'); for (const k in Keys) Keys[k] = false; }
    else { E.wkBuild.hidden = false; E.wkFly.hidden = true; Wk.refit = true; Wk.dirty = true; Wk.uiDirty = true; Wk.az = Wk.goal.az = 0.85; }
    UI.fade(false);
  }, 300);
};
WkF.relaunch = function () { if (WkF.lastSpawn) WkF.start(WkF.lastSpawn); };

/* ---------- developer teleport (Developer mode only): jump to the orbit or the surface of any world, keeping the craft, its fuel and its stages ---------- */
WkF.tpOpen = function () {
  const M = WkF.main; if (!M || WkF.over) return;
  if (WkE.on) { WkF.say('Climb back into the craft first (H)'); return; }
  if (!save.set.dev) { WkF.say('Turn on Developer mode in Settings to teleport'); return; }
  if (WkF.spec.mode === 'air') { WkF.say('Teleporting is for rockets'); return; }
  if (!WkF.tpPaused) { WkF._pp = WkF.paused; WkF.paused = true; WkF.tpPaused = true; }
  Wk.modal('tp');
};
WkF.tpHTML = function () {
  const cur = WkF.main.sim.B;
  let h = '<h3>Teleport <small style="font-size:13px;color:#93a0b2">developer</small></h3><div class="wkrow"><div><small>Your craft keeps its fuel and stages. Orbits are circular and prograde; Surface puts you upright on the ground with the gear down. Rewards stay off for the rest of a flight you have teleported in.</small></div></div>';
  for (const B of WK.BODIES) {
    const sfc = B === WK.HOME ? '<button class="wb" data-a="tp" data-v="home:pad">Launch pad</button>' : B.crush || B === WK.SUN ? '' : '<button class="wb" data-a="tp" data-v="' + B.id + ':land">Surface</button>';
    h += '<div class="wkrow"><div><b>' + _wkEsc(B.name) + '</b>' + (B === cur ? ' · you are here' : '') + '<small>' + _wkEsc(B.desc || 'The star at the centre of the system.') + ' Orbit at ' + _wkfLen(WKF_TP_ALT[B.id]) + '.</small></div><button class="wb" data-a="tp" data-v="' + B.id + ':orbit">Orbit</button>' + sfc + '</div>';
  }
  return h;
};
WkF.teleport = function (v) {
  const [id, where] = String(v).split(':'), T = WK.BY[id], M = WkF.main; Wk.modal(null); if (!T || !M || !save.set.dev) return;
  if (where === 'pad') { const sp = JSON.parse(JSON.stringify(WkF.spec)); delete sp.start; WkF.start(sp); return; }
  const sim = M.sim; if (sim.dead || WkF.over) { WkF.say('This craft is wrecked: relaunch first'); return; }
  /* anything left behind (spent stages, fragments, debris) lives in the old body's frame */
  for (const b of WkF.bodies.slice()) if (b !== M) WkF.removeBody(b);
  for (const d of WkF.debris) { if (d.g.parent) d.g.parent.remove(d.g); d.g.traverse((o) => { if (o.isMesh && o.geometry) o.geometry.dispose(); }); } WkF.debris = []; sim.frags.length = 0;
  sim.B = T; WK.use(T); if (sim.envFor) sim.env = sim.envFor(T, sim.env); sim.gp.ok = false;
  if (where === 'land' && !T.crush && T !== WK.SUN) {
    const qe = qfromAxes3([0, 0, -1], [-1, 0, 0], [0, 1, 0]), low = sim.lowest(qe, [0, 1, 0]), r = [0, T.R + 0.03 - low, 0], pj = WK.proj(r), q = _wkqmul(pj.qL, qe, [0, 0, 0, 1]);
    sim.setState(r, [0, 0, 0], q, [0, 0, 0]); sim.ctl.sas = 'stab'; sim.ctl.gear = 1; sim.ctl.brake = 1; for (const g of sim.gear) g.ext = 1; WkF.park = true;
  } else {
    const qe = qfromAxes3([0, 0, -1], [0, 1, 0], [1, 0, 0]), os = WK.orbitState(T, WKF_TP_ALT[T.id]);
    sim.setState(os.r, os.v, qe, [0, 0, 0]); sim.ctl.sas = 'hold'; sim.ctl.gear = 0; sim.ctl.brake = 0; for (const g of sim.gear) g.ext = 0; WkF.park = false;
  }
  sim.ctl.thr = 0; sim.holdQ = null; sim.step(1 / 60); sim.ev.length = 0;
  WkF.cheat = true; WkF.warp = 1; WkF.wi = 0; WkF.landed = 0; WkF.still = WkF.still2 = WkF.still3 = 0; WkF.map = false; WkF.snap = true; WkF.ly = WkF.lp = 0; WkF.hint = 0; WkF.msgs.length = 0; WKS.reset(M);
  WkF.say('TELEPORTED TO ' + T.name.toUpperCase() + (where === 'land' ? ' · SURFACE' : ' · ORBIT') + ' · rewards off');
};

/* ---------- input ---------- */
WkF.key = function (code) {
  const M = WkF.main; if (!M) return; const sim = M.sim, c = sim.ctl;
  if (!E.wkModal.hidden) { if (code === 'Escape') Wk.modal(null); return; }
  if (WkE.on) { WkE.key(code); return; }
  if (code === 'KeyH' && WkF.spec.mode !== 'air') { WkE.exit(); return; }
  if (code === 'KeyK' && save.set.dev) { WkF.tpOpen(); return; }
  if (code === 'Escape') { if (WkF.map) WkF.map = false; else WkF.back(); return; }
  if (code === 'Enter') { if (WkF.over || WkF.landed > 0) WkF.relaunch(); return; }
  if (code === 'KeyC') WkF.cycleView(); else if (code === 'KeyM') WkF.toggleMap('local'); else if (code === 'KeyN') WkF.toggleMap('sys'); else if (code === 'KeyP') { WkF.paused = !WkF.paused; WkF.say(WkF.paused ? 'PAUSED' : 'RESUMED'); }
  if (WkF.over) return;
  switch (code) {
    case 'Space': { const r = sim.isMain ? sim.stageNext() : { any: false }; if (!r.any) { sim.stageNo--; WkF.say('No more stages'); } else { Snd.beep(660, 0.06); } break; }
    case 'KeyG': c.gear = c.gear ? 0 : 1; WkF.say(c.gear ? 'GEAR DOWN' : 'GEAR UP'); break;
    case 'KeyB': if (WkF.park) { WkF.park = false; } else WkF.park = true; WkF.say(WkF.park ? 'PARKING BRAKE' : 'BRAKES OFF'); break;
    case 'KeyF': c.flap = c.flap >= 0.99 ? 0 : Math.min(1, Math.round((c.flap + 0.34) * 100) / 100); WkF.say('FLAPS ' + Math.round(c.flap * 100) + '%'); break;
    case 'KeyU': c.brk = c.brk ? 0 : 1; WkF.say(c.brk ? 'AIRBRAKE' : 'AIRBRAKE IN'); break;
    case 'KeyV': c.ab = c.ab ? 0 : 1; WkF.say(c.ab ? 'AFTERBURNER ARMED' : 'AFTERBURNER OFF'); break;
    case 'KeyT': c.sas = c.sas === 'off' ? 'stab' : 'off'; WkF.say(WKF_SASN[c.sas]); break;
    case 'KeyR': { const i = WKF_SAS.indexOf(c.sas); c.sas = WKF_SAS[(i + 1) % (WKF_SAS.length - 1)]; sim.holdQ = null; WkF.say(WKF_SASN[c.sas]); break; }
    case 'KeyZ': c.thr = 1; break; case 'Digit0': c.thr = 0; break;
    case 'Period': WkF.wi = Math.min(WKF_WARPS.length - 1, WkF.wi + 1); WkF.setWarp(); break; case 'Comma': WkF.wi = Math.max(0, WkF.wi - 1); WkF.setWarp(); break;
    default: if (/^Digit[1-9]$/.test(code)) c.thr = +code.slice(5) / 10;
  }
};
WkF.setWarp = function () { if (WkE.on) { WkF.wi = 0; WkF.warp = 1; return; } const k = WKF_WARPS[WkF.wi], m = WkF.main.sim; if (k > 4 && !WKS.railOK(m)) { WkF.say('Time warp above 4x needs coasting above ' + _wkfLen(m.B.rails) + ' (' + m.B.name + ')'); WkF.wi = Math.min(WkF.wi, 2); } WkF.warp = WKF_WARPS[WkF.wi]; if (WkF.warp > 1) WkF.say('TIME WARP ' + WkF.warp.toLocaleString('en-US') + 'x'); };
WkF.say = function (t) { WkF.msgs.push({ t, age: 0 }); if (WkF.msgs.length > 4) WkF.msgs.shift(); };
WkF.cycleView = function () { if (WkE.on) { WkE.cycle(); return; } WkF.view = (WkF.view + 1) % 3; WkF.ly = WkF.lp = 0; WkF.snap = true; WkF.say(['CHASE CAMERA', 'COCKPIT CAMERA', 'FREE CAMERA'][WkF.view]); };
WkF.toggleMap = function (mode) { if (WkE.on) { WkF.say('Climb back in (H) to use the maps'); return; } if (WkF.map && (!mode || mode === WkF.mapMode)) { WkF.map = false; return; } WkF.map = true; WkF.mapMode = mode || WkF.mapMode || 'local'; WkF.mz = 1; WKS.predict(WkF.main, true); };
WkF.drag = function (dx, dy) { if (WkE.on) { WkE.drag(dx, dy); return; } WkF.drag2 = true; WkF.ly -= dx * 0.006; WkF.lp = clamp(WkF.lp + dy * 0.005, -1.2, 1.3); };
WkF.zoom = function (k) { if (WkF.map) { WkF.mz = clamp((WkF.mz || 1) / k, 0.1, 60); return; } WkF.zoom1 = clamp((WkF.zoom1 || 1) * k, 0.35, 6); };
WkF.read = function (dt, sim) {
  const K = Keys, c = sim.ctl, ramp = (cur, t) => cur + clamp(t - cur, -dt * (t === 0 ? 7 : 4.5), dt * 4.5);
  if (WkE.on) { c.pitch = c.roll = c.yaw = 0; c.thr = 0; c.brake = 1; return; }
  if (WkF.over) { c.pitch = c.roll = c.yaw = 0; c.thr = 0; return; }
  let pull = ((K.KeyS || K.ArrowDown) ? 1 : 0) - ((K.KeyW || K.ArrowUp) ? 1 : 0); if (save.set.finv) pull = -pull;
  const roll = ((K.KeyD || K.ArrowRight) ? 1 : 0) - ((K.KeyA || K.ArrowLeft) ? 1 : 0), yaw = (K.KeyE ? 1 : 0) - (K.KeyQ ? 1 : 0);
  c.pitch = ramp(c.pitch || 0, pull); c.roll = ramp(c.roll || 0, roll); c.yaw = ramp(c.yaw || 0, yaw);
  if (K.ShiftLeft || K.ShiftRight) c.thr = Math.min(1, c.thr + dt * 0.6); if (K.KeyX) c.thr = Math.max(0, c.thr - dt * 0.6);
  if (WkF.park && c.thr > 0.2) { WkF.park = false; WkF.say('BRAKES OFF'); }
  c.brake = WkF.park || K.KeyB ? 1 : 0;
};

/* ---------- simulation ---------- */
WkF.simulate = function (dt) {
  const M = WkF.main, main = M.sim; let k = WkF.warp;
  if (k > 4 && !WKS.railOK(main)) { k = 1; WkF.warp = 1; WkF.wi = 0; WkF.say('TIME WARP OFF'); }
  const dts = dt * k;
  for (const b of WkF.bodies.slice()) {
    const s = b.sim; if (s.dead) continue; b.age += dts;
    if (k <= 4) s.step(dts); else { s.warpStop = false; s.warp(dt, k); if (s.warpStop && b === M) { WkF.warp = 1; WkF.wi = 0; WkF.say('TIME WARP OFF'); WkF.snap = true; } }
    const S = s.S; if (!(S[0] + S[3] + S[6] + S[10] === S[0] + S[3] + S[6] + S[10])) { s.dead = true; s.deadWhy = 'Simulation error'; s.ev.push('destroyed:Simulation error'); }
    /* anything that sits still on the ground for a long time is left alone; fragments that fall in the sea are done */
  }
  WkF.time += dt; App.tod = (App.tod + dts / 3600) % 24; WkF.adopt();
};
WkF.events = function () {
  const M = WkF.main; if (!M) return;
  for (const b of WkF.bodies.slice()) {
    const s = b.sim, ev = s.ev.splice(0), isM = b === M; if (!ev.length) continue;
    for (const e of ev) {
      const a = e.split(':');
      switch (a[0]) {
        case 'stage': if (isM) UI.banner('STAGE ' + a[1], 'Staging'); break;
        case 'ignite': if (isM) Snd.beep(330, 0.08); break;
        case 'chute': if (isM) WkF.say('PARACHUTE DEPLOYED'); break;
        case 'chute-torn': if (isM) UI.toast('Parachute torn off: too fast', 'bad'); break;
        case 'touch': { const v = +a[1], h = +a[2]; if (isM) { if (v > 1.2 && App.time - (WkF.lastTd || -9) > 2) { WkF.lastTd = App.time; WkF.say('TOUCHDOWN ' + v.toFixed(1) + ' m/s' + (h > 1 ? ' · ' + h.toFixed(0) + ' m/s along' : '')); } if (v > 1) Snd.crash(Math.min(30, v * 2.5)); } WkF.dust(b, Math.min(20, 3 + v * 2 + h * 0.3)); break; }
        case 'gear-broke': if (isM) UI.toast('Landing gear collapsed', 'bad'); WkF.burst(b, 0.35); break;
        case 'gear-torn': if (isM) UI.toast('Landing gear torn off by the airflow', 'bad'); WkF.burst(b, 0.3); break;
        case 'overload': if (isM) UI.toast('Wing overloaded: it folded', 'bad'); WkF.burst(b, 0.4); Snd.crash(14); break;
        case 'split': if (a[2] === 'break') { if (isM) UI.toast('Structure failure', 'bad'); WkF.burst(b, 0.5); } else { WkF.burst(b, 0.12); } break;
        case 'takeover': UI.toast('The crew capsule is now in control', 'good'); break;
        case 'burnout': if (isM) WkF.say('BOOSTER BURNOUT'); break;
        case 'destroyed': WkF.explode(b, e.slice(10)); break;
        case 'soi': { if (!isM) break; const X = WK.BY[a[1]]; if (!X) break; WkF.snap = true; WKS.predAt = -9; const first = !(save.wk.done || {})['soi_' + X.id]; UI.banner(X === WK.SUN ? 'LEAVING HOME SPACE' : 'ENTERING ' + X.name.toUpperCase(), X === WK.SUN ? 'Now orbiting Helios' : 'Sphere of influence · ' + X.desc); WkF.say('Now in the sphere of influence of ' + X.name); if (X !== WK.HOME && X !== WK.SUN) WkF.reward('soi_' + X.id, WKF_SOI_PAY[X.id] || 10000, 'Reached ' + X.name); void first; break; }
        default:
      }
    }
  }
  /* records and milestones */
  const I = M.sim.info, R = WkF.rec, B = M.sim.B, home = B === WK.HOME; R.maxAlt = Math.max(R.maxAlt, home ? I.alt || 0 : 0); R.maxSpd = Math.max(R.maxSpd, I.speed || 0);
  if (!M.sim.dead && I.alt != null) {
    if (home) {
      if ((I.agl > 6) && !R.air) { R.air = true; WkF.reward('fly', 400, 'First flight'); }
      if (I.alt > 5000) WkF.reward('alt5k', 800, 'Above 5 km'); if (I.mach > 1) WkF.reward('mach1', 1200, 'Supersonic'); if (I.alt > 100000) { R.space = true; WkF.reward('space', 6000, 'Reached space'); }
      const o = I.orb; if (o && !o.hyper && o.pe > 90000 && I.alt > 90000) WkF.reward('orbit', 20000, 'In orbit'); if (o && o.hyper && I.alt > 120000) WkF.reward('escape', 25000, 'Escape velocity');
    } else if (B !== WK.SUN) {
      R.space = true; const o = I.orb, pay = WKF_SOI_PAY[B.id] || 10000;
      if (o && !o.hyper && o.pe > Math.max(B.atmTop || 0, B.R * 0.02) && I.alt > 500) WkF.reward('orbit_' + B.id, Math.round(pay * 1.5), 'Orbit of ' + B.name);
      if (I.agl < 4 && I.speed < 1.2 && !M.sim.dead && I.alt < 100 && !B.crush) { WkF.still3 = (WkF.still3 || 0) + 0.016; if (WkF.still3 > 3) WkF.reward('land_' + B.id, pay * 3, 'Landed on ' + B.name); } else WkF.still3 = 0;
    }
    if (home && R.space && I.agl < 4 && I.speed < 1.2 && !M.sim.dead) { WkF.still = (WkF.still || 0) + 0.016; if (WkF.still > 4 && !WkF.landed) { WkF.landed = 1; UI.banner('RECOVERED', 'Safely back on the ground'); WkF.reward('recover', 5000, 'Recovered from space'); } } else WkF.still = 0;
    if (home && !R.space && I.agl < 3 && I.speed < 0.8 && R.air && !WkF.landed && WkF.time > 20) { WkF.still2 = (WkF.still2 || 0) + 0.016; if (WkF.still2 > 3) { WkF.landed = 1; UI.banner('LANDED', 'Press Enter to fly again'); WkF.reward('land', 300, 'Landing'); } } else WkF.still2 = 0;
  }
  const bst = save.wk.best || (save.wk.best = { alt: 0, spd: 0 }); if (R.maxAlt > bst.alt + 50) { bst.alt = R.maxAlt; WkF.bestDirty = true; } if (R.maxSpd > bst.spd + 1) bst.spd = R.maxSpd;
  if (WkF.bestDirty && WkF.time % 6 < 0.05) { WkF.bestDirty = false; writeSave(); }
};
WkF.reward = function (id, cash, why) { if (WkF.cheat) return; const d = save.wk.done || (save.wk.done = {}); if (d[id]) return; d[id] = 1; save.money += cash; writeSave(); UI.banner(why.toUpperCase(), '+' + money(cash)); Snd.win(); };
WkF.dust = function (b, n) { const P = b.P; for (let i = 0; i < n; i++) emit(Part.smoke, P.x + (Math.random() - 0.5) * 3, P.y - 0.4, P.z + (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 4, 0.6 + Math.random() * 1.2, (Math.random() - 0.5) * 4, 1.1 + Math.random(), 0.9, 3.4, 0.55, 0.5, 0.42, 0.45, -0.1); };
WkF.burst = function (b, k) { const P = b.P; for (let i = 0; i < 26 * k; i++) emit(Part.spark, P.x + (Math.random() - 0.5) * 2, P.y + Math.random(), P.z + (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 16 * k, Math.random() * 8 * k, (Math.random() - 0.5) * 16 * k, 0.4 + Math.random() * 0.5, 1.4 + Math.random() * 1.6, 2.6, 3.0, 1.3, 0.3, 0.9, 6); for (let i = 0; i < 10 * k; i++) emit(Part.smoke, P.x, P.y + 0.5, P.z, (Math.random() - 0.5) * 6 * k, 1 + Math.random() * 3, (Math.random() - 0.5) * 6 * k, 2 + Math.random() * 2, 1.6, 5, 0.06, 0.06, 0.07, 0.7, -0.2); };
WkF.explode = function (b, why) {
  if (b.exploded) return; b.exploded = true; const P = b.P, big = clamp(Math.sqrt(b.sim.m / 800), 0.5, 3.5), R = Math.random;
  for (let i = 0; i < 60 * big; i++) emit(Part.spark, P.x + (R() - 0.5) * 3, P.y + R() * 2, P.z + (R() - 0.5) * 3, (R() - 0.5) * 18 * big, 2 + R() * 14 * big, (R() - 0.5) * 18 * big, 0.5 + R() * 0.9, 2.8 + R() * 3 * big, 4 * big, 3.0, 1.2 + R() * 0.5, 0.2, 0.85, 3);
  for (let i = 0; i < 44 * big; i++) emit(Part.smoke, P.x + (R() - 0.5) * 3, P.y + R() * 2, P.z + (R() - 0.5) * 3, (R() - 0.5) * 9 * big, 3 + R() * 8, (R() - 0.5) * 9 * big, 3 + R() * 3, 2.6 * big, 8 * big, 0.04, 0.04, 0.045, 0.75, -0.2);
  Snd.crash(34); if (Snd.ok) Snd.noiseHit(Snd.ctx.currentTime, 1.3, 0.8, 0, 800, Snd.sfx);
  /* the wreck falls apart into pieces that tumble on their own */
  const v0 = b.vel; for (const id in b.pm) { const g = b.pm[id]; scene.attach(g); const d = { g, v: new THREE.Vector3(v0.x + (R() - 0.5) * 14 * big, v0.y + 3 + R() * 9 * big, v0.z + (R() - 0.5) * 14 * big), w: new THREE.Vector3((R() - 0.5) * 8, (R() - 0.5) * 8, (R() - 0.5) * 8), rest: false, life: 0, fire: R() < 0.5 }; WkF.debris.push(d); }
  b.pm = {}; b.grp.visible = false;
  if (b === WkF.main) { WkF.over = { why: why || 'Destroyed', t: 0 }; UI.banner('CRASHED', (why || 'Destroyed') + ' · Enter to relaunch'); }
};
WkF.debrisStep = function (dt) {
  const G = {}, Bm = WkF.main ? WkF.main.sim.B : WK.HOME, hb = Bm === WK.HOME, g0 = hb ? 9.8 : Bm.g0; for (const d of WkF.debris) {
    if (d.rest) continue; d.life += dt; d.v.y -= g0 * dt; d.g.position.addScaledVector(d.v, dt); d.g.rotation.x += d.w.x * dt; d.g.rotation.y += d.w.y * dt; d.g.rotation.z += d.w.z * dt;
    if (hb) groundAt(d.g.position.x, d.g.position.z, G); else G.h = 0; const h = Math.max(G.h, 0) + 0.25; if (d.g.position.y < h) { d.g.position.y = h; d.v.y *= -0.25; d.v.x *= 0.6; d.v.z *= 0.6; d.w.multiplyScalar(0.5); if (d.v.length() < 1.2) { d.rest = true; } }
    if (d.fire && d.life < 6 && Math.random() < dt * 14) emit(Part.smoke, d.g.position.x, d.g.position.y + 0.3, d.g.position.z, (Math.random() - 0.5), 1.4, (Math.random() - 0.5), 1.8, 0.9, 3, 0.07, 0.07, 0.08, 0.6, -0.2);
  }
};
function qfromAxes3(x, y, z) { return _wkqfromAxes(x, y, z, [0, 0, 0, 1]); }

/* ---------- drawing ---------- */
WkF.place = function (b, s) {
  WK.use(b.sim.B); const S = b.sim.S, pj = WK.proj([S[0], S[1], S[2]], b.pj), q = [S[6], S[7], S[8], S[9]], qf = _wkqmul(_wkfConj(pj.qL), q, [0, 0, 0, 1]);
  _wkV1.set(WkF.ox + pj.x, pj.y, WkF.oz + pj.z); _wkV2.set(WkF.ox + S[0], S[1] - WK.R, WkF.oz + S[2]); b.P.lerpVectors(_wkV1, _wkV2, s);
  b.Q.set(qf[0], qf[1], qf[2], qf[3]); _wkQ1.set(q[0], q[1], q[2], q[3]); b.Q.slerp(_wkQ1, s);
  const c = b.sim.c; _wkV3.set(c[0], c[1], c[2]).applyQuaternion(b.Q); b.grp.position.copy(b.P).sub(_wkV3); b.grp.quaternion.copy(b.Q);
  /* velocity in render axes (for debris and the flame's smear) */
  const vl = _wkqrot(_wkfConj(pj.qL), [S[3], S[4], S[5]], [0, 0, 0]); b.vel.set(vl[0] * (1 - s) + S[3] * s, vl[1] * (1 - s) + S[4] * s, vl[2] * (1 - s) + S[5] * s);
};
WkF.animate = function (dt) {
  for (const b of WkF.bodies) {
    if (b.exploded) continue; const s = b.sim, air = s.air || { p: 101325, rho: 1.2 }, pr = clamp(air.p / 101325, 0, 1), spc = s.info && s.info.alt != null ? s.info.alt : 0;
    for (const p of s.parts) {
      const g = b.pm[p.id]; if (!g) continue; const U = g.userData.moving; if (!U) continue;
      if (U.flap) U.flap.quaternion.setFromAxisAngle(U.axis, -(p.defl || 0) * 1.0);
      const E = p.d.eng;
      if (E && U.flame) {
        const maxF = E.kind === 'jet' ? E.T * (E.ab || 1) : E.F || 1, fr = clamp((p.F || 0) / maxF, 0, 1.2), on = E.kind === 'jet' ? !!p.ab && fr > 0.05 : fr > 0.02;
        U.flame.visible = on; if (on) { const ex = 1 + 1.6 * (1 - pr), fl = 0.92 + Math.random() * 0.16; U.flame.scale.set((0.55 + 0.45 * fr) * ex * fl, (0.55 + 0.45 * fr) * ex * fl, (0.35 + 0.8 * fr) * (1 + 0.9 * (1 - pr)) * fl); }
        if (on && (E.kind === 'rocket' || E.kind === 'solid') && air.rho > 0.02 && Math.random() < dt * 40 * fr) { _wkV1.set(p.ePos[0], p.ePos[1], p.ePos[2]); b.grp.localToWorld(_wkV1); emit(Part.smoke, _wkV1.x, _wkV1.y, _wkV1.z, b.vel.x * 0.1 + (Math.random() - 0.5) * 2, b.vel.y * 0.1 - 2 - Math.random() * 3, b.vel.z * 0.1 + (Math.random() - 0.5) * 2, 1.4 + Math.random(), 0.9 + 0.5 * E.r, 3.5 + 3 * E.r, 0.78, 0.76, 0.74, 0.5 * Math.min(1, air.rho * 1.5), -0.1); }
      }
      if (U.prop) { const sp = p.spool || 0; U.prop.rotation.z += (40 + 160 * sp) * dt * (sp > 0.05 ? 1 : 0.1); const blur = sp > 0.5; for (const ch of U.prop.children) ch.visible = ch === U.disc ? true : !blur; U.disc.material.opacity = blur ? clamp((sp - 0.4) * 0.7, 0, 0.35) : 0; }
      if (U.steer) { const ex = p.ext == null ? 1 : p.ext; g.visible = ex > 0.02 || p.d.gear.leg; U.steer.position.x = -(1 - ex) * (p.d.gear.Ls + p.d.gear.rw * 1.5); U.steer.rotation.x = (p.steerA || 0); if (U.wheel && !p.d.gear.leg) U.wheel.rotation.x -= (b.vel.length() * dt) / Math.max(0.1, p.d.gear.rw) * 0.0; }
    }
    /* parachute canopies */
    for (const ch of s.chutes) {
      let cn = b.canopies[ch.id];
      if ((ch.ch === 1 || ch.ch === 2) && !cn) { cn = b.canopies[ch.id] = new THREE.Group(); const dome = new THREE.Mesh(WkF.canopyGeo, WkF.canopyMat); dome.castShadow = true; cn.add(dome); cn.dome = dome; const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(16 * 3 * 2), 3)); cn.lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0xe8e2d0 })); cn.lines.frustumCulled = false; b.grp.add(cn.lines); b.grp.add(cn); }
      if (!cn) continue; const live = (ch.ch === 1 || ch.ch === 2) && s.parts.includes(ch); cn.visible = live; cn.lines.visible = live; if (!live) continue;
      const vb = _wkqrotInv([s.S[6], s.S[7], s.S[8], s.S[9]], [s.S[3], s.S[4], s.S[5]], [0, 0, 0]), vl = Math.hypot(vb[0], vb[1], vb[2]) || 1, dr = vl > 1.5 ? _wkV1.set(-vb[0] / vl, -vb[1] / vl, -vb[2] / vl) : _wkV1.set(0, 1, 0);
      cn.dir = cn.dir || new THREE.Vector3(0, 1, 0); cn.dir.lerp(dr, Math.min(1, dt * 4)).normalize(); const d = ch.d.chute.d, Ld = d * 0.95, op = ch.open || 0, rad = d / 2 * (0.25 + 0.75 * op);
      cn.position.set(ch.cPos[0], ch.cPos[1], ch.cPos[2]).addScaledVector(cn.dir, Ld * (0.35 + 0.65 * op)); cn.quaternion.setFromUnitVectors(_wkV2.set(0, 1, 0), cn.dir); cn.dome.scale.set(rad, rad * 0.62 * (0.4 + 0.6 * op), rad);
      const pa = cn.lines.geometry.attributes.position; _wkV2.set(1, 0, 0).cross(cn.dir); if (_wkV2.lengthSq() < 1e-3) _wkV2.set(0, 0, 1); _wkV2.normalize(); _wkV3.copy(cn.dir).cross(_wkV2).normalize();
      for (let i = 0; i < 16; i++) { const a = i / 16 * TAU, rx = Math.cos(a) * rad, rz = Math.sin(a) * rad; _wkV4.copy(cn.position).addScaledVector(_wkV2, rx).addScaledVector(_wkV3, rz); pa.setXYZ(i * 2, ch.cPos[0], ch.cPos[1], ch.cPos[2]); pa.setXYZ(i * 2 + 1, _wkV4.x, _wkV4.y, _wkV4.z); } pa.needsUpdate = true;
    }
  }
};

/* ---------- per frame ---------- */
WkF.frame = function (dt) {
  dt = Math.min(dt, 0.05); App.time += dt; const M = WkF.main; if (!M) return;
  const sim = M.sim; WK.use(sim.B); WkF.read(dt, sim); WkF.adopt();
  if (!WkF.paused) WkF.simulate(dt); WkF.events(); WkF.debrisStep(dt); WkE.update(dt);
  for (const m of WkF.msgs) m.age += dt; while (WkF.msgs.length && WkF.msgs[0].age > 3.2) WkF.msgs.shift(); if (WkF.hint > 0) WkF.hint -= dt; if (WkF.over) WkF.over.t += dt;
  if (!WkF.drag2 && WkF.view !== 2) { WkF.ly *= Math.exp(-dt * 1.5); WkF.lp *= Math.exp(-dt * 1.5); } WkF.drag2 = false;
  const I = sim.info, alt = I.alt == null ? 0 : I.alt, s = _wkfSun(8000, 25000, alt), spc = sim.B.sky ? _wkfSun(sim.B.sky[0], sim.B.sky[1], alt) : 1;
  const hb = sim.B === WK.HOME; WK.use(sim.B); for (const b of WkF.bodies) WkF.place(b, s); WK.use(sim.B); WkF.animate(dt);
  WkF.camera(dt, s, alt);
  const P = M.P, wx = P.x, wz = P.z; _wkV1.set(wx, P.y, wz);
  updateEnvironment(App.tod, _wkV1, App.time);
  scene.fog.density *= 1 / (1 + Math.max(0, alt - 20) / 170) * Math.pow(1 - spc, 3); L.hemi.intensity *= 1 - 0.75 * spc; MAT.sky.uniforms.uSpace.value = spc;
  { const A = Biome.atm, wk = hb ? 1 - _wkfSun(2500, 9000, alt) : 0; A.rainA *= wk; A.snowA *= wk; A.dustA *= wk; A.rain *= wk; A.snow *= wk; A.wdust *= wk; }
  const wor = hb && alt < 60000; Chunks.group.visible = wor; Far.group.visible = wor; WKS.update(M, dt, s, alt);
  if (hb && alt < 2500) Chunks.update(wx, wz, M.sim.info.speed > 70 ? 2 : 1);
  if (Snd.ok) { Snd.update(car, dt, true); WkF.sound(dt); }
  updateParticles(dt); renderFrame(Fx, App.time);
  const cv = Wk.ov, W = innerWidth, H = innerHeight, dpr = Math.min(2, window.devicePixelRatio || 1); if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const g = Wk.ovg; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H); WkF.hud(g, W, H);
};
WkF.camera = function (dt, s, alt) {
  if (WkE.on) { WkE.camera(dt); return; }
  const M = WkF.main, b = M, cam = camera, rad = WkF.radius, zm = WkF.zoom1 || 1;
  _wkV1.set(0, 1, 0); _wkV2.set(WkF.ox, -WK.R, WkF.oz); const up = _wkV3.copy(b.P).sub(_wkV2).normalize().lerp(_wkV1.set(0, 1, 0), 1 - s).normalize(); const Up = up.clone();
  const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(b.Q), cup = new THREE.Vector3(0, 1, 0).applyQuaternion(b.Q);
  let pos, look, camUp = Up; const k = WkF.snap || WkF.warp > 4 ? 1 : 1 - Math.exp(-dt * 2.4);
  if (WkF.view === 1) {
    const cp = b.sim.parts.find((p) => p.d.crew) || b.sim.top, sz = (cp.P.par && cp.P.par.sz) || 1, cap = cp.t === 'capsule', eye = cap ? [0, 0.2 * sz, 0.45 * sz] : [0, 0.4 * sz, 0.1 * sz];
    const T = cp.T, ep = _wkqrot(T.q, [T.sx * eye[0], eye[1], eye[2]], [0, 0, 0]); const g = b.grp; _wkV4.set(T.p[0] + ep[0], T.p[1] + ep[1], T.p[2] + ep[2]); g.localToWorld(_wkV4); pos = _wkV4.clone();
    const qc = new THREE.Quaternion().copy(b.Q).multiply(_wkQ1.setFromEuler(new THREE.Euler(WkF.lp * -0.6, WkF.ly * 1.0, 0, 'YXZ'))); look = pos.clone().add(new THREE.Vector3(0, 0, 1).applyQuaternion(qc)); camUp = new THREE.Vector3(0, 1, 0).applyQuaternion(qc);
    { const gg = M.pm[cp.id]; if (gg) gg.visible = false; WkF.hideCk = { pm: M.pm, id: cp.id }; }
    cam.fov = 78;
  } else {
    let fh = fwd.clone().addScaledVector(Up, -fwd.dot(Up)); const fl = fh.length(); if (fl > 0.3) { fh.divideScalar(fl); WkF.camDir.lerp(fh, k).normalize(); } else WkF.camDir.addScaledVector(Up, -WkF.camDir.dot(Up)).normalize();
    if (WkF.view === 2) { /* free: azimuth and elevation come from the drag only */ }
    const D = (rad * 3.0 + 6) * zm, el = 0.26 + 0.5 * s * (1 - _wkfSun(WkF.main.sim.B.R * 0.8, WkF.main.sim.B.R * 3.5, alt)) + WkF.lp * (WkF.view === 2 ? 1 : 0.7), cd = WkF.camDir.clone().applyAxisAngle(Up, WkF.ly + (WkF.view === 2 ? WkF.free || 0 : 0));
    const side = new THREE.Vector3().crossVectors(Up, cd).normalize(); void side;
    pos = b.P.clone().addScaledVector(cd, -Math.cos(el) * D).addScaledVector(Up, Math.sin(el) * D + rad * 0.4); look = b.P.clone().addScaledVector(fwd, rad * 0.25); camUp = Up; cam.fov = 62;
  }
  if (WkF.view !== 1 && WkF.hideCk) { const g = WkF.hideCk.pm[WkF.hideCk.id]; if (g) g.visible = true; WkF.hideCk = null; }
  /* the camera follows the craft rigidly; only its offset (angles, distance) is smoothed, so it cannot trail behind at orbital speed */
  const off = pos.clone().sub(b.P); if (WkF.snap || !WkF.coff) { WkF.coff = off; WkF.snap = false; } else { if (WkF.view === 1) WkF.coff.copy(off); else WkF.coff.lerp(off, WkF.warp > 4 ? 1 : 1 - Math.exp(-dt * 7)); }
  WkF.cpos = b.P.clone().add(WkF.coff);
  cam.position.copy(WkF.cpos); cam.up.copy(camUp); cam.lookAt(look);
  cam.near = alt > 400 ? 0.4 : 0.1; cam.far = clamp(alt * 3 + 6000, 6000, 160000); if (WkF.main.sim.B !== WK.HOME && alt < 40000 && !WkF.main.sim.B.crush) cam.far = Math.max(cam.far, 125000); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); void s;
};
WkF.sound = function (dt) {
  const M = WkF.main, sim = M.sim, t = Snd.ctx.currentTime, I = sim.info, rho = sim.air ? sim.air.rho : 1.2, dn = clamp(rho / 0.4, 0, 1), inCk = WkF.view === 1 ? 0.6 : 1;
  let rk = 0, jet = 0, prop = 0, mx = 0; for (const e of sim.eng) { const E = e.d.eng, f = e.F || 0; if (E.kind === 'rocket' || E.kind === 'solid') rk += clamp(f / E.F, 0, 1.2); else if (E.kind === 'jet') jet = Math.max(jet, e.spool || 0); else prop = Math.max(prop, e.spool || 0); mx++; }
  const body = 0.18 + 0.82 * dn;
  if (rk > 0) { Snd.rumble.g.gain.setTargetAtTime(Math.min(0.9, 0.18 + rk * 0.34) * body * inCk, t, 0.06); Snd.wind.g.gain.setTargetAtTime(Math.min(0.7, rk * 0.3) * body * inCk, t, 0.08); Snd.wind.f.frequency.setTargetAtTime(700 + rk * 600, t, 0.1); }
  else { Snd.rumble.g.gain.setTargetAtTime(0, t, 0.1); Snd.wind.g.gain.setTargetAtTime(Math.min(0.5, Math.pow(clamp((I.speed || 0) / 120, 0, 1), 1.4) * 0.5 * dn), t, 0.1); Snd.wind.f.frequency.setTargetAtTime(Math.min(9000, 300 + (I.speed || 0) * 6), t, 0.1); }
  if (jet > 0.03) { Snd.loopSet('fly1', 52 + jet * 70, (0.04 + 0.1 * jet) * dn * inCk, 'sawtooth', 240 + jet * 500); Snd.intake.g.gain.setTargetAtTime((0.04 + 0.2 * jet) * dn * inCk, t, 0.08); Snd.intake.f.frequency.setTargetAtTime(900 + jet * 2200, t, 0.1); }
  if (prop > 0.03) { const f = 22 + prop * 62; Snd.loopSet('fly2', f, (0.07 + 0.13 * prop) * dn * inCk, 'sawtooth', 380 + prop * 700); Snd.loopSet('fly3', f * 1.505, (0.03 + 0.05 * prop) * dn * inCk, 'square', 300 + prop * 500); }
};
