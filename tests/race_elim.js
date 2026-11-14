/* Elimination races on the circuit: one lap per rival, and at the end of every lap the last car across the line is knocked out and leaves the track.
   1. You stay parked on the grid: you are the first car out at the end of lap 1, in last place, and your race ends there.
   2. You are carried round the racing line faster than anyone: the rivals go out one per lap, from the back, and you are the last car standing.
   usage: node tests/race_elim.js   (needs dist/test.html: bash build.sh) */
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 640, height: 360 } })).newPage(); const logs = [];
  page.on('pageerror', (e) => logs.push('PAGEERROR: ' + String(e.stack || e).slice(0, 400)));
  page.on('console', (m) => { if (m.type() === 'error' && !/net::ERR|Failed to load resource/.test(m.text())) logs.push('console: ' + m.text().slice(0, 400)); });
  await page.route('**/three.min.js', (r) => r.fulfill({ path: path.resolve(__dirname, 'three.min.js'), contentType: 'application/javascript' }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.addInitScript(() => { window.__noAdapt = true; try { localStorage.setItem('island-rush-v1', JSON.stringify({ set: { quality: 'low' } })); } catch (e) { /* ignore */ } });
  await page.goto('file://' + path.resolve(__dirname, '../dist/test.html'));
  await page.waitForFunction(() => window.__ready || window.__bootError, null, { timeout: 170000 });
  const res = await page.evaluate(() => {
    const g = window.__game, R = g.Race, out = {}; g.App.start();
    const run = (drive) => {
      R.cfg.fmt = 1; R.cfg.diff = 0; R.cfg.n = 3; g.App.mode = 'rlobby'; R.paint(); const lobby = document.querySelector('#rl') ? document.querySelector('#rl').textContent : '';
      R.start(); if (!R.on) return { err: 'did not start' };
      const o = { N: R.N, cars: R.ents.length, lobbyOK: /Elimination/.test(lobby) && /one per rival/.test(lobby), outs: [], money0: g.save.money }; let t = 0, s = null; const dt = 1 / 60, q = {};
      while (t < 900 && !R.res) {
        if (drive && R.phase === 'run') {   /* carry the player round the racing line at 62 m/s */
          if (s == null) s = g.Track.cum[g.Track.nearestIdx(g.car.x, g.car.z)]; s = (s + 62 * dt) % g.Track.L; g.Track.at(s, 0, q);
          const c = g.car; c.x = q.x; c.z = q.z; c.yaw = q.yaw; c.vx = Math.sin(q.yaw) * 62; c.vz = Math.cos(q.yaw) * 62; c.speed = 62; c.w = 0; c.air = false;
        }
        const before = R.ents.filter((e) => e.out).length; g.stepSim(dt); t += dt;
        for (const e of R.ents) if (e.out && !o.outs.some((x) => x.name === e.name)) o.outs.push({ name: e.name, me: !!e.me, lap: e.outLap, place: e.place, botsLeft: g.Bots.list.length, t: +t.toFixed(0) });
        if (R.ents.filter((e) => e.out).length > before + 1) o.double = true;
      }
      const me = R.me; o.simT = +t.toFixed(0); o.res = !!R.res; o.myPos = me.pos; o.meOut = me.out; o.myLap = me.outLap; o.prize = R.res ? R.res.prize : 0; o.title = (document.querySelector('#rresP h2') || {}).textContent || '';
      o.rec = Object.assign({}, g.save.race.elim); R.end(false); return o;
    };
    out.parked = run(false); out.fast = run(true); return out;
  });
  let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
  const P = res.parked, F = res.fast; console.log(JSON.stringify(P)); console.log(JSON.stringify(F));
  ok(!P.err && P.lobbyOK && P.N === 3 && P.cars === 4, 'the lobby offers Elimination with one lap per rival (' + P.N + ' laps, ' + P.cars + ' cars)');
  ok(P.res && P.meOut && P.outs.length >= 1 && P.outs[0].me && P.outs[0].lap === 1 && P.myPos === 4, 'parked on the grid you are the first out, at the end of lap 1, in last place (' + P.title + ')');
  ok(F.res && !F.meOut && F.myPos === 1 && /LAST CAR STANDING/.test(F.title), 'quickest round: you are the last car standing (' + F.title + ')');
  ok(F.outs.length === 3 && F.outs.every((x, i) => !x.me && x.lap === i + 1 && x.place === 4 - i && x.botsLeft === 2 - i), 'one rival goes out each lap, from the back, and leaves the track (' + F.outs.map((x) => x.name + ' L' + x.lap + ' P' + x.place).join(', ') + ')');
  ok(!F.double && !P.double, 'never more than one car out at a time');
  ok(F.prize > P.prize && F.rec.runs === 2 && F.rec.wins === 1, 'the win pays more (' + F.prize + ' vs ' + P.prize + ') and the record counts 2 runs, 1 win');
  console.log(logs.length ? logs.slice(0, 6).join('\n') : 'no page or console errors'); console.log(fails ? fails + ' FAILED' : 'ALL OK');
  await browser.close(); process.exit(fails || logs.length ? 1 : 0);
})();
