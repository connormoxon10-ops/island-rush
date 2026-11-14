/* Drag strip: boots the game, goes to the line in every bracket and makes runs with the real car physics on a faked gamepad:
   a clean launch 0.25 s after green, a jump start (must red-light and lose), then run-again and leaving the strip (the island must come back).
   usage: node tests/drag1.js   env SHOTS=1 for screenshots (staged, mid-run, finish) into OUT or tests/ (slow in software GL) */
const { chromium } = require('playwright');
const path = require('path');
const OUT = process.env.OUT || __dirname, SHOTS = !!process.env.SHOTS;
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  const logs = []; page.on('pageerror', (e) => logs.push('PAGEERROR: ' + String(e.stack || e).slice(0, 500)));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.addInitScript(() => { window.__noAdapt = true; try { localStorage.setItem('island-rush-v1', JSON.stringify({ set: { quality: 'low' } })); } catch (e) { /* ignore */ } });
  await page.goto('file://' + path.resolve(__dirname, '../dist/test.html'));
  await page.waitForFunction(() => window.__ready || window.__bootError, null, { timeout: 170000 });
  await page.evaluate(async () => {
    const g = window.__game; g.App.start(); const pad = { connected: true, axes: [0, 0], buttons: Array.from({ length: 16 }, () => ({ value: 0, pressed: false })) }; navigator.getGamepads = () => [pad]; window.__pad = pad;
    window.__was = { x: g.car.x, z: g.car.z, money: g.save.money };
    /* drive one run: delay = seconds after green before the throttle goes down (negative = that long after the tree starts, i.e. a jump start) */
    window.__run = (delay, stopAt) => {
      const D = g.Drag, car = g.car, dt = 1 / 120; let n = 0, hold = 0;
      while (D.phase !== 'done' && n < 120 * 60) {
        const go = delay >= 0 ? (D.phase === 'run' && D.clock >= D.tGreen + delay) : D.phase !== 'stage';
        const al = Math.atan2((g.DG.X0 - g.DG.LANE) - car.x, 25) - car.yaw;
        pad.axes[0] = -Math.max(-1, Math.min(1, al * 4)); pad.buttons[7].value = go && D.me.tFin < 0 ? 1 : 0; pad.buttons[6].value = D.me.tFin >= 0 ? 0.8 : 0;
        g.stepSim(dt); n++;
        if (stopAt && D.me.tBeam >= 0 && car.z - g.DG.Z0 > stopAt) return 'paused';
      }
      const L = (l) => (l ? { rt: +(l.tBeam - D.tGreen).toFixed(3), t60: +(l.t60 - l.tBeam).toFixed(3), et8: +(l.t8 - l.tBeam).toFixed(3), et: +(l.tFin - l.tBeam).toFixed(3), kmh: Math.round(l.vFin * 3.6), foul: l.foul } : null);
      return { phase: D.phase, me: L(D.me), rival: L(D.rival.lane), card: document.getElementById('rres').textContent.slice(0, 60), cardShown: !document.getElementById('rres').hidden, money: g.save.money, x: +(car.x - g.DG.X0).toFixed(2) };
    };
  });
  const out = [];
  for (let tier = 0; tier < 4; tier++) {
    const r = await page.evaluate(async (tier) => { const g = window.__game; g.App.mode = 'rlobby'; g.Drag.tier = tier; if (!g.Drag.on) await g.Drag.start(); else { g.Drag.makeRival(); g.Drag.stage(); } return { on: g.Drag.on, phase: g.Drag.phase, r: window.__run(0.25) }; }, tier);
    r.tier = tier; out.push(r); console.log(JSON.stringify(r));
  }
  if (SHOTS) {
    await page.evaluate(() => { const g = window.__game; g.Drag.tier = 1; g.Drag.makeRival(); g.Drag.stage(); for (let i = 0; i < 60; i++) g.stepSim(1 / 60); });
    await page.waitForTimeout(2500); await page.screenshot({ path: path.join(OUT, 'drag_staged.png') });
    await page.evaluate(() => window.__run(0.25, 120)); await page.waitForTimeout(2500); await page.screenshot({ path: path.join(OUT, 'drag_run.png') });
    await page.evaluate(() => window.__run(0.25)); await page.waitForTimeout(2500); await page.screenshot({ path: path.join(OUT, 'drag_finish.png') });
  }
  const foul = await page.evaluate(() => { const g = window.__game; g.Drag.tier = 0; g.Drag.makeRival(); g.Drag.again(); return window.__run(-1); });
  console.log('jump start', JSON.stringify(foul));
  const exit = await page.evaluate(() => { const g = window.__game; g.Drag.exit(false); return { on: g.Drag.on, mode: g.App.mode, x: g.car.x, z: g.car.z, was: window.__was, hud: document.getElementById('dgHud').hidden, group: g.Drag.group.visible, cls: document.body.className, drag: g.save.drag }; });
  console.log('exit', JSON.stringify(exit));
  let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
  for (const r of out) {
    const n = ['Street', 'Pro', 'Outlaw', 'Legend'][r.tier], m = r.r.me, v = r.r.rival;
    ok(r.on && r.r.phase === 'done' && r.r.cardShown, n + ': run completes and the results card shows (' + r.r.card + ')');
    ok(m && m.et > 7 && m.et < 22 && m.rt > 0.25 && m.rt < 1.2 && !m.foul, n + ': your slip is sane (RT ' + (m && m.rt) + ', ET ' + (m && m.et) + ' s at ' + (m && m.kmh) + ' km/h)');
    ok(v && v.et > 7 && v.et < 22 && !v.foul && v.rt > 0, n + ': the rival runs clean (RT ' + (v && v.rt) + ', ET ' + (v && v.et) + ' s at ' + (v && v.kmh) + ' km/h)');
    ok(Math.abs(r.r.x + 3.5) < 2, n + ': the car stayed in its lane (' + r.r.x + ' m)');
  }
  ok(out[3].r.rival.et < out[0].r.rival.et - 0.3, 'the Legend rival is quicker than the Street one (' + out[3].r.rival.et + ' vs ' + out[0].r.rival.et + ' s)');
  ok(foul.me.foul && /RED LIGHT/.test(foul.card), 'a jump start is a red light and a loss (' + foul.card + ')');
  ok(!exit.on && exit.mode === 'play' && Math.abs(exit.x - exit.was.x) < 1 && Math.abs(exit.z - exit.was.z) < 1 && exit.hud && !exit.group && !/drag/.test(exit.cls), 'leaving puts the car back where it was and hides the strip');
  ok(exit.drag && exit.drag.runs >= 5, 'runs are recorded in the save (' + JSON.stringify(exit.drag) + ')');
  console.log(logs.length ? logs.join('\n') : 'no page errors'); console.log(fails ? fails + ' FAILED' : 'ALL OK');
  await browser.close(); process.exit(fails || logs.length ? 1 : 0);
})();
