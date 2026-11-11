/* ================= WORKSHOP BUILDER: assemble planes and rockets part by part =================
   The design lives in Wk.spec (see 09_wkparts.js). Every edit goes through a few primitives: add (stack node or body/wing surface, with mirror / radial
   copies that share a group id so they are edited together), place (move a subtree), set parameters, delete, and undo/redo by JSON snapshots.
   After each edit the craft is compiled, its models rebuilt and the stats panel refreshed. The studio is the Customs stage scene. */
const WKL = { sz: 'Size', r: 'Radius', r2: 'Aft radius', len: 'Length', fill: 'Fuel fill', span: 'Span', cr: 'Root chord', ct: 'Tip chord', sw: 'Sweep °', tc: 'Thickness', dih: 'Dihedral °', inc: 'Incidence °', cs: 'Control size', csp: 'Control span', gr: 'Strength', role: 'Surface role', d: 'Diameter m', v: 'Model', shp: 'Shape', fuel: 'Fuel' };
const WKT = { cockpit: 'Pilot seat, canopy', capsule: 'Crew pod, heat shield', body: 'Structure or fuel tank', nose: 'Cone or ogive', wing: 'Wing, tail, fin, canard', jet: 'Turbofan / turbojet', prop: 'Piston / turboprop', rocket: 'Liquid engine, gimbals', solid: 'Fixed thrust, burns out', gear: 'Wheel or landing leg', decoupler: 'Separates stages', chute: 'Opens in a stage', rwheel: 'Attitude torque in space' };
const WKSEL = { role: ['Control (auto-mixed)', 'Flap', 'Airbrake', 'Fixed'], gr: ['Light', 'Standard', 'Heavy'], shp: ['Cone', 'Ogive'] };
const _WK_SIDE = new Set(['wing', 'gear', 'rwheel']), _WK_FRONT = new Set(['prop', 'nose', 'chute']);
const _wkClone = (o) => JSON.parse(JSON.stringify(o));
const _wkEsc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const _wkFmt = (n, d) => (isFinite(n) ? n.toLocaleString('en-US', { maximumFractionDigits: d == null ? 0 : d, minimumFractionDigits: d == null ? 0 : d }) : '-');
const _wkDec = (st) => { const s = String(st); return s.indexOf('.') < 0 ? 0 : s.length - s.indexOf('.') - 1; };

const Wk = {
  on: false, ph: 'build', spec: null, sel: 0, hist: [], fut: [], tab: 'cmd', pick: false, symMode: 'auto', az: 0.85, el: 0.22, D: 16, tgt: new THREE.Vector3(0, 2, 0), goal: { az: 0.85, el: 0.22, D: 16, tx: 0, ty: 2, tz: 0 },
  sc: null, cam: null, holder: null, cr: null, C: null, stats: null, dirty: false, editing: false, ready: false, fx: { speed: 0, damage: 0, chroma: 0, expo: 1 }, rotX: 0, flr: 0, bb: { min: [0, 0, 0], max: [1, 1, 1] }, near: null, tip: '', saveT: 0, lastW: [0, 0]
};
Wk.byId = (id) => Wk.spec.parts.find((p) => p.id === id) || null;
Wk.members = (P) => (P.sym ? Wk.spec.parts.filter((q) => q.sym && q.sym.g === P.sym.g) : [P]);
Wk.kidsOf = (id) => Wk.spec.parts.filter((p) => p.p === id);
Wk.subtreeIds = (id) => { const out = [id]; for (let i = 0; i < out.length; i++) for (const q of Wk.spec.parts) if (q.p === out[i]) out.push(q.id); return out; };
Wk.newSpec = (name) => ({ name: name || 'My craft', mode: 'air', parts: [], nid: 1, gid: 0, manualStage: false, siteSet: false });
Wk.fresh = () => _wkClone(Wk.spec);
Wk.toast = (t, k) => UI.toast(t, k || 'info');

/* ---------- history ---------- */
Wk.snap = function () { Wk.hist.push(JSON.stringify(Wk.spec)); if (Wk.hist.length > 80) Wk.hist.shift(); Wk.fut.length = 0; };
Wk.restore = function (s) { Wk.spec = JSON.parse(s); if (!Wk.byId(Wk.sel)) Wk.sel = 0; Wk.touch(true); };
Wk.undo = function () { if (!Wk.hist.length) return; Wk.fut.push(JSON.stringify(Wk.spec)); Wk.restore(Wk.hist.pop()); };
Wk.redo = function () { if (!Wk.fut.length) return; Wk.hist.push(JSON.stringify(Wk.spec)); Wk.restore(Wk.fut.pop()); };

