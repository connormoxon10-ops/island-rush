/* rally plank gates: drive a car through, check the break, the speed it costs, that every matrix stays finite and that the wreckage settles and clears */
const load = require('./ryt.js');
const { RW } = load();
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
const gh = (x, z) => 10 + 0.02 * x;                         /* gently sloping ground */
const walls = [{ x: 0, z: 0, yaw: 0, hw: 4.2, y: 10 }, { x: 0, z: 200, yaw: 0, hw: 4.2, y: 10 }];
const run = (speed, offset, label, yawErr) => {
  const sim = RW.make(walls, gh, 5); const car = { x: offset, y: 10 + offset * 0.02, z: -30, yaw: yawErr || 0, vx: Math.sin(yawErr || 0) * speed, vz: Math.cos(yawErr || 0) * speed, L: 4.2, W: 1.9 };
  const dt = 1 / 120; let lostTotal = 0, t = 0, peakLive = 0, evs = { crack: 0, snap: 0, rail: 0 };
  while (t < 22) {
    if (t < 3) { car.x += car.vx * dt; car.z += car.vz * dt; car.y = gh(car.x, car.z); const took = RW.carStep(sim, car); if (took > 0) { car.vx *= 1 - took; car.vz *= 1 - took; lostTotal += took; } RW.bulldoze(sim, car); }
    RW.step(sim, dt); for (const e of sim.ev) evs[e.t]++; sim.ev.length = 0; peakLive = Math.max(peakLive, sim.live.length); t += dt;
  }
  const st = RW.stats(sim); let bad = 0; for (const m of sim.mats) for (let i = 0; i < m.length; i++) if (!Number.isFinite(m[i])) bad++;
  const spLeft = Math.hypot(car.vx, car.vz);
  console.log(label.padEnd(30), 'broken', st.broken + '/' + st.total, '| speed', speed.toFixed(0), '->', spLeft.toFixed(1), '| peak bodies', peakLive, '| events', JSON.stringify(evs), '| live after 22 s', st.live, '| bad', bad);
  return { sim, st, bad, spLeft, evs, peakLive, car };
};
{ const r = run(30, 0, 'centre at 30 m/s');
  ok(r.bad === 0, 'every instance matrix is finite'); ok(r.st.broken >= 8 && r.st.broken <= 24, 'about a car-width of planks break (' + r.st.broken + ')');
  ok(r.spLeft > 30 * 0.78 && r.spLeft < 30 * 0.95, 'the gate costs some speed but does not stop the car (' + r.spLeft.toFixed(1) + ' m/s left)');
  ok(r.evs.snap === r.st.broken && r.evs.crack >= r.st.broken, 'a crack event and a snap event for every plank'); ok(r.peakLive > 20, 'splinters and pieces fly (peak ' + r.peakLive + ' bodies)');
  ok(r.st.live === 0 || r.st.live < 12, 'the wreckage settles and clears (' + r.st.live + ' bodies after 22 s)'); }
{ const r = run(12, 0, 'centre at 12 m/s'); ok(r.st.broken >= 8, 'a slow car still goes through (' + r.st.broken + ')'); ok(r.spLeft > 6, 'and keeps rolling (' + r.spLeft.toFixed(1) + ' m/s)'); }
{ const r = run(45, 2.2, 'off-centre at 45 m/s'); ok(r.bad === 0, 'finite at 45 m/s'); ok(r.st.broken >= 8, 'off-centre hit breaks planks (' + r.st.broken + ')'); }
{ const r = run(30, -6.2, 'angled 12 degrees', 0.21); ok(r.bad === 0 && r.st.broken >= 6, 'angled entry (' + r.st.broken + ' planks)'); }
{ const sim = RW.make(walls, gh, 5); const car = { x: 0, y: 40, z: -3, yaw: 0, vx: 0, vz: 30, L: 4.2, W: 1.9 }; let took = 0; for (let i = 0; i < 100; i++) { car.z += 0.25; took += RW.carStep(sim, car); } ok(took === 0 && RW.stats(sim).broken === 0, 'a car flying over the gate breaks nothing'); }
{ const sim = RW.make(walls, gh, 5); const car = { x: 20, y: 10, z: 0, yaw: 0, vx: 0, vz: 30, L: 4.2, W: 1.9 }; let took = 0; for (let i = 0; i < 50; i++) { car.z += 0.25; took += RW.carStep(sim, car); } ok(took === 0, 'a car beside the gate breaks nothing'); }
{ const r = run(30, 0, 'reset'); RW.reset(r.sim); const st = RW.stats(r.sim); let nz = 0; for (let i = 0; i < r.sim.cap[0]; i++) if (r.sim.mats[0][i * 16] !== 0) nz++; ok(st.broken === 0 && nz === r.sim.cap[0], 'reset restores every plank'); }
console.log(fails ? fails + ' FAILED' : 'ALL OK'); process.exit(fails ? 1 : 0);
