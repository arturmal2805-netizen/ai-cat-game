import * as T from 'three';
import {MALL_AIRLOCK as A} from './mall-airlock-data.js';

export function createMallAirlock(){
  const root=new T.Group();root.name='Mall sequential pressure airlock';root.position.set(A.x,A.y,A.z);
  const glass=new T.MeshStandardMaterial({color:0x9ae9ee,transparent:true,opacity:.2,roughness:.15,metalness:.12,side:T.DoubleSide,depthWrite:false});
  const frame=new T.MeshStandardMaterial({color:0x183a50,roughness:.35,metalness:.6});
  const light=new T.MeshBasicMaterial({color:0x64ffe8}),water=new T.MeshBasicMaterial({color:0x47bfda,transparent:true,opacity:.22,side:T.DoubleSide,depthWrite:false});
  const box=(x,y,z,w,h,d,material,parent=root)=>{const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);mesh.castShadow=!material.transparent;mesh.receiveShadow=true;parent.add(mesh);return mesh;};
  for(const side of [-1,1]){box(side*4,3.6,0,.12,7.2,8,glass);for(const z of [-4,4])box(side*4,3.6,z,.18,7.2,.18,frame);}
  box(0,.02,0,8,.16,8,frame);box(0,7.2,0,8,.12,8,glass);
  const doors=[];
  for(const z of [-4,4]){
    box(0,7.05,z,8,.22,.25,frame);box(0,6.8,z,7.5,.06,.1,light);
    const pair=[];for(const side of [-1,1]){const panel=new T.Group();panel.position.set(side*1.9,0,z);root.add(panel);box(0,3.45,0,3.8,6.9,.14,glass,panel);for(const x of [-1.85,1.85])box(x,3.45,0,.08,6.9,.2,frame,panel);pair.push({panel,side});}doors.push(pair);
  }
  const surface=new T.Mesh(new T.PlaneGeometry(7.8,7.8),water);surface.rotation.x=-Math.PI/2;surface.position.y=5.8;root.add(surface);
  root.userData.update=(outer=0,inner=0,level=1)=>{
    for(const [index,opening]of [inner,outer].entries())for(const {panel,side}of doors[index])panel.position.x=side*(1.9+opening*3.85);
    surface.position.y=.1+level*5.7;surface.visible=level>.01;
  };
  root.userData.update();return root;
}
