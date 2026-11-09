/* Interactive Group Theory: random practice molecules.
   Picks a molecule (from the URL ?m=<id>, or at random from the point groups allowed by ?g=C2v,C3v,…), builds its
   geometry in the standard orientation for its point group, and hands assets/lesson.js a window.LESSON in practice
   mode: the student finds the point group, then works the same nine steps as the solved lessons. */
(function(){
'use strict';
const D = Math.PI/180, s2 = Math.SQRT1_2, r3 = Math.sqrt(3);
const sq = v => `<i>${v}</i><sup>2</sup>`, it = v => `<i>${v}</i>`;
const Rh = a => `R<sub><i>${a}</i></sub>`;

/* ---------- symmetry operations ---------- */
const AXN = {'1,0,0':'x', '0,1,0':'y', '0,0,1':'z'};
const axisName = a => AXN[a.join(',')] ? `the <i>${AXN[a.join(',')]}</i> axis` : a[2] === 0 ? `the axis in the <i>xy</i> plane at ${Math.round(Math.atan2(a[1], a[0])/D)}° to <i>x</i>` : `the (${a.map(v => Math.sign(v) < 0 ? '−1' : '1').join(', ')}) diagonal`;
const planeName = n => ({'0,0,1':'<i>xy</i>', '0,1,0':'<i>xz</i>', '1,0,0':'<i>yz</i>'})[n.join(',')];
const E = () => ({id:'E', cls:'E', type:'E', html:'<i>E</i>', name:'Identity'});
const Cn = (id, cls, axis, n, k=1, prime='') => ({id, cls, type:'C', axis, n, k,
  html:`<i>C</i><sub>${n}</sub>${prime}${k > 1 ? `<sup>${k}</sup>` : ''}`, name:`Rotation by ${Math.round(360*k/n)}° about ${axisName(axis)}`});
const Sn = (id, cls, axis, n, k=1) => ({id, cls, type:'S', axis, n, k,
  html:`<i>S</i><sub>${n}</sub>${k > 1 ? `<sup>${k}</sup>` : ''}`, name:`Rotate ${Math.round(360*k/n)}° about ${axisName(axis)}, then reflect through the plane perpendicular to it`});
const sig = (id, cls, normal, html) => ({id, cls, type:'s', normal, html, name:`Reflection through ${planeName(normal) ? `the ${planeName(normal)} plane` : 'a mirror plane'}`});
const inv = () => ({id:'i', cls:'i', type:'i', html:'<i>i</i>', name:'Inversion through the centre'});
const ang = t => [Math.cos(t*D), Math.sin(t*D), 0];
const perpN = t => [-Math.sin(t*D), Math.cos(t*D), 0];   // normal of the vertical plane containing the direction at t°
const DIAG = [[1,1,1],[1,-1,-1],[-1,1,-1],[-1,-1,1]];

/* ---------- character tables ----------
   Each irrep: [id, html, chip class, characters, translations, rotations, quadratic functions]. */
const IR = (id, html, cls, chi, T='', R='', quad='') => ({id, html, cls, chi, T, R, quad});
const x2 = sq('x'), y2 = sq('y'), z2 = sq('z');
const GROUPS = {
  C1:{html:'C<sub>1</sub>', fam:'C1', n:1,
    ops:[E()], classes:[{id:'E', html:'<i>E</i>', desc:'Do nothing. It is the only symmetry operation.'}],
    irreps:[IR('A','A','a1',[1],'xyz','xyz',`${x2}, ${y2}, ${z2}, <i>xy</i>, <i>xz</i>, <i>yz</i>`)]},
  Cs:{html:'C<sub>s</sub>', fam:'Cs', n:1,
    ops:[E(), sig('sh','sh',[0,0,1],'σ<sub>h</sub>')],
    classes:[{id:'E', html:'<i>E</i>', desc:'Do nothing.'}, {id:'sh', html:'σ<sub>h</sub>', desc:'Reflect through the mirror plane (the <i>xy</i> plane).'}],
    irreps:[IR('Ap','A′','a1',[1,1],'xy','z',`${x2}, ${y2}, ${z2}, <i>xy</i>`), IR('App','A″','a2',[1,-1],'z','xy','<i>yz</i>, <i>xz</i>')]},
  C2:{html:'C<sub>2</sub>', fam:'Cn', n:2,
    ops:[E(), Cn('C2','C2',[0,0,1],2)],
    classes:[{id:'E', html:'<i>E</i>', desc:'Do nothing.'}, {id:'C2', html:'<i>C</i><sub>2</sub>', desc:'Rotate 180° about the <i>z</i> axis.'}],
    irreps:[IR('A','A','a1',[1,1],'z','z',`${x2}, ${y2}, ${z2}, <i>xy</i>`), IR('B','B','b',[1,-1],'xy','xy','<i>yz</i>, <i>xz</i>')]},
  C2v:{html:'C<sub>2v</sub>', fam:'Cnv', n:2,
    ops:[E(), Cn('C2','C2',[0,0,1],2), sig('sxz','sxz',[0,1,0],'σ<sub>v</sub>(<i>xz</i>)'), sig('syz','syz',[1,0,0],'σ<sub>v</sub>′(<i>yz</i>)')],
    classes:[{id:'E', html:'<i>E</i>', desc:'Do nothing.'}, {id:'C2', html:'<i>C</i><sub>2</sub>', desc:'Rotate 180° about the <i>z</i> axis.'},
      {id:'sxz', html:'σ<sub>v</sub>(<i>xz</i>)', desc:'Reflect through the <i>xz</i> plane.'}, {id:'syz', html:'σ<sub>v</sub>′(<i>yz</i>)', desc:'Reflect through the <i>yz</i> plane.'}],
    irreps:[IR('A1','A<sub>1</sub>','a1',[1,1,1,1],'z','',`${x2}, ${y2}, ${z2}`), IR('A2','A<sub>2</sub>','a2',[1,1,-1,-1],'','z','<i>xy</i>'),
      IR('B1','B<sub>1</sub>','b1',[1,-1,1,-1],'x','y','<i>xz</i>'), IR('B2','B<sub>2</sub>','b2',[1,-1,-1,1],'y','x','<i>yz</i>')]},
  C3v:{html:'C<sub>3v</sub>', fam:'Cnv', n:3, splitOp:'sv1', mixOp:'C3',
    ops:[E(), Cn('C3','C3',[0,0,1],3), Cn('C32','C3',[0,0,1],3,2), sig('sv1','sv',perpN(0),'σ<sub>v</sub>'), sig('sv2','sv',perpN(120),'σ<sub>v</sub>′'), sig('sv3','sv',perpN(240),'σ<sub>v</sub>″')],
    classes:[{id:'E', html:'<i>E</i>', desc:'Do nothing.'}, {id:'C3', html:'2<i>C</i><sub>3</sub>', desc:'Rotate 120° (or 240°) about the <i>z</i> axis.'},
      {id:'sv', html:'3σ<sub>v</sub>', desc:'Reflect through one of the three vertical planes that contain the <i>z</i> axis (one of them is the <i>xz</i> plane).'}],
    irreps:[IR('A1','A<sub>1</sub>','a1',[1,1,1],'z','',`${x2} + ${y2}, ${z2}`), IR('A2','A<sub>2</sub>','a2',[1,1,-1],'','z'),
      IR('E','E','e',[2,-1,0],'xy','xy',`(${x2} − ${y2}, <i>xy</i>), (<i>xz</i>, <i>yz</i>)`)]},
  C4v:{html:'C<sub>4v</sub>', fam:'Cnv', n:4, splitOp:'sv1', mixOp:'C4',
    ops:[E(), Cn('C4','C4',[0,0,1],4), Cn('C43','C4',[0,0,1],4,3), Cn('C2','C2',[0,0,1],2), sig('sv1','sv',[0,1,0],'σ<sub>v</sub>(<i>xz</i>)'), sig('sv2','sv',[1,0,0],'σ<sub>v</sub>(<i>yz</i>)'),
      sig('sd1','sd',[s2,-s2,0],'σ<sub>d</sub>'), sig('sd2','sd',[s2,s2,0],'σ<sub>d</sub>′')],
    classes:[{id:'E', html:'<i>E</i>', desc:'Do nothing.'}, {id:'C4', html:'2<i>C</i><sub>4</sub>', desc:'Rotate 90° (or 270°) about the <i>z</i> axis.'},
      {id:'C2', html:'<i>C</i><sub>2</sub>', desc:'Rotate 180° about the <i>z</i> axis.'}, {id:'sv', html:'2σ<sub>v</sub>', desc:'Reflect through the <i>xz</i> or the <i>yz</i> plane.'},
      {id:'sd', html:'2σ<sub>d</sub>', desc:'Reflect through a vertical plane halfway between <i>x</i> and <i>y</i>.'}],
    irreps:[IR('A1','A<sub>1</sub>','a1',[1,1,1,1,1],'z','',`${x2} + ${y2}, ${z2}`), IR('A2','A<sub>2</sub>','a2',[1,1,1,-1,-1],'','z'),
      IR('B1','B<sub>1</sub>','b1',[1,-1,1,1,-1],'','',`${x2} − ${y2}`), IR('B2','B<sub>2</sub>','b2',[1,-1,1,-1,1],'','','<i>xy</i>'),
      IR('E','E','e',[2,0,-2,0,0],'xy','xy','(<i>xz</i>, <i>yz</i>)')]},
  C2h:{html:'C<sub>2h</sub>', fam:'Cnh', n:2,
    ops:[E(), Cn('C2','C2',[0,0,1],2), inv(), sig('sh','sh',[0,0,1],'σ<sub>h</sub>')],
    classes:[{id:'E', html:'<i>E</i>', desc:'Do nothing.'}, {id:'C2', html:'<i>C</i><sub>2</sub>', desc:'Rotate 180° about the <i>z</i> axis.'},
      {id:'i', html:'<i>i</i>', desc:'Send every atom through the centre to the same distance on the other side.'}, {id:'sh', html:'σ<sub>h</sub>', desc:'Reflect through the <i>xy</i> plane, perpendicular to <i>C</i><sub>2</sub>.'}],
    irreps:[IR('Ag','A<sub>g</sub>','a1',[1,1,1,1],'','z',`${x2}, ${y2}, ${z2}, <i>xy</i>`), IR('Bg','B<sub>g</sub>','b1',[1,-1,1,-1],'','xy','<i>xz</i>, <i>yz</i>'),
      IR('Au','A<sub>u</sub>','a2',[1,1,-1,-1],'z'), IR('Bu','B<sub>u</sub>','b2',[1,-1,-1,1],'xy')]},
  D2h:{html:'D<sub>2h</sub>', fam:'Dnh', n:2,
    ops:[E(), Cn('C2z','C2z',[0,0,1],2), Cn('C2y','C2y',[0,1,0],2), Cn('C2x','C2x',[1,0,0],2), inv(),
      sig('sxy','sxy',[0,0,1],'σ(<i>xy</i>)'), sig('sxz','sxz',[0,1,0],'σ(<i>xz</i>)'), sig('syz','syz',[1,0,0],'σ(<i>yz</i>)')],
    classes:[{id:'E', html:'<i>E</i>', desc:'Do nothing.'}, {id:'C2z', html:'<i>C</i><sub>2</sub>(<i>z</i>)', desc:'Rotate 180° about <i>z</i>.'},
      {id:'C2y', html:'<i>C</i><sub>2</sub>(<i>y</i>)', desc:'Rotate 180° about <i>y</i>.'}, {id:'C2x', html:'<i>C</i><sub>2</sub>(<i>x</i>)', desc:'Rotate 180° about <i>x</i>.'},
      {id:'i', html:'<i>i</i>', desc:'Invert through the centre.'}, {id:'sxy', html:'σ(<i>xy</i>)', desc:'Reflect through the <i>xy</i> plane.'},
      {id:'sxz', html:'σ(<i>xz</i>)', desc:'Reflect through the <i>xz</i> plane.'}, {id:'syz', html:'σ(<i>yz</i>)', desc:'Reflect through the <i>yz</i> plane.'}],
    irreps:[IR('Ag','A<sub>g</sub>','a1',[1,1,1,1,1,1,1,1],'','',`${x2}, ${y2}, ${z2}`), IR('B1g','B<sub>1g</sub>','b1',[1,1,-1,-1,1,1,-1,-1],'','z','<i>xy</i>'),
      IR('B2g','B<sub>2g</sub>','b2',[1,-1,1,-1,1,-1,1,-1],'','y','<i>xz</i>'), IR('B3g','B<sub>3g</sub>','b',[1,-1,-1,1,1,-1,-1,1],'','x','<i>yz</i>'),
      IR('Au','A<sub>u</sub>','a2',[1,1,1,1,-1,-1,-1,-1]), IR('B1u','B<sub>1u</sub>','b1',[1,1,-1,-1,-1,-1,1,1],'z'),
      IR('B2u','B<sub>2u</sub>','b2',[1,-1,1,-1,-1,1,-1,1],'y'), IR('B3u','B<sub>3u</sub>','b',[1,-1,-1,1,-1,1,1,-1],'x')]},
  D3h:{html:'D<sub>3h</sub>', fam:'Dnh', n:3, splitOp:'C2a', mixOp:'C3',
    ops:[E(), Cn('C3','C3',[0,0,1],3), Cn('C32','C3',[0,0,1],3,2), Cn('C2a','C2',ang(0),2,1,'′'), Cn('C2b','C2',ang(120),2,1,'′'), Cn('C2c','C2',ang(240),2,1,'′'),
      sig('sh','sh',[0,0,1],'σ<sub>h</sub>'), Sn('S3','S3',[0,0,1],3), Sn('S35','S3',[0,0,1],3,5),
      sig('sv1','sv',perpN(0),'σ<sub>v</sub>'), sig('sv2','sv',perpN(120),'σ<sub>v</sub>′'), sig('sv3','sv',perpN(240),'σ<sub>v</sub>″')],
    classes:[{id:'E', html:'<i>E</i>', desc:'Do nothing.'}, {id:'C3', html:'2<i>C</i><sub>3</sub>', desc:'Rotate 120° (or 240°) about the <i>z</i> axis.'},
      {id:'C2', html:'3<i>C</i><sub>2</sub>', desc:'Rotate 180° about one of three axes in the <i>xy</i> plane (one of them is <i>x</i>).'},
      {id:'sh', html:'σ<sub>h</sub>', desc:'Reflect through the <i>xy</i> plane, perpendicular to <i>C</i><sub>3</sub>.'},
      {id:'S3', html:'2<i>S</i><sub>3</sub>', desc:'Rotate 120° (or 240°) about <i>z</i>, then reflect through the <i>xy</i> plane.'},
      {id:'sv', html:'3σ<sub>v</sub>', desc:'Reflect through a vertical plane that contains <i>z</i> and one of the <i>C</i><sub>2</sub> axes.'}],
    irreps:[IR('A1p','A<sub>1</sub>′','a1',[1,1,1,1,1,1],'','',`${x2} + ${y2}, ${z2}`), IR('A2p','A<sub>2</sub>′','a2',[1,1,-1,1,1,-1],'','z'),
      IR('Ep','E′','e',[2,-1,0,2,-1,0],'xy','',`(${x2} − ${y2}, <i>xy</i>)`), IR('A1pp','A<sub>1</sub>″','b1',[1,1,1,-1,-1,-1]),
      IR('A2pp','A<sub>2</sub>″','b2',[1,1,-1,-1,-1,1],'z'), IR('Epp','E″','t',[2,-1,0,-2,1,0],'','xy','(<i>xz</i>, <i>yz</i>)')]},
  D4h:{html:'D<sub>4h</sub>', fam:'Dnh', n:4, splitOp:'C2x', mixOp:'C4',
    ops:[E(), Cn('C4','C4',[0,0,1],4), Cn('C43','C4',[0,0,1],4,3), Cn('C2','C2',[0,0,1],2),
      Cn('C2x','C2p',[1,0,0],2,1,'′'), Cn('C2y','C2p',[0,1,0],2,1,'′'), Cn('C2d1','C2pp',[s2,s2,0],2,1,'″'), Cn('C2d2','C2pp',[s2,-s2,0],2,1,'″'),
      inv(), Sn('S4','S4',[0,0,1],4), Sn('S43','S4',[0,0,1],4,3), sig('sh','sh',[0,0,1],'σ<sub>h</sub>'),
      sig('sv1','sv',[0,1,0],'σ<sub>v</sub>(<i>xz</i>)'), sig('sv2','sv',[1,0,0],'σ<sub>v</sub>(<i>yz</i>)'), sig('sd1','sd',[s2,-s2,0],'σ<sub>d</sub>'), sig('sd2','sd',[s2,s2,0],'σ<sub>d</sub>′')],
    classes:[{id:'E', html:'<i>E</i>', desc:'Do nothing.'}, {id:'C4', html:'2<i>C</i><sub>4</sub>', desc:'Rotate 90° (or 270°) about <i>z</i>.'},
      {id:'C2', html:'<i>C</i><sub>2</sub>', desc:'Rotate 180° about <i>z</i>.'}, {id:'C2p', html:'2<i>C</i><sub>2</sub>′', desc:'Rotate 180° about the <i>x</i> or <i>y</i> axis.'},
      {id:'C2pp', html:'2<i>C</i><sub>2</sub>″', desc:'Rotate 180° about an axis in the <i>xy</i> plane halfway between <i>x</i> and <i>y</i>.'},
      {id:'i', html:'<i>i</i>', desc:'Invert through the centre.'}, {id:'S4', html:'2<i>S</i><sub>4</sub>', desc:'Rotate 90° (or 270°) about <i>z</i>, then reflect through the <i>xy</i> plane.'},
      {id:'sh', html:'σ<sub>h</sub>', desc:'Reflect through the <i>xy</i> plane.'}, {id:'sv', html:'2σ<sub>v</sub>', desc:'Reflect through the <i>xz</i> or <i>yz</i> plane.'},
      {id:'sd', html:'2σ<sub>d</sub>', desc:'Reflect through a vertical plane halfway between <i>x</i> and <i>y</i>.'}],
    irreps:[IR('A1g','A<sub>1g</sub>','a1',[1,1,1,1,1,1,1,1,1,1],'','',`${x2} + ${y2}, ${z2}`), IR('A2g','A<sub>2g</sub>','a2',[1,1,1,-1,-1,1,1,1,-1,-1],'','z'),
      IR('B1g','B<sub>1g</sub>','b1',[1,-1,1,1,-1,1,-1,1,1,-1],'','',`${x2} − ${y2}`), IR('B2g','B<sub>2g</sub>','b2',[1,-1,1,-1,1,1,-1,1,-1,1],'','','<i>xy</i>'),
      IR('Eg','E<sub>g</sub>','e',[2,0,-2,0,0,2,0,-2,0,0],'','xy','(<i>xz</i>, <i>yz</i>)'),
      IR('A1u','A<sub>1u</sub>','a1',[1,1,1,1,1,-1,-1,-1,-1,-1]), IR('A2u','A<sub>2u</sub>','a2',[1,1,1,-1,-1,-1,-1,-1,1,1],'z'),
      IR('B1u','B<sub>1u</sub>','b1',[1,-1,1,1,-1,-1,1,-1,-1,1]), IR('B2u','B<sub>2u</sub>','b2',[1,-1,1,-1,1,-1,1,-1,1,-1]),
      IR('Eu','E<sub>u</sub>','e',[2,0,-2,0,0,-2,0,2,0,0],'xy')]},
  D2d:{html:'D<sub>2d</sub>', fam:'Dnd', n:2, splitOp:'C2x', mixOp:'S4',
    ops:[E(), Sn('S4','S4',[0,0,1],4), Sn('S43','S4',[0,0,1],4,3), Cn('C2','C2',[0,0,1],2), Cn('C2x','C2p',[1,0,0],2,1,'′'), Cn('C2y','C2p',[0,1,0],2,1,'′'),
      sig('sd1','sd',[s2,-s2,0],'σ<sub>d</sub>'), sig('sd2','sd',[s2,s2,0],'σ<sub>d</sub>′')],
    classes:[{id:'E', html:'<i>E</i>', desc:'Do nothing.'}, {id:'S4', html:'2<i>S</i><sub>4</sub>', desc:'Rotate 90° (or 270°) about <i>z</i>, then reflect through the <i>xy</i> plane.'},
      {id:'C2', html:'<i>C</i><sub>2</sub>', desc:'Rotate 180° about <i>z</i>.'}, {id:'C2p', html:'2<i>C</i><sub>2</sub>′', desc:'Rotate 180° about the <i>x</i> or <i>y</i> axis.'},
      {id:'sd', html:'2σ<sub>d</sub>', desc:'Reflect through a vertical plane halfway between <i>x</i> and <i>y</i>.'}],
    irreps:[IR('A1','A<sub>1</sub>','a1',[1,1,1,1,1],'','',`${x2} + ${y2}, ${z2}`), IR('A2','A<sub>2</sub>','a2',[1,1,1,-1,-1],'','z'),
      IR('B1','B<sub>1</sub>','b1',[1,-1,1,1,-1],'','',`${x2} − ${y2}`), IR('B2','B<sub>2</sub>','b2',[1,-1,1,-1,1],'z','','<i>xy</i>'),
      IR('E','E','e',[2,0,-2,0,0],'xy','xy','(<i>xz</i>, <i>yz</i>)')]},
  D3d:{html:'D<sub>3d</sub>', fam:'Dnd', n:3, splitOp:'C2a', mixOp:'C3',
    ops:[E(), Cn('C3','C3',[0,0,1],3), Cn('C32','C3',[0,0,1],3,2), Cn('C2a','C2',ang(0),2,1,'′'), Cn('C2b','C2',ang(60),2,1,'′'), Cn('C2c','C2',ang(120),2,1,'′'),
      inv(), Sn('S6','S6',[0,0,1],6), Sn('S65','S6',[0,0,1],6,5), sig('sd1','sd',ang(0),'σ<sub>d</sub>'), sig('sd2','sd',ang(60),'σ<sub>d</sub>′'), sig('sd3','sd',ang(120),'σ<sub>d</sub>″')],
    classes:[{id:'E', html:'<i>E</i>', desc:'Do nothing.'}, {id:'C3', html:'2<i>C</i><sub>3</sub>', desc:'Rotate 120° (or 240°) about <i>z</i>.'},
      {id:'C2', html:'3<i>C</i><sub>2</sub>', desc:'Rotate 180° about one of three axes in the <i>xy</i> plane (one of them is <i>x</i>).'},
      {id:'i', html:'<i>i</i>', desc:'Invert through the centre.'}, {id:'S6', html:'2<i>S</i><sub>6</sub>', desc:'Rotate 60° (or 300°) about <i>z</i>, then reflect through the <i>xy</i> plane.'},
      {id:'sd', html:'3σ<sub>d</sub>', desc:'Reflect through a vertical plane that contains <i>z</i> and lies halfway between two <i>C</i><sub>2</sub> axes.'}],
    irreps:[IR('A1g','A<sub>1g</sub>','a1',[1,1,1,1,1,1],'','',`${x2} + ${y2}, ${z2}`), IR('A2g','A<sub>2g</sub>','a2',[1,1,-1,1,1,-1],'','z'),
      IR('Eg','E<sub>g</sub>','e',[2,-1,0,2,-1,0],'','xy',`(${x2} − ${y2}, <i>xy</i>), (<i>xz</i>, <i>yz</i>)`),
      IR('A1u','A<sub>1u</sub>','b1',[1,1,1,-1,-1,-1]), IR('A2u','A<sub>2u</sub>','b2',[1,1,-1,-1,-1,1],'z'), IR('Eu','E<sub>u</sub>','t',[2,-1,0,-2,1,0],'xy')]},
  Td:{html:'T<sub>d</sub>', fam:'Td', n:3, splitOp:'sd1', mixOp:'C3a', splitOp3:'C2z', mixOp3:'C3a',
    ops:[E(), ...DIAG.flatMap((a,k) => [Cn('C3'+'abcd'[k],'C3',a,3), Cn('C3'+'abcd'[k]+'2','C3',a,3,2)]),
      Cn('C2x','C2',[1,0,0],2), Cn('C2y','C2',[0,1,0],2), Cn('C2z','C2',[0,0,1],2),
      ...[[1,0,0],[0,1,0],[0,0,1]].flatMap((a,k) => [Sn('S4'+'xyz'[k],'S4',a,4), Sn('S4'+'xyz'[k]+'3','S4',a,4,3)]),
      ...[[s2,-s2,0],[s2,s2,0],[s2,0,-s2],[s2,0,s2],[0,s2,-s2],[0,s2,s2]].map((n,k) => sig('sd'+(k+1),'sd',n,'σ<sub>d</sub>'))],
    classes:[{id:'E', html:'<i>E</i>', desc:'Do nothing.'}, {id:'C3', html:'8<i>C</i><sub>3</sub>', desc:'Rotate 120° (or 240°) about one of the four body diagonals, each through one corner of the tetrahedron.'},
      {id:'C2', html:'3<i>C</i><sub>2</sub>', desc:'Rotate 180° about the <i>x</i>, <i>y</i> or <i>z</i> axis.'},
      {id:'S4', html:'6<i>S</i><sub>4</sub>', desc:'Rotate 90° (or 270°) about <i>x</i>, <i>y</i> or <i>z</i>, then reflect through the plane perpendicular to that axis.'},
      {id:'sd', html:'6σ<sub>d</sub>', desc:'Reflect through one of the six planes that each contain two of the four corners.'}],
    irreps:[IR('A1','A<sub>1</sub>','a1',[1,1,1,1,1],'','',`${x2} + ${y2} + ${z2}`), IR('A2','A<sub>2</sub>','a2',[1,1,1,-1,-1]),
      IR('E','E','e',[2,-1,2,0,0],'','',`(2${z2} − ${x2} − ${y2}, ${x2} − ${y2})`),
      IR('T1','T<sub>1</sub>','b1',[3,0,-1,1,-1],'','xyz'), IR('T2','T<sub>2</sub>','t',[3,0,-1,-1,1],'xyz','','(<i>xy</i>, <i>xz</i>, <i>yz</i>)')]},
  Oh:{html:'O<sub>h</sub>', fam:'Oh', n:4, splitOp:'sd1', mixOp:'C3a', splitOp3:'C2z', mixOp3:'C3a',
    ops:[E(), ...DIAG.flatMap((a,k) => [Cn('C3'+'abcd'[k],'C3',a,3), Cn('C3'+'abcd'[k]+'2','C3',a,3,2)]),
      ...[[s2,s2,0],[s2,-s2,0],[s2,0,s2],[s2,0,-s2],[0,s2,s2],[0,s2,-s2]].map((a,k) => Cn('C2d'+(k+1),'C2',a,2,1,'′')),
      ...[[1,0,0],[0,1,0],[0,0,1]].flatMap((a,k) => [Cn('C4'+'xyz'[k],'C4',a,4), Cn('C4'+'xyz'[k]+'3','C4',a,4,3)]),
      Cn('C2x','C2b',[1,0,0],2), Cn('C2y','C2b',[0,1,0],2), Cn('C2z','C2b',[0,0,1],2), inv(),
      ...[[1,0,0],[0,1,0],[0,0,1]].flatMap((a,k) => [Sn('S4'+'xyz'[k],'S4',a,4), Sn('S4'+'xyz'[k]+'3','S4',a,4,3)]),
      ...DIAG.flatMap((a,k) => [Sn('S6'+'abcd'[k],'S6',a,6), Sn('S6'+'abcd'[k]+'5','S6',a,6,5)]),
      sig('shx','sh',[1,0,0],'σ<sub>h</sub>'), sig('shy','sh',[0,1,0],'σ<sub>h</sub>'), sig('shz','sh',[0,0,1],'σ<sub>h</sub>'),
      ...[[s2,-s2,0],[s2,s2,0],[s2,0,-s2],[s2,0,s2],[0,s2,-s2],[0,s2,s2]].map((n,k) => sig('sd'+(k+1),'sd',n,'σ<sub>d</sub>'))],
    classes:[{id:'E', html:'<i>E</i>', desc:'Do nothing.'}, {id:'C3', html:'8<i>C</i><sub>3</sub>', desc:'Rotate 120° (or 240°) about a body diagonal, through the centres of two opposite faces of the octahedron.'},
      {id:'C2', html:'6<i>C</i><sub>2</sub>', desc:'Rotate 180° about an axis halfway between two of <i>x</i>, <i>y</i>, <i>z</i>.'},
      {id:'C4', html:'6<i>C</i><sub>4</sub>', desc:'Rotate 90° (or 270°) about <i>x</i>, <i>y</i> or <i>z</i>.'},
      {id:'C2b', html:'3<i>C</i><sub>2</sub> (= <i>C</i><sub>4</sub><sup>2</sup>)', desc:'Rotate 180° about <i>x</i>, <i>y</i> or <i>z</i>.'},
      {id:'i', html:'<i>i</i>', desc:'Invert through the centre.'},
      {id:'S4', html:'6<i>S</i><sub>4</sub>', desc:'Rotate 90° (or 270°) about <i>x</i>, <i>y</i> or <i>z</i>, then reflect through the plane perpendicular to it.'},
      {id:'S6', html:'8<i>S</i><sub>6</sub>', desc:'Rotate 60° (or 300°) about a body diagonal, then reflect through the plane perpendicular to it.'},
      {id:'sh', html:'3σ<sub>h</sub>', desc:'Reflect through the <i>xy</i>, <i>xz</i> or <i>yz</i> plane.'},
      {id:'sd', html:'6σ<sub>d</sub>', desc:'Reflect through a plane that contains one axis and lies halfway between the other two.'}],
    irreps:[IR('A1g','A<sub>1g</sub>','a1',[1,1,1,1,1,1,1,1,1,1],'','',`${x2} + ${y2} + ${z2}`), IR('A2g','A<sub>2g</sub>','a2',[1,1,-1,-1,1,1,-1,1,1,-1]),
      IR('Eg','E<sub>g</sub>','e',[2,-1,0,0,2,2,0,-1,2,0],'','',`(2${z2} − ${x2} − ${y2}, ${x2} − ${y2})`),
      IR('T1g','T<sub>1g</sub>','b1',[3,0,-1,1,-1,3,1,0,-1,-1],'','xyz'), IR('T2g','T<sub>2g</sub>','t',[3,0,1,-1,-1,3,-1,0,-1,1],'','','(<i>xz</i>, <i>yz</i>, <i>xy</i>)'),
      IR('A1u','A<sub>1u</sub>','a1',[1,1,1,1,1,-1,-1,-1,-1,-1]), IR('A2u','A<sub>2u</sub>','a2',[1,1,-1,-1,1,-1,1,-1,-1,1]),
      IR('Eu','E<sub>u</sub>','e',[2,-1,0,0,2,-2,0,1,-2,0]), IR('T1u','T<sub>1u</sub>','b2',[3,0,-1,1,-1,-3,-1,0,1,1],'xyz'),
      IR('T2u','T<sub>2u</sub>','t',[3,0,1,-1,-1,-3,1,0,1,-1])]},
};
/* ---------- elements ---------- */
const COV = {H:.32, B:.84, C:.76, N:.71, O:.66, F:.57, Si:1.11, P:1.07, S:1.05, Cl:1.02, Ge:1.2, As:1.19, Se:1.2, Br:1.2, Sb:1.39, Te:1.38, I:1.39, Xe:1.4,
  Cu:1.32, Ni:1.24, Pd:1.39, Pt:1.36, Au:1.36, Os:1.44, Mo:1.54, W:1.62, U:1.96, Mn:1.39, Ti:1.6, Al:1.21};
const EN = {H:2.2, B:2.04, C:2.55, N:3.04, O:3.44, F:3.98, Si:1.9, P:2.19, S:2.58, Cl:3.16, Ge:2.01, As:2.18, Se:2.55, Br:2.96, Sb:2.05, Te:2.1, I:2.66, Xe:2.6,
  Cu:1.9, Ni:1.91, Pd:2.2, Pt:2.28, Au:2.54, Os:2.2, Mo:2.16, W:2.36, U:1.38, Mn:1.55, Ti:1.54, Al:1.61};
const bondLen = (a, b) => COV[a] + COV[b] - 0.08*Math.abs(EN[a] - EN[b]);

/* ---------- geometry helpers ---------- */
const add = (a,b) => a.map((v,i) => v + b[i]), scl = (a,k) => a.map(v => v*k), nrm = a => scl(a, 1/Math.hypot(...a));
const polar = (r, th, ph) => [r*Math.sin(th*D)*Math.cos(ph*D), r*Math.sin(th*D)*Math.sin(ph*D), r*Math.cos(th*D)];
// a molecule under construction: atoms [{el, pos}], bonds [{i, j, order}]
function mol(){
  const m = {atoms:[], bonds:[]};
  m.at = (el, pos) => (m.atoms.push({el, pos}), m.atoms.length - 1);
  m.bd = (i, j, order=1) => (m.bonds.push({i, j, order}), m);
  m.lig = (c, el, dir, r, order=1) => { const j = m.at(el, add(m.atoms[c].pos, scl(nrm(dir), r ?? bondLen(m.atoms[c].el, el)))); m.bd(c, j, order); return j; };
  return m;
}
// tetrahedral half-angle from a bond angle in a pyramid: polar angle β with cos α = cos²β − ½ sin²β
const pyrBeta = a => Math.asin(Math.sqrt(2/3*(1 - Math.cos(a*D))))/D;

/* ---------- molecule templates ----------
   Each builder returns a mol() in the standard orientation of its point group. p holds the compound's elements
   (A central, B, C, …) and optional bond lengths rB, rC (Å), angles (°) and bond orders oB, oC. */
const T = {
  bentAB2:{pg:'C2v', axes:'The molecule lies in the <i>xz</i> plane, and the <i>C</i><sub>2</sub> axis (<i>z</i>) bisects the {B}–{A}–{B} angle.', build(p){
    const m = mol(), a = m.at(p.A, [0,0,0]);
    [1,-1].forEach(s => m.lig(a, p.B, [s*Math.sin(p.ang/2*D), 0, -Math.cos(p.ang/2*D)], p.rB, p.oB));
    return m; }},
  bentABC:{pg:'Cs', axes:'The molecule is planar and lies in the <i>xy</i> plane, which is its only mirror plane.', build(p){
    const m = mol(), a = m.at(p.A, [0,0,0]);
    m.lig(a, p.B, [1,0,0], p.rB, p.oB); m.lig(a, p.C, [Math.cos(p.ang*D), Math.sin(p.ang*D), 0], p.rC, p.oC);
    return m; }},
  tetAB2C2:{pg:'C2v', axes:'<i>z</i> is the <i>C</i><sub>2</sub> axis. The two {B} atoms lie in the <i>xz</i> plane and the two {C} atoms in the <i>yz</i> plane.', build(p){
    const m = mol(), a = m.at(p.A, [0,0,0]);
    [1,-1].forEach(s => m.lig(a, p.B, [s*Math.sin(p.angB/2*D), 0, Math.cos(p.angB/2*D)], p.rB));
    [1,-1].forEach(s => m.lig(a, p.C, [0, s*Math.sin(p.angC/2*D), -Math.cos(p.angC/2*D)], p.rC));
    return m; }},
  planarAB2C:{pg:'C2v', axes:'The molecule is planar and lies in the <i>xz</i> plane. The <i>C</i><sub>2</sub> axis (<i>z</i>) runs along the {A}–{C} bond.', build(p){
    const m = mol(), a = m.at(p.A, [0,0,0]);
    m.lig(a, p.C, [0,0,1], p.rC, p.oC);
    [1,-1].forEach(s => m.lig(a, p.B, [s*Math.sin(p.ang/2*D), 0, -Math.cos(p.ang/2*D)], p.rB, p.oB));
    return m; }},
  tshape:{pg:'C2v', axes:'The molecule is planar (T-shaped) and lies in the <i>xz</i> plane. The <i>C</i><sub>2</sub> axis (<i>z</i>) runs along the short equatorial bond.', build(p){
    const m = mol(), a = m.at(p.A, [0,0,0]);
    m.lig(a, p.B, [0,0,1], p.rEq);
    [1,-1].forEach(s => m.lig(a, p.B, [s*Math.sin(p.ang*D), 0, Math.cos(p.ang*D)], p.rAx));
    return m; }},
  seesaw:{pg:'C2v', axes:'<i>z</i> is the <i>C</i><sub>2</sub> axis, pointing toward the lone pair. The equatorial atoms lie in the <i>xz</i> plane and the axial atoms in the <i>yz</i> plane.', build(p){
    const m = mol(), a = m.at(p.A, [0,0,0]);
    [1,-1].forEach(s => m.lig(a, p.B, [s*Math.sin(p.angEq/2*D), 0, -Math.cos(p.angEq/2*D)], p.rEq));
    [1,-1].forEach(s => m.lig(a, p.B, [0, s*Math.sin(p.angAx/2*D), -Math.cos(p.angAx/2*D)], p.rAx));
    return m; }},
  pyrAB3:{pg:'C3v', axes:'<i>z</i> is the <i>C</i><sub>3</sub> axis, pointing toward the lone pair. One {B} atom lies in the <i>xz</i> plane, which is one of the σ<sub>v</sub> planes.', build(p){
    const m = mol(), a = m.at(p.A, [0,0,0]), b = pyrBeta(p.ang);
    [0,120,240].forEach(ph => m.lig(a, p.B, polar(1, 180 - b, ph), p.rB, p.oB));
    return m; }},
  tetAB3C:{pg:'C3v', axes:'<i>z</i> is the <i>C</i><sub>3</sub> axis, along the {A}–{C} bond. One {B} atom lies in the <i>xz</i> plane, which is one of the σ<sub>v</sub> planes.', build(p){
    const m = mol(), a = m.at(p.A, [0,0,0]);
    m.lig(a, p.C, [0,0,1], p.rC, p.oC);
    [0,120,240].forEach(ph => m.lig(a, p.B, polar(1, p.ang, ph), p.rB));
    return m; }},
  tetAB2CD:{pg:'Cs', axes:'The mirror plane is the <i>xy</i> plane. It contains the {A}, {C} and {D} atoms; the two {B} atoms sit above and below it.', build(p){
    const m = mol(), a = m.at(p.A, [0,0,0]), q = s2;
    m.lig(a, p.C, [q,1,0], p.rC); m.lig(a, p.D, [q,-1,0], p.rD);
    [1,-1].forEach(s => m.lig(a, p.B, [-q,0,s], p.rB));
    return m; }},
  tetABCDE:{pg:'C1', axes:'Any axes will do: there is no symmetry element to line them up with.', build(p){
    const m = mol(), a = m.at(p.A, [0,0,0]);
    [p.B, p.C, p.D, p.E].forEach((el,k) => m.lig(a, el, DIAG[k]));
    return m; }},
  pyrAB2C:{pg:'Cs', axes:'The mirror plane is the <i>xy</i> plane. It contains the {A} and {C} atoms; the two {B} atoms sit above and below it.', build(p){
    const m = mol(), a = m.at(p.A, [0,0,0]);
    const w = Math.sin(p.angBB/2*D), q = Math.cos(p.angBC*D), pp = Math.sqrt(Math.cos(p.angBB/2*D)**2 - q*q);
    m.lig(a, p.C, [0,1,0], p.rC, p.oC);
    [1,-1].forEach(s => m.lig(a, p.B, [-pp, q, s*w], p.rB));
    return m; }},
  hooh:{pg:'C2', axes:'The <i>C</i><sub>2</sub> axis (<i>z</i>) passes through the midpoint of the central bond, at right angles to it. The central bond lies along <i>x</i>.', build(p){
    const m = mol(), g = (180 - p.ang)*D, ph = (p.dih + 180)/2*D, h = p.rAA/2;
    const a1 = m.at(p.A, [h,0,0]), a2 = m.at(p.A, [-h,0,0]); m.bd(a1, a2);
    const d = [Math.cos(g), Math.sin(g)*Math.cos(ph), Math.sin(g)*Math.sin(ph)];
    m.lig(a1, p.B, d, p.rB); m.lig(a2, p.B, [-d[0], -d[1], d[2]], p.rB);
    return m; }},
  // X2A=AX2, planar, A=A along z, molecule in the yz plane
  ethylene:{pg:'D2h', axes:'The molecule is planar and lies in the <i>yz</i> plane, with <i>z</i> along the central bond and <i>x</i> perpendicular to the plane.', build(p){
    const m = mol(), h = p.rAA/2, a1 = m.at(p.A, [0,0,h]), a2 = m.at(p.A, [0,0,-h]); m.bd(a1, a2, p.oAA);
    [[a1,1],[a2,-1]].forEach(([a,z]) => [1,-1].forEach(s => m.lig(a, p.B, [0, s*Math.sin(p.ang/2*D), z*Math.cos(p.ang/2*D)], p.rB, p.oB)));
    return m; }},
  diborane:{pg:'D2h', axes:'<i>z</i> runs along B···B. The terminal H atoms lie in the <i>yz</i> plane and the bridging H atoms on the <i>x</i> axis.', build(p){
    const m = mol(), b1 = m.at('B', [0,0,.885]), b2 = m.at('B', [0,0,-.885]);
    [[b1,1],[b2,-1]].forEach(([b,z]) => [1,-1].forEach(s => m.lig(b, 'H', [0, s*Math.sin(60.85*D), z*Math.cos(60.85*D)], 1.19)));
    [1,-1].forEach(s => { const hb = m.at('H', [s*.993,0,0]); m.bd(b1, hb, .5); m.bd(b2, hb, .5); });
    return m; }},
  // XHA=AHX, cis, planar in xz with C2 along z
  cisXAAX:{pg:'C2v', axes:'The molecule is planar and lies in the <i>xz</i> plane. The <i>C</i><sub>2</sub> axis (<i>z</i>) bisects the central bond.', build(p){
    const m = mol(), h = p.rAA/2, a1 = m.at(p.A, [h,0,0]), a2 = m.at(p.A, [-h,0,0]); m.bd(a1, a2, 2);
    [[a1,1],[a2,-1]].forEach(([a,s]) => {
      m.lig(a, p.X, [-s*Math.cos(p.angX*D), 0, Math.sin(p.angX*D)], p.rX);
      if (p.H) m.lig(a, 'H', [-s*Math.cos(p.angH*D), 0, -Math.sin(p.angH*D)], p.rH);
    });
    return m; }},
  transXAAX:{pg:'C2h', axes:'The molecule is planar and lies in the <i>xy</i> plane (σ<sub>h</sub>). The <i>C</i><sub>2</sub> axis (<i>z</i>) stands perpendicular to it through the middle of the central bond.', build(p){
    const m = mol(), h = p.rAA/2, a1 = m.at(p.A, [h,0,0]), a2 = m.at(p.A, [-h,0,0]); m.bd(a1, a2, 2);
    [[a1,1],[a2,-1]].forEach(([a,s]) => {
      m.lig(a, p.X, [-s*Math.cos(p.angX*D), s*Math.sin(p.angX*D), 0], p.rX);
      if (p.H) m.lig(a, 'H', [-s*Math.cos(p.angH*D), -s*Math.sin(p.angH*D), 0], p.rH);
    });
    return m; }},
  // H2C=CX2, planar in xz, C=C along z
  vinylidene:{pg:'C2v', axes:'The molecule is planar and lies in the <i>xz</i> plane. The <i>C</i><sub>2</sub> axis (<i>z</i>) runs along the C=C bond.', build(p){
    const m = mol(), c1 = m.at('C', [0,0,0]), c2 = m.at('C', [0,0,-p.rCC]); m.bd(c1, c2, 2);
    [1,-1].forEach(s => m.lig(c1, p.X, [s*Math.sin(p.angX/2*D), 0, Math.cos(p.angX/2*D)], p.rX));
    [1,-1].forEach(s => m.lig(c2, 'H', [s*Math.sin(p.angH/2*D), 0, -Math.cos(p.angH/2*D)], 1.08));
    return m; }},
  vinyl:{pg:'Cs', axes:'The molecule is planar and lies in the <i>xy</i> plane, which is its only mirror plane.', build(p){
    const m = mol(), c1 = m.at('C', [0,0,0]), c2 = m.at('C', [1.33,0,0]); m.bd(c1, c2, 2);
    [1,-1].forEach(s => m.lig(c1, 'H', [Math.cos(121*D), s*Math.sin(121*D), 0], 1.08));
    m.lig(c2, p.X, [-Math.cos(p.angX*D), Math.sin(p.angX*D), 0], p.rX);
    m.lig(c2, 'H', [-Math.cos(124*D), -Math.sin(124*D), 0], 1.08);
    return m; }},
  trigAB3:{pg:'D3h', axes:'The molecule is planar and lies in the <i>xy</i> plane. <i>z</i> is the <i>C</i><sub>3</sub> axis, and one {B} atom lies on the <i>x</i> axis (a <i>C</i><sub>2</sub> axis).', build(p){
    const m = mol(), a = m.at(p.A, [0,0,0]);
    [0,120,240].forEach(t => m.lig(a, p.B, ang(t), p.rB, p.oB));
    return m; }},
  tbpAB5:{pg:'D3h', axes:'<i>z</i> is the <i>C</i><sub>3</sub> axis through the two axial atoms. The equatorial atoms lie in the <i>xy</i> plane, one of them on the <i>x</i> axis.', build(p){
    const m = mol(), a = m.at(p.A, [0,0,0]);
    [0,120,240].forEach(t => m.lig(a, p.B, ang(t), p.rEq));
    [1,-1].forEach(s => m.lig(a, p.B, [0,0,s], p.rAx));
    return m; }},
  cyclopropane:{pg:'D3h', axes:'<i>z</i> is the <i>C</i><sub>3</sub> axis, perpendicular to the ring. The carbon ring lies in the <i>xy</i> plane with one carbon on the <i>x</i> axis.', build(){
    const m = mol(), R = 1.51/r3, c = [0,120,240].map(t => m.at('C', scl(ang(t), R)));
    c.forEach((a,k) => m.bd(a, c[(k+1)%3]));
    c.forEach((a,k) => [1,-1].forEach(s => m.lig(a, 'H', [Math.cos(k*120*D)*Math.cos(57.5*D), Math.sin(k*120*D)*Math.cos(57.5*D), s*Math.sin(57.5*D)], 1.08)));
    return m; }},
  sqAB4:{pg:'D4h', axes:'The ion is planar and lies in the <i>xy</i> plane, with the {B} atoms on the <i>x</i> and <i>y</i> axes. <i>z</i> is the <i>C</i><sub>4</sub> axis.', build(p){
    const m = mol(), a = m.at(p.A, [0,0,0]);
    [[1,0,0],[0,1,0],[-1,0,0],[0,-1,0]].forEach(d => m.lig(a, p.B, d, p.rB));
    return m; }},
  transAB4C2:{pg:'D4h', axes:'<i>z</i> is the <i>C</i><sub>4</sub> axis, through the two {C} atoms. The four {B} atoms lie on the <i>x</i> and <i>y</i> axes.', build(p){
    const m = mol(), a = m.at(p.A, [0,0,0]);
    [[1,0,0],[0,1,0],[-1,0,0],[0,-1,0]].forEach(d => m.lig(a, p.B, d, p.rB));
    [1,-1].forEach(s => m.lig(a, p.C, [0,0,s], p.rC));
    return m; }},
  cisAB4C2:{pg:'C2v', axes:'<i>z</i> is the <i>C</i><sub>2</sub> axis, bisecting the {C}–{A}–{C} angle. The two {C} atoms lie in the <i>yz</i> plane; two {B} atoms lie on the <i>x</i> axis.', build(p){
    const m = mol(), a = m.at(p.A, [0,0,0]);
    [1,-1].forEach(s => m.lig(a, p.C, [0, s, 1], p.rC));
    [[1,0,0],[-1,0,0],[0,1,-1],[0,-1,-1]].forEach(d => m.lig(a, p.B, d, p.rB));
    return m; }},
  facAB3C3:{pg:'C3v', axes:'<i>z</i> is the <i>C</i><sub>3</sub> axis, through the centres of the {B}<sub>3</sub> face and the {C}<sub>3</sub> face. One {B} atom lies in the <i>xz</i> plane (a σ<sub>v</sub> plane).', build(p){
    const m = mol(), a = m.at(p.A, [0,0,0]), th = Math.acos(1/r3)/D;
    [0,120,240].forEach(t => m.lig(a, p.B, polar(1, th, t), p.rB));
    [60,180,300].forEach(t => m.lig(a, p.C, polar(1, 180 - th, t), p.rC));
    return m; }},
  merAB3C3:{pg:'C2v', axes:'<i>z</i> is the <i>C</i><sub>2</sub> axis, along the {B}–{A}–{C} bonds that are <i>trans</i> to each other. The other two {B} atoms lie on <i>x</i> and the other two {C} atoms on <i>y</i>.', build(p){
    const m = mol(), a = m.at(p.A, [0,0,0]);
    [[1,0,0],[-1,0,0],[0,0,1]].forEach(d => m.lig(a, p.B, d, p.rB));
    [[0,1,0],[0,-1,0],[0,0,-1]].forEach(d => m.lig(a, p.C, d, p.rC));
    return m; }},
  sqpyAB4C:{pg:'C4v', axes:'<i>z</i> is the <i>C</i><sub>4</sub> axis, through the apical atom. The four basal atoms lie in the <i>xz</i> and <i>yz</i> planes (the σ<sub>v</sub> planes).', build(p){
    const m = mol(), a = m.at(p.A, [0,0,0]);
    m.lig(a, p.C, [0,0,1], p.rC, p.oC);
    [0,90,180,270].forEach(t => m.lig(a, p.B, polar(1, p.ang, t), p.rB));
    return m; }},
  octAB5C:{pg:'C4v', axes:'<i>z</i> is the <i>C</i><sub>4</sub> axis, through the {C} atom and the {B} atom <i>trans</i> to it. The other four {B} atoms lie on the <i>x</i> and <i>y</i> axes.', build(p){
    const m = mol(), a = m.at(p.A, [0,0,0]);
    m.lig(a, p.C, [0,0,1], p.rC);
    [[1,0,0],[0,1,0],[-1,0,0],[0,-1,0],[0,0,-1]].forEach(d => m.lig(a, p.B, d, p.rB));
    return m; }},
  ethane:{pg:'D3d', axes:'<i>z</i> is the <i>C</i><sub>3</sub> axis, along the central bond. <i>x</i> is one of the three <i>C</i><sub>2</sub> axes; the <i>yz</i> plane is one of the σ<sub>d</sub> planes.', build(p){
    const m = mol(), h = p.rAA/2, a1 = m.at(p.A, [0,0,h]), a2 = m.at(p.A, [0,0,-h]); m.bd(a1, a2);
    [90,210,330].forEach(t => m.lig(a1, p.B, polar(1, 180 - p.ang, t), p.rB));
    [270,30,150].forEach(t => m.lig(a2, p.B, polar(1, p.ang, t), p.rB));
    return m; }},
  allene:{pg:'D2d', axes:'<i>z</i> runs along C=C=C (the <i>S</i><sub>4</sub> axis). <i>x</i> and <i>y</i> are the two <i>C</i><sub>2</sub>′ axes, each at 45° to the planes of the end groups.', build(p){
    const m = mol(), c = [1,0,-1].map(z => m.at('C', [0,0,z*1.308])); m.bd(c[0], c[1], 2); m.bd(c[1], c[2], 2);
    const sn = Math.sin(p.ang/2*D)*s2, cs = Math.cos(p.ang/2*D);
    [[1,1],[-1,-1]].forEach(([u,v]) => m.lig(c[0], p.X, [u*sn, v*sn, cs], p.rX));
    [[1,-1],[-1,1]].forEach(([u,v]) => m.lig(c[2], p.X, [u*sn, v*sn, -cs], p.rX));
    return m; }},
  flatTet:{pg:'D2d', axes:'<i>z</i> is the <i>S</i><sub>4</sub> axis, along which the tetrahedron is flattened. <i>x</i> and <i>y</i> are the two <i>C</i><sub>2</sub>′ axes; the σ<sub>d</sub> planes each contain two {B} atoms.', build(p){
    const m = mol(), a = m.at(p.A, [0,0,0]), al = p.trans/2;
    [[45,1],[225,1],[-45,-1],[135,-1]].forEach(([t,z]) => m.lig(a, p.B, polar(1, z > 0 ? al : 180 - al, t), p.rB));
    return m; }},
  tetAB4:{pg:'Td', axes:'The <i>x</i>, <i>y</i> and <i>z</i> axes are the three <i>C</i><sub>2</sub> (and <i>S</i><sub>4</sub>) axes. Each bond lies along a body diagonal, a <i>C</i><sub>3</sub> axis.', build(p){
    const m = mol(), a = m.at(p.A, [0,0,0]);
    DIAG.forEach(d => m.lig(a, p.B, d, p.rB, p.oB));
    return m; }},
  p4:{pg:'Td', axes:'The <i>x</i>, <i>y</i> and <i>z</i> axes are the three <i>C</i><sub>2</sub> (and <i>S</i><sub>4</sub>) axes. Each atom lies on a body diagonal, a <i>C</i><sub>3</sub> axis.', build(p){
    const m = mol(), R = p.r*Math.sqrt(3/8), at = DIAG.map(d => m.at(p.A, scl(nrm(d), R)));
    at.forEach((a,i) => at.forEach((b,j) => { if (j > i) m.bd(a, b); }));
    return m; }},
  octAB6:{pg:'Oh', axes:'The six {B} atoms lie on the <i>x</i>, <i>y</i> and <i>z</i> axes, which are the <i>C</i><sub>4</sub> axes.', build(p){
    const m = mol(), a = m.at(p.A, [0,0,0]);
    [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]].forEach(d => m.lig(a, p.B, d, p.rB));
    return m; }},
};

/* ---------- compounds ----------
   [id, template, formula, name, params]. Formula: _n subscripts, ^{…} superscripts. */
const MOLS = [
  // C1
  ['chfclbr','tetABCDE','CHFClBr','bromochlorofluoromethane',{A:'C',B:'H',C:'F',D:'Cl',E:'Br'}],
  ['chfcli','tetABCDE','CHFClI','chlorofluoroiodomethane',{A:'C',B:'H',C:'F',D:'Cl',E:'I'}],
  // Cs
  ['hocl','bentABC','HOCl','hypochlorous acid',{A:'O',B:'H',C:'Cl',rB:.97,rC:1.69,ang:102.5}],
  ['hobr','bentABC','HOBr','hypobromous acid',{A:'O',B:'H',C:'Br',rB:.96,rC:1.83,ang:102.3}],
  ['nocl','bentABC','NOCl','nitrosyl chloride',{A:'N',B:'O',C:'Cl',rB:1.14,oB:2,rC:1.98,ang:113.3}],
  ['nof','bentABC','NOF','nitrosyl fluoride',{A:'N',B:'O',C:'F',rB:1.13,oB:2,rC:1.52,ang:110.1}],
  ['socl2','pyrAB2C','SOCl_2','thionyl chloride',{A:'S',B:'Cl',C:'O',rB:2.076,rC:1.443,oC:2,angBB:96.2,angBC:106.3}],
  ['sof2','pyrAB2C','SOF_2','thionyl fluoride',{A:'S',B:'F',C:'O',rB:1.585,rC:1.413,oC:2,angBB:92.8,angBC:106.8}],
  ['seocl2','pyrAB2C','SeOCl_2','selenium oxychloride',{A:'Se',B:'Cl',C:'O',rB:2.2,rC:1.61,oC:2,angBB:96.4,angBC:106.2}],
  ['nh2cl','pyrAB2C','NH_2Cl','chloramine',{A:'N',B:'H',C:'Cl',rB:1.017,rC:1.748,angBB:107,angBC:103.7}],
  ['ch2fcl','tetAB2CD','CH_2FCl','chlorofluoromethane',{A:'C',B:'H',C:'F',D:'Cl'}],
  ['ch2clbr','tetAB2CD','CH_2ClBr','bromochloromethane',{A:'C',B:'H',C:'Cl',D:'Br'}],
  ['chf2cl','tetAB2CD','CHF_2Cl','chlorodifluoromethane',{A:'C',B:'F',C:'H',D:'Cl'}],
  ['chcl2f','tetAB2CD','CHCl_2F','dichlorofluoromethane',{A:'C',B:'Cl',C:'H',D:'F'}],
  ['c2h3f','vinyl','H_2C=CHF','fluoroethene (vinyl fluoride)',{X:'F',rX:1.348,angX:121}],
  ['c2h3cl','vinyl','H_2C=CHCl','chloroethene (vinyl chloride)',{X:'Cl',rX:1.726,angX:122.4}],
  // C2
  ['h2o2','hooh','H_2O_2','hydrogen peroxide',{A:'O',B:'H',rAA:1.475,rB:.95,ang:94.8,dih:111.5}],
  ['h2s2','hooh','H_2S_2','disulfane',{A:'S',B:'H',rAA:2.055,rB:1.327,ang:97.9,dih:90.6}],
  ['s2cl2','hooh','S_2Cl_2','disulfur dichloride',{A:'S',B:'Cl',rAA:1.95,rB:2.06,ang:108,dih:84.8}],
  // C2v
  ['h2o','bentAB2','H_2O','water',{A:'O',B:'H',rB:.958,ang:104.5}],
  ['h2s','bentAB2','H_2S','hydrogen sulfide',{A:'S',B:'H',rB:1.336,ang:92.1}],
  ['h2se','bentAB2','H_2Se','hydrogen selenide',{A:'Se',B:'H',rB:1.46,ang:91}],
  ['of2','bentAB2','OF_2','oxygen difluoride',{A:'O',B:'F',rB:1.405,ang:103.1}],
  ['scl2','bentAB2','SCl_2','sulfur dichloride',{A:'S',B:'Cl',rB:2.015,ang:102.7}],
  ['so2','bentAB2','SO_2','sulfur dioxide',{A:'S',B:'O',rB:1.431,oB:2,ang:119.3}],
  ['o3','bentAB2','O_3','ozone',{A:'O',B:'O',rB:1.278,oB:1.5,ang:116.8}],
  ['no2','bentAB2','NO_2','nitrogen dioxide',{A:'N',B:'O',rB:1.197,oB:1.5,ang:134.1}],
  ['no2m','bentAB2','NO_2^{−}','the nitrite ion',{A:'N',B:'O',rB:1.24,oB:1.5,ang:115.4}],
  ['clo2','bentAB2','ClO_2','chlorine dioxide',{A:'Cl',B:'O',rB:1.47,oB:1.5,ang:117.4}],
  ['ch2f2','tetAB2C2','CH_2F_2','difluoromethane',{A:'C',B:'H',C:'F',rB:1.09,angB:113.7,rC:1.36,angC:108.3}],
  ['ch2cl2','tetAB2C2','CH_2Cl_2','dichloromethane',{A:'C',B:'H',C:'Cl',rB:1.087,angB:112,rC:1.772,angC:111.8}],
  ['ch2br2','tetAB2C2','CH_2Br_2','dibromomethane',{A:'C',B:'H',C:'Br',rB:1.09,angB:110,rC:1.93,angC:112.9}],
  ['sih2cl2','tetAB2C2','SiH_2Cl_2','dichlorosilane',{A:'Si',B:'H',C:'Cl',rB:1.48,angB:111,rC:2.03,angC:109.7}],
  ['h2co','planarAB2C','H_2CO','formaldehyde',{A:'C',B:'H',C:'O',rB:1.111,ang:116.5,rC:1.205,oC:2}],
  ['cof2','planarAB2C','COF_2','carbonyl fluoride',{A:'C',B:'F',C:'O',rB:1.317,ang:107.7,rC:1.17,oC:2}],
  ['cocl2','planarAB2C','COCl_2','phosgene',{A:'C',B:'Cl',C:'O',rB:1.74,ang:111.8,rC:1.18,oC:2}],
  ['cscl2','planarAB2C','CSCl_2','thiophosgene',{A:'C',B:'Cl',C:'S',rB:1.70,ang:111.2,rC:1.60,oC:2}],
  ['no2cl','planarAB2C','NO_2Cl','nitryl chloride',{A:'N',B:'O',C:'Cl',rB:1.20,oB:1.5,ang:130.6,rC:1.84}],
  ['clf3','tshape','ClF_3','chlorine trifluoride',{A:'Cl',B:'F',rEq:1.598,rAx:1.698,ang:87.5}],
  ['brf3','tshape','BrF_3','bromine trifluoride',{A:'Br',B:'F',rEq:1.721,rAx:1.81,ang:86.2}],
  ['sf4','seesaw','SF_4','sulfur tetrafluoride',{A:'S',B:'F',rEq:1.545,rAx:1.646,angEq:101.6,angAx:173.1}],
  ['sef4','seesaw','SeF_4','selenium tetrafluoride',{A:'Se',B:'F',rEq:1.682,rAx:1.771,angEq:100.6,angAx:169.2}],
  ['tecl4','seesaw','TeCl_4','tellurium tetrachloride',{A:'Te',B:'Cl',rEq:2.29,rAx:2.43,angEq:102,angAx:176}],
  ['h2ccf2','vinylidene','H_2C=CF_2','1,1-difluoroethene',{X:'F',rCC:1.315,rX:1.316,angX:109.1,angH:121.8}],
  ['h2cccl2','vinylidene','H_2C=CCl_2','1,1-dichloroethene',{X:'Cl',rCC:1.32,rX:1.73,angX:114.5,angH:118}],
  ['cis-c2h2cl2','cisXAAX','<i>cis</i>-ClHC=CHCl','<i>cis</i>-1,2-dichloroethene',{A:'C',X:'Cl',H:true,rAA:1.32,rX:1.72,angX:123.8,rH:1.08,angH:119.6}],
  ['cis-c2h2f2','cisXAAX','<i>cis</i>-FHC=CHF','<i>cis</i>-1,2-difluoroethene',{A:'C',X:'F',H:true,rAA:1.32,rX:1.34,angX:122.1,rH:1.09,angH:124}],
  ['cis-n2f2','cisXAAX','<i>cis</i>-N_2F_2','<i>cis</i>-dinitrogen difluoride',{A:'N',X:'F',rAA:1.214,rX:1.409,angX:114.5}],
  ['cis-osf2cl4','cisAB4C2','<i>cis</i>-[OsCl_4F_2]^{2−}','the <i>cis</i>-tetrachlorodifluoroosmate(IV) ion',{A:'Os',B:'Cl',C:'F',rB:2.36,rC:1.92}],
  ['cis-oscl2f4','cisAB4C2','<i>cis</i>-[OsCl_2F_4]^{2−}','the <i>cis</i>-dichlorotetrafluoroosmate(IV) ion',{A:'Os',B:'F',C:'Cl',rB:1.93,rC:2.35}],
  ['mer-oscl3f3','merAB3C3','<i>mer</i>-[OsCl_3F_3]^{2−}','the <i>mer</i>-trichlorotrifluoroosmate(IV) ion',{A:'Os',B:'Cl',C:'F',rB:2.36,rC:1.93}],
  // C3v
  ['nh3','pyrAB3','NH_3','ammonia',{A:'N',B:'H',rB:1.012,ang:106.7}],
  ['ph3','pyrAB3','PH_3','phosphine',{A:'P',B:'H',rB:1.42,ang:93.3}],
  ['ash3','pyrAB3','AsH_3','arsine',{A:'As',B:'H',rB:1.511,ang:92.1}],
  ['nf3','pyrAB3','NF_3','nitrogen trifluoride',{A:'N',B:'F',rB:1.37,ang:102.2}],
  ['pf3','pyrAB3','PF_3','phosphorus trifluoride',{A:'P',B:'F',rB:1.57,ang:97.8}],
  ['pcl3','pyrAB3','PCl_3','phosphorus trichloride',{A:'P',B:'Cl',rB:2.04,ang:100.3}],
  ['ascl3','pyrAB3','AsCl_3','arsenic trichloride',{A:'As',B:'Cl',rB:2.16,ang:98.6}],
  ['xeo3','pyrAB3','XeO_3','xenon trioxide',{A:'Xe',B:'O',rB:1.76,oB:2,ang:103}],
  ['so3m','pyrAB3','SO_3^{2−}','the sulfite ion',{A:'S',B:'O',rB:1.51,oB:1.5,ang:106}],
  ['clo3m','pyrAB3','ClO_3^{−}','the chlorate ion',{A:'Cl',B:'O',rB:1.49,oB:1.5,ang:107}],
  ['h3op','pyrAB3','H_3O^{+}','the hydronium ion',{A:'O',B:'H',rB:.98,ang:113}],
  ['chcl3','tetAB3C','CHCl_3','chloroform',{A:'C',B:'Cl',C:'H',rB:1.758,rC:1.1,ang:107.6}],
  ['chf3','tetAB3C','CHF_3','fluoroform',{A:'C',B:'F',C:'H',rB:1.333,rC:1.098,ang:110.1}],
  ['ch3f','tetAB3C','CH_3F','fluoromethane',{A:'C',B:'H',C:'F',rB:1.086,rC:1.383,ang:108.8}],
  ['ch3cl','tetAB3C','CH_3Cl','chloromethane',{A:'C',B:'H',C:'Cl',rB:1.085,rC:1.776,ang:108.5}],
  ['ch3br','tetAB3C','CH_3Br','bromomethane',{A:'C',B:'H',C:'Br',rB:1.082,rC:1.934,ang:107.7}],
  ['ch3i','tetAB3C','CH_3I','iodomethane',{A:'C',B:'H',C:'I',rB:1.084,rC:2.132,ang:107.2}],
  ['sihcl3','tetAB3C','SiHCl_3','trichlorosilane',{A:'Si',B:'Cl',C:'H',rB:2.02,rC:1.47,ang:109}],
  ['pocl3','tetAB3C','POCl_3','phosphoryl chloride',{A:'P',B:'Cl',C:'O',rB:1.99,rC:1.45,oC:2,ang:114.8}],
  ['pof3','tetAB3C','POF_3','phosphoryl fluoride',{A:'P',B:'F',C:'O',rB:1.524,rC:1.436,oC:2,ang:116.9}],
  ['pscl3','tetAB3C','PSCl_3','thiophosphoryl chloride',{A:'P',B:'Cl',C:'S',rB:2.01,rC:1.885,oC:2,ang:116.2}],
  ['fac-oscl3f3','facAB3C3','<i>fac</i>-[OsCl_3F_3]^{2−}','the <i>fac</i>-trichlorotrifluoroosmate(IV) ion',{A:'Os',B:'Cl',C:'F',rB:2.36,rC:1.93}],
  // C4v
  ['brf5','sqpyAB4C','BrF_5','bromine pentafluoride',{A:'Br',B:'F',C:'F',rB:1.774,rC:1.689,ang:84.8}],
  ['if5','sqpyAB4C','IF_5','iodine pentafluoride',{A:'I',B:'F',C:'F',rB:1.869,rC:1.844,ang:81.9}],
  ['clf5','sqpyAB4C','ClF_5','chlorine pentafluoride',{A:'Cl',B:'F',C:'F',rB:1.668,rC:1.571,ang:86}],
  ['xeof4','sqpyAB4C','XeOF_4','xenon oxytetrafluoride',{A:'Xe',B:'F',C:'O',rB:1.90,rC:1.70,oC:2,ang:91.8}],
  ['sf5cl','octAB5C','SF_5Cl','sulfur chloride pentafluoride',{A:'S',B:'F',C:'Cl',rB:1.57,rC:2.03}],
  ['sf5br','octAB5C','SF_5Br','sulfur bromide pentafluoride',{A:'S',B:'F',C:'Br',rB:1.58,rC:2.19}],
  ['osclf5','octAB5C','[OsClF_5]^{2−}','the chloropentafluoroosmate(IV) ion',{A:'Os',B:'F',C:'Cl',rB:1.93,rC:2.36}],
  // C2h
  ['trans-c2h2cl2','transXAAX','<i>trans</i>-ClHC=CHCl','<i>trans</i>-1,2-dichloroethene',{A:'C',X:'Cl',H:true,rAA:1.32,rX:1.73,angX:120.5,rH:1.08,angH:124}],
  ['trans-c2h2f2','transXAAX','<i>trans</i>-FHC=CHF','<i>trans</i>-1,2-difluoroethene',{A:'C',X:'F',H:true,rAA:1.32,rX:1.35,angX:120,rH:1.08,angH:126}],
  ['trans-c2h2br2','transXAAX','<i>trans</i>-BrHC=CHBr','<i>trans</i>-1,2-dibromoethene',{A:'C',X:'Br',H:true,rAA:1.32,rX:1.89,angX:121,rH:1.08,angH:124}],
  ['trans-n2f2','transXAAX','<i>trans</i>-N_2F_2','<i>trans</i>-dinitrogen difluoride',{A:'N',X:'F',rAA:1.23,rX:1.40,angX:105.5}],
  ['trans-n2h2','transXAAX','<i>trans</i>-N_2H_2','<i>trans</i>-diazene',{A:'N',X:'H',rAA:1.247,rX:1.029,angX:106.3}],
  // D2h
  ['c2h4','ethylene','C_2H_4','ethylene',{A:'C',B:'H',rAA:1.339,oAA:2,rB:1.086,ang:117.6}],
  ['c2f4','ethylene','C_2F_4','tetrafluoroethylene',{A:'C',B:'F',rAA:1.311,oAA:2,rB:1.319,ang:112.4}],
  ['c2cl4','ethylene','C_2Cl_4','tetrachloroethylene',{A:'C',B:'Cl',rAA:1.354,oAA:2,rB:1.718,ang:115.7}],
  ['n2o4','ethylene','N_2O_4','dinitrogen tetroxide',{A:'N',B:'O',rAA:1.78,oAA:1,rB:1.19,oB:1.5,ang:135.4}],
  ['b2h6','diborane','B_2H_6','diborane',{}],
  // D3h
  ['bf3','trigAB3','BF_3','boron trifluoride',{A:'B',B:'F',rB:1.307}],
  ['bcl3','trigAB3','BCl_3','boron trichloride',{A:'B',B:'Cl',rB:1.742}],
  ['bbr3','trigAB3','BBr_3','boron tribromide',{A:'B',B:'Br',rB:1.893}],
  ['so3','trigAB3','SO_3','sulfur trioxide',{A:'S',B:'O',rB:1.42,oB:2}],
  ['no3m','trigAB3','NO_3^{−}','the nitrate ion',{A:'N',B:'O',rB:1.25,oB:1.33}],
  ['co3','trigAB3','CO_3^{2−}','the carbonate ion',{A:'C',B:'O',rB:1.29,oB:1.33}],
  ['pf5','tbpAB5','PF_5','phosphorus pentafluoride',{A:'P',B:'F',rEq:1.534,rAx:1.577}],
  ['pcl5','tbpAB5','PCl_5','phosphorus pentachloride',{A:'P',B:'Cl',rEq:2.02,rAx:2.12}],
  ['asf5','tbpAB5','AsF_5','arsenic pentafluoride',{A:'As',B:'F',rEq:1.656,rAx:1.711}],
  ['c3h6','cyclopropane','C_3H_6','cyclopropane',{}],
  // D4h
  ['xef4','sqAB4','XeF_4','xenon tetrafluoride',{A:'Xe',B:'F',rB:1.95}],
  ['ptcl4','sqAB4','[PtCl_4]^{2−}','the tetrachloroplatinate(II) ion',{A:'Pt',B:'Cl',rB:2.31}],
  ['aucl4','sqAB4','[AuCl_4]^{−}','the tetrachloroaurate(III) ion',{A:'Au',B:'Cl',rB:2.28}],
  ['pdcl4','sqAB4','[PdCl_4]^{2−}','the tetrachloropalladate(II) ion',{A:'Pd',B:'Cl',rB:2.30}],
  ['icl4','sqAB4','[ICl_4]^{−}','the tetrachloroiodate(III) ion',{A:'I',B:'Cl',rB:2.52}],
  ['trans-osf2cl4','transAB4C2','<i>trans</i>-[OsCl_4F_2]^{2−}','the <i>trans</i>-tetrachlorodifluoroosmate(IV) ion',{A:'Os',B:'Cl',C:'F',rB:2.36,rC:1.92}],
  ['trans-oscl2f4','transAB4C2','<i>trans</i>-[OsCl_2F_4]^{2−}','the <i>trans</i>-dichlorotetrafluoroosmate(IV) ion',{A:'Os',B:'F',C:'Cl',rB:1.93,rC:2.35}],
  // D2d
  ['allene','allene','H_2C=C=CH_2','allene',{X:'H',rX:1.087,ang:118.2}],
  ['f4allene','allene','F_2C=C=CF_2','tetrafluoroallene',{X:'F',rX:1.32,ang:110.6}],
  ['cucl4','flatTet','[CuCl_4]^{2−}','the tetrachlorocuprate(II) ion (flattened)',{A:'Cu',B:'Cl',rB:2.23,trans:130}],
  ['cubr4','flatTet','[CuBr_4]^{2−}','the tetrabromocuprate(II) ion (flattened)',{A:'Cu',B:'Br',rB:2.37,trans:128}],
  // D3d
  ['c2h6','ethane','C_2H_6','ethane (staggered)',{A:'C',B:'H',rAA:1.536,rB:1.091,ang:110.9}],
  ['c2f6','ethane','C_2F_6','hexafluoroethane (staggered)',{A:'C',B:'F',rAA:1.545,rB:1.326,ang:109.8}],
  ['c2cl6','ethane','C_2Cl_6','hexachloroethane (staggered)',{A:'C',B:'Cl',rAA:1.564,rB:1.769,ang:109.6}],
  ['si2h6','ethane','Si_2H_6','disilane (staggered)',{A:'Si',B:'H',rAA:2.331,rB:1.492,ang:110.3}],
  // Td
  ['ch4','tetAB4','CH_4','methane',{A:'C',B:'H',rB:1.087}],
  ['cf4','tetAB4','CF_4','carbon tetrafluoride',{A:'C',B:'F',rB:1.315}],
  ['ccl4','tetAB4','CCl_4','carbon tetrachloride',{A:'C',B:'Cl',rB:1.767}],
  ['sih4','tetAB4','SiH_4','silane',{A:'Si',B:'H',rB:1.48}],
  ['sif4','tetAB4','SiF_4','silicon tetrafluoride',{A:'Si',B:'F',rB:1.55}],
  ['gecl4','tetAB4','GeCl_4','germanium tetrachloride',{A:'Ge',B:'Cl',rB:2.11}],
  ['ticl4','tetAB4','TiCl_4','titanium tetrachloride',{A:'Ti',B:'Cl',rB:2.17}],
  ['nh4','tetAB4','NH_4^{+}','the ammonium ion',{A:'N',B:'H',rB:1.03}],
  ['bf4','tetAB4','BF_4^{−}','the tetrafluoroborate ion',{A:'B',B:'F',rB:1.40}],
  ['clo4','tetAB4','ClO_4^{−}','the perchlorate ion',{A:'Cl',B:'O',rB:1.44,oB:1.75}],
  ['so4','tetAB4','SO_4^{2−}','the sulfate ion',{A:'S',B:'O',rB:1.47,oB:1.5}],
  ['po4','tetAB4','PO_4^{3−}','the phosphate ion',{A:'P',B:'O',rB:1.54,oB:1.25}],
  ['mno4','tetAB4','MnO_4^{−}','the permanganate ion',{A:'Mn',B:'O',rB:1.63,oB:1.75}],
  ['oso4','tetAB4','OsO_4','osmium tetroxide',{A:'Os',B:'O',rB:1.71,oB:2}],
  ['nicl4','tetAB4','[NiCl_4]^{2−}','the tetrachloronickelate(II) ion',{A:'Ni',B:'Cl',rB:2.27}],
  ['p4','p4','P_4','white phosphorus',{A:'P',r:2.21}],
  // Oh
  ['sf6','octAB6','SF_6','sulfur hexafluoride',{A:'S',B:'F',rB:1.561}],
  ['sef6','octAB6','SeF_6','selenium hexafluoride',{A:'Se',B:'F',rB:1.688}],
  ['tef6','octAB6','TeF_6','tellurium hexafluoride',{A:'Te',B:'F',rB:1.815}],
  ['mof6','octAB6','MoF_6','molybdenum hexafluoride',{A:'Mo',B:'F',rB:1.82}],
  ['wf6','octAB6','WF_6','tungsten hexafluoride',{A:'W',B:'F',rB:1.83}],
  ['uf6','octAB6','UF_6','uranium hexafluoride',{A:'U',B:'F',rB:1.996}],
  ['pf6','octAB6','PF_6^{−}','the hexafluorophosphate ion',{A:'P',B:'F',rB:1.60}],
  ['sif6','octAB6','SiF_6^{2−}','the hexafluorosilicate ion',{A:'Si',B:'F',rB:1.68}],
  ['alf6','octAB6','AlF_6^{3−}','the hexafluoroaluminate ion',{A:'Al',B:'F',rB:1.81}],
  ['ptcl6','octAB6','[PtCl_6]^{2−}','the hexachloroplatinate(IV) ion',{A:'Pt',B:'Cl',rB:2.32}],
  ['oscl6','octAB6','[OsCl_6]^{2−}','the hexachloroosmate(IV) ion',{A:'Os',B:'Cl',rB:2.33}],
].map(([id, tpl, formula, name, p]) => ({id, tpl, formula, name, p, pg:T[tpl].pg}));

const formulaHTML = f => f.replace(/_(\d+)/g, '<sub>$1</sub>').replace(/\^\{([^}]*)\}/g, '<sup>$1</sup>');
const PG_ORDER = ['C1','Cs','C2','C2v','C3v','C4v','C2h','D2h','D3h','D4h','D2d','D3d','Td','Oh'];

