/* ================= RACEWAY =================
   One closed 2.2 km circuit on a levelled site: a long start straight with grandstand, pit building and starting gantry, a fast sweeper, a
   hairpin, an infield chicane and a run of esses, all behind continuous barriers. The layout is a fixed set of centreline points (local
   metres: u runs east, v south; world x = cx + u, z = cz + v), so the site can sit anywhere flat. The whole site is one height (H0), which makes
   terrain levelling, the paved-surface test and the analytic barrier collision cheap: every query is "which centreline segment am I nearest to,
   and how far off it am I". The same centreline feeds the bots' racing line and the lap/position tracking (08_race.js, 07_racers.js).
   Geometry lives in 07_track_gfx.js. Left of the direction of travel is the infield (positive lateral offset). */
const TRK_PTS = [0.1,172.1,4.1,172.1,8.1,172.1,12.1,172.1,16.1,172.1,20.1,172.1,24.1,172.1,28.1,172.1,32.1,172.1,36.1,172.1,40.1,172.1,44.1,172.1,48.1,172.1,52.2,172.1,56.2,172.1,60.2,172.1,64.2,172.1,68.2,172.1,72.2,172.1,76.2,172.1,80.2,172.1,84.2,172.1,88.2,172.1,92.2,172.1,96.2,172.1,100.2,172.1,104.2,172.1,108.2,172.1,112.2,172.1,116.2,172.1,120.2,172.1,124.2,172.1,128.2,172.1,132.2,172.1,136.2,172.1,140.2,172,144.2,172,148.2,172,152.2,172,156.2,172,160.2,172.1,164.2,172.1,168.2,172.2,172.2,172.2,176.2,172.3,180.2,172.4,184.2,172.5,188.2,172.7,192.2,172.8,196.2,172.9,200.2,173.1,204.2,173.2,208.2,173.3,212.2,173.4,216.2,173.5,220.2,173.6,224.2,173.6,228.2,173.6,232.2,173.6,236.2,173.4,240.2,173.2,244.2,172.9,248.2,172.6,252.2,172.1,256.1,171.5,260.1,170.7,264,169.9,267.9,168.9,271.7,167.8,275.6,166.7,279.3,165.3,283.1,163.9,286.8,162.4,290.4,160.7,294,158.9,297.5,157,301,155,304.3,152.8,307.6,150.6,310.8,148.1,313.9,145.6,316.9,142.9,319.7,140.1,322.4,137.2,325,134.1,327.3,130.9,329.5,127.5,331.5,124,333.3,120.4,334.9,116.8,336.2,113,337.4,109.2,338.4,105.3,339.2,101.4,339.9,97.4,340.4,93.5,340.8,89.5,341,85.5,341.1,81.5,341,77.5,340.8,73.5,340.4,69.5,339.8,65.6,339.1,61.6,338.1,57.7,337,53.9,335.6,50.1,334,46.5,332.3,42.9,330.3,39.4,328.2,36,325.9,32.7,323.5,29.5,321,26.4,318.4,23.4,315.7,20.4,312.9,17.6,310,14.8,307,12.1,304,9.5,300.9,7,297.7,4.5,294.4,2.3,291,0.1,287.5,-1.8,283.9,-3.6,280.3,-5.2,276.5,-6.5,272.7,-7.7,268.8,-8.8,265,-9.8,261.1,-10.7,257.1,-11.6,253.2,-12.4,249.3,-13.4,245.5,-14.3,241.6,-15.4,237.8,-16.7,234.1,-18.1,230.4,-19.8,226.9,-21.7,223.5,-23.8,220.3,-26.1,217.1,-28.6,214.1,-31.2,211.2,-33.9,208.4,-36.8,205.7,-39.8,203.2,-42.9,200.8,-46.1,198.6,-49.4,196.6,-52.9,194.8,-56.5,193.3,-60.2,192.2,-64,191.3,-67.9,190.9,-71.9,190.8,-75.9,191.1,-79.9,191.7,-83.9,192.6,-87.8,193.8,-91.6,195.2,-95.3,196.8,-99,198.6,-102.6,200.6,-106,202.8,-109.4,205,-112.7,207.5,-115.9,210,-119,212.7,-121.9,215.6,-124.7,218.6,-127.3,221.8,-129.8,225.1,-132.1,228.4,-134.2,231.9,-136.2,235.4,-138.1,239,-139.9,242.6,-141.7,246.1,-143.5,249.7,-145.4,253.2,-147.2,256.7,-149.1,260.1,-151.1,263.4,-153.2,266.7,-155.3,269.7,-157.6,272.6,-160,275.3,-162.5,277.7,-165.3,279.7,-168.2,281.4,-171.2,282.8,-174.4,284.2,-177.5,285.4,-180.7,286.4,-183.9,287.2,-187.2,287.7,-190.4,288.1,-193.7,288.2,-196.9,288.1,-200.1,287.7,-203.2,287.1,-206.3,286.2,-209.4,285.1,-212.3,283.8,-215.2,282.2,-218,280.4,-220.7,278.5,-223.2,276.3,-225.7,274,-228.1,271.5,-230.4,268.9,-232.7,266.4,-234.9,263.5,-237,260.5,-238.8,257.2,-240.5,253.7,-241.9,250.1,-243.1,246.3,-243.9,242.4,-244.5,238.4,-244.8,234.4,-245.1,230.4,-245.2,226.4,-245.1,222.4,-245,218.4,-244.8,214.4,-244.4,210.5,-243.9,206.5,-243.1,202.7,-242.2,198.8,-241.1,195,-239.8,191.2,-238.4,187.5,-236.9,183.9,-235.3,180.3,-233.6,176.7,-231.7,173.2,-229.8,169.7,-227.8,166.3,-225.8,162.9,-223.6,159.6,-221.5,156.3,-219.2,153,-216.8,149.9,-214.4,146.8,-211.8,143.8,-209.2,140.9,-206.4,138.1,-203.5,135.5,-200.5,132.9,-197.5,130.4,-194.4,127.9,-191.2,125.4,-188.1,122.9,-184.9,120.5,-181.8,117.9,-178.7,115.3,-175.7,112.6,-172.7,109.8,-169.9,106.9,-167.1,103.9,-164.4,100.8,-161.8,97.8,-159.3,94.6,-156.8,91.4,-154.4,88.2,-152,85,-149.7,81.6,-147.5,78.2,-145.3,74.8,-143.3,71.2,-141.5,67.6,-139.9,63.8,-138.5,60,-137.3,56.1,-136.6,52.1,-136.1,48.1,-136.1,44.1,-136.3,40.1,-137,36.3,-137.9,32.4,-139.1,28.7,-140.5,25,-142.1,21.4,-143.9,17.9,-145.8,14.4,-147.8,11,-149.8,7.7,-152,4.3,-154.3,1.1,-156.6,-2.1,-159,-5.2,-161.5,-8.3,-164.1,-11.3,-166.8,-14.1,-169.6,-16.8,-172.6,-19.4,-175.6,-21.8,-178.8,-24.2,-182,-26.4,-185.3,-28.7,-188.7,-30.9,-192,-33.1,-195.3,-35.3,-198.7,-37.6,-202,-39.9,-205.2,-42.4,-208.3,-45,-211.4,-47.7,-214.3,-50.6,-217.1,-53.6,-219.7,-56.8,-222.1,-60.1,-224.4,-63.6,-226.4,-67.1,-228.3,-70.7,-230,-74.4,-231.6,-78.1,-233.1,-81.8,-234.5,-85.6,-235.8,-89.4,-237,-93.3,-238.1,-97.2,-239.2,-101,-240.1,-105,-241,-108.9,-241.8,-112.8,-242.5,-116.8,-243.1,-120.7,-243.6,-124.7,-244.1,-128.7,-244.4,-132.7,-244.7,-136.7,-244.9,-140.7,-244.9,-144.7,-244.9,-148.7,-244.8,-152.7,-244.5,-156.7,-244.2,-160.7,-243.8,-164.6,-243.2,-168.6,-242.6,-172.5,-241.9,-176.4,-241.1,-180.3,-240.2,-184.2,-239.3,-188.1,-238.2,-192,-237.2,-195.8,-236,-199.6,-234.8,-203.4,-233.5,-207.2,-232.2,-210.9,-230.8,-214.6,-229.3,-218.4,-227.8,-222,-226.2,-225.7,-224.6,-229.3,-222.9,-232.9,-221.2,-236.5,-219.4,-240,-217.5,-243.5,-215.6,-247,-213.6,-250.5,-211.6,-253.9,-209.5,-257.2,-207.3,-260.6,-205.1,-263.9,-202.8,-267.1,-200.4,-270.3,-198.1,-273.5,-195.6,-276.6,-193.1,-279.7,-190.6,-282.8,-188,-285.8,-185.4,-288.7,-182.7,-291.7,-179.9,-294.5,-177.2,-297.4,-174.3,-300.1,-171.4,-302.9,-168.5,-305.5,-165.5,-308.1,-162.5,-310.7,-159.4,-313.1,-156.2,-315.5,-153,-317.8,-149.7,-320,-146.4,-322.1,-143,-324.2,-139.6,-326.1,-136.1,-327.9,-132.5,-329.7,-128.9,-331.3,-125.2,-332.9,-121.6,-334.4,-117.8,-335.8,-114.1,-337,-110.3,-338.2,-106.5,-339.3,-102.6,-340.4,-98.8,-341.3,-94.9,-342.1,-90.9,-342.8,-87,-343.4,-83.1,-343.9,-79.1,-344.3,-75.1,-344.5,-71.1,-344.6,-67.1,-344.6,-63.1,-344.3,-59.1,-343.9,-55.1,-343.4,-51.2,-342.7,-47.2,-341.9,-43.3,-340.9,-39.4,-339.8,-35.6,-338.6,-31.7,-337.4,-27.9,-336,-24.2,-334.5,-20.5,-333,-16.8,-331.3,-13.1,-329.6,-9.5,-327.8,-6,-325.8,-2.5,-323.3,0.7,-320.7,3.6,-317.9,6.5,-315.1,9.3,-312.3,12.1,-309.5,14.9,-306.7,17.7,-303.9,20.5,-301.2,23.3,-298.6,26.2,-296.2,29.2,-294,32.3,-292.1,35.6,-290.5,39,-289.3,42.5,-288.3,46.1,-287.8,49.8,-287.5,53.5,-287.6,57.4,-287.9,61.2,-288.4,65,-289.2,68.9,-290.1,72.7,-291.2,76.5,-292.3,80.4,-293.4,84.2,-294.8,87.9,-296.4,91.6,-298.1,95.2,-299.4,98.1,-300.3,101.1,-300.9,103.9,-301.4,106.7,-301.8,109.4,-302.1,112.1,-302.4,114.8,-302.6,117.5,-302.8,120.2,-302.9,122.8,-302.8,125.4,-302.7,128,-302.4,130.5,-302,132.9,-301.5,135.3,-300.8,137.7,-300,140,-299.1,142.2,-298,144.4,-296.8,146.6,-295.5,148.6,-294,150.7,-292.4,152.6,-290.6,154.5,-288.8,156.4,-286.9,158.2,-284.9,160,-282.8,161.7,-280.6,163.4,-278.1,164.9,-275.5,166.4,-272.7,167.7,-269.7,168.8,-266.5,169.9,-263.2,170.8,-260,171.9,-256,172.2,-252,172.4,-248,172.7,-244,172.9,-240,173,-236,173.1,-232,173.3,-228,173.4,-224,173.4,-220,173.5,-216,173.5,-212,173.6,-208,173.6,-204,173.6,-200,173.6,-196,173.6,-192,173.6,-188,173.6,-184,173.5,-180,173.5,-176,173.4,-172,173.4,-168,173.4,-164,173.3,-160,173.3,-156,173.2,-152,173.1,-148,173.1,-144,173,-140,172.9,-136,172.9,-132,172.8,-128,172.7,-124,172.7,-120,172.6,-115.9,172.6,-111.9,172.5,-107.9,172.4,-103.9,172.4,-99.9,172.3,-95.9,172.3,-91.9,172.2,-87.9,172.2,-83.9,172.1,-79.9,172.1,-75.9,172.1,-71.9,172.1,-67.9,172,-63.9,172,-59.9,172,-55.9,172,-51.9,172,-47.9,172,-43.9,172,-39.9,172,-35.9,172,-31.9,172,-27.9,172,-23.9,172,-19.9,172,-15.9,172,-11.9,172,-7.9,172,-3.9,172.1];
const TRK = {
  HW: 8.5, KERB: 1.5, WALL: 14.5,                    /* half-width of the asphalt, kerb strip, centreline-to-barrier distance */
  U0: -395, U1: 395, V0: -280, V1: 272,              /* the levelled site, local metres */
  LOT: [-262, -96, 198, 270], CONN: [-192, -158, 172, 200], GATE: [-196, -154],   /* paddock car park, connector road, gap in the barrier (u range) */
  OFFICE: [-178, 236]                                /* race-office marker, local */
};
const Track = { s: null, name: 'Raceway', built: false, group: null, pave: [], boxes: [], cyls: [], n: 0, L: 0, fail: false, lights: null, lit: 0, light: [] };
const _tkq = { i: -1, t: 0, d: 0, l: 0, s: 0, x: 0, z: 0 };
const TC = 32;

