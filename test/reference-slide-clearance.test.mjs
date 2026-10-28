import * as T from "three";
import { test } from "node:test";
import assert from "node:assert/strict";
import { REFERENCE_SLIDES } from "../public/reference-slide-data.js";
import { ATOLL_SLIDES } from "../public/atoll-slide-data.js";
import {
  createReferenceRoute,
  DREAM_RADIUS,
  bowlHeight,
} from "../public/reference-slide-motion.js";
import {
  createCat,
  animateCat,
  reactCat,
  disposeCat,
} from "../public/cat-model.js";
import { ADOPTION_CATS, catAppearance } from "../public/cat-breeds.js";
import {sampleRideActing,rideActingFrame} from '../public/ride-acting.js';
import {atollRideReaction,applyAtollSit} from '../public/atoll-slide-acting.js';
test("the largest approved cat keeps its real animated paw vertices above every authored flume floor", () => {
  const prof = ADOPTION_CATS.find((p) => p.id === "adopt-marshmallow"),
    cat = createCat("happy", catAppearance(prof)),
    carrier = new T.Group();
  cat.scale.setScalar(0.63 * prof.size);
  carrier.add(cat);
  const meshes = cat.userData.legs
      .map((l) => l.getObjectByName("Shin"))
      .filter(Boolean),
    p = new T.Vector3(),
    d = new T.Vector3();
  let worst = -Infinity,
    checked = 0,
    bad = [];
  for (const spec of [...REFERENCE_SLIDES,...ATOLL_SLIDES]) {
    const route = createReferenceRoute(spec);
    for (const [laneId, lane] of route.lanes.entries())
      for (const leg of lane.legs.filter((l) =>
        ["ride", "lift"].includes(l.phase),
      ))
        for (const u of [0.2, 0.5, 0.8]) {
          const t = leg.start + leg.duration * u,
            f = lane.frame(t),
            samples = lane.geometry
              .filter((g) => g.stage === leg)
              .flatMap((g) => g.samples);
          if (!samples.length) continue;
          carrier.position.set(...f.position);
          carrier.quaternion.fromArray(f.quaternion);
          animateCat(cat, t, false);
          const reaction=spec.premiumWater ? atollRideReaction(spec,lane,t,
            rideActingFrame(sampleRideActing(lane.frame,lane.duration,lane.impacts),t),false) : { paw: 0.8, surprise: 0.8 };
          reactCat(cat,reaction);applyAtollSit(cat,reaction);
          carrier.updateMatrixWorld(true);
          const target = new T.Vector3(...f.position);
          let center = 0,
            dist = Infinity;
          for (let i = 0; i < samples.length; i++) {
            const a = samples[i],
              len = target.distanceToSquared(
                a.p.clone().addScaledVector(a.up, -1.6),
              );
            if (len < dist) {
              dist = len;
              center = i;
            }
          }
          for (const m of meshes)
            for (let v = 0; v < m.geometry.attributes.position.count; v += 4) {
              m.getVertexPosition(v, p).applyMatrix4(m.matrixWorld);
              let best,
                near = Infinity;
              for (
                let i = Math.max(0, center - 50);
                i <= Math.min(samples.length - 1, center + 50);
                i++
              ) {
                const s = samples[i],
                  distance = p.distanceToSquared(s.p);
                if (distance < near) {
                  near = distance;
                  best = s;
                }
              }
              d.copy(p).sub(best.p);
              const y = d.dot(best.up),
                x = d.dot(best.right);
              if (y > 0) continue;
              const r = Math.hypot(x, y);
              worst = Math.max(worst, r);
              checked++;
              if (r > DREAM_RADIUS + 0.03)
                bad.push({
                  kind: spec.kind,
                  lane: laneId,
                  phase: leg.phase,
                  u,
                  r,
                  x,
                  y,
                });
            }
        }
  }
  disposeCat(cat);
  assert.ok(checked > 90000);
  assert.equal(bad.length, 0, JSON.stringify(bad.slice(0, 8)));
  assert.ok(worst < DREAM_RADIUS);
});

// Check actual skinned vertices against the concave floor, not the centreline.
test('large-cat paws clear every vortex floor throughout the accelerated spiral',()=>{
 const profile=ADOPTION_CATS.find(p=>p.id==='adopt-marshmallow'),cat=createCat('happy',catAppearance(profile)),carrier=new T.Group(),p=new T.Vector3();
 cat.scale.setScalar(.63*profile.size);carrier.add(cat);let minimum=Infinity,checked=0;
 try{
  for(const spec of [...REFERENCE_SLIDES,...ATOLL_SLIDES])for(const lane of createReferenceRoute(spec).lanes){
   const acting=sampleRideActing(lane.frame,lane.duration,lane.impacts);let index=0;
   for(const leg of lane.legs.filter(l=>l.phase==='vortex')){
    const bowl=lane.bowls[index++];
    for(const u of [.05,.2,.5,.8,.95]){
     const t=leg.start+leg.duration*u,f=lane.frame(t);carrier.position.set(...f.position);carrier.quaternion.fromArray(f.quaternion);animateCat(cat,t,false,false);
     let reaction=rideActingFrame(acting,t);if(spec.premiumWater)reaction=atollRideReaction(spec,lane,t,reaction,false);reactCat(cat,reaction);applyAtollSit(cat,reaction);carrier.updateMatrixWorld(true);
     for(const leg of cat.userData.legs){const shin=leg.getObjectByName('Shin');for(let i=0;i<shin.geometry.attributes.position.count;i+=4){
      shin.getVertexPosition(i,p).applyMatrix4(shin.matrixWorld);const r=Math.hypot(p.x-bowl.x,p.z-bowl.z);if(r>bowl.radius||(spec.premiumWater&&r<6))continue;
      minimum=Math.min(minimum,p.y-bowlHeight(bowl,r));checked++;
     }}
    }
   }
  }
 }finally{disposeCat(cat);}
 assert.ok(checked>37000);assert.ok(minimum>0,'paw penetrates real bowl: '+minimum);
});
