/* ================= INTERIORS: the special buildings =================
   Banks (a marble hall, tellers behind glass, a guard, a manager's office and the vault door; you can keep money in an account, which a fine
   cannot touch), apartment blocks (a lobby, a lift, corridors of flats: buy one and it is yours to sleep in, with a fridge, a TV and a wardrobe),
   gyms (work out in time with the beat to get fitter: you run and swim faster), indoor pools (swim laps), restaurants (each town's own menu),
   clothing shops (try on and buy outfits), car dealerships (the only place to buy a car: a showroom of real cars) and the county jail
   (do time instead of paying a fine; sleep, work and work out until you are let out). */
const intGold = 0xc8a050;
/* ---------- bank ---------- */
function intBankHall(K, rec, r, big) {
  const { W, D } = intDims(rec, big ? 26 : 20, big ? 21 : 17); K.shell({ W, D, H: big ? 6 : 5, floor: 0xe8e4dc, tiles: 0xc8c0b0, wall: 0xf0ece2, trim: 0x8a7a5a, lamp: 0xfff4dc, lightI: 0.9, hemi: 0.8 });
  for (const sx of [-1, 1]) for (let z = K.z0 + 6; z < K.z1 - 2; z += 4) K.cyl(sx * (W / 2 - 2.2), 0, z, 0.38, K.H, 0xf2eee4, true);
  K.rug(-1.2, K.z0 + 6, 1.2, K.z1 - 0.5, 0x7a1a1a, 0x9a2a2a);
  /* the teller line: a counter, glass above it, three windows */
  const cz = K.z0 + 4.5; K.counter(K.x0 + 1.5, cz, K.x1 - 1.5, cz + 0.8, 0x6a4a2a, 0x2a2a2a, 1.15); K.glass(K.x0 + 1.5, 1.15, cz + 0.35, K.x1 - 1.5, 2.6, cz + 0.4);
  for (let k = -1; k <= 1; k++) { const x = k * 3.2; K.box(x - 0.04, 1.15, cz + 0.3, x + 0.04, 2.6, cz + 0.45, intGold); K.sign(String(k + 2), x + 1.6, 2.4, cz + 0.42, 0.5, 0.4, 0, { fg: '#c8a050', bg: '#1a1a1a' }); intStaff(K, x + 1.6, cz - 0.6, 0, 0x2a3a5a, { suit: true, role: 'teller' }); }
  K.sign(rec.name.toUpperCase(), 0, K.H - 1, K.z0 + 0.03, Math.min(W - 4, 12), 1.0, 0, { fg: '#c8a050', bg: null });
  /* queue ropes, chairs */
  for (let z = cz + 2.2; z < cz + 6; z += 1.2) { K.cyl(-1.6, 0, z, 0.05, 1, intGold); K.cyl(1.6, 0, z, 0.05, 1, intGold); }
  for (let k = 0; k < 4; k++) K.chair(K.x0 + 1.2, K.z1 - 3 - k * 0.8, Math.PI / 2, 0x2a3a5a); K.plant(K.x1 - 1, K.z1 - 1, 1.3); K.plant(K.x0 + 1, K.z1 - 1, 1.3);
  /* the vault door at the back behind the tellers */
  K.cyl(0, 0.3, K.z0 + 0.1, 1.5, 0.3, 0x8a8c90, false); K.box(-1.6, 0, K.z0, 1.6, 3.4, K.z0 + 0.12, 0x5a5c60);
  K.rb(0, K.z0 + 0.25, 0, [-1.3, 0.2, 0, 1.3, 2.8, 0.25], 0x9a9ca2); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; K.box(Math.cos(a) * 0.5 - 0.04, 1.5 + Math.sin(a) * 0.5 - 0.04, K.z0 + 0.5, Math.cos(a) * 0.5 + 0.04, 1.5 + Math.sin(a) * 0.5 + 0.04, K.z0 + 0.7, 0x4a4c50); }
  K.cyl(0, 1.5, K.z0 + 0.5, 0.18, 0.05, 0xd8d8d8);
  /* customers, a guard by the door */
  intShoppers(K, r, 3, [[0, cz + 2.4], [-1, cz + 3.4], [K.x1 - 3, K.z1 - 3], [K.x0 + 3, K.z1 - 4]]);
  K.person({ x: K.x1 - 2.4, z: K.z1 - 2.2, yaw: Math.PI, shirt: 0x1a2a4a, pants: 0x1a1c24, hat: { k: 'cap', c: lc(0x1a2a4a), bc: null }, face: true, role: 'guard' });
  return cz;
}
function intBankDesk(rec) {
  const s = intSave(), bal = s.acct || 0;
  Int.panel({ title: rec.name, sub: 'Your account', body: '<p>Money in the bank is safe: fines and the police only ever take what is in your wallet.</p><div class="vrec"><div><small>Wallet</small><b>' + money(save.money) + '</b></div><div><small>In the bank</small><b>' + money(bal) + '</b></div></div>',
    btns: [['Deposit ' + money(Math.min(save.money, 1000)), () => intBankMove(Math.min(save.money, 1000), rec), false, save.money <= 0], ['Deposit all', () => intBankMove(save.money, rec), true, save.money <= 0], ['Withdraw ' + money(Math.min(bal, 1000)), () => intBankMove(-Math.min(bal, 1000), rec), false, bal <= 0], ['Withdraw all', () => intBankMove(-bal, rec), false, bal <= 0]] });
}
function intBankMove(n, rec) { const s = intSave(); n = Math.round(n); if (!n) return; save.money -= n; s.acct = (s.acct || 0) + n; writeSave(); Snd.beep(n > 0 ? 760 : 560, 0.06); intBankDesk(rec); }
const intBankRooms = (big) => ({ main(K, rec, r) {
  const cz = intBankHall(K, rec, r, big);
  for (let k = -1; k <= 1; k++) K.act(k * 3.2 + 1.6, cz + 1.5, 1.4, 'Banking at window ' + (k + 2), () => intBankDesk(rec));
} });
INT_KINDS.bank = { name: 'Bank', rooms: intBankRooms(false) };
INT_KINDS.reserve = { name: 'Bank', rooms: intBankRooms(true) };

