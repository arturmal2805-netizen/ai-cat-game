import * as THREE from "three";
import { atollPlot } from "./atoll-slide-data.js";
import { shape, surfaceTexture, flowerCluster, lantern } from "./fantasy-scenery.js";
import { batchModelSteps } from "./model-batching.js";
import { disposeScenery } from "./scenery-models.js";
import {sceneryModelSteps,positionScenery} from "./scenery-models.js";
import {runSceneSteps} from "./scene-tasks.js";

// One deliberately light annex with twenty full-size plots. Detailed mini-biomes
// belong to paid placements, so an empty park never prepares twenty models.
export function* atollParkSteps(biome,{lowOnly=false,scenery=[]}={}) {
  const root=new THREE.Group(),base=new THREE.Group(),detail=new THREE.Group(),low=new THREE.Group(),props=new THREE.Group();
  root.name=biome.name;root.add(base,detail,low);
  const ground=new THREE.Mesh(new THREE.CylinderGeometry(biome.radius,biome.radius*.98,.28,96),new THREE.MeshStandardMaterial({color:biome.ground,map:surfaceTexture("lawn"),roughness:.94}));
  ground.position.y=-.05;ground.receiveShadow=true;base.add(ground);yield;
  const rock=new THREE.Mesh(new THREE.CylinderGeometry(biome.radius*.98,biome.radius*.85,14,64,2,true),new THREE.MeshStandardMaterial({color:biome.edge,roughness:.95}));rock.position.y=-7.2;base.add(rock);
  const underside=new THREE.Mesh(new THREE.ConeGeometry(biome.radius*.85,32,64),new THREE.MeshStandardMaterial({color:0x7e949b,roughness:.95}));underside.rotation.z=Math.PI;underside.position.y=-30;base.add(underside);yield;
  // Roads run BETWEEN the plots, not through the water rides. Their actual
  // twelve-unit gaps stay available to cats, cars and the player's camera.
  for(let row=0;row<=4;row++) {
    const z=(row-2)*120;
    shape(props,"cube",0xe8d9b9,0,.105,z,600,.06,8);
    yield;
  }
  for(let col=0;col<=5;col++) {
    const x=(col-2.5)*124;
    shape(props,"cube",0xe8d9b9,x,.105,0,8,.06,444);yield;
  }
  shape(props,"cube",0xe8d9b9,0,.105,310,8,.06,140);
  if(!lowOnly)for(let i=0;i<20;i++) {
    yield;
    const {x,z}=atollPlot(i);
    for(const side of [-1,1]) {
      flowerCluster(props,x+side*58,z+54,0xf2b4d8,1.1,.2);
      lantern(props,x+side*58,0,z-54,.9);
    }
  }
  for(let i=0;i<20;i++) {
    yield;const a=i*Math.PI/10;
    shape(props,"stone",0x9dafa2,Math.sin(a)*(biome.radius-9),-4,Math.cos(a)*(biome.radius-9),5,7,5);
    if(i%2===0)shape(props,"sphere",0xeef1fa,Math.sin(a)*(biome.radius-8),-30,Math.cos(a)*(biome.radius-8),14,2,8);
  }
  const batch=yield* batchModelSteps(props,{combineColors:true});base.add(batch);
  props.traverse(o=>{if(o.isMesh&&!o.geometry.userData.sharedScenery)o.geometry.dispose();});
  root.userData={biomeId:biome.id,navigationSurface:base,detail,lowDetail:low,lowOnly,sceneryObjects:new Map(),trees:[],emptyPlot:true,stats:{staticMeshes:batch.children.length+3,sourceMeshes:batch.userData.sourceMeshes,fishCount:0},update(){},dispose:()=>disposeScenery(root)};
  root.userData.placementSteps=function*(_items=[],records=[]){
    const visible=records.filter(r=>!r.stored&&r.biome===biome.id),models=root.userData.sceneryObjects;
    for(const [id,m] of models){if(!visible.some(r=>r.id===id)){m.removeFromParent();disposeScenery(m);models.delete(id);}yield;}
    if(!lowOnly)for(const record of visible){let m=models.get(record.id);if(!m){m=yield*sceneryModelSteps(record);models.set(record.id,m);detail.add(m);}positionScenery(m,record);yield;}
    root.userData.trees=visible.filter(r=>r.type.startsWith('scenery-tree-'));
  };
  root.userData.updatePlacements=(...args)=>runSceneSteps(root.userData.placementSteps(...args));
  yield*root.userData.placementSteps([],scenery);
  detail.visible=!lowOnly;low.visible=lowOnly;
  return root;
}
