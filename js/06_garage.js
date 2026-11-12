/* ================= GARAGE: car roster, bodies, per-car physics, thumbnails ================= */
/* p = chassis/drivetrain (copied into CARP); t = base tuning (before shop upgrades);
   body = mesh recipe (front is +z, wheels sit on the physics axles). stats are 1-10 display bars. */
const CARS = [
  { id: 'rook', name: 'Rook GT', cls: 'Coupe', price: 0, paint: 0, dy: 0, snd: { f: 1, lp: 1 }, dial: 280,
    blurb: 'Balanced rear-drive coupe. Easy to place, hard to hate.',
    p: { m: 1400, a: 1.2, b: 1.4, Iz: 2300, rw: 0.33, fd: 3.42, gears: [3.62, 2.19, 1.54, 1.2, 0.97, 0.78], idle: 900, red: 7400, track: 1.56, cgh: 0.5, rd: 0.95, rsf: 0.53 },
    t: { Tmax: 470, mu: 1.15, cd: 0.6, brk: 1, off: 1 },
    stats: { spd: 6, acc: 6, hdl: 6, off: 4 },
    body: { L: 4.3, W: 1.82, H: 0.5, C: 0.5, wr: 0.33, y0: 0.36 } },

  { id: 'kestrel', name: 'Kestrel', cls: 'Hot hatch', price: 1200, paint: 2, dy: -0.04, snd: { f: 1.12, lp: 1.15 }, dial: 280,
    blurb: 'Tiny, light and twitchy. Brilliant in tight streets, outgunned on the highway.',
    p: { m: 1050, a: 1.15, b: 1.3, Iz: 1550, rw: 0.31, fd: 3.95, gears: [3.4, 2.0, 1.4, 1.1, 0.9, 0.74], idle: 900, red: 7200, track: 1.5, cgh: 0.45, rd: 0.05, rsf: 0.56, cf: 10.0, cr: 12.4 },
    t: { Tmax: 232, mu: 1.22, cd: 0.46, brk: 1.05, off: 1.05 },
    stats: { spd: 5, acc: 5, hdl: 8, off: 4 },
    body: { L: 3.75, W: 1.74, H: 0.5, C: 0.62, wr: 0.31, y0: 0.34, tw: 0.24, rim: [0.62, 0.62, 0.66],
      cab: { cz: -0.3, bd: 1.3, tw: 0.62, td: 0.8, zoff: -0.2, inset: 0.06 }, lip: true, skirts: true, scoop: { z: 0.85, len: 0.45, w: 0.22, h: 0.08 } } },

  { id: 'hauler', name: 'Hauler 4x4', cls: 'Pickup', price: 2400, paint: 3, dy: 0.2, snd: { f: 0.6, lp: 0.7 }, dial: 280,
    blurb: 'Heavy diesel pickup. Slow off the line, tough, and shrugs off dirt and bumps.',
    p: { m: 2250, a: 1.55, b: 1.75, Iz: 5200, rw: 0.4, fd: 3.3, gears: [3.4, 2.0, 1.35, 1.0, 0.76], idle: 750, red: 4800, track: 1.7, cgh: 0.78, rd: 0.7, awd: true, rsf: 0.5, cf: 9.6, cr: 12.6 },
    t: { Tmax: 440, mu: 1.1, cd: 1.2, brk: 0.9, off: 1.3 },
    stats: { spd: 3, acc: 2, hdl: 3, off: 8 },
    body: { L: 5.3, W: 1.96, H: 0.62, C: 0.66, wr: 0.42, y0: 0.52, tw: 0.34, rim: [0.28, 0.28, 0.3],
      cab: { cz: 0.75, bd: 0.95, tw: 0.72, td: 0.62, zoff: -0.12, inset: 0.06 }, bed: { z1: -0.38 }, bullbar: true, flares: true } },

  { id: 'dune', name: 'Dune Runner', cls: 'Rally 4x4', price: 3800, paint: 6, dy: 0.14, snd: { f: 0.92, lp: 1.25 }, dial: 280,
    blurb: 'Lifted all-wheel-drive rally truck. Glued to gravel, grass and sand.',
    p: { m: 1550, a: 1.3, b: 1.4, Iz: 2600, rw: 0.4, fd: 3.7, gears: [3.4, 2.05, 1.45, 1.1, 0.88, 0.72], idle: 900, red: 7000, track: 1.64, cgh: 0.66, rd: 0.55, awd: true, rsf: 0.5, cf: 10.0, cr: 12.2 },
    t: { Tmax: 335, mu: 1.14, cd: 0.7, brk: 1, off: 1.4 },
    stats: { spd: 5, acc: 4, hdl: 5, off: 10 },
    body: { L: 4.45, W: 1.92, H: 0.56, C: 0.72, wr: 0.4, y0: 0.5, tw: 0.32, rim: [0.95, 0.5, 0.12],
      cab: { cz: -0.2, bd: 1.55, tw: 0.84, td: 1.2, zoff: -0.05, inset: 0.05 }, rack: true, lightbar: true, bullbar: true, flares: true } },

  { id: 'bruiser', name: 'Bruiser V8', cls: 'Muscle', price: 5200, paint: 5, dy: 0.02, snd: { f: 0.74, lp: 0.8 }, dial: 280,
    blurb: 'Huge torque, long hood, loud pipes. Wants to go sideways on the throttle.',
    p: { m: 1650, a: 1.35, b: 1.5, Iz: 3300, rw: 0.35, fd: 3.3, gears: [3.0, 1.95, 1.4, 1.1, 0.85], idle: 800, red: 6500, track: 1.62, cgh: 0.52, rd: 0.95, rsf: 0.55, cf: 10.9, cr: 11.7 },
    t: { Tmax: 500, mu: 1.12, cd: 0.56, brk: 1, off: 0.92 },
    stats: { spd: 7, acc: 7, hdl: 4, off: 3 },
    body: { L: 4.9, W: 1.95, H: 0.46, C: 0.48, wr: 0.35, y0: 0.34, tw: 0.32, rim: [0.8, 0.8, 0.84],
      cab: { cz: -0.7, bd: 0.95, tw: 0.62, td: 0.6, zoff: -0.3, inset: 0.1 }, stripes: [0.92, 0.92, 0.94], scoop: { z: 1.05, len: 0.7, w: 0.3, h: 0.12 }, lip: true, flares: true } },

  { id: 'vanta', name: 'Vanta S', cls: 'Supercar', price: 8500, paint: 1, dy: -0.12, snd: { f: 1.15, lp: 1.35 }, dial: 360,
    blurb: 'Mid-engine, wide and low. Grips like glue and rewards a smooth driver.',
    p: { m: 1280, a: 1.45, b: 1.25, Iz: 2000, rw: 0.35, fd: 3.55, gears: [3.3, 2.15, 1.6, 1.25, 1.0, 0.8, 0.66], idle: 1000, red: 8200, track: 1.7, cgh: 0.44, rd: 0.95, rsf: 0.47, ab: 0.56, cf: 10.6, cr: 12.0 },
    t: { Tmax: 470, mu: 1.32, cd: 0.4, brk: 1.15, off: 0.85, cl: 0.35 },
    stats: { spd: 8, acc: 9, hdl: 9, off: 2 },
    body: { L: 4.4, W: 2.0, H: 0.34, C: 0.38, wr: 0.35, y0: 0.28, tw: 0.34, rim: [0.2, 0.2, 0.22], lw: 0.38, lh: 0.07, tlh: 0.08,
      cab: { cz: 0.2, bd: 0.95, tw: 0.55, td: 0.5, zoff: -0.2, inset: 0.15 }, wing: { h: 0.34, z: 0.3, span: 0.84, chord: 0.38 }, splitter: true, diffuser: true, intakes: true, deck: { z0: -1.8, z1: -0.9 }, flares: true } },

  { id: 'phantom', name: 'Phantom R', cls: 'Hypercar', price: 14000, paint: 5, dy: -0.14, snd: { f: 1.3, lp: 1.5 }, dial: 360,
    blurb: 'Over 1000 hp of carbon-fibre menace. Frighteningly fast, fully committed.',
    p: { m: 1300, a: 1.45, b: 1.3, Iz: 2050, rw: 0.36, fd: 3.4, gears: [3.2, 2.15, 1.6, 1.25, 1.0, 0.82, 0.68], idle: 1000, red: 9000, track: 1.74, cgh: 0.42, rd: 0.6, awd: true, rsf: 0.5, ab: 0.56, cf: 10.8, cr: 12.0 },
    t: { Tmax: 640, mu: 1.45, cd: 0.45, brk: 1.25, off: 0.8, cl: 0.8 },
    stats: { spd: 10, acc: 10, hdl: 10, off: 1 },
    body: { L: 4.6, W: 2.06, H: 0.3, C: 0.36, wr: 0.36, y0: 0.24, tw: 0.36, rim: [0.12, 0.12, 0.13], lw: 0.42, lh: 0.06, tlh: 0.06, tailBar: true, glass: [0.01, 0.014, 0.02],
      cab: { cz: 0.1, bd: 0.9, tw: 0.5, td: 0.42, zoff: -0.3, inset: 0.2 }, wing: { h: 0.5, z: 0.35, span: 0.9, chord: 0.42, plates: true }, splitter: true, diffuser: true, intakes: true, deck: { z0: -1.9, z1: -0.85 }, stripes: [0.05, 0.05, 0.06], flares: true } },

  { id: 'ridge', name: 'Ridgeback RS', cls: 'Rally car', price: 6800, paint: 1, dy: 0.1, snd: { f: 1.05, lp: 1.3 }, dial: 280,
    blurb: 'Stage-bred all-wheel-drive rally hatch: long-travel suspension, huge wing, a bonnet full of vents and a taste for gravel, big air and splintered fences.',
    p: { m: 1260, a: 1.22, b: 1.25, Iz: 1900, rw: 0.37, fd: 4.5, gears: [3.3, 2.4, 1.85, 1.5, 1.22, 1.0], idle: 1000, red: 7400, track: 1.64, cgh: 0.56, rd: 0.5, awd: true, rsf: 0.5, ab: 0.5, cf: 10.0, cr: 11.4 },
    t: { Tmax: 520, mu: 1.02, cd: 0.95, brk: 1.05, off: 1.22, cl: 0.1 },
    stats: { spd: 7, acc: 9, hdl: 8, off: 10 },
    body: { L: 4.15, W: 1.9, H: 0.5, C: 0.55, wr: 0.37, y0: 0.46, tw: 0.27, rim: [0.95, 0.72, 0.16], rimStyle: 'five',
      cab: { cz: -0.3, bd: 1.45, tw: 0.7, td: 0.98, zoff: -0.14, inset: 0.06 }, squareback: true, noseR: 0.5, flares: true, skirts: true, splitter: true, lightbar: true,
      stripes: [1.0, 0.78, 0.1], wing: { h: 0.4, z: 0.26, span: 0.94, chord: 0.5, plates: true }, rally: true, exhaust: 1 } },

  /* an original design: a heavy twin-turbo all-wheel-drive coupe built for the strip. lat scales the tyres' cornering grip only (06_car.js), so it launches like nothing else and will not turn */
  { id: 'basilisk', name: 'Basilisk DR', cls: 'Drag coupe', price: 32000, paint: 5, dy: 0.06, snd: { f: 0.9, lp: 1.6 }, dial: 460,
    blurb: 'A 2,400 hp twin-turbo all-wheel-drive coupe on tall rally rubber, with wheelie bars and a parachute pack. It leaves the line like a missile and runs past 400 km/h. Corners are somebody else\'s problem.',
    p: { m: 1680, a: 1.36, b: 1.42, Iz: 5400, rw: 0.4, fd: 3.0, gears: [3.3, 2.15, 1.58, 1.22, 0.96, 0.72], idle: 1100, red: 8000, track: 1.62, cgh: 0.5, rd: 0.6, awd: true, rsf: 0.62, ab: 0.5, cf: 5.2, cr: 9.6, lat: 0.38 },
    t: { Tmax: 1500, mu: 1.62, cd: 0.36, brk: 0.95, off: 0.95, cl: 0.6 },
    stats: { spd: 10, acc: 10, hdl: 1, off: 3 },
    body: { L: 4.7, W: 1.96, H: 0.46, C: 0.44, wr: 0.4, y0: 0.42, tw: 0.4, rim: [0.08, 0.08, 0.09], rimStyle: 'five', glass: [0.01, 0.012, 0.016], lw: 0.36, lh: 0.07,
      cab: { cz: -0.4, bd: 1.05, tw: 0.6, td: 0.62, zoff: -0.24, inset: 0.11 }, wing: { h: 0.2, z: 0.2, span: 0.8, chord: 0.3 }, splitter: true, skirts: true, flares: true, scoop: { z: 0.95, len: 0.6, w: 0.26, h: 0.1 }, exhaust: 4, drag: true } }
];
const CAR_BY_ID = {}; for (const d of CARS) { CAR_BY_ID[d.id] = d; const b = d.body; d.top = (b.y0 != null ? b.y0 : 0.36) + b.H + 0.1 + b.C; d.hl = b.L / 2; }
const BASE_N = CARS.length;   /* CARS[0..BASE_N) are the dealership cars; stolen cars are appended at runtime (see 07_jack.js) */
let CUR = CARS[0];

