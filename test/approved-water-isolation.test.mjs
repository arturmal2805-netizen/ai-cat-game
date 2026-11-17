import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {waterMaterial,waterFieldTexture,legacyWaterFieldTexture} from '../public/water-shading.js';
import {SHOWCASE_WATER_PROBES} from '../public/showcase-probe-assets.js';
import {installMosasaurWaterOptics} from '../public/mosasaur-water-optics.js';
import {MOSA_OCEAN_PROFILE} from '../public/mosasaur-water-profile.js';
const approved=JSON.parse(fs.readFileSync(new URL('./fixtures/approved-slide-and-wave-field.json',import.meta.url)));
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
// The user's later global-water requirement supersedes the former runtime
// source lock. Keep its historical evidence immutable; validate shared optics
// on all venues instead of forbidding an explicitly requested global change.
test('historical slide source hashes stay tied to the actual stable technical reference',()=>{
 const stable=JSON.parse(fs.readFileSync(new URL('../docs/qa/2026-11-16/mall-native-summary.json',import.meta.url)));
 for(const [file,sha]of Object.entries(approved.files))assert.equal(stable.publicSourceSha256['public/'+file],sha,file);
 assert.match(approved.source,/^[a-f0-9]{40}$/);
 assert.equal(Object.keys(approved.probes).length,8);
});
test('the original wave bytes remain reproducible while ocean uses the shared optical core',()=>{
 assert.equal(digest(legacyWaterFieldTexture().image.data),approved.waveFieldSHA256);
 const regular=waterMaterial(),ocean=installMosasaurWaterOptics(waterMaterial());
 assert.equal(regular.userData.oceanProfile,undefined);
 assert.equal(ocean.userData.oceanProfile,MOSA_OCEAN_PROFILE.version);
 assert.equal(ocean.uniforms.uWaterField.value,waterFieldTexture());
 assert.notEqual(ocean.customProgramCacheKey(),regular.customProgramCacheKey());
 const shader={uniforms:{},vertexShader:ocean.vertexShader,fragmentShader:ocean.fragmentShader};ocean.onBeforeCompile(shader);
 assert.match(shader.fragmentShader,/float coverage=/);
 assert.match(shader.fragmentShader,/vPhysicalBedDepth/);
 assert.match(shader.vertexShader,/float wave=\(sin\(oceanA\)/);
 assert.match(shader.fragmentShader,/float roughness=\.085;/);
 assert.doesNotMatch(shader.fragmentShader,/float roughness=\.105;/);
 assert.equal((shader.fragmentShader.match(/texture2D\(uWaterField/g)||[]).length,2);
 assert.equal((shader.fragmentShader.match(/texture2D\(uWaterEnvironment/g)||[]).length,1);
 regular.dispose();ocean.dispose();
});
