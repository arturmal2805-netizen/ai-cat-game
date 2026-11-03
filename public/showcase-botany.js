import * as T from 'three';
import {cliffSurfacePoint} from './showcase-geology.js';
import {naturalBankPoint} from './showcase-bank.js';
import {surfaceTexture,shape,line} from './fantasy-scenery.js';

// Opaque curved leaves, not alpha cards or a live particle/fur pass. Immutable
// templates enter the same static material batches as the rest of the biome.
const templates=new Map(),paints=new Map();
function paint(kind,color){const key=kind+':'+color;if(!paints.has(key)){
 const m=new T.MeshStandardMaterial({color,roughness:kind==='moss'?.86:kind==='blossom'?.78:.82,map:kind==='blossom'?null:surfaceTexture(kind==='moss'?'lawn':'leaf'),side:T.DoubleSide,vertexColors:true});m.userData.sharedScenery=true;m.userData.surfaceKind=kind;paints.set(key,m);
}return paints.get(key);}
const buffers=()=>({p:[],uv:[],color:[],index:[]});
function leaf(b,origin,axis,width,length,roll=0,tint=1){
 const q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,1),axis.clone().normalize()).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),roll)),at=b.p.length/3,
 points=[[0,0,0, .5,0,.55],[-width*.5,length*.055,length*.44, 0,.44,.82],[0,length*.14,length*.52, .5,.52,1],[width*.5,length*.055,length*.44, 1,.44,.82],[0,-length*.08,length, .5,1,1.12]];
 for(const [x,y,z,u,v,shade]of points){b.p.push(...new T.Vector3(x,y,z).applyQuaternion(q).add(origin).toArray());b.uv.push(u,v);b.color.push(shade*tint,shade*tint,shade*tint*.94);}
 for(const i of [0,1,2,0,2,3,1,4,2,2,4,3])b.index.push(at+i);
}
function roundedLeaf(b,origin,axis,width,length,roll=0,tint=1){
 const q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,1),axis.clone().normalize()).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),roll)),start=b.p.length/3;
 const vertex=(x,y,z,u,v,shade)=>{b.p.push(...new T.Vector3(x,y,z).applyQuaternion(q).add(origin).toArray());b.uv.push(u,v);b.color.push(shade*tint,shade*tint,shade*tint*.97);};
 vertex(0,0,0,.5,0,.65);
 for(let row=1;row<=3;row++){const t=row/4,w=Math.sin(Math.PI*t)**.65*width*.5;
  for(const side of [-1,0,1])vertex(side*w,Math.sin(Math.PI*t)*length*(side===0?.13:.045),length*t,side*.5+.5,t,.82+t*.2);
 }
 vertex(0,-length*.035,length,.5,1,1.04);
 for(const k of [0,1,2,0,2,3,1,4,2,2,4,5,2,5,3,3,5,6,4,7,5,5,7,8,5,8,6,6,8,9,7,10,8,8,10,9])b.index.push(start+k);
}
function broadBlade(b,origin,axis,width,length,roll=0,tint=1,vein=true){
 const q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,1),axis.clone().normalize()).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),roll)),start=b.p.length/3;
 const vertex=(x,y,z,u,v,shade)=>{b.p.push(...new T.Vector3(x,y,z).applyQuaternion(q).add(origin).toArray());b.uv.push(u,v);b.color.push(shade*tint,shade*tint,shade*tint*.97);};
 vertex(0,0,0,.5,0,.80);
 for(let row=1;row<8;row++){const t=row/8,w=Math.sin(Math.PI*t)**.65*width*.5;
  for(const side of [-1,0,1])vertex(side*w,Math.sin(Math.PI*t)*length*(side===0?.13:.045)-length*t*t*.035,length*t,side*.5+.5,t,.9+t*.14+(side===0?.06:0));
 }
 vertex(0,-length*.035,length,.5,1,1.04);
 for(const i of [0,1,2,0,2,3])b.index.push(start+i);
 for(let row=0;row<6;row++){const a=start+1+row*3;for(const i of [0,3,1,1,3,4,1,4,2,2,4,5])b.index.push(a+i);}
 for(const i of [19,22,20,20,22,21])b.index.push(start+i);
 if(vein){const at=b.p.length/3;for(let row=0;row<=8;row++){const t=row/8,w=length*.006*Math.sin(Math.PI*t);for(const side of [-1,1])vertex(side*w,Math.sin(Math.PI*t)*length*.139-length*t*t*.035,length*t,.5+side*.006,t,1.22);if(row){const a=at+(row-1)*2;for(const i of [0,2,1,1,2,3])b.index.push(a+i);}}}
}
function geometry(b){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(b.p,3));g.setAttribute('uv',new T.Float32BufferAttribute(b.uv,2));g.setAttribute('color',new T.Float32BufferAttribute(b.color,3));g.setIndex(b.index);g.computeVertexNormals();g.userData.sharedScenery=true;return g;}
function template(kind){
 if(templates.has(kind))return templates.get(kind);const b=buffers();
 if(kind==='canopy'){
  for(let k=0;k<384;k++){
   const a=k*2.39996323+Math.sin(k*12.9898)*.45,up=T.MathUtils.clamp(-.84+(k+.5)/384*1.82+.05*Math.sin(k*19.13),-.9,.98),r=Math.sqrt(1-up*up),bulge=1+.05*Math.sin(a*5+up*2)+.025*Math.cos(k*2.7),
    origin=new T.Vector3(Math.sin(a)*r*.43*bulge,.86+up*.205,Math.cos(a)*r*.43*bulge);
   roundedLeaf(b,origin,new T.Vector3(Math.cos(a),.06,-Math.sin(a)),.055+(k%4)*.004,.10+(k%5)*.006,Math.acos(up),.84+up*.18+(k%3)*.04);
  }
 }else if(kind==='palm-frond'){
  const centre=t=>new T.Vector3(0,Math.sin(t*Math.PI)*.2-t*t*.27,t);
  for(let i=0;i<=8;i++){const t=i/8,p=centre(t);for(const side of [-1,1]){b.p.push(p.x+side*.01,p.y,p.z);b.uv.push(side*.5+.5,t);b.color.push(.78+t*.2,.78+t*.2,.73+t*.2);}if(i){const at=(i-1)*2;b.index.push(at,at+2,at+1,at+1,at+2,at+3);}}
  const core=b.p.length/3;
  for(let i=0;i<=12;i++){const t=i/12,p=centre(t),width=Math.sin(Math.PI*t)**.65*.10;for(const side of [-1,0,1]){b.p.push(side*width,p.y+(side===0?.018:0),p.z);b.uv.push(side*.5+.5,t);b.color.push(.86+t*.12,.86+t*.12,.81+t*.12);}if(i)for(let side=0;side<2;side++){const at=core+i*3+side;b.index.push(at-3,at,at-2,at,at+1,at-2);}}
  for(let i=1;i<=18;i++){const t=.015+i*.051,origin=centre(t),length=Math.sin(t*Math.PI)**.75*.19;
   for(const side of [-1,1])leaf(b,origin,new T.Vector3(side*.96,-.10,.28),.075,length,side*.10,.85+t*.15);
  }
 }else if(kind==='shrub'){
  for(let j=0;j<32;j++){const a=j*2.39996323+Math.sin(j*7.1)*.3,up=-.6+(j+.5)/32*1.55,r=Math.sqrt(1-up*up),origin=new T.Vector3(Math.sin(a)*r*.6,.65+up*.43,Math.cos(a)*r*.6);roundedLeaf(b,origin,new T.Vector3(Math.sin(a),.24+up*.12,Math.cos(a)),.24+(j%4)*.035,.40+(j%5)*.04,j*.17,.82+(j%4)*.06);}
 }else if(kind==='broadleaf'){
  for(let j=0;j<8;j++){const a=j*2.39996323,origin=new T.Vector3(Math.sin(a)*.08,.05,Math.cos(a)*.08);broadBlade(b,origin,new T.Vector3(Math.sin(a)*.8,.8+(j%3)*.18,Math.cos(a)*.8),.65+(j%3)*.1,1.4+(j%4)*.15,j*.035,.83+(j%4)*.07,j%2===0);}
 }else if(kind==='grass'){
  for(let j=0;j<32;j++){const a=j*2.39996323,r=Math.sqrt((j+.5)/32)*.9,origin=new T.Vector3(Math.sin(a)*r,0,Math.cos(a)*r),h=.25+(j%7)*.062;leaf(b,origin,new T.Vector3(Math.sin(a)*.35,1,Math.cos(a)*.35),.055,h,a*.1,.78+(j%5)*.065);}
 }else if(kind==='fern'){
  for(let j=0;j<3;j++){const a=j*Math.PI*2/3+.3,start=b.p.length/3;
   for(let k=0;k<=8;k++){const t=k/8,p=new T.Vector3(Math.sin(a)*t*.85,Math.sin(t*Math.PI*.8)*.78,Math.cos(a)*t*.85),w=.016*(1-t*.7);for(const side of [-1,1]){b.p.push(p.x+Math.cos(a)*side*w,p.y+.012,p.z-Math.sin(a)*side*w);b.uv.push(.49+side*.01,t);b.color.push(1,1,.86);}if(k){const at=start+(k-1)*2;for(const q of [0,2,1,1,2,3])b.index.push(at+q);}}
  }
  for(let j=0;j<3;j++)for(let k=1;k<=6;k++)for(const side of [-1,1]){
   const a=j*Math.PI*2/3+.3,t=k/7,length=(1-t*.75)*.64,origin=new T.Vector3(Math.sin(a)*t*.85,Math.sin(t*Math.PI*.8)*.78,Math.cos(a)*t*.85),angle=a+side*1.05;
   leaf(b,origin,new T.Vector3(Math.sin(angle),.10-t*.2,Math.cos(angle)),length*.26,length,side*.24,.75+t*.22);
  }
 }else if(kind==='blossom'){
  for(let j=0;j<5;j++){const a=j*Math.PI*2/5;roundedLeaf(b,new T.Vector3(),new T.Vector3(Math.sin(a),.08,Math.cos(a)),.15,.205,0,1);}
 }else{
  for(let j=0;j<8;j++){const a=j*Math.PI/4,up=j%2?.8:.45;leaf(b,new T.Vector3(0,.04,0),new T.Vector3(Math.sin(a),up,Math.cos(a)),.38,j%2?1.25:.95,j*.1,.86+(j%3)*.08);}
 }
 const g=geometry(b);templates.set(kind,g);return g;
}
function plant(parent,kind,x,y,z,scale,color,turn=0){const m=new T.Mesh(template(kind),paint('leaf',color));m.position.set(x,y,z);m.scale.setScalar(scale);m.rotation.y=turn;m.castShadow=m.receiveShadow=true;m.userData.gardenPlant=kind;parent.add(m);return m;}
export function leafyCanopy(parent,x,y,z,height,pink=false){return plant(parent,'canopy',x,y,z,height,pink?0xf487c4:0x72bf58);}
export function fern(parent,x,y,z,scale=1,turn=0){return plant(parent,'fern',x,y,z,scale,0x52ac43,turn);}
export function rosette(parent,x,y,z,scale=1,turn=0){return plant(parent,'rosette',x,y,z,scale,0x7bbb51,turn);}
export function tropicalShrub(parent,x,y,z,scale=1,turn=0){
 const shrub=plant(parent,'shrub',x,y,z,scale,0x6cba56,turn);
 for(let j=0;j<2;j++){const a=turn+j*2.8;line(parent,[x,y,z],[x+Math.sin(a)*.38*scale,y+.65*scale,z+Math.cos(a)*.38*scale],0x8c744c,.045*scale);}
 return shrub;
}
export function broadleaf(parent,x,y,z,scale=1,turn=0){return plant(parent,'broadleaf',x,y,z,scale,0x80c55b,turn);}
export const palmFrondGeometry=()=>template('palm-frond');

