import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {cityWalkPath,cityNavigationStats,CITY_WALK_CACHE_LIMIT} from '../public/jobcity-navigation.js';
const {rows}=JSON.parse(fs.readFileSync(new URL('./fixtures/city-walk-baseline.json',import.meta.url)));
test('fixed street clearance reuse preserves all 64 exact routes, including blocked goals and different anatomy radii',()=>{
 for(let repeat=0;repeat<4;repeat++)for(const c of rows){
  const path=cityWalkPath(c.from,c.to,c.radius);assert.deepEqual(path,c.route);
  // Caller mutation must not poison another cat's path or future queries.
  if(path?.length)path[0].x+=1000;
 }
});
test('street visibility cache stays bounded across many distinct cat sizes',()=>{
 for(let i=0;i<64;i++)cityWalkPath({x:-50,z:40},{x:50,z:-38},.4+i*.01);
 assert.ok(cityNavigationStats().layouts<=CITY_WALK_CACHE_LIMIT);
 assert.ok(cityNavigationStats().bytes<=CITY_WALK_CACHE_LIMIT*36*36);
});
