import {test} from 'node:test';import assert from 'node:assert/strict';
import {SHOWCASE_WATER_RIDES} from '../public/showcase-water-data.js';
import {createShowcaseRoute} from '../public/showcase-water-motion.js';
import {CATALOG,BIOMES} from '../public/game-data.js';
import {REFERENCE_SLIDES} from '../public/reference-slide-data.js';import {ATOLL_SLIDES} from '../public/atoll-slide-data.js';
import {WATER_RIDES} from '../public/water-ride-data.js';
import {referenceSlideAttraction} from '../public/reference-slide-assets.js';
import {reserveSlide,launchSlide,releaseSlide,hasSlideRoom} from '../public/slide-riders.js';
import {disposeScenery} from '../public/scenery-models.js';
import * as T from 'three';
import {newGame,purchase,findSpace,placeItem,storeItem,saveGame,loadGame} from '../public/economy.js';
import {xpForLevel,MAX_LEVEL} from '../public/progression.js';
import {mergeSharedWorld} from '../shared-world.mjs';
import {createHash} from 'node:crypto';
import {createResidentPlay} from '../public/resident-play.js';
import {ADOPTION_CATS,catAppearance} from '../public/cat-breeds.js';

test('exactly ten original reference products append while the released 25/20 collections and islands stay intact',()=>{
 assert.equal(SHOWCASE_WATER_RIDES.length,10);assert.equal(REFERENCE_SLIDES.length,25);assert.equal(ATOLL_SLIDES.length,20);assert.equal(new Set(SHOWCASE_WATER_RIDES.map(s=>s.id)).size,10);assert.equal(BIOMES.length,19);
 for(const s of SHOWCASE_WATER_RIDES){assert.equal(CATALOG.find(x=>x.id===s.id),s);assert.equal(WATER_RIDES.filter(x=>x.id===s.id).length,1);assert.ok(s.price>=80000&&s.price<=250000);assert.ok(s.footprint[0]>=100&&s.footprint[1]>=100);}
});
test('every authored state boundary is continuous for each actual passenger seat and stays within the complete placement',()=>{
 for(const s of SHOWCASE_WATER_RIDES){const r=createShowcaseRoute(s);for(let i=0;i<s.seats;i++){
  for(const leg of r.legs.slice(1)){const a=r.frame(leg.start-1e-7,false,i),b=r.frame(leg.start+1e-7,false,i);assert.ok(Math.hypot(...a.position.map((v,j)=>v-b.position[j]))<.001,s.kind+':'+leg.phase);}
  for(let t=0;t<r.duration;t+=.1){const f=r.frame(t,false,i);assert.ok(f.position.every(Number.isFinite));assert.ok(Math.abs(f.position[0])<s.footprint[0]/2&&Math.abs(f.position[2])<s.footprint[1]/2,s.kind+': footprint '+f.position);}
  assert.equal(r.frame(r.duration+.1,false,i).phase,'done');
 }}
});
test('launch uses 9.81 gravity; the river, standing halfpipe and fixed suspension have their own mechanics',()=>{
 for(const s of SHOWCASE_WATER_RIDES){const r=createShowcaseRoute(s);assert.ok(r.legs.some(l=>l.phase==='exit'));if(s.kind==='lagoon-launch'){const f=r.flights[0];assert.equal(f.gravity,9.81);for(const u of [.2,.5,.8]){const p=r.vehicleFrame(f.start+u*f.duration).position,t=u*f.duration;assert.ok(Math.abs(p[1]-(f.from[1]+f.vy*t-.5*9.81*t*t))<1e-7);}}
 if(s.kind==='lazy-river')assert.ok(r.legs.find(l=>l.phase==='float').duration>=40&&r.legs.find(l=>l.phase==='float').duration<=48);
 if(s.kind==='pool-pendulum'){const leg=r.legs.find(l=>l.phase==='swing');for(let u=0;u<=1;u+=.01){const f=r.vehicleFrame(leg.start+u*leg.duration),q=new T.Quaternion().fromArray(f.quaternion),top=new T.Vector3(0,44,0).applyQuaternion(q).add(new T.Vector3(...f.position));assert.ok(top.distanceTo(new T.Vector3(0,46,0))<1e-6);}}
 }
});
test('all ten complete prefabs have continuous registered water, bounded live boats and immutable animation buffers',()=>{
 for(const s of SHOWCASE_WATER_RIDES){const g=referenceSlideAttraction(s.id),d=g.userData;assert.equal(d.slideWater.channels.length+d.slideWater.materials.filter(m=>m.uniforms.uFlowing.value===2).length,s.channels,s.kind);assert.equal(d.route.waterRideSpeed,1);if(s.kind==='lazy-river'){assert.equal(d.hollowPassages.length,1);const tunnel=d.hollowPassages[0],leg=d.route.legs.find(l=>l.phase==='float');let crossed=0;for(let u=.4;u<.6;u+=.002){const p=d.route.frame(leg.start+u*leg.duration).position;if(Math.abs(p[0])>9)continue;assert.ok(Math.hypot(p[1]-tunnel.y,p[2]-tunnel.z)<tunnel.innerRadius-3.4,'the actual ring clears the hollow tunnel');crossed++;}assert.ok(crossed>10);}const matrices=[];g.traverse(o=>{if(o.isInstancedMesh)matrices.push([o,o.instanceMatrix.version]);});const tickets=[];for(let i=0;i<(s.seats>1?s.seats:4);i++){const v=reserveSlide(g,'cat-'+i);assert.ok(v);tickets.push(v);launchSlide(g,v,1000+i*200);}assert.equal(hasSlideRoom(g),false);if(s.seats>1)assert.equal(new Set(tickets.map(v=>v.launchAt)).size,1);
 const boarding=d.route.legs.find(l=>l.phase==='anticipation').start+.8;for(const v of tickets)v.elapsed=boarding;d.update(boarding,false);assert.ok(d.slideVehicles.some(v=>v?.visible),s.kind+' occupied boat must be visible during boarding/anticipation');
 for(let tick=0;tick<120;tick++){const t=d.route.rideStart+tick*.05;for(const v of tickets)v.elapsed=t;d.update(t,false);}for(const [o,version]of matrices)assert.equal(o.instanceMatrix.version,version,s.kind+' animated GPU matrix upload');
 if(d.sharedVehicle)assert.equal(d.slideVehicles.filter(v=>v?.visible).length,1);for(const v of tickets)releaseSlide(g,v.id);d.update(130,false);assert.ok(d.slideVehicles.every(v=>!v?.visible));disposeScenery(g);
 }
});