/* ---------- apartments ---------- */
const INT_APT_BASE = [26000, 22000, 18000, 42000, 36000, 24000, 65000];
function intAptPrice(rec, floor, u) { return Math.round((INT_APT_BASE[rec.ti % 7] * (1 + floor * 0.06) * (u % 3 === 2 ? 1.25 : 1)) / 500) * 500; }
function intAptId(rec, floor, u) { return rec.key + '#' + floor + '-' + u; }
INT_KINDS.apts = { name: 'Apartments', rooms: {
  main(K, rec, r) {
    const { W, D } = intDims(rec, 16, 13); K.shell({ W, D, H: 4, floor: 0x5a4a3a, wall: 0xe8e0d0, trim: 0x2a2a2a, lamp: 0xffe8c8, lightI: 0.8 });
    K.counter(-2, K.z0 + 2.5, 2, K.z0 + 3.2, 0x3a2a20, 0xe8e4dc); intStaff(K, 0, K.z0 + 1.8, 0, 0x2a2a2a, { suit: true, role: 'concierge' });
    for (let k = 0; k < 14; k++) K.box(K.x0 + 0.02, 0.8 + (k % 7) * 0.22, K.z0 + 2 + ((k / 7) | 0) * 0.5, K.x0 + 0.15, 0.98 + (k % 7) * 0.22, K.z0 + 2.45 + ((k / 7) | 0) * 0.5, 0xb8a060);
    K.sofa(K.x0 + 1.5, 1.5, Math.PI / 2, 2.4, 0x6a4a3a); K.plant(K.x1 - 1, K.z1 - 1, 1.2); K.plant(K.x0 + 1, K.z1 - 1, 1.2); K.plant(K.x0 + 1, K.z0 + 1, 1.1); K.table(K.x0 + 2.6, 1.5, 0.7, 1.4, 0x2a2a2a, 0.42); K.lamp(K.x0 + 0.6, -0.4);
    for (let k = 0; k < 3; k++) K.pic(K.x0 + 0.02, 1.9, K.z1 - 3 - k * 2.2, Math.PI / 2, 1.2, 0.9, [0x8a5a3a, 0x3a6a8a, 0x6a8a4a][k]); K.pic(K.x1 - 0.02, 1.9, K.z1 - 3, -Math.PI / 2, 1.6, 1.0, 0xa86a4a); K.person({ x: K.x0 + 1.6, z: 1.0, yaw: Math.PI / 2, kind: 'sit', phone: true }); K.rug(-2, 0, 2, K.z1 - 1, 0x2a3a5a, 0x3a4a6a); K.sign(rec.name.toUpperCase(), 0, 3.3, K.z0 + 0.03, Math.min(W - 2, 8), 0.7, 0, { fg: '#c8a050' });
    for (let k = 0; k < 2; k++) { const z = -1 + k * 2.6; K.box(K.x1 - 0.12, 0, z - 0.8, K.x1, 2.5, z + 0.8, 0xa8acb2); K.box(K.x1 - 0.14, 0, z - 0.02, K.x1 - 0.12, 2.5, z + 0.02, 0x5a5e64); }
    K.spawn('lift', K.x1 - 1.4, 0.3, -Math.PI / 2);
    const floors = Math.max(3, Math.min(12, Math.round(rec.h / 3.4)));
    K.act(K.x1 - 0.9, 0.3, 2.2, 'Take the lift', () => Int.panel({ title: 'Lift', sub: rec.name, body: '<div class="vsl"><span>Which floor?</span><div>' + Array.from({ length: floors - 1 }, (_, i) => { const f = i + 2, mine = Object.keys(intSave().apts).some((id) => id.indexOf(rec.key + '#' + f + '-') === 0); return '<button type="button" class="vstk' + (mine ? ' on' : '') + '" data-ia="' + f + '">' + f + (mine ? ' ★' : '') + '</button>'; }).join('') + '</div></div>', pick: (f) => { rec.floor = +f; Int.panel(null); Snd.beep(880, 0.05); Int.go('hall', 'lift'); }, btns: [] }), { wide: true });
    K.act(0, K.z0 + 3.9, 1.6, () => (Object.keys(intSave().apts).some((id) => id.indexOf(rec.key) === 0) ? 'Ask the concierge about your flat' : 'Ask about flats for sale'), () => {
      const mine = Object.keys(intSave().apts).filter((id) => id.indexOf(rec.key) === 0); Int.say(mine.length ? '“Welcome home. Flat ' + mine.map((id) => { const q = id.split('#')[1].split('-'); return q[0] + 'ABCDEF'[+q[1]]; }).join(', ') + ' is ready for you.”' : '“We have flats on every floor. Take the lift up and have a look: the prices are on the doors.”', 4);
    });
  },
  hall(K, rec, r) {
    const f = rec.floor || 2, L = 22; K.shell({ W: 4, D: L, H: 3, floor: 0x6a3a2a, wall: 0xe8dcc8, trim: 0x3a2a20, door: false, win: false, lamp: 0xffe8c8, lightI: 0.8 });
    K.rug(-0.9, K.z0 + 0.5, 0.9, K.z1 - 0.5, 0x7a2a24, 0x8a3a2a); K.sign('FLOOR ' + f, 0, 2.3, K.z1 - 0.02, 1.4, 0.45, Math.PI, { fg: '#c8a050', bg: '#2a1a12' });
    K.box(-1.0, 0, K.z1 - 0.12, 1.0, 2.5, K.z1, 0xa8acb2); K.spawn('lift', 0, K.z1 - 1.2, Math.PI);
    K.act(0, K.z1 - 0.8, 1.6, 'Take the lift down', () => { Snd.beep(660, 0.05); Int.go('main', 'lift'); }, { wide: true });
    for (let u = 0; u < 6; u++) {
      const sx = u % 2 ? 1 : -1, z = K.z1 - 4 - ((u / 2) | 0) * 6, x = sx * 2, id = intAptId(rec, f, u), lab = f + 'ABCDEF'[u];
      K.box(x - sx * 0.02, 0, z - 0.6, x, 2.3, z + 0.6, [0x5a3424, 0x2a3a4a][u & 1]); K.box(x - sx * 0.06, 1.0, z + 0.4, x - sx * 0.02, 1.08, z + 0.5, intGold); K.sign(lab, x - sx * 0.03, 2.5, z, 0.5, 0.3, -sx * Math.PI / 2, { fg: '#c8a050', bg: '#1a1a1a' });
      K.spawn('u' + u, x - sx * 1.0, z, sx > 0 ? Math.PI / 2 : -Math.PI / 2);
      K.act(x - sx * 0.5, z, 1.3, () => (intSave().apts[id] ? 'Go into flat ' + lab + ' (yours)' : 'Flat ' + lab + ' · for sale'), () => {
        if (intSave().apts[id]) { rec.unit = u; Snd.door(); Int.go('flat', 'door'); return; }
        const p = intAptPrice(rec, f, u), big = u % 3 === 2;
        Int.panel({ title: 'Flat ' + lab + ' · ' + rec.name, sub: (big ? 'Two-bedroom' : 'One-bedroom') + ' · floor ' + f + ' · ' + rec.town, body: '<p>Yours to keep: sleep here to skip the night (it saves your game), raid the fridge, watch the news and change your clothes.' + (big ? ' Corner flat, extra bedroom, a bigger view.' : '') + '</p><div class="vrec"><div><small>Price</small><b>' + money(p) + '</b></div><div><small>Your wallet</small><b>' + money(save.money) + '</b></div><div><small>Flats owned</small><b>' + Object.keys(intSave().apts).length + '</b></div></div>',
          btns: [['Buy for ' + money(p), () => { if (save.money < p) return; save.money -= p; intSave().apts[id] = { t: Date.now(), p }; intSave().rooms = Object.keys(intSave().apts).length; writeSave(); Snd.win(); Int.panel(null); UI.banner('NEW HOME', 'Flat ' + lab + ' · ' + rec.name); rec.unit = u; Int.go('flat', 'door'); }, true, save.money < p]] });
      }, { wide: true });
    }
    K.person({ x: 0, z: K.z0 + 3, kind: 'walk', path: [[0, K.z0 + 3, 3], [0, K.z1 - 3, 2]] });
  },
  flat(K, rec, r) {
    const u = rec.unit || 0, big = u % 3 === 2, W = big ? 14 : 11, D = big ? 11 : 9, wall = [0xf2ece0, 0xe0e8ec, 0xece4f0][u % 3];
    K.shell({ W, D, H: 2.9, floor: 0xa8845a, wall, trim: 0xf2f2f2, lamp: 0xffe8c8, lightI: 0.85, exit: 'Back to the corridor', door: K.dx, noBackWin: false, winH: [0.5, 2.6] });
    const ex = K.acts.find((a) => a.label === 'Back to the corridor'); if (ex) ex.fn = () => { Snd.door(); Int.go('hall', 'u' + u); };
    K.ticks.length = 0;   /* (the corridor door is not the street) */
    const mx = K.x0 + W * 0.55; K.wallZ(mx, K.z0, K.z1, [[K.z1 - 3, K.z1 - 2]], wall);
    K.rug(K.x0 + 1, -1.5, mx - 1, 1.5, 0x3a4a6a, 0x4a5a7a); K.sofa((K.x0 + mx) / 2, 1.2, Math.PI, 2.4, 0x3a3a40); K.table((K.x0 + mx) / 2, 0, 1.2, 0.6, 0x2a2a2a, 0.42);
    K.box((K.x0 + mx) / 2 - 1, 0, K.z0 + 0.1, (K.x0 + mx) / 2 + 1, 0.5, K.z0 + 0.5, 0x2a2a2a, true); K.tv((K.x0 + mx) / 2, 1.1, K.z0 + 0.35, 0, 1.6, 0x2a6ab8); K.lamp(K.x0 + 0.6, 1.5); K.plant(mx - 0.6, K.z1 - 0.7, 1);
    K.counter(K.x0 + 0.1, K.z1 - 0.7, K.x0 + 2.6, K.z1 - 0.1, 0xf2f2f2, 0x3a3a3a, 0.92); K.fridge(K.x0 + 3.2, K.z1 - 0.45, Math.PI);
    K.bed((mx + K.x1) / 2, K.z0 + 1.3, 0, [0x2a4a7a, 0x7a2a3a, 0x3a6a4a][u % 3], true); K.box(K.x1 - 0.7, 0, 0.5, K.x1 - 0.1, 2.1, 2.3, 0x6a4a34, true);
    if (big) { K.wallX(K.z0 + 3.4, mx, K.x1, [[mx + 0.3, mx + 1.2]], wall); K.bed(K.x1 - 1.2, K.z1 - 1.6, Math.PI / 2, 0x6a6a8a, false); }
    K.act((K.x0 + mx) / 2, 0.6, 1.6, 'Watch the news', () => Int.say(intNews(), 6));
    K.act(K.x0 + 3.2, K.z1 - 1.3, 1.4, 'Raid the fridge', () => { intBuzz(3); Snd.beep(600, 0.05); Int.say('Leftover pizza. You feel ready to go.'); });
    K.act(K.x1 - 1.2, 1.4, 1.5, 'Open the wardrobe (change clothes)', () => intWardrobe(rec, true));
    K.act((mx + K.x1) / 2, K.z0 + 2.6, 1.8, () => (App.tod > 20 || App.tod < 6 ? 'Sleep until morning (saves the game)' : 'Sleep until evening (saves the game)'), () => {
      const night = App.tod > 20 || App.tod < 6; Int.busy = { freeze: true, lock: 'Sleeping…', t: 0, hint: () => '<b>Zzz…</b>', tick(dt) { this.t += dt; if (this.t > 1.6) { Int.busy = null; App.tod = night ? 7.5 : 19.5; car.health = 100; intSave().nights = (intSave().nights || 0) + 1; writeSave(); UI.banner(night ? 'GOOD MORNING' : 'GOOD EVENING', 'Rested · car serviced · game saved'); } } };
    });
    K.spawn('door', K.dx, K.z1 - 1.2, Math.PI);
  } } };