let pollenGeometry,stemGeometry,budGeometry;
export function gardenBlossom(parent,x,y,z,color=0xf3a7cf,scale=1,turn=0){
 const head=new T.Mesh(template('blossom'),paint('blossom',color));head.position.set(x,y,z);head.scale.setScalar(scale);head.rotation.y=turn;head.castShadow=head.receiveShadow=true;parent.add(head);
 pollenGeometry??=new T.IcosahedronGeometry(1,0);pollenGeometry.userData.sharedScenery=true;
 const heart=new T.Mesh(pollenGeometry,paint('blossom',0xffd779));heart.position.set(x,y+.022*scale,z);heart.scale.set(.047*scale,.025*scale,.047*scale);heart.castShadow=true;parent.add(heart);return head;
}
function closedBud(parent,x,y,z,color,scale){
 budGeometry??=new T.LatheGeometry([new T.Vector2(0,0),new T.Vector2(.055,.025),new T.Vector2(.087,.10),new T.Vector2(.065,.19),new T.Vector2(0,.25)],10);budGeometry.userData.sharedScenery=true;
 const bud=new T.Mesh(budGeometry,paint('blossom',color));bud.position.set(x,y+.28*scale,z);bud.scale.setScalar(scale);bud.castShadow=bud.receiveShadow=true;parent.add(bud);
 const stem=new T.Mesh(stemGeometry,paint('blossom',0x648b58));stem.position.set(x,y+.14*scale,z);stem.scale.set(.015*scale,.28*scale,.015*scale);stem.castShadow=stem.receiveShadow=true;parent.add(stem);
}
export function gardenFlowerCluster(parent,x,z,color,scale=1,y=0){
 stemGeometry??=new T.CylinderGeometry(1,1,1,5);stemGeometry.userData.sharedScenery=true;
 for(let f=0;f<3;f++){const px=x+Math.sin(f*2.4)*.22*scale,pz=z+Math.cos(f*2.4)*.22*scale,h=(.28+f*.06)*scale,stem=new T.Mesh(stemGeometry,paint('blossom',0x648b58));stem.position.set(px,y+h/2,pz);stem.scale.set(.025*scale,h,.025*scale);stem.castShadow=stem.receiveShadow=true;parent.add(stem);gardenBlossom(parent,px,y+h,pz,color,scale,f*.6);}
 closedBud(parent,x-.22*scale,y,z+.08*scale,color,scale*.8);
}

