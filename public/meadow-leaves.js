import * as T from 'three';
import {surfaceTexture} from './fantasy-scenery.js';

// Shared curved coastal template. Other biomes keep their approved botany.
let template,paint;
function leafTemplate(){
 if(template)return template;
 const p=[],uv=[],color=[],index=[],along=14,across=6;
 for(let leaf=0;leaf<8;leaf++){
  const angle=leaf*2.39996323+.13*Math.sin(leaf*1.7),length=1.4+(leaf%4)*.15,width=.65+(leaf%3)*.1;
  const axis=new T.Vector3(Math.sin(angle)*.8,.72+(leaf%3)*.18,Math.cos(angle)*.8).normalize();
  const q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,1),axis).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),(leaf%3-1)*.2));
  const start=p.length/3;
  for(let row=0;row<=along;row++){
   const t=row/along,outline=Math.pow(Math.max(0,Math.sin(Math.PI*t)),.72)*width*.5;
   for(let col=0;col<=across;col++){
    const side=col/across*2-1;
    const x=side*outline*(1+.035*Math.sin(t*19+leaf+side));
    const curve=length*(.25*Math.sin(Math.PI*t)-.18*t*t*t);
    const cup=length*.07*Math.sin(Math.PI*t)*side*side;
    const rib=length*.012*Math.sin(Math.PI*t)*Math.exp(-Math.abs(side)*9);
    const twist=length*.045*Math.sin(t*Math.PI)*side*Math.sin(leaf*1.3+t*2);
    const v=new T.Vector3(x,curve-cup+rib+twist,length*t).applyQuaternion(q).add(new T.Vector3(Math.sin(angle)*.08,.05,Math.cos(angle)*.08));
    p.push(v.x,v.y,v.z);uv.push(col/across,t);
    const vein=Math.exp(-Math.abs(side)*14)*.075+Math.pow(Math.max(0,Math.cos((t-Math.abs(side)*.19)*Math.PI*12)),14)*.022;
    const shade=.82+t*.12+(leaf%4)*.035+vein; color.push(shade,shade,shade*.97);
    if(row<along&&col<across){const a=start+row*(across+1)+col;index.push(a,a+across+1,a+1,a+1,a+across+1,a+across+2);}
   }
  }
 }
 template=new T.BufferGeometry();template.setAttribute('position',new T.Float32BufferAttribute(p,3));template.setAttribute('uv',new T.Float32BufferAttribute(uv,2));template.setAttribute('color',new T.Float32BufferAttribute(color,3));template.setIndex(index);template.computeVertexNormals();template.computeBoundingSphere();template.userData.sharedScenery=true;
 return template;
}
export function meadowBroadleaf(parent,x,y,z,scale=1,turn=0){
 paint??=new T.MeshStandardMaterial({color:0x80c55b,roughness:.82,map:surfaceTexture('leaf'),side:T.DoubleSide,vertexColors:true});paint.userData.sharedScenery=true;paint.userData.surfaceKind='leaf';
 const mesh=new T.Mesh(leafTemplate(),paint);mesh.position.set(x,y,z);mesh.scale.setScalar(scale);mesh.rotation.y=turn;mesh.castShadow=mesh.receiveShadow=true;mesh.userData.meadowBroadleaf=true;parent.add(mesh);return mesh;
}
