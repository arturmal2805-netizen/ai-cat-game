import {test} from 'node:test';import assert from 'node:assert/strict';
import {MAGIC_BED,MAGIC_BED_ID,MAGIC_BED_CROPS,MAGIC_BED_SEEDS,MAGIC_BED_SLOTS,magicGrowth} from '../public/magic-bed-data.js';
import {plantMagicSeed,harvestMagicFruit} from '../public/magic-bed-state.js';
import {newGame,purchase,findSpace,placeItem,storeItem,moveItem,canPlace,loadGame,saveGame,SAVE_KEY} from '../public/economy.js';
import {BIOMES,byItem} from '../public/game-data.js';import {xpForLevel} from '../public/progression.js';import {mergeSharedWorld} from '../shared-world.mjs';
const now=Date.now(),seed=()=>{const g=newGame(now);g.coins=1000000;g.progression.xp=xpForLevel(30);g.unlocked.push('homestead');return g;};
function reload(g){const m=new Map(),s={getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)};assert.equal(saveGame(s,g),true);return loadGame(s,now,{advance:false});}
function bed(){let g=purchase(seed(),MAGIC_BED_ID,now);const p=findSpace(g,MAGIC_BED_ID,'homestead');g=placeItem(g,MAGIC_BED_ID,'homestead',p.x,p.z,0,now);g.placements.at(-1).readyAt=0;return g;}
test('one placeable bed has four native bed areas, six distinct seeds/crops and no new islands',()=>{
 assert.equal(BIOMES.length,18);assert.equal(MAGIC_BED.footprint[0]*MAGIC_BED.footprint[1],byItem('farm-field').footprint.reduce((a,b)=>a*b)*4);assert.equal(MAGIC_BED_CROPS.length,6);assert.equal(MAGIC_BED_SEEDS.length,6);assert.equal(new Set(MAGIC_BED_SEEDS.map(s=>s.seedCrop)).size,6);assert.equal(MAGIC_BED_SLOTS.length,12);
 const g=bed();for(const s of MAGIC_BED_SEEDS)assert.equal(canPlace(g,s.id,'homestead',30,30).ok,false);
});
test('each purchased seed plants only its row and passes all six persisted growth stages before an exact harvest',()=>{
 let g=bed();const field=g.placements.at(-1).id;
 for(const [row,s]of MAGIC_BED_SEEDS.entries()){g=purchase(g,s.id,now);const before=g.inventory[s.id];assert.throws(()=>plantMagicSeed(g,field,((row+1)%6)*2,s.id,now));assert.equal(g.inventory[s.id],before);g=plantMagicSeed(g,field,row*2,s.id,now);assert.equal(g.inventory[s.id],before-1);const c=g.farm.fields[field][row*2];const stages=new Set();for(let k=0;k<=60;k++)stages.add(magicGrowth(c,c.plantedAt+(c.readyAt-c.plantedAt)*k/60).stage);assert.equal(stages.size,6);assert.equal(magicGrowth(c,now).ready,false);g=reload(g);assert.deepEqual(g.farm.fields[field][row*2],c);assert.throws(()=>harvestMagicFruit(g,{field,index:row*2,cycle:c.cycle},now));const r=harvestMagicFruit(g,{field,index:row*2,cycle:c.cycle},c.readyAt);g=r.game;assert.equal(g.farm.stock[s.seedCrop],2);assert.throws(()=>harvestMagicFruit(g,{field,index:row*2,cycle:c.cycle},c.readyAt));}
 assert.equal(g.farm.harvests,12);
});
test('moving, rotating and storing a growing bed preserves seed cycles, deadlines and stock over ten restarts',()=>{
 let g=bed(),field=g.placements.at(-1).id;g=purchase(g,MAGIC_BED_SEEDS[0].id,now);g=plantMagicSeed(g,field,0,MAGIC_BED_SEEDS[0].id,now);const saved=structuredClone(g.farm.fields[field]);g=moveItem(g,field,'homestead',30,30,1);assert.deepEqual(g.farm.fields[field],saved);g=storeItem(g,field,now);assert.equal(g.inventory[MAGIC_BED_ID],1);for(let i=0;i<10;i++)g=reload(g);const p=findSpace(g,MAGIC_BED_ID,'homestead');g=placeItem(g,MAGIC_BED_ID,'homestead',p.x,p.z,0,now);field=g.placements.at(-1).id;assert.deepEqual(g.farm.fields[field],saved);assert.equal(g.placements.at(-1).readyAt,0);
});
test('shared cached clients retain beds, seeds and stock while real planting consumes one seed',()=>{
 let g=bed();const field=g.placements.at(-1).id,s=MAGIC_BED_SEEDS[0];g=purchase(g,s.id,now);const cached=structuredClone(g);cached.placements=cached.placements.filter(p=>p.item!==MAGIC_BED_ID);delete cached.inventory[MAGIC_BED_ID];for(const s of MAGIC_BED_SEEDS)delete cached.inventory[s.id];delete cached.farm.fields[field];const kept=mergeSharedWorld(g,g,cached);assert.ok(kept.placements.some(p=>p.id===field));assert.equal(kept.inventory[s.id],1);assert.deepEqual(kept.farm.fields[field],g.farm.fields[field]);const planted=plantMagicSeed(g,field,0,s.id,now);assert.equal(mergeSharedWorld(g,g,planted).inventory[s.id],0);
});