export function* floweringShore(parent,outline){
 for(let j=0;j<16;j++){
  const p=outline[j*6],out=new T.Vector3(p.x,0,p.y).normalize(),root=new T.Vector3(p.x,.13,p.y),length=4.2+j%4,
   curve=new T.CatmullRomCurve3([root,root.clone().addScaledVector(out,.35).add(new T.Vector3(0,-length*.28,0)),root.clone().addScaledVector(out,.85).add(new T.Vector3(0,-length,0))]),g=new T.TubeGeometry(curve,10,.105,5,false),stem=new T.Mesh(g,paint('moss',0x477c35));stem.castShadow=stem.receiveShadow=true;parent.add(stem);
  const leaves=buffers();
  for(let k=0;k<10;k++){const t=(k+.4)/10,point=curve.getPoint(t),a=j*1.31+k*2.4;roundedLeaf(leaves,point,new T.Vector3(Math.sin(a),-.25,Math.cos(a)),.65,.95,a*.2,.88+t*.16);}
  const foliage=new T.Mesh(geometry(leaves),paint('leaf',j%3?0x65a543:0x91bd51));foliage.geometry.userData.sharedScenery=false;foliage.castShadow=foliage.receiveShadow=true;parent.add(foliage);
  for(const t of [.22,.52,.8]){const point=curve.getPoint(t).addScaledVector(out,.3);gardenBlossom(parent,point.x,point.y,point.z,j%3?0xf397c6:0xffd49c,3.7,j+t);}
  yield;
 }
}

