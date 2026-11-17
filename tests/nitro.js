/* Nitro flames: while the nitro burns, fire comes out of the exhaust (a blue core in an orange plume, behind the car, blown back), the road behind glows,
   and it all stops when the nitro does. Drives the real car on a road with Shift held, then let go. Saves a screenshot from the chase camera.
   usage: node tests/nitro.js   (needs dist/test.html: bash build.sh) ; env OUT=dir */
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = process.env.OUT || __dirname;
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await (await browser.newContext({ viewport: { width: 960, height: 540 } })).newPage(); const logs = [];
  page.on('pageerror', (e) => logs.push('PAGEERROR: ' + String(e.stack || e).slice(0, 500)));
  await page.route('**/three.min.js', (r) => r.fulfill({ path: path.resolve(__dirname, 'three.min.js'), contentType: 'application/javascript' }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.addInitScript(() => { window.__noAdapt = true; try { localStorage.setItem('island-rush-v1', JSON.stringify({ set: { quality: 'med' } })); } catch (e) { /* ignore */ } });
  await page.goto('file://' + path.resolve(__dirname, '../dist/test.html'));
  await page.waitForFunction(() => window.__ready || window.__bootError, null, { timeout: 170000 });
  let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m); };
  await page.evaluate(() => { const g = window.__game; g.App.start(); window.requestAnimationFrame = () => 0; window.__now = performance.now(); g.Cam.view = 2;
    const pad = { connected: true, axes: [0, 0], buttons: Array.from({ length: 16 }, () => ({ value: 0, pressed: false })) }; navigator.getGamepads = () => [pad]; window.__pad = pad; });
  const probe = (nit, frames) => page.evaluate(([nit, frames]) => {
    const g = window.__game, c = g.car, pad = window.__pad; let live = 0, behind = 0, n = 0, blue = 0, glow = 0, used = 0;
    for (let i = 0; i < frames; i++) { pad.buttons[7].value = 1; pad.buttons[5].value = nit ? 1 : 0; pad.buttons[5].pressed = nit; c.nitro = nit ? 100 : c.nitro; window.__now += 1000 / 30; g.frame(window.__now); if (c.nitroUse) used++; }
    const F = g.Part.fire, s = Math.sin(c.yaw), co = Math.cos(c.yaw);
    for (let i = 0; i < F.n; i++) { if (F.life[i] <= 0) continue; live++; const dx = F.pos[i * 3] - c.x, dz = F.pos[i * 3 + 2] - c.z; if (dx * s + dz * co < -1.5) behind++; if (F.cr[i * 3 + 2] > 1.5) blue++; n++; }
    glow = g.L.nitro ? g.L.nitro.intensity : -1;
    return { live, behind, blue, glow, used, kmh: Math.round(Math.abs(c.speed) * 3.6), shot: g.renderer.domElement.toDataURL('image/jpeg', 0.88) };
  }, [nit, frames]);
  await probe(false, 60);
  const on = await probe(true, 40); fs.writeFileSync(path.join(OUT, 'nitro_flames.jpg'), Buffer.from(on.shot.split(',')[1], 'base64')); delete on.shot;
  console.log('nitro on', JSON.stringify(on));
  ok(on.used > 20, 'the nitro burns (' + on.used + ' of 40 frames, ' + on.kmh + ' km/h)');
  ok(on.live > 15 && on.behind / on.live > 0.8, 'fire comes out of the exhaust: ' + on.live + ' flame particles, ' + on.behind + ' of them behind the car');
  ok(on.blue > 3, 'a blue-white core in the flame (' + on.blue + ')');
  ok(on.glow > 1, 'the road behind glows (' + on.glow.toFixed(2) + ')');
  const off = await probe(false, 30); delete off.shot; console.log('nitro off', JSON.stringify(off));
  ok(off.live === 0 && off.glow < 0.2, 'and it all stops when the nitro does (' + off.live + ' particles, glow ' + off.glow.toFixed(2) + ')');
  console.log(logs.length ? logs.join('\n') : 'no page errors'); ok(!logs.length, 'no page errors');
  console.log(fails ? fails + ' FAILED' : 'ALL OK'); await browser.close(); process.exit(fails ? 1 : 0);
})();
