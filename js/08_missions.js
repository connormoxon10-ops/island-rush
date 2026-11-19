/* ================= MISSIONS ================= */
const MT = {
  sprint: { name: 'Highway Sprint', col: '#ffb02e', ico: '⚡', blurb: 'Beat the clock to the next town. Every checkpoint adds time.' },
  race: { name: 'Street Race', col: '#ff4d5e', ico: '🏁', blurb: 'Race a rival to the finish line. First across wins.' },
  radar: { name: 'Speed Trap', col: '#33d4ff', ico: '📡', blurb: 'Blast through the speed cameras above the required speed.' },
  delivery: { name: 'Courier Run', col: '#4be08a', ico: '📦', blurb: 'Deliver fragile cargo across the island. Crashes cost you.' },
  drift: { name: 'Drift Zone', col: '#c07bff', ico: '🌀', blurb: 'Score drift points inside the zone before time runs out.' },
  rally: { name: 'Off-Road Rally', col: '#ff8a3d', ico: '⛰', blurb: 'Hit every checkpoint across rough terrain, no roads required.' }
};
const missions = [];
let Mi = null;
const Target = { on: false, x: 0, z: 0, label: '' };
const GPS = { pts: null, t: 0 };
const Waypoint = { on: false, x: 0, z: 0 };
const _mp = {};

function routePos(m, s, out) { const r = m.road; roadPoint(r, m.dir > 0 ? s : r.len - s, out); if (m.dir < 0) { out.tx = -out.tx; out.tz = -out.tz; } return out; }
function nearestTownIdx(x, z) { let b = 0, bd = 1e12; towns.forEach((t, i) => { const d = (t.cx - x) ** 2 + (t.cz - z) ** 2; if (d < bd) { bd = d; b = i; } }); return b; }