let planterBox;
export function promenadePlanter(parent,point,outward,canPlant){
 planterBox??=new T.BoxGeometry(1,1,1);planterBox.userData.sharedScenery=true;
 const group=new T.Group();group.position.copy(point);group.rotation.y=Math.atan2(outward.x,outward.z);group.scale.setScalar(.65);parent.add(group);
 const plank=(x,y,z,sx,sy,sz)=>{const m=shape(group,'cube',0xd5a864,x,y,z,sx,sy,sz);m.geometry=planterBox;return m;};
 for(const x of [-.83,.83])plank(x,.23,0,.13,.54,1.55);
 for(const z of [-.72,.72])plank(0,.23,z,1.7,.54,.13);
 const soil=new T.Mesh(planterBox,paint('blossom',0x5c4430));soil.position.y=.43;soil.scale.set(1.55,.06,1.35);soil.castShadow=soil.receiveShadow=true;group.add(soil);
 rosette(group,0,.48,0,1.05,.3);gardenFlowerCluster(group,0,0,0xf7a2ca,2.1,.5);
 for(const x of [-.55,.55])line(group,[x,-.03,-1.9],[x,-.03,.3],0xa0784e,.10);
 const drops=[0,.8,1.6,2.4,3.2,4],root=point.clone().addScaledVector(outward,.45).add(new T.Vector3(0,.25,0));
 if(drops.every(d=>canPlant(root.x,root.y-d,root.z,.92))){
  const curve=new T.CatmullRomCurve3([new T.Vector3(0,.45,.72),new T.Vector3(0,-2.0,1.0),new T.Vector3(.15,-5.7,1.1)]),vine=new T.Mesh(new T.TubeGeometry(curve,8,.11,5,false),paint('moss',0x528e3c));vine.castShadow=vine.receiveShadow=true;group.add(vine);
  const leaves=buffers();for(let k=0;k<9;k++){const p=curve.getPoint(k/9),a=k*2.4;roundedLeaf(leaves,p,new T.Vector3(Math.sin(a),-.3,.6),.85,1.1,k*.3,.94);}
  const foliage=new T.Mesh(geometry(leaves),paint('leaf',0x72ac45));foliage.geometry.userData.sharedScenery=false;foliage.castShadow=foliage.receiveShadow=true;group.add(foliage);
 }
 return group;
}

