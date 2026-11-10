import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {shape,line} from './fantasy-scenery.js';
import {mosaBedY,MOSA_REEF_TERRACES,MOSA_SEA} from './mosasaur-data.js';
import {applyUnderwaterLighting} from './water-shading.js';
function anatomy(kind){
 const g=new T.Group();
 if(kind===0){
  shape(g,'sphere',0x518eab,0,0,0,.58,.20,.84);
  for(const side of [-1,1]){
   const wing=new T.Shape();wing.moveTo(side*.25,-.65);wing.bezierCurveTo(side*1.0,-.55,side*2.0,-.1,side*2.15,.27);wing.bezierCurveTo(side*1.3,.4,side*.55,.75,side*.25,.7);wing.closePath();
   const geo=new T.ExtrudeGeometry(wing,{depth:.055,bevelEnabled:true,bevelSegments:2,bevelSize:.05,bevelThickness:.04,curveSegments:20});geo.rotateX(-Math.PI/2);
   g.add(new T.Mesh(geo,new T.MeshStandardMaterial({color:0x4c82a2})));shape(g,'sphere',0xf5dfac,side*.26,.17,.44,.08,.07,.07);shape(g,'sphere',0x173543,side*.26,.20,.48,.04,.04,.035);
  }
  const tail=new T.CatmullRomCurve3([[0,0,-.55],[.08,-.03,-1.3],[.30,.01,-2.1],[.43,.08,-2.5]].map(p=>new T.Vector3(...p)));g.add(new T.Mesh(new T.TubeGeometry(tail,26,.028,6,false),new T.MeshStandardMaterial({color:0x36718e})));
 }else if(kind===1){
  const bell=shape(g,'dome',0xdca5ef,0,.25,0,.66,.48,.66);for(let j=0;j<8;j++){const a=j*Math.PI/4,x=Math.cos(a)*.40,z=Math.sin(a)*.4,curve=new T.CatmullRomCurve3([[x,.14,z],[x*1.1,-.35,z*1.1],[x*.8,-.85,z*.8],[x*1.2,-1.5,z*1.2]].map(p=>new T.Vector3(...p)));g.add(new T.Mesh(new T.TubeGeometry(curve,22,.022,5,false),new T.MeshStandardMaterial({color:j%2?0x71d9e7:0xf3b1e6})));}
  for(const side of [-1,1]){shape(g,'sphere',0x203751,side*.19,.25,.58,.075,.10,.045);shape(g,'sphere',0xffffff,side*.21,.28,.615,.024,.026,.014);}
 }else{
  shape(g,'sphere',0xe68b62,0,.15,0,.46,.25,.35);for(const side of [-1,1]){
   for(let j=0;j<4;j++){const z=(j-1.5)*.14;line(g,[side*.25,.17,z],[side*.65,.15,z+.1],0xe6a273,.04);line(g,[side*.65,.15,z+.1],[side*.7,-.01,z+.22],0xe8a076,.035);}
   line(g,[side*.2,.2,.21],[side*.49,.4,.42],0xdb805c,.075);shape(g,'sphere',0xffb47e,side*.55,.43,.44,.15,.16,.13);line(g,[side*.18,.3,.22],[side*.20,.47,.28],0x794d47,.025);shape(g,'sphere',0x253b49,side*.2,.5,.28,.058,.065,.058);shape(g,'sphere',0xffffff,side*.21,.52,.32,.017,.02,.012);
  }
 }
 g.updateMatrixWorld(true);const parts=[];
 g.traverse(m=>{if(!m.isMesh)return;let p=m.geometry.clone();p.applyMatrix4(m.matrixWorld);if(p.index){const old=p;p=p.toNonIndexed();old.dispose();}const count=p.attributes.position.count,colors=new Float32Array(count*3);for(let i=0;i<count;i++)colors.set(m.material.color.toArray(),i*3);p.setAttribute('color',new T.BufferAttribute(colors,3));p.setAttribute('aFaunaKind',new T.BufferAttribute(new Float32Array(count).fill(kind),1));for(const name of Object.keys(p.attributes))if(!['position','normal','uv','color','aFaunaKind'].includes(name))p.deleteAttribute(name);parts.push(p);});
 const geometry=mergeGeometries(parts);for(const p of parts)p.dispose();g.traverse(m=>{if(m.isMesh&&!m.geometry.userData.sharedScenery)m.geometry.dispose();if(m.isMesh&&!m.material.userData.sharedScenery)m.material.dispose();});return geometry;
}
export function* mosaMarineLifeSteps(){
 const root=new T.Group(),clock={value:0},motion={value:1},dummy=new T.Object3D();root.name='Living reef · six rays, eight luminous jellies and twelve tiny crabs';
 const mat=new T.MeshStandardMaterial({vertexColors:true,roughness:.48,emissive:0x264857,emissiveIntensity:.08});
 const deformation=`
  float faunaPhase=uFaunaTime*(aFaunaKind<.5?1.8:1.15)+instanceMatrix[3].x*.17;
  float faunaSpan=max(0.,abs(position.x)-.2),faunaFlap=sin(faunaPhase)*uFaunaMotion;
 `;
 mat.onBeforeCompile=shader=>{shader.uniforms.uFaunaTime=clock;shader.uniforms.uFaunaMotion=motion;shader.vertexShader='uniform float uFaunaTime;uniform float uFaunaMotion;attribute float aFaunaKind;\n'+shader.vertexShader.replace('#include <beginnormal_vertex>',`#include <beginnormal_vertex>${deformation}
  if(aFaunaKind<.5){objectNormal.x-=sign(position.x)*sqrt(faunaSpan)*.285*faunaFlap*objectNormal.y;}
  else if(aFaunaKind<1.5&&position.y<.05){float k=.06*(cos(faunaPhase+position.y*4.)*4.*(.1-position.y)-sin(faunaPhase+position.y*4.))*uFaunaMotion;objectNormal.y-=k*objectNormal.x;}objectNormal=normalize(objectNormal);`)
 .replace('#include <begin_vertex>',`#include <begin_vertex>
  if(aFaunaKind<.5){transformed.y+=pow(faunaSpan,1.5)*.19*faunaFlap;transformed.z+=sin(faunaPhase*.22)*.8*uFaunaMotion;}
  else if(aFaunaKind<1.5){transformed.y+=sin(faunaPhase*.65)*.4*uFaunaMotion;if(position.y<.05)transformed.x+=sin(faunaPhase+position.y*4.)*(.1-position.y)*.06*uFaunaMotion;}
 `);};
 mat.customProgramCacheKey=()=> 'living-marine-reef-v1';applyUnderwaterLighting(mat,clock,0x52cfdf,{level:{value:MOSA_SEA.surfaceY}});
 for(const [kind,count,scale]of [[0,6,1.6],[1,8,1.2],[2,12,.9]]){
  yield;const mesh=new T.InstancedMesh(anatomy(kind),mat,count);mesh.name=['Gentle spotted rays','Luminous little jellyfish','Reef shore crabs'][kind];
  for(let i=0;i<count;i++){
   const c=MOSA_REEF_TERRACES[(i*3+kind)%12],a=i*2.399,x=c.x+Math.cos(a)*c.radius*.35,z=c.z+Math.sin(a)*c.radius*.35;
   let floor=mosaBedY(x,z);for(let j=0;j<8;j++)floor=Math.max(floor,mosaBedY(x+Math.cos(j*Math.PI/4)*4,z+Math.sin(j*Math.PI/4)*4));
   dummy.position.set(x,kind===2?mosaBedY(x,z)+.05:Math.max(floor+3,-18),z);dummy.rotation.set(0,a,0);dummy.scale.setScalar(scale);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();mesh.boundingSphere.radius+=2;root.add(mesh);
 }
 root.userData.update=(time,reduced=false)=>{clock.value=reduced?0:time;motion.value=reduced?0:1;};return root;
}
