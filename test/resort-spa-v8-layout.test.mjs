import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spaLayoutSnapshot} from '../scripts/spa-layout-snapshot.mjs';
test('V8 preserves published c477057 physical room centers, all 96 booking contacts, basins, stairs and approach',()=>{
 const before=JSON.parse(readFileSync(new URL('../docs/qa/2026-11-19/spa-v8/SPA_LAYOUT_BASELINE.json',import.meta.url)));
 assert.deepEqual(spaLayoutSnapshot(),before);
 assert.equal(before.rooms.length,8);assert.equal(before.rooms.reduce((n,r)=>n+r.contacts.length,0),96);assert.equal(before.pools.length,14);
});
