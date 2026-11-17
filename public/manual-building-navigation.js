import * as T from 'three';
// Capture actual primitive segments before render batching. A single bound of
// the merged building would incorrectly close doors, aisles and stairwells.
export function installManualBuildingNavigation(root,...sources){
 root.updateWorldMatrix(true,true);const inverse=root.matrixWorld.clone().invert(),matrix=new T.Matrix4(),boxes=[],surfaces=[];
 for(const source of sources)source.traverse(o=>{
  if(!o.isMesh||!o.material||o.material.isMeshBasicMaterial)return;
  const g=o.geometry;if(!g.boundingBox)g.computeBoundingBox();const b=g.boundingBox;if(!b)return;
  matrix.multiplyMatrices(inverse,o.matrixWorld);const e=matrix.elements,cx=(b.min.x+b.max.x)/2,cy=(b.min.y+b.max.y)/2,cz=(b.min.z+b.max.z)/2,hx=(b.max.x-b.min.x)/2,hy=(b.max.y-b.min.y)/2,hz=(b.max.z-b.min.z)/2;
  const len=Math.hypot(e[0],e[2]),c=len?e[0]/len:1,s=len?e[2]/len:0,x=e[0]*cx+e[4]*cy+e[8]*cz+e[12],y=e[1]*cx+e[5]*cy+e[9]*cz+e[13],z=e[2]*cx+e[6]*cy+e[10]*cz+e[14],dy=Math.abs(e[1])*hx+Math.abs(e[5])*hy+Math.abs(e[9])*hz;
  const box={x,z,c,s,hx:Math.abs(e[0]*c+e[2]*s)*hx+Math.abs(e[4]*c+e[6]*s)*hy+Math.abs(e[8]*c+e[10]*s)*hz,hz:Math.abs(-e[0]*s+e[2]*c)*hx+Math.abs(-e[4]*s+e[6]*c)*hy+Math.abs(-e[8]*s+e[10]*c)*hz,minY:y-dy,maxY:y+dy};
  if(box.hx<.008||box.hz<.008||box.maxY<-.2)return;
  boxes.push(box);
  const p=g.parameters||{},upright=Math.abs(e[1])+Math.abs(e[9])<1e-7;
  if(upright&&(p.width&&p.height&&p.depth||g.type==='SphereGeometry'&&box.maxY-box.minY<.65)){box.support=true;surfaces.push(box);}
 });
 const cells=new Map();for(const b of boxes){const rx=Math.abs(b.c)*b.hx+Math.abs(b.s)*b.hz+2,rz=Math.abs(b.s)*b.hx+Math.abs(b.c)*b.hz+2;for(let x=Math.floor((b.x-rx)/4);x<=Math.floor((b.x+rx)/4);x++)for(let z=Math.floor((b.z-rz)/4);z<=Math.floor((b.z+rz)/4);z++){const key=x+','+z;let row=cells.get(key);if(!row){row=[];cells.set(key,row);}row.push(b);}}
 const nav={boxes,surfaces,cells};root.userData.getManualNavigation=()=>nav;return nav;
}
const separation=(p,b)=>{const dx=p.x-b.x,dz=p.z-b.z;return Math.hypot(Math.max(0,Math.abs(dx*b.c+dz*b.s)-b.hx),Math.max(0,Math.abs(-dx*b.s+dz*b.c)-b.hz));};
export function manualBuildingSupport(nav,p,radius,{ground=.16,height=2.15,footOffset=.01,from=null}={}){
 let y=ground;
 for(let part=nav;part;part=part.extra)for(const b of part.cells.get(Math.floor(p.x/4)+','+Math.floor(p.z/4))||[]){
  if(!b.support)continue;const top=b.maxY+footOffset;if(top<=p.y+.65+1e-7&&top>=p.y-.65-1e-7&&top>y&&separation(p,b)<radius+.005)y=top;
 }
 if(Math.abs(y-p.y)>.65+1e-7)return null;
 for(let part=nav;part;part=part.extra)for(const b of part.cells.get(Math.floor(p.x/4)+','+Math.floor(p.z/4))||[]){
  if(b.maxY<=y+.005||b.minY>=y+height)continue;
  const depth=radius-separation(p,b);if(depth<=1e-7)continue;
  if(from&&b.maxY>from.y+.005&&b.minY<from.y+height){const previous=radius-separation(from,b);if(previous>0&&depth<=previous+1e-8)continue;}
  return null;
 }
 return{y};
}
export function manualBuildingCameraClear(nav,a,b,radius=.22){
 for(let part=nav;part;part=part.extra)for(const o of part.boxes){const local=p=>{const x=p.x-o.x,z=p.z-o.z;return[x*o.c+z*o.s,p.y,-x*o.s+z*o.c];},p=local(a),q=local(b),mins=[-o.hx-radius,o.minY-radius,-o.hz-radius],maxs=[o.hx+radius,o.maxY+radius,o.hz+radius];let lo=0,hi=1;
  for(let k=0;k<3;k++){const d=q[k]-p[k];if(Math.abs(d)<1e-10){if(p[k]<mins[k]||p[k]>maxs[k]){hi=-1;break;}}else{const t0=(mins[k]-p[k])/d,t1=(maxs[k]-p[k])/d;lo=Math.max(lo,Math.min(t0,t1));hi=Math.min(hi,Math.max(t0,t1));if(hi<lo)break;}}
  if(hi>=lo&&hi>=0&&lo<=1)return false;
 }
 return true;
}