/* ---------- attach logic ---------- */
Wk.nodeOcc = (P, slot) => Wk.spec.parts.find((q) => q.p === P.id && q.at && q.at.k === 's' && q.at.pn === slot) || null;
Wk.nodeFree = function (P, slot, D) { if (!D[P.id].nodes[slot]) return false; if (P.p != null && P.at && P.at.k === 's' && P.at.cn === slot) return false; return !Wk.nodeOcc(P, slot); };
Wk.stackSpot = function (P, pref, D) {
  let cur = P, slot = pref;
  for (let g = 0; g < 80; g++) {
    if (!D[cur.id].nodes[slot]) return null; if (Wk.nodeFree(cur, slot, D)) return { par: cur, slot };
    const occ = Wk.nodeOcc(cur, slot); if (!occ) return null; cur = occ; slot = occ.at.cn === 'front' ? 'back' : 'front';
  }
  return null;
};
Wk.surfAt = function (t, P, D) {
  const d = D[P.id];
  if (d.kind === 'wing') return t === 'gear' ? { k: 'w', u: 0.25, v: 0.7, side: -1 } : { k: 'w', u: 0.5, v: 0.5, side: 1 };
  const L = d.L || 1, ps = Wk.spec.parts;
  if (t === 'wing') return { k: 'f', u: -L * 0.15, phi: 0 };
  if (t === 'gear') return { k: 'f', u: ps[0] && ps[0] === P ? 0.4 * L / 2 : 0, phi: -Math.PI / 2 };
  if (t === 'rwheel') return { k: 'f', u: 0, phi: Math.PI / 2 };
  const pl = (WK.P[t].par.len || 2); return { k: 'f', u: -L / 2 + pl / 2 + 0.05, phi: 0 };
};
Wk.symAts = function (at, t) {
  if (at.k !== 'f') return [{ at, s: 1 }];
  let m = Wk.symMode; const root = Wk.spec.parts[0];
  if (m === 'auto') m = t === 'wing' ? (root && root.t === 'capsule' ? 'r4' : 'm') : t === 'solid' ? (root && root.t === 'capsule' ? 'r2' : 'm') : 'none';
  if (m === 'none') return [{ at, s: 1 }];
  if (m === 'm') { if (Math.abs(Math.cos(at.phi || 0)) < 0.05) return [{ at, s: 1 }]; return [{ at, s: 1 }, { at: Object.assign({}, at, { phi: Math.PI - (at.phi || 0) }), s: -1 }]; }
  const n = +m.slice(1) || 2, out = []; for (let i = 0; i < n; i++) out.push({ at: Object.assign({}, at, { phi: (at.phi || 0) + i * TAU / n }), s: 1 }); return out;
};
/* defaults that follow the neighbour: radius of the node a part sits on, engine sized to fit */
Wk.fit = function (t, r, fuel) {
  const p = {}; if (!(r > 0)) return p;
  if (t === 'body') { p.r = r; p.r2 = r; } else if (t === 'decoupler' || t === 'nose' || t === 'solid') p.r = r;
  else if (t === 'rocket') { const want = fuel === 'hydro' ? 'hydro' : 'rocket'; let v = -1; for (let i = 0; i < WK.ROCK.length; i++) { const e = WK.ROCK[i]; if (e.fuel === want && e.r <= r * 1.1 && (v < 0 || e.F > WK.ROCK[v].F)) v = i; } if (v < 0) for (let i = 0; i < WK.ROCK.length; i++) if (WK.ROCK[i].fuel === want && (v < 0 || WK.ROCK[i].r < WK.ROCK[v].r)) v = i; p.v = Math.max(0, v); }
  else if (t === 'jet') { let v = 0; for (let i = 0; i < WK.JET.length; i++) if (WK.JET[i].r <= r * 1.25 && WK.JET[i].T >= WK.JET[v].T) v = i; p.v = v; }
  return p;
};
Wk.addRecord = (t, par) => ({ id: 0, t, par: Object.assign({}, par || {}) });
/* put copies of a template (array of records, [0] is the top, parents before children) under (parent, at, s) pairs; returns the new top ids */
Wk.place = function (tpl, pairs, gid) {
  const spec = Wk.spec, tops = [];
  for (const pr of pairs) {
    const map = {};
    for (let i = 0; i < tpl.length; i++) {
      const q = _wkClone(tpl[i]), id = spec.nid++; map[tpl[i].id] = id; q.id = id;
      if (i === 0) { q.p = pr.par.id; q.at = _wkClone(pr.at); if (gid) q.sym = { g: gid, s: pr.s }; else delete q.sym; tops.push(id); } else q.p = map[tpl[i].p];
      spec.parts.push(q);
    }
  }
  return tops;
};
Wk.add = function (t) {
  const spec = Wk.spec, T = WK.P[t]; if (!T) return;
  if (!spec.parts.length) { if (!T.root) { Wk.toast('Start with a cockpit or capsule', 'bad'); return; } Wk.snap(); const r = Wk.addRecord(t); r.id = spec.nid++; spec.parts.push(r); Wk.sel = r.id; Wk.tab = 'str'; Wk.commit(); return; }
  if (T.root) { Wk.toast('A craft has one command part. Use New to start over.', 'bad'); return; }
  const D = WK.layout(spec).D; let P = Wk.byId(Wk.sel) || spec.parts[0];
  const rec = Wk.addRecord(t); let pairs = [], gid = 0, ins = null;
  if (_WK_SIDE.has(t) || !D[P.id].nodes.front) {
    let S = P; while (S && !D[S.id].surf) S = S.p != null ? Wk.byId(S.p) : null; if (!S) { Wk.toast('Nothing to attach that to', 'bad'); return; }
    const ats = Wk.symAts(Wk.surfAt(t, S, D), t); const mem = Wk.members(S);
    if (mem.length * ats.length > 1) gid = ++spec.gid; for (const m of mem) for (const a of ats) pairs.push({ par: m, at: a.at, s: a.s });
  } else {
    const pref = _WK_FRONT.has(t) ? 'front' : 'back'; const mem = Wk.members(P);
    for (const m of mem) {
      const sp = Wk.stackSpot(m, pref, D) || Wk.stackSpot(m, pref === 'front' ? 'back' : 'front', D); if (!sp) { Wk.toast('No free attachment point on that part', 'bad'); return; }
      const slot = sp.slot, cn = slot === 'back' ? 'front' : 'back'; pairs.push({ par: sp.par, at: { k: 's', pn: slot, cn }, s: 1 });
    }
    if (mem.length > 1) gid = ++spec.gid;
    if (t === 'body' || t === 'decoupler') { const m0 = mem[0], occ = Wk.nodeOcc(m0, pref); if (occ && occ.at.k === 's') ins = pref; }
  }
  const pr0 = pairs[0], nr = pr0.at.k === 's' && D[pr0.par.id].nodes[pr0.at.pn] ? D[pr0.par.id].nodes[pr0.at.pn].r : 0, pfuel = pr0.par.t === 'body' ? (pr0.par.par || {}).fuel : null; Object.assign(rec.par, Wk.fit(t, nr, pfuel));
  if (t === 'body') rec.par.fuel = spec.parts[0].t === 'capsule' ? 'rocket' : 'jet';
  Wk.snap(); const tops = Wk.place([rec], pairs, gid);
  if (ins) for (const id of tops) { const q = Wk.byId(id), par = Wk.byId(q.p), occ = Wk.spec.parts.find((o) => o !== q && o.p === par.id && o.at && o.at.k === 's' && o.at.pn === q.at.pn); if (occ) { occ.p = q.id; occ.at = { k: 's', pn: q.at.pn, cn: occ.at.cn }; } }
  Wk.sel = tops[0]; Wk.commit();
};
Wk.del = function (id) {
  const spec = Wk.spec, P = Wk.byId(id); if (!P) return; Wk.snap();
  if (P === spec.parts[0]) { spec.parts.length = 0; Wk.sel = 0; Wk.commit(); return; }
  const rm = new Set(); for (const m of Wk.members(P)) {
    const kids = Wk.kidsOf(m.id), stk = kids.filter((k) => k.at && k.at.k === 's');
    if ((m.t === 'body' || m.t === 'decoupler') && m.at && m.at.k === 's' && stk.length === 1) { const k = stk[0]; k.p = m.p; k.at = { k: 's', pn: m.at.pn, cn: k.at.cn }; for (const o of kids) if (o !== k) for (const i of Wk.subtreeIds(o.id)) rm.add(i); rm.add(m.id); }
    else for (const i of Wk.subtreeIds(m.id)) rm.add(i);
  }
  spec.parts = spec.parts.filter((p) => !rm.has(p.id)); Wk.sel = P.p != null && Wk.byId(P.p) ? P.p : 0; Wk.commit();
};
Wk.setPar = function (id, key, val) { const P = Wk.byId(id); if (!P) return; for (const m of Wk.members(P)) { m.par = m.par || {}; m.par[key] = val; } Wk.touch(); };
Wk.setAt = function (id, key, val) {
  const P = Wk.byId(id); if (!P || !P.at) return; const d = key === 'side' ? 0 : val - (P.at[key] || 0);
  for (const m of Wk.members(P)) { if (!m.at || m.at.k === 's') continue; if (key === 'side') m.at.side = val; else m.at[key] = (m.at[key] || 0) + d * (m.sym ? m.sym.s : 1); }
  Wk.touch();
};
Wk.setStage = function (id, key, val) { const P = Wk.byId(id); if (!P) return; for (const m of Wk.members(P)) m[key] = Math.max(0, Math.min(9, val)); Wk.spec.manualStage = true; Wk.touch(true); };
/* switch a part between hanging off a stack node and mounted on the side of its parent */
Wk.setMode = function (id, mode) {
  const P = Wk.byId(id); if (!P || P.p == null) return; const spec = Wk.spec, D = WK.layout(spec).D, mem = Wk.members(P);
  if (mode === 's') {
    if (P.at.k === 's') return; const pref = _WK_FRONT.has(P.t) ? 'front' : 'back', plan = [];
    for (const m of mem) { let S = Wk.byId(m.p); while (S && !D[S.id].nodes.front) S = S.p != null ? Wk.byId(S.p) : null; const sp = S && (Wk.stackSpot(S, pref, D) || Wk.stackSpot(S, pref === 'front' ? 'back' : 'front', D)); if (!sp) { Wk.toast('No free stack node there', 'bad'); return; } plan.push([m, sp]); }
    Wk.snap(); for (const [m, sp] of plan) { m.p = sp.par.id; m.at = { k: 's', pn: sp.slot, cn: sp.slot === 'back' ? 'front' : 'back' }; } Wk.commit();
  } else if (P.at.k === 's') {
    const plan = []; for (const m of mem) { let S = Wk.byId(m.p); while (S && !D[S.id].surf) S = S.p != null ? Wk.byId(S.p) : null; if (!S) return; plan.push([m, S]); }
    Wk.snap(); for (const [m, S] of plan) { m.p = S.id; m.at = _wkClone(Wk.surfAt(P.t, S, D)); } Wk.commit();
  }
};
Wk.commit = function () { if (!Wk.spec.manualStage) WK.autoStage(Wk.spec); Wk.autoSite(); Wk.touch(true); };
Wk.autoSite = function () { const s = Wk.spec; if (s.siteSet) return; s.mode = s.parts.some((p) => p.t === 'jet' || p.t === 'prop') ? 'air' : 'rocket'; };
Wk.touch = function (ui) { Wk.dirty = true; if (ui) Wk.uiDirty = true; Wk.saveT = 0.8; };
Wk.clear = function () { Wk.snap(); const n = Wk.spec.name; Wk.spec = Wk.newSpec(n); Wk.sel = 0; Wk.tab = 'cmd'; Wk.commit(); };
Wk.loadSpec = function (spec, keepName) { Wk.snap(); const s = _wkClone(spec); s.nid = s.nid || (Math.max(0, ...s.parts.map((p) => p.id)) + 1); s.gid = s.gid || 0; if (!keepName) s.name = s.name || 'Craft'; if (s.manualStage == null) s.manualStage = false; Wk.spec = s; Wk.sel = 0; if (!s.manualStage) WK.autoStage(s); Wk.tab = 'str'; Wk.touch(true); Wk.focusCam(); };

