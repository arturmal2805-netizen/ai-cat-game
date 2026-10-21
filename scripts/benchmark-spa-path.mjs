// Isolated CPU routing benchmark; these are not rendered-frame or device FPS.
import {build} from 'esbuild';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import {spaPath,spaClear} from '../public/spa-navigation.js';
const reference=process.env.CHICHI_PATH_BASELINE || '54290c7';
if(!/^[a-f0-9]{7,40}$/.test(reference))throw Error('Expected baseline commit');
const source=execFileSync('git',['show',reference+':public/spa-navigation.js'],{encoding:'utf8'});
const bundle=await build({stdin:{contents:source,resolveDir:process.cwd()+'/public'},bundle:true,format:'esm',write:false});
const before=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const after={spaPath,spaClear},cases=JSON.parse(fs.readFileSync(new URL('../test/fixtures/spa-path-baseline.json',import.meta.url)));
function run(m){let total=0;for(const c of cases){const t=performance.now();m.spaPath(c.start,c.goal,c.radius,c.obstacles,(p,r)=>Math.hypot(p.x,p.z)<44-r&&m.spaClear(p,r,c.obstacles),{extent:76});total+=performance.now()-t;}return total;}
run(before);run(after);
const rows=[];
for(const label of ['before','after','after','before','before','after','after','before'])rows.push({label,cases:cases.length,totalMs:run(label==='before'?before:after)});
fs.writeFileSync(process.env.CHICHI_PATH_REVIEW||'/tmp/chichi-navigation-queue-benchmark.json',JSON.stringify({reference,kind:'CPU route search only',rows},null,2));
console.log(JSON.stringify(rows));
