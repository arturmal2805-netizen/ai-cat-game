// First bounded reef candidate on the released seabed, not an island expansion.
export const SEABED_REEF_PATCH=Object.freeze({x:0,z:-95,rx:10,rz:8,corals:64,grass:1024});
export const SEABED_REEF_GARDENS=Object.freeze([
 SEABED_REEF_PATCH,
 ...[[-135,-105],[-65,-175],[65,-145],[135,-105],[-165,-20],[-85,-40],[85,-40],[165,-20],[-130,75],[130,75],[-135,145],[135,145]].map(([x,z])=>Object.freeze({x,z,rx:28,rz:24,corals:96,grass:1536}))
]);
export function seabedPatchMask(x,z,p=SEABED_REEF_PATCH){
 const dx=x-p.x,dz=z-p.z;
 const r=Math.hypot(dx/p.rx,dz/p.rz)+.055*Math.sin(dx*.8)*Math.sin(dz*.9);
 const t=Math.max(0,Math.min(1,(r-.65)/.35));return 1-t*t*(3-2*t);
}
export function seabedPatchHabitat(x,z,p=SEABED_REEF_PATCH){
 const dx=x-p.x,dz=z-p.z;
 if(Math.abs(dx-1.5*Math.sin(dz*.23))<1.35)return 0;
 return seabedPatchMask(x,z,p)*(.54+.25*Math.sin(dx*.91)+.21*Math.cos(dz*.83+dx*.22));
}
