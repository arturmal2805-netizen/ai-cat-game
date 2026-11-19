import test from 'node:test';import assert from 'node:assert/strict';
import {spaWaterQuality,spaWaterTransmission,SPA_WATER_DEFAULTS,SPA_WATER_PROFILES} from '../public/resort-spa-water-quality.js';
test('SPA profiles keep metric absorption continuous at zero depth, monotonic with path and strongest in red',()=>{
 for(const key of Object.keys(SPA_WATER_PROFILES)){const p=spaWaterQuality(key),zero=spaWaterTransmission(p,0),one=spaWaterTransmission(p,1),deep=spaWaterTransmission(p,4);assert.deepEqual(zero,[1,1,1]);assert(one[0]<one[1]&&one[1]<one[2]);assert(deep.every((t,i)=>t>0&&t<one[i]));}
});
test('local profile override is isolated; invalid optics never silently produce NaNs or mutate shared defaults',()=>{
 const a=spaWaterQuality('thermal',{refractionStrength:.4,absorption:[.1,.04,.02]}),b=spaWaterQuality('thermal');assert.equal(a.refractionStrength,.4);assert.equal(b.refractionStrength,.8);assert.deepEqual(b.absorption,SPA_WATER_DEFAULTS.absorption);assert.notEqual(a.absorption,SPA_WATER_DEFAULTS.absorption);
 assert.throws(()=>spaWaterQuality('ocean'));assert.throws(()=>spaWaterQuality('thermal',{waveAmplitude:NaN}));assert.throws(()=>spaWaterQuality('thermal',{absorption:[-.1,.2,.3]}));assert.throws(()=>spaWaterTransmission(b,-1));
});
