/* ================= DESTRUCTION DERBY: the Scrapyard Bowl =================
   An enclosed dirt bowl off the island (like the drag strip and the rally stages) where you and a field of AI bangers ram each other until one car is left.
     arena      a stadium shape (two straights joined by half circles) walled in concrete with a tyre barrier, two tyre islands in the middle, mud
                patches, stands and floodlights. The wall is a real wall: Derby.collide pushes cars off it and a hard hit hurts.
     cars       every car is a full car (the same stepCar physics as yours). Cars collide with each other through Derby.bump: an impulse at the contact point
                (so a hit off-centre spins the car) and damage from the closing speed, scaled by where the car is hit: the engine at the front is the weak
                spot, the boot is the strong one, and a heavier car takes less. Your damage is your car's health (the usual crash damage and dents);
                each rival has its own. At zero a car is out: it stops, smokes, burns, and stays in the arena as wreckage.
     the rule   as in a real derby you must keep making contact: forty seconds without a hit and the officials' clock eats your health.
     rivals     each picks a target (often you), leads it, rams it, backs out when it is pinned or has driven past, and steers off the wall.
     result     last car running wins. Prize money by place, a bonus for every car you put out (the last car to hit a car gets the credit). */
const DD = { X0: -7000, Z0: -7000, Y: 20, A: 34, R: 30, ARMOUR: 0.4 };   /* ARMOUR: the share of crash damage your own car takes in the derby (the rivals take it all) */
const DD_ISL = [[-15, 0, 2.4], [15, 0, 2.4]];   /* tyre islands: x, z, radius */
const DD_PRIZE = [2600, 1200, 600];
const DD_NAMES = ['Crusher Kowalski', 'Big Lou Marchetti', 'Rusty Abernathy', 'Dee "Dent" Okafor', 'Tank Halvorsen', 'Mags Delacroix', 'Boom-Boom Tran', 'Scrap Callahan', 'Hammer Ruiz', 'Patch Whitfield', 'Grit Sorensen', 'Junkyard June'];
const DD_FIELD = ['rook', 'kestrel', 'hauler', 'ridge', 'rook', 'hauler'];
const Derby = { on: false, lobby: false, loading: false, phase: 'off', t: 0, list: [], me: null, el: null, group: null, hidden: [], saved: null, feed: [], hudT: 0 };
const _ddA = [0, 0], _ddB = [0, 0];

Derby.rec = function () { const d = save.derby || (save.derby = {}); for (const k of ['runs', 'wins', 'kills', 'earned', 'best']) d[k] = +d[k] || 0; d.n = [6, 8, 10].includes(d.n) ? d.n : 8; d.car = ['own', 'rook', 'hauler'].includes(d.car) ? d.car : 'rook'; return d; };

