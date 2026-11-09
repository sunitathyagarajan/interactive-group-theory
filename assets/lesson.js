/* Interactive Group Theory: shared lesson engine.
   A lesson page defines window.LESSON (molecule, point group, character table, molecule-specific text) and the
   page skeleton (header, #stage, #lesson). This file does the rest: symmetry bookkeeping, a small valence force
   field whose normal modes are solved symmetry block by symmetry block, the three.js viewer and the nine steps. */
(function(){
'use strict';
const L = window.LESSON;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = id => document.getElementById(id);
const V = (x,y,z) => new THREE.Vector3(x,y,z);
const near = (a,b,t=1e-4) => Math.abs(a-b) < t;
const snap = v => near(v, Math.round(v), 1e-6) ? Math.round(v) : Math.round(v*1e6)/1e6;
const fmt = n => { n = Math.round(n*1000)/1000; if (n === 0) n = 0; return n < 0 ? '−' + (-n) : String(n); };
const R3 = Math.sqrt(3)/2;
const nice = v => {
  v = snap(v); if (Number.isInteger(v)) return fmt(v);
  const s = v < 0 ? '−' : '', a = Math.abs(v);
  if (near(a,.5,1e-6)) return s + '½';
  if (near(a,R3,1e-6)) return s + '√3/2';
  if (near(a,Math.SQRT1_2,1e-6)) return s + '1/√2';
  return fmt(v);
};
const niceS = v => snap(v) > 0 ? '+' + nice(v) : nice(v);
const fmtS = niceS;
const parseNum = s => { if (s == null) return NaN; s = String(s).trim().replace(/[−–]/g,'-').replace(',', '.'); return s === '' ? NaN : Number(s); };
const plural = (n, a, b) => n === 1 ? a : (b || a + 's');
const STEP_COUNT = 9;
const eyebrow = i => `<p class="eyebrow">Step ${i} of ${STEP_COUNT}</p>`;

/* ---------- 3 × 3 algebra ---------- */
const I3 = [[1,0,0],[0,1,0],[0,0,1]];
const unit = a => { const n = Math.hypot(...a); return a.map(x => x/n); };
const rotM = (ax, t) => { const [x,y,z] = ax, c = Math.cos(t), s = Math.sin(t), C = 1 - c;
  return [[c+x*x*C, x*y*C-z*s, x*z*C+y*s], [y*x*C+z*s, c+y*y*C, y*z*C-x*s], [z*x*C-y*s, z*y*C+x*s, c+z*z*C]]; };
const reflM = n => [0,1,2].map(a => [0,1,2].map(c => (a === c ? 1 : 0) - 2*n[a]*n[c]));
const mulM = (A,B) => A.map(r => [0,1,2].map(c => r[0]*B[0][c] + r[1]*B[1][c] + r[2]*B[2][c]));
const clean = M => M.map(r => r.map(v => near(v, Math.round(v), 1e-12) ? Math.round(v) + 0 : v));
const wrapAngle = t => { while (t > Math.PI + 1e-9) t -= 2*Math.PI; while (t < -Math.PI - 1e-9) t += 2*Math.PI; return t; };
const keyOf = a => { let u = unit(a); const i = u.findIndex(x => Math.abs(x) > 1e-6); if (u[i] < 0) u = u.map(x => -x); return u.map(x => (Math.round(x*1e4)/1e4 + 0).toFixed(4)).join(','); };
const trace = M => M[0][0] + M[1][1] + M[2][2];
function mul(M,v){ return V(M[0][0]*v.x+M[0][1]*v.y+M[0][2]*v.z, M[1][0]*v.x+M[1][1]*v.y+M[1][2]*v.z, M[2][0]*v.x+M[2][1]*v.y+M[2][2]*v.z); }

/* ---------- point group ---------- */
const PRINC = unit(L.principal || [0,0,1]);
function mkOp(o){
  const op = {id:o.id, cls:o.cls, html:o.html, name:o.name, type:o.type, elems:[]};
  if (o.type === 'E'){ op.M = I3; op.kind = 'E'; }
  else if (o.type === 'C' || o.type === 'S'){
    const ax = unit(o.axis), t = 2*Math.PI*(o.k || 1)/o.n;
    op.M = o.type === 'C' ? rotM(ax, t) : mulM(reflM(ax), rotM(ax, t));
    Object.assign(op, {kind:o.type === 'C' ? 'rot' : 'imp', axis:ax, angle:wrapAngle(t), order:o.n});
    op.elems = o.type === 'C' ? ['ax:'+keyOf(ax)] : ['ax:'+keyOf(ax), 'pl:'+keyOf(ax)];
  }
  else if (o.type === 's'){ const n = unit(o.normal); op.M = reflM(n); Object.assign(op, {kind:'refl', normal:n}); op.elems = ['pl:'+keyOf(n)]; }
  else if (o.type === 'i'){ op.M = [[-1,0,0],[0,-1,0],[0,0,-1]]; Object.assign(op, {kind:'imp', axis:PRINC, angle:Math.PI}); op.elems = ['inv']; }
  op.M = clean(op.M);
  return op;
}
const OPS = L.ops.map(mkOp);
const CLASSES = L.classes.map(c => { const ops = OPS.filter(op => op.cls === c.id); return {...c, ops, g:ops.length, rep:OPS.find(op => op.id === (c.rep || ops[0].id))}; });
const ORDER = OPS.length;
const classIdx = id => CLASSES.findIndex(c => c.id === id);
const IRREPS = L.irreps.map(ir => ({lin:[], rot:[], quad:'', ...ir, dim:ir.chi[0]}));
const chiOp = (ir, op) => ir.chi[classIdx(op.cls)];
const G3N = 'Γ<sub>3<i>N</i></sub>', GV = 'Γ<sub>vib</sub>', GT = 'Γ<sub>trans</sub>', GR = 'Γ<sub>rot</sub>';
const chip = ir => `<span class="chip ${ir.cls}">${ir.html}</span>`;
const SPLIT = OPS.find(op => op.id === L.splitOp), MIX = OPS.find(op => op.id === L.mixOp);
// triply degenerate species (T in Td, Oh): SPLIT3 picks out one partner, MIX3 (a C3) turns it into the other two
const SPLIT3 = OPS.find(op => op.id === L.splitOp3), MIX3 = OPS.find(op => op.id === L.mixOp3);
const PARTS = 'abc';
// quick self-check of the character table: rows orthonormal under Σ g χi χj / h
IRREPS.forEach((a,i) => IRREPS.forEach((b,j) => { const s = CLASSES.reduce((t,c,k)=> t + c.g*a.chi[k]*b.chi[k], 0)/ORDER; if (!near(s, i === j ? 1 : 0, 1e-6)) console.warn('character table not orthonormal', a.id, b.id, s); }));

/* ---------- state ---------- */
const PR = L.practice || null;   // practice mode: the student finds the point group first and fills in every answer
const S = {
  pg:{sel:null, ok:null, rev:false, hints:0}, cnt:null, check6:null,
  step:0, iso:L.isomers ? L.isomers.default : null, axes:true, elements:false, labels:true,
  arrows:'none', fieldId:null, part:0, playing:!reduced, phase:0, anim:null, hold:null,
  seenOps:{}, cart:{}, cartLast:null, modeTests:{}, motionSeen:{},
  inputs:{}, check4:null, check5:null, showWork:false, vibRevealed:false,
  sel:{}, chk:{ir:null, ra:null}, rev:{ir:false, ra:false},
};

/* ---------- molecular model ---------- */
const SCALE = L.scale || 1;
const MASS = {H:1.008, B:10.81, C:12.011, N:14.007, O:15.999, F:18.998, Al:26.982, Si:28.086, P:30.974, S:32.06, Cl:35.45, Ti:47.867, Mn:54.938, Fe:55.845,
  Ni:58.693, Cu:63.546, Ge:72.63, As:74.922, Se:78.971, Br:79.904, Mo:95.95, Pd:106.42, Sb:121.76, Te:127.6, I:126.904, Xe:131.293, W:183.84,
  Os:190.23, Pt:195.084, Au:196.967, U:238.029};
let ATOMS = [], BONDS = [], EXTRA = [], FIELDS = {}, SPECIES = [], MODES = [], PERM = new Map(), RESP = {}, MODEL = {};

function buildModel(){
  const geo = L.geometry(S.iso);
  const M = geo.atoms.reduce((s,a) => s + MASS[a.el], 0);
  const com = [0,1,2].map(c => geo.atoms.reduce((s,a) => s + MASS[a.el]*a.pos[c], 0)/M);
  ATOMS = geo.atoms.map(a => { const pA = a.pos.map((x,c) => x - com[c]); return {...a, posA:pA, pos:V(...pA).multiplyScalar(SCALE)}; });
  BONDS = geo.bonds; EXTRA = geo.extra || []; PAIRS = null;
  PERM = new Map(); RESP = {};
  const norm = vecs => { const m = Math.max(...vecs.map(v=>v.length())); return vecs.map(v=>v.clone().multiplyScalar(0.75/m)); };
  const rot = ax => norm(ATOMS.map(at => V(...ax).cross(at.pos)));
  const tr = ax => ATOMS.map(() => V(...ax).multiplyScalar(0.7));
  const AXN = a => ['<i>x</i>','<i>y</i>','<i>z</i>'][a.findIndex(x => x)];
  FIELDS = {};
  L.tr.forEach(t => {
    const P = t.R ? 'R' : 'T', one = d => `${P}<sub>${AXN(d)}</sub>`;
    const pats = t.parts.map(d => t.R ? rot(d) : tr(d));
    FIELDS[t.id] = {kind:t.R ? 'rot' : 'trans', html:t.parts.length > 1 ? `(${t.parts.map(one).join(', ')})` : one(t.parts[0]),
      name:`${t.R ? 'Rotation about' : 'Translation along'} ${t.parts.map(AXN).join(' or ')}`,
      ...(t.parts.length > 1 ? {parts:pats, partHTML:t.parts.map(one)} : {vecs:pats[0]})};
  });
  solveModes();
}
const fieldVecs = F => F.parts ? F.parts[S.part] : F.vecs;
function perm(op){
  if (!PERM.has(op)) PERM.set(op, ATOMS.map(at => {
    const w = op.M.map(r => r[0]*at.posA[0] + r[1]*at.posA[1] + r[2]*at.posA[2]);
    const j = ATOMS.findIndex(b => b.el === at.el && Math.hypot(b.posA[0]-w[0], b.posA[1]-w[1], b.posA[2]-w[2]) < 2e-3);
    if (j < 0) console.warn('operation', op.id, 'is not a symmetry of', at.html);
    return j;
  }));
  return PERM.get(op);
}
function unmoved(op){ return perm(op).map((j,i)=> j===i ? i : -1).filter(i=>i>=0); }
const gamma3N = () => CLASSES.map(c => snap(unmoved(c.rep).length * trace(c.rep.M)));
// displacement patterns: one THREE.Vector3 per atom
function actQ(op, Q){ const p = perm(op), out = []; Q.forEach((d,i) => out[p[i]] = mul(op.M, d)); return out; }
const dotQ = (A,B) => A.reduce((s,a,i)=> s + a.dot(B[i]), 0);
// How the partner patterns of a motion mix under op: R·Q_k = Σ_l D[l][k] Q_l, so D = G⁻¹B with G = ⟨Q_l,Q_k⟩, B = ⟨Q_l,R·Q_k⟩
function fieldMatrix(op, F){
  const Q = F.parts || [F.vecs], RQ = Q.map(q => actQ(op, q));
  const G = Q.map(a => Q.map(c => dotQ(a,c))), B = Q.map(a => RQ.map(rq => dotQ(a,rq)));
  if (Q.length === 1) return [[B[0][0]/G[0][0]]];
  return solveG(G, B);
}
// G⁻¹B by Gauss–Jordan elimination (G is a small Gram matrix: 2 × 2 or 3 × 3)
function solveG(G, B){
  const n = G.length, A = G.map((row,i) => [...row, ...B[i]]);
  for (let c = 0; c < n; c++){
    let p = c; for (let r = c+1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    const d = A[c][c]; A[c] = A[c].map(x => x/d);
    for (let r = 0; r < n; r++) if (r !== c){ const f = A[r][c]; A[r] = A[r].map((x,k) => x - f*A[c][k]); }
  }
  return A.map(row => row.slice(n));
}
const fieldDiag = (op, F) => fieldMatrix(op, F).map((row,k) => snap(row[k]));
const fieldChar = (op, F) => snap(fieldDiag(op, F).reduce((a,c)=> a + c, 0));
const fieldChars = id => CLASSES.map(c => fieldChar(c.rep, FIELDS[id]));
const sumChars = ids => CLASSES.map((c,k) => ids.reduce((s,id)=> s + fieldChars(id)[k], 0));
const reduce = ch => IRREPS.map(ir => { const n = ch.reduce((s,x,k)=> s + CLASSES[k].g*x*ir.chi[k], 0)/ORDER; return snap(n); });
const irrepOf = ch => IRREPS.find(ir => ir.chi.every((c,k)=> near(c, ch[k], 1e-3)));
const repHTML = ns => ns.map((n,k)=> n ? `${n>1?n:''}${IRREPS[k].html}` : '').filter(Boolean).join(' + ') || '0';
const TR_IDS = () => L.tr.filter(t => !t.R).map(t => t.id), ROT_IDS = () => L.tr.filter(t => t.R).map(t => t.id);
const vibIrreps = () => { const g = gamma3N(), t = sumChars(TR_IDS()), r = sumChars(ROT_IDS()); return reduce(g.map((x,k)=> x - t[k] - r[k])); };
function cartCells(op){
  const p = perm(op), E3 = [V(1,0,0),V(0,1,0),V(0,0,1)];
  return ATOMS.map((at,i) => E3.map(e => p[i] === i ? snap(mul(op.M,e).dot(e)) : null));
}

/* ---------- normal modes from a valence force field ----------
   Internal coordinates (bond stretches, angle bends, out-of-plane wags, torsions) are generated from the bond list.
   F = Σ k·∇q∇qᵀ in Cartesians, mass-weighted, then diagonalised inside each symmetry block, so every mode has
   exactly one symmetry species. For a two-dimensional species only the partner that is symmetric under L.splitOp
   is diagonalised; its partner is the antisymmetric part of L.mixOp applied to it. */
const sub3 = (a,b) => [a[0]-b[0], a[1]-b[1], a[2]-b[2]], dot3 = (a,b) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross3 = (a,b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]], len3 = a => Math.hypot(a[0],a[1],a[2]);
const dist = (X,i,j) => len3(sub3(X[i],X[j]));
const ang = (X,i,j,k) => { const a = sub3(X[i],X[j]), b = sub3(X[k],X[j]); return Math.acos(Math.max(-1, Math.min(1, dot3(a,b)/(len3(a)*len3(b))))); };
const dih = (X,i,j,k,l) => { const b1 = sub3(X[j],X[i]), b2 = sub3(X[k],X[j]), b3 = sub3(X[l],X[k]); const n1 = cross3(b1,b2), n2 = cross3(b2,b3), u = b2.map(x => x/len3(b2)); return Math.atan2(dot3(cross3(n1,u), n2), dot3(n1,n2)); };
const oopH = (X,i,a,b,c) => { const n = cross3(sub3(X[b],X[a]), sub3(X[c],X[a])), L2 = len3(n); return dot3(n, sub3(X[i],X[a]))/L2; };
function internals(X){
  const el = ATOMS.map(a => a.el), IC = [], nb = X.map(() => []);
  const FF = Object.assign({bendH:0.45, bend:0.9, oop:0.35, tors:0.1, torsDouble:0.4, linBend:0.3, chainTors:0.3, chainTag:'twist of the two ends'}, L.ff || {});
  BONDS.forEach(b => { if (!b.soft){ nb[b.i].push(b.j); nb[b.j].push(b.i); } });
  const sym = b => b.order === 2 ? '=' : '–';
  const pairName = (i,j,s) => el[j] === 'H' || (el[i] !== 'H' && MASS[el[i]] <= MASS[el[j]]) ? `${el[i]}${s}${el[j]}` : `${el[j]}${s}${el[i]}`;
  BONDS.forEach(b => IC.push({atoms:[b.i,b.j], k:b.k, tag:b.tag || `${pairName(b.i,b.j,sym(b))} stretch`, f:X => dist(X,b.i,b.j)}));
  EXTRA.forEach(e => IC.push({atoms:[e.i,e.j], k:e.k, tag:e.tag, f:X => dist(X,e.i,e.j)}));
  const lin = {};
  X.forEach((_, j) => {
    const n = nb[j];
    for (let a = 0; a < n.length; a++) for (let c = a+1; c < n.length; c++){
      const i = n[a], k = n[c];
      if (ang(X,i,j,k) > 3.05){
        lin[j] = [i,k];
        const u = unit(sub3(X[k],X[i])), t = Math.abs(u[2]) < .9 ? [0,0,1] : [1,0,0], e1 = unit(cross3(u,t)), e2 = cross3(u,e1);
        const bi = BONDS.find(b => (b.i===i&&b.j===j)||(b.i===j&&b.j===i)), bk = BONDS.find(b => (b.i===j&&b.j===k)||(b.i===k&&b.j===j));
        [e1,e2].forEach(e => IC.push({atoms:[i,j,k], k:FF.linBend, tag:`${el[i]}${sym(bi)}${el[j]}${sym(bk)}${el[k]} bend`, f:X => dot3(e, sub3(X[j], [0,1,2].map(q => (X[i][q]+X[k][q])/2)))}));
        continue;
      }
      const hs = (el[i]==='H') + (el[k]==='H');
      IC.push({atoms:[i,j,k], k:hs ? FF.bendH : FF.bend, tag:hs === 2 ? `H–${el[j]}–H bend` : hs ? `${el[j]}–H bend` : (L.skelTag || 'skeletal bend'), f:X => ang(X,i,j,k)});
    }
    if (n.length === 3 && Math.abs(oopH(X,j,...n)) < 0.02){
      const hasH = n.some(q => el[q] === 'H');
      IC.push({atoms:[j,...n], k:FF.oop, tag:hasH ? `${el[j]}–H wag (out of plane)` : 'out-of-plane bend', f:X => oopH(X,j,...n)});
    }
  });
  BONDS.forEach(b => {
    if (b.soft) return;
    const j = b.i, k = b.j; if (lin[j] || lin[k]) return;
    const pairs = [];
    nb[j].filter(x => x !== k).forEach(i => nb[k].filter(x => x !== j).forEach(l => { if (ang(X,i,j,k) < 3.05 && ang(X,j,k,l) < 3.05) pairs.push([i,l]); }));
    if (!pairs.length) return;
    const kt = (b.tors ?? (b.order === 2 ? FF.torsDouble : FF.tors))/pairs.length;
    pairs.forEach(([i,l]) => IC.push({atoms:[i,j,k,l], k:kt, periodic:true, tag:b.torsTag || (b.order === 2 ? `twist about ${pairName(j,k,'=')}` : 'torsion'), f:X => dih(X,i,j,k,l)}));
  });
  Object.entries(lin).forEach(([j,[a,c]]) => {
    j = +j; const pairs = [];
    nb[a].filter(x => x !== j).forEach(i => nb[c].filter(x => x !== j).forEach(l => pairs.push([i,l])));
    pairs.forEach(([i,l]) => IC.push({atoms:[i,a,c,l], k:FF.chainTors/pairs.length, periodic:true, tag:FF.chainTag, f:X => dih(X,i,a,c,l)}));
  });
  return IC;
}
function gradIC(ic, X){
  const g = new Float64Array(3*X.length), h = 1e-5;
  ic.atoms.forEach(a => { for (let c = 0; c < 3; c++){
    const Xp = X.map(p => p.slice()), Xm = X.map(p => p.slice()); Xp[a][c] += h; Xm[a][c] -= h;
    let d = ic.f(Xp) - ic.f(Xm); if (ic.periodic) d = wrapAngle(d); g[3*a+c] = d/(2*h);
  }});
  return g;
}
function jacobi(A){
  const n = A.length, a = A.map(r => r.slice()), v = A.map((r,i) => r.map((_,j) => i === j ? 1 : 0));
  for (let sweep = 0; sweep < 100; sweep++){
    let off = 0; for (let p = 0; p < n; p++) for (let q = p+1; q < n; q++) off += a[p][q]*a[p][q];
    if (off < 1e-22) break;
    for (let p = 0; p < n; p++) for (let q = p+1; q < n; q++){
      if (Math.abs(a[p][q]) < 1e-16) continue;
      const th = (a[q][q] - a[p][p])/(2*a[p][q]), t = (th >= 0 ? 1 : -1)/(Math.abs(th) + Math.sqrt(th*th + 1)), c = 1/Math.sqrt(t*t + 1), s = t*c;
      for (let k = 0; k < n; k++){ const kp = a[k][p], kq = a[k][q]; a[k][p] = c*kp - s*kq; a[k][q] = s*kp + c*kq; }
      for (let k = 0; k < n; k++){ const pk = a[p][k], qk = a[q][k]; a[p][k] = c*pk - s*qk; a[q][k] = s*pk + c*qk; }
      for (let k = 0; k < n; k++){ const kp = v[k][p], kq = v[k][q]; v[k][p] = c*kp - s*kq; v[k][q] = s*kp + c*kq; }
    }
  }
  return {vals:a.map((r,i) => r[i]), vecs:v};
}
function solveModes(){
  const N = ATOMS.length, n3 = 3*N, X = ATOMS.map(a => a.posA), m = ATOMS.map(a => MASS[a.el]);
  const IC = internals(X); IC.forEach(ic => ic.g = gradIC(ic, X));
  const sm = m.flatMap(x => { const r = Math.sqrt(x); return [r,r,r]; });
  const H = Array.from({length:n3}, () => new Float64Array(n3));
  IC.forEach(ic => { const idx = []; ic.g.forEach((x,a) => { if (x) idx.push(a); }); idx.forEach(a => idx.forEach(b => H[a][b] += ic.k*ic.g[a]*ic.g[b]/(sm[a]*sm[b]))); });
  const Hv = v => Array.from(H, row => row.reduce((s,x,j)=> s + x*v[j], 0));
  const vdot = (a,b) => a.reduce((s,x,i)=> s + x*b[i], 0), vnorm = a => Math.sqrt(vdot(a,a));
  const orth = (v, basis) => { basis.forEach(b => { const d = vdot(v,b); for (let i=0;i<n3;i++) v[i] -= d*b[i]; }); return v; };
  const actV = (op, v) => { const p = perm(op), out = new Array(n3).fill(0); for (let i=0;i<N;i++) for (let a=0;a<3;a++) for (let b=0;b<3;b++) out[3*p[i]+a] += op.M[a][b]*v[3*i+b]; return out; };
  // translations and rotations, mass-weighted, to keep out of every block
  const TR = [];
  [[1,0,0],[0,1,0],[0,0,1]].forEach(e => {
    TR.push(X.flatMap((p,i) => e.map(x => x*Math.sqrt(m[i]))));
    TR.push(X.flatMap((p,i) => cross3(e,p).map(x => x*Math.sqrt(m[i]))));
  });
  const TRB = []; TR.forEach(v => { v = orth(v.slice(), TRB); const n = vnorm(v); if (n > 1e-8) TRB.push(v.map(x => x/n)); });
  const nv = vibIrreps();
  SPECIES = []; MODES = [];
  IRREPS.forEach((ir, k) => {
    const n = Math.round(nv[k]); if (!n) return;
    const two = ir.dim === 2, three = ir.dim === 3, splitter = three ? SPLIT3 : SPLIT;
    const basis = [];
    for (let c = 0; c < n3 && basis.length < n; c++){
      const e = new Array(n3).fill(0); e[c] = 1;
      let v = new Array(n3).fill(0);
      OPS.forEach(op => { const w = actV(op, e), x = chiOp(ir, op); if (x) for (let i=0;i<n3;i++) v[i] += x*w[i]; });
      if (two || three){ const w = actV(splitter, v); for (let i=0;i<n3;i++) v[i] += w[i]; }
      v = orth(orth(v, TRB), basis);
      const nn = vnorm(v); if (nn > 1e-6) basis.push(v.map(x => x/nn));
    }
    if (basis.length !== n) console.warn('block size mismatch for', ir.id, basis.length, n);
    const Hs = basis.map(bi => { const hb = Hv(bi); return basis.map(bj => vdot(bj, hb)); });
    const {vals, vecs} = jacobi(Hs);
    const order = vals.map((x,i) => i).sort((a,b) => vals[b] - vals[a]);
    const cartOf = eta => ATOMS.map((at,i) => V(eta[3*i], eta[3*i+1], eta[3*i+2]).divideScalar(Math.sqrt(m[i])));
    const ped = eta => {   // potential-energy distribution, summed by kind of internal coordinate
      const d = eta.map((x,i) => x/sm[i]), byTag = {};
      IC.forEach(ic => { const q = vdot(ic.g, d); byTag[ic.tag] = (byTag[ic.tag] || 0) + ic.k*q*q; });
      const tot = Object.values(byTag).reduce((a,b)=>a+b, 0), top = Object.entries(byTag).sort((a,b) => b[1]-a[1]);
      return top[1] && top[1][1] > 0.6*top[0][1] ? `${top[0][0]} + ${top[1][0]}` : top[0][0];
    };
    const meas = L.wn && L.wn[S.iso ? S.iso + ':' + ir.id : ir.id] || (L.wn && L.wn[ir.id]);
    const ids = order.map((q, j) => {
      const eta = basis.reduce((s,b,r) => s.map((x,i) => x + vecs[r][q]*b[i]), new Array(n3).fill(0));
      const est = 1302.79*Math.sqrt(Math.max(vals[q], 0));
      const wn = meas && meas.length === n ? meas[j] : Math.round(est/5)*5;
      const id = `${ir.id}_${j+1}`;
      const nrm = vecs3 => { const mx = Math.max(...vecs3.map(v => v.length())); return vecs3.map(v => v.clone().multiplyScalar(0.75/mx)); };
      const F = {kind:'vib', species:ir.id, html:`${ir.html} #${j+1}`, name:`mainly ${ped(eta)}`, wn, est:!(meas && meas.length === n), model:Math.round(est), bands:[wn]};
      if (two){
        let b = actV(MIX, eta); const w = actV(SPLIT, b); b = b.map((x,i) => x - w[i]); const bn = vnorm(b); b = b.map(x => x/bn);
        F.parts = [nrm(cartOf(eta)), nrm(cartOf(b))]; F.partHTML = ['partner a', 'partner b'];
      } else if (three){
        const b = actV(MIX3, eta), c = actV(MIX3, b);
        F.parts = [eta, b, c].map(v => nrm(cartOf(v))); F.partHTML = ['partner a', 'partner b', 'partner c'];
      } else F.vecs = nrm(cartOf(eta));
      FIELDS[id] = F; return id;
    });
    SPECIES.push({ir, n, ids}); MODES.push(...ids);
  });
  MODEL = {IC};
}

/* ---------- how a vibration couples to light ---------- */
// toy models, symmetric by construction: point charges for the dipole, bond-additive polarizability
function charge(i){ const c = L.charges; return typeof c === 'function' ? c(ATOMS[i], i, ATOMS) : (c[ATOMS[i].el] || 0); }
// bonds count fully; atom pairs up to 2.8 Å apart count a little, so no mode's change can cancel by accident
let PAIRS = null;
function polarPairs(){
  const out = BONDS.map(b => [b.i, b.j, 1]);
  ATOMS.forEach((a,i) => ATOMS.forEach((b,j) => { if (j > i && !BONDS.some(x => (x.i===i&&x.j===j)||(x.i===j&&x.j===i)) && Math.hypot(...a.posA.map((v,c) => v - b.posA[c])) < 2.8) out.push([i, j, .3]); }));
  return out;
}
function polar(P){
  const A = [[0,0,0],[0,0,0],[0,0,0]];
  (PAIRS ||= polarPairs()).forEach(([i,j,w]) => {
    const d = P[j].clone().sub(P[i]), Ln = d.length(), u = [d.x/Ln, d.y/Ln, d.z/Ln], par = w*Ln*Ln*Ln, perp = .3*w*Ln*Ln;   // each bond is easier to polarize along its length
    for (let a=0;a<3;a++) for (let c=0;c<3;c++) A[a][c] += (par - perp)*u[a]*u[c] + (a === c ? perp : 0);
  });
  return A;
}
function response(id, part){
  const k = id + ':' + part; if (RESP[k]) return RESP[k];
  const F = FIELDS[id], vecs = F.parts ? F.parts[part] : F.vecs, P = ATOMS.map(at => at.pos), eps = 1e-4;
  const dmu = vecs.reduce((s,v,i)=> s.addScaledVector(v, charge(i)), V(0,0,0));
  const Ap = polar(P.map((p,i)=> p.clone().addScaledVector(vecs[i], eps))), Am = polar(P.map((p,i)=> p.clone().addScaledVector(vecs[i], -eps)));
  const dA = Ap.map((row,a)=> row.map((x,c)=> (x - Am[a][c])/(2*eps))), A0 = polar(P);
  const n0 = Math.hypot(...A0.flat()), nd = Math.hypot(...dA.flat());
  return RESP[k] = {dmu, ir:dmu.length() > 1e-5, A0, dA, n0, nd, raman:nd > 1e-4*n0};
}
const irActive = ir => ir.lin.length > 0, ramanActive = ir => ir.quad !== '';

/* ---------- three.js scene ---------- */
buildModel();
const stageEl = $('stage'), canvas = $('gl'), labelsEl = $('labels');
let renderer;
try { renderer = new THREE.WebGLRenderer({canvas, antialias:true}); }
catch(err){ stageEl.insertAdjacentHTML('beforeend','<div class="nogl">This browser could not start WebGL, so the 3D model is unavailable. The lesson still works.</div>'); }

const ECOL = {H:0xe9eef3, C:0x7d8996, N:0x5a7bff, O:0xe2564c, F:0x9be36a, Cl:0x3fcf6a, Br:0xb0503a, Fe:0xe08a3c,
  B:0xffb59e, Al:0xbfa6a6, Si:0xdcc39c, P:0xff9a3d, S:0xf2d64b, Ti:0xb8bcc4, Mn:0x9c7ac7, Ni:0x6fd07a, Cu:0xd88c51, Ge:0x8fa8a0, As:0xc28fe0,
  Se:0xf0a33a, Mo:0x54b5b5, Pd:0x7ab0c8, Sb:0x9e63b5, Te:0xd4842a, I:0x9b4fd0, Xe:0x4fc6d6, W:0x4f95d6, Os:0x4f8fb0, Pt:0xd2d5e0, Au:0xffcf3a, U:0x4fa36b};
const ERAD = {H:.19, C:.28, N:.29, O:.3, F:.27, Cl:.34, Br:.39, Fe:.4, B:.27, Al:.36, Si:.34, P:.33, S:.33, Ti:.38, Mn:.38, Ni:.37, Cu:.37, Ge:.36,
  As:.36, Se:.37, Mo:.39, Pd:.39, Sb:.4, Te:.4, I:.41, Xe:.41, W:.4, Os:.4, Pt:.4, Au:.4, U:.44, ...(L.atomR || {})};
const COL = {bond:0x8e9cac, x:0xf2a23a, y:0x45d0a0, z:0x93a6ff, mode:0xffd35c, halo:0x7dffc0};
const AXCOL = [0xffd35c, 0xffa95c, 0x9dff8a, 0x8ae6ff], PLCOL = [0x5d9cff, 0xc283ff, 0xff7fae, 0x7fe0b0];
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 200);
camera.up.set(0,0,1);
scene.add(camera);
scene.add(new THREE.HemisphereLight(0xe4ecff, 0x1b2430, 0.85));
const keyLight = new THREE.DirectionalLight(0xffffff, 0.85); keyLight.position.set(3,4,6); camera.add(keyLight);
const GEO = {shaft:new THREE.CylinderGeometry(1,1,1,14), head:new THREE.ConeGeometry(1,1,20), sphere:new THREE.SphereGeometry(1,36,24), bond:new THREE.CylinderGeometry(1,1,1,18)};
const UP = V(0,1,0);
function makeArrow(color, o={}){
  const op = o.opacity ?? 1;
  const mat = new THREE.MeshStandardMaterial({color, roughness:.45, metalness:.05, transparent:op<1, opacity:op, depthWrite:op>=1});
  const g = new THREE.Group(), shaft = new THREE.Mesh(GEO.shaft, mat), head = new THREE.Mesh(GEO.head, mat);
  g.add(shaft, head);
  g.userData = {shaft, head, mat, r:o.r ?? .035, hr:o.hr ?? .09, hl:o.hl ?? .2};
  return g;
}
function placeArrow(g, from, vec){
  const Ln = vec.length(); if (Ln < 1e-3){ g.visible = false; return; }
  g.visible = true;
  const {shaft, head, r, hr} = g.userData, hl = Math.min(g.userData.hl, Ln*.5);
  g.position.copy(from);
  g.quaternion.setFromUnitVectors(UP, vec.clone().divideScalar(Ln));
  shaft.scale.set(r, Ln-hl, r); shaft.position.set(0, (Ln-hl)/2, 0);
  head.scale.set(hr, hl, hr);  head.position.set(0, Ln-hl/2, 0);
}
const RMAX = Math.max(...ATOMS.map(a => a.pos.length())) + 0.3;
const AX = RMAX + 0.6;
const axesGroup = new THREE.Group(); scene.add(axesGroup);
[[V(1,0,0),COL.x],[V(0,1,0),COL.y],[V(0,0,1),COL.z]].forEach(([d,c]) => {
  const a = makeArrow(c, {opacity:.8, r:.012, hr:.05, hl:.16}); placeArrow(a, d.clone().multiplyScalar(-AX), d.clone().multiplyScalar(2*AX + .2)); axesGroup.add(a);
});

// symmetry elements, derived from the operations: one entry per axis, plane or centre
const ELEM = {}, ELEM_LABELS = {};
(function(){
  const defs = {}, plCls = [], axCls = [];
  OPS.filter(op => op.type === 's').forEach(op => { const id = op.elems[0]; if (!defs[id]){ if (!plCls.includes(op.cls)) plCls.push(op.cls); defs[id] = {type:'plane', n:op.normal, html:op.html.replace(/[′″]/g,''), cls:plCls.indexOf(op.cls)}; } });
  OPS.filter(op => op.type === 'C' || op.type === 'S').forEach(op => {
    const id = op.elems[0], d = defs[id] ||= {type:'axis', dir:op.axis, n:1, sN:0, cls:null};
    if (op.type === 'C'){ d.n = Math.max(d.n, op.order); if (d.cls === null){ if (!axCls.includes(op.cls)) axCls.push(op.cls); d.cls = axCls.indexOf(op.cls); } }
    else { d.sN = Math.max(d.sN, op.order); const pid = op.elems[1]; if (!defs[pid]) defs[pid] = {type:'plane', n:op.axis, html:'', aux:true, cls:3}; }
  });
  if (OPS.some(op => op.type === 'i')) defs.inv = {type:'inv'};
  const pts = ATOMS.map(a => a.pos);
  Object.entries(defs).forEach(([id, d]) => {
    if (d.type === 'axis'){
      const v = V(...d.dir), principal = near(Math.abs(v.dot(V(...PRINC))), 1, 1e-6);
      const len = Math.max(...pts.map(p => Math.abs(p.dot(v)))) + 1.1, color = principal ? AXCOL[0] : AXCOL[1 + (d.cls % 3)];
      const mat = new THREE.LineDashedMaterial({color, dashSize:.14, gapSize:.09, transparent:true, opacity:.8});
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([v.clone().multiplyScalar(-len), v.clone().multiplyScalar(len)]), mat); line.computeLineDistances();
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,2*len,10), new THREE.MeshBasicMaterial({color, transparent:true, opacity:0, depthWrite:false}));
      tube.quaternion.setFromUnitVectors(UP, v);
      const grp = new THREE.Group(); grp.add(line, tube); scene.add(grp);
      ELEM[id] = {set(on, hot){ grp.visible = on; tube.material.opacity = hot ? .55 : 0; mat.opacity = hot ? 1 : .45; }, principal};
      const lab = `<i>C</i><sub>${d.n}</sub>` + (d.sN > d.n ? `, <i>S</i><sub>${d.sN}</sub>` : '');
      ELEM_LABELS[id] = [d.n > 1 ? lab : `<i>S</i><sub>${d.sN}</sub>`, v.clone().multiplyScalar(len + .25), principal ? 'elem' : 'elem ax2', principal];
    } else if (d.type === 'plane'){
      const n = V(...d.n), z = V(0,0,1);
      let vv = Math.abs(n.dot(z)) < .9 ? z.clone().addScaledVector(n, -n.dot(z)).normalize() : V(1,0,0).addScaledVector(n, -n.x).normalize();
      const uu = vv.clone().cross(n).normalize();
      const hw = Math.max(...pts.map(p => Math.abs(p.dot(uu)))) + .8, hh = Math.max(...pts.map(p => Math.abs(p.dot(vv)))) + .8;
      const geo = new THREE.PlaneGeometry(2*hw, 2*hh);
      geo.applyMatrix4(new THREE.Matrix4().makeBasis(uu, vv, n));
      const color = d.aux ? 0xbfc8d2 : PLCOL[d.cls % 4], quiet = d.aux ? .03 : .05;
      const fill = new THREE.MeshBasicMaterial({color, transparent:true, opacity:quiet, side:THREE.DoubleSide, depthWrite:false});
      const edge = new THREE.LineBasicMaterial({color, transparent:true, opacity:.4});
      const grp = new THREE.Group(); grp.add(new THREE.Mesh(geo, fill), new THREE.LineSegments(new THREE.EdgesGeometry(geo), edge)); scene.add(grp);
      ELEM[id] = {set(on, hot){ grp.visible = on; fill.opacity = hot ? (d.aux ? .14 : .26) : quiet; edge.opacity = hot ? .95 : quiet*6; }, aux:d.aux};
      if (!d.aux) ELEM_LABELS[id] = [d.html, uu.clone().multiplyScalar(hw*.92).addScaledVector(vv, hh*.85), 'elem pl' + (1 + d.cls % 3), d.html.includes('h')];
    } else {
      const m = new THREE.Mesh(new THREE.SphereGeometry(.1, 20, 14), new THREE.MeshBasicMaterial({color:AXCOL[0]}));
      scene.add(m); ELEM.inv = {set(on){ m.visible = on; }, aux:true};
      ELEM_LABELS.inv = ['<i>i</i>', V(0,0,0), 'elem', false];
    }
  });
})();
const ELEM_IDS = Object.keys(ELEM), FEW_ELEMS = ELEM_IDS.length <= 7;

