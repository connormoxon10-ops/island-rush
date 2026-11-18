/* ================= CUSTOM CAR WORKS: build your own car from parts =================
   A workshop in Fairhaven, Redstone and Lakeshore. At the design station you put a car together part by part:
     shell        the body and chassis of one of the road cars or a traffic body (its size, weight, wheelbase, track, cab and windows)
     engine       any car's engine (its torque, rev range and sound), even a hypercar's or a go-kart's
     gearbox      any car's gear set and final drive
     drive        rear-, front- or all-wheel drive
     suspension   street, lowered, rally long-travel, off-road lift or slammed (ride height, travel, centre of gravity, rock climbing)
     tyres        street, sport, semi-slick, all-terrain, mud or drag radials (grip, cornering, off-road)
     wheels       size and style (bigger wheels lift the car and gear it taller)
     brakes, aero (none, a lip, a GT wing, a big wing, a rally wing), body kit (scoop, flares, skirts, splitter, diffuser, intakes, bull bar,
     light bar, roof rack, stripes, side pipes), a paint colour and a name.
   The car on the turntable is rebuilt as you go, and the numbers (top speed, 0-100, cornering grip, weight, power) come from the same
   estimator the Tuning tab uses, so they are what the car really does. Build it and it is yours: a new car in your garage, parked at the
   workshop door. Come back to change parts (you pay for the new ones) or scrap a build (40 % back). Up to eight builds.
   save.kit = { n, cars: { id: { id, name, paint, parts: { shell, engine, gears, drive, susp, tyre, wheel, brake, aero, kit: [] } } } } */
