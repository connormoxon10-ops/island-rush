/* ================= MAIN: boot, game loop ================= */
const tick = () => new Promise((res) => { let d = false; const f = () => { if (!d) { d = true; res(); } }; requestAnimationFrame(f); setTimeout(f, 60); });
const _np2 = {}, _gs2 = {};
const Fx = { speed: 0, damage: 0, chroma: 0, expo: 1 };
const Adapt = { ema: 0.016, cool: 6 };

function makeCarMats() {
  MAT.carHead = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.95, 0.8) });
  MAT.carTail = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 0.03, 0.03) });
  MAT.paintPlayer = new THREE.MeshPhysicalMaterial({ color: lc(curColor() || PAINTS[0]), roughness: 0.45, metalness: 0.25, clearcoat: 0.9, clearcoatRoughness: 0.16, envMapIntensity: 0.45 });
}
function buildPlayer() {
  car.body = new THREE.Group(); car.ext = buildPlayerCar(CUR, save.car); car.ext.userData.wrec.player = true; car.body.add(car.ext); Dmg.attach(car.ext);
  car.body.add(buildCockpit());
  L.head = new THREE.SpotLight(0xfff0d8, 0, 170, 0.75, 0.8, 1.0); L.head.position.set(0, 0.85, 2.1); car.body.add(L.head);
  L.headT = new THREE.Object3D(); L.headT.position.set(0, -0.3, 40); car.body.add(L.headT); L.head.target = L.headT;
  scene.add(car.body);
  applyCar(save.car, false);
}
App.applyPaint = function () { Cosm.paintPlayer(); const V = cosView(cosSave().car[save.car]), p = car.ext.userData.paint; p.color.copy(lc(curColor())); if (V.fin && V.fin.val.fin !== 'gloss') applyFinish(p, V.fin.val.fin); };

function applyQuality() {
  Q = QUAL[save.set.quality] || QUAL.high;
  Chunks.radius = Q.view; Chunks.dirty = true;
  L.sun.castShadow = Q.shadow > 0;
  if (Q.shadow > 0 && L.sun.shadow.mapSize.x !== Q.shadow) { L.sun.shadow.mapSize.set(Q.shadow, Q.shadow); if (L.sun.shadow.map) { L.sun.shadow.map.dispose(); L.sun.shadow.map = null; } }
  Post.dyn = 1; Adapt.cool = 5; resizeRenderer(); setupMirrorRT();
}
function devReset() {
  Dev.god = Dev.nit = Dev.hud = Dev.hbox = Dev.free = false; Dev.power = Dev.grip = Dev.ts = 1; refreshTune();
}
App.onSetting = function (k) {
  if (k === 'quality') applyQuality();
  else if (k === 'vol') { if (Snd.ok) Snd.master.gain.value = save.set.vol; }
  else if (k === 'hud') UI.setMode(App.mode);
  else if (k === 'dev') { if (!save.set.dev) devReset(); else UI.toast('Developer mode on · Dev tab added to the pause menu', 'info'); UI.tabTo(App.tab); }
};

