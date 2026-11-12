/* ================= UI: HUD, MENUS, INPUT ================= */
const App = { mode: 'load', tod: 17.1, time: 0, tab: 'missions', dmg: 0, resultT: 0, wrongT: 0, onSetting: null, warp: null, respawn: null, start: null };
const E = new Proxy({}, { get: (t, k) => t[k] || (t[k] = document.getElementById(k)) });
const UI = {};
const money = (n) => '$' + Math.round(n).toLocaleString('en-US');
const toUnit = (k) => (save.set.units === 'mph' ? k * 0.621371 : k);
const unitName = () => (save.set.units === 'mph' ? 'MPH' : 'KM/H');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function tx(id, v) { const o = E[id]; if (o._v !== v) { o._v = v; o.textContent = v; } }
const stars = (n) => '★'.repeat(n) + '<s>' + '★'.repeat(3 - n) + '</s>';
const todStr = (t) => { const h = Math.floor(t) % 24, m = Math.floor((t % 1) * 60); return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'); };

/* ---------- transient messages ---------- */
UI.toast = function (t, kind) {
  const d = document.createElement('div'); d.className = 'toast cham ' + (kind || 'info'); d.textContent = t; E.toasts.appendChild(d);
  while (E.toasts.children.length > 3) E.toasts.removeChild(E.toasts.firstChild);
  setTimeout(() => { if (d.parentNode) d.parentNode.removeChild(d); }, 2400);
};
UI.big = function (t) { const b = E.big; b.textContent = t; b.classList.remove('go'); void b.offsetWidth; b.classList.add('go'); };
UI.fade = function (on, k, t) { const f = E.fade; if (!f) return; E.fk.textContent = k || ''; E.ft.textContent = t || ''; f.classList.toggle('on', !!on); f.classList.toggle('txt', !!(on && k)); };
UI.banner = function (k, t) { E.bk.textContent = k; E.bt.textContent = t; const b = E.banner; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); };
UI.result = function (ok, title, lines, reward, st) {
  const r = E.result;
  r.innerHTML = '<h2 class="' + (ok ? 'ok' : 'no') + '">' + esc(title) + '</h2>' + (ok ? '<div class="stars">' + stars(st) + '</div>' : '') + lines.map((l) => '<p>' + esc(l) + '</p>').join('') +
    (ok ? '<div class="rw">+' + money(reward) + '</div>' : '<div class="rw"></div>') + '<button class="btn sm" id="resOk" type="button">Continue</button>';
  r.hidden = false; App.resultT = 12; const ok2 = document.getElementById('resOk'); if (ok2) ok2.onclick = () => UI.hideResult();
};
UI.hideResult = function () { E.result.hidden = true; App.resultT = 0; };

