import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {MAGIC_FRUITS,magicFarm} from './magic-farms-data.js';
const shapes=new Map(),materials=new Map();
export function fruitShape(id){
 const f=MAGIC_FRUITS.find(f=>f.id===id);
 if(id==='moonpear'||id==='silverpear')return 'pear';
 if(id==='sugarpeach')return 'peach';
 if(id==='crystalapple')return 'crystal-apple';
 if(id==='amethystplum')return 'crystal-plum';
 if(id==='aurorafruit')return 'star';
 return magicFarm(f.biome).kind;
}
export function fruitGeometry(kind){
 if(shapes.has(kind))return shapes.get(kind);
 let g;
 if(kind==='star'){
  const s=new T.Shape();for(let i=0;i<10;i++){const a=i*Math.PI/5+Math.PI/2,r=i%2?.48:1;const x=Math.cos(a)*r,y=Math.sin(a)*r;i?s.lineTo(x,y):s.moveTo(x,y);}s.closePath();
  g=new T.ExtrudeGeometry(s,{depth:.5,bevelEnabled:true,bevelSize:.11,bevelThickness:.1,bevelSegments:2,steps:1});g.translate(0,0,-.25);
 }else if(kind==='pear'||kind==='peach'||kind==='crystal-apple'||kind==='crystal-plum'){
  const parts=[],crystal=kind.startsWith('crystal');
  for(let i=0;i<(kind==='crystal-plum'?1:2);i++){
   const p=crystal?new T.IcosahedronGeometry(1,1):new T.SphereGeometry(1,14,10);
   if(kind==='pear'){p.scale(i?.55:.82,i?.72:.75,i?.55:.78);p.translate(0,i?.65:-.15,0);}
   else if(kind==='crystal-plum')p.scale(.72,1.1,.72);
   else {p.scale(.65,.85,.86);p.translate(i?.35:-.35,0,0);}parts.push(p);
  }
  let stem=new T.CylinderGeometry(.08,.11,.42,6);stem.translate(0,kind==='pear'?1.45:1.05,0);if(crystal){const indexed=stem;stem=stem.toNonIndexed();indexed.dispose();}parts.push(stem);
  g=mergeGeometries(parts);parts.forEach(p=>p.dispose());
 }else if(kind==='cloud'||kind==='moon'){
  const parts=[];for(let i=0;i<(kind==='cloud'?5:9);i++){
   const a=i*Math.PI*2/(kind==='cloud'?5:9),p=new T.SphereGeometry(1,12,8);
   if(kind==='cloud'){p.scale(.65,.65,.58);p.translate(Math.cos(a)*.46,Math.sin(a)*.3,0);}
   else{p.scale(.54,.9,.54);p.translate(Math.sin(a)*.42,0,Math.cos(a)*.42);}parts.push(p);
  }g=mergeGeometries(parts);parts.forEach(p=>p.dispose());
 }else g=new T.IcosahedronGeometry(1,1);
 g.userData.sharedScenery=true;shapes.set(kind,g);return g;
}
export function fruitMaterial(id,core=false){
 const key=id+':'+core;if(materials.has(key))return materials.get(key);const f=MAGIC_FRUITS.find(f=>f.id===id),crystal=magicFarm(f.biome).kind==='crystal';
 const m=new T.MeshStandardMaterial({color:core?f.core:f.color,emissive:core?f.core:f.color,emissiveIntensity:core?.7:.1,roughness:crystal?.15:.38,metalness:crystal?.14:.02,transparent:crystal&&!core,opacity:crystal&&!core?.58:1,depthWrite:!crystal||core});m.userData.sharedScenery=true;materials.set(key,m);return m;
}
export function makeMagicFruit(id){
 const f=MAGIC_FRUITS.find(f=>f.id===id),kind=fruitShape(id),g=new T.Group();
 g.add(new T.Mesh(fruitGeometry(kind),fruitMaterial(id)));
 const crystal=magicFarm(f.biome).kind==='crystal',core=new T.Mesh(fruitGeometry(kind),fruitMaterial(id,true));core.scale.setScalar(crystal?.42:.48);core.position.z=crystal?0:.3;g.add(core);return g;
}