/* put the car somewhere, at rest */
function spawnAt(x, z, yaw) {
  if (Fly.on) Fly.end();
  if (Boat.on) Boat.end();
  if (Foot.on) Foot.board(true);
  const c = car; groundAt(x, z, _gs2);
  c.x = x; c.z = z; c.yaw = yaw; c.vx = c.vz = c.w = c.speed = 0; c.y = _gs2.h; c.vy = c.vyPrev = 0; c.air = false; c.airT = 0; c.pitch = c.roll = 0; c.sY = c.sV = 0;
  c.steer = c.steerIn = 0; c.thr = c.brk = 0; c.gear = 1; c.rpm = 900; c.shift = 0; c.rev = false; c.axL = c.ayL = 0; c.wrecked = 0; c.waterT = 0; c.crashFlag = 0;
  c.safe.x = x; c.safe.z = z; c.safe.yaw = yaw; c.safeT = 1;
  Cam.lookYaw = Cam.lookPitch = 0; Cam.chaseYaw = yaw;
}
App.setCar = function (id) {
  if (Rally.on) { UI.toast('Leave the stage first', 'bad'); return false; }
  if (Drag.on) { UI.toast('Leave the strip first', 'bad'); return false; }
  if (Derby.on) { UI.toast('Leave the bowl first', 'bad'); return false; }
  if (!CAR_BY_ID[id] || !save.owned[id]) return false;
  if (save.jack && id !== save.car) { UI.toast('Stash the stolen ' + Jack.name(save.jack.id) + ' in your garage first', 'bad'); return false; }
  if (Mi) { UI.toast('Finish or abort the run before swapping cars', 'bad'); return false; }
  applyCar(id, true); car.nitro = Math.min(car.nitro, tune.nitroMax); writeSave(); return true;
};
function loadAround(x, z, n) { Chunks.update(x, z, 0); for (let i = 0; i < n && Chunks.pending.length; i++) Chunks.update(x, z, 1); }
App.respawn = function (toRoad) {
  if (Rally.on) { Rally.reset(); return; }
  if (Drag.on) { Drag.again(); return; }
  if (Derby.on) return;   /* no resets in a derby: you are where you got knocked */
  const c = car;
  if (toRoad || !c.safe.x) {
    if (findNearestRoadPoint(c.x, c.z, _np2)) {
      let yaw = Math.atan2(_np2.tx, _np2.tz); if (Math.abs(angDiff(yaw, c.yaw)) > Math.PI / 2) yaw += Math.PI;
      loadAround(_np2.x, _np2.z, 12); spawnAt(_np2.x, _np2.z, yaw); UI.toast('Back on the road', 'info');
    }
  } else { loadAround(c.safe.x, c.safe.z, 12); spawnAt(c.safe.x, c.safe.z, c.safe.yaw); }
};
App.warp = function (m) {
  let yaw = 0;
  if (m.road) { routePos(m, 28, _np2); yaw = Math.atan2(_np2.tx, _np2.tz); }
  else if (m.cps && m.cps[0]) yaw = Math.atan2(m.cps[0].x - m.x, m.cps[0].z - m.z);
  const x = m.x - Math.sin(yaw) * 13, z = m.z - Math.cos(yaw) * 13;
  loadAround(x, z, 14); spawnAt(x, z, yaw); UI.toast('Warped to ' + m.title.replace(/^[^:]+: /, ''), 'info');
};

function placeBody() {
  const c = car, b = car.body; b.position.set(c.x, c.y, c.z); b.rotation.set(-c.pitch, c.yaw, c.roll, 'YXZ'); b.updateMatrixWorld(true);
}
const _tr = new THREE.Vector3(), _td = new THREE.Vector3();
function titleCamera(dt) {
  const c = car, a = App.time * 0.1 + 0.9; placeBody(); car.ext.visible = true; Cockpit.group.visible = false;
  const R = 8.2; camera.position.set(c.x + Math.sin(a) * R, c.y + 1.7 + Math.sin(App.time * 0.27) * 0.35, c.z + Math.cos(a) * R);
  _td.set(c.x - camera.position.x, 0, c.z - camera.position.z).normalize(); _tr.set(_td.z, 0, -_td.x);
  camera.lookAt(c.x + _tr.x * 2.1, c.y + 0.9, c.z + _tr.z * 2.1);
  if (Math.abs(camera.fov - 52) > 0.1) { camera.fov = 52; camera.updateProjectionMatrix(); }
  Cam.fov = 52;
}