/* ---------------- physics hooks ---------------- */
Derby.ground = function (x, z, o) {
  const lx = x - DD.X0, lz = z - DD.Z0, mud = noise2(lx * 0.09 + 3, lz * 0.09 - 7);
  o.h = DD.Y; o.water = false; o.road = false;
  if (Derby.inside(lx, lz) > 0) { o.mu = 0.62; o.rr = 0.08; o.rough = 0.3; o.loose = 0.5; return; }
  if (mud > 0.25) { o.mu = 0.6; o.rr = 0.07; o.rough = 0.22; o.loose = 0.7; return; }                                   /* a mud patch */
  o.mu = 0.82; o.rr = 0.035; o.rough = 0.14; o.loose = 0.35;                                                               /* packed dirt */
};
/* how far a point (arena-local) is outside the arena floor (negative = inside), and the inward normal of the nearest wall */
Derby.inside = function (lx, lz, n) {
  const cx = clamp(lx, -DD.A, DD.A), dx = lx - cx, d = Math.hypot(dx, lz) || 1e-6; if (n) { n[0] = -dx / d; n[1] = -lz / d; } return d - DD.R;
};
Derby.collide = function (c, px, pz, R, P) {
  const lx = px - DD.X0, lz = pz - DD.Z0, pen = Derby.inside(lx, lz, _ddA) + R + 0.3;
  if (pen > 0) contact(c, px, pz, _ddA[0], _ddA[1], pen, 0, 0, P);
  for (const s of DD_ISL) { const dx = lx - s[0], dz = lz - s[1], d = Math.hypot(dx, dz) || 1e-6, p2 = s[2] + R - d; if (p2 > 0) contact(c, px, pz, dx / d, dz / d, p2, 0, 0, P); }
};
/* the three collision circles of a car, in the world */
function ddCircles(b, out) { const c = b.c, s = Math.sin(c.yaw), co = Math.cos(c.yaw); for (let k = 0; k < 3; k++) { const o = out[k] || (out[k] = [0, 0, 0]); o[0] = c.x + s * b.circ[k][0]; o[1] = c.z + co * b.circ[k][0]; o[2] = b.circ[k][1]; } return out; }
/* where on a car a hit lands: 1.3 at the front (engine), 0.65 at the back (boot), 1 down the sides */
function ddZone(b, x, z) { const c = b.c, lz = (x - c.x) * Math.sin(c.yaw) + (z - c.z) * Math.cos(c.yaw), hl = b.circ[0][0] + 0.45; return lz > hl * 0.45 ? 1.3 : lz < -hl * 0.45 ? 0.65 : 1; }
/* car against car: push apart, an impulse at the contact point, and damage from the closing speed */
Derby.bump = function (A, B) {
  const a = A.c, b = B.c; if (Math.abs(a.x - b.x) > 9 || Math.abs(a.z - b.z) > 9) return;
  const CA = ddCircles(A, A.cc || (A.cc = [])), CB = ddCircles(B, B.cc || (B.cc = []));
  for (const p of CA) for (const q of CB) {
    const dx = p[0] - q[0], dz = p[1] - q[1], d = Math.hypot(dx, dz), rr = p[2] + q[2]; if (d >= rr || d < 1e-5) continue;
    const nx = dx / d, nz = dz / d, pen = rr - d, mA = A.P.m, mB = B.P.m, cx = (p[0] + q[0]) / 2, cz = (p[1] + q[1]) / 2;
    a.x += nx * pen * mB / (mA + mB); a.z += nz * pen * mB / (mA + mB); b.x -= nx * pen * mA / (mA + mB); b.z -= nz * pen * mA / (mA + mB);
    const rax = cx - a.x, raz = cz - a.z, rbx = cx - b.x, rbz = cz - b.z;
    const vax = a.vx + a.w * raz, vaz = a.vz - a.w * rax, vbx = b.vx + b.w * rbz, vbz = b.vz - b.w * rbx, vn = (vax - vbx) * nx + (vaz - vbz) * nz;
    if (vn >= 0) continue;
    const ja = raz * nx - rax * nz, jb = rbz * nx - rbx * nz, e = 0.25, j = -(1 + e) * vn / (1 / mA + 1 / mB + ja * ja / A.P.Iz + jb * jb / B.P.Iz);
    a.vx += j * nx / mA; a.vz += j * nz / mA; a.w += j * ja / A.P.Iz; b.vx -= j * nx / mB; b.vz -= j * nz / mB; b.w -= j * jb / B.P.Iz;
    const v = -vn; if (v < 2.2) continue;
    A.idle = 0; B.idle = 0;
    for (const [X, Y, mX, mY] of [[A, B, mA, mB], [B, A, mB, mA]]) {
      const k = ddZone(X, cx, cz) * Math.min(1.6, 2 * mY / (mX + mY));   /* where it is hit, and how much heavier the other car is */
      if (X.me) { const ve = 2.2 + (v - 2.2) * Math.pow(k, 0.74); if (ve > X.c.crashFlag) { X.c.crashFlag = ve; X.c.cx = cx; X.c.cz = cz; } }
      else if (!X.out && Derby.phase === 'run') X.hp -= Math.pow(v - 2, 1.35) * 1.3 * k * 0.9;
      if (Derby.phase === 'run' && v > 4) X.lastBy = Y;
    }
    if (v > 4 && (A.me || B.me || Math.hypot(cx - car.x, cz - car.z) < 60)) { Derby.fx.push([cx, cz, v]); }
  }
};

/* one physics sub-step: the rivals think and drive, then every pair of cars is checked */
Derby.sub = function (c, h) {
  const L = Derby.list;
  for (const b of L) if (!b.me) { Derby.think(b, h); b.c.crashFlag = 0; stepCar(h, b.c, b.P, b.T, b.circ); if (b.c.crashFlag > 3 && Derby.phase === 'run' && !b.out) b.hp -= Math.pow(b.c.crashFlag - 2, 1.35) * 0.6; }
  for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) Derby.bump(L[i], L[j]);
};
Derby.think = function (b, h) {
  const c = b.c, spd = Math.abs(c.speed); c.nit = false;
  if (b.out || Derby.phase !== 'run') { c.thr = 0; c.brk = 1; c.hand = 1; c.steer = approach(c.steer, 0, 4 * h); return; }
  b.re -= h; let t = b.tgt;
  if (!t || t.out || b.re <= 0) {   /* a new target: near, weak, and you more often than not */
    let best = 1e9; t = null; for (const o of Derby.list) { if (o === b || o.out) continue; const hunt = o.me ? Derby.list.filter((x) => x !== b && !x.out && !x.me && x.tgt === o).length : 0;   /* at most two rivals hunt you at once */
      const sc = Math.hypot(o.c.x - c.x, o.c.z - c.z) + (o.me ? (hunt >= 2 ? 60 : -10 * b.grudge) : 0) + o.hp * 0.08 + Math.random() * 14; if (sc < best) { best = sc; t = o; } }
    b.tgt = t; b.re = 2.5 + Math.random() * 2.5;
  }
  if (!t) { c.thr = 0; c.brk = 0.5; return; }
  const tc = t.c, d = Math.hypot(tc.x - c.x, tc.z - c.z), lead = clamp(d / 22, 0, 0.9), tx = tc.x + tc.vx * lead, tz = tc.z + tc.vz * lead;
  let al = wrapPi(Math.atan2(tx - c.x, tz - c.z) - c.yaw);
  /* stuck against something, or the target is right behind: back out */
  if (spd < 1.6 && c.thr > 0.5 && !c.rev) b.stuck += h; else b.stuck = Math.max(0, b.stuck - h * 2);
  if (b.rev <= 0 && (b.stuck > 1.0 || (d < 9 && Math.abs(al) > 2.3 && spd < 6))) { b.rev = 1.1 + Math.random() * 0.6; b.stuck = 0; }
  if (b.rev > 0) { b.rev -= h; c.thr = 0; c.brk = 1; c.hand = 0; c.steerIn = -Math.sign(al || 1); c.steer = approach(c.steer, c.steerIn, 6 * h); return; }
  /* keep off the wall: if the road ahead runs into it, steer toward the middle */
  const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw), look = 5 + spd * 0.5, ox = c.x + fx * look - DD.X0, oz = c.z + fz * look - DD.Z0;
  if (Derby.inside(ox, oz) > -3) { const toC = wrapPi(Math.atan2(-(c.x - DD.X0) * 0.4, -(c.z - DD.Z0)) - c.yaw); al = lerp(al, toC, 0.7); }
  c.steerIn = clamp(al * 1.7, -1, 1); c.steer = approach(c.steer, c.steerIn, 7 * h);
  c.thr = Math.abs(al) > 1.5 ? 0.45 : b.agg; c.brk = 0; c.hand = Math.abs(al) > 1.25 && spd > 9 ? 1 : 0;
};

