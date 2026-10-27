import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {ATOLL_SLIDES,ATOLL_PARK_ID,atollPlot} from '../public/atoll-slide-data.js';
import {CATALOG,BIOMES} from '../public/game-data.js';
import {createReferenceRoute} from '../public/reference-slide-motion.js';
import {makeAttraction} from '../public/world-assets.js';
import {disposeScenery} from '../public/scenery-models.js';
import {sampleRideActing,rideActingFrame} from '../public/ride-acting.js';
import {atollRideReaction} from '../public/atoll-slide-acting.js';
import {newGame,purchase,findSpace,placeItem,canPlace,storeItem,saveGame,loadGame} from '../public/economy.js';
import {xpForLevel,MAX_LEVEL} from '../public/progression.js';
import {collectIncome,revenueRate,businessXP} from '../public/business.js';
import {reserveSlide,launchSlide,releaseSlide,updateSlideVehicles,SLIDE_HEADWAY_MS} from '../public/slide-riders.js';
import {mergeSharedWorld} from '../shared-world.mjs';
import {atollPreparationNeeded} from '../public/atoll-streaming.js';
import {atollApproach} from '../public/atoll-slide-navigation.js';
import {worldRoads} from '../public/world-roads.js';
const now=Date.UTC(2026,9,27,12),hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const seed=()=>{const g=newGame(now);g.coins=10000000;g.progression.xp=xpForLevel(MAX_LEVEL);return g;};
const reload=(g,at=now)=>{const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};saveGame(storage,g);return loadGame(storage,at,{advance:false});};
test('large waterpark streaming starts only one nearby visible complex, never the whole map or while gesturing',()=>{
 const b=BIOMES.find(b=>b.id===ATOLL_PARK_ID),p={biome:b.id,x:0,z:0},state={focused:b.id,look:{x:b.center[0],z:b.center[1]},distance:220,visible:true};
 assert.equal(atollPreparationNeeded(p,b,state),true);
 for(const changed of [{focused:'moon'},{visible:false},{moving:true},{pending:1},{distance:900},{look:{x:0,z:0}}])assert.equal(atollPreparationNeeded(p,b,{...state,...changed}),false);
});
test('approaches take the dry perimeter, use the existing A* for interior obstacles and keep a bounded cache',()=>{
 const s=ATOLL_SLIDES[0],entry=createReferenceRoute(s).entry,nav=atollApproach(s,[{x:0,z:0,radius:12}]);
 for(const from of [[75,.16,70],[-70,.16,60],[0,.16,-70],[40,.16,-16]]){
  assert.deepEqual(nav.frame(from,entry,0),from);const end=nav.frame(from,entry,1);assert.ok(Math.hypot(end[0]-entry[0],end[2]-entry[2])<1e-8);
  for(let i=0;i<=300;i++){const p=nav.frame(from,entry,i/300);assert.ok(p.every(Number.isFinite));assert.ok(Math.hypot((p[0]-s.pool[0])/(s.pool[2]+1),(p[2]-s.pool[1])/(s.pool[3]+1))>=1);assert.ok(Math.hypot(p[0],p[2])>=14-1e-5);}
  assert.ok(nav.duration(from,entry)>900);
 }
 for(let i=0;i<30;i++)nav.frame([80+i,.16,70],entry,.5);assert.equal(nav.cacheSize(),8);
});
test('the annex is a new leaf road and every released road keeps its exact endpoints',()=>{
 const old=BIOMES.filter(b=>b.id!==ATOLL_PARK_ID);
 assert.deepEqual(worldRoads(BIOMES).filter(r=>r.to!==ATOLL_PARK_ID),worldRoads(old));
 assert.equal(worldRoads(BIOMES).find(r=>r.to===ATOLL_PARK_ID).from,'homestead');
});
test('all twenty complexes remain placeable and reloadable alongside sixty existing purchases',()=>{
 let g=seed();g.unlocked.push('homestead');g.placements=Array.from({length:60},(_,i)=>({id:'old-'+i,item:'mouse',biome:'homestead',x:(i%10)*4-20,z:Math.floor(i/10)*4-12,rotation:0,readyAt:0}));
 const old=structuredClone(g.placements);
 for(const s of ATOLL_SLIDES){g.coins=10000000;g=purchase(g,s.id,now);const p=findSpace(g,s.id,ATOLL_PARK_ID);g=placeItem(g,s.id,ATOLL_PARK_ID,p.x,p.z,0,now);}
 assert.equal(g.placements.length,80);const restored=reload(g);assert.deepEqual(restored.placements,g.placements);assert.deepEqual(restored.placements.slice(0,60),old);
 assert.deepEqual(mergeSharedWorld(restored,restored,structuredClone(restored)).placements,restored.placements);
});
test('exactly twenty new row-major premium mini-biomes progress from 80000 to a maximum of 250000 coins',()=>{
 assert.equal(ATOLL_SLIDES.length,20);assert.equal(new Set(ATOLL_SLIDES.map(s=>s.id)).size,20);
 const max=Math.max(...CATALOG.filter(s=>s.waterRide&&!s.premiumWater).map(s=>s.price));assert.equal(max,240000);
 for(const [i,s] of ATOLL_SLIDES.entries()){
  assert.ok(CATALOG.includes(s));assert.deepEqual(s.referenceCell,{index:i+1,row:Math.floor(i/5)+1,column:i%5+1});
  assert.ok(s.price>=80000&&s.price<=250000);if(i)assert.ok(s.price>ATOLL_SLIDES[i-1].price);assert.ok(s.height>=60);assert.ok(s.footprint[0]*s.footprint[1]>54*52*4);
  assert.deepEqual(s.actions,['ride']);assert.ok(revenueRate(s.id)>0);assert.ok(businessXP(s.id)>0);
 }
 assert.equal(ATOLL_SLIDES[0].price,80000);assert.equal(ATOLL_SLIDES[19].price,250000);
 assert.equal(ATOLL_SLIDES[19].kind,'mega-loops');
});
test('all twenty full-size plots fit, retain wide aisles and pay/save/build once without changing any old object',()=>{
 let g=seed();g.unlocked.push('homestead');g.inventory.mouse=1;g=placeItem(g,'mouse','homestead',0,0,0,now);
 const existing=structuredClone(g.placements[0]),ids=[];
 for(const s of ATOLL_SLIDES){g.coins=10000000;const before=g.coins;g=purchase(g,s.id,now);assert.equal(g.coins,before-s.price);assert.ok(g.unlocked.includes(ATOLL_PARK_ID));
  const p=findSpace(g,s.id,ATOLL_PARK_ID);assert.deepEqual(p,atollPlot(s.referenceCell.index-1));
  g=placeItem(g,s.id,ATOLL_PARK_ID,p.x,p.z,0,now);ids.push(g.placements.at(-1).id);
 }
 assert.deepEqual(g.placements[0],existing);assert.equal(new Set(ids).size,20);
 for(const a of g.placements.filter(p=>p.biome===ATOLL_PARK_ID))for(const b of g.placements.filter(p=>p.biome===ATOLL_PARK_ID&&p.id!==a.id))assert.ok(Math.abs(a.x-b.x)>=124||Math.abs(a.z-b.z)>=120);
 const before=structuredClone(g);
 for(let i=0;i<4;i++)g=reload(g);
 assert.deepEqual(g.placements,before.placements);assert.equal(g.coins,before.coins);for(const p of CATALOG)assert.equal(g.inventory[p.id]||0,before.inventory[p.id]||0);
 const stale=structuredClone(g);stale.placements=stale.placements.filter(p=>!p.item.startsWith('slide-atoll-'));stale.unlocked=stale.unlocked.filter(id=>id!==ATOLL_PARK_ID);
 for(const s of ATOLL_SLIDES)delete stale.inventory[s.id];
 const merged=mergeSharedWorld(g,g,stale);assert.deepEqual(merged.placements,g.placements);assert.ok(merged.unlocked.includes(ATOLL_PARK_ID));
});
test('new land is separate and disconnected purchases or insufficient funds cannot charge or create a building',()=>{
 const g=seed(),before=structuredClone(g);g.coins=0;const empty=structuredClone(g);
 assert.throws(()=>purchase(g,ATOLL_SLIDES[0].id,now));assert.deepEqual(g,empty);
 assert.equal(canPlace(before,ATOLL_SLIDES[0].id,ATOLL_PARK_ID,0,0).ok,false);
 const park=BIOMES.find(b=>b.id===ATOLL_PARK_ID);assert.ok(park.radius>=390);
 for(const b of BIOMES.filter(b=>b!==park))assert.ok(Math.hypot(b.center[0]-park.center[0],b.center[1]-park.center[1])>park.radius+(b.radius||12)+4);
});
test('all routes and choreography are unique, continuous, finite, bounded and finish in their own lagoon',()=>{
 const paths=new Set(),acting=new Set();
 for(const s of ATOLL_SLIDES){const route=createReferenceRoute(s);assert.equal(route.lanes.length,s.lanes);const reactions=[];
  paths.add(hash(route.lanes.map(l=>Array.from({length:81},(_,i)=>l.frame(l.duration*i/80).position))));
  for(const lane of route.lanes){const prof=sampleRideActing(lane.frame,lane.duration,lane.impacts);
   for(const leg of lane.legs){if(leg.start){const a=lane.frame(leg.start-1e-7),b=lane.frame(leg.start+1e-7);assert.ok(new T.Vector3(...a.position).distanceTo(new T.Vector3(...b.position))<.002,s.kind+' '+leg.phase);}}
   for(let i=0;i<=1000;i++){const t=lane.duration*i/1000,f=lane.frame(t);assert.ok(f.position.every(Number.isFinite));assert.ok(f.position[1]>=.15);assert.ok(Math.abs(f.position[0])<s.footprint[0]/2&&Math.abs(f.position[2])<s.footprint[1]/2,s.kind);
    const a=atollRideReaction(s,lane,t,rideActingFrame(prof,t),false);assert.ok(Object.values(a).filter(v=>typeof v==='number').every(Number.isFinite));
    if(i%50===0)reactions.push(Object.fromEntries(Object.entries(a).filter(([,v])=>typeof v==='number')));
   }
   assert.deepEqual(lane.frame(lane.duration).position,lane.entry);
   const splash=lane.legs.find(l=>l.phase==='splash');assert.equal(lane.frame(splash.start+.2).position[2],s.pool[1]);
   const reduced=atollRideReaction(s,lane,lane.duration*.5,rideActingFrame(prof,lane.duration*.5,true),true);assert.equal(reduced.weight,0);
  }acting.add(hash(reactions));
 }
 assert.equal(paths.size,20);assert.equal(acting.size,20);
 for(const kind of ['giant-wave','lagoon-loop','mega-loops']){
  const r=createReferenceRoute(ATOLL_SLIDES.find(s=>s.kind===kind));assert.ok(r.geometry.some(g=>g.samples.some(s=>s.up.y<-.8)),kind+' must really invert');
 }
});
test('all real models have the declared channels, bounded static batches, empty hidden rafts and complete footprint clearance',()=>{
 for(const s of ATOLL_SLIDES){const g=makeAttraction(s.id);g.updateMatrixWorld(true);const d=g.userData,w=d.slideWater,b=new T.Box3().setFromObject(g);
  assert.equal(w.channels.length+d.route.bowls.length,s.channels);assert.ok(d.stats.staticMeshes<=16);assert.equal(d.moving.visible,false);
  if(['crystal-cavern','coral-arch'].includes(s.kind)){
    assert.equal(d.landmarkPortals.length,1);
    for(const portal of d.landmarkPortals){
      const inverse=new T.Quaternion(...portal.quaternion).invert();let crossings=0;
      for(const part of d.route.geometry)for(const sample of part.samples){const p=sample.p.clone().sub(new T.Vector3(...portal.center)).applyQuaternion(inverse);
        if(Math.abs(p.z)>portal.depth/2+2.8||p.y< -6.8||p.y>portal.outer+2.8||Math.abs(p.x)>portal.outer+2.8)continue;
        const radius=Math.hypot(p.x,Math.max(0,p.y));
        if(radius>portal.outer+2.8)continue;
        assert.ok(radius<portal.inner-2.8,s.kind+' must clear the real hollow arch');crossings++;
      }assert.ok(crossings>10);
    }
  }
  if(s.kind==='cloud-islets'){assert.ok(d.floatingIslets.length>=4);assert.ok(d.floatingIslets.every(p=>p.bottom>7));}
  assert.ok(b.min.x>=-s.footprint[0]/2&&b.max.x<=s.footprint[0]/2,s.kind+' x');assert.ok(b.min.z>=-s.footprint[1]/2&&b.max.z<=s.footprint[1]/2,s.kind+' z');
  const geometries=new Set();g.traverse(o=>{if(o.geometry)geometries.add(o.geometry);});const count=geometries.size;
  for(let i=0;i<3;i++)d.update(i*.2);const after=new Set();g.traverse(o=>{if(o.geometry)after.add(o.geometry);});assert.equal(after.size,count);
  const tickets=Array.from({length:4},(_,i)=>reserveSlide(g,'cat-'+i));assert.ok(tickets.every(Boolean));assert.equal(reserveSlide(g,'overflow'),null);
  for(const [i,ticket] of tickets.entries()){assert.equal(launchSlide(g,ticket,now),now+i*SLIDE_HEADWAY_MS);ticket.elapsed=d.route.lanes[ticket.lane].legs.find(l=>l.phase==='ride'||l.phase==='vortex').start+.5;}
  updateSlideVehicles(g,false);assert.equal(d.slideVehicles.filter(v=>v.visible).length,4);
  for(const ticket of tickets)releaseSlide(g,ticket.id);assert.equal(d.slideRiders.size,0);assert.equal(d.slideVehicles.filter(v=>v.visible).length,0);
  disposeScenery(g);
 }
});
test('each purchased mini-biome pays existing coins and XP and can be stored and reloaded without a second payment',()=>{
 for(const s of ATOLL_SLIDES){let g=purchase(seed(),s.id,now),p=findSpace(g,s.id,ATOLL_PARK_ID);g=placeItem(g,s.id,ATOLL_PARK_ID,p.x,p.z,0,now);
  g.progression.xp=xpForLevel(20);g.coins=1000000;
  const building=g.placements.at(-1),t=building.readyAt+3600000,result=collectIncome(g,building.id,t);assert.equal(result.amount,revenueRate(s.id));assert.ok(result.xp>0&&result.xp<=businessXP(s.id));
  g=storeItem(result.game,building.id,t);const coins=g.coins;g=reload(g);assert.equal(g.coins,coins);assert.equal(g.inventory[s.id],1);assert.equal(g.builtInventory[s.id],1);
 }
});
test('large premium registers never overflow the established wallet or discard the unpaid balance on reload',()=>{
 const s=ATOLL_SLIDES[19];let g=purchase(seed(),s.id,now),spot=findSpace(g,s.id,ATOLL_PARK_ID);g=placeItem(g,s.id,ATOLL_PARK_ID,spot.x,spot.z,0,now);
 const p=g.placements.at(-1),at=p.readyAt+3600000;g.coins=9999900;g.progression.xp=xpForLevel(20);
 const first=collectIncome(g,p.id,at);assert.ok(first.amount>0&&first.game.coins<=10000000);g=reload(first.game,at);assert.equal(g.coins,first.game.coins);
 g.coins-=s.price;const rest=collectIncome(g,p.id,at+1);assert.equal(first.amount+rest.amount,revenueRate(s.id));assert.ok(rest.game.coins<=10000000);
});