function intNews() {
  const L = ['Police are looking for a speeding driver seen on the coast road.', 'Island Reserve Bank posts record profits; security tightened at the vault.', 'Fairhaven traffic snarled by a parade of freight trains carrying gold.', 'Surf is up at the beaches this week: lifeguards urge caution.', 'The county jail says it has room for “anyone who wants to try us”.', 'A dealership reports a rush on hypercars after a celebrity sighting.', 'Weather: mist over Lakeshore in the morning, clear by noon.'];
  return '📺 ' + L[(Math.floor(App.time / 7) + L.length) % L.length];
}
/* ---------- clothes: buy (in a shop) or change into what you own (the wardrobe) ---------- */
function intWardrobe(rec, own) {
  const cats = ['hat', 'glasses', 'top', 'bottom', 'shoes'], s = cosSave(), out = s.out, reg = rec ? REG[rec.ti % REG.length].key : null;
  const items = COS.items.filter((i) => cats.includes(i.cat) && (own ? s.own[i.id] : (!i.reg || i.reg === reg)));
  const row = (i) => { const has = !!s.own[i.id], on = out[i.cat] === i.id, sw = i.sw != null ? '<i style="display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:6px;background:' + _hexCss(i.sw) + '"></i>' : '';
    return '<button type="button" class="vstk' + (on ? ' on' : '') + '" data-ia="' + i.id + '"' + (!has && save.money < i.price ? ' disabled' : '') + '>' + sw + esc(i.name) + ' · ' + (on ? 'Wearing' : has ? 'Wear' : money(i.price)) + '</button>'; };
  const body = cats.map((c) => { const L = items.filter((i) => i.cat === c); return L.length ? '<div class="vsl"><span>' + esc((COS.cats.find((q) => q[0] === c) || [c, c])[1]) + '</span><div>' + L.map(row).join('') + (out[c] ? '<button type="button" class="vstk" data-ia="off:' + c + '">Take off</button>' : '') + '</div></div>' : ''; }).join('') || '<p>Nothing here yet. The clothing shops in town sell outfits.</p>';
  Int.panel({ title: own ? 'Your wardrobe' : rec.name, sub: own ? 'Change into anything you own' : 'Try it on: press C to see yourself · ' + money(save.money), body, btns: [], pick: (id) => {
    if (id.indexOf('off:') === 0) { out[id.slice(4)] = null; }
    else { const i = COS.by[id]; if (!i) return; if (!s.own[id]) { if (save.money < i.price) return; save.money -= i.price; s.own[id] = 1; Snd.win(); } out[i.cat] = out[i.cat] === id ? null : id; }
    writeSave(); if (Foot.ped) Foot.ped.app = footApp(); if (Int.ped && Int.ped.hu) Int.mkPed(); Snd.beep(700, 0.04); intWardrobe(rec, own);
  } });
}
INT_KINDS.clothes = { name: 'Clothing', rooms: { main(K, rec, r) {
  const { W, D } = intDims(rec, 16, 13), R = REG[rec.ti % 7]; K.shell({ W, D, floor: 0xd8d0c4, wall: 0xf4f0ea, trim: 0x1a1a1a, lamp: 0xfff8f0, lightI: 1 });
  const pal = [0xd82a4a, 0x1a1a1a, 0xf2f2f2, 0x2a4a8a, 0xc8a050, 0x3a6a4a, 0xd8a8b8, 0x8a5a3a, R.col];
  const pts = []; for (let z = K.z0 + 3; z < K.z1 - 3; z += 2.6) for (const x of [K.x0 + 2.5, 0, K.x1 - 2.5]) if (Math.abs(x) > 0.1 || z > K.z0 + 6) { K.rack(x - 1.2, z, x + 1.2, r, pal); pts.push([x, z + 1.2]); }
  K.shelf(K.x0 + 0.05, K.z0 + 1, K.x0 + 0.5, K.z1 - 2, 2.2, 5, r, pal, 0xf2f2f2);
  for (let k = 0; k < 3; k++) { const x = -2 + k * 2; K.box(x - 0.35, 0, K.z0 + 1.2, x + 0.35, 0.15, K.z0 + 1.9, 0xf2f2f2, true); K.person({ x, z: K.z0 + 1.55, y: 0.15, yaw: 0, app: { skin: lc(0xe8e4dc), hair: lc(0xe8e4dc), hat: null }, shirt: pal[(k * 3) % pal.length], pants: pal[(k * 3 + 1) % pal.length] }); }
  K.glow(K.x1 - 0.02, 0.3, -1, K.x1 - 0.01, 2.2, 1, 0xc8d4dc, 0.9); K.sign('FITTING ROOMS', K.x1 - 0.03, 2.5, 2.4, 2.2, 0.4, -Math.PI / 2, { fg: '#1a1a1a', bg: '#f4f0ea' });
  for (let k = 0; k < 2; k++) K.box(K.x1 - 1.6, 0, 2 + k * 1.4, K.x1 - 0.02, 2.2, 2.05 + k * 1.4, 0x1a1a1a, true);
  K.counter(K.x1 - 4.5, K.z1 - 3, K.x1 - 1.2, K.z1 - 2.3, 0x1a1a1a, 0xf2f2f2); intStaff(K, K.x1 - 2.8, K.z1 - 3.6, 0, 0x1a1a1a, { suit: true });
  K.act(K.x1 - 2.8, K.z1 - 1.6, 1.8, 'Browse the collection', () => intWardrobe(rec, false), { wide: true });
  K.act(K.x1 - 0.8, 0, 1.6, 'Look in the mirror', () => { Int.view(true); Int.yaw = Math.PI / 2; Int.say('Looking good.'); });
  intShoppers(K, r, 3, pts);
} } };

