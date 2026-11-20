/* ================= VITALS: health, stamina, food, water, intoxication =================
   You (not the car) have five bars, shown bottom left:
   - HEALTH: lost by bailing out of a moving vehicle (the faster, the worse), being hit by a car, a fist fight, a bad fall, a hard crash
     (on a bike a crash throws you off), and by starving or going thirsty. It comes back slowly while you are fed and watered. At zero you
     black out and wake up patched up at the nearest town's hospital, a little poorer.
   - STAMINA: running and jumping use it, standing still brings it back. Run it flat and you are winded: no running until you get some back.
     Hunger and thirst slow the recovery.
   - FOOD and WATER: they run down as you play (faster when you run). Eat and drink in cafés, diners, restaurants, shops and bars.
     Low, and you are warned; empty, and your health drains.
   - INTOXICATION: drinks at the bar (and the casino) put it up, time brings it down. Tipsy, the picture swims a little; drunk, your
     steering wanders, you walk crooked and you may trip; at the top you pass out.
   F while moving no longer asks you to stop: you throw yourself out and roll, and the car (or bike) carries on without you. */
const Vit = { hp: 100, st: 100, food: 100, water: 100, drunk: 0, hurtT: 0, winded: false, dead: false, deadT: 0, el: null, ph: 0, warned: {}, bailT: 0, last: '' };
const VIT = { food: 2.2, water: 3.4, sober: 0.2, starve: 0.35, regen: 0.45, run: 13, rest: 17, jump: 8, punch: 4 };
Vit.load = function () {
  const s = save.vit; if (s && typeof s === 'object') { for (const k of ['hp', 'food', 'water', 'drunk']) if (isFinite(+s[k])) Vit[k] = clamp(+s[k], 0, 100); if (Vit.hp < 5) Vit.hp = 40; }
  Vit.st = 100; Vit.dead = false; Vit.store();
};
Vit.store = function () { const s = save.vit || (save.vit = {}); s.hp = Math.round(Vit.hp * 10) / 10; s.food = Math.round(Vit.food * 10) / 10; s.water = Math.round(Vit.water * 10) / 10; s.drunk = Math.round(Vit.drunk * 10) / 10; };

