import {spaPath} from './spa-navigation.js';
import {MALL,mallFloor} from './mall-data.js';
const grids=new WeakMap(),extent=72,cell=.45,size=extent*2+1;
export const mallNavigationReady=(boxes,radius)=>!!grids.get(boxes)?.has(radius);
export function* mallNavigationSteps(boxes,radius){
  let rows=grids.get(boxes);if(rows?.has(radius))return;
  const mask=new Uint8Array(size*size);
  for(let z=-extent;z<=extent;z++){
    yield;
    for(let x=-extent;x<=extent;x++)mask[(z+extent)*size+x+extent]=mallWalkable({x:x*cell,z:z*cell},radius,boxes)?1:0;
  }
  if(!rows){rows=new Map();grids.set(boxes,rows);}
  if(rows.size>=32)rows.delete(rows.keys().next().value);
  rows.set(radius,mask);
}

// The existing game's A* serves the mall as well. Boxes are measured from the
// actual fitted meshes before batching; no second hand-drawn furniture map.
export function mallWalkable(p,radius,boxes=[]){
  const r=Math.hypot(p.x,p.z),floor=r<MALL.radius-radius-.12&&r>10.05+radius;
  const landing=p.x> -5+radius&&p.x<17-radius&&p.z>18&&p.z<33;
  const cabin=Math.hypot(p.x-MALL.lift.x,p.z-(MALL.lift.z-MALL.z))<MALL.lift.radius-radius-.2;
  if(!floor&&!landing&&!cabin)return false;
  for(const b of boxes.cells?(boxes.cells.get(Math.floor(p.x/4)+","+Math.floor(p.z/4))||[]):boxes){
    const dx=p.x-b.x,dz=p.z-b.z,x=Math.abs(dx*b.c+dz*b.s),z=Math.abs(-dx*b.s+dz*b.c);
    if(Math.hypot(Math.max(0,x-b.hx),Math.max(0,z-b.hz))<radius+.04)return false;
  }
  return true;
}
export function mallPath(floor,from,to,radius,boxes){
  const a={x:from.x,z:from.z-MALL.z},b={x:to.x,z:to.z-MALL.z};
  const mask=grids.get(boxes)?.get(radius),known=new Map(),walkable=(p,r,obs)=>{
    const x=Math.round(p.x/cell),z=Math.round(p.z/cell);
    if(mask&&Math.abs(p.x-x*cell)<1e-7&&Math.abs(p.z-z*cell)<1e-7){
      return Math.abs(x)<=extent&&Math.abs(z)<=extent&&!!mask[(z+extent)*size+x+extent];
    }
    const key=p.x+','+p.z;if(known.has(key))return known.get(key);
    const clear=mallWalkable(p,r,obs);known.set(key,clear);return clear;
  };
  const path=spaPath(a,b,radius,boxes,walkable,{extent,cell});
  return path?.map(p=>({x:p.x,y:mallFloor(floor).y+.18,z:p.z+MALL.z}))||null;
}

export function collectMallObstacles(source,glass){
  const boxes=[];source.updateWorldMatrix(true,true);
  source.traverse(o=>{
    if(!o.isMesh||(!o.material.isMeshStandardMaterial&&o.material!==glass))return;
    const g=o.geometry;if(!g.boundingBox)g.computeBoundingBox();const b=g.boundingBox;if(!b)return;
    const e=o.matrixWorld.elements,cx=(b.min.x+b.max.x)/2,cy=(b.min.y+b.max.y)/2,cz=(b.min.z+b.max.z)/2;
    const hx=(b.max.x-b.min.x)/2,hy=(b.max.y-b.min.y)/2,hz=(b.max.z-b.min.z)/2;
    const y=e[1]*cx+e[5]*cy+e[9]*cz+e[13],dy=Math.abs(e[1])*hx+Math.abs(e[5])*hy+Math.abs(e[9])*hz;
    if(y+dy<.12||y-dy>2.15)return;
    const len=Math.hypot(e[0],e[2]),c=len?e[0]/len:1,s=len?e[2]/len:0;
    const x=e[0]*cx+e[4]*cy+e[8]*cz+e[12],z=e[2]*cx+e[6]*cy+e[10]*cz+e[14]-MALL.z;
    const bx=Math.abs(e[0]*c+e[2]*s)*hx+Math.abs(e[4]*c+e[6]*s)*hy+Math.abs(e[8]*c+e[10]*s)*hz;
    const bz=Math.abs(-e[0]*s+e[2]*c)*hx+Math.abs(-e[4]*s+e[6]*c)*hy+Math.abs(-e[8]*s+e[10]*c)*hz;
    // Thin mouldings attached to a larger fixture need no duplicate obstacle.
    if(Math.min(bx,bz)<.022||bx*bz<.012)return;
    boxes.push({x,z,hx:bx,hz:bz,c,s});
  });
  boxes.cells=new Map();
  for(const b of boxes){
    const rx=Math.abs(b.c)*b.hx+Math.abs(b.s)*b.hz+1.9,rz=Math.abs(b.s)*b.hx+Math.abs(b.c)*b.hz+1.9;
    for(let x=Math.floor((b.x-rx)/4);x<=Math.floor((b.x+rx)/4);x++)for(let z=Math.floor((b.z-rz)/4);z<=Math.floor((b.z+rz)/4);z++){
      const key=x+','+z;let list=boxes.cells.get(key);if(!list){list=[];boxes.cells.set(key,list);}list.push(b);
    }
  }
  return boxes;
}
