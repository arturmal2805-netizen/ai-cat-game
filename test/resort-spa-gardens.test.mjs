import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {resortSpaModelSteps} from '../public/resort-spa-model.js';
import {RESORT_ZONES,RESORT_SPA as S,resortSpaSeat} from '../public/resort-spa-data.js';
import {createResortSpaNavigation} from '../public/resort-spa-navigation.js';
import {AROMA_CASCADES} from '../public/resort-spa-garden-data.js';
import {spaGardenFallGeometry} from '../public/resort-spa-gardens.js';
let root;test.before(()=>{const it=resortSpaModelSteps();let result;do{result=it.next();}while(!result.done);root=result.value;});test.after(()=>root?.userData.dispose());
test('new planted beds preserve real public-to-station body routes in every affected room',()=>{
 const nav=createResortSpaNavigation(root);
 for(const key of ['aroma','cafe','vip','cabana']){
  const zone=RESORT_ZONES.find(z=>z.key===key),from={x:zone.level===1?25:zone.level===2?-25:0,y:zone.level*S.rise+.012,z:zone.level?222.4:226};assert(nav.support(from,.571),'actual public stair landing '+key);
  for(let slot=0;slot<zone.seats;slot++){
   const seat=resortSpaSeat(zone,slot),to={...seat.approach,y:seat.approach.y-S.y};const path=nav.path(from,to,.571);assert(path?.length,'actual full-body public path '+key+' '+slot);
   let previous=from;for(const point of path){assert(nav.segmentClear(previous,point,.571),key+' swept path '+slot);previous=point;}
  }
 }
});
test('cascade sheets leave their real stone foundations and land inside actual receiving pools',()=>{
 for(const cascade of AROMA_CASCADES)for(let i=1;i<cascade.tiers.length;i++){
  const upper=cascade.tiers[i],lower=cascade.tiers[i-1],g=spaGardenFallGeometry(upper,lower),p=g.attributes.position;
  for(let n=0;n<p.count;n++){
   const x=p.getX(n),y=p.getY(n),z=p.getZ(n);assert(y>=lower.y-1e-6&&y<=upper.y+1e-6);
   if(y<upper.y-.05)for(const tier of cascade.tiers){const inside=(x/(tier.rx+.14))**2+((z-tier.z)/(tier.rz+.14))**2<.999;assert(!(inside&&y<tier.y-tier.depth-.001),'fall must not pass through its own raised stone foundation');}
   if(n>=p.count-9){assert(Math.abs(y-lower.y)<1e-5);assert((x/lower.rx)**2+((z-lower.z)/lower.rz)**2<.97,'receiving pool contains full sheet width');}
  }g.dispose();
 }
 assert.equal(root.userData.basins.length,21,'original bathing contacts remain unchanged');assert.equal(root.userData.gardenFeatures.length,2);
});
test('dense garden geometry has a bounded fixed native instance budget and floor inspection never rewrites buffers',()=>{
 const report=root.userData.gardens,batches=[];root.traverse(o=>{if(o.isInstancedMesh&&o.name.startsWith('SPA garden '))batches.push(o);});
 assert.equal(report.beds,16);assert(report.flowerInstances>=180);assert(report.leafInstances>=700);assert(report.triangles<150000);assert.equal(batches.length,6);
 const versions=batches.map(o=>[o.instanceMatrix.version,o.instanceColor.version]);
 for(const time of [0,.8,3,12])root.userData.update(time,false);root.userData.update(12,true);
 root.userData.setInspectionLevel(1);for(const o of batches)assert.equal(o.visible,o.userData.resortFloor<=1);root.userData.setInspectionLevel(null);
 assert.deepEqual(batches.map(o=>[o.instanceMatrix.version,o.instanceColor.version]),versions);
 for(const o of batches)assert.doesNotMatch(o.material.customProgramCacheKey(),/mall-room-finish|spa-sealed-interior|staticSubmission/);
});
