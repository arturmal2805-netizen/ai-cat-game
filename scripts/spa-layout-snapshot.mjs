import {SPA_PALACE,SPA_V7_ROOMS,SPA_PALACE_STAIRS,SPA_PALACE_APPROACH,spaPalacePools} from '../public/resort-spa-layout-v7.js';
import {SPA_V7_ZONES,spaV7Seat} from '../public/resort-spa-services-v7.js';
// Physical coordinates and booking contacts, not the identity room marker groups.
export function spaLayoutSnapshot(){return {schema:1,layoutVersion:7,root:{x:-450,y:SPA_PALACE.baseY,z:480,quaternion:[0,0,0,1],scale:[1,1,1]},palace:SPA_PALACE,rooms:SPA_V7_ROOMS.map(z=>({...z,worldCenter:{x:-450+z.x,y:z.y,z:480+z.z},contacts:Array.from({length:SPA_V7_ZONES.find(q=>q.id===z.id).seats},(_,i)=>spaV7Seat(SPA_V7_ZONES.find(q=>q.id===z.id),i))})),pools:spaPalacePools(),stairs:SPA_PALACE_STAIRS,approach:SPA_PALACE_APPROACH};}
if(process.argv[1]===new URL(import.meta.url).pathname)process.stdout.write(JSON.stringify(spaLayoutSnapshot(),null,2)+'\n');
