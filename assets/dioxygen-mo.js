/* Interactive Group Theory: dioxygen molecular orbitals.
   z runs along the O–O bond. O_A sits at −z (left in the default view) and O_B at +z.
   D∞h has infinitely many operations, so the bookkeeping is done in its subgroup D2h (as in the CO2 lesson).
   Orbitals are Slater-type 2s and 2p functions; the 3D shapes are true isosurfaces of the LCAO wavefunctions. */
(function(){
'use strict';
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = id => document.getElementById(id);
const V = (x,y,z) => new THREE.Vector3(x,y,z);
const fmt = n => { n = Math.round(n*1000)/1000; if (n === 0) n = 0; return n < 0 ? '−' + (-n) : String(n); };
const fmtS = n => n > 0 ? '+' + fmt(n) : fmt(n);
const parseNum = s => { if (s == null) return NaN; s = String(s).trim().replace(/[−–]/g,'-'); return s === '' ? NaN : Number(s); };
const sq = v => `<i>${v}</i><sup>2</sup>`;

/* ---------- D2h ---------- */
const D = (x,y,z) => [[x,0,0],[0,y,0],[0,0,z]];
const OPS = [
  {id:'E',   html:'<i>E</i>',                       name:'Identity: do nothing',                                  M:D(1,1,1),    kind:'E'},
  {id:'C2z', html:'<i>C</i><sub>2</sub>(<i>z</i>)', name:'Rotate 180° about the O–O axis (z)',                    M:D(-1,-1,1),  kind:'rot', axis:[0,0,1]},
  {id:'C2y', html:'<i>C</i><sub>2</sub>(<i>y</i>)', name:'Rotate 180° about the y axis, perpendicular to the bond',  M:D(-1,1,-1),  kind:'rot', axis:[0,1,0]},
  {id:'C2x', html:'<i>C</i><sub>2</sub>(<i>x</i>)', name:'Rotate 180° about the x axis, perpendicular to the bond',  M:D(1,-1,-1),  kind:'rot', axis:[1,0,0]},
  {id:'i',   html:'<i>i</i>',                       name:'Invert every point through the midpoint of the bond',   M:D(-1,-1,-1), kind:'inv'},
  {id:'sxy', html:'σ(<i>xy</i>)',                    name:'Reflect through the xy plane, perpendicular to the bond', M:D(1,1,-1),   kind:'refl', normal:[0,0,1]},
  {id:'sxz', html:'σ(<i>xz</i>)',                    name:'Reflect through the xz plane, which contains the bond', M:D(1,-1,1),   kind:'refl', normal:[0,1,0]},
  {id:'syz', html:'σ(<i>yz</i>)',                    name:'Reflect through the yz plane, which contains the bond', M:D(-1,1,1),   kind:'refl', normal:[1,0,0]},
];
const H = OPS.length;
const opById = id => OPS.find(o => o.id === id);
const IRREPS = [
  {id:'Ag',  html:'A<sub>g</sub>',  cls:'sg', chi:[1, 1, 1, 1, 1, 1, 1, 1], lin:'',                      quad:`${sq('x')}, ${sq('y')}, ${sq('z')}`, central:'s'},
  {id:'B1g', html:'B<sub>1g</sub>', cls:'nn', chi:[1, 1,-1,-1, 1, 1,-1,-1], lin:'R<sub><i>z</i></sub>',   quad:'<i>xy</i>', central:'xy'},
  {id:'B2g', html:'B<sub>2g</sub>', cls:'pg', chi:[1,-1, 1,-1, 1,-1, 1,-1], lin:'R<sub><i>y</i></sub>',   quad:'<i>xz</i>', central:'xz'},
  {id:'B3g', html:'B<sub>3g</sub>', cls:'pg', chi:[1,-1,-1, 1, 1,-1,-1, 1], lin:'R<sub><i>x</i></sub>',   quad:'<i>yz</i>', central:'yz'},
  {id:'Au',  html:'A<sub>u</sub>',  cls:'nn', chi:[1, 1, 1, 1,-1,-1,-1,-1], lin:'',                      quad:'', central:'xyz'},
  {id:'B1u', html:'B<sub>1u</sub>', cls:'su', chi:[1, 1,-1,-1,-1,-1, 1, 1], lin:'<i>z</i>',              quad:'', central:'z'},
  {id:'B2u', html:'B<sub>2u</sub>', cls:'pu', chi:[1,-1, 1,-1,-1, 1,-1, 1], lin:'<i>y</i>',              quad:'', central:'y'},
  {id:'B3u', html:'B<sub>3u</sub>', cls:'pu', chi:[1,-1,-1, 1,-1, 1, 1,-1], lin:'<i>x</i>',              quad:'', central:'x'},
];
const irById = id => IRREPS.find(ir => ir.id === id);
// D∞h, kept for its labels; corr lists the D2h species each one becomes
const DINF_HEAD = ['<i>E</i>', '2<i>C</i><sub>∞</sub><sup><i>φ</i></sup>', '∞σ<sub>v</sub>', '<i>i</i>', '2<i>S</i><sub>∞</sub><sup><i>φ</i></sup>', '∞<i>C</i><sub>2</sub>'];
const DINF = [
  {id:'Sg+', html:'Σ<sub>g</sub><sup>+</sup>', lo:'σ<sub>g</sub>', cls:'sg', chi:['1','1','1','1','1','1'],                 lin:'',                                           quad:`${sq('x')} + ${sq('y')}, ${sq('z')}`, corr:['Ag']},
  {id:'Sg-', html:'Σ<sub>g</sub><sup>−</sup>', cls:'nn', chi:['1','1','−1','1','1','−1'],                                   lin:'R<sub><i>z</i></sub>',                       quad:'',                                     corr:['B1g']},
  {id:'Pg',  html:'Π<sub>g</sub>',             lo:'π<sub>g</sub>', cls:'pg', chi:['2','2 cos φ','0','2','−2 cos φ','0'],    lin:'(R<sub><i>x</i></sub>, R<sub><i>y</i></sub>)', quad:'(<i>xz</i>, <i>yz</i>)',               corr:['B2g','B3g']},
  {id:'Dg',  html:'Δ<sub>g</sub>',             cls:'nn', chi:['2','2 cos 2φ','0','2','2 cos 2φ','0'],                     lin:'',                                           quad:`(${sq('x')} − ${sq('y')}, <i>xy</i>)`, corr:['Ag','B1g']},
  {id:'Su+', html:'Σ<sub>u</sub><sup>+</sup>', lo:'σ<sub>u</sub>', cls:'su', chi:['1','1','1','−1','−1','−1'],              lin:'<i>z</i>',                                   quad:'',                                     corr:['B1u']},
  {id:'Su-', html:'Σ<sub>u</sub><sup>−</sup>', cls:'nn', chi:['1','1','−1','−1','−1','1'],                                 lin:'',                                           quad:'',                                     corr:['Au']},
  {id:'Pu',  html:'Π<sub>u</sub>',             lo:'π<sub>u</sub>', cls:'pu', chi:['2','2 cos φ','0','−2','2 cos φ','0'],    lin:'(<i>x</i>, <i>y</i>)',                       quad:'',                                     corr:['B2u','B3u']},
  {id:'Du',  html:'Δ<sub>u</sub>',             cls:'nn', chi:['2','2 cos 2φ','0','−2','−2 cos 2φ','0'],                   lin:'',                                           quad:'',                                     corr:['Au','B1u']},
];
const dinfById = id => DINF.find(d => d.id === id);
const chip = ir => `<span class="chip ${ir.cls}">${ir.html}</span>`;
const chipBtn = (ir, g) => `<button class="chip ${ir.cls}" type="button" data-glo="${g || 'dec:' + ir.id}" title="What does ${ir.id} mean?">${ir.html}</button>`;
const reduce = ch => IRREPS.map(ir => ch.reduce((s,x,k)=> s + x*ir.chi[k], 0)/H);
const irrepOf = ch => IRREPS.find(ir => ir.chi.every((c,k)=> c === ch[k]));
const repHTML = ns => ns.map((n,k)=> n ? `${n > 1 ? n : ''}${IRREPS[k].html}` : '').filter(Boolean).join(' + ') || '0';

/* ---------- valence atomic orbitals ---------- */
// index k = 4·atom + type; atom 0 = O_A (z < 0), 1 = O_B (z > 0); type 0 = 2s, 1 = 2px, 2 = 2py, 3 = 2pz
const AOT = ['s','x','y','z'];
const aoName = (t, a) => `${t === 's' ? '2s' : `2p<sub><i>${t}</i></sub>`}(${'AB'[a]})`;
const AOS = [];
[0,1].forEach(a => AOT.forEach(t => AOS.push({k:AOS.length, a, t, id:(t === 's' ? 's' : 'p' + t) + 'AB'[a], html:aoName(t, a)})));
const aoIdx = id => AOS.findIndex(o => o.id === id);
// what an operation does to one AO: every D2h matrix is diagonal, so an AO maps onto ± one AO
function aoImage(k, op){
  const {a, t} = AOS[k], m = [op.M[0][0], op.M[1][1], op.M[2][2]];
  const a2 = m[2] < 0 ? 1 - a : a;                       // z → −z swaps the two nuclei
  const s = t === 's' ? 1 : m['xyz'.indexOf(t)];          // an s orbital never changes sign; p_t follows coordinate t
  return {k:4*a2 + AOT.indexOf(t), s, moved:a2 !== a};
}
function applyOpVec(c, op){ const out = Array(8).fill(0); c.forEach((ck,k) => { if (ck){ const im = aoImage(k, op); out[im.k] += im.s*ck; } }); return out; }
const dot = (a,b) => a.reduce((s,x,i)=> s + x*b[i], 0);
// character of op acting on a combination c: +1 lands on itself, −1 reversed, 0 not on its own position (single AOs only)
function charOf(c, op){ const r = applyOpVec(c, op), d = dot(c,c); return Math.round(dot(c, r)/d*1000)/1000; }
const unit = (o) => { const c = Array(8).fill(0); Object.entries(o).forEach(([id,v]) => c[aoIdx(id)] = v); return c; };
// an LCAO as html, e.g. 2p_z(A) − 2p_z(B)
function lcaoHTML(c, opts={}){
  const terms = c.map((v,k) => v ? {v, k} : null).filter(Boolean);
  if (!terms.length) return '0';
  const g = Math.max(...terms.map(t => Math.abs(t.v)));
  const body = terms.map((t,i) => {
    const r = Math.round(t.v/g*1000)/1000, mag = Math.abs(r), coef = mag === 1 ? '' : fmt(mag);
    return (i ? (r < 0 ? ' − ' : ' + ') : (r < 0 ? '−' : '')) + coef + `<span class="ao">${AOS[t.k].html}</span>`;
  }).join('');
  return opts.norm && terms.length === 2 ? `<span class="frac"><span>1</span><span>√2</span></span>[${body}]` : body;
}

/* ---------- molecular orbitals (valence) ---------- */
const MOS = [
  {id:'2sg',  html:'2σ<sub>g</sub>',              simple:'σ<sub>2s</sub>',   ir:'Ag',  dinf:'Sg+', bond:'b', from:'2s', c:unit({sA:1, sB:1}),   level:'2sg',
   desc:'The two 2s orbitals added in phase. Electron density builds up between the nuclei.'},
  {id:'2su',  html:'2σ<sub>u</sub>*',             simple:'σ*<sub>2s</sub>',  ir:'B1u', dinf:'Su+', bond:'a', from:'2s', c:unit({sA:1, sB:-1}),  level:'2su',
   desc:'The two 2s orbitals out of phase. A nodal plane cuts the bond at its midpoint.'},
  {id:'3sg',  html:'3σ<sub>g</sub>',              simple:'σ<sub>2p</sub>',   ir:'Ag',  dinf:'Sg+', bond:'b', from:'2p', c:unit({pzA:1, pzB:-1}), level:'3sg',
   desc:'The 2p<sub><i>z</i></sub> lobes that point at each other have the same sign and merge into one large lobe on the bond.'},
  {id:'1pux', html:'1π<sub>u</sub>(<i>x</i>)',     simple:'π<sub>2p</sub>',   ir:'B3u', dinf:'Pu',  bond:'b', from:'2p', c:unit({pxA:1, pxB:1}),  level:'1pu',
   desc:'Side-on, in-phase overlap of the two 2p<sub><i>x</i></sub> orbitals: one sausage-shaped lobe above the bond and one below.'},
  {id:'1puy', html:'1π<sub>u</sub>(<i>y</i>)',     simple:'π<sub>2p</sub>',   ir:'B2u', dinf:'Pu',  bond:'b', from:'2p', c:unit({pyA:1, pyB:1}),  level:'1pu',
   desc:'The same as 1π<sub>u</sub>(<i>x</i>), turned 90° about the bond. The two have exactly the same energy.'},
  {id:'1pgx', html:'1π<sub>g</sub>*(<i>x</i>)',    simple:'π*<sub>2p</sub>',  ir:'B2g', dinf:'Pg',  bond:'a', from:'2p', c:unit({pxA:1, pxB:-1}), level:'1pg',
   desc:'Side-on, out-of-phase overlap of the 2p<sub><i>x</i></sub> orbitals: four lobes, with a nodal plane between the nuclei.'},
  {id:'1pgy', html:'1π<sub>g</sub>*(<i>y</i>)',    simple:'π*<sub>2p</sub>',  ir:'B3g', dinf:'Pg',  bond:'a', from:'2p', c:unit({pyA:1, pyB:-1}), level:'1pg',
   desc:'The partner of 1π<sub>g</sub>*(<i>x</i>), turned 90° about the bond.'},
  {id:'3su',  html:'3σ<sub>u</sub>*',             simple:'σ*<sub>2p</sub>',  ir:'B1u', dinf:'Su+', bond:'a', from:'2p', c:unit({pzA:1, pzB:1}),  level:'3su',
   desc:'The 2p<sub><i>z</i></sub> lobes that face each other have opposite signs, so a node sits between the nuclei.'},
];
const moById = id => MOS.find(m => m.id === id);
// energy levels for the diagram (schematic, eV-like units). O2 has little s–p mixing; N2 has a lot, which lifts 3σg above 1πu
const LEVELS = [
  {id:'2sg', mos:['2sg'],         E:{O:-37.0, N:-31.0}},
  {id:'2su', mos:['2su'],         E:{O:-28.5, N:-21.5}},
  {id:'3sg', mos:['3sg'],         E:{O:-20.6, N:-14.1}},
  {id:'1pu', mos:['1pux','1puy'], E:{O:-18.3, N:-16.3}},
  {id:'1pg', mos:['1pgx','1pgy'], E:{O:-13.1, N:-8.0}},
  {id:'3su', mos:['3su'],         E:{O:-9.0,  N:-4.5}},
];
const AO_E = {O:{s:-32.4, p:-15.9}, N:{s:-25.6, p:-12.9}};
const levelById = id => LEVELS.find(L => L.id === id);
const SPECIES = [
  {id:'N2',   html:'N<sub>2</sub>',              el:'N', n:10, len:110},
  {id:'O2+',  html:'O<sub>2</sub><sup>+</sup>',  el:'O', n:11, len:112},
  {id:'O2',   html:'O<sub>2</sub>',              el:'O', n:12, len:121},
  {id:'O2-',  html:'O<sub>2</sub><sup>−</sup>',  el:'O', n:13, len:134, name:'superoxide'},
  {id:'O22-', html:'O<sub>2</sub><sup>2−</sup>', el:'O', n:14, len:149, name:'peroxide'},
];
const spById = id => SPECIES.find(s => s.id === id);
const levelOrder = el => [...LEVELS].sort((a,b) => a.E[el] - b.E[el]).map(L => L.id);
// Aufbau with Hund's rule: a degenerate pair gets one electron each (parallel spins) before any pairing
function occupy(n, el){
  const occ = {}; let left = n;
  levelOrder(el).forEach(id => {
    const deg = levelById(id).mos.length, put = Math.min(left, 2*deg), arr = Array.from({length:deg}, () => []);
    for (let e = 0; e < put; e++) arr[e % deg].push(e < deg ? 1 : -1);
    occ[id] = arr; left -= put;
  });
  return occ;
}
function tally(occ){
  let b = 0, a = 0, unp = 0;
  LEVELS.forEach(L => (occ[L.id] || []).forEach((o,i) => {
    const mo = moById(L.mos[i]); if (mo.bond === 'b') b += o.length; else a += o.length;
    if (o.length === 1) unp++;
  }));
  return {b, a, unp, bo:(b - a)/2};
}

/* ---------- orbital functions (atomic units: bohr) ---------- */
const BOHR = 0.529177;                       // Å per bohr
const R_EQ = 1.2075/BOHR;                    // O–O, 1.2075 Å
const ZETA = 2.275;                          // Slater's rules for O 2s/2p: Zeff = 8 − 2(0.85) − 5(0.35) = 4.55; ζ = Zeff/2
const NRAD = Math.pow(2*ZETA, 2.5)/Math.sqrt(24);
const CS = NRAD/Math.sqrt(4*Math.PI), CP = NRAD*Math.sqrt(3/(4*Math.PI));
function lcaoFn(c, Rb){
  const zA = -Rb/2, zB = Rb/2;
  return (x, y, z) => {
    let v = 0;
    for (let a = 0; a < 2; a++){
      const o = 4*a; if (!c[o] && !c[o+1] && !c[o+2] && !c[o+3]) continue;
      const dz = z - (a ? zB : zA), r = Math.sqrt(x*x + y*y + dz*dz), e = Math.exp(-ZETA*r);
      v += (c[o]*CS*r + (c[o+1]*x + c[o+2]*y + c[o+3]*dz)*CP)*e;
    }
    return v;
  };
}
// functions at the centre of the molecule, used to show what each row of the character table "looks like"
const CENTRAL = {
  s:  {html:'<i>x</i><sup>2</sup> + <i>y</i><sup>2</sup> + <i>z</i><sup>2</sup>', fn:(x,y,z,e) => e, z:0.9},
  x:  {html:'<i>x</i>', fn:(x,y,z,e) => x*e, z:1.25},
  y:  {html:'<i>y</i>', fn:(x,y,z,e) => y*e, z:1.25},
  z:  {html:'<i>z</i>', fn:(x,y,z,e) => z*e, z:1.25},
  xy: {html:'<i>xy</i>', fn:(x,y,z,e) => x*y*e, z:1.35},
  xz: {html:'<i>xz</i>', fn:(x,y,z,e) => x*z*e, z:1.35},
  yz: {html:'<i>yz</i>', fn:(x,y,z,e) => y*z*e, z:1.35},
  xyz:{html:'<i>xyz</i>', fn:(x,y,z,e) => x*y*z*e, z:1.45},
};
function centralFn(key){ const C = CENTRAL[key]; return (x,y,z) => C.fn(x, y, z, Math.exp(-C.z*Math.sqrt(x*x + y*y + z*z))); }
// how each central function transforms: the sign it picks up under op (always ±1)
function centralChar(key, op){ const m = [op.M[0][0], op.M[1][1], op.M[2][2]]; return key === 's' ? 1 : [...key].reduce((s,ch) => s*m['xyz'.indexOf(ch)], 1); }

/* ---------- isosurfaces by marching tetrahedra ---------- */
// f: (x,y,z) in bohr → value. box = [x0,x1,y0,y1,z0,z1]. Values are normalised to ∫ψ² = 1 when opts.norm,
// otherwise the threshold is opts.rel × max|ψ|. Returns two surfaces: [0] ψ = +t (blue) and [1] ψ = −t (amber).
const TETS = [[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6],[0,5,1,6]];
const CORN = [[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]];
function isosurface(f, box, h, opts){
  const nx = Math.round((box[1]-box[0])/h) + 1, ny = Math.round((box[3]-box[2])/h) + 1, nz = Math.round((box[5]-box[4])/h) + 1;
  const N = nx*ny*nz, val = new Float32Array(N);
  let idx = 0, s2 = 0, vmax = 0;
  for (let k = 0; k < nz; k++){ const z = box[4] + k*h;
    for (let j = 0; j < ny; j++){ const y = box[2] + j*h;
      for (let i = 0; i < nx; i++){ const v = f(box[0] + i*h, y, z); val[idx++] = v; s2 += v*v; const a = v < 0 ? -v : v; if (a > vmax) vmax = a; } } }
  const t = opts.norm ? opts.iso*Math.sqrt(s2*h*h*h) : opts.rel*vmax;
  const sx = 1, sy = nx, sz = nx*ny;
  const grad = (g, out) => {
    const i = g % nx, j = ((g/nx)|0) % ny, k = (g/sz)|0;
    out[0] = ((i < nx-1 ? val[g+sx] : val[g]) - (i > 0 ? val[g-sx] : val[g]))/((i > 0 && i < nx-1) ? 2 : 1);
    out[1] = ((j < ny-1 ? val[g+sy] : val[g]) - (j > 0 ? val[g-sy] : val[g]))/((j > 0 && j < ny-1) ? 2 : 1);
    out[2] = ((k < nz-1 ? val[g+sz] : val[g]) - (k > 0 ? val[g-sz] : val[g]))/((k > 0 && k < nz-1) ? 2 : 1);
  };
  const pos = g => [box[0] + (g % nx)*h, box[2] + (((g/nx)|0) % ny)*h, box[4] + ((g/sz)|0)*h];
  const offs = CORN.map(([a,b,c]) => a*sx + b*sy + c*sz);
  const out = [{p:[], n:[]}, {p:[], n:[]}];
  const ga = [0,0,0], gb = [0,0,0];
  const vert = (sgn, A, B, wa, wb) => {
    const mu = (t - wa)/(wb - wa), pa = pos(A), pb = pos(B);
    grad(A, ga); grad(B, gb);
    const nx_ = -sgn*(ga[0] + mu*(gb[0]-ga[0])), ny_ = -sgn*(ga[1] + mu*(gb[1]-ga[1])), nz_ = -sgn*(ga[2] + mu*(gb[2]-ga[2]));
    const L = Math.hypot(nx_, ny_, nz_) || 1;
    return [pa[0] + mu*(pb[0]-pa[0]), pa[1] + mu*(pb[1]-pa[1]), pa[2] + mu*(pb[2]-pa[2]), nx_/L, ny_/L, nz_/L];
  };
  const tri = (S, a, b, c) => {
    // wind each triangle so that its face normal agrees with the outward (gradient) normal
    const ux = b[0]-a[0], uy = b[1]-a[1], uz = b[2]-a[2], vx = c[0]-a[0], vy = c[1]-a[1], vz = c[2]-a[2];
    const fx = uy*vz - uz*vy, fy = uz*vx - ux*vz, fz = ux*vy - uy*vx;
    if (fx*(a[3]+b[3]+c[3]) + fy*(a[4]+b[4]+c[4]) + fz*(a[5]+b[5]+c[5]) < 0){ const tmp = b; b = c; c = tmp; }
    for (const q of [a,b,c]){ S.p.push(q[0], q[1], q[2]); S.n.push(q[3], q[4], q[5]); }
  };
  const g8 = new Array(8), w = new Array(4), gi = new Array(4);
  for (let k = 0; k < nz-1; k++) for (let j = 0; j < ny-1; j++) for (let i = 0; i < nx-1; i++){
    const base = i + j*sy + k*sz;
    let mn = Infinity, mx = -Infinity;
    for (let c = 0; c < 8; c++){ const v = val[base + offs[c]]; g8[c] = base + offs[c]; if (v < mn) mn = v; if (v > mx) mx = v; }
    for (let s = 0; s < 2; s++){
      const sgn = s ? -1 : 1, hi = s ? -mn : mx, lo = s ? -mx : mn;   // values seen as sgn·ψ
      if (hi <= t || lo > t) continue;
      const S = out[s];
      for (const T of TETS){
        let m = 0;
        for (let q = 0; q < 4; q++){ gi[q] = g8[T[q]]; w[q] = sgn*val[gi[q]]; if (w[q] > t) m |= 1 << q; }
        if (m === 0 || m === 15) continue;
        const ins = [], outs = [];
        for (let q = 0; q < 4; q++) (m & (1 << q) ? ins : outs).push(q);
        const E = (p, q) => vert(sgn, gi[p], gi[q], w[p], w[q]);
        if (ins.length === 1){ const a = ins[0]; tri(S, E(a, outs[0]), E(a, outs[1]), E(a, outs[2])); }
        else if (ins.length === 3){ const d = outs[0]; tri(S, E(d, ins[0]), E(d, ins[1]), E(d, ins[2])); }
        else { const [a,b] = ins, [c,d] = outs, ac = E(a,c), ad = E(a,d), bd = E(b,d), bc = E(b,c); tri(S, ac, ad, bd); tri(S, ac, bd, bc); }
      }
    }
  }
  return out.map(S => ({p:new Float32Array(S.p), n:new Float32Array(S.n)}));
}

/* ---------- state ---------- */
const S = {
  step:0, axes:true, elements:true, labels:true,
  field:null,                 // what the viewer shows: 'ao:pzA', 'mo:3sg', 'fn:x', 'lc:…' or null (bare molecule)
  R:R_EQ,                     // O–O distance in bohr (step 5 lets you change it)
  anim:null, hold:null,
  seenOps:{}, aoTests:{}, moTests:{}, fnTests:{},
  ctRow:null, gen:'sA', proj:'Ag', projRow:null, found:{},
  sp:'O2', nElec:0, label:'dinf',
  inputs:{}, chk:{}, rev:{}, showWork:false,
};

/* ---------- fields: everything the viewer can draw ---------- */
const FIELD_INFO = id => {
  if (!id) return null;
  const [kind, key] = id.split(':');
  if (kind === 'ao'){ const k = aoIdx(key); const c = Array(8).fill(0); c[k] = 1; return {kind, html:AOS[k].html, c, k}; }
  if (kind === 'mo'){ const m = moById(key); return {kind, html:m.html, c:m.c, mo:m, ir:irById(m.ir)}; }
  if (kind === 'fn'){ const ir = IRREPS.find(r => r.central === key); return {kind, html:CENTRAL[key].html, key, ir}; }
  if (kind === 'lc'){ const c = key.split(',').map(Number); const ch = OPS.map(op => charOf(c, op)); return {kind, html:lcaoHTML(c), c, ir:irrepOf(ch)}; }
  return null;
};
const lcId = c => 'lc:' + c.map(v => Math.round(v*1000)/1000).join(',');
// χ of the current field under op, plus a sentence for the caption
function fieldResult(id, op){
  const F = FIELD_INFO(id);
  if (F.kind === 'fn'){ const x = centralChar(F.key, op); return {chi:x, text: x > 0 ? 'Every lobe lands on a lobe of the same colour: χ = <b>+1</b>.' : 'Every lobe lands on a lobe of the opposite colour: χ = <b>−1</b>.'}; }
  if (F.kind === 'ao'){
    const im = aoImage(F.k, op), img = `${im.s < 0 ? '−' : ''}${AOS[im.k].html}`;
    if (im.moved) return {chi:0, moved:true, img, text:`The orbital now sits on the other atom: ${op.html} turns ${F.html} into <b>${img}</b>. It is not on its own atom, so it adds <b>0</b> to the character.`};
    return {chi:im.s, img, text: im.s > 0 ? `It stays on its own atom with its colours unchanged: <b>+1</b>.` : `It stays on its own atom but its colours swap: it becomes <b>${img}</b>, so <b>−1</b>.`};
  }
  const x = charOf(F.c, op);
  return {chi:x, text: x > 0 ? 'The orbital lands on itself with every colour unchanged: χ = <b>+1</b>.' : x < 0 ? 'The orbital lands on itself with every colour reversed: χ = <b>−1</b>.' : 'The orbital does not land on itself.'};
}

/* ---------- three.js scene ---------- */
const stageEl = $('stage'), canvas = $('gl'), labelsEl = $('labels');
let renderer;
try { renderer = new THREE.WebGLRenderer({canvas, antialias:true}); }
catch(err){ stageEl.insertAdjacentHTML('beforeend','<div class="nogl">This browser could not start WebGL, so the 3D model is unavailable. The lesson still works.</div>'); }

const SCALE = 1.45, DU = SCALE*BOHR;          // display units per Å and per bohr
const COL = {O:0xe2564c, N:0x4a78e0, bond:0x8e9cac, x:0xf2a23a, y:0x45d0a0, z:0x93a6ff, c2:0xffd35c, sxy:0xff9fbf, sxz:0x5d9cff, syz:0xc283ff, inv:0x9effc8, pos:0x3d7bff, neg:0xffaa33};
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
camera.up.set(1,0,0);                          // x is "up" on screen, so the O–O bond (z) lies across the view
scene.add(camera);
scene.add(new THREE.HemisphereLight(0xe4ecff, 0x1b2430, 0.8));
const key = new THREE.DirectionalLight(0xffffff, 0.9); key.position.set(4,3,6); camera.add(key);
const UP = V(0,1,0);
const GEO = {shaft:new THREE.CylinderGeometry(1,1,1,14), head:new THREE.ConeGeometry(1,1,20), sphere:new THREE.SphereGeometry(1,40,28), bond:new THREE.CylinderGeometry(1,1,1,20)};
function makeArrow(color, o={}){
  const op = o.opacity ?? 1;
  const mat = new THREE.MeshStandardMaterial({color, roughness:.45, metalness:.05, transparent:op < 1, opacity:op, depthWrite:op >= 1});
  const g = new THREE.Group(), shaft = new THREE.Mesh(GEO.shaft, mat), head = new THREE.Mesh(GEO.head, mat);
  g.add(shaft, head); g.userData = {shaft, head, r:o.r ?? .04, hr:o.hr ?? .1, hl:o.hl ?? .24};
  return g;
}
function placeArrow(g, from, vec){
  const L = vec.length(); if (L < 1e-3){ g.visible = false; return; }
  g.visible = true;
  const {shaft, head, r, hr} = g.userData, hl = Math.min(g.userData.hl, L*.5);
  g.position.copy(from); g.quaternion.setFromUnitVectors(UP, vec.clone().divideScalar(L));
  shaft.scale.set(r, L-hl, r); shaft.position.set(0, (L-hl)/2, 0);
  head.scale.set(hr, hl, hr); head.position.set(0, L-hl/2, 0);
}

// axes
const axesGroup = new THREE.Group(); scene.add(axesGroup);
[[V(1,0,0),COL.x,2.5],[V(0,1,0),COL.y,2.5],[V(0,0,1),COL.z,3.6]].forEach(([d,c,L]) => {
  const a = makeArrow(c, {opacity:.75, r:.012, hr:.05, hl:.16}); placeArrow(a, d.clone().multiplyScalar(-L), d.clone().multiplyScalar(2*L)); axesGroup.add(a);
});

// symmetry elements of D2h: three C2 axes, the inversion centre, three mirror planes
const ELEM = {};
(function(){
  const axis = (id, d, len) => {
    const g = new THREE.BufferGeometry().setFromPoints([d.clone().multiplyScalar(-len), d.clone().multiplyScalar(len)]);
    const mat = new THREE.LineDashedMaterial({color:COL.c2, dashSize:.14, gapSize:.09, transparent:true, opacity:.9});
    const line = new THREE.Line(g, mat); line.computeLineDistances();
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,2*len,10), new THREE.MeshBasicMaterial({color:COL.c2, transparent:true, opacity:0, depthWrite:false}));
    tube.quaternion.setFromUnitVectors(UP, d);
    const grp = new THREE.Group(); grp.add(line, tube); scene.add(grp);
    ELEM[id] = {grp, set(on, hot){ grp.visible = on; tube.material.opacity = hot ? .55 : 0; mat.opacity = hot ? 1 : .75; }};
  };
  axis('C2z', V(0,0,1), 3.9); axis('C2y', V(0,1,0), 2.7); axis('C2x', V(1,0,0), 2.7);
  const plane = (id, color, w, h, orient) => {
    const geo = new THREE.PlaneGeometry(w, h); orient(geo);
    const fill = new THREE.MeshBasicMaterial({color, transparent:true, opacity:.08, side:THREE.DoubleSide, depthWrite:false});
    const edge = new THREE.LineBasicMaterial({color, transparent:true, opacity:.45});
    const grp = new THREE.Group(); grp.add(new THREE.Mesh(geo, fill), new THREE.LineSegments(new THREE.EdgesGeometry(geo), edge)); scene.add(grp);
    ELEM[id] = {grp, set(on, hot){ grp.visible = on; fill.opacity = hot ? .24 : .06; edge.opacity = hot ? .95 : .38; }};
  };
  // PlaneGeometry lies in xy. Turning it 90° about x sends y → z (the xz plane); 90° about y sends x → z (the yz plane).
  plane('sxy', COL.sxy, 4.2, 4.2, () => {});
  plane('sxz', COL.sxz, 4.2, 6.6, g => g.rotateX(Math.PI/2));
  plane('syz', COL.syz, 6.6, 4.2, g => g.rotateY(Math.PI/2));
  const shell = new THREE.Mesh(new THREE.SphereGeometry(.2, 16, 10), new THREE.MeshBasicMaterial({color:COL.inv, wireframe:true, transparent:true, opacity:.6, depthWrite:false}));
  const dotM = new THREE.Mesh(new THREE.SphereGeometry(.05, 12, 8), new THREE.MeshBasicMaterial({color:COL.inv}));
  const grp = new THREE.Group(); grp.add(shell, dotM); scene.add(grp);
  ELEM.i = {grp, set(on, hot){ grp.visible = on; shell.material.opacity = hot ? 1 : .55; shell.scale.setScalar(hot ? 1.5 : 1); }};
})();