test('surfing uses the native cat joints and leaves no lasting offset or rotation after a long ride',async()=>{
 const {createCat,animateCat,reactCat,disposeCat}=await import('../public/cat-model.js'),{applyAtollSit}=await import('../public/atoll-slide-acting.js');
 const a=createCat('happy',{detail:'npc'}),b=createCat('happy',{detail:'npc'}),parts=['head','body','chest'];
 for(let t=0;t<8;t+=1/60){animateCat(a,t,false,false);reactCat(a,{waterSurf:1,crouch:.1});applyAtollSit(a,{waterSurf:1},false);}
 animateCat(a,10,false,false);animateCat(b,10,false,false);for(const k of parts){assert.ok(a.userData[k].position.distanceTo(b.userData[k].position)<1e-8,k+' lingering position');assert.ok(a.userData[k].quaternion.angleTo(b.userData[k].quaternion)<1e-7,k+' lingering rotation');}disposeCat(a);disposeCat(b);
});

test('all ten purchases debit once, survive construction, storage, cached merges and repeated durable reloads',()=>{
 const now=Date.UTC(2026,10,2,12),storage=new Map(),adapter={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
 let game=newGame(now);game.unlocked.push('homestead');game.progression.xp=xpForLevel(MAX_LEVEL);
 const existing=structuredClone(game.placements),placed=[];
 for(const spec of SHOWCASE_WATER_RIDES){
  game.coins=900000;const before=game.coins;game=purchase(game,spec.id,now);assert.equal(game.coins,before-spec.price);
  const point=findSpace(game,spec.id,'atoll-park',1);assert.ok(point,spec.kind+' must fit beside other full-size complexes');
  game=placeItem(game,spec.id,'atoll-park',point.x,point.z,1,now);const p=game.placements.at(-1);assert.equal(p.readyAt,now+spec.buildMinutes*60000);placed.push(p.id);
 }
 const snapshot=structuredClone(game);for(let i=0;i<3;i++){saveGame(adapter,game);game=loadGame(adapter,now,{advance:false});assert.equal(game.coins,snapshot.coins);assert.deepEqual(game.placements,snapshot.placements);}
 for(const id of placed){const before=game.coins,completed=game.placements.find(p=>p.id===id).readyAt+1;game=storeItem(game,id,completed);assert.equal(game.coins,before);}
 for(const spec of SHOWCASE_WATER_RIDES){assert.equal(game.inventory[spec.id],1);const point=findSpace(game,spec.id,'atoll-park');game=placeItem(game,spec.id,'atoll-park',point.x,point.z,0,now+100000000);assert.equal(game.placements.at(-1).readyAt,0);}
 assert.deepEqual(game.placements.filter(p=>existing.some(o=>o.id===p.id)),existing);
 const stale=structuredClone(game);stale.placements=stale.placements.filter(p=>!SHOWCASE_WATER_RIDES.some(s=>s.id===p.item));for(const s of SHOWCASE_WATER_RIDES){delete stale.inventory[s.id];delete stale.builtInventory[s.id];delete stale.referenceOwnership[s.id];}
 const merged=mergeSharedWorld(game,game,stale);assert.deepEqual(merged.placements,game.placements);assert.equal(merged.coins,game.coins);
 const poor=newGame(now);poor.coins=0;poor.progression.xp=xpForLevel(MAX_LEVEL);const before=structuredClone(poor);assert.throws(()=>purchase(poor,SHOWCASE_WATER_RIDES[0].id,now));assert.deepEqual(poor,before);
});

test('all ten actual wet mechanics activate measured-speed reactions and distinct native choreography',()=>{
 const signatures=new Set();for(const spec of SHOWCASE_WATER_RIDES){const model=referenceSlideAttraction(spec.id),r=model.userData.route,frames=[];
  const wet=r.legs.filter(l=>!['board','climb','anticipation','hold','lift','exit','splash','unload'].includes(l.phase));assert.ok(wet.length);
  for(const leg of wet)for(const u of [.2,.4,.6,.8]){const a=model.userData.rideReaction(leg.start+u*leg.duration);assert.ok(a.weight>.9,spec.kind+' inactive '+leg.phase);assert.ok(a.speed>0,spec.kind+' unmeasured speed');assert.ok(Object.values(a).every(v=>typeof v!=='number'||Number.isFinite(v)));frames.push({...a});}
  signatures.add(createHash('sha256').update(JSON.stringify(frames)).digest('hex'));disposeScenery(model);
 }assert.equal(signatures.size,10);
});

test('surface micro-detail reuses immutable textures and does not add shader callbacks or runtime transfers',()=>{
 const maps=new Set(),versions=[];for(const spec of SHOWCASE_WATER_RIDES.slice(0,2)){
  const model=referenceSlideAttraction(spec.id);model.traverse(o=>{if(o.isMesh&&o.material.userData.showcaseSurface){for(const t of [o.material.map,o.material.normalMap,o.material.roughnessMap]){assert.equal(t.userData.sharedScenery,true);maps.add(t);versions.push([t,t.version]);}assert.ok(o.material.isMeshStandardMaterial);}});
  for(let i=0;i<100;i++)model.userData.update(i/60,false);disposeScenery(model);
 }assert.equal(maps.size,9);for(const [texture,version]of versions)assert.equal(texture.version,version);
});

test('staggered real resident frames share one departure and one raft; cancellation keeps the remaining passenger aboard',()=>{
 const g=referenceSlideAttraction('ride-water-canyon-rafting'),d=g.userData,actors=new Map(['one','two'].map(id=>[id,{index:0,profile:{biome:'homestead'},carrier:new T.Group()}]));g.userData.placement={biome:'homestead'};
 const runtime=createResidentPlay({getCat:id=>actors.get(id),getObject:()=>g,concurrentSlides:true});
 for(const id of actors.keys())assert.equal(runtime.start(id,{action:'ride',activityId:'raft'},0),true);
 const arrival=Math.max(...[...actors.keys()].map(id=>runtime.get(id).travel))+1;
 runtime.frame('one',arrival,arrival/1000);runtime.frame('two',arrival+300,(arrival+300)/1000);
 runtime.frame('one',arrival+1100,(arrival+1100)/1000);runtime.frame('two',arrival+1400,(arrival+1400)/1000);
 const departure=runtime.get('one').rider.launchAt;assert.equal(departure,arrival+1100+15000);assert.equal(runtime.get('two').rider.launchAt,departure);
 runtime.frame('one',departure+30,(departure+30)/1000);runtime.frame('two',departure+110,(departure+110)/1000);
 assert.equal(runtime.get('one').activityStart,runtime.get('two').activityStart);
 const now=departure+(d.route.rideStart-d.route.boardingEnd+4)*1000;
 for(const id of actors.keys()){const f=runtime.frame(id,now,now/1000),v=runtime.get(id),expected=new T.Vector3(...d.rideFrame(v.elapsed,false,v.rider.lane).position);assert.ok(f.position.distanceTo(expected)<1e-7);}
 d.update(now/1000,false);assert.equal(d.slideVehicles.filter(v=>v?.visible).length,1);
 runtime.cancel('one');assert.equal(d.slideRiders.size,1);assert.equal(d.slideVehicles.filter(v=>v?.visible).length,1);
 runtime.cancel('two');d.update(now/1000+.1,false);assert.equal(d.slideRiders.size,0);assert.equal(d.slideVehicles.filter(v=>v?.visible).length,0);disposeScenery(g);
});

test('the largest approved cat keeps actual animated paw vertices above each real moving boat deck',async()=>{
 const {createCat,animateCat,reactCat,disposeCat}=await import('../public/cat-model.js'),{applyAtollSit}=await import('../public/atoll-slide-acting.js'),profile=ADOPTION_CATS.find(p=>p.id==='adopt-marshmallow'),cat=createCat('happy',catAppearance(profile)),carrier=new T.Group(),p=new T.Vector3();cat.scale.setScalar(.63*profile.size);carrier.add(cat);let checked=0;
 try{for(const spec of SHOWCASE_WATER_RIDES){const model=referenceSlideAttraction(spec.id),d=model.userData,ticket=reserveSlide(model,'largest-cat');launchSlide(model,ticket,0);
  for(const leg of d.route.legs.filter(l=>['ride','vortex','rafting','drop','boost','flight','surf','float','carousel','swing'].includes(l.phase)))for(const u of [.2,.5,.8]){
   const t=leg.start+u*leg.duration,f=d.rideFrame(t,false,ticket.lane);carrier.position.set(...f.position);carrier.quaternion.fromArray(f.quaternion);animateCat(cat,t,false);const reaction=d.rideReaction(t,false,ticket.lane);reactCat(cat,reaction);applyAtollSit(cat,reaction);carrier.updateMatrixWorld(true);ticket.elapsed=t;d.update(t,false);model.updateMatrixWorld(true);const boat=d.slideVehicles.find(v=>v?.visible);assert.ok(boat);const inverse=boat.matrixWorld.clone().invert();
   for(const limb of cat.userData.legs){const shin=limb.getObjectByName('Shin');shin.skeleton.update();for(let i=0;i<shin.geometry.attributes.position.count;i+=8){shin.getVertexPosition(i,p).applyMatrix4(shin.matrixWorld).applyMatrix4(inverse);assert.ok(p.y>-.03,spec.kind+' '+leg.phase+' paw through actual boat '+p.y);checked++;}}
  }releaseSlide(model,ticket.id);disposeScenery(model);
 }}finally{disposeCat(cat);}assert.ok(checked>10000);
});
