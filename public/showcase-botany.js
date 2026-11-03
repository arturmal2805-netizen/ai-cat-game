import * as T from 'three';
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
function geometry(b){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(b.p,3));g.setAttribute('uv',new T.Float32BufferAttribute(b.uv,2));g.setAttribute('color',new T.Float32BufferAttribute(b.color,3));g.setIndex(b.index);g.computeVertexNormals();g.userData.sharedScenery=true;return g;}
function template(kind){
 if(templates.has(kind))return templates.get(kind);const b=buffers();
 if(kind==='canopy'){
  for(let j=0;j<8;j++){
   const a=j*Math.PI/4,c=new T.Vector3(Math.sin(a)*.24,.84+(j%2)*.08,Math.cos(a)*.24);
   for(let k=0;k<48;k++){const angle=k*2.39996323+j*.71,up=-.35+(k+.5)/48*1.35,rad=Math.sqrt(1-up*up),direction=new T.Vector3(Math.sin(angle)*rad,up,Math.cos(angle)*rad),origin=c.clone().addScaledVector(direction,.175);
    roundedLeaf(b,origin,new T.Vector3(Math.cos(angle),0,-Math.sin(angle)),.055+(k%4)*.004,.10+(k%5)*.006,Math.acos(up),.91+up*.14);
   }
  }
 }else if(kind==='palm-frond'){
  const centre=t=>new T.Vector3(0,Math.sin(t*Math.PI)*.2-t*t*.27,t);
  for(let i=0;i<=8;i++){const t=i/8,p=centre(t);for(const side of [-1,1]){b.p.push(p.x+side*.01,p.y,p.z);b.uv.push(side*.5+.5,t);b.color.push(.78+t*.2,.78+t*.2,.73+t*.2);}if(i){const at=(i-1)*2;b.index.push(at,at+2,at+1,at+1,at+2,at+3);}}
  const core=b.p.length/3;
  for(let i=0;i<=12;i++){const t=i/12,p=centre(t),width=Math.sin(Math.PI*t)**.65*.10;for(const side of [-1,0,1]){b.p.push(side*width,p.y+(side===0?.018:0),p.z);b.uv.push(side*.5+.5,t);b.color.push(.86+t*.12,.86+t*.12,.81+t*.12);}if(i)for(let side=0;side<2;side++){const at=core+i*3+side;b.index.push(at-3,at,at-2,at,at+1,at-2);}}
  for(let i=1;i<=14;i++){const t=.04+i*.061,origin=centre(t),length=Math.sin(t*Math.PI)**.75*.19;
   for(const side of [-1,1])leaf(b,origin,new T.Vector3(side*.96,-.10,.28),.11,length,side*.10,.85+t*.15);
  }
 }else if(kind==='fern'){
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
export function leafyCanopy(parent,x,y,z,height,pink=false){return plant(parent,'canopy',x,y,z,height,pink?0xf487c4:0x8cc35a);}
export function fern(parent,x,y,z,scale=1,turn=0){return plant(parent,'fern',x,y,z,scale,0x52ac43,turn);}
export function rosette(parent,x,y,z,scale=1,turn=0){return plant(parent,'rosette',x,y,z,scale,0x7bbb51,turn);}
export const palmFrondGeometry=()=>template('palm-frond');

let pollenGeometry,stemGeometry;
export function gardenBlossom(parent,x,y,z,color=0xf3a7cf,scale=1,turn=0){
 const head=new T.Mesh(template('blossom'),paint('blossom',color));head.position.set(x,y,z);head.scale.setScalar(scale);head.rotation.y=turn;head.castShadow=head.receiveShadow=true;parent.add(head);
 pollenGeometry??=new T.IcosahedronGeometry(1,0);pollenGeometry.userData.sharedScenery=true;
 const heart=new T.Mesh(pollenGeometry,paint('blossom',0xffd779));heart.position.set(x,y+.022*scale,z);heart.scale.set(.047*scale,.025*scale,.047*scale);heart.castShadow=true;parent.add(heart);return head;
}
export function gardenFlowerCluster(parent,x,z,color,scale=1,y=0){
 stemGeometry??=new T.CylinderGeometry(1,1,1,5);stemGeometry.userData.sharedScenery=true;
 for(let f=0;f<3;f++){const px=x+Math.sin(f*2.4)*.22*scale,pz=z+Math.cos(f*2.4)*.22*scale,h=(.28+f*.06)*scale,stem=new T.Mesh(stemGeometry,paint('blossom',0x648b58));stem.position.set(px,y+h/2,pz);stem.scale.set(.025*scale,h,.025*scale);stem.castShadow=stem.receiveShadow=true;parent.add(stem);gardenBlossom(parent,px,y+h,pz,color,scale,f*.6);}
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
 const b=buffers(),n=48,points=[];
 // Scalloped living cap and actual overhanging growth; the rock remains visible
 // between drapes. A darker underside stops it looking like polished green clay.
 b.p.push(0,height+.32,0);b.uv.push(0,0);b.color.push(1,1,1);
 for(let i=0;i<=n;i++){const a=i/n*Math.PI*2,r=radius*(.91+.04*Math.sin(a*7+seed));points.push(new T.Vector3(Math.sin(a)*r,height+.28+Math.sin(a*5)*.08,Math.cos(a)*r*.86));b.p.push(...points[i].toArray());b.uv.push(points[i].x/2.5,points[i].z/2.5);b.color.push(.90,.96,.82);if(i)b.index.push(0,i,i+1);}
 for(let i=0;i<n;i++){
  const top=points[i],next=points[i+1],drop=.35+Math.sin(i*1.83+seed)**4*Math.min(3.2,height*.18),start=b.p.length/3;
  for(const [p,t]of [[top,0],[next,0],[top,1],[next,1]]){const q=p.clone();q.y-=drop*t;q.x*=1+.025*t;q.z*=1+.025*t;b.p.push(...q.toArray());b.uv.push(q.x/2.5,q.y/2.5);b.color.push(1-t*.35,1-t*.32,1-t*.4);}
  for(const k of [0,1,2,1,3,2])b.index.push(start+k);
  if(i%2===0)leaf(b,top.clone().add(new T.Vector3(0,.04,0)),new T.Vector3(Math.sin(i),1,Math.cos(i)),.14,.32+(i%4)*.08,i*.91,.95);
 }
 const g=geometry(b);g.userData.sharedScenery=false;const m=new T.Mesh(g,paint('moss',0x79b34b));m.position.set(x,0,z);m.castShadow=m.receiveShadow=true;m.userData.gardenMoss=true;parent.add(m);return m;
}

export function* gardenUnderstory(parent,spec,canPlace,obstacles){
 const patches=[],pool=spec.pool,seed=[...spec.kind].reduce((n,c)=>n+c.charCodeAt(0),0)*.13;
 for(let i=0;i<150&&patches.length<12;i++){
  const a=i*2.39996323+seed,r=Math.sqrt((i%23+2)/25),x=Math.sin(a)*r*45,z=Math.cos(a)*r*42;
  if(((x-pool[0])/(pool[2]+4))**2+((z-pool[1])/(pool[3]+4))**2<1||!canPlace(x,1.1,z,3.0,1.1,3.0)||obstacles.some(o=>Math.hypot(o.x-x,o.z-z)<o.radius+3.2))continue;
  for(let j=0;j<5;j++){const angle=j*2.39996323+i,px=x+Math.sin(angle)*1.8,pz=z+Math.cos(angle)*1.8;if(j===0)rosette(parent,px,.14,pz,1.2,angle);else fern(parent,px,.14,pz,1.05+(j%3)*.18,angle);}
  patches.push({x,z,radius:2.7});obstacles.push({x,z,radius:2.7});yield;
 }
 parent.userData.gardenPatches=patches;
 return patches;
}