// the molecule: "live" is transformed by the operation, "ghost" stays where it started
const live = new THREE.Group(); live.matrixAutoUpdate = false; scene.add(live);
const ghost = new THREE.Group(); scene.add(ghost);
const atomMat = new THREE.MeshStandardMaterial({color:COL.O, roughness:.32, metalness:0});
const atomMeshes = [0,1].map(() => { const m = new THREE.Mesh(GEO.sphere, atomMat); live.add(m); return m; });
const ghostAtoms = [0,1].map(() => { const m = new THREE.Mesh(GEO.sphere, new THREE.MeshBasicMaterial({color:0xffffff, transparent:true, opacity:.1, depthWrite:false})); ghost.add(m); return m; });
const bondMat = new THREE.MeshStandardMaterial({color:COL.bond, roughness:.5});
const bonds = [0,1].map(() => { const b = new THREE.Mesh(GEO.bond, bondMat); live.add(b); return b; });
const orbG = new THREE.Group(); orbG.scale.setScalar(DU); live.add(orbG);
const ghostOrbG = new THREE.Group(); ghostOrbG.scale.setScalar(DU); ghost.add(ghostOrbG);
// isosurface triangles are wound outward, so front faces are enough (and avoid see-through artefacts)
const mkMat = (color) => new THREE.MeshStandardMaterial({color, roughness:.38, metalness:.04, transparent:true, opacity:.9});
const mkGhost = (color) => new THREE.MeshBasicMaterial({color, transparent:true, opacity:.14, depthWrite:false});
const orbMeshes = [new THREE.Mesh(new THREE.BufferGeometry(), mkMat(COL.pos)), new THREE.Mesh(new THREE.BufferGeometry(), mkMat(COL.neg))];
const ghostOrbMeshes = [new THREE.Mesh(new THREE.BufferGeometry(), mkGhost(COL.pos)), new THREE.Mesh(new THREE.BufferGeometry(), mkGhost(COL.neg))];
orbMeshes.forEach(m => orbG.add(m)); ghostOrbMeshes.forEach(m => ghostOrbG.add(m));