function step(dt) {
  const c = car;
  syncPl();
  if (Fly.on) { Foot.parkCar(c); Fly.step(dt); syncPl(); } else if (Boat.on) { Foot.parkCar(c); Boat.step(dt); syncPl(); } else if (Foot.on) { Foot.parkCar(c); Foot.step(dt); syncPl(); } else readControls(dt);
  const n = Math.min(10, Math.ceil(dt / (1 / 120))), h = dt / n;
  c.crashFlag = 0; c.landImpact = 0; Police.ram = false;
  if (Bots.on) Bots.update(dt, Race.refProg());
  for (let i = 0; i < n; i++) { stepCar(h); if (Rally.on) { Rally.sub(c, h); continue; } if (Drag.on) { Drag.sub(c, h); continue; } if (Derby.on) { Derby.sub(c, h); continue; } if (Bots.on) Bots.step(h); Crash.run(c); collideDyn(c); }
  c.kmh = Math.abs(c.speed) * 3.6;
  /* impacts */
  const v = c.crashFlag;
  if (v > 2.2 && App.time - c.lastImpact > 0.12 && c.wrecked <= 0) {
    c.lastImpact = App.time; const hpB = c.health;
    c.health -= Math.pow(v - 2, 1.35) * 1.3 * tune.dmg * (Police.ram ? 0.55 : 1) * (Race.on ? 0.4 : Rally.on ? 0.3 : 1); Dmg.hit(c, v, hpB - c.health);
    Cam.shake = Math.max(Cam.shake, Math.min(2.5, v * 0.12)); App.dmg = Math.min(1, App.dmg + v / 24);
    Snd.crash(v); sparks(c.cx, c.y + 0.6, c.cz, Math.min(34, Math.round(v * 2.2)), 2 + v * 0.45); if (!devOn('god')) onMissionCrash(v);
  } else if (v > 0.6 && Math.abs(c.speed) > 6 && c.wrecked <= 0) Dmg.scrape(c);
  if (c.landImpact > 0) {
    const li = c.landImpact; Cam.shake = Math.max(Cam.shake, Math.min(2, li * 0.12)); Snd.crash(li * 0.6); sparks(c.x, c.y + 0.2, c.z, 10, 5);
    if (li > 11) { c.health -= (li - 11) * 3 * tune.dmg * (Rally.on ? 0.12 : 1); App.dmg = Math.min(1, App.dmg + (Rally.on ? 0.1 : 0.3)); }
  }
  if (devOn('god')) c.health = 100; else if ((Race.on || Rally.on || Drag.on) && c.health < 12) c.health = 12;   /* no tow trucks mid-race */
  else if (Derby.on && c.health < 0.5) c.health = 0.5;   /* the derby decides when you are out */
  /* wreck */
  if (c.health <= 0 && c.wrecked <= 0) {
    c.health = 0; c.wrecked = 3; Snd.fail(); Dmg.explode(c);
    if (Wanted.stars > 0 && Police.phase !== 'busted') { Police.arrest('Wrecked while wanted', WANT.fine[Wanted.stars] || 300); c.wrecked = Bust.on ? 900 : 3.4; }
    else if (Tow.begin()) { c.wrecked = 120; UI.banner('DESTROYED', 'Tow truck on the way · R to skip'); } else UI.banner('WRECKED', 'Calling a tow truck');
    if (Mi && Mi.phase !== 'done') endMission(false, 'WRECKED', ['Your car was destroyed.'], 0);
  }
  if (c.wrecked > 0) {
    if (Tow.on) { if (Tow.update(dt)) Tow.finish(); }
    else { c.wrecked -= dt; if (c.wrecked <= 0) Tow.mechanic(); }
  } else if (Tow.on) Tow.abort();
  /* water */
  if (c.surf.water) {
    c.waterT = (c.waterT || 0) + dt; c.vx *= 1 - 1.8 * dt; c.vz *= 1 - 1.8 * dt;
    if (c.waterT > 0.4 && !c.splashed) { c.splashed = true; Snd.splash(); Cam.shake = 1.2; App.dmg = Math.min(1, App.dmg + 0.2); }
    if (c.waterT > 2.2) { c.splashed = false; c.waterT = 0; App.respawn(false); UI.toast('Fished out of the water', 'bad'); }
  } else { c.waterT = 0; c.splashed = false; }
  /* safe spot memory */
  c.safeT -= dt; if (c.safeT <= 0 && c.surf.road && !c.air && !c.surf.water && Math.abs(c.speed) > 2) { c.safe.x = c.x; c.safe.z = c.z; c.safe.yaw = c.yaw; c.safeT = 1; }
  /* nitro */
  if (devOn('nit')) c.nitro = tune.nitroMax; else if (c.nitroUse) c.nitro = Math.max(0, c.nitro - (CARP.nitDrain || 24) * dt); else c.nitro = Math.min(tune.nitroMax, c.nitro + (c.drifting ? 14 : 3.2) * dt);
  if (Rally.on) { Rally.update(dt); carFx(dt); return; }
  if (Drag.on) { Drag.update(dt); carFx(dt); return; }
  if (Derby.on) { Derby.update(dt); carFx(dt); return; }   /* and the derby bowl */   /* so is the drag strip */   /* the stage is its own little world: no traffic, people, police or missions */
  /* world */
  if (!(Fly.on && Fly.agl > 25)) { updateTraffic(dt); updatePeds(dt); } Police.update(dt); if (Foot.on) Foot.scan(); Fly.scan(); Boat.scan(dt); Talk.tick(dt); Rel.tick(dt); Home.tick(dt); Shop.tick(); Wk.tick(); Ven.tick(); Race.tick(); Race.update(dt); Jack.tick(dt); Fare.tick(dt); Court.tick(dt); updateMission(dt); VM.update(dt); updateGPS(dt);
  if (Waypoint.on && !Mi && Math.hypot(Waypoint.x - Pl.x, Waypoint.z - Pl.z) < 28) { Waypoint.on = false; GPS.t = 0; UI.toast('Destination reached', 'good'); }
  carFx(dt);
}