/* ---------- site selection (inside genWorld, after the highways, airport and marina exist) ---------- */
Track.test = function (cx, cz) {
  const x0 = cx + TRK.U0, x1 = cx + TRK.U1, z0 = cz + TRK.V0, z1 = cz + TRK.V1;
  for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) if (Math.hypot(x, z) > 2350) return null;
  for (const T of towns) { const dx = Math.max(x0 - T.cx, 0, T.cx - x1), dz = Math.max(z0 - T.cz, 0, T.cz - z1); if (Math.hypot(dx, dz) < T.R1 + 150) return null; }
  if (Air.s) { const A = Air.s, dx = Math.max(x0 - A.x1, 0, A.x0 - x1), dz = Math.max(z0 - A.z1, 0, A.z0 - z1); if (Math.hypot(dx, dz) < 260) return null; }
  if (Dock.s) { const dx = Math.max(x0 - Dock.s.ox, 0, Dock.s.ox - x1), dz = Math.max(z0 - Dock.s.oz, 0, Dock.s.oz - z1); if (Math.hypot(dx, dz) < 330) return null; }
  for (const r of roads) { const P = r.pts; for (let i = 0; i < P.length; i += 2) { const p = P[i], dx = Math.max(x0 - p.x, 0, p.x - x1), dz = Math.max(z0 - p.z, 0, p.z - z1); if (dx * dx + dz * dz < 105 * 105) return null; } }
  let mn = 1e9, mx = -1e9, sum = 0, n = 0, low = 0;
  for (let x = x0 - 20; x <= x1 + 20; x += 55) for (let z = z0 - 20; z <= z1 + 20; z += 55) {
    const h = terrainNoRoad(x, z); if (h < 1.5) low++; mn = Math.min(mn, h); mx = Math.max(mx, h); sum += h; n++;
  }
  if (low > n * 0.05 || sum / n < 5) return null;
  return { range: mx - mn, H0: sum / n, mn, mx };
};
Track.pick = function () {
  Track.s = null; Track.fail = false; let best = null;
  for (let gx = -2000; gx <= 2000; gx += 90) for (let gz = -2000; gz <= 2000; gz += 90) {
    const r = Track.test(gx, gz); if (!r) continue; const sc = r.range + Math.hypot(gx, gz) / 70;
    if (!best || sc < best.sc) best = { cx: gx, cz: gz, r, sc };
  }
  if (!best) { Track.fail = true; return; }
  const cx = best.cx, cz = best.cz, H0 = Math.max(6, best.r.H0);
  Track.s = { cx, cz, H0, x0: cx + TRK.U0, x1: cx + TRK.U1, z0: cz + TRK.V0, z1: cz + TRK.V1, range: best.r.range };
  let bd = 1e9; for (const T of towns) { const d = Math.hypot(T.cx - cx, T.cz - cz); if (d < bd) { bd = d; Track.name = T.name + ' Raceway'; } }
  Track.initPath();
};