// molecule: "live" copy is transformed by the operation, "ghost" stays at the starting position
const live = new THREE.Group(); live.matrixAutoUpdate = false; scene.add(live);
const ghost = new THREE.Group(); scene.add(ghost);
const atomMeshes = [], ghostMeshes = [], bondMeshes = [];
ATOMS.forEach(at => {
  const r = ERAD[at.el] || .25;
  const m = new THREE.Mesh(GEO.sphere, new THREE.MeshStandardMaterial({color:ECOL[at.el] || 0xcccccc, roughness:.32, metalness:at.el === 'Fe' ? .35 : 0}));
  m.scale.setScalar(r); live.add(m); atomMeshes.push(m);
  const g = new THREE.Mesh(GEO.sphere, new THREE.MeshBasicMaterial({color:0xffffff, transparent:true, opacity:.12, depthWrite:false}));
  g.scale.setScalar(r*1.5); ghost.add(g); ghostMeshes.push(g);
});
BONDS.forEach(b => { const mesh = new THREE.Mesh(GEO.bond, new THREE.MeshStandardMaterial({color:COL.bond, roughness:.5, transparent:!!b.thin, opacity:b.thin ? .45 : 1})); mesh.userData.r = b.thin ? .025 : .065; live.add(mesh); bondMeshes.push(mesh); });
const livePool = [], ghostPool = [];
function poolArrow(pool, parent, k, ghostly){
  while (pool.length <= k){ const a = makeArrow(0xffffff, ghostly ? {opacity:.28} : {}); parent.add(a); pool.push(a); }
  return pool[k];
}
function placeBond(mesh, a, b){
  const d = b.clone().sub(a), Ln = d.length();
  mesh.position.copy(a).addScaledVector(d, .5);
  mesh.quaternion.setFromUnitVectors(UP, d.divideScalar(Ln));
  mesh.scale.set(mesh.userData.r, Ln, mesh.userData.r);
}
const dipArrow = makeArrow(0xff5fa2, {r:.05, hr:.13, hl:.3}); dipArrow.visible = false; scene.add(dipArrow);
const ellip = new THREE.Group(); ellip.matrixAutoUpdate = false; ellip.visible = false; scene.add(ellip);
ellip.add(new THREE.Mesh(GEO.sphere, new THREE.MeshStandardMaterial({color:0x7fd6ff, transparent:true, opacity:.12, depthWrite:false, side:THREE.DoubleSide})));
ellip.add(new THREE.Mesh(new THREE.SphereGeometry(1,20,12), new THREE.MeshBasicMaterial({color:0x7fd6ff, wireframe:true, transparent:true, opacity:.2, depthWrite:false})));

