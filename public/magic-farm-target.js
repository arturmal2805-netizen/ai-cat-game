import * as T from 'three';
import {magicFarmLayout} from './magic-farms-data.js';
import {createFarmHarvests} from './magic-farm-harvest.js';
import {makeMagicFruit} from './magic-fruit-models.js';
import {shape,torus} from './fantasy-scenery.js';
import {disposeScenery} from './scenery-models.js';
export function magicFarmTarget(id,options){
 const root=new T.Group(),layout=magicFarmLayout(id),foods=new Map();
 const proxy=new T.Mesh(new T.BoxGeometry(54,9,10),new T.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,colorWrite:false}));proxy.position.set(0,4,layout.storage.z);root.add(proxy);
 const harvests=createFarmHarvests(id,options);
 function release(catId){harvests.release(catId);const prop=foods.get(catId);if(prop){root.remove(prop);disposeScenery(prop);foods.delete(catId);}}
 root.userData={id:'farm-field',magicFarm:id,duration:120,harvests,
  reserveHarvest:(catId,radius)=>harvests.reserve(catId,radius),releaseHarvest:release,
  showHarvest(plan,frame){
   let prop=foods.get(plan.catId);if(!prop){prop=new T.Group();shape(prop,'sphere',0xc69c71,0,0,0,.8,.35,.6);torus(prop,0xe9c798,0,.15,0,.62,.06,Math.PI/2);const fruit=makeMagicFruit(plan.fruit.id);fruit.scale.setScalar(.45);fruit.position.y=.45;prop.add(fruit);foods.set(plan.catId,prop);root.add(prop);}
   prop.visible=frame.carrying;const gap=plan.radius+1.05;prop.position.set(frame.position[0]+Math.sin(frame.yaw)*gap,frame.position[1]+.35+plan.radius*.3,frame.position[2]+Math.cos(frame.yaw)*gap);prop.rotation.y=frame.yaw;
  },dispose:()=>{for(const catId of [...harvests.visits.keys()])release(catId);disposeScenery(root);}};
 return root;
}
