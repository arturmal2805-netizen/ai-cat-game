import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {basename} from 'node:path';
import {fileURLToPath} from 'node:url';
// Capture encoding is part of the image chain, not just the scene producers.
export async function waterProbeRevision(inputs,baker){
 const file=fileURLToPath(baker),hash=createHash('sha256');
 hash.update('baker/'+basename(file)).update(await readFile(baker));
 for(const name of inputs)hash.update(name).update(await readFile(new URL('../public/'+name,import.meta.url)));
 return hash.digest('hex').slice(0,16);
}