/* ---------- scene ---------- */
Wk.setup = function () {
  if (Wk.ready) return; Wk.ready = true;
  const o = Wk.stage = shopStage(16, 70); Wk.sc = o.sc; Wk.cam = new THREE.PerspectiveCamera(36, 16 / 9, 0.1, 400);
  const col = new THREE.Color(0xffb02e).convertSRGBToLinear(); o.ringM.color.copy(col).multiplyScalar(1.4); o.barM.color.set(0x2f6fd6).convertSRGBToLinear().multiplyScalar(0.9);
  const cv = mkCanvas(8, 256), g = cv.getContext('2d'), gr = g.createLinearGradient(0, 256, 0, 0); gr.addColorStop(0, '#1b2433'); gr.addColorStop(0.45, '#0c1119'); gr.addColorStop(1, '#04060a'); g.fillStyle = gr; g.fillRect(0, 0, 8, 256);
  o.wallM.map = new THREE.CanvasTexture(cv); o.wallM.needsUpdate = true; o.blob.visible = false;
  Wk.holder = new THREE.Group(); Wk.sc.add(Wk.holder);
  const grid = new THREE.GridHelper(32, 32, 0x2a3446, 0x182030); grid.position.y = 0.03; grid.material.transparent = true; grid.material.opacity = 0.7; Wk.sc.add(grid); Wk.grid = grid;
  Wk.ray = new THREE.Raycaster(); Wk.ov = E.wkOv; Wk.ovg = Wk.ov.getContext('2d');
};
Wk.rebuild = function () {
  if (Wk.cr) { WKG.dispose(Wk.cr); Wk.cr = null; }
  const spec = Wk.spec; if (!spec.parts.length) { Wk.C = null; Wk.stats = null; Wk.bb = { min: [-1, 0, -1], max: [1, 2, 1] }; Wk.focusBox(); return; }
  Wk.C = WK.compile(Wk.fresh()); Wk.cr = WKG.craft(Wk.C); Wk.holder.add(Wk.cr.root);
  const rocket = spec.mode === 'rocket'; Wk.rotX = rocket ? -Math.PI / 2 : 0; Wk.holder.rotation.set(Wk.rotX, 0, 0);
  /* extents in display axes */
  const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9], pt = (p) => { const x = p[0], y = rocket ? p[2] : p[1], z = rocket ? -p[1] : p[2]; mn[0] = Math.min(mn[0], x); mn[1] = Math.min(mn[1], y); mn[2] = Math.min(mn[2], z); mx[0] = Math.max(mx[0], x); mx[1] = Math.max(mx[1], y); mx[2] = Math.max(mx[2], z); };
  for (const p of Wk.C.parts) { for (const h of p.hull) pt(h); pt(p.com); if (p.d.gear) { const tp = p.d.gear.tip[0] + p.d.gear.rw; pt([p.gPos[0] + p.gDir[0] * tp, p.gPos[1] + p.gDir[1] * tp, p.gPos[2] + p.gDir[2] * tp]); } if (p.d.eng) pt(p.ePos); }
  Wk.holder.position.set(0, 0.04 - mn[1], 0); Wk.bb = { min: mn, max: mx, off: 0.04 - mn[1] };
  if (Wk.cr) WKG.highlight(Wk.cr, Wk.sel ? Wk.members(Wk.byId(Wk.sel) || { sym: null }).map((m) => m.id) : [], 0xffb02e, 0.5);
  Wk.focusBox(); Wk.statDirty = true;
};
Wk.focusBox = function () {
  const b = Wk.bb, g = Wk.goal, sz = Math.max(b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2]); g.tx = (b.min[0] + b.max[0]) / 2; g.ty = (b.min[1] + b.max[1]) / 2 + (b.off || 0); g.tz = (b.min[2] + b.max[2]) / 2;
  Wk.fitD = Math.max(7, sz * 1.5 + 3); if (Wk.refit) { g.D = Wk.fitD; Wk.refit = false; }
};
Wk.focusCam = function () { Wk.refit = true; Wk.goal.az = 0.85; Wk.goal.el = 0.22; Wk.focusBox(); };

