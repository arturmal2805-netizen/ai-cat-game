import * as T from 'three';
import {MeshoptSimplifier} from 'meshoptimizer/simplifier';
let ready=false;if(MeshoptSimplifier.supported)await MeshoptSimplifier.ready.then(()=>{ready=true;},()=>{});
// Only authored scenery uses these bounded variants. Native cats/animals and
// interactive geometry keep their full meshes. Vertices/UVs/colours/normals are
// shared exactly; only redundant distant triangles get a separate index list.
export function sceneryDetailIndex(geometry,error=.035,ratio=.35){
 if(!ready||!geometry.index||geometry.index.count<900)return geometry;
 const p=geometry.attributes.position,n=geometry.attributes.normal,uv=geometry.attributes.uv,c=geometry.attributes.color,attributes=new Float32Array(p.count*8);
 for(let i=0;i<p.count;i++){const k=i*8;attributes[k]=n.getX(i);attributes[k+1]=n.getY(i);attributes[k+2]=n.getZ(i);attributes[k+3]=uv?.getX(i)||0;attributes[k+4]=uv?.getY(i)||0;attributes[k+5]=c?.getX(i)??1;attributes[k+6]=c?.getY(i)??1;attributes[k+7]=c?.getZ(i)??1;}
 const positions=p.array instanceof Float32Array&&!p.isInterleavedBufferAttribute?p.array:Float32Array.from({length:p.count*3},(_,i)=>i%3===0?p.getX(i/3):i%3===1?p.getY(Math.floor(i/3)):p.getZ(Math.floor(i/3)));
 const [index,actual]=MeshoptSimplifier.simplifyWithAttributes(new Uint32Array(geometry.index.array),positions,3,attributes,8,[.002,.002,.002,.0005,.0005,.002,.002,.002],null,Math.floor(geometry.index.count*ratio/3)*3,error,['ErrorAbsolute','Regularize']);
 if(index.length>=geometry.index.count||actual>error+.00001)return geometry;
 const out=new T.BufferGeometry();for(const [name,a]of Object.entries(geometry.attributes))out.setAttribute(name,a);out.setIndex(new T.BufferAttribute(index,1));out.boundingBox=geometry.boundingBox?.clone()||null;out.boundingSphere=geometry.boundingSphere?.clone()||null;out.userData.lodError=actual;out.userData.fullIndexCount=geometry.index.count;return out;
}
