import {warehouseApertureSteps} from './warehouse-aperture.js';
import * as T from 'three';
import {batchModelSteps} from './model-batching.js';
import {WAREHOUSE as W} from './mosasaur-expansion-data.js';
import {WAREHOUSE_ACCESS as A} from './warehouse-access-data.js';
import {litWarehouseMaterial} from './warehouse-facade.js';
import {waterMaterial} from './water-shading.js';
// Level gallery and sequential horizontal doors. The cat's floor never lifts.
export function* warehouseEntrySteps(){
 const root=new T.Group(),statics=new T.Group();root.name='Warehouse · level submarine pressure entrance';root.position.set(0,A.chamber.y-W.y,A.chamber.z-W.z);
 const glass=new T.MeshStandardMaterial({color:0xc9f0f5,transparent:true,opacity:.14,roughness:.12,metalness:.1,side:T.DoubleSide,depthWrite:false,forceSinglePass:true}),stone=litWarehouseMaterial(new T.MeshStandardMaterial({color:0xe3ddd1,roughness:.66})),gold=litWarehouseMaterial(new T.MeshStandardMaterial({color:0xcfa54e,metalness:.62,roughness:.25,emissive:0x8d5b20,emissiveIntensity:.16})),light=new T.MeshBasicMaterial({color:0xffd58c});
 function box(name,x,y,z,w,h,d,material,parent=statics){const m=new T.Mesh(new T.BoxGeometry(w,h,d),material);m.name=name;m.position.set(x,y,z);m.castShadow=!material.transparent;m.receiveShadow=true;parent.add(m);return m;}
 const back=A.lobby.z-A.chamber.z,front=4,length=front-back,mid=(back+front)/2;
 box('Embedded level gallery foundation',0,-1.4,mid,8.2,3,length,stone);
 for(const side of [-1,1]){yield;box('Sealed gallery glazing',side*4,3.6,mid,.12,7.2,length,glass);for(const z of [back,-4,4])box('Gold entrance jamb',side*4,3.6,z,.24,7.2,.24,gold);box('Continuous warm gallery sill',side*3.85,.22,mid,.08,.08,length,light);}
 for(const z of [120,121.2,122,125.6,127.7,130,144])for(const side of [-1,1])box('Closed brass trim over cut cornice ends',side*4,3.6,z*W.depth/240-(A.chamber.z-W.z),.48,7.2,.65,gold);
 box('Glazed gallery roof',0,7.2,mid,8.1,.12,length,glass);
 // The three small shuttles dock against one sealed horizontal boarding lobby.
 const dockFront=A.dock.z-A.chamber.z+4,dockMid=(front+dockFront)/2,dockLength=dockFront-front;
 const dockFloor=box('Dock lobby foundation with open water berths',0,-1.4,dockMid,40,3,dockLength,stone);
 for(const x of [-14,0,14]){const hole=new T.Box3(new T.Vector3(x-3,-4,dockFront-8.1),new T.Vector3(x+3,1,dockFront+.2));yield* warehouseApertureSteps(dockFloor,hole);for(const side of [-1,1])box('Gold wet berth side edging',x+side*3,.12,dockFront-4,.08,.08,8,gold);box('Gold wet berth inner edging',x,.12,dockFront-8.1,6,.08,.08,gold);}
 box('Dock lobby glass roof',0,7.2,dockMid,40,.12,dockLength,glass);
 for(const side of [-1,1]){box('Dock lobby side glazing',side*20,3.6,dockMid,.12,7.2,dockLength,glass);box('Dock lobby warm sill',side*19.8,.22,dockMid,.08,.08,dockLength,light);}
 for(const x of [-14,0,14]){box('Submarine docking collar',x,.22,dockFront,5,.12,.2,gold);for(const side of [-1,1])box('Dock collar brass jamb',x+side*2.5,3.6,dockFront,.14,7.2,.2,gold);}

 const pairs=[];
 for(const [label,z]of [['inner',-4],['outer',4]]){yield;box(label+' door lintel',0,7.05,z,8.2,.24,.35,gold);box(label+' safety light',0,6.8,z,7.5,.06,.12,light);const pair=[];
  for(const side of [-1,1]){const panel=new T.Group();panel.name='Warehouse '+label+' moving door';panel.position.set(side*1.9,0,z);root.add(panel);box('Pressure door glass',0,3.45,0,3.8,6.9,.16,glass,panel);for(const x of [-1.85,1.85])box('Pressure door gold edge',x,3.45,0,.1,6.9,.22,gold,panel);const originals=panel.children.slice(),batched=yield* batchModelSteps(panel);panel.clear();panel.add(batched);for(const m of originals)m.geometry.dispose();pair.push({panel,side});}pairs.push(pair);
 }
 const baked=yield* batchModelSteps(statics);root.add(baked);statics.traverse(o=>{if(o.geometry)o.geometry.dispose();});
 const water=waterMaterial(0x47bfda,.38,{width:7.8,height:7.8});water.uniforms.uLake.value=1;water.uniforms.uWaterDepth.value=5.7;
 const surface=new T.Mesh(new T.PlaneGeometry(7.8,7.8),water);surface.name='Shared-core pressure chamber water';surface.rotation.x=-Math.PI/2;surface.position.y=5.8;root.add(surface);
 let state={outer:0,inner:0,water:1};
 root.userData={warehouseEntry:true,levelFloor:A.floor,doors:pairs,water:surface,get state(){return{...state};},update(outer=0,inner=0,level=1,time=0){outer=T.MathUtils.clamp(outer,0,1);inner=outer>.001?0:T.MathUtils.clamp(inner,0,1);level=T.MathUtils.clamp(level,0,1);state={outer,inner,water:level};for(const [i,opening]of [inner,outer].entries())for(const{panel,side}of pairs[i])panel.position.x=side*(1.9+opening*3.85);surface.position.y=.1+level*5.7;surface.visible=level>.01;water.uniforms.uWaterDepth.value=Math.max(.05,level*5.7);water.uniforms.uTime.value=time;}};
 root.userData.update();return root;
}