/* ---------------- the arena ---------------- */
function ddTex(w, h, draw) { const cv = mkCanvas(w, h); draw(cv.getContext('2d'), w, h); const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t; }
Derby.build = function () {
  if (Derby.group) return; const g = Derby.group = new THREE.Group(); g.name = 'derby'; g.position.set(DD.X0, DD.Y, DD.Z0);
  const rnd = mulberry32(5150), std = (o) => new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.92, metalness: 0 }, o));
  const add = (geo, mat, x, y, z, ry, shadow) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = ry || 0; m.receiveShadow = true; m.castShadow = !!shadow; g.add(m); return m; };
  /* the land round about, and the arena floor: dirt with tyre tracks and darker mud */
  const land = add(new THREE.PlaneGeometry(3000, 3000), std({ map: ddTex(256, 256, (x, w, h) => { x.fillStyle = '#6b6248'; x.fillRect(0, 0, w, h); for (let i = 0; i < 3000; i++) { x.fillStyle = ['#5e563e', '#776d52', '#857a5c', '#4f4935'][i & 3]; x.globalAlpha = 0.45; x.fillRect(rnd() * w, rnd() * h, 2, 2); } }) }), 0, -0.05, 0); land.rotation.x = -Math.PI / 2; land.material.map.wrapS = land.material.map.wrapT = THREE.RepeatWrapping; land.material.map.repeat.set(300, 300);
  const fl = ddTex(1024, 512, (x, w, h) => {
    x.fillStyle = '#7a6347'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 16000; i++) { const v = rnd(); x.fillStyle = v < 0.5 ? 'rgba(90,70,48,0.5)' : v < 0.8 ? 'rgba(140,116,86,0.4)' : 'rgba(60,46,32,0.5)'; x.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 3, 2 + rnd() * 3); }
    for (let py = 0; py < h; py++) for (let px = 0; px < w; px += 2) { const lx = (px / w - 0.5) * (2 * DD.A + 2 * DD.R), lz = (py / h - 0.5) * 2 * DD.R, m = noise2(lx * 0.09 + 3, lz * 0.09 - 7); if (m > 0.25) { x.fillStyle = 'rgba(52,38,24,' + Math.min(0.85, (m - 0.25) * 3) + ')'; x.fillRect(px, py, 2, 1); } }
    x.strokeStyle = 'rgba(40,30,20,0.35)'; x.lineWidth = 5; for (let i = 0; i < 40; i++) { x.beginPath(); let px = rnd() * w, py = rnd() * h; x.moveTo(px, py); for (let k = 0; k < 6; k++) { px += (rnd() - 0.5) * 220; py += (rnd() - 0.5) * 140; x.lineTo(px, py); } x.stroke(); }
  });
  const floor = add(new THREE.PlaneGeometry(2 * DD.A + 2 * DD.R, 2 * DD.R), std({ map: fl }), 0, 0.01, 0); floor.rotation.x = -Math.PI / 2;
  /* the wall: concrete blocks round the stadium shape, a red and white tyre barrier inside it, stands outside */
  const per = [], step = 2.0; for (let x = -DD.A; x < DD.A; x += step) { per.push([x, DD.R, 0]); per.push([-x, -DD.R, Math.PI]); }
  for (const sg of [-1, 1]) for (let a = 0; a < Math.PI; a += step / DD.R) { const t = a - Math.PI / 2; per.push([sg * (DD.A + Math.cos(t) * DD.R), Math.sin(t) * DD.R * sg, 0, sg, t]); }
  const gb = new GB(0, 0, false), box = ni(new THREE.BoxGeometry(1, 1, 1)), cyl = ni(new THREE.CylinderGeometry(1, 1, 1, 12, 1)), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3(), C = new THREE.Color();
  const put = (geo, x, y, z, ry, sx, sy, sz, r, gg, b, sh) => { e.set(0, ry, 0); q.setFromEuler(e); m4.compose(v.set(x, y, z), q, s.set(sx, sy, sz)); gb.geo(geo, m4, C.setRGB(r, gg, b), sh || 0); };
  let k = 0;
  for (const p of per) {
    let x, z, ry, nx, nz; if (p.length === 3) { x = p[0]; z = p[1]; ry = 0; nx = 0; nz = -Math.sign(z); } else { const t = p[4], sg = p[3]; x = p[0]; z = p[1]; nx = -Math.cos(t) * sg; nz = -Math.sin(t); ry = Math.atan2(nx, nz) + Math.PI / 2; }
    const ox = x - nx * 0.5, oz = z - nz * 0.5, tone = 0.62 + ((k * 37) % 9) * 0.012; k++;
    put(box, ox, 0.6, oz, ry, step + 0.05, 1.2, 0.6, tone, tone, tone * 0.98, 0.25);                                     /* concrete block */
    if (k % 2) for (let j = 0; j < 3; j++) { const red = (k >> 1) % 2 === 0; put(cyl, x + nx * 0.35, 0.14 + j * 0.27, z + nz * 0.35, 0, 0.36, 0.25, 0.36, red && j === 1 ? 0.55 : 0.04, red && j === 1 ? 0.04 : 0.04, red && j === 1 ? 0.03 : 0.045, 0.2); }   /* tyres */
    if (k % 3 === 0) put(box, ox - nx * 4, 1.6, oz - nz * 4, ry, step * 3, 3.2, 7, 0.32, 0.33, 0.36, 0.3);   /* the stand behind */
  }
  for (const sI of DD_ISL) for (let a = 0; a < TAU; a += TAU / 10) for (let j = 0; j < 3; j++) put(cyl, sI[0] + Math.cos(a) * (sI[2] - 0.35), 0.14 + j * 0.27, sI[1] + Math.sin(a) * (sI[2] - 0.35), 0, 0.36, 0.25, 0.36, j === 1 && (a * 10 | 0) % 2 ? 0.75 : 0.04, j === 1 && (a * 10 | 0) % 2 ? 0.72 : 0.04, j === 1 && (a * 10 | 0) % 2 ? 0.7 : 0.045, 0.2);
  /* the crowd: rows of little coloured figures on the stands */
  const crowd = ddTex(512, 128, (x, w, h) => { x.fillStyle = '#2b2d33'; x.fillRect(0, 0, w, h); for (let r = 0; r < 6; r++) for (let i = 0; i < 64; i++) { x.fillStyle = 'hsl(' + ((rnd() * 360) | 0) + ',' + (40 + rnd() * 40 | 0) + '%,' + (35 + rnd() * 35 | 0) + '%)'; x.fillRect(i * 8 + 1 + rnd() * 2, r * 21 + 6, 6, 12); x.fillStyle = '#e0b48c'; x.fillRect(i * 8 + 2 + rnd(), r * 21 + 1, 4, 5); } });
  crowd.wrapS = THREE.RepeatWrapping; const cm = std({ map: crowd, roughness: 1 });
  for (const sg of [-1, 1]) { const st = add(new THREE.PlaneGeometry(2 * DD.A + 30, 7), cm, 0, 4.2, sg * (DD.R + 4.2), sg > 0 ? Math.PI : 0); st.rotation.x = sg * 0 - 0.5 * sg * 0; st.rotateX(-0.75); crowd.repeat.set(6, 1); }
  /* floodlight towers at the four corners */
  for (const [x, z] of [[-DD.A - 8, -DD.R - 8], [DD.A + 8, -DD.R - 8], [-DD.A - 8, DD.R + 8], [DD.A + 8, DD.R + 8]]) { put(cyl, x, 11, z, 0, 0.3, 22, 0.3, 0.4, 0.41, 0.44, 0.2); put(box, x, 22.5, z, Math.atan2(-x, -z), 4, 2, 0.5, 0.15, 0.15, 0.16, 0); }
  const wall = gb.mesh(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 }), true, true); g.add(wall);
  const lamps = new GB(0, 0, false); for (const [x, z] of [[-DD.A - 8, -DD.R - 8], [DD.A + 8, -DD.R - 8], [-DD.A - 8, DD.R + 8], [DD.A + 8, DD.R + 8]]) { const ry = Math.atan2(-x, -z); e.set(0, ry, 0); q.setFromEuler(e); for (let i = 0; i < 6; i++) { m4.compose(v.set(x - Math.sin(ry) * 0.3 + Math.cos(ry) * (i - 2.5) * 0.6, 22.5 + (i % 2 ? 0.45 : -0.45), z - Math.cos(ry) * 0.3 - Math.sin(ry) * (i - 2.5) * 0.6), q, s.set(0.5, 0.5, 0.1)); lamps.geo(box, m4, C.setRGB(1, 1, 0.9), 0); } }
  g.add(lamps.mesh(new THREE.MeshBasicMaterial({ vertexColors: true }), false, false));
  /* a banner over each straight */
  const ban = ddTex(1024, 128, (x, w, h) => { x.fillStyle = '#c4161c'; x.fillRect(0, 0, w, h); x.fillStyle = '#ffd400'; x.font = 'bold 84px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('SCRAPYARD BOWL · DESTRUCTION DERBY', w / 2, h / 2 + 4); });
  for (const sg of [-1, 1]) add(new THREE.PlaneGeometry(40, 5), std({ map: ban, side: THREE.DoubleSide }), 0, 9.5, sg * (DD.R + 7.5), sg > 0 ? Math.PI : 0);
  box.dispose(); cyl.dispose(); g.visible = false; scene.add(g);
};

/* ---------------- HUD ---------------- */
const DD_CSS = `
#ddHud{position:fixed;inset:0;pointer-events:none;z-index:6;color:#fff;font-family:inherit}
#ddLeft{position:absolute;left:50%;top:calc(12px + env(safe-area-inset-top));transform:translateX(-50%);text-align:center;font-size:13px;letter-spacing:.14em;opacity:.95;text-shadow:0 2px 8px rgba(0,0,0,.7)}
#ddLeft b{display:block;font-size:38px;letter-spacing:.04em;font-weight:800}
#ddList{position:absolute;left:calc(12px + env(safe-area-inset-left));top:calc(60px + env(safe-area-inset-top));display:flex;flex-direction:column;gap:3px;font-size:12px;background:rgba(6,9,12,.55);padding:8px 10px;border-radius:8px;min-width:190px}
#ddList div{display:flex;align-items:center;gap:8px}#ddList span{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#ddList i{display:block;width:70px;height:6px;background:#2a2d33;border-radius:3px;overflow:hidden}
#ddList i u{display:block;height:100%;background:#35ff6e}#ddList div.me span{color:#ffd400;font-weight:700}#ddList div.out{opacity:.4;text-decoration:line-through}
#ddMsg{position:absolute;left:50%;top:26%;transform:translateX(-50%);font-size:46px;font-weight:800;letter-spacing:.05em;text-shadow:0 3px 18px rgba(0,0,0,.7);white-space:nowrap}
#ddFeed{position:absolute;right:calc(16px + env(safe-area-inset-right));top:calc(60px + env(safe-area-inset-top));text-align:right;font-size:14px;display:flex;flex-direction:column;gap:4px}
#ddFeed div{background:rgba(6,9,12,.6);padding:4px 10px;border-radius:6px}#ddFeed div.me{color:#ffd400}
#ddWarn{position:absolute;left:50%;bottom:calc(130px + env(safe-area-inset-bottom));transform:translateX(-50%);font-size:18px;font-weight:800;letter-spacing:.1em;color:#ff4a3a;background:rgba(6,9,12,.6);padding:6px 16px;border-radius:6px}
body.derby #tr,body.derby #mp,body.derby #wanted,body.derby #tgt,body.derby #prompt{display:none!important}
@media(max-width:700px){#ddList{display:none}#ddMsg{font-size:28px}}`;
Derby.dom = function () {
  if (Derby.el) return; const st = document.createElement('style'); st.textContent = DD_CSS; document.head.appendChild(st);
  const h = document.createElement('div'); h.id = 'ddHud'; h.hidden = true; h.innerHTML = '<div id="ddLeft"></div><div id="ddList"></div><div id="ddMsg"></div><div id="ddFeed"></div><div id="ddWarn" hidden></div>'; document.body.appendChild(h);
  Derby.el = { root: h, left: h.querySelector('#ddLeft'), list: h.querySelector('#ddList'), msg: h.querySelector('#ddMsg'), feed: h.querySelector('#ddFeed'), warn: h.querySelector('#ddWarn') };
  E.rres.addEventListener('click', (ev) => { const b = ev.target.closest('button'); if (!b || !b.dataset.dd) return; if (b.dataset.dd === 'again') Derby.again(); else if (b.dataset.dd === 'done') Derby.exit(false); });
};
Derby.say = function (txt, t) { Derby.el.msg.textContent = txt; Derby.sayT = t || 1.6; };
Derby.post = function (txt, me) { Derby.feed.unshift({ txt, me, t: 5 }); if (Derby.feed.length > 5) Derby.feed.length = 5; };

/* ---------------- lobby ---------------- */
Derby.open = function () { if (App.mode !== 'rlobby') return; Derby.lobby = true; Derby.paint(); Snd.beep(620, 0.06); };
Derby.paint = function () {
  const R = Derby.rec(), seg = (k, opts, cur) => '<div class="rseg" data-k="' + k + '">' + opts.map(([v, l]) => '<button type="button" class="' + (cur === v ? 'on' : '') + '" data-v="' + v + '">' + l + '</button>').join('') + '</div>';
  E.rlTitle.textContent = 'Scrapyard Bowl'; E.rlSub.textContent = 'Destruction derby'; E.rlCash.textContent = money(save.money); E.rlPanel.classList.remove('jk');
  E.rlFoot.innerHTML = '<button class="btn" type="button" data-dd="back">◂ Circuit</button><button class="btn primary" type="button" data-dd="start">Into the bowl</button>';
  E.rlBody.innerHTML = '<p class="rlp">A walled dirt bowl and a field of bangers. Ram, spin and wreck them: the last car still running wins. The front of a car is its weak spot and the back its strongest, so hit them in the nose and take hits on the boot. Go forty seconds without contact and the officials start taking your health. Your car is <b>derby-armoured</b>: it takes ' + Math.round(DD.ARMOUR * 100) + '% of the damage the others do, and no more than two of them hunt you at once.</p>' +
    '<div class="rlrow"><label>Field</label>' + seg('ddn', [[6, '6 cars'], [8, '8 cars'], [10, '10 cars']], R.n) + '</div>' +
    '<div class="rlrow"><label>Your car</label>' + seg('ddcar', [['rook', 'Banger · Rook GT'], ['hauler', 'Banger · Hauler 4x4'], ['own', 'Your ' + esc(CUR.name)]], R.car) + '</div>' +
    '<div class="rlprize"><small>Prize money</small>' + DD_PRIZE.map((p, i) => '<span>' + (i + 1) + '. <b>' + money(p) + '</b></span>').join('') + '<span>+ <b>' + money(150) + '</b> a wreck</span></div>' +
    '<div class="rlrec"><span>Derbies <b>' + R.runs + '</b></span><span>Wins <b>' + R.wins + '</b></span><span>Wrecks <b>' + R.kills + '</b></span><span>Winnings <b>' + money(R.earned) + '</b></span></div>' +
    '<p class="rlp dim">A banger is lent to you and fixed up for free; your own car takes its dents home with it. ' + (TouchIn.on ? 'Use the pedals as normal.' : 'W/S throttle and brake (hold S to reverse), A/D steer, Space handbrake.') + '</p>';
};
Derby.lobbyClick = function (b) {
  const R = Derby.rec();
  if (b.dataset.dd === 'back') { Derby.lobby = false; Race.paint(); Snd.beep(420, 0.05); }
  else if (b.dataset.dd === 'start') Derby.start();
  else if (b.parentNode && b.parentNode.dataset.k === 'ddn') { R.n = +b.dataset.v; Derby.paint(); Snd.beep(520, 0.04); }
  else if (b.parentNode && b.parentNode.dataset.k === 'ddcar') { R.car = b.dataset.v; Derby.paint(); Snd.beep(520, 0.04); }
};
Derby.lobbyKey = function (code) { if (code === 'Escape') { Derby.lobby = false; Race.paint(); } else if (code === 'Enter') Derby.start(); };

/* ---------------- start / exit ---------------- */
Derby.start = async function () {
  if (Derby.on || Derby.loading || App.mode !== 'rlobby') return;
  Derby.loading = true; Derby.lobby = false; Derby.dom();
  const c = car, R = Derby.rec(); Derby.saved = { x: c.x, z: c.z, yaw: c.yaw, tod: App.tod, cycle: save.set.cycle, view: Cam.view, nitro: c.nitro, health: c.health, car: save.car, lent: R.car !== 'own' };
  UI.setMode('load'); UI.progress(0.3, 'Dragging in the wrecks'); await tick();
  try { Derby.build(); } catch (err) { console.error(err); Derby.loading = false; UI.setMode('rlobby'); Race.paint(); UI.toast('Could not build the arena', 'bad'); return; }
  UI.progress(0.8, 'Filling the stands'); await tick();
  Derby.hidden.length = 0; const keep = new Set([Sky.mesh, Part.smoke.pts, Part.spark.pts, car.body, Wheels.group, Derby.group]);
  for (const o of scene.children) { if (o.isLight || keep.has(o) || !o.visible) continue; o.visible = false; Derby.hidden.push(o); }
  if (Chunks.group) Chunks.group.visible = false; if (Far.group) Far.group.visible = false;
  Derby.group.visible = true; Race.near = null; Shop.near = null; Ven.near = null; Wk.near = null; if (typeof Mission !== 'undefined') Mission.nearby = null;
  if (Derby.saved.lent) applyCar(R.car, true);
  Derby.on = true; save.set.cycle = 0; App.tod = 18.4; if (Cam.view === 0) Cam.view = 2;
  document.body.classList.add('derby'); Derby.el.root.hidden = false;
  Derby.again(); Snd.init();
  UI.progress(1, ''); UI.setMode('play'); Derby.loading = false;
};
Derby.clear = function () { for (const b of Derby.list) if (!b.me && b.mesh) { scene.remove(b.mesh); disposeCar(b.mesh); } Derby.list = []; Derby.me = null; };
/* a fresh field round the bowl, every car facing the middle */
Derby.again = function () {
  if (!Derby.on) return; Derby.clear(); const R = Derby.rec(), n = R.n, used = curPaint(), names = DD_NAMES.slice().sort(() => Math.random() - 0.5);
  const slot = (i) => { const a = (i + 0.5) / n * TAU, x = Math.cos(a) * (DD.A + DD.R - 10), z = Math.sin(a) * (DD.R - 8); return [DD.X0 + x, DD.Z0 + z, Math.atan2(-x, -z)]; };
  const me = Derby.me = { name: 'You', me: true, c: car, P: CARP, T: tune, circ: CIRC, hp: 100, out: false, idle: 0, kills: 0 };
  { const [x, z, yaw] = slot(0); spawnAt(x, z, yaw); car.y = DD.Y; car.health = 100; car.wrecked = 0; App.dmg = 0; if (typeof Dmg !== 'undefined' && Dmg.reset) Dmg.reset(car.ext); }
  Derby.list = [me];
  for (let i = 1; i < n; i++) {
    const def = CAR_BY_ID[DD_FIELD[(i * 7 + (Math.random() * 3 | 0)) % DD_FIELD.length]] || CARS[0], P = Object.assign({ awd: false, rsf: 0.5, ab: 0.5, cf: 10.2, cr: 12.2, lat: 1 }, def.p, { gears: def.p.gears.slice() }); P.L = P.a + P.b;
    const T = { Tmax: def.t.Tmax * 0.9, mu: def.t.mu, cd: def.t.cd, cl: def.t.cl || 0, brk: def.t.brk, off: def.t.off, dmg: 1 };
    const hl = def.hl || 2.2, hw = def.body.W / 2, circ = [[hl - 0.45, hw + 0.09], [0, hw + 0.09], [-(hl - 0.45), hw + 0.09]], idx = PAINTS.map((_, k) => k).filter((k) => k !== used), hex = PAINTS[idx[(i * 3 + 1) % idx.length]];
    const b = { name: names[i % names.length], def, P, T, circ, c: newCarState(), hp: 100, out: false, idle: 0, kills: 0, tgt: null, re: 0, stuck: 0, rev: 0, agg: 0.8 + Math.random() * 0.2, grudge: 0.5 + Math.random() * 0.8, smokeT: 0 };
    const [x, z, yaw] = slot(i); Object.assign(b.c, { x, z, y: DD.Y, yaw, brk: 1, hand: 1 });
    b.mesh = buildCarModel(def, hex, { lod: 1 }); b.mesh.visible = true; scene.add(b.mesh); Derby.list.push(b);
  }
  Derby.phase = 'count'; Derby.t = 0; Derby.count = 3.6; Derby.cd = -1; Derby.fx = []; Derby.feed = []; Derby.sayT = 0; Derby.out = []; Derby.shown = false; E.rres.hidden = true;
};
Derby.exit = function (quit) {
  if (!Derby.on) return;
  Derby.on = false; Derby.phase = 'off'; Derby.clear(); E.rres.hidden = true; document.body.classList.remove('derby'); Derby.el.root.hidden = true;
  Derby.group.visible = false; for (const o of Derby.hidden) o.visible = true; Derby.hidden.length = 0; if (Chunks.group) Chunks.group.visible = true; if (Far.group) Far.group.visible = true;
  const S = Derby.saved; if (S) { save.set.cycle = S.cycle; App.tod = S.tod; if (S.lent) { applyCar(S.car, true); car.health = Math.max(S.health, 10); } else car.health = Math.max(car.health, 10); car.nitro = S.nitro; Cam.view = S.view; loadAround(S.x, S.z, 14); spawnAt(S.x, S.z, S.yaw); car.wrecked = 0; }
  writeSave(); UI.setMode('play'); UI.toast(quit ? 'Left the bowl' : 'Back at the race office', 'info');
};

/* ---------------- per-frame ---------------- */
Derby.update = function (dt) {
  const c = car, me = Derby.me, L = Derby.list; Derby.t += dt;
  if (Derby.phase === 'count') {
    c.vx = c.vz = c.w = 0; c.speed = 0; c.brk = 1; c.hand = 1; Derby.count -= dt; const k = Math.ceil(Derby.count - 0.6);
    if (k !== Derby.cd) { Derby.cd = k; if (k >= 1 && k <= 3) { Derby.say(String(k), 0.9); Snd.beep(520, 0.1); } else if (k <= 0) { Derby.say('WRECK ’EM!', 1.4); Snd.beep(880, 0.35); Derby.phase = 'run'; Cam.shake = 0.8; } }
  }
  /* your health is your car's: zero (and no tow truck) puts you out */
  if (c.health < 1) c.health = 0.5;
  if (Derby.phase === 'run') {
    for (const b of L) {
      if (b.out) continue;
      b.idle += dt; if (b.idle > 40) { if (b.me) c.health -= 4 * dt; else b.hp -= 4 * dt; }
      const hp = b.me ? c.health : b.hp;
      if (hp <= 1) {
        b.out = true; if (b.me) { c.health = 0.5; c.wrecked = 0; } b.place = L.filter((o) => !o.out).length + 1; Derby.out.push(b);
        const by = b.lastBy && !b.lastBy.out ? b.lastBy : b.lastBy || null; if (by && by !== b) { by.kills++; if (by.me) { Derby.say('WRECKED ' + b.name.toUpperCase().split(' ').pop() + '!', 1.4); Snd.beep(760, 0.12); } }
        Derby.post((b.me ? 'You are' : b.name + ' is') + ' out' + (by && by !== b ? (by.me ? ' · you got them' : ' · ' + by.name) : ''), b.me || (by && by.me));
      }
    }
    const left = L.filter((o) => !o.out);
    if (me.out || left.length <= 1) { Derby.phase = 'done'; if (!me.out) me.place = 1; Derby.finish(); }
  }
  /* impacts between cars: sparks, sound, a shake when it is you */
  for (const f of Derby.fx) { sparks(f[0], DD.Y + 0.6, f[1], Math.min(24, Math.round(f[2] * 1.6)), 2 + f[2] * 0.4); if (Math.hypot(f[0] - c.x, f[1] - c.z) < 8) Cam.shake = Math.max(Cam.shake, Math.min(2.2, f[2] * 0.1)); else Snd.crash(f[2] * 0.5); }
  Derby.fx.length = 0;
  /* HUD */
  if (Derby.sayT > 0) { Derby.sayT -= dt; if (Derby.sayT <= 0) Derby.el.msg.textContent = ''; }
  for (const f of Derby.feed) f.t -= dt; while (Derby.feed.length && Derby.feed[Derby.feed.length - 1].t <= 0) Derby.feed.pop();
  Derby.hudT -= dt; if (Derby.hudT <= 0) {
    Derby.hudT = 0.12; const E_ = Derby.el, alive = L.filter((o) => !o.out).length;
    E_.left.innerHTML = 'CARS LEFT<b>' + alive + ' / ' + L.length + '</b>';
    E_.list.innerHTML = L.slice().sort((a, b) => (a.out - b.out) || ((b.me ? c.health : b.hp) - (a.me ? c.health : a.hp))).map((o) => { const hp = clamp(o.me ? c.health : o.hp, 0, 100); return '<div class="' + (o.me ? 'me ' : '') + (o.out ? 'out' : '') + '"><span>' + esc(o.name) + '</span><i><u style="width:' + hp + '%;background:' + (hp > 50 ? '#35ff6e' : hp > 25 ? '#ffb200' : '#ff3b30') + '"></u></i></div>'; }).join('');
    E_.feed.innerHTML = Derby.feed.map((f) => '<div class="' + (f.me ? 'me' : '') + '">' + esc(f.txt) + '</div>').join('');
    const idle = me && !me.out && Derby.phase === 'run' ? me.idle : 0; E_.warn.hidden = idle < 30; if (idle >= 30) E_.warn.textContent = idle < 40 ? 'MAKE CONTACT · ' + Math.ceil(40 - idle) : 'NO CONTACT · LOSING HEALTH';
  }
};
Derby.finish = function () {
  const me = Derby.me, R = Derby.rec(), place = me.out ? me.place : 1, prize = DD_PRIZE[place - 1] || 0, bonus = me.kills * 150, reward = prize + bonus;
  R.runs++; if (place === 1) R.wins++; R.kills += me.kills; R.earned += reward; if (!(R.best > 0) || place < R.best) R.best = place; save.money += reward; writeSave();
  if (place === 1) Snd.win(); else Snd.beep(240, 0.4);
  const ord = ['', '1st', '2nd', '3rd'], order = Derby.list.slice().sort((a, b) => (a.out ? a.place : 1) - (b.out ? b.place : 1));
  E.rres.hidden = false;
  E.rres.innerHTML = '<div id="rresP"><h2 class="' + (place === 1 ? 'ok' : '') + '">' + (place === 1 ? 'LAST CAR RUNNING · YOU WIN' : 'YOU’RE OUT · ' + (ord[place] || place + 'th') + ' of ' + Derby.list.length) + '</h2>' +
    '<div class="rw">' + (reward ? '+' + money(reward) : 'No prize') + (bonus ? ' <small>incl. ' + money(bonus) + ' for ' + me.kills + ' wreck' + (me.kills > 1 ? 's' : '') + '</small>' : '') + '</div>' +
    '<table><tr><th>Pos</th><th>Driver</th><th>Wrecks</th></tr>' + order.map((o) => '<tr class="' + (o.me ? 'me' : '') + '"><td>' + (o.out ? o.place : 1) + '</td><td>' + esc(o.name) + '</td><td>' + o.kills + '</td></tr>').join('') + '</table>' +
    '<div class="racts"><button class="btn" type="button" data-dd="done">Leave the bowl</button><button class="btn primary" type="button" data-dd="again">Go again</button></div></div>';
  Derby.el.msg.textContent = ''; Derby.sayT = 0;   /* the results panel says it */
};
/* the rivals' cars on screen, smoking and burning as they get hurt */
Derby.visual = function (dt) {
  for (const b of Derby.list) {
    if (b.me) continue; const c = b.c, m = b.mesh;
    m.position.set(c.x, c.y + c.sY * 0.4, c.z); m.rotation.set(-c.pitch, c.yaw, c.roll, 'YXZ'); m.userData.cs = c; m.userData.v = b.out ? 0 : c.speed; m.userData.brake = c.brk > 0.25 && !c.rev; m.userData.steer = clamp(c.delta || 0, -0.6, 0.6);
    const hp = b.out ? 0 : b.hp, fx = Math.sin(c.yaw), fz = Math.cos(c.yaw), hx = c.x + fx * (b.P.a + 0.3), hz = c.z + fz * (b.P.a + 0.3);
    b.smokeT -= dt; if (hp < 55 && b.smokeT <= 0) { b.smokeT = hp < 25 ? 0.05 : 0.14; const dk = hp < 25 ? 0.2 : 0.55; emit(Part.smoke, hx + (Math.random() - 0.5) * 0.6, c.y + 1.0, hz + (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.8, 1.6 + Math.random(), (Math.random() - 0.5) * 0.8, 1.6 + Math.random() * 1.2, 0.9, 2.6, dk, dk, dk, 0.55, -0.4); }
    if (hp < 20 && Math.random() < 0.6) emit(Part.spark, hx + (Math.random() - 0.5) * 0.7, c.y + 0.9, hz + (Math.random() - 0.5) * 0.7, (Math.random() - 0.5) * 0.6, 1.4 + Math.random() * 1.4, (Math.random() - 0.5) * 0.6, 0.35 + Math.random() * 0.3, 0.35, 1.2, 1, 0.45 + Math.random() * 0.25, 0.08, 1, -0.6);
    const p = m.userData.paint; if (p && b.out && !b.charred) { b.charred = true; p.color.multiplyScalar(0.28); }
  }
};
