import test from 'node:test';import assert from 'node:assert/strict';
import {resortSpaModelSteps} from '../public/resort-spa-model.js';import {createResortSpaNavigation} from '../public/resort-spa-navigation.js';import {SPA_V7_ZONES,spaV7Seat} from '../public/resort-spa-services-v7.js';import {SPA_PALACE as P,SPA_PALACE_STAIRS} from '../public/resort-spa-layout-v7.js';
test('every retained physical contact has a full-body route from its actual common-floor landing; stairs remain traversable both ways',()=>{
 let s,it=resortSpaModelSteps({layoutVersion:7});while(!(s=it.next()).done);const root=s.value;try{const nav=createResortSpaNavigation(root),radius=.571;
 for(const stair of SPA_PALACE_STAIRS){const a={x:stair.x,y:stair.level*P.rise+.012,z:185.5},b={x:stair.x,y:(stair.level+1)*P.rise+.012,z:234};for(const[from,to]of[[a,b],[b,a]]){const path=nav.path(from,to,radius);assert(path,JSON.stringify({stair,from,to}));let prev=from;for(const p of path){assert(nav.segmentClear(prev,p,radius),'stair capsule sweep');prev=p;}}}
 for(const z of SPA_V7_ZONES){const from={x:z.level===1?25:z.level===2?-25:0,y:z.level*P.rise+.012,z:z.level?234:287};for(let i=0;i<z.seats;i++){const c=spaV7Seat(z,i),to={...c.approach,y:c.approach.y-P.baseY};const path=nav.path(from,to,radius);assert(path,`${z.id}:${i} actual approach unreachable ${JSON.stringify(to)}`);let prior=from;for(const p of path){assert(nav.segmentClear(prior,p,radius),`${z.id}:${i} actual body sweep`);prior=p;}assert(Math.hypot(prior.x-to.x,prior.y-to.y,prior.z-to.z)<1e-6);}}
 }finally{root.userData.dispose();}
});