function adapt(dt) {
  if (window.__noAdapt || App.mode !== 'play') return;
  Adapt.ema += (dt - Adapt.ema) * 0.04; Adapt.cool -= dt; if (Adapt.cool > 0) return;
  if (Adapt.ema > 0.027 && Post.dyn > 0.55) { Post.dyn = Math.max(0.55, Post.dyn - 0.12); resizeRenderer(); Adapt.cool = 2.5; }
  else if (Adapt.ema < 0.0175 && Post.dyn < 1) { Post.dyn = Math.min(1, Post.dyn + 0.06); resizeRenderer(); Adapt.cool = 4; }
}

let last = performance.now(), gaugeT = 0, frameN = 0;
function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000; last = now; if (!(dt > 0)) return; dt = Math.min(dt, 0.1);
  if (App.mode === 'load') return;
  /* every mode advances the renderer's frame counter: skinned people only re-upload their skeleton when it changes, so a cutscene that skipped this would freeze everyone in it */
  renderer.info.reset();
  if (App.mode === 'court' || App.mode === 'bust' || App.mode === 'shop' || App.mode === 'venue') huCutTick(dt, App.time + now / 1000);
  if (App.mode === 'court') { Court.frame(dt); return; }
  if (App.mode === 'bust') { Bust.frame(dt); return; }
  if (App.mode === 'shop') { Shop.frame(dt); return; }
  if (App.mode === 'venue') { Ven.frame(dt); return; }
  if (App.mode === 'mech') { Mech.frame(dt); return; }
  if (App.mode === 'wk') { Wk.frame(dt); return; }
  syncPl();
  frameN++; const c = car; Air.tick(dt); Dock.tick(dt); Track.tick(dt);
  adapt(dt);
  if (App.mode === 'pause' || App.mode === 'vm' || App.mode === 'rlobby') {
    if (frameN % 10 !== 0) return;
    HB.update(); updateEnvironment(App.tod, c, App.time); renderFrame(Fx, App.time); return;
  }
  App.time += dt;
  if (save.set.cycle) App.tod = (App.tod + dt * 0.02 * save.set.cycle) % 24;
  App.dmg = Math.max(0, App.dmg - dt * 1.1);
  if (App.mode === 'play') {
    step(dt * (save.set.dev ? Dev.ts : 1)); Dmg.update(dt); if (Fly.on) Fly.camera(dt); else if (Boat.on) Boat.camera(dt); else updateCamera(dt, Foot.on ? Foot.fovAdd : 0); if (Foot.on) Foot.camera(dt); if (GAR.edit) Home.camera(dt); Tow.camera(dt); Bust.camera(dt);
    if (!Cam.dragging) { Cam.lookYaw *= Math.exp(-dt * 4); Cam.lookPitch *= Math.exp(-dt * 4); }
  } else { updateTraffic(dt); updatePeds(dt); titleCamera(dt); }
  updateMarkerVis(dt, App.time); Shop.visual(dt, App.time); Wk.visual(dt, App.time); Ven.visual(dt, App.time); Col.update(dt, App.time); Bots.visual(dt); updateParticles(dt); if (Rally.on) Rally.visual(dt); if (Drag.on) Drag.visual(dt); if (Derby.on) Derby.visual(dt); Home.visual(dt); Fly.visual(dt); Boat.visual(dt); VM.visual(dt);
  c.lights = env.lampOn > 0.4;
  updateEnvironment(App.tod, Fly.on ? Fly.focus : Boat.on ? Boat.focus : c, App.time); Fly.fog(); Env.update(dt); updateWheels(dt);
  const k = 0.45 + 0.85 * env.lampOn;   /* lens glow: warm and bright, but kept under white so it doesn't bloom into a blob */
  MAT.carHead.color.setRGB(0.62 * k, 0.57 * k, 0.48 * k); MAT.carTail.color.setRGB(0.5 + 1.6 * env.lampOn, 0.025, 0.025); Cosm.tick();
  L.head.intensity += ((c.lights && App.mode === 'play' && !Foot.on && !Fly.on && !Boat.on ? (GAR.inside ? 0.25 : GAR.ok && GAR.dist < 80 ? 7 - 5.2 * Math.min(1, (80 - GAR.dist) / 34) : 7) : 0) - L.head.intensity) * Math.min(1, dt * 6);
  if (Rally.on || Drag.on || Derby.on) { /* no streaming on the stage, the strip or in the bowl */ } else if (devOn('free')) Chunks.update(Dev.fx, Dev.fz, 1); else Chunks.update(Pl.x, Pl.z, Fly.on || (Boat.on && Boat.p && Boat.p.speed > 14) ? 2 : 1);
  HB.update();
  gaugeT -= dt; if (gaugeT <= 0 && Cam.view === 0 && App.mode === 'play' && !Foot.on && !Fly.on && !Boat.on) { gaugeT = 0.05; drawGauges(c.kmh || 0, c.rpm, c.gear, c.nitro, c.health, save.set.units === 'mph', c.lights, c.rev && Math.abs(c.speed) > 0.3); }
  /* post fx */
  const sp = Math.abs(c.speed);
  Fx.speed = App.mode === 'play' ? clamp((sp - 26) / 64, 0, 1) * 0.85 + (c.nitroUse ? 0.3 : 0) : 0;
  Fx.chroma = 0.0012 + Fx.speed * 0.004 + App.dmg * 0.01;
  const dmgFx = App.dmg + (c.health < 25 && App.mode === 'play' ? 0.12 * (0.5 + 0.5 * Math.sin(App.time * 6)) : 0);
  Fx.damage = hasPost ? dmgFx : 0; E.flash.style.opacity = hasPost ? '0' : String(Math.min(1, dmgFx));
  if (App.mode === 'play') { Snd.update(c, dt, Foot.on || Fly.on || Boat.on); if (Fly.on) Fly.sound(dt); else if (Boat.on) Boat.sound(dt); } else Snd.update(c, dt, true);
  renderMirror(); renderFrame(Fx, App.time);
  if (App.mode === 'play' || App.mode === 'title') UI.update(dt);
  UI.devHud(dt);
}