test('a completed fruit credits the stock once through the actual hero/resident receipt; shared repeats conflict',async()=>{
 const {completeResidentAction}=await import('../public/resident-actions.js'),{manualInteraction}=await import('../public/interactions.js'),{worldSnapshot,harvestField}=await import('../public/economy.js');
 let g=bed(),field=g.placements.at(-1).id,s=MAGIC_BED_SEEDS[0];g=purchase(g,s.id,now);g=plantMagicSeed(g,field,0,s.id,now-600000);
 const receipt={field,index:0,cycle:0},decision=manualInteraction(worldSnapshot(g,now),{activityId:field,bedCell:0},'happy');assert.equal(decision.bedCell,0);assert.throws(()=>harvestField(g,field,now));
 const done=completeResidentAction(g,'luna',decision,now,{bedHarvest:receipt});assert.equal(done.farm.stock[s.seedCrop],2);assert.equal(done.inventory[s.seedCrop],undefined);assert.equal(done.farm.fields[field][0].cycle,1);assert.throws(()=>completeResidentAction(done,'luna',decision,now,{bedHarvest:receipt}));
 const other=structuredClone(done);assert.throws(()=>mergeSharedWorld(g,done,other));
});
test('malformed growth chooses the last valid backup without erasing paid seeds or harvest stock',()=>{
 let g=bed(),field=g.placements.at(-1).id;g=purchase(g,MAGIC_BED_SEEDS[0].id,now);g=plantMagicSeed(g,field,0,MAGIC_BED_SEEDS[0].id,now);g.farm.stock[MAGIC_BED_CROPS[1].id]=8;
 const good=JSON.stringify(g),bad=structuredClone(g);bad.farm.fields[field][0].readyAt='broken';const m=new Map([[SAVE_KEY,JSON.stringify(bad)],[SAVE_KEY+':backup',good]]),storage={getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)};
 const loaded=loadGame(storage,now,{advance:false});assert.deepEqual(loaded.farm.fields[field],g.farm.fields[field]);assert.equal(loaded.farm.stock[MAGIC_BED_CROPS[1].id],8);assert.equal(saveGame(storage,bad),false);
});
test('three workers reserve distinct rows, blockers deny a stand, interruption has no receipt payout',async()=>{
 const {createMagicBedHarvests,magicBedApproach}=await import('../public/magic-bed-harvest.js');const {magicBedPreview}=await import('../public/magic-bed-models.js');const picked=[];
 const cells=magicBedPreview(now),h=createMagicBedHarvests('bed',{getCells:()=>cells,onPick:(i,on)=>picked.push([i,on])});const visits=[h.reserve('tiny',.4,now),h.reserve('normal',.75,now),h.reserve('giant',1.8,now)];assert.ok(visits.every(Boolean));assert.equal(new Set(visits.map(v=>v.slot.row)).size,3);assert.equal(h.reserve('fourth',.5,now),null);
 for(let t=0;t<4;t+=.05)for(const v of visits){const f=v.frame(t);assert.ok(f.position[1]>=.16);if(v.radius>=.65)assert.ok(Math.abs(f.position[2])>=2.4+v.radius);}
 assert.ok(visits.every(v=>v.picked&&!v.finished));h.release('tiny');assert.equal(cells[0].crop,MAGIC_BED_CROPS[0].id);assert.ok(h.reserve('retry',.4,now));assert.equal(createMagicBedHarvests('x',{getCells:()=>cells,getBlockers:()=>[{x:0,z:0,w:100,d:100}]}).reserve('blocked',.5,now),null);
 const route=magicBedApproach();for(const radius of [.4,.75,1.8])for(const [x,z]of [[-12,0],[12,0],[0,-10],[0,10]]){const a=[x,.16,z],b=[-3.65,.16,2.4+radius+.3];assert.ok(route.duration(a,b)>0);for(let i=0;i<=100;i++){const f=route.frame(a,b,i/100);assert.ok(!(Math.abs(f[0])<5+radius&&Math.abs(f[2])<2.4+radius),JSON.stringify({a,b,f}));}}
});
test('grown, empty and picked plants keep immutable shared templates and fixed growth buffers',async()=>{
 const {magicBedModel,magicBedPreview}=await import('../public/magic-bed-models.js');const {disposeScenery}=await import('../public/scenery-models.js');const cells=magicBedPreview(now),a=magicBedModel(cells),b=magicBedModel(cells);const leaves=a.children.find(c=>c.isInstancedMesh&&c.name.includes('foliage')),fruits=a.children.filter(c=>c.isInstancedMesh&&c.name.includes('fruit'));assert.ok(leaves&&fruits.length);assert.equal(a.children[0].children[0].geometry,b.children[0].children[0].geometry);
 const all=a.children.filter(c=>c.isInstancedMesh),before=all.map(o=>({geometry:o.geometry,times:o.geometry.getAttribute('magicPlantTime'),version:o.geometry.getAttribute('magicPlantTime').version,matrices:o.instanceMatrix,versionMatrix:o.instanceMatrix.version}));for(let i=0;i<60;i++)a.userData.update();for(let i=0;i<all.length;i++){assert.equal(all[i].geometry,before[i].geometry);assert.equal(before[i].times.version,before[i].version);assert.equal(before[i].matrices.version,before[i].versionMatrix);assert.ok(all[i].customDepthMaterial);}
 a.userData.setPlantPicked(0,true);assert.equal(leaves.geometry.getAttribute('magicPlantTime').getZ(0),1);assert.equal(fruits[0].geometry.getAttribute('magicPlantTime').getZ(0),0);a.userData.setPlantPicked(0,false);assert.equal(fruits[0].geometry.getAttribute('magicPlantTime').getZ(0),1);disposeScenery(a);disposeScenery(b);
});