function genMissions() {
  const hw = links.slice(); let id = 0;
  const route = (type, link, dir, k) => {
    const r = roads[link.road], A = towns[dir > 0 ? link.a : link.b], B = towns[dir > 0 ? link.b : link.a];
    const m = { id: 'm' + (id++), type, road: r, dir, from: A.name, to: B.name, cps: [], s0: 50 };
    const sEnd = r.len - 14, span = sEnd - m.s0;
    routePos(m, 28, _mp); m.x = _mp.x; m.z = _mp.z; m.h = _mp.h;
    if (type === 'radar') {
      const sp = [150, 172, 195].map((v) => v + (k % 3) * 8);
      [0.25, 0.55, 0.85].forEach((f, i) => { routePos(m, m.s0 + span * f, _mp); m.cps.push({ x: _mp.x, z: _mp.z, h: _mp.h, r: 15, s: m.s0 + span * f, tx: _mp.tx, tz: _mp.tz, speed: sp[i], gantry: true }); });
      routePos(m, sEnd, _mp); m.cps.push({ x: _mp.x, z: _mp.z, h: _mp.h, r: 20, s: sEnd, tx: _mp.tx, tz: _mp.tz, finish: true });
      m.limit = span / 34 + 20; m.reward = 650 + Math.round(span / 8); m.title = 'Speed Trap: ' + A.name + ' → ' + B.name;
    } else {
      const n = Math.max(3, Math.round(span / 240));
      for (let i = 1; i <= n; i++) { const s = m.s0 + span * i / n; routePos(m, s, _mp); m.cps.push({ x: _mp.x, z: _mp.z, h: _mp.h, r: 18, s, tx: _mp.tx, tz: _mp.tz, finish: i === n }); }
      if (type === 'sprint') { m.limit = span / 42 + 12; m.bonus = 3; m.reward = 450 + Math.round(span / 7); m.title = 'Highway Sprint: ' + A.name + ' → ' + B.name; }
      else { m.rivalV = 44 + (k % 4) * 2.5; m.limit = span / 28 + 15; m.reward = 800 + Math.round(span / 6); m.title = 'Street Race: ' + A.name + ' → ' + B.name; }
    }
    m.desc = MT[type].blurb + ' (' + Math.round(r.len) + ' m)'; missions.push(m);
  };
  hw.forEach((l, k) => { const t = ['sprint', 'race', 'radar', 'sprint'][k % 4]; route(t, l, (k % 2 === 0) ? 1 : -1, k); });
  if (hw.length > 2) { route('race', hw[0], -1, 5); route('radar', hw[1], 1, 4); }
  const nT = towns.length;
  for (let k = 0; k < 3; k++) {
    const i = (k * 2) % nT, j = (i + 3) % nT, A = towns[i], B = towns[j]; const tp = townPath(i, j);
    const m = { id: 'm' + (id++), type: 'delivery', from: A.name, to: B.name, x: A.cx + A.cell, z: A.cz + A.cell, h: A.baseH, cps: [{ x: B.cx, z: B.cz - B.cell, h: B.baseH, r: 18, finish: true }] };
    m.limit = (tp.dist + 500) / 30 + 45; m.reward = 500 + Math.round(tp.dist / 7); m.title = 'Courier Run: ' + A.name + ' → ' + B.name; m.desc = MT.delivery.blurb; missions.push(m);
  }
  for (let k = 0; k < 2; k++) {
    const A = towns[(k * 3 + 1) % nT];
    missions.push({ id: 'm' + (id++), type: 'drift', from: A.name, to: A.name, x: A.cx, z: A.cz + A.cell * 2, h: A.baseH, cps: [], zone: 300, target: 2500 + k * 2000, limit: 80 + k * 10, reward: 550 + k * 300, title: 'Drift Zone: ' + A.name, desc: MT.drift.blurb });
  }
  /* rallies */
  const rr = mulberry32(8812); let made = 0;
  for (let tries = 0; tries < 1500 && made < 2; tries++) {
    const a = rr() * TAU, d = Math.sqrt(rr()) * 1900, cx = Math.cos(a) * d, cz = Math.sin(a) * d, h0 = rawHeight(cx, cz);
    if (h0 < 25 || h0 > 85) continue; if (towns.some((t) => Math.hypot(t.cx - cx, t.cz - cz) < 450)) continue;
    const R = 300 + rr() * 150, pts = []; let ok = true;
    for (let k = 0; k < 8; k++) { const aa = k * TAU / 8 + rr() * 0.3, x = cx + Math.cos(aa) * R * (0.8 + rr() * 0.4), z = cz + Math.sin(aa) * R * (0.8 + rr() * 0.4), h = terrainHeight(x, z); if (h < 4 || townAt(x, z, 80)) { ok = false; break; } nearestRoad(x, z); pts.push({ x, z, h }); }
    if (!ok) continue; let len = 0; for (let k = 0; k < 8; k++) len += Math.hypot(pts[k].x - pts[(k + 1) % 8].x, pts[k].z - pts[(k + 1) % 8].z);
    const cps = []; for (let k = 1; k <= 8; k++) { const p = pts[k % 8]; cps.push({ x: p.x, z: p.z, h: p.h, r: 22, finish: k === 8 }); }
    const near = towns[nearestTownIdx(cx, cz)];
    missions.push({ id: 'm' + (id++), type: 'rally', from: near.name + ' hills', to: 'Loop', x: pts[0].x, z: pts[0].z, h: pts[0].h, cps, limit: len / 13 + 25, bonus: 5, reward: 900 + Math.round(len / 5), title: 'Off-Road Rally: ' + near.name + ' Hills', desc: MT.rally.blurb + ' (' + Math.round(len) + ' m)' }); made++;
  }
  missions.forEach((m) => { m.rep = 25; });
}

