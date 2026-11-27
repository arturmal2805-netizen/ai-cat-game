import * as T from 'three';
import {createSubmarineModel} from './submarine-model.js';
import {WAREHOUSE_ACCESS as A} from './warehouse-access-data.js';
// A fixed three-boat pool is reused for every visitor, never one model per cat.
export function* warehouseFleetSteps(origin){
 const root=new T.Group(),boats=[],ramps=[],dockRamps=[];const deck=new T.MeshStandardMaterial({color:0xe3ddd1,roughness:.65}),gold=new T.MeshStandardMaterial({color:0xcfa54e,metalness:.62,roughness:.25});root.name='Warehouse · small native submarine shuttle fleet';root.position.set(origin.x,0,origin.z);
 for(let slot=0;slot<A.capacity;slot++){yield;const model=createSubmarineModel();model.name='Warehouse shuttle '+(slot+1);model.position.set(A.departure.x+slot*14,A.departure.y,A.departure.z);root.add(model);boats.push(model);
 const ramp=new T.Group(),start=new T.Vector3(A.shore.x,A.shore.y-.08,A.shore.z),end=new T.Vector3(A.departure.x+slot*14,A.departure.y-.63,A.departure.z+.25),delta=end.clone().sub(start),length=delta.length();ramp.position.copy(start).addScaledVector(delta,.5);ramp.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),delta.normalize());
 const plank=new T.Mesh(new T.BoxGeometry(2.4,.16,length),deck);ramp.add(plank);for(const side of [-1,1]){const rail=new T.Mesh(new T.BoxGeometry(.08,.08,length),gold);rail.position.set(side*1.15,.85,0);ramp.add(rail);}ramp.name='Warehouse shore boarding gangplank '+slot;root.add(ramp);ramps.push(ramp);
 const docking=new T.Group(),seat=new T.Vector3(A.dock.x+(slot-1)*14,A.floor-.08,A.dock.z-.25),landing=new T.Vector3(A.outside.x,A.floor-.08,A.outside.z),walk=landing.clone().sub(seat);docking.position.copy(seat).addScaledVector(walk,.5);docking.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),walk.clone().normalize());docking.add(new T.Mesh(new T.BoxGeometry(2.4,.16,walk.length()),deck));docking.name='Warehouse deployable docking gangplank '+slot;docking.visible=false;root.add(docking);dockRamps.push(docking);

 }
 root.userData={boats,ramps,dockRamps,dispose(){for(const model of boats)model.userData.dispose();for(const ramp of [...ramps,...dockRamps])ramp.traverse(o=>o.geometry?.dispose());deck.dispose();gold.dispose();root.removeFromParent();}};return root;
}
