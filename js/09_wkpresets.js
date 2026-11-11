/* ================= WORKSHOP PRESETS: ready-made craft that fly (verified by autopilot in the test suite) ================= */
const _wkPi = Math.PI;
WK.PRESETS = [
  { name: 'Trainer', blurb: 'Forgiving single-prop plane. Takes off from the runway at about 30 m/s.', mode: 'air', parts: [
    { id: 1, t: 'cockpit', par: { sz: 1 } },
    { id: 2, t: 'prop', par: { v: 1 }, p: 1, at: { k: 's', pn: 'front', cn: 'back' } },
    { id: 3, t: 'body', par: { r: 0.62, r2: 0.62, len: 1.8, fuel: 'jet', fill: 0.1 }, p: 1, at: { k: 's', pn: 'back', cn: 'front' } },
    { id: 12, t: 'body', par: { r: 0.62, r2: 0.2, len: 3.2, fuel: 'none' }, p: 3, at: { k: 's', pn: 'back', cn: 'front' } },
    { id: 4, t: 'wing', par: { span: 5.2, cr: 1.7, ct: 1.0, sw: 3, tc: 0.13, dih: 2, cs: 0.3, csp: 0.4, role: 0 }, p: 3, at: { k: 'f', u: 0.85, phi: 0 } },
    { id: 5, t: 'wing', par: { span: 5.2, cr: 1.7, ct: 1.0, sw: 3, tc: 0.13, dih: 2, cs: 0.3, csp: 0.4, role: 0 }, p: 3, at: { k: 'f', u: 0.85, phi: _wkPi } },
    { id: 6, t: 'wing', par: { span: 1.9, cr: 1.0, ct: 0.6, sw: 8, tc: 0.1, dih: 0, cs: 0.4, csp: 0.5, role: 0 }, p: 12, at: { k: 'f', u: -1.2, phi: 0 } },
    { id: 7, t: 'wing', par: { span: 1.9, cr: 1.0, ct: 0.6, sw: 8, tc: 0.1, dih: 0, cs: 0.4, csp: 0.5, role: 0 }, p: 12, at: { k: 'f', u: -1.2, phi: _wkPi } },
    { id: 8, t: 'wing', par: { span: 1.3, cr: 1.3, ct: 0.7, sw: 20, tc: 0.1, dih: 0, cs: 0.4, csp: 0.5, role: 0 }, p: 12, at: { k: 'f', u: -1.1, phi: _wkPi / 2 } },
    { id: 9, t: 'gear', par: { v: 0, len: 0.9 }, p: 1, at: { k: 'f', u: 0.6, phi: -_wkPi / 2 } },
    { id: 10, t: 'gear', par: { v: 1, len: 1.0 }, p: 4, at: { k: 'w', u: 0.22, v: 0.7, side: -1 } },
    { id: 11, t: 'gear', par: { v: 1, len: 1.0 }, p: 5, at: { k: 'w', u: 0.22, v: 0.7, side: -1 } }] },
  { name: 'Sounder', blurb: 'Solid-fuel sounding rocket. Climbs to about 50 km, then the capsule separates and parachutes down.', mode: 'rocket', parts: [
    { id: 1, t: 'capsule', par: { sz: 0.7 } },
    { id: 2, t: 'chute', par: { d: 7 }, p: 1, at: { k: 's', pn: 'front', cn: 'back' }, st: 3 },
    { id: 3, t: 'decoupler', par: { r: 0.45 }, p: 1, at: { k: 's', pn: 'back', cn: 'front' }, ss: 2 },
    { id: 4, t: 'solid', par: { r: 0.3, len: 2.6 }, p: 3, at: { k: 's', pn: 'back', cn: 'front' }, st: 1 },
    { id: 5, t: 'wing', par: { span: 0.9, cr: 1.2, ct: 0.5, sw: 25, tc: 0.05, dih: 0, cs: 0, csp: 0.5, role: 3 }, p: 4, at: { k: 'f', u: -0.9, phi: 0 } },
    { id: 6, t: 'wing', par: { span: 0.9, cr: 1.2, ct: 0.5, sw: 25, tc: 0.05, dih: 0, cs: 0, csp: 0.5, role: 3 }, p: 4, at: { k: 'f', u: -0.9, phi: _wkPi / 2 } },
    { id: 7, t: 'wing', par: { span: 0.9, cr: 1.2, ct: 0.5, sw: 25, tc: 0.05, dih: 0, cs: 0, csp: 0.5, role: 3 }, p: 4, at: { k: 'f', u: -0.9, phi: _wkPi } },
    { id: 8, t: 'wing', par: { span: 0.9, cr: 1.2, ct: 0.5, sw: 25, tc: 0.05, dih: 0, cs: 0, csp: 0.5, role: 3 }, p: 4, at: { k: 'f', u: -0.9, phi: 1.5 * _wkPi } }] },
  { name: 'Skylark', blurb: 'Two-stage kerolox/hydrolox rocket with a capsule. Reaches low orbit if you tip over 3 to 5 degrees east at about 60 m/s and then follow prograde.', mode: 'rocket', parts: [
    { id: 1, t: 'capsule', par: { sz: 0.9 } },
    { id: 13, t: 'rwheel', par: { v: 0 }, p: 4, at: { k: 'f', u: 0, phi: 0 } },
    { id: 14, t: 'rwheel', par: { v: 0 }, p: 4, at: { k: 'f', u: 0, phi: _wkPi } },
    { id: 2, t: 'chute', par: { d: 12 }, p: 1, at: { k: 's', pn: 'front', cn: 'back' }, st: 4 },
    { id: 3, t: 'decoupler', par: { r: 0.8 }, p: 1, at: { k: 's', pn: 'back', cn: 'front' }, ss: 3 },
    { id: 4, t: 'body', par: { r: 0.8, r2: 0.8, len: 1.6, fuel: 'hydro', fill: 0.5 }, p: 3, at: { k: 's', pn: 'back', cn: 'front' } },
    { id: 5, t: 'rocket', par: { v: 4 }, p: 4, at: { k: 's', pn: 'back', cn: 'front' }, st: 2 },
    { id: 6, t: 'decoupler', par: { r: 0.85 }, p: 5, at: { k: 's', pn: 'back', cn: 'front' }, ss: 2 },
    { id: 7, t: 'body', par: { r: 0.85, r2: 0.85, len: 5, fuel: 'rocket', fill: 0.4 }, p: 6, at: { k: 's', pn: 'back', cn: 'front' } },
    { id: 8, t: 'rocket', par: { v: 1 }, p: 7, at: { k: 's', pn: 'back', cn: 'front' }, st: 1 },
    { id: 9, t: 'wing', par: { span: 1.5, cr: 2.0, ct: 0.8, sw: 30, tc: 0.05, dih: 0, cs: 0, csp: 0.5, role: 3 }, p: 7, at: { k: 'f', u: -1.9, phi: 0 } },
    { id: 10, t: 'wing', par: { span: 1.5, cr: 2.0, ct: 0.8, sw: 30, tc: 0.05, dih: 0, cs: 0, csp: 0.5, role: 3 }, p: 7, at: { k: 'f', u: -1.9, phi: _wkPi / 2 } },
    { id: 11, t: 'wing', par: { span: 1.5, cr: 2.0, ct: 0.8, sw: 30, tc: 0.05, dih: 0, cs: 0, csp: 0.5, role: 3 }, p: 7, at: { k: 'f', u: -1.9, phi: _wkPi } },
    { id: 12, t: 'wing', par: { span: 1.5, cr: 2.0, ct: 0.8, sw: 30, tc: 0.05, dih: 0, cs: 0, csp: 0.5, role: 3 }, p: 7, at: { k: 'f', u: -1.9, phi: 1.5 * _wkPi } }] }
];