/* ---------- panels ---------- */
const WKTAB = { cmd: 'Pods', str: 'Frame', aero: 'Aero', eng: 'Engines', sys: 'Systems' };
Wk.tabsHTML = function () {
  const empty = !Wk.spec.parts.length; let h = '';
  for (const [k, n] of WK.CATS) h += '<button data-a="tab" data-v="' + k + '" aria-selected="' + (Wk.tab === k) + '"' + (empty && k !== 'cmd' ? ' disabled style="opacity:.35"' : '') + '>' + (WKTAB[k] || n) + '</button>';
  return h;
};
Wk.listHTML = function () {
  const empty = !Wk.spec.parts.length; let h = '';
  for (const t in WK.P) { const T = WK.P[t]; if (T.cat !== Wk.tab) continue; const off = empty ? !T.root : T.root;
    h += '<button data-a="add" data-v="' + t + '"' + (off ? ' disabled' : '') + '><span>' + T.label + '<br><small>' + (WKT[t] || '') + '</small></span></button>'; }
  return h;
};
Wk.slider = function (label, key, attr, val, rng) { const dec = _wkDec(rng[2]); return '<div class="wkr"><label>' + label + '</label><input type="range" min="' + rng[0] + '" max="' + rng[1] + '" step="' + rng[2] + '" value="' + val + '" ' + attr + '="' + key + '"><output>' + val.toFixed(dec) + '</output></div>'; };
Wk.propsHTML = function () {
  const P = Wk.byId(Wk.sel), spec = Wk.spec;
  if (!P) return '<h4>Craft</h4><div class="wkst"><span>Parts</span><b>' + spec.parts.length + '</b></div>' + (spec.parts.length ? '<div class="wkw h" style="margin-top:6px">Click a part on the model (or in the stage bar) to edit it.</div>' : '<div class="wkw h" style="margin-top:6px">Pick a cockpit for a plane or a capsule for a rocket, then keep adding parts. Presets has ready-made craft.</div>');
  const T = WK.P[P.t], par = Object.assign({}, T.par, P.par || {}), grp = Wk.members(P), D = WK.layout(spec).D; let h = '<h4>' + T.label + (grp.length > 1 ? ' ×' + grp.length + ' linked' : '') + '</h4>';
  for (const k in T.par) {
    if (k === 'col') continue; const v = par[k];
    if (T.opt && T.opt[k]) { h += '<div class="wkr"><label>' + (WKL[k] || k) + '</label><select data-k="' + k + '">' + T.opt[k].map((o) => '<option' + (o === v ? ' selected' : '') + '>' + o + '</option>').join('') + '</select></div>'; continue; }
    const names = k === 'v' ? (P.t === 'jet' ? WK.JET : P.t === 'prop' ? WK.PROP : P.t === 'rocket' ? WK.ROCK : P.t === 'gear' ? WK.GEARS : P.t === 'rwheel' ? WK.RW : null) : null;
    if (names) { h += '<div class="wkr"><label>Model</label><select data-k="v" data-n="1">' + names.map((o, i) => '<option value="' + i + '"' + (i === (v | 0) ? ' selected' : '') + '>' + o.n + '</option>').join('') + '</select></div>'; continue; }
    if (WKSEL[k]) { h += '<div class="wkr"><label>' + (WKL[k] || k) + '</label><select data-k="' + k + '" data-n="1">' + WKSEL[k].map((o, i) => '<option value="' + i + '"' + (i === (v | 0) ? ' selected' : '') + '>' + o + '</option>').join('') + '</select></div>'; continue; }
    const rng = T.rng && T.rng[k]; if (rng) h += Wk.slider(WKL[k] || k, k, 'data-k', +v, rng);
  }
  if (T.par.col != null) { h += '<div class="wksw">' + WKG.pal.map((c, i) => '<button data-a="col" data-v="' + i + '" class="' + (i === (par.col | 0) ? 'on' : '') + '" title="' + WKG_NAMES[i] + '" style="background:#' + c.toString(16).padStart(6, '0') + '"></button>').join('') + '</div>'; }
  if (P.p != null && P.at) {
    h += '<h4>Mounting</h4>'; const pd = D[P.p];
    if (P.t !== 'cockpit' && P.t !== 'capsule') h += '<div class="wkseg"><button data-a="mmode" data-v="s" class="' + (P.at.k === 's' ? 'on' : '') + '">Stack</button><button data-a="mmode" data-v="f" class="' + (P.at.k !== 's' ? 'on' : '') + '">On surface</button></div>';
    if (P.at.k === 'f') { const L = pd && pd.L ? pd.L : 2; h += Wk.slider('Position', 'u', 'data-ak', P.at.u || 0, [-L / 2, L / 2, 0.05]) + Wk.slider('Angle °', 'phi', 'data-ak', Math.round((P.at.phi || 0) * 180 / Math.PI), [-180, 360, 5]).replace('data-ak="phi"', 'data-ak="phi" data-deg="1"') + Wk.slider('Roll °', 'roll', 'data-ak', Math.round((P.at.roll || 0) * 180 / Math.PI), [-90, 90, 5]).replace('data-ak="roll"', 'data-ak="roll" data-deg="1"'); }
    else if (P.at.k === 'w') h += Wk.slider('Along span', 'u', 'data-ak', P.at.u || 0, [0, 1, 0.05]) + Wk.slider('Along chord', 'v', 'data-ak', P.at.v == null ? 0.5 : P.at.v, [0, 1, 0.05]) + '<div class="wkr"><label>Side</label><select data-ak="side" data-n="1"><option value="1"' + (P.at.side >= 0 ? ' selected' : '') + '>Top</option><option value="-1"' + (P.at.side < 0 ? ' selected' : '') + '>Bottom</option></select></div>';
    else h += '<div class="wkst"><span>Stacked on</span><b>' + _wkEsc(WK.P[Wk.byId(P.p).t].label) + ' ' + P.at.pn + '</b></div>';
  }
  const eng = T.info(par).eng, dec = P.t === 'decoupler', chute = P.t === 'chute';
  if ((eng && (eng.kind === 'rocket' || eng.kind === 'solid')) || chute || dec) {
    const key = dec ? 'ss' : 'st', val = (dec ? P.ss : P.st) | 0; h += '<h4>Staging</h4><div class="wkr" style="grid-template-columns:1fr auto auto auto"><label>' + (dec ? 'Separates in stage' : chute ? 'Opens in stage' : 'Ignites in stage') + '</label><button class="wb" data-a="stg" data-v="-1" data-k="' + key + '">−</button><b style="min-width:20px;text-align:center">' + (val || '–') + '</b><button class="wb" data-a="stg" data-v="1" data-k="' + key + '">+</button></div>';
  }
  const info = Wk.partInfo(P, par); if (info) h += '<div class="wkst" style="margin-top:6px">' + info + '</div>';
  h += '<div class="wkseg" style="margin-top:8px"><button data-a="up"' + (P.p == null ? ' disabled' : '') + '>Parent</button><button data-a="pick" class="' + (Wk.pick ? 'on' : '') + '"' + (P.p == null ? ' disabled' : '') + '>Move…</button><button data-a="del" class="wb bad">Delete</button></div>';
  return h;
};
Wk.partInfo = function (P, par) {
  const d = WK.P[P.t].info(par), r = (a, b) => '<span>' + a + '</span><b>' + b + '</b>'; let h = r('Mass', _wkFmt(d.mass + (d.fuel0 || 0), d.mass > 99 ? 0 : 1) + ' kg');
  if (d.fuelCap > 0) h += r(P.t === 'solid' ? 'Propellant' : 'Capacity', _wkFmt(d.fuelCap) + ' kg');
  if (d.eng) { const e = d.eng; if (e.kind === 'jet') h += r('Thrust', _wkFmt(e.T / 1000) + ' kN' + (e.ab ? ' (+' + _wkFmt(e.T * (e.ab - 1) / 1000) + ' AB)' : '')); else if (e.kind === 'prop') h += r('Power', _wkFmt(e.P / 1000) + ' kW'); else h += r('Thrust', _wkFmt(e.F / 1000) + ' kN') + r('Isp', _wkFmt(e.iv) + ' s vac / ' + _wkFmt(e.is) + ' s sl'); }
  if (d.wing) h += r('Area', _wkFmt(d.wing.S, 1) + ' m²') + r('Aspect ratio', _wkFmt(d.wing.AR, 1));
  if (d.chute) h += r('Canopy', _wkFmt(par.d, 1) + ' m');
  return h;
};
Wk.statsHTML = function () {
  const S = Wk.stats; if (!S) return ''; const air = Wk.spec.mode === 'air', r = (a, b) => '<span>' + a + '</span><b>' + b + '</b>';
  let h = '<h4>Craft</h4><div class="wkseg"><button data-a="site" data-v="air" class="' + (air ? 'on' : '') + '">Runway</button><button data-a="site" data-v="rocket" class="' + (!air ? 'on' : '') + '">Launch pad</button></div>';
  if (!air) { h += '<select data-a="start" aria-label="Start location" style="width:100%;margin:6px 0 2px"><option value="">Start: on the launch pad</option>'; for (const B of WK.BODIES) if (WKF_START_ALT[B.id]) h += '<option value="' + B.id + '"' + (Wk.spec.start === B.id ? ' selected' : '') + '>Start: in orbit of ' + B.name + '</option>'; h += '</select>'; }
  h += '<div class="wkst">';
  h += r('Mass', _wkFmt(S.mass) + ' kg') + r('Parts', Wk.spec.parts.length) + r('Length', _wkFmt(S.len, 1) + ' m');
  if (S.thrustSL > 0) h += r('Thrust (sea level)', _wkFmt(S.thrustSL / 1000, 1) + ' kN') + r('Thrust / weight', _wkFmt(S.twr, 2));
  if (S.wingArea > 0 && (air || S.mode === 'air')) h += r('Wing area', _wkFmt(S.wingArea, 1) + ' m²') + r('Wing loading', _wkFmt(S.wingLoad, 0) + ' N/m²') + r('Stall speed', _wkFmt(S.stall, 0) + ' m/s');
  if (!air || S.dv > 100) h += r('Delta-v', _wkFmt(S.dv, 0) + ' m/s');
  if (S.fuelCap > 0 && air) h += r('Fuel', _wkFmt(S.fuel) + ' / ' + _wkFmt(S.fuelCap) + ' kg');
  h += '</div>';
  if (isFinite(S.marginPct)) { const p = Math.max(-10, Math.min(40, S.marginPct)); h += '<div class="wkst" style="margin-top:5px">' + r('Stability margin', _wkFmt(S.marginPct, 0) + '% chord') + '</div><div class="wkmar"><u style="left:' + ((5 + 10) / 50 * 100) + '%;width:' + (20 / 50 * 100) + '%"></u><i style="left:' + ((p + 10) / 50 * 100) + '%"></i></div>'; }
  if (S.stages.length > 1 || (S.stages.length === 1 && !air)) { h += '<h4>Stages</h4><div class="wkst">'; for (const s of S.stages) h += r('Stage ' + s.n + ' Δv', _wkFmt(s.dv, 0) + ' m/s') + r(' TWR ' + _wkFmt(s.twr, 2), _wkFmt(s.t, 0) + ' s burn'); h += '</div>'; }
  for (const w of S.warnings) h += '<div class="wkw">' + _wkEsc(w) + '</div>'; for (const w of S.hints) h += '<div class="wkw h">' + _wkEsc(w) + '</div>';
  return h;
};
Wk.stageHTML = function () {
  const ps = Wk.spec.parts; let mx = 0; for (const p of ps) mx = Math.max(mx, p.st | 0, p.ss | 0);
  const hasStaged = ps.some((p) => p.t === 'rocket' || p.t === 'solid' || p.t === 'decoupler' || p.t === 'chute');
  if (!ps.length) return '<span class="none">Empty hangar. Choose a command part on the left, or open Presets.</span>';
  if (!hasStaged) return '<span class="none">Jets and propellers run from the throttle: no staging needed. Add rocket engines, boosters, decouplers or parachutes and they show up here.</span>';
  const ic = (p) => (p.t === 'decoupler' ? '✂ ' : p.t === 'chute' ? '☂ ' : '▲ ');
  let h = ''; for (let n = 1; n <= Math.max(mx, 1); n++) {
    const items = ps.filter((p) => (p.t === 'decoupler' ? (p.ss | 0) === n : (p.t === 'rocket' || p.t === 'solid' || p.t === 'chute') && (p.st | 0) === n));
    h += '<div class="wkstg"><small>Stage ' + n + '</small>' + (items.map((p) => '<button data-a="sel" data-v="' + p.id + '" class="' + (p.id === Wk.sel ? 'sel' : '') + '">' + ic(p) + _wkEsc(Wk.partName(p)) + '</button>').join('') || '<button disabled style="opacity:.5">empty</button>') + '</div>';
  }
  const idle = ps.filter((p) => (p.t === 'rocket' || p.t === 'solid' || p.t === 'chute') && !(p.st | 0));
  if (idle.length) h += '<div class="wkstg" style="border-top-color:#ff4d5e"><small style="color:#ff4d5e">Unassigned</small>' + idle.map((p) => '<button data-a="sel" data-v="' + p.id + '">' + _wkEsc(Wk.partName(p)) + '</button>').join('') + '</div>';
  h += '<div class="wkstg" style="border-top-color:#4be08a;min-width:100px"><small style="color:#4be08a">Auto</small><button data-a="autostage">Re-stage' + (Wk.spec.manualStage ? ' (manual)' : '') + '</button><button disabled style="opacity:.5">Space = next</button></div>';
  return h;
};
Wk.partName = function (p) { const T = WK.P[p.t], v = ((p.par || {}).v == null ? T.par.v : p.par.v) | 0; return p.t === 'rocket' ? WK.ROCK[v].n : p.t === 'solid' ? 'Booster' : T.label; };
Wk.refreshUI = function () {
  E.wkTabs.innerHTML = Wk.tabsHTML(); E.wkList.innerHTML = Wk.listHTML(); E.wkName.value !== Wk.spec.name && document.activeElement !== E.wkName && (E.wkName.value = Wk.spec.name);
  Wk.refreshProps(); E.wkBot.innerHTML = Wk.stageHTML(); E.wkSym.value = Wk.symMode;
  E.wkTip.textContent = !Wk.spec.parts.length ? 'Start with a Command part.' : Wk.pick ? 'Click the model where this part should go. Esc cancels.' : 'Click parts to select · drag to orbit · right-drag pans · wheel zooms · Ctrl+Z undoes';
  E.wkTop.querySelector('[data-a=undo]').disabled = !Wk.hist.length; E.wkTop.querySelector('[data-a=redo]').disabled = !Wk.fut.length; E.wkTop.querySelector('[data-a=pick]').classList.toggle('on', Wk.pick);
};
Wk.refreshProps = function () { const keep = E.wkRight.scrollTop; E.wkProps.innerHTML = Wk.propsHTML(); E.wkStats.innerHTML = Wk.statsHTML(); E.wkRight.scrollTop = keep; };
Wk.refreshStats = function () {
  if (!Wk.C) { Wk.stats = null; E.wkStats.innerHTML = ''; return; }
  try { Wk.stats = WK.stats(WK.compile(Wk.fresh())); } catch (er) { Wk.stats = null; console.error(er); }
  E.wkStats.innerHTML = Wk.statsHTML(); const k = Wk.stats; Wk.cop = k && k.cop ? k.cop : null; Wk.com = k ? k.com : null;
};
Wk.live = function (el) {   /* a slider moved: update the label and the model immediately, keep the panel as it is */
  const o = el.parentNode.querySelector('output'), v = +el.value, dec = _wkDec(el.step); if (o) o.textContent = v.toFixed(dec);
  if (!Wk.editing) { Wk.snap(); Wk.editing = true; }
  const P = Wk.byId(Wk.sel); if (!P) return;
  if (el.dataset.k) Wk.setPar(P.id, el.dataset.k, v); else if (el.dataset.ak) Wk.setAt(P.id, el.dataset.ak, el.dataset.deg ? v * Math.PI / 180 : v);
  if (!Wk.spec.manualStage) WK.autoStage(Wk.spec);
};