// isosurface meshes are cached per field and bond length
const MESH = new Map();
function geometryFor(id, R, coarse){
  const k = `${id}|${R.toFixed(3)}|${coarse ? 'c' : 'f'}`;
  if (MESH.has(k)) return MESH.get(k);
  const F = FIELD_INFO(id);
  let surf;
  if (F.kind === 'fn') surf = isosurface(centralFn(F.key), [-4.5,4.5,-4.5,4.5,-4.5,4.5], coarse ? .22 : .15, {rel:.28});
  else { const zm = R/2 + 3.6; surf = isosurface(lcaoFn(F.c, R), [-3.6,3.6,-3.6,3.6,-zm,zm], coarse ? .21 : .15, {norm:true, iso:.07}); }
  const geos = surf.map(s => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(s.p, 3)); g.setAttribute('normal', new THREE.BufferAttribute(s.n, 3)); return g; });
  MESH.set(k, geos);
  if (MESH.size > 48){ const first = MESH.keys().next().value; MESH.get(first).forEach(g => g.dispose()); MESH.delete(first); }
  return geos;
}
let drawn = '';
function syncOrbital(coarse){
  const id = S.field, k = id ? `${id}|${S.R.toFixed(3)}|${coarse ? 'c' : 'f'}` : '';
  if (k === drawn) return; drawn = k;
  if (!id){ orbMeshes.concat(ghostOrbMeshes).forEach(m => m.visible = false); return; }
  const geos = geometryFor(id, S.R, coarse);
  [0,1].forEach(s => { orbMeshes[s].geometry = geos[s]; ghostOrbMeshes[s].geometry = geos[s]; orbMeshes[s].visible = ghostOrbMeshes[s].visible = true; });
}
function atomPos(i){ return V(0, 0, (i ? 1 : -1)*S.R/2*DU); }

// operation animation (same conventions as the other lessons)
const ease = t => t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2;
function exactMatrix(op){ const M = op.M, m = new THREE.Matrix4(); m.set(M[0][0],M[0][1],M[0][2],0, M[1][0],M[1][1],M[1][2],0, M[2][0],M[2][1],M[2][2],0, 0,0,0,1); return m; }
function squash(normal, e){
  let s = 1 - 2*e; if (Math.abs(s) < .02) s = s < 0 ? -.02 : .02;
  const [x,y,z] = normal, k = s - 1;
  return new THREE.Matrix4().set(1+k*x*x, k*x*y, k*x*z, 0,  k*y*x, 1+k*y*y, k*y*z, 0,  k*z*x, k*z*y, 1+k*z*z, 0,  0,0,0,1);
}
function opMatrix(op, e){
  if (op.kind === 'rot') return new THREE.Matrix4().makeRotationAxis(V(...op.axis), Math.PI*e);
  if (op.kind === 'refl') return squash(op.normal, e);
  // i = σ(xy)·C2(z): half a turn about the bond, then a mirror through the plane perpendicular to it
  if (op.kind === 'inv') return squash([0,0,1], Math.max(0, 2*e - 1)).multiply(new THREE.Matrix4().makeRotationAxis(V(0,0,1), Math.PI*Math.min(1, 2*e)));
  return new THREE.Matrix4();
}
function applyOp(id){
  const op = opById(id);
  S.hold = null;
  S.anim = {op, t0:performance.now(), dur: reduced ? 1 : (op.kind === 'E' ? 700 : op.kind === 'inv' ? 2100 : 1500), field:S.field};
  setCaption(`Applying ${op.html}…`);
  markOpButtons(id);
}
function finishOp(){
  const {op, field} = S.anim; S.anim = null; S.hold = {op};
  S.seenOps[op.id] = true;
  let s = `<b>${op.html}</b> done. `;
  if (!field){
    s += op.M[2][2] < 0 ? 'The two oxygen atoms have swapped places (watch the labels), yet the molecule looks exactly as it did.' : 'Both atoms are back in their own places.';
  } else {
    const r = fieldResult(field, op);
    const F = FIELD_INFO(field);
    if (F.kind === 'ao') (S.aoTests[field] ||= {})[op.id] = r.chi;
    else if (F.kind === 'mo') (S.moTests[F.mo.id] ||= {})[op.id] = r.chi;
    s += r.text + (r.moved ? ' <span class="muted">The faint copy shows where it started.</span>' : op.kind === 'E' ? '' : ' <span class="muted">Compare with the <b>Before</b> picture.</span>');
  }
  setCaption(s);
  onOpDone(op, field);
}
function resetOp(){ S.anim = null; S.hold = null; markOpButtons(null); setCaption(defaultCaption()); }
function setCaption(html){ $('caption').innerHTML = html; }
function markOpButtons(id){ document.querySelectorAll('.sop[data-op]').forEach(b => b.classList.toggle('active', b.dataset.op === id)); }
function defaultCaption(){
  if (!S.field) return 'Drag to rotate, scroll to zoom. Apply an operation to see what it does to O<sub>2</sub>.';
  return `Showing ${FIELD_INFO(S.field).html}. Blue and amber are the two signs (phases) of the wavefunction. Apply an operation: does the orbital land on itself?`;
}

// camera: orbit about the screen-vertical x axis
const CAM0 = {theta:-0.42, phi:1.18, r:8.4};
const cam = {...CAM0};
function placeCamera(){
  const {theta, phi, r} = cam;
  camera.position.set(r*Math.cos(phi), r*Math.sin(phi)*Math.cos(theta), r*Math.sin(phi)*Math.sin(theta));
  camera.lookAt(0,0,0);
}
const ptrs = new Map(); let pinch0 = null;
canvas.addEventListener('pointerdown', e => { ptrs.set(e.pointerId, {x:e.clientX, y:e.clientY}); canvas.setPointerCapture(e.pointerId); pinch0 = null; });
canvas.addEventListener('pointermove', e => {
  const p = ptrs.get(e.pointerId); if (!p) return;
  if (ptrs.size === 2){
    p.x = e.clientX; p.y = e.clientY;
    const [a,b] = [...ptrs.values()], d = Math.hypot(a.x-b.x, a.y-b.y);
    if (pinch0) cam.r = Math.min(16, Math.max(4.5, cam.r*pinch0/d));
    pinch0 = d; return;
  }
  cam.theta += (e.clientX - p.x)*.008;
  cam.phi = Math.min(Math.PI-.12, Math.max(.12, cam.phi + (e.clientY - p.y)*.008));
  p.x = e.clientX; p.y = e.clientY;
});
['pointerup','pointercancel'].forEach(t => canvas.addEventListener(t, e => { ptrs.delete(e.pointerId); pinch0 = null; }));
canvas.addEventListener('wheel', e => { e.preventDefault(); cam.r = Math.min(16, Math.max(4.5, cam.r*Math.exp(e.deltaY*.0015))); }, {passive:false});
canvas.addEventListener('keydown', e => {
  const k = {ArrowLeft:[-.12,0], ArrowRight:[.12,0], ArrowUp:[0,-.1], ArrowDown:[0,.1]}[e.key];
  if (k){ e.preventDefault(); cam.theta += k[0]; cam.phi = Math.min(Math.PI-.12, Math.max(.12, cam.phi + k[1])); }
  if (e.key === '+' || e.key === '='){ cam.r = Math.max(4.5, cam.r*.9); }
  if (e.key === '-'){ cam.r = Math.min(16, cam.r/.9); }
});

