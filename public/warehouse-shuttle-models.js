import * as T from 'three';
import {createSubmarineModel} from './submarine-model.js';
import {WAREHOUSE_ACCESS as A} from './warehouse-access-data.js';
// A fixed three-boat pool is reused for every visitor, never one model per cat.
export function* warehouseFleetSteps(origin){
 const root=new T.Group(),boats=[];root.name='Warehouse · small native submarine shuttle fleet';root.position.set(origin.x,0,origin.z);
 for(let slot=0;slot<A.capacity;slot++){yield;const model=createSubmarineModel();model.name='Warehouse shuttle '+(slot+1);model.position.set(A.departure.x+slot*14,A.departure.y,A.departure.z);root.add(model);boats.push(model);}
 root.userData={boats,dispose(){for(const model of boats)model.userData.dispose();root.removeFromParent();}};return root;
}