const curPaint = (id) => { const i = save.cc[id || save.car]; return i != null ? i : CAR_BY_ID[id || save.car].paint; };

/* ---------- make a car the active one (physics + body + cameras) ---------- */
function applyCar(id, rebuildMesh) {
  const d = CAR_BY_ID[id] || CARS[0]; CUR = d; save.car = d.id;
  Object.assign(CARP, { awd: false, rsf: 0.5, ab: 0.5, cf: 10.2, cr: 12.2, lat: 1 }, d.p, { gears: d.p.gears.slice() }); CARP.L = d.p.a + d.p.b;   /* optional keys go back to their defaults first, so one car's all-wheel drive or drag tyres never carry over to the next */
  refreshTune();
  const hl = d.hl, hw = d.body.W / 2;
  CIRC[0][0] = hl - 0.45; CIRC[1][0] = 0; CIRC[2][0] = -(hl - 0.45); for (const k of CIRC) k[1] = hw + 0.09;
  car.gear = Math.min(car.gear, CARP.gears.length);
  d.bumpY = (d.body.y0 != null ? d.body.y0 : 0.36) + 0.19; d.bumpZ = hl + 0.2;
  EYE.y = 1.13 + d.dy; if (Cockpit.group) Cockpit.group.position.y = d.dy;
  if (Cockpit.hood) { Cockpit.hood.scale.set(d.body.W / 1.82, 1, clamp((hl + 0.43 - 1.18) / 1.4, 0.6, 1.7)); }
  if (rebuildMesh && car.body) {
    const old = car.ext; car.body.remove(old);
    disposeCar(old);
    car.ext = buildPlayerCar(d, d.id); car.ext.userData.wrec.player = true; car.body.add(car.ext); Dmg.attach(car.ext);
    car.ext.visible = Cam.view !== 0;
  }
  if (L.head) L.head.position.set(0, (d.body.y0 != null ? d.body.y0 : 0.36) + d.body.H * 0.7 + 0.1, hl - 0.2);
  Cosm.paintPlayer();
}

