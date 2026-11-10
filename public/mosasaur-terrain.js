import * as T from 'three';
import {shape,line,surfaceTexture} from './fantasy-scenery.js';
import {batchModelSteps} from './model-batching.js';
import {applyUnderwaterLighting} from './water-shading.js';
import {mosaBedY,mosaNaturalBedY,MOSA_CAVE_LAYOUT,MOSA_SEA,MOSA_REEF_TERRACES} from './mosasaur-data.js';
import {cliffGeometry} from './showcase-geology.js';
import {oceanGuardianSteps} from './mosasaur-ruin-sculpt.js';
export const MOSA_CAVES=MOSA_CAVE_LAYOUT.map(c=>({...c,y:mosaNaturalBedY(c.x,c.z)+.7}));
export const MOSA_RUINS=[{id:'sunken-temple',x:-39,z:53,y:mosaBedY(-39,53)+.3},{id:'abyss-gate',x:12,z:-49,y:mosaBedY(12,-49)+.3}];
export const MOSA_REEF_ARCHES=MOSA_REEF_TERRACES.filter((_,i)=>i%4===0).map((c,i)=>({id:'living-reef-arch-'+i,x:c.x,z:c.z,radius:8.5,depth:3.5,y:mosaBedY(c.x,c.z)+.25}));
export const MOSA_GUARDIAN=(()=>{const c=MOSA_REEF_TERRACES[3];return {id:'sunken-guardian',x:c.x+2,z:c.z-2,y:mosaBedY(c.x+2,c.z-2),radius:3.5,height:9};})();
export function mosaTerrainObstacles(){
 const obstacles=[];
 for(const c of MOSA_CAVES){for(let row=0;row<4;row++){const z=c.z-row*4;for(let j=0;j<8;j++){const a=j*Math.PI/8,b=(j+1)*Math.PI/8;obstacles.push({id:c.id,kind:'capsule',a:[c.x+Math.cos(a)*c.radius,c.y+Math.sin(a)*c.radius,z],b:[c.x+Math.cos(b)*c.radius,c.y+Math.sin(b)*c.radius,z],radius:1.2});}}}
 for(const r of MOSA_RUINS)for(let i=0;i<8;i++){const a=i*Math.PI/4;obstacles.push({id:r.id,kind:'capsule',a:[r.x+Math.cos(a)*6,r.y,r.z+Math.sin(a)*6],b:[r.x+Math.cos(a)*6,r.y+7,r.z+Math.sin(a)*6],radius:.8});}
 for(const c of MOSA_REEF_ARCHES)for(let j=0;j<16;j++){const a=j*Math.PI/16,b=(j+1)*Math.PI/16;obstacles.push({id:c.id,kind:'capsule',a:[c.x+Math.cos(a)*c.radius,c.y+Math.sin(a)*c.radius,c.z],b:[c.x+Math.cos(b)*c.radius,c.y+Math.sin(b)*c.radius,c.z],radius:2.1});}
 const p=MOSA_GUARDIAN;obstacles.push({id:p.id,kind:'capsule',a:[p.x,p.y,p.z],b:[p.x,p.y+p.height,p.z],radius:p.radius});
 return obstacles;
}
function caveShell(c){
 const positions=[],uv=[],colors=[],indices=[],sides=48,rings=12,tint=new T.Color();
 for(let layer=0;layer<2;layer++)for(let row=0;row<=rings;row++)for(let j=0;j<=sides;j++){
  const a=j*Math.PI/sides,z=c.z+1-row/rings*(c.depth+2),rough=.12*Math.sin(j*.78+row*1.7)+.08*Math.cos(j*1.3-row*.9),r=c.radius+(layer?1.8+rough*3:rough*.35);
  positions.push(c.x+Math.cos(a)*r,c.y+Math.sin(a)*r,z);uv.push(a*c.radius*.18,row*.35);tint.set(layer?0x789a9b:0x587986).multiplyScalar(.9+.12*Math.sin(j*.7+row*.5));colors.push(tint.r,tint.g,tint.b);
 }
 const stride=sides+1,layerStride=(rings+1)*stride;
 for(let layer=0;layer<2;layer++)for(let row=0;row<rings;row++)for(let j=0;j<sides;j++){
  const a=layer*layerStride+row*stride+j,b=a+stride;if(layer)indices.push(a,b,a+1,a+1,b,b+1);else indices.push(a,a+1,b,a+1,b+1,b);
 }
 for(const row of [0,rings])for(let j=0;j<sides;j++){const a=row*stride+j,b=a+layerStride;indices.push(a,b,a+1,a+1,b,b+1);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
export function* mosaTerrainSteps(){
 const root=new T.Group(),source=new T.Group(),clock={value:0};root.name='Explorable ocean caves, coral terraces and ancient ruins';
 // Broad eroded ledges and broken columns follow the physical seabed. Their
 // collars overlap the bed; no suspended caps or cylindrical pillar islands.
 for(const [i,c]of MOSA_REEF_TERRACES.entries()){
  yield;for(let j=0;j<9;j++){
   const a=j*2.399+i,r=c.radius*(.65+(j%3)*.12),x=c.x+Math.cos(a)*r,z=c.z+Math.sin(a)*r,y=mosaBedY(x,z),h=1.1+j%3*.6;
   const rock=new T.Mesh(cliffGeometry(h+1,1.5+j%3*.55,i+j*.8,20,8),new T.MeshStandardMaterial({color:[0x789f9b,0x9fb2a0,0x6d919b][j%3],vertexColors:true,map:surfaceTexture('stone'),roughness:.85}));rock.position.set(x,y-.7,z);source.add(rock);
  }
 }
 for(const c of MOSA_CAVES){
  source.add(new T.Mesh(caveShell(c),new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,map:surfaceTexture('stone'),roughness:.88,side:T.DoubleSide})));
  for(let row=0;row<4;row++){yield;const z=c.z-row*4;
   for(const side of [-1,1])shape(source,'stone',0x607b92,c.x+side*(c.radius+1),c.y+1,z,2.5,3,2.2);
  }
  // The chamber is hollow: a real opening with navigable floor, not a dark decal.
  const floor=new T.Mesh(new T.BoxGeometry(c.radius*2,.4,c.depth),new T.MeshStandardMaterial({color:0xb3c5be,map:surfaceTexture('stone'),roughness:.83}));floor.position.set(c.x,c.y-.3,c.z-c.depth/2+2);source.add(floor);
  for(let i=0;i<10;i++){const a=i*2.399;shape(source,'crystal',c.color,c.x+Math.sin(a)*(c.radius-2),c.y+1,c.z-2-i*1.2,.55,1.7+i%3*.6,.55);}
 }
 for(const c of MOSA_REEF_ARCHES){yield;source.add(new T.Mesh(caveShell(c),new T.MeshStandardMaterial({color:0xcbd5b6,vertexColors:true,map:surfaceTexture('stone'),roughness:.86,side:T.DoubleSide})));}
 const guardian=yield* oceanGuardianSteps();guardian.position.set(MOSA_GUARDIAN.x,MOSA_GUARDIAN.y,MOSA_GUARDIAN.z);guardian.scale.setScalar(1.5);guardian.rotation.y=Math.atan2(-MOSA_GUARDIAN.x,-MOSA_GUARDIAN.z);source.add(guardian);
 for(const r of MOSA_RUINS){yield;
  for(let i=0;i<8;i++){const a=i*Math.PI/4,x=r.x+Math.cos(a)*6,z=r.z+Math.sin(a)*6;
   shape(source,'pole',0xb4c4bd,x,r.y+3.5,z,.65,7,.65);shape(source,'cube',0xd8d7b8,x,r.y+.2,z,1.8,.5,1.8);shape(source,'cube',0xc2cbb9,x,r.y+7,z,1.8,.45,1.8);
   if(i%2===0){const stone=shape(source,'cube',0x829d91,x+1.5,r.y+.5,z+1.4,2.1,.8,1.5);stone.rotation.y=a;}
  }
  // Fallen stair blocks and the open lintel keep the temple explorable.
  for(let i=0;i<5;i++)shape(source,'cube',0xa1b6ac,r.x,r.y+.2+i*.22,r.z+9-i,6-i*.3,.4,1.1);
  line(source,[r.x-6,r.y+7,r.z],[r.x+6,r.y+7,r.z],0xc7cbb4,.65);
 }
 const baked=yield* batchModelSteps(source,{combineColors:true});root.add(baked);
 source.traverse(o=>{if(o.isMesh){if(!o.geometry.userData.sharedScenery)o.geometry.dispose();if(!o.material.userData.sharedScenery)o.material.dispose();}});
 baked.traverse(m=>{if(m.isMesh)applyUnderwaterLighting(m.material,clock,0x3fd0ed,{level:{value:MOSA_SEA.surfaceY},refract:true});});
 root.userData.obstacles=mosaTerrainObstacles();root.userData.caves=MOSA_CAVES;root.userData.ruins=MOSA_RUINS;root.userData.reefArches=MOSA_REEF_ARCHES;root.userData.update=(time,reduced=false)=>{clock.value=reduced?0:time;};return root;
}