/* ---------- HUD ---------- */
let _mpT = 0, _miniT = 0, _tgtH = 0, _tgtHT = 0;
function devTeleport(x, z, label) { car.x = x; car.z = z; App.respawn(true); UI.toast('Teleported · ' + label, 'info'); }
UI.devFree = function (on) {
  if (on && Foot.on) Foot.board(true);
  if (on && Fly.on) Fly.end();
  if (on && Boat.on) Boat.end();
  if (on && !Dev.free) {
    const d = new THREE.Vector3(); camera.getWorldDirection(d);
    Dev.fx = camera.position.x; Dev.fy = camera.position.y; Dev.fz = camera.position.z; Dev.fyaw = Math.atan2(-d.x, -d.z); Dev.fpitch = Math.asin(clamp(d.y, -1, 1)) * 0.999;
    UI.toast('Free camera · WASD, Space / Z, Shift fast', 'info');
  }
  Dev.free = !!on;
};
UI.devAct = function (id) {
  const close = () => { if (App.mode === 'pause') UI.closeMenu(); };
  if (id === 'cash1') save.money += 1000; else if (id === 'cash10') save.money += 10000; else if (id === 'cash100') save.money += 100000;
  else if (id === 'unlock') { for (const d of CARS) if (!d.stolen) save.owned[d.id] = true; UI.toast('All cars unlocked', 'good'); }
  else if (id === 'maxup') { for (const k in save.up) save.up[k] = 5; refreshTune(); car.nitro = tune.nitroMax; }
  else if (id === 'repair') car.health = 100;
  else if (id === 'relmax') { Rel.devMax(); UI.toast('All locals are best friends', 'good'); }
  else if (id === 'relreset') { Rel.reset(); UI.toast('Friendships reset', 'info'); }
  else if (id.startsWith('wk:')) { const [, w, t] = id.split(':'); close(); Wk.devFly(t, w); return; }
  else if (id === 'tpwp') { if (Waypoint.on) { close(); devTeleport(Waypoint.x, Waypoint.z, 'waypoint'); } }
  else if (id === 'tpair') { if (Air.s) { close(); devTeleport(Air.s.cx - 150, Air.s.cz + 60, Air.name); } }
  else if (id === 'tpdock') { if (Dock.s) { close(); Dock.toWorld(0, -22, _bsp); devTeleport(_bsp.x, _bsp.z, Dock.name); } }
  else if (id === 'unboats') { for (const k of BIDS) save.boat.own[k] = true; Boat.tags(); UI.toast('All boats unlocked', 'good'); }
  else if (id === 'unplanes') { for (const k in PSPEC) save.air.own[k] = true; Fly.tags(); UI.toast('All planes unlocked', 'good'); }
  else if (id.startsWith('tp')) { const t = towns[+id.slice(2)]; if (t) { close(); devTeleport(t.cx, t.cz, t.name); } }
  else if (id.startsWith('tod')) App.tod = +id.slice(3);
  else if (id === 'lawsuit') { close(); if (App.mode === 'play') { Court.test(); } }
  else if (id === 'tow') { close(); if (App.mode === 'play' && !Foot.on && car.wrecked <= 0) car.health = 0; }
  else if (id === 'cops') { close(); if (App.mode === 'play') Police.test(); }
  else if (/^wl[0-5]$/.test(id)) { if (App.mode === 'play') Wanted.set(+id[2]); }
  else if (id === 'bustme') { if (App.mode === 'play') { Wanted.crime('Hit and run', 2); Wanted.crime('Assault', 2); Police.arrest('Dev bust', 400); } }
  else if (id === 'traf') { for (let i = 0; i < 10; i++) spawnTrafficOne(); UI.toast('Spawned traffic', 'info'); }
  else if (id === 'done') { if (VM.m && !Mi) { close(); VM.dev(); } else if (Mi && Mi.phase !== 'done') { close(); Mi.stars = 3; endMission(true, 'DEV · RUN COMPLETE', ['Completed from the dev tab'], Mi.def.reward); } }
  else if (id === 'all3') { for (const m of missions) { const r = save.done[m.id] || { stars: 0, best: null }; r.stars = 3; save.done[m.id] = r; } UI.toast('All missions set to 3 stars', 'good'); }
  else if (id === 'clrdone') { save.done = {}; UI.toast('Mission progress reset', 'info'); }
  else if (id === 'drop') { if (Dev.free) { const d = new THREE.Vector3(); camera.getWorldDirection(d); close(); loadAround(Dev.fx, Dev.fz, 12); spawnAt(Dev.fx, Dev.fz, Math.atan2(d.x, d.z)); Dev.free = false; UI.toast('Car dropped at camera', 'info'); } }
  else if (id === 'off') { save.set.dev = false; devReset(); UI.toast('Developer mode off', 'info'); writeSave(); UI.tabTo('settings'); return; }
  writeSave(); UI.renderPane();
};
UI.devHud = function (dt) {
  const el = E.dbg; if (!el) return;
  if (!(save.set.dev && Dev.hud && App.mode === 'play')) { if (!el.hidden) el.hidden = true; return; }
  el.hidden = false; Dev.ema += (dt - Dev.ema) * 0.08; Dev.t -= dt; if (Dev.t > 0) return; Dev.t = 0.2;
  const c = car, sf = c.surf, inf = renderer.info.render, flags = (Dev.god ? '  GOD' : '') + (Dev.nit ? '  INF-NOS' : '') + (Dev.free ? '  FREECAM' : '') + (Dev.hbox ? '  HITBOXES' : '');
  el.textContent = 'DEV  ' + Math.round(1 / Dev.ema) + ' fps  ' + (Dev.ema * 1000).toFixed(1) + ' ms  ' + save.set.quality + (hasPost ? ' +post' : ' no-post') + '  ' + renderer.domElement.width + 'x' + renderer.domElement.height + '\n' +
    'pos   ' + c.x.toFixed(1) + '  ' + c.y.toFixed(1) + '  ' + c.z.toFixed(1) + '   yaw ' + Math.round(((c.yaw * 180 / Math.PI) % 360 + 360) % 360) + '°\n' +
    'car   ' + CUR.name + '  ' + Math.round(c.kmh || 0) + ' km/h  gear ' + c.gear + '  ' + Math.round(c.rpm) + ' rpm\n' +
    'grip  slip ' + c.slip.toFixed(2) + '  steer ' + c.steer.toFixed(2) + '  ' + (sf.water ? 'water' : sf.road ? 'road' : 'ground') + ' mu ' + sf.mu.toFixed(2) + (c.air ? '  AIR' : '') + '\n' +
    'tune  Tmax ' + Math.round(tune.Tmax) + '  mu ' + tune.mu.toFixed(2) + '  nos ' + Math.round(c.nitro) + '  hp ' + Math.round(c.health) + '\n' +
    'world chunks ' + Chunks.map.size + ' (+' + Chunks.pending.length + ')  traffic ' + Dyn.list.length + '  peds ' + Peds.list.length + '  draws ' + inf.calls + '  tris ' + Math.round(inf.triangles / 1000) + 'k\n' +
    'time  ' + todStr(App.tod) + (Dev.ts !== 1 ? '  x' + Dev.ts.toFixed(2) : '') + (Mi ? '  run ' + Mi.def.id + ' ' + Mi.phase : '') + flags;
};
const VIEW_NAMES = ['Cockpit', 'Bumper', 'Third person'], VIEW_SHORT = ['Cockpit', 'Bumper', '3rd person'];
UI.setView = function (v, announce) {
  v = clamp(Math.round(v) || 0, 0, 2);
  if (v === 2 && Cam.view !== 2) { Cam.chaseYaw = car.yaw; Cam.lookYaw = Cam.lookPitch = 0; Cam.ch = car.y + 2; }
  Cam.view = v; save.set.cam = v; writeSave();
  tx('btnCam', VIEW_SHORT[v]);
  if (announce !== false) UI.toast(VIEW_NAMES[v] + ' view', 'info');
};
UI.cycleView = function () { if (Fly.on) { Fly.cycle(); return; } if (Boat.on) { Boat.cycle(); return; } if (Foot.on) { Foot.tp = !Foot.tp; UI.toast(Foot.tp ? 'Third person' : 'First person', 'info'); return; } const order = [0, 2, 1]; UI.setView(order[(order.indexOf(Cam.view) + 1) % 3], true); };
UI.footMode = function (on) {
  document.body.classList.toggle('foot', on);
  const t = (id, x) => { E[id].textContent = x; };
  t('tGas', on ? 'FWD' : 'GAS'); t('tBrk', on ? 'BACK' : 'BRAKE'); t('tNit', on ? 'RUN' : 'NOS'); t('tHand', on ? 'JUMP' : 'DRIFT'); t('tAct', on ? 'TALK' : 'GO'); t('tFoot', on ? 'CAR' : 'EXIT');
};
UI.flyMode = function (on) {
  document.body.classList.toggle('fly', on); E.fhud.hidden = !on; if (!on) { E.fwn.hidden = true; E.fwn._w = ''; return; }
  const t = (id, x) => { E[id].textContent = x; };
  t('tGas', 'PULL'); t('tBrk', 'PUSH'); t('tNit', 'THR +'); t('tHand', 'THR −'); t('tFoot', 'EXIT'); Fly.hudT = 0; E.falt.firstElementChild.textContent = 'ALT'; E.fthr.firstElementChild.textContent = 'THR';
};
UI.boatMode = function (on) {
  document.body.classList.toggle('boat', on); E.fhud.hidden = !on; if (!on) { E.fwn.hidden = true; E.fwn._w = ''; Boat.warn = ''; return; }
  const t = (id, x) => { E[id].textContent = x; };
  t('tGas', 'GAS'); t('tBrk', 'BRAKE'); t('tNit', 'BOOST'); t('tHand', 'ANCHOR'); t('tFoot', 'EXIT'); Boat.hudT = 0; E.falt.firstElementChild.textContent = 'DEPTH'; E.fthr.firstElementChild.textContent = 'THR';
};
UI.footPrompt = function () {
  const pr = E.prompt, p = Foot.target, parts = [];
  if (Jack.busy) { pr._h = ''; pr.hidden = true; return; }
  if (Jack.tgt && !Talk.on) parts.push(TouchIn.on ? '<em>JACK</em> the driver · wanted +2' : '<em>F</em> Pull the driver out and take the car · wanted +2');
  else if (Jack.hint && !Talk.on) parts.push(esc(Jack.hint));
  if (Jack.canStash() && !Talk.on) parts.push(TouchIn.on ? '<em>STASH</em> the stolen ' + esc(CUR.name) : '<em>E</em> Stash the stolen ' + esc(CUR.name) + ' · keep, sell or scrap');
  if (p && !Talk.on) { const P = Talk.persona(p); const hr = p.reg ? ' <span class="hrt">' + Rel.hearts(Rel.lvOf(p.reg.id)) + '</span>' : ''; parts.push(TouchIn.on ? '<em>TALK</em> to ' + esc(P.name) + ' · ' + esc(P.job) + hr : '<em>E</em> Talk to ' + esc(P.name) + ' · ' + esc(P.job) + hr); }
  if (Wk.near && !p && !Talk.on && !Shop.near) parts.push(TouchIn.on ? '<em>BUILD</em> Workshop' : '<em>E</em> Workshop \u00b7 build and fly planes and rockets');
  if (Shop.near && !p && !Talk.on) parts.push(TouchIn.on ? '<em>SHOP</em> Customs · ' + esc(Shop.near.R.name) : '<em>E</em> Customs · ' + esc(Shop.near.R.name));
  if (Ven.near && !p && !Talk.on) parts.push(TouchIn.on ? '<em>ENTER</em> ' + esc(Ven.near.D.name) : '<em>E</em> ' + esc(Ven.near.D.name) + ' · ' + esc(Ven.near.D.sub));
  if (VM.near && !p && !Talk.on) parts.push(TouchIn.on ? '<em>JOBS</em> ' + esc(VM.near.title) : '<em>E</em> ' + esc(VM.near.title) + ' · ' + esc(VM.near.sub));
  if (VM.armed && !Talk.on && !parts.length) parts.push('Job accepted: <em>' + esc(VM.armed.title) + '</em> · ' + (VMK[VM.armed.kind].veh === 'plane' ? 'board a plane (F)' : 'take a boat out (F)'));
  if (Fly.near && !Talk.on) { const q = Fly.near.spec, own = Fly.owned(q.id), lab = own ? 'Fly the ' + q.name + ' · ' + q.role : 'Buy the ' + q.name + ' · ' + money(q.cost); parts.push(TouchIn.on ? '<em>' + (own ? 'FLY' : 'BUY') + '</em> ' + esc(lab.replace(/^(Fly|Buy) /, '')) : '<em>F</em> ' + esc(lab)); }
  else if (Boat.near && !Talk.on) { const q = Boat.near.spec, own = Boat.owned(q.id), lab = own ? 'Take the ' + q.name + ' out · ' + q.role : 'Buy the ' + q.name + ' · ' + money(q.cost); parts.push(TouchIn.on ? '<em>' + (own ? 'BOAT' : 'BUY') + '</em> ' + esc(lab.replace(/^(Take|Buy) (the )?/, '')) : '<em>F</em> ' + esc(lab)); }
  else if (Foot.carNear && !Talk.on && !Jack.tgt) parts.push(TouchIn.on ? '<em>CAR</em> to get in' : '<em>F</em> Get in the ' + esc(CUR.name));
  else if (GAR.nearId && !Talk.on) { const nm = CAR_BY_ID[GAR.nearId].name; parts.push(TouchIn.on ? '<em>DRIVE</em> the ' + esc(nm) : '<em>F</em> Drive the ' + esc(nm)); }
  if (GAR.inside && !GAR.edit && !Talk.on) parts.push(TouchIn.on ? '<em>STYLE</em> to customise' : '<em>G</em> Customise garage');
  if (Fare.phase === 'walk' && !parts.length) parts.push('Your passenger is heading for the car');
  if (Police.on && Police.phase === 'enroute' && !Talk.on) parts.push('<em>Police</em> are on the way');
  const h = parts.join('<br>');
  if (h) { if (pr._h !== h) { pr._h = h; pr.innerHTML = h; } pr.hidden = false; } else if (!pr.hidden) pr.hidden = true;
};
UI.update = function (dt) {
  const c = car, kmh = Math.abs(c.speed) * 3.6;
  tx('spd', String(Math.round(toUnit(kmh)))); tx('unit', unitName());
  tx('gear', c.rev && Math.abs(c.speed) > 0.3 ? 'R' : (kmh < 2 && c.gear === 1 ? 'N' : String(c.gear)));
  E.nitBar.style.width = (clamp(c.nitro / tune.nitroMax, 0, 1) * 100).toFixed(0) + '%';
  E.hpBar.style.width = clamp(c.health, 0, 100).toFixed(0) + '%'; E.hpM.classList.toggle('low', c.health < 35);
  tx('btnCam', Fly.on ? ['Cockpit', 'Chase', 'Far chase'][Fly.view] : Boat.on ? ['Helm', 'Chase', 'Far chase'][Boat.view] : Foot.on ? (Foot.tp ? '3rd person' : '1st person') : VIEW_SHORT[Cam.view]);
  tx('clock', todStr(App.tod)); tx('cash', money(save.money));
  if (App.resultT > 0) { App.resultT -= dt; if (App.resultT <= 0) UI.hideResult(); }
  /* prompt */
  const near = !Mi && !Foot.on && !Fly.on && !Boat.on && App.mode === 'play' ? Mission.nearby : null;
  const pr = E.prompt;
  if (Rally.on) { if (!pr.hidden) pr.hidden = true; }
  else if (Fly.on) { Fly.prompt(pr); Fly.hud(dt); }
  else if (Boat.on) { Boat.prompt(pr); Boat.hud(dt); }
  else if (Foot.on) UI.footPrompt();
  else if (Jack.canStash() && !Mi) { const h = TouchIn.on ? '<em>STASH</em> the stolen ' + esc(CUR.name) : '<em>E</em> Stash the stolen ' + esc(CUR.name) + ' · keep, sell or scrap'; if (pr._h !== h) { pr._h = h; pr.innerHTML = h; } pr.hidden = false; }
  else if (Race.near && !Mi) { const h = TouchIn.on ? '<em>RACE</em> ' + esc(Track.name) : '<em>E</em> ' + esc(Track.name) + ' · race the field'; if (pr._h !== h) { pr._h = h; pr.innerHTML = h; } pr.hidden = false; }
  else if (Ven.near && !Mi && !Shop.near) { const h = TouchIn.on ? '<em>ENTER</em> ' + esc(Ven.near.D.name) : '<em>E</em> ' + esc(Ven.near.D.name) + ' · ' + esc(Ven.near.D.sub); if (pr._h !== h) { pr._h = h; pr.innerHTML = h; } pr.hidden = false; }
  else if (Wk.near && !Mi && !Shop.near) { const h = TouchIn.on ? '<em>BUILD</em> Workshop' : '<em>E</em> Workshop \u00b7 build and fly planes and rockets'; if (pr._h !== h) { pr._h = h; pr.innerHTML = h; } pr.hidden = false; }
  else if (Shop.near && !Mi) { const h = TouchIn.on ? '<em>SHOP</em> Customs · ' + esc(Shop.near.R.name) : '<em>E</em> Customs · ' + esc(Shop.near.R.name) + ' · paint, wheels, body kits, outfits'; if (pr._h !== h) { pr._h = h; pr.innerHTML = h; } pr.hidden = false; }
  else if (!near && GAR.inside && !Mi && !GAR.edit) { const h = TouchIn.on ? '<em>STYLE</em> to customise your garage' : '<em>G</em> Customise garage'; if (pr._h !== h) { pr._h = h; pr.innerHTML = h; } pr.hidden = false; }
  else if (near) {
    const t = MT[near.type], done = save.done[near.id];
    const h = '<em>' + (TouchIn.on ? 'TAP' : 'E') + '</em> ' + esc(t.name) + ' · ' + esc(near.title.replace(/^[^:]+: /, '')) + ' · ' + money(near.reward) + (done ? ' · ' + '★'.repeat(done.stars) : '');
    if (pr._h !== h) { pr._h = h; pr.innerHTML = h; } pr.hidden = false;
  } else if (!pr.hidden) pr.hidden = true;
  { const act = GAR.edit || Fly.on || Boat.on ? null : Jack.canStash() ? ['STASH', 'KeyE'] : Foot.on && Jack.tgt && !Talk.on ? ['JACK', 'KeyF'] : Race.near && !Foot.on ? ['RACE', 'KeyE'] : Wk.near && !Talk.on && !(Foot.on && Foot.target) ? ['BUILD', 'KeyE'] : Shop.near && !Talk.on && !(Foot.on && Foot.target) ? ['SHOP', 'KeyE'] : Ven.near && !Talk.on && !(Foot.on && Foot.target) ? ['ENTER', 'KeyE'] : Foot.on && VM.near && !Talk.on && !Foot.target ? ['JOBS', 'KeyE'] : Foot.on ? (Foot.target && !Talk.on ? ['TALK', 'KeyE'] : GAR.inside && !Talk.on ? ['STYLE', 'KeyG'] : null) : near ? ['GO', 'KeyE'] : GAR.inside && !Mi ? ['STYLE', 'KeyG'] : null;
    E.tAct.style.display = act ? '' : 'none'; if (act) { if (E.tAct.textContent !== act[0]) E.tAct.textContent = act[0]; E.tAct.dataset.k = act[1]; } }
  E.tFoot.style.display = (Fly.on ? Fly.canExit && Fly.p && Fly.p.st === 'flying' : Boat.on ? Boat.canExit && Boat.p && Boat.p.st === 'driving' : Foot.on ? (Fly.near || Boat.near || (Foot.carNear && !Jack.tgt) || GAR.nearId) && !Talk.on && !Jack.busy : !Mi && Math.abs(car.speed) < 3 && car.wrecked <= 0) ? '' : 'none';
  if (Foot.on) { const l = Fly.near ? (Fly.owned(Fly.near.id) ? 'FLY' : 'BUY') : Boat.near ? (Boat.owned(Boat.near.id) ? 'BOAT' : 'BUY') : Foot.carNear ? 'CAR' : 'DRIVE'; if (E.tFoot.textContent !== l) E.tFoot.textContent = l; }
  /* mission panel */
  _mpT -= dt; if (_mpT <= 0) { _mpT = 0.1; UI.missionPanel(); }
  /* target readout + north */
  if (Target.on) tx('tgt', Target.label + ' · ' + (Math.hypot(Target.x - Pl.x, Target.z - Pl.z) < 1000 ? Math.round(Math.hypot(Target.x - Pl.x, Target.z - Pl.z)) + ' m' : (Math.hypot(Target.x - Pl.x, Target.z - Pl.z) / 1000).toFixed(1) + ' km')); else tx('tgt', '');
  _miniT -= dt; if (_miniT <= 0) { _miniT = 1 / 24; WorldMap.drawMini(E.mini); const nx = -Math.sin(Pl.yaw), ny = Math.cos(Pl.yaw); E.north.style.left = (50 + nx * 43).toFixed(1) + '%'; E.north.style.top = (50 + ny * 43).toFixed(1) + '%'; }
  UI.drawOverlay(dt);
};
UI.missionPanel = function () {
  const mp = E.mp;
  if (VM.m && VM.m.phase !== 'done' && App.mode !== 'title' && App.mode !== 'load') { VM.panel(mp); return; }
  mp.classList.remove('vm');
  if (!Mi || App.mode === 'title' || App.mode === 'load') { if (!mp.hidden) { mp.hidden = true; mp._h = ''; } return; }
  const T = MT[Mi.type], d = Mi.def, c = car, cp = Mi.cps[Mi.idx]; mp.style.setProperty('--mc', T.col);
  let h = '<div class="mt"><span>' + T.ico + '</span>' + esc(T.name) + '</div><div class="mn">' + esc(d.title.replace(/^[^:]+: /, '')) + '</div>';
  const row = (a, b, cls) => '<div class="row"><span>' + a + '</span><b' + (cls ? ' class="' + cls + '"' : '') + '>' + b + '</b></div>';
  if (Mi.phase === 'countdown') h += '<div class="time">READY</div>' + row('Time limit', fmtT(d.limit));
  else {
    h += '<div class="time' + (Mi.left < 10 && Mi.phase === 'run' ? ' low' : '') + '">' + fmtT(Mi.left) + '</div>';
    const dist = cp ? Math.hypot(cp.x - c.x, cp.z - c.z) : 0;
    if (Mi.type === 'drift') {
      h += row('Score', Math.round(Mi.score) + ' / ' + d.target) + row('Chain', '+' + Math.round(Mi.driftBank) + (Mi.combo ? ' ×' + (1 + Mi.combo * 0.2).toFixed(1) : ''), Mi.driftBank > 0 ? 'good' : '') + row('Zone', Mi.inZone ? 'INSIDE' : Math.max(0, Math.round(Math.hypot(c.x - Mi.zone.x, c.z - Mi.zone.z) - Mi.zone.r)) + ' m to go', Mi.inZone ? 'good' : 'bad');
      h += '<div class="bar"><i style="width:' + clamp(Mi.score / d.target * 100, 0, 100).toFixed(0) + '%"></i></div>';
    } else {
      if (Mi.type === 'radar') h += row('Cameras', Mi.hits + ' / 3', Mi.hits >= 2 ? 'good' : '') + (cp && cp.gantry ? row('Next trap', Math.round(toUnit(cp.speed)) + ' ' + unitName().toLowerCase()) + row('Distance', Math.round(dist) + ' m') : row('Finish', Math.round(dist) + ' m'));
      else h += row('Checkpoint', Math.min(Mi.idx + 1, Mi.cps.length) + ' / ' + Mi.cps.length) + row('Distance', Math.round(dist) + ' m');
      if (Mi.rival && cp && cp.s !== undefined) { const gap = (cp.s - dist) - Mi.rival.rs; h += row('Rival', gap >= 0 ? 'AHEAD ' + Math.round(gap) + ' m' : 'BEHIND ' + Math.round(-gap) + ' m', gap >= 0 ? 'good' : 'bad'); }
      if (Mi.type === 'delivery') h += row('Cargo', Math.round(Mi.integrity) + '%', Mi.integrity > 55 ? 'good' : 'bad');
      h += '<div class="bar"><i style="width:' + clamp(Mi.idx / Mi.cps.length * 100, 0, 100).toFixed(0) + '%"></i></div>';
    }
  }
  if (mp._h !== h) { mp._h = h; mp.innerHTML = h; } mp.hidden = false;
};