function arrowSpecs(){
  if (S.arrows === 'cart'){
    const out = [];
    ATOMS.forEach((at,i) => [[V(1,0,0),COL.x],[V(0,1,0),COL.y],[V(0,0,1),COL.z]].forEach(([d,c]) => out.push({atom:i, vec:d.multiplyScalar(.5), color:c})));
    return out;
  }
  if (S.arrows === 'field' && FIELDS[S.fieldId]) return fieldVecs(FIELDS[S.fieldId]).map((v,i)=>({atom:i, vec:v, color:COL.mode})).filter(s => s.vec.length() > .04);
  return [];
}

// operation animation
const ease = t => t<.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2;
function exactMatrix(op){ const M = op.M, m = new THREE.Matrix4(); m.set(M[0][0],M[0][1],M[0][2],0, M[1][0],M[1][1],M[1][2],0, M[2][0],M[2][1],M[2][2],0, 0,0,0,1); return m; }
function squash(normal, e){
  const m = new THREE.Matrix4();
  let s = 1 - 2*e; if (Math.abs(s) < .02) s = s < 0 ? -.02 : .02;
  const [x,y,z] = normal, k = s - 1;
  m.set(1+k*x*x, k*x*y, k*x*z, 0,  k*y*x, 1+k*y*y, k*y*z, 0,  k*z*x, k*z*y, 1+k*z*z, 0,  0,0,0,1);
  return m;
}
function opMatrix(op, e){
  const m = new THREE.Matrix4();
  if (op.kind === 'rot') m.makeRotationAxis(V(...op.axis), op.angle*e);
  else if (op.kind === 'refl') return squash(op.normal, e);
  else if (op.kind === 'imp'){   // improper rotations (and i) play as a rotation, then the reflection through the plane perpendicular to the axis
    m.makeRotationAxis(V(...op.axis), op.angle*Math.min(1, 2*e));
    if (e > .5) m.premultiply(squash(op.axis, 2*e - 1));
  }
  return m;
}
function computeResult(op){
  const r = {op, unmoved:unmoved(op), kind:S.arrows};
  if (S.arrows === 'cart'){ r.cells = cartCells(op); r.chi = snap(r.cells.flat().reduce((s,c)=> s + (c||0), 0)); }
  if (S.arrows === 'field'){ r.diag = fieldDiag(op, FIELDS[S.fieldId]); r.chi = fieldChar(op, FIELDS[S.fieldId]); r.fieldId = S.fieldId; }
  return r;
}
function applyOp(id){
  const op = OPS.find(o => o.id === id);
  S.hold = null;
  S.anim = {op, t0:performance.now(), dur:reduced ? 1 : ({E:800, imp:2200}[op.kind] || 1600), result:computeResult(op)};
  setCaption(`Applying ${op.html}…`);
  markOpButtons(id);
}
function finishOp(){
  const r = S.anim.result; S.hold = {op:r.op, result:r}; S.anim = null;
  S.seenOps[r.op.id] = true;
  if (r.kind === 'cart'){ S.cart[r.op.cls] = r; S.cartLast = r.op.cls; }
  if (r.kind === 'field' && FIELDS[r.fieldId].kind === 'vib'){ (S.modeTests[FIELDS[r.fieldId].species] ||= {})[r.op.cls] = r.chi; }
  ghostMeshes.forEach((g,i) => { const um = r.unmoved.includes(i); g.material.color.setHex(um ? COL.halo : 0xffffff); g.material.opacity = um ? .3 : .1; });
  setCaption(resultCaption(r));
  if ([1,2,6].includes(S.step)) renderLesson();
}
function resetOp(){
  S.anim = null; S.hold = null; markOpButtons(null);
  ghostMeshes.forEach(g => { g.material.color.setHex(0xffffff); g.material.opacity = .12; });
  setCaption(defaultCaption());
}
function moveText(op){
  const moved = perm(op).filter((j,i) => j !== i).length;
  if (!moved) return '';
  return moved === ATOMS.length ? ' Every atom has moved to another atom\'s place.' : ` The other ${moved} atoms have moved to each other's places.`;
}
function resultCaption(r){
  const names = r.unmoved.map(i => ATOMS[i].html).join(', ') || 'none';
  let s = `<b>${r.op.html}</b> done. Unmoved atoms (green halo): <b>${names}</b>.` + moveText(r.op);
  if (r.kind === 'cart') s += ` Faint arrows show where the vectors started. Sum of contributions on unmoved atoms: χ = <b>${nice(r.chi)}</b>.`;
  if (r.kind === 'field'){
    const F = FIELDS[r.fieldId];
    if (!F.parts) s += r.chi > 0 ? ' The yellow pattern lands on itself: χ = <b>+1</b>.' : ' The yellow pattern is reversed: χ = <b>−1</b>.';
    else {
      const mixed = r.diag.some(d => !Number.isInteger(d));
      const three = F.parts.length === 3;
      s += `${mixed ? ` The pattern has turned into a mix of the ${three ? 'partners' : 'two partners'}.` : ''} How much of each partner survives: ${F.partHTML.map((h,k) => `${h} <b>${niceS(r.diag[k])}</b>`).join(', ')}. The ${three ? 'set' : 'pair'}'s character is their sum: χ = <b>${nice(r.chi)}</b>.`;
    }
  }
  return s;
}
function defaultCaption(){
  if (S.arrows === 'cart') return `${3*ATOMS.length} unit vectors: <i>x</i>, <i>y</i>, <i>z</i> on each atom. Apply an operation and watch where each one ends up.`;
  if (S.arrows === 'field'){
    const F = FIELDS[S.fieldId];
    if (F.parts) return `Showing ${F.partHTML[S.part]} of the degenerate ${F.parts.length === 3 ? 'set' : 'pair'} ${F.html}. Apply an operation and see how much of each partner survives.`;
    return `Showing ${F.kind === 'vib' ? F.html + ', ' + F.name : F.name.toLowerCase()}. Apply an operation: does the yellow pattern stay the same (+1) or reverse (−1)?`;
  }
  return 'Drag to rotate, scroll or pinch to zoom. Apply an operation to see what it does to the molecule.';
}
function setCaption(html){ $('caption').innerHTML = html; }
function markOpButtons(id){ document.querySelectorAll('.sop[data-op]').forEach(b => b.classList.toggle('active', b.dataset.op === id)); }