/* ---------- centreline: tangents, curvature, spatial grid, racing line ---------- */
Track.initPath = function () {
  const A = Track.s, n = TRK_PTS.length / 2; Track.n = n;
  const px = Track.px = new Float32Array(n), pz = Track.pz = new Float32Array(n), cum = Track.cum = new Float32Array(n + 1), sl = Track.sl = new Float32Array(n);
  const tx = Track.tx = new Float32Array(n), tz = Track.tz = new Float32Array(n), nx = Track.nx = new Float32Array(n), nz = Track.nz = new Float32Array(n);
  for (let i = 0; i < n; i++) { px[i] = A.cx + TRK_PTS[i * 2]; pz[i] = A.cz + TRK_PTS[i * 2 + 1]; }
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, dx = px[j] - px[i], dz = pz[j] - pz[i], l = Math.hypot(dx, dz) || 1; sl[i] = l; tx[i] = dx / l; tz[i] = dz / l; nx[i] = tz[i]; nz[i] = -tx[i]; cum[i + 1] = cum[i] + l;
  }
  Track.L = cum[n];
  /* signed curvature (positive = turning left), smoothed over five samples */
  const k0 = new Float32Array(n), k = Track.k = new Float32Array(n);
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; k0[i] = -(tx[i] * tz[j] - tz[i] * tx[j]) / (0.5 * (sl[i] + sl[j])); }
  for (let i = 0; i < n; i++) { let a = 0; for (let d = -2; d <= 2; d++) a += k0[(i + d + n) % n]; k[i] = a / 5; }
  /* uniform grid of segments within the barrier ring of each cell */
  const gw = Track.gw = Math.ceil((TRK.U1 - TRK.U0) / TC), gh = Track.gh = Math.ceil((TRK.V1 - TRK.V0) / TC), grid = Track.grid = new Array(gw * gh), QR = TRK.WALL + 3;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, xa = Math.min(px[i], px[j]) - QR, xb = Math.max(px[i], px[j]) + QR, za = Math.min(pz[i], pz[j]) - QR, zb = Math.max(pz[i], pz[j]) + QR;
    const g0 = Math.max(0, Math.floor((xa - A.x0) / TC)), g1 = Math.min(gw - 1, Math.floor((xb - A.x0) / TC)), h0 = Math.max(0, Math.floor((za - A.z0) / TC)), h1 = Math.min(gh - 1, Math.floor((zb - A.z0) / TC));
    for (let gz = h0; gz <= h1; gz++) for (let gx = g0; gx <= g1; gx++) { const c = gz * gw + gx; (grid[c] || (grid[c] = [])).push(i); }
  }
  /* paved rectangles + solids (absolute y) */
  const cx = A.cx, cz = A.cz, H0 = A.H0;
  Track.pave = [TRK.LOT.slice(), TRK.CONN.slice()];
  Track.boxes = []; Track.cyls = [];
  const bx = (u0, u1, v0, v1, yb, yt) => Track.boxes.push([cx + u0, cz + v0, cx + u1, cz + v1, H0 + yt, H0 + yb, 0, 0, 0]);
  bx(-34, 156, 193, 224, 0, 9.4);                     /* grandstand block (stepped tiers drawn over it) */
  bx(-72, 168, 140, 152, 0, 5.2); bx(34, 52, 140, 152, 5.2, 12.5);            /* pit building and race-control tower */
  bx(-252, -222, 238, 262, 0, 5);                     /* race office */
  bx(-122, -98, 214, 252, 0, 4.2);                    /* hospitality unit */
  for (const sv of [-1, 1]) Track.cyls.push([cx + 0, cz + 172 + sv * 11.6, 0.55, H0, H0 + 8.2]);   /* gantry legs */
  Track.cyls.push([cx + 60, cz + 196, 0.3, H0, H0 + 13], [cx - 10, cz + 196, 0.3, H0, H0 + 13]);
  Track.officeX = cx + TRK.OFFICE[0]; Track.officeZ = cz + TRK.OFFICE[1];
  Track.gap0 = Track.L - 196 + 0; Track.gap1 = Track.L - 154;
  Track.initLine();
};

