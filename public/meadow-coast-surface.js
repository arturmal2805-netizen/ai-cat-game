import * as T from 'three';
import {coastMeadowCover} from './meadow-coast-field.js';
import {applyMeadowPatch} from './meadow-patch.js';

// Recover the real authored cap boundaries, then add fixed radial rows for the
// soil field. Original boundary vertices and every side/bottom face survive.
export function* coastMeadowGeometrySteps(source){
 const p=source.attributes.position,n=source.attributes.normal,uv=source.attributes.uv,index=source.index,legacy=[],nodes=new Map(),edges=new Map();let topY=null;
 const vertex=id=>[p.getX(id),p.getY(id),p.getZ(id),n.getX(id),n.getY(id),n.getZ(id),uv.getX(id),uv.getY(id),0];
 const node=id=>{const x=p.getX(id),z=p.getZ(id),key=x+':'+z;if(!nodes.has(key))nodes.set(key,{key,x,z,links:[]});return key;};
 for(let i=0;i<(index?.count??p.count);i+=3){
  if((i%768)===0)yield;
  const ids=[0,1,2].map(j=>index?index.getX(i+j):i+j);
  if(ids.some(id=>n.getY(id)<.9)){for(const id of ids)legacy.push(...vertex(id));continue;}
  topY=p.getY(ids[0]);const keys=ids.map(node);
  for(let j=0;j<3;j++){const a=keys[j],b=keys[(j+1)%3],key=a<b?a+'|'+b:b+'|'+a,e=edges.get(key);if(e)e.count++;else edges.set(key,{a,b,count:1});}
 }
 for(const e of edges.values())if(e.count===1){nodes.get(e.a).links.push(e.b);nodes.get(e.b).links.push(e.a);}
 const loops=[],seen=new Set();
 for(const start of nodes.values()){
  if(!start.links.length||seen.has(start.key))continue;
  const loop=[];let previous=null,current=start;
  do{if(current.links.length!==2)throw Error('Invalid coast cap boundary');loop.push(current);seen.add(current.key);const next=current.links.find(key=>key!==previous);previous=current.key;current=nodes.get(next);}while(current!==start&&!seen.has(current.key));
  if(current!==start)throw Error('Open coast cap boundary');loops.push(loop);
 }
 const area=loop=>Math.abs(loop.reduce((s,p,i)=>{const q=loop[(i+1)%loop.length];return s+p.x*q.z-q.x*p.z;},0)*.5);
 loops.sort((a,b)=>area(b)-area(a));if(loops.length!==2||topY===null)throw Error('Expected the native shore and one ocean opening');
 const [outer,inner]=loops,normalize=a=>(a+Math.PI*2)%(Math.PI*2),raw=[];
 for(let i=0;i<768;i++)raw.push({angle:i*Math.PI*2/768});
 for(const [kind,loop]of [['outer',outer],['inner',inner]])for(const point of loop)raw.push({angle:normalize(Math.atan2(point.z,point.x)),[kind]:point});
 raw.sort((a,b)=>a.angle-b.angle);const angles=[];
 for(const record of raw){const previous=angles.at(-1);if(previous&&record.angle-previous.angle<1e-6)Object.assign(previous,record);else angles.push({...record});}
 if(angles.length>1&&angles[0].angle+Math.PI*2-angles.at(-1).angle<1e-6){Object.assign(angles[0],angles.pop(),{angle:angles[0].angle});}
 function rayPoint(loop,angle){
  const dx=Math.cos(angle),dz=Math.sin(angle);let nearest=Infinity;
  for(let i=0;i<loop.length;i++){const a=loop[i],b=loop[(i+1)%loop.length],ex=b.x-a.x,ez=b.z-a.z,det=dx*ez-dz*ex;if(Math.abs(det)<1e-12)continue;const r=(a.x*ez-a.z*ex)/det,u=(a.x*dz-a.z*dx)/det;if(r>=0&&u>=-1e-9&&u<=1+1e-9)nearest=Math.min(nearest,r);}
  if(!Number.isFinite(nearest))throw Error('Coast cap ray missed its boundary');return {x:dx*nearest,z:dz*nearest};
 }
 const fixed=[0,2,4,6,8,9,10,11,12,13,14,16,20,25,30,35,40,45,50,55,60],ringCount=fixed.length+8,cap=[],indices=[];
 for(let i=0;i<angles.length;i++){
  if((i&15)===0)yield;
  const a=angles[i],start=a.inner||rayPoint(inner,a.angle),end=a.outer||rayPoint(outer,a.angle),width=Math.hypot(end.x-start.x,end.z-start.z);
  if(width<=60)throw Error('Unexpectedly narrow native coast');
  for(let ring=0;ring<ringCount;ring++){
   const distance=ring<fixed.length?fixed[ring]:60+(width-60)*(ring-fixed.length+1)/8,t=distance/width,x=ring===ringCount-1?end.x:start.x+(end.x-start.x)*t,z=ring===ringCount-1?end.z:start.z+(end.z-start.z)*t;
   cap.push(x,topY,z,0,1,0,x,-z,coastMeadowCover(x,z).soil);
  }
 }
 // Rays rotate counter-clockwise in XZ. Choose the winding whose Y normal is up.
 for(let i=0;i<angles.length;i++)for(let ring=0;ring<ringCount-1;ring++){const a=i*ringCount+ring,b=((i+1)%angles.length)*ringCount+ring;indices.push(a,b,a+1,a+1,b,b+1);}
 const stride=9,legacyCount=legacy.length/stride,all=new Float32Array(legacy.length+cap.length);all.set(legacy);all.set(cap,legacy.length);
 const geometry=new T.BufferGeometry(),layout=[['position',3,0],['normal',3,3],['uv',2,6],['aMeadowSoil',1,8]];
 for(const [name,size,offset]of layout){yield;const data=new Float32Array(all.length/stride*size);for(let i=0;i<all.length/stride;i++)for(let k=0;k<size;k++)data[i*size+k]=all[i*stride+offset+k];geometry.setAttribute(name,new T.BufferAttribute(data,size));}
 geometry.setIndex([...Array.from({length:legacyCount},(_,i)=>i),...indices.map(i=>i+legacyCount)]);geometry.addGroup(0,legacyCount,0);geometry.addGroup(legacyCount,indices.length,1);geometry.computeBoundingBox();geometry.computeBoundingSphere();
 geometry.userData.coastMeadow={angles:angles.length,rings:ringCount,originalTopArea:area(outer)-area(inner),outerBoundary:outer.map(p=>[p.x,p.z]),innerBoundary:inner.map(p=>[p.x,p.z])};
 return geometry;
}
export function* installCoastMeadowSurfaceSteps(mesh){
 const material=mesh.material.clone();if(!applyMeadowPatch(material,{vertexCover:true})){material.dispose();return false;}
 let geometry;try{geometry=yield* coastMeadowGeometrySteps(mesh.geometry);}catch(error){material.dispose();throw error;}
 const original=mesh.geometry;mesh.geometry=geometry;mesh.material=[mesh.material,material];original.dispose();return true;
}