/* ---------- modal: presets, save slots, share code ---------- */
Wk.modal = function (kind) {
  const box = E.wkModalBox, M = E.wkModal; if (!kind) { M.hidden = true; if (WkF.tpPaused) { WkF.paused = WkF._pp; WkF.tpPaused = false; } return; } M.hidden = false; let h = '';
  const brief = (spec) => { try { const S = WK.stats(WK.compile(_wkClone(spec))); return _wkFmt(S.mass) + ' kg · ' + spec.parts.length + ' parts' + (S.dv > 300 ? ' · Δv ' + _wkFmt(S.dv) : '') + (S.stall && S.wingArea > 0 && spec.mode === 'air' ? ' · stall ' + _wkFmt(S.stall) + ' m/s' : ''); } catch (er) { return ''; } };
  if (kind === 'tp') { h = WkF.tpHTML(); }
  else if (kind === 'presets') {
    h = '<h3>Presets</h3>'; WK.PRESETS.forEach((p, i) => { h += '<div class="wkrow"><div><b>' + _wkEsc(p.name) + '</b><small>' + _wkEsc(p.blurb) + ' ' + brief(p) + '</small></div><button class="wb" data-a="preset" data-v="' + i + '">Load</button></div>'; });
  } else if (kind === 'slots') {
    h = '<h3>Save / Load</h3>'; for (let i = 0; i < 3; i++) { const s = save.wk.slots[i]; h += '<div class="wkrow"><div><b>' + (s ? _wkEsc(s.name || 'Craft') : 'Slot ' + (i + 1) + ' – empty') + '</b><small>' + (s ? brief(s) : 'Nothing saved here') + '</small></div><button class="wb" data-a="slotsave" data-v="' + i + '">Save</button><button class="wb" data-a="slotload" data-v="' + i + '"' + (s ? '' : ' disabled') + '>Load</button><button class="wb bad" data-a="slotdel" data-v="' + i + '"' + (s ? '' : ' disabled') + '>✕</button></div>'; }
    h += '<h3 style="margin-top:12px;font-size:17px">Share code</h3><textarea id="wkCode" rows="3" style="width:100%;background:#0b0f15;color:#cfd8e3;border:1px solid var(--line);font:11px monospace" spellcheck="false"></textarea><div style="display:flex;gap:8px;margin-top:6px"><button class="wb" data-a="codecopy">Show this craft’s code</button><button class="wb" data-a="codeimport">Import code</button></div>';
  }
  h += '<div style="text-align:right;margin-top:10px"><button class="wb" data-a="modalx">Close</button></div>'; box.innerHTML = h;
};
Wk.doAction = function (a, v, el) {
  switch (a) {
    case 'tab': Wk.tab = v; E.wkList.innerHTML = Wk.listHTML(); E.wkTabs.innerHTML = Wk.tabsHTML(); break;
    case 'add': Wk.add(v); break;
    case 'sel': Wk.select(+v); break;
    case 'del': Wk.del(Wk.sel); break;
    case 'up': { const P = Wk.byId(Wk.sel); if (P && P.p != null) Wk.select(P.p); break; }
    case 'col': { Wk.snap(); Wk.setPar(Wk.sel, 'col', +v); Wk.uiDirty = true; break; }
    case 'mmode': Wk.setMode(Wk.sel, v); break;
    case 'stg': { const P = Wk.byId(Wk.sel); if (P) { Wk.snap(); Wk.setStage(P.id, el.dataset.k, ((P[el.dataset.k] | 0) + (+v))); } break; }
    case 'autostage': Wk.snap(); Wk.spec.manualStage = false; Wk.commit(); break;
    case 'site': Wk.snap(); Wk.spec.mode = v; Wk.spec.siteSet = true; Wk.touch(true); break;
    case 'undo': Wk.undo(); break; case 'redo': Wk.redo(); break;
    case 'clear': Wk.clear(); break;
    case 'pick': if (Wk.byId(Wk.sel) && Wk.byId(Wk.sel).p != null) { Wk.pick = !Wk.pick; Wk.uiDirty = true; } break;
    case 'presets': Wk.modal('presets'); break; case 'slots': Wk.modal('slots'); break; case 'modalx': Wk.modal(null); break;
    case 'preset': Wk.loadSpec(WK.PRESETS[+v], false); Wk.spec.siteSet = false; Wk.autoSite(); Wk.modal(null); break;
    case 'slotsave': { const s = Wk.fresh(); save.wk.slots[+v] = s; writeSave(); Wk.modal('slots'); Wk.toast('Saved to slot ' + (+v + 1), 'good'); break; }
    case 'slotload': { const s = save.wk.slots[+v]; if (s) { Wk.loadSpec(s, true); Wk.modal(null); } break; }
    case 'slotdel': save.wk.slots[+v] = null; writeSave(); Wk.modal('slots'); break;
    case 'codecopy': { const ta = document.getElementById('wkCode'); if (ta) { ta.value = JSON.stringify(Wk.fresh()); ta.select(); try { document.execCommand('copy'); } catch (er) { /* ignore */ } } break; }
    case 'codeimport': { const ta = document.getElementById('wkCode'); try { const s = JSON.parse(ta.value); if (!s || !Array.isArray(s.parts) || !s.parts.length || !WK.P[s.parts[0].t]) throw new Error('bad'); for (const p of s.parts) if (!WK.P[p.t]) throw new Error('bad'); Wk.loadSpec(s, false); Wk.modal(null); Wk.toast('Imported ' + (s.name || 'craft'), 'good'); } catch (er) { Wk.toast('That is not a craft code', 'bad'); } break; }
    case 'exit': Wk.exit(); break;
    case 'launch': Wk.launch(); break;
    case 'fview': WkF.cycleView(); break; case 'fmap': WkF.toggleMap('local'); break; case 'fsys': WkF.toggleMap('sys'); break; case 'fback': WkF.back(); break; case 'frelaunch': WkF.relaunch(); break; case 'ftp': WkF.tpOpen(); break; case 'feva': WkE.toggle(); break; case 'tp': WkF.teleport(v); break;
    default:
  }
};
Wk.select = function (id) { Wk.sel = Wk.byId(id) ? id : 0; Wk.pick = false; Wk.uiDirty = true; Wk.selDirty = true; };

