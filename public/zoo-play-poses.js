// Two interaction clips for the gorilla, baked alongside the unchanged five
// ambient actions. Other species retain their released 400-row pose assets.
export {GORILLA_SWING_REVISION as GORILLA_PLAY_REVISION} from './zoo-gorilla-swing.js';
export const GORILLA_WALK_FIRST=400,GORILLA_HOLD_FIRST=448,GORILLA_PLAY_FRAMES=48;
export const zooModelFrames=species=>species==='gorilla'?496:400;
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
export function gorillaPickupPose(progress){
 const p=Math.max(0,Math.min(1,progress)),a=smooth(p/.65),b=smooth((p-.65)/.35);
 return {bodyPitch:.55*a*(1-b),armPitch:p<=.65?-.75*a:-.75-.45*b,reach:.25*a*(1-b)};
}
export function zooInteractionPose(species,frame,role){
 if(species!=='gorilla'||frame<400)return null;
 const hold=frame>=448,u=(frame-(hold?448:400))/47,p={x:0,y:0,z:0,rx:0,ry:0,rz:0,sx:1,sy:1,sz:1},left=role.includes('Left');
 if(!hold){const a=u*Math.PI*2;
  if(role==='body')p.y=Math.sin(a)**2*.025;
  if(role==='head')p.rx=Math.sin(a)*.025;
  if(role.startsWith('Arm'))p.rx=Math.sin(a+(left?0:Math.PI))*.22;
  if(role.startsWith('Elbow'))p.rx=-Math.max(0,Math.sin(a+(left?0:Math.PI)))*.12;
  if(role.startsWith('LegBack'))p.rx=Math.sin(a+(left?Math.PI:0))*.17;
 }else{
  const progress=u<.3?u/.3:u>.7?(1-u)/.3:1,pose=gorillaPickupPose(progress);
  if(role==='body')p.rx=pose.bodyPitch;
  if(role==='head')p.rx=-pose.bodyPitch*.65;
  if(role.startsWith('Arm'))p.rx=pose.armPitch;
 }
 if(role.startsWith('lid'))p.sx=p.sy=p.sz=.001;
 return p;
}