// camera orbit
const DEFAULT_CAM = {theta:-0.75, phi:1.0, r:3.2*RMAX + 2, ...(L.cam || {})};
const cam = {...DEFAULT_CAM};
function placeCamera(){
  const {theta, phi, r} = cam;
  camera.position.set(r*Math.sin(phi)*Math.cos(theta), r*Math.sin(phi)*Math.sin(theta), r*Math.cos(phi));
  camera.lookAt(0,0,0);
}
const ptrs = new Map(); let pinch0 = null;
canvas.addEventListener('pointerdown', e => { ptrs.set(e.pointerId, {x:e.clientX, y:e.clientY}); canvas.setPointerCapture(e.pointerId); pinch0 = null; });
canvas.addEventListener('pointermove', e => {
  const p = ptrs.get(e.pointerId); if (!p) return;
  if (ptrs.size === 2){
    p.x = e.clientX; p.y = e.clientY;
    const [a,b] = [...ptrs.values()], d = Math.hypot(a.x-b.x, a.y-b.y);
    if (pinch0) cam.r = Math.min(DEFAULT_CAM.r*1.8, Math.max(DEFAULT_CAM.r*.45, cam.r*pinch0/d));
    pinch0 = d; return;
  }
  cam.theta -= (e.clientX - p.x) * .008;
  cam.phi = Math.min(Math.PI-.12, Math.max(.12, cam.phi - (e.clientY - p.y) * .008));
  p.x = e.clientX; p.y = e.clientY;
});
['pointerup','pointercancel'].forEach(t => canvas.addEventListener(t, e => { ptrs.delete(e.pointerId); pinch0 = null; }));
canvas.addEventListener('wheel', e => { e.preventDefault(); cam.r = Math.min(DEFAULT_CAM.r*1.8, Math.max(DEFAULT_CAM.r*.45, cam.r * Math.exp(e.deltaY*.0015))); }, {passive:false});
canvas.addEventListener('keydown', e => {
  const k = {ArrowLeft:[.12,0], ArrowRight:[-.12,0], ArrowUp:[0,.1], ArrowDown:[0,-.1]}[e.key];
  if (!k) return; e.preventDefault();
  cam.theta += k[0]; cam.phi = Math.min(Math.PI-.12, Math.max(.12, cam.phi + k[1]));
});

// HTML labels projected from 3D
const labelEls = {};
function label(key, html, cls){
  if (!labelEls[key]){ const el = document.createElement('span'); el.className = 'lab ' + cls; labelEls[key] = el; labelsEl.appendChild(el); }
  const el = labelEls[key]; if (el._html !== html){ el.innerHTML = html; el._html = html; } return el;
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
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h) return;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(w, h, false);
  camera.aspect = w/h;
  camera.fov = w/h < .9 ? 48 : 36;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(canvas);

const IR_STEP = 7, RA_STEP = 8;
let last = performance.now();
function frame(now){
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - last)/1000); last = now;
  let M = null, activeOp = null;
  if (S.anim){
    activeOp = S.anim.op;
    const t = Math.min(1, (now - S.anim.t0)/S.anim.dur);
    M = t >= 1 ? exactMatrix(activeOp) : opMatrix(activeOp, ease(t));
    if (t >= 1) finishOp();
  } else if (S.hold){ activeOp = S.hold.op; M = exactMatrix(activeOp); }
  live.matrix.copy(M || new THREE.Matrix4()); live.matrixWorldNeedsUpdate = true;
  ghost.visible = !!activeOp;

  const field = S.arrows === 'field' ? FIELDS[S.fieldId] : null, fv = field && fieldVecs(field);
  const osc = field && !activeOp;
  if (osc && S.playing) S.phase += dt * Math.PI * 2 * .55;
  const amp = osc ? .3 * Math.sin(S.phase) : 0;
  const cur = ATOMS.map((at,i) => field ? at.pos.clone().addScaledVector(fv[i], amp) : at.pos.clone());
  cur.forEach((p,i) => { atomMeshes[i].position.copy(p); ghostMeshes[i].position.copy(ATOMS[i].pos); });
  bondMeshes.forEach((b,k) => placeBond(b, cur[BONDS[k].i], cur[BONDS[k].j]));

  const specs = arrowSpecs();
  specs.forEach((s,k) => {
    const a = poolArrow(livePool, live, k, false); a.userData.mat.color.setHex(s.color); placeArrow(a, cur[s.atom], s.vec);
    const g = poolArrow(ghostPool, ghost, k, true); g.userData.mat.color.setHex(s.color); placeArrow(g, ATOMS[s.atom].pos, s.vec);
  });
  for (let k = specs.length; k < livePool.length; k++){ livePool[k].visible = false; ghostPool[k].visible = false; }

  const spec = (S.step === IR_STEP || S.step === RA_STEP) && field && !activeOp;
  const resp = spec ? response(S.fieldId, S.part) : null;
  dipArrow.visible = !!(resp && resp.ir && S.step === IR_STEP); ellip.visible = !!(resp && S.step === RA_STEP);
  if (resp){
    const s = Math.sin(S.phase);   // in step with the atoms
    if (resp.ir && S.step === IR_STEP) placeArrow(dipArrow, V(0,0,0), resp.dmu.clone().normalize().multiplyScalar(1.6*s));
    const k = (RMAX*2.2)/(resp.A0[0][0] + resp.A0[1][1] + resp.A0[2][2])*3, gain = resp.raman ? .35*resp.n0/resp.nd*s : 0;
    const A = resp.A0.map((row,a)=> row.map((x,c)=> k*(x + gain*resp.dA[a][c])/3));
    ellip.matrix.set(A[0][0],A[0][1],A[0][2],0, A[1][0],A[1][1],A[1][2],0, A[2][0],A[2][1],A[2][2],0, 0,0,0,1); ellip.matrixWorldNeedsUpdate = true;
  }

  axesGroup.visible = S.axes;
  const hot = activeOp ? activeOp.elems : [];
  ELEM_IDS.forEach(id => ELEM[id].set((S.elements && !ELEM[id].aux) || hot.includes(id), hot.includes(id)));

  if (renderer){ placeCamera(); renderer.render(scene, camera); }

  const lm = live.matrix, hideH = L.hideHLabels;
  ATOMS.forEach((at,i) => putLabel(label('a'+i, at.html, 'atom'), cur[i].clone().applyMatrix4(lm), 14, -15, S.labels && !(hideH && at.el === 'H')));
  [['x',V(AX+.45,0,0)],['y',V(0,AX+.45,0)],['z',V(0,0,AX+.45)]].forEach(([n,p]) => putLabel(label('ax'+n, n, 'axis'), p, 0, 0, S.axes && S.labels));
  Object.entries(ELEM_LABELS).forEach(([id,[html,p,cls,key]]) => putLabel(label('e'+id, html, cls), p, 0, id === 'inv' ? -16 : 0, S.labels && (hot.includes(id) || (S.elements && (FEW_ELEMS || key) && id !== 'inv'))));
}