/* ---------- picking ---------- */
Wk.hit = function (cx, cy) {
  if (!Wk.cr) return null; const W = innerWidth, H = innerHeight; Wk.ray.setFromCamera({ x: cx / W * 2 - 1, y: -(cy / H) * 2 + 1 }, Wk.cam);
  const hits = Wk.ray.intersectObjects(Wk.cr.root.children, true); for (const h of hits) { if (!h.object.visible) continue; let o = h.object; while (o && o.userData.pid == null) o = o.parent; if (o) return { pid: o.userData.pid, point: h.point.clone() }; } return null;
};
Wk.click = function (x, y) {
  const h = Wk.hit(x, y);
  if (!Wk.pick) { Wk.select(h ? h.pid : 0); return; }
  if (!h) return; const P = Wk.byId(Wk.sel); if (!P || P.p == null) { Wk.pick = false; return; }
  if (Wk.subtreeIds(P.id).includes(h.pid)) { Wk.toast('Pick a spot on a different part', 'bad'); return; }
  const tgt = Wk.byId(h.pid), D = WK.layout(Wk.spec).D, d = D[tgt.id]; if (!d.surf) { Wk.toast('Nothing can be mounted on that', 'bad'); return; }
  const grp = Wk.cr.parts[tgt.id]; grp.updateWorldMatrix(true, false); const l = grp.worldToLocal(h.point.clone()); let at;
  if (d.kind === 'wing') { const w = d.wing, s = l.x * w.sA[0] + l.y * w.sA[1] + l.z * w.sA[2], n = l.x * w.nA[0] + l.y * w.nA[1] + l.z * w.nA[2], f = l.x * w.fA[0] + l.y * w.fA[1] + l.z * w.fA[2]; const u = clamp(s / w.b, 0, 1), c = w.cr + (w.ct - w.cr) * u, le = w.cr / 2 - u * w.b * w.tanL; at = { k: 'w', u: +u.toFixed(2), v: +clamp((le - f) / c, 0, 1).toFixed(2), side: n >= 0 ? 1 : -1 }; }
  else at = { k: 'f', u: +clamp(l.z, -d.L / 2, d.L / 2).toFixed(2), phi: +(Math.round(Math.atan2(l.y, l.x) / (Math.PI / 24)) * Math.PI / 24).toFixed(3) };
  /* move the whole group: keep one copy with its subtree, drop the others, then make fresh symmetric copies at the new spot */
  { const rm0 = new Set(); for (const m of Wk.members(P)) if (m !== P) for (const i of Wk.subtreeIds(m.id)) rm0.add(i); if (rm0.has(h.pid)) { Wk.toast('Pick a spot on a different part', 'bad'); return; } }
  Wk.snap(); const keep = P, others = Wk.members(P).filter((m) => m !== keep), rm = new Set(); for (const m of others) for (const i of Wk.subtreeIds(m.id)) rm.add(i);
  const sub = Wk.subtreeIds(keep.id).map((i) => Wk.byId(i)).filter(Boolean); const tpl = sub.map((q) => _wkClone(q)); Wk.spec.parts = Wk.spec.parts.filter((q) => !rm.has(q.id) && !sub.includes(q));
  tpl[0].par = tpl[0].par || {}; const ats = Wk.symAts(at, tpl[0].t), mem = Wk.members(tgt), pairs = []; for (const m of mem) for (const a of ats) pairs.push({ par: m, at: a.at, s: a.s });
  const gid = pairs.length > 1 ? ++Wk.spec.gid : 0; delete tpl[0].p; const tops = Wk.place(tpl, pairs, gid); Wk.pick = false; Wk.sel = tops[0]; Wk.commit();
};