export function mossMantle(parent,x,z,height,radius,seed=0){
 const b=buffers(),n=80,points=[];
 b.p.push(0,height+.09,0);b.uv.push(0,0);b.color.push(1,1,1);
 for(let i=0;i<=n;i++){const a=i/n*Math.PI*2,q=cliffSurfacePoint(height,radius,seed,a,1);q.x*=1.015;q.z*=1.015;q.y+=.09;points.push(q);b.p.push(...q.toArray());b.uv.push(q.x/2.5,q.z/2.5);b.color.push(.94,1,.85);if(i)b.index.push(0,i,i+1);}
 for(let i=0;i<n;i++){
  const start=b.p.length/3;
  for(const [angle,t]of [[i,0],[i+1,0],[i,.5],[i+1,.5],[i,1],[i+1,1]]){
   const a=angle/n*Math.PI*2,drop=.38+Math.abs(.72*Math.sin(a*3+seed)+.28*Math.cos(a*7-seed))**2*Math.min(4.3,height*.23),q=cliffSurfacePoint(height,radius,seed,a,1-drop*t/height),puff=1.018+Math.sin(Math.PI*t)*.018;
   q.x*=puff;q.z*=puff;q.y+=.08;b.p.push(...q.toArray());b.uv.push(q.x/2.5,q.y/2.5);b.color.push(1-t*.24,1-t*.20,1-t*.29);
  }
  for(const k of [0,1,2,1,3,2,2,3,4,3,5,4])b.index.push(start+k);
  if(i%2===0)leaf(b,points[i].clone(),new T.Vector3(Math.sin(i),1,Math.cos(i)),.16,.32+(i%4)*.08,i*.91,.95);
 }
 for(let j=0;j<24;j++){const a=j*2.39996323+seed,r=.25+.58*((j%7)/6),p=cliffSurfacePoint(height,radius,seed,a,1);p.x*=r;p.z*=r;p.y+=.11;for(let k=0;k<3;k++){const angle=a+k*2.2;leaf(b,p,new T.Vector3(Math.sin(angle)*.4,1,Math.cos(angle)*.4),.12,.27+(j%4)*.06,angle*.2,.95+(k%2)*.08);}}
 const g=geometry(b);g.userData.sharedScenery=false;const m=new T.Mesh(g,paint('moss',0x79b34b));m.position.set(x,0,z);m.castShadow=m.receiveShadow=true;m.userData.gardenMoss=true;parent.add(m);return m;
}

