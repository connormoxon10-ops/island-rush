/* Dev mode: teleports to every town, place (each heist ramp too) and named beach (and onto the viaduct behind each train), and the train-heist controls
   for each of the three heists (pick it, start at the ramp, bring the open wagon round, skip the jump, take the prize, skip to the garage, reset, give,
   train speed). Each lands the car where it says, on the
   ground, and leaves the heist in the state it says. Opens the dev tab to check it draws.   usage: node tests/dev_places.js   (needs dist/test.html) */
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await (await browser.newContext({ viewport: { width: 960, height: 540 } })).newPage(); const logs = [];
  page.on('pageerror', (e) => logs.push('PAGEERROR: ' + String(e.stack || e).slice(0, 500)));
  await page.route('**/three.min.js', (r) => r.fulfill({ path: path.resolve(__dirname, 'three.min.js'), contentType: 'application/javascript' }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.addInitScript(() => { window.__noAdapt = true; try { localStorage.setItem('island-rush-v1', JSON.stringify({ set: { quality: 'low', dev: true } })); } catch (e) { /* ignore */ } });
  await page.goto('file://' + path.resolve(__dirname, '../dist/test.html'));
  await page.waitForFunction(() => window.__ready || window.__bootError, null, { timeout: 170000 });
  let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
  const r = await page.evaluate(() => {
    const g = window.__game, UI = g.UI, c = g.car; g.App.start(); window.requestAnimationFrame = () => 0; window.__now = performance.now();
    const run = (n) => { for (let i = 0; i < n; i++) { window.__now += 1000 / 30; g.frame(window.__now); } };
    let pane = true; try { UI.openMenu('dev'); UI.closeMenu(); } catch (e) { pane = String(e); }
    const res = [], at = (label, x, z, tol) => { run(15); const gr = {}; g.groundAt(c.x, c.z, gr); res.push({ label, d: +Math.hypot(c.x - x, c.z - z).toFixed(1), dy: +(c.y - gr.h).toFixed(2), tol }); };
    g.towns.forEach((t, i) => { UI.devAct('tp' + i); at(t.name, t.cx, t.cz, t.half + 40); });
    for (const p of g.DEV_PLACES) { const q = p[2](); if (!q) { res.push({ label: p[1], missing: true }); continue; } UI.devAct('pl:' + p[0]); at(p[1], q[0], q[1], 3); }
    g.Surf.beaches.forEach((b, i) => { UI.devAct('bch' + i); at(b.name, b.px, b.pz, 3); });
    const onDeck = g.Rail.trains.map((T) => { UI.devAct('hz:train' + T.k); run(10); const tr = {}; g.Rail.near(c.x, c.z, tr); const L = {}; g.Rail.toLocal(T.heist, c.x, c.y, c.z, L); return Math.abs(c.y - (tr.y + 0.05)) < 0.8 && Math.abs(tr.lat) < 2.5 && L.z < -T.heist.L / 2 - 20 && L.z > -T.heist.L / 2 - 60; });
    /* the train heists, each in turn */
    const H = g.Heist, sts = [];
    for (let k = 0; k < g.HEIST_PRIZES.length; k++) {
    const P = g.HEIST_PRIZES[k], st = { id: P.id }; sts.push(st); UI.devAct('hz:pick' + k); st.picked = H.k === k;
    UI.devAct('hz:start'); run(5); st.start = H.phase; st.near = Math.hypot(c.x - H.site.sx, c.z - H.site.sz) < 30;
    UI.devAct('hz:cue'); st.eta = +H.doorEta().toFixed(1);
    UI.devAct('hz:board'); run(30); st.board = H.phase; const L = {}; g.Rail.toLocal(H.wagon(), c.x, c.y, c.z, L); st.inWagon = Math.abs(L.x) < 0.5 && Math.abs(L.y - 1.32) < 0.3;
    UI.devAct('hz:take'); run(5); st.take = H.phase; st.car = g.save.car === P.id;
    UI.devAct('hz:home'); run(10); st.home = H.phase; st.homeD = Math.round(Math.hypot(c.x - g.GAR.ox, c.z - g.GAR.oz));
    g.spawnAt(g.GAR.ox, g.GAR.oz - 6, Math.PI); run(20); st.won = !!g.save.owned[P.id];
    UI.devAct('hz:reset'); st.reset = !g.save.owned[P.id] && H.phase === 'idle' && !!H.gold;
    UI.devAct('hz:give'); st.give = !!g.save.owned[P.id] && !H.gold;
    }
    const st = {};
    UI.devAct('hz:v0'); run(10); const s0 = g.Rail.s; run(10); st.stopped = g.Rail.s === s0; UI.devAct('hz:v22');
    return { pane, res, onDeck, sts, st };
  });
  ok(r.pane === true, 'the dev tab draws');
  for (const p of r.res) ok(!p.missing && p.d <= p.tol && Math.abs(p.dy) < 0.6, 'teleport: ' + p.label + (p.missing ? ' (missing)' : ' (' + p.d + ' m from the spot, ' + p.dy + ' m off the ground)'));
  ok(r.onDeck.length === 3 && r.onDeck.every(Boolean), 'teleport: onto the viaduct deck behind each train (' + r.onDeck.join(', ') + ')');
  for (const s of r.sts) { console.log(JSON.stringify(s)); const n = s.id + ': ';
    ok(s.picked, n + 'pick it in the dev tab');
    ok(s.start === 'armed' && s.near, n + 'start at its ramp');
    ok(Math.abs(s.eta - 8) < 1, n + 'bring the open wagon round (door in ' + s.eta + ' s)');
    ok(s.board === 'aboard' && s.inWagon, n + 'skip the jump, parked in its wagon');
    ok(s.take === 'ride' && s.car, n + 'take the prize car');
    ok(s.home === 'escape' && s.homeD < 60, n + 'skip to the garage (' + s.homeD + ' m away)');
    ok(s.won, n + 'driving in completes it');
    ok(s.reset, n + 'reset puts the car back on its train');
    ok(s.give, n + 'give me the car'); }
  ok(r.st.stopped, 'train speed: stop');
  console.log(logs.length ? logs.join('\n') : 'no page errors'); ok(!logs.length, 'no page errors');
  console.log(fails ? fails + ' FAILED' : 'ALL OK'); await browser.close(); process.exit(fails ? 1 : 0);
})();
