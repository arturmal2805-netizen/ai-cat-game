import {warehouseEntrySteps} from './warehouse-entry-model.js';
import {warehouseApertureSteps} from './warehouse-aperture.js';
import {WAREHOUSE_ACCESS as A} from './warehouse-access-data.js';
import {warehouseFacadeSteps,litWarehouseMaterial} from './warehouse-facade.js';
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {WAREHOUSE as W} from './mosasaur-expansion-data.js';
// One sealed shell, deliberately no shops, equipped rooms, NPCs or access logic.
export function* warehouseExteriorSteps(){
 const root=new T.Group();root.name='CHICHI WAREHOUSE · SQUISH GAME ZONE · submarine entrance';root.position.set(W.x,W.y,W.z);
 const stone=new T.MeshStandardMaterial({color:0xe3ddd1,roughness:.66}),gold=new T.MeshStandardMaterial({color:0xcfa54e,metalness:.62,roughness:.25,emissive:0x8d5b20,emissiveIntensity:.16}),glass=new T.MeshStandardMaterial({color:0xc9f0f5,roughness:.12,metalness:.1,transparent:true,opacity:.14,depthWrite:false,side:T.DoubleSide,forceSinglePass:true}),warm=new T.MeshBasicMaterial({color:0xffd58c,fog:false}),lavender=new T.MeshBasicMaterial({color:0xa49be2,fog:false});
 const bronze=new T.MeshStandardMaterial({color:0x876d48,metalness:.78,roughness:.3}),enamel=new T.MeshStandardMaterial({color:0x183949,metalness:.35,roughness:.26});
 for(const material of [gold,stone,bronze,enamel])litWarehouseMaterial(material);
 const palette={gold,warm,lavender,stone,bronze,enamel},buffers=Object.fromEntries(Object.keys(palette).map(k=>[k,[]]));
 const tube=(key,points,r=.3)=>{const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));buffers[key].push(new T.TubeGeometry(curve,Math.max(12,points.length*2),r,6,false));};
 const mesh=(g,m,name)=>{const o=new T.Mesh(g,m);o.name=name;o.castShadow=!m.transparent;o.receiveShadow=true;root.add(o);return o;};
 const stadium=(rx,rz)=>{const s=new T.Shape(),c=rx-rz;s.moveTo(-c,-rz);s.lineTo(c,-rz);s.absarc(c,0,rz,-Math.PI/2,Math.PI/2,false);s.lineTo(-c,rz);s.absarc(-c,0,rz,Math.PI/2,Math.PI*1.5,false);s.closePath();return s;};
 const slab=new T.ExtrudeGeometry(stadium(132,74),{depth:2,bevelEnabled:true,bevelSize:.35,bevelThickness:.3,bevelSegments:2,steps:1,curveSegments:48});slab.rotateX(-Math.PI/2);slab.translate(0,-1.2,0);mesh(slab,stone,'Seafloor foundation · pale stone');
 const floor=new T.ShapeGeometry(stadium(119.4,59.4),48);floor.rotateX(-Math.PI/2);floor.translate(0,.86,0);mesh(floor,stone,'Neutral sealed base · no interior equipment');
 const p=[],uv=[],idx=[],nx=64,nt=32;
 for(let i=0;i<=nx;i++){const x=-120+240*i/nx,r=Math.sqrt(Math.max(0,3600-Math.max(0,Math.abs(x)-60)**2));for(let j=0;j<=nt;j++){const a=Math.PI*j/nt;p.push(x,12+Math.sin(a)*r*.72,Math.cos(a)*r);uv.push(i/nx,j/nt);if(i<nx&&j<nt){const n=i*(nt+1)+j;idx.push(n,n+1,n+nt+1,n+1,n+nt+2,n+nt+1);}}}
 const roof=new T.BufferGeometry();roof.setAttribute('position',new T.Float32BufferAttribute(p,3));roof.setAttribute('uv',new T.Float32BufferAttribute(uv,2));roof.setIndex(idx);roof.computeVertexNormals();
 const wallPoints=stadium(120,60).getPoints(96),wp=[],wu=[],wi=[];
 for(let i=0;i<wallPoints.length;i++){const v=wallPoints[i];wp.push(v.x,.85,v.y,v.x,12,v.y);wu.push(i/wallPoints.length,0,i/wallPoints.length,1);if(i<wallPoints.length-1){const n=i*2;wi.push(n,n+1,n+2,n+1,n+3,n+2);}if(i%8===0)tube('gold',[[v.x,.8,v.y],[v.x,12,v.y]],.16);}
 const walls=new T.BufferGeometry();walls.setAttribute('position',new T.Float32BufferAttribute(wp,3));walls.setAttribute('uv',new T.Float32BufferAttribute(wu,2));walls.setIndex(wi);walls.computeVertexNormals();mesh(mergeGeometries([roof,walls]),glass,'Continuous watertight glazing · vaulted roof and walls');roof.dispose();walls.dispose();
 for(const x of [-105,-90,-60,-30,0,30,60,90,105]){yield;const r=Math.sqrt(3600-Math.max(0,Math.abs(x)-60)**2),points=[];for(let j=0;j<=32;j++){const a=Math.PI*j/32;points.push([x,12+Math.sin(a)*r*.72,Math.cos(a)*r]);}tube('gold',points,.52);if(x===0||Math.abs(x)===90)tube('warm',points.map(([x,y,z])=>{const h=(y-12)/.72,r=Math.hypot(h,z)||1;return[x,y+.7*h/r,z+.7*z/r];}),.13);}
 for(let j=0;j<=8;j++){const a=j*Math.PI/8,points=[];for(let i=0;i<=64;i++){const x=-120+i*240/64,r=Math.sqrt(Math.max(0,3600-Math.max(0,Math.abs(x)-60)**2));points.push([x,12+Math.sin(a)*r*.72,Math.cos(a)*r]);}tube('gold',points,.16);}
 for(const y of [1.1,11.9])tube('gold',wallPoints.map(v=>[v.x,y,v.y]),.35);
 tube('warm',stadium(130,72).getPoints(120).map(v=>[v.x,1.05,v.y]),.15);
 tube('lavender',stadium(123,63).getPoints(120).map(v=>[v.x,.91,v.y]),.1);
 const facade=yield* warehouseFacadeSteps({tube,buffers,stadium});
 const portal=[];for(let i=0;i<=32;i++){const a=Math.PI*i/32;portal.push([Math.cos(a)*15,2+Math.sin(a)*23,61]);}tube('gold',portal,.8);tube('warm',portal.map(([x,y,z])=>[x,y,z+1.05]),.18);
 const door=new T.Shape();door.moveTo(-15,0);door.lineTo(-15,2);door.absellipse(0,2,15,23,Math.PI,0,true);door.lineTo(15,0);door.closePath();const entrance=mesh(new T.ExtrudeGeometry(door,{depth:6,bevelEnabled:false,curveSegments:32}),glass,'Decorative sealed arched entrance · no access interaction');entrance.position.set(0,1,58);
 for(const z of [58,64])tube('gold',portal.map(([x,y])=>[x,y,z]),.55);
 if(typeof document!=='undefined'){const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;const c=canvas.getContext('2d');const bg=c.createLinearGradient(0,0,0,256);bg.addColorStop(0,'#234757');bg.addColorStop(1,'#0c2431');c.fillStyle=bg;c.fillRect(0,0,1024,256);c.strokeStyle='#d7b469';c.lineWidth=8;c.strokeRect(8,8,1008,240);c.lineWidth=2;c.strokeRect(22,22,980,212);c.textAlign='center';c.fillStyle='#ffe1a4';c.font='600 70px sans-serif';c.fillText('CHICHI WAREHOUSE',512,114);c.font='36px sans-serif';c.fillText('SQUISH GAME ZONE',512,187);const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;const sign=mesh(new T.PlaneGeometry(44,11),new T.MeshBasicMaterial({map:texture,fog:false}),'Warehouse exterior sign');sign.position.set(0,37.5,63.5);}
 for(const [key,geometries]of Object.entries(buffers)){yield;if(geometries.length)mesh(mergeGeometries(geometries),palette[key],key+' structure · one shared batch');geometries.forEach(g=>g.dispose());}
 // Author the larger shell into its own geometry; no island/old-building scale.
 const sx=W.width/240,sy=W.heightScale||1,sz=W.depth/120,anchor=.86;root.traverse(o=>{if(o.isMesh){o.geometry.scale(sx,sy,sz);o.position.x*=sx;o.position.y=anchor+(o.position.y-anchor)*sy;o.position.z*=sz;}});
 const aperture=new T.Box3(new T.Vector3(...A.aperture.min),new T.Vector3(...A.aperture.max));
 for(const child of root.children)if(child.isMesh)yield* warehouseApertureSteps(child,aperture);
 const entry=yield* warehouseEntrySteps();root.add(entry);
 root.userData={warehouse:true,phase:2,exteriorOnly:false,interiorEquipped:false,interactive:true,entry,dimensions:{width:W.width,depth:W.depth,heightScale:W.heightScale||1},facade,dispose(){const geometries=new Set(),materials=new Set(),textures=new Set();root.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);if(m.map)textures.add(m.map);}}});for(const g of geometries)g.dispose();for(const t of textures)t.dispose();for(const m of materials)m.dispose();}};return root;
}
