import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createChichiGroundJump} from '../public/chichi-ground-jump.js';

test('Space follows a fixed-step ballistic arc at 30/60/120 FPS and lands exactly on the floor',()=>{
  const run=hz=>{const jump=createChichiGroundJump();jump.request();let peak=-Infinity,frames=[];
    for(let i=0;i<hz*2;i++){const f=jump.advance(1/hz,-450.308,true);peak=Math.max(peak,f.y);if((i+1)%(hz/10)===0)frames.push(f.y);}
    assert(!jump.airborne);assert.equal(jump.diagnostics.launches,1,'holding Space never auto-repeats');assert.equal(jump.diagnostics.y,-450.308);
    assert(Math.abs(peak-(-450.308+36/19.62))<.003);return frames;};
  const a=run(30);for(const hz of [60,120])run(hz).forEach((y,i)=>assert(Math.abs(y-a[i])<1e-9));
});
test('quick tap queues one jump; mid-air presses cannot double-jump and release allows the next jump',()=>{
  const j=createChichiGroundJump();j.request();j.advance(1/60,.16,false);assert(j.airborne);
  for(let i=0;i<20;i++){j.request();j.advance(1/60,.16,true);}assert.equal(j.diagnostics.launches,1);
  for(let i=0;i<100;i++)j.advance(1/60,.16,true);assert.equal(j.diagnostics.launches,1);
  j.advance(1/60,.16,false);j.advance(1/60,.16,true);assert.equal(j.diagnostics.launches,2);
});
test('clearing input preserves gravity until landing, while venue reset cancels the generic arc',()=>{
  const j=createChichiGroundJump();j.request();j.advance(.1,.16);j.cancelPending();assert(j.airborne);
  for(let i=0;i<120;i++)j.advance(1/60,.16);assert(!j.airborne);assert.equal(j.diagnostics.y,.16);
  j.request();j.advance(.1,.16);j.reset();assert(!j.airborne);assert.equal(j.advance(1/60,-200).y,-200);
});
test('the explicit Space addition preserves the exact approved walking, obstacle and camera source',()=>{
  const source=readFileSync(new URL('../public/chichi-manual.js',import.meta.url),'utf8'),manifest=JSON.parse(readFileSync(new URL('../docs/specifications/warehouse-access-protection-2026-11-27.json',import.meta.url),'utf8'));
  const sections={camera:source.slice(source.indexOf('updateCamera(dt){'),source.indexOf(',dispose(){')),walking:source.slice(source.indexOf('export function stepChichiWalk'),source.indexOf('export function createChichiManual')),obstacles:source.slice(source.indexOf('export function clearsWalkObstacles'),source.indexOf('export function stepChichiWalk'))};
  for(const [name,value]of Object.entries(sections))assert.equal(createHash('sha256').update(value).digest('hex'),manifest.explicitUserEvolution20261128.unchangedControllerSections[name],name);
});