/* ---------- garage thumbnails (rendered once per car + paint) ---------- */
const Thumb = { cache: Object.create(null), scene: null, cam: null, rt: null, cv: null, ok: true };
function thumbInit() {
  const sc = Thumb.scene = new THREE.Scene();
  sc.add(new THREE.HemisphereLight(0xdbe9ff, 0x3a3d44, 0.85));
  const sun = new THREE.DirectionalLight(0xfff0da, 1.55); sun.position.set(-5, 6, 6); sc.add(sun);
  const rim = new THREE.DirectionalLight(0x8fbaff, 0.7); rim.position.set(6, 3, -6); sc.add(rim);
  const cv = mkCanvas(128, 128), g = cv.getContext('2d'), gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  gr.addColorStop(0, 'rgba(0,0,0,0.7)'); gr.addColorStop(0.45, 'rgba(0,0,0,0.3)'); gr.addColorStop(0.8, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(8.5, 6), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = 0.01; sc.add(blob); Thumb.blob = blob;
  Thumb.cam = new THREE.PerspectiveCamera(26, 16 / 9, 0.1, 100);
  Thumb.W = 640; Thumb.H = 360;
  Thumb.rt = new THREE.WebGLRenderTarget(Thumb.W, Thumb.H, { format: THREE.RGBAFormat, type: THREE.UnsignedByteType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
  Thumb.big = mkCanvas(Thumb.W, Thumb.H); Thumb.small = mkCanvas(320, 180);
}
function carThumb(d, paintIdx) {
  const key = d.id + ':' + paintIdx + ':' + cosSig(d.id); if (key in Thumb.cache) return Thumb.cache[key];
  let url = '';
  if (Thumb.ok) {
    try {
      if (!Thumb.scene) thumbInit();
      const mesh = paintIdx === curPaint(d.id) ? buildPlayerCar(d, d.id, true) : buildCarModel(d, PAINTS[paintIdx], { studio: true, static: true }); Thumb.scene.add(mesh); Thumb.blob.scale.set(d.body.L * 1.45 / 8.5, d.body.W * 2.6 / 6, 1);
      const D = d.body.L * 1.55, cam = Thumb.cam;
      cam.position.set(-D * 0.58, d.top * 0.7 + D * 0.13, D * 0.8); cam.lookAt(0, d.top * 0.42, 0); cam.updateMatrixWorld(true);
      const r = renderer, prevRT = r.getRenderTarget(), prevTM = r.toneMapping, pc = new THREE.Color(), pa = r.getClearAlpha(); r.getClearColor(pc);
      r.toneMapping = THREE.NoToneMapping; r.setRenderTarget(Thumb.rt); r.setClearColor(0x000000, 0); r.clear(); r.render(Thumb.scene, cam);
      const W = Thumb.W, H = Thumb.H, buf = new Uint8Array(W * H * 4); r.readRenderTargetPixels(Thumb.rt, 0, 0, W, H, buf);
      r.setRenderTarget(prevRT); r.toneMapping = prevTM; r.setClearColor(pc, pa);
      Thumb.scene.remove(mesh); disposeCar(mesh);
      const g = Thumb.big.getContext('2d'), img = g.createImageData(W, H), px = img.data, lut = Thumb.lut || (Thumb.lut = Uint8Array.from({ length: 256 }, (_, i) => Math.round(255 * Math.pow(i / 255, 1 / 2.15))));
      for (let y = 0; y < H; y++) { const so = (H - 1 - y) * W * 4, dO = y * W * 4; for (let x = 0; x < W * 4; x += 4) { px[dO + x] = lut[buf[so + x]]; px[dO + x + 1] = lut[buf[so + x + 1]]; px[dO + x + 2] = lut[buf[so + x + 2]]; px[dO + x + 3] = buf[so + x + 3]; } }
      g.putImageData(img, 0, 0);
      const s = Thumb.small.getContext('2d'); s.clearRect(0, 0, 320, 180); s.imageSmoothingQuality = 'high'; s.drawImage(Thumb.big, 0, 0, 320, 180);
      url = Thumb.small.toDataURL('image/png');
    } catch (e) { Thumb.ok = false; url = ''; }
  }
  Thumb.cache[key] = url; return url;
}
