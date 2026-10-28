import * as THREE from 'three';
import {applyUnderwaterLighting} from './water-shading.js';
import {copyGeometryBuffers} from './geometry-tasks.js';
export const SLIDE_BASIN_BLUE=0x24b9ff;
// ShapeGeometry uses metre UVs; the lake shader needs a centred unit disk.
// Normalise once at construction, never in a production frame.
export function normalizeBasinUV(geometry){
 const uv=geometry.attributes.uv;if(!uv)return false;
 let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
 for(let i=0;i<uv.count;i++){minX=Math.min(minX,uv.getX(i));maxX=Math.max(maxX,uv.getX(i));minY=Math.min(minY,uv.getY(i));maxY=Math.max(maxY,uv.getY(i));}
 if(minX>=-1e-6&&minY>=-1e-6&&maxX<=1.000001&&maxY<=1.000001)return false;
 for(let i=0;i<uv.count;i++)uv.setXY(i,(uv.getX(i)-minX)/(maxX-minX||1),(uv.getY(i)-minY)/(maxY-minY||1));uv.needsUpdate=true;return true;
}
export function slideBasinWater(water){
 water.defines={...water.defines,SLIDE_CATCH_POOL:1};water.uniforms.uColor.value.setHex(SLIDE_BASIN_BLUE);water.uniforms.uShoreColor.value.setHex(0x98eaff);water.uniforms.uOpacity.value=.78;water.needsUpdate=true;return water;
}
export function applySlideBasinOptics(pool){
 if(pool.userData.slideBasinOptics)return pool;
 const water=pool.userData.water;if(!water?.uniforms?.uWaterField)return pool;
 slideBasinWater(water);
 const surfaces=[];let normalised=0;pool.traverse(o=>{if(o.isMesh&&o.material===water){if(o.geometry.userData.sharedScenery)o.geometry=copyGeometryBuffers(o.geometry);normalised+=Number(normalizeBasinUV(o.geometry));surfaces.push(o);}});
 const bed=pool.userData.bed;
 if(bed){
  if(bed.material.userData.sharedScenery)bed.material=bed.material.clone();
  if(bed.material.vertexColors&&bed.geometry.attributes.color){
   if(bed.geometry.userData.sharedScenery)bed.geometry=copyGeometryBuffers(bed.geometry);
   const uv=bed.geometry.attributes.uv,c=bed.geometry.attributes.color,deep=new THREE.Color(0x4ea9dc),shore=new THREE.Color(0xb0ecf8),tint=new THREE.Color();
   let radius=1;for(let i=0;i<uv.count;i++)radius=Math.max(radius,Math.hypot(uv.getX(i)-.5,uv.getY(i)-.5)*2);
   for(let i=0;i<c.count;i++){const r=Math.min(1,Math.hypot(uv.getX(i)-.5,uv.getY(i)-.5)*2/radius);tint.copy(deep).lerp(shore,r*r);c.setXYZ(i,tint.r,tint.g,tint.b);}c.needsUpdate=true;bed.material.color.setHex(0xffffff);
  }else bed.material.color.setHex(0x8ad8f3);
  if(!bed.material.userData.waterLight)applyUnderwaterLighting(bed.material,water.uniforms.uTime,SLIDE_BASIN_BLUE);
 }
 const previous=pool.userData.update,level=bed?.material.userData.waterLight?.level;
 pool.userData.update=(time,reduced=false)=>{previous?.(time,reduced);if(level&&surfaces[0]){surfaces[0].updateWorldMatrix(true,false);level.value=surfaces[0].matrixWorld.elements[13];}};
 pool.userData.slideBasinOptics={version:1,normalisedSurfaces:normalised,surfaces};return pool;
}