/* shortest-path relaxation inside the track, then smoothed: a racing line that runs wide-apex-wide */
Track.initLine = function () {
  const n = Track.n, px = Track.px, pz = Track.pz, nx = Track.nx, nz = Track.nz, lim = TRK.HW - 2.7;
  const off = Track.off = new Float32Array(n), lx = Track.lx = new Float32Array(n), lz = Track.lz = new Float32Array(n);
  const place = () => { for (let i = 0; i < n; i++) { lx[i] = px[i] + nx[i] * off[i]; lz[i] = pz[i] + nz[i] * off[i]; } };
  place();
  for (let it = 0; it < 320; it++) {
    for (let i = 0; i < n; i++) {
      const a = (i + n - 1) % n, b = (i + 1) % n, mx = (lx[a] + lx[b]) / 2, mz = (lz[a] + lz[b]) / 2;
      const t = (mx - px[i]) * nx[i] + (mz - pz[i]) * nz[i]; off[i] = clamp(off[i] + (t - off[i]) * 0.6, -lim, lim); lx[i] = px[i] + nx[i] * off[i]; lz[i] = pz[i] + nz[i] * off[i];
    }
  }
  for (let pass = 0; pass < 40; pass++) { const t = Float32Array.from(off); for (let i = 0; i < n; i++) off[i] = clamp((t[(i + n - 2) % n] + 2 * t[(i + n - 1) % n] + 3 * t[i] + 2 * t[(i + 1) % n] + t[(i + 2) % n]) / 9, -lim, lim); }
  place();
  /* line geometry: segment lengths, curvature, cumulative distance */
  const ll = Track.ll = new Float32Array(n), lc = Track.lc = new Float32Array(n + 1), lk = Track.lk = new Float32Array(n), ltx = Track.ltx = new Float32Array(n), ltz = Track.ltz = new Float32Array(n);
  for (let i = 0; i < n; i++) { const j = (i + 1) % n, dx = lx[j] - lx[i], dz = lz[j] - lz[i], l = Math.hypot(dx, dz) || 1; ll[i] = l; ltx[i] = dx / l; ltz[i] = dz / l; lc[i + 1] = lc[i] + l; }
  Track.LL = lc[n];
  const k0 = new Float32Array(n);
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; k0[i] = -(ltx[i] * ltz[j] - ltz[i] * ltx[j]) / (0.5 * (ll[i] + ll[j])); }
  for (let i = 0; i < n; i++) { let a = 0, w = 0; for (let d = -3; d <= 3; d++) { const q = 4 - Math.abs(d); a += k0[(i + d + n) % n] * q; w += q; } lk[i] = a / w; }
};

