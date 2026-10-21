import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { spaPath, spaClear } from '../public/spa-navigation.js';
const cases=JSON.parse(fs.readFileSync(new URL('./fixtures/spa-path-baseline.json',import.meta.url)));
test('stable navigation queue preserves all 20 approved routes, their tie order and collision clearance',()=>{
 for(const c of cases){
  const clear=(p,r)=>Math.hypot(p.x,p.z)<44-r&&spaClear(p,r,c.obstacles), path=spaPath(c.start,c.goal,c.radius,c.obstacles,clear,{extent:76});
  assert.ok(path);assert.equal(path.length,c.points);
  assert.equal(createHash('sha256').update(JSON.stringify(path)).digest('hex'),c.hash);
  for(let i=1;i<path.length;i++)for(let n=0;n<=12;n++){
   const a=path[i-1],b=path[i],k=n/12;assert.ok(clear({x:a.x+(b.x-a.x)*k,z:a.z+(b.z-a.z)*k},c.radius));
  }
 }
});
