import {mosaBedY} from './mosasaur-data.js';
// Asymmetrical gardens keep the central approach open. Small eroded rocks use
// the original three cliff templates; the same transforms serve collisions.
export const MOSA_BENTHIC_GARDENS=Object.freeze([
 [-82,141],[-91,171],[-119,184],[-133,213],[-153,161],[-153,218],[-178,132],[-172,192],
 [81,151],[104,174],[116,207],[142,193],[156,146],[163,215],[181,168],[93,219],
].map(([x,z],i)=>Object.freeze({x,z,radius:6+i%4*1.7})));
export const MOSA_BENTHIC_ROCKS=Object.freeze(MOSA_BENTHIC_GARDENS.flatMap((g,i)=>Array.from({length:4},(_,j)=>{
 const a=i*1.7+j*2.399,r=1.2+j*1.4,x=g.x+Math.sin(a)*r,z=g.z+Math.cos(a)*r,radius=1.25+(i+j)%4*.35,height=1.7+(i*3+j)%5*.48,base=mosaBedY(x,z)-.35;
 return Object.freeze({id:'benthic-rock-'+i+'-'+j,x,z,base,top:base+height,radius,kind:(i+j)%3,scaleXZ:radius/10,scaleY:height/40,yaw:a});
})));