/* ---------- flowchart path (same tree as point-groups.html) ---------- */
const TREE = {
  lin:{yes:'lin_i', no:'high'}, lin_i:{yes:'=Dinfh', no:'=Cinfv'},
  high:{yes:'high_i', no:'cn'}, high_i:{yes:'high_c5', no:'=Td'}, high_c5:{yes:'=Ih', no:'=Oh'},
  cn:{yes:'n', no:'cn_s'}, cn_s:{yes:'=Cs', no:'cn_i'}, cn_i:{yes:'=Ci', no:'=C1'},
  n:{num:true, next:'perp'}, perp:{yes:'d_sh', no:'c_sh'},
  d_sh:{yes:'=Dnh', no:'d_sd'}, d_sd:{yes:'=Dnd', no:'=Dn'},
  c_sh:{yes:'=Cnh', no:'c_sv'}, c_sv:{yes:'=Cnv', no:'c_s2n'}, c_s2n:{yes:'=S2n', no:'=Cn'},
};
const leadsTo = (id, fam) => id[0] === '=' ? id.slice(1) === fam : TREE[id].num ? leadsTo(TREE[id].next, fam) : leadsTo(TREE[id].yes, fam) || leadsTo(TREE[id].no, fam);
const CNh = n => `<i>C</i><sub>${n}</sub>`;
const QS = {
  lin:() => 'Is the molecule linear?', lin_i:() => 'Is there a centre of inversion, <i>i</i>?',
  high:() => 'Are there two or more <i>C</i><sub><i>n</i></sub> axes with <i>n</i> ≥ 3?', high_i:() => 'Is there a centre of inversion, <i>i</i>?',
  high_c5:() => 'Are there <i>C</i><sub>5</sub> axes?', cn:() => 'Is there any proper rotation axis <i>C</i><sub><i>n</i></sub> (<i>n</i> ≥ 2)?',
  cn_s:() => 'Is there a mirror plane, σ?', cn_i:() => 'Is there a centre of inversion, <i>i</i>?',
  n:() => 'What is the highest-order rotation axis (the principal axis)?',
  perp:n => `Are there ${n} <i>C</i><sub>2</sub> axes perpendicular to the ${CNh(n)} axis?`,
  d_sh:n => `Is there a horizontal mirror plane, σ<sub>h</sub>, perpendicular to ${CNh(n)}?`, c_sh:n => `Is there a horizontal mirror plane, σ<sub>h</sub>, perpendicular to ${CNh(n)}?`,
  d_sd:n => `Are there ${n} dihedral mirror planes, σ<sub>d</sub>, containing ${CNh(n)}?`, c_sv:n => `Are there ${n} vertical mirror planes, σ<sub>v</sub>, containing ${CNh(n)}?`,
  c_s2n:n => `Is there an <i>S</i><sub>${2*n}</sub> axis collinear with ${CNh(n)}?`,
};
function flowPath(g){
  const out = []; let node = 'lin';
  while (node[0] !== '='){
    const t = TREE[node];
    if (t.num){ out.push({q:QS.n(), a:`${CNh(g.n)}, so <i>n</i> = ${g.n}`}); node = t.next; continue; }
    const yes = leadsTo(t.yes, g.fam); out.push({q:QS[node](g.n), a:yes ? 'Yes' : 'No'}); node = yes ? t.yes : t.no;
  }
  return out;
}

