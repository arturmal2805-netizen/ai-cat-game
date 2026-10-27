// Twenty signatures layered onto measured speed/acceleration/turn choreography.
// Only the approved rig's reaction parameters change; seats/meshes never do.
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export function atollRideReaction(spec, lane, time, out, reduced) {
  out.rideSit=0;
  if(reduced || !out.ride || !out.weight)return out;
  const leg=lane.legs.find(l=>time>=l.start&&time<=l.start+l.duration);
  if(!leg || !["ride","vortex","drain"].includes(leg.phase))return out;
  const u=clamp((time-leg.start)/leg.duration), gate=Math.sin(u*Math.PI)**2*out.weight,
    pulse=Math.sin(time*(2.2+spec.referenceCell.index*.09)),
    up=clamp(out.height/spec.height);
  const settle=clamp(Math.min(time-leg.start,leg.start+leg.duration-time)/.65);
  out.rideSit=out.weight*settle*settle*(3-2*settle);
  switch(spec.kind) {
    case "giant-wave": out.frontLift+=gate*.22;out.paw+=gate*.28;out.surprise+=gate*up*.48;break;
    case "rock-arch": out.headYaw+=gate*.18*Math.sin(u*Math.PI*2);out.earRelax+=gate*.1;break;
    case "rainbow-race": out.headYaw+=gate*(lane.geometry[0].laneColor%2?1:-1)*.15;out.grip+=gate*.22;out.tailSway+=pulse*gate*.1;break;
    case "sky-serpent": out.headRoll+=gate*turn(out)*.12;out.pawSpread+=gate*.13;break;
    case "blue-whirlpool": out.grip+=gate*.3;out.bodyLean+=gate*turn(out)*.08;out.surprise+=gate*.28;break;
    case "double-serpent": out.headYaw+=gate*(lane.geometry[0].laneColor?-.2:.2);out.tailSway+=gate*pulse*.12;break;
    case "waterfall-cascade": out.frontLift+=gate*.2;out.paw+=gate*.25;out.eyeClose+=gate*(1-u)*.2;break;
    case "emerald-canyon": out.headYaw+=gate*pulse*.15;out.bodyLean+=gate*turn(out)*.07;break;
    case "crystal-cavern": out.headPitch-=gate*.12;out.surprise+=gate*.4;out.paw+=gate*.1;break;
    case "root-valley": out.headYaw+=gate*pulse*.23;out.headPitch-=gate*.08;out.earRelax+=gate*.13;break;
    case "blue-halfpipe": out.frontLift+=gate*up*.35;out.hindTuck+=gate*up*.22;out.surprise+=gate*up*.6;out.grip+=gate*(1-up)*.3;break;
    case "lagoon-loop": out.paw+=gate*.4;out.pawSpread+=gate*.16;out.surprise+=gate*.55;break;
    case "coral-arch": out.headYaw+=gate*Math.sin(u*Math.PI*3)*.19;out.earRelax+=gate*.16;break;
    case "cloud-islets": out.headPitch+=gate*.16;out.surprise+=gate*up*.35;out.frontLift+=gate*.12;break;
    case "flower-lagoon": out.tailSway+=gate*pulse*.22;out.paw+=gate*.2;out.headRoll+=gate*pulse*.08;break;
    case "red-canyon": out.crouch+=gate*.045;out.grip+=gate*.28;out.tailTrail-=gate*.16;break;
    case "abyss-bridge": out.surprise+=gate*.5;out.frontLift+=gate*(1-u)*.23;out.grip+=gate*u*.32;break;
    case "green-valley": out.eyeClose+=gate*.2;out.earRelax+=gate*.2;out.headYaw+=gate*pulse*.12;break;
    case "purple-vortex": out.headRoll+=gate*pulse*.12;out.grip+=gate*.3;out.pawSpread+=gate*.14;break;
    case "mega-loops": out.frontLift+=gate*.25;out.paw+=gate*.35;out.hindTuck+=gate*.17;out.surprise+=gate*.65;out.tailSway+=gate*pulse*.2;break;
  }
  out.surprise=clamp(out.surprise);out.grip=clamp(out.grip);out.paw=clamp(out.paw);out.eyeClose=clamp(out.eyeClose,0,.98);
  return out;
}
const turn=out=>clamp(out.turnForce,-1,1);
// Runtime-only joint pose. Keep this outside the sculpt producers so new ride
// animation never invalidates the approved persistent cat geometry cache.
export function applyAtollSit(cat,reaction,reduced=false){
  const sit=reduced?0:clamp(reaction?.rideSit||0),d=cat.userData;if(!sit)return;
  d.body.position.y-=sit*.17;d.chest.position.y-=sit*.18;d.head.position.y-=sit*.18;
  for(const [i,leg] of d.legs.entries()){
    leg.rotation.x+=sit*(leg.position.z>0?-.52:.92);leg.position.y-=sit*.12;
    const joint=d.legJoints?.[i];if(joint){joint.knee.rotation.x+=sit*.2;joint.ankle.rotation.x-=sit*.14;}
  }
}
