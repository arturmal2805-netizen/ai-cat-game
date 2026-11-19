import {resortDryPerformance} from './resort-spa-dry-performance.js';
// Distinct movements on the approved native joints, blended across the real
// water entry/exit stages. No alternative cat geometry or independent timer.
const smooth=x=>{const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t);};
export function resortPoolPerformance(phase,time,kind='swim'){
 const base={ride:true,earRelax:.1,tailSway:Math.sin(time*.8)*.04};
 if(phase==='inspect')return{action:'test-water',reaction:{...base,headPitch:.24,waterGesture:true,waterLeftPaw:Math.sin(Math.min(1,time/1.2)*Math.PI)*.44,waterLeftCurl:.2}};
 if(phase==='wet-enter')return{action:'careful-stairs',reaction:{...base,headPitch:.2,bodyPitch:.03}};
 if(phase==='wet-exit')return{action:'climb-out',reaction:{...base,headPitch:-.12,earRelax:.03}};
 if(phase==='wet-shake'){const fade=Math.sin(Math.min(1,time/2)*Math.PI);return{action:'shake-fur',reaction:{...base,headRoll:Math.sin(time*19)*fade*.13,bodyLean:Math.sin(time*19+1)*fade*.1,tailSway:Math.sin(time*15)*fade*.16}};}
 if(['wet-swim','wet-return','wet-float','wet-land'].includes(phase))return{action:'paddle',reaction:{...base,headPitch:-.07,waterProne:.18},locomotion:{mode:'swim',speed:1.5,phase:time*3.2}};
 if(phase==='procedure'){
  if(kind==='eat')return resortDryPerformance('cafe',phase,time);
  const blend=smooth(time/1.4)*smooth((24-time)/1.4);
  if(kind==='swim'){const rest=time>10&&time<15,play=time>17&&time<21;return{action:play?'water-play':rest?'float-rest':'gentle-swim',reaction:{...base,eyeClose:rest?.55:0,headPitch:play?.12:-.04,waterGesture:play,waterLeftPaw:play?Math.max(0,Math.sin((time-17)*2))*.42:0,waterLeftSweep:play?Math.sin(time)*.12:0,waterProne:.18*blend},locomotion:{mode:'swim',speed:rest?.25:1.1,phase:time*2.8}};}
  if(kind==='vip'){const gaze=time>4&&time<11;return{action:gaze?'star-gaze':'private-float',reaction:{...base,rideSit:blend*.35,eyeClose:blend*(gaze?.08:.72),headPitch:gaze?-.21*blend:.08*blend,headYaw:gaze?Math.sin((time-4)*.35)*.18:0,earRelax:blend*.23,tailSway:Math.sin(time*.45)*blend*.04}};}
  const bubble=time>6&&time<10,look=time>14&&time<19;return{action:bubble?'bubble-surprise':look?'ocean-gaze':'warm-soak',reaction:{...base,rideSit:blend*.65,eyeClose:blend*(bubble?.08:.55),surprise:bubble?Math.sin((time-6)*Math.PI/4)*.13:0,headYaw:look?Math.sin((time-14)*.65)*.22:0,waterGesture:bubble,waterRightPaw:bubble?Math.max(0,Math.sin((time-6)*2.5))*.3:0,earRelax:blend*.2}};
 }
 return{action:phase,reaction:base};
}
