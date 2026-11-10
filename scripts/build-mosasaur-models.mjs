import {gzipSync} from 'node:zlib';
import {mkdir,writeFile,readdir,unlink} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {mosasaurGeometry,mosasaurDentalAnchors} from '../public/mosasaur-sculpt.js';
import {encodeMosasaurModels} from '../public/mosasaur-model-codec.js';
export async function buildMosasaurModels(){
 const models={body:mosasaurGeometry('body'),jaw:mosasaurGeometry('jaw')};for(const [kind,g]of Object.entries(models))mosasaurDentalAnchors(kind,g);
 const bytes=new Uint8Array(encodeMosasaurModels(models)),hash=createHash('sha256').update(bytes).digest('hex').slice(0,16),name='mosasaur-'+hash+'.bin',folder='public/models/mosasaur';await mkdir(folder,{recursive:true});await writeFile(folder+'/'+name,bytes);await writeFile(folder+'/'+name+'.gz',gzipSync(bytes,{level:9}));
 for(const old of await readdir(folder))if(/^mosasaur-[a-f0-9]{16}\.bin(?:\.gz)?$/.test(old)&&old!==name&&old!==name+'.gz')await unlink(folder+'/'+old);
 await writeFile('public/mosasaur-model-manifest.js',`// Exact offline sculpt; selected ocean only.\nexport const MOSA_MODEL_URL='./models/mosasaur/${name}';\n`);return name;
}
