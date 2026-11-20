import {runSceneSteps} from './scene-tasks.js';
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {MOSA_SEA,MOSA_RADIUS,MOSA_HEADLANDS,mosaCoastFactor,mosaBedY,mosaWaterRadius} from './mosasaur-data.js';
import {expandedCoastPoint,expandedCoastSamples,MOSA_EXPANSION,WAREHOUSE,WAREHOUSE_REEFS} from './mosasaur-expansion-data.js';
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
// Keep headlands only on the NEW outer shore. Old interior crowns are removed,
// rather than surrounding the unchanged buildings with a miniature rock ring.
let shoreHeadlands;
export function expansionHeadlands(){return shoreHeadlands??=MOSA_HEADLANDS.filter(h=>{const a=Math.atan2(h.z/MOSA_SEA.rz,h.x/MOSA_SEA.rx),p=expansionPoint(a);return Math.hypot(h.x,h.z)>=Math.hypot(p.x,p.z)+h.radius*.15;});}
export const EXPANSION_PROTECTED_CORE=.7;
export const buildingBedShoulderDistance=(x,z)=>Math.hypot(Math.max(0,Math.abs(x)-176),Math.max(0,-26-z,z-300));
export const protectedBuildingBed=(x,z)=>Math.abs(x)<176&&z> -26&&z<300;
function baseExpansionBedY(x,z){
 if(protectedBuildingBed(x,z))return mosaBedY(x,z);
 const a=Math.atan2(z/MOSA_SEA.rz,x/MOSA_SEA.rx),p=expansionPoint(a),r=Math.hypot(x,z),outer=Math.hypot(p.x,p.z),q=mosaWaterRadius(x,z),oldR=r/Math.max(q,.00001),extension=outer-oldR;
 if(extension<1||q<=EXPANSION_PROTECTED_CORE)return mosaBedY(x,z);
 const coastDistance=outer-r,deep=MOSA_EXPANSION.bedY+5*Math.sin(x*.008)*Math.sin(z*.007),shoal=smooth(coastDistance,0,100),channel=T.MathUtils.lerp(-.495,deep,shoal),carve=smooth(q,EXPANSION_PROTECTED_CORE,1),carved=q<1?T.MathUtils.lerp(mosaBedY(x,z),channel,carve):channel,base=T.MathUtils.lerp(mosaBedY(x,z),carved,smooth(buildingBedShoulderDistance(x,z),0,90));
 // A broad natural shelf embeds the pale foundation; no suspended warehouse.
 const dx=Math.max(0,Math.abs(x-WAREHOUSE.x)-WAREHOUSE.platformWidth/2),dz=Math.max(0,Math.abs(z-WAREHOUSE.z)-WAREHOUSE.platformDepth/2),shelf=1-smooth(Math.hypot(dx,dz),0,80);let y=T.MathUtils.lerp(base,WAREHOUSE.y-1.25,shelf);
 // Only the real outside shore keeps headland roots; no old internal ring.
 for(const h of expansionHeadlands()){const d=Math.hypot(x-h.x,z-h.z);if(d<h.radius+15)y=Math.max(y,T.MathUtils.lerp(-10,base,smooth(d,h.radius*.84,h.radius+15)));}
 for(const reef of WAREHOUSE_REEFS){const r=Math.hypot(x-reef.x,z-reef.z)/reef.radius;if(r<1)y=Math.max(y,T.MathUtils.lerp(base,reef.top,1-smooth(r,.14,1)));}
 return y;
}
// The old approach ridge hid the retained SPA from the shared-lagoon overview.
// Excavate only its front water approach; all building meshes and dry access
// remain at their saved coordinates. Existing seabed gardens end below z=170.
export const spaApproachCutWeight=(x,z)=>smooth(z,250,280)*(1-smooth(Math.abs(x),210,310))*(1-smooth(z,460,600));
export function expansionBedY(x,z){const bed=baseExpansionBedY(x,z),cut=spaApproachCutWeight(x,z);return T.MathUtils.lerp(bed,Math.min(bed,MOSA_EXPANSION.bedY+2),cut);}
// Double both grid axes when the outer geography doubles. The first row is
// the exact old boundary; a 2:1 triangle transition prevents cracks without
// retessellating the protected original water or adding a shader variant.
function* radialAnnulusSteps(source,rings,{bed=false,baseY=0}={}){
 const baseSegments=source.parameters.thetaSegments,segments=baseSegments*2,sourcePos=source.attributes.position,sourceUV=source.attributes.uv,sourceColor=source.attributes.color,sourceDepth=source.attributes.aPhysicalBedDepth,start=sourcePos.count-baseSegments-1;
 const pos=[],uv=[],colors=[],depth=[],index=[],normal=[],sand=new T.Color(0xc8d5bb);let previousStart=0,previousCount=baseSegments;
 for(let j=0;j<=rings;j++){
  const count=j?segments:baseSegments,rowStart=pos.length/3,t=j/rings;
  for(let i=0;i<=count;i++){
   const oldIndex=i*baseSegments/count,lo=Math.floor(oldIndex),hi=Math.min(baseSegments,lo+1),fraction=oldIndex-lo,ox=T.MathUtils.lerp(sourcePos.getX(start+lo),sourcePos.getX(start+hi),fraction),oy=T.MathUtils.lerp(sourcePos.getY(start+lo),sourcePos.getY(start+hi),fraction),a=-i*TAU/count,p=expansionPoint(a),x=T.MathUtils.lerp(ox*MOSA_SEA.rx,p.x,t),z=T.MathUtils.lerp(-oy*MOSA_SEA.rz,p.z,t),y=expansionBedY(x,z);
   pos.push(j?x/MOSA_SEA.rx:sourcePos.getX(start+i),j?-z/MOSA_SEA.rz:sourcePos.getY(start+i),bed?(j?y-baseY:sourcePos.getZ(start+i)):0);normal.push(0,0,1);
   uv.push(j?x/MOSA_SEA.rx*.5+.5:sourceUV.getX(start+i),j?-z/MOSA_SEA.rz*.5+.5:sourceUV.getY(start+i));
   if(bed){if(j)sand.toArray(colors,colors.length);else colors.push(sourceColor.getX(start+i),sourceColor.getY(start+i),sourceColor.getZ(start+i));}
   else depth.push(j?MOSA_SEA.surfaceY-y:sourceDepth.getX(start+i));
  }
  if(j)for(let i=0;i<previousCount;i++){
   const a=previousStart+i,b=a+1,c=rowStart+(count===previousCount?i:i*2);
   if(count===previousCount)index.push(a,c,b,b,c,c+1);
   else index.push(a,c,c+1,a,c+1,b,b,c+1,c+2);
  }
  previousStart=rowStart;previousCount=count;yield;
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('normal',new T.Float32BufferAttribute(normal,3));g.setIndex(index);if(bed)g.setAttribute('color',new T.Float32BufferAttribute(colors,3));else g.setAttribute('aPhysicalBedDepth',new T.Float32BufferAttribute(depth,1));return g;
}
export function* expandMosaSeaSteps(sea){
 const bed=sea.userData.bed,surface=sea.children.find(m=>m.isMesh&&m.material===sea.userData.water),bp=bed.geometry.attributes.position,depth=surface.geometry.attributes.aPhysicalBedDepth,sp=surface.geometry.attributes.position;
 // Preserve the original caves, seabed gardens and building foundation. Smooth
 // the former basin shoulder across its outer 30%, without a leftover ridge.
 for(let i=0;i<bp.count;i++){if(i%1024===0)yield;const x=bp.getX(i)*MOSA_SEA.rx,z=-bp.getY(i)*MOSA_SEA.rz;if(mosaWaterRadius(x,z)>EXPANSION_PROTECTED_CORE)bp.setZ(i,expansionBedY(x,z)-bed.position.y);}
 for(let i=0;i<sp.count;i++){if(i%1024===0)yield;const x=sp.getX(i)*MOSA_SEA.rx,z=-sp.getY(i)*MOSA_SEA.rz;if(mosaWaterRadius(x,z)>EXPANSION_PROTECTED_CORE&&!protectedBuildingBed(x,z)||spaApproachCutWeight(x,z)>0)depth.setX(i,MOSA_SEA.surfaceY-expansionBedY(x,z));}
 const extension=yield* radialAnnulusSteps(surface.geometry,160),bg=yield* radialAnnulusSteps(bed.geometry,160,{bed:true,baseY:bed.position.y}),oldSurface=surface.geometry,oldBed=bed.geometry;
 surface.geometry=mergeGeometries([oldSurface,extension]);bed.geometry=mergeGeometries([oldBed,bg]);bed.geometry.computeVertexNormals();surface.geometry.computeBoundingSphere();surface.geometry.computeBoundingBox();surface.geometry.boundingBox.min.z=-1.2;surface.geometry.boundingBox.max.z=1.2;surface.geometry.computeBoundingSphere();
 for(const g of [oldSurface,extension,oldBed,bg])g.dispose();
 // Remove the former enclosing vertical wall/rim, not any fauna or seabed prop.
 for(const o of [...sea.children])if(o.isMesh&&o!==surface&&o!==bed&&(o.geometry.type==='CylinderGeometry'||o.geometry.type==='TorusGeometry')){sea.remove(o);o.geometry.dispose();o.material.dispose();}
 // One native surface, one released material/clock/field/probe, no second pond.
 const coast=expandedCoastSamples(MOSA_SEA,mosaCoastFactor),area=Math.abs(coast.slice(1).reduce((sum,p,i)=>sum+coast[i].x*p.z-p.x*coast[i].z,0))*.5;
 sea.userData.expansion={version:12,waterSurfaces:1,sameMaterial:true,geometryOnly:true,centralCorePreserved:EXPANSION_PROTECTED_CORE,removedInnerHeadlands:MOSA_HEADLANDS.length-expansionHeadlands().length,spaApproachCleared:true,waterAreaM2:area,extraSurfaceVertices:extension.attributes.position.count,extraBedVertices:bg.attributes.position.count};
 return sea.userData.expansion;
}
export const expandMosaSea=sea=>runSceneSteps(expandMosaSeaSteps(sea));
export function* expansionWarehouseSteps(){return yield* warehouseExteriorSteps();}

// Residents retain valid released save coordinates on the still-dry old shore.
// Owned pads and the existing pier always win; never strand a saved cat where
// the explicitly approved coast redesign removed the old ground.
let survivingShore;
export function survivingLegacyShore(point,margin,zones=[]){
 if(Math.abs(point.x)<=1.1&&point.z>=9.8&&point.z<=326.8)return point;
 if(zones.some(p=>{const a=p.yaw||0,dx=point.x-p.x,dz=point.z-p.z;return Math.abs(dx*Math.cos(a)-dz*Math.sin(a))<=p.w/2&&Math.abs(dx*Math.sin(a)+dz*Math.cos(a))<=p.d/2;}))return point;
 const wet=(x,z)=>{const a=Math.atan2(z/MOSA_SEA.rz,x/MOSA_SEA.rx),p=expansionPoint(a);return Math.hypot(x,z)<Math.hypot(p.x,p.z)+Math.max(.5,margin);};
 if(!wet(point.x,point.z))return point;
 survivingShore??=Array.from({length:384},(_,i)=>{const a=i*TAU/384,p={x:Math.cos(a)*MOSA_SEA.rx*mosaCoastFactor(a),z:Math.sin(a)*MOSA_SEA.rz*mosaCoastFactor(a)},r=Math.hypot(p.x,p.z),factor=(r+7)/r;return{x:p.x*factor,z:p.z*factor};}).filter(p=>!wet(p.x,p.z)&&MOSA_HEADLANDS.every(h=>Math.hypot(p.x-h.x,p.z-h.z)>h.radius+5));
 let nearest=point,distance=Infinity;for(const p of survivingShore){const d=Math.hypot(p.x-point.x,p.z-point.z);if(d<distance){distance=d;nearest=p;}}return {...nearest};
}