/* ---------------- world markers & checkpoint visuals ---------------- */
const MView = { markers: [], cp: null };
function iconSprite(ico, col) {
  const c = mkCanvas(128, 128), g = c.getContext('2d');
  g.fillStyle = 'rgba(8,12,20,0.85)'; g.beginPath(); g.arc(64, 64, 58, 0, TAU); g.fill(); g.lineWidth = 8; g.strokeStyle = col; g.stroke();
  g.font = '56px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText(ico, 64, 70);
  const t = canvasTex(c, true, false); const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthWrite: false, fog: false, transparent: true })); s.scale.set(10, 10, 1); return s;
}
function makeBeam(col, radius, height) {
  const mat = new THREE.MeshBasicMaterial({ map: MAT.beam, color: new THREE.Color(col).convertSRGBToLinear().multiplyScalar(1.15), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  /* soft edges: fade the cylinder where its surface turns edge-on to the viewer */
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = 'varying vec3 vBN; varying vec3 vBV;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n vBN = normalize(normalMatrix * normal); vBV = -mvPosition.xyz;');
    sh.fragmentShader = 'varying vec3 vBN; varying vec3 vBV;\n' + sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n diffuseColor.a *= pow(abs(dot(normalize(vBN), normalize(vBV))), 1.6);');
  };
  const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 20, 1, true), mat);
  m.position.y = height / 2; return m;
}
function initMarkers() {
  const grp = new THREE.Group(); scene.add(grp); MView.group = grp;
  missions.forEach((m) => {
    const t = MT[m.type], g = new THREE.Group(); g.position.set(m.x, m.h + 0.2, m.z);
    const beam = makeBeam(t.col, 3.2, 260); g.add(beam);
    const ring = new THREE.Mesh(new THREE.RingGeometry(10.5, 12, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(t.col).convertSRGBToLinear().multiplyScalar(2.4), side: THREE.DoubleSide, transparent: true, opacity: 0.9, depthWrite: false, fog: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.25; g.add(ring);
    const spr = iconSprite(t.ico, t.col); spr.position.y = 22; g.add(spr);
    grp.add(g); MView.markers.push({ m, g, beam, ring, spr });
  });
}
function makeCP(col) {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(col).convertSRGBToLinear().multiplyScalar(2.6), fog: false });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.045, 8, 48), mat); ring.position.y = 0; g.add(ring);
  const beam = makeBeam(col, 1.4, 160); g.add(beam); g.userData = { ring, beam, mat }; return g;
}
function gantryMesh(w) {
  const g = new THREE.Group(), mat = new THREE.MeshStandardMaterial({ color: lc(0x6b7480), roughness: 0.6, metalness: 0.5 });
  for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.6, 8.5, 0.6), mat); p.position.set(s * w, 4.25, 0); g.add(p); }
  const b = new THREE.Mesh(new THREE.BoxGeometry(w * 2 + 0.6, 1.4, 0.8), mat); b.position.y = 8.5; g.add(b);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.1), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 2.4, 3.0), fog: false })); sign.position.set(0, 8.5, 0.42); g.add(sign);
  const flash = new THREE.Mesh(new THREE.PlaneGeometry(w * 2, 8.5), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 4, 4), transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, fog: false })); flash.position.set(0, 4.25, 0); g.add(flash);
  g.userData.flash = flash; return g;
}
function updateMarkerVis(dt, time) {
  const c = Pl;
  for (const mk of MView.markers) {
    const done = save.done[mk.m.id]; const dist = Math.hypot(mk.m.x - c.x, mk.m.z - c.z);
    mk.g.visible = !Mi;
    mk.beam.material.opacity = lerp(0.03, 0.9, sstep(15, 300, dist)) * (done ? 0.5 : 1);
    mk.spr.scale.setScalar(clamp(dist / 55, 7, 34)); mk.spr.position.y = 16 + clamp(dist / 55, 7, 34) * 0.4;
    mk.ring.scale.setScalar(1 + Math.sin(time * 3) * 0.04);
    mk.spr.material.opacity = done ? 0.65 : 1;
  }
  if (Mi && MView.cp) {
    const cp = Mi.cps[Mi.idx]; MView.cp.visible = Mi.phase !== 'done' && !!cp;
    if (cp) {
      const u = MView.cp.userData; MView.cp.position.set(cp.x, cp.h + 0.4, cp.z);
      MView.cp.rotation.y = cp.tx !== undefined ? Math.atan2(cp.tx, cp.tz) : Math.atan2(car.x - cp.x, car.z - cp.z);
      const dist = Math.hypot(cp.x - car.x, cp.z - car.z); u.beam.material.opacity = clamp(dist / 400, 0.35, 1); u.ring.scale.setScalar(cp.r * 0.75); u.ring.position.y = cp.r * 0.6;
    }
  }
  if (Mi && MView.cp2) {
    const cp = Mi.cps[Mi.idx + 1]; MView.cp2.visible = !!cp && Mi.phase !== 'done';
    if (cp) { MView.cp2.position.set(cp.x, cp.h + 0.4, cp.z); MView.cp2.rotation.y = cp.tx !== undefined ? Math.atan2(cp.tx, cp.tz) : Math.atan2(car.x - cp.x, car.z - cp.z); MView.cp2.userData.ring.scale.setScalar(cp.r * 0.6); MView.cp2.userData.ring.position.y = cp.r * 0.5; MView.cp2.userData.beam.material.opacity = 0.15; }
  }
  if (Mi && Mi.gantries) for (const g of Mi.gantries) { const f = g.userData.flash; if (f.material.opacity > 0) f.material.opacity = Math.max(0, f.material.opacity - dt * 3); }
}