export function* gardenUnderstory(parent,spec,canPlace,obstacles,canPlant=()=>true){
 const patches=[],pool=spec.pool,seed=[...spec.kind].reduce((n,c)=>n+c.charCodeAt(0),0)*.13;
 for(let i=0;i<480&&patches.length<24;i++){
  const a=i*2.39996323+seed,r=Math.sqrt((i%37+2)/39),x=Math.sin(a)*r*46,z=Math.cos(a)*r*43;
  if(((x-pool[0])/(pool[2]+4))**2+((z-pool[1])/(pool[3]+4))**2<1||!canPlace(x,1.4,z,3.2,1.4,3.2)||!canPlant(x,1.35,z,3.2)||obstacles.some(o=>Math.hypot(o.x-x,o.z-z)<o.radius+3.5))continue;
  tropicalShrub(parent,x,.12,z,1.75,a);broadleaf(parent,x+Math.sin(a)*.35,.12,z+Math.cos(a)*.35,1.8,a+.8);
  for(const side of [-1,1])fern(parent,x+Math.cos(a)*side*1.25,.13,z-Math.sin(a)*side*1.25,1.15,a+side);
  if(patches.length%3===0)gardenFlowerCluster(parent,x,z,patches.length%2?0xf0a2d0:0xffd19a,3.2,.10);
  patches.push({x,z,radius:3.2});obstacles.push({x,z,radius:3.2});yield;
 }
 parent.userData.gardenPatches=patches;return patches;
}