// HTML labels projected from 3D
const labelEls = {};
function label(k, html, cls){
  if (!labelEls[k]){ const el = document.createElement('span'); el.className = 'lab ' + cls; labelEls[k] = el; labelsEl.appendChild(el); }
  const el = labelEls[k]; if (el._html !== html){ el.innerHTML = html; el._html = html; } return el;
}
const tmpV = V(0,0,0);
function putLabel(el, world, dx, dy, show){
  if (!show){ el.style.display = 'none'; return; }
  tmpV.copy(world).project(camera);
  if (tmpV.z > 1){ el.style.display = 'none'; return; }
  el.style.display = '';
  const w = canvas.clientWidth, h = canvas.clientHeight;
  el.style.transform = `translate(${(tmpV.x+1)/2*w + dx}px, ${(1-tmpV.y)/2*h + dy}px) translate(-50%,-50%)`;
}
function resize(){
  if (!renderer) return;
  const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(w, h, false);
  camera.aspect = w/h; camera.fov = fovFor(w/h); camera.updateProjectionMatrix();
}
// widen the view on tall, narrow canvases so the whole molecule (which lies across the screen) still fits
const fovFor = a => Math.max(34, 2*Math.atan(0.42/a)*180/Math.PI);
new ResizeObserver(resize).observe(canvas);

// picture-in-picture "before" view: the untransformed orbital, so a −1 (colours swapped) is easy to see
stageEl.insertAdjacentHTML('beforeend', '<div class="inset" id="inset" aria-hidden="true"><span>Before</span></div>');
const insetEl = $('inset');
function renderInset(){
  const w = canvas.clientWidth, h = canvas.clientHeight, iw = Math.round(Math.min(230, w*.36)), ih = Math.round(iw*.7), top = 52;
  if (ih + top > h*.6){ insetEl.style.display = 'none'; return; }
  insetEl.style.display = 'block'; insetEl.style.width = iw + 'px'; insetEl.style.height = ih + 'px';
  const x = w - iw - 12, y = h - top - ih;
  const saved = live.matrix.clone(), vis = [ghost.visible, axesGroup.visible, ...Object.values(ELEM).map(e => e.grp.visible)];
  live.matrix.identity(); live.matrixWorldNeedsUpdate = true; ghost.visible = false; axesGroup.visible = false; Object.values(ELEM).forEach(e => e.grp.visible = false);
  camera.aspect = iw/ih; camera.fov = fovFor(iw/ih); camera.updateProjectionMatrix();
  renderer.setScissorTest(true); renderer.setScissor(x, y, iw, ih); renderer.setViewport(x, y, iw, ih);
  renderer.setClearColor(0x142131, 1); renderer.clear();
  renderer.render(scene, camera);
  renderer.setScissorTest(false); renderer.setViewport(0, 0, w, h); renderer.setClearColor(0x000000, 1);
  camera.aspect = w/h; camera.fov = fovFor(w/h); camera.updateProjectionMatrix();
  live.matrix.copy(saved); live.matrixWorldNeedsUpdate = true;
  ghost.visible = vis[0]; axesGroup.visible = vis[1]; Object.values(ELEM).forEach((e,i) => e.grp.visible = vis[i+2]);
}

const ELEM_LABELS = [
  ['C2z', '<i>C</i><sub>2</sub>(<i>z</i>)', V(0,0,4.05), 24, 0, 'elem'],
  ['C2y', '<i>C</i><sub>2</sub>(<i>y</i>)', V(0,2.85,0), 0, 14, 'elem'],
  ['C2x', '<i>C</i><sub>2</sub>(<i>x</i>)', V(2.85,0,0), 0, -12, 'elem'],
  ['i',   '<i>i</i>',                       V(0,0,0), 26, 22, 'elem'],
  ['sxy', 'σ(<i>xy</i>)',                    V(1.9,-1.9,0), 0, 0, 'elem pl3'],
  ['sxz', 'σ(<i>xz</i>)',                    V(1.9,0,-3.0), 0, 0, 'elem pl1'],
  ['syz', 'σ(<i>yz</i>)',                    V(0,1.9,3.0), 0, 0, 'elem pl2'],
];
let last = performance.now();
function frame(now){
  requestAnimationFrame(frame);
  last = now;
  let M = null, activeOp = null;
  if (S.anim){
    activeOp = S.anim.op;
    const t = Math.min(1, (now - S.anim.t0)/S.anim.dur);
    M = t >= 1 ? exactMatrix(activeOp) : opMatrix(activeOp, ease(t));
    if (t >= 1) finishOp();
  } else if (S.hold){ activeOp = S.hold.op; M = exactMatrix(activeOp); }
  live.matrix.copy(M || new THREE.Matrix4()); live.matrixWorldNeedsUpdate = true;
  ghost.visible = !!activeOp;
  // a faint copy of the orbital only helps when it ends up somewhere else (an AO carried to the other atom);
  // otherwise it would sit exactly on top of the moved orbital, and the "Before" inset does the job
  const GF = activeOp && S.field ? FIELD_INFO(S.field) : null;
  ghostOrbG.visible = !!(GF && GF.kind === 'ao' && aoImage(GF.k, activeOp).moved);

  const orb = !!S.field, central = orb && S.field.startsWith('fn:');
  const r = orb ? .12 : .44;
  [0,1].forEach(i => {
    atomMeshes[i].position.copy(atomPos(i)); atomMeshes[i].scale.setScalar(r); atomMeshes[i].visible = !central;
    ghostAtoms[i].position.copy(atomPos(i)); ghostAtoms[i].scale.setScalar(r*1.5); ghostAtoms[i].visible = !central;
  });
  // O=O double bond, drawn only for the bare molecule
  const half = S.R/2*DU;
  bonds.forEach((b,i) => { b.visible = !orb; b.position.set((i ? 1 : -1)*.1, 0, 0); b.quaternion.setFromUnitVectors(UP, V(0,0,1)); b.scale.set(.06, 2*half, .06); });

  axesGroup.visible = S.axes;
  const hotId = activeOp && activeOp.kind !== 'E' ? activeOp.id : null;
  Object.keys(ELEM).forEach(id => ELEM[id].set(S.elements || hotId === id, hotId === id));

  if (renderer){
    placeCamera(); renderer.render(scene, camera);
    if (activeOp && S.field && activeOp.kind !== 'E') renderInset(); else insetEl.style.display = 'none';
  }

  const lm = live.matrix;
  [0,1].forEach(i => putLabel(label('a'+i, `O<sub>${'AB'[i]}</sub>`, 'atom'), atomPos(i).applyMatrix4(lm), 0, orb ? -16 : -30, S.labels && !central));
  [['x',V(2.7,0,0)],['y',V(0,2.7,0)],['z',V(0,0,3.8)]].forEach(([n,p]) => putLabel(label('ax'+n, n, 'axis'), p, 0, 0, S.axes && S.labels));
  ELEM_LABELS.forEach(([id, html, p, dx, dy, cls]) => putLabel(label('e'+id, html, cls), p, dx, dy, S.labels && (S.elements || hotId === id)));
}

/* ---------- stage controls ---------- */
$('opbar').insertAdjacentHTML('beforeend', OPS.map(op => `<button class="sop" data-op="${op.id}" title="${op.name}">${op.html}</button>`).join('') + '<button class="sop reset" id="reset">Reset</button>');
$('opbar').addEventListener('click', e => { const b = e.target.closest('[data-op]'); if (b) applyOp(b.dataset.op); });
$('reset').addEventListener('click', () => { resetOp(); Object.assign(cam, CAM0); });
function syncToggles(){
  $('tg-axes').setAttribute('aria-pressed', S.axes);
  $('tg-elem').setAttribute('aria-pressed', S.elements);
  $('tg-labels').setAttribute('aria-pressed', S.labels);
}
$('tg-axes').onclick = () => { S.axes = !S.axes; syncToggles(); };
$('tg-elem').onclick = () => { S.elements = !S.elements; syncToggles(); };
$('tg-labels').onclick = () => { S.labels = !S.labels; syncToggles(); };
function renderShowing(){
  const el = $('showing');
  if (!S.field){ el.innerHTML = ''; return; }
  const F = FIELD_INFO(S.field);
  el.innerHTML = `<span><b>${F.html}</b>${F.ir ? ' ' + chip(F.ir) : ''}</span><span class="ph"><i class="p"></i>+ <i class="n"></i>−</span>`;
}
// show a field in the viewer (null = the bare molecule)
function show(id, opts={}){
  S.field = id || null;
  if (!opts.keepOp) resetOp();
  syncOrbital(opts.coarse);
  renderShowing();
  if (!opts.keepOp) setCaption(defaultCaption());
}

/* ---------- lesson helpers ---------- */
const STEP_COUNT = 8;
const eyebrow = i => `<p class="eyebrow">Step ${i} of ${STEP_COUNT}</p>`;
const gl = (key, text) => `<button class="gl" type="button" data-glo="${key}">${text}</button>`;
const opHead = (first='') => `<thead><tr><th>${first}</th>${OPS.map(op => `<th>${op.html}</th>`).join('')}</tr></thead>`;
const cellCls = c => c > 0 ? 'p1' : c < 0 ? 'm1' : 'z';
const charCells = (ch, color) => ch.map(c => `<td class="${color ? cellCls(c) : ''}">${fmt(c)}</td>`).join('');
const opButtons = () => `<div class="btnrow">${OPS.map(op => `<button class="btn" data-op="${op.id}">${op.html}</button>`).join('')}</div>`;
function d2hTable(o={}){
  const head = `<thead><tr><th class="grpname">D<sub>2h</sub></th>${OPS.map(op => `<th>${op.html}</th>`).join('')}<th></th><th></th></tr></thead>`;
  const rows = IRREPS.filter(ir => !o.only || o.only.includes(ir.id)).map(ir =>
    `<tr ${o.click ? `data-ctrow="${ir.id}" tabindex="0" aria-label="Show a function with ${ir.id} symmetry"` : ''} class="${o.sel === ir.id ? 'on' : ''}"><th>${chipBtn(ir)}</th>${charCells(ir.chi, o.color)}<td class="fn">${ir.lin}</td><td class="fn">${ir.quad}</td></tr>`).join('');
  return `<div class="tablewrap"><table class="ctab">${head}<tbody>${rows}</tbody></table></div>`;
}
function dinfTable(only){
  return `<div class="tablewrap"><table class="ctab"><thead><tr><th class="grpname">D<sub>∞h</sub></th>${DINF_HEAD.map(h => `<th>${h}</th>`).join('')}<th></th><th></th></tr></thead><tbody>${
    DINF.filter(d => !only || only.includes(d.id)).map(d => `<tr><th><span class="chip ${d.cls}">${d.html}</span></th>${d.chi.map(c => `<td>${c}</td>`).join('')}<td class="fn">${d.lin}</td><td class="fn">${d.quad}</td></tr>`).join('')
  }</tbody></table></div>`;
}
const corrTable = () => `<div class="tablewrap"><table><thead><tr><th>D<sub>∞h</sub> species</th><th>becomes in D<sub>2h</sub></th><th>O<sub>2</sub> orbitals</th></tr></thead><tbody>${
  ['Sg+','Su+','Pu','Pg'].map(id => { const d = dinfById(id); const mos = MOS.filter(m => m.dinf === id);
    return `<tr><th><span class="chip ${d.cls}">${d.html}</span></th><td class="fn" style="font-style:normal">${d.corr.map(c => chip(irById(c))).join(' + ')}</td><td class="fn" style="font-style:normal">${[...new Set(mos.map(m => m.html.replace(/\(<i>[xy]<\/i>\)/, '')))].join(', ')}</td></tr>`; }).join('')
}</tbody></table></div>`;
const fieldBtn = (id, nm, sub, extra='') => `<button class="orb ${S.field === id ? 'active' : ''}" data-field="${id}" ${extra}><span class="nm">${nm}</span>${sub ? `<span class="sub">${sub}</span>` : ''}</button>`;
const charBoxes = tests => OPS.map(op => { const v = tests[op.id]; return `<span class="cbox" data-op="${op.id}" title="Apply ${op.id}"><span>${op.html}</span> <b class="${v === undefined ? 'q' : cellCls(v)}">${v === undefined ? '?' : fmtS(v)}</b></span>`; }).join('');

const OPDESC = {
  E:  'Leave the molecule alone. Every object has this operation.',
  C2z:'Turn 180° about the O–O bond. In D<sub>∞h</sub> this is one of the rotations <i>C</i><sub>∞</sub><sup><i>φ</i></sup> by any angle φ.',
  C2y:'Turn 180° about an axis through the middle of the bond, perpendicular to it. The molecule turns end over end.',
  C2x:'The same, about the <i>x</i> axis. D<sub>∞h</sub> has infinitely many of these perpendicular <i>C</i><sub>2</sub> axes.',
  i:  'Send every point straight through the midpoint of the bond to the same distance on the other side.',
  sxy:'Reflect through the plane that cuts the bond in half. In D<sub>∞h</sub> this is σ<sub>h</sub>.',
  sxz:'Reflect through a plane that contains the bond. D<sub>∞h</sub> has infinitely many of these, ∞σ<sub>v</sub>.',
  syz:'Another plane containing the bond, at 90° to the first.',
};

/* ---------- steps ---------- */
const STEPS = [];