/* ---------- choose the molecule ---------- */
const params = new URLSearchParams(location.search);
const allowed = (params.get('g') || '').split(',').filter(k => GROUPS[k]);
const pool = allowed.length ? allowed : PG_ORDER;
function pick(exclude){
  const groups = pool.filter(g => MOLS.some(m => m.pg === g && m.id !== exclude));
  const g = groups[Math.floor(Math.random()*groups.length)];
  const list = MOLS.filter(m => m.pg === g && m.id !== exclude);
  return list[Math.floor(Math.random()*list.length)];
}
const M = MOLS.find(m => m.id === params.get('m')) || pick();
const urlFor = (id, g = allowed) => `?m=${encodeURIComponent(id)}${g.length ? '&g=' + g.join(',') : ''}`;
if (params.get('m') !== M.id) history.replaceState(null, '', urlFor(M.id));
const nextURL = g => urlFor(pick(M.id).id, g);

/* ---------- build the lesson config ---------- */
const G = GROUPS[M.pg], tpl = T[M.tpl];
const built = tpl.build(M.p);
const counts = {}; built.atoms.forEach(a => counts[a.el] = (counts[a.el] || 0) + 1);
const seen = {};
const atoms = built.atoms.map(a => { seen[a.el] = (seen[a.el] || 0) + 1; return {el:a.el, html:counts[a.el] > 1 ? `${a.el}<sub>${seen[a.el]}</sub>` : a.el, pos:a.pos}; });
const len = b => Math.hypot(...[0,1,2].map(c => atoms[b.i].pos[c] - atoms[b.j].pos[c]));
const bonds = built.bonds.map(b => {
  const d = len(b), H = atoms[b.i].el === 'H' || atoms[b.j].el === 'H';
  const k = (H ? 5.0 : 4.5*Math.pow(1.5/d, 2))*b.order;
  return {i:b.i, j:b.j, k:Math.round(k*100)/100, order:b.order === 2 ? 2 : 1};
});
const meanBond = bonds.reduce((s,b) => s + len(b), 0)/bonds.length;
const nb = atoms.map(() => []); bonds.forEach(b => { nb[b.i].push(b.j); nb[b.j].push(b.i); });
const charge = atoms.map((a,i) => 0.12*nb[i].reduce((s,j) => s + (EN[a.el] - EN[atoms[j].el]), 0)*-1);
const linKey = s => s.split('').map(c => it(c));
const lin = ir => ir.T ? (ir.chi[0] > 1 ? [`(${linKey(ir.T).join(', ')})`] : linKey(ir.T)) : [];
const rot = ir => ir.R ? (ir.chi[0] > 1 ? [`(${ir.R.split('').map(Rh).join(', ')})`] : ir.R.split('').map(Rh)) : [];
const VEC = {x:[1,0,0], y:[0,1,0], z:[0,0,1]};
const tr = [];
G.irreps.forEach(ir => [['T', false], ['R', true]].forEach(([key, R]) => {
  const ax = ir[key]; if (!ax) return;
  if (ir.chi[0] > 1) tr.push({id:(R ? 'R' : 'T') + ax, R, parts:ax.split('').map(c => VEC[c])});
  else ax.split('').forEach(c => tr.push({id:(R ? 'R' : 'T') + c, R, parts:[VEC[c]]}));
}));
const order = (key => [...tr].sort((a,b) => key(a) - key(b)))(t => (t.R ? 10 : 0) + 'xyz'.indexOf(t.id.slice(1,2)));
const fHTML = formulaHTML(M.formula), cap = s => s[0].toUpperCase() + s.slice(1);
const OPTIONS = ['C1','Cs','Ci','C2','C3','C4','C2v','C3v','C4v','C5v','C6v','C2h','C3h','D2','D3','D4','D2h','D3h','D4h','D5h','D6h','D2d','D3d','D4d','D5d','S4','S6','Td','Oh','Ih','Cinfv','Dinfh'];
const optHTML = k => GROUPS[k] ? GROUPS[k].html : k === 'Cinfv' ? 'C<sub>∞v</sub>' : k === 'Dinfh' ? 'D<sub>∞h</sub>' : k[0] + `<sub>${k.slice(1)}</sub>`;