/* ---------- the panel ---------- */
const VIT_ROWS = [['hp', 'HEALTH', '#46d17a'], ['st', 'STAMINA', '#f2c94c'], ['food', 'FOOD', '#f2994a'], ['water', 'WATER', '#4ab3f2'], ['drunk', 'DRUNK', '#b06ef2']];
Vit.init = function () {
  if (Vit.el) return; const hud = document.getElementById('hud'); if (!hud) return;
  const css = document.createElement('style');
  css.textContent = '#vit{left:max(16px,env(safe-area-inset-left,0px));bottom:16px;width:214px;background:var(--panel);padding:8px 14px 10px 16px;display:grid;gap:5px}' +
    '#vit .vr{display:grid;grid-template-columns:62px 1fr 26px;align-items:center;gap:7px;font-size:10.5px;letter-spacing:.12em;color:var(--dim)}' +
    '#vit .vr i{height:7px;background:rgba(255,255,255,.12);position:relative;display:block}#vit .vr i b{position:absolute;inset:0 auto 0 0;width:50%;transition:width .15s}' +
    '#vit .vr em{font-style:normal;text-align:right;font-variant-numeric:tabular-nums;color:var(--fg);font-size:11px;letter-spacing:0}' +
    '#vit .vr.low{color:#ff6a5a}#vit .vr.low i b{animation:pulse .6s infinite alternate}#vit .vr.off{opacity:.45}' +
    '#vit.dead{opacity:.4}#vitFx{position:fixed;inset:0;pointer-events:none;z-index:3;opacity:0;transition:opacity .3s;background:radial-gradient(ellipse at center,rgba(0,0,0,0) 45%,rgba(150,0,0,.55) 100%)}' +
    '#vitBlack{position:fixed;inset:0;pointer-events:none;z-index:40;background:#000;opacity:0;display:grid;place-items:center;color:#d8d8d8;font:700 46px/1 var(--display,sans-serif);letter-spacing:.2em}' +
    'body.touch #vit{bottom:auto;top:16px;left:50%;transform:translateX(-50%);width:200px;padding:5px 10px 6px;gap:3px}body.touch #vit .vr{grid-template-columns:52px 1fr 22px;font-size:9px}';
  document.head.appendChild(css);
  const el = Vit.el = document.createElement('div'); el.id = 'vit'; el.className = 'cham';
  el.innerHTML = VIT_ROWS.map(([k, n, c]) => '<div class="vr" data-k="' + k + '">' + n + '<i><b style="background:' + c + '"></b></i><em>0</em></div>').join(''); hud.appendChild(el);
  Vit.rows = {}; for (const r of el.querySelectorAll('.vr')) Vit.rows[r.dataset.k] = { r, b: r.querySelector('b'), n: r.querySelector('em'), v: -1, low: null };
  const fx = document.createElement('div'); fx.id = 'vitFx'; document.body.appendChild(fx); Vit.fxEl = fx;
  const bk = document.createElement('div'); bk.id = 'vitBlack'; document.body.appendChild(bk); Vit.black = bk;
};
Vit.hud = function () {
  if (!Vit.el) Vit.init(); if (!Vit.el) return;
  for (const [k] of VIT_ROWS) {
    const R = Vit.rows[k], v = Math.round(Vit[k]); if (R.v !== v) { R.v = v; R.b.style.width = v + '%'; R.n.textContent = v; }
    const low = k === 'drunk' ? Vit.drunk > 60 : k === 'st' ? Vit.winded : v < 20; if (R.low !== low) { R.low = low; R.r.classList.toggle('low', low); }
    if (k === 'drunk') R.r.classList.toggle('off', v < 1);
  }
  const hurt = Vit.dead ? 0 : Vit.hp < 30 ? 0.35 + 0.35 * Math.abs(Math.sin(App.time * 3)) * (1 - Vit.hp / 30) : 0; if (Vit.fxEl) Vit.fxEl.style.opacity = hurt.toFixed(2);
  const cv = renderer && renderer.domElement, blur = Vit.drunk > 25 ? (Vit.drunk - 25) / 75 * 2.2 : 0, key = blur.toFixed(1);
  if (cv && cv.__vitBlur !== key) { cv.__vitBlur = key; cv.style.filter = blur > 0.05 ? 'blur(' + key + 'px) saturate(' + (1 + blur * 0.25).toFixed(2) + ')' : ''; }
};