test('the picking paw reaches toward the actual fruit for Chichi, a tiny kitten and a giant, then returns to its native pose',async()=>{
 const T=await import('three'),{createCat,animateCat,reactCat,disposeCat}=await import('../public/cat-model.js'),{ADOPTION_CATS,catAppearance}=await import('../public/cat-breeds.js'),{catNavigationRadius}=await import('../public/cat-navigation-size.js'),{createMagicBedHarvests}=await import('../public/magic-bed-harvest.js'),{magicBedPreview}=await import('../public/magic-bed-models.js'),{applyMagicBedReach}=await import('../public/magic-bed-pose.js');
 for(const id of ['chichi','adopt-crumb','adopt-marshmallow']){
  const profile=ADOPTION_CATS.find(c=>c.id===id),model=createCat('happy',profile?catAppearance(profile):{}),carrier=new T.Group(),root=new T.Group();carrier.add(model);if(profile)model.scale.setScalar(.63*(profile.size||1));
  const h=createMagicBedHarvests('bed',{getCells:()=>magicBedPreview(now)}),plan=h.reserve(id,catNavigationRadius(model),now,2);let f;for(let t=0;t<=3.21;t+=.05)f=plan.frame(t);carrier.position.fromArray(f.position);carrier.rotation.y=f.yaw;animateCat(model,3.2,.05,false);reactCat(model,f.reaction);root.updateMatrixWorld(true);carrier.updateMatrixWorld(true);
  const i=model.userData.legs.findIndex(l=>l.position.z>0&&l.position.x>0),j=model.userData.legJoints[i],leg=model.userData.legs[i],target=new T.Vector3(...plan.reachPoint),before=j.ankle.getWorldPosition(new T.Vector3()).distanceTo(target);const native=[...leg.quaternion.toArray(),...j.knee.quaternion.toArray()];applyMagicBedReach(model,root,plan);carrier.updateMatrixWorld(true);const after=j.ankle.getWorldPosition(new T.Vector3()).distanceTo(target);assert.ok(after<before,JSON.stringify({id,before,after}));
  animateCat(model,3.2,.05,false);reactCat(model,f.reaction);assert.deepEqual([...leg.quaternion.toArray(),...j.knee.quaternion.toArray()],native,id+' resets exactly');applyMagicBedReach(model,root,plan,true);assert.deepEqual([...leg.quaternion.toArray(),...j.knee.quaternion.toArray()],native,id+' reduced motion');disposeCat(model);
 }
});

test('preempting cooperative bed builds retain one immutable template owner instead of overwriting live buffers',async()=>{
 const {magicBedModelSteps,magicBedPreview}=await import('../public/magic-bed-models.js?interleaved-builds'),a=magicBedModelSteps(magicBedPreview()),b=magicBedModelSteps(magicBedPreview());let first,second,n=0;
 while(!first?.done||!second?.done){if(!first?.done)first=a.next();if(!second?.done)second=b.next();assert.ok(++n<250000);}
 assert.equal(first.value.children[0].children[0].geometry,second.value.children[0].children[0].geometry);assert.equal(first.value.children[0].children[0].material,second.value.children[0].children[0].material);
});
