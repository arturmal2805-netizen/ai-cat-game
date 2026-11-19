import {RESORT_POOL as P} from './resort-spa-pool-data.js';
import {RESORT_SPA as S} from './resort-spa-data.js';
const radiusDistance=(p,b)=>Math.hypot(Math.max(0,Math.abs(p.x-b.x)-b.w/2),Math.max(0,Math.abs(p.z-b.z)-b.d/2));
// Same 96 straight boundary segments as the rendered ellipse. A single bound
// of the cylinder would close the whole basin instead of retaining its water.
const compiled=new WeakMap();
function compile(pool){let data=compiled.get(pool);if(data)return data;const edges=Array.from({length:96},(_,i)=>{const a=i*Math.PI/48,b=(i+1)*Math.PI/48;return{ax:pool.x+Math.cos(a)*pool.rx,az:pool.z+Math.sin(a)*pool.rz,dx:(Math.cos(b)-Math.cos(a))*pool.rx,dz:(Math.sin(b)-Math.sin(a))*pool.rz};}),steps=Array.from({length:P.steps},(_,i)=>({x:pool.x,z:pool.z+pool.rz-(i+.5)*P.run,w:P.width,d:P.run+.01,top:pool.y-(i+1)*P.rise,bottom:pool.y-P.depth-.06}));data={edges,steps};compiled.set(pool,data);return data;}
function boundary(p,pool){let distance=Infinity;for(const{ax,az,dx,dz}of compile(pool).edges){const u=Math.max(0,Math.min(1,((p.x-ax)*dx+(p.z-az)*dz)/(dx*dx+dz*dz)));distance=Math.min(distance,Math.hypot(p.x-ax-dx*u,p.z-az-dz*u));}return distance;}
const steps=pool=>compile(pool).steps;
export function resortPoolBodyClear(p,pool,radius=.571){
 const inside=Math.hypot((p.x-pool.x)/pool.rx,(p.z-pool.z)/pool.rz)<1;
 if(p.y<pool.y&&boundary(p,pool)<radius)return false;
 if(inside&&p.y<pool.y-P.depth+P.foot-1e-6)return false;
 for(const step of steps(pool))if(step.top>p.y+.005&&step.bottom<p.y+2.15&&radiusDistance(p,step)<radius)return false;
 return true;
}
export function createResortPoolNavigation(getNavigation){
 return{
  support(p,pool,radius=.571){const nav=getNavigation(),hit=nav?.support({...p,y:p.y-S.y},radius),inside=Math.hypot((p.x-pool.x)/pool.rx,(p.z-pool.z)/pool.rz)<1,edge=boundary(p,pool);let y=hit?hit.y+S.y:null;
   // Real support under the rear part of the capsule keeps it on the rim
   // until it fully clears the wall, then on successive real stair treads.
   if(inside&&edge<radius&&Math.abs(p.y-(pool.y+P.foot))<.65)y=Math.max(y??-Infinity,pool.y+P.foot);
   for(const step of steps(pool)){const top=step.top+P.foot;if(radiusDistance(p,step)<radius&&Math.abs(top-p.y)<=.65)y=Math.max(y??-Infinity,top);}
   if(y===null||Math.abs(y-p.y)>.65||!resortPoolBodyClear({...p,y},pool,radius))return null;return{...p,y};
  },
  swimClear(p,pool,radius=.571){const nav=getNavigation();return Math.hypot((p.x-pool.x)/pool.rx,(p.z-pool.z)/pool.rz)<1&&boundary(p,pool)>=radius&&p.y<=pool.y-.2&&resortPoolBodyClear(p,pool,radius)&&(!nav?.bodyClear||nav.bodyClear({...p,y:p.y-S.y},radius));},
 };
}
