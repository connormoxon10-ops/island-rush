/* ================= MOUNT CINDER: the island's volcano =================
   A stratovolcano a little way east of Ashfall: a 950 m wide cone rising 300 m, steepening towards a sharp rim round a crater with a lava lake
   in it. Gullies run down its flanks, and three lava channels carry glowing rivers from the rim. On the Ashfall side a ridge of calmer ground
   runs from the observatory (a flat shelf about a third of the way down) to the foot: the line the Eruption Escape takes (08_volcano.js).
   The shape goes into the terrain (terrainNoRoad), the colours into the ground (terrainColor), and nothing grows on the upper cone. */
const VOLC = { x: -120, z: 3130, R: 950, H: 300, RIM: 125, CR: 80, DEEP: 62, PAD: 430, B: null, ux: -0.9884, uz: 0.1521 };
VOLC.ab = Math.atan2(VOLC.uz, VOLC.ux);                                   /* the bearing of the escape, towards Ashfall */
VOLC.chan = [VOLC.ab + 0.46, VOLC.ab - 0.5, VOLC.ab + 2.55];              /* the lava channels (angles at the rim) */
VOLC.px = VOLC.x + VOLC.ux * VOLC.PAD; VOLC.pz = VOLC.z + VOLC.uz * VOLC.PAD;   /* the observatory shelf */
function volcAng(a, b) { let d = a - b; d -= Math.round(d / TAU) * TAU; return d; }
/* the bare cone above its base, no noise: d from the vent */
function volcCone(d) {
  const V = VOLC; if (d >= V.R) return 0;
  if (d >= V.RIM) { const u = (d - V.RIM) / (V.R - V.RIM); return V.H * Math.pow(1 - u, 2.2); }
  return V.H + 5 * (1 - Math.min(1, (V.RIM - d) / 22)) - V.DEEP * sstep(V.RIM - 6, V.CR, d);
}
/* the centreline angle of lava channel k at distance d: it wanders a little on the way down */
function volcChanA(k, d) { return VOLC.chan[k] + 0.11 * Math.sin(d * 0.0075 + k * 2.1); }
/* how far (m) across the slope (x, z) is from channel k, at distance d and angle a */
function volcChanW(k, d, a) { return Math.abs(volcAng(a, volcChanA(k, d))) * d; }
VOLC.CHEND = [720, 640, 600];                                             /* how far down each channel's lava has run */
function volcLift(x, z, h) {
  const V = VOLC, dx = x - V.x, dz = z - V.z; if (dx > V.R || dx < -V.R || dz > V.R || dz < -V.R) return h;
  const d = Math.sqrt(dx * dx + dz * dz); if (d >= V.R) return h;
  if (V.B == null) { let s = 0; for (let k = 0; k < 16; k++) { const a = k * TAU / 16; s += rawHeight(V.x + Math.cos(a) * V.R, V.z + Math.sin(a) * V.R); } V.B = Math.max(8, s / 16); }
  const a = Math.atan2(dz, dx), u = clamp((d - V.RIM) / (V.R - V.RIM), 0, 1);
  let c = volcCone(d);
  /* gullies and ridges down the flanks, calmer along the escape line */
  const calm = 0.2 + 0.8 * sstep(0.1, 0.22, Math.abs(volcAng(a, V.ab)));
  const g = noise2(Math.cos(a) * 7 + 3, Math.sin(a) * 7 - d * 0.0035), gul = (0.34 - Math.abs(g)) * 20 * Math.sin(Math.PI * u) * calm;
  c += d > V.RIM ? gul + fbm(x * 0.02, z * 0.02, 2) * 2.2 * calm : 0;
  /* the lava channels: shallow troughs from the rim */
  if (d > V.RIM - 10) for (let k = 0; k < 3; k++) { const w = volcChanW(k, d, a); if (w < 18) c -= 3.4 * (1 - sstep(5, 18, w)) * (1 - sstep(V.CHEND[k] - 60, V.CHEND[k] + 40, d)); }
  /* the observatory shelf */
  const dp = Math.hypot(x - V.px, z - V.pz); if (dp < 40) c += (volcCone(V.PAD) - c) * (1 - sstep(16, 38, dp));
  const k = sstep(V.R, V.R * 0.55, d); return h + (V.B - h) * k + c;
}
/* the height of the lava surface in the crater */
function volcLakeY() { return (VOLC.B || 20) + VOLC.H - VOLC.DEEP + 1.2; }
/* ground colours: ash over the cone, black lava rock in streaks, scorched rock round the crater, sulphur at the rim */
let _VT = null;
function volcTint(x, z, h, slope, c) {
  const V = VOLC, dx = x - V.x, dz = z - V.z; if (dx * dx + dz * dz > (V.R * 1.18) ** 2) return;
  const t = _VT || (_VT = { ash: lc(0x3a3532), rock: lc(0x1c1817), scorch: lc(0x5a2c1e), sulf: lc(0xb8a23e), crust: lc(0x141010) });
  const d = Math.sqrt(dx * dx + dz * dz), a = Math.atan2(dz, dx);
  c.lerp(t.ash, 0.92 * sstep(V.R * 1.18, V.R * 0.72, d));
  c.lerp(t.rock, sstep(0.18, 0.5, noise2(x * 0.009 + 7, z * 0.009) + slope * 0.4) * 0.7 * sstep(V.R * 1.05, V.R * 0.6, d));
  c.lerp(t.scorch, sstep(V.RIM + 140, V.RIM, d) * 0.75);
  if (d < V.RIM + 25 && d > V.CR - 10) c.lerp(t.sulf, sstep(0.25, 0.6, noise2(x * 0.05, z * 0.05)) * 0.6);
  for (let k = 0; k < 3; k++) { const w = volcChanW(k, d, a); if (w < 26 && d > V.RIM - 10 && d < V.CHEND[k] + 80) c.lerp(t.crust, (1 - sstep(8, 26, w)) * 0.85); }
}
/* nothing grows on the upper cone, and the lower slopes thin out */
function volcClear(x, z) {
  const V = VOLC, dx = x - V.x, dz = z - V.z, d2 = dx * dx + dz * dz; if (d2 > V.R * V.R) return false;
  const d = Math.sqrt(d2); return d < V.R * 0.7 || ihash(Math.floor(x / 7), Math.floor(z / 7), 61) < sstep(V.R, V.R * 0.7, d);
}
