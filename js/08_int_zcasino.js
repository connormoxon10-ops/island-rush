/* ================= THE CASINO =================
   The Golden Ace (in the city) and the Neon Palace (in Neo Haven): a dark room in red carpet and gold, rows of slot machines flashing, a roulette
   wheel that really spins, two blackjack tables with dealers, a bar and the cashier's cage, and people at the machines. You play with your own
   money (in Story Mode, the story's), with bets from $10 to $1,000:
     slots      three reels; three of a kind pays 5× (cherries) up to 100× (diamonds), two cherries 2×, one cherry gets your bet back
     roulette   a European wheel (0–36): red or black, odd or even, 1–18 or 19–36 pay 1:1, a dozen 2:1, a single number 35:1
     blackjack  hit, stand or double down; the dealer draws to 16 and stands on 17; blackjack pays 3:2, a push gives your bet back
   The cashier keeps your record (won, lost, biggest win). */
const Casino = { rng: Math.random, bet: 50, game: null, wheel: null, ball: null, spinT: 0, spinRes: null, slot: null, deck: null };
const CS_BETS = [10, 50, 100, 500, 1000];
const CS_SYM = [['🍒', 30], ['🍋', 24], ['🔔', 18], ['⭐', 13], ['7️⃣', 9], ['💎', 6]];
const CS_PAY = { '🍒': 5, '🍋': 8, '🔔': 12, '⭐': 20, '7️⃣': 50, '💎': 100 };
const CS_RED = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
/* the record, in the save */
function csSave() { return save.casino || (save.casino = { won: 0, lost: 0, plays: 0, best: 0 }); }
function csSettle(stake, back, what) {   /* the stake is already taken; back is what the player gets back (0 if lost) */
  const S = csSave(); S.plays++; const net = back - stake; if (net > 0) { S.won += net; S.best = Math.max(S.best, net); } else if (net < 0) S.lost += -net;
  save.money += back; writeSave(); if (net > 0) { Snd.win(); UI.toast(what + ' · you win ' + money(net), 'good'); } else if (net < 0) Snd.beep(240, 0.12); return net;
}
function csTake(b) { if (save.money < b) { UI.toast('Not enough money for that bet', 'bad'); return false; } save.money -= b; return true; }
const csBetRow = () => '<div class="csbets">' + CS_BETS.map((b) => '<button type="button" class="btn sm' + (Casino.bet === b ? ' primary' : '') + '" data-ia="bet:' + b + '"' + (save.money < b ? ' disabled' : '') + '>' + money(b) + '</button>').join('') + '</div><p class="csmoney">You have <b>' + money(save.money) + '</b></p>';
/* ---------- slots ---------- */
function csReel() { let t = 0; for (const s of CS_SYM) t += s[1]; let q = Casino.rng() * t; for (const s of CS_SYM) { q -= s[1]; if (q <= 0) return s[0]; } return CS_SYM[0][0]; }
function csSlotPay(r) { if (r[0] === r[1] && r[1] === r[2]) return CS_PAY[r[0]]; const ch = r.filter((s) => s === '🍒').length; return ch === 2 ? 2 : ch === 1 ? 1 : 0; }
Casino.slots = function (M) {
  Casino.game = 'slots'; Casino.slot = Casino.slot || { r: ['🍒', '🔔', '7️⃣'], spinning: false, msg: 'Three of a kind pays big. Cherries pay something.' }; const S = Casino.slot; S.M = M;
  const draw = () => Int.panel({ title: 'Slot machine', sub: 'Pays: 💎💎💎 100× · 7️⃣7️⃣7️⃣ 50× · ⭐⭐⭐ 20× · 🔔🔔🔔 12× · 🍋🍋🍋 8× · 🍒🍒🍒 5× · two 🍒 2× · one 🍒 your bet back',
    body: '<div class="csreels">' + S.r.map((s) => '<span>' + s + '</span>').join('') + '</div><p class="csmsg">' + S.msg + '</p>' + csBetRow(),
    btns: [[S.spinning ? 'Spinning…' : 'Spin (' + money(Casino.bet) + ')', () => spin(), true, S.spinning || save.money < Casino.bet]], pick: (v) => { if (v.indexOf('bet:') === 0 && !S.spinning) { Casino.bet = +v.slice(4); draw(); } } });
  const spin = () => {
    if (S.spinning || !csTake(Casino.bet)) return; S.spinning = true; const res = [csReel(), csReel(), csReel()], stake = Casino.bet; let k = 0; S.msg = '…'; Snd.beep(600, 0.05);
    const tick = () => { k++; for (let i = 0; i < 3; i++) if (k < 8 + i * 5) S.r[i] = CS_SYM[Math.floor(Math.random() * CS_SYM.length)][0]; else S.r[i] = res[i];
      if (S.M) S.M.flash = 0.3; if (Int.pan && Int.pan.title === 'Slot machine') draw();
      if (k < 18) setTimeout(tick, 70); else { S.spinning = false; const m = csSlotPay(res), net = csSettle(stake, stake * m, 'Slots'); S.msg = m >= 5 ? 'JACKPOT! ' + m + '× · +' + money(net) : m > 1 ? m + '× · +' + money(net) : m === 1 ? 'Your bet back' : 'No luck'; if (S.M && m >= 2) S.M.flash = 3; if (Int.pan && Int.pan.title === 'Slot machine') draw(); Casino.last = { game: 'slots', res, m, net }; } };
    tick();
  };
  draw();
};
/* ---------- roulette ---------- */
function csRouletteWin(bet, n) {
  const red = CS_RED.includes(n);
  if (bet === 'red') return n > 0 && red ? 2 : 0; if (bet === 'black') return n > 0 && !red ? 2 : 0;
  if (bet === 'odd') return n > 0 && n % 2 ? 2 : 0; if (bet === 'even') return n > 0 && !(n % 2) ? 2 : 0;
  if (bet === 'low') return n >= 1 && n <= 18 ? 2 : 0; if (bet === 'high') return n >= 19 ? 2 : 0;
  if (bet === 'd1') return n >= 1 && n <= 12 ? 3 : 0; if (bet === 'd2') return n >= 13 && n <= 24 ? 3 : 0; if (bet === 'd3') return n >= 25 ? 3 : 0;
  if (/^n\d+$/.test(bet)) return +bet.slice(1) === n ? 36 : 0; return 0;
}
Casino.roulette = function () {
  Casino.game = 'roulette'; const R = Casino.rou || (Casino.rou = { on: 'red', msg: 'Place your bet and spin.', hist: [] });
  const lab = { red: 'Red', black: 'Black', odd: 'Odd', even: 'Even', low: '1–18', high: '19–36', d1: '1st 12', d2: '2nd 12', d3: '3rd 12' };
  const draw = () => {
    const nums = []; for (let n = 0; n <= 36; n++) nums.push('<button type="button" class="csn ' + (n === 0 ? 'g' : CS_RED.includes(n) ? 'r' : 'k') + (R.on === 'n' + n ? ' on' : '') + '" data-ia="on:n' + n + '">' + n + '</button>');
    Int.panel({ title: 'Roulette', sub: 'European wheel · even bets pay 1:1, dozens 2:1, a single number 35:1',
      body: '<div class="csouts">' + Object.keys(lab).map((k) => '<button type="button" class="btn sm' + (R.on === k ? ' primary' : '') + '" data-ia="on:' + k + '">' + lab[k] + '</button>').join('') + '</div><div class="csnums">' + nums.join('') + '</div>' +
        '<p class="csmsg">Betting on <b>' + (lab[R.on] || 'number ' + R.on.slice(1)) + '</b> · ' + R.msg + '</p><p class="cshist">' + R.hist.slice(-10).map((n) => '<span class="' + (n === 0 ? 'g' : CS_RED.includes(n) ? 'r' : 'k') + '">' + n + '</span>').join('') + '</p>' + csBetRow(),
      btns: [[Casino.spinT > 0 ? 'The ball is rolling…' : 'Spin (' + money(Casino.bet) + ')', () => spin(), true, Casino.spinT > 0 || save.money < Casino.bet]],
      pick: (v) => { if (Casino.spinT > 0) return; if (v.indexOf('bet:') === 0) Casino.bet = +v.slice(4); else if (v.indexOf('on:') === 0) R.on = v.slice(3); draw(); } });
  };
  const spin = () => {
    if (Casino.spinT > 0 || !csTake(Casino.bet)) return; const n = Math.floor(Casino.rng() * 37), stake = Casino.bet, on = R.on; Casino.spinT = 3.2; Casino.spinRes = n; R.msg = 'No more bets…'; Snd.beep(500, 0.06); draw();
    Casino.spinDone = () => { const m = csRouletteWin(on, n), net = csSettle(stake, stake * m, 'Roulette'); R.hist.push(n); R.msg = n + ' ' + (n === 0 ? 'green' : CS_RED.includes(n) ? 'red' : 'black') + (m ? ' · you win ' + money(net) : ' · the house wins'); Casino.last = { game: 'roulette', n, on, m, net }; if (Int.pan && Int.pan.title === 'Roulette') draw(); };
  };
  draw();
};
/* ---------- blackjack ---------- */
function csDeck() { const d = []; for (const s of ['♠', '♥', '♦', '♣']) for (const r of ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']) d.push(r + s); for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Casino.rng() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; } return d; }
function csVal(h) { let v = 0, a = 0; for (const c of h) { const r = c.slice(0, -1); if (r === 'A') { a++; v += 11; } else v += /[JQK]/.test(r) || r === '10' ? 10 : +r; } while (v > 21 && a) { v -= 10; a--; } return v; }
const csCard = (c, hide) => hide ? '<span class="cscard back"></span>' : '<span class="cscard' + (/[♥♦]/.test(c) ? ' red' : '') + '">' + c + '</span>';
Casino.blackjack = function () {
  Casino.game = 'bj'; const B = Casino.bj || (Casino.bj = { st: 'bet', p: [], d: [], msg: 'Place your bet and deal.' });
  const draw = () => {
    const pv = csVal(B.p), dv = csVal(B.d), playing = B.st === 'play';
    Int.panel({ title: 'Blackjack', sub: 'Dealer stands on 17 · blackjack pays 3:2',
      body: '<div class="cshand"><small>Dealer' + (B.d.length ? ' · ' + (playing ? '?' : dv) : '') + '</small><div>' + B.d.map((c, i) => csCard(c, playing && i === 1)).join('') + '</div></div>' +
        '<div class="cshand"><small>You' + (B.p.length ? ' · ' + pv : '') + (B.dbl ? ' · doubled' : '') + '</small><div>' + B.p.map((c) => csCard(c)).join('') + '</div></div><p class="csmsg">' + B.msg + '</p>' + (playing ? '' : csBetRow()),
      btns: playing ? [['Hit', () => hit(), true], ['Stand', () => stand(), false], ['Double', () => dbl(), false, B.p.length !== 2 || save.money < B.stake]] : [['Deal (' + money(Casino.bet) + ')', () => deal(), true, save.money < Casino.bet]],
      pick: (v) => { if (!playing && v.indexOf('bet:') === 0) { Casino.bet = +v.slice(4); draw(); } } });
  };
  const end = (back, msg) => { B.st = 'bet'; const net = csSettle(B.stake, back, 'Blackjack'); B.msg = msg + (net > 0 ? ' · +' + money(net) : net < 0 ? ' · −' + money(-net) : ''); Casino.last = { game: 'bj', p: B.p.slice(), d: B.d.slice(), back, net }; draw(); };
  const deal = () => {
    if (!csTake(Casino.bet)) return; B.stake = Casino.bet; B.dbl = false; if (!Casino.deck || Casino.deck.length < 15) Casino.deck = csDeck(); const D = Casino.deck;
    B.p = [D.pop(), D.pop()]; B.d = [D.pop(), D.pop()]; B.st = 'play'; B.msg = 'Hit or stand?'; Snd.beep(700, 0.04);
    const pb = csVal(B.p) === 21, db = csVal(B.d) === 21;
    if (pb || db) { if (pb && db) end(B.stake, 'Both blackjack · push'); else if (pb) end(B.stake + Math.floor(B.stake * 1.5), 'BLACKJACK!'); else end(0, 'Dealer blackjack'); return; }
    draw();
  };
  const hit = () => { B.p.push(Casino.deck.pop()); Snd.beep(700, 0.03); if (csVal(B.p) > 21) end(0, 'Bust · ' + csVal(B.p)); else if (csVal(B.p) === 21) stand(); else draw(); };
  const dbl = () => { if (!csTake(B.stake)) return; B.stake *= 2; B.dbl = true; B.p.push(Casino.deck.pop()); if (csVal(B.p) > 21) end(0, 'Bust · ' + csVal(B.p)); else stand(); };
  const stand = () => {
    while (csVal(B.d) < 17) B.d.push(Casino.deck.pop()); const pv = csVal(B.p), dv = csVal(B.d);
    if (dv > 21) end(B.stake * 2, 'Dealer busts · ' + dv); else if (pv > dv) end(B.stake * 2, 'You win · ' + pv + ' to ' + dv); else if (pv === dv) end(B.stake, 'Push · ' + pv); else end(0, 'Dealer wins · ' + dv + ' to ' + pv);
  };
  Casino.bjPlay = { deal, hit, stand, dbl }; draw();
};
Casino.cashier = function () {
  const S = csSave(); Int.panel({ title: 'Cashier', sub: 'Your record at the tables', body: '<div class="vrec"><div><small>Won</small><b>' + money(S.won) + '</b></div><div><small>Lost</small><b>' + money(S.lost) + '</b></div><div><small>Biggest win</small><b>' + money(S.best) + '</b></div><div><small>Games</small><b>' + S.plays + '</b></div></div><p class="csmsg">' + (S.won > S.lost ? 'You are ahead. Most people leave before that changes.' : S.plays ? 'The house always wins. Eventually.' : 'Good luck in there.') + '</p>', btns: [] });
};

/* ---------- the room ---------- */
function csWheelTex() {
  const c = mkCanvas(512, 512), g = c.getContext('2d'), order = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
  g.fillStyle = '#4a2a14'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 37; i++) { const a0 = i / 37 * Math.PI * 2, a1 = (i + 1) / 37 * Math.PI * 2, n = order[i]; g.beginPath(); g.moveTo(256, 256); g.arc(256, 256, 250, a0, a1); g.closePath(); g.fillStyle = n === 0 ? '#1a8a3a' : CS_RED.includes(n) ? '#b81c1c' : '#141414'; g.fill();
    g.save(); g.translate(256, 256); g.rotate((a0 + a1) / 2); g.fillStyle = '#fff'; g.font = 'bold 20px sans-serif'; g.textAlign = 'center'; g.fillText(String(n), 220, 7); g.restore(); }
  g.fillStyle = '#6a4424'; g.beginPath(); g.arc(256, 256, 165, 0, Math.PI * 2); g.fill(); g.fillStyle = '#d8b040'; g.beginPath(); g.arc(256, 256, 40, 0, Math.PI * 2); g.fill();
  return canvasTex(c, true, false);
}
INT_KINDS.casino = { name: 'Casino', rooms: { main(K, rec) {
  Casino.css();
  const { W, D } = intDims(rec, 30, 24); K.shell({ W, D, H: 5, floor: 0x6a1420, wall: 0x2a0e14, ceil: 0x140a0e, trim: 0xd8a830, lamp: 0xffd890, lightI: 0.8 });
  for (let x = Math.ceil(K.x0) + 1; x < K.x1; x += 2) K.box(x - 0.03, 0, K.z0, x + 0.03, 0.004, K.z1, 0x8a2a30);   /* the carpet's pattern */
  K.sign(rec.name.toUpperCase(), 0, 4.1, K.z0 + 0.04, Math.min(W - 6, 10), 0.9, 0, { fg: '#ffd84a', bg: '#2a0a12' });
  K.glow(K.x0 + 0.5, 4.6, K.z0 + 0.05, K.x1 - 0.5, 4.66, K.z0 + 0.1, 0xff3ad8, 1.6); K.glow(K.x0 + 0.05, 4.6, K.z0 + 0.5, K.x0 + 0.1, 4.66, K.z1 - 0.5, 0x3ad8ff, 1.6); K.glow(K.x1 - 0.1, 4.6, K.z0 + 0.5, K.x1 - 0.05, 4.66, K.z1 - 0.5, 0x3ad8ff, 1.6);
  /* chandeliers */
  for (const x of [-W / 4, W / 4]) { K.cyl(x, 4.2, 0, 0.6, 0.3, 0xd8a830); K.glow(x - 0.45, 4.05, -0.45, x + 0.45, 4.2, 0.45, 0xfff0c0, 1.4); K.light(x, 3.8, 0, 0xffe0a0, 0.9, 14); }
  /* slot machines along the left wall: a cabinet, a glowing screen that flashes when it pays, a stool and a gambler at some */
  Casino.machines = []; const n = Math.max(4, Math.floor((D - 6) / 1.3));
  for (let i = 0; i < n; i++) {
    const z = K.z0 + 2.2 + i * 1.3, x = K.x0 + 0.6; K.box(x - 0.4, 0, z - 0.45, x + 0.35, 1.7, z + 0.45, [0x8a1a2a, 0x1a2a8a, 0x8a6a1a][i % 3], true); K.box(x + 0.35, 0.95, z - 0.4, x + 0.5, 1.0, z + 0.4, 0x1a1a1a);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.42), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.6, 0.5, 1.2) })); scr.position.set(x + 0.36, 1.3, z); scr.rotation.y = Math.PI / 2; K.sc.add(scr);
    const M = { x, z, scr, flash: 0, ph: i * 0.7 }; Casino.machines.push(M);
    K.chair(x + 1.0, z, -Math.PI / 2, 0x2a2a30, true);
    if (i % 2 === 1) K.person({ x: x + 1.0, z, yaw: -Math.PI / 2, kind: 'sit', sy: 0.3 });
    K.act(x + 1.0, z, 0.9, 'Play the slot machine', () => Casino.slots(M), { wide: true });
  }
  /* the roulette table in the middle, its wheel spinning when you play */
  const rx = 0, rz = K.z0 + D * 0.38; K.box(rx - 1.6, 0, rz - 0.9, rx + 1.6, 0.85, rz + 0.9, 0x3a2414, true); K.box(rx - 1.5, 0.85, rz - 0.8, rx + 1.5, 0.88, rz + 0.8, 0x1a6a3a);
  K.box(rx - 1.62, 0.85, rz - 0.92, rx + 1.62, 0.93, rz - 0.82, 0x5a3a20); K.box(rx - 1.62, 0.85, rz + 0.82, rx + 1.62, 0.93, rz + 0.92, 0x5a3a20);
  { const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.06, 37), [new THREE.MeshStandardMaterial({ color: lc(0x5a3a20) }), new THREE.MeshBasicMaterial({ map: csWheelTex() }), new THREE.MeshStandardMaterial({ color: lc(0x5a3a20) })]); wh.position.set(rx - 0.9, 0.93, rz); K.sc.add(wh); Casino.wheel = wh;
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 8), new THREE.MeshStandardMaterial({ color: lc(0xf8f8f8), roughness: 0.2 })); ball.position.set(rx - 0.9 + 0.42, 0.98, rz); K.sc.add(ball); Casino.ball = ball; Casino.wc = [rx - 0.9, rz]; }
  for (let k = 0; k < 12; k++) K.box(rx - 0.2 + (k % 6) * 0.25, 0.885, rz - 0.6 + Math.floor(k / 6) * 0.5, rx - 0.0 + (k % 6) * 0.25, 0.89, rz - 0.2 + Math.floor(k / 6) * 0.5, k % 2 ? 0xb81c1c : 0x141414);
  intStaff(K, rx, rz - 1.4, 0, 0x141414, { suit: true });
  K.person({ x: rx + 1.2, z: rz + 1.5, yaw: Math.PI, kind: 'stand', talk: true }); K.person({ x: rx - 0.4, z: rz + 1.5, yaw: Math.PI, kind: 'stand' });
  K.act(rx, rz + 1.4, 1.6, 'Play roulette', () => Casino.roulette(), { wide: true });
  /* two blackjack tables, half moons of green felt */
  for (const k of [0, 1]) {
    const bz = K.z0 + D * (k ? 0.68 : 0.38), x = W * 0.28;
    K.cyl(x, 0, bz, 1.2, 0.85, 0x3a2414, true); K.cyl(x, 0.85, bz, 1.12, 0.03, 0x1a6a3a); K.box(x - 1.15, 0.85, bz - 1.25, x + 1.15, 0.95, bz - 0.4, 0x2a0e14);
    for (let j = 0; j < 4; j++) K.box(x - 0.5 + j * 0.25, 0.885, bz + 0.2, x - 0.35 + j * 0.25, 0.89, bz + 0.42, 0xf2f2f2);
    intStaff(K, x, bz - 0.9, 0, 0x141414, { suit: true });
    for (const s of [-1, 1]) K.chair(x + s * 0.8, bz + 1.15, Math.PI + s * 0.4, 0x2a2a30, true);
    if (k) K.person({ x: x + 0.8, z: bz + 1.15, yaw: Math.PI + 0.4, kind: 'sit', sy: 0.3 });
    K.act(x, bz + 1.4, 1.5, 'Play blackjack', () => Casino.blackjack(), { wide: true });
  }
  K.sign('BLACKJACK', W * 0.28, 2.6, K.z0 + D * 0.38 - 1.5, 2, 0.4, 0, { fg: '#ffd84a', bg: '#1a0a10' });
  /* the bar along the back, the cashier's cage by the door */
  const bz = K.z0 + 1.0; K.counter(-W * 0.1, bz - 0.4, W * 0.35, bz + 0.4, 0x3a1a20, 0xd8a830); K.glow(-W * 0.1, 1.05, bz - 0.45, W * 0.35, 1.08, bz - 0.4, 0xff3ad8, 1.2);
  for (let k = 0; k < 8; k++) K.cyl(-W * 0.1 + 0.4 + k * 0.5, 1.5, K.z0 + 0.2, 0.06, 0.32, [0x3a8a3a, 0xc8a050, 0x8a2a2a, 0xe8e8f0][k % 4]);
  intStaff(K, W * 0.12, bz - 0.9, 0, 0xf2f2f2, { suit: true });
  K.act(W * 0.12, bz + 1.0, 1.4, 'Buy a drink ($15)', () => { if (!csTake(15)) return; Vit.eat(0, 10, 22); writeSave(); Snd.beep(900, 0.05); Int.say('Cheers. On the house it was not.', 2.4); }, { wide: true });
  const cx = K.x1 - 2, cz = K.z1 - 3; K.counter(cx - 1.2, cz - 0.4, cx + 1.2, cz + 0.4, 0x2a2a30, 0xd8a830); for (let k = 0; k < 6; k++) K.box(cx - 1.2 + k * 0.48, 1.0, cz - 0.02, cx - 1.17 + k * 0.48, 2.3, cz + 0.02, 0xd8a830);
  K.sign('CASHIER', cx, 2.6, cz, 1.8, 0.4, Math.PI, { fg: '#ffd84a', bg: '#1a0a10' }); intStaff(K, cx, cz - 0.9, 0, 0x2a2a30);
  K.act(cx, cz + 1.0, 1.4, 'Cashier: your record', () => Casino.cashier(), { wide: true });
  /* a security guard, and someone wandering between the tables */
  K.person({ x: K.x1 - 1.0, z: K.z0 + D * 0.5, yaw: -Math.PI / 2, kind: 'stand', shirt: 0x141414, pants: 0x141414, face: true });
  K.person({ x: -1, z: K.z0 + D * 0.6, kind: 'walk', path: [[-2, K.z0 + D * 0.6, 3], [3, K.z0 + D * 0.55, 2], [2, K.z1 - 3, 3], [-3, K.z1 - 4, 2]] });
  /* the wheel spins, the machines flash */
  K.tick((dt, t) => {
    if (Casino.wheel) { if (Casino.spinT > 0) { Casino.spinT -= dt; const k = Math.max(0, Casino.spinT / 3.2); Casino.wheel.rotation.y += dt * (1 + 9 * k); const a = -t * (2 + 14 * k), r = 0.42 - 0.12 * (1 - k); Casino.ball.position.set(Casino.wc[0] + Math.cos(a) * r, 0.98, Casino.wc[1] + Math.sin(a) * r); if (Casino.spinT <= 0 && Casino.spinDone) { const d = Casino.spinDone; Casino.spinDone = null; d(); } } else Casino.wheel.rotation.y += dt * 0.2; }
    for (const M of Casino.machines) { M.flash = Math.max(0, M.flash - dt); const f = M.flash > 0 ? 1.5 + Math.sin(t * 30) : 0.6 + 0.25 * Math.sin(t * 2 + M.ph); M.scr.material.color.setRGB(f * 0.9, f * (0.5 + 0.4 * Math.sin(t + M.ph)), f * 1.3); }
  });
} } };
/* the panel's styles: reels, number board, cards */
Casino.css = function () {
  if (document.getElementById('csCss')) return; const s = document.createElement('style'); s.id = 'csCss';
  s.textContent = '.csreels{display:flex;gap:10px;justify-content:center;margin:8px 0}.csreels span{font-size:44px;width:74px;height:74px;display:grid;place-items:center;background:#0e0a10;border:2px solid #d8a830;border-radius:10px}' +
    '.csmsg{text-align:center;font-weight:600;margin:6px 0}.csmoney{text-align:center;margin:4px 0;opacity:.85}.csbets,.csouts{display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin:6px 0}' +
    '.csnums{display:grid;grid-template-columns:repeat(13,1fr);gap:3px;margin:6px 0}.csn{border:0;border-radius:4px;color:#fff;font:600 13px Rajdhani,system-ui,sans-serif;padding:5px 0;cursor:pointer}.csn.r{background:#b81c1c}.csn.k{background:#222}.csn.g{background:#1a8a3a}.csn.on{outline:2px solid #ffd84a}' +
    '.cshist{text-align:center}.cshist span{display:inline-block;min-width:24px;margin:1px;border-radius:4px;color:#fff;font-weight:600}.cshist .r{background:#b81c1c}.cshist .k{background:#222}.cshist .g{background:#1a8a3a}' +
    '.cshand{margin:6px 0}.cshand small{opacity:.8}.cshand div{display:flex;gap:6px;min-height:62px}.cscard{width:44px;height:60px;border-radius:6px;background:#f8f6f0;color:#141414;display:grid;place-items:center;font:700 17px Rajdhani,system-ui,sans-serif}.cscard.red{color:#c01c1c}.cscard.back{background:repeating-linear-gradient(45deg,#8a1a2a 0 6px,#5a0e1a 6px 12px)}';
  document.head.appendChild(s);
};