STEPS.push({short:'Symmetry', enter(){ show(null); S.elements = true; }, html(){
  const cards = OPS.map(op => {
    const seen = S.seenOps[op.id], swaps = op.M[2][2] < 0;
    return `<article class="opcard">
      <header><span class="opsym">${op.html}</span><span class="opname">${op.name.split(':')[0]}</span></header>
      <p>${OPDESC[op.id]}</p>
      <div class="um"><span class="lbl">The two atoms</span>${seen ? (swaps ? '<b style="color:var(--pg)">swap places</b>' : '<b>stay put</b>') : '<span class="muted">Apply it to find out</span>'}</div>
      <button class="btn" data-op="${op.id}">Apply ${op.html}</button>
    </article>`; }).join('');
  const all = OPS.every(op => S.seenOps[op.id]);
  return `${eyebrow(1)}
  <h2>Symmetry: what group theory keeps track of</h2>
  <p>Group theory is the mathematics of symmetry. For molecular orbitals it answers three practical questions: which atomic orbitals are allowed to combine, how many molecular orbitals of each kind there will be, and what to call them. This lesson uses it to build the molecular orbital (MO) diagram of dioxygen, O<sub>2</sub>, from the atomic orbitals up.</p>
  <h3>Operations and elements</h3>
  <p>A <strong>symmetry operation</strong> moves a molecule into a position you cannot tell apart from where it started. Each operation is carried out about a <strong>symmetry element</strong>: a point, a line or a plane.</p>
  <div class="tablewrap"><table><thead><tr><th>Element</th><th>Operation</th><th>Symbol</th></tr></thead><tbody>
    <tr><th>(the whole object)</th><td class="fn" style="font-style:normal">identity: do nothing</td><td><i>E</i></td></tr>
    <tr><th>rotation axis</th><td class="fn" style="font-style:normal">rotate by 360°/<i>n</i></td><td><i>C<sub>n</sub></i></td></tr>
    <tr><th>mirror plane</th><td class="fn" style="font-style:normal">reflect through the plane</td><td>σ</td></tr>
    <tr><th>inversion centre</th><td class="fn" style="font-style:normal">send (<i>x</i>, <i>y</i>, <i>z</i>) to (−<i>x</i>, −<i>y</i>, −<i>z</i>)</td><td><i>i</i></td></tr>
    <tr><th>improper axis</th><td class="fn" style="font-style:normal">rotate by 360°/<i>n</i>, then reflect ⟂ to the axis</td><td><i>S<sub>n</sub></i></td></tr>
  </tbody></table></div>
  <h3>O<sub>2</sub> belongs to D<sub>∞h</sub></h3>
  <p>O<sub>2</sub> is linear and the same at both ends. Turning it about the bond by <em>any</em> angle leaves it unchanged, so the bond is a <i>C</i><sub>∞</sub> axis, and every plane that contains the bond is a mirror plane. The midpoint of the bond is an inversion centre, there is a mirror plane perpendicular to the bond, and every line through the midpoint perpendicular to the bond is a <i>C</i><sub>2</sub> axis. Together these make the point group <strong>D<sub>∞h</sub></strong>.</p>
  <p class="hint">Want to check? <a href="point-groups.html#o2">Walk through the point-group flowchart for O<sub>2</sub></a>: linear, with a centre of inversion, gives D<sub>∞h</sub>.</p>
  <h3>Working in D<sub>2h</sub></h3>
  <p>D<sub>∞h</sub> has infinitely many operations, and the formulas used later divide by the number of operations. So, as in the <a href="co2-vibrations.html">CO<sub>2</sub> lesson</a>, we use <strong>D<sub>2h</sub></strong> instead: the eight operations of D<sub>∞h</sub> that turn things by 0° or 180° about the <i>x</i>, <i>y</i> and <i>z</i> axes. The <i>z</i> axis runs along the O–O bond. Step 7 translates the answers back to D<sub>∞h</sub>.</p>
  <div class="cards">${cards}</div>
  ${all ? `<div class="callout"><strong>All eight seen.</strong> <i>C</i><sub>2</sub>(<i>y</i>), <i>C</i><sub>2</sub>(<i>x</i>), <i>i</i> and σ(<i>xy</i>) send <i>z</i> to −<i>z</i>, so they swap the two atoms. The other four leave each atom where it is. This difference matters as soon as orbitals sit on the atoms.</div>`
        : `<div class="callout"><strong>Try it.</strong> Drag the molecule to turn it, and apply each operation in the viewer or with the buttons. Which operations swap the two atoms?</div>`}`;
}});

STEPS.push({short:'Character table', enter(){ show(S.ctRow ? 'fn:' + irById(S.ctRow).central : null); S.elements = false; }, html(){
  const ir = S.ctRow && irById(S.ctRow), tests = ir ? (S.fnTests[ir.central] || {}) : {};
  const done = ir && OPS.every(op => op.id in tests);
  return `${eyebrow(2)}
  <h2>Characters and the character table</h2>
  <p>A <strong>representation</strong> records how something, such as an orbital, behaves under every operation of the group. When an operation leaves the orbital in place, there are two possibilities: it is unchanged, or every lobe ends up on a lobe of the opposite sign. The <strong>character</strong> χ records which: <b>+1</b> for unchanged, <b>−1</b> for reversed.</p>
  <p>Take a 2p<sub><i>x</i></sub>-shaped function, <i>x</i>, at the centre of the molecule. A 180° turn about <i>z</i> sends <i>x</i> to −<i>x</i>, so χ(<i>C</i><sub>2</sub>(<i>z</i>)) = −1. Reflection through the <i>xz</i> plane leaves <i>x</i> alone, so χ(σ(<i>xz</i>)) = +1.</p>
  <p>Only certain patterns of +1 and −1 are possible. Each allowed pattern is an <strong>irreducible representation</strong>, and each is one row of the <strong>character table</strong>. D<sub>2h</sub> has eight. The two columns on the right list simple functions with that symmetry: <i>x</i>, <i>y</i>, <i>z</i> (and rotations R), then products such as <i>xz</i>.</p>
  ${d2hTable({click:true, sel:S.ctRow, color:true})}
  <p class="hint">Click a row to show a function with that symmetry in the viewer, then apply operations and compare with the row.</p>
  ${ir ? `<div class="result"><span class="lhs">${chip(ir)}</span><span>looks like <b>${CENTRAL[ir.central].html}</b>${ir.central === 's' ? ' (a sphere: nothing can change it)' : ''}.</span></div>
    <div class="chars" style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">${charBoxes(tests)} <span>${done ? '<span class="fb ok" style="margin:0">Matches the row.</span>' : '<span class="muted">apply all eight</span>'}</span></div>` : ''}
  <h3>Reading the labels</h3>
  <p>The row names are <strong>Mulliken symbols</strong>. Each part of the symbol is a shorthand for one character:</p>
  <ul>
    <li>${gl('A','<b>A</b>')} or ${gl('B','<b>B</b>')}: symmetric or antisymmetric under rotation. In D<sub>2h</sub>, A is +1 under all three <i>C</i><sub>2</sub> rotations and B is −1 under two of them.</li>
    <li>Subscript <b>1, 2, 3</b>: which <i>C</i><sub>2</sub> a B is symmetric under: <i>z</i>, <i>y</i> or <i>x</i>.</li>
    <li>${gl('g','<b>g</b>')} or ${gl('u','<b>u</b>')}: symmetric (χ(<i>i</i>) = +1) or antisymmetric (χ(<i>i</i>) = −1) under inversion.</li>
  </ul>
  <div class="callout"><strong>Glossary.</strong> Tap any dotted term or any coloured label, or the <em>A · B · g · u</em> button at the top of the page, to open the glossary and its label decoder.</div>
  <p>Linear molecules have their own labels: Σ for orbitals that are unchanged by any rotation about the bond, Π for pairs that turn into each other. Their characters depend on the rotation angle φ:</p>
  ${dinfTable(['Sg+','Su+','Pg','Pu'])}
  <p class="muted">Only the four D<sub>∞h</sub> species that O<sub>2</sub>'s valence orbitals use are shown. The full table also has Σ<sup>−</sup> and Δ species.</p>`;
}});

STEPS.push({short:'Atomic orbitals', enter(){ show(S.field && S.field.startsWith('ao:') ? S.field : 'ao:pzA'); S.elements = false; }, html(){
  const k = aoIdx(S.field && S.field.startsWith('ao:') ? S.field.slice(3) : 'pzA'), cur = 'ao:' + AOS[k].id, tests = S.aoTests[cur] || {};
  const rows = OPS.map(op => {
    if (!(op.id in tests)) return `<tr><th>${op.html}</th><td class="q">?</td><td class="q">?</td><td class="q">?</td></tr>`;
    const im = aoImage(k, op);
    return `<tr><th>${op.html}</th><td class="res" style="font-family:var(--body)">${im.s < 0 ? '−' : ''}${AOS[im.k].html}</td><td>${im.moved ? 'no, moved' : 'yes'}</td><td class="${cellCls(im.moved ? 0 : im.s)}">${im.moved ? '0' : fmtS(im.s)}</td></tr>`;
  }).join('');
  const all = OPS.every(op => op.id in tests);
  return `${eyebrow(3)}
  <h2>The atomic orbitals: our basis</h2>
  <p>Each oxygen atom is 1s<sup>2</sup> 2s<sup>2</sup> 2p<sup>4</sup>. Only the valence orbitals, 2s and 2p, take part in bonding. The 1s orbitals are far lower in energy and held tightly to each nucleus, so they hardly overlap.</p>
  <div class="dof" role="img" aria-label="2 atoms times 4 valence orbitals gives 8 atomic orbitals, which make 8 molecular orbitals">
    <div class="s t"><b>2 × 4</b><span>2s, 2p<sub><i>x</i></sub>, 2p<sub><i>y</i></sub>, 2p<sub><i>z</i></sub> on each O</span></div>
    <div class="s r"><b>8</b><span>atomic orbitals in the basis</span></div>
    <div class="s v"><b>8</b><span>molecular orbitals out</span></div>
  </div>
  <p>The set of orbitals we start from is called the <strong>basis</strong>. Orbitals are never created or destroyed in bonding: 8 atomic orbitals (AOs) always give 8 molecular orbitals (MOs). Approximate energies of the oxygen valence orbitals: 2s ≈ −32.4 eV, 2p ≈ −15.9 eV.</p>
  <div class="orbs">${AOS.map(o => fieldBtn('ao:' + o.id, o.html, o.a ? 'on O<sub>B</sub> (right)' : 'on O<sub>A</sub> (left)')).join('')}</div>
  <p class="muted">Every p orbital points the same way on both atoms: the blue (+) lobe of each 2p<sub><i>z</i></sub> faces +<i>z</i>, to the right. Keep this convention in mind for the signs in step 4.</p>
  <h3>What an operation does to one AO</h3>
  <p>Pick an orbital and apply all eight operations. Each one either leaves the orbital on its own atom, with its colours unchanged (+1) or swapped (−1), or carries it onto the other atom.</p>
  <div class="tablewrap"><table class="proj"><thead><tr><th>${AOS[k].html} under</th><th>becomes</th><th>on its own atom?</th><th>adds to χ</th></tr></thead><tbody>${rows}</tbody></table></div>
  ${all ? `<div class="callout"><strong>The "becomes" column</strong> is what step 4 uses to build symmetry-adapted combinations. The last column, summed over a set of orbitals, gives a reducible representation in step 8.</div>` : '<p class="hint">Apply all eight operations to fill in the table.</p>'}
  <h3>Which AOs can combine?</h3>
  <p>Two orbitals mix into molecular orbitals only if they have</p>
  <ol><li><strong>the same symmetry</strong> (the same irreducible representation),</li><li><strong>significant overlap</strong> in space, and</li><li><strong>similar energies</strong>.</li></ol>
  <p>Group theory settles the first condition exactly. To use it, we first need combinations of AOs that each belong to one irreducible representation.</p>`;
}});

/* ---------- step 4: SALCs by the projection operator ---------- */
const GENS = ['sA','pzA','pxA','pyA'];
function project(gen, irId){
  const k = aoIdx(gen), ir = irById(irId);
  const rows = OPS.map((op, j) => ({op, im:aoImage(k, op), chi:ir.chi[j]}));
  const sum = Array(8).fill(0); rows.forEach(r => sum[r.im.k] += r.chi*r.im.s);
  return {rows, sum};
}
const signedAO = (s, k) => `<span class="ao${s < 0 ? ' m' : ''}">${s < 0 ? '−' : ''}${AOS[k].html}</span>`;
function sumHTML(sum){
  const t = sum.map((v,k) => v ? {v,k} : null).filter(Boolean);
  if (!t.length) return '<b>0</b>';
  return t.map((x,i) => `${i ? (x.v < 0 ? ' − ' : ' + ') : (x.v < 0 ? '−' : '')}${Math.abs(x.v)} · ${AOS[x.k].html}`).join('');
}
// every non-zero SALC, in the order of the summary grid
const SALC_LIST = [['sA','Ag'],['sA','B1u'],['pzA','Ag'],['pzA','B1u'],['pxA','B3u'],['pxA','B2g'],['pyA','B2u'],['pyA','B3g']];
const salcVec = (gen, ir) => project(gen, ir).sum.map(v => v/4);

STEPS.push({short:'SALCs', enter(){ show('ao:' + S.gen); S.elements = false; }, html(){
  const {rows, sum} = project(S.gen, S.proj), ir = irById(S.proj), zero = sum.every(v => !v);
  const key = S.gen + '|' + S.proj;
  if (!zero) S.found[key] = true;
  const tbl = rows.map((r,j) => `<tr data-projrow="${j}" class="${S.projRow === j ? 'cur' : ''}" title="Click to apply ${r.op.id} to ${AOS[aoIdx(S.gen)].id}"><th>${r.op.html}</th><td class="res">${signedAO(r.im.s, r.im.k)}</td><td class="${cellCls(r.chi)}">${fmtS(r.chi)}</td><td class="res">${signedAO(r.chi*r.im.s, r.im.k)}</td></tr>`).join('');
  const nFound = SALC_LIST.filter(([g,i]) => S.found[g + '|' + i]).length;
  const grid = SALC_LIST.map(([g,i]) => {
    const got = S.found[g + '|' + i], c = salcVec(g, i), I = irById(i);
    return got ? `<div class="salc"><span class="eq">${lcaoHTML(c, {norm:true})}</span><span class="tag">${chip(I)} from ${AOS[aoIdx(g)].html} <button class="btn sm" data-field="${lcId(c)}">Show</button></span></div>`
               : `<div class="salc q"><span class="eq">?</span><span class="tag">from ${AOS[aoIdx(g)].html}</span></div>`;
  }).join('');
  return `${eyebrow(4)}
  <h2>SALCs: combinations with one symmetry each</h2>
  <p>A single atomic orbital such as 2s(A) does not belong to any one irreducible representation: half of the operations carry it onto the other atom. Combinations of the two atoms' orbitals can. A <strong>symmetry-adapted linear combination (SALC)</strong> is a combination of AOs that transforms as exactly one irreducible representation.</p>
  <p>The <strong>projection operator</strong> builds SALCs mechanically:</p>
  <div class="formula"><i>P</i><sup>(Γ)</sup> φ = Σ<sub><i>R</i></sub> χ<sub>Γ</sub>(<i>R</i>) · <i>R</i> φ</div>
  <ol>
    <li>Pick a generating orbital φ on one atom.</li>
    <li>Apply every operation <i>R</i> and write down what φ becomes (step 3's "becomes" column).</li>
    <li>Multiply each result by the character χ<sub>Γ</sub>(<i>R</i>) from the row of the irreducible representation Γ.</li>
    <li>Add everything up. If the sum is 0, there is no SALC of that symmetry from this orbital.</li>
  </ol>
  <div class="pick"><span class="lbl">Generating orbital</span><div class="opts" role="group" aria-label="Generating orbital">${GENS.map(g => `<button class="pk" data-gen="${g}" aria-pressed="${S.gen === g}">${AOS[aoIdx(g)].html}</button>`).join('')}</div></div>
  <div class="pick"><span class="lbl">Project onto</span><div class="opts" role="group" aria-label="Irreducible representation">${IRREPS.map(i => `<button class="pk" data-proj="${i.id}" aria-pressed="${S.proj === i.id}">${chip(i)}</button>`).join('')}</div></div>
  <div class="tablewrap"><table class="proj"><thead><tr><th><i>R</i></th><th><i>R</i> φ</th><th>χ<sub>${ir.html}</sub>(<i>R</i>)</th><th>χ · <i>R</i> φ</th></tr></thead><tbody>${tbl}
    <tr class="total"><th>Sum</th><td colspan="3" class="res">${sumHTML(sum)}</td></tr></tbody></table></div>
  <p class="hint">Click a row to watch that operation act on ${AOS[aoIdx(S.gen)].html} in the viewer.</p>
  ${zero ? `<p class="fb no">The terms cancel: ${AOS[aoIdx(S.gen)].html} contributes nothing to ${ir.html}. Try another representation.</p>`
         : `<div class="result"><span class="lhs">SALC (${ir.html}) =</span><span class="rep">${lcaoHTML(sum, {norm:true})}</span><button class="btn" data-field="${lcId(sum.map(v => v/4))}">Show in 3D</button></div>
            <p class="muted">Dividing out the common factor and normalising (ignoring overlap) gives the factor 1/√2.</p>`}
  <h3>SALCs found: ${nFound} of 8</h3>
  <p>Each generating orbital gives exactly two SALCs. Find all eight by trying every orbital against every representation.</p>
  <div class="salcs">${grid}</div>
  ${nFound < 8 ? '<div class="btnrow"><button class="btn" data-action="allsalc">Fill in the rest</button></div>' : `<div class="callout"><strong>All eight SALCs.</strong> Every one is the sum or the difference of matching orbitals on the two atoms. Eight AOs have become eight SALCs, each with a definite symmetry.</div>`}
  <div class="callout"><strong>Why does 2p<sub><i>z</i></sub>(A) − 2p<sub><i>z</i></sub>(B) have A<sub>g</sub> symmetry?</strong> Both 2p<sub><i>z</i></sub> orbitals point their blue lobe to the right, so the lobes that face each other start with opposite colours. Subtracting flips B's orbital, and then the facing lobes match. Judge a combination by the colours of the lobes that meet, not by the + or − in the formula.</div>`;
}});

