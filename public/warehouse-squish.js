import * as T from 'three';
import {WAREHOUSE as W} from './mosasaur-expansion-data.js';
import {WAREHOUSE_ACCESS as A} from './warehouse-access-data.js';
import {createSquishToy} from './squish-model.js';
export const SQUISH_PROTOTYPE_ANCHOR=Object.freeze({x:W.x-10,y:A.foot+.36,z:W.z+W.depth/2-70});
// Stage-one venue addition. The original shell/floor/fleet remain untouched.
export function* warehouseSquishSteps(origin){
 const root=new T.Group();root.name='Squish Warehouse · interior';const p=SQUISH_PROTOTYPE_ANCHOR;root.position.set(origin.x+p.x,p.y,origin.z+p.z);
 const gold=new T.MeshStandardMaterial({color:0xeec278,metalness:.65,roughness:.23,emissive:0xc98a39,emissiveIntensity:.2}),pink=new T.MeshStandardMaterial({color:0xffc9e8,roughness:.3,emissive:0xff9dd0,emissiveIntensity:.18});
 for(const [r,h,y,m] of [[4,.28,-.2,gold],[3.8,.1,-.01,pink]]){const mesh=new T.Mesh(new T.CylinderGeometry(r,r,h,64),m);mesh.position.y=y;mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);}yield;
 const toy=createSquishToy();root.add(toy);root.userData={toys:[toy],scratch:new T.Vector3(),update(dt){toy.userData.solver.step(dt);toy.userData.update();},dispose(){toy.userData.dispose();root.traverse(o=>{if(o.isMesh)o.geometry.dispose();});gold.dispose();pink.dispose();root.removeFromParent();}};return root;
}