/* ---------- queries ---------- */
/* nearest centreline segment within reach of the barrier ring; lateral offset l is positive to the left of travel (the infield) */
Track.query = function (x, z) {
  const A = Track.s, o = _tkq; o.i = -1; if (!A || x < A.x0 || x >= A.x1 || z < A.z0 || z >= A.z1) return o;
  const cell = Track.grid[Math.floor((z - A.z0) / TC) * Track.gw + Math.floor((x - A.x0) / TC)]; if (!cell) return o;
  const px = Track.px, pz = Track.pz, tx = Track.tx, tz = Track.tz, sl = Track.sl; let best = 1e18, bi = -1, bt = 0;
  for (let k = 0; k < cell.length; k++) {
    const i = cell[k], rx = x - px[i], rz = z - pz[i]; let t = rx * tx[i] + rz * tz[i]; t = t < 0 ? 0 : t > sl[i] ? sl[i] : t;
    const qx = rx - tx[i] * t, qz = rz - tz[i] * t, d2 = qx * qx + qz * qz; if (d2 < best) { best = d2; bi = i; bt = t; }
  }
  if (bi < 0) return o;
  const rx = x - px[bi] - tx[bi] * bt, rz = z - pz[bi] - tz[bi] * bt;
  o.i = bi; o.t = bt; o.d = Math.sqrt(best); o.l = rx * Track.nx[bi] + rz * Track.nz[bi]; o.s = Track.cum[bi] + bt; return o;
};
/* progress tracking: search around the last known sample so two parts of the circuit that pass close together never get confused */
Track.locate = function (x, z, hint, out) {
  const n = Track.n, px = Track.px, pz = Track.pz, tx = Track.tx, tz = Track.tz, sl = Track.sl; let best = 1e18, bi = -1, bt = 0;
  for (let d = -10; d <= 28; d++) {
    const i = (hint + d + n * 4) % n, rx = x - px[i], rz = z - pz[i]; let t = rx * tx[i] + rz * tz[i]; t = t < 0 ? 0 : t > sl[i] ? sl[i] : t;
    const qx = rx - tx[i] * t, qz = rz - tz[i] * t, d2 = qx * qx + qz * qz; if (d2 < best) { best = d2; bi = i; bt = t; }
  }
  const rx = x - px[bi] - tx[bi] * bt, rz = z - pz[bi] - tz[bi] * bt;
  out.i = bi; out.t = bt; out.s = Track.cum[bi] + bt; out.d = Math.sqrt(best); out.l = rx * Track.nx[bi] + rz * Track.nz[bi]; return out;
};
Track.nearestIdx = function (x, z) { let best = 1e18, bi = 0; for (let i = 0; i < Track.n; i++) { const dx = x - Track.px[i], dz = z - Track.pz[i], d2 = dx * dx + dz * dz; if (d2 < best) { best = d2; bi = i; } } return bi; };
/* position and heading at distance s along the centreline, with a lateral offset (positive left) */
Track.at = function (s, off, o) {
  const L = Track.L, cum = Track.cum; s = ((s % L) + L) % L; let lo = 0, hi = Track.n - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (cum[m] <= s) lo = m; else hi = m - 1; }
  const i = lo, t = s - cum[i]; o.i = i; o.x = Track.px[i] + Track.tx[i] * t + Track.nx[i] * off; o.z = Track.pz[i] + Track.tz[i] * t + Track.nz[i] * off; o.yaw = Math.atan2(Track.tx[i], Track.tz[i]); o.tx = Track.tx[i]; o.tz = Track.tz[i]; return o;
};
/* grid slot k (0 = pole): staggered two-wide rows behind the line, facing along the straight */
Track.slot = function (k, o) { const row = k >> 1, side = (k & 1) ? -1 : 1; return Track.at(-(9 + row * 9 + (k & 1) * 4), side * 3.1, o); };

