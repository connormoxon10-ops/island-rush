/* ================= THE VELVET CUE: eight-ball billiards (Fairhaven) =================
   Full-size 9 ft table in a purple-lit club, real 2D ball physics (substepped), six pockets, cushions, eight-ball rules and a rival that picks
   a ghost-ball shot (with an aim error that shrinks as the stakes go up). Aim with the pointer (or arrows), then press and hold and pull the pointer back: the cue slides back and the power meter climbs the further you pull; let go to shoot. */
Ven.games.pool = (function () {
  const R = 0.0286, TL = 2.54, TW = 1.27, HX = TL / 2 - R, HZ = TW / 2 - R, TY = 0.86, CY = TY + R, E_B = 0.95, E_W = 0.78, DT = 1 / 480, FOOT = 0.635;
  const COLS = [0xf4f0e6, 0xf2c230, 0x1f5fd8, 0xd8342c, 0x6a2a9a, 0xf07a1c, 0x1f8a3c, 0x7a1c24, 0x111111];
  const colOf = (n) => COLS[n ? ((n - 1) % 8) + 1 : 0];
  const grpOf = (n) => (n === 0 || n === 8 ? null : n < 8 ? 'solid' : 'stripe');
  const PK = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) PK.push({ x: sx * (TL / 2 + 0.025), z: sz * (TW / 2 + 0.025), cap: 0.086, corner: true });
  for (const sz of [-1, 1]) PK.push({ x: 0, z: sz * (TW / 2 + 0.045), cap: 0.066, corner: false });
  const G = { ready: false, sc: null, cam: null, expo: 1.15, stakeLabel: 'Entry stake',
    rules: 'Pot all of your group (solids or stripes), then the 8. A scratch or a bad first hit gives your rival the cue ball in hand. A win pays double your stake; casual wins pay $30. <b>Aim with the pointer, then press and hold and drag back</b> away from the shot: the further you pull the cue back the more power you build, and letting go takes the shot (drag back to where you started to cancel).' };
  const B = []; let cue = null, st = null, V0 = null, sh = null, cueG = null, stick = null, el = null, G1 = null;
  const guide = { main: null, obj: null, cut: null, ring: null }; let blobGeo = null;
  const kd = {}; let camKey = '', camD = 4, camOx = 0, camOy = 0, lastMv = -1;
  const rnd = () => (st ? st.rnd() : Math.random());
  const gauss = () => { let u = 0, v = 0; while (u < 1e-6) u = rnd(); v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); };
  const ang = (a) => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
  const speedOf = (p) => 0.25 + 8.1 * Math.pow(clamp(p, 0, 1), 1.8);
  const powerOf = (v) => Math.pow(clamp((v - 0.25) / 8.1, 0, 1), 1 / 1.8);
  const stopDist = (v) => v / 0.3 - 2.889 * Math.log(1 + 1.1538 * v);
  const speedFor = (d) => { let lo = 0.2, hi = 9; for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; if (stopDist(m) < d) lo = m; else hi = m; } return (lo + hi) / 2; };
  const tok = (v, hard) => { if (!Snd.ok || !Snd.ctx || V0.t - (tok.t || -1) < 0.025) return; tok.t = V0.t; const t = Snd.ctx.currentTime, vol = clamp(v / 5, 0.05, 0.4); Snd.tone(t, hard ? 2100 : 1500, 0.05, 'triangle', vol * 0.55, 6000, 0.0008, Snd.sfx); Snd.noiseHit(t, 0.025, vol * 0.5, 2500, 0, Snd.sfx); };
  const thud = (v) => { if (!Snd.ok || !Snd.ctx || V0.t - (thud.t || -1) < 0.04) return; thud.t = V0.t; const t = Snd.ctx.currentTime; Snd.tone(t, 150, 0.09, 'sine', clamp(v / 6, 0.04, 0.22), 900, 0.001, Snd.sfx); };

  /* ---------- scene ---------- */
  function ballTex(n) {
    const cv = mkCanvas(256, 128), g = cv.getContext('2d'), c = _hexCss(colOf(n));
    g.fillStyle = n > 8 || n === 0 ? '#f4f0e6' : c; g.fillRect(0, 0, 256, 128);
    if (n > 8) { g.fillStyle = c; g.fillRect(0, 34, 256, 60); }
    if (n === 0) { g.fillStyle = '#c0392b'; for (const x of [64, 192]) { g.beginPath(); g.arc(x, 64, 5, 0, TAU); g.fill(); } }
    else { for (const x of [64, 192]) { g.fillStyle = '#f4f0e6'; g.beginPath(); g.arc(x, 64, 21, 0, TAU); g.fill(); g.fillStyle = '#111'; g.font = '700 26px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(n), x, 66); } }
    return canvasTex(cv, true, false);
  }
  function noiseTex(base, w, h, rep, n, amp) {
    const cv = mkCanvas(w, h), g = cv.getContext('2d'), r = mulberry32(base.length * 31 + w); g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < n; i++) { g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,' + amp + ')' : 'rgba(0,0,0,' + amp + ')'; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); }
    const t = canvasTex(cv, true, true); t.repeat.set(rep[0], rep[1]); return t;
  }
  function mkGuide(op) { const geo = new THREE.PlaneGeometry(1, 0.0075); geo.rotateX(-Math.PI / 2); geo.translate(0.5, 0, 0); const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: op, depthWrite: false })); m.position.y = TY + 0.0035; m.visible = false; m.renderOrder = 3; G.sc.add(m); return m; }
  function build() {
    const sc = G.sc = venRoom({ w: 14, d: 15, h: 4.6, bg: 0x09060e, floor: 0x2c0f1c, wall: 0x241830, ceil: false, hemi: 0.42, sky: 0xe8dcff, gnd: 0x3a1a2a });
    const car = new THREE.Mesh(new THREE.PlaneGeometry(14, 15), new THREE.MeshStandardMaterial({ map: (function () { const cv = mkCanvas(128, 128), g = cv.getContext('2d'); g.fillStyle = '#3a1220'; g.fillRect(0, 0, 128, 128); g.strokeStyle = 'rgba(190,120,160,0.28)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 64); g.lineTo(64, 0); g.lineTo(128, 64); g.lineTo(64, 128); g.closePath(); g.stroke(); g.fillStyle = 'rgba(214,170,90,0.4)'; for (const [x, y] of [[0, 64], [64, 0], [128, 64], [64, 128], [64, 64]]) { g.beginPath(); g.arc(x, y, 3, 0, TAU); g.fill(); } const t = canvasTex(cv, true, true); t.repeat.set(9, 9); return t; })(), roughness: 0.95, metalness: 0 }));
    car.rotation.x = -Math.PI / 2; car.position.y = 0.002; sc.add(car);
    const sp = new THREE.SpotLight(lc(0xfff0dc), 1.45, 16, 0.78, 0.8, 1.0); sp.position.set(0, 4.0, 0.5); sp.target.position.set(0, TY, 0); sc.add(sp, sp.target);
    for (const x of [-4.8, 4.8]) { const pl = new THREE.PointLight(lc(0x9a5cff), 1.1, 11, 1.5); pl.position.set(x, 1.6, 0); sc.add(pl); }
    const pl2 = new THREE.PointLight(lc(0xffc890), 0.7, 10, 1.5); pl2.position.set(0, 2.4, 2.2); sc.add(pl2);
    /* table */
    const wood = venMat(0x4a2012, 0.45, 0.05), felt = venMat(0x0b5a34, 0.95), brass = venMat(0xc9a24a, 0.35, 0.7);
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(TL + 0.12, TW + 0.12), new THREE.MeshStandardMaterial({ map: noiseTex('#0c6a3c', 256, 256, [5, 3], 2600, 0.07), roughness: 0.96, metalness: 0 })); cloth.rotation.x = -Math.PI / 2; cloth.position.y = TY; sc.add(cloth);
    venBox(sc, TL + 0.4, 0.3, TW + 0.4, 0, TY - 0.2, 0, venMat(0x2a1208, 0.55));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) venBox(sc, 0.18, TY - 0.05, 0.18, sx * (TL / 2 + 0.06), (TY - 0.05) / 2, sz * (TW / 2 + 0.06), venMat(0x2a1208, 0.5));
    const rw = 0.14, ro = 0.05 + rw / 2;
    for (const sz of [-1, 1]) venBox(sc, TL + 0.38, 0.09, rw, 0, TY, sz * (TW / 2 + ro), wood);
    for (const sx of [-1, 1]) venBox(sc, rw, 0.09, TW + 0.38, sx * (TL / 2 + ro), TY, 0, wood);
    const gp = 0.092, cg = 0.11;
    for (const sz of [-1, 1]) for (const [a, b] of [[-TL / 2 + cg, -gp], [gp, TL / 2 - cg]]) venBox(sc, b - a, 0.035, 0.05, (a + b) / 2, TY + 0.0175, sz * (TW / 2 + 0.025), felt);
    for (const sx of [-1, 1]) venBox(sc, 0.05, 0.035, TW - 2 * cg, sx * (TL / 2 + 0.025), TY + 0.0175, 0, felt);
    const hole = new THREE.MeshBasicMaterial({ color: 0x020204 });
    for (const p of PK) {
      const d = new THREE.Mesh(new THREE.CircleGeometry(p.corner ? 0.077 : 0.07, 24), hole); d.rotation.x = -Math.PI / 2; d.position.set(p.x, TY + 0.0465, p.z); sc.add(d);
      const rg = new THREE.Mesh(new THREE.RingGeometry(p.corner ? 0.077 : 0.07, p.corner ? 0.093 : 0.086, 24), brass); rg.rotation.x = -Math.PI / 2; rg.position.set(p.x, TY + 0.0467, p.z); sc.add(rg);
    }
    const pearl = venMat(0xf2ecd8, 0.4, 0, 0x403c30);
    for (const sz of [-1, 1]) for (const k of [-3, -2, -1, 1, 2, 3]) { const d = venBox(sc, 0.022, 0.003, 0.022, k * TL / 8, TY + 0.0465, sz * (TW / 2 + ro), pearl); d.rotation.y = Math.PI / 4; }
    for (const sx of [-1, 1]) for (const k of [-1, 0, 1]) { const d = venBox(sc, 0.022, 0.003, 0.022, sx * (TL / 2 + ro), TY + 0.0465, k * TW / 4, pearl); d.rotation.y = Math.PI / 4; }
    for (const x of [-FOOT, 0, FOOT]) { const d = new THREE.Mesh(new THREE.CircleGeometry(0.0075, 12), new THREE.MeshBasicMaterial({ color: 0x063a20 })); d.rotation.x = -Math.PI / 2; d.position.set(x, TY + 0.0012, 0); sc.add(d); }
    const hs = new THREE.Mesh(new THREE.PlaneGeometry(0.003, TW), new THREE.MeshBasicMaterial({ color: 0x0a6a3c })); hs.rotation.x = -Math.PI / 2; hs.position.set(-FOOT, TY + 0.0011, 0); sc.add(hs);
    /* club furniture around the table */
    const leather = venMat(0x5a1626, 0.5, 0.05), dk = venMat(0x1a1218, 0.6);
    for (const [x, z, k] of [[-3.2, -2.0, 0], [3.2, -2.0, 0], [-3.2, 2.0, 0], [3.2, 2.0, 0]]) { venCyl(sc, 0.3, 0.3, 0.06, x, 0.74, z, leather, 24); venCyl(sc, 0.04, 0.04, 0.72, x, 0.36, z, brass, 8); venCyl(sc, 0.22, 0.22, 0.03, x, 0.015, z, dk, 18); }
    for (const [x, z] of [[-3.6, 0], [3.6, 0]]) { venCyl(sc, 0.42, 0.42, 0.04, x, 1.05, z, dk, 24); venCyl(sc, 0.05, 0.05, 1.03, x, 0.52, z, brass, 8); venCyl(sc, 0.2, 0.2, 0.03, x, 0.015, z, dk, 18); venCyl(sc, 0.035, 0.035, 0.16, x - 0.1, 1.15, z, venMat(0xd4a050, 0.2, 0.2, 0x4a2c08), 10); venCyl(sc, 0.03, 0.03, 0.14, x + 0.15, 1.14, z + 0.05, venMat(0x8ad8c8, 0.2, 0, 0x103830), 10); }
    for (const z of [-2.6, 2.6]) { venBox(sc, 0.3, 1.4, 0.3, -5.2, 0.7, z, venMat(0x2a1a2e, 0.7)); venBox(sc, 0.04, 1.2, 0.04, -5.2, 0.7, z + (z < 0 ? 0.17 : -0.17), venMat(0x9a5cff, 0.3, 0, 0x7a3cff)); }
    /* blob shadows + balls */
    const cv = mkCanvas(64, 64), g = cv.getContext('2d'), gr = g.createRadialGradient(32, 32, 3, 32, 32, 31); gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    const bmat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false }); blobGeo = new THREE.PlaneGeometry(R * 3.6, R * 3.6); blobGeo.rotateX(-Math.PI / 2);
    const sph = new THREE.SphereGeometry(R, 24, 16);
    for (let n = 0; n <= 15; n++) {
      const m = new THREE.Mesh(sph, new THREE.MeshStandardMaterial({ map: ballTex(n), roughness: 0.2, metalness: 0.02 })), bl = new THREE.Mesh(blobGeo, bmat); bl.position.y = TY + 0.002; bl.renderOrder = 1; sc.add(m, bl);
      B.push({ n, x: 0, z: 0, vx: 0, vz: 0, in: false, sink: 0, pk: 0, mesh: m, blob: bl, ox: 0, oz: 0 });
    }
    cue = B[0];
    /* cue stick (tip at the group's origin, butt toward -x) */
    cueG = new THREE.Group(); stick = new THREE.Group(); cueG.add(stick); sc.add(cueG);
    const seg = (r0, r1, a, b, mat) => { const geo = new THREE.CylinderGeometry(r0, r1, b - a, 12); geo.rotateZ(-Math.PI / 2); const m = new THREE.Mesh(geo, mat); m.position.x = -(a + b) / 2; stick.add(m); };
    seg(0.0052, 0.0052, 0, 0.012, venMat(0x2a6ad8, 0.9)); seg(0.0058, 0.0058, 0.012, 0.04, venMat(0xf4f0e6, 0.4)); seg(0.0058, 0.0095, 0.04, 0.85, venMat(0xe6c88e, 0.45)); seg(0.0095, 0.0125, 0.85, 1.38, venMat(0x2a1420, 0.4, 0.1)); seg(0.0126, 0.0126, 0.9, 0.96, venMat(0x9a5cff, 0.3, 0.2, 0x5a2ca0)); seg(0.0128, 0.0128, 1.35, 1.4, brass);
    cueG.visible = false;
    guide.main = mkGuide(0.55); guide.obj = mkGuide(0.42); guide.cut = mkGuide(0.3);
    const rg = new THREE.Mesh(new THREE.RingGeometry(R - 0.0026, R, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false })); rg.rotation.x = -Math.PI / 2; rg.position.y = TY + 0.0036; rg.visible = false; rg.renderOrder = 3; sc.add(rg); guide.ring = rg;
    G.cam = new THREE.PerspectiveCamera(36, 16 / 9, 0.05, 60);
  }
  function ui() {
    if (el) return;
    const s = document.createElement('style');
    s.textContent = '#poolPw{position:absolute;right:16px;top:50%;transform:translateY(-50%);width:62px;height:min(50vh,330px);pointer-events:auto;touch-action:none;user-select:none;-webkit-user-select:none;text-align:center;color:#dfe6ee;font-size:11px;letter-spacing:.16em;text-transform:uppercase}' +
      '#poolPw[hidden]{display:none}#poolPw .pwt{position:absolute;left:14px;right:14px;top:20px;bottom:28px;border-radius:12px;border:2px solid rgba(255,255,255,.55);background:linear-gradient(#e74c3c,#f4d03f 45%,#58d68d);overflow:hidden;cursor:ns-resize}' +
      '#poolPw .pwt i{position:absolute;left:0;right:0;top:0;background:rgba(6,10,16,.9)}#poolPw .pwk{position:absolute;left:6px;right:6px;height:8px;border-radius:4px;background:#fff;box-shadow:0 0 10px #000;margin-top:-4px;pointer-events:none}' +
      '#poolPw b{position:absolute;top:0;left:0;right:0;font-weight:700}#poolPw small{position:absolute;bottom:2px;left:-8px;right:-8px;font-size:10px;color:#9fb0c4;letter-spacing:.05em}';
    document.head.appendChild(s);
    el = document.createElement('div'); el.id = 'poolPw'; el.hidden = true; el.innerHTML = '<b>Power</b><div class="pwt"><i></i></div><div class="pwk"></div><small>pull the cue back</small>';
    E.ven.appendChild(el);
    const trk = el.querySelector('.pwt'), msk = trk.querySelector('i'), knob = el.querySelector('.pwk'), lab = el.querySelector('b'); let pid = -1;
    const setP = (p) => { st.pw = clamp(p, 0, 1); msk.style.height = ((1 - st.pw) * 100).toFixed(1) + '%'; knob.style.top = (20 + (1 - st.pw) * (trk.clientHeight)) + 'px'; lab.textContent = st.pw > 0.01 ? Math.round(st.pw * 100) + '%' : 'Power'; };
    G.setP = setP;
    const at = (e) => { const r = trk.getBoundingClientRect(); return 1 - clamp((e.clientY - r.top) / r.height, 0, 1); };
    el.addEventListener('pointerdown', (e) => { if (!st || st.phase !== 'aim' || st.turn !== 'me') return; pid = e.pointerId; try { el.setPointerCapture(pid); } catch (er) { /* ignore */ } st.drag = true; setP(at(e)); e.preventDefault(); });
    el.addEventListener('pointermove', (e) => { if (e.pointerId === pid && st && st.drag) setP(at(e)); });
    const rel = (e) => { if (e.pointerId !== pid || !st) return; pid = -1; if (!st.drag) return; st.drag = false; if (st.pw > 0.045 && st.phase === 'aim') fireMe(st.pw); else setP(0); };
    el.addEventListener('pointerup', rel); el.addEventListener('pointercancel', rel);
  }
  G.init = function (V) { V0 = V; build(); ui(); };
  /* ---------- game state ---------- */
  function newState(seed) { return { rnd: mulberry32(seed), phase: 'lobby', turn: 'me', grp: { me: null, ai: null }, brk: true, inHand: null, aim: 0, pw: 0, pull: 0, drag: false, pdrag: false, pdx: 0, pdy: 0, p0x: 0, p0y: 0, pmax: 200, t: 0, plan: null, endT: 0, rollT: 0, rest: 0, stat: { me: 0, ai: 0, shots: 0 }, run: 0, bestRun: 0, winner: null, why: '', pend: null, stT: 0 }; }
  function rack() {
    const order = []; for (let n = 1; n <= 15; n++) if (n !== 8) order.push(n);
    for (let i = order.length - 1; i > 0; i--) { const j = (rnd() * (i + 1)) | 0; const t = order[i]; order[i] = order[j]; order[j] = t; }
    const pos = []; for (let r = 0; r < 5; r++) for (let k = 0; k <= r; k++) pos.push([FOOT + r * (Math.sqrt(3) * R + 0.0008), (k - r / 2) * (2 * R + 0.0008)]);
    const slot = new Array(15); let q = 0; for (let i = 0; i < 15; i++) slot[i] = i === 4 ? 8 : order[q++];
    if (grpOf(slot[10]) === grpOf(slot[14])) { for (let j = 0; j < 10; j++) if (j !== 4 && grpOf(slot[j]) !== grpOf(slot[10])) { const t = slot[14]; slot[14] = slot[j]; slot[j] = t; break; } }
    for (let i = 0; i < 15; i++) { const b = B[slot[i]]; b.x = pos[i][0]; b.z = pos[i][1]; }
    for (const b of B) { b.vx = b.vz = 0; b.in = false; b.sink = 0; b.mesh.visible = true; b.mesh.scale.setScalar(1); b.blob.visible = true; b.ox = b.x; b.oz = b.z; b.mesh.quaternion.set(0, 0, 0, 1); b.mesh.rotation.set(rnd() * TAU, rnd() * TAU, 0); }
    cue.x = -FOOT; cue.z = 0; cue.ox = cue.x; cue.oz = cue.z;
  }
  function free(x, z, skip) { if (Math.abs(x) > HX || Math.abs(z) > HZ) return false; for (const b of B) { if (b === skip || b.in) continue; if ((b.x - x) * (b.x - x) + (b.z - z) * (b.z - z) < (2 * R + 0.002) * (2 * R + 0.002)) return false; } return true; }
  function findFree(x, z, skip) { if (free(x, z, skip)) return [x, z]; for (let r = 0.01; r < 1.2; r += 0.02) for (let a = 0; a < TAU; a += 0.5) { const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r; if (free(px, pz, skip)) return [px, pz]; } return [x, z]; }
  /* ---------- physics ---------- */
  function pocketIn(b, i) { if (b.in) return; b.in = true; b.sink = 0; b.pk = i; b.vx = b.vz = 0; b.blob.visible = false; if (b === cue) sh.cue = true; else sh.pocketed.push(b.n); if (Snd.ok) { Snd.pop(); thud(4); } }
  function nearPk(b) { let bi = 0, bd = 1e9; for (let i = 0; i < PK.length; i++) { const d = Math.hypot(b.x - PK[i].x, b.z - PK[i].z); if (d < bd) { bd = d; bi = i; } } return bi; }
  function stepPhys(h) {
    for (const b of B) {
      if (b.in || (b.vx === 0 && b.vz === 0)) continue;
      const sp = Math.hypot(b.vx, b.vz), dec = (0.26 + 0.3 * sp) * h;
      if (sp <= dec + 0.004) { b.vx = 0; b.vz = 0; continue; }
      const k = (sp - dec) / sp; b.vx *= k; b.vz *= k; b.x += b.vx * h; b.z += b.vz * h;
      const ax = Math.abs(b.x), az = Math.abs(b.z), sx = b.x < 0 ? -1 : 1, sz = b.z < 0 ? -1 : 1;
      if (Math.hypot(ax - TL / 2, az - TW / 2) < 0.125) { if (ax > HX + 0.012 || az > HZ + 0.012) pocketIn(b, nearPk(b)); }
      else if (az > HZ && ax < 0.066) { if (az > HZ + 0.012) pocketIn(b, nearPk(b)); }
      else {
        if (az > HZ) { b.z = sz * HZ; if (b.vz * sz > 0) { thud(Math.abs(b.vz)); b.vz = -b.vz * E_W; b.vx *= 0.975; if (sh.first != null) sh.rail = true; } }
        if (ax > HX) { b.x = sx * HX; if (b.vx * sx > 0) { thud(Math.abs(b.vx)); b.vx = -b.vx * E_W; b.vz *= 0.975; if (sh.first != null) sh.rail = true; } }
      }
      if (!b.in) for (let i = 0; i < PK.length; i++) { const p = PK[i]; if (Math.hypot(b.x - p.x, b.z - p.z) < p.cap) { pocketIn(b, i); break; } }
    }
    for (let i = 0; i < 16; i++) {
      const a = B[i]; if (a.in) continue;
      for (let j = i + 1; j < 16; j++) {
        const b = B[j]; if (b.in) continue; const dx = b.x - a.x, dz = b.z - a.z, d2 = dx * dx + dz * dz;
        if (d2 >= 4 * R * R || d2 < 1e-12) continue; const d = Math.sqrt(d2), nx = dx / d, nz = dz / d, ov = (2 * R - d) / 2;
        a.x -= nx * ov; a.z -= nz * ov; b.x += nx * ov; b.z += nz * ov;
        const rel = (a.vx - b.vx) * nx + (a.vz - b.vz) * nz;
        if (rel > 0) { const jn = (1 + E_B) / 2 * rel; a.vx -= jn * nx; a.vz -= jn * nz; b.vx += jn * nx; b.vz += jn * nz; tok(rel, rel > 2.5); if (i === 0 && sh.first == null) sh.first = b.n; }
      }
    }
  }
  const moving = () => { for (const b of B) if (!b.in && (b.vx !== 0 || b.vz !== 0)) return true; return false; };
  /* ---------- rules ---------- */
  const nameOf = (w) => (w === 'me' ? 'You' : 'Rival');
  function ownLeft(who) { const g = st.grp[who]; if (!g) return 99; let c = 0; for (let n = 1; n <= 15; n++) if (n !== 8 && grpOf(n) === g && !B[n].in) c++; return c; }
  function startShot(who, a, speed) {
    st.aim = a; st.pend = { a, speed }; sh = { who, first: null, pocketed: [], cue: false, rail: false, brk: st.brk, left0: ownLeft(who) }; st.phase = 'strike'; st.stT = 0; st.stat.shots++; st.inHand = null;
  }
  /* ---------- pull-back control: press and hold, drag away from the shot ---------- */
  const vp = new THREE.Vector3();
  function glSize() { const r = E.gl.getBoundingClientRect(); return [r.width || innerWidth, r.height || innerHeight]; }
  function scr(x, z) { const S = glSize(); vp.set(x, CY, z).project(G.cam); return [(vp.x * 0.5 + 0.5) * S[0], (-vp.y * 0.5 + 0.5) * S[1]]; }
  function pullBegin(P) {
    const S = glSize(), a = scr(cue.x, cue.z), b = scr(cue.x + Math.cos(st.aim) * 0.4, cue.z + Math.sin(st.aim) * 0.4), dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    st.pdrag = true; st.pdx = -dx / l; st.pdy = -dy / l; st.p0x = P.x * S[0]; st.p0y = P.y * S[1]; st.pmax = clamp(Math.min(S[0], S[1]) * 0.34, 140, 260); st.pw = 0;
  }
  function pullUpdate(P) { const S = glSize(), d = (P.x * S[0] - st.p0x) * st.pdx + (P.y * S[1] - st.p0y) * st.pdy; st.pw = clamp((d - 8) / st.pmax, 0, 1); }
  function pullCancel() { if (!st) return; st.pdrag = false; st.pw = 0; if (G.setP) G.setP(0); }
  function fireMe(p) { st.drag = false; st.pdrag = false; startShot('me', st.aim, speedOf(p)); st.pull = 0.04 + p * 0.2; if (el) el.hidden = true; }
  function respot8() { const b = B[8]; b.in = false; b.mesh.visible = true; b.mesh.scale.setScalar(1); b.blob.visible = true; const p = findFree(FOOT, 0, b); b.x = p[0]; b.z = p[1]; b.vx = b.vz = 0; }
  function legalFirst(who, first) { const g = st.grp[who]; if (!g) return first !== 8; if (sh.left0 === 0) return first === 8; return grpOf(first) === g; }
  function resolve() {
    const who = sh.who, opp = who === 'me' ? 'ai' : 'me', pk = sh.pocketed.slice(), notes = [];
    let foul = false;
    if (sh.cue) { foul = true; notes.push('scratch'); }
    if (sh.first == null) { foul = true; notes.push('missed every ball'); } else if (!legalFirst(who, sh.first)) { foul = true; notes.push('wrong ball first'); }
    if (!foul && !pk.length && !sh.rail && !sh.brk) { foul = true; notes.push('no rail after contact'); }
    const e8 = pk.indexOf(8) >= 0;
    if (e8 && sh.brk) { respot8(); pk.splice(pk.indexOf(8), 1); notes.push('the 8 is re-spotted'); }
    else if (e8) { const win = !foul && sh.left0 === 0; endGame(win ? who : opp, win ? nameOf(who) + (who === 'me' ? ' sink' : ' sinks') + ' the 8 ball' : nameOf(who) + (who === 'me' ? ' potted' : ' potted') + ' the 8 ' + (foul ? 'on a foul' : 'too early')); return; }
    if (!foul && !st.grp[who] && !sh.brk) { const f = pk.find((n) => n !== 8); if (f) { st.grp[who] = grpOf(f); st.grp[opp] = grpOf(f) === 'solid' ? 'stripe' : 'solid'; notes.push(nameOf(who) + ' ' + (who === 'me' ? 'are' : 'is') + ' ' + (st.grp[who] === 'solid' ? 'solids' : 'stripes')); } }
    const mine = pk.filter((n) => n !== 8 && (!st.grp[who] || grpOf(n) === st.grp[who]));
    if (who === 'me') { if (!foul && mine.length) { st.run += mine.length; st.bestRun = Math.max(st.bestRun, st.run); } else st.run = 0; }
    st.stat[who] += mine.length;
    st.brk = false;
    let next = who;
    if (foul) { next = opp; st.inHand = opp; V0.say('Foul: ' + notes.join(' · ') + ' · ' + (opp === 'me' ? 'you have' : 'rival has') + ' the cue ball in hand', 3.4); }
    else if (mine.length) { V0.say((notes.length ? notes.join(' · ') + ' · ' : '') + (who === 'me' ? 'Nice. Shoot again' : 'Rival keeps the table'), 2.6); }
    else { next = opp; V0.say((notes.length ? notes.join(' · ') + ' · ' : '') + (opp === 'me' ? 'Your turn' : 'Rival to shoot'), 2.2); }
    st.turn = next; sh = null;
    if (cue.in && st.inHand !== next) st.inHand = next;
    if (next === 'me') { if (st.inHand === 'me') beginPlace(); else { st.phase = 'aim'; st.pw = 0; if (G.setP) G.setP(0); aimAtBest(); } }
    else { st.phase = 'ai-think'; st.t = 0; st.plan = null; }
  }
  function reviveCue(x, z) { cue.in = false; cue.mesh.visible = true; cue.mesh.scale.setScalar(1); cue.blob.visible = true; cue.x = x; cue.z = z; cue.ox = x; cue.oz = z; cue.vx = cue.vz = 0; }
  function beginPlace() {
    st.phase = 'place'; st.inHand = 'me';
    if (cue.in) { const p = findFree(-FOOT, 0, cue); reviveCue(p[0], p[1]); }
  }
  function endGame(winner, why) {
    st.phase = 'over'; st.winner = winner; st.why = why; st.endT = 1.5; sh = null; V0.say(why, 3);
    const r = venRec('pool'); r.best = Math.max(r.best || 0, st.bestRun);
  }
  /* ---------- aiming helpers ---------- */
  function planePt(cam) { const rc = Ven.ray(cam).ray, o = rc.origin, d = rc.direction; if (Math.abs(d.y) < 1e-5) return null; const t = (CY - o.y) / d.y; if (t < 0) return null; return [o.x + d.x * t, o.z + d.z * t]; }
  function predict(a) {
    const dx = Math.cos(a), dz = Math.sin(a), ox = cue.x, oz = cue.z; let bt = 1e9, hit = null;
    for (let n = 1; n <= 15; n++) { const b = B[n]; if (b.in) continue; const fx = b.x - ox, fz = b.z - oz, pr = fx * dx + fz * dz; if (pr <= 0) continue; const pp = fx * fx + fz * fz - pr * pr; if (pp > 4 * R * R) continue; const t = pr - Math.sqrt(4 * R * R - pp); if (t < bt) { bt = t; hit = b; } }
    let tw = 1e9; if (dx > 1e-6) tw = Math.min(tw, (HX - ox) / dx); else if (dx < -1e-6) tw = Math.min(tw, (-HX - ox) / dx); if (dz > 1e-6) tw = Math.min(tw, (HZ - oz) / dz); else if (dz < -1e-6) tw = Math.min(tw, (-HZ - oz) / dz);
    if (hit && bt < tw) { const gx = ox + dx * bt, gz = oz + dz * bt, nx = (hit.x - gx) / (2 * R), nz = (hit.z - gz) / (2 * R), dn = dx * nx + dz * nz; return { t: bt, hit, gx, gz, nx, nz, cx: dx - dn * nx, cz: dz - dn * nz }; }
    return { t: Math.max(0, tw), hit: null, gx: ox + dx * tw, gz: oz + dz * tw };
  }
  function seg(m, x, z, a, len) { if (len < 0.01) { m.visible = false; return; } m.visible = true; m.position.x = x; m.position.z = z; m.rotation.y = -a; m.scale.x = len; }
  function aimAtBest() { /* start the aim at the nearest legal ball so the line is not off in space */
    let bd = 1e9, tb = null; for (let n = 1; n <= 15; n++) { const b = B[n]; if (b.in) continue; if (st.grp.me && !st.brk) { if (st.grp.me !== grpOf(n) && !(n === 8 && ownLeft('me') === 0)) continue; } else if (n === 8 && !st.brk) continue; const d = Math.hypot(b.x - cue.x, b.z - cue.z); if (d < bd) { bd = d; tb = b; } }
    if (tb) st.aim = Math.atan2(tb.z - cue.z, tb.x - cue.x);
  }
  /* ---------- the rival ---------- */
  function evalShot(cx, cz, tb, pi) {
    const p = PK[pi]; let px = p.x, pz = p.z; const l = Math.hypot(px, pz) || 1; px -= px / l * (p.corner ? 0.05 : 0.03); pz -= pz / l * (p.corner ? 0.05 : 0.03);
    let dx = px - tb.x, dz = pz - tb.z; const dTP = Math.hypot(dx, dz); if (dTP < 0.02) return null; dx /= dTP; dz /= dTP;
    const gx = tb.x - dx * 2 * R, gz = tb.z - dz * 2 * R; if (Math.abs(gx) > HX + 0.01 || Math.abs(gz) > HZ + 0.01) return null;
    let cgx = gx - cx, cgz = gz - cz; const dCG = Math.hypot(cgx, cgz); if (dCG < 0.01) return null; cgx /= dCG; cgz /= dCG;
    const cutCos = cgx * dx + cgz * dz; if (cutCos < 0.3) return null;
    for (let n = 1; n <= 15; n++) { const o = B[n]; if (o.in || o === tb) continue;
      const a1 = distSeg(o.x, o.z, cx, cz, gx, gz); if (a1 < 2 * R * 1.03) return null; const a2 = distSeg(o.x, o.z, tb.x, tb.z, px, pz); if (a2 < 2 * R * 1.05) return null; }
    return { score: cutCos * 1.2 - 0.2 * dCG - 0.34 * dTP + (p.corner ? 0.08 : 0), gx, gz, a: Math.atan2(cgz, cgx), dCG, dTP, cutCos, tb };
  }
  function distSeg(px, pz, ax, az, bx, bz) { const vx = bx - ax, vz = bz - az, l2 = vx * vx + vz * vz; let t = l2 ? ((px - ax) * vx + (pz - az) * vz) / l2 : 0; t = clamp(t, 0, 1); return Math.hypot(px - (ax + vx * t), pz - (az + vz * t)); }
  function bestFrom(cx, cz, targets) { let best = null; for (const tb of targets) for (let i = 0; i < PK.length; i++) { const r = evalShot(cx, cz, tb, i); if (r && (!best || r.score > best.score)) best = r; } return best; }
  function aiTargets(who) { const g = st.grp[who], left = ownLeft(who), out = []; for (let n = 1; n <= 15; n++) { const b = B[n]; if (b.in) continue; if (!g) { if (n !== 8) out.push(b); } else if (left === 0) { if (n === 8) out.push(b); } else if (n !== 8 && grpOf(n) === g) out.push(b); } return out; }
  const AISIG = [4.5, 3.2, 2.3, 1.5], AIPN = [0.18, 0.13, 0.09, 0.06], AIMISS = [0.28, 0.18, 0.1, 0.04];
  function aiPlan(who, lvl) {
    who = who || 'ai'; const idx = lvl != null ? lvl : Math.max(0, V0.D.stakes.indexOf(V0.stake)), sig = AISIG[idx] * Math.PI / 180, pn = AIPN[idx], plan = { place: null };
    const tg = aiTargets(who);
    if (st.brk) { plan.a = Math.atan2(-cue.z, FOOT - cue.x) + gauss() * sig * 0.6; plan.speed = clamp(7.3 + gauss() * 0.5, 6, 8.2); return plan; }
    let best = null;
    if (st.inHand === who) {
      let bs = -1e9; for (let x = -1.1; x <= 1.1; x += 0.16) for (let z = -0.5; z <= 0.5; z += 0.16) { if (!free(x, z, cue)) continue; const r = bestFrom(x, z, tg), sc = r ? r.score : -5; if (sc > bs) { bs = sc; best = r; plan.place = [x, z]; } }
      if (!plan.place) { const p = findFree(-FOOT, 0, cue); plan.place = p; }
    } else best = bestFrom(cue.x, cue.z, tg);
    if (best && rnd() < AIMISS[idx]) { const all = []; for (const tb of tg) for (let i = 0; i < PK.length; i++) { const r = evalShot(plan.place ? plan.place[0] : cue.x, plan.place ? plan.place[1] : cue.z, tb, i); if (r) all.push(r); } if (all.length > 1) best = all[(rnd() * all.length) | 0]; }
    const cx = plan.place ? plan.place[0] : cue.x, cz = plan.place ? plan.place[1] : cue.z;
    if (best) {
      const vObj = speedFor(best.dTP * 1.15 + 0.22), vC = vObj / (0.95 * Math.max(best.cutCos, 0.35)), v0 = speedFor(stopDist(vC) + best.dCG);
      plan.a = best.a + gauss() * sig; plan.speed = clamp(v0 * (1 + gauss() * pn), 1.0, 8.2); plan.why = 'pot';
    } else {
      let bd = 1e9, tb = null; for (const b of tg) { const d = Math.hypot(b.x - cx, b.z - cz); if (d < bd) { bd = d; tb = b; } }
      if (!tb) tb = B[8]; plan.a = Math.atan2(tb.z - cz, tb.x - cx) + gauss() * sig * 1.5; plan.speed = clamp(1.7 + bd * 0.9 + rnd() * 0.6, 1.5, 5); plan.why = 'safe';
    }
    return plan;
  }
  /* ---------- camera ---------- */
  function placeCam(cam, D, portrait) { const th = portrait ? 1.06 : 0.98; if (!portrait) cam.position.set(0, TY + Math.sin(th) * D, Math.cos(th) * D); else cam.position.set(-Math.cos(th) * D, TY + Math.sin(th) * D, 0); cam.up.set(0, 1, 0); cam.lookAt(0, TY, 0); cam.updateMatrixWorld(true); }
  const tv = new THREE.Vector3();
  function fitD(cam, W, H, fW, fH, portrait) {
    const mx = portrait ? 0.92 : 0.84, my = portrait ? 0.84 : 0.8;
    for (let D = 1.2; D < 12; D += 0.04) {
      placeCam(cam, D, portrait); let ok = true;
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) { tv.set(sx * (TL / 2 + 0.2), TY, sz * (TW / 2 + 0.2)).project(cam); if (Math.abs(tv.x) * W / 2 > mx * fW / 2 || Math.abs(tv.y) * H / 2 > my * fH / 2) ok = false; }
      if (ok) return D;
    }
    return 6;
  }
  function updateCam(V, dt) {
    const cam = G.cam, W = innerWidth, H = innerHeight, portrait = W < H * 0.95, mod = !E.venModal.hidden, pw = mod ? E.venModal.offsetWidth : 0, sheet = W <= 760;
    const mh = mod && sheet ? E.venModal.offsetHeight + 16 : 0, slW = !mod && W < 560 ? 66 : 0, fW = (mod && !sheet ? W - pw - 18 : W) - slW, fH = mod && sheet ? Math.max(H * 0.3, H - mh - 8) : H * 0.9, key = W + 'x' + H + ':' + (portrait ? 1 : 0) + ':' + pw + ':' + (sheet ? 1 : 0) + ':' + (mod ? 1 : 0) + ':' + (mh >> 3) + ':' + slW;
    cam.aspect = W / H; cam.fov = 36; cam.updateProjectionMatrix(); cam.clearViewOffset();
    if (key !== camKey) { camKey = key; camD = fitD(cam, W, H, fW, fH, portrait); G.tD = camD; if (!G1) { G1 = true; } }
    const tOx = (mod && !sheet ? (pw + 18) / 2 : 0) + slW / 2, tOy = mod && sheet ? (H - fH) / 2 - H * 0.02 : -H * (portrait ? 0.07 : 0.05), k = 1 - Math.exp(-dt * 6);
    camOx += (tOx - camOx) * k; camOy += (tOy - camOy) * k; placeCam(cam, camD, portrait);
    if (Math.abs(camOx) > 0.5 || Math.abs(camOy) > 0.5) cam.setViewOffset(W, H, camOx, camOy, W, H); cam.updateMatrixWorld(true);
  }
  /* ---------- per frame ---------- */
  function visuals(dt) {
    for (const b of B) {
      if (b.in) { if (b.sink < 0.4) { b.sink += dt; const k = clamp(b.sink / 0.4, 0, 1), p = PK[b.pk]; b.mesh.position.set(b.x + (p.x * 0.985 - b.x) * k, CY - k * 0.1, b.z + (p.z * 0.985 - b.z) * k); b.mesh.scale.setScalar(1 - k * 0.5); if (k >= 1) b.mesh.visible = false; } continue; }
      const dx = b.x - b.ox, dz = b.z - b.oz; if (dx !== 0 || dz !== 0) { const l = Math.hypot(dx, dz); tv.set(dz, 0, -dx).normalize(); const q = G.q || (G.q = new THREE.Quaternion()); q.setFromAxisAngle(tv, l / R); b.mesh.quaternion.premultiply(q); }
      b.ox = b.x; b.oz = b.z; b.mesh.position.set(b.x, CY, b.z); b.blob.position.x = b.x; b.blob.position.z = b.z;
    }
    const showCue = st.phase === 'aim' || st.phase === 'ai-aim' || st.phase === 'ai-pull' || st.phase === 'strike';
    cueG.visible = showCue && !cue.in;
    if (cueG.visible) { cueG.position.set(cue.x, CY, cue.z); cueG.rotation.y = -st.aim; stick.rotation.z = -0.07; stick.position.x = -(R + 0.014 + st.pull); }
    const gv = st.phase === 'aim' && st.turn === 'me' && !cue.in;
    if (gv) {
      const p = predict(st.aim), c = Math.cos(st.aim), s = Math.sin(st.aim), s0 = R + 0.004;
      seg(guide.main, cue.x + c * s0, cue.z + s * s0, st.aim, p.t - s0 - (p.hit ? R * 0.9 : 0));
      if (p.hit) { guide.ring.visible = true; guide.ring.position.x = p.gx; guide.ring.position.z = p.gz; const oa = Math.atan2(p.nz, p.nx); seg(guide.obj, p.hit.x + p.nx * R, p.hit.z + p.nz * R, oa, 0.34); const cm = Math.hypot(p.cx, p.cz); if (cm > 0.12) seg(guide.cut, p.gx + (p.cx / cm) * R, p.gz + (p.cz / cm) * R, Math.atan2(p.cz, p.cx), 0.18 + 0.12 * cm); else guide.cut.visible = false; }
      else { guide.ring.visible = true; guide.ring.position.x = p.gx; guide.ring.position.z = p.gz; guide.obj.visible = false; guide.cut.visible = false; }
    } else { guide.main.visible = guide.obj.visible = guide.cut.visible = guide.ring.visible = false; }
  }
  G.update = function (V, dt) {
    dt = Math.min(dt, 0.1); const P = V.ptr; st.t += dt;
    if (st.phase === 'aim' && st.turn === 'me') {
      if (P.mvn !== lastMv) { lastMv = P.mvn; if (!st.pdrag && (P.down || P.type === 'mouse')) { const pt = planePt(G.cam); if (pt && Math.hypot(pt[0] - cue.x, pt[1] - cue.z) > 0.06) st.aim = Math.atan2(pt[1] - cue.z, pt[0] - cue.x); } }
      if (st.pdrag) { if (P.down) pullUpdate(P); else pullCancel(); }
      const fine = kd.ShiftLeft || kd.ShiftRight ? 0.12 : 0.75, rot = ((kd.ArrowRight || kd.KeyD ? 1 : 0) - (kd.ArrowLeft || kd.KeyA ? 1 : 0)) * fine * dt; st.aim = ang(st.aim + rot);
      if (kd.Space && !st.drag && !st.pdrag) { st.pw = Math.min(1, st.pw + dt * 0.62); if (G.setP) G.setP(st.pw); }
      st.pull = st.pw > 0 ? 0.04 + st.pw * 0.2 : 0; el.hidden = false; if (G.setP) G.setP(st.pw); V.power(null);
    } else if (st.phase === 'place') {
      if (st.pdrag) st.pdrag = false;
      if (el) el.hidden = true;
      if (P.mvn !== lastMv) { lastMv = P.mvn; if (P.down || P.type === 'mouse') { const pt = planePt(G.cam); if (pt) { const x = clamp(pt[0], -HX, HX), z = clamp(pt[1], -HZ, HZ); if (free(x, z, cue)) { cue.x = x; cue.z = z; } } } }
    } else if (el) el.hidden = true;
    switch (st.phase) {
      case 'strike': {
        st.stT += dt; st.pull = Math.max(0, st.pull - dt * 2.4);
        if (st.pull <= 0 || st.stT > 0.25) { const a = st.pend.a, sp = st.pend.speed; cue.vx = Math.cos(a) * sp; cue.vz = Math.sin(a) * sp; tok(sp, true); st.pull = 0; st.phase = 'roll'; st.rollT = 0; st.rest = 0; st.pw = 0; if (G.setP) G.setP(0); }
        break;
      }
      case 'roll': {
        let left = dt; st.rollT += dt; const n = Math.max(1, Math.ceil(left / DT)), h = left / n; for (let i = 0; i < n; i++) stepPhys(h);
        let sinking = false; for (const b of B) if (b.in && b.sink < 0.4) sinking = true;
        if (!moving() && !sinking) { st.rest += dt; if (st.rest > 0.35) resolve(); } else st.rest = 0;
        if (st.rollT > 45) { for (const b of B) { b.vx = b.vz = 0; } }
        break;
      }
      case 'ai-think': {
        if (!st.plan) { st.plan = aiPlan(); if (st.plan.place) { reviveCue(st.plan.place[0], st.plan.place[1]); st.inHand = null; } st.thinkT = 0.55 + rnd() * 0.6; }
        if (cue.in) { const p = findFree(-FOOT, 0, cue); reviveCue(p[0], p[1]); }
        if (st.t > st.thinkT) { st.phase = 'ai-aim'; st.t = 0; st.pull = 0; }
        break;
      }
      case 'ai-aim': {
        const d = ang(st.plan.a - st.aim), step = Math.min(Math.abs(d), dt * 3.0 + Math.abs(d) * dt * 5); st.aim = ang(st.aim + Math.sign(d) * step);
        if (Math.abs(d) < 0.004 && st.t > 0.35) { st.phase = 'ai-pull'; st.t = 0; }
        break;
      }
      case 'ai-pull': {
        const tgt = 0.04 + powerOf(st.plan.speed) * 0.2; st.pull = Math.min(tgt, st.pull + dt * 0.55);
        if (st.pull >= tgt - 0.002 && st.t > 0.3) startShot('ai', st.plan.a, st.plan.speed);
        break;
      }
      case 'over': { st.endT -= dt; if (st.endT <= 0) { finishGame(); } break; }
      default:
    }
    visuals(dt); updateCam(V, dt);
  };
  function finishGame() {
    const win = st.winner === 'me', stake = V0.stake, pay = win ? (stake ? stake * 2 : 30) : 0; st.phase = 'done';
    if (el) el.hidden = true;
    V0.finish(win, win ? 'You win the frame' : 'Rival wins the frame', [esc(st.why), 'You potted ' + st.stat.me + ' · rival potted ' + st.stat.ai, 'Shots taken: ' + st.stat.shots + (st.bestRun > 1 ? ' · best run ' + st.bestRun : '')], pay);
  }
  G.idle = function (V, dt) { if (!st) return; if (st.phase === 'lobby' || st.phase === 'done') { visuals(dt); updateCam(V, dt); } };
  G.enter = function (V) {
    V0 = V; if (!G.sc) { G.init(V); } st = newState((Date.now() & 0xffff) + 7); if (G.seed) st.rnd = mulberry32(G.seed); rack(); sh = null; if (el) el.hidden = true; st.aim = Math.atan2(0, 1);
    for (const k in kd) kd[k] = false; camKey = ''; visuals(0.01); updateCam(V, 0.5);
  };
  G.begin = function (V, stake) {
    V0 = V; const seed = G.seed || ((Date.now() * 7 + (venRec('pool').n * 977)) & 0xffffff); st = newState(seed); rack(); sh = null;
    st.turn = venRec('pool').n % 2 ? 'ai' : 'me'; st.brk = true; st.inHand = null; for (const k in kd) kd[k] = false;
    if (st.turn === 'me') { st.phase = 'aim'; st.aim = 0; if (G.setP) G.setP(0); V.say('You break · aim at the rack, then press and hold and pull back to shoot', 4.5); }
    else { st.phase = 'ai-think'; V.say('Rival breaks', 2.4); }
    lastMv = -1;
  };
  G.cleanup = function () { if (el) el.hidden = true; if (st) { st.drag = false; st.pdrag = false; } for (const k in kd) kd[k] = false; cueG.visible = false; guide.main.visible = guide.obj.visible = guide.cut.visible = guide.ring.visible = false; };
  G.ptrdown = function (V) {
    if (!st) return; const pt = planePt(G.cam); if (!pt) return;
    if (st.phase === 'aim' && st.turn === 'me') { if (Math.hypot(pt[0] - cue.x, pt[1] - cue.z) > 0.06) st.aim = Math.atan2(pt[1] - cue.z, pt[0] - cue.x); if (!V.ptr.btn) { pullBegin(V.ptr); if (G.setP) G.setP(0); } }
    else if (st.phase === 'place') { const x = clamp(pt[0], -HX, HX), z = clamp(pt[1], -HZ, HZ); if (free(x, z, cue)) { cue.x = x; cue.z = z; } }
  };
  G.ptrup = function (V) {
    if (st && st.pdrag) { st.pdrag = false; if (st.phase === 'aim' && st.turn === 'me' && st.pw > 0.045) fireMe(st.pw); else pullCancel(); return; }
    if (st && st.phase === 'place') { if (free(cue.x, cue.z, cue)) { st.phase = 'aim'; st.inHand = null; st.pw = 0; if (G.setP) G.setP(0); aimAtBest(); V.say('Ball placed · line up your shot', 2); Snd.beep(520, 0.04); } } };
  G.ptrcancel = function () { pullCancel(); };
  G.key = function (V, code, down) {
    if (down) { if (kd[code]) return; } kd[code] = down;
    if (!st) return;
    if (!down && code === 'Space' && st.phase === 'aim' && st.turn === 'me' && !st.drag && st.pw > 0.045) { fireMe(st.pw); }
    if (down && st.phase === 'place' && (code === 'Enter' || code === 'Space')) { G.ptrup(V); }
  };
  G.hud = function (V) {
    if (!st) return '';
    const chipHtml = (n) => { const c = _hexCss(colOf(n)), bg = n > 8 ? 'linear-gradient(#f4f0e6 0 26%,' + c + ' 26% 74%,#f4f0e6 74%)' : c, tc = n === 8 || n === 2 || n === 4 || n === 7 || n === 6 ? '#fff' : '#111'; return '<i class="chip" style="background:' + bg + ';color:' + tc + ';opacity:' + (B[n].in ? 0.25 : 1) + '">' + n + '</i>'; };
    const row = (who) => { const g = st.grp[who]; let h = '<div class="r"><span>' + nameOf(who) + '</span><b>' + (g ? (g === 'solid' ? 'Solids' : 'Stripes') : 'Open table') + '</b></div>'; if (g) { h += '<div class="chips">'; for (let n = 1; n <= 15; n++) if (n !== 8 && grpOf(n) === g) h += chipHtml(n); if (ownLeft(who) === 0) h += chipHtml(8); h += '</div>'; } return h; };
    const turn = st.phase === 'over' || st.phase === 'done' ? 'Game over' : st.turn === 'me' ? (st.phase === 'place' ? 'Place the ball' : 'Your shot') : 'Rival\'s shot';
    return '<span class="big">' + turn + '</span>' + row('me') + row('ai');
  };
  G.hint = function (V) {
    if (!st) return '';
    if (st.phase === 'place') return 'Ball in hand · move the cue ball, then <em>click or tap</em> to set it down';
    if (st.phase === 'aim' && st.turn === 'me') return st.pdrag ? 'Pulling back · <em>' + Math.round(st.pw * 100) + '%</em> power · release to shoot · drag back to your start point to cancel' : (typeof TouchIn !== 'undefined' && TouchIn.on ? 'Tap to aim · <em>press and drag back</em> away from the shot to pull the cue · release to shoot' : 'Aim with the <em>pointer</em> (or ← →) · <em>press and hold</em>, then pull back for power · release to shoot · or hold <em>Space</em>');
    if (st.turn === 'ai' && st.phase !== 'over') return 'Rival is lining up…';
    return '';
  };
  G.recText = function (rec) { return ['Best run', (rec.best || 0) + ' balls']; };
  G.dbg = () => ({ st, B, cue, sh });
  G.api = { scr, pullBegin, pullUpdate, stepPhys, rack, resolve: () => resolve(), predict, aiPlan, aiSig: AISIG, fireMe, startShot: (w, a, s) => startShot(w, a, s), free };
  return G;
})();