App.start = function () {
  if (App.mode !== 'title') return;
  Police.reset(); Snd.init(); Cam.view = save.set.cam != null ? save.set.cam : (window.innerWidth / window.innerHeight < 1 ? 2 : 0); Cam.chaseYaw = car.yaw; Cam.ch = car.y + 2; Cam.fov = save.set.fov; UI.setMode('play');
  setTimeout(() => UI.toast('Follow a colored beam to start a run', 'info'), 600);
  setTimeout(() => UI.toast(TouchIn.on ? 'Drag to look · GO starts a run' : 'M map · C camera · Shift nitro', 'info'), 3200);
};

async function boot() {
  try {
    let first = true; try { first = !localStorage.getItem(SAVE_KEY); } catch (e) { first = true; }
    loadSave(); CUR = CAR_BY_ID[save.car] || CARS[0]; refreshTune(); bindUI(); bindInput(); Shop.initUI(); VM.initUI(); Ven.initUI(); UI.resize();
    if (first) { const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches; if (coarse) save.set.quality = 'low'; else if (window.innerWidth < 760 || (navigator.hardwareConcurrency || 8) <= 4) save.set.quality = 'med'; }
    UI.progress(0.03, 'Shaping the island'); await tick();
    genWorld(); Home.setup(); Shop.setup(); Ven.setup(); genMissions(); Col.setup(); Race.initUI(); Mech.init();
    UI.progress(0.15, 'Starting graphics'); await tick();
    Q = QUAL[save.set.quality] || QUAL.high;
    initRenderer(E.gl); initMaterials(); makeCarMats(); initTreeSources(); initSky(); initLights(); initEnv(); initCarMats(); Env.reg(MAT.paintPlayer); Env.refresh(); initMirror(); initParticles();
    scene.add(Chunks.group); buildFarWorld(); scene.add(Far.group); initMarkers(); Shop.initMarkers(); Ven.initMarkers(); Air.build(); Wk.initMarkers(); Dock.build(); Track.build(); Fly.init(); Boat.init(); VM.init(); buildPlayer(); Home.build(); Home.apply(); Home.refresh();
    applyQuality(); window.addEventListener('resize', () => { resizeRenderer(); });
    UI.progress(0.25, 'Finding the start line'); await tick();
    const T = towns[0]; findNearestRoadPoint(T.cx, T.cz, _np2);
    const x0 = _np2.x, z0 = _np2.z, yaw0 = Math.atan2(_np2.tx, _np2.tz);
    spawnAt(x0, z0, yaw0); car.health = 100; car.nitro = tune.nitroMax;
    Chunks.radius = Q.view; Chunks.dirty = true; Chunks.update(x0, z0, 0); const total = Math.max(1, Chunks.pending.length);
    while (Chunks.pending.length) { Chunks.update(x0, z0, 3); UI.progress(0.28 + 0.5 * (1 - Chunks.pending.length / total), 'Building the world'); await tick(); }
    WorldMap.init(); let done = false;
    while (!done) { done = WorldMap.slice(10); UI.progress(0.78 + 0.18 * (WorldMap.row / WorldMap.S), 'Drawing the map'); await tick(); }
    spawnAt(x0, z0, yaw0); GPS.t = 0;
    for (let i = 0; i < 10; i++) { spawnTrafficOne(); }
    initPeds(); scene.add(Peds.group); for (let i = 0; i < Math.round((Q.ped || 50) * 0.7); i++) pedSpawn(true);
    try { if (document.fonts && document.fonts.load) await Promise.race([document.fonts.load('600 16px Rajdhani'), new Promise((r) => setTimeout(r, 800))]); } catch (e) { /* ignore */ }
    UI.progress(1, 'Ready'); await tick();
    E.tagline.textContent = 'An open island, seven towns and ' + missions.length + ' runs to chase. Pick a beam, or just drive.';
    UI.setMode('title'); requestAnimationFrame(() => { last = performance.now(); requestAnimationFrame(frame); });
    window.__ready = true;
  } catch (err) {
    console.error(err); E.loadmsg.textContent = 'Could not start the 3D view: ' + (err && err.message ? err.message : err); window.__bootError = String(err && err.stack || err);
  }
}
window.__game = { get scene() { return scene; }, Derby, DD, applyCar, buildCarModel, CAR_BY_ID, Env, get renderer() { return renderer; }, writePeds, Cam, Human, HU, Peds, Foot, Setup, TU, TU_PRESETS, CARS, CARP, tune, Drag, DG, DG_TIERS, Rally, RR, RY, RY_STAGES, RYG, RW, RY_FEATS, WK, Wk, WkF, WKSim, WKG, WKS, WkE, qfromAxes3, Dmg, Mech, RACE_DIFF, Wreck, Jack, JACK_MODELS, Race, Bots, Crash, newCarState, Track, TRK, Col, COLK, Ven, VDEF, CDEF, venSave, VM, VMD, VMK, towns, roads, Dock, MARINA, Boat, Boats, BSPEC, HB, solidHit, TREE, Air, AIR, Fly, Planes, PSPEC, Rel, REL_ROSTER, Shop, COS, Cosm, Biome, Weather, REG, Bust, CR, Fight, Police, Wanted, WANT, footBlockedAt, findNearestRoadPoint, Tow, GAR, Home, GP, Foot, Talk, Fare, Pl, pedHit, getMoney: () => save.money, get save() { return save; }, getLaw: () => save.law, Court, CR, Peds, pedSpawn, Dyn, abortMission, stepSim: step, Env, Wheels, buildCarModel, carSpec, TRAFFIC_DEFS, secAt, disposeCar, THREE_: THREE, TREE, GB, addTree, addGrass, terrainHeight, fbm, noise2, sstep, Dev, devReset, CARS, CAR_BY_ID, applyCar, stepCar, CARP, roads, loadAround, carThumb, car, App, UI, Chunks, Post, Cam, Keys, missions, towns, spawnAt, get Mi() { return Mi; }, startMission, applyQuality, get renderer() { return renderer; }, get scene() { return scene; }, get camera() { return camera; }, Snd, WorldMap, MView, Mirror, MAT, Cockpit, Q: () => Q, hasPost: () => hasPost, key(code, down) { Keys[code] = down; if (down) onKey(code); }, tune };
boot();
