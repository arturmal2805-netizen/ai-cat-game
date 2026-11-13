import {mallPath,mallNavigationSteps,mallNavigationReady,mallAccessibleService,mallSegmentClear} from './mall-navigation.js';
import {catNavigationRadius} from './cat-navigation-size.js';
import {pauseHiddenMatrixUpdates} from './scene-visibility.js';
import {prepareMallArt} from './mall-art.js';
import {prepareMosaReefs} from './mosasaur-reef-cache.js';
import {prepareMosaWaterReflection} from './mosasaur-water-probe.js';
import {prepareMosaRockSurfaces} from './mosasaur-rock-surfaces.js';
import * as THREE from 'three';
import {MALL,MALL_FLOORS,MALL_STORES,mallStore,mallProduct,mallServiceFrames} from './mall-data.js';
import {mallModelSteps} from './mall-model.js';
import {createMallRuntime} from './mall-runtime.js';
import {mallIceServing} from './mall-ice-serving.js';
import {MALL_ICE_FLAVORS,mallIceEating} from './mall-ice-data.js';
import {createCat,animateCat,reactCat,disposeCat} from './cat-model.js';
import {catAppearance} from './cat-breeds.js';
import {NEIGHBORS,byBiome} from './game-data.js';
import {cacheSceneMatrices} from './matrix-cache.js';