const KIT = { max: 8 };
const KIT_ADDONS = { exhaust: 1, wing: 1, scoop: 1, splitter: 1, diffuser: 1, intakes: 1, bullbar: 1, lightbar: 1, rack: 1, stripes: 1, lip: 1, skirts: 1, flares: 1, rally: 1, drag: 1, tailBar: 1 };
/* ---------- the parts ---------- */
function kitParts() {
  if (KIT.P) return KIT.P; const P = KIT.P = { shell: [], engine: [], gears: [], drive: [], susp: [], tyre: [], wheel: [], brake: [], aero: [], kit: [] };
  const base = CARS.slice(0, BASE_N).filter((d) => d.price >= 0 && !d.stolen && !d.prize);
  /* shells: the road cars built by the general body builder, and the traffic bodies */
  for (const d of base) {
    if (d.body.custom || d.body.buggy) continue; const b = JSON.parse(JSON.stringify(d.body)); for (const k in KIT_ADDONS) delete b[k];
    P.shell.push({ id: 's:' + d.id, name: d.cls + ' shell', from: d.name, price: Math.max(600, Math.round(d.price * 0.3 / 50) * 50), body: b, dy: d.dy, m: d.p.m - (d.t.Tmax - 300) * 0.25, geo: { a: d.p.a, b: d.p.b, Iz: d.p.Iz, track: d.p.track, cgh: d.p.cgh, rsf: d.p.rsf != null ? d.p.rsf : 0.5, ab: d.p.ab != null ? d.p.ab : 0.5, cf: d.p.cf || 10.2, cr: d.p.cr || 12.2 }, cd: d.t.cd - (d.body.wing ? 0.06 : 0) });
  }
  for (const T of TRAFFIC_DEFS) {
    const b = JSON.parse(JSON.stringify(T.body)); delete b.exhaust; const L = b.L, W = b.W, m = Math.round(950 + L * W * (b.H + b.C) * 150);
    P.shell.push({ id: 's:t' + T.name, name: { sedan: 'Saloon', hatch: 'Compact hatch', suv: 'SUV', van: 'Van' }[T.name] + ' shell', from: 'a traffic body', price: 500, body: b, dy: b.boxy ? 0.2 : 0, m, geo: { a: T.p.a, b: T.p.b, Iz: Math.round(m * (L * L + W * W) / 12 * 0.95), track: W - 0.26, cgh: (b.y0 || 0.36) + 0.18 + (b.boxy ? 0.08 : 0), rsf: 0.52, ab: 0.5, cf: 10.2, cr: 12.2 }, cd: b.boxy ? 0.85 : 0.62 });
  }
  /* engines and gearboxes: every car's */
  const seen = new Set();
  for (const d of base) {
    const kind = d.t.Tmax >= 900 ? 'Twin-turbo V12' : d.t.Tmax >= 600 ? 'Quad-turbo W16' : d.t.Tmax >= 480 ? 'Big-block V8' : d.t.Tmax >= 400 ? (d.p.red <= 5200 ? 'Turbo diesel' : 'V8') : d.t.Tmax >= 300 ? 'Turbo six' : d.t.Tmax >= 200 ? 'Turbo four' : 'Single-cylinder';
    P.engine.push({ id: 'e:' + d.id, name: kind + ' · ' + d.t.Tmax + ' Nm · ' + d.p.red + ' rpm', from: d.name, price: Math.max(400, Math.round(d.price * 0.4 / 50) * 50), Tmax: d.t.Tmax, idle: d.p.idle, red: d.p.red, snd: Object.assign({}, d.snd), tqSkew: d.p.tqSkew, kg: (d.t.Tmax - 300) * 0.25 });
    const gk = d.p.gears.join(',') + '|' + d.p.fd; if (seen.has(gk)) continue; seen.add(gk);
    P.gears.push({ id: 'g:' + d.id, name: d.p.gears.length + '-speed · final drive ' + d.p.fd, from: d.name, price: Math.max(200, Math.round(d.price * 0.06 / 50) * 50), gears: d.p.gears.slice(), fd: d.p.fd });
  }
  P.drive.push({ id: 'rwd', name: 'Rear-wheel drive', price: 0, rd: 0.95 }, { id: 'fwd', name: 'Front-wheel drive', price: 0, rd: 0.06 }, { id: 'awd', name: 'All-wheel drive', price: 1500, rd: 0.6, awd: true });
  P.susp.push({ id: 'street', name: 'Street', price: 0, susp: 0.1, dy0: 0, cg: 0, off: 0, crawl: 0 }, { id: 'low', name: 'Lowered sport', price: 900, susp: 0.06, dy0: -0.05, cg: -0.04, off: -0.1, crawl: 0, rsf: 0.04 },
    { id: 'rally', name: 'Rally long-travel', price: 1800, susp: 0.18, dy0: 0.08, cg: 0.05, off: 0.15, crawl: 0.4 }, { id: 'lift', name: 'Off-road lift', price: 2200, susp: 0.24, dy0: 0.2, cg: 0.13, off: 0.3, crawl: 0.75 },
    { id: 'slam', name: 'Slammed (air ride)', price: 1600, susp: 0.03, dy0: -0.09, cg: -0.06, off: -0.25, crawl: 0 });
  P.tyre.push({ id: 'street', name: 'Street', price: 0, mu: 1.15, off: 1 }, { id: 'sport', name: 'Sport', price: 600, mu: 1.25, off: 0.95 }, { id: 'semi', name: 'Semi-slick', price: 1400, mu: 1.36, off: 0.8, lat: 1.04 },
    { id: 'at', name: 'All-terrain', price: 700, mu: 1.1, off: 1.3 }, { id: 'mud', name: 'Mud', price: 900, mu: 1.0, off: 1.45 }, { id: 'drag', name: 'Drag radials', price: 1200, mu: 1.6, off: 0.9, lat: 0.5 });
  for (const [sz, wr] of [['16"', 0.31], ['17"', 0.33], ['18"', 0.35], ['20"', 0.37], ['33" off-road', 0.42]]) for (const [st, nm] of [['five', 'five-spoke'], ['multi', 'ten-spoke'], ['mesh', 'mesh'], ['disc', 'turbine disc'], ['steel', 'steel'], ['bead', 'beadlock']]) {
    if (wr >= 0.42 ? !['steel', 'bead', 'five'].includes(st) : st === 'bead') continue;
    P.wheel.push({ id: 'w:' + wr + st, name: sz + ' ' + nm, price: Math.round((200 + wr * 1800 + (st === 'disc' || st === 'mesh' ? 300 : 0)) / 50) * 50, wr, style: st, tw: wr >= 0.42 ? 0.36 : null });
  }
  P.brake.push({ id: 'std', name: 'Standard', price: 0, brk: 1 }, { id: 'sport', name: 'Sport callipers', price: 700, brk: 1.12 }, { id: 'race', name: 'Carbon race', price: 2400, brk: 1.28 });
  P.aero.push({ id: 'none', name: 'None', price: 0, cd: 0, cl: 0 }, { id: 'lip', name: 'Boot lip', price: 300, cd: 0.01, cl: 0.08, wing: { h: 0.06, z: 0.0, span: 0.86, chord: 0.18 } },
    { id: 'gt', name: 'GT wing', price: 1200, cd: 0.06, cl: 0.35, wing: { h: 0.34, z: 0.3, span: 0.84, chord: 0.38 } }, { id: 'big', name: 'Big wing with end plates', price: 2200, cd: 0.1, cl: 0.75, wing: { h: 0.5, z: 0.35, span: 0.9, chord: 0.42, plates: true } },
    { id: 'rally', name: 'Rally wing', price: 1500, cd: 0.08, cl: 0.4, wing: { h: 0.4, z: 0.26, span: 0.94, chord: 0.5, plates: true } });
  P.kit.push({ id: 'scoop', name: 'Bonnet scoop', price: 300, set: { scoop: { z: 0.95, len: 0.6, w: 0.26, h: 0.1 } } }, { id: 'flares', name: 'Wide arches', price: 500, set: { flares: true } }, { id: 'skirts', name: 'Side skirts', price: 250, set: { skirts: true } },
    { id: 'lip', name: 'Front lip', price: 200, set: { lip: true } }, { id: 'splitter', name: 'Splitter', price: 450, set: { splitter: true }, cl: 0.05 }, { id: 'diffuser', name: 'Diffuser', price: 450, set: { diffuser: true }, cl: 0.05 },
    { id: 'intakes', name: 'Side intakes', price: 350, set: { intakes: true } }, { id: 'bullbar', name: 'Bull bar', price: 400, set: { bullbar: true }, kg: 30 }, { id: 'lightbar', name: 'Roof light bar', price: 350, set: { lightbar: true } },
    { id: 'rack', name: 'Roof rack', price: 300, set: { rack: true }, cd: 0.04 }, { id: 'stripes', name: 'Racing stripes', price: 200, set: { stripes: [0.92, 0.92, 0.94] } }, { id: 'pipes', name: 'Quad exhaust', price: 400, set: { exhaust: 4 } });
  for (const k in P) { P[k].by = {}; for (const q of P[k]) P[k].by[q.id] = q; }
  return P;
}
const KIT_CATS = [['shell', 'Shell'], ['engine', 'Engine'], ['gears', 'Gearbox'], ['drive', 'Drive'], ['susp', 'Suspension'], ['tyre', 'Tyres'], ['wheel', 'Wheels'], ['brake', 'Brakes'], ['aero', 'Aero'], ['kit', 'Body kit'], ['paint', 'Paint']];
function kitDefault() { return { shell: 's:rook', engine: 'e:rook', gears: 'g:rook', drive: 'rwd', susp: 'street', tyre: 'street', wheel: 'w:0.33five', brake: 'std', aero: 'none', kit: [] }; }
/* repair a saved build: unknown parts fall back to the defaults */
function kitClean(parts) { const P = kitParts(), d = kitDefault(), o = {}; for (const k in d) { if (k === 'kit') { o.kit = Array.isArray(parts && parts.kit) ? parts.kit.filter((id) => P.kit.by[id]).slice(0, 12) : []; continue; } const v = parts && parts[k]; o[k] = typeof v === 'string' && P[k].by[v] ? v : d[k]; } return o; }
function kitPrice(parts) { const P = kitParts(); let n = 0; for (const k in parts) { if (k === 'kit') { for (const id of parts.kit) n += P.kit.by[id].price; continue; } n += P[k].by[parts[k]].price; } return n; }
/* the car a set of parts makes */
function kitDef(id, name, paint, parts) {
  const P = kitParts(), S = P.shell.by[parts.shell], E = P.engine.by[parts.engine], G = P.gears.by[parts.gears], D = P.drive.by[parts.drive], U = P.susp.by[parts.susp], T = P.tyre.by[parts.tyre], W = P.wheel.by[parts.wheel], B = P.brake.by[parts.brake], A = P.aero.by[parts.aero];
  const body = JSON.parse(JSON.stringify(S.body)), kits = parts.kit.map((k) => P.kit.by[k]);
  const dw = W.wr - (body.wr || 0.33); body.wr = W.wr; body.rimStyle = W.style; if (W.tw) body.tw = W.tw; body.rim = W.style === 'steel' ? [0.24, 0.24, 0.26] : W.style === 'bead' ? [0.08, 0.08, 0.09] : body.rim || [0.62, 0.62, 0.66];
  body.y0 = Math.max(0.16, (body.y0 != null ? body.y0 : 0.36) + U.dy0 + dw * 0.8); body.susp = U.susp; if (W.wr >= 0.42 || U.id === 'lift') body.flares = true;
  if (A.wing) body.wing = Object.assign({}, A.wing);
  for (const q of kits) Object.assign(body, JSON.parse(JSON.stringify(q.set)));
  if (body.exhaust == null) body.exhaust = E.Tmax > 450 ? 2 : 1;
  const m = Math.round(S.m + E.kg + kits.reduce((s, q) => s + (q.kg || 0), 0) + (D.awd ? 60 : 0) + (W.wr - 0.33) * 300), geo = S.geo;
  const p = { m, a: geo.a, b: geo.b, Iz: Math.round(geo.Iz * m / S.m), rw: W.wr, fd: G.fd, gears: G.gears.slice(), idle: E.idle, red: E.red, track: geo.track, cgh: Math.max(0.3, geo.cgh + U.cg + dw * 0.6), rd: D.rd, awd: !!D.awd, rsf: clamp(geo.rsf + (U.rsf || 0), 0.3, 0.7), ab: geo.ab, cf: geo.cf, cr: geo.cr, crawl: U.crawl, lat: T.lat || 1 };
  if (E.tqSkew) p.tqSkew = E.tqSkew;
  const t = { Tmax: E.Tmax, mu: T.mu, cd: Math.max(0.3, S.cd + A.cd + kits.reduce((s, q) => s + (q.cd || 0), 0)), brk: B.brk, off: Math.max(0.6, T.off + U.off), cl: A.cl + kits.reduce((s, q) => s + (q.cl || 0), 0) };
  const d = { id, name, cls: 'Custom build', price: kitPrice(parts), paint, dy: S.dy + U.dy0 + dw, snd: Object.assign({}, E.snd), dial: 280, blurb: S.name + ' with the ' + E.from + ' engine. Built by you.', p, t, body, kit: true, parts };
  const est = kitEstimate(d); d.est = est; d.dial = est.top * 3.6 > 300 ? 460 : est.top * 3.6 > 260 ? 360 : 280;
  d.stats = { spd: clamp(Math.round(est.top * 3.6 / 40), 1, 10), acc: clamp(Math.round(12 - est.t100 * 1.4), 1, 10), hdl: clamp(Math.round((est.gLo - 0.6) * 12), 1, 10), off: clamp(Math.round(t.off * 6 - 3 + U.crawl * 4), 1, 10) };
  const b = d.body; d.top = (b.y0 != null ? b.y0 : 0.36) + b.H + 0.1 + b.C; d.hl = b.L / 2;
  return d;
}
function kitEstimate(d) {
  const P = Object.assign({ awd: false, rsf: 0.5, ab: 0.5, cf: 10.2, cr: 12.2, lat: 1 }, d.p); P.L = P.a + P.b;
  const T = { Tmax: d.t.Tmax, mu: d.t.mu, cd: d.t.cd, cl: d.t.cl || 0, brk: d.t.brk, off: d.t.off, nitroMax: 100 }, r = Setup.run(P, T, false), c = Setup.corner(P, T, 22);
  return { top: r.top, t100: r.t100 || 30, gLo: c.g, kw: Math.round(d.t.Tmax * d.p.red * 0.62 / 9549) };
}
/* ---------- your builds: registered as cars ---------- */
function kitSave() { const s = save.kit || (save.kit = { n: 0, cars: {} }); s.cars = s.cars || {}; return s; }
KIT.reg = function (rec) {
  const d = kitDef(rec.id, rec.name, rec.paint, rec.parts), old = CAR_BY_ID[rec.id];
  if (old) { for (const k of Object.keys(old)) delete old[k]; Object.assign(old, d); return old; }
  CARS.push(d); CAR_BY_ID[d.id] = d; return d;
};
KIT.load = function (s) {
  const out = { n: Math.max(0, (s && s.n) | 0), cars: {} }; save.kit = out;
  if (s && s.cars && typeof s.cars === 'object') for (const id of Object.keys(s.cars).slice(0, KIT.max)) {
    const r = s.cars[id]; if (!/^k\d{1,4}$/.test(id) || !r) continue;
    const rec = { id, name: String(r.name || 'My build').replace(/[<>&"]/g, '').slice(0, 24) || 'My build', paint: clamp(r.paint | 0, 0, PAINTS.length - 1), parts: kitClean(r.parts) };
    out.cars[id] = rec; KIT.reg(rec); save.owned[id] = true;
  }
  for (const id of Object.keys(save.owned)) if (/^k\d+$/.test(id) && !out.cars[id]) delete save.owned[id];
};
KIT.scrap = function (id) {
  const s = kitSave(), rec = s.cars[id]; if (!rec) return 0; const back = Math.round(kitPrice(rec.parts) * 0.4 / 10) * 10;
  if (save.car === id) App.setCar('rook') || applyCar('rook', true);
  delete s.cars[id]; delete save.owned[id]; const i = CARS.indexOf(CAR_BY_ID[id]); if (i >= 0) CARS.splice(i, 1); delete CAR_BY_ID[id]; if (save.gar && save.gar.slots) delete save.gar.slots[id];
  save.money += back; writeSave(); return back;
};

/* ---------- the workshop ---------- */
const KB = { on: false, cat: 'shell', d: null, editing: null, model: null, rec: null, K: null };
function kitPreview() {
  const K = KB.K; if (!K || Int.K !== K) return; if (KB.model) { K.sc.remove(KB.model); disposeCar(KB.model); KB.model = null; }
  const dr = KB.d, def = kitDef('preview', dr.name, dr.paint, dr.parts), m = KB.model = buildCarModel(def, PAINTS[dr.paint], { studio: true, static: true });
  m.position.set(KB.tx, 0.32, KB.tz); m.rotation.y = KB.rot || 0.6; K.sc.add(m); KB.def = def;
}
function kitPanel() {
  const P = kitParts(), dr = KB.d, cat = KB.cat, def = KB.def || kitDef('preview', dr.name, dr.paint, dr.parts), e = def.est, ed = KB.editing ? kitSave().cars[KB.editing] : null;
  const cost = ed ? kitPrice(dr.parts) - kitPrice(ed.parts) : kitPrice(dr.parts), changes = ed ? Object.keys(dr.parts).filter((k) => JSON.stringify(dr.parts[k]) !== JSON.stringify(ed.parts[k])).reduce((n, k) => n + (k === 'kit' ? dr.parts.kit.filter((id) => !ed.parts.kit.includes(id)).reduce((s, id) => s + P.kit.by[id].price, 0) : P[k].by[dr.parts[k]].price), 0) : cost;
  const pay = Math.max(0, changes);
  let h = '<div class="vrec"><div><small>Top speed</small><b>' + Math.round(e.top * 3.6) + ' km/h</b></div><div><small>0–100</small><b>' + (e.t100 >= 30 ? '—' : e.t100.toFixed(1) + ' s') + '</b></div><div><small>Grip</small><b>' + e.gLo.toFixed(2) + ' g</b></div><div><small>Weight</small><b>' + def.p.m + ' kg</b></div><div><small>Power</small><b>' + e.kw + ' kW</b></div><div><small>Off-road</small><b>' + def.stats.off + '/10</b></div></div>';
  h += '<div class="vsl"><span>Name</span><div><input data-kitname type="text" maxlength="24" value="' + esc(dr.name) + '" style="flex:1;min-width:0;font:inherit;font-size:16px;padding:6px 10px;background:var(--panel-solid);color:#fff;border:1px solid var(--line)"></div></div>';
  h += '<div class="vsl"><span>Part</span><div>' + KIT_CATS.map((c) => '<button type="button" class="vstk' + (c[0] === cat ? ' on' : '') + '" data-ia="cat:' + c[0] + '">' + c[1] + '</button>').join('') + '</div></div>';
  if (cat === 'paint') h += '<div class="vsl"><span>Paint</span><div>' + PAINTS.map((hx, i) => '<button type="button" class="vstk' + (i === dr.paint ? ' on' : '') + '" data-ia="paint:' + i + '" style="width:40px;height:32px;background:' + _hexCss(hx) + '" aria-label="Paint ' + (i + 1) + '"></button>').join('') + '</div></div>';
  else if (cat === 'kit') h += '<div class="vsl"><span>Body kit · pick any</span><div>' + P.kit.map((q) => '<button type="button" class="vstk' + (dr.parts.kit.includes(q.id) ? ' on' : '') + '" data-ia="kit:' + q.id + '">' + esc(q.name) + ' · ' + money(q.price) + '</button>').join('') + '</div></div>';
  else h += '<div class="vsl"><span>' + KIT_CATS.find((c) => c[0] === cat)[1] + '</span><div style="flex-direction:column;align-items:stretch">' + P[cat].map((q) => '<button type="button" class="vstk' + (dr.parts[cat] === q.id ? ' on' : '') + '" data-ia="set:' + cat + ':' + q.id + '" style="text-align:left">' + esc(q.name) + (q.from ? ' <small style="opacity:.65">· from the ' + esc(q.from) + '</small>' : '') + ' · ' + (q.price ? money(q.price) : 'free') + '</button>').join('') + '</div></div>';
  const full = !ed && Object.keys(kitSave().cars).length >= KIT.max;
  Int.panel({ title: ed ? 'Rebuild: ' + ed.name : 'Design a car', sub: 'Custom Car Works · parts ' + money(kitPrice(dr.parts)) + ' · wallet ' + money(save.money), body: h + (full ? '<div class="vnote">Your garage holds eight builds: scrap one first.</div>' : ''),
    btns: [[(ed ? 'Rebuild · ' : 'Build it · ') + money(pay), () => kitBuild(pay), true, save.money < pay || full || (ed && !pay && dr.name === ed.name && dr.paint === ed.paint && JSON.stringify(dr.parts) === JSON.stringify(ed.parts))], ['Start again', () => { KB.d = { name: dr.name, paint: dr.paint, parts: kitDefault() }; kitPreview(); kitPanel(); }]],
    pick: (v) => {
      const q = v.split(':'), a = q[0], b = q[1], c = q.slice(2).join(':');
      if (a === 'cat') KB.cat = b;
      else if (a === 'paint') { dr.paint = +b; kitPreview(); }
      else if (a === 'kit') { const i = dr.parts.kit.indexOf(b); if (i >= 0) dr.parts.kit.splice(i, 1); else dr.parts.kit.push(b); kitPreview(); }
      else if (a === 'set') { if (!P[b] || !P[b].by[c]) return; dr.parts[b] = c; kitPreview(); }
      Snd.beep(700, 0.03); kitPanel();
    } });
  KB.on = true;
}
function kitBuild(pay) {
  const dr = KB.d, s = kitSave(); if (save.money < pay) return;
  let id = KB.editing; if (!id) { if (Object.keys(s.cars).length >= KIT.max) return; s.n++; id = 'k' + s.n; }
  save.money -= pay; const rec = s.cars[id] = { id, name: (dr.name || 'My build').replace(/[<>&"]/g, '').slice(0, 24) || 'My build', paint: dr.paint, parts: JSON.parse(JSON.stringify(dr.parts)) };
  KIT.reg(rec); save.owned[id] = true; save.cc[id] = dr.paint; writeSave(); Snd.win();
  intSave().delivery = { id, key: KB.rec.key, kit: true }; KB.editing = id; Int.panel(null);
  UI.banner(pay ? 'BUILT' : 'SAVED', rec.name + ' · it is parked at the door');
  Int.say('Your ' + rec.name + ' is finished. It is parked outside, ready to drive.', 4);
}
function kitBuilds(rec) {
  const s = kitSave(), L = Object.values(s.cars);
  Int.panel({ title: 'Your builds', sub: L.length + ' of ' + KIT.max + ' · Custom Car Works', body: L.length ? '<div class="vsl"><div style="flex-direction:column;align-items:stretch">' + L.map((r) => { const d = CAR_BY_ID[r.id]; return '<div style="display:flex;gap:6px;align-items:center"><b style="flex:1">' + esc(r.name) + ' <small style="opacity:.65">' + Math.round(d.est.top * 3.6) + ' km/h · ' + (d.est.t100 >= 30 ? '—' : d.est.t100.toFixed(1) + ' s') + '</small></b><button type="button" class="vstk" data-ia="edit:' + r.id + '">Change parts</button><button type="button" class="vstk" data-ia="scrap:' + r.id + '">Scrap (+' + money(Math.round(kitPrice(r.parts) * 0.4 / 10) * 10) + ')</button></div>'; }).join('') + '</div></div>' : '<p>Nothing built yet. Use the design station to put a car together.</p>',
    btns: [], pick: (v) => { const [a, id] = v.split(':'); if (a === 'edit') { const r = s.cars[id]; KB.editing = id; KB.d = { name: r.name, paint: r.paint, parts: JSON.parse(JSON.stringify(r.parts)) }; KB.cat = 'shell'; kitPreview(); kitPanel(); } else if (a === 'scrap') { const back = KIT.scrap(id); Snd.beep(300, 0.1); Int.say('Scrapped · +' + money(back), 3); kitBuilds(rec); } } });
}
INT_KINDS.kitlab = { name: 'Custom car workshop', rooms: { main(K, rec, r) {
  const { W, D } = intDims(rec, 24, 19); K.shell({ W, D, H: 6, floor: 0x7a7c80, wall: 0xc8ccd0, trim: 0xf2c81e, lamp: 0xf4f8ff, lightI: 1, winH: [3.2, 5.4] });
  K.sign(rec.name.toUpperCase(), 0, 5, K.z0 + 0.04, Math.min(W - 4, 11), 0.9, 0, { fg: '#f2c81e', bg: '#1a1c22' });
  /* yellow bay lines, the turntable, a ramp lift on one side */
  for (const x of [-4, 4]) K.box(x - 0.06, 0, K.z0 + 1, x + 0.06, 0.005, K.z1 - 3, 0xf2c81e);
  const tx = 0, tz = K.z0 + 6; KB.tx = tx; KB.tz = tz; K.cyl(tx, 0, tz, 3.2, 0.3, 0x2a2c30); K.cyl(tx, 0.3, tz, 3.0, 0.02, 0x3a3c40); K.col(tx - 2.6, tz - 2.6, tx + 2.6, tz + 2.6).h = 1.5;
  K.glow(tx - 3.1, 0.31, tz - 0.03, tx + 3.1, 0.315, tz + 0.03, 0xf2c81e, 1.4); K.light(tx, 4.5, tz, 0xffffff, 1.1, 12);
  /* the parts on show: engines on stands, stacks of wheels, wings on the wall, a tool wall */
  for (let k = 0; k < 3; k++) { const x = K.x0 + 2 + k * 2, z = K.z0 + 1.6; K.box(x - 0.5, 0, z - 0.4, x + 0.5, 0.6, z + 0.4, 0x3a3c40, true); K.box(x - 0.4, 0.6, z - 0.3, x + 0.4, 1.2, z + 0.3, [0x9a9ca2, 0xc8302a, 0x2a2c30][k]); K.box(x - 0.45, 1.2, z - 0.15, x + 0.45, 1.35, z + 0.15, 0x6a6c70); for (let q = 0; q < 4; q++) K.cyl(x - 0.3 + q * 0.2, 1.35, z, 0.05, 0.2, 0xb0b4b8); }
  K.sign('ENGINES', K.x0 + 4, 2.4, K.z0 + 0.04, 2, 0.4, 0, { fg: '#fff', bg: '#c8302a' });
  for (let k = 0; k < 4; k++) for (let q = 0; q < 4; q++) { const x = K.x1 - 1.2, z = K.z0 + 2 + k * 1.4; K.cyl(x, q * 0.26, z, 0.36 + (k % 2) * 0.06, 0.24, 0x1a1a1a, q === 0); K.cyl(x, q * 0.26 + 0.24, z, 0.22, 0.01, [0xd8d8d8, 0xf2c81e, 0x2a2c30, 0xc8a050][k]); }
  K.sign('WHEELS & TYRES', K.x1 - 0.04, 2.6, K.z0 + 4, 2.4, 0.4, -Math.PI / 2, { fg: '#fff', bg: '#2a6ad8' });
  for (let k = 0; k < 3; k++) { const z = K.z0 + 9 + k * 1.6; K.box(K.x0 + 0.05, 2.6 + k * 0.5, z - 0.7, K.x0 + 0.3, 2.68 + k * 0.5, z + 0.7, [0x1a1a1a, 0xc8302a, 0xf2f2f2][k]); K.box(K.x0 + 0.05, 2.3 + k * 0.5, z - 0.75, K.x0 + 0.2, 2.75 + k * 0.5, z - 0.68, 0x2a2a2a); K.box(K.x0 + 0.05, 2.3 + k * 0.5, z + 0.68, K.x0 + 0.2, 2.75 + k * 0.5, z + 0.75, 0x2a2a2a); }
  K.sign('AERO', K.x0 + 0.04, 4.3, K.z0 + 10.6, 1.4, 0.4, Math.PI / 2, { fg: '#fff', bg: '#1a1c22' });
  K.box(K.x0 + 0.05, 0.9, K.z1 - 6, K.x0 + 0.12, 2.6, K.z1 - 2.5, 0x5a5c60); for (let k = 0; k < 12; k++) K.box(K.x0 + 0.12, 1.1 + (k % 4) * 0.35, K.z1 - 5.8 + ((k / 4) | 0) * 1.1, K.x0 + 0.16, 1.35 + (k % 4) * 0.35, K.z1 - 5.6 + ((k / 4) | 0) * 1.1, 0xc8302a);
  K.box(K.x0 + 0.3, 0, K.z1 - 5.5, K.x0 + 1.0, 1.0, K.z1 - 3.5, 0xc8302a, true);
  /* the design station (a desk with screens), the builds desk */
  const sx = 4.6, sz = tz + 4.2; K.desk(sx, sz, Math.PI); K.glow(sx - 0.7, 1.15, sz + 0.39, sx + 0.7, 1.75, sz + 0.4, 0x3ad8ff, 1.1); K.chair(sx, sz - 0.7, 0, 0x2a2a30);
  K.sign('DESIGN STATION', sx, 2.2, sz + 0.5, 2.2, 0.35, Math.PI, { fg: '#3ad8ff', bg: '#101418' });
  K.counter(-6, sz - 0.4, -3, sz + 0.4, 0x2a2c30, 0xf2c81e); intStaff(K, -4.5, sz + 1.0, Math.PI, 0x2a2c30, { sport: 0xf2c81e });
  /* mechanics at work */
  K.person({ x: tx + 2.4, z: tz + 2.8, yaw: -2.4, kind: 'work', shirt: 0x2a4a8a, pants: 0x2a4a8a });
  K.person({ x: K.x0 + 3, z: K.z0 + 2.6, yaw: Math.PI, kind: 'work', shirt: 0x2a4a8a, pants: 0x2a4a8a });
  K.act(sx, sz - 1.2, 1.6, () => (KB.editing && kitSave().cars[KB.editing] ? 'Design station (keep working on the ' + kitSave().cars[KB.editing].name + ')' : 'Design a car'), () => { if (!KB.d) KB.d = { name: 'My build', paint: 0, parts: kitDefault() }; Int.yaw = Math.atan2(tx - Int.x, tz - Int.z) - 0.3; Int.pitch = -0.2; kitPreview(); kitPanel(); }, { wide: true });
  K.act(-4.5, sz - 1.0, 1.6, 'Your builds (change parts, scrap)', () => kitBuilds(rec), { wide: true });
  K.act(tx, tz + 3.4, 1.8, 'Look at the car on the turntable', () => Int.say(KB.def ? KB.def.name + ' · ' + Math.round(KB.def.est.top * 3.6) + ' km/h · 0–100 in ' + (KB.def.est.t100 >= 30 ? '—' : KB.def.est.t100.toFixed(1) + ' s') : 'The turntable is empty: start at the design station.', 3.5));
  K.extra = K.extra || []; KB.K = K; KB.rec = rec; KB.rot = 0.6; KB.model = null; KB.def = null;
  K.extra.push(() => { if (KB.model) { K.sc.remove(KB.model); disposeCar(KB.model); KB.model = null; } KB.K = null; });
  K.tick((dt) => { KB.rot += dt * 0.25; if (KB.model) KB.model.rotation.y = KB.rot; });
  if (!KB.d) KB.d = { name: 'My build', paint: 0, parts: kitDefault() }; kitPreview();
} }, leave(rec) {
  KB.on = false; const s = intSave(), dl = s.delivery; if (!dl || dl.key !== rec.key) return;
  const d = rec.door, x = d.ox + 4.5, z = d.oz + d.nz * 4; loadAround(x, z, 6);
  if (save.car === dl.id) applyCar(dl.id, true);
  if (App.setCar(dl.id)) { s.delivery = null; spawnAt(x, z, d.nz > 0 ? Math.PI / 2 : -Math.PI / 2); car.health = 100; KB.editing = null; KB.d = null; }
} };
/* the name box in the panel */
KIT.initUI = function () { E.intPan.addEventListener('input', (e) => { const t = e.target; if (t && t.dataset && t.dataset.kitname != null && KB.d) KB.d.name = t.value.slice(0, 24); }); };