/* ---------- step 5: from SALCs to MOs ---------- */
const MO_ROWS = [['Ag',['2sg','3sg']],['B1u',['2su','3su']],['B3u',['1pux']],['B2u',['1puy']],['B2g',['1pgx']],['B3g',['1pgy']]];
STEPS.push({short:'Build the MOs', enter(){ show(S.field && S.field.startsWith('mo:') ? S.field : 'mo:3sg'); S.elements = false; }, leave(){ if (S.R !== R_EQ){ S.R = R_EQ; syncOrbital(); } }, html(){
  const cur = S.field && S.field.startsWith('mo:') ? moById(S.field.slice(3)) : null;
  const rows = MO_ROWS.map(([i, ids]) => `<tr><th>${chip(irById(i))}</th><td class="res">${ids.map(id => lcaoHTML(moById(id).c)).join('<br>')}</td><td class="res">${ids.map(id => `<button class="btn sm" data-field="mo:${id}">${moById(id).html}</button>`).join(' ')}</td></tr>`).join('');
  const Ang = S.R*BOHR;
  return `${eyebrow(5)}
  <h2>From SALCs to molecular orbitals</h2>
  <p>Now apply the symmetry rule: <strong>only SALCs of the same irreducible representation can mix</strong>. Sort the eight SALCs by symmetry:</p>
  <div class="tablewrap"><table class="proj"><thead><tr><th>Symmetry</th><th>SALCs</th><th>Molecular orbitals</th></tr></thead><tbody>${rows}</tbody></table></div>
  <p>A SALC that is alone in its representation is already a molecular orbital: there is nothing else it is allowed to mix with. Two SALCs share A<sub>g</sub> and two share B<sub>1u</sub>, so in principle the 2s and 2p<sub><i>z</i></sub> combinations can mix (<strong>s–p mixing</strong>). In O<sub>2</sub> the 2s and 2p levels are about 16.5 eV apart, so the mixing is small, and each MO here is drawn as a single SALC.</p>
  <h3>Bonding and antibonding</h3>
  <p>Where the overlapping lobes have the <strong>same colour</strong>, the waves add, electron density builds up between the nuclei, and the MO is <strong>bonding</strong>: lower in energy than the AOs it came from. Where they have <strong>opposite colours</strong>, the waves cancel, a nodal plane cuts the bond, and the MO is <strong>antibonding</strong> (marked *): higher in energy.</p>
  <div class="orbs">${MOS.map(m => fieldBtn('mo:' + m.id, m.html, `${m.bond === 'b' ? 'bonding' : 'antibonding'} · ${m.simple}`)).join('')}</div>
  ${cur ? `<div class="mo active"><div><h4>${cur.html} <span class="muted" style="font-weight:500">(${cur.simple})</span></h4><span class="sub">${cur.bond === 'b' ? 'Bonding' : 'Antibonding'} · ${chipBtn(irById(cur.ir))}</span></div><span></span>
      <p style="grid-column:1/-1;margin:0;font-size:14px">${lcaoHTML(cur.c, {norm:true})}. ${cur.desc}</p></div>` : ''}
  <h3>Bring the atoms together</h3>
  <p>Drag the slider to change the O–O distance and watch the molecular orbital form. Far apart, it is just two separate atomic orbitals. As they approach, lobes of the same colour merge, while lobes of opposite colour are squeezed apart by a node.</p>
  <div class="slider"><span class="lbl">O–O distance</span><input type="range" id="rslider" min="1.1" max="4" step="0.01" value="${Ang.toFixed(2)}" aria-label="O–O distance in ångström"><output id="rout">${Ang.toFixed(2)} Å</output><button class="btn sm" data-action="req">Equilibrium, 1.21 Å</button></div>
  <p class="hint">The real bond length is 1.21 Å. This slider changes only the picture, not the energies.</p>`;
}});

/* ---------- step 6: the MO diagram ---------- */
const plain = h => h.replace(/<[^>]+>/g, '');
// SVG <text> cannot hold HTML, so turn sub/sup/i into tspans (the zero-width tspan restores the baseline)
const svgText = h => h
  .replace(/<sub>(.*?)<\/sub>/g, '<tspan dy="3.5" font-size="0.78em">$1</tspan><tspan dy="-3.5">​</tspan>')
  .replace(/<sup>(.*?)<\/sup>/g, '<tspan dy="-5" font-size="0.78em">$1</tspan><tspan dy="5">​</tspan>')
  .replace(/<i>(.*?)<\/i>/g, '<tspan font-style="italic">$1</tspan>');
function levelLabel(L, style){
  const ms = L.mos.map(moById);
  if (style === 'd2h') return ms.map(m => irById(m.ir).html.toLowerCase()).join(', ');
  if (style === 'simple') return ms[0].simple;
  return ms[0].html.replace(/\(<i>[xy]<\/i>\)/, '');
}
const elec = (x, y, up, cls='') => up
  ? `<path class="el ${cls}" d="M${x} ${y+8}V${y-8}M${x-3.5} ${y-4}L${x} ${y-8}L${x+3.5} ${y-4}"/>`
  : `<path class="el ${cls}" d="M${x} ${y-8}V${y+8}M${x-3.5} ${y+4}L${x} ${y+8}L${x+3.5} ${y+4}"/>`;
const elecs = (x, spins, y, cls) => spins.length === 2 ? elec(x-5, y, true, cls) + elec(x+5, y, false, cls) : spins.length ? elec(x, y, spins[0] > 0, cls) : '';
const narrow = matchMedia('(max-width:560px)');
function moDiagram(){
  const sp = spById(S.sp), el = sp.el, occ = occupy(S.nElec, el), cp = narrow.matches;   // phones get a narrower drawing with larger text
  const VW = cp ? 452 : 600, yE = E => 30 + (-3 - E)*(420/37), xA = cp ? 84 : 96, xM = cp ? 228 : 300, xB = cp ? 372 : 504, ax = cp ? 12 : 18;
  const aoE = AO_E[el], ys = yE(aoE.s), yp = yE(aoE.p);
  let s = `<line class="axis" x1="${ax}" y1="452" x2="${ax}" y2="26"/><path class="axis" d="M${ax-5} 34L${ax} 24L${ax+5} 34" fill="none"/><text class="axlab" x="${ax-8}" y="240" transform="rotate(-90 ${ax-8} 240)" text-anchor="middle">Energy (schematic)</text>`;
  const cols = [[xA, `${el}<sub>A</sub>`], [xM, `${sp.html}`], [xB, `${el}<sub>B</sub>`]];
  cols.forEach(([x, h]) => s += `<text class="collab" x="${x}" y="468" text-anchor="middle">${svgText(h)}</text>`);
  // atomic orbitals, with the electrons each free atom brings (faint)
  const pe = el === 'O' ? [[1,-1],[1],[1]] : [[1],[1],[1]];
  [xA, xB].forEach((x, side) => {
    const lx = side ? x + 48 : x - 48, an = side ? 'start' : 'end';
    s += `<g class="lv ao"><line class="bar" x1="${x-26}" x2="${x+26}" y1="${ys}" y2="${ys}"/><text x="${lx}" y="${ys+4}" text-anchor="${an}">2s</text>${elecs(x, [1,-1], ys, 'ao')}</g>`;
    s += `<g class="lv ao">${[-30,0,30].map((dx,j) => `<line class="bar" x1="${x+dx-11}" x2="${x+dx+11}" y1="${yp}" y2="${yp}"/>${elecs(x+dx, pe[j], yp, 'ao')}`).join('')}<text x="${lx}" y="${yp+4}" text-anchor="${an}">2p</text></g>`;
  });
  // correlation lines, then the MO levels on top
  let lines = '', lv = '';
  LEVELS.forEach(L => {
    const y = yE(L.E[el]), pair = L.mos.length === 2, half = pair ? 42 : 30, from2s = L.id === '2sg' || L.id === '2su';
    const [ya, ea] = from2s ? [ys, 26] : [yp, 41];
    lines += `<path class="conn" d="M${xA+ea} ${ya}L${xM-half} ${y}"/><path class="conn" d="M${xB-ea} ${ya}L${xM+half} ${y}"/>`;
    L.mos.forEach((id, j) => {
      const m = moById(id), cx = pair ? xM + (j ? 24 : -24) : xM, hw = pair ? 18 : 30, sel = S.field === 'mo:' + id;
      const lab = j === L.mos.length - 1 ? `<text x="${xM + half + 10}" y="${y+4}" style="paint-order:stroke;stroke:var(--surface);stroke-width:4px;stroke-linejoin:round">${svgText(levelLabel(L, S.label))}</text>` : '';
      lv += `<g class="lv mo${sel ? ' sel' : ''}" data-mo="${id}" role="button" tabindex="0" aria-label="${plain(m.html)}, ${m.bond === 'b' ? 'bonding' : 'antibonding'}, ${(occ[L.id][j] || []).length} electrons. Show in 3D">
        <rect class="hit" x="${cx-hw-6}" y="${y-13}" width="${2*hw+12 + (lab ? 70 : 0)}" height="26"/>
        <line class="bar" x1="${cx-hw}" x2="${cx+hw}" y1="${y}" y2="${y}"/>${elecs(cx, occ[L.id][j] || [], y)}${lab}</g>`;
    });
  });
  return `<div class="mod${cp ? ' compact' : ''}"><svg viewBox="0 0 ${VW} 476" role="group" aria-label="Molecular orbital diagram of ${plain(sp.html)}">${s}${lines}${lv}</svg></div>`;
}
narrow.addEventListener && narrow.addEventListener('change', () => { if (STEPS[S.step].short === 'MO diagram') renderLesson(); });
const SP_NOTE = {
  'O2':  'Two electrons sit alone in the 1π<sub>g</sub>* pair with parallel spins, so O<sub>2</sub> is <strong>paramagnetic</strong>: liquid oxygen is pulled toward a magnet. A Lewis structure, O=O with every electron paired, cannot explain this. The ground state is a triplet, <sup>3</sup>Σ<sub>g</sub><sup>−</sup>.',
  'O2+': 'Removing an electron from O<sub>2</sub> takes it from an <em>antibonding</em> orbital, so the bond gets stronger and shorter, not weaker. The dioxygenyl cation is found in salts such as O<sub>2</sub><sup>+</sup>[PtF<sub>6</sub>]<sup>−</sup>.',
  'O2-': 'Superoxide, found in KO<sub>2</sub>. The extra electron goes into 1π<sub>g</sub>*, so the bond is weaker and longer than in O<sub>2</sub>. One electron is still unpaired.',
  'O22-':'Peroxide, found in Na<sub>2</sub>O<sub>2</sub> and (protonated) in H<sub>2</sub>O<sub>2</sub>. Both 1π<sub>g</sub>* orbitals are full, every electron is paired, and the bond is a single bond.',
  'N2':  'In N<sub>2</sub> the 2s and 2p levels are closer in energy, so the two A<sub>g</sub> SALCs mix strongly (they are allowed to, because they share a symmetry). The mixing pushes 3σ<sub>g</sub> up, above 1π<sub>u</sub>. With 10 valence electrons and a triple bond, N<sub>2</sub> is diamagnetic.',
};
STEPS.push({short:'MO diagram', enter(){ show(S.field && S.field.startsWith('mo:') ? S.field : 'mo:1pgx'); S.elements = false; }, html(){
  const sp = spById(S.sp), occ = occupy(S.nElec, sp.el), t = tally(occ), full = S.nElec === sp.n;
  const cfg = levelOrder(sp.el).map(id => { const n = (occ[id] || []).reduce((a,o) => a + o.length, 0); return n ? `(${levelLabel(levelById(id), 'dinf')})<sup>${n}</sup>` : ''; }).filter(Boolean).join(' ');
  return `${eyebrow(6)}
  <h2>The molecular orbital diagram</h2>
  <p>The atomic orbitals of each atom sit on the outside and the molecular orbitals in the middle. Dashed lines show which AOs each MO is made from. Bonding MOs drop below the AOs that form them and antibonding MOs rise above. <strong>Click any level</strong> to see that orbital in 3D.</p>
  <div class="ctl"><span class="lbl" id="lab-lbl">Labels</span><div class="seg" role="group" aria-labelledby="lab-lbl">
    <button data-label="dinf" aria-pressed="${S.label === 'dinf'}">D<sub>∞h</sub>: σ<sub>g</sub>, π<sub>u</sub></button><button data-label="d2h" aria-pressed="${S.label === 'd2h'}">D<sub>2h</sub>: a<sub>g</sub>, b<sub>3u</sub></button><button data-label="simple" aria-pressed="${S.label === 'simple'}">Simple: σ<sub>2s</sub>, π*<sub>2p</sub></button></div></div>
  <div class="ctl"><span class="lbl" id="sp-lbl">Molecule</span><div class="seg" role="group" aria-labelledby="sp-lbl">${SPECIES.map(x => `<button data-sp="${x.id}" aria-pressed="${S.sp === x.id}">${x.html}</button>`).join('')}</div></div>
  ${moDiagram()}
  <div class="btnrow"><button class="btn primary" data-action="e+" ${S.nElec >= sp.n ? 'disabled' : ''}>Add an electron</button><button class="btn" data-action="e-" ${S.nElec <= 0 ? 'disabled' : ''}>Remove one</button><button class="btn" data-action="efill">Fill all ${sp.n}</button><button class="btn" data-action="e0">Empty</button></div>
  <div class="readout">
    <div class="s ${full ? 'hi' : ''}"><b>${S.nElec} / ${sp.n}</b><span>valence electrons placed</span></div>
    <div class="s ${full ? 'hi' : ''}"><b>${full ? fmt(t.bo) : '…'}</b><span>bond order${full ? `, ½(${t.b} − ${t.a})` : ''}</span></div>
    <div class="s ${full ? 'hi' : ''}"><b>${full ? t.unp : '…'}</b><span>${full ? (t.unp ? 'unpaired: paramagnetic' : 'unpaired: diamagnetic') : 'unpaired electrons'}</span></div>
  </div>
  ${cfg ? `<div class="config">${cfg}</div>` : ''}
  ${full ? `<div class="callout"><strong>${sp.html}${sp.name ? ` (${sp.name})` : ''}: bond order ${fmt(t.bo)}, bond length about ${sp.len} pm.</strong> ${SP_NOTE[sp.id]}</div>` : `<p class="hint">Fill the diagram from the bottom up. Each orbital holds two electrons with opposite spins (Pauli), and a degenerate pair gets one electron in each orbital, spins parallel, before any pairing (Hund).</p>`}
  <h3>Reading the diagram</h3>
  <ul>
    <li><strong>Bond order</strong> = ½(bonding electrons − antibonding electrons). For O<sub>2</sub>: ½(8 − 4) = 2, a double bond.</li>
    <li>The highest occupied orbitals of O<sub>2</sub> are the half-filled 1π<sub>g</sub>* pair; the lowest empty one is 3σ<sub>u</sub>*. Both control how O<sub>2</sub> reacts.</li>
    <li>Compare the ions: adding electrons to 1π<sub>g</sub>* lowers the bond order and lengthens the bond (O<sub>2</sub><sup>+</sup> 112 pm, O<sub>2</sub> 121 pm, O<sub>2</sub><sup>−</sup> 134 pm, O<sub>2</sub><sup>2−</sup> 149 pm).</li>
  </ul>
  <p class="muted">Energies are schematic. The first ionization energy of O<sub>2</sub>, 12.07 eV, measures how tightly the 1π<sub>g</sub>* electrons are held.</p>`;
}});

