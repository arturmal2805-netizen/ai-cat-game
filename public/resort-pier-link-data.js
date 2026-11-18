// Released pier coordinates; only this new five-metre side gate is opened.
// Independent of SPA pricing/room art, so those edits cannot invalidate water
// reflection captures of the coast. A geometry test checks the SPA alignment.
export const RESORT_PIER_PORT=Object.freeze({z:289,width:5});
let cachedEnd=null,cached=null;
function pier(end){if(cachedEnd===end)return cached;const {z,width}=RESORT_PIER_PORT,rails=[[-1,23,92],[-1,99,end],[1,23,z-width/2],[1,z+width/2,end]].map(([side,a,b])=>({side,a,b,x:side*1.1,z:(a+b)/2,hz:(b-a)/2})),poles=[];for(let pz=24;pz<=end;pz+=2.5)for(const x of [-1.1,1.1])if(x>0?Math.abs(pz-z)>width/2+.1:pz<92||pz>99)poles.push({x,z:pz});for(const pz of [z-width/2,z+width/2])poles.push({x:1.1,z:pz});cachedEnd=end;return cached={rails,poles};}
export const mosaPierRails=end=>pier(end).rails;
export const mosaPierPoles=end=>pier(end).poles;
export function mosaPierClear(p,radius,end){if(p.y>1.1||p.y+2.15<.2)return true;if(p.y<1.0675&&p.y+2.15>1.0125)for(const rail of mosaPierRails(end))if(Math.hypot(Math.max(0,Math.abs(p.x-rail.x)-.0275),Math.max(0,Math.abs(p.z-rail.z)-rail.hz))<radius)return false;for(const pole of mosaPierPoles(end))if(Math.hypot(p.x-pole.x,p.z-pole.z)<radius+.055)return false;return true;}