export function createMallWorld({scene,container,getGame,getActors,getFocused,getOverview,getCameraElevation=()=>0,prepare,prepareModel,registerCat=()=>{},onCamera,onStoreCamera,onExit,onStore,onPurchase,onUse,onGoal,onComplete,onError=()=>{},canSimulate=()=>true,blocked=()=>false,reduced=false}={}){
  const centre=byBiome('autumn').center,abort=new AbortController(),staff=[],props=new Map(),personal=new Map(),worn=new Map(),navigationPending=new Map();
  const iceProps=new Map(),iceOffset=new THREE.Matrix4(),icePoint=new THREE.Vector3(),iceScale=new THREE.Vector3(.65,.65,.65);
  let root=null,pending=null,disposed=false,inspection=false,selected=null,lastResume=-1;
  const access=document.createElement('button');access.className='mall-access';access.textContent='🛍 ТРЦ';access.title='Підводний Cat Mall';access.setAttribute('aria-label','Відкрити підводний ТРЦ');access.hidden=true;(container.querySelector('.map-controls')||container).append(access);
  const panel=document.createElement('nav');panel.className='mall-floors';panel.hidden=true;panel.setAttribute('aria-label','Поверхи підводного ТРЦ');container.append(panel);
  const shopOpen=document.createElement('button');shopOpen.className='mall-shop-open';shopOpen.hidden=true;container.append(shopOpen);
  const storeView=document.createElement('button');storeView.className='mall-store-view';storeView.hidden=true;container.append(storeView);
  const buttons=new Map();
  for(const f of [...MALL_FLOORS].reverse()){
    const b=document.createElement('button');b.textContent=`F${f.id}`;b.title=f.name;b.setAttribute('aria-label',`F${f.id} — ${f.name}`);b.onclick=()=>inspect(f.id);buttons.set(f.id,b);panel.append(b);
  }
  for(const [title,callback]of [['ALL',()=>inspect(null)],['EXIT',()=>exit()]]){const b=document.createElement('button');b.textContent=title;b.onclick=callback;panel.append(b);}
  const wingControls=document.createElement('div');wingControls.className='mall-wing-controls';wingControls.hidden=true;
  for(const [symbol,zone,title]of [['◀ Ліве','west','Ліве крило'],['◎ Атріум','atrium','Центральний атріум'],['Праве ▶','east','Праве крило']]){const b=document.createElement('button');b.textContent=symbol;b.title=title;b.setAttribute('aria-label',title);b.onclick=()=>inspect(selected||1,zone);wingControls.append(b);}container.append(wingControls);
  const runtime=createMallRuntime({getGame,onPurchase,onUse,onGoal,onComplete,
    onRouteBlocked:v=>onError("Не знайшов вільний прохід у "+mallStore(v.storeId).name+". Покупка й інвентар збережені."),
    serviceFrames:(s,slot,radius)=>mallAccessibleService(s,slot,radius,root.userData.obstacles.get(s.floor)),
    route:(floor,from,to,radius,dynamic)=>root?mallPath(floor,from,to,radius,root.userData.obstacles.get(floor),dynamic):null,
    canWalkSegment:(floor,from,to,radius)=>!!root&&mallSegmentClear(from,to,radius,root.userData.obstacles.get(floor)),
    vendorReady:v=>{const employee=staff.find(e=>e.floor===v.floor),target=mallServiceFrames(mallStore(v.storeId)).vendor;return !!employee&&employee.storeId===v.storeId&&employee.carrier.position.distanceToSquared(world(target))<.03;},
  });
  const sharedGeo=new THREE.BoxGeometry(1,1,1),bagMaterial=new THREE.MeshStandardMaterial({color:0xc86abb,roughness:.55}),trimMaterial=new THREE.MeshBasicMaterial({color:0xffdb99});
  const local=p=>({x:p.x-centre[0],y:p.y,z:p.z-centre[1]});
  const world=p=>new THREE.Vector3(p.x+centre[0],p.y,p.z+centre[1]);
  async function prepareNavigation(floor,radius){
    const boxes=root?.userData.obstacles.get(floor);if(!boxes)return false;
    if(mallNavigationReady(boxes,radius))return true;
    const key=floor+':'+radius;if(navigationPending.has(key))return navigationPending.get(key);
    const promise=prepare(mallNavigationSteps(boxes,radius),abort.signal).then(()=>!disposed).finally(()=>navigationPending.delete(key));navigationPending.set(key,promise);return promise;
  }
  async function ensure(){
    if(pending)return pending;if(root)return root;
    pending=(async()=>{
      let model;
      try{
        await Promise.all([prepareMosaWaterReflection(),prepareMosaRockSurfaces(),prepareMosaReefs(),prepareMallArt()]);
        model=await prepare(mallModelSteps(),abort.signal);
        await prepare(model.userData.backgroundSteps(),abort.signal);
        for(const cat of model.userData.ownedCats||[])if(cat.userData.mallBackground)registerCat(cat);
        model.position.set(centre[0],0,centre[1]);model.userData.biomeId='autumn';
        const ghosts=[...model.userData.floors.values()].map(f=>f.userData.ghost).filter(Boolean);
        for(const ghost of ghosts)ghost.visible=true;
        try{await prepareModel(model);}finally{for(const ghost of ghosts)ghost.visible=false;model.userData.focusFloor(null);}
        if(disposed){disposeModel(model);return null;}
        pauseHiddenMatrixUpdates(model);for(const f of model.userData.floors.values())pauseHiddenMatrixUpdates(f);cacheSceneMatrices(model);scene.add(model);root=model;
        // Original native rigs, one roaming cashier per floor, prepared in
        // separate scheduler slices. No portrait renders or separate AI.
        function* staffSteps(){for(const f of MALL_FLOORS){yield;const profile=NEIGHBORS[(f.id*3)%NEIGHBORS.length],cat=createCat('happy',{detail:'npc',...catAppearance(profile)});cat.scale.setScalar(.63);registerCat(cat);yield;yield* mallNavigationSteps(model.userData.obstacles.get(f.id),catNavigationRadius(cat));const carrier=new THREE.Group();carrier.add(cat);pauseHiddenMatrixUpdates(carrier);carrier.userData.biomeId='autumn';const store=MALL_STORES.find(s=>s.floor===f.id);carrier.position.copy(world(mallServiceFrames(store).vendor));staff.push({floor:f.id,cat,carrier,radius:catNavigationRadius(cat),storeId:store.id,path:[]});yield;}}
        await prepare(staffSteps(),abort.signal);
        for(const employee of staff){
          await prepareModel(employee.carrier);
          if(disposed)break;
          scene.add(employee.carrier);
        }
        for(const f of MALL_ICE_FLAVORS){if(disposed)break;await prepareModel(mallIceServing(f.key));}
        return disposed?null:root;
      }catch(error){
        if(!disposed)onError(error.message);
        if(!root&&model)disposeModel(model);
        return null;
      }finally{pending=null;}
    })();
    return pending;
  }
  async function inspect(floor=null,zone=null){
    const model=await ensure();if(!model||disposed)return false;
    shopOpen.hidden=true;storeView.hidden=true;const entering=!inspection;onCamera?.(floor,entering,zone);wingControls.hidden=!floor;
    inspection=true;container.classList.add('mall-inspection');selected=floor;panel.hidden=false;
    model.userData.focusFloor(floor);
    for(const [id,b]of buttons)b.setAttribute('aria-pressed',String(id===floor));
    return true;
  }
  function exit(restore=true){
    if(!inspection)return;
    inspection=false;container.classList.remove('mall-inspection');selected=null;
    panel.hidden=true;wingControls.hidden=true;shopOpen.hidden=true;storeView.hidden=true;root?.userData.focusFloor(null);onExit?.(restore);
  }
  async function inspectStore(id){
    const store=mallStore(id);if(!store||!await inspect(store.floor))return false;
    wingControls.hidden=true;root.userData.focusStore(id);
    onStoreCamera?.(store);shopOpen.textContent=store.name+' · Каталог';shopOpen.hidden=false;
    let inside=false;storeView.hidden=false;storeView.textContent='Оглянути зал';storeView.setAttribute('aria-pressed','false');
    storeView.onclick=()=>{inside=!inside;storeView.textContent=inside?'До вітрини':'Оглянути зал';storeView.setAttribute('aria-pressed',String(inside));onStoreCamera?.(store,inside);};
    shopOpen.onclick=()=>onStore?.(id);return true;
  }
  access.onclick=()=>inspect();
  function disposeModel(model){
    for(const cat of model.userData.ownedCats||[]){cat.removeFromParent();disposeCat(cat);}
    const geometries=new Set(),materials=new Set(),textures=new Set(model.userData.ownedTextures||[]),borrowedTextures=model.userData.borrowedTextures||new Set();
    if(model.userData.atlas)textures.add(model.userData.atlas);
    model.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);if(o.customDepthMaterial)materials.add(o.customDepthMaterial);if(o.isInstancedMesh)o.dispose();}});
    const borrowed=model.userData.borrowed||new Set();
    for(const g of geometries)if(!borrowed.has(g))g.dispose();
    for(const m of materials){for(const value of Object.values(m))if(value?.isTexture)textures.add(value);for(const uniform of Object.values(m.uniforms||{}))if(uniform.value?.isTexture)textures.add(uniform.value);m.dispose();}
    for(const t of textures)if(!borrowedTextures.has(t)&&!t.userData.sharedScenery)t.dispose();
    model.removeFromParent();
  }
  return {
    runtime,ensure,inspect,inspectStore,exit,
    get root(){return root;},get ready(){return !!root&&!pending&&staff.length===7&&staff.every(s=>s.carrier.parent);},get inspection(){return inspection;},get floor(){return selected;},
    async start(id,storeId,{productId=null,ticket=null,useOwned=false}={}){
      const actor=getActors().find(a=>a.id===id),store=mallStore(storeId);if(!actor||!store)return false;
      const model=await ensure();if(!model||disposed||!canSimulate())return false;
      if(!await prepareNavigation(store.floor,actor.radius))return false;
      return runtime.start(id,storeId,local(actor.position),{radius:actor.radius,productId,ticket,browseOnly:productId===null,useOwned});
    },
    startReady(id,storeId,ticket=null){
      const actor=getActors().find(a=>a.id===id),store=mallStore(storeId);
      if(!this.ready||!actor||!store)return false;
      if(!mallNavigationReady(root.userData.obstacles.get(store.floor),actor.radius)){
        void prepareNavigation(store.floor,actor.radius).catch(error=>{if(!disposed)onError(error.message);});return false;
      }
      return runtime.start(id,storeId,local(actor.position),{radius:actor.radius,ticket,resume:getGame().jobCity?.profiles[id]?.mall?.goal});
    },
    has:id=>runtime.has(id)||personal.has(id),
    startPersonal(id,itemId){
      const a=getActors().find(a=>a.id===id),item=mallProduct(itemId);
      if(!a||!item||runtime.has(id)||personal.has(id)||personal.size>=6||!getGame().jobCity?.profiles[id]?.inventory[itemId])return false;
      personal.set(id,{id,item,position:a.position.clone(),yaw:a.carrier.rotation.y,elapsed:0});return true;
    },
    cancel(id){personal.delete(id);runtime.cancel(id);},
    detach(id){personal.delete(id);runtime.detach(id);},
    frame(id,time){
      const p=personal.get(id);
      if(p){const iceCream=p.item.iceFlavor?mallIceEating(p.elapsed,p.item.iceFlavor,reduced):null;return{iceCream,position:p.position,yaw:p.yaw,walking:false,reaction:{headPitch:p.item.use==='eat'?.27:p.item.use==='rest'?.18:-.08,paw:reduced?0:.18+Math.sin(p.elapsed*2)*.13,crouch:p.item.use==='rest'?.2:0,...(iceCream?{...iceCream.reaction,iceHolding:true,iceLick:iceCream.lick}:{})}};}
      const f=runtime.frame(id,time,reduced);return f?{...f,position:world(f.position)}:null;
    },
    safePosition(id){const p=runtime.safePosition(id);return p?world(p):null;},
    pick(raycaster){
      if(!root?.visible)return false;
      const hits=raycaster.intersectObject(root,true).filter(h=>{let o=h.object;while(o){if(!o.visible||o.userData.mallGhost)return false;o=o.parent;}return true;});
      const hit=hits[0];
      if(!hit)return false;
      if(!inspection){void inspect();return true;}
      for(const contact of hits){
        const geometry=contact.object.geometry,ids=geometry?.getAttribute('aMallRoom');if(!ids||contact.faceIndex==null)continue;
        const vertex=ids.isInstancedBufferAttribute?(contact.instanceId||0):geometry.index?geometry.index.getX(contact.faceIndex*3):contact.faceIndex*3,id=root.userData.roomStoreIds?.[ids.getX(vertex)],store=mallStore(id);
        if(store&&(!selected||store.floor===selected)){void inspectStore(id);return true;}
      }
      const p=local(hit.point),floor=selected||Math.max(1,Math.min(7,Math.floor((p.y-MALL.y)/MALL.rise)+1));
      const store=MALL_STORES.filter(s=>s.floor===floor).sort((a,b)=>Math.hypot(p.x-a.x,p.z-a.z)-Math.hypot(p.x-b.x,p.z-b.z))[0];
      if(store)void inspectStore(store.id);return true;
    },
    update(dt,time){
      const game=getGame(),active=getFocused()==='autumn',visible=active||getOverview();
      access.hidden=!active||!game.unlocked.includes('autumn');
      if(active&&game.unlocked.includes('autumn')&&!root&&!pending)void ensure();
      if(root){root.visible=visible;if(visible){if(inspection)root.userData.inspectionElevation(getCameraElevation());root.userData.update(time,reduced);}}
      runtime.step(dt,time,{allow:canSimulate(),blocked});
      const iceOrder=[...runtime.visits.values()].find(v=>v.storeId==='mall-ice'&&v.phase==='checkout');
      root?.userData.iceCreamStation?.setServing(iceOrder?mallProduct(iceOrder.productId)?.iceFlavor:null,iceOrder?.elapsed||0);
      if(canSimulate())for(const [id,p]of personal){
        if(blocked(id)){personal.delete(id);continue;}
        p.elapsed+=dt;if(p.elapsed>8){personal.delete(id);try{onUse(id,p.item.id);}catch(error){onError(error.message);}}
      }
      root?.userData.updateLift(runtime.lift.y,runtime.lift.opening);
      if(this.ready&&canSimulate()&&Math.floor(time)!==lastResume){
        lastResume=Math.floor(time);
        for(const a of getActors()){
          const goal=game.jobCity?.profiles[a.id]?.mall?.goal;
          if(goal&&!this.has(a.id)&&!blocked(a.id)&&Date.now()-goal.at<1800000){if(this.startReady(a.id,goal.storeId))break;}
        }
      }
      for(const s of staff){
        s.carrier.visible=visible&&(!selected||s.floor===selected);
        // Physical work continues offscreen. Only the native visual pose sleeps.
        const visitor=[...runtime.visits.values()].find(v=>mallStore(v.storeId)?.floor===s.floor&&['compare','checkout','joy'].includes(v.phase));
        const store=mallStore(visitor?.storeId)||mallStore(s.storeId);
        const target=mallServiceFrames(store).vendor;
        if(canSimulate()&&s.storeId!==store.id){
          const path=mallPath(s.floor,local(s.carrier.position),target,s.radius,root.userData.obstacles.get(s.floor));
          if(path){s.path=path.map(world);s.storeId=store.id;}
        }
        let walking=false;
        if(canSimulate()&&s.path.length){
          const next=s.path[0],delta=next.clone().sub(s.carrier.position),length=delta.length();
          if(length<.02)s.path.shift();else{
            const candidate=s.carrier.position.clone().addScaledVector(delta,Math.min(1,dt*3.6/length));
            const occupied=[...runtime.visits.values()].some(v=>Math.abs(v.position.y-target.y)<2&&Math.hypot(v.position.x+centre[0]-candidate.x,v.position.z+centre[1]-candidate.z)<s.radius+v.radius+.08);
            if(!occupied){s.carrier.position.copy(candidate);s.carrier.rotation.y=Math.atan2(delta.x,delta.z);walking=true;}
          }
        }
        if(!s.path.length)s.carrier.rotation.y=-Math.PI/2-store.angle;
        if(!s.carrier.visible)continue;
        animateCat(s.cat,time+s.floor,walking,reduced);if(visitor&&!walking)reactCat(s.cat,{paw:reduced?0:Math.max(0,Math.sin(time*2.8))*.6,headPitch:.03},reduced);
      }
      const actors=getActors();for(const a of actors){
        const f=runtime.frame(a.id,time,reduced),equipped=mallProduct(game.jobCity?.profiles[a.id]?.mall?.equipped),showBag=!!f?.carrying;
        let accessory=worn.get(a.id);
        if(equipped&&(!accessory||accessory.userData.itemId!==equipped.id)){
          if(accessory){accessory.removeFromParent();accessory.traverse(o=>{if(o.isMesh)o.geometry.dispose();});}
          accessory=new THREE.Group();accessory.userData.itemId=equipped.id;
          if(equipped.id.endsWith('-bow')){for(const side of [-1,1]){const bow=new THREE.Mesh(new THREE.SphereGeometry(1,16,10),bagMaterial);bow.position.set(side*.13,.4,.1);bow.scale.set(.16,.11,.055);accessory.add(bow);}}
          else if(equipped.id.endsWith('-headset')){const band=new THREE.Mesh(new THREE.TorusGeometry(.45,.035,8,32,Math.PI),trimMaterial);accessory.add(band);for(const side of [-1,1]){const pad=new THREE.Mesh(new THREE.SphereGeometry(1,16,10),bagMaterial);pad.position.x=side*.44;pad.scale.set(.08,.15,.14);accessory.add(pad);}}
          else{const collar=new THREE.Mesh(new THREE.TorusGeometry(.27,.035,8,32),trimMaterial);collar.rotation.x=Math.PI/2;collar.position.set(0,-.3,-.06);accessory.add(collar);const charm=new THREE.Mesh(new THREE.SphereGeometry(.065,12,8),bagMaterial);charm.position.set(0,-.34,.22);accessory.add(charm);}
          a.model.userData.head.add(accessory);worn.set(a.id,accessory);
        }
        if(accessory)accessory.visible=!!equipped;
        let prop=props.get(a.id);
        if(showBag&&!prop){prop=new THREE.Group();const bag=new THREE.Mesh(sharedGeo,bagMaterial);bag.scale.set(.65,.7,.3);prop.add(bag);const stripe=new THREE.Mesh(sharedGeo,trimMaterial);stripe.position.z=.16;stripe.scale.set(.12,.45,.02);prop.add(stripe);scene.add(prop);props.set(a.id,prop);}
        if(prop){prop.visible=showBag;if(prop.visible){const scale=a.model.scale.x;prop.scale.setScalar(scale);prop.position.copy(a.position);prop.position.x+=Math.cos(a.carrier.rotation.y)*.72*scale;prop.position.z-=Math.sin(a.carrier.rotation.y)*.72*scale;prop.position.y+=.65*scale;prop.rotation.y=a.carrier.rotation.y;}}
        let ice=iceProps.get(a.id);
        const iceFrame=f?.iceCream||(personal.get(a.id)?.item.iceFlavor?mallIceEating(personal.get(a.id).elapsed,personal.get(a.id).item.iceFlavor,reduced):null);
        if(iceFrame){
          if(ice?.userData.iceFlavor!==iceFrame.flavor){ice?.removeFromParent();ice=mallIceServing(iceFrame.flavor);ice.matrixAutoUpdate=false;scene.add(ice);iceProps.set(a.id,ice);}
          const scale=1-iceFrame.progress*.70;ice.userData.cream.scale.y=scale;ice.userData.cream.position.y=.55*(1-scale);ice.visible=a.carrier.visible;
        }else if(ice){ice.removeFromParent();iceProps.delete(a.id);}
      }
    },
    updateHeld(){if(!iceProps.size)return;for(const a of getActors()){
      const ice=iceProps.get(a.id),d=a.model.userData,index=d.legs.findIndex(leg=>leg.position.z>0&&leg.position.x>0),ankle=d.legJoints?.[index]?.ankle;
      if(!ice||!ankle)continue;
      ankle.getWorldPosition(icePoint);a.model.worldToLocal(icePoint);icePoint.y-=.31;icePoint.z+=.13;
      iceOffset.makeTranslation(icePoint.x,icePoint.y,icePoint.z);ice.matrix.multiplyMatrices(a.model.matrixWorld,iceOffset).scale(iceScale);ice.matrixWorldNeedsUpdate=true;ice.visible=a.carrier.visible;
    }},
    dispose(){disposed=true;abort.abort();runtime.clear();personal.clear();navigationPending.clear();for(const ice of iceProps.values())ice.removeFromParent();iceProps.clear();for(const g of worn.values()){g.removeFromParent();g.traverse(o=>{if(o.isMesh)o.geometry.dispose();});}worn.clear();access.remove();panel.remove();wingControls.remove();shopOpen.remove();storeView.remove();if(root)disposeModel(root);root=null;for(const s of staff){s.carrier.removeFromParent();disposeCat(s.cat);}for(const p of props.values())p.removeFromParent();props.clear();sharedGeo.dispose();bagMaterial.dispose();trimMaterial.dispose();},
  };
}
