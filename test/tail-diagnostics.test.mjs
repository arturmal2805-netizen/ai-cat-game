import {test} from 'node:test';import assert from 'node:assert/strict';import {inferenceDiagnostics} from '../scripts/tail-diagnostics.mjs';
test('extracts full inference error from formatted tail events without request headers',()=>{
 const event={event:{request:{headers:{Authorization:'private'}}},logs:[{message:['Cloudflare AI inference failed:','Model error: {bad} "input"']},{message:['unrelated','private']}]};
 const result=inferenceDiagnostics('Tail ready\n'+JSON.stringify(event,null,2)+'\n'+JSON.stringify(event));
 assert.deepEqual(result,['Cloudflare AI inference failed: Model error: {bad} "input"']);assert.ok(!result.join('').includes('private'));
});
test('ignores incomplete log events',()=>assert.deepEqual(inferenceDiagnostics('{"logs":['),[]));