/* on-screen target marker */
const OV = { w: 1, h: 1, g: null, dpr: 1 }, _tv = new THREE.Vector3();
UI.resize = function () {
  const cv = E.ov; OV.dpr = Math.min(2, window.devicePixelRatio || 1); OV.w = window.innerWidth; OV.h = window.innerHeight;
  cv.width = Math.round(OV.w * OV.dpr); cv.height = Math.round(OV.h * OV.dpr); OV.g = cv.getContext('2d');
};
UI.drawOverlay = function (dt) {
  const g = OV.g; if (!g) return; g.setTransform(OV.dpr, 0, 0, OV.dpr, 0, 0); g.clearRect(0, 0, OV.w, OV.h);
  if (Fly.on && App.mode === 'play') Fly.overlay(g, OV.w, OV.h);
  if (VM.m && App.mode === 'play') VM.overlay(g, OV.w, OV.h);
  if (App.mode !== 'play' || !Target.on || !save.set.hud) return;
  _tgtHT -= dt; if (_tgtHT <= 0) { _tgtHT = 0.5; const cp = Mi && Mi.cps[Mi.idx]; _tgtH = cp ? cp.h : terrainHeight(Target.x, Target.z); }
  _tv.set(Target.x, _tgtH + 7, Target.z); _tv.project(camera);
  const behind = _tv.z > 1; let sx = (_tv.x * 0.5 + 0.5) * OV.w, sy = (-_tv.y * 0.5 + 0.5) * OV.h; if (behind) { sx = OV.w - sx; sy = OV.h - sy; }
  const m = 46, mx = OV.w / 2, my = OV.h / 2; let off = behind || sx < m || sx > OV.w - m || sy < m || sy > OV.h - m, ang = 0;
  if (off) { const dx = sx - mx, dy = sy - my, k = Math.min((mx - m) / Math.abs(dx || 1e-4), (my - m - 40) / Math.abs(dy || 1e-4)); ang = Math.atan2(dy, dx); sx = mx + dx * k; sy = my + dy * k; if (behind) { sx = clamp(sx, m, OV.w - m); } }
  const col = Mi ? MT[Mi.type].col : '#33d4ff', dist = Math.hypot(Target.x - Pl.x, Target.z - Pl.z);
  g.save(); g.translate(sx, sy);
  if (off) { g.rotate(ang); g.fillStyle = col; g.strokeStyle = 'rgba(0,0,0,0.7)'; g.lineWidth = 3; g.beginPath(); g.moveTo(16, 0); g.lineTo(-9, -11); g.lineTo(-3, 0); g.lineTo(-9, 11); g.closePath(); g.stroke(); g.fill(); g.rotate(-ang); }
  else { g.fillStyle = col; g.strokeStyle = 'rgba(0,0,0,0.75)'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 14); g.lineTo(11, 0); g.lineTo(0, -14); g.lineTo(-11, 0); g.closePath(); g.stroke(); g.fill(); }
  g.font = '700 17px Rajdhani, sans-serif'; g.textAlign = 'center'; g.fillStyle = '#fff'; g.strokeStyle = 'rgba(0,0,0,0.8)'; g.lineWidth = 4;
  const lab = dist < 1000 ? Math.round(dist) + ' m' : (dist / 1000).toFixed(1) + ' km'; const ty = off ? 30 : 32; g.strokeText(lab, 0, ty); g.fillText(lab, 0, ty); g.restore();
};

