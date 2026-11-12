/* node harness for the rally stage model: loads the pure files into one scope (the shared maths come from 01_core.js) */
const fs = require('fs'), path = require('path');
const D = path.join(__dirname, '..', 'js') + '/';
module.exports = function load(files) {
  files = files || ['13_rallycore.js', '13_rallywall.js'];
  const core = fs.readFileSync(D + '01_core.js', 'utf8').split('\n');
  const pick = (re) => core.filter((l) => re.test(l)).join('\n');
  /* constants, the noise and rng helpers - everything from 01_core that has no browser dependency */
  const i0 = core.findIndex((l) => /^function mulberry32/.test(l)), i1 = core.findIndex((l) => /^function fbm/.test(l));
  const pre = 'const TAU=Math.PI*2,DEG=Math.PI/180,G=9.81;const clamp=(v,a,b)=>v<a?a:v>b?b:v;const lerp=(a,b,t)=>a+(b-a)*t;const sstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};\n' + core.slice(i0, i1 + 1).join('\n') + '\n';
  const src = files.map((f) => fs.readFileSync(D + f, 'utf8')).join('\n');
  return new Function(pre + src + ';return {RY,RY_ELEMS,RY_FEATS,RY_SURF,RY_WALLS,RW};')();
};
