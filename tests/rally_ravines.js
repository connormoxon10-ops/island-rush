/* Ravine jumps on every rally stage: line the car up 40 m before each kicker ramp at 24, 30 and 36 m/s, drive it flat out up the ramp, and check that it
   takes off at the lip and lands on the far deck. Each run is done twice: cleanly, and with the car having just come down from a hop 2.5 m before
   the lip (the case that used to glue it to the ground at the edge, so it followed the wall down into the ravine). A car that only gets its front
   wheels onto the deck must land too, not sink past it.
   usage: node tests/rally_ravines.js   (needs dist/test.html: bash build.sh) */
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 640, height: 360 } })).newPage(); const logs = [];
  page.on('pageerror', (e) => logs.push('PAGEERROR: ' + String(e.stack || e).slice(0, 400)));
  await page.route('**/three.min.js', (r) => r.fulfill({ path: path.resolve(__dirname, 'three.min.js'), contentType: 'application/javascript' }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.addInitScript(() => { window.__noAdapt = true; try { localStorage.setItem('island-rush-v1', JSON.stringify({ set: { quality: 'low' } })); } catch (e) { /* ignore */ } });
  await page.goto('file://' + path.resolve(__dirname, '../dist/test.html'));
  await page.waitForFunction(() => window.__ready || window.__bootError, null, { timeout: 170000 });
  const res = await page.evaluate(async () => {
    const g = window.__game, R = g.Rally, RY = g.RY, c = g.car, out = [], pad = { connected: true, axes: [0, 0], buttons: Array.from({ length: 16 }, () => ({ value: 0, pressed: false })) }; navigator.getGamepads = () => [pad];
    for (let st = 0; st < g.RY_STAGES.length; st++) {
      if (R.on) R.exit(true); g.App.mode = 'rlobby'; g.save.rally.stage = st; g.save.rally.car = 'ridge'; g.save.rally.rivals = 0; await R.start(); R.phase = 'run'; R.clock = 0;
      for (const rv of RY.ravines) for (const v of [24, 30, 36]) for (const hop of [false, true]) {
        R.placeAt(rv.s0 - rv.f.up - 40, 0); c.vx = Math.sin(c.yaw) * v; c.vz = Math.cos(c.yaw) * v; c.speed = v; c.w = 0; c.air = false; c.airCd = 0; c.fell = null; c.vy = c.vyPrev = 0; R.fellT = 0;
        let fell = false, cleared = false, hopped = false, maxU = -1e9, tmp = {};
        for (let i = 0; i < 60 * 7 && !fell && !cleared; i++) {
          const u = (c.x - rv.x) * rv.tx + (c.z - rv.z) * rv.tz; maxU = Math.max(maxU, u);
          RY.at(rv.s0 + Math.max(-rv.f.up - 30, u) + 15, 0, tmp); let d = Math.atan2(tmp.x - c.x, tmp.z - c.z) - c.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); pad.axes[0] = -Math.max(-1, Math.min(1, d * 2)); pad.buttons[7].value = Math.abs(c.speed) < v ? 1 : 0.4;
          if (hop && !hopped && u > -2.5) { hopped = true; c.airCd = 0.12; c.air = false; c.vy = 0; }   /* just came down from a hop */
          g.stepSim(1 / 60);
          if (c.fell || (u > 0.5 && u < rv.span - 0.5 && c.y < rv.lipY - 2.2)) fell = true;
          if (u > rv.span + 8 && c.y > rv.deckY - 1.2) cleared = true;   /* past the far edge at deck height (the road falls away beyond it, so long jumps land lower) */
        }
        out.push({ st, rv: rv.f.name || 'ravine', v, hop, fell, cleared, why: cleared || fell ? '' : 'u ' + maxU.toFixed(1) + '/' + rv.span + ' dy ' + (c.y - rv.deckY).toFixed(2) + (c.air ? ' air' : '') + ' v ' + Math.abs(c.speed).toFixed(1) });
        c.fell = null;
      }
    }
    if (R.on) R.exit(true); return out;
  });
  let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
  const by = {}; for (const r of res) { const k = r.st + ' ' + r.rv; (by[k] = by[k] || []).push(r); }
  for (const k in by) { const L = by[k], bad = L.filter((r) => r.fell || !r.cleared); ok(!bad.length, 'stage ' + k + ': cleared ' + (L.length - bad.length) + '/' + L.length + (bad.length ? ' · failed: ' + bad.map((r) => r.v + ' m/s' + (r.hop ? ' after a hop' : '') + (r.fell ? ' fell' : ' short [' + r.why + ']')).join(', ') : '')); }
  console.log(logs.length ? logs.join('\n') : 'no page errors'); console.log(fails ? fails + ' FAILED' : 'ALL OK');
  await browser.close(); process.exit(fails || logs.length ? 1 : 0);
})();
