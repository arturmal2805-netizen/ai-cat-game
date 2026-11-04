import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const [root,output,strict]=process.argv.slice(2),load=name=>import(pathToFileURL(root+'/'+name));
const T=await load('node_modules/three/build/three.module.js');
const {SHOWCASE_WATER_RIDES}=await load('public/showcase-water-data.js'),{referenceSlideAttraction}=await load('public/reference-slide-assets.js'),{createCat,animateCat,reactCat,disposeCat}=await load('public/cat-model.js'),{applyAtollSit}=await load('public/atoll-slide-acting.js'),{ADOPTION_CATS,catAppearance}=await load('public/cat-breeds.js'),{reserveSlide,releaseSlide}=await load('public/slide-riders.js'),{disposeScenery}=await load('public/scenery-models.js');
const profile=ADOPTION_CATS.find(p=>p.id==='adopt-marshmallow'),cat=createCat('happy',catAppearance(profile)),carrier=new T.Group(),p=new T.Vector3(),rows=[];
cat.scale.setScalar(.63*profile.size);carrier.add(cat);
try {
 for(const spec of SHOWCASE_WATER_RIDES){
  const model=referenceSlideAttraction(spec.id),d=model.userData,tickets=Array.from({length:spec.seats},(_,i)=>reserveSlide(model,'clearance-'+i));
  let checked=0,poses=0,min=Infinity,failures=0;const phases={};
  for(const leg of d.route.legs.filter(l=>['ride','rafting','drop','boost','flight','skim','surf','float','carousel','swing','splash','anticipation','hold','lift','unload'].includes(l.phase)))for(let step=1;step<40;step++){
   const t=leg.start+step/40*leg.duration;for(const ticket of tickets)ticket.elapsed=t;
   d.update(t,false);model.updateMatrixWorld(true);
   for(const ticket of tickets){
    const f=d.rideFrame(t,false,ticket.lane);carrier.position.set(...f.position);carrier.quaternion.fromArray(f.quaternion);
    animateCat(cat,t,false);const reaction=d.rideReaction(t,false,ticket.lane);reactCat(cat,reaction);applyAtollSit(cat,reaction);carrier.updateMatrixWorld(true);
    const boat=d.sharedVehicle?d.slideVehicles[0]:d.slideVehicles[ticket.slot];assert.ok(boat?.visible);const inverse=boat.matrixWorld.clone().invert();
    for(const limb of cat.userData.legs){
     const shin=limb.getObjectByName('Shin');shin.skeleton.update();
     for(let i=0;i<shin.geometry.attributes.position.count;i+=8){
      shin.getVertexPosition(i,p).applyMatrix4(shin.matrixWorld).applyMatrix4(inverse);min=Math.min(min,p.y);phases[leg.phase]=Math.min(phases[leg.phase]??Infinity,p.y);if(p.y<=-.03)failures++;checked++;
     }
    }poses++;
   }
  }
  for(const ticket of tickets)releaseSlide(model,ticket.id);disposeScenery(model);
  rows.push({id:spec.id,poses,animatedPawVertices:checked,minDeckClearance:min,failures,phases});console.log(spec.kind,JSON.stringify(rows.at(-1)));
 }
} finally {disposeCat(cat);}
fs.writeFileSync(output,JSON.stringify(rows,null,2)+'\n');
if(strict==='--strict')assert.ok(rows.every(r=>r.failures===0),'Actual paw/deck intersections remain');
