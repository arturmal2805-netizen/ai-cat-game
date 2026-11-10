import {MOSA_REEF_URL} from './mosasaur-reef-manifest.js';
import {decodeSceneryGeometries} from './scenery-geometry-codec.js';
import {installMosaReefTemplate,installMosaReefLods,MOSA_REEF_REVISION} from './mosasaur-reef-sculpt.js';
import {installMosaCoralTemplates} from './mosasaur-corals.js';
import {installMosaReefOpticalGrid,installReefCoralSites,installReefSchoolStates} from './mosasaur-reef-data.js';
let request;
export function prepareMosaReefs(){
 if(typeof window==='undefined'||!MOSA_REEF_URL)return Promise.resolve(false);
 return request??=(async()=>{try{
  const compressed=typeof DecompressionStream==='function',response=await fetch(compressed?MOSA_REEF_URL+'.gz':MOSA_REEF_URL);if(!response.ok)throw Error('Reef geometry unavailable');const buffer=compressed?await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer():await response.arrayBuffer();
  if(globalThis.crypto?.subtle){const digest=await crypto.subtle.digest('SHA-256',buffer),hash=[...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('').slice(0,16);if(!MOSA_REEF_URL.includes('-'+hash+'.bin'))throw Error('Corrupt reef geometry');}
  const names=[...[0,1,2].flatMap(k=>[String(k),k+'-medium',k+'-far']),...Array.from({length:11},(_,k)=>['coral-'+k,'coral-'+k+'-medium','coral-'+k+'-far']).flat()],{models,extras}=await decodeSceneryGeometries(buffer,MOSA_REEF_REVISION,names);if(extras.opticalFloor?.count!==16384||extras.coralSites?.count!==10240||extras.reefFish?.count!==1584)throw Error('Incomplete reef ecosystem');installMosaReefOpticalGrid(extras.opticalFloor.array);for(const k of [0,1,2]){installMosaReefTemplate(k,models[k]);installMosaReefLods(k,[models[k],models[k+'-medium'],models[k+'-far']]);}for(let k=0;k<11;k++)installMosaCoralTemplates(k,[models['coral-'+k],models['coral-'+k+'-medium'],models['coral-'+k+'-far']]);
 const sites=extras.coralSites.array;installReefCoralSites(Array.from({length:sites.length/10},(_,i)=>{const k=i*10;return {id:'mosa-reef-'+sites[k+6],form:sites[k],x:sites[k+1],y:sites[k+2],z:sites[k+3],scale:sites[k+4],yaw:sites[k+5],nx:sites[k+7],ny:sites[k+8],nz:sites[k+9]};}));const fish=extras.reefFish.array;for(const index of [3,7,11]){const states=[];for(let k=0;k<fish.length;k+=11)if(fish[k]===index)states.push({phase:fish[k+1],radius:fish[k+2],cx:fish[k+3],cz:fish[k+4],rx:fish[k+5],rz:fish[k+6],speed:fish[k+7],depth:fish[k+8],scale:fish[k+9],index:fish[k+10]});installReefSchoolStates(index,states);}return true;
 }catch{return false;}})();
}
