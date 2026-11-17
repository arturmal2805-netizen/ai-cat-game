// First bounded reef candidate on the released seabed, not an island expansion.
export const SEABED_REEF_PATCH=Object.freeze({x:0,z:-95,rx:10,rz:8,corals:64,grass:1024});
export function seabedPatchMask(x,z){
 const p=SEABED_REEF_PATCH,dx=x-p.x,dz=z-p.z;
 const r=Math.hypot(dx/p.rx,dz/p.rz)+.055*Math.sin(dx*.8)*Math.sin(dz*.9);
 const t=Math.max(0,Math.min(1,(r-.65)/.35));return 1-t*t*(3-2*t);
}
export function seabedPatchHabitat(x,z){
 const p=SEABED_REEF_PATCH,dx=x-p.x,dz=z-p.z;
 if(Math.abs(dx-1.5*Math.sin(dz*.23))<1.35)return 0;
 return seabedPatchMask(x,z)*(.54+.25*Math.sin(dx*.91)+.21*Math.cos(dz*.83+dx*.22));
}
