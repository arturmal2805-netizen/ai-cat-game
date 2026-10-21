// CPU path search only. No renderer/device FPS claim.
import {build} from 'esbuild';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import {cityWalkPath} from '../public/jobcity-navigation.js';
const source=execFileSync('git',['show','871a709:public/jobcity-navigation.js'],{encoding:'utf8'}),
 bundle=await build({stdin:{contents:source,resolveDir:process.cwd()+'/public'},bundle:true,format:'esm',write:false}),
 before=(await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'))).cityWalkPath,
 cases=JSON.parse(fs.readFileSync(new URL('../test/fixtures/city-walk-baseline.json',import.meta.url))).rows;
function run(fn){const t=performance.now();for(let i=0;i<5;i++)for(const c of cases)fn(c.from,c.to,c.radius);return performance.now()-t;}
run(before);run(cityWalkPath);
const rows=[];
for(const label of ['before','after','after','before','before','after','after','before'])rows.push({label,paths:cases.length*5,totalMs:run(label==='before'?before:cityWalkPath)});
console.log(JSON.stringify({reference:'871a709',kind:'CPU path search only',rows},null,2));
