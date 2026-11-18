const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
function change(v,phase){v.phase=phase;v.elapsed=0;v.walking=false;}
// Grounded stairs and buoyant water movement are separate physical stages.
// No mount arc cuts across a basin wall, and cancellation uses the same exit.
export function cancelResortPool(v){if(v.cancelled)return;v.cancelled=true;if(v.phase==='wet-enter')change(v,'wet-exit');else if(v.phase!=='wet-exit'&&v.phase!=='wet-shake')change(v,'wet-return');}
export function stepResortPool(v,dt,navigation,free=()=>true){
 const c=v.contact,pool=c.pool;
 function ground(target){let left=dt*1.8;v.walking=false;while(left>1e-8){const dx=target.x-v.position.x,dz=target.z-v.position.z,d=Math.hypot(dx,dz);if(d<1e-7)return true;const h=Math.min(.08,d,left),q=navigation.support({...v.position,x:v.position.x+dx*h/d,z:v.position.z+dz*h/d},pool,v.radius);if(!q||!free(q))return false;v.yaw=Math.atan2(dx,dz);v.position=q;v.walking=true;left-=h;}return Math.hypot(target.x-v.position.x,target.z-v.position.z)<1e-7;}
 function swim(target,speed=1.5){let left=dt*speed;v.walking=false;while(left>1e-8){const d=distance(v.position,target);if(d<1e-7)return true;const h=Math.min(.08,d,left),u=h/d,q={x:v.position.x+(target.x-v.position.x)*u,y:v.position.y+(target.y-v.position.y)*u,z:v.position.z+(target.z-v.position.z)*u};if(!navigation.swimClear(q,pool,v.radius)||!free(q))return false;if(Math.hypot(target.x-v.position.x,target.z-v.position.z)>1e-6)v.yaw=Math.atan2(target.x-v.position.x,target.z-v.position.z);v.position=q;left-=h;}return distance(v.position,target)<1e-7;}
 if(v.phase==='wet-enter'){if(ground(c.entry))change(v,'wet-float');}
 else if(v.phase==='wet-float'){if(swim({...c.entry,y:c.y},.9))change(v,'wet-swim');}
 else if(v.phase==='wet-swim'){if(swim(c)){v.yaw=c.yaw;change(v,'procedure');}}
 else if(v.phase==='procedure'){
  const t=v.elapsed,active=v.zone.procedure==='swim',u=Math.min(1,t/2),angle=t*.45,rest=t>10&&t<15;
  const target={x:c.x+(active&&!rest?Math.sin(angle)*.55*u:0),y:c.y+Math.sin(t*1.1)*.025,z:c.z+(active&&!rest?(Math.cos(angle)-1)*.35*u:0)};swim(target,active?.8:.15);
 }else if(v.phase==='wet-return'){if(swim({...c.entry,y:c.y}))change(v,'wet-land');}
 else if(v.phase==='wet-land'){if(swim(c.entry,.9))change(v,'wet-exit');}
 else if(v.phase==='wet-exit'){if(ground(c.approach))change(v,'wet-shake');}
 else if(v.phase==='wet-shake'&&v.elapsed>=2)return true;
 return false;
}
