/* Tuning setups: (1) a stock setup leaves every car's physics numbers exactly as the car definition has them; (2) the tuning screen's predictions (quarter mile, top speed)
   match real runs of the car physics on the drag strip, stock and tuned; (3) every group of sliders moves the car the way it says; (4) setups are per car and only the
   changed values are stored; (5) the tuning pane renders.   usage: node tests/tuning1.js */
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 640, height: 360 } })).newPage();
  const logs = []; page.on('pageerror', (e) => logs.push('PAGEERROR: ' + String(e.stack || e).slice(0, 500)));
  await page.route('**/three.min.js', (r) => r.fulfill({ path: path.resolve(__dirname, 'three.min.js'), contentType: 'application/javascript' }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.addInitScript(() => { window.__noAdapt = true; try { localStorage.setItem('island-rush-v1', JSON.stringify({ set: { quality: 'low' } })); } catch (e) { /* ignore */ } });
  await page.goto('file://' + path.resolve(__dirname, '../dist/test.html'));
  await page.waitForFunction(() => window.__ready || window.__bootError, null, { timeout: 170000 });
  const res = await page.evaluate(async () => {
    const g = window.__game, S = g.Setup, out = { stock: [], runs: [], dir: {}, store: {} }; g.App.start();
    const pad = { connected: true, axes: [0, 0], buttons: Array.from({ length: 16 }, () => ({ value: 0, pressed: false })) }; navigator.getGamepads = () => [pad];
    /* 1. stock = untouched */
    for (const d of g.CARS) {
      const T0 = { Tmax: d.t.Tmax, mu: d.t.mu, cd: d.t.cd, cl: d.t.cl || 0, brk: d.t.brk, off: d.t.off }, p = S.base(d), v = {}; for (const t of g.TU) v[t.k] = S.defOf(t, p);
      const r = S.derive(d, T0, v); let worst = 0;
      for (const k of ['fd', 'rsf', 'ab', 'cgh', 'cf', 'cr', 'a', 'b', 'rd']) worst = Math.max(worst, Math.abs(r.P[k] - p[k]));
      for (let i = 0; i < p.gears.length; i++) worst = Math.max(worst, Math.abs(r.P.gears[i] - p.gears[i]));
      for (const k of ['cl', 'cd', 'brk', 'off', 'Tmax', 'mu']) worst = Math.max(worst, Math.abs(r.T[k] - T0[k]));
      for (const k of ['latF', 'latR', 'lonF', 'lonR', 'rrK', 'sk', 'tqSkew']) worst = Math.max(worst, Math.abs(r.P[k] - 1));
      worst = Math.max(worst, Math.abs(r.P.tc - 0.7), Math.abs(r.P.nitK - 1.32), Math.abs(r.P.nitDrain - 24), Math.abs(r.P.bb));
      out.stock.push([d.id, worst]);
    }
    /* 2. predictions against real runs on the strip (far wall and side walls moved away) */
    window.__real = async (id, preset, secs) => {   /* secs of flat-out running: 70 to see the top speed, 18 for the quarter mile only (long runs without rendering grow the browser's memory) */
      g.save.owned[id] = true; if (g.Drag.on) g.Drag.exit(true); g.App.setCar(id); S.preset(preset); g.App.mode = 'rlobby'; g.Drag.tier = 0; await g.Drag.start();
      const D = g.Drag, car = g.car, dt = 1 / 120; g.DG.END = 12000; g.DG.HW = 400; let n = 0, vmax = 0;
      const gr = D.ground; D.ground = (x, z, o) => { gr(x, z, o); o.mu = 1; o.rr = 0.014; o.road = true; };   /* the predictions are for plain dry tarmac, not the strip's sticky launch pad */
      while (n++ < 120 * (secs + 15) && !(D.phase === 'run' && D.clock > D.tGreen + secs)) { const al = Math.atan2((g.DG.X0 - g.DG.LANE) - car.x, 30) - car.yaw; pad.axes[0] = -Math.max(-1, Math.min(1, al * 4)); pad.buttons[7].value = D.phase === 'run' || D.phase === 'done' ? 1 : 0; g.stepSim(dt); vmax = Math.max(vmax, Math.abs(car.speed)); if (D.phase === 'done') D.phase = 'run'; }
      /* cornering: 22 m/s, full left lock */
      car.vx = 0; car.vz = 22; car.speed = 22; car.yaw = 0; car.w = 0; car.x = g.DG.X0; let ay = 0, k = 0;
      for (let i = 0; i < 480; i++) { pad.axes[0] = -1; pad.buttons[7].value = Math.abs(car.speed) < 22 ? 0.6 : 0.2; g.stepSim(dt); if (i > 160) { ay += Math.abs(car.speed * car.w); k++; } }
      const B = S.both(); g.DG.END = 830; g.DG.HW = 9.4; D.ground = gr;
      return { id, preset, qm: +(D.me.tFin - D.me.tBeam).toFixed(2), estQm: +B.now.qm.toFixed(2), long: secs > 60, top: Math.round(vmax * 3.6), estTop: Math.round(B.now.top * 3.6), latG: +(ay / k / 9.81).toFixed(2), estG: +B.now.gLo.toFixed(2) };
    };
    return out;
  });
  for (const [id, pr, secs] of [['rook', 'Stock', 70], ['rook', 'Drag', 18], ['rook', 'Top speed', 70], ['rook', 'Grip', 18], ['phantom', 'Stock', 18], ['phantom', 'Drag', 18]]) res.runs.push(await page.evaluate(([a, b, c]) => window.__real(a, b, c), [id, pr, secs]));
  Object.assign(res, await page.evaluate(async () => {
    const g = window.__game, S = g.Setup, out = { dir: {}, store: {} }; g.Drag.exit(true);
    /* 3. directions, from the estimator, on the Vanta S (rear drive, has a wing) and the Phantom R (all-wheel drive) */
    g.save.owned.vanta = true; g.App.setCar('vanta'); S.preset('Stock');
    const est = (ch) => { S.preset('Stock'); for (const k in ch) S.set(k, ch[k]); return S.both().now; }, base = est({});
    const D2 = out.dir; D2.base = base;
    D2.shortFd = est({ fd: 1.25 }); D2.longFd = est({ fd: 0.8 }); D2.wing = est({ wingF: 9, wingR: 9 }); D2.noWing = est({ wingF: 0, wingR: 0 });
    D2.arbRear = est({ arbR: 10, arbF: 2 }); D2.arbFront = est({ arbF: 10, arbR: 2 }); D2.camber = est({ camF: -2.5, camR: -2.5 }); D2.psiLow = est({ psiF: 22, psiR: 22 }); D2.psiHigh = est({ psiF: 38, psiR: 38 });
    D2.biasF = est({ bias: 12 }); D2.biasR = est({ bias: -12 }); D2.rearBallast = est({ ballast: -4 }); D2.wingRearOnly = est({ wingR: 10, wingF: 0 }); D2.bigJet = est({ nit: 1 }); D2.lowBand = est({ band: -1 });
    S.preset('Stock');
    g.save.owned.phantom = true; g.App.setCar('phantom'); S.preset('Stock'); const pb = S.both().now; S.set('cdiff', 85); const pr = S.both().now; S.set('cdiff', 30); const pf = S.both().now; S.preset('Stock'); D2.awd = { base: pb.qm, rear: pr.qm, front: pf.qm, hasRow: /Centre diff/.test(S.pane()) };
    /* 4. per car, sparse */
    g.App.setCar('rook'); S.preset('Stock'); S.set('fd', 1.2); S.set('wingR', 3); const rookFd = g.CARP.fd; g.App.setCar('vanta'); const vantaFd = g.CARP.fd, vantaStock = g.CARS.find((d) => d.id === 'vanta').p.fd; g.App.setCar('rook');
    out.store = { rookFd, rookStock: g.CARS[0].p.fd, vantaFd, vantaStock, back: g.CARP.fd, saved: JSON.stringify(g.save.setup.rook), defGears: g.CARS[0].p.gears.join(',') };
    /* 5. the pane */
    const html = S.pane(); out.pane = { sliders: (html.match(/type="range"/g) || []).length, tiles: (S.statsHtml().match(/<small>/g) || []).length, awdRowOnRook: /Centre diff/.test(html), presets: (html.match(/data-act="tupre"/g) || []).length };
    S.preset('Stock');
    return out;
  }));
  let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
  const w = Math.max(...res.stock.map((s) => s[1]));
  ok(w < 1e-9, 'a stock setup reproduces every car\'s own numbers exactly (' + res.stock.length + ' cars, worst difference ' + w.toExponential(1) + ')');
  for (const r of res.runs) {
    console.log(JSON.stringify(r));
    ok(Math.abs(r.qm - r.estQm) / r.qm < 0.035, r.id + ' ' + r.preset + ': predicted quarter mile ' + r.estQm + ' s, real run ' + r.qm + ' s');
    if (r.long) ok(Math.abs(r.top - r.estTop) / r.top < 0.03, r.id + ' ' + r.preset + ': predicted top speed ' + r.estTop + ' km/h, real run ' + r.top + ' km/h');
  }
  const by = (id, p) => res.runs.find((r) => r.id === id && r.preset === p);
  ok(by('rook', 'Drag').qm < by('rook', 'Stock').qm - 0.15, 'the Drag preset really is quicker over the quarter (' + by('rook', 'Drag').qm + ' vs ' + by('rook', 'Stock').qm + ' s)');
  ok(by('rook', 'Top speed').top > by('rook', 'Stock').top + 8, 'the Top speed preset really is faster flat out (' + by('rook', 'Top speed').top + ' vs ' + by('rook', 'Stock').top + ' km/h)');
  ok(by('rook', 'Grip').latG > by('rook', 'Stock').latG + 0.03, 'the Grip preset really corners harder (' + by('rook', 'Grip').latG + ' vs ' + by('rook', 'Stock').latG + ' g at full lock)');
  const d = res.dir, b = d.base, f = (x) => +x.toFixed(3);
  ok(Math.abs(d.shortFd.t100 - b.t100) > 0.02 && Math.abs(d.longFd.t100 - b.t100) > 0.02 && d.shortFd.t200 !== d.longFd.t200, 'final drive: 0-100 in ' + f(d.shortFd.t100) + ' s short, ' + f(b.t100) + ' stock, ' + f(d.longFd.t100) + ' long (top speed ' + Math.round(d.shortFd.top * 3.6) + ' / ' + Math.round(b.top * 3.6) + ' / ' + Math.round(d.longFd.top * 3.6) + ' km/h. On this car the tyres limit the launch and power limits the top speed, so a long final drive that reaches 100 without a gear change is the quick one)');
  ok(d.wing.gHi > b.gHi + 0.05 && d.wing.top < b.top && d.noWing.top > b.top && d.noWing.gHi < b.gHi, 'wings: grip at 200 km/h ' + f(d.noWing.gHi) + ' / ' + f(b.gHi) + ' / ' + f(d.wing.gHi) + ' g, top speed ' + Math.round(d.noWing.top * 3.6) + ' / ' + Math.round(b.top * 3.6) + ' / ' + Math.round(d.wing.top * 3.6));
  ok(d.arbRear.balLo < b.balLo - 0.01 && d.arbFront.balLo > b.balLo + 0.01, 'roll bars: stiff rear moves the balance to oversteer (' + f(d.arbRear.balLo) + '), stiff front to understeer (' + f(d.arbFront.balLo) + '), stock ' + f(b.balLo));
  ok(d.camber.gLo > b.gLo && d.camber.stop > b.stop, 'camber: -2.5 deg corners harder (' + f(d.camber.gLo) + ' vs ' + f(b.gLo) + ' g) and stops longer (' + f(d.camber.stop) + ' vs ' + f(b.stop) + ' m)');
  ok(d.psiHigh.gLo < b.gLo && d.psiHigh.top > b.top && d.psiLow.top < b.top, 'pressures: 38 psi loses grip (' + f(d.psiHigh.gLo) + ' g) and rolls freer (' + f(d.psiHigh.top * 3.6) + ' km/h), 22 psi drags (' + f(d.psiLow.top * 3.6) + '), stock ' + f(b.top * 3.6));
  ok(d.biasF.stop > b.stop && d.biasR.stop > b.stop, 'brake bias: stock stops in ' + f(b.stop) + ' m, 12% forward ' + f(d.biasF.stop) + ' m, 12% rearward ' + f(d.biasR.stop) + ' m');
  ok(d.rearBallast.qm < b.qm && d.rearBallast.front < b.front, 'ballast: weight to the rear launches a rear-drive car harder (' + f(d.rearBallast.qm) + ' vs ' + f(b.qm) + ' s)');
  ok(d.wingRearOnly.balHi > b.balHi + 0.02, 'aero balance: all rear wing pushes the fast-corner balance to understeer (' + f(d.wingRearOnly.balHi) + ' vs ' + f(b.balHi) + ')');
  ok(Math.abs(d.bigJet.qmN - b.qmN) > 0.02 && Math.abs(d.bigJet.qm - b.qm) < 0.005, 'nitro jet: the big jet changes the nitro quarter mile (' + f(d.bigJet.qmN) + ' vs ' + f(b.qmN) + ' s: it is spent in 2.4 s, much of it while the tyres are still the limit) and changes nothing without');
  ok(Math.abs(d.lowBand.t100 - b.t100) > 0.01, 'power band: low-end tune changes 0-100 (' + f(d.lowBand.t100) + ' vs ' + f(b.t100) + ' s)');
  ok(d.awd.hasRow && d.awd.rear !== d.awd.base && d.awd.front !== d.awd.base, 'centre diff (all-wheel drive only): quarter mile ' + f(d.awd.front) + ' s at 70/30 front, ' + f(d.awd.base) + ' stock, ' + f(d.awd.rear) + ' at 15/85 rear');
  const s = res.store;
  ok(Math.abs(s.rookFd - s.rookStock * 1.2) < 1e-6 && Math.abs(s.vantaFd - s.vantaStock) < 1e-9 && Math.abs(s.back - s.rookFd) < 1e-9, 'setups are per car: the Rook keeps its 1.2x final drive, the Vanta stays stock');
  ok(s.saved === '{"fd":1.2}', 'only changed values are stored (' + s.saved + ')');
  ok(res.pane.sliders === 20 && !res.pane.awdRowOnRook && res.pane.tiles === 12 && res.pane.presets === 6, 'the tuning pane renders ' + res.pane.sliders + ' sliders, ' + res.pane.tiles + ' figures and ' + res.pane.presets + ' presets for a rear-drive car');
  console.log(logs.length ? logs.join('\n') : 'no page errors'); console.log(fails ? fails + ' FAILED' : 'ALL OK');
  await browser.close(); process.exit(fails || logs.length ? 1 : 0);
})();