/* ---------- screens ---------- */
UI.setMode = function (m) {
  App.mode = m;
  E.loading.hidden = m !== 'load'; E.title.hidden = m !== 'title'; E.menu.hidden = m !== 'pause'; E.court.hidden = m !== 'court'; E.bust.hidden = !Bust.on; E.shop.hidden = m !== 'shop'; E.vmp.hidden = m !== 'vm'; E.ven.hidden = m !== 'venue'; E.rl.hidden = m !== 'rlobby'; E.mech.hidden = m !== 'mech'; E.wk.hidden = m !== 'wk';
  E.hud.classList.toggle('off', m === 'title' || m === 'load' || m === 'court' || m === 'bust' || m === 'shop' || m === 'vm' || m === 'venue' || m === 'rlobby' || m === 'mech' || m === 'wk' || !save.set.hud);
  if (m !== 'play' && E.dbg) E.dbg.hidden = true;
  if (m !== 'play') { try { if (document.pointerLockElement) document.exitPointerLock(); } catch (er) { /* ignore */ } }
  E.touch.hidden = !(TouchIn.on && m === 'play'); document.body.classList.toggle('touch', TouchIn.on);
};
UI.progress = function (f, msg) { E.loadfill.style.width = (f * 100).toFixed(0) + '%'; if (msg) E.loadmsg.textContent = msg; };
UI.openMenu = function (tab) { if (App.mode !== 'play') return; Home.closeEdit(); UI.setMode('pause'); UI.tabTo(tab || App.tab); for (const k in Keys) Keys[k] = false; };
UI.closeMenu = function () { if (App.mode !== 'pause') return; UI.setMode('play'); writeSave(); };
UI.tabTo = function (name) {
  App.tab = name; const tabs = [['missions', 'Missions'], ['map', 'Map'], ['garage', 'Garage'], ['people', 'People'], ['collection', 'Collection'], ['settings', 'Settings'], ['controls', 'Controls']]; if (save.set.dev) tabs.push(['dev', 'Dev']);
  E.tabs.innerHTML = tabs.map((t) => '<button type="button" role="tab" data-tab="' + t[0] + '" aria-selected="' + (t[0] === name) + '">' + t[1] + '</button>').join('');
  UI.renderPane();
};
const UPG = [{ k: 'eng', n: 'Engine tune', per: '+7% power' }, { k: 'tire', n: 'Sport tyres', per: '+3.5% grip' }, { k: 'nit', n: 'Nitro tank', per: '+25 capacity' }, { k: 'arm', n: 'Body armour', per: '−12% crash damage' }];
const upCost = (l) => Math.round(350 * Math.pow(1.7, l) * (1 - Rel.perk('garage')) / 10) * 10;
const seg = (key, opts, cur) => '<div class="seg" role="group">' + opts.map((o) => '<button type="button" data-act="set" data-k="' + key + '" data-v="' + o[0] + '" aria-pressed="' + (String(cur) === String(o[0])) + '">' + o[1] + '</button>').join('') + '</div>';
UI.renderPane = function () {
  E.menuCash.textContent = money(save.money); const p = E.pane, s = save.set, c = car;
  E.btnAbort.hidden = !(Mi || VM.m || Rally.on); let h = '';
  if (App.tab === 'missions') {
    const list = missions.map((m) => ({ m, d: Math.hypot(m.x - c.x, m.z - c.z) })).sort((a, b) => a.d - b.d);
    const done = missions.filter((m) => save.done[m.id]).length;
    h += '<div class="sect">' + done + ' of ' + missions.length + ' runs completed · reputation ' + save.rep + '</div><div class="grid">';
    for (const it of list) {
      const m = it.m, T = MT[m.type], rec = save.done[m.id];
      h += '<div class="card cham" style="--mc:' + T.col + '"><div class="ty">' + T.ico + ' ' + T.name + '</div><h3>' + esc(m.title.replace(/^[^:]+: /, '')) + '</h3><p>' + esc(m.desc) + '</p>' +
        '<div class="meta"><span class="rw">' + money(m.reward) + '</span><span>' + (it.d < 1000 ? Math.round(it.d) + ' m' : (it.d / 1000).toFixed(1) + ' km') + '</span><span class="st">' + (rec ? '★'.repeat(rec.stars) : '') + '</span></div>' +
        '<div class="acts"><button class="btn sm" type="button" data-act="gps" data-id="' + m.id + '">Set GPS</button><button class="btn sm" type="button" data-act="warp" data-id="' + m.id + '">Warp there</button></div></div>';
    }
    h += '</div>';
  } else if (App.tab === 'map') {
    h = '<div id="mapWrap"><canvas id="fmap"></canvas><div id="mapHint">Click the map to drop a GPS waypoint<br>Drag to pan · scroll to zoom</div><div id="mapBar"><button class="btn sm" type="button" data-act="zin">Zoom +</button><button class="btn sm" type="button" data-act="zout">Zoom −</button><button class="btn sm" type="button" data-act="center">Find me</button><button class="btn sm" type="button" data-act="clrwp">Clear waypoint</button></div></div>';
  } else if (App.tab === 'garage') {
    h += '<div class="sect">Home garage<span class="hint">' + GAR.town + ' · ' + save.gar.bays + ' bays · drive in to park, swap cars on foot, restyle it</span></div><div class="up"><div><h4>Your garage</h4><small>' + Math.round(Math.hypot(GAR.ox - Pl.x, GAR.oz - Pl.z)) + ' m away · press G inside to customise</small></div><div class="hacts"><button class="btn sm" type="button" data-act="hgps">Set GPS</button><button class="btn sm" type="button" data-act="hwarp"' + (Mi ? ' disabled' : '') + '>Warp home</button></div></div>';
    if (save.jack) h += '<div class="sect">Hot car<span class="hint">stolen · not stashed yet</span></div><div class="up"><div><h4>' + esc(CAR_BY_ID[save.jack.id].name) + ' <small style="display:inline">' + esc(CAR_BY_ID[save.jack.id].cls) + '</small></h4><small>Drive it into your garage to keep, sell or scrap it. Getting busted means the police impound it.</small></div><div class="hacts"><button class="btn sm" type="button" data-act="jgps">Set GPS</button></div></div>';
    const nBase = CARS.filter((d) => !d.stolen && save.owned[d.id]).length, nStol = CARS.filter((d) => d.stolen && save.owned[d.id]).length;
    h += '<div class="sect">Cars<span class="hint">' + nBase + ' of ' + BASE_N + ' owned' + (nStol ? ' · ' + nStol + ' stolen' : '') + ' · upgrades carry over to any car</span></div><div class="cars">' + CARS.filter((d) => !d.stolen || save.owned[d.id]).map((d) => {
      const own = !!save.owned[d.id], cur = save.car === d.id, img = carThumb(d, curPaint(d.id));
      const bar = (l, v) => '<div class="cs"><span>' + l + '</span><i><b style="width:' + v * 10 + '%"></b></i></div>';
      return '<div class="carc' + (cur ? ' cur' : '') + (own ? '' : ' locked') + '"><div class="cimg">' + (img ? '<img alt="' + d.name + '" src="' + img + '">' : '') + '</div>' +
        '<div class="chead"><h4>' + d.name + '</h4><small>' + d.cls + (d.stolen ? ' · stolen' : '') + '</small></div><p>' + d.blurb + '</p>' +
        '<div class="cstats">' + bar('Speed', d.stats.spd) + bar('Accel', d.stats.acc) + bar('Handling', d.stats.hdl) + bar('Off-road', d.stats.off) + '</div>' +
        '<div class="cact">' + (cur ? '<span class="tag">Driving</span>' : own ? '<button class="btn sm" type="button" data-act="drive" data-id="' + d.id + '">Drive</button>' : '<button class="btn sm" type="button" data-act="buycar" data-id="' + d.id + '"' + (save.money < d.price ? ' disabled' : '') + '>Buy ' + money(d.price) + '</button>') +
        (d.stolen && !cur ? '<button class="btn sm" type="button" data-act="sellk" data-id="' + d.id + '">' + (Jack.conf === 'sellk:' + d.id ? 'Sure? ' : 'Sell ') + money(Jack.worth(d.id)) + '</button><button class="btn sm" type="button" data-act="scrapk" data-id="' + d.id + '">' + (Jack.conf === 'scrapk:' + d.id ? 'Sure? ' : 'Scrap ') + '+' + save.stolen[d.id].tok + '</button>' : '') + '</div></div>';
    }).join('') + '</div>';
    h += '<div class="sect">Paint · ' + CUR.name + '</div><div class="swatches">' + PAINTS.map((hx, i) => '<button class="sw" type="button" data-act="paint" data-i="' + i + '" aria-pressed="' + (curPaint() === i) + '" aria-label="Paint ' + (i + 1) + '" style="background:#' + hx.toString(16).padStart(6, '0') + '"></button>').join('') + '</div>';
    h += '<div class="sect">Upgrades<span class="hint">Upgrade tokens: ' + save.tokens + (save.tokens ? '' : ' · scrap stolen cars to earn them') + '</span></div>';
    for (const u of UPG) {
      const l = save.up[u.k], max = l >= 5, cost = upCost(l);
      h += '<div class="up"><div><h4>' + u.n + ' <small style="display:inline">' + u.per + ' per level</small></h4><div class="pips">' + [0, 1, 2, 3, 4].map((i) => '<i class="' + (i < l ? 'on' : '') + '"></i>').join('') + '</div></div><div class="hacts"><button class="btn" type="button" data-act="buy" data-k="' + u.k + '"' + (max || save.money < cost ? ' disabled' : '') + '>' + (max ? 'Maxed' : 'Buy ' + money(cost)) + '</button>' + (max ? '' : '<button class="btn" type="button" data-act="buytok" data-k="' + u.k + '"' + (save.tokens < tokCost(l) ? ' disabled' : '') + '>' + tokCost(l) + ' tokens</button>') + '</div></div>';
    }
    const rep = Math.ceil((100 - c.health) * 4);
    h += '<div class="sect">Repairs</div><div class="up"><div><h4>Body condition ' + Math.round(c.health) + '%</h4></div><button class="btn" type="button" data-act="repair"' + (c.health > 99 || save.money < rep ? ' disabled' : '') + '>' + (c.health > 99 ? 'Like new' : 'Repair ' + money(rep)) + '</button></div>';
  } else if (App.tab === 'people') {
    h = Rel.pane();
  } else if (App.tab === 'dev') {
    const row = (l, ctl, v) => '<div class="set"><label>' + l + '</label>' + ctl + (v !== undefined ? '<span class="val" data-val="' + v + '"></span>' : '') + '</div>';
    const dseg = (k, cur) => '<div class="seg" role="group">' + [[true, 'On'], [false, 'Off']].map((o) => '<button type="button" data-act="dev" data-k="' + k + '" data-v="' + o[0] + '" aria-pressed="' + (!!cur === o[0]) + '">' + o[1] + '</button>').join('') + '</div>';
    const btn = (id, label, dis) => '<button class="btn sm" type="button" data-act="dact" data-id="' + id + '"' + (dis ? ' disabled' : '') + '>' + label + '</button>';
    const grp = (...b) => '<div class="btnrow">' + b.join('') + '</div>';
    const sl = (id, k, mn, mx, st, v) => '<input id="' + id + '" type="range" min="' + mn + '" max="' + mx + '" step="' + st + '" value="' + v + '" data-slider="' + k + '">';
    h += '<div class="sect">Cheats</div>' + row('God mode', dseg('god', Dev.god)) + row('Infinite nitro', dseg('nit', Dev.nit)) +
      row('Cash', grp(btn('cash1', '+$1k'), btn('cash10', '+$10k'), btn('cash100', '+$100k'))) + row('Garage', grp(btn('unlock', 'Unlock all cars'), btn('maxup', 'Max upgrades'), btn('repair', 'Repair'), btn('unplanes', 'Unlock planes'), btn('unboats', 'Unlock boats')));
    h += '<div class="sect">Vehicle &amp; time</div>' + row('Engine power', sl('dPow', 'dpower', 0.25, 4, 0.05, Dev.power), 'dpower') + row('Tyre grip', sl('dGrip', 'dgrip', 0.4, 2.5, 0.05, Dev.grip), 'dgrip') + row('Time scale', sl('dTs', 'dts', 0.1, 2, 0.05, Dev.ts), 'dts');
    h += '<div class="sect">World</div>' + row('Teleport', grp(...towns.map((t, i) => btn('tp' + i, t.name)), btn('tpair', 'Airport'), btn('tpdock', 'Marina'), btn('tpwp', 'Waypoint', !Waypoint.on))) + row('Planets: orbit', grp(...WK.BODIES.map((B) => btn('wk:orbit:' + B.id, B.name)))) + row('Planets: surface', grp(...WK.BODIES.filter((B) => B !== WK.SUN && !B.crush && B !== WK.HOME).map((B) => btn('wk:land:' + B.id, B.name)))) + row('Time of day', grp(btn('tod6', 'Dawn'), btn('tod12', 'Noon'), btn('tod18.5', 'Dusk'), btn('tod23', 'Night'))) + row('Traffic', grp(btn('traf', 'Spawn 10 cars'))) + row('Lawsuit', grp(btn('lawsuit', 'Get sued now'))) + row('Mishaps', grp(btn('tow', 'Wreck car (tow truck)'), btn('cops', 'Call the police'))) + row('Wanted level', grp(btn('wl1', '1★'), btn('wl2', '2★'), btn('wl3', '3★'), btn('wl4', '4★'), btn('wl5', '5★'), btn('wl0', 'Clear'), btn('bustme', 'Get busted')));
    h += '<div class="sect">Missions</div>' + row('Current run', grp(btn('done', 'Complete run', !Mi && !VM.m))) + row('Progress', grp(btn('all3', 'All missions 3★'), btn('clrdone', 'Reset missions'))) + row('Friendships', grp(btn('relmax', 'Max all friends'), btn('relreset', 'Reset friends')));
    h += '<div class="sect">Debug</div>' + row('Stats overlay ( ` )', dseg('hud', Dev.hud)) + row('Show hitboxes ( Y )', dseg('hbox', Dev.hbox)) + (Dev.hbox ? '<div class="note">Green trunks · cyan tree crowns (planes only) · magenta rocks · yellow poles and tanks · red buildings and roofs · blue cars · white you · orange plane and boat test points. Drawn see-through around you.</div>' : '') + row('Free camera ( V )', dseg('free', Dev.free)) + row('Free camera tools', grp(btn('drop', 'Drop car at camera', !Dev.free))) +
      '<div class="note">Free camera: WASD fly · Space / Z up / down · Shift fast · drag to look. Resume to use it.</div>' + row('Developer mode', grp(btn('off', 'Turn off')));
  } else if (App.tab === 'collection') {
    h = Col.pane();
  } else if (App.tab === 'settings') {
    const row = (l, ctl, v) => '<div class="set"><label>' + l + '</label>' + ctl + (v !== undefined ? '<span class="val" data-val="' + v + '"></span>' : '') + '</div>';
    h += '<div class="sect">Graphics</div>' + row('Quality', seg('quality', [['low', 'Low'], ['med', 'Medium'], ['high', 'High']], s.quality)) + row('Traffic', seg('traffic', [['off', 'Off'], ['low', 'Light'], ['high', 'Busy']], s.traffic)) + row('Pedestrians', seg('peds', [['off', 'Off'], ['low', 'Few'], ['high', 'Busy']], s.peds || 'high')) + row('Lawsuits (hit a pedestrian)', seg('suits', [['on', 'On'], ['off', 'Off']], s.suits || 'on')) + row('Arrest cutscene', seg('bust', [['full', 'Full'], ['quick', 'Quick']], s.bust || 'full')) +
      row('Field of view', '<input id="sFov" type="range" min="60" max="105" step="1" value="' + s.fov + '" data-slider="fov">', 'fov') + row('Camera view', seg('cam', [[0, 'Cockpit'], [2, 'Third person'], [1, 'Bumper']], Cam.view)) + row('Camera shake', seg('shake', [[true, 'On'], [false, 'Off']], s.shake)) + row('HUD', seg('hud', [[true, 'Show'], [false, 'Hide']], s.hud));
    h += '<div class="sect">World</div>' + row('Time of day', '<input id="sTod" type="range" min="0" max="24" step="0.1" value="' + App.tod.toFixed(1) + '" data-slider="tod">', 'tod') + row('Day length', seg('cycle', [[0, 'Frozen'], [1, '20 min'], [4, '5 min']], s.cycle));
    h += '<div class="sect">Flying</div>' + row('Flight assist (levels the wings, holds your climb)', seg('fassist', [[true, 'On'], [false, 'Off']], s.fassist !== false)) + row('Invert pitch', seg('finv', [[true, 'On'], [false, 'Off']], !!s.finv)) + row('Flight log', '<span class="val">' + (save.air.hrs * 60).toFixed(0) + ' min airborne · ' + save.air.ldg + ' landings · best landing ' + money(save.air.best) + '</span>');
    h += '<div class="sect">Boating</div>' + row('Boat log', '<span class="val">' + (save.boat.hrs * 60).toFixed(0) + ' min under way · ' + BIDS.filter((k) => save.boat.own[k]).length + ' of ' + BIDS.length + ' boats owned</span>');
    h += '<div class="sect">Sound &amp; units</div>' + row('Music', seg('music', [[true, 'On'], [false, 'Off']], s.music)) + row('Master volume', '<input id="sVol" type="range" min="0" max="1" step="0.05" value="' + s.vol + '" data-slider="vol">', 'vol') + row('Speed units', seg('units', [['kmh', 'km/h'], ['mph', 'mph']], s.units));
    h += '<div class="sect">Developer</div>' + row('Developer mode (cheats, debug tools)', seg('dev', [[true, 'On'], [false, 'Off']], !!s.dev));
    const LW = save.law; h += '<div class="sect">Save</div>' + row('Court record', '<span class="val">' + LW.won + ' won · ' + LW.part + ' partly · ' + LW.lost + ' lost · ' + LW.settled + ' settled · ' + money(LW.paid) + ' paid</span>') + row('Progress is stored in this browser', '<button class="btn sm" type="button" data-act="reset">Erase progress</button>');
  } else {
    const rows = [['Get out of / into the car', 'F (stop first)'], ['On foot: walk, strafe', 'W A S D · ← → turn'], ['On foot: run, jump', 'Shift · Space'], ['On foot: punch', 'Q · click · PUNCH button'], ['On foot: carjack a traffic car', 'F beside it (stand in its lane to stop it) · wanted +2'], ['Stash a stolen car (in your garage)', 'E · keep, sell or scrap'], ['Talk to a pedestrian', 'E when close · 1–6 or click to reply'], ['Gas / brake / reverse', 'W S or ↑ ↓'], ['Steer', 'A D or ← →'], ['Nitro', 'Shift'], ['Handbrake (drift)', 'Space'], ['Start mission', 'E'], ['Change camera', 'C (cockpit, third person, bumper) or 1 2 3'], ['Third-person zoom', 'Mouse wheel'], ['Look around', 'Drag with mouse or touch'], ['Look behind', 'Hold B'], ['Map and GPS', 'M'], ['Reset car to road', 'R'], ['Pause menu', 'Esc or P'], ['Hide HUD', 'T'], ['Gamepad', 'RT / LT, stick, A handbrake, B nitro, Y camera, X start']];
    rows.push(['Get in a plane (airfield)', 'F beside it · F again to get out when stopped'], ['Fly: pitch', 'W / ↑ nose down · S / ↓ pull up'], ['Fly: roll · rudder', 'A D · Q E'], ['Fly: throttle · brake', 'Shift or X up · Z down · Space'], ['Fly: camera · assist · reset', 'C or 1 2 3 · H · R']);
    rows.push(['Take a boat out (marina)', 'F beside it · F again to get out when slow'], ['Boat: throttle · reverse', 'W / ↑ · S / ↓ (brake, then reverse)'], ['Boat: steer · boost · anchor', 'A D · Shift (fast boats) · Space'], ['Boat: camera · back to slip', 'C or 1 2 3 · R']);
    if (save.set.dev) rows.push(['Debug overlay', '` (backquote)'], ['Show hitboxes', 'Y'], ['Free camera', 'V · WASD fly, Space / Z up / down, Shift fast']);
    h += '<div class="ctl">' + rows.map((r) => '<div><span>' + r[0] + '</span><span>' + r[1] + '</span></div>').join('') + '</div>';
  }
  p.innerHTML = h; p.scrollTop = 0;
  p.querySelectorAll('[data-val]').forEach((el) => UI.sliderLabel(el.getAttribute('data-val'), el));
  if (App.tab === 'map') { FM.zoom = 1; FM.cx = c.x; FM.cz = c.z; requestAnimationFrame(() => UI.mapDraw()); }
};
UI.sliderLabel = function (k, el) {
  el.textContent = k === 'fov' ? save.set.fov + '°' : k === 'vol' ? Math.round(save.set.vol * 100) + '%' : k === 'dpower' ? '×' + Dev.power.toFixed(2) : k === 'dgrip' ? '×' + Dev.grip.toFixed(2) : k === 'dts' ? '×' + Dev.ts.toFixed(2) : todStr(App.tod);
};
/* the map canvas is rebuilt every time the Map tab is drawn, so look it up fresh: E caches the first element it finds and would hand back a detached canvas from the second visit on */
UI.mapDraw = function () { const cv = document.getElementById('fmap'); if (cv && App.mode === 'pause' && App.tab === 'map') WorldMap.drawFull(cv); };
UI.setWaypoint = function (x, z) { Waypoint.on = true; Waypoint.x = x; Waypoint.z = z; GPS.t = 0; UI.toast('Waypoint set', 'info'); };

