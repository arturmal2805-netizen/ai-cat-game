const smooth=x=>{const t=Math.min(1,Math.max(0,x));return t*t*(3-2*t);};
// Per-room choreography; values affect the original native rig only. Smooth
// crossfades keep a blink, paw touch or stretch from snapping between phases.
const sequence={
 massage:[['settle-prone',4,{waterProne:.8,eyeClose:.5}],['back-massage',6,{waterProne:.9,eyeClose:.88,earRelax:.18}],['shoulder-massage',6,{waterProne:.9,eyeClose:.8,headRoll:.08}],['paw-massage',4,{waterProne:.75,waterGesture:1,waterLeftPaw:.12}],['after-massage-stretch',4,{waterProne:.25,frontLift:.14,headPitch:-.1}]],
 aroma:[['smell-flowers',6,{rideSit:.55,headPitch:.19,headYaw:.12}],['slow-inhale',8,{rideSit:.65,eyeClose:.5,earRelax:.2}],['aroma-rest',6,{rideSit:.7,eyeClose:.8}],['gentle-stretch',4,{frontLift:.13,headPitch:-.12}]],
 sauna:[['settle-on-bench',4,{rideSit:.65}],['warm-breathing',10,{rideSit:.85,eyeClose:.65,earRelax:.2}],['follow-steam',6,{rideSit:.8,headPitch:-.13,headYaw:.16}],['ready-to-cool',4,{rideSit:.4,eyeClose:.15,frontLift:.08}]],
 cabana:[['ocean-window',5,{headYaw:.23,headPitch:-.06}],['nestle-in-cushion',5,{waterProne:.65,eyeClose:.55}],['cabana-nap',9,{waterProne:.85,eyeClose:.95,earRelax:.17}],['wake-and-stretch',5,{frontLift:.15,waterProne:.25,headPitch:-.12}]],
 beauty:[['salon-settle',4,{rideSit:.6}],['fur-care',6,{rideSit:.75,eyeClose:.65,headRoll:.08}],['paw-care',6,{rideSit:.75,waterGesture:1,waterRightPaw:.25,waterRightCurl:.2}],['mirror-check',5,{rideSit:.7,headYaw:-.24,eyeClose:.05}],['pleased-head-turn',3,{rideSit:.6,headYaw:.24,earRelax:.1}]],
 meditation:[['settle-on-mat',4,{rideSit:.8}],['meditation-breath',12,{rideSit:.85,eyeClose:.85,earRelax:.15}],['jellyfish-gaze',5,{rideSit:.8,headPitch:-.15,headYaw:.16}],['meditation-stretch',3,{frontLift:.1,headPitch:-.1}]],
 nap:[['curl-on-bed',4,{waterProne:.7,headRoll:.1}],['soft-nap',12,{waterProne:.9,eyeClose:.96,earRelax:.18}],['dreamy-ear-twitch',3,{waterProne:.9,eyeClose:.94,earRelax:.27}],['wake-on-bed',5,{waterProne:.4,eyeClose:.15,frontLift:.14}]],
 cafe:[['table-settle',4,{rideSit:.65}],['drink',5,{rideSit:.7,headPitch:.23,waterGesture:1,waterLeftPaw:.2}],['lick-lips',3,{rideSit:.7,headPitch:.1}],['taste-treat',5,{rideSit:.65,headPitch:.22}],['satisfied-chew',4,{rideSit:.7,eyeClose:.55}],['contented-look',3,{rideSit:.55,headYaw:.14,earRelax:.13}]],
 waterfall:[['listen-to-water',5,{rideSit:.55,headYaw:.14}],['cascade-gaze',7,{rideSit:.6,headPitch:-.18}],['garden-rest',8,{rideSit:.7,eyeClose:.7,earRelax:.16}],['garden-stretch',4,{frontLift:.11,headPitch:-.09}]],
 amber:[['amber-recline',4,{waterProne:.65}],['warm-star-gaze',7,{waterProne:.4,headPitch:-.19,headYaw:.1}],['amber-doze',8,{waterProne:.8,eyeClose:.85,earRelax:.17}],['amber-stretch',5,{waterProne:.2,frontLift:.13,headPitch:-.12}]],
 midnight:[['night-curl',4,{waterProne:.8,headRoll:.11}],['deep-star-sleep',13,{waterProne:.95,eyeClose:.98,earRelax:.2}],['sleepy-ear-flick',3,{waterProne:.9,eyeClose:.96,earRelax:.29}],['quiet-awakening',4,{waterProne:.5,eyeClose:.3,headYaw:.08}]],
};
export const RESORT_DRY_CHOREOGRAPHY=Object.freeze(Object.fromEntries(Object.entries(sequence).map(([key,value])=>[key,Object.freeze(value)])));
export function resortDryPerformance(key,phase,time){
 const rows=sequence[key]||sequence.meditation;
 if(phase==='inspect')return{action:key==='massage'?'greet-therapist':'inspect-place',reaction:{ride:true,paw:Math.sin(Math.min(1,time/1.2)*Math.PI)*.23,headYaw:.1}};
 if(phase!=='procedure'&&phase!=='dismount')return{action:phase,reaction:{ride:true}};
 const t=phase==='dismount'?24-1e-9:Math.min(24-1e-9,Math.max(0,time));let start=0,index=rows.length-1;for(let i=0;i<rows.length;i++){if(t<start+rows[i][1]){index=i;break;}start+=rows[i][1];}
 const [action,duration,pose]=rows[index],prior=rows[Math.max(0,index-1)][2],cross=smooth((t-start)/.8),weight=phase==='dismount'?1-smooth(time/1.6):smooth(t/1.6),reaction={ride:true};
 for(const property of new Set([...Object.keys(prior),...Object.keys(pose)])){const a=prior[property]||0,b=pose[property]||0;reaction[property]=(a+(b-a)*cross)*weight;}
 const breathe=Math.sin(t*1.4);reaction.headPitch=(reaction.headPitch||0)+breathe*.012*weight;reaction.tailSway=Math.sin(t*.65)*.045*weight;
 if(key==='cafe'&&['lick-lips','taste-treat','satisfied-chew'].includes(action)){reaction.spaMouth=(.5+.5*Math.sin(t*5))*Math.sin(Math.PI*(t-start)/duration)*weight;reaction.spaLick=action==='lick-lips'?reaction.spaMouth:0;}
 if(action==='dreamy-ear-twitch'||action==='sleepy-ear-flick')reaction.earRelax+=Math.sin((t-start)*7)*Math.sin(Math.PI*(t-start)/duration)*.06*weight;
 return{action,reaction};
}
export function applyResortExpression(cat,reaction,reduced=false){if(reduced||!reaction?.spaMouth)return;const d=cat.userData;d.jaw.rotation.x+=reaction.spaMouth*.07;if(reaction.spaLick){d.tongue.visible=true;d.tongue.position.z+=reaction.spaLick*.025;}}