/* ---------------- GPS ---------------- */
function computeRoute(px, pz, tx, tz) {
  const tS = nearestTownIdx(px, pz), tE = nearestTownIdx(tx, tz);
  if (tS === tE) return [{ x: px, z: pz }, { x: tx, z: tz }];
  const tp = townPath(tS, tE); const pts = [{ x: px, z: pz }];
  for (const hop of tp.hops) { const l = links[hop.link], r = roads[l.road], arr = (l.a === hop.from) ? r.pts : r.pts.slice().reverse(); for (const p of arr) pts.push({ x: p.x, z: p.z }); }
  pts.push({ x: tx, z: tz }); return pts;
}
function updateGPS(dt) {
  GPS.t -= dt; if (GPS.t > 0) return; GPS.t = 1.2;
  let tg = null;
  if (Mi && Mi.phase !== 'done') { const cp = Mi.cps[Mi.idx]; if (cp) tg = { x: cp.x, z: cp.z, label: Mi.type === 'radar' && cp.gantry ? 'Speed camera' : (cp.finish ? 'Finish' : 'Checkpoint') }; }
  else if (Waypoint.on) tg = { x: Waypoint.x, z: Waypoint.z, label: 'Waypoint' };
  if (tg) { Target.on = true; Target.x = tg.x; Target.z = tg.z; Target.label = tg.label; GPS.pts = (!Mi || Mi.type === 'delivery') ? computeRoute(car.x, car.z, tg.x, tg.z) : null; }
  else { Target.on = false; GPS.pts = null; }
}

/* ---------------- mission runtime ---------------- */
function missionBest(m) { const d = save.done[m.id]; return d ? d : null; }
function startMission(def) {
  if (Mi) return;
  if (Wanted.stars > 0 && !devOn('god')) { UI.toast('Lose the police first', 'bad'); return; }
  Mi = { def, type: def.type, cps: def.cps, idx: 0, phase: 'countdown', cd: 3.4, t: 0, left: def.limit, integrity: 100, score: 0, combo: 0, comboT: 0, driftBank: 0, hits: 0, speeds: [], rival: null, gantries: [] };
  if (def.type === 'drift') { Mi.zone = { x: def.x, z: def.z, r: def.zone }; }
  MView.cp = makeCP(MT[def.type].col); MView.cp2 = makeCP('#ffffff'); MView.cp2.userData.beam.visible = true; scene.add(MView.cp, MView.cp2);
  if (def.type === 'radar') def.cps.forEach((cp) => { if (!cp.gantry) return; const g = gantryMesh(8); g.position.set(cp.x, cp.h, cp.z); g.rotation.y = Math.atan2(cp.tx, cp.tz) ; scene.add(g); Mi.gantries.push(g); cp.mesh = g; });
  if (def.type === 'race') {
    const m = def; routePos(m, m.s0 - 25, _mp);
    const d = { kind: 'rival', road: m.road, dir: m.dir, lane: -1.2, s: m.dir > 0 ? m.s0 - 25 : m.road.len - (m.s0 - 25), v: 0, vt: 0, rs: m.s0 - 25, x: _mp.x, z: _mp.z };
    d.mesh = buildCarMesh(0xd62828, 0); d.hl = 2; scene.add(d.mesh); placeDyn(d); Dyn.extra.push(d); Mi.rival = d;
  }
  UI.banner(MT[def.type].name.toUpperCase(), def.title.replace(/^[^:]+: /, ''));
  Snd.beep(660, 0.12); GPS.t = 0; Mi.start = { x: car.x, z: car.z };
}
function endMission(ok, title, lines, reward) {
  if (!Mi || Mi.phase === 'done') return;
  Mi.phase = 'done'; const def = Mi.def;
  if (ok) { const rp = Rel.perk('reward'); if (rp > 0) { const ex = Math.round(reward * rp / 5) * 5; if (ex > 0) { reward += ex; lines.push('Inside tips from friends +' + money(ex)); } } }
  let stars = 0;
  if (ok) {
    stars = Mi.stars || 1; const bonus = reward;
    save.money += bonus; save.rep += def.rep + stars * 10;
    const prev = save.done[def.id]; const rec = prev || { stars: 0, best: null };
    rec.stars = Math.max(rec.stars, stars); if (def.type !== 'drift' && def.type !== 'radar' && (rec.best == null || Mi.t < rec.best)) rec.best = Mi.t; if (def.type === 'drift' && (rec.best == null || Mi.score > rec.best)) rec.best = Mi.score;
    save.done[def.id] = rec; writeSave(); Snd.win();
  } else Snd.fail();
  UI.result(ok, title, lines, ok ? reward : 0, stars);
  if (Mi.rival) { removeDyn(Mi.rival); Dyn.extra.length = 0; }
  if (MView.cp) { scene.remove(MView.cp, MView.cp2); MView.cp = MView.cp2 = null; }
  if (Mi.gantries) Mi.gantries.forEach((g) => scene.remove(g));
  Mi = null;
}
function abortMission() { if (Mi && Mi.phase !== 'done') endMission(false, 'MISSION ABORTED', ['You abandoned the run.'], 0); }
function fmtT(t) { t = Math.max(0, t); const m = Math.floor(t / 60), s = Math.floor(t % 60), ds = Math.floor((t * 10) % 10); return m + ':' + String(s).padStart(2, '0') + '.' + ds; }

