import * as T from 'three';
import {waterMaterial,advanceWater} from './water-shading.js';
import {slideBasinWater} from './slide-basin-optics.js';
// Actual recessed pool. Floor geometry has a real opening; all simulations can
// raycast the same triangles instead of treating a merged bound as a solid lid.
export function resortBasinGeometry({rx,rz,depth=1.8,rim=1,segments=96}){
 if(!(rx>3&&rz>3&&depth>0&&depth<=3))throw Error('Invalid SPA basin dimensions');
 const shape=new T.Shape();shape.absellipse(0,0,rx+rim,rz+rim,0,Math.PI*2,false);const hole=new T.Path();hole.absellipse(0,0,rx,rz,0,Math.PI*2,true);shape.holes.push(hole);
 const surround=new T.ShapeGeometry(shape,segments);surround.rotateX(-Math.PI/2);
 const bed=new T.CircleGeometry(1,segments);bed.rotateX(-Math.PI/2);bed.scale(rx,1,rz);bed.translate(0,-depth,0);
 const water=new T.CircleGeometry(1,segments);water.rotateX(-Math.PI/2);water.scale(rx,1,rz);
 // Vertical side wall is an actual ellipse, never a closed cylinder cap.
 const wall=new T.CylinderGeometry(1,1,depth,segments,1,true);wall.scale(rx,1,rz);wall.translate(0,-depth/2,0);
 const steps=[],count=Math.ceil(depth/.3),run=.75,width=4;
 for(let i=0;i<count;i++)steps.push({x:0,z:rz-(i+.5)*run,y:-(i+1)*depth/count,w:width,d:run+.01,h:depth-(i+1)*depth/count+.06});
 return{surround,bed,water,wall,steps,depth};
}
export function createResortBasin(spec,{stone,liner}={}){
 const root=new T.Group(),g=resortBasinGeometry(spec),owned=[];
 const rock=stone||new T.MeshStandardMaterial({color:0xffe5c4,roughness:.35}),bedMat=liner||new T.MeshStandardMaterial({color:0x86cbd4,roughness:.4,side:T.DoubleSide});if(!stone)owned.push(rock);if(!liner)owned.push(bedMat);
 const water=slideBasinWater(waterMaterial(0x00cfef,.72,{width:spec.rx*2,height:spec.rz*2}));water.uniforms.uWaterDepth.value=g.depth;
 const add=(geo,mat)=>{const o=new T.Mesh(geo,mat);o.receiveShadow=true;root.add(o);return o;};
 const floor=add(g.surround,rock),bed=add(g.bed,bedMat),wall=add(g.wall,bedMat),surface=add(g.water,water),steps=[];
 for(const s of g.steps){const geometry=new T.BoxGeometry(s.w,s.h,s.d);const o=add(geometry,rock);o.position.set(s.x,s.y-s.h/2,s.z);steps.push(o);}
 root.userData={floor,bed,wall,surface,steps,depth:g.depth,update:(t,reduced)=>advanceWater(water,t,reduced),dispose(){for(const o of root.children)o.geometry.dispose();water.dispose();for(const m of owned)m.dispose();}};return root;
}
