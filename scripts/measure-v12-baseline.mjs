import * as T from 'three';
import {writeFile} from 'node:fs/promises';
import {runSceneSteps} from '../public/scene-tasks.js';
import {mallModelSteps} from '../public/mall-model.js';
import {resortSpaModelSteps} from '../public/resort-spa-model.js';
import {BIOMES} from '../public/game-data.js';
const result={source:'9e26f331d91d3ad85e2c0f15b5a6a4e63106e5ce',scope:'actual CPU authored mesh boxes incl access, not artistic footprint estimates',islands:BIOMES.map(b=>({id:b.id,center:b.center,radius:b.radius})),buildings:{}};
for(const [id,steps,position]of [['mall',mallModelSteps(),[-450,0,500]],['spa',resortSpaModelSteps({layoutVersion:7}),[-450,-165,480]]]){
 const root=runSceneSteps(steps);root.position.set(...position);root.updateMatrixWorld(true);const box=new T.Box3().setFromObject(root,true),counts={meshes:0,vertices:0};root.traverse(m=>{if(m.isMesh){counts.meshes++;counts.vertices+=m.geometry.attributes.position.count;}});
 result.buildings[id]={position:root.position.toArray(),quaternion:root.quaternion.toArray(),scale:root.scale.toArray(),box:{min:box.min.toArray(),max:box.max.toArray()},size:box.getSize(new T.Vector3()).toArray(),...counts};console.log(id,JSON.stringify(result.buildings[id]));root.userData.dispose?.();
}
await writeFile('docs/qa/2026-11-20/v12-analysis/baseline-boxes.json',JSON.stringify(result,null,2));