/* ---------- stage controls ---------- */
$('opbar').insertAdjacentHTML('beforeend', CLASSES.map(c => `<button class="sop" data-op="${c.rep.id}" title="${c.rep.name}">${c.rep.html}</button>`).join('') + '<button class="sop reset" id="reset">Reset</button>');
$('opbar').addEventListener('click', e => { const b = e.target.closest('[data-op]'); if (b) applyOp(b.dataset.op); });
$('reset').addEventListener('click', () => { resetOp(); Object.assign(cam, DEFAULT_CAM); });
function syncToggles(){
  $('tg-axes').setAttribute('aria-pressed', S.axes);
  $('tg-elem').setAttribute('aria-pressed', S.elements);
  $('tg-labels').setAttribute('aria-pressed', S.labels);
}
$('tg-axes').onclick = () => { S.axes = !S.axes; syncToggles(); };
$('tg-elem').onclick = () => { if (locked()) return; S.elements = !S.elements; syncToggles(); };
$('tg-labels').onclick = () => { S.labels = !S.labels; syncToggles(); };
function renderShowing(){
  const el = $('showing');
  if (S.arrows === 'cart') el.innerHTML = `<div class="legend"><span><i style="background:var(--x)"></i>x</span><span><i style="background:var(--y)"></i>y</span><span><i style="background:var(--z)"></i>z</span></div>`;
  else if (S.arrows === 'field'){
    const f = FIELDS[S.fieldId];
    const partners = f.parts ? `<span class="partners" role="group" aria-label="Partner pattern">${f.partHTML.map((h,k) => `<button class="mini" data-part="${k}" aria-pressed="${S.part===k}">${PARTS[k]}</button>`).join('')}</span>` : '';
    const r = (S.step === IR_STEP || S.step === RA_STEP) && response(S.fieldId, S.part);
    // symmetry can allow a change that this simple model makes vanishingly small: say so rather than "zero"
    const sp = f.kind === 'vib' && IRREPS.find(ir => ir.id === f.species);
    const word = (on, allowed) => on ? 'oscillates' : allowed ? 'allowed by symmetry, ≈ 0 in this model' : 'zero';
    const readout = !r ? '' : S.step === IR_STEP ? `<span class="rd">Δμ <b class="${r.ir?'on':''}">${word(r.ir, sp && irActive(sp))}</b></span>` : `<span class="rd">Δα <b class="${r.raman?'on2':''}">${word(r.raman, sp && ramanActive(sp))}</b></span>`;
    el.innerHTML = `<span><b>${f.html}</b> ${f.kind==='vib' ? f.name : ''}</span>${partners}<button class="mini" id="play">${S.playing ? 'Pause' : 'Play'}</button>${readout}`;
    $('play').onclick = () => { S.playing = !S.playing; renderShowing(); };
    el.querySelectorAll('[data-part]').forEach(b => b.onclick = () => { S.part = +b.dataset.part; resetOp(); renderShowing(); });
  } else el.innerHTML = '';
}
function setArrows(kind, fieldId){
  const id = kind === 'field' ? fieldId : null;
  if (id !== S.fieldId) S.part = 0;
  S.arrows = kind; S.fieldId = id;
  resetOp(); renderShowing();
}

/* ---------- lesson steps ---------- */
const T = L.text || {};
const tx = (k, ...a) => typeof T[k] === 'function' ? T[k](...a) : (T[k] || '');
const NAME = L.nameText, N = () => ATOMS.length, NV = () => 3*ATOMS.length - 6;
const repButtons = () => `<div class="btnrow">${CLASSES.map(c => `<button class="btn sm" data-op="${c.rep.id}">${c.rep.html}</button>`).join('')}</div>`;
const classHead = (first='') => `<thead><tr><th>${first}</th>${CLASSES.map(c => `<th>${c.html}</th>`).join('')}</tr></thead>`;
const charCells = ch => ch.map(c => `<td>${nice(c)}</td>`).join('');
// hl underlines translations and rotations; sel = 'ir' underlines only x, y, z, sel = 'ra' only the quadratic functions
function charTable(hl, sel){
  const fn = ir => {
    const lin = ir.lin.map(s => hl && sel !== 'ra' ? `<mark class="tr">${s}</mark>` : s), rot = ir.rot.map(s => hl && !sel ? `<mark class="ro">${s}</mark>` : s);
    return [...lin, ...rot].join(', ');
  };
  const quad = ir => sel === 'ra' && ir.quad ? `<mark class="qd">${ir.quad}</mark>` : ir.quad;
  return `<div class="tablewrap"><table>${classHead(L.groupHTML).replace('</tr>','<th></th><th></th></tr>')}<tbody>${
    IRREPS.map(ir => `<tr><th>${chip(ir)}</th>${charCells(ir.chi)}<td class="fn">${fn(ir)}</td><td class="fn">${quad(ir)}</td></tr>`).join('')
  }</tbody></table></div>`;
}
const isTR = id => id && FIELDS[id] && FIELDS[id].kind !== 'vib';
const isMode = id => id && FIELDS[id] && FIELDS[id].kind === 'vib';
const matches = tests => IRREPS.filter(ir => Object.entries(tests).every(([cls,v]) => near(ir.chi[classIdx(cls)], v, 1e-3)));
const anyEst = () => MODES.some(id => FIELDS[id].est);
const wnList = sp => sp.ids.map(id => FIELDS[id].wn).join(', ');
const estBadge = () => anyEst() ? '<span class="est" title="Estimated with this page\'s force-field model, not measured">est.</span>' : '';
const dimCheck = n => n.reduce((s,x,k)=> s + x*IRREPS[k].dim, 0);

