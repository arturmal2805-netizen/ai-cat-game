import * as T from 'three';
import {MALL_LAYOUT,mallFloorOutline,mallUpperFloorOutline,mallAtriumRail,mallBuildingFootprintDistance} from './mall-layout.js';

function floorSlab(kit,ground){
  kit.floorSlabs||=new Map();if(kit.floorSlabs.has(ground))return kit.floorSlabs.get(ground);
  const points=ground?mallFloorOutline():mallUpperFloorOutline(),shape=new T.Shape();
  points.forEach((p,i)=>i?shape.lineTo(p.x,-p.z):shape.moveTo(p.x,-p.z));shape.closePath();
  const geometry=new T.ExtrudeGeometry(shape,{depth:.48,bevelEnabled:false,curveSegments:96});
  geometry.rotateX(-Math.PI/2);geometry.translate(0,-.48,0);geometry.computeBoundingBox();geometry.computeBoundingSphere();geometry.userData.sharedScenery=true;
  kit.floorSlabs.set(ground,geometry);return geometry;
}
function glassRibbon(points,height,closed=true,opening=()=>false){
  const p=[],uv=[],index=[],cuts=[];let distance=0;
  for(let i=0;i<(closed?points.length+1:points.length);i++){
    const v=points[i%points.length];if(i){const a=points[(i-1)%points.length];distance+=Math.hypot(v.x-a.x,v.z-a.z);}
    p.push(v.x,0,v.z,v.x,height,v.z);uv.push(distance*.08,0,distance*.08,1);
    if(i<(closed?points.length:points.length-1)){const next=points[(i+1)%points.length],k=i*2;if(opening({x:(v.x+next.x)/2,z:(v.z+next.z)/2}))cuts.push({v,next,distance});else index.push(k,k+1,k+2,k+1,k+3,k+2);}
  }
  for(const {v,next,distance}of cuts){const k=p.length/3;p.push(v.x,7,v.z,v.x,height,v.z,next.x,7,next.z,next.x,height,next.z);const end=distance+Math.hypot(next.x-v.x,next.z-v.z);uv.push(distance*.08,7/height,distance*.08,1,end*.08,7/height,end*.08,1);index.push(k,k+1,k+2,k+1,k+3,k+2);}
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(p,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(index);geometry.computeVertexNormals();return geometry;
}
function* movingEscalator(kit,side){
  const {cube,tube,mats,clock}=kit,staticPart=new T.Group(),moving=new T.Group();
  const rise=MALL_LAYOUT.rise,run=27,width=3.3,x=side*18.4,z=MALL_LAYOUT.z;
  for(const edge of [-1,1]){
    const points=[[x+edge*width/2,.18,z-run/2],[x+edge*width/2,rise+.18,z+run/2]];
    tube(staticPart,points,.16,mats.navy);tube(staticPart,points.map(([a,b,c])=>[a,b+1.15,c]),.07,mats.cyan);
    const p=[points[0],points[1],[points[1][0],points[1][1]+1.05,points[1][2]],[points[0][0],points[0][1]+1.05,points[0][2]]];
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(p.flat(),3));geometry.setIndex([0,1,2,0,2,3]);geometry.computeVertexNormals();
    staticPart.add(new T.Mesh(geometry,kit.glassMat));
  }
  for(const end of [-1,1])cube(staticPart,mats.navy,x,end>0?rise-.15:-.15,z+end*run/2,width+.7,.3,2.8);
  // A real upper landing crosses the open atrium edge into the gallery.
  // Both tread ends are supported; the view can still see through below it.
  cube(staticPart,mats.navy,side*25,rise-.18,z+run/2,17,.3,4.6);
  cube(staticPart,mats.floor,side*25,rise-.025,z+run/2,16.8,.05,4.4);
  for(const edge of [-1,1]){
    cube(staticPart,kit.glassMat,side*25,rise+.7,z+run/2+edge*2.3,17,1.3,.055);
    cube(staticPart,mats.gold,side*25,rise+1.4,z+run/2+edge*2.3,17,.055,.055);
  }
  yield;
  const geometry=new T.BoxGeometry(width-.35,.13,.6),phase=new T.InstancedBufferAttribute(Float32Array.from({length:40},(_,i)=>i/40),1);geometry.setAttribute('aMallTread',phase);
  const material=mats.navy.clone(),patch=shader=>{
    shader.uniforms.uMallEscalatorClock=clock;
    shader.vertexShader='attribute float aMallTread;uniform float uMallEscalatorClock;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      float tread=fract(aMallTread+uMallEscalatorClock*${side*.055});
      transformed+=vec3(0.,tread*${rise.toFixed(3)}+.04,(tread-.5)*${run.toFixed(3)});`);
  };
  material.onBeforeCompile=patch;material.customProgramCacheKey=()=>`mall-tread-colour-${side}`;
  const steps=new T.InstancedMesh(geometry,material,40);steps.position.set(x,0,z);
  steps.customDepthMaterial=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking});steps.customDepthMaterial.onBeforeCompile=patch;steps.customDepthMaterial.customProgramCacheKey=()=>`mall-tread-shadow-${side}`;
  steps.boundingBox=new T.Box3(new T.Vector3(-width/2,-.2,-run/2-.6),new T.Vector3(width/2,rise+.3,run/2+.6));steps.boundingSphere=new T.Sphere(new T.Vector3(0,rise/2,0),15);
  // Exact query matrices follow the same GPU clock, with no buffer upload.
  const query=steps.instanceMatrix.array.slice();steps.raycast=function(ray,hits){const old=this.instanceMatrix.array;try{for(let i=0;i<40;i++){const t=((phase.getX(i)+clock.value*side*.055)%1+1)%1;query[i*16+13]=t*rise+.04;query[i*16+14]=(t-.5)*run;}this.instanceMatrix.array=query;T.InstancedMesh.prototype.raycast.call(this,ray,hits);}finally{this.instanceMatrix.array=old;}};
  steps.castShadow=true;steps.receiveShadow=true;moving.add(steps);return{staticPart,moving};
}

export function* mallArchitectureFloorSteps(floor,kit){
  const {mesh,cube,tube,ring,glassMat,mats}=kit,structure=new T.Group(),glass=new T.Group(),kinetics=new T.Group(),points=floor.id===1?mallFloorOutline():mallUpperFloorOutline().slice(0,513),closed=floor.id===1;
  mesh(structure,floorSlab(kit,floor.id===1),mats.floor);
  // The broad, connected floor is real geometry, not scaled copies of the old
  // disks. The same contour defines its glass skin and structural edge bands.
  const edge=points.map(p=>[p.x,.10,p.z]);if(closed)edge.push(edge[0]);
  tube(structure,edge,.16,mats.navy).userData.mallCollisionHandledByBoundary=true;tube(structure,edge.map(([x,y,z])=>[x,y-.40,z]),.055,mats.pink);
  tube(structure,edge.map(([x,y,z])=>[x,MALL_LAYOUT.rise-.24,z]),.10,mats.gold);
  const doors=MALL_LAYOUT.pavilions.filter(p=>p.floor===floor.id).map(p=>{
    const a=p.connection,dx=p.x-a.x,dz=p.z-a.z,length=Math.hypot(dx,dz);let lo=0,hi=1;
    for(let i=0;i<36;i++){const t=(lo+hi)/2;if(mallBuildingFootprintDistance(a.x+dx*t,a.z+dz*t)<0)lo=t;else hi=t;}
    return{a,dx,dz,length,x:a.x+dx*lo,z:a.z+dz*lo};
  });
  const opening=p=>doors.some(d=>{const t=((p.x-d.a.x)*d.dx+(p.z-d.a.z)*d.dz)/d.length;return t>0&&t<d.length&&Math.abs((p.x-d.a.x)*d.dz-(p.z-d.a.z)*d.dx)/d.length<4.2;});
  const glazing=new T.Mesh(glassRibbon(points,MALL_LAYOUT.rise-.25,closed,opening),glassMat);glass.add(glazing);
  for(const door of doors){
    const frame=new T.Group();frame.position.set(door.x,0,door.z);frame.rotation.y=Math.atan2(door.dx,door.dz);structure.add(frame);
    for(const side of [-1,1])cube(frame,mats.navy,side*4.2,3.5,0,.16,7,.16);
    cube(frame,mats.navy,0,7.07,0,8.56,.14,.16);
  }
  let travelled=0,nextPost=0;
  for(let i=0;i<points.length;i++){
    if((i&31)===0)yield;
    const p=points[i],a=points[(i-1+points.length)%points.length];travelled+=Math.hypot(p.x-a.x,p.z-a.z);
    if(travelled<nextPost||opening(p))continue;nextPost=travelled+5.2;
    cube(structure,mats.navy,p.x,4,p.z,.19,8,.19);
    for(const y of [.28,7.8]){cube(structure,mats.navy,p.x,y,p.z,.36,.45,.36);cube(structure,mats.gold,p.x,y+.22,p.z,.37,.035,.37);}
  }
  if(floor.id>1){
    const points=mallAtriumRail();
    const rail=new T.Mesh(glassRibbon(points,1.25,false),glassMat);rail.position.y=.1;glass.add(rail);
    tube(structure,points.map(p=>[p.x,1.38,p.z]),.055,mats.gold);
    for(let i=0;i<points.length;i+=5){const p=points[i];cube(structure,mats.navy,p.x,.7,p.z,.07,1.3,.07);}
  }
  // This dry bridge really joins the enlarged west gallery to the left lift.
  cube(structure,mats.navy,MALL_LAYOUT.lift.x,-.18,104.5,19,.3,24);
  cube(structure,mats.floor,MALL_LAYOUT.lift.x,-.025,104.5,18.7,.05,23.7);
  for(const side of [-1,1]){
    cube(glass,glassMat,MALL_LAYOUT.lift.x+side*9.5,.75,104.5,.06,1.5,24);
    cube(structure,mats.gold,MALL_LAYOUT.lift.x+side*9.5,1.5,104.5,.06,.06,24);
  }
  if(floor.id<7)for(const side of [-1,1]){
    yield;const escalator=yield* movingEscalator(kit,side);structure.add(escalator.staticPart);kinetics.add(escalator.moving);
  }
  const ghostMat=new T.MeshBasicMaterial({color:0x85d7e2,transparent:true,opacity:.025,depthWrite:false,side:T.DoubleSide});
  const ghost=new T.Mesh(floorSlab(kit,floor.id===1),ghostMat);ghost.visible=false;
  return{structure,glass,kinetics,ghost};
}
