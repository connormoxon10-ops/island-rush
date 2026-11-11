/* node harness for the workshop physics: loads the pure files into one scope */
const fs = require('fs'), path = require('path');
const D = path.join(__dirname, '..', 'js') + '/';
module.exports = function load(files) {
  files = files || ['09_wkcore.js', '09_wkparts.js', '09_wksim.js', '09_wkstats.js', '09_wkpresets.js', '09_wksys.js'];
  const src = files.map((f) => fs.readFileSync(D + f, 'utf8')).join('\n');
  const pre = 'const TAU=Math.PI*2,DEG=Math.PI/180;const clamp=(v,a,b)=>v<a?a:v>b?b:v;const lerp=(a,b,t)=>a+(b-a)*t;const sstep=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};';
  const m = new Function(pre + src + ';return {WK,WKV,WKSim,qrot:_wkqrot,qrotInv:_wkqrotInv,qaxis:_wkqaxis,qmul:_wkqmul,qfromAxes:_wkqfromAxes,qmat:_wkqmat};')();
  return m;
};
