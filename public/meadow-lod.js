import {Box3,Matrix4,Vector3} from 'three';

// The shader's transition depends on distance to each clump root. A sphere
// around the whole cell keeps fully straightened blades on the expensive mesh
// unnecessarily. The root box proves that EVERY clump completed the morph.
export function installMeadowLod(lod,origins,{middle=12,empty=46}={}){
 const native=lod.update,world=new Box3(),previous=new Matrix4(),eye=new Vector3();
 let initialized=false,enabled=true;
 const local=origins.clone();
 lod.update=function(camera){
  if(!enabled)return native.call(this,camera);
  if(!initialized||!previous.equals(this.matrixWorld)){
   previous.copy(this.matrixWorld);world.copy(local).applyMatrix4(this.matrixWorld).expandByScalar(.002);initialized=true;
  }
  eye.setFromMatrixPosition(camera.matrixWorld);
  const distance=world.distanceToPoint(eye),level=distance>=empty?2:distance>=middle?1:0;
  this._currentLevel=level;
  for(let i=0;i<this.levels.length;i++)this.levels[i].object.visible=i===level;
 };
 const control={setEnabled(value){enabled=!!value;},get enabled(){return enabled;}};
 Object.defineProperty(lod.userData,'meadowLod',{value:control,configurable:true});
 return control;
}
