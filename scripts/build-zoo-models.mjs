import {gzipSync} from 'node:zlib';
import {mkdir,writeFile,readdir,unlink} from 'node:fs/promises';import {createHash} from 'node:crypto';
import {zooAnimals} from '../public/zoo-animals.js';import {ZOO_EXHIBITS} from '../public/zoo-data.js';import {encodeZooTemplate} from '../public/zoo-model-codec.js';
export async function buildZooModels(){
 await mkdir('public/models/zoo',{recursive:true});const assets={};
 for(const e of ZOO_EXHIBITS){const m=zooAnimals(e),bytes=encodeZooTemplate(m.userData.poseData),hash=createHash('sha256').update(new Uint8Array(bytes)).digest('hex').slice(0,16),name=e.species+'-'+hash+'.bin';await writeFile('public/models/zoo/'+name,new Uint8Array(bytes));await writeFile('public/models/zoo/'+name+'.gz',gzipSync(new Uint8Array(bytes),{level:9}));assets[e.species]='./models/zoo/'+name;m.dispose();m.geometry.dispose();m.material.dispose();}
 const retained=new Set(Object.values(assets).flatMap(p=>{const name=p.split('/').at(-1);return [name,name+'.gz'];}));for(const name of await readdir('public/models/zoo'))if(/^[a-z]+-[a-f0-9]{16}\.bin(?:\.gz)?$/.test(name)&&!retained.has(name))await unlink('public/models/zoo/'+name);
 await writeFile('public/zoo-model-manifest.js','// Exact authoring output; fetched only when the zoo is selected.\nexport const ZOO_MODELS='+JSON.stringify(assets,null,2)+';\n');return assets;
}