function bindUI() {
  E.pane.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]'); if (!b || b.disabled) return; const a = b.dataset.act; if (a !== 'sellk' && a !== 'scrapk') Jack.conf = '';
    if (a === 'gps') { const m = missions.find((q) => q.id === b.dataset.id); UI.setWaypoint(m.x, m.z); UI.closeMenu(); }
    else if (a === 'hgps') { UI.setWaypoint(GAR.ox, GAR.oz + 12); UI.closeMenu(); }
    else if (a === 'hwarp') { UI.closeMenu(); Home.warp(); }
    else if (a === 'warp') { const m = missions.find((q) => q.id === b.dataset.id); UI.closeMenu(); App.warp(m); }
    else if (a === 'paint') { save.cc[save.car] = +b.dataset.i; { const r = cosSave().car[save.car]; if (r) r.paint = null; } App.applyPaint(); writeSave(); UI.renderPane(); }
    else if (a === 'dev') { const k = b.dataset.k, v = b.dataset.v === 'true'; if (k === 'free') UI.devFree(v); else Dev[k] = v; UI.renderPane(); }
    else if (a === 'dact') UI.devAct(b.dataset.id);
    else if (a === 'drive') { if (App.setCar(b.dataset.id)) { UI.toast(CUR.name + ' ready', 'info'); UI.renderPane(); } }
    else if (a === 'buycar') { const d = CAR_BY_ID[b.dataset.id]; if (d && !save.owned[d.id] && save.money >= d.price) { save.money -= d.price; save.owned[d.id] = true; Snd.beep(900, 0.12); if (!Mi) { App.setCar(d.id); car.health = 100; } writeSave(); UI.toast('Bought ' + d.name, 'good'); UI.renderPane(); } }
    else if (a === 'buytok') { if (Jack.buyTok(b.dataset.k)) UI.renderPane(); }
    else if (a === 'sellk' || a === 'scrapk') { const id = b.dataset.id, key = a + ':' + id; if (Jack.conf !== key) { Jack.conf = key; UI.renderPane(); } else { Jack.conf = ''; if (a === 'sellk') Jack.sellKept(id); else Jack.scrapKept(id); UI.renderPane(); } }
    else if (a === 'jgps') { UI.setWaypoint(GAR.ox, GAR.oz + 12); UI.closeMenu(); }
    else if (a === 'buy') { const k = b.dataset.k, l = save.up[k], cost = upCost(l); if (l < 5 && save.money >= cost) { save.money -= cost; save.up[k]++; refreshTune(); writeSave(); Snd.beep(900, 0.1); UI.renderPane(); } }
    else if (a === 'repair') { const cost = Math.ceil((100 - car.health) * 4); if (save.money >= cost) { save.money -= cost; car.health = 100; writeSave(); Snd.beep(700, 0.1); UI.renderPane(); } }
    else if (a === 'set') { const k = b.dataset.k; let v = b.dataset.v; if (v === 'true') v = true; else if (v === 'false') v = false; else if (k === 'cycle') v = +v; if (k === 'cam') { UI.setView(+v, false); UI.renderPane(); return; } save.set[k] = v; if (App.onSetting) App.onSetting(k); writeSave(); UI.renderPane(); }
    else if (a === 'reset') { b.textContent = 'Click again to confirm'; b.dataset.act = 'reset2'; }
    else if (a === 'reset2') { try { localStorage.removeItem(SAVE_KEY); } catch (er) { /* ignore */ } save.money = 600; save.rep = 0; save.done = {}; save.up = { eng: 0, tire: 0, nit: 0, arm: 0 }; save.color = 0; save.car = 'rook'; save.owned = { rook: true }; save.cc = {}; save.tokens = 0; save.stolen = {}; save.jack = null; save.jn = 0; save.cos = { own: {}, car: {}, out: {} }; save.air = { own: { sparrow: true }, hrs: 0, ldg: 0, best: 0, view: 1 }; save.boat = { own: {}, hrs: 0, view: 1 }; save.vm = { done: {}, kills: 0, rings: 0 }; save.ven = { rec: {}, souv: {} }; save.col = { got: {}, n: 0, fish: {}, prize: {} }; if (typeof Col !== 'undefined' && Col.reset) Col.reset(); Fly.tags(); Boat.tags(); Rel.reset(); Object.assign(save.law, { won: 0, part: 0, lost: 0, settled: 0, paid: 0 }); Thumb.cache = Object.create(null); applyCar('rook', true); App.applyPaint(); UI.renderPane(); UI.toast('Progress erased', 'bad'); }
    else if (a === 'zin') { FM.zoom = Math.min(10, FM.zoom * 1.6); UI.mapDraw(); }
    else if (a === 'zout') { FM.zoom = Math.max(1, FM.zoom / 1.6); UI.mapDraw(); }
    else if (a === 'center') { FM.cx = car.x; FM.cz = car.z; UI.mapDraw(); }
    else if (a === 'rtrack') Rel.track(b.dataset.id);
    else if (a === 'clrwp') { Waypoint.on = false; GPS.t = 0; UI.mapDraw(); }
  });
  E.pane.addEventListener('input', (e) => {
    const s = e.target.getAttribute && e.target.getAttribute('data-slider'); if (!s) return; const v = +e.target.value;
    if (s === 'fov') save.set.fov = v; else if (s === 'vol') { save.set.vol = v; if (App.onSetting) App.onSetting('vol'); } else if (s === 'tod') App.tod = v; else if (s === 'dpower') { Dev.power = v; refreshTune(); } else if (s === 'dgrip') { Dev.grip = v; refreshTune(); } else if (s === 'dts') Dev.ts = v;
    const lab = e.target.parentNode.querySelector('[data-val]'); if (lab) UI.sliderLabel(s, lab);
  });
  E.tabs.addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) UI.tabTo(b.dataset.tab); });
  E.btnResume.onclick = () => UI.closeMenu();
  E.btnRespawn.onclick = () => { UI.closeMenu(); App.respawn(true); };
  E.btnAbort.onclick = () => { UI.closeMenu(); if (Rally.on) Rally.exit(true); else if (VM.m) VM.abort('Run abandoned'); else abortMission(); };
  E.btnPause.onclick = () => UI.openMenu('missions');
  E.btnCam.onclick = () => UI.cycleView();
  E.btnStart.onclick = () => App.start();
  E.btnTitleCtl.onclick = () => { App.start(); UI.openMenu('controls'); };
  E.prompt.onclick = () => { if (!Mi && Mission.nearby) startMission(Mission.nearby); };
  /* full-map interaction */
  const pane = E.pane; let drag = null;
  pane.addEventListener('pointerdown', (e) => { if (e.target.id !== 'fmap') return; drag = { x: e.clientX, y: e.clientY, cx: FM.cx, cz: FM.cz, moved: false }; e.target.setPointerCapture(e.pointerId); });
  pane.addEventListener('pointermove', (e) => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 5) drag.moved = true; if (drag.moved) { FM.cx = drag.cx - dx * FM.dpr / FM.ppm; FM.cz = drag.cz - dy * FM.dpr / FM.ppm; UI.mapDraw(); } });
  pane.addEventListener('pointerup', (e) => {
    if (!drag) return; const d = drag; drag = null; if (d.moved || e.target.id !== 'fmap') return;
    const r = e.target.getBoundingClientRect(), w = FM.toWorld((e.clientX - r.left) * FM.dpr, (e.clientY - r.top) * FM.dpr); let x = w[0], z = w[1];
    for (const mk of MView.markers) if (Math.hypot(mk.m.x - x, mk.m.z - z) * FM.ppm < 14 * FM.dpr) { x = mk.m.x; z = mk.m.z; break; }
    UI.setWaypoint(x, z); UI.mapDraw();
  });
  pane.addEventListener('wheel', (e) => { if (e.target.id !== 'fmap') return; e.preventDefault(); FM.zoom = clamp(FM.zoom * (e.deltaY < 0 ? 1.25 : 0.8), 1, 10); UI.mapDraw(); }, { passive: false });
  window.addEventListener('resize', () => { UI.resize(); if (App.mode === 'pause') UI.mapDraw(); });
}