/* ---------- each step ---------- */
Vit.update = function (dt) {
  if (Vit.dead) { Vit.deadStep(dt); Vit.hud(); return; }
  if (App.mode !== 'play') { Vit.hud(); return; }
  const god = devOn('god'), m = dt / 60, running = Foot.on && Foot.state === 'walk' && Foot.speed > 3.6;
  Vit.food = Math.max(0, Vit.food - VIT.food * m * (running ? 1.6 : 1));
  Vit.water = Math.max(0, Vit.water - VIT.water * m * (running ? 1.8 : 1));
  Vit.drunk = Math.max(0, Vit.drunk - VIT.sober * dt);
  /* stamina */
  if (running) Vit.st = Math.max(0, Vit.st - VIT.run * dt * (1 + Vit.drunk / 200));
  else Vit.st = Math.min(100, Vit.st + VIT.rest * dt * (Vit.food < 15 || Vit.water < 15 ? 0.45 : 1) * (Foot.on && Foot.speed > 0.5 ? 0.6 : 1));
  if (Vit.st <= 0.5) { if (!Vit.winded) UI.toast('Out of breath', 'bad'); Vit.winded = true; } else if (Vit.st > 30) Vit.winded = false;
  /* health */
  Vit.hurtT -= dt; Vit.bailT -= dt;
  const empty = (Vit.food <= 0 ? 1 : 0) + (Vit.water <= 0 ? 1 : 0);
  if (empty && !god) Vit.hurt(VIT.starve * empty * dt, Vit.water <= 0 ? 'Dehydration' : 'Starvation', true);
  else if (Vit.hurtT <= 0 && Vit.food > 30 && Vit.water > 30 && Vit.hp < 100) Vit.hp = Math.min(100, Vit.hp + VIT.regen * dt);
  if (god) { Vit.hp = 100; Vit.st = 100; Vit.winded = false; }
  /* warnings, once each way down */
  const warn = (k, at, msg, kind) => { const id = k + at; if (Vit[k] < at && !Vit.warned[id]) { Vit.warned[id] = true; UI.toast(msg, kind || 'bad'); } else if (Vit[k] > at + 8) Vit.warned[id] = false; };
  warn('food', 25, 'You are getting hungry: eat something (cafés, diners, shops)'); warn('food', 8, 'Starving! Eat now or you will start losing health');
  warn('water', 25, 'You are thirsty: get a drink'); warn('water', 8, 'Parched! Drink something or you will start losing health');
  if (Vit.drunk > 30 && !Vit.warned.tipsy) { Vit.warned.tipsy = true; UI.toast('You feel tipsy', 'info'); } else if (Vit.drunk < 20) Vit.warned.tipsy = false;
  if (Vit.drunk > 60 && !Vit.warned.drunk) { Vit.warned.drunk = true; UI.toast('You are drunk: driving now is a very bad idea', 'bad'); } else if (Vit.drunk < 50) Vit.warned.drunk = false;
  if (Vit.drunk >= 100 && !god) { Vit.drunk = 85; Vit.die('You drank yourself unconscious'); return; }
  /* drunk on foot: now and then you trip */
  Vit.ph += dt * (0.8 + Vit.drunk / 120);
  if (Foot.on && Foot.state === 'walk' && Vit.drunk > 60 && Foot.speed > 2 && Math.random() < dt * 0.12 * (Vit.drunk - 60) / 40) Vit.trip();
  Vit.store(); Vit.hud();
};
/* the drunk wander, for walking (added to the sideways input) and driving (added to the steering) */
Vit.wander = function () { const d = Vit.drunk / 100; return d < 0.15 ? 0 : (Math.sin(Vit.ph * 1.7) * 0.7 + Math.sin(Vit.ph * 0.53 + 1.3) * 0.5) * (d - 0.1); };
Vit.drive = function (c) { const w = Vit.wander(); if (w) c.steer = clamp(c.steer + w * 0.18, -1, 1); };
Vit.walk = function (I) { const w = Vit.wander(); if (w && (I.f || I.r)) I.r = clamp(I.r + w * 0.8, -1, 1); if (Vit.winded) I.run = false; };
/* the world sways a little when you have had a few (after the camera is placed) */
Vit.cam = function () {
  if (Vit.drunk < 10 || Vit.dead) return; const d = (Vit.drunk - 10) / 90, t = App.time;
  camera.rotation.z += Math.sin(t * 0.9) * 0.05 * d; camera.position.y += Math.sin(t * 1.3) * 0.06 * d; camera.rotateY(Math.sin(t * 0.61 + 1) * 0.03 * d);
};

/* ---------- getting hurt ---------- */
Vit.hurt = function (n, why, quiet) {
  if (Vit.dead || !(n > 0) || devOn('god') || App.mode !== 'play') return 0;
  Vit.hp = Math.max(0, Vit.hp - n); Vit.hurtT = 8; Vit.last = why || Vit.last;
  if (!quiet) { App.dmg = Math.min(1, App.dmg + Math.min(0.8, n / 40)); Cam.shake = Math.max(Cam.shake, Math.min(1.6, n / 25)); }
  if (Vit.hp <= 0) Vit.die(why);
  return n;
};
Vit.eat = function (food, water, drunk, st) {
  Vit.food = clamp(Vit.food + (food || 0), 0, 100); Vit.water = clamp(Vit.water + (water || 0), 0, 100); Vit.drunk = clamp(Vit.drunk + (drunk || 0), 0, 100);
  if (st) Vit.st = clamp(Vit.st + st, 0, 100); Vit.store(); Vit.hud();
};
/* tripping over your own feet: down for a moment, no harm done */
Vit.trip = function () {
  const F = Foot, P = F.ped; F.state = 'down'; F.downT = 1.6; F.air = true; F.vy = 1.6; P.air = true; P.t = 0; P.tilt = 0; P.spin = (Math.random() < 0.5 ? -1 : 1) * 3; F.hitCool = 2; Fight.t = -1;
  Snd.foot(false, 1.6, true); UI.toast('You tripped over your own feet', 'info');
};