/* ---------- gym ---------- */
function intWorkout(name, gain, cost) {
  const s = intSave(); if (!s.gymMem && cost) { if (save.money < cost) { Int.say('A gym pass is ' + money(cost)); return; } save.money -= cost; s.gymMem = 1; writeSave(); Int.say('Gym pass bought · ' + money(cost) + ' · train any time, in any gym', 3); }
  const B = Int.busy = { freeze: true, t: 0, u: 0, dir: 1, reps: 0, miss: 0, n: 10, zone: [0.62, 0.86], spd: 0.75 + Math.min(0.9, (s.fit || 0) / 90), done: 0,
    hint: () => (TouchIn.on ? '<em>USE</em>' : '<em>E</em> / <em>Space</em>') + ' when the bar is in the green · ' + B.reps + ' / ' + B.n + ' reps · <em>Esc</em> stop',
    hud: () => '<div class="ibar"><small>' + esc(name) + ' · fitness ' + Math.round(intSave().fit || 0) + '</small><div class="ibt"><i class="iz" style="left:' + (B.zone[0] * 100) + '%;width:' + ((B.zone[1] - B.zone[0]) * 100) + '%"></i><i class="ik" style="left:' + (B.u * 100) + '%"></i></div></div>',
    tick(dt) { if (B.done) { B.done -= dt; if (B.done <= 0) Int.busy = null; return; } B.u += B.dir * B.spd * dt; if (B.u > 1) { B.u = 1; B.dir = -1; } else if (B.u < 0) { B.u = 0; B.dir = 1; } },
    press() { if (B.done) return; if (B.u >= B.zone[0] && B.u <= B.zone[1]) { B.reps++; Snd.beep(880, 0.04); } else { B.miss++; Snd.beep(220, 0.05); } B.zone = [0.15 + Math.random() * 0.55, 0]; B.zone[1] = B.zone[0] + 0.24 - Math.min(0.1, (intSave().fit || 0) / 600); if (B.reps + B.miss >= B.n) B.finish(); },
    finish() { const f = intSave(), g = B.reps * gain * (1 - (f.fit || 0) / 140); f.fit = Math.min(100, (f.fit || 0) + g); f.gym = (f.gym || 0) + 1; writeSave(); B.done = 2.2; Int.say(B.reps + ' good reps · fitness ' + Math.round(f.fit) + ' (+' + g.toFixed(1) + ') · you run and swim faster the fitter you are', 3.5); Snd.win(); },
    cancel() { Int.busy = null; } };
}
INT_KINDS.gym = { name: 'Gym', rooms: { main(K, rec, r) {
  const { W, D } = intDims(rec, 20, 16); K.shell({ W, D, H: 4.5, floor: 0x2a2c30, wall: 0xd8d8dc, trim: 0xff6a1a, lamp: 0xf4f8ff, lightI: 1 });
  K.rug(K.x0 + 0.5, K.z0 + 0.5, K.x1 - 0.5, K.z0 + 6, 0x1a1a1a); K.glow(K.x0 + 0.5, 0.4, K.z0 + 0.02, K.x1 - 0.5, 2.4, K.z0 + 0.03, 0xb8c4cc, 0.8);
  /* free weights: a dumbbell rack, benches, a squat rack */
  K.box(K.x0 + 1, 0, K.z0 + 0.6, K.x0 + 4, 0.8, K.z0 + 1.1, 0x3a3a3a, true); for (let k = 0; k < 10; k++) K.cyl(K.x0 + 1.15 + k * 0.28, 0.8, K.z0 + 0.85, 0.08, 0.12, 0x1a1a1a);
  const st = [[K.x0 + 2, K.z0 + 3, 'press'], [K.x0 + 5, K.z0 + 3, 'curl'], [K.x0 + 8, K.z0 + 3.2, 'squat']];
  for (const [x, z, m] of st) { if (m === 'squat') { K.box(x - 1, 0, z - 0.6, x - 0.9, 2.4, z - 0.5, 0x1a1a1a, true); K.box(x + 0.9, 0, z - 0.6, x + 1, 2.4, z - 0.5, 0x1a1a1a, true); K.box(x - 1.2, 1.55, z - 0.6, x + 1.2, 1.6, z - 0.5, 0xb0b0b0); } else if (m === 'press') { K.box(x - 0.2, 0, z - 0.8, x + 0.2, 0.45, z + 0.8, 0x1a1a1a, true); } K.person({ x, z: m === 'squat' ? z : z + 0.4, yaw: 0, kind: 'lift', move: m, sport: [0xff6a1a, 0x2a8ad8, 0x3ab04a][st.findIndex((q) => q[2] === m)] }); }
  /* treadmills along the window wall, runners on them */
  for (let k = 0; k < 4; k++) { const x = K.x1 - 1.4, z = K.z0 + 2 + k * 2.2; K.box(x - 0.4, 0, z - 0.9, x + 0.4, 0.2, z + 0.9, 0x2a2a2a); K.col(x - 0.4, z - 1.0, x + 0.4, z + 0.9).h = 1.3; K.box(x - 0.4, 0, z - 1.0, x + 0.4, 1.3, z - 0.9, 0x3a3a3a); K.glow(x - 0.25, 1.2, z - 0.89, x + 0.25, 1.35, z - 0.88, 0x3ad8ff, 1.2); if (k < 2) { const n = K.person({ x, z, y: 0.2, yaw: Math.PI, sport: [0xd82a4a, 0x8a3ad8][k] }); if (n) n.kind = 'treadmill'; } }
  /* a punch bag */
  K.cyl(K.x0 + 2, 0.4, K.z1 - 3, 0.3, 1.2, 0x8a1a1a, true); K.cyl(K.x0 + 2, 1.6, K.z1 - 3, 0.02, 1.6, 0x9a9a9a);
  for (let k = 0; k < 5; k++) { const x = 1.6 + k * 1.3, z = 1.5; K.box(x - 0.15, 0, z - 0.5, x + 0.15, 0.7, z + 0.5, 0x2a2a2a, true); K.box(x - 0.2, 0.7, z + 0.2, x + 0.2, 0.78, z + 0.5, 0x1a1a1a); K.box(x - 0.05, 0.7, z - 0.55, x + 0.05, 1.15, z - 0.45, 0x5a5a5a); K.cyl(x, 0.15, z - 0.2, 0.25, 0.05, 0xff6a1a, false, 0.05); if (k % 2 === 0) K.person({ x, z: z + 0.25, y: 0.1, yaw: Math.PI, kind: 'treadmill', sport: [0x2a8ad8, 0xd8c81e, 0x3ab04a][k / 2] }); }
  for (let k = 0; k < 8; k++) K.cyl(K.x0 + 1.2 + k * 0.5, 0, K.z1 - 1.0, 0.12, 0.3, 0x1a1a1a);
  K.rug(K.x0 + 4, K.z1 - 4.5, K.x0 + 9, K.z1 - 2, 0x2a6a8a); K.person({ x: K.x0 + 6.5, z: K.z1 - 3.2, yaw: 0, kind: 'lift', move: 'squat', sport: 0xd82a8a, fem: true });
  K.counter(K.x1 - 6, K.z1 - 3, K.x1 - 3, K.z1 - 2.3, 0xff6a1a, 0x1a1a1a); intStaff(K, K.x1 - 4.5, K.z1 - 3.6, 0, 0xff6a1a, { sport: 0xff6a1a });
  K.sign(rec.name.toUpperCase(), 0, 3.6, K.z0 + 0.04, Math.min(W - 3, 9), 0.8, 0, { fg: '#ff6a1a' });
  const pass = 50;
  K.act(K.x0 + 3.4, K.z0 + 3.6, 1.5, 'Bench press', () => intWorkout('Bench press', 0.55, pass), { cost: intSave().gymMem ? 0 : pass });
  K.act(K.x0 + 6.5, K.z0 + 3.6, 1.5, 'Dumbbell curls', () => intWorkout('Curls', 0.45, pass), { cost: intSave().gymMem ? 0 : pass });
  K.act(K.x1 - 1.4, K.z0 + 2 + 2 * 2.2 + 1.3, 1.5, 'Run on the treadmill', () => intWorkout('Treadmill', 0.5, pass), { cost: intSave().gymMem ? 0 : pass });
  K.act(K.x0 + 2, K.z1 - 2.2, 1.5, 'Hit the punch bag', () => intWorkout('Punch bag', 0.5, pass), { cost: intSave().gymMem ? 0 : pass });
  K.act(K.x1 - 4.5, K.z1 - 1.6, 1.6, () => (intSave().gymMem ? 'Your gym pass · fitness ' + Math.round(intSave().fit || 0) : 'Buy a gym pass'), () => { if (intSave().gymMem) { Int.say('Fitness ' + Math.round(intSave().fit || 0) + ' / 100 · ' + (intSave().gym || 0) + ' workouts', 3); return; } intBuy(pass, 'a gym pass', () => { intSave().gymMem = 1; }, 'Gym pass. Every gym on the island is yours to use.'); });
} }, key(code) { if (Int.busy && Int.busy.press && (code === 'Space')) Int.busy.press(); } };