/* ---------- input binding (called once) ---------- */
Wk.bind = function () {
  const W = E.wk;
  W.addEventListener('click', (e) => { const b = e.target.closest('[data-a]'); if (!b || b.disabled) return; Wk.doAction(b.dataset.a, b.dataset.v, b); });
  W.addEventListener('input', (e) => { const t = e.target; if (t.type === 'range' && (t.dataset.k || t.dataset.ak)) Wk.live(t); else if (t === E.wkName) { Wk.spec.name = t.value.slice(0, 24); Wk.touch(); } });
  W.addEventListener('change', (e) => {
    const t = e.target; Wk.editing = false;
    if (t.type === 'range') { t.blur(); Wk.uiDirty = true; return; }
    if (t.tagName === 'SELECT') { if (t === E.wkSym) { Wk.symMode = t.value; t.blur(); return; } if (t.dataset.a === 'start') { Wk.snap(); if (t.value) Wk.spec.start = t.value; else delete Wk.spec.start; Wk.touch(true); t.blur(); return; } const P = Wk.byId(Wk.sel); if (!P) return; Wk.snap(); const v = t.dataset.n ? +t.value : t.value;
      if (t.dataset.k) Wk.setPar(P.id, t.dataset.k, v); else if (t.dataset.ak) Wk.setAt(P.id, t.dataset.ak, v);
      t.blur(); Wk.commit(); }
  });
  /* 3D view: orbit, pan, zoom, click to select */
  const gl = E.gl, ptrs = new Map(); let drag = null, pinch = 0;
  gl.addEventListener('pointerdown', (e) => { if (App.mode !== 'wk') return; ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, moved: 0, pan: e.button === 2 || e.shiftKey }; if (ptrs.size === 2) { const a = [...ptrs.values()]; pinch = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); drag.moved = 99; } try { gl.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ } });
  gl.addEventListener('pointermove', (e) => {
    if (App.mode !== 'wk' || !ptrs.has(e.pointerId)) return; const p = ptrs.get(e.pointerId), dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    if (ptrs.size === 2) { const a = [...ptrs.values()], d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); if (pinch > 0) Wk.zoom(pinch / Math.max(d, 1)); pinch = d; return; }
    if (!drag || drag.id !== e.pointerId) return; drag.moved += Math.abs(dx) + Math.abs(dy);
    if (Wk.ph === 'fly') { WkF.drag(dx, dy); return; }
    const g = Wk.goal; if (drag.pan) { const k = g.D * 0.0018, c = Math.cos(Wk.az), s = Math.sin(Wk.az); g.tx -= (c * dx) * k; g.tz += (s * dx) * k; g.ty += dy * k; } else { g.az -= dx * 0.0075; g.el = clamp(g.el + dy * 0.006, -0.25, 1.45); }
  });
  const up = (e) => { if (!ptrs.has(e.pointerId)) return; ptrs.delete(e.pointerId); pinch = 0; if (App.mode === 'wk' && drag && drag.id === e.pointerId && drag.moved < 6 && Wk.ph === 'build') Wk.click(e.clientX, e.clientY); if (drag && drag.id === e.pointerId) drag = null; };
  gl.addEventListener('pointerup', up); gl.addEventListener('pointercancel', up);
  gl.addEventListener('wheel', (e) => { if (App.mode !== 'wk') return; e.preventDefault(); Wk.zoom(Math.exp(e.deltaY * 0.0011)); }, { passive: false });
};
Wk.zoom = function (k) { if (Wk.ph === 'fly') WkF.zoom(k); else Wk.goal.D = clamp(Wk.goal.D * k, 3, 90); };

/* ---------- open / close ---------- */
Wk.init = function () {
  if (Wk.inited) return; Wk.inited = true; Wk.bind();
  E.wkOv.style.pointerEvents = 'none';
};
Wk.open = function (then) {
  if (App.mode !== 'play' || Wk.on) return; Wk.setup(); Wk.init();
  if (!Wk.spec) { const s = save.wk.cur; Wk.spec = s && s.parts && s.parts.length ? _wkClone(s) : Wk.newSpec(); if (!(s && s.parts && s.parts.length)) { const t = _wkClone(WK.PRESETS[0]); t.nid = Math.max(...t.parts.map((p) => p.id)) + 1; t.gid = 0; Wk.spec = t; WK.autoStage(Wk.spec); } Wk.spec.nid = Wk.spec.nid || Math.max(1, ...Wk.spec.parts.map((p) => p.id)) + 1; Wk.spec.gid = Wk.spec.gid || 0; Wk.sel = 0; Wk.tab = Wk.spec.parts.length ? 'str' : 'cmd'; }
  UI.fade(true, 'WORKSHOP', 'Build it. Fly it.');
  setTimeout(() => {
    Wk.on = true; Wk.ph = 'build'; Wk.refit = true; UI.setMode('wk'); E.wkBuild.hidden = false; E.wkFly.hidden = true; Wk.modal(null); for (const k in Keys) Keys[k] = false;
    Wk.az = Wk.goal.az = 0.85; Wk.el = Wk.goal.el = 0.22; Wk.rebuild(); Wk.D = Wk.goal.D = Wk.fitD; Wk.tgt.set(Wk.goal.tx, Wk.goal.ty, Wk.goal.tz); Wk.refreshUI(); Wk.refreshStats(); Wk.dirty = false; UI.fade(false); if (then) then();
  }, 380);
};
/* Dev tab: fly your Workshop rocket (or the Skylark if there isn't a usable one) straight to a world, skipping the climb */
Wk.devFly = function (id, where) {
  if (!save.set.dev || !WK.BY[id]) return;
  Wk.open(() => {
    let sp = Wk.fresh(), ok = sp.mode !== 'air' && sp.parts.length > 0; if (ok) { try { Wk.refreshStats(); ok = !!(Wk.stats && Wk.stats.crew); } catch (er) { ok = false; } }
    if (!ok) { sp = _wkClone(WK.PRESETS[2]); sp.nid = Math.max(...sp.parts.map((p) => p.id)) + 1; }
    delete sp.start; WkF.start(sp, () => { WkF.teleport(id + ':' + where); if (where === 'land') WkE.exit(); });
  });
};
Wk.exit = function () {
  if (Wk.ph === 'fly') { WkF.back(true); return; }
  Wk.persist(); Wk.on = false; Wk.pick = false; UI.fade(true, '', ''); setTimeout(() => { UI.setMode('play'); for (const k in Keys) Keys[k] = false; UI.fade(false); }, 300);
};
Wk.persist = function () { try { if (Wk.spec) save.wk.cur = Wk.fresh(); writeSave(); } catch (er) { /* ignore */ } };
Wk.launch = function () {
  const spec = Wk.spec; if (!spec.parts.length) { Wk.toast('Build something first', 'bad'); return; }
  if (!Wk.stats) Wk.refreshStats(); if (!Wk.stats || !Wk.stats.crew) { Wk.toast('It needs a cockpit or capsule to launch', 'bad'); return; }
  Wk.persist(); WkF.start(Wk.fresh());
};