/* ---------- step 7: symmetry of the MOs ---------- */
STEPS.push({short:'MO symmetry', live:true, enter(){ show(S.field && S.field.startsWith('mo:') ? S.field : 'mo:2sg'); S.elements = false; }, html(){
  const cards = MOS.map(m => {
    const tests = S.moTests[m.id] || {}, known = OPS.every(op => op.id in tests), ir = irById(m.ir), d = dinfById(m.dinf), act = S.field === 'mo:' + m.id;
    return `<article class="mo ${act ? 'active' : ''}" data-card="mo:${m.id}">
      <div><h4>${m.html} <span class="muted" style="font-weight:500">${m.simple}</span></h4><span class="sub">${lcaoHTML(m.c)}</span></div>
      <button class="btn ${act ? 'active' : ''}" data-field="mo:${m.id}">${act ? 'Showing' : 'Show'}</button>
      <div class="chars">${charBoxes(tests)} <span>→ ${known ? `${chipBtn(ir)} <span class="muted">D<sub>∞h</sub>:</span> <span class="chip ${d.cls}">${d.lo}</span>` : '<span class="muted">apply all eight</span>'}</span></div>
    </article>`; }).join('');
  const done = MOS.every(m => OPS.every(op => op.id in (S.moTests[m.id] || {})));
  return `${eyebrow(7)}
  <h2>The symmetry of each molecular orbital</h2>
  <p>Every MO was built from SALCs of one irreducible representation, so each has a definite symmetry label. Check this directly. Show an orbital, apply the eight operations, and note whether it lands on itself with the same colours (<b>+1</b>) or with every colour reversed (<b>−1</b>). The row of characters names the representation. You can also click a box below to apply that operation.</p>
  <p class="hint">The quickest single test is inversion <i>i</i>: it decides ${gl('g','g')} or ${gl('u','u')} on its own.</p>
  <div class="mos">${cards}</div>
  ${done ? '' : '<div class="btnrow"><button class="btn" data-action="mofill">Fill in all the characters</button></div>'}
  ${done ? `<div class="callout"><strong>All eight identified.</strong> 2 A<sub>g</sub>, 2 B<sub>1u</sub>, and one each of B<sub>2g</sub>, B<sub>3g</sub>, B<sub>2u</sub> and B<sub>3u</sub>.</div>` : ''}
  <h3>Back to D<sub>∞h</sub></h3>
  <p>D<sub>2h</sub> labels are all one-dimensional, so they cannot show that 1π<sub>u</sub>(<i>x</i>) and 1π<sub>u</sub>(<i>y</i>) are really one degenerate pair. In the full group the two turn into each other: a rotation by any angle φ about the bond mixes them, which is why their D<sub>∞h</sub> character is 2 cos φ. A correlation table translates the labels:</p>
  ${corrTable()}
  <h3>A pattern worth remembering</h3>
  <div class="tablewrap"><table><thead><tr><th></th><th>bonding</th><th>antibonding</th></tr></thead><tbody>
    <tr><th>σ</th><td class="fn" style="font-style:normal"><span class="chip sg">σ<sub>g</sub></span></td><td class="fn" style="font-style:normal"><span class="chip su">σ<sub>u</sub>*</span></td></tr>
    <tr><th>π</th><td class="fn" style="font-style:normal"><span class="chip pu">π<sub>u</sub></span></td><td class="fn" style="font-style:normal"><span class="chip pg">π<sub>g</sub>*</span></td></tr>
  </tbody></table></div>
  <p>Seen from the centre of the bond, a σ bonding orbital looks like an s orbital (unchanged by inversion, g), but a π bonding orbital looks like a p orbital (sign reversed by inversion, u). So the bonding/antibonding and g/u labels line up one way for σ and the other way for π. <strong>Do not read g as "bonding".</strong></p>`;
}});

/* ---------- step 8: reducible representations ---------- */
const GAMMA = {
  s: OPS.map(op => [0,4].reduce((t,k) => { const im = aoImage(k, op); return t + (im.moved ? 0 : im.s); }, 0)),
  z: OPS.map(op => [3,7].reduce((t,k) => { const im = aoImage(k, op); return t + (im.moved ? 0 : im.s); }, 0)),
  x: OPS.map(op => [1,5].reduce((t,k) => { const im = aoImage(k, op); return t + (im.moved ? 0 : im.s); }, 0)),
  y: OPS.map(op => [2,6].reduce((t,k) => { const im = aoImage(k, op); return t + (im.moved ? 0 : im.s); }, 0)),
};
GAMMA.all = OPS.map((op,j) => GAMMA.s[j] + GAMMA.z[j] + GAMMA.x[j] + GAMMA.y[j]);
const GN = {s:'Γ<sub>2s</sub>', z:'Γ<sub>2p<i>z</i></sub>', x:'Γ<sub>2p<i>x</i></sub>', y:'Γ<sub>2p<i>y</i></sub>', all:'Γ<sub>valence</sub>'};
const INPUT_ROWS = ['z','x'];
function inputRow(r){
  const c = S.chk.g, ans = GAMMA[r];
  return `<tr><th>${GN[r]}</th>${OPS.map((op,j) => { const id = `g-${r}-${op.id}`, st = c ? (parseNum(S.inputs[id]) === ans[j] ? 'ok' : 'no') : '';
    return `<td><input class="cell-in ${st}" id="${id}" inputmode="numeric" autocomplete="off" aria-label="${plain(GN[r])} under ${op.id}" value="${S.inputs[id] ?? ''}"></td>`; }).join('')}</tr>`;
}
STEPS.push({short:'Reducible Γ', enter(){ show('ao:pxA'); S.elements = false; }, html(){
  const nAll = reduce(GAMMA.all), c = S.chk.g, gOk = S.rev.g || (c && INPUT_ROWS.every(r => OPS.every((op,j) => parseNum(S.inputs[`g-${r}-${op.id}`]) === GAMMA[r][j])));
  const cn = S.chk.n, nOk = S.rev.n || (cn && IRREPS.every((ir,k) => parseNum(S.inputs['n-' + ir.id]) === nAll[k]));
  const nInputs = IRREPS.map((ir,k) => { const id = 'n-' + ir.id, st = cn ? (parseNum(S.inputs[id]) === nAll[k] ? 'ok' : 'no') : '';
    return `<td><input class="cell-in ${st}" id="${id}" inputmode="numeric" autocomplete="off" aria-label="times ${ir.id} appears" value="${S.inputs[id] ?? ''}"></td>`; }).join('');
  const work = IRREPS.map((ir,k) => `<i>n</i>(${ir.html}) = ⅛ [ ${GAMMA.all.map((x,j) => `(${fmt(x)})(${fmt(ir.chi[j])})`).join(' + ')} ] = <b>${nAll[k]}</b>`).join('<br>');
  const dinfSum = '2Σ<sub>g</sub><sup>+</sup> + 2Σ<sub>u</sub><sup>+</sup> + Π<sub>g</sub> + Π<sub>u</sub>';
  return `${eyebrow(8)}
  <h2>Reducible representations: predicting it all at once</h2>
  <p>In step 4 we found the SALCs by trying every orbital against every representation. A <strong>reducible representation</strong> predicts the answer in one go. It uses a whole <em>set</em> of equivalent orbitals as its basis, and its character for each operation is the sum of what each orbital in the set contributes. That is step 3's last column:</p>
  <ul>
    <li>orbital carried onto the other atom: <b>0</b></li>
    <li>orbital left in place and unchanged: <b>+1</b></li>
    <li>orbital left in place with its colours reversed: <b>−1</b></li>
  </ul>
  <p>For the two 2s orbitals: <i>E</i>, <i>C</i><sub>2</sub>(<i>z</i>), σ(<i>xz</i>) and σ(<i>yz</i>) leave both in place, unchanged (2 each); the other four swap the atoms (0).</p>
  <h3>Your turn</h3>
  <p>Fill in the rows for the pair of 2p<sub><i>z</i></sub> orbitals and the pair of 2p<sub><i>x</i></sub> orbitals. Use the viewer: show 2p<sub><i>x</i></sub>(A) and apply operations.</p>
  <div class="btnrow tight">${['pzA','pxA','pyA'].map(id => `<button class="btn sm ${S.field === 'ao:' + id ? 'active' : ''}" data-field="ao:${id}">Show ${AOS[aoIdx(id)].html}</button>`).join('')}</div>
  <div class="tablewrap"><table>${opHead()}<tbody>
    <tr><th>${GN.s}</th>${charCells(GAMMA.s)}</tr>
    ${inputRow('z')}${inputRow('x')}
    ${gOk ? `<tr><th>${GN.y}</th>${charCells(GAMMA.y)}</tr><tr class="total"><th>${GN.all}</th>${charCells(GAMMA.all)}</tr>` : ''}
  </tbody></table></div>
  <div class="btnrow"><button class="btn primary" data-action="checkg">Check</button><button class="btn" data-action="revealg">Show answer</button></div>
  ${c && !gOk ? '<p class="fb no">Some entries are off. Remember that a p orbital keeps its sign only if the operation leaves its own coordinate (<i>x</i> or <i>z</i>) unchanged.</p>' : ''}
  ${gOk ? `<p class="fb ok">${c && !S.rev.g ? 'Correct. ' : ''}2p<sub><i>y</i></sub> behaves like 2p<sub><i>x</i></sub> with σ(<i>xz</i>) and σ(<i>yz</i>) swapped. Adding all four rows gives ${GN.all}, whose basis is all eight valence AOs: χ(<i>E</i>) = 8.</p>
    <h3>Reduce it</h3>
    <p>The reduction formula says how many times each irreducible representation appears in Γ. D<sub>2h</sub> has <i>h</i> = 8 operations, each in a class of its own:</p>
    <div class="formula"><i>n</i><sub><i>i</i></sub> = <span class="frac"><span>1</span><span><i>h</i></span></span> Σ<sub><i>R</i></sub> χ(<i>R</i>) · χ<sub><i>i</i></sub>(<i>R</i>)</div>
    ${d2hTable({only:IRREPS.map(i => i.id)})}
    <div class="tablewrap"><table><thead><tr><th></th>${IRREPS.map(ir => `<th>${chip(ir)}</th>`).join('')}</tr></thead><tbody><tr><th>times in ${GN.all}</th>${nInputs}</tr></tbody></table></div>
    <div class="btnrow"><button class="btn primary" data-action="checkn">Check</button><button class="btn" data-action="work">${S.showWork ? 'Hide working' : 'Show working'}</button></div>
    ${cn && !nOk ? '<p class="fb no">Not quite. Open the working to see where your sum differs.</p>' : ''}
    ${S.showWork ? `<div class="work">${work}</div>` : ''}
    ${nOk || S.showWork ? `<div class="result"><span class="lhs">${GN.all} =</span><span class="rep">${repHTML(nAll)}</span><span class="muted">8 AOs: 2 + 1 + 1 + 2 + 1 + 1 = 8</span></div>
      <p>That is exactly the list of SALCs from step 4 and the MO labels from step 7. The reducible representation predicted them before any orbital was combined: <strong>8 AOs in, 8 MOs out, with these symmetries</strong>. Translated to D<sub>∞h</sub> with the correlation table: ${GN.all} = ${dinfSum}.</p>
      <p class="muted">You can also reduce each row separately: ${GN.s} = ${repHTML(reduce(GAMMA.s))}, ${GN.z} = ${repHTML(reduce(GAMMA.z))}, ${GN.x} = ${repHTML(reduce(GAMMA.x))}, ${GN.y} = ${repHTML(reduce(GAMMA.y))}. Since ${GN.s} and ${GN.z} contain the same species, the 2s and 2p<sub><i>z</i></sub> SALCs are allowed to mix: that is the s–p mixing of step 6.</p>
      <h3>The whole method</h3>
      <ol>
        <li>Find the point group (D<sub>∞h</sub>, worked in D<sub>2h</sub>).</li>
        <li>Choose a basis: the valence AOs.</li>
        <li>Build the reducible representation Γ and reduce it: which symmetries appear, and how often.</li>
        <li>Use the projection operator to build one SALC for each.</li>
        <li>Combine SALCs of the same symmetry into MOs, and order them by energy.</li>
        <li>Fill the MO diagram with electrons and read off the bond order and magnetism.</li>
      </ol>
      <div class="callout"><strong>Going further.</strong> The symmetry of the whole molecule follows from its electrons. Filled shells are totally symmetric, so only the two 1π<sub>g</sub>* electrons matter, and their direct product Π<sub>g</sub> × Π<sub>g</sub> = Σ<sub>g</sub><sup>+</sup> + Σ<sub>g</sub><sup>−</sup> + Δ<sub>g</sub>. With parallel spins (Hund's rule), the Pauli principle allows only Σ<sub>g</sub><sup>−</sup>, giving the ground state <sup>3</sup>Σ<sub>g</sub><sup>−</sup>. The paired-spin <sup>1</sup>Δ<sub>g</sub> state, 0.98 eV higher, is the reactive "singlet oxygen".</div>` : ''}` : ''}`;
}});

