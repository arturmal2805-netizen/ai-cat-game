import * as T from 'three';
import {sculptZooAnimalSteps} from './zoo-sculpt.js';
// An Acropora-like colony grows as a fused surface. Branch junctions are part
// of that skin, rather than exposed intersections between decorative poles.
const cache=new Map();
export function* sculptBranchingCoralSteps(kind=0){
 if(cache.has(kind))return cache.get(kind);
 const segments=[],add=(a,b,r0,r1)=>{const d=b.map((v,k)=>v-a[k]);segments.push({a,b,d,l2:d.reduce((v,n)=>v+n*n,0),r0,r1});};
 add([0,.005,0],[0,.19,0],.10,.065);
 for(let branch=0;branch<(kind===8?11:9);branch++){
  const angle=branch*2.39996323+Math.sin(branch*17)*.20,r=.20+(branch%3)*.058,h=.43+(branch%4)*.065+Math.cos(branch*13)*.025,tip=[Math.cos(angle)*r,h,Math.sin(angle)*r],mid=[tip[0]*.48,h*.55,tip[2]*.5];
  if(kind===8){add([0,.025,0],mid,.075,.058);add(mid,tip,.058,.041);continue;}
  add([0,.08,0],mid,kind===7?.037:.047,kind===7?.024:.033);add(mid,tip,kind===7?.024:.033,.020);
  for(let j=0;j<(kind===7?5:4);j++){
   const t=.36+j*.17,a=angle+(j%2?1:-1)*(.65+(branch%3)*.12),start=[tip[0]*t,h*t,tip[2]*t],end=[start[0]+Math.cos(a)*(.10+j*.018),start[1]+.15+(j%3)*.018,start[2]+Math.sin(a)*(.10+j*.018)];
   add(start,end,.023-j*.002,.011);
   if(j>0){const end2=[end[0]+Math.cos(a+.7)*.055,end[1]+.095,end[2]+Math.sin(a+.7)*.055];add(end,end2,.012,.0075);}
  }
 }
 const field=(p,out)=>{
  let d=100,gx=0,gy=0,gz=0;
  for(const s of segments){
   const t=Math.max(0,Math.min(1,((p[0]-s.a[0])*s.d[0]+(p[1]-s.a[1])*s.d[1]+(p[2]-s.a[2])*s.d[2])/s.l2)),x=p[0]-s.a[0]-s.d[0]*t,y=p[1]-s.a[1]-s.d[1]*t,z=p[2]-s.a[2]-s.d[2]*t,len=Math.max(1e-8,Math.hypot(x,y,z)),q=len-(s.r0*(1-t)+s.r1*t),k=.018,h=Math.max(0,Math.min(1,.5+.5*(q-d)/k));
   if(out){gx=gx*h+x/len*(1-h);gy=gy*h+y/len*(1-h);gz=gz*h+z/len*(1-h);}d=q*(1-h)+d*h-k*h*(1-h);
  }
  if(out){out[0]=gx;out[1]=gy;out[2]=gz;}return d;
 };
 const volumes=segments.map(s=>({id:0,role:'coral',pos:s.a.map((v,k)=>(v+s.b[k])*.5),size:s.d.map(v=>Math.abs(v)*.5+s.r0),color:[0x9e816e,0x9e816e,0x9e816e,0x9e816e,0x9e816e,0x9e816e,0x9e816e,0x887284,0x9c967a][kind]}));
 const g=yield* sculptZooAnimalSteps(volumes,{resolution:112,boundsMargin:.045,targetTriangles:18000,customField:field,pigment(p,c){
  const growth=Math.min(1,Math.max(0,(p[1]-.32)*2.6));c.lerp(new T.Color(kind===7?0xc8a3b4:kind===8?0xbdb49b:0xcdbbd7),growth*.72);c.multiplyScalar(.91+.07*Math.sin(p[0]*27+p[2]*19));
 }});
 for(const name of Object.keys(g.attributes))if(!['position','normal','color','uv'].includes(name))g.deleteAttribute(name);
 const p=g.attributes.position,uv=g.attributes.uv;for(let i=0;i<p.count;i++)uv.setXY(i,p.getX(i)*3+p.getZ(i)*.7,p.getY(i)*3);
 cache.set(kind,g);return g;
}