/* ---------- bailing out of a moving vehicle ---------- */
Vit.bail = function (impact) {
  const c = car, sp = Math.max(Math.hypot(c.vx, c.vz), impact || 0), s = Math.sin(c.yaw), co = Math.cos(c.yaw), bike = isBike(CUR), off = bike ? 0.9 : 1.75;
  let pos = null;
  for (const lx of [-off, off, -off * 1.6, off * 1.6]) { const x = c.x + co * lx, z = c.z - s * lx; if (!footBlockedAt(x, z)) { pos = { x, z, lx }; break; } }
  if (!pos) pos = { x: c.x, z: c.z, lx: -off };
  if (!Foot.ped) Foot.ped = footNewPed(); Foot.ped.app = footApp();
  const F = Foot, P = F.ped, kick = pos.lx < 0 ? 1 : -1;   /* thrown out to the side you went out of */
  F.on = true; F.x = pos.x; F.z = pos.z; F.y = c.y + (bike ? 0.9 : 0.6);
  F.vx = c.vx * 0.85 + co * -kick * 2.2; F.vz = c.vz * 0.85 - s * -kick * 2.2; F.vy = 2 + Math.min(4, sp * 0.06);
  F.state = 'down'; F.downT = 0; F.air = true; F.speed = 0; F.dip = 0; F.hitCool = 3;
  P.air = true; P.t = 0; P.tilt = 0; P.spin = (Math.random() < 0.5 ? -1 : 1) * (4 + Math.min(8, sp * 0.15));
  F.prevView = Cam.view; F.tp = Cam.view === 2; F.yaw = c.yaw; F.body = c.yaw; F.pitch = 0; F.camD = 3.4; Cam.lookYaw = Cam.lookPitch = 0;
  c.thr = c.brk = 0; c.hand = 0; c.nit = false; c.steerIn = 0; Vit.bailT = 6;   /* the vehicle rolls on by itself (Foot.parkCar) */
  if (bike) Moto.fallen = kick;
  const kmh = Math.round(sp * 3.6), dmg = sp < 3 ? 0 : Math.min(96, 4 + sp * 1.55 + (impact ? 10 : 0));
  Snd.crash(Math.min(10, 2 + sp * 0.3)); Cam.shake = Math.max(Cam.shake, Math.min(2, 0.4 + sp * 0.04));
  syncPl(); UI.footMode(true);
  UI.toast((impact ? 'Thrown off at ' : 'You bailed out at ') + kmh + ' km/h' + (dmg ? ' · −' + Math.round(dmg) + ' health' : ''), dmg > 25 ? 'bad' : 'info');
  if (dmg) Vit.hurt(dmg, impact ? 'Thrown from the bike' : 'Bailed out at ' + kmh + ' km/h');
};

/* ---------- blacking out, and waking up in hospital ---------- */
Vit.die = function (why) {
  if (Vit.dead) return; Vit.dead = true; Vit.deadT = 0; Vit.hp = 0; Vit.why = why || Vit.last || 'You blacked out';
  Snd.fail(); UI.banner('WASTED', Vit.why); car.thr = 0; car.nit = false;
  if (Mi && Mi.phase !== 'done') endMission(false, 'WASTED', [Vit.why], 0);
};
Vit.deadStep = function (dt) {
  Vit.deadT += dt; if (Vit.black) Vit.black.style.opacity = clamp((Vit.deadT - 1.2) / 1.2, 0, 1).toFixed(2);
  if (Vit.deadT > 3.4) Vit.wake();
};
Vit.wake = function () {
  let T = towns[0], bd = 1e18; for (const t of towns) { const d = (t.cx - Pl.x) ** 2 + (t.cz - Pl.z) ** 2; if (d < bd) { bd = d; T = t; } }
  const fee = Math.min(save.money, 250);
  if (findNearestRoadPoint(T.cx + T.cell * 0.5, T.cz + T.cell * 0.5, _np2)) { const yaw = Math.atan2(_np2.tx, _np2.tz); loadAround(_np2.x, _np2.z, 12); spawnAt(_np2.x, _np2.z, yaw); }
  else if (Foot.on) Foot.board(true);
  if (car.wrecked > 0) { car.wrecked = 0; car.health = Math.max(car.health, 40); }
  save.money -= fee; Vit.dead = false; Vit.hp = 70; Vit.st = 100; Vit.winded = false; Vit.food = Math.max(Vit.food, 45); Vit.water = Math.max(Vit.water, 45); Vit.drunk = 0; Vit.hurtT = 0; Moto.fallen = 0;
  if (Vit.black) Vit.black.style.opacity = '0'; Vit.store(); writeSave();
  UI.toast('You wake up in ' + T.name + ' Hospital, patched up' + (fee ? ' · bill ' + money(fee) : ''), 'info');
};
