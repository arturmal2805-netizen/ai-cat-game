import * as T from 'three';
import {createMeadowGrassResources,meadowPackedCellSteps} from './meadow-patch.js';
import {coastMeadowCover,coastMeadowCells} from './meadow-coast-field.js';
import {createMeadowCellCache} from './meadow-cell-cache.js';
import {disposeScenery} from './scenery-models.js';

export function* coastGrassCellSteps(cell,resources,clear=()=>true){
 const step=.23,own=[];
 for(let iz=Math.ceil(cell.z/step);iz<Math.ceil((cell.z+cell.size)/step);iz++){
  yield;
  for(let ix=Math.ceil(cell.x/step);ix<Math.ceil((cell.x+cell.size)/step);ix++){
   let seed=(Math.imul(ix,73856093)^Math.imul(iz,19349663)^918275)>>>0;
   const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
   const x=ix*step+(random()-.5)*.19,z=iz*step+(random()-.5)*.19,cover=coastMeadowCover(x,z);
   if(cover.grass<.12||cover.soil>.4||random()>cover.grass||!clear(x,z,.42,.42))continue;
   const tuft=.5+.5*Math.sin(x*1.13+.4*Math.sin(z*.7))*Math.cos(z*.94+.3*Math.cos(x*.8));
   if(random()>.68+tuft*.32)continue;
   own.push({x,z,a:random()*Math.PI*2,s:(.65+tuft*.55)*(.8+random()*.4)});
  }
 }
 if(!own.length)return null;
 let lod,complete=false;
 try{lod=yield* meadowPackedCellSteps(own,resources);lod.userData.meadowInstances=own.length;complete=true;return lod;}
 finally{if(!complete&&lod)disposeScenery(lod);}
}
export function createCoastMeadowGrass(clear=()=>true){
 const root=new T.Group(),resources=createMeadowGrassResources();
 resources.material.userData.sharedScenery=true;
 root.name='Dense streamed coastal turf; bounded 192-cell working set';root.userData.meadowGrass=true;root.visible=false;
 let services=null,cache=null,lastKey=null,lastActive=false,hasEye=false,disposed=false,idleSince=0;const lastEye=new T.Vector3();
 function configure(next){
  if(disposed)return;services=next;
  if(!cache)cache=createMeadowCellCache({maxResident:192,maxPending:2,
   prepare:(cell,{signal})=>services.prepare(coastGrassCellSteps(cell,resources,clear),{signal}),
   warm:(model,{needed})=>services.warm(model,{needed}),
   release:disposeScenery,
   onReady(model){services.onModel?.(model);root.add(model);},
  });
  if(hasEye){lastKey=null;view(lastEye,lastActive);}
 }
 function view(eye,active=true){
  if(disposed)return;lastEye.copy(eye);hasEye=true;lastActive=active;
  const interest=active&&Math.abs(eye.y-.14)<50.4;
  root.visible=interest;
  if(!cache)return;
  const key=interest?Math.floor(eye.x/3.5)+':'+Math.floor(eye.z/3.5)+':'+Math.floor(eye.y/2):'off';
  if(key!==lastKey){lastKey=key;cache.update(interest?coastMeadowCells(eye,{reach:50}):[]);idleSince=interest?0:performance.now();}
  if(!interest&&idleSince&&performance.now()-idleSince>8000){cache.clearIdle();idleSince=0;}
 }
 Object.defineProperty(root.userData,'instanceCount',{enumerable:true,get:()=>root.children.reduce((n,lod)=>n+(lod.userData.meadowInstances||0),0)});
 root.userData.configureMeadow=configure;root.userData.updateView=view;
 root.userData.update=(time,reduced=false)=>{resources.wind.value=reduced?0:time;};
 root.userData.meadowState=()=>cache?.snapshot()||{resident:0,pending:0,wanted:0,empty:0,failed:0};
 root.userData.dispose=()=>{if(disposed)return;disposed=true;cache?.dispose();resources.near.dispose();resources.mid.dispose();resources.material.dispose();root.visible=false;};
 return root;
}