/* ---------- terrain / surface / scenery hooks ---------- */
Track.inside = function (x, z) { const A = Track.s; return !!A && x >= A.x0 && x <= A.x1 && z >= A.z0 && z <= A.z1; };
Track.flat = function (x, z, h) {
  const A = Track.s; if (!A) return h;
  const dx = Math.max(A.x0 - x, 0, x - A.x1), dz = Math.max(A.z0 - z, 0, z - A.z1); if (dx > 160 || dz > 160) return h;
  const d = Math.sqrt(dx * dx + dz * dz); if (d >= 160) return h;
  return h + (A.H0 - h) * (1 - sstep(6, 160, d));
};
Track.near = function (x, z, m) { const A = Track.s; return !!A && x > A.x0 - m && x < A.x1 + m && z > A.z0 - m && z < A.z1 + m; };
Track.clear = function (x, z, m) { return Track.near(x, z, m); };
Track.paved = function (x, z) {
  const A = Track.s; if (!A || x < A.x0 || x > A.x1 || z < A.z0 || z > A.z1) return false;
  const u = x - A.cx, v = z - A.cz, P = Track.pave;
  for (let i = 0; i < P.length; i++) { const r = P[i]; if (u >= r[0] && u <= r[1] && v >= r[2] && v <= r[3]) return true; }
  const q = Track.query(x, z); return q.i >= 0 && q.d <= TRK.HW + TRK.KERB;
};
const TRKGRASS = lc(0x5f8a3c);
Track.grassW = function (x, z) {
  const A = Track.s; if (!A) return 0;
  const dx = Math.max(A.x0 - x, 0, x - A.x1), dz = Math.max(A.z0 - z, 0, z - A.z1); if (dx > 60 || dz > 60) return 0;
  return 1 - sstep(8, 60, Math.sqrt(dx * dx + dz * dz));
};
Track.cols = function (ch) {
  const A = Track.s; if (!A) return;
  if (ch.x0 > A.x1 + 4 || ch.x0 + CHUNK < A.x0 - 4 || ch.z0 > A.z1 + 4 || ch.z0 + CHUNK < A.z0 - 4) return;
  for (const b of Track.boxes) if (b[2] > ch.x0 && b[0] < ch.x0 + CHUNK && b[3] > ch.z0 && b[1] < ch.z0 + CHUNK) ch.cols.b.push(b.slice());
  for (const c of Track.cyls) if (c[0] > ch.x0 - c[2] && c[0] < ch.x0 + CHUNK + c[2] && c[1] > ch.z0 - c[2] && c[1] < ch.z0 + CHUNK + c[2]) colCyl(ch, c[0], c[1], c[2], c[3], c[4], 2);
};
/* continuous barrier along both sides, open at the paddock gate; pushes a car circle back onto the circuit */
Track.collide = function (c, px, pz, R, P) {
  const A = Track.s; if (!A || px < A.x0 || px >= A.x1 || pz < A.z0 || pz >= A.z1) return;
  const q = Track.query(px, pz); if (q.i < 0) return;
  const al = Math.abs(q.l), lim = TRK.WALL - 0.3 - R; if (al <= lim || al > TRK.WALL + 1.6) return;
  if (q.l < 0 && q.s > Track.gap0 && q.s < Track.gap1) return;
  const sg = q.l > 0 ? -1 : 1; contact(c, px, pz, Track.nx[q.i] * sg, Track.nz[q.i] * sg, al - lim, 0, 0, P);
};
Track.dist = function (x, z) { const A = Track.s; return A ? Math.hypot(x - (A.cx), z - (A.cz + 20)) : 1e9; };

