import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resortSpaModelSteps} from '../public/resort-spa-model.js';
import {createResortSpaNavigation} from '../public/resort-spa-navigation.js';
import {createResortTransit} from '../public/resort-spa-transit.js';
import {RESORT_LIFT as L} from '../public/resort-spa-lift.js';
for(const layoutVersion of [6,7])test(`layout ${layoutVersion}: real geometry lift journey walks, rides, exits and returns without skipping a body segment`,()=>{
 const it=resortSpaModelSteps({layoutVersion});let s;do{s=it.next();}while(!s.done);const root=s.value,nav=createResortSpaNavigation(root),actor={id:'chichi',radius:.571,position:{x:0,y:L.upperY,z:309}},arrivals=[];
 const transit=createResortTransit({navigation:nav,geometry:root.userData.accessGeometry,getActors:()=>[actor],centre:[0,0],onArrive:(id,result)=>arrivals.push(result)});
 for(const target of [1,0]){assert(transit.start('chichi',target));let prior={...actor.position},travel=false,walk=false;
  for(let i=0;i<2200&&transit.has('chichi');i++){transit.update(.1);const f=transit.frame('chichi');if(f){const d=Math.hypot(f.position.x-prior.x,f.position.y-prior.y,f.position.z-prior.z);assert(d<=.601,JSON.stringify({d,f}));if(transit.lift.state.phase==='travelling'){travel=true;assert.equal(transit.lift.state.door,0);}else if(f.walking){walk=true;assert(nav.segmentClear({...prior,y:prior.y+165},{...f.position,y:f.position.y+165},actor.radius));}Object.assign(actor.position,f.position);prior={...actor.position};}}
  assert.equal(transit.has('chichi'),false,JSON.stringify({trip:transit.trips.get('chichi'),lift:transit.lift.state}));assert(travel);assert(walk);assert.equal(arrivals.at(-1).floor,target);
 }assert.equal(arrivals.length,2);root.userData.dispose();
});
