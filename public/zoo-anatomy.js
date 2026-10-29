import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {ZOO_LEGS} from './zoo-anatomy-data.js';
import * as T from 'three';
const V=p=>new T.Vector3(...p);
const sideName=s=>s<0?'Left':'Right';
// Species-specific adult anatomy. Coordinates describe the rest skeleton and
// sculpt landmarks; they are not a collection of visible primitive meshes.
export function buildZooAnatomy(species,{joint,add,curve,eye}){
 const skin=(c,p,s,role='body',options={})=>add(c,p,s,role,{...options,flesh:true});
 const tube=(points,r0,r1,color,role,options={})=>{
  const path=new T.CatmullRomCurve3(points.map(V)),segments=options.trunk?40:options.micro?8:28,sides=options.trunk?12:options.micro?5:8;
  const g=new T.TubeGeometry(path,segments,r0,sides,false),p=g.attributes.position;
  for(let i=0;i<p.count;i++){const t=Math.floor(i/(sides+1))/segments,c=path.getPointAt(t),f=(r1/r0+(1-r1/r0)*(1-t)**.7)*(options.trunk?1-.012*Math.sin(t*95)**6:1);p.setXYZ(i,c.x+(p.getX(i)-c.x)*f,c.y+(p.getY(i)-c.y)*f,c.z+(p.getZ(i)-c.z)*f);}g.computeVertexNormals();
  add(color,[0,0,0],[1,1,1],role,{geometry:g,...options});g.dispose();return path;
 };
 const nose=(p,w,h,d,color=0x282b30,role='head',broad=false)=>{
  const outline=new T.Shape();outline.moveTo(-w,h*.3);outline.bezierCurveTo(-w*1.05,h*.8,w*1.05,h*.8,w,h*.3);outline.bezierCurveTo(w*.8,-h*.05,w*.25,-h*.65,0,-h*.7);outline.bezierCurveTo(-w*.25,-h*.65,-w*.8,-h*.05,-w,h*.3);
  if(broad){outline.curves.length=0;outline.moveTo(-w,h*.1);outline.bezierCurveTo(-w*1.05,h*.85,w*1.05,h*.85,w,h*.1);outline.bezierCurveTo(w*.9,-h*.6,w*.4,-h*.6,0,-h*.45);outline.bezierCurveTo(-w*.4,-h*.6,-w*.9,-h*.6,-w,h*.1);}
  let g;if(broad){const points=outline.getPoints(8),sides=points.length-1,rings=6,positions=[],indices=[];for(let row=0;row<=rings;row++)for(let j=0;j<=sides;j++){const r=row/rings,q=points[j%sides];positions.push(q.x*r,q.y*r,d*Math.sqrt(Math.max(0,1-r*r)));if(row<rings&&j<sides){const k=row*(sides+1)+j;indices.push(k,k+1,k+sides+1,k+1,k+sides+2,k+sides+1);}}g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(positions.length/3*2),2));g.setIndex(indices);g.computeVertexNormals();}
  else {const raw=new T.ExtrudeGeometry(outline,{depth:d,bevelEnabled:true,bevelThickness:d*.35,bevelSize:h*.12,bevelSegments:3,curveSegments:12});g=mergeVertices(raw);raw.dispose();}
  add(color,p,[1,1,1],role,{geometry:g,gloss:.85});g.dispose();
 };
 const whiskers=(x,y,z,spread=.38,role='head',col=0xe4dfd2)=>{for(const side of [-1,1])for(let k=0;k<4;k++){
  curve([[side*x,y+k*.018,z],[side*(x+spread*.55),y+(k-1.5)*.045,z+.015],[side*(x+spread),y+(k-1.5)*.08,z-.04]],.0038,col,role);
  add(0x655e5b,[side*(x-.04+k*.026),y+.03,z+.005],[.006,.006,.006],role);
 }};
 function quadruped(col,{x,front,rear,hip,sy,rx,foot=.24,kind=species}){
  for(const frontLeg of [true,false])for(const side of [-1,1]){
   const suffix=(frontLeg?'Front':'Back')+sideName(side),role='Leg'+suffix,lower='Knee'+suffix,paw='Foot'+suffix,
    z=frontLeg?front:rear,pivot=[side*x,hip+(frontLeg?.08:-.06),z],kneeY=hip*.48,
    kneeZ=z+(frontLeg?.02:kind==='elephant'?-.02:-.22),ankleZ=z+(frontLeg?.09:kind==='elephant'?.08:.03),pawZ=ankleZ+foot*.53;
   joint(role,pivot,'body');joint(lower,[side*x,kneeY,kneeZ],role);joint(paw,[side*x,foot*.53,pawZ],lower);
   skin(col,[side*x,(hip+kneeY)*.5,z+(frontLeg?0:-.08)],[rx,sy,rx*(frontLeg?1:1.22)],role,{stripes:kind==='tiger'?3:0});
   skin(col,[side*x,kind==='polar'?(kneeY+foot*.53)*.5:kneeY*.56,(kneeZ+ankleZ)*.5],[rx*(kind==='polar'?.82:.64),kind==='polar'?(kneeY-foot*.53)*.58:kneeY*.56,rx*(kind==='polar'?.84:.68)],lower,{stripes:kind==='tiger'?3:0});
   skin(col,[side*x,foot*.46,pawZ],[foot*.76,foot*.46,foot],paw,{stripes:kind==='tiger'?3:0});
   if(kind!=='elephant')add(kind==='tiger'?0x746469:kind==='polar'?0x77746e:0x4b3c32,[side*x,foot*.035,pawZ],[foot*.45,foot*.035,foot*.65],paw,{micro:true});
   const digits=['elephant','otter','polar'].includes(kind)?5:4;
   for(let k=0;k<digits;k++){
    const px=side*x+(k-(digits-1)/2)*foot*.31;
    if(kind!=='elephant')skin(col,[px,foot*.27,pawZ+foot*.6],[foot*.23,foot*.27,foot*.47],paw);
    if(kind==='polar')tube([[px,foot*.31,pawZ+foot*.86],[px,foot*.26,pawZ+foot*1.14],[px,foot*.08,pawZ+foot*1.27]],foot*.052,foot*.01,0x56564d,paw,{micro:true});
    else add(kind==='elephant'?0xbcb8ab:kind==='tiger'?0xc0aeb0:kind==='polar'?0x77736d:0x3e3530,[px,foot*.23,pawZ+(kind==='elephant'?foot*.8*Math.sqrt(Math.max(.05,.75-((k-(digits-1)/2)*.31/.76)**2)):foot*.96)],[foot*.08,foot*.12,foot*.08],paw,{micro:true});
   }
  }
 }
 function pinna(side,pivot,color){
  const outline=new T.CatmullRomCurve3([[.02,.57,0],[.42,.75,0],[.95,.55,0],[1.1,.12,0],[.91,-.52,0],[.57,-.89,0],[.21,-.75,0],[-.04,-.23,0]].map(V),true),positions=[],colors=[],uv=[],indices=[],rings=8,segments=56,base=new T.Color(color),inner=new T.Color(0xad9898),normal=new T.Color();
  for(const back of [false,true])for(let ring=0;ring<=rings;ring++)for(let j=0;j<=segments;j++){
   const t=ring/rings,a=j/segments,o=outline.getPoint(a%1),cx=.46,cy=-.03,
    x=cx+(o.x-cx)*t,y=cy+(o.y-cy)*t,z=(back?-.024:.024)+.075*Math.sin(t*Math.PI)*Math.sin(a*Math.PI*4)+.06*(1-t)**2;
   positions.push(pivot[0]+side*x,pivot[1]+y,pivot[2]+z);normal.copy(base).lerp(inner,back?0:(1-t)*.38);colors.push(normal.r,normal.g,normal.b);uv.push(a,t);
   if(ring<rings&&j<segments){const k=(back?1:0)*(rings+1)*(segments+1)+ring*(segments+1)+j,quad=[k,k+segments+1,k+1,k+1,k+segments+1,k+segments+2];if((side<0)!==back)quad.reverse();indices.push(...quad);}
  }
  // Closed rim between front and back surfaces.
  const row=rings*(segments+1),offset=(rings+1)*(segments+1);for(let j=0;j<segments;j++){const a=row+j,b=a+offset;indices.push(a,a+1,b,b,a+1,b+1);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();add(color,[0,0,0],[1,1,1],'ear'+side,{geometry:g,painted:true});g.dispose();
 }
 if(species==='elephant'){
  const col=0x8c9697;joint('head',[0,2.58,1.05],'body');joint('tail',[0,1.98,-1.5],'body');
  skin(col,[0,1.91,-.06],[.94,1.01,1.55]);skin(col,[0,2.23,.74],[.83,.94,.94]);skin(col,[0,2.05,-1.02],[.86,.94,.85]);
  skin(col,[0,2.83,1.08],[.61,.73,.64],'head');skin(col,[-.24,3.17,1.2],[.32,.39,.42],'head');skin(col,[.24,3.17,1.2],[.32,.39,.42],'head');skin(col,[0,2.4,1.32],[.58,.47,.49],'head');skin(col,[0,2.8,1.58],[.36,.5,.31],'head');
  quadruped(col,ZOO_LEGS.elephant);
  for(const side of [-1,1]){joint('ear'+side,[side*.48,2.89,.91],'head');pinna(side,[side*.48,2.89,.91],col);eye(side*.46,2.91,1.55,.082,'head',false,[side*.58,0,.81]);
   tube([[side*.35,2.34,1.55],[side*.4,1.92,1.98],[side*.42,1.92,2.33]],.092,.007,0xd8d0b7,'head',{gloss:.12});
   curve([[side*.4,3.06,1.45],[side*.51,3.08,1.4],[side*.58,3.02,1.33]],.01,0x7e8584);
  }
  const trunkPoints=[[0,2.91,1.35],[0,2.35,1.87],[0,1.45,2.02],[0,.55,2.16],[0,.31,2.52]],trunkCurve=new T.CatmullRomCurve3(trunkPoints.map(V));
  for(let i=0;i<5;i++)joint('trunk'+i,trunkCurve.getPointAt(i/4).toArray(),i?'trunk'+(i-1):'head');
  // Sculpt the trunk into the forehead itself. An intersecting tube left a
  // visible cut edge above the trunk, especially in the phone close camera.
  for(let i=0;i<=26;i++){const t=i/26,p=trunkCurve.getPointAt(t),r=.075+(.285-.075)*(1-t)**.7;skin(col,p.toArray(),[r,r,r],i?'trunk'+Math.min(4,Math.round(t*4)):'head');}
  for(const side of [-1,1])add(0x515d60,[side*.029,.31,2.56],[.018,.023,.007],'trunk4');
  for(let i=0;i<12;i++){joint('spray'+i,[0,.31,2.57],'trunk4');add(0x9ce9ff,[0,.31,2.57],[.035,.05,.035],'spray'+i);}
  curve([[-.31,2.2,1.6],[0,2.15,1.69],[.31,2.2,1.6]],.009,0x666d6d);
  tube([[0,1.98,-1.46],[.03,1.37,-1.7],[.04,.91,-1.66]],.065,.018,col,'tail');add(0x535657,[.04,.86,-1.66],[.065,.13,.055],'tail');
 }else if(species==='tiger'){
  const col=0xe9e8df;joint('head',[0,1.34,1.04],'body');joint('tail',[0,1.08,-1.36],'body');
  skin(col,[0,1.23,-.14],[.52,.49,1.29],'body',{stripes:1});skin(col,[0,1.27,.67],[.49,.5,.68],'body',{stripes:1});skin(col,[0,1.17,-.98],[.51,.54,.65],'body',{stripes:1});skin(0xf4f0e6,[0,.94,.14],[.4,.28,.93]);
  skin(col,[0,1.51,1.15],[.395,.4,.43],'head',{stripes:2});skin(col,[0,1.63,1.06],[.37,.3,.34],'head',{stripes:2});
  for(const side of [-1,1]){skin(0xf0eee5,[side*.3,1.27,1.29],[.205,.265,.26],'head',{stripes:2});skin(0xf7f4e9,[side*.145,1.235,1.54],[.19,.155,.26],'head');
   joint('ear'+side,[side*.295,1.81,1.04],'head');add(0x5f6263,[side*.31,1.86,1.05],[.12,.15,.075],'ear'+side);add(0xc3afa9,[side*.31,1.86,1.117],[.075,.105,.018],'ear'+side);add(0xe7e7dc,[side*.31,1.9,.979],[.057,.05,.012],'ear'+side);
   eye(side*.215,1.535,1.47,.073,'head',true,[side*.24,0,.97]);
  }
  skin(0xf0eee4,[0,1.075,1.49],[.25,.115,.29],'head');nose([0,1.295,1.758],.105,.073,.024,0xb78381);
  curve([[0,1.26,1.79],[0,1.16,1.79]],.006,0x555458);for(const side of [-1,1]){curve([[0,1.16,1.79],[side*.12,1.14,1.76],[side*.235,1.17,1.66]],.005,0x74716d);add(0x584c4f,[side*.07,1.3,1.785],[.017,.012,.006],'head');}
  whiskers(.19,1.22,1.77,.4);quadruped(col,ZOO_LEGS.tiger);
  tube([[0,1.08,-1.3],[.04,1.02,-1.95],[.25,1.1,-2.56],[.4,1.37,-2.85]],.095,.047,col,'tail',{stripes:4});
  joint('toy',[.7,.23,1.5]);add(0xa4b6c8,[.7,.23,1.5],[.23,.23,.23],'toy');
 }else if(species==='polar'){
  const col=0xeeeadd;joint('head',[0,1.47,1.14],'body');joint('tail',[0,1.18,-1.76],'body');
  // A long low skull/neck, sloping shoulders and substantial plantigrade feet.
  // The previous high spherical shoulder swallowed most of the neck/head.
  skin(col,[0,1.32,-.5],[.62,.67,1.3]);skin(col,[0,1.42,.48],[.56,.64,.69]);skin(col,[0,1.39,-1.23],[.64,.67,.6]);
  skin(col,[0,1.49,1.01],[.37,.37,.74],'head');skin(col,[0,1.58,1.54],[.29,.29,.43],'head');
  for(const side of [-1,1])skin(col,[side*.18,1.43,1.59],[.14,.22,.3],'head');
  skin(0xe7dfcb,[0,1.395,1.94],[.19,.15,.43],'head');skin(col,[0,1.275,1.87],[.205,.095,.42],'head');
  for(const side of [-1,1]){joint('ear'+side,[side*.21,1.78,1.30],'head');add(col,[side*.235,1.83,1.34],[.095,.112,.057],'ear'+side);add(0xcac0ae,[side*.235,1.835,1.391],[.043,.052,.011],'ear'+side);eye(side*.205,1.62,1.79,.047,'head',false,[side*.5,.01,.866]);}
  nose([0,1.425,2.36],.138,.09,.04,0x252b30,'head',true);
  for(const side of [-1,1]){add(0x121b22,[side*.082,1.445,2.392],[.023,.013,.003],'head');curve([[0,1.31,2.35],[side*.11,1.3,2.31],[side*.18,1.29,2.15]],.0035,0x76766a);}
  quadruped(col,ZOO_LEGS.polar);add(col,[0,1.18,-1.83],[.11,.13,.18],'tail');joint('toy',[.8,.25,1.1]);add(0xe7f9ff,[.8,.25,1.1],[.24,.24,.24],'toy');
 }else if(species==='gorilla'){
  const fur=0x3d4142,skinCol=0x6c6765;joint('head',[0,1.99,.33],'body');
  skin(fur,[0,1.35,-.07],[.69,.99,.59]);skin(0x6c6f6e,[0,1.54,-.34],[.68,.77,.35]);skin(fur,[0,1.94,.04],[.6,.55,.46]);skin(0x464a48,[0,1.35,.39],[.54,.69,.23]);
  skin(fur,[0,2.16,.32],[.44,.49,.44],'head');skin(0x434746,[0,2.46,.23],[.32,.17,.29],'head');skin(skinCol,[0,2.045,.667],[.325,.34,.165],'head');skin(0x827971,[0,1.87,.75],[.285,.19,.17],'head');
  for(const side of [-1,1]){
   skin(skinCol,[side*.17,2.23,.7],[.19,.09,.1],'head');eye(side*.154,2.15,.76,.052,'head',false,[side*.09,0,1]);
   add(0x454948,[side*.43,2.15,.26],[.11,.15,.065],'head');add(0x6b6861,[side*.43,2.15,.318],[.06,.095,.016],'head');
   const arm='Arm'+sideName(side),elbow='Elbow'+sideName(side);joint(arm,[side*.69,1.87,.03],'body');joint(elbow,[side*1.08,1.03,.14],arm);
   skin(fur,[side*.83,1.72,.02],[.43,.53,.4],arm);skin(fur,[side*1.05,1.3,.12],[.32,.5,.32],arm);skin(fur,[side*1.12,.77,.23],[.29,.43,.285],elbow);skin(skinCol,[side*1.12,.38,.32],[.26,.24,.25],elbow);
   for(let k=0;k<4;k++){const x=side*(.91+k*.13);skin(skinCol,[x,.27,.47],[.071,.15,.12],elbow);curve([[x,.34,.55],[x,.26,.586],[x,.18,.54]],.007,0x4d4c47,elbow);add(0x42453f,[x,.22,.583],[.038,.045,.007],elbow);}
   skin(skinCol,[side*.9,.42,.33],[.1,.17,.13],elbow);
   const leg='LegBack'+sideName(side);joint(leg,[side*.37,.8,-.18],'body');skin(fur,[side*.39,.57,-.25],[.29,.44,.3],leg);skin(fur,[side*.4,.26,-.02],[.22,.25,.27],leg);skin(skinCol,[side*.4,.12,.17],[.27,.12,.37],leg);
   for(let k=0;k<4;k++)skin(skinCol,[side*.4+(k-1.5)*.105,.075,.41],[.052,.075,.15],leg);
  }
  skin(0x77716c,[0,2.09,.782],[.16,.11,.077],'head');for(const side of [-1,1])add(0x2d302e,[side*.072,2.07,.85],[.032,.022,.012],'head');
  curve([[-.21,1.85,.879],[0,1.82,.914],[.21,1.85,.879]],.014,0x514c48);curve([[-.17,1.8,.88],[0,1.775,.9],[.17,1.8,.88]],.01,0x71665f);
 }else if(species==='otter'){
  const col=0x66503b;joint('head',[0,.59,.68],'body');joint('tail',[0,.37,-.77],'body');
  skin(col,[0,.43,-.18],[.31,.315,.83]);skin(col,[0,.5,.37],[.31,.32,.46]);skin(0xb2a083,[0,.3,.31],[.25,.17,.6]);skin(col,[0,.665,.77],[.31,.235,.34],'head');skin(0xb9aa8b,[0,.555,.99],[.27,.13,.21],'head');
  for(const side of [-1,1]){joint('ear'+side,[side*.247,.8,.65],'head');add(col,[side*.26,.83,.65],[.073,.09,.055],'ear'+side);eye(side*.17,.715,.98,.055,'head',false,[side*.28,0,.96]);}
  nose([0,.62,1.185],.076,.048,.012,0x292a28);for(const side of [-1,1])curve([[0,.56,1.205],[side*.09,.535,1.18],[side*.17,.55,1.12]],.0045,0x696150);
  whiskers(.16,.575,1.17,.33,'head',0xd8cfb9);quadruped(col,ZOO_LEGS.otter);
  tube([[0,.37,-.72],[0,.27,-1.23],[.1,.19,-1.78],[.15,.19,-2.02]],.17,.015,col,'tail');joint('toy',[0,.12,.53],'LegFrontRight');add(0xa6afb0,[0,.12,.53],[.12,.075,.1],'toy',{micro:true});
 }else{
  joint('head',[0,.43,.28],'body');joint('tail',[0,.25,-.46],'body');
  skin(0xeeb5c6,[0,.29,-.17],[.31,.245,.61]);skin(0xffd1df,[0,.42,.29],[.46,.235,.4],'head');skin(0xffd8e2,[0,.335,.45],[.39,.13,.3],'head');skin(0xffe0e5,[0,.18,-.02],[.26,.135,.54]);
  for(const side of [-1,1]){eye(side*.285,.475,.555,.112,'head',true,[side*.2,0,.98]);for(let i=0;i<3;i++){
   const role='gill'+sideName(side)+i,base=[side*.36,.43+(i-1)*.125,.2],tip=[side*(.76+(i===1?.035:0)),.43+(i-1)*.28,.13];joint(role,base,'head');
   tube([base,[side*.56,.43+(i-1)*.22,.17],tip],.025,.007,0xe48eaf,role);
   for(let k=0;k<8;k++){const q=k/8,x=side*(.43+q*.31),y=.43+(i-1)*(.13+q*.15);for(const sign of [-1,1])tube([[x,y,.17],[x+side*.025,y+sign*.05,.17],[x+side*.052,y+sign*(.07+(1-q)*.025),.16]],.012,.002,sign>0?0xf0a6c4:0xe993b3,role,{micro:true});}
  }}
  for(const front of [true,false])for(const side of [-1,1]){const role='Leg'+(front?'Front':'Back')+sideName(side),z=front?.25:-.48;joint(role,[side*.25,.25,z],'body');skin(0xf4becf,[side*.31,.15,z],[.105,.125,.095],role);skin(0xf7cbda,[side*.37,.066,z+.025],[.12,.065,.09],role);const digits=front?4:5;for(let k=0;k<digits;k++)tube([[side*.36,.06,z+(k-(digits-1)/2)*.032],[side*.46,.048,z+(k-(digits-1)/2)*.047]],.014,.005,0xf7d6df,role,{micro:true});}
  const path=new T.CatmullRomCurve3([[0,.26,-.44],[0,.26,-.85],[.09,.25,-1.34],[.16,.25,-1.56]].map(V)),g=new T.TubeGeometry(path,32,1,10,false),p=g.attributes.position;
  for(let i=0;i<p.count;i++){const t=Math.floor(i/11)/32,c=path.getPointAt(t),w=.035+.055*(1-t),h=(.08+.18*Math.sin(Math.PI*t))*(1-t*.82);p.setXYZ(i,c.x+(p.getX(i)-c.x)*w,c.y+(p.getY(i)-c.y)*h,c.z+(p.getZ(i)-c.z)*w);}g.computeVertexNormals();add(0xe49ebc,[0,0,0],[1,1,1],'tail',{geometry:g,gloss:.36});g.dispose();
  curve([[-.13,.31,.753],[0,.29,.77],[.13,.31,.753]],.004,0x9d667e);
  for(let k=0;k<18;k++){const a=k*2.399;add(0xc894ad,[Math.sin(a)*.27,.54+Math.cos(a)*.06,.55-Math.abs(Math.sin(a))*.05],[.006,.006,.004],'head');}
 }
}