const STEPS = [
  {short:PR ? 'Point group' : 'Count motions', enter(){ setArrows('none'); S.elements = false; }, html(){ if (PR) return practiceStep1(); return `
    ${eyebrow(1)}
    <h2>Count the ways ${NAME} can move</h2>
    <p>Describing where every atom of an <i>N</i>-atom molecule is takes 3<i>N</i> coordinates: an <i>x</i>, <i>y</i> and <i>z</i> for each atom. ${L.formulaHTML} has <i>N</i> = ${N()}, so it has <strong>${3*N()} degrees of freedom</strong>.</p>
    <div class="dof" role="img" aria-label="${3*N()} degrees of freedom split into 3 translations, 3 rotations and ${NV()} vibrations">
      <div class="s t"><b>3</b><span>translations</span></div>
      <div class="s r"><b>3</b><span>rotations</span></div>
      <div class="s v"><b>${NV()}</b><span>vibrations (3<i>N</i> − 6)</span></div>
    </div>
    <p>${NAME[0].toUpperCase() + NAME.slice(1)} is nonlinear, so 3<i>N</i> − 6 = ${NV()} of those motions are vibrations. The same three-stage plan used in every lesson finds their symmetries without solving any equations of motion:</p>
    <ul>
      <li>Build a reducible representation, ${G3N}, from all ${3*N()} motions.</li>
      <li>Reduce it to a sum of irreducible representations.</li>
      <li>Remove the parts that belong to translations and rotations. What remains is ${GV}.</li>
    </ul>
    <h3>Point group and axes</h3>
    ${tx('group')}
    <p class="hint">Not sure how to get the point group? <a href="point-groups.html#${(typeof L.pgKey === 'function' ? L.pgKey(S.iso) : L.pgKey) || L.id}">Walk through the flowchart for ${NAME}</a>, or look up any term in the <a href="glossary.html">glossary</a>.</p>
    <div class="callout"><strong>Try it.</strong> Drag the molecule to turn it, scroll or pinch to zoom, and turn on <em>Symmetry elements</em> above the model.</div>`; }},

  {short:'Operations', enter(){ setArrows('none'); S.elements = true; }, html(){
    const rows = CLASSES.map(c => {
      const op = c.ops.find(o => S.seenOps[o.id]), um = op && unmoved(op);
      return `<tr><th>${c.html}</th><td class="desc">${c.desc}</td><td><button class="btn sm" data-op="${c.rep.id}">Apply ${c.rep.html}</button></td><td>${op ? `<b>${um.length}</b>` : '<span class="muted">?</span>'}</td></tr>`;
    }).join('');
    const allSeen = CLASSES.every(c => c.ops.some(o => S.seenOps[o.id]));
    const keep = CLASSES.filter(c => unmoved(c.rep).length), zero = CLASSES.length - keep.length;
    return `
    ${eyebrow(2)}
    <h2>Watch each kind of symmetry operation</h2>
    <p>A symmetry operation moves the molecule into a position you cannot tell apart from where it started. ${L.groupHTML} has ${ORDER} ${plural(ORDER, 'operation')} in ${CLASSES.length} ${plural(CLASSES.length, 'class', 'classes')}, so its order is <i>h</i> = ${ORDER}. Operations in the same class always behave the same way, so you only need to try one from each class. Note how many atoms <strong>stay exactly where they were</strong>.</p>
    <div class="tablewrap"><table><thead><tr><th>Class</th><th>What it does</th><th></th><th>Unmoved atoms</th></tr></thead><tbody>${rows}</tbody></table></div>
    ${tx('opsHint')}
    ${allSeen ? `<div class="callout"><strong>${keep.length === CLASSES.length ? 'Every class leaves some atom in place.' : `Only ${keep.length} of the ${CLASSES.length} classes ${keep.length === 1 ? 'leaves' : 'leave'} any atom in place:`}</strong> ${keep.map(c => `${c.html} (${unmoved(c.rep).length})`).join(', ')}.${zero ? (zero === 1 ? ` The other character of ${G3N} will be 0.` : ` The other ${zero} characters of ${G3N} will be 0.`) : ''}</div>` : '<p class="hint">Apply one operation from every class to fill in the last column.</p>'}`; }},

  {short:'Vector basis', enter(){ setArrows('cart'); S.elements = false; }, html(){
    const r = S.cartLast && S.cart[S.cartLast];
    const cell = c => c === null ? '<td class="z" title="Atom moves to a new place">0</td>' : `<td class="${c>0?'p1':c<0?'m1':'z'}">${niceS(c)}</td>`;
    const tally = r ? (r.unmoved.length ? `
      <div class="tablewrap"><table>
        <thead><tr><th>${r.op.html}</th><th><i>x</i></th><th><i>y</i></th><th><i>z</i></th><th>Atom total</th></tr></thead>
        <tbody>${ATOMS.map((at,i) => r.unmoved.includes(i) ? `<tr><th>${at.html}</th>${r.cells[i].map(cell).join('')}<td>${nice(r.cells[i].reduce((s,c)=>s+(c||0),0))}</td></tr>` : '').join('')}
        ${ATOMS.length > r.unmoved.length ? `<tr class="sub"><th>${ATOMS.length - r.unmoved.length} other atoms (move)</th><td>0</td><td>0</td><td>0</td><td>0</td></tr>` : ''}
        <tr class="total"><th>χ(${r.op.html})</th><td></td><td></td><td></td><td>${nice(r.chi)}</td></tr></tbody>
      </table></div>` : `<p class="hint">Under ${r.op.html} every atom moves, so all ${3*N()} vectors land on other atoms: χ(${r.op.html}) = 0 with no arithmetic at all.</p>`) : `<p class="hint">Apply an operation to fill in the tally.</p>`;
    const done = CLASSES.every(c => S.cart[c.id]);
    return `
    ${eyebrow(3)}
    <h2>Attach <i>x</i>, <i>y</i>, <i>z</i> vectors to every atom</h2>
    <p>Put three unit vectors on each atom. These ${3*N()} vectors are the basis for ${G3N}. Each operation sends them to new places, which you could write as a ${3*N()} × ${3*N()} matrix, and its <a href="glossary.html#character">character</a> χ is the trace, the sum of the diagonal. Only vectors that stay on their own atom reach the diagonal:</p>
    <ul>
      <li>The atom moves to another atom's place: its three vectors add <strong>0</strong>.</li>
      <li>A vector ends up pointing the same way: <strong>+1</strong>. Reversed: <strong>−1</strong>.</li>
      <li>A vector ends up turned by an angle θ: <strong>cos θ</strong>.</li>
    </ul>
    ${tx('vecNote')}
    ${repButtons()}
    ${tally}
    <h3>Characters so far</h3>
    <div class="tablewrap"><table>${classHead()}<tbody><tr><th>χ(${G3N})</th>${CLASSES.map(c => S.cart[c.id] ? `<td>${nice(S.cart[c.id].chi)}</td>` : '<td class="q">?</td>').join('')}</tr></tbody></table></div>
    ${done ? `<div class="callout"><strong>That row is ${G3N}.</strong> Next you will see a faster way to get it.</div>` : '<p class="hint">Apply one operation from each class to complete the row.</p>'}`; }},

  {short:'Build Γ3N', enter(){ setArrows('none'); S.elements = false; }, html(){
    const g = gamma3N();
    const reps = (L.matOps ? L.matOps.map(id => OPS.find(op => op.id === id)) : CLASSES.slice(1).map(c => c.rep).sort((a,b) => unmoved(b).length - unmoved(a).length).slice(0,3));
    const mats = reps.map(op => `<div class="mat"><span class="t">${op.html}</span><div class="grid">${op.M.flat().map((v,k)=>`<span class="${k%4===0?'d':''}">${nice(v)}</span>`).join('')}</div><span class="tr">trace = ${nice(trace(op.M))}</span></div>`).join('');
    const c = S.check4;
    const box = (key, cl, k, label) => `<input class="cell-in ${c ? (c[k][key] ? 'ok':'no') : ''}" id="${key}-${cl.id}" inputmode="decimal" autocomplete="off" aria-label="${label} for ${cl.id}" value="${S.inputs[key+'-'+cl.id] ?? ''}">`;
    const rows = CLASSES.map((cl,k) => PR
      ? `<tr><th>${cl.html}</th><td>${box('um', cl, k, 'unmoved atoms')}</td><td>${box('ct', cl, k, 'contribution per atom')}</td><td>${box('g3n', cl, k, 'χ(Γ3N)')}</td></tr>`
      : `<tr><th>${cl.html}</th><td>${unmoved(cl.rep).length}</td><td>${nice(trace(cl.rep.M))}</td><td>${box('g3n', cl, k, 'χ(Γ3N)')}</td></tr>`).join('');
    const allOk = c && c.every(x => x.g3n && (!PR || (x.um && x.ct)));
    return `
    ${eyebrow(4)}
    <h2>Build ${G3N} with the shortcut</h2>
    <p>Every unmoved atom contributes the same amount, the trace of the 3 × 3 matrix the operation applies to (<i>x</i>, <i>y</i>, <i>z</i>):</p>
    <div class="formula">χ(R) = (number of unmoved atoms) × (contribution per unmoved atom)</div>
    <div class="matrices">${mats}</div>
    <p class="muted">General contributions per unmoved atom: <i>E</i> = 3, σ = 1, <i>i</i> = −3, <i>C<sub>n</sub></i> = 1 + 2 cos(360°/<i>n</i>), <i>S<sub>n</sub></i> = −1 + 2 cos(360°/<i>n</i>). ${tx('contribNote')}</p>
    <h3>Your turn</h3>
    <p>${PR ? 'Fill in all three columns, then check. Count unmoved atoms in the viewer (step 2) if you need to.' : 'Fill in the last column, then check.'}${CLASSES.some(cl => !Number.isInteger(snap(trace(cl.rep.M)))) ? ' Decimals to two places are fine.' : ''}</p>
    <div class="tablewrap"><table><thead><tr><th>Class</th><th>Unmoved atoms</th><th>Contribution per atom</th><th>χ(${G3N})</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="btnrow"><button class="btn primary" data-action="check4">Check</button><button class="btn" data-action="reveal4">Show answer</button></div>
    ${c ? (allOk ? `<p class="fb ok">Correct. ${G3N} = ${g.map(nice).join(', ')}. These match the tally from step 3.</p>` : `<p class="fb no">${PR ? 'Some entries are off. Check the unmoved atoms against the viewer, the contributions against the list above, and multiply.' : 'Some entries are off. Multiply the two numbers beside each box.'}</p>`) : ''}`; }},

  {short:'Reduce', enter(){ setArrows('none'); S.elements = false; }, html(){
    const g = gamma3N(), n = reduce(g), c = S.check5;
    const nz = CLASSES.map((cl,j) => j).filter(j => !near(g[j], 0));
    const rows = IRREPS.map((ir,k) => `<tr><th>${chip(ir)}</th><td><input class="cell-in ${c ? (c[k] ? 'ok':'no') : ''}" id="n-${ir.id}" inputmode="numeric" autocomplete="off" aria-label="number of ${ir.id}" value="${S.inputs['n-'+ir.id] ?? ''}"></td></tr>`).join('');
    const work = IRREPS.map((ir,k) => `<i>n</i>(${ir.html}) = <span class="frac"><span>1</span><span>${ORDER}</span></span>[ ${nz.map(j => `(${CLASSES[j].g})(${nice(g[j])})(${nice(ir.chi[j])})`).join(' + ')} ] = <span class="frac"><span>${nice(nz.reduce((s,j)=> s + CLASSES[j].g*g[j]*ir.chi[j], 0))}</span><span>${ORDER}</span></span> = <b>${n[k]}</b>`).join('<br>');
    const allOk = c && c.every(Boolean);
    const twoD = IRREPS.some(ir => ir.dim > 1);
    return `
    ${eyebrow(5)}
    <h2>Reduce ${G3N}</h2>
    <p>The reduction formula tells you how many times each of the ${IRREPS.length} irreducible representations appears in ${G3N}:</p>
    <div class="formula"><i>n</i><sub><i>i</i></sub> = <span class="frac"><span>1</span><span><i>h</i></span></span> Σ<sub><i>R</i></sub> <i>g</i>(<i>R</i>) · χ(<i>R</i>) · χ<sub><i>i</i></sub>(<i>R</i>)</div>
    <p>Here <i>h</i> = ${ORDER}, and <i>g</i>(<i>R</i>) is the number of operations in each class (the number in front of the class label).${nz.length < CLASSES.length ? ` Because ${G3N} is zero in ${CLASSES.length - nz.length} ${plural(CLASSES.length - nz.length, 'class', 'classes')}, only ${nz.length} ${plural(nz.length, 'term')} ${nz.length === 1 ? 'survives' : 'survive'} in each sum.` : ''}</p>
    ${tx('reduceNote')}
    ${charTable(false)}
    <div class="tablewrap"><table>${classHead()}<tbody><tr class="total"><th>χ(${G3N})</th>${charCells(g)}</tr></tbody></table></div>
    <h3>Your turn</h3>
    <div class="tablewrap"><table><thead><tr><th>Species</th><th>Times it appears</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="btnrow"><button class="btn primary" data-action="check5">Check</button><button class="btn" data-action="work5">${S.showWork ? 'Hide working' : 'Show working'}</button></div>
    ${c ? (allOk ? `<p class="fb ok">Correct.</p>` : `<p class="fb no">Not quite. Open the working to see where your sum differs. Did you multiply by <i>g</i>?</p>`) : ''}
    ${S.showWork ? `<div class="work">${work}</div>` : ''}
    ${allOk || S.showWork ? `<div class="result"><span class="lhs">${G3N} =</span><span class="rep">${repHTML(n)}</span><span class="muted">Degrees of freedom check${twoD ? `, counting each E as two${IRREPS.some(ir => ir.dim === 3) ? ' and each T as three' : ''}` : ''}: ${dimCheck(n)} = 3<i>N</i></span></div>` : ''}`; }},

  {short:'Remove T & R', enter(){ if (isTR(S.fieldId)) setArrows('field', S.fieldId); else setArrows('none'); S.elements = false; }, html(){
    const g = gamma3N(), gt = sumChars(TR_IDS()), gr = sumChars(ROT_IDS());
    const gv = g.map((x,k) => snap(x - gt[k] - gr[k]));
    const motion = id => { const f = FIELDS[id], ir = irrepOf(fieldChars(id)); return `<button class="motion ${S.fieldId===id?'active':''}" data-field="${id}"><span class="nm">${f.html}</span><span class="ir">${S.motionSeen[id] ? chip(ir) : 'Show me'}</span></button>`; };
    const ids = L.tr.map(t => t.id), allSeen = ids.every(id => S.motionSeen[id]);
    const rows = CLASSES.map((cl,k) => `<tr><th>${cl.html}</th><td>${nice(g[k])}</td><td class="z">${nice(gt[k])}</td><td class="z">${nice(gr[k])}</td><td>${S.vibRevealed ? nice(gv[k]) : '<span class="muted">?</span>'}</td></tr>`).join('');
    const pairs = SPECIES.filter(sp => sp.ir.dim === 2).reduce((s,sp)=> s + sp.n, 0), distinct = SPECIES.reduce((s,sp)=> s + sp.n, 0);
    const triples = SPECIES.filter(sp => sp.ir.dim === 3).reduce((s,sp)=> s + sp.n, 0);
    const degText = triples ? `, but only <strong>${distinct} distinct frequencies</strong>, because ${[pairs ? `${2*pairs} of them come in ${pairs} degenerate ${plural(pairs, 'pair')}` : '', `${3*triples} come in ${triples} degenerate ${plural(triples, 'set')} of three`].filter(Boolean).join(' and ')}`
      : pairs ? `, but only <strong>${distinct} distinct frequencies</strong>, because ${2*pairs} of them come in ${pairs} degenerate ${plural(pairs, 'pair')}` : '';
    const lin = IRREPS.filter(ir => ir.lin.length).map(ir => ir.lin.join(', ')).join(', '), rot = IRREPS.filter(ir => ir.rot.length).map(ir => ir.rot.join(', ')).join(', ');
    return `
    ${eyebrow(6)}
    <h2>Remove translations and rotations</h2>
    <p>${G3N} contains every motion, including the six that do not stretch or bend anything. The character table says where they live: translations transform like ${lin}, and rotations like ${rot}.</p>
    ${charTable(true)}
    <p>${L.tr.some(t => t.parts.length > 2) ? 'Motions in brackets form degenerate sets: any one partner on its own is mixed into the others by some operations. ' : L.tr.some(t => t.parts.length > 1) ? 'Motions in brackets form degenerate pairs: either partner on its own is mixed into the other by some operations. ' : ''}Click a motion to animate it, then apply operations in the viewer to confirm its characters.${L.tr.some(t => t.parts.length > 1) ? ` For a ${L.tr.some(t => t.parts.length > 2) ? 'set' : 'pair'}, switch partners with the buttons above the model.` : ''}</p>
    <div class="motions">${ids.map(motion).join('')}</div>
    ${allSeen ? `<p class="fb ok">${GT} = ${repHTML(reduce(gt))} and ${GR} = ${repHTML(reduce(gr))}.</p>` : ''}
    <h3>Subtract</h3>
    <div class="tablewrap"><table><thead><tr><th>Class</th><th>${G3N}</th><th>− ${GT}</th><th>− ${GR}</th><th>${GV}</th></tr></thead><tbody>${rows}</tbody></table></div>
    ${S.vibRevealed ? `
      <div class="result"><span class="lhs">${GV} =</span><span class="rep">${repHTML(reduce(gv))}</span></div>
      <p>Or subtract the reduced forms directly: (${repHTML(reduce(g))}) − (${repHTML(reduce(gt))}) − (${repHTML(reduce(gr))}). That leaves ${NV()} vibrations, as 3<i>N</i> − 6 predicted${degText}.</p>
      ${tx('vibNote')}`
      : PR ? vibInputs() : `<div class="btnrow"><button class="btn primary" data-action="vib">Subtract and reduce</button></div>`}`; }},

  {short:'Normal modes', enter(){ setArrows('field', isMode(S.fieldId) ? S.fieldId : MODES[0]); S.elements = false; }, html(){
    const cur = isMode(S.fieldId) && FIELDS[S.fieldId].species;
    const plane = L.molPlaneClass && classIdx(L.molPlaneClass);
    const cards = SPECIES.map((sp, k) => {
      const tests = S.modeTests[sp.ir.id] || {}, left = matches(tests), known = Object.keys(tests).length && left.length === 1;
      const two = sp.ir.dim === 2;
      const where = plane != null && plane >= 0 ? (sp.ir.chi[plane] > 0 ? ', in-plane' : ', out-of-plane') : '';
      const boxes = CLASSES.map(c => { const v = tests[c.id]; return v === undefined ? '' : `<span class="cbox">${c.html} <b class="${v>0?'p1':v<0?'m1':''}">${fmtS(v)}</b></span>`; }).join('');
      const status = !Object.keys(tests).length ? '<span class="muted">apply operations to narrow it down</span>' : known ? chip(left[0]) : `<span class="muted">${left.length} rows of the table still match</span>`;
      return `<article class="mode ${cur===sp.ir.id?'active':''}">
        <div><h4>Set ${k+1}: ${sp.n} ${two ? `degenerate ${plural(sp.n,'pair')}` : sp.ir.dim === 3 ? `triply degenerate ${plural(sp.n,'set')}` : plural(sp.n,'vibration')}${where}</h4><span class="wn">≈ ${wnList(sp)} cm<sup>−1</sup>${estBadge()}</span></div>
        <div class="btnrow tight">${sp.ids.map((id,j) => `<button class="btn sm ${S.fieldId===id?'active':''}" data-field="${id}" title="${FIELDS[id].name}">${FIELDS[id].wn}</button>`).join('')}</div>
        <div class="chars">${boxes} <span>→ ${status}</span></div>
      </article>`; }).join('');
    const found = SPECIES.every(sp => { const t = S.modeTests[sp.ir.id] || {}; return Object.keys(t).length && matches(t).length === 1; });
    return `
    ${eyebrow(7)}
    <h2>Identify the vibrations by their symmetry</h2>
    <p>${GV} = ${repHTML(vibIrreps())}: ${MODES.length} distinct ${plural(MODES.length, 'frequency', 'frequencies')} in ${SPECIES.length} symmetry ${plural(SPECIES.length, 'species', 'species')}. ${SPECIES.length > 1 ? `The cards below group ${NAME}'s vibrations into those ${SPECIES.length} sets, without saying which set is which. Your job is to identify them.` : `All of ${NAME}'s vibrations share one species. Apply operations to confirm which one.`}</p>
    <p>Pick a vibration (the buttons show its wavenumber), then apply operations in the viewer. Each result rules out every row of the character table that disagrees. Keep going until only one row is left. ${tx('modesHint')}</p>
    <div class="modes">${cards}</div>
    <p class="hint">${anyEst()
      ? 'The patterns and the wavenumbers marked <em>est.</em> come from a simple valence force field built into this page: bond stretches, angle bends, out-of-plane wags and torsions with textbook force constants, solved separately in each symmetry block. Every pattern has exactly the right symmetry, but the shapes and especially the wavenumbers are rough estimates, not measured values. Hover a button to see which motion dominates.'
      : 'The patterns come from a simple valence force field built into this page, solved separately in each symmetry block, so each has exactly the right symmetry. The wavenumbers are measured fundamentals, matched to the patterns by order within each species. Hover a button to see which motion dominates.'} ${tx('modesNote')}</p>
    ${found ? `<div class="callout"><strong>${SPECIES.length > 1 ? `All ${SPECIES.length} sets identified.` : 'Species identified.'}</strong> The symmetry of every one of ${NAME}'s ${NV()} vibrations follows from the character table alone.</div>` : ''}
    <p>Next: which of these vibrations can you actually see in a spectrum?</p>`; }},

  {short:'IR', enter(){ setArrows('field', isMode(S.fieldId) ? S.fieldId : MODES[0]); S.elements = false; }, html(){ return selectionStep('ir'); }},
  {short:'Raman', enter(){ setArrows('field', isMode(S.fieldId) ? S.fieldId : MODES[0]); S.elements = false; }, html(){ return selectionStep('ra'); }},
];

/* ---------- steps 8 and 9: selection rules ---------- */
const KIND = {
  ir:{name:'IR', long:'infrared', test:irActive, mark:'orange', why:ir => irActive(ir) ? `like ${ir.lin.join(', ')}` : 'no <i>x</i>, <i>y</i> or <i>z</i>'},
  ra:{name:'Raman', long:'Raman', test:ramanActive, mark:'blue', why:ir => ramanActive(ir) ? `like ${ir.quad}` : 'no quadratic function'},
};
function spectrumSVG(kinds){
  const W = 600, PH = 62, GAP = 30, TOP = 20, MAXW = 4000, X = wn => 34 + (MAXW - wn)/MAXW*(W - 54);
  const panels = kinds.map(k => [k === 'ir' ? 'Infrared' : 'Raman', k === 'ir' ? 'ir' : 'ra', KIND[k].test]);
  let svg = '';
  panels.forEach(([name, cls, test], p) => {
    const y0 = TOP + p*(PH + GAP), base = y0 + PH;
    svg += `<text class="pl" x="0" y="${y0 - 6}">${name}</text><line class="base" x1="34" x2="${W - 20}" y1="${base}" y2="${base}"/>`;
    const bands = MODES.flatMap(id => { const F = FIELDS[id], ir = IRREPS.find(r => r.id === F.species); return test(ir) ? [{ir, wn:F.wn, name:F.name}] : []; }).sort((a,b) => b.wn - a.wn);
    const sticks = bands.reduce((out, b) => { const s = out[out.length - 1]; if (s && X(b.wn) - X(s[s.length - 1].wn) < 5) s.push(b); else out.push([b]); return out; }, []);
    let lastX = -99;
    sticks.forEach(s => {
      const x = X(s[0].wn), lab = x - lastX > 36; if (lab) lastX = x;
      svg += `<g data-tip="${s.map(b => `${b.ir.html} · ${b.wn} cm<sup>−1</sup> · ${b.name}`).join('<br>')}"><line class="stick ${cls}" x1="${x}" x2="${x}" y1="${base}" y2="${y0 + 16}"/><circle class="${cls}" cx="${x}" cy="${y0 + 16}" r="4"/>${lab ? `<text class="lb" x="${x}" y="${y0 + 6}" text-anchor="middle">${s[0].wn}</text>` : ''}<rect class="hit" x="${x - 8}" y="${y0}" width="16" height="${PH}"/></g>`;
    });
    if (!bands.length) svg += `<text class="lb" x="${W/2}" y="${y0 + PH/2}" text-anchor="middle">no fundamentals</text>`;
  });
  const ay = TOP + panels.length*PH + (panels.length - 1)*GAP + 16;
  for (let t = MAXW; t >= 0; t -= 500) svg += `<text class="ax" x="${X(t)}" y="${ay}" text-anchor="middle">${t}</text>`;
  svg += `<text class="ax" x="${(W + 14)/2}" y="${ay + 18}" text-anchor="middle">wavenumber / cm⁻¹</text>`;
  return `<div class="spec"><svg viewBox="0 0 ${W} ${ay + 24}" role="img" aria-label="Predicted ${kinds.map(k => KIND[k].long).join(' and ')} stick ${kinds.length > 1 ? 'spectra' : 'spectrum'}">${svg}</svg><div class="tip"></div></div>`;
}
function selectionStep(kind){
  const K = KIND[kind], nv = vibIrreps(), c = S.chk[kind], done = S.rev[kind] || (c && Object.values(c).every(Boolean));
  const yn = sp => {
    const v = (S.sel[sp.ir.id] || {})[kind], st = c ? (c[sp.ir.id] ? 'ok' : 'no') : '';
    return `<span class="yn ${st}" role="group" aria-label="${K.name} active for ${sp.ir.id}"><button data-yn="${sp.ir.id}|${kind}|1" aria-pressed="${v === true}">Yes</button><button data-yn="${sp.ir.id}|${kind}|0" aria-pressed="${v === false}">No</button></span>`;
  };
  const rows = SPECIES.map(sp => `<tr><th>${chip(sp.ir)} <span class="muted">${wnList(sp)}</span></th><td>${yn(sp)}</td>${done ? `<td class="fn">${K.why(sp.ir)}</td>` : ''}</tr>`).join('');
  const count = test => MODES.filter(id => test(IRREPS.find(r => r.id === FIELDS[id].species))).length;
  const n = count(K.test), silent = SPECIES.filter(sp => !irActive(sp.ir) && !ramanActive(sp.ir));
  const both = SPECIES.filter(sp => irActive(sp.ir) && ramanActive(sp.ir));
  const btns = `<div class="btnrow">${MODES.map(id => `<button class="btn sm ${S.fieldId===id?'active':''}" data-field="${id}" title="${FIELDS[id].name}">${IRREPS.find(ir => ir.id === FIELDS[id].species).html} ${FIELDS[id].wn}</button>`).join('')}</div>`;
  const intro = kind === 'ir' ? `
    <h2>Which vibrations absorb infrared light?</h2>
    <p>Light can only excite a vibration if the vibration changes something the light's oscillating electric field can push on. For <strong>infrared absorption</strong> that is the <strong>dipole moment</strong> μ. The dipole is a vector, and its components μ<sub><i>x</i></sub>, μ<sub><i>y</i></sub>, μ<sub><i>z</i></sub> transform like <i>x</i>, <i>y</i> and <i>z</i>.</p>
    <h3>Watch it happen</h3>
    <p>Pick a vibration. The <strong>pink arrow</strong> is the change in dipole, Δμ, worked out from partial charges on the atoms. If the arrow never appears, the vibration cannot absorb IR.</p>
    ${btns}
    <p class="hint">This is a toy model, but it respects the molecule's symmetry, so it never shows a change that the group theory below forbids. Now and then it shows almost no change for a vibration that symmetry allows: a real band that is simply weak. For a degenerate pair, try both partners.</p>
    <h3>The group theory shortcut</h3>
    <p>The strength of a transition from the ground state to the first excited level of a vibration depends on the integral ⟨0|μ|1⟩. An integral over all space is zero unless its integrand is totally symmetric. The ground state is totally symmetric and the excited level has the symmetry of the vibration, so the integral can only survive if the vibration has the same symmetry as one of μ<sub><i>x</i></sub>, μ<sub><i>y</i></sub>, μ<sub><i>z</i></sub>.</p>
    <div class="callout"><strong>Rule:</strong> a vibration is <strong>IR active</strong> if its row of the character table lists <i>x</i>, <i>y</i> or <i>z</i> (underlined in orange below).</div>` : `
    <h2>Which vibrations show up in the Raman spectrum?</h2>
    <p>In <strong>Raman scattering</strong>, the light's field induces a dipole in the electron cloud, and a vibration shows up if it changes how easily that happens: the <strong>polarizability</strong> α. α is a 3 × 3 tensor, and its components α<sub><i>xx</i></sub>, α<sub><i>xy</i></sub>, … transform like the quadratic functions <i>x</i><sup>2</sup>, <i>xy</i>, ….</p>
    <h3>Watch it happen</h3>
    <p>Pick a vibration. The <strong>translucent shape</strong> is the polarizability ellipsoid, from a simple model in which each bond is easier to polarize along its length. If the ellipsoid holds still (to first order), the vibration cannot Raman scatter.</p>
    ${btns}
    <p class="hint">This is a toy model, but it respects the molecule's symmetry, so it never shows a change that the group theory below forbids. Now and then it shows almost no change for a vibration that symmetry allows: a real band that is simply weak. For a degenerate pair, try both partners.</p>
    <h3>The group theory shortcut</h3>
    <p>The same argument as for IR, with α in place of μ: ⟨0|α|1⟩ survives only if the vibration has the same symmetry as one of the components of α.</p>
    <div class="callout"><strong>Rule:</strong> a vibration is <strong>Raman active</strong> if its row of the character table lists a quadratic function such as <i>x</i><sup>2</sup>, <i>z</i><sup>2</sup> or <i>xy</i> (underlined in blue below).</div>`;
  return `
    ${eyebrow(kind === 'ir' ? 8 : 9)}
    ${intro}
    ${charTable(true, kind)}
    <h3>Your turn</h3>
    <p>For each symmetry species in ${GV} = ${repHTML(nv)}, decide whether it is ${K.name} active.</p>
    <div class="tablewrap"><table><thead><tr><th>Species</th><th>${K.name} active?</th>${done ? '<th>Why</th>' : ''}</tr></thead><tbody>${rows}</tbody></table></div>
    <div class="btnrow"><button class="btn primary" data-action="check" data-kind="${kind}">Check</button><button class="btn" data-action="reveal" data-kind="${kind}">Show answer</button></div>
    ${c && !done ? `<p class="fb no">Not quite. Look along each species' row: ${kind === 'ir' ? 'is there an <i>x</i>, <i>y</i> or <i>z</i>?' : 'is there a quadratic function?'}</p>` : ''}
    ${done ? `${c && !S.rev[kind] ? '<p class="fb ok">Correct.</p>' : ''}
      <h3>The predicted ${K.long} spectrum</h3>
      <p>Each active fundamental gives one band, and a degenerate ${IRREPS.some(ir => ir.dim === 3) ? 'pair or set gives a single band because all its partners have' : 'pair gives a single band because both partners have'} the same frequency. Prediction: <strong>${n}</strong> ${K.name} ${plural(n,'band')}.</p>
      ${spectrumSVG([kind])}
      <p class="hint">Stick heights are not intensities: group theory says whether a band can appear, not how strong it is. Hover or tap a stick for details.${anyEst() ? ' Positions are force-field estimates.' : ''} Real spectra also show weaker overtone and combination bands.</p>
      ${kind === 'ir' ? tx('irNote') : `
      <h3>IR and Raman together</h3>
      <p>${both.length ? `Species that are both IR and Raman active: ${both.map(sp => chip(sp.ir)).join(' ')}.` : 'No species is both IR and Raman active.'} ${silent.length ? `Silent in both: ${silent.map(sp => chip(sp.ir)).join(' ')} (${silent.reduce((s,sp)=> s + sp.n, 0)} ${plural(silent.reduce((s,sp)=> s + sp.n, 0), 'fundamental')}).` : 'No vibration is silent: every one shows up somewhere.'}</p>
      ${spectrumSVG(['ir','ra'])}
      <h3>Centres of inversion and mutual exclusion</h3>
      <p>If a molecule has a centre of inversion, <i>x</i>, <i>y</i> and <i>z</i> all change sign under <i>i</i> (they are <i>u</i>), and every quadratic function keeps its sign (<i>g</i>). So a <i>u</i> vibration can only be IR active and a <i>g</i> vibration can only be Raman active: the <strong>rule of mutual exclusion</strong>.</p>
      ${tx('ramanNote')}
      ${PR ? practiceEnd() : ''}`}` : ''}`;
}
function practiceEnd(){
  const nv = vibIrreps(), list = test => SPECIES.filter(sp => test(sp.ir)).map(sp => chip(sp.ir)).join(' ') || 'none';
  const bands = test => MODES.filter(id => test(IRREPS.find(r => r.id === FIELDS[id].species))).length;
  return `<h3>Your answer, in full</h3>
    <div class="tablewrap"><table><tbody>
      <tr><th>Point group</th><td class="fn">${L.groupHTML}</td></tr>
      <tr><th>${GV}</th><td class="fn">${repHTML(nv)} (${NV()} vibrations)</td></tr>
      <tr><th>IR active</th><td class="fn">${list(irActive)}: ${bands(irActive)} ${plural(bands(irActive), 'band')}</td></tr>
      <tr><th>Raman active</th><td class="fn">${list(ramanActive)}: ${bands(ramanActive)} ${plural(bands(ramanActive), 'band')}</td></tr>
    </tbody></table></div>
    <div class="btnrow"><a class="btn primary" href="${PR.nextURL(PR.allowed)}">Try another molecule →</a></div>`;
}

/* ---------- practice mode ---------- */
// Until the point group is found (or revealed) the later steps, the operation buttons and the symmetry elements stay hidden.
const locked = () => !!PR && !(S.pg.ok || S.pg.rev);
function syncLock(){
  const lk = locked();
  $('opbar').style.display = lk ? 'none' : '';
  $('tg-elem').disabled = lk; if (lk){ S.elements = false; syncToggles(); }
  renderStepper();
}
const PG_ROWS = [['Low symmetry',['C1','Cs','Ci']], ['C<sub><i>n</i></sub>',['C2','C3','C4']], ['C<sub><i>n</i>v</sub>',['C2v','C3v','C4v','C5v','C6v']],
  ['C<sub><i>n</i>h</sub>',['C2h','C3h']], ['D<sub><i>n</i></sub>',['D2','D3','D4']], ['D<sub><i>n</i>h</sub>',['D2h','D3h','D4h','D5h','D6h']],
  ['D<sub><i>n</i>d</sub>',['D2d','D3d','D4d','D5d']], ['S<sub>2<i>n</i></sub>',['S4','S6']], ['Cubic',['Td','Oh','Ih']], ['Linear',['Cinfv','Dinfh']]];
function practiceStep1(){
  const c = S.cnt, done = locked() ? false : true, opt = Object.fromEntries(PR.options.map(o => [o.key, o.html]));
  const cin = (id, label) => `<input class="cell-in ${c ? (c[id] ? 'ok' : 'no') : ''}" id="${id}" inputmode="numeric" autocomplete="off" aria-label="${label}" value="${S.inputs[id] ?? ''}">`;
  const cntOk = c && Object.values(c).every(Boolean);
  const pgBtn = k => `<button class="pgb" data-pg="${k}" aria-pressed="${S.pg.sel === k}" ${done ? 'disabled' : ''}>${opt[k]}</button>`;
  const pgRows = PG_ROWS.map(([lab, keys]) => `<div class="pgrow"><span class="lbl">${lab}</span><div class="pgset">${keys.map(pgBtn).join('')}</div></div>`).join('');
  const flow = PR.flow.slice(0, S.pg.hints).map(f => `<li><span>${f.q}</span> <b>${f.a}</b></li>`).join('');
  const classes = CLASSES.map(cl => cl.html).join(', ');
  const fb = S.pg.ok === false ? `<p class="fb no">Not ${opt[S.pg.sel]}. ${S.pg.tries > 1 ? 'Try the flowchart questions below, one at a time.' : 'Look again at the model: which rotation axes and mirror planes does it really have?'}</p>`
    : S.pg.ok ? `<p class="fb ok">Correct: ${L.groupHTML}.</p>` : '';
  return `
    ${eyebrow(1)}
    <h2>Find the point group of ${PR.formulaHTML}</h2>
    <p>Your molecule is ${PR.nameHTML}, ${PR.formulaHTML}. Drag the model to turn it, and look for rotation axes, mirror planes and a centre of inversion. You will work through the same steps as the solved lessons, but this time you supply the answers.</p>
    <h3>Count the motions</h3>
    <div class="tablewrap"><table><tbody>
      <tr><th>Number of atoms, <i>N</i></th><td>${cin('pc-n', 'number of atoms')}</td></tr>
      <tr><th>Degrees of freedom, 3<i>N</i></th><td>${cin('pc-3n', 'degrees of freedom')}</td></tr>
      <tr><th>Vibrations (the molecule is not linear)</th><td>${cin('pc-v', 'number of vibrations')}</td></tr>
    </tbody></table></div>
    <div class="btnrow"><button class="btn primary" data-action="checkCount">Check</button><button class="btn" data-action="revealCount">Show answer</button></div>
    ${c ? (cntOk ? `<div class="dof" role="img" aria-label="${3*N()} degrees of freedom split into 3 translations, 3 rotations and ${NV()} vibrations">
      <div class="s t"><b>3</b><span>translations</span></div><div class="s r"><b>3</b><span>rotations</span></div><div class="s v"><b>${NV()}</b><span>vibrations (3<i>N</i> − 6)</span></div></div>`
      : '<p class="fb no">Not quite. Count every atom, multiply by 3, and remember that a nonlinear molecule has 3 translations and 3 rotations.</p>') : ''}
    <h3>Which point group?</h3>
    <p>Pick one, then check.</p>
    <div class="pgpick">${pgRows}</div>
    <div class="btnrow"><button class="btn primary" data-action="checkPg" ${S.pg.sel && !done ? '' : 'disabled'}>Check</button><button class="btn" data-action="revealPg" ${done ? 'disabled' : ''}>Show answer</button></div>
    ${fb}
    ${done ? `<div class="callout"><strong>${PR.formulaHTML} belongs to ${L.groupHTML}.</strong> It has ${ORDER} ${plural(ORDER, 'operation')} in ${CLASSES.length} ${plural(CLASSES.length, 'class', 'classes')}: ${classes}. So <i>h</i> = ${ORDER}.</div>
      <p><strong>Axes for this problem.</strong> ${PR.axes} The <i>x</i>, <i>y</i> and <i>z</i> arrows in the viewer show them. The axis choice decides some labels in the character table, so use these axes from here on.</p>
      <p>The symmetry operations are now in the bar under the model, and <em>Symmetry elements</em> draws them. Check that each one really leaves ${PR.formulaHTML} looking unchanged, then go on to step 2.</p>` : ''}
    <h3>Stuck? Walk the flowchart</h3>
    <p class="muted">Each question follows the standard flowchart on the <a href="point-groups.html">Find the point group</a> page. Reveal them one at a time.</p>
    ${flow ? `<ol class="flowq">${flow}</ol>` : ''}
    ${S.pg.hints < PR.flow.length ? `<div class="btnrow"><button class="btn" data-action="hint">${S.pg.hints ? 'Next question' : 'Show the first question'}</button></div>` : `<p class="fb ok">The flowchart ends at ${L.groupHTML}.</p>`}
    ${practiceSettings()}`;
}
function practiceSettings(){
  const on = k => !PR.allowed.length || PR.allowed.includes(k);
  return `<details class="pset"><summary>Choose which point groups come up</summary>
    <p class="muted">New molecules are drawn from the groups ticked here. Each group is equally likely.</p>
    <div class="pchecks">${PR.groups.map(g => `<label><input type="checkbox" data-pgfilter value="${g.key}" ${on(g.key) ? 'checked' : ''}> ${g.html} <span class="muted">(${g.count})</span></label>`).join('')}</div>
    <div class="btnrow"><button class="btn primary" data-action="newSet">New molecule from these groups</button></div>
    <p class="hint">Share a problem by copying the page address: it names the molecule.</p></details>`;
}
function vibInputs(){
  const c = S.check6;
  const rows = IRREPS.map((ir,k) => `<tr><th>${chip(ir)}</th><td><input class="cell-in ${c ? (c[k] ? 'ok' : 'no') : ''}" id="nv-${ir.id}" inputmode="numeric" autocomplete="off" aria-label="number of ${ir.id} vibrations" value="${S.inputs['nv-'+ir.id] ?? ''}"></td></tr>`).join('');
  return `<h3>Your turn</h3>
    <p>How many times does each species appear in ${GV}? Subtract ${GT} and ${GR} from your reduced ${G3N} (step 5), or reduce the ${GV} characters directly. Leave a box empty for zero.</p>
    <div class="tablewrap"><table><thead><tr><th>Species</th><th>Times in ${GV}</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="btnrow"><button class="btn primary" data-action="check6">Check</button><button class="btn" data-action="reveal6">Show answer</button></div>
    ${c && !c.every(Boolean) ? `<p class="fb no">Not quite. Check how many vibrations you expect: 3<i>N</i> − 6 = ${NV()}, counting each degenerate species by its dimension.</p>` : ''}`;
}

function renderStepper(){
  const lk = locked();
  $('stepper').innerHTML = STEPS.map((s,i) => `<li><button data-step="${i}" ${i===S.step?'aria-current="step"':''} class="${i<S.step?'done':''}" ${lk && i > 0 ? 'disabled title="Find the point group first"' : ''}><span class="n">${i+1}</span>${s.short.replace('Γ3N', G3N)}</button></li>`).join('');
}
function renderLesson(){
  $('body').innerHTML = STEPS[S.step].html();
  $('prev').disabled = S.step === 0; $('next').disabled = S.step === STEPS.length - 1 || locked();
  $('next').style.visibility = S.step === STEPS.length - 1 ? 'hidden' : '';
}
function goStep(i, scroll){
  if (locked() && i > 0) return;
  S.step = Math.max(0, Math.min(STEPS.length-1, i));
  STEPS[S.step].enter(); syncToggles(); renderStepper(); renderLesson(); renderShowing();
  if (scroll) $('lesson').scrollIntoView({block:'start', behavior: reduced ? 'auto' : 'smooth'});
}
$('stepper').addEventListener('click', e => { const b = e.target.closest('[data-step]'); if (b) goStep(+b.dataset.step, true); });
$('prev').onclick = () => goStep(S.step - 1, true);
$('next').onclick = () => goStep(S.step + 1, true);

$('body').addEventListener('input', e => { if (e.target.id){ S.inputs[e.target.id] = e.target.value; e.target.classList.remove('ok','no'); } });
$('body').addEventListener('click', e => {
  const opB = e.target.closest('[data-op]'); if (opB){ applyOp(opB.dataset.op); return; }
  const fB = e.target.closest('[data-field]');
  if (fB){ const id = fB.dataset.field; S.motionSeen[id] = true; setArrows('field', id); renderLesson(); return; }
  const pgB = e.target.closest('[data-pg]');
  if (pgB){ if (!(S.pg.ok || S.pg.rev)){ S.pg.sel = pgB.dataset.pg; S.pg.ok = null; renderLesson(); } return; }
  const ynB = e.target.closest('[data-yn]');
  if (ynB){ const [ir, key, v] = ynB.dataset.yn.split('|'); (S.sel[ir] ||= {})[key] = v === '1'; S.chk[key] = null; S.rev[key] = false; renderLesson(); return; }
  const a = e.target.closest('[data-action]'); if (!a) return;
  const g = gamma3N(), n = reduce(g), kind = a.dataset.kind;
  switch (a.dataset.action){
    case 'check': S.chk[kind] = {}; SPECIES.forEach(sp => { S.chk[kind][sp.ir.id] = (S.sel[sp.ir.id] || {})[kind] === KIND[kind].test(sp.ir); }); break;
    case 'reveal': SPECIES.forEach(sp => (S.sel[sp.ir.id] ||= {})[kind] = KIND[kind].test(sp.ir)); S.rev[kind] = true; S.chk[kind] = null; break;
    case 'check4': S.check4 = CLASSES.map((c,k) => ({g3n:near(parseNum(S.inputs['g3n-'+c.id]), g[k], 0.011),
      um:near(parseNum(S.inputs['um-'+c.id]), unmoved(c.rep).length), ct:near(parseNum(S.inputs['ct-'+c.id]), trace(c.rep.M), 0.011)})); break;
    case 'reveal4': CLASSES.forEach((c,k) => { S.inputs['g3n-'+c.id] = fmt(g[k]).replace('−','-'); S.inputs['um-'+c.id] = String(unmoved(c.rep).length); S.inputs['ct-'+c.id] = fmt(trace(c.rep.M)).replace('−','-'); });
      S.check4 = CLASSES.map(() => ({g3n:true, um:true, ct:true})); break;
    case 'check5': S.check5 = IRREPS.map((ir,k) => parseNum(S.inputs['n-'+ir.id]) === n[k]); break;
    case 'work5': S.showWork = !S.showWork; break;
    case 'vib': S.vibRevealed = true; break;
    case 'check6': { const nv = vibIrreps(), val = id => { const s = (S.inputs['nv-'+id] || '').trim(); return s === '' ? 0 : parseNum(s); };
      S.check6 = IRREPS.map((ir,k) => val(ir.id) === nv[k]); if (S.check6.every(Boolean)) S.vibRevealed = true; break; }
    case 'reveal6': { const nv = vibIrreps(); IRREPS.forEach((ir,k) => S.inputs['nv-'+ir.id] = String(nv[k])); S.check6 = null; S.vibRevealed = true; break; }
    case 'checkCount': { const want = {'pc-n':N(), 'pc-3n':3*N(), 'pc-v':NV()}; S.cnt = {}; Object.keys(want).forEach(k => S.cnt[k] = parseNum(S.inputs[k]) === want[k]); break; }
    case 'revealCount': S.inputs['pc-n'] = String(N()); S.inputs['pc-3n'] = String(3*N()); S.inputs['pc-v'] = String(NV()); S.cnt = {'pc-n':true, 'pc-3n':true, 'pc-v':true}; break;
    case 'checkPg': S.pg.ok = S.pg.sel === PR.pg; S.pg.tries = (S.pg.tries || 0) + 1; syncLock(); break;
    case 'revealPg': S.pg.rev = true; S.pg.sel = PR.pg; S.pg.hints = PR.flow.length; syncLock(); break;
    case 'hint': S.pg.hints = Math.min(PR.flow.length, S.pg.hints + 1); break;
    case 'newSet': { const g = [...document.querySelectorAll('[data-pgfilter]:checked')].map(x => x.value); location.href = PR.nextURL(g.length === PR.groups.length ? [] : g); return; }
  }
  renderLesson();
});
$('body').addEventListener('pointermove', e => {
  if (!document.querySelector('.spec .tip')) return;
  const t = e.target.closest('[data-tip]');
  document.querySelectorAll('.tip').forEach(x => { if (!t || !x.parentElement.contains(t)) x.style.display = 'none'; });
  if (!t) return;
  const box = t.closest('.spec'), tp = box.querySelector('.tip'), bb = box.getBoundingClientRect(), r = t.getBoundingClientRect();
  tp.innerHTML = t.dataset.tip; tp.style.display = 'block';
  const x = Math.max(80, Math.min(bb.width - 80, r.left + r.width/2 - bb.left));
  tp.style.left = x + 'px'; tp.style.top = (r.top - bb.top) + 'px';
});

// optional switch between isomers that share the point group (bromochloroethene)
if (L.isomers){
  const wrap = document.querySelector('[data-isomers]');
  if (wrap){
    wrap.innerHTML = `<span class="lbl" id="iso-lbl">${L.isomers.label}</span><div class="seg" role="group" aria-labelledby="iso-lbl">${L.isomers.options.map(o => `<button data-iso="${o.id}" aria-pressed="${o.id === S.iso}">${o.html}</button>`).join('')}</div>`;
    wrap.addEventListener('click', e => {
      const b = e.target.closest('[data-iso]'); if (!b || b.dataset.iso === S.iso) return;
      S.iso = b.dataset.iso;
      wrap.querySelectorAll('[data-iso]').forEach(x => x.setAttribute('aria-pressed', x.dataset.iso === S.iso));
      Object.assign(S, {seenOps:{}, cart:{}, cartLast:null, modeTests:{}, motionSeen:{}, check4:null, check5:null, inputs:{}, sel:{}, chk:{ir:null, ra:null}, rev:{ir:false, ra:false}, vibRevealed:false, showWork:false});
      const keepField = S.arrows === 'field' && isMode(S.fieldId);
      buildModel(); resetOp();
      if (keepField || [6,7,8].includes(S.step)) setArrows('field', MODES[0]); else STEPS[S.step].enter();
      renderShowing(); renderLesson();
      if (L.isomers.onChange) L.isomers.onChange(S.iso);
    });
  }
}

window.LESSON_DEBUG = {S, OPS, CLASSES, IRREPS, FIELDS: () => FIELDS, SPECIES: () => SPECIES, MODES: () => MODES, gamma3N, reduce, vibIrreps, fieldChars, irrepOf, response, unmoved, MODEL: () => MODEL};
if (PR) syncLock();
goStep(0, false);
resize(); requestAnimationFrame(frame);
})();
