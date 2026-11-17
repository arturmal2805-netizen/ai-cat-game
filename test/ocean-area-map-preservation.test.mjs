import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BIOMES} from '../public/game-data.js';
import {worldRoads} from '../public/world-roads.js';
const previous=JSON.parse(readFileSync(new URL('./fixtures/ocean-area-release-baseline.json',import.meta.url)));
test('ocean expansion preserves every other released biome and every other bridge exactly',()=>{
 assert.deepEqual(BIOMES.filter(b=>b.id!=='autumn'),previous.biomes.filter(b=>b.id!=='autumn'));
 const old=previous.biomes.find(b=>b.id==='autumn'),now=BIOMES.find(b=>b.id==='autumn');assert.ok(now.radius>old.radius);assert.ok(now.arrival[1]>old.arrival[1]);assert.equal(now.arrival[0],old.arrival[0]);assert.deepEqual({...now,radius:old.radius,arrival:old.arrival},old);
 const roads=worldRoads(BIOMES);assert.deepEqual(roads.map(r=>[r.from,r.to]),previous.roads.map(r=>[r.from,r.to]));assert.deepEqual(roads.filter(r=>r.from!=='autumn'&&r.to!=='autumn'),previous.roads.filter(r=>r.from!=='autumn'&&r.to!=='autumn'));
 const before=previous.roads.find(r=>r.to==='autumn'),after=roads.find(r=>r.to==='autumn');assert.deepEqual(after.start,before.start);assert.ok(after.gap>0);
});
