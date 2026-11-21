import {WATERFRONT as W,promenadeFront,promenadeBack,bridgePoint}from'./waterfront-data.js';
export const WATERFRONT_FOOT=.012;
const bridge=Array.from({length:97},(_,i)=>bridgePoint(i/96));
export const waterfrontTables=(()=>{const a=[];for(const x of[-115,-75,75,115])for(const z of[-40,-10,34])a.push({x,z});for(const x of[-44,-22,22,44])a.push({x,z:-13});for(const s of[-1,1])for(let i=0;i<6;i++)a.push({x:s*(170+i%3*48),z:-22+Math.floor(i/3)*52});return a;})();
export function bridgeSupport(x,z,radius=0){let best=null,distance=Infinity;for(let i=1;i<bridge.length;i++){const a=bridge[i-1],b=bridge[i],dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz))),d=Math.hypot(x-a.x-dx*t,z-a.z-dz*t);if(d<distance){distance=d;best={y:a.y+(b.y-a.y)*t,t:(i-1+t)/96};}}return distance<=W.bridge.width/2-radius?best:null;}
export function waterfrontDrySupport(p,radius=.55){
 const r=W.trampoline.radius,dx=p.x-W.trampoline.x,dz=p.z-W.trampoline.z;
 if(Math.hypot(dx,dz)<=r-radius)return{y:W.trampoline.y+WATERFRONT_FOOT,kind:'net'};
 const b=bridgeSupport(p.x,p.z,radius);if(b)return{...b,y:b.y+WATERFRONT_FOOT,kind:'bridge'};
 if(Math.abs(p.x)<W.width/2-radius&&p.z>promenadeBack(p.x)+radius&&p.z<promenadeFront(p.x)-radius)return{y:W.y+WATERFRONT_FOOT,kind:'pier'};
 // A flared threshold closes the small curved shore/bridge seam.
 if(Math.abs(p.x)<W.bridge.width/2-radius&&p.z>=76&&p.z<=89)return{y:W.y+WATERFRONT_FOOT,kind:'bridge'};
 return null;
}
function wallBlocked(p,r){
 if(Math.abs(p.x)<141+r&&p.z>-64-r&&p.z<48+r){if(Math.abs(p.x)>138-r)return true;if(p.z< -61+r)return true;if(p.z>44-r&&p.z<48+r&&Math.abs(p.x)>17-r)return true;}
 return false;
}
export function waterfrontWalkable(p,r=.55,{furniture=true}={}){const support=waterfrontDrySupport(p,r);if(!support||wallBlocked(p,r))return null;if(furniture&&support.kind==='pier'&&waterfrontTables.some(t=>Math.hypot(p.x-t.x,p.z-t.z)<3+r))return null;return support;}
export function waterfrontPath(from,to,r=.6){
 if(!waterfrontWalkable(to,r))return null;const insideNet=p=>Math.hypot(p.x-W.trampoline.x,p.z-W.trampoline.z)<74;
 if(to.z>=88||from.z>=88){const entering=from.z<88,points=bridge.filter((_,i)=>i%4===0).map(p=>({...p,y:p.y+WATERFRONT_FOOT}));const threshold={x:0,z:75,y:W.y+WATERFRONT_FOOT};if(entering){const land=waterfrontPath(from,threshold,r);return land?[...land,...points,to]:null;}if(!insideNet(to)&&to.z<88){const land=waterfrontPath(threshold,to,r);return land?[...points.reverse(),threshold,...land]:null;}return[from,to];}
 const step=3,minX=-324,minZ=-75,nx=217,nz=54,key=(x,z)=>z*nx+x,cell=p=>({x:Math.max(0,Math.min(nx-1,Math.round((p.x-minX)/step))),z:Math.max(0,Math.min(nz-1,Math.round((p.z-minZ)/step)))}),a=cell(from),b=cell(to),start=key(a.x,a.z),end=key(b.x,b.z),queue=[start],seen=new Map([[start,null]]);
 for(let cursor=0;cursor<queue.length&&cursor<12000;cursor++){const k=queue[cursor];if(k===end)break;const x=k%nx,z=Math.floor(k/nx);for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,zz=z+dz,n=key(xx,zz);if(xx<0||xx>=nx||zz<0||zz>=nz||seen.has(n))continue;const p={x:minX+xx*step,z:minZ+zz*step};if(n!==end&&!waterfrontWalkable(p,r+.3))continue;seen.set(n,k);queue.push(n);}}
 if(!seen.has(end))return null;const path=[to];let k=seen.get(end),last=null;while(k!==null){const p={x:minX+(k%nx)*step,z:minZ+Math.floor(k/nx)*step,y:W.y+WATERFRONT_FOOT};const d=last&&{x:last.x-p.x,z:last.z-p.z};if(path.length<2||!d||d.x!==(last?.dx)||d.z!==(last?.dz))path.push(p);else path[path.length-1]=p;last={...p,dx:d?.x,dz:d?.z};k=seen.get(k);}path.reverse();return path;
}
export function waterfrontCameraClear(a,b){for(let i=0;i<=16;i++){const t=i/16,p={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t};if(p.y>1&&p.y<26&&wallBlocked(p,.3))return false;if(p.y<1&&p.y>-2.6&&waterfrontDrySupport(p,0)&&Math.abs(p.x)>58)return false;}return true;}