// A single continuous crown under the individual curved leaves. It replaces
// disconnected rock-like balls while retaining the original canopy envelope.
export function canopyVolumeGeometry(){
 if(templates.has('crown-volume'))return templates.get('crown-volume');
 const g=new T.SphereGeometry(1,32,20),p=g.attributes.position,c=[];
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),a=Math.atan2(x,z),lobe=1+.085*Math.sin(a*5+y*3)+.040*Math.cos(a*9-y*4);
  p.setXYZ(i,x*.405*lobe,.86+y*.188*lobe,z*.405*lobe);const v=.73+.16*(y*.5+.5)+.06*Math.sin(a*4+y*5);c.push(v,v,v*.96);
 }g.setAttribute('color',new T.Float32BufferAttribute(c,3));g.computeVertexNormals();g.userData.sharedScenery=true;templates.set('crown-volume',g);return g;
}
export function* gardenGroundCoverSteps(parent,spec,canPlace,canPlant,obstacles){
 const roots=[],seed=[...spec.kind].reduce((n,c)=>n+c.charCodeAt(0),0)*.17;
 for(let i=0;i<520&&roots.length<64;i++){
  const a=i*2.39996323+seed,r=Math.sqrt((i+.5)/520),x=Math.sin(a)*r*51,z=Math.cos(a)*r*48,dx=Math.max(0,Math.abs(x-spec.pool[0])-1.3),dz=Math.max(0,Math.abs(z-spec.pool[1])-1.3);
  if((dx/spec.pool[2])**2+(dz/spec.pool[3])**2<1||!canPlace(x,.35,z,1.4,.35,1.4)||!canPlant(x,.4,z,1.3)||obstacles.some(o=>Math.hypot(o.x-x,o.z-z)<o.radius+1.4))continue;
  const scale=1.1+(i%4)*.18;plant(parent,'grass',x,.11,z,scale,[0x8cbd50,0x70af45,0x9ecb68][i%3],a);roots.push({x,z,radius:scale});
  if(roots.length%3===0)broadleaf(parent,x,.12,z,1.0,a);if(roots.length%6===0){tropicalShrub(parent,x,.12,z,.85,a);obstacles.push({x,z,radius:.95});}yield;
 }return roots;
}
export function* bankGardenSteps(parent,data,width,depth,side,end,canPlant){
 const b=buffers(),roots=[],steps=128;
 for(let i=0;i<steps;i++){
  const u=.06+(end-.075)*i/steps,v=.06+(end-.075)*(i+1)/steps,at=b.p.length/3;
  const inner=t=>2.25+.35*Math.sin(t*29+side),outer=t=>4.8+.28*Math.sin(t*43-side);
  const points=[[u,inner(u)],[u,outer(u)],[v,inner(v)],[v,outer(v)]].map(([t,d])=>naturalBankPoint(data,width,depth,side,t,d,end).addScaledVector(data.samples[Math.round(t*(data.samples.length-1))].up,.08));
  if(!points.every(p=>canPlant(p.x,p.y,p.z,.35)))continue;
  for(const [j,p]of points.entries()){b.p.push(...p.toArray());b.uv.push(p.x/2.5,p.z/2.5);const tint=.77+.18*Math.sin(i*.67)**2;b.color.push(tint,tint,tint*.88);}for(const k of [0,2,1,1,2,3])b.index.push(at+k);
  if(i%2===0){const p=naturalBankPoint(data,width,depth,side,u,3.4+.6*Math.sin(i),end);if(canPlant(p.x,p.y+.45,p.z,1.0))rosette(parent,p.x,p.y+.09,p.z,.9,i*.4);}
  if(i%4===2){const u=.06+(end-.075)*(i+.5)/steps,p=naturalBankPoint(data,width,depth,side,u,5.1,end);if(canPlant(p.x,p.y+1,p.z,2.0)){
   if(i%8===2){tropicalShrub(parent,p.x,p.y+.1,p.z,1.15,i*.3);broadleaf(parent,p.x,p.y+.1,p.z,1.1,i*.2);}else fern(parent,p.x,p.y+.1,p.z,2.05,i*.3);rosette(parent,p.x+side*.45,p.y+.1,p.z,1.05,i);if(i%8===2)gardenFlowerCluster(parent,p.x,p.z,i%24?0xf6b9cc:0xffdfa0,2.8,p.y+.10);roots.push(p.toArray());
  }}if(i%16===0)yield;
 }
 const g=geometry(b);g.userData.sharedScenery=false;const mesh=new T.Mesh(g,paint('moss',0x81b74d));mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return roots;
}

// The old guessed radii put many vines inside the cliffs. Root every stem on
// the same authored rock surface, with actual curved leaves outside that skin.
export function cliffVine(parent,x,z,height,radius,seed,angle,length){
 const points=Array.from({length:21},(_,i)=>{const p=cliffSurfacePoint(height,radius,seed,angle,1-length/height*i/20);p.x*=1.035;p.z*=1.035;p.y+=.08;return p;}),curve=new T.CatmullRomCurve3(points),group=new T.Group();group.position.set(x,0,z);parent.add(group);
 const stem=new T.Mesh(new T.TubeGeometry(curve,24,.075,4,false),paint('moss',0x4e7838));stem.castShadow=stem.receiveShadow=true;group.add(stem);
 const b=buffers();for(let i=0;i<14;i++){const t=(i+.2)/14,p=curve.getPoint(t),a=angle+(i%2?-.55:.55);roundedLeaf(b,p,new T.Vector3(Math.sin(a)*.65,-.65,Math.cos(a)*.65),.62+(i%3)*.08,.96+(i%4)*.1,(i%2?1:-1)*.3,.83+(i%4)*.06);}
 const foliage=new T.Mesh(geometry(b),paint('leaf',0x75b858));foliage.geometry.userData.sharedScenery=false;foliage.castShadow=foliage.receiveShadow=true;group.add(foliage);group.userData.cliffVine={root:points[0].toArray(),angle,length};return group;
}
