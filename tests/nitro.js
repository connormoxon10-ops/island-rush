/* Nitro flames: while the nitro burns, a small flame sits on each of the car model's own exhaust tips (a blue core with an orange end), with a faint glow,
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
    const F = g.Part.fire, s = Math.sin(c.yaw), co = Math.cos(c.yaw), tips = (c.ext.userData.exh || []).map((t) => c.ext.localToWorld(new THREE.Vector3(t[0], t[1], t[2]))); let far = 0, size = 0;
    for (let i = 0; i < F.n; i++) { if (F.life[i] <= 0) continue; live++; const dx = F.pos[i * 3] - c.x, dz = F.pos[i * 3 + 2] - c.z; if (dx * s + dz * co < -1.5) behind++; if (F.cr[i * 3 + 2] > 1.4) blue++; n++; size = Math.max(size, F.size[i]);
      let dm = 1e9; for (const t of tips) dm = Math.min(dm, Math.hypot(F.pos[i * 3] - t.x, F.pos[i * 3 + 1] - t.y, F.pos[i * 3 + 2] - t.z)); if (dm > 0.6) far++; }
    glow = g.L.nitro ? g.L.nitro.intensity : -1;
    return { live, behind, blue, glow, used, far, size, tips: tips.length, kmh: Math.round(Math.abs(c.speed) * 3.6), shot: g.renderer.domElement.toDataURL('image/jpeg', 0.88) };
  }, [nit, frames]);
  await probe(false, 60);
  const on = await probe(true, 40); fs.writeFileSync(path.join(OUT, 'nitro_flames.jpg'), Buffer.from(on.shot.split(',')[1], 'base64')); delete on.shot;
  console.log('nitro on', JSON.stringify(on));
  ok(on.used > 20, 'the nitro burns (' + on.used + ' of 40 frames, ' + on.kmh + ' km/h)');
  ok(on.tips >= 1 && on.live >= 2 && on.behind === on.live, 'a flame at the exhaust: ' + on.live + ' small flame particles, all behind the car, from ' + on.tips + ' exhaust tip(s) on the model');
  ok(on.far === 0 && on.size < 0.2, 'and it sits right on the tips: none more than 0.6 m from one, none bigger than ' + on.size.toFixed(2) + ' m');
  ok(on.blue >= 1, 'a blue-white core in the flame (' + on.blue + ')');
  ok(on.glow > 0.2 && on.glow < 1, 'a faint glow behind (' + on.glow.toFixed(2) + ')');
  const off = await probe(false, 30); delete off.shot; console.log('nitro off', JSON.stringify(off));
  ok(off.live === 0 && off.glow < 0.2, 'and it all stops when the nitro does (' + off.live + ' particles, glow ' + off.glow.toFixed(2) + ')');
  console.log(logs.length ? logs.join('\n') : 'no page errors'); ok(!logs.length, 'no page errors');
  console.log(fails ? fails + ' FAILED' : 'ALL OK'); await browser.close(); process.exit(fails ? 1 : 0);
})();
