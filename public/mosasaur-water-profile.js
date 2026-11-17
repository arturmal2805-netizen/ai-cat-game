// Mosasaur-only optical calibration. Metres and seconds, not island-normalised
// depth. The attraction material, authored colours and clocks remain independent.
export const MOSA_OCEAN_PROFILE=Object.freeze({
 version:'shared-core-ocean-waves-v1',maximumDisplacement:.83,
 swells:Object.freeze([
  Object.freeze({amplitude:.50,x:.12,z:.072,omega:1.17}),
  Object.freeze({amplitude:.23,x:-.073,z:.104,omega:1.12}),
  Object.freeze({amplitude:.10,x:.039,z:-.034,omega:.71}),
 ]),
});
export function mosaOceanSwell(x,z,seconds,depth=200){
 const t=Math.max(0,Math.min(1,(depth-.2)/2.8)),fade=t*t*(3-2*t);
 let height=0,dx=0,dz=0;
 for(const w of MOSA_OCEAN_PROFILE.swells){const phase=x*w.x+z*w.z-seconds*w.omega;height+=Math.sin(phase)*w.amplitude;const slope=Math.cos(phase)*w.amplitude;dx+=slope*w.x;dz+=slope*w.z;}
 return {height:height*fade,dx:dx*fade,dz:dz*fade};
}