/* ---------- input ---------- */
const Keys = Object.create(null);
const TouchIn = { on: false, l: 0, r: 0, gas: 0, brk: 0, nit: 0, hand: 0, fire: 0 };
const padPrev = [];
function onKey(code) {
  if (App.mode === 'title') { if (code === 'Enter' || code === 'Space') App.start(); return; }
  if (App.mode === 'court') { Court.key(code); return; }
  if (App.mode === 'shop') { Shop.key(code); return; }
  if (App.mode === 'vm') { VM.key(code); return; }
  if (App.mode === 'venue') { Ven.key(code); return; }
  if (App.mode === 'rlobby') { Race.key(code); return; }
  if (App.mode === 'mech') { Mech.key(code); return; }
  if (App.mode === 'wk') { Wk.key(code); return; }
  if (App.mode === 'pause') { if (code === 'Escape' || code === 'KeyP' || (code === 'KeyM' && App.tab === 'map')) UI.closeMenu(); return; }
  if (App.mode !== 'play') return;
  if (GAR.edit) { Home.key(code); return; }
  if (Talk.on) { Talk.key(code); return; }
  if (Rally.on) { if (code === 'KeyR') { Rally.reset(); return; } if (/^(KeyE|Enter|KeyF|KeyG|KeyM|KeyQ|KeyH)$/.test(code)) return; }
  switch (code) {
    case 'Escape': case 'KeyP': UI.openMenu('missions'); break;
    case 'KeyM': UI.openMenu('map'); break;
    case 'KeyC': UI.cycleView(); break;
    case 'Backquote': if (save.set.dev) Dev.hud = !Dev.hud; break;
    case 'KeyF': if (Race.on) { UI.toast('Finish the race or quit it first', 'info'); break; } if (Fly.on) Fly.exit(); else if (Boat.on) Boat.exit(); else if (Foot.on) { if (Jack.busy) break; if (Jack.tgt) Jack.begin(); else if (Fly.near) Fly.useNear(); else if (Boat.near) Boat.useNear(); else if (Foot.carNear) Foot.board(); else if (GAR.nearId) Home.drive(GAR.nearId); else UI.toast('Walk up to your car first', 'info'); } else Foot.exit(); break;
    case 'KeyG': if (!Fly.on && !Boat.on) Home.openEdit(); break;
    case 'KeyH': if (Fly.on) { save.set.fassist = save.set.fassist === false; writeSave(); UI.toast('Flight assist ' + (save.set.fassist === false ? 'off' : 'on'), 'info'); } break;
    case 'KeyQ': if (Foot.on) Fight.punch(); break;
    case 'KeyV': if (save.set.dev) UI.devFree(!Dev.free); break;
    case 'KeyY': if (save.set.dev) { Dev.hbox = !Dev.hbox; UI.toast('Hitboxes ' + (Dev.hbox ? 'shown' : 'hidden'), 'info'); } break;
    case 'Digit1': if (Fly.on) { Fly.view = 0; save.air.view = 0; Fly.snapCam = true; } else if (Boat.on) { Boat.view = 0; save.boat.view = 0; Boat.snapCam = true; } else if (Foot.on) Foot.tp = false; else UI.setView(0, true); break; case 'Digit2': if (Fly.on) { Fly.view = 1; save.air.view = 1; Fly.snapCam = true; } else if (Boat.on) { Boat.view = 1; save.boat.view = 1; Boat.snapCam = true; } else if (Foot.on) Foot.tp = true; else UI.setView(2, true); break; case 'Digit3': if (Fly.on) { Fly.view = 2; save.air.view = 2; Fly.snapCam = true; } else if (Boat.on) { Boat.view = 2; save.boat.view = 2; Boat.snapCam = true; } else if (!Foot.on) UI.setView(1, true); break;
    case 'KeyE': case 'Enter': if (Jack.canStash() && code === 'KeyE') Jack.openPanel(); else if (Fly.on || Boat.on) { if (code === 'Enter' && !E.result.hidden) UI.hideResult(); } else if (!E.result.hidden) UI.hideResult(); else if (Wk.near && !(Foot.on && Foot.target)) Wk.open(); else if (Shop.near && !(Foot.on && Foot.target)) Shop.open(); else if (Ven.near && !(Foot.on && Foot.target)) Ven.open(); else if (Race.near) Race.open(); else if (VM.near && Foot.on && !Foot.target) VM.open(); else if (Foot.on) { if (Foot.target) Talk.open(Foot.target); } else if (!Mi && Mission.nearby) { if (Fare.phase === 'ride') UI.toast('Drop off your passenger first', 'bad'); else startMission(Mission.nearby); } break;
    case 'KeyR': if (Race.on) Race.reset(); else if (Fly.on) Fly.reset(); else if (Boat.on) Boat.reset(); else if (Foot.on) Foot.toCar(); else if (Tow.on || car.wrecked > 0) Tow.skip(); else App.respawn(true); break;
    case 'KeyT': save.set.hud = !save.set.hud; UI.setMode('play'); break;
    default:
  }
}
function bindInput() {
  const game = (c) => /^(Arrow|Space|Tab|Key[WASDCEMRTBPFVGQXZH]|Shift|Digit[1-9]|Escape|Enter)/.test(c);
  window.addEventListener('keydown', (e) => {
    const tg = e.target && e.target.tagName; if ((tg === 'INPUT' || tg === 'TEXTAREA') && e.code !== 'Escape') return;
    if (Bust.on) { e.preventDefault(); if (!e.repeat) Bust.key(e.code); return; }
    if (App.mode === 'wk') { if (/^(Arrow|Space|Tab|Key|Digit|Backspace|Delete|Comma|Period|Shift)/.test(e.code) && (!(e.ctrlKey || e.metaKey) || /^Key[ZY]$/.test(e.code))) e.preventDefault(); } else if (game(e.code)) e.preventDefault(); if (e.repeat) return; Keys[e.code] = true; onKey(e.code);
  });
  window.addEventListener('keyup', (e) => { Keys[e.code] = false; });
  window.addEventListener('blur', () => { for (const k in Keys) Keys[k] = false; for (const k of ['l', 'r', 'gas', 'brk', 'nit', 'hand', 'fire']) TouchIn[k] = 0; });
  document.addEventListener('visibilitychange', () => { if (document.hidden && App.mode === 'play') UI.openMenu('missions'); });
  /* free look */
  const gl = E.gl; let d = null;
  gl.addEventListener('pointerdown', (e) => { if (App.mode !== 'play' || d || GAR.edit || Bust.on) return; if (Foot.on && e.pointerType === 'mouse' && e.button === 0 && document.pointerLockElement === gl) Fight.punch(); d = { id: e.pointerId, x: e.clientX, y: e.clientY }; Cam.dragging = true; try { gl.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ }
    if (Foot.on && !Talk.on && e.pointerType === 'mouse') { try { const r = gl.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (er) { /* ignore */ } } });
  gl.addEventListener('pointermove', (e) => { if (Foot.on && document.pointerLockElement === gl) { if (!Talk.on) Foot.look(e.movementX, e.movementY); return; } if (!d || d.id !== e.pointerId) return; if (Foot.on && !devOn('free')) { if (!Talk.on) Foot.look(e.clientX - d.x, e.clientY - d.y); } else if (devOn('free')) { Dev.fyaw -= (e.clientX - d.x) * 0.006; Dev.fpitch = clamp(Dev.fpitch - (e.clientY - d.y) * 0.005, -1.5, 1.5); } else { Cam.lookYaw = clamp(Cam.lookYaw - (e.clientX - d.x) * 0.006, -2.4, 2.4); Cam.lookPitch = clamp(Cam.lookPitch - (e.clientY - d.y) * 0.004, -0.5, 0.5); } d.x = e.clientX; d.y = e.clientY; });
  const up = (e) => { if (d && d.id === e.pointerId) { d = null; Cam.dragging = false; } };
  gl.addEventListener('pointerup', up); gl.addEventListener('pointercancel', up);
  gl.addEventListener('contextmenu', (e) => e.preventDefault());
  gl.addEventListener('wheel', (e) => { if (App.mode === 'play' && (Fly.on || Boat.on)) { e.preventDefault(); if (Fly.on) Fly.zoom = clamp(Fly.zoom + e.deltaY * 0.0012, 0.6, 2.2); else Boat.zoom = clamp(Boat.zoom + e.deltaY * 0.0012, 0.6, 2.2); return; } if (App.mode !== 'play' || (Foot.on ? !Foot.tp : Cam.view !== 2)) return; e.preventDefault(); Cam.dist = clamp(Cam.dist + e.deltaY * 0.004, 4, 12); }, { passive: false });
  /* touch buttons */
  const map = { tL: 'l', tR: 'r', tGas: 'gas', tBrk: 'brk', tNit: 'nit', tHand: 'hand', tFire: 'fire' };
  for (const id in map) {
    const b = E[id], k = map[id];
    b.addEventListener('pointerdown', (e) => { TouchIn[k] = 1; b.classList.add('on'); try { b.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ } e.preventDefault(); });
    const off = () => { TouchIn[k] = 0; b.classList.remove('on'); }; b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('lostpointercapture', off);
  }
  E.tCam.addEventListener('pointerdown', (e) => { e.preventDefault(); onKey('KeyC'); });
  E.tPunch.addEventListener('pointerdown', (e) => { e.preventDefault(); Fight.punch(); });
  E.tAct.addEventListener('pointerdown', (e) => { e.preventDefault(); onKey(E.tAct.dataset.k || 'KeyE'); });
  Home.bind();
  E.tFoot.addEventListener('pointerdown', (e) => { e.preventDefault(); onKey('KeyF'); });
  E.tkOpts.addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (b) Talk.pick(+b.dataset.i); });
  const showTouch = () => { TouchIn.on = true; E.touch.hidden = App.mode !== 'play'; document.body.classList.add('touch'); };
  window.addEventListener('touchstart', showTouch, { once: true, passive: true });
  if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) TouchIn.on = true;
  Court.bind(); Bust.bind();
}
function approach(v, t, r) { return v < t ? Math.min(t, v + r) : Math.max(t, v - r); }
function readControls(dt) {
  const c = car, K = Keys;
  let st = ((K.KeyA || K.ArrowLeft) ? 1 : 0) - ((K.KeyD || K.ArrowRight) ? 1 : 0) + TouchIn.l - TouchIn.r;
  let th = (K.KeyW || K.ArrowUp) ? 1 : 0, br = (K.KeyS || K.ArrowDown) ? 1 : 0, hand = K.Space ? 1 : 0, nit = !!(K.ShiftLeft || K.ShiftRight), back = !!K.KeyB, analog = false;
  th = Math.max(th, TouchIn.gas); br = Math.max(br, TouchIn.brk); hand = Math.max(hand, TouchIn.hand); nit = nit || !!TouchIn.nit;
  let pads = null; try { pads = navigator.getGamepads ? navigator.getGamepads() : null; } catch (er) { pads = null; } let gp = null; if (pads) for (const p of pads) if (p && p.connected) { gp = p; break; }
  if (gp) {
    const ax = Math.abs(gp.axes[0]) > 0.1 ? gp.axes[0] : 0; if (ax) { st = -ax; analog = true; }
    const bv = (i) => (gp.buttons[i] ? gp.buttons[i].value || (gp.buttons[i].pressed ? 1 : 0) : 0);
    th = Math.max(th, bv(7)); br = Math.max(br, bv(6)); hand = Math.max(hand, bv(0)); nit = nit || bv(1) > 0.5 || bv(5) > 0.5; back = back || bv(4) > 0.5;
    for (const [i, code] of [[3, 'KeyC'], [9, 'Escape'], [8, 'KeyM'], [2, 'KeyE']]) { const on = bv(i) > 0.5; if (on && !padPrev[i]) onKey(code); padPrev[i] = on; }
  }
  if (Mi && Mi.phase === 'countdown') { th = 0; br = 1; hand = 1; nit = false; st = 0; }
  if (c.wrecked > 0) { th = 0; br = 1; hand = 1; nit = false; st = 0; }
  if (Police.hold || Race.hold) { th = 0; br = 1; hand = 1; nit = false; st = 0; }
  if (devOn('free')) { th = 0; br = 0; hand = 0; st = 0; nit = false; }
  if (GAR.edit) { th = 0; br = 1; hand = 1; st = 0; nit = false; }
  const spd = Math.abs(c.speed);
  const rate = analog || TouchIn.l || TouchIn.r ? 5 : lerp(3.4, 1.7, clamp(spd / 40, 0, 1)) * (Math.sign(st) !== Math.sign(c.steer) && c.steer !== 0 ? 1.7 : 1) * (st === 0 ? 1.5 : 1);
  c.steerIn = clamp(st, -1, 1); c.steer = approach(c.steer, c.steerIn, rate * dt);
  c.thr = approach(c.thr, th, (th > c.thr ? 5 : 9) * dt); c.brk = approach(c.brk, br, (br > c.brk ? 7 : 12) * dt);
  c.hand = hand; c.nit = nit; Cam.back = back;
}