/* ---------- indoor pool ---------- */
INT_KINDS.pool = { name: 'Indoor pool', rooms: { main(K, rec, r) {
  const { W, D } = intDims(rec, 30, 24), px0 = -W / 2 + 2.5, px1 = W / 2 - 2.5, pz0 = -D / 2 + 2.5, pz1 = Math.min(D / 2 - 5, pz0 + 25), wy = -0.25, bot = -1.7;
  K.shell({ W, D, H: 7, floor: 0xe8f0f2, wall: 0xdaeef2, trim: 0x2a8ab0, lamp: 0xf4fbff, lightI: 1, sky: 0xe8f8ff, winH: [1.5, 6], hole: [px0, pz0, px1, pz1] });
  /* the basin: blue tile walls down to the floor, lane ropes, the water */
  K.box(px0, bot, pz0, px1, bot + 0.02, pz1, 0x3ab0d8); for (const [a, b, c, d] of [[px0, pz0, px1, pz0 + 0.05], [px0, pz1 - 0.05, px1, pz1], [px0, pz0, px0 + 0.05, pz1], [px1 - 0.05, pz0, px1, pz1]]) K.box(a, bot, b, c, 0, d, 0x5ac0e0);
  K.box(px0 - 0.5, -0.2, pz0 - 0.5, px1 + 0.5, 0.0, pz0, 0xffffff); K.box(px0 - 0.5, -0.2, pz1, px1 + 0.5, 0.0, pz1 + 0.5, 0xffffff);
  K.water(px0, pz0, px1, pz1, wy, 0x2a9ad0); const lanes = Math.max(3, Math.floor((px1 - px0) / 2.5));
  for (let k = 1; k < lanes; k++) { const x = px0 + k * (px1 - px0) / lanes; for (let z = pz0; z < pz1; z += 0.5) K.cyl(x, wy - 0.05, z, 0.06, 0.08, (z * 2 | 0) % 2 ? 0xd82a2a : 0xf2f2f2); K.box(x - 0.15, bot, pz0, x + 0.15, bot + 0.025, pz1, 0x1a4a7a); }
  /* a ladder, a diving board, a lifeguard's chair, benches */
  K.box(px1 - 0.6, -0.1, pz1 - 0.1, px1 + 1.6, 0.55, pz1 + 0.8, 0x2a8ab0, true); K.box(px1 - 0.4, 0.55, pz1 - 2.2, px1 + 0.2, 0.62, pz1 + 0.5, 0xf2f2f2);
  K.box(K.x0 + 0.8, 0, (pz0 + pz1) / 2 - 0.4, K.x0 + 1.6, 1.6, (pz0 + pz1) / 2 + 0.4, 0xd82a2a, true);
  for (let k = 0; k < 4; k++) K.box(K.x1 - 1.6 + 0.0, 0, pz0 + 2 + k * 3, K.x1 - 0.6, 0.45, pz0 + 3.6 + k * 3, 0x2a8ab0, true);
  K.sign(rec.name.toUpperCase(), 0, 5.6, K.z0 + 0.04, Math.min(W - 4, 12), 1, 0, { fg: '#2a8ab0' });
  if (/Spa/.test(rec.name)) { K.cyl(K.x0 + 3, -0.1, K.z1 - 3, 1.6, 0.6, 0xe8e8e8, true); K.glow(K.x0 + 1.6, 0.45, K.z1 - 4.4, K.x0 + 4.4, 0.46, K.z1 - 1.6, 0x6ad8ff, 0.9); }
  K.swim = { at(x, z) { return x > px0 + 0.1 && x < px1 - 0.1 && z > pz0 + 0.1 && z < pz1 - 0.1 ? { y: -0.32 } : null; } };
  /* swimmers doing laps, a lifeguard, people by the pool */
  for (let k = 0; k < Math.min(lanes, 4); k++) { const x = px0 + (k + 0.5) * (px1 - px0) / lanes; const n = K.person({ x, z: pz0 + 1, kind: 'walk', swim: true, swimC: [0xd82a4a, 0x1a1a1a, 0x2a6ad8, 0xf2c81e][k], vt: 0.9 + k * 0.1, path: [[x, pz0 + 1, 0.5], [x, pz1 - 1, 0.5]] }); if (n) n.after = (q, h) => { h.root.position.y = -0.62 + 0.04 * Math.sin(App.time * 3 + q.seed); const b = h.b, u = Math.sin(App.time * 4 + q.seed); h.root.rotation.order = 'YXZ'; h.root.rotation.x = 1.2; b.armL.rotation.set(-1.6 - 1.4 * u, 0, -0.2); b.armR.rotation.set(-1.6 + 1.4 * u, 0, 0.2); }; }
  K.person({ x: K.x0 + 1.2, z: (pz0 + pz1) / 2, y: 1.6, yaw: Math.PI / 2, kind: 'sit', swim: true, swimC: 0xd82a2a, face: true });
  intSeat(K, K.x1 - 1.1, pz0 + 2.8, -Math.PI / 2, { swim: true, sy: 0.0 }); intSeat(K, K.x1 - 1.1, pz0 + 5.8, -Math.PI / 2, { swim: true, sy: 0.0 });
  const lapK = { last: null, m: 0 };
  K.tick((dt) => { if (!K.swim.at(Int.x, Int.z)) { lapK.last = null; return; } if (lapK.last) lapK.m += Math.hypot(Int.x - lapK.last[0], Int.z - lapK.last[1]); lapK.last = [Int.x, Int.z]; if (lapK.m > 50) { lapK.m -= 50; const s = intSave(); s.swims = (s.swims || 0) + 1; s.fit = Math.min(100, (s.fit || 0) + 0.8 * (1 - (s.fit || 0) / 140)); writeSave(); Int.say('50 m swum · fitness ' + Math.round(s.fit), 2.4); Snd.beep(820, 0.05); } });
  K.counter(K.x1 - 5, K.z1 - 2.6, K.x1 - 1.5, K.z1 - 1.9, 0x2a8ab0); intStaff(K, K.x1 - 3.2, K.z1 - 3.2, 0, 0x2a8ab0);
  K.act(K.x1 - 3.2, K.z1 - 1.3, 1.6, 'Swim laps: walk into the water (every 50 m makes you fitter)', () => Int.say('Walk into the pool. Every 50 m you swim makes you a little fitter.', 3), { wide: true });
} }, hud() { const s = Int.swim && Int.swim.at(Int.x, Int.z); return s ? '<div class="ibar"><small>Swimming · ' + (intSave().swims || 0) + ' × 50 m · fitness ' + Math.round(intSave().fit || 0) + '</small></div>' : ''; } };