window.LESSON = {
  id:'practice-' + M.id, nameText:M.name.replace(/<[^>]+>/g, ''), formulaHTML:`${cap(M.name)}, ${fHTML},`, groupHTML:G.html,
  scale:Math.max(.62, Math.min(1.5, 1.45/meanBond)),
  geometry(){ return {atoms:atoms.map(a => ({...a, pos:a.pos.slice()})), bonds}; },
  charges:(at, i) => charge[i],
  ops:G.ops, classes:G.classes,
  irreps:G.irreps.map(ir => ({id:ir.id, cls:ir.cls, html:ir.html, chi:ir.chi, lin:lin(ir), rot:rot(ir), quad:ir.quad})),
  splitOp:G.splitOp, mixOp:G.mixOp, splitOp3:G.splitOp3, mixOp3:G.mixOp3,
  tr:order, hideHLabels:atoms.length > 8,
  text:{
    modesHint:'Start with the operations whose characters differ most between the rows of the table.',
  },
  practice:{
    id:M.id, formulaHTML:fHTML, nameHTML:M.name, pg:M.pg,
    options:OPTIONS.map(k => ({key:k, html:optHTML(k)})),
    flow:flowPath(G), axes:tpl.axes.replace(/\{([A-E])\}/g, (_, k) => M.p[k] || k),
    groups:PG_ORDER.map(k => ({key:k, html:GROUPS[k].html, count:MOLS.filter(m => m.pg === k).length})), allowed,
    nextURL, linear:false,
  },
};
window.PRACTICE_DATA = {MOLS, GROUPS, T, PG_ORDER};

/* ---------- page chrome ---------- */
// tab title with Unicode subscripts and superscripts, since a <title> cannot hold markup
const SUBS = '₀₁₂₃₄₅₆₇₈₉', SUPS = {'0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','+':'⁺','−':'⁻'};
const plainFormula = M.formula.replace(/<[^>]+>/g, '').replace(/_(\d+)/g, (_, d) => [...d].map(c => SUBS[c]).join('')).replace(/\^\{([^}]*)\}/g, (_, t) => [...t].map(c => SUPS[c] || c).join(''));
document.title = `Practice: ${plainFormula}`;
const h1 = document.getElementById('mol-title'); if (h1) h1.innerHTML = `${fHTML} <span class="mol-name">${cap(M.name)}</span>`;
const kick = document.getElementById('mol-kicker'); if (kick) kick.innerHTML = 'Practice · random molecule';
const nb2 = document.getElementById('new-mol'); if (nb2) nb2.href = nextURL(allowed);
})();
