import * as T from 'three';
import {RESORT_SPA as S,RESORT_ZONES} from './resort-spa-data.js';
import {RESORT_BRIDGES,RESORT_LOWER_APPROACH,corridorOutline,clipPressureWall} from './resort-spa-corridors.js';

// Strong tier edges and planted balconies follow the real floor union. Each
// solid lip is a separate segment; bridges/door mouths never gain a broad box.
export function* resortGallerySteps({solid,decor,mats,flora}){
 const geometry=new T.BoxGeometry(1,1,1),plantGeometry=new T.CylinderGeometry(.48,.4,.5,12),fixed=new T.Group(),records=new Map(),instances=[];
 // Clone before the ordinary bake installs its range-submission/lamp hooks.
 // Native instancing must not inherit attributes that belong to that bake.
 const flowerMaterial=flora.material.clone(),leafMaterial=flora.leafMaterial.clone();
 const ellipse=(x,z,rx,rz)=>Array.from({length:96},(_,i)=>({x:x+Math.cos(i*Math.PI/48)*rx,z:z+Math.sin(i*Math.PI/48)*rz}));
 const atrium=ellipse(0,203,34,34),rooms=RESORT_ZONES.filter(z=>z.key!=='cafe').map(z=>({...z,poly:ellipse(z.x,z.z,z.rx,z.rz)}));
 const report={tierSegments:0,bridgeBands:0,planters:0,flowerInstances:0};
 function box(parent,m,x,y,z,w,h,d,level,angle=0){const o=new T.Mesh(geometry,m);o.position.set(x,y,z);o.scale.set(w,h,d);o.rotation.y=angle;o.userData.resortFloor=level;o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
 function bloom(level,x,y,z,angle){let row=records.get(level);if(!row)records.set(level,row=[]);row.push({x,y,z,angle});}
 for(let level=0;level<3;level++){
  const halls=[{id:'atrium',x:0,z:203,poly:atrium},...rooms.filter(z=>z.level===level)],clips=RESORT_BRIDGES.filter(b=>b.level===level).map(b=>b.outline);if(level===0)clips.push(corridorOutline(RESORT_LOWER_APPROACH).outline);
  for(const hall of halls){
   const others=[...clips,...halls.filter(h=>h!==hall).map(h=>h.poly)],y=level*S.rise;
   for(let i=0;i<hall.poly.length;i++){
    const a=hall.poly[i],b=hall.poly[(i+1)%hall.poly.length];
    for(const[p,q]of clipPressureWall(a,b,others)){
     const x=(p.x+q.x)/2,z=(p.z+q.z)/2,length=Math.hypot(q.x-p.x,q.z-p.z),angle=Math.atan2(-(q.z-p.z),q.x-p.x);
     box(solid,mats.ivory,x,y-.42,z,length+.025,.72,.52,level,angle);
     box(decor,mats.gold,x,y-.17,z,length+.035,.11,.57,level,angle);
     box(decor,mats.amber,x,y-.46,z,length+.035,.035,.58,level,angle);report.tierSegments++;
     if(hall.id!=='atrium'&&i%8===4&&length>.65){
      // Cabana's real annular walkway is only3m wide. Floor pots there closed
      // both body-clear lanes; hang those same pots from the existing cornice.
      const lift=hall.key==='cabana'?2.7:0,px=x+(hall.x-x)*.055,pz=z+(hall.z-z)*.055,planter=new T.Mesh(plantGeometry,mats.gold);planter.position.set(px,y+.25+lift,pz);planter.userData.resortFloor=level;planter.castShadow=planter.receiveShadow=true;solid.add(planter);report.planters++;
      box(decor,mats.wood,px,y+.9+lift,pz,.04,.85,.04,level,angle);
      if(lift){const arm=box(decor,mats.gold,(x+px)/2,y+3.95,(z+pz)/2,Math.hypot(x-px,z-pz)+.1,.05,.05,level,Math.atan2(-(pz-z),px-x));box(decor,mats.gold,px,y+3.55,pz,.035,.8,.035,level);}
      bloom(level,px,y+1.35+lift,pz,angle);
     }
    }
    if(i%12===0)yield;
   }
  }
 }
 // The bridge floor remains exactly where it was; these are its two real
 // underside fascia bands, not a replacement route or a decorative fake bridge.
 for(const bridge of RESORT_BRIDGES){const [a,b]=bridge.points,dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz);if(!length)continue;const nx=-dz/length,nz=dx/length,angle=Math.atan2(dx,dz);for(const side of [-1,1]){
  const x=(a.x+b.x)/2+nx*side*2.45,z=(a.z+b.z)/2+nz*side*2.45;
  box(solid,mats.ivory,x,bridge.y-.34,z,.22,.6,length,bridge.level,angle);box(decor,mats.amber,x,bridge.y-.45,z,.24,.035,length,bridge.level,angle);report.bridgeBands++;
 }yield;}
 // Fixed instance buffers are attached after the ordinary immutable bake.
 // Shared detailed blossoms/leaves retain their geometry without copying it
 // hundreds of times. No matrix or attribute uploads occur during animation.
 const transform=new T.Object3D();
 for(const [level,rows]of records){
  const flowers=new T.InstancedMesh(flora.geometry,flowerMaterial,rows.length),leaves=new T.InstancedMesh(flora.leafGeometry,leafMaterial,rows.length*3);
  flowers.name='SPA planted balcony blossoms '+level;leaves.name='SPA planted balcony leaves '+level;
  for(let i=0;i<rows.length;i++){const p=rows[i];transform.position.set(p.x,p.y,p.z);transform.rotation.set(.15,p.angle,0);transform.scale.set(.48,.43,.48);transform.updateMatrix();flowers.setMatrixAt(i,transform.matrix);
   for(let j=0;j<3;j++){transform.position.set(p.x,p.y-.6,p.z);transform.rotation.set(-.3,p.angle+j*Math.PI*2/3,0);transform.scale.set(.7,.7,.7);transform.updateMatrix();leaves.setMatrixAt(i*3+j,transform.matrix);}
  }
  for(const mesh of [flowers,leaves]){mesh.userData.resortFloor=level;mesh.castShadow=mesh.receiveShadow=true;mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();fixed.add(mesh);instances.push(mesh);}report.flowerInstances+=rows.length;
  yield;
 }
 return{fixed,report,inspect(level){for(const m of instances)m.visible=level==null||m.userData.resortFloor<=level;},dispose(){for(const m of instances)m.dispose();flowerMaterial.dispose();leafMaterial.dispose();geometry.dispose();plantGeometry.dispose();}};
}