/* ---------- restaurants (one menu per town) ---------- */
const INT_RESTO = [
  { floor: 0x6a5a48, wall: 0x2a4a6a, seat: 0xe8e2d4, top: 0x8a6a4a, staff: 0x2a4a6a, counter: 0x2a4a6a, trim: 0xf2c81e, menu: 'CRAB · CHOWDER · FISH & CHIPS', menuBg: '#1a2a3a', price: 18, meal: 'a bowl of chowder and fish and chips' },
  { floor: 0xa86a3a, tiles: 0x8a4a2a, wall: 0xe8c890, seat: 0xc8402a, top: 0xe8d8b8, staff: 0xc8402a, counter: 0x2a8a8a, trim: 0x2a8a8a, menu: 'TACOS · ENCHILADAS · HORCHATA', menuBg: '#2a8a8a', price: 14, meal: 'three tacos and a horchata' },
  { floor: 0x8a6a4a, wall: 0xf0e8d8, seat: 0x6a4a2a, top: 0xa8845a, staff: 0x4a6a3a, counter: 0x6a4a2a, trim: 0x4a6a3a, menu: 'FARM PLATES · PIES · CIDER', menuBg: '#4a6a3a', price: 16, meal: 'a farm plate and apple pie' },
  { floor: 0xd8c8a0, wall: 0x8ad8c8, seat: 0xff7a6a, top: 0xc8a070, staff: 0xff7a6a, counter: 0x8a5a2a, trim: 0x2fc4c0, menu: 'POKE · GRILLED FISH · SMOOTHIES', menuBg: '#ff7a6a', price: 17, meal: 'a poke bowl and a mango smoothie' },
  { floor: 0x5a3a24, wall: 0xd8c0a0, seat: 0xa8302a, top: 0x6a4a2a, staff: 0xa8302a, counter: 0x5a3a24, trim: 0xa8302a, menu: 'CHEESE FONDUE · RÖSTI · COCOA', menuBg: '#a8302a', price: 22, meal: 'cheese fondue and hot cocoa' },
  { floor: 0x6a5a4a, wall: 0xd8d0b8, seat: 0x3a5a3a, top: 0x8a6a4a, staff: 0x3a5a3a, counter: 0x4a3a2a, trim: 0x3a5a3a, menu: 'GRILLED TROUT · BURGERS · LEMONADE', menuBg: '#3a5a3a', price: 15, meal: 'grilled trout and lemonade' },
  { floor: 0x2a2a2a, wall: 0x1a1a1e, seat: 0x2a2a2e, top: 0xd8c8a8, staff: 0x1a1a1a, counter: 0xd8c8a8, trim: 0xc8a050, menu: 'NIGIRI · RAMEN · MATCHA', menuFg: '#c8a050', menuBg: '#1a1a1a', price: 32, meal: 'the chef’s nigiri set', lamp: 0xffd8a0, lightI: 0.65 }
];
INT_KINDS.resto = { name: 'Restaurant', rooms: { main(K, rec, r) { const th = Object.assign({}, INT_RESTO[rec.ti % INT_RESTO.length]); if (/Lumi/.test(rec.name)) Object.assign(th, { menu: 'STEAK FRITES · SOUFFLÉ · WINE LIST', meal: 'steak frites and a soufflé', price: 38, seat: 0x7a1a2a }); intDiner(K, rec, r, th); K.sign(rec.name.toUpperCase(), 0, 3.25, K.z0 + 0.03, 6, 0.5, 0, { fg: _hexCss(th.trim || 0xffffff) }); K.person({ x: 0, z: K.z0 + 5, kind: 'walk', shirt: th.staff, pants: 0x1a1a1a, path: [[0, K.z0 + 5, 2], [K.x0 + 3, K.z1 - 3, 2], [K.x1 - 3, K.z1 - 4, 2]] }); } } };

/* ---------- car dealership: the only place to buy a car ---------- */
const INT_DEALER = [{ max: 6000, cls: null, col: 0x2a6ad8 }, { max: 1e9, cls: /truck|off|buggy|4x4|rally|pickup|suv|van/i, col: 0xd86a1a }, { min: 4000, max: 1e9, cls: null, col: 0xc8a050 }];
function intDealerCars(rec) {
  const all = CARS.filter((d) => !d.stolen && !d.prize && !d.kit && d.price > 0), t = rec.ti === 1 ? INT_DEALER[1] : rec.ti === 6 || rec.ti === 13 ? INT_DEALER[2] : INT_DEALER[0];
  let L = all.filter((d) => d.price <= t.max && (!t.min || d.price >= t.min) && (!t.cls || t.cls.test(d.cls + ' ' + d.name)));
  if (L.length < 4) L = all.slice().sort((a, b) => a.price - b.price); return L;
}
function intCarPanel(d, rec) {
  const own = !!save.owned[d.id], bar = (l, v) => '<div class="cs"><span>' + l + '</span><i><b style="width:' + v * 10 + '%"></b></i></div>';
  Int.panel({ title: d.name, sub: d.cls + ' · ' + rec.name, body: '<p>' + esc(d.blurb) + '</p><div class="cstats">' + bar('Speed', d.stats.spd) + bar('Accel', d.stats.acc) + bar('Handling', d.stats.hdl) + bar('Off-road', d.stats.off) + '</div><div class="vrec"><div><small>Price</small><b>' + money(d.price) + '</b></div><div><small>Wallet</small><b>' + money(save.money) + '</b></div>' + (intSave().acct ? '<div><small>Bank</small><b>' + money(intSave().acct) + '</b></div>' : '') + '</div>',
    btns: own ? [['You own this one', null, false, true]] : [['Buy for ' + money(d.price), () => intBuyCar(d, rec), true, save.money < d.price]] });
}
function intBuyCar(d, rec) {
  if (save.owned[d.id] || save.money < d.price) return; save.money -= d.price; save.owned[d.id] = true; writeSave(); Snd.win(); Int.panel(null);
  const s = intSave(); s.delivery = { id: d.id, key: rec.key };
  UI.banner('SOLD', 'The ' + d.name + ' is yours · it is waiting outside'); Int.say('The keys are yours. Your new ' + d.name + ' is parked out front.', 4);
}
INT_KINDS.dealer = { name: 'Car dealership', rooms: { main(K, rec, r) {
  const { W, D } = intDims(rec, 26, 22), col = (rec.ti === 1 ? INT_DEALER[1] : rec.ti === 6 || rec.ti === 13 ? INT_DEALER[2] : INT_DEALER[0]).col;
  K.shell({ W, D, H: 6, floor: 0xf2f2f2, tiles: 0xd8d8d8, wall: 0xeef0f2, trim: 0x1a1a1a, lamp: 0xffffff, lightI: 1.1, winH: [0.3, 5.6], hemi: 0.9 });
  K.sign(rec.name.toUpperCase(), 0, 4.8, K.z0 + 0.04, Math.min(W - 4, 12), 1, 0, { fg: _hexCss(col) });
  const cars = intDealerCars(rec), spots = []; for (let z = K.z0 + 4; z < K.z1 - 4; z += 6.2) for (const x of [K.x0 + 4.5, 0, K.x1 - 4.5]) spots.push([x, z]);
  K.extra = K.extra || [];
  spots.slice(0, Math.min(spots.length, 7)).forEach((p, i) => {
    const d = cars[i % cars.length], m = buildCarModel(d, PAINTS[(i * 3 + rec.seed) % PAINTS.length], { studio: true, static: true }); m.position.set(p[0], 0.18, p[1]); m.rotation.y = 0.6 + i * 0.9; K.sc.add(m); K.extra.push(() => { K.sc.remove(m); disposeCar(m); });
    K.cyl(p[0], 0, p[1], 3.1, 0.18, 0xd8d8dc); K.glow(p[0] - 2.9, 0.181, p[1] - 0.02, p[0] + 2.9, 0.182, p[1] + 0.02, col, 1.4); K.col(p[0] - 2.2, p[1] - 2.2, p[0] + 2.2, p[1] + 2.2);
    K.sign(d.name + '  ·  ' + money(d.price), p[0], 2.9, p[1], 3.2, 0.5, 0, { fg: '#ffffff', bg: '#16181c' }).rotation.y = 0;
    K.act(p[0], p[1] + 2.8, 1.8, () => (save.owned[d.id] ? 'The ' + d.name + ' (yours)' : 'Look at the ' + d.name), () => intCarPanel(d, rec), { cost: 0 });
    K.act(p[0], p[1] - 2.8, 1.8, () => 'Look at the ' + d.name, () => intCarPanel(d, rec));
  });
  K.counter(K.x1 - 5, K.z1 - 3.4, K.x1 - 1.4, K.z1 - 2.6, 0x1a1a1a, 0xf2f2f2); K.desk(K.x1 - 3.2, K.z1 - 3.0, 0); intStaff(K, K.x1 - 3.2, K.z1 - 3.9, 0, 0x1a1a1a, { suit: true });
  K.person({ x: -2, z: K.z0 + 7, kind: 'walk', suit: true, shirt: 0x2a2a3a, pants: 0x2a2a3a, path: spots.slice(0, 4).map((p) => [p[0] + 2.6, p[1] + 2.6, 4]) });
  K.act(K.x1 - 3.2, K.z1 - 1.8, 1.8, 'Talk to the salesperson (the full catalogue)', () => Int.panel({ title: rec.name, sub: 'Every car we can get you · ' + money(save.money), body: '<div class="vsl"><div>' + CARS.filter((d) => !d.stolen && !d.prize && !d.kit && d.price > 0).sort((a, b) => a.price - b.price).map((d) => '<button type="button" class="vstk' + (save.owned[d.id] ? ' on' : '') + '" data-ia="' + d.id + '">' + esc(d.name) + ' · ' + (save.owned[d.id] ? 'owned' : money(d.price)) + '</button>').join('') + '</div></div>', btns: [], pick: (id) => intCarPanel(CAR_BY_ID[id], rec) }), { wide: true });
  intShoppers(K, r, 2, spots.map((p) => [p[0] - 2.8, p[1]]));
} }, leave(rec) {
  const s = intSave(), dl = s.delivery; if (!dl || dl.key !== rec.key) return;
  const d = rec.door, x = d.ox + d.nz * 0 + 4.5, z = d.oz + d.nz * 4; loadAround(x, z, 6); const yaw = d.nz > 0 ? Math.PI / 2 : -Math.PI / 2;
  if (App.setCar(dl.id)) { s.delivery = null; spawnAt(x, z, yaw); car.health = 100; }
} };