/* access road from the paddock to the nearest highway */
Track.spur = function () {
  const A = Track.s; if (!A) return;
  const sx = A.cx - 176, sz = A.cz + 270; let best = null, bd = 1e18;
  for (const r of roads) if (r.kind === 'hw') for (const p of r.pts) { const d = (p.x - sx) * (p.x - sx) + (p.z - sz) * (p.z - sz); if (d < bd) { bd = d; best = p; } }
  if (!best) return;
  const L = Math.sqrt(bd), nx0 = best.x - sx, nz0 = best.z - sz;
  const px = -nz0 / L, pz = nx0 / L, n = Math.max(4, Math.round(L / 30)), mid = [{ x: sx, z: sz }, { x: sx, z: sz + 30 }];
  for (let i = 1; i < n; i++) {
    const t = i / n, dev = Math.sin(Math.PI * t) * (L * 0.07 * noise2(t * 2.1 + 9.3, 4.7) + L * 0.03 * noise2(t * 5.3 + 2.1, 8.9));
    mid.push({ x: sx + nx0 * t + px * dev, z: sz + 30 + (nz0 - 30) * t + pz * dev });
  }
  mid.push({ x: best.x, z: best.z });
  const pts = resample(mid, 30), N = pts.length, h = new Float32Array(N);
  for (let i = 0; i < N; i++) h[i] = terrainNoRoad(pts[i].x, pts[i].z);
  for (let pass = 0; pass < 6; pass++) { const t = Float32Array.from(h); for (let i = 2; i < N - 2; i++) h[i] = (t[i - 2] + 2 * t[i - 1] + 3 * t[i] + 2 * t[i + 1] + t[i + 2]) / 9; }
  const K = 6; for (let i = 0; i < Math.min(K, N); i++) { const w = i / K; h[i] = lerp(A.H0 + 0.07, h[i], w); h[N - 1 - i] = lerp(best.h, h[N - 1 - i], w); }
  h[0] = A.H0 + 0.07; h[N - 1] = best.h;
  const maxStep = 0.075 * 30;
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 1; i < N - 1; i++) h[i] = clamp(h[i], h[i - 1] - maxStep, h[i - 1] + maxStep);
    for (let i = N - 2; i > 0; i--) h[i] = clamp(h[i], h[i + 1] - maxStep, h[i + 1] + maxStep);
  }
  for (let i = 0; i < N; i++) pts[i].h = Math.max(h[i], 2.4);
  pts[0].h = A.H0 + 0.07; pts[N - 1].h = best.h;
  Track.road = addRoad('hw', pts, 6.5, { name: 'Raceway Road', spur: true });
};

