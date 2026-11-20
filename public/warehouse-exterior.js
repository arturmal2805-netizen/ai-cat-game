import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {WAREHOUSE as W} from './mosasaur-expansion-data.js';
// One sealed shell, deliberately no shops, equipped rooms, NPCs or access logic.
export function* warehouseExteriorSteps(){
 const root=new T.Group();root.name='CHICHI WAREHOUSE · SQUISH GAME ZONE · exterior only';root.position.set(W.x,W.y,W.z);
 const stone=new T.MeshStandardMaterial({color:0xe3ddd1,roughness:.66}),gold=new T.MeshStandardMaterial({color:0xcfa54e,metalness:.78,roughness:.25}),glass=new T.MeshStandardMaterial({color:0xc9f0f5,roughness:.12,metalness:.1,transparent:true,opacity:.14,depthWrite:false,side:T.DoubleSide,forceSinglePass:true}),warm=new T.MeshBasicMaterial({color:0xffd58c}),lavender=new T.MeshBasicMaterial({color:0xa49be2});
 const buffers={gold:[],warm:[],lavender:[]};
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
 for(const x of [-105,-90,-60,-30,0,30,60,90,105]){yield;const r=Math.sqrt(3600-Math.max(0,Math.abs(x)-60)**2),points=[];for(let j=0;j<=32;j++){const a=Math.PI*j/32;points.push([x,12+Math.sin(a)*r*.72,Math.cos(a)*r]);}tube('gold',points,.52);if(x===0||Math.abs(x)===90)tube('warm',points.map(([x,y,z])=>[x,y+.16,z]),.13);}
 for(let j=0;j<=8;j++){const a=j*Math.PI/8,points=[];for(let i=0;i<=64;i++){const x=-120+i*240/64,r=Math.sqrt(Math.max(0,3600-Math.max(0,Math.abs(x)-60)**2));points.push([x,12+Math.sin(a)*r*.72,Math.cos(a)*r]);}tube('gold',points,.16);}
 for(const y of [1.1,11.9])tube('gold',wallPoints.map(v=>[v.x,y,v.y]),.35);
 tube('warm',stadium(130,72).getPoints(120).map(v=>[v.x,1.05,v.y]),.15);
 tube('lavender',stadium(123,63).getPoints(120).map(v=>[v.x,.91,v.y]),.1);
 const portal=[];for(let i=0;i<=32;i++){const a=Math.PI*i/32;portal.push([Math.cos(a)*15,2+Math.sin(a)*23,61]);}tube('gold',portal,.8);tube('warm',portal.map(([x,y,z])=>[x,y,z+.3]),.18);
 const entrance=mesh(new T.PlaneGeometry(28,22),glass,'Decorative closed entrance · no access interaction');entrance.position.set(0,12,60.6);
 if(typeof document!=='undefined'){const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;const c=canvas.getContext('2d');c.fillStyle='#152c3b';c.fillRect(0,0,1024,256);c.strokeStyle='#d7b469';c.lineWidth=8;c.strokeRect(8,8,1008,240);c.textAlign='center';c.fillStyle='#ffe1a4';c.font='600 70px sans-serif';c.fillText('CHICHI WAREHOUSE',512,114);c.font='36px sans-serif';c.fillText('SQUISH GAME ZONE',512,187);const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;const sign=mesh(new T.PlaneGeometry(44,11),new T.MeshBasicMaterial({map:texture}),'Warehouse exterior sign');sign.position.set(0,36,49);}
 for(const [key,geometries]of Object.entries(buffers)){yield;mesh(mergeGeometries(geometries),{gold,warm,lavender}[key],key+' structure · one shared batch');geometries.forEach(g=>g.dispose());}
 root.userData={warehouse:true,phase:1,exteriorOnly:true,interiorEquipped:false,interactive:false,dimensions:{width:W.width,depth:W.depth},dispose(){root.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.map?.dispose();o.material.dispose();}});}};return root;
}
