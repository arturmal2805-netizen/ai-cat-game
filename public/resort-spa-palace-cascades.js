import * as T from 'three';
import {waterMaterial} from './water-shading.js';
import {applyResortWaterReflection} from './resort-spa-reflections.js';
// Balcony weirs spill through the REAL double-height opening into Thermal's
// existing basin. No falling sheet crosses an intact intermediate slab.
export const PALACE_THERMAL_CASCADES=Object.freeze([-1,1].map(side=>Object.freeze({x:side*28,z:248,y:12.8,rx:4,rz:3.2,depth:.35,receiver:{x:0,z:266,y:0,rx:45,rz:19}})));
export function* resortPalaceCascadesSteps({solid,surfaces,decor,mats,waters}){
 const geos=new Set(),materials=new Set(),features=[];let lastImpact=-1;const own=g=>(geos.add(g),g);
 const add=(parent,g,m,x=0,y=0,z=0)=>{const o=new T.Mesh(g,m);o.position.set(x,y,z);o.userData.resortFloor=1;o.receiveShadow=true;o.castShadow=!m.transparent;parent.add(o);return o;};
 for(const s of PALACE_THERMAL_CASCADES){
  const bottom=own(new T.CircleGeometry(1,48).rotateX(-Math.PI/2));bottom.scale(s.rx,1,s.rz);add(solid,bottom,mats.ivory,s.x,s.y-s.depth,s.z);
  const wall=own(new T.CylinderGeometry(s.rx,s.rx,s.depth,64,1,true));wall.scale(1,1,s.rz/s.rx);add(solid,wall,mats.ivory,s.x,s.y-s.depth/2-.025,s.z);
  const water=waterMaterial(0x26bed5,.72,{width:s.rx*2,height:s.rz*2});water.uniforms.uWaterDepth.value=s.depth;water.fragmentShader=water.fragmentShader.replace('float waterDepth=mix(.23,uWaterDepth*(1.-.8*smoothstep(.55,1.,edge)),uLake);','float waterDepth=uWaterDepth;');applyResortWaterReflection(water,0);materials.add(water);
  const cap=own(new T.CircleGeometry(1,48).rotateX(-Math.PI/2));cap.scale(s.rx,1,s.rz);const source=add(surfaces,cap,water,s.x,s.y,s.z);waters.push(source);
  const points=[],uv=[],indices=[],width=3.2;
  for(let j=0;j<=24;j++)for(let i=0;i<=12;i++){const t=j/24,x=(i/12-.5)*width,z=s.z+s.rz*Math.sqrt(1-(x/s.rx)**2)+3.2*Math.sqrt(t);points.push(s.x+x,s.y*(1-t),z);uv.push(i/12,t);}
  for(let j=0;j<24;j++)for(let i=0;i<12;i++){const n=j*13+i;indices.push(n,n+1,n+13,n+1,n+14,n+13);}
  const sheet=own(new T.BufferGeometry());sheet.setAttribute('position',new T.Float32BufferAttribute(points,3));sheet.setAttribute('uv',new T.Float32BufferAttribute(uv,2));sheet.setIndex(indices);sheet.computeVertexNormals();
  const falling=waterMaterial(0x26bed5,.78,{waterfall:true,width,height:s.y,flow:{width,length:s.y,speed:3}});applyResortWaterReflection(falling,0);materials.add(falling);const fall=add(surfaces,sheet,falling);waters.push(fall);
  // Thin underside cantilevers support the raised weir, without a solid column
  // filling the lower Thermal hall or crossing its water.
  for(const side of [-1,1]){const g=own(new T.BoxGeometry(.16,.2,7));add(decor,g,mats.gold,s.x+side*3,s.y-s.depth-.12,s.z-2);}
  features.push({spec:s,source,fall});yield;
 }
 return{features,update(time,reduced,root){if(reduced)return;const tick=Math.floor(time*.85);if(tick===lastImpact)return;lastImpact=tick;const basin=root.userData.basins.find(b=>b.userData.palacePool?.id==='thermal-main');if(!basin)return;const uniforms=basin.userData.surface.material.uniforms;for(const f of features){const slot=uniforms.uRipples.value.reduce((a,b)=>a.z<b.z?a:b);slot.set(root.position.x+f.spec.x,root.position.z+f.spec.z+f.spec.rz+3.2,time,.045);}uniforms.uRippleCount.value=uniforms.uRipples.value.filter(r=>r.w>0).length;},dispose(){for(const g of geos)g.dispose();for(const m of materials)m.dispose();}};
}
