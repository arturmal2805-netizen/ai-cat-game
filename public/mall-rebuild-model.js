import {compactMallBuffersSteps} from './mall-buffer-compaction.js';
import {mallCutawayMaterial} from './mall-cutaway.js';
import * as T from 'three';
import {mallMascotSteps,mallGalleryIdentitySteps} from './mall-facade.js';
import {mallAquariumSteps} from './mall-aquarium.js';
import {createCat,animateCat,reactCat} from './cat-model.js';
import {mallKitSteps} from './mall-kit.js';
import {mallArchitectureFloorSteps} from './mall-architecture.js';
import {mallRoomSteps} from './mall-rooms.js';
import {MALL_LAYOUT,mallRoomPlacement,mallPlanArea,mallAtriumVoidDistance} from './mall-layout.js';
import {MALL_FLOORS,MALL_STORES,MALL_PRODUCTS} from './mall-data.js';
import {batchModelSteps} from './model-batching.js';
import {collectMallObstacles} from './mall-navigation.js';
import {runSceneSteps} from './scene-tasks.js';
import {createMallRoomLights,mallRoomLightMaterial} from './mall-room-light.js';

export function* mallRebuildModelSteps(options={}){
  const compactBuffers=options.compactBuffers!==false;
  const kit=yield* mallKitSteps(options),{mats,mesh,cube,orb,disk,tube,ring,glassMat,label,plant,chair}=kit;
  const roomLights=createMallRoomLights();
  const inspectedRoom={value:0},cutawayMaterials=new Set();
  const root=new T.Group();root.name='CHICHI horizontal underwater mall';
  const floors=new Map(),stores=new Map(),obstacles=new Map(),roomStoreIds=[null],frameSource=new T.Group();
  const background=[];let focusedFloor=null,focusedStore=null;
  const walkSurfaces=[];
  const captureWalkSurfaces=(source,y=0)=>{source.updateMatrixWorld(true);source.traverse(m=>{if(m.isMesh&&m.userData.mallWalkSurface){const matrix=m.matrixWorld.clone();matrix.elements[13]+=y;walkSurfaces.push({geometry:m.geometry,matrix});}});};
  const floorData=MALL_FLOORS.map(f=>({...f,y:MALL_LAYOUT.y+(f.id-1)*MALL_LAYOUT.rise}));
  for(const floor of floorData){
    yield;
    const group=new T.Group();group.position.y=floor.y;group.name=`F${floor.id} ${floor.name}`;root.add(group);floors.set(floor.id,group);
    const architecture=yield* mallArchitectureFloorSteps(floor,kit),detail=new T.Group(),ceilings=new T.Group();
    captureWalkSurfaces(architecture.structure,floor.y);
    const venues=MALL_STORES.filter(s=>s.floor===floor.id);
    for(const [index,original]of venues.entries()){
      const placement=mallRoomPlacement(index,venues.length),store={...original,x:placement.x,z:placement.z,y:floor.y,angle:-placement.yaw-Math.PI/2,placement};
      const fitted=yield* mallRoomSteps(store,placement,kit);
      const lamp=roomLights.register(store.x,store.z,store.kind==='food'?0xffc68f:store.kind==='cinema'?0xd5c3ff:0xffdfbb);roomStoreIds[lamp]=store.id;
      yield* roomLights.stamp(fitted.room,lamp);
      yield* roomLights.stamp(fitted.ceiling,lamp);
      detail.add(fitted.room);ceilings.add(fitted.ceiling);
      fitted.motion.removeFromParent();fitted.motion.position.copy(fitted.room.position);fitted.motion.rotation.copy(fitted.room.rotation);architecture.kinetics.add(fitted.motion);
      stores.set(store.id,{...store,dimensions:{w:placement.w,d:placement.d}});
    }
    // The central circulation is a real planted public gallery, not empty
    // scaled disks. Preserve wide routes between shop doors and atrium rail.
    for(let i=0;i<12;i++){
      yield;const a=i*Math.PI/6,r=25.7,x=Math.cos(a)*r,z=MALL_LAYOUT.z+Math.sin(a)*r;
      if(floor.id>1&&mallAtriumVoidDistance(x,z)<1.4)continue;
      if(floor.id===1&&Math.hypot(x,z-84)<11)continue;
      plant(detail,x,z,.85);
      if(i%3===0){const lounge=new T.Group();lounge.position.set(Math.cos(a)*25.6,0,MALL_LAYOUT.z+Math.sin(a)*25.6);lounge.rotation.y=-a-Math.PI/2;detail.add(lounge);chair(lounge,-2,0,mats.red,.65,Math.PI/2);chair(lounge,2,0,mats.red,.65,-Math.PI/2);disk(lounge,mats.warm,0,.95,0,1.1,.12);}
    }
    for(const side of [-1,1])for(const x of [62,87,116]){
      plant(detail,side*x,98.5,.9);cube(detail,mats.navy,side*x,2.4,98.5,.07,4.8,.07);
      label(detail,4+MALL_STORES.length+floor.id-1,side*x,4.9,98.5,8,.7);
    }
    yield* mallGalleryIdentitySteps(detail,floor,kit);
    // Lush planted balcony pockets frame the grand well, outside the lift and
    // escalator lanes. Their solid benches also reserve safe NPC resting space.
    for(const side of [-1,1]){
      const x=side*30;
      cube(detail,mats.navy,x,.36,107.5,5.6,.7,2.2);
      cube(detail,mats.red,x,.79,107.5,5.4,.22,2.0);
      cube(detail,mats.red,x,1.38,108.35,5.4,1.15,.3);
      for(const z of [91.5,116]){
        const bx=side*(side<0?25.3:26.6),width=side<0?1.5:2.4;
        cube(detail,mats.navy,bx,.42,z,width,.8,6.4);
        cube(detail,mats.green,bx,.83,z,width-.25,.06,6.1);
        for(let i=0;i<8;i++){
          const px=bx+Math.sin(i*2.4)*(side<0?.3:.65),pz=z+(i-3.5)*.7;
          orb(detail,mats.green,px,1.15,pz,.38,.45,.4);
          for(let j=0;j<5;j++){const a=j*Math.PI*2/5;orb(detail,j%2?mats.pink:mats.white,px+Math.cos(a)*.15,1.52,pz+Math.sin(a)*.15,.105,.06,.11);}
          orb(detail,mats.gold,px,1.55,pz,.07);
        }
      }
      plant(detail,side*33,104,1.7);
    }
    if(floor.id===1){
      // Broad fountain and planted seating court, kept outside lift queues.
      disk(detail,mats.navy,0,.28,84,9.5,.5);disk(detail,mats.white,0,.59,84,9,.14);disk(detail,mats.cyan,0,.7,84,8.5,.09);
      for(let i=0;i<16;i++){const a=i*Math.PI/8,x=Math.cos(a)*7,z=84+Math.sin(a)*7;tube(detail,[[x,.75,z],[x*.55,4.3,84+(z-84)*.55],[x*.22,.9,84+(z-84)*.22]],.045,mats.cyan);}
    }
    yield;
    yield* roomLights.stamp(detail,0);
    const physical=new T.Group();physical.add(architecture.structure,detail);const measured=collectMallObstacles(physical,glassMat,{zOrigin:MALL_LAYOUT.z});measured.floor=floor.id;measured.layoutVersion=2;obstacles.set(floor.id,measured);
    physical.remove(architecture.structure,detail);
    const instances=new T.Group();
    const structure=yield* batchModelSteps(architecture.structure,{combineColors:true}),retail=yield* batchModelSteps(detail,{combineColors:true}),roof=yield* batchModelSteps(ceilings,{combineColors:true});
    if(compactBuffers)for(const holder of [structure,retail,roof])yield* compactMallBuffersSteps(holder);
    for(const holder of [retail,instances,roof])holder.traverse(o=>{if(o.isMesh){if(o.material.isMeshStandardMaterial)mallRoomLightMaterial(o.material,roomLights,.18);cutawayMaterials.add(o.material);}});
    group.add(structure,retail,instances,roof,architecture.glass,architecture.kinetics,architecture.ghost);
    group.userData={structure,instances,detail:retail,ceiling:roof,glass:architecture.glass,kinetics:architecture.kinetics,ghost:architecture.ghost,escalators:architecture.kinetics};
    for(const source of [architecture.structure,detail,ceilings])source.traverse(o=>{if(o.isMesh&&!o.geometry.userData.sharedScenery)o.geometry.dispose();});
    roomLights.finishFloor();
  }
  roomLights.finish();
  const aquarium=yield* mallAquariumSteps(kit);root.add(aquarium);
  let mascot,statue;
  // A broad cat-head dome crowns the atrium, while the wings have their own
  // low glass canopies. These are actual curved skins and structural ribs.
  const top=floorData[6].y+7.7,centreZ=MALL_LAYOUT.z;
  const lobby=MALL_LAYOUT.arrivalLobby;cube(frameSource,glassMat,lobby.x,top,lobby.z,lobby.w,.08,lobby.d);
  mesh(frameSource,new T.SphereGeometry(59.6,96,32,0,Math.PI*2,0,Math.PI/2),glassMat,0,top,centreZ,1,.47,1);
  for(let j=0;j<24;j++){
    yield;const a=j*Math.PI/12,points=[];for(let i=0;i<=24;i++){const t=i*Math.PI/48;points.push([Math.cos(a)*Math.sin(t)*59.6,top+Math.cos(t)*28,centreZ+Math.sin(a)*Math.sin(t)*59.6]);}tube(frameSource,points,.075,mats.navy);
  }
  for(let j=1;j<6;j++){const t=j*Math.PI/12;ring(frameSource,0,top+Math.cos(t)*28,centreZ,Math.sin(t)*59.6,mats.navy,.075);}
  // Each retail wing has a genuine glass crown instead of a flat repeated
  // box roof. Smaller sculpted cat crowns make the whole frontage readable.
  for(const wing of MALL_LAYOUT.wings){
    yield;const crownRadius=31,scale=crownRadius/59.6;
    mesh(frameSource,new T.SphereGeometry(crownRadius,64,24,0,Math.PI*2,0,Math.PI/2),glassMat,wing.x,top,wing.z,1,28/59.6,1);
    for(let j=0;j<12;j++){
      const a=j*Math.PI/6,points=[];for(let i=0;i<=20;i++){const t=i*Math.PI/40;points.push([wing.x+Math.cos(a)*Math.sin(t)*crownRadius,top+Math.cos(t)*28*scale,wing.z+Math.sin(a)*Math.sin(t)*crownRadius]);}tube(frameSource,points,.055,mats.navy);
    }
    for(let j=1;j<4;j++){const t=j*Math.PI/8;ring(frameSource,wing.x,top+Math.cos(t)*28*scale,wing.z,Math.sin(t)*crownRadius,mats.gold,.045);}
  }
  // A single clear atrium window seals the front without seven empty bands
  // and mullion rows across the view into the grand hall.
  const frontAngle=Math.asin(22/59.8),frontHeight=top-MALL_LAYOUT.y;
  mesh(frameSource,new T.CylinderGeometry(59.8,59.8,frontHeight,64,1,true,-frontAngle,frontAngle*2),glassMat,0,MALL_LAYOUT.y+frontHeight/2,centreZ);
  for(const side of [-1,1])tube(frameSource,[[side*22,MALL_LAYOUT.y,centreZ+Math.sqrt(59.8**2-22**2)],[side*22,top,centreZ+Math.sqrt(59.8**2-22**2)]],.17,mats.white);
  yield* mallMascotSteps(frameSource,kit,top);
  // Glazed curved marquee: luminous text without a massive black billboard.
  const banner=new T.Group();banner.position.set(0,top-2,centreZ);frameSource.add(banner);
  const signGlass=glassMat.clone();signGlass.uniforms.uProbe.value=glassMat.uniforms.uProbe.value;signGlass.uniforms.uTint.value=new T.Color(0x102d50);signGlass.fragmentShader=signGlass.fragmentShader.replace('.028+f*.32+glint*.16','.68+f*.17+glint*.12');
  mesh(banner,new T.CylinderGeometry(61,61,12.4,64,1,true,-.62,1.24),signGlass);
  label(banner,0,0,1.0,61.1,34,4.6);label(banner,1,0,-3.0,61.12,70,2.6);label(banner,2,0,-5.3,61.14,38,.7);
  for(const y of [-6.2,6.2])tube(banner,Array.from({length:49},(_,i)=>{const a=-.62+i*1.24/48;return[Math.sin(a)*61,y,Math.cos(a)*61];}),.06,mats.gold);
  const basket=[[-2.1,5.9,61.6],[-1.6,4.1,61.6],[1.6,4.1,61.6],[2.1,5.9,61.6],[-2.1,5.9,61.6]];
  tube(banner,basket,.1,mats.pink);tube(banner,basket,.28,mats.haloPink);kit.paw(banner,0,5.0,61.8,.55,mats.pink);
  for(const x of [-1.2,1.2])orb(banner,mats.pink,x,3.65,61.65,.17);
  for(const p of MALL_LAYOUT.pavilions){
    yield;const y=floorData[p.floor-1].y,r=p.radius;
    disk(frameSource,mats.navy,p.x,y-.35,p.z,r+.4,.6);disk(frameSource,mats.floor,p.x,y-.025,p.z,r,.05).userData.mallWalkSurface=true;
    const pavilionWall=new T.Group();pavilionWall.position.set(p.x,y,p.z);pavilionWall.rotation.y=Math.atan2(p.connection.x-p.x,p.connection.z-p.z);frameSource.add(pavilionWall);
    kit.doorwayCylinder(pavilionWall,0,3.7,0,r,7.4,glassMat);
    mesh(frameSource,new T.SphereGeometry(r,64,20,0,Math.PI*2,0,Math.PI/2),glassMat,p.x,y+7.5,p.z,1,.34,1);
    const gardenRoof=new T.RingGeometry(r-.8,p.roofRadius,96);gardenRoof.rotateX(-Math.PI/2);mesh(frameSource,gardenRoof,mats.navy,p.x,y+7.7,p.z);
    ring(frameSource,p.x,y+7.7,p.z,p.roofRadius,mats.gold,.08);
    const roofGarden=new T.Group();roofGarden.position.y=y+7.7;frameSource.add(roofGarden);
    for(let j=0;j<8;j++){const a=j*Math.PI/4;plant(roofGarden,p.x+Math.cos(a)*18.6,p.z+Math.sin(a)*18.6,1.15);}
    const foundation=MALL_LAYOUT.y-4.5,height=y-.4-foundation;
    for(let j=0;j<4;j++){const a=j*Math.PI/2+Math.PI/4,x=p.x+Math.cos(a)*12.5,z=p.z+Math.sin(a)*12.5;
      disk(frameSource,mats.navy,x,foundation+height/2,z,.4,height);
      tube(frameSource,[[x+.42,foundation,z],[x+.42,y-.4,z]],.035,mats.cyan);
    }
    for(const h of [0,7.5])ring(frameSource,p.x,y+h,p.z,r,mats.gold,.08);
    for(let i=0;i<10;i++){const a=i*Math.PI/5,x=p.x+Math.cos(a)*12,z=p.z+Math.sin(a)*12,g=new T.Group();g.position.y=y;frameSource.add(g);plant(g,x,z,.9);chair(g,x*.96,z,mats.red,.65,-a);}
    const a=new T.Vector3(p.connection.x,y,p.connection.z),b=new T.Vector3(p.x,y,p.z),mid=a.clone().lerp(b,.5),length=a.distanceTo(b),bridge=new T.Group();bridge.position.copy(mid);bridge.rotation.y=Math.atan2(b.x-a.x,b.z-a.z);frameSource.add(bridge);
    cube(bridge,mats.navy,0,-.18,0,8,.3,length);cube(bridge,mats.floor,0,-.025,0,7.8,.05,length).userData.mallWalkSurface=true;cube(bridge,glassMat,0,7,0,8,.055,length);
    for(const side of [-1,1]){cube(bridge,glassMat,side*4,3.5,0,.055,7,length);cube(bridge,mats.gold,side*4,7,0,.06,.06,length);}
  }
  // Existing shared four-cat elevator API, moved to the reference's left-front
  // tower. The surface approach remains physically connected to the old pier.
  const {x:lx,z:lz,radius:r}=MALL_LAYOUT.lift,shaftTop=top+.5;
  kit.doorwayCylinder(frameSource,lx,(MALL_LAYOUT.y+shaftTop)/2,lz,r,shaftTop-MALL_LAYOUT.y,glassMat,4);
  for(const f of floorData){ring(frameSource,lx,f.y,lz,r+.12,mats.pink,.12);for(const side of [-1,1])cube(frameSource,mats.navy,lx+side*r,f.y+4,lz,.16,8,.16);}
  const upperGlass=glassMat.clone();upperGlass.uniforms.uProbe.value=glassMat.uniforms.uProbe.value;upperGlass.fragmentShader=upperGlass.fragmentShader.replace('.028+f*.32+glint*.16','(.028+f*.32+glint*.16)*.14');
  mesh(frameSource,new T.CylinderGeometry(r,r,-shaftTop,64,1,true),upperGlass,lx,shaftTop/2,lz);
  disk(frameSource,mats.navy,lx,.14,lz,12,.4);cube(frameSource,mats.floor,lx,.14,lz+14,24,.4,30);
  const shore=new T.Vector3(MALL_LAYOUT.shoreJoin.x,0,MALL_LAYOUT.shoreJoin.z),gate=new T.Vector3(MALL_LAYOUT.gate.x,0,MALL_LAYOUT.gate.z),bridge=new T.Group();bridge.position.copy(shore.clone().lerp(gate,.5));bridge.rotation.y=Math.atan2(gate.x-shore.x,gate.z-shore.z);frameSource.add(bridge);
  cube(bridge,mats.navy,0,.14,0,10,.4,shore.distanceTo(gate)+12);for(const side of [-1,1])cube(bridge,glassMat,side*5,1,0,.06,1.6,shore.distanceTo(gate)+12);
  const returnA=new T.Vector3(lx,0,lz-MALL_LAYOUT.lift.landing),returnB=new T.Vector3(0,0,114),returnBridge=new T.Group();returnBridge.position.copy(returnA.clone().lerp(returnB,.5));returnBridge.rotation.y=Math.atan2(returnB.x-returnA.x,returnB.z-returnA.z);frameSource.add(returnBridge);
  const returnLength=returnA.distanceTo(returnB)+12;cube(returnBridge,mats.floor,0,.14,0,14,.4,returnLength);
  for(const side of [-1,1])cube(returnBridge,glassMat,side*7,1,0,.055,1.6,returnLength);
  const cabin=new T.Group();cabin.position.set(lx,.35,lz);root.add(cabin);disk(cabin,mats.floor,0,-.28,0,r-.1,.2);kit.doorwayCylinder(cabin,0,2.37,0,r-.5,5.1,glassMat,4);ring(cabin,0,4.98,0,r-.5,mats.pink,.09);
  const doors=[];for(let face=0;face<4;face++){const doorway=new T.Group();doorway.rotation.y=face*Math.PI/2;cabin.add(doorway);for(const x of [-1,1]){const panel=cube(doorway,glassMat,x*2,2.37,r-.6,4,5.1,.05);doors.push({mesh:panel,x:panel.position.x});}}
  captureWalkSurfaces(frameSource);
  const frame=yield* batchModelSteps(frameSource,{combineColors:true});if(compactBuffers)yield* compactMallBuffersSteps(frame);root.add(frame);
  for(const material of cutawayMaterials)mallCutawayMaterial(material,inspectedRoom);
  mascot=new T.Group();statue=createCat('happy',{detail:'npc'});animateCat(statue,3,false,false);statue.scale.setScalar(5);mascot.position.set(0,MALL_LAYOUT.y+.85,84);mascot.add(statue);root.add(mascot);
  // Read-only background guests rest on actual solid benches. They cannot
  // obstruct a walking cat or generate fictitious wallets, receipts or AI calls.
  root.userData={mall:true,built:true,layoutVersion:2,floors,stores,roomStoreIds,walkSurfaces,obstacles,cabin,doors,ownedCats:[statue],borrowedTextures:kit.borrowedTextures,atlas:kit.atlas,ownedTextures:[roomLights.texture],borrowed:new Set(),
    iceCreamStation:kit.iceStation.current,
    stats:{floors:7,stores:stores.size,products:MALL_PRODUCTS.filter(p=>!p.legacy).length,area:mallPlanArea()},
    *backgroundSteps(){
      if(background.length)return;
      for(const floor of floorData)for(const side of [-1,1]){
        yield;const cat=createCat('happy',{detail:'npc',color:[0xe6a183,0xaaa7bb,0xf4e4cb,0x717c88][(floor.id+(side>0?1:0))%4],hat:false}),carrier=new T.Group();
        cat.scale.setScalar(.63);cat.userData.mallBackground=true;carrier.position.set(side*30,floor.y+1.0,107.5);carrier.userData.biomeId='autumn';carrier.add(cat);root.add(carrier);root.userData.ownedCats.push(cat);
        animateCat(cat,floor.id+side,false,true);background.push({cat,carrier,floor:floor.id,phase:floor.id*1.7+side,next:0,reaction:{crouch:.12,paw:0,headPitch:0,headRoll:0}});
      }
      root.userData.stats.backgroundVisitors=background.length;
      for(let i=0;i<2;i++){
        yield;const cat=createCat('happy',{detail:'npc',color:i?0x8b7f91:0xffeedf,hat:false}),carrier=new T.Group();cat.scale.setScalar(.63);cat.userData.mallBackground=true;
        carrier.position.set(0,MALL_LAYOUT.y+1,84);carrier.add(cat);carrier.userData.biomeId='autumn';root.add(carrier);root.userData.ownedCats.push(cat);animateCat(cat,2+i,false,true);
        background.push({cat,carrier,roomGuest:true,floor:1,phase:8+i*2.3,next:0,reaction:{crouch:.12,paw:0,headPitch:0,headRoll:0}});
      }
      root.userData.stats.closeVisitors=2;
    },
    focusStore(id){
      const store=stores.get(id);if(!store)return;focusedStore=store;inspectedRoom.value=0;floors.get(store.floor).userData.ceiling.visible=true;
      for(const [i,c]of background.filter(c=>c.roomGuest).entries()){
        const side=i?1:-1,kind=store.kind;let p=null,yaw=0;
        if(kind==='fashion')p={x:side*9,y:.82,z:3.3};
        else if(kind==='food'){p={x:side*11.8,y:.92,z:-.8};yaw=-side*Math.PI/2;}
        else if(kind==='cinema'){p={x:side*8.5,y:.92,z:-7.5};yaw=Math.PI;}
        else if(kind==='home')p={x:side*8,y:1.1,z:1.2};
        else if(['book','toy','gadget'].includes(kind))p={x:side*11.4,y:.82,z:8};
        c.carrier.visible=!!p;if(!p)continue;
        const a=store.placement.yaw,cs=Math.cos(a),sn=Math.sin(a);c.floor=store.floor;c.carrier.position.set(store.x+cs*p.x+sn*p.z,store.y+p.y,store.z-sn*p.x+cs*p.z);c.carrier.rotation.y=a+yaw;c.next=0;
      }
    },
    inspectionElevation(elevation){if(!focusedStore)return;const cut=elevation>.24;inspectedRoom.value=cut?Math.max(0,roomStoreIds.indexOf(focusedStore.id)):0;floors.get(focusedStore.floor).userData.ceiling.visible=!cut;},
    focusFloor(id){focusedStore=null;inspectedRoom.value=0;focusedFloor=id;for(const [n,g]of floors){const selected=!id||n===id,d=g.userData;d.structure.visible=selected;d.instances.visible=selected;d.detail.visible=selected;d.glass.visible=selected;d.kinetics.visible=selected;d.ceiling.visible=!id;d.ghost.visible=!!id&&!selected;}frame.visible=!id;mascot.visible=!id||id===1;for(const c of background)c.carrier.visible=!c.roomGuest&&(!id||c.floor===id);},
    update(time,reduced){kit.clock.value=reduced?0:time;for(const c of background){if(!c.carrier.visible||time<c.next)continue;c.next=time+(focusedFloor?1/24:1/6);animateCat(c.cat,time+c.phase,false,reduced);c.reaction.paw=Math.max(0,Math.sin(time*.8+c.phase))*.18;c.reaction.headPitch=Math.sin(time*.45+c.phase)*.09;c.reaction.headRoll=Math.sin(time*.6+c.phase)*.06;reactCat(c.cat,c.reaction,reduced);}},
    updateLift(y,opening){cabin.position.y=y;for(const d of doors)d.mesh.position.x=d.x+Math.sign(d.x)*opening*3.8;},
  };
  root.traverse(o=>{if(o.isMesh){o.userData.mall=true;o.userData.biomeId='autumn';}});
  return root;
}
export const createMallRebuildModel=options=>runSceneSteps(mallRebuildModelSteps(options));
