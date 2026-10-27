import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {MAGIC_FRUITS,magicFarm} from './magic-farms-data.js';
const shapes=new Map(),materials=new Map();
export function fruitGeometry(kind){
 if(shapes.has(kind))return shapes.get(kind);
 let g;
 if(kind==='star'){
  const s=new T.Shape();for(let i=0;i<10;i++){const a=i*Math.PI/5+Math.PI/2,r=i%2?.48:1;const x=Math.cos(a)*r,y=Math.sin(a)*r;i?s.lineTo(x,y):s.moveTo(x,y);}s.closePath();
  g=new T.ExtrudeGeometry(s,{depth:.5,bevelEnabled:true,bevelSize:.11,bevelThickness:.1,bevelSegments:2,steps:1});g.translate(0,0,-.25);
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
 const f=MAGIC_FRUITS.find(f=>f.id===id),kind=magicFarm(f.biome).kind,g=new T.Group();
 g.add(new T.Mesh(fruitGeometry(kind),fruitMaterial(id)));
 const core=new T.Mesh(fruitGeometry(kind),fruitMaterial(id,true));core.scale.setScalar(kind==='crystal'?.42:.48);core.position.z=kind==='crystal'?0:.3;g.add(core);return g;
}