/* ---------- keys, per-frame ---------- */
Wk.key = function (code) {
  if (Wk.ph === 'fly') { WkF.key(code); return; }
  if (!E.wkModal.hidden) { if (code === 'Escape') Wk.modal(null); return; }
  const ctrl = Keys.ControlLeft || Keys.ControlRight || Keys.MetaLeft || Keys.MetaRight;
  if (code === 'Escape') { if (Wk.pick) { Wk.pick = false; Wk.uiDirty = true; } else if (Wk.sel) Wk.select(0); else Wk.exit(); }
  else if (code === 'KeyZ' && ctrl) { if (Keys.ShiftLeft || Keys.ShiftRight) Wk.redo(); else Wk.undo(); }
  else if (code === 'KeyY' && ctrl) Wk.redo();
  else if ((code === 'Delete' || code === 'Backspace') && Wk.sel) Wk.del(Wk.sel);
  else if (code === 'KeyF' && !ctrl) { Wk.focusCam(); }
  else if (code === 'Enter' && !ctrl) { /* ignore */ }
};
Wk.frame = function (dt) {
  if (Wk.ph === 'fly') { WkF.frame(dt); return; }
  App.time += dt; if (Snd.ok) Snd.update(car, dt, true);
  if (Wk.dirty) { Wk.dirty = false; Wk.rebuild(); Wk.statT = 0.12; }
  if (Wk.selDirty) { Wk.selDirty = false; if (Wk.cr) WKG.highlight(Wk.cr, Wk.byId(Wk.sel) ? Wk.members(Wk.byId(Wk.sel)).map((m) => m.id) : [], 0xffb02e, 0.5); }
  if (Wk.statT > 0) { Wk.statT -= dt; if (Wk.statT <= 0) { Wk.refreshStats(); } }
  if (Wk.uiDirty) { Wk.uiDirty = false; if (document.activeElement && document.activeElement.type === 'range') { /* leave the slider alone while dragging */ Wk.refreshPartial(); } else Wk.refreshUI(); }
  if (Wk.saveT > 0) { Wk.saveT -= dt; if (Wk.saveT <= 0) Wk.persist(); }
  const g = Wk.goal, k = 1 - Math.exp(-dt * 9);
  Wk.az += (g.az - Wk.az) * k; Wk.el += (g.el - Wk.el) * k; Wk.D += (g.D - Wk.D) * k; Wk.tgt.x += (g.tx - Wk.tgt.x) * k; Wk.tgt.y += (g.ty - Wk.tgt.y) * k; Wk.tgt.z += (g.tz - Wk.tgt.z) * k;
  const cam = Wk.cam, W = innerWidth, H = innerHeight, ce = Math.cos(Wk.el);
  cam.aspect = W / H; cam.position.set(Wk.tgt.x + Math.sin(Wk.az) * Wk.D * ce, Wk.tgt.y + Math.sin(Wk.el) * Wk.D, Wk.tgt.z + Math.cos(Wk.az) * Wk.D * ce); cam.lookAt(Wk.tgt);
  const lr = E.wkLeft.getBoundingClientRect(), rr = E.wkRight.getBoundingClientRect(), tr = E.wkTop.getBoundingClientRect(), br = E.wkBot.getBoundingClientRect(), narrow = W < 700;
  const ox = narrow ? 0 : W / 2 - (lr.right + rr.left) / 2, oy = narrow ? 0 : H / 2 - (tr.bottom + br.top) / 2;
  cam.setViewOffset(W, H, ox, oy, W, H); cam.updateProjectionMatrix();
  const s0 = scene, c0 = camera, e0 = env.exposure; scene = Wk.sc; camera = cam; env.exposure = 1.0;
  try { renderFrame(Wk.fx, App.time); } finally { env.exposure = e0; scene = s0; camera = c0; }
  Wk.overlay(W, H);
};
Wk.refreshPartial = function () { E.wkBot.innerHTML = Wk.stageHTML(); E.wkStats.innerHTML = Wk.statsHTML(); E.wkTabs.innerHTML = Wk.tabsHTML(); };
Wk.proj3 = function (v) { const p = v.clone().project(Wk.cam); return [(p.x * 0.5 + 0.5) * innerWidth, (-p.y * 0.5 + 0.5) * innerHeight, p.z]; };
Wk.overlay = function (W, H) {
  const cv = Wk.ov, dpr = Math.min(2, window.devicePixelRatio || 1); if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const g = Wk.ovg; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H); if (!Wk.C || !Wk.com) return;
  const rocket = Wk.spec.mode === 'rocket', toW = (p) => { const v = new THREE.Vector3(p[0], rocket ? p[2] : p[1], rocket ? -p[1] : p[2]); v.y += Wk.holder.position.y; return v; };
  const mark = (p, col, label, r, dy) => { const s = Wk.proj3(toW(p)); if (s[2] > 1) return; g.lineWidth = 2; g.strokeStyle = col; g.fillStyle = 'rgba(0,0,0,0.45)'; g.beginPath(); g.arc(s[0], s[1], r, 0, TAU); g.fill(); g.stroke(); g.beginPath(); g.moveTo(s[0] - r - 5, s[1]); g.lineTo(s[0] + r + 5, s[1]); g.moveTo(s[0], s[1] - r - 5); g.lineTo(s[0], s[1] + r + 5); g.stroke(); g.fillStyle = col; g.font = '700 12px Rajdhani, sans-serif'; g.textAlign = 'left'; g.fillText(label, s[0] + r + 8, s[1] + (dy || -r)); };
  mark(Wk.com, '#ffd24a', 'CENTRE OF MASS', 7); if (Wk.cop && Wk.stats && (Wk.stats.wingArea > 0 || Wk.stats.marginPct != null)) mark(Wk.cop, '#5ab0ff', 'CENTRE OF PRESSURE', 6, 20);
  if (Wk.pick) { g.fillStyle = 'rgba(255,176,46,0.95)'; g.font = '700 20px Rajdhani, sans-serif'; g.textAlign = 'center'; g.fillText('CLICK THE MODEL TO MOVE THE PART THERE', W / 2, 96); }
};