/* ---------- A, B, g, u glossary: drawer, demos and label decoder ---------- */
const drawer = $('gdrawer'), gback = $('gback');
let gReturn = null;
function openGlossary(target){
  if (!drawer.classList.contains('open')){
    gReturn = document.activeElement;
    drawer.classList.add('open'); gback.classList.add('open'); drawer.setAttribute('aria-hidden', 'false');
    setTimeout(() => $('gclose').focus({preventScroll:true}), 30);
  }
  let el = null;
  if (target && target.startsWith('dec:')){ decode(target.slice(4)); el = $('g-decoder'); }
  else if (target && target !== 'top') el = $('g-' + target);
  if (el){ el.scrollIntoView({block:'start', behavior: reduced ? 'auto' : 'smooth'}); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1400); }
  else $('gscroll').scrollTop = 0;
}
function closeGlossary(){
  drawer.classList.remove('open'); gback.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true');
  if (gReturn && gReturn.focus) gReturn.focus({preventScroll:true});
}
$('gclose').onclick = closeGlossary;
gback.onclick = closeGlossary;
document.addEventListener('keydown', e => {
  if (!drawer.classList.contains('open')) return;
  if (e.key === 'Escape'){ e.preventDefault(); closeGlossary(); }
  if (e.key === 'Tab'){   // keep focus inside the open panel
    const f = [...drawer.querySelectorAll('button, a[href]')].filter(x => x.offsetParent !== null);
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]){ e.preventDefault(); f[f.length-1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length-1]){ e.preventDefault(); f[0].focus(); }
  }
});
drawer.querySelectorAll('.gnav a').forEach(a => a.addEventListener('click', e => { e.preventDefault(); openGlossary(a.getAttribute('href').slice(3)); }));
const DEMOS = {A:['mo:3sg','C2y'], B:['mo:1pux','C2z'], g:['mo:1pgx','i'], u:['mo:1pux','i']};
drawer.addEventListener('click', e => {
  const d = e.target.closest('[data-gdemo]');
  if (d){
    const [field, op] = DEMOS[d.dataset.gdemo];
    if (matchMedia('(max-width:900px)').matches) closeGlossary();   // on phones the panel covers the model
    show(field); renderLesson(); setTimeout(() => applyOp(op), 350);
    return;
  }
  const b = e.target.closest('[data-dec]'); if (b) decode(b.dataset.dec);
});
const C2AX = {C2z:'<i>C</i><sub>2</sub>(<i>z</i>)', C2y:'<i>C</i><sub>2</sub>(<i>y</i>)', C2x:'<i>C</i><sub>2</sub>(<i>x</i>)'};
function decode(id){
  const out = $('dec-out');
  document.querySelectorAll('[data-dec]').forEach(b => b.setAttribute('aria-pressed', b.dataset.dec === id));
  const ir = irById(id), d = dinfById(id);
  if (ir){
    const ax = ['C2z','C2y','C2x'], plus = ax.filter(a => ir.chi[OPS.findIndex(o => o.id === a)] > 0), minus = ax.filter(a => !plus.includes(a));
    const gu = id.endsWith('g'), mos = MOS.filter(m => m.ir === id);
    const lines = [
      id[0] === 'A' ? `<li><b>A</b>: χ = +1 under all three <i>C</i><sub>2</sub> rotations.</li>`
                    : `<li><b>B</b>: χ = −1 under two of the three <i>C</i><sub>2</sub> rotations, ${minus.map(a => C2AX[a]).join(' and ')}.</li><li><b>${id[1]}</b>: χ = +1 under the third, ${C2AX[plus[0]]}.</li>`,
      `<li><b>${gu ? 'g' : 'u'}</b>: χ(<i>i</i>) = ${gu ? '+1, symmetric' : '−1, antisymmetric'} under inversion.</li>`,
      ir.lin || ir.quad ? `<li>Transforms like ${[ir.lin, ir.quad].filter(Boolean).join(', ')}.</li>` : '<li>The simplest function with this symmetry is <i>xyz</i>.</li>',
      `<li>In O<sub>2</sub>: ${mos.length ? mos.map(m => m.html).join(' and ') : 'no valence orbital has this symmetry'}.</li>`,
    ];
    const hot = ['C2z','C2y','C2x','i'];
    out.innerHTML = `<b>${ir.html}</b><div class="row">${OPS.map((op,j) => `<span class="${hot.includes(op.id) ? 'hot' : ''}">${op.html}<b class="${cellCls(ir.chi[j])}">${fmtS(ir.chi[j])}</b></span>`).join('')}</div><ul>${lines.join('')}</ul>${mos.length ? `<button class="btn sm" type="button" data-gdemo-mo="${mos[0].id}">Show ${mos[0].html} in 3D</button>` : ''}`;
  } else if (d){
    const isPi = d.id.startsWith('P'), gu = d.id.includes('g'), mos = MOS.filter(m => m.dinf === d.id);
    out.innerHTML = `<b>${d.html}</b><ul>
      <li><b>${isPi ? 'Π' : 'Σ'}</b>: ${isPi ? 'a degenerate pair. A turn by φ about the bond mixes the two partners, so χ(<i>C</i><sub>∞</sub><sup><i>φ</i></sup>) = 2 cos φ. In orbital names: π, one nodal plane containing the bond.' : 'one-dimensional and unchanged by a turn through any angle about the bond. In orbital names: σ, no nodal plane containing the bond.'}</li>
      <li><b>${gu ? 'g' : 'u'}</b>: ${gu ? 'symmetric' : 'antisymmetric'} under inversion.</li>
      ${isPi ? '' : '<li><b>+</b>: symmetric under every mirror plane σ<sub>v</sub> that contains the bond.</li>'}
      <li>Becomes ${d.corr.map(c => irById(c).html).join(' + ')} in D<sub>2h</sub>.</li>
      <li>In O<sub>2</sub>: ${[...new Set(mos.map(m => m.html.replace(/\(<i>[xy]<\/i>\)/, '')))].join(' and ')}.</li></ul>`;
  }
}
$('dec-d2h').innerHTML = IRREPS.map(ir => `<button class="pk" type="button" data-dec="${ir.id}" aria-pressed="false">${chip(ir)}</button>`).join('');
$('dec-dinf').innerHTML = ['Sg+','Su+','Pu','Pg'].map(id => { const d = dinfById(id); return `<button class="pk" type="button" data-dec="${id}" aria-pressed="false"><span class="chip ${d.cls}">${d.html}</span></button>`; }).join('');
$('dec-out').addEventListener('click', e => { const b = e.target.closest('[data-gdemo-mo]'); if (!b) return; if (matchMedia('(max-width:900px)').matches) closeGlossary(); show('mo:' + b.dataset.gdemoMo); renderLesson(); });
decode('B3u');
document.querySelectorAll('.glo-btn[data-glo]').forEach(b => b.addEventListener('click', () => openGlossary(b.dataset.glo)));

/* ---------- navigation ---------- */
function renderStepper(){
  $('stepper').innerHTML = STEPS.map((s,i) => `<li><button data-step="${i}" ${i === S.step ? 'aria-current="step"' : ''} class="${i < S.step ? 'done' : ''}"><span class="n">${i+1}</span>${s.short}</button></li>`).join('');
}
function renderLesson(){
  $('body').innerHTML = STEPS[S.step].html();
  $('prev').disabled = S.step === 0;
  $('next').style.visibility = S.step === STEPS.length - 1 ? 'hidden' : '';
  renderStepper();
}
function goStep(i, scroll){
  const next = Math.max(0, Math.min(STEPS.length-1, i));
  if (STEPS[S.step].leave && next !== S.step) STEPS[S.step].leave();
  S.step = next;
  STEPS[S.step].enter(); syncToggles(); renderLesson();
  if (scroll) $('lesson').scrollIntoView({block:'start', behavior: reduced ? 'auto' : 'smooth'});
}
// after an operation finishes, record what it showed and refresh the steps that tabulate it
function onOpDone(op, field){
  if (field && field.startsWith('fn:')) (S.fnTests[field.slice(3)] ||= {})[op.id] = centralChar(field.slice(3), op);
  if ([0,1,2,6].includes(S.step)) renderLesson();
}
$('stepper').addEventListener('click', e => { const b = e.target.closest('[data-step]'); if (b) goStep(+b.dataset.step, true); });
$('prev').onclick = () => goStep(S.step - 1, true);
$('next').onclick = () => goStep(S.step + 1, true);

/* ---------- lesson interactions ---------- */
let rq = 0;
$('body').addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'rslider'){
    S.R = Number(t.value)/BOHR; $('rout').textContent = Number(t.value).toFixed(2) + ' Å';
    if (!rq) rq = requestAnimationFrame(() => { rq = 0; syncOrbital(true); });
    return;
  }
  if (t.id){ S.inputs[t.id] = t.value; t.classList.remove('ok','no'); }
});
$('body').addEventListener('change', e => { if (e.target.id === 'rslider') syncOrbital(false); });
$('body').addEventListener('keydown', e => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const t = e.target.closest('[data-mo], [data-ctrow]');
  if (t && t === e.target){ e.preventDefault(); t.dispatchEvent(new MouseEvent('click', {bubbles:true})); }
});
$('body').addEventListener('click', e => {
  const g = e.target.closest('[data-glo]'); if (g){ openGlossary(g.dataset.glo); return; }
  const opB = e.target.closest('[data-op]');
  if (opB){
    const card = opB.closest('[data-card]');   // a character box belongs to one orbital: show that orbital first
    if (card && S.field !== card.dataset.card){ show(card.dataset.card); renderLesson(); }
    applyOp(opB.dataset.op); return;
  }
  const fB = e.target.closest('[data-field]'); if (fB){ show(fB.dataset.field); renderLesson(); return; }
  const ct = e.target.closest('[data-ctrow]'); if (ct){ S.ctRow = ct.dataset.ctrow; show('fn:' + irById(S.ctRow).central); renderLesson(); return; }
  const gen = e.target.closest('[data-gen]'); if (gen){ S.gen = gen.dataset.gen; S.projRow = null; show('ao:' + S.gen); renderLesson(); return; }
  const pj = e.target.closest('[data-proj]'); if (pj){ S.proj = pj.dataset.proj; S.projRow = null; renderLesson(); return; }
  const pr = e.target.closest('[data-projrow]');
  if (pr){ S.projRow = +pr.dataset.projrow; if (S.field !== 'ao:' + S.gen) show('ao:' + S.gen); renderLesson(); applyOp(OPS[S.projRow].id); return; }
  const mo = e.target.closest('[data-mo]'); if (mo){ show('mo:' + mo.dataset.mo); renderLesson(); return; }
  const lb = e.target.closest('[data-label]'); if (lb){ S.label = lb.dataset.label; renderLesson(); return; }
  const sp = e.target.closest('[data-sp]');
  if (sp){ const was = spById(S.sp), now = spById(sp.dataset.sp); S.nElec = S.nElec === was.n ? now.n : Math.min(S.nElec, now.n); S.sp = now.id; renderLesson(); return; }
  const a = e.target.closest('[data-action]'); if (!a) return;
  const n = spById(S.sp).n;
  switch (a.dataset.action){
    case 'allsalc': SALC_LIST.forEach(([gg, i]) => S.found[gg + '|' + i] = true); break;
    case 'req': S.R = R_EQ; syncOrbital(); break;
    case 'e+': S.nElec = Math.min(n, S.nElec + 1); break;
    case 'e-': S.nElec = Math.max(0, S.nElec - 1); break;
    case 'efill': S.nElec = n; break;
    case 'e0': S.nElec = 0; break;
    case 'mofill': MOS.forEach(m => { S.moTests[m.id] = {}; OPS.forEach(op => S.moTests[m.id][op.id] = charOf(m.c, op)); }); break;
    case 'checkg': S.chk.g = true; break;
    case 'revealg': INPUT_ROWS.forEach(r => OPS.forEach((op,j) => S.inputs[`g-${r}-${op.id}`] = fmt(GAMMA[r][j]))); S.rev.g = true; S.chk.g = null; break;
    case 'checkn': S.chk.n = true; break;
    case 'work': S.showWork = !S.showWork; break;
  }
  renderLesson();
});

/* ---------- start ---------- */
function start(){
  const m = /step=(\d+)/.exec(location.hash);
  goStep(m ? +m[1] - 1 : 0, false);
  resize(); requestAnimationFrame(frame);
  // build the remaining orbital meshes in the background, one at a time, so later clicks are instant
  const queue = [...MOS.map(o => 'mo:' + o.id), ...AOS.map(o => 'ao:' + o.id), ...IRREPS.map(i => 'fn:' + i.central)];
  const idle = window.requestIdleCallback || (cb => setTimeout(cb, 120));
  const next = () => { const id = queue.shift(); if (!id) return; if (!S.anim) geometryFor(id, R_EQ, false); else queue.unshift(id); idle(next); };
  setTimeout(() => idle(next), 1200);
}
start();
})();
