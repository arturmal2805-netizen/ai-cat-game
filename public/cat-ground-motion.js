import {outsideMegaPlots} from './mega-ride-data.js';
// Ordinary walking keeps its authored easing near a goal, but a distant saved
// position must not turn that easing into an unlimited sprint. A newly placed
// complex can cover an idle cat: let it walk out instead of snapping to a shore.
export function stepCatGround(x,z,targetX,targetZ,dt,plots,biome,radius,out={}){
  const limit=3.5*Math.max(0,Math.min(.1,dt)),dx=targetX-x,dz=targetZ-z,
    length=Math.hypot(dx,dz),blend=length?Math.min(dt*.8,limit/length):0;
  let nx=x+dx*blend,nz=z+dz*blend;
  outsideMegaPlots(x,z,plots,biome,radius,out);
  const escapeX=out.x-x,escapeZ=out.z-z,escape=Math.hypot(escapeX,escapeZ);
  if(escape>1e-8){
    const fraction=Math.min(1,limit/escape);
    out.x=x+escapeX*fraction;out.z=z+escapeZ*fraction;return out;
  }
  // Sweep the proposed step, including corner crossings. Once a cat is outside
  // a plot it cannot enter its pool/supports; scripted riders use their routes.
  let stop=1;
  const sx=nx-x,sz=nz-z;
  for(const p of plots){
    if(p.biome!==biome)continue;
    const hx=p.w/2+radius+.08,hz=p.d/2+radius+.08;
    const lowX=p.x-hx,highX=p.x+hx,lowZ=p.z-hz,highZ=p.z+hz;
    if(Math.max(x,nx)<=lowX||Math.min(x,nx)>=highX||
      Math.max(z,nz)<=lowZ||Math.min(z,nz)>=highZ)continue;
    const tx1=Math.abs(sx)<1e-12?-Infinity:(lowX-x)/sx,
      tx2=Math.abs(sx)<1e-12?Infinity:(highX-x)/sx,
      tz1=Math.abs(sz)<1e-12?-Infinity:(lowZ-z)/sz,
      tz2=Math.abs(sz)<1e-12?Infinity:(highZ-z)/sz,
      enter=Math.max(0,Math.min(tx1,tx2),Math.min(tz1,tz2)),
      exit=Math.min(1,Math.max(tx1,tx2),Math.max(tz1,tz2));
    if(enter<exit&&exit>1e-8&&enter<stop)stop=Math.max(0,enter-1e-7);
  }
  out.x=x+sx*stop;out.z=z+sz*stop;return out;
}