/* ---------- the county jail ---------- */
const Jail = { on: false, hrs: 0, left: 0, t: 0, work: 0 };
Jail.rec = function () { Bld.prep(); const S = Bld.sites.find((q) => q.kind === 'jail'); if (!S) return null; let rec = Bld.lots.get(S.key); if (!rec) { rec = { key: S.key, kind: 'jail', name: S.name, sub: BLD_SUB.jail, seed: 77, ti: S.ti, tid: S.T.id, town: S.T.name, reg: 'city', x0: S.x - 12, z0: S.z - 26, x1: S.x + 12, z1: S.z - 2, y: S.T.baseH, h: 16, cat: 'mid', W: 24, D: 24, special: true, door: { x: S.x, z: S.z - 1, nx: 0, nz: S.b ? 1 : -1, ox: S.x, oz: S.z + (S.b ? 0.4 : -0.4) } }; if (!S.b) { rec.z0 = S.z + 2; rec.z1 = S.z + 26; rec.door.z = S.z + 1; } } return rec; };
/* do time: hours of game time, passed at about ten real seconds an hour (sleeping skips the rest) */
Jail.serve = function (hrs, why) {
  const rec = Jail.rec(); if (!rec) return false;
  Jail.on = true; Jail.hrs = hrs; Jail.left = hrs; Jail.t = 0; Jail.why = why || ''; Int.hook = { allowHeat: true, left: () => Jail.release() };
  if (Foot.on) { Foot.on = false; UI.footMode(false); }
  const ok = Int.enter(rec, 'cells'); if (!ok) { Jail.on = false; Int.hook = null; return false; }
  intSave().jail = (intSave().jail || 0) + 1; writeSave(); return true;
};
Jail.release = function () {
  Jail.on = false; const rec = Int.rec || Jail.rec(), d = rec.door; loadAround(d.ox, d.oz, 8);
  /* the impound lot gives you your car back by the door */
  const cx = d.ox + 5, cz = d.oz + d.nz * 5; spawnAt(cx, cz, d.nz > 0 ? 0 : Math.PI); car.health = Math.max(car.health, 60);
  if (!Foot.ped) Foot.ped = footNewPed(); Foot.ped.app = footApp(); Foot.on = true; Foot.x = d.ox; Foot.z = d.oz; groundAt(d.ox, d.oz, _fg); Foot.y = _fg.h; Foot.vx = Foot.vz = Foot.vy = 0; Foot.state = 'walk'; Foot.yaw = d.nz > 0 ? 0 : Math.PI; UI.footMode(true); syncPl();
  UI.banner('RELEASED', 'Time served · your car is by the door');
};
INT_KINDS.jail = { name: 'County jail', rooms: {
  main(K, rec, r) {   /* the police front desk: open to visitors */
    const { W, D } = intDims(rec, 16, 13); K.shell({ W, D, floor: 0x8a8c90, tiles: 0x7a7c80, wall: 0xc8ccd0, trim: 0x1a2a4a, lamp: 0xf4f8ff, lightI: 0.95 });
    K.counter(-3, K.z0 + 3, 3, K.z0 + 3.8, 0x1a2a4a, 0xd8d8d8, 1.15); K.glass(-3, 1.15, K.z0 + 3.3, 3, 2.4, K.z0 + 3.35); intStaff(K, 0, K.z0 + 2.3, 0, 0x1a2a4a, { hat: { k: 'cap', c: lc(0x1a2a4a), bc: null }, role: 'cop' });
    K.sign('ISLAND COUNTY POLICE', 0, 3.0, K.z0 + 0.03, 6, 0.6, 0, { fg: '#d8d8d8', bg: '#1a2a4a' });
    for (let k = 0; k < 5; k++) K.pic(K.x0 + 0.02, 1.7, K.z0 + 2 + k * 1.1, Math.PI / 2, 0.6, 0.8, 0xe8e0c8);
    K.sign('WANTED', K.x0 + 0.04, 2.35, K.z0 + 4.2, 2.4, 0.35, Math.PI / 2, { fg: '#c8302a', bg: '#e8e0c8' });
    for (let k = 0; k < 4; k++) K.chair(K.x1 - 1, K.z1 - 2 - k * 0.8, -Math.PI / 2, 0x3a3c40); intSeat(K, K.x1 - 1, K.z1 - 3.6, -Math.PI / 2, { phone: true });
    K.box(K.x0 + 0.6, 0, -1, K.x0 + 1.1, 0.45, 2.5, 0x6a6c70, true); K.box(-0.5, 0, K.z0 + 6, 0.5, 2.2, K.z0 + 6.15, 0x9a9aa0, true); K.plant(K.x0 + 1, K.z1 - 1, 1);
    K.box(K.x0 + 4, 0, K.z0, K.x0 + 6, 2.4, K.z0 + 0.1, 0x5a5c60); K.sign('CELLS · STAFF ONLY', K.x0 + 5, 2.65, K.z0 + 0.12, 2, 0.3, 0, { fg: '#fff', bg: '#c8302a' });
    K.act(0, K.z0 + 4.6, 1.8, () => (Wanted.stars > 0 ? 'Turn yourself in' : 'Talk to the desk sergeant'), () => {
      if (Wanted.stars > 0) { const h = 2 + Wanted.stars * 2; Int.panel({ title: 'Turn yourself in?', sub: Wanted.stars + ' star' + (Wanted.stars > 1 ? 's' : ''), body: '<p>Hand yourself over and do ' + h + ' hours in the cells. The charges are dropped, no fine, and your car waits in the impound lot by the door.</p>', btns: [['Do ' + h + ' hours', () => { Int.panel(null); Police.clearAll && Police.clearAll(); Wanted.stars = 0; Wanted.esc = Wanted.cool = Wanted.bust = 0; Int.hook = { allowHeat: true, left: () => Jail.release() }; Jail.on = true; Jail.hrs = Jail.left = h; Jail.t = 0; Int.go('cells', 'bunk'); }, true]] }); }
      else Int.say('“Nothing to report? Then move along. Unless you fancy a night in the cells.”', 3.5);
    });
  },
  cells(K, rec, r) {   /* the cell block: four cells each side, a day room in the middle, a yard door */
    const W = 18, D = 20; K.shell({ W, D, H: 4, floor: 0x7a7c80, wall: 0xb8bcc0, ceil: 0x8a8c90, trim: 0x3a3c40, door: false, lamp: 0xf4f8ff, lightI: 0.8, winH: [2.8, 3.6] });
    const bar = 0x4a4c50;
    for (const sx of [-1, 1]) for (let k = 0; k < 4; k++) {
      const z = K.z0 + 2.5 + k * 3.6, xi = sx * 5.5, xw = sx * (W / 2); K.box(Math.min(xi, xw), 0, z - 1.8, Math.max(xi, xw), 4, z - 1.72, 0x9a9ca0, true);
      for (let q = -1.6; q <= 1.6; q += 0.2) if (!(sx < 0 && k === 0 && Math.abs(q) < 0.55)) K.box(xi - 0.02, 0, z + q - 0.02, xi + 0.02, 2.6, z + q + 0.02, bar); K.box(xi - 0.05, 2.6, z - 1.8, xi + 0.05, 2.7, z + 1.8, bar);
      if (!(sx < 0 && k === 0)) K.col(xi - 0.05, z - 1.8, xi + 0.05, z + 1.8); else { K.col(xi - 0.05, z - 1.8, xi + 0.05, z - 0.55); K.col(xi - 0.05, z + 0.55, xi + 0.05, z + 1.8); }
      K.box(xw - sx * 0.9, 0, z - 1.6, xw - sx * 0.05, 0.5, z + 0.4, 0x6a6c70, true); K.box(xw - sx * 0.85, 0.5, z - 1.55, xw - sx * 0.1, 0.62, z + 0.35, 0xd8d0c0);
      K.cyl(xw - sx * 0.5, 0, z + 1.2, 0.22, 0.45, 0xe8e8e8, true);
      if (!(sx < 0 && k === 0) && r() < 0.6) { const n = K.person({ x: xw - sx * 0.5, z: z - 0.6, yaw: -sx * Math.PI / 2, kind: r() < 0.5 ? 'sit' : 'sleep', shirt: 0xe8701a, pants: 0xe8701a, sleeve: false }); if (n && n.kind === 'sit') { n.sy = 0.05; n.sy0 = 0; } if (n && n.kind === 'sleep') { n.x = xw - sx * 0.48; n.z = z - 1.4; n.y = 0.48; n.yaw = Math.PI; } }
    }
    const myZ = K.z0 + 2.5; K.spawn('bunk', -7, myZ + 0.6, Math.PI / 2);
    /* the day room: steel tables, a phone, a pull-up bar, a mop */
    for (const z of [0, 3]) { K.table(0, z, 2.2, 1, 0x8a8c90, 0.76); for (const x of [-0.6, 0.6]) { K.chair(x, z - 0.8, 0, 0x6a6c70, true); K.chair(x, z + 0.8, 0, 0x6a6c70, true); } }
    intSeat(K, 0.6, 3.8, Math.PI, { sy: 0.25, shirt: 0xe8701a, pants: 0xe8701a, sleeve: false, talk: true }); intSeat(K, -0.6, 2.2, 0, { sy: 0.25, shirt: 0xe8701a, pants: 0xe8701a, sleeve: false, eat: true });
    K.box(-0.2, 0, K.z1 - 0.15, 0.2, 2.4, K.z1, 0x1a1a1a); K.box(-0.15, 1.5, K.z1 - 0.3, 0.15, 1.8, K.z1 - 0.15, 0x2a2a2a);
    K.box(3.5, 2.2, K.z1 - 2.5, 3.55, 2.25, K.z1 - 1.3, 0x9a9a9a); K.box(3.5, 0, K.z1 - 2.5, 3.6, 2.25, K.z1 - 2.42, 0x3a3a3a); K.box(3.5, 0, K.z1 - 1.38, 3.6, 2.25, K.z1 - 1.3, 0x3a3a3a);
    K.cyl(-3.5, 0, K.z1 - 1.5, 0.25, 0.5, 0xd8b81e, true); K.cyl(-3.3, 0.5, K.z1 - 1.5, 0.02, 1.2, 0x8a6a3a);
    K.box(-1.2, 0, K.z1 - 0.12, 1.2, 2.6, K.z1, 0x5a5c60); K.sign('EXIT · RELEASE', 0, 2.9, K.z1 - 0.13, 1.8, 0.35, Math.PI, { fg: '#fff', bg: '#2a6a3a' });
    K.person({ x: 0, z: K.z1 - 2, kind: 'walk', shirt: 0x1a2a4a, pants: 0x1a1c24, hat: { k: 'cap', c: lc(0x1a2a4a), bc: null }, path: [[0, K.z1 - 2, 3], [0, K.z0 + 4, 3], [2.5, K.z0 + 10, 2]], role: 'guard' });
    K.act(-7, myZ + 0.6, 1.4, 'Sleep on the bunk (sleep off the rest of your time)', () => { Int.busy = { freeze: true, lock: 'Sleeping…', t: 0, hint: () => '<b>Zzz…</b>', tick(dt) { this.t += dt; if (this.t > 1.4) { Int.busy = null; App.tod = (App.tod + Jail.left) % 24; Jail.left = 0; Int.say('You wake up. The guard is rattling the door: “You’re free to go.”', 4); } } }; }, { wide: true });
    K.act(3.55, K.z1 - 1.9, 1.4, 'Pull-ups (fitness)', () => intWorkout('Pull-ups', 0.5, 0));
    K.act(-3.5, K.z1 - 2.1, 1.4, 'Mop the floor (an hour off your time, $5)', () => { if (!Jail.on) { Int.say('You are not doing time.'); return; } Jail.left = Math.max(0, Jail.left - 1); save.money += 5; Jail.work++; writeSave(); Snd.beep(600, 0.05); Int.say('You mop the day room. An hour off, and $5 in your account.', 2.6); });
    K.act(0, K.z1 - 0.6, 1.6, () => (Jail.left > 0.01 ? 'The door is locked (' + Math.ceil(Jail.left) + 'h left)' : 'Walk out a free person'), () => { if (Jail.on && Jail.left > 0.01) { Int.say('The guard shakes his head. ' + Math.ceil(Jail.left) + ' more hours.'); return; } Int.leave(); }, { wide: true });
    K.act(0.1, K.z1 - 0.2, 1.2, 'Make a phone call', () => Int.say('You call your mechanic. “Your car’s fine. Don’t drop the soap.”', 3.5));
  } },
  tick(dt) { if (Int.room === 'cells' && Jail.on && Jail.left > 0) { Jail.left = Math.max(0, Jail.left - dt / 10); App.tod = (App.tod + dt / 10) % 24; if (Jail.left <= 0) Int.say('“Time’s up. You’re free to go.” The door buzzes open.', 4); } },
  hud() { if (Int.room !== 'cells' || !Jail.on) return ''; const h = Math.ceil(Jail.left); return '<div class="ibar"><small>Doing time · ' + (h > 0 ? h + ' hour' + (h > 1 ? 's' : '') + ' left' : 'free to go') + (Jail.why ? ' · ' + esc(Jail.why) : '') + '</small><div class="ibt"><i class="iz" style="left:0;width:' + (100 * (1 - Jail.left / Math.max(1, Jail.hrs))).toFixed(0) + '%"></i></div></div>'; },
  leave(rec) { if (Int.room === 'cells' && Jail.on && Jail.left > 0.01) { Int.say('The door is locked · ' + Math.ceil(Jail.left) + 'h left. Sleep on your bunk to skip it.'); return false; } }
};
