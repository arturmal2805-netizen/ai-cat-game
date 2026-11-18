import * as T from 'three';
import {createJacuzziEffects} from './spa-effects.js';
import {SPA_JACUZZI} from './spa-data.js';
import {RESORT_ZONES,RESORT_SPA} from './resort-spa-data.js';
import {resortPools} from './resort-spa-pool-data.js';
// Reuse the existing GPU particle implementation; original island SPA remains
// untouched. Static instance buffers, one clock per basin and no PointLights.
export function createResortPoolEffects(){
 const root=new T.Group(),effects=[],geometries=new Set(),materials=new Set();
 for(const zone of RESORT_ZONES.filter(z=>z.procedure==='jacuzzi'||z.procedure==='vip'))for(const pool of resortPools(zone)){
  const group=new T.Group(),source=new T.Group(),effect=createJacuzziEffects(source);group.userData.resortFloor=zone.level;source.position.set(-SPA_JACUZZI.x,-.5,-SPA_JACUZZI.z);group.add(source);group.scale.set(pool.rx/3,1,pool.rz/3);group.position.set(pool.x,pool.y-RESORT_SPA.y,pool.z);root.add(group);effects.push(effect);
  source.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);materials.add(o.material);}});
 }
 return{root,update:(time,reduced)=>effects.forEach(e=>e.userData.update(time,reduced)),dispose(){for(const g of geometries)g.dispose();for(const m of materials)m.dispose();}};
}
const emitted=new WeakMap();
export function updateResortPoolRipples(root,visits,time,reduced){if(reduced)return;for(const v of visits.values()){
 if(!v.contact?.pool||!['wet-swim','wet-return','procedure'].includes(v.phase))continue;if(time-(emitted.get(v)??-Infinity)<.7)continue;const p=v.contact.pool,basin=root.userData.basins.find(b=>Math.abs(b.position.x-p.x)<.01&&Math.abs(b.position.z-p.z)<.01&&Math.abs(b.position.y+RESORT_SPA.y-p.y)<.01);if(!basin)continue;
 const material=basin.userData.surface.material,slots=material.uniforms.uRipples.value,slot=slots.reduce((a,b)=>a.z<b.z?a:b);slot.set(root.position.x+v.position.x,root.position.z+v.position.z,time,v.zone.procedure==='swim'?.08:.035);material.uniforms.uRippleCount.value=slots.filter(r=>r.w>0).length;emitted.set(v,time);
 }}
