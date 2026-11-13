// Layer over the approved native rig after its ordinary sitting pose. The
// serving is anchored to the actual articulated ankle, never to screen space.
export function applyMallIcePose(cat,reaction,reduced=false){
  if(!reaction?.iceHolding)return;
  const d=cat.userData,lick=reduced?0:reaction.iceLick||0;
  // Native reduced animation sleeps after its first static pose. Mark this
  // owned activity overlay dirty so the next ordinary pose also resets it.
  if(d.lastTime===null)d.lastTime=0;
  for(const [i,leg]of d.legs.entries())if(leg.position.z>0&&leg.position.x>0){
    leg.position.y=d.head.position.y-.48;leg.rotation.x=-1.7+lick*.06;leg.rotation.z=-.06;
    const j=d.legJoints?.[i];if(j){j.knee.rotation.x=.7;j.ankle.rotation.x=.1;}
  }
  if(!lick)return;
  d.jaw.rotation.x+=lick*.055;d.jaw.position.y-=lick*.018;d.mouth.scale.y+=lick*.035;
  d.tongue.visible=true;d.tongue.position.z+=lick*.10;
}
