// Coordinates author the visible model AND the rider: no invisible shortcut.
import * as THREE from "three";
export const atollStair = (height, u) => {
  const a = Math.PI * 2 * Math.max(1, Math.round(height / 9)) * u;
  return [-46 + Math.sin(a) * 3.4, .16 + (height - 1.76) * u, -32 + Math.cos(a) * 3.4];
};
export function atollRecipe(spec, lane = 0) {
  const h = spec.height, parts = [], bowls = [], rings = [];
  const path = (points, options = {}) => { const p = {points, keepInversion:!!options.loops, ...options}; parts.push(p); return p; };
  const end = [spec.pool[0], 3.45, spec.pool[1]];
  const spiral = (top, low, r, turns, phase = 0, cx = 0, cz = -9) => Array.from({length: 145}, (_, i) => {
    const u = i / 144, a = phase + u * Math.PI * 2 * turns;
    return [cx + Math.sin(a) * r, top + (low - top) * u, cz + Math.cos(a) * r];
  });
  const loop = (x, y, z, r, drift = 8) => Array.from({length: 97}, (_, i) => {
    const a = i / 96 * Math.PI * 2;
    return [x + Math.sin(a) * r, y - Math.cos(a) * r, z + drift * i / 96];
  });
  const serpentine = (width, top, low, turns = 1.5, x = 0) => Array.from({length: 121}, (_, i) => {
    const u = i / 120; return [x + Math.sin(u * Math.PI * 2 * turns) * width, top + (low - top) * u, -28 + 49 * u];
  });
  switch(spec.kind) {
    case "giant-wave": {
      const p = [[-29,h,-29],[-29,h,-25],[-28,26,-21],[-14,6,-17], ...loop(0,30,-12,24,13),[24,6,12],end];
      path(p, {wave:true, loops:[[4,100]]}); break;
    }
    case "rock-arch": path([...spiral(h,8,23,1.5,.5),end],{full:true}); break;
    case "rainbow-race": {
      const x=(lane-2.5)*6.2;
      path([[x,h,-30],[x,h,-27],[x,h-5,-23],[x,18,-6],[x,7,12],[x,3.45,25],[x*.62,3.45,33]],{laneColor:lane}); break;
    }
    case "sky-serpent": path([...spiral(h,7,23,2.3,.35),end],{full:true}); break;
    case "blue-whirlpool": case "purple-vortex": {
      const purple=spec.kind==="purple-vortex", b={x:2,z:-3,radius:purple?23:24,base:purple?16:10,depth:purple?20:16,angle:-Math.PI*.75};
      bowls.push(b);
      const p=Array.from({length:241},(_,i)=>{
        const u=i/240,a=b.angle+u*Math.PI*2*2.6,r=b.radius*(.96-.62*u),x=b.x+Math.cos(a)*r,z=b.z+Math.sin(a)*r,
          slope=b.depth*1.7/b.radius*(r/b.radius)**.7, up=new THREE.Vector3(-Math.cos(a)*slope,1,-Math.sin(a)*slope).normalize();
        return new THREE.Vector3(x,b.base+b.depth*(r/b.radius)**1.7,z).addScaledVector(up,2.08).toArray();
      });
      path([[-31,h,-31],[-31,h,-27],[-28,h*.72,-21],p[0]],{full:true,receiver:p[0]});
      parts.push({points:p,bowl:b});
      const last=p.at(-1),angle=b.angle+Math.PI*2*2.6;
      path([last,[last[0],last[1],last[2]],
        [b.x+Math.cos(angle)*3.5,b.base+5,b.z+Math.sin(angle)*3.5],
        [b.x,b.base-4,b.z],[18,5,18],end],{full:true}); break;
    }
    case "double-serpent": {
      const target=[lane?10:-10,3.45,33];
      path([...spiral(h,7,24,1.6,lane*Math.PI),target],{full:true,laneColor:lane}); break;
    }
    case "waterfall-cascade": {
      // Four separate downhill sections, each connected through a real terrace basin.
      let start=[-20,h,-29];
      for(let i=0;i<4;i++) {
        const finish=i===3?end:[i%2? -17:17, h-(i+1)*15, -19+i*13];
        const p=path([start,[start[0],start[1],start[2]+3],[(start[0]+finish[0])/2,finish[1]+7,finish[2]-6],finish],{terrace:i<3});
        if(i<3)p.receiver=finish;
        start=finish;
      } break;
    }
    case "emerald-canyon": path([...serpentine(20,h,5,1.6),end]); break;
    case "crystal-cavern": path([...spiral(h,6,21,1.9,.3),end],{full:true}); break;
    case "root-valley": path([...spiral(h,7,24,2.1,.1),end],{full:true}); break;
    case "blue-halfpipe":
      path([[-28,h,-17],[-28,h,-14],[-26,28,-8],[-20,9,-2],[-8,5,2],[9,10,4],[24,35,6],[27,52,10],[24,33,15],[12,10,20],[0,4,25],end],{halfpipe:true}); break;
    case "lagoon-loop": path([[-30,h,-28],[-30,h,-25],[-26,20,-20],[-10,7,-14],...loop(0,32,-10,25,12),[20,5,17],end],{full:true,loops:[[4,100]]}); break;
    case "coral-arch": path([[-27,h,-29],[-27,h,-26],[-21,h*.9,-21],[0,h*.72,-11],[22,h*.53,0],[18,h*.38,14],[0,h*.24,20],[-20,h*.13,14],end],{full:true});break;
    case "cloud-islets": path([...serpentine(23,h,6,1.65),end],{full:true}); break;
    case "flower-lagoon": path([...spiral(h,7,23,1.9,.6),end],{full:true}); break;
    case "red-canyon": {
      const side=lane?1:-1;
      path([[side*13,h,-30],[side*13,h,-27],[side*17,40,-17],[side*11,19,-4],[side*16,8,13],[side*10,3.45,33]],{laneColor:lane});break;
    }
    case "abyss-bridge": path([[-30,h,-29],[-30,h,-26],[-10,h-1,-26],[23,h-2,-26],[25,h-6,-21],[25,17,-4],[16,5,18],end]);break;
    case "green-valley": path([...serpentine(23,h,5,2.4),end],{full:true}); break;
    case "mega-loops": {
      const p=[[-32,h,-33],[-32,h,-30],[-28,43,-28],...loop(-6,43,-23,20,10),...loop(8,29,-9,15,10),...loop(-3,17,5,10,10),[10,4,23],end];
      path(p,{full:true,loops:[[3,99],[100,196],[197,293]],coloredLoops:true});break;
    }
    default: throw Error("Missing atoll recipe: "+spec.kind);
  }
  // Preserve tangency at bowl transfers, using the same seam anchoring as existing rides.
  for(let i=0;i<parts.length-1;i++) {
    const a=parts[i],b=parts[i+1];
    if(b.bowl)a.points[a.points.length-2]=new THREE.Vector3(...b.points[0]).addScaledVector(new THREE.Vector3(...b.points[1]).sub(new THREE.Vector3(...b.points[0])).normalize(),-3).toArray();
    if(a.bowl)b.points[1]=new THREE.Vector3(...a.points.at(-1)).addScaledVector(new THREE.Vector3(...a.points.at(-1)).sub(new THREE.Vector3(...a.points.at(-2))).normalize(),3).toArray();
  }
  return {parts,bowls,rings};
}
