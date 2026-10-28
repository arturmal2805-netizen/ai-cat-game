import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {batchModelSteps} from './model-batching.js';
import {copyGeometryBuffers} from './geometry-tasks.js';
import {runSceneSteps} from './scene-tasks.js';
import {MAGIC_BED_ID,MAGIC_BED_CROPS,MAGIC_BED_SLOTS,magicBedCrop,magicBedSeed,emptyMagicBed} from './magic-bed-data.js';
const TAU=Math.PI*2,templates=new Map(),paints=new Map(),growthMaterials=new Map(),epoch=Math.floor(Date.now()/86400000)*86400000,clock={value:0};
const color=(c,glow=0,glass=false)=>{const key=c+':'+glow+':'+glass;if(!paints.has(key)){const m=new T.MeshPhysicalMaterial({color:c,roughness:glass?.12:.7,metalness:glass?.08:0,clearcoat:glass?.9:.1,transparent:glass,opacity:glass?.67:1,depthWrite:!glass,emissive:c,emissiveIntensity:glow});m.userData.sharedScenery=true;paints.set(key,m);}return paints.get(key);};
function mesh(g,geo,mat,x=0,y=0,z=0,sx=1,sy=sx,sz=sx){const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=!mat.transparent;m.receiveShadow=true;g.add(m);return m;}
const ball=(g,c,x,y,z,sx,sy=sx,sz=sx)=>mesh(g,new T.SphereGeometry(1,14,10),color(c),x,y,z,sx,sy,sz);
function tube(g,points,mat,r=.016){return mesh(g,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),Math.max(12,points.length*3),r,5,false),mat);}
function lathe(points){return new T.LatheGeometry(points.map(p=>new T.Vector2(...p)),24);}
function rawFruit(c){
 const g=new T.Group(),mat=color(c.color,c.kind==='lantern'||c.kind==='golden'?.38:.12,['aqua','emerald','golden'].includes(c.kind)),gold=color(0xffdc76,.4),white=color(0xf6fbff,.55);
 if(c.kind==='cotton'){
  for(let i=0;i<7;i++){const a=i*TAU/7;ball(g,i%2?0xffb4e1:0xf992d2,Math.sin(a)*.19,Math.cos(a)*.15,Math.sin(a*2)*.13,.37,.34,.34);}
  const surface=(a,y)=>{let r=0;for(let l=0;l<7;l++){const t=l*TAU/7,x=Math.sin(t)*.19,z=Math.sin(t*2)*.13,q=1-((y-Math.cos(t)*.15)/.34)**2;if(q<=0)continue;const rx=.37*Math.sqrt(q),rz=.34*Math.sqrt(q),dx=Math.sin(a),dz=Math.cos(a),A=(dx/rx)**2+(dz/rz)**2,B=-2*(dx*x/rx**2+dz*z/rz**2),C=(x/rx)**2+(z/rz)**2-1,D=B*B-4*A*C;if(D>=0)r=Math.max(r,(-B+Math.sqrt(D))/(2*A));}return r+.008;};
  for(let i=0;i<70;i++){const a=i*2.4,y=(i%11-5)*.075,p=[];for(let k=0;k<9;k++){const t=k/8*TAU,angle=a+Math.cos(t)*.065,yy=y+Math.sin(t)*.035,r=surface(angle,yy);p.push([Math.sin(angle)*r,yy,Math.cos(angle)*r]);}tube(g,p,color(i%2?0xffe5f5:0xffc5e8,.12),.008);}
 }else if(c.kind==='heart'){
  // A closed plump fruit, including from the side; never a flat extruded cookie.
  const geo=new T.SphereGeometry(1,32,24),position=geo.attributes.position,colors=[];
  for(let i=0;i<position.count;i++){const x=position.getX(i),y=position.getY(i),z=position.getZ(i),xx=x*.6*(1+.4*y),yy=y*.65-.3*Math.exp(-xx*xx/.045)*T.MathUtils.smoothstep(y,.15,1);position.setXYZ(i,xx,yy,z*.5*(1+y*.12));const tint=new T.Color(0xff8fa6).lerp(new T.Color(0xffd4a4),T.MathUtils.clamp((yy+.5)/1.1,0,1));colors.push(tint.r,tint.g,tint.b);}
  geo.computeVertexNormals();geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));const m=color(0xffffff,.1).clone();m.vertexColors=true;mesh(g,geo,m);
 }else if(c.kind==='lantern'){
  mesh(g,lathe([[.02,-.65],[.16,-.43],[.32,-.12],[.38,.2],[.3,.45],[.12,.57],[.04,.65]]),mat);
  for(let i=0;i<8;i++){const a=i*TAU/8,p=[];for(let k=0;k<9;k++){const y=-.56+k*.14,r=Math.sin((y+.63)/1.3*Math.PI)*.38;p.push([Math.sin(a)*r,y,Math.cos(a)*r]);}tube(g,p,gold,.013);}
 }else if(c.kind==='aqua'){
  const geo=lathe([[0,-.58],[.22,-.53],[.38,-.32],[.42,-.08],[.35,.22],[.2,.5],[.05,.78],[0,.88]]);mesh(g,geo,mat);mesh(g,copyGeometryBuffers(geo),color(0xb9f4ff,.6),0,-.15,0,.25,.3,.25);
  mesh(g,new T.TorusGeometry(.19,.012,6,26),white,0,-.27,.24,1).rotation.x=Math.PI/2;
 }else{
  mesh(g,lathe([[0,-.6],[.19,-.55],[.37,-.32],[.43,.03],[.35,.35],[.2,.52],[.08,.57],[0,.6]]),mat);
  const p=[];for(let i=0;i<=60;i++){const t=i/60,y=-.47+t*.97,r=.435*Math.sqrt(Math.max(.05,1-(y/.65)**2));p.push([Math.sin(t*TAU*2.7)*r,y,Math.cos(t*TAU*2.7)*r]);}tube(g,p,gold,.017);
  if(c.kind==='golden'){const curl=[];for(let i=0;i<=30;i++){const t=i/30*TAU*1.15,r=.19*(1-i/38);curl.push([Math.sin(t)*r,.62+i/80+Math.cos(t)*r,0]);}tube(g,curl,gold,.038);}
 }
 // Small surface gleams are geometry, not a texture or a second render pass.
 if(c.kind!=='cotton')for(let i=0;i<7;i++)mesh(g,new T.SphereGeometry(.024,6,4),white,Math.sin(i*2.7)*.26,-.25+(i%4)*.18,.32);
 return g;
}
function foliage(){const g=new T.Group();mesh(g,new T.CylinderGeometry(.035,.05,1,8),color(0x60894b),0,.5,0);for(let i=0;i<11;i++){const a=i*2.4,m=ball(g,i%2?0x6f9c55:0x8ab36a,Math.sin(a)*.32,.18+(i%3)*.18,Math.cos(a)*.32,.4,.09,.18);m.rotation.y=-a;m.rotation.z=Math.sin(a)*.24;}for(const sign of [-1,1]){tube(g,[[0,.25,0],[sign*.07,.65,sign*.25],[sign*.1,1.05,sign*.85]],color(0x60894b),.025);for(let i=0;i<4;i++){const a=i*TAU/4,m=ball(g,i%2?0x6f9c55:0x8ab36a,Math.sin(a)*.23,.22+i*.09,sign*.5+Math.cos(a)*.22,.34,.075,.17);m.rotation.y=-a;}}for(const [x,y,z]of [[0,.92,.04],[.35,.56,.25],[-.25,.45,-.3]]){for(let i=0;i<5;i++){const a=i*TAU/5,m=ball(g,0xffedd2,x+Math.sin(a)*.085,y+Math.cos(a)*.07,z,.055,.032,.022);m.rotation.z=a;}ball(g,0xffc754,x,y,z+.03,.038);}return g;}
function growthMaterial(base,part,depth=false,anchor=new T.Vector3()){
 const key=base.uuid+':'+part+':'+depth+':'+anchor.toArray().join(',');if(growthMaterials.has(key))return growthMaterials.get(key);
 const m=depth?new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,side:base.side}):base.clone();m.userData.sharedScenery=true;
 m.onBeforeCompile=s=>{s.uniforms.magicNow=clock;s.uniforms.magicAnchor={value:anchor};s.vertexShader='uniform vec3 magicAnchor;uniform float magicNow;attribute vec3 magicPlantTime;varying float magicProgress;\n'+s.vertexShader;
  const factor=part==='seed'?'(1.-smoothstep(.1,.23,p))':part==='foliage'?'smoothstep(.035,.6,p)':'smoothstep(.52,1.,p)';
  s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfloat p=clamp((magicNow-magicPlantTime.x)/max(1.,magicPlantTime.y-magicPlantTime.x),0.,1.);magicProgress=p;float grow='+factor+';transformed=(transformed-magicAnchor)*grow+magicAnchor*smoothstep(.035,.6,p);transformed*=magicPlantTime.z;');
  if(!depth){s.fragmentShader='varying float magicProgress;\n'+s.fragmentShader;if(part==='fruit')s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb=mix(vec3(.46,.64,.3),diffuseColor.rgb,smoothstep(.64,1.,magicProgress));');}
 };m.customProgramCacheKey=()=>`magic-bed-growth-v1-${part}-${depth}`;growthMaterials.set(key,m);return m;
}
const seedGeo=new T.SphereGeometry(1,12,8);
export function magicSeedModel(seedId){const c=magicBedCrop(magicBedSeed(seedId)?.seedCrop),g=new T.Group();if(!c)return g;
 const pouch=mesh(g,new RoundedBoxGeometry(.85,.9,.26,3,.08),color(0xe7cfa8),0,.5,0);pouch.rotation.z=-.08;
 const fruit=rawFruit(c);fruit.scale.setScalar(.42);fruit.position.set(0,.58,.2);g.add(fruit);mesh(g,new T.TorusGeometry(.12,.035,6,16),color(c.color),0,1,0).rotation.x=Math.PI/2;return g;
}
function* bakedTemplate(key,source){
 if(templates.has(key))return templates.get(key);
 const model=yield*batchModelSteps(source,{combineColors:true}),winner=templates.get(key);
 // A different island can preempt this cooperative build. Keep its completed
 // immutable template instead of overwriting/leaking that shared GPU owner.
 if(winner){model.traverse(o=>{o.geometry?.dispose();if(o.material&&!o.material.userData.sharedScenery)o.material.dispose();});}
 else{model.traverse(o=>{if(o.geometry)o.geometry.userData.sharedScenery=true;if(o.material)o.material.userData.sharedScenery=true;});templates.set(key,model);}
 const used=new Set();source.traverse(o=>{if(o.geometry&&!used.has(o.geometry)){used.add(o.geometry);o.geometry.dispose();}if(o.material&&!o.material.userData.sharedScenery)o.material.dispose();});
 return winner||model;
}
export function* magicBedModelSteps(fields=emptyMagicBed()){
 const root=new T.Group(),wood=new T.Group(),batches=[];root.name='Велика магічна грядка';
 if(!templates.has('wood')){
 const box=(x,y,z,w,h,d,c)=>mesh(wood,new RoundedBoxGeometry(w,h,d,2,Math.min(.09,h*.18)),color(c),x,y,z);
 box(0,.08,0,9.65,.18,4.4,0x705039);for(const z of [-2.28,2.28])box(0,.29,z,9.9,.5,.24,0xb17a59);for(const x of [-4.82,4.82])box(x,.29,0,.24,.5,4.7,0xb17a59);for(const x of [-4.8,4.8])for(const z of [-2.25,2.25])box(x,.37,z,.38,.72,.38,0xbc8560);
 for(let r=0;r<6;r++){const x=-3.65+r*1.46;for(let k=0;k<14;k++)ball(wood,k%2?0x805438:0x926344,x,.21,-1.95+k*.3,.5,.12,.25);yield;}
 yield*bakedTemplate('wood',wood);}
 root.add(templates.get('wood').clone(true));yield;
 function addTemplate(source,slots,part,crop){source.updateMatrixWorld(true);source.traverse(o=>{if(!o.isMesh)return;const geo=copyGeometryBuffers(o.geometry);geo.applyMatrix4(o.matrixWorld);const times=new T.InstancedBufferAttribute(new Float32Array(slots.length*3),3);geo.setAttribute('magicPlantTime',times);const m=new T.InstancedMesh(geo,growthMaterial(o.material,part,false,part==='fruit'?new T.Vector3(0,crop.height,0):new T.Vector3()),slots.length);m.customDepthMaterial=growthMaterial(o.material,part,true,part==='fruit'?new T.Vector3(0,crop.height,0):new T.Vector3());m.castShadow=!o.material.transparent;m.receiveShadow=true;const pose=new T.Object3D();for(const [i,s]of slots.entries()){pose.position.set(s.x,.26,s.z);pose.rotation.y=part!=='seed'&&s.side<0?Math.PI:0;pose.scale.setScalar(1);pose.updateMatrix();m.setMatrixAt(i,pose.matrix);}m.computeBoundingSphere();m.boundingSphere.radius+=2;m.name=(crop?.name||'Рослина')+' '+part;root.add(m);batches.push({m,times,slots,part});});}
 const leaves=templates.get('foliage')||(yield*bakedTemplate('foliage',foliage()));addTemplate(leaves,MAGIC_BED_SLOTS,'foliage');yield;
 for(const c of MAGIC_BED_CROPS){
  const slots=MAGIC_BED_SLOTS.filter(s=>s.row===c.row);let fruitTemplate=templates.get('fruit-'+c.kind);
  if(!fruitTemplate){const source=new T.Group(),fruit=rawFruit(c);
  for(let i=0;i<2;i++){const group=new T.Group();for(const original of fruit.children){const clone=new T.Mesh(original.geometry,original.material);clone.position.copy(original.position);clone.rotation.copy(original.rotation);clone.scale.copy(original.scale);group.add(clone);}group.scale.setScalar(.83);group.position.set(i?-.1:.1,c.height, i?-.55:.85);if(i)group.position.y-=.06;source.add(group);}
  fruitTemplate=yield*bakedTemplate('fruit-'+c.kind,source);}
  addTemplate(fruitTemplate,slots,'fruit',c);
  const seed=new T.Group();mesh(seed,seedGeo,color(c.color),0,.06,0,.1,.065,.14);addTemplate(seed,slots,'seed',c);yield;
 }
 let state,lastVisibility=-Infinity;const picked=new Set();
 function syncFields(next){state=next||emptyMagicBed();for(const b of batches){let dirty=false;for(const [i,s]of b.slots.entries()){const c=state[s.index],active=c?.crop===s.crop&&!(b.part==='fruit'&&picked.has(s.index))?1:0,a=Math.fround(((c?.plantedAt||epoch)-epoch)/1000),z=Math.fround(((c?.readyAt||epoch)-epoch)/1000);if(b.times.getX(i)!==a||b.times.getY(i)!==z||b.times.getZ(i)!==active){b.times.setXYZ(i,a,z,active);dirty=true;}}if(dirty)b.times.needsUpdate=true;}lastVisibility=-Infinity;}
 root.userData={id:MAGIC_BED_ID,magicBed:true,duration:7,activityBounds:new T.Box3(new T.Vector3(-9,0,-8),new T.Vector3(9,5,8)),syncFields,setPlantPicked(index,on){on?picked.add(index):picked.delete(index);syncFields(state);},update(){const now=Date.now();clock.value=(now-epoch)/1000;if(now-lastVisibility<1000)return;lastVisibility=now;for(const b of batches)b.m.visible=b.slots.some(s=>{const c=state?.[s.index];if(c?.crop!==s.crop||b.part==='fruit'&&picked.has(s.index))return false;const p=(now-c.plantedAt)/Math.max(1,c.readyAt-c.plantedAt);return b.part==='seed'?p<.25:b.part==='fruit'?p>.45:true;});}};
 syncFields(fields);root.userData.update();return root;
}
export const magicBedModel=(...args)=>runSceneSteps(magicBedModelSteps(...args));
export function magicBedPreview(now=Date.now()){return MAGIC_BED_SLOTS.map(s=>({crop:s.crop,plantedAt:now-600000,readyAt:now-1,cycle:0}));}
export function makeBedFruit(id){const c=magicBedCrop(id),template=templates.get('fruit-'+c.kind);return template?template.clone(true):rawFruit(c);}