function updateMission(dt) {
  const c = car;
  if (!Mi) {
    /* proximity prompt for mission starts */
    let near = null, nd = 1e9;
    if (!Foot.on && !Fly.on && !Boat.on) for (const mk of MView.markers) { const d = Math.hypot(mk.m.x - c.x, mk.m.z - c.z); if (d < 18 && d < nd && Math.abs(c.y - mk.m.h) < 8) { near = mk.m; nd = d; } }
    Mission.nearby = near; return;
  }
  Mission.nearby = null;
  if (Mi.phase === 'done') return;
  if (Mi.phase === 'countdown') {
    const prev = Math.ceil(Mi.cd); Mi.cd -= dt; const now = Math.ceil(Mi.cd);
    if (now !== prev && now >= 0) { if (now > 0) { UI.big(String(now)); Snd.beep(520, 0.1); } else { UI.big('GO!'); Snd.beep(880, 0.25); } }
    if (Mi.cd <= 0) { Mi.phase = 'run'; if (Mi.rival) Mi.rival.vt = 1; }
    return;
  }
  Mi.t += dt; Mi.left -= dt;
  const type = Mi.type, cp = Mi.cps[Mi.idx];
  /* rival AI */
  if (Mi.rival) {
    const rv = Mi.rival, def = Mi.def; const sPlayer = cp ? (cp.s - Math.hypot(cp.x - c.x, cp.z - c.z)) : def.s0;
    const gap = sPlayer - rv.rs; const target = def.rivalV * (1 + clamp(gap / 100, -0.06, 0.3)) * (1 + 0.04 * Math.sin(Mi.t * 0.35));
    const slow = rv.stun > 0 ? 0.2 : 1; rv.stun = Math.max(0, (rv.stun || 0) - dt); rv.lane += (-1.2 - rv.lane) * Math.min(1, dt * 1.1);
    rv.vtt = target * slow; rv.v += clamp(rv.vtt - rv.v, -10 * dt, 8 * dt); rv.rs += rv.v * dt; rv.s = def.dir > 0 ? rv.rs : def.road.len - rv.rs; placeDyn(rv);
    if (rv.rs >= def.road.len - 14) return endMission(false, 'RIVAL WON', ['Your rival crossed the line first.'], 0);
  }
  if (type === 'drift') {
    const dd = Math.hypot(c.x - Mi.zone.x, c.z - Mi.zone.z); Mi.inZone = dd < Mi.zone.r;
    if (c.drifting && Mi.inZone && !c.air) { const pts = c.driftAng * Math.abs(c.speed) * 14 * dt * (1 + Mi.combo * 0.25); Mi.driftBank += pts; Mi.comboT = 1.6; }
    else if (Mi.comboT > 0) { Mi.comboT -= dt; if (Mi.comboT <= 0) { Mi.score += Mi.driftBank * (1 + Mi.combo * 0.2); if (Mi.driftBank > 60) { Mi.combo = Math.min(Mi.combo + 1, 8); UI.toast('DRIFT +' + Math.round(Mi.driftBank), 'good'); } Mi.driftBank = 0; } }
    if (Mi.score >= Mi.def.target) { Mi.stars = Mi.left > Mi.def.limit * 0.4 ? 3 : Mi.left > Mi.def.limit * 0.15 ? 2 : 1; return endMission(true, 'DRIFT MASTER', ['Score ' + Math.round(Mi.score), 'Time ' + fmtT(Mi.t)], Math.round(Mi.def.reward * (0.7 + 0.3 * Mi.stars))); }
  } else if (cp) {
    const d = Math.hypot(cp.x - c.x, cp.z - c.z);
    if (d < cp.r + (cp.gantry ? 4 : 0)) {
      if (cp.gantry) {
        const kmh = Math.abs(c.speed) * 3.6; const ok = kmh >= cp.speed; Mi.speeds.push(Math.round(kmh)); if (ok) Mi.hits++; if (cp.mesh) cp.mesh.userData.flash.material.opacity = 0.9;
        UI.toast(ok ? 'CAPTURED ' + Math.round(kmh) + ' km/h' : 'TOO SLOW ' + Math.round(kmh) + ' / ' + cp.speed, ok ? 'good' : 'bad'); Snd.beep(ok ? 1000 : 300, 0.15);
      } else { Snd.beep(900, 0.1); if (type === 'sprint' || type === 'rally') { Mi.left += Mi.def.bonus; UI.toast('CHECKPOINT +' + Mi.def.bonus + 's', 'good'); } else if (!cp.finish) UI.toast('CHECKPOINT', 'good'); }
      Mi.idx++;
      if (Mi.idx >= Mi.cps.length) return finishMission();
    }
  }
  if (type === 'delivery' && Mi.integrity <= 0) return endMission(false, 'CARGO DESTROYED', ['The package was wrecked.'], 0);
  if (Mi.left <= 0) return endMission(false, 'TIME UP', ['You ran out of time.'], 0);
}
function finishMission() {
  const def = Mi.def, type = Mi.type, ratio = Mi.left / def.limit; let stars = ratio > 0.3 ? 3 : ratio > 0.12 ? 2 : 1, title = 'COMPLETE', lines = [];
  let reward = def.reward;
  if (type === 'radar') { if (Mi.hits < 2) return endMission(false, 'TRAP MISSED', ['Cameras captured ' + Mi.hits + ' of 3. Need at least 2.'], 0); stars = Mi.hits === 3 ? 3 : 2; lines.push('Captured ' + Mi.hits + '/3 · ' + Mi.speeds.join(' / ') + ' km/h'); title = 'TRAP CLEARED'; }
  else if (type === 'race') { const gap = Mi.rival ? (Mi.def.road.len - Mi.rival.rs) : 0; stars = gap > 150 ? 3 : gap > 40 ? 2 : 1; title = 'YOU WON'; lines.push('Margin ' + Math.round(gap) + ' m'); }
  else if (type === 'delivery') { const q = Mi.integrity; stars = q > 85 ? 3 : q > 55 ? 2 : 1; reward = Math.round(reward * (0.5 + 0.5 * q / 100)); title = 'DELIVERED'; lines.push('Cargo condition ' + Math.round(q) + '%'); }
  lines.push('Time ' + fmtT(Mi.t)); Mi.stars = stars; reward = Math.round(reward * (0.7 + 0.3 * stars));
  endMission(true, title, lines, reward);
}
function onMissionCrash(sev) { if (Mi && Mi.phase === 'run' && Mi.type === 'delivery') Mi.integrity = Math.max(0, Mi.integrity - sev * 3.2); }
const Mission = { nearby: null };