/* ---------- map symbols ---------- */
Track.drawMini = function (g) {
  if (!Track.s) return; const n = Track.n, px = Track.px, pz = Track.pz;
  const p = new Path2D(); p.moveTo(px[0], pz[0]); for (let i = 1; i < n; i += 2) p.lineTo(px[i], pz[i]); p.closePath();
  g.lineJoin = 'round'; g.strokeStyle = 'rgba(8,12,18,0.9)'; g.lineWidth = 24; g.stroke(p); g.strokeStyle = '#ff6a5c'; g.lineWidth = 16; g.stroke(p);
  g.fillStyle = '#fff'; g.fillRect(Track.px[0] - 4, Track.pz[0] - 14, 8, 28);
};
Track.drawFull = function (g, k) {
  const A = Track.s; if (!A) return; const n = Track.n, px = Track.px, pz = Track.pz;
  g.save(); g.lineJoin = 'round'; g.beginPath(); for (let i = 0; i < n; i += 2) { const s = FM.toScreen(px[i], pz[i]); if (i) g.lineTo(s[0], s[1]); else g.moveTo(s[0], s[1]); } g.closePath();
  g.strokeStyle = 'rgba(6,9,14,0.9)'; g.lineWidth = Math.max(5 * k, TRK.HW * 2 * FM.ppm + 3 * k); g.stroke(); g.strokeStyle = '#ff6a5c'; g.lineWidth = Math.max(3 * k, TRK.HW * 2 * FM.ppm); g.stroke();
  const s = FM.toScreen(A.cx, A.cz + 40), r = 7 * k; g.fillStyle = '#ff4d5e'; g.strokeStyle = '#06090e'; g.lineWidth = 2.5 * k; g.beginPath(); g.arc(s[0], s[1], r, 0, TAU); g.fill(); g.stroke();
  g.font = Math.round(9 * k) + 'px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText('🏁', s[0], s[1] + 0.5 * k);
  g.font = '700 ' + Math.round(13 * k) + 'px Rajdhani, sans-serif'; g.strokeStyle = 'rgba(0,0,0,0.85)'; g.lineWidth = 3.5 * k; g.strokeText(Track.name.toUpperCase(), s[0], s[1] - 16 * k); g.fillText(Track.name.toUpperCase(), s[0], s[1] - 16 * k);
  g.restore();
};
