import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {MOSA_SEA,MOSA_RADIUS,MOSA_HEADLANDS,mosaCoastFactor,mosaBedY,mosaWaterRadius} from './mosasaur-data.js';
import {expandedCoastPoint,expandedCoastSamples,MOSA_EXPANSION,WAREHOUSE} from './mosasaur-expansion-data.js';
import {warehouseExteriorSteps} from './warehouse-exterior.js';
const TAU=Math.PI*2,clamp=T.MathUtils.clamp,smooth=T.MathUtils.smoothstep;
export const expansionPoint=(a,margin=0)=>expandedCoastPoint(a,MOSA_SEA,mosaCoastFactor,margin);
export function expansionOuterPoint(a){const p=expansionPoint(a,30),r=Math.hypot(p.x,p.z),s=Math.max(r,MOSA_RADIUS)/r;return{x:p.x*s,z:p.z*s};}
export function expansionShorePath(path,margin=0,outer=false,count=384){for(let i=0;i<=count;i++){const a=i*TAU/count,p=outer?expansionOuterPoint(a):expansionPoint(a,margin);i?path.lineTo(p.x,-p.z):path.moveTo(p.x,-p.z);}path.closePath();return path;}
// Move ONLY authored coast vegetation, never user placements or buildings.
export function expansionCoastDecorPoint(x,z,{outer=false}={}){
 const a=Math.atan2(z/MOSA_SEA.rz,x/MOSA_SEA.rx),old={x:Math.cos(a)*MOSA_SEA.rx*mosaCoastFactor(a),z:Math.sin(a)*MOSA_SEA.rz*mosaCoastFactor(a)},p=expansionPoint(a),r=Math.hypot(x,z),oldR=Math.hypot(old.x,old.z),newR=Math.hypot(p.x,p.z);
 if(newR-oldR<.01)return{x,z};
 const to=outer?expansionOuterPoint(a):expansionPoint(a,clamp((r-oldR)*.38,4,25));return to;
}
export const protectedBuildingBed=(x,z)=>Math.abs(x)<176&&z> -26&&z<300;
export function expansionBedY(x,z){
 if(protectedBuildingBed(x,z))return mosaBedY(x,z);
 const a=Math.atan2(z/MOSA_SEA.rz,x/MOSA_SEA.rx),p=expansionPoint(a),r=Math.hypot(x,z),outer=Math.hypot(p.x,p.z),q=mosaWaterRadius(x,z),oldR=r/Math.max(q,.00001),extension=outer-oldR;
 if(extension<1||q<=.84)return mosaBedY(x,z);
 const coastDistance=outer-r,deep=MOSA_EXPANSION.bedY+5*Math.sin(x*.008)*Math.sin(z*.007),shoal=smooth(coastDistance,0,100),channel=T.MathUtils.lerp(-.495,deep,shoal),carve=smooth(q,.84,1),base=q<1?T.MathUtils.lerp(mosaBedY(x,z),channel,carve):channel;
 // A broad natural shelf embeds the pale foundation; no suspended warehouse.
 const dx=Math.max(0,Math.abs(x-WAREHOUSE.x)-132),dz=Math.max(0,Math.abs(z-WAREHOUSE.z)-74),shelf=1-smooth(Math.hypot(dx,dz),0,80);let y=T.MathUtils.lerp(base,WAREHOUSE.y-1.25,shelf);
 // Existing headland crowns become intact islets with stone-root support.
 for(const h of MOSA_HEADLANDS){const d=Math.hypot(x-h.x,z-h.z);if(d<h.radius+15)y=Math.max(y,T.MathUtils.lerp(-10,base,smooth(d,h.radius*.84,h.radius+15)));}
 return y;
}
function radialAnnulus(segments,rings,{bed=false,baseY=0}={}){
 const pos=[],uv=[],colors=[],depth=[],index=[];
 for(let j=0;j<=rings;j++)for(let i=0;i<=segments;i++){
  const a=i*TAU/segments,f=mosaCoastFactor(-a),sx=Math.cos(a)*MOSA_SEA.rx*f,sz=-Math.sin(a)*MOSA_SEA.rz*f; // RingGeometry advances counterclockwise in XY; world Z is -Y.
  const p=expansionPoint(-a),t=j/rings,x=T.MathUtils.lerp(sx,p.x,t),z=T.MathUtils.lerp(sz,p.z,t),y=expansionBedY(x,z);
  pos.push(x/MOSA_SEA.rx,-z/MOSA_SEA.rz,bed?y-baseY:0);uv.push(x/MOSA_SEA.rx*.5+.5,-z/MOSA_SEA.rz*.5+.5);new T.Color(0xc8d5bb).toArray(colors,colors.length);depth.push(MOSA_SEA.surfaceY-y);
  if(j<rings&&i<segments){const n=j*(segments+1)+i;index.push(n,n+segments+1,n+1,n+1,n+segments+1,n+segments+2);}
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(index);g.computeVertexNormals();if(bed)g.setAttribute('color',new T.Float32BufferAttribute(colors,3));else g.setAttribute('aPhysicalBedDepth',new T.Float32BufferAttribute(depth,1));return g;
}
export function expandMosaSea(sea){
 const bed=sea.userData.bed,surface=sea.children.find(m=>m.isMesh&&m.material===sea.userData.water),bp=bed.geometry.attributes.position,depth=surface.geometry.attributes.aPhysicalBedDepth,sp=surface.geometry.attributes.position;
 // Core vertices retain their exact positions. Only the former outer shoreline
 // becomes the broad deep connection explicitly authorised by the user.
 for(let i=0;i<bp.count;i++){const x=bp.getX(i)*MOSA_SEA.rx,z=-bp.getY(i)*MOSA_SEA.rz;if(mosaWaterRadius(x,z)>.84)bp.setZ(i,expansionBedY(x,z)-bed.position.y);}
 for(let i=0;i<sp.count;i++){const x=sp.getX(i)*MOSA_SEA.rx,z=-sp.getY(i)*MOSA_SEA.rz;if(mosaWaterRadius(x,z)>.84&&!protectedBuildingBed(x,z))depth.setX(i,MOSA_SEA.surfaceY-expansionBedY(x,z));}
 const extension=radialAnnulus(surface.geometry.parameters.thetaSegments,80),bg=radialAnnulus(bed.geometry.parameters.thetaSegments,80,{bed:true,baseY:bed.position.y}),oldSurface=surface.geometry,oldBed=bed.geometry;
 surface.geometry=mergeGeometries([oldSurface,extension]);bed.geometry=mergeGeometries([oldBed,bg]);bed.geometry.computeVertexNormals();surface.geometry.computeBoundingSphere();surface.geometry.computeBoundingBox();surface.geometry.boundingBox.min.z=-1.2;surface.geometry.boundingBox.max.z=1.2;surface.geometry.computeBoundingSphere();
 for(const g of [oldSurface,extension,oldBed,bg])g.dispose();
 // Remove the former enclosing vertical wall/rim, not any fauna or seabed prop.
 for(const o of [...sea.children])if(o.isMesh&&o!==surface&&o!==bed&&(o.geometry.type==='CylinderGeometry'||o.geometry.type==='TorusGeometry')){sea.remove(o);o.geometry.dispose();o.material.dispose();}
 // One native surface, one released material/clock/field/probe, no second pond.
 sea.userData.expansion={version:12,waterSurfaces:1,sameMaterial:true,geometryOnly:true,centralCorePreserved:.84};
 return sea.userData.expansion;
}
export function* expansionWarehouseSteps(){return yield* warehouseExteriorSteps();}
