// Runtime-only pose; the approved cat mesh, anatomy, cache and joint identities
// remain intact. animateCat resets these native joints before each application.
export function applyExplorerLocomotion(cat,frame,reduced=false){
 if(!frame||reduced||frame.mode==='walk'&&frame.speed<=0)return;
 const d=cat.userData,swim=frame.mode==='swim',weight=Math.min(1,frame.speed/(swim?8:5)),phase=frame.phase;
 if(swim){d.body.rotation.x-=.08;d.chest.position.y-=.12;d.head.position.y-=.08;}
 for(const [i,leg]of d.legs.entries()){
  const offset=leg.position.x*leg.position.z>0?Math.PI:0,wave=Math.sin(phase+offset),lift=Math.max(0,wave)*weight;
  leg.rotation.x+=wave*weight*(swim?.5:d.build.stride);
  leg.position.y+=lift*(swim?.06:d.build.bounce);
  const joints=d.legJoints?.[i];if(joints){const bend=lift*(leg.position.z>0?.66:-.54);joints.knee.rotation.x+=bend;joints.ankle.rotation.x-=bend*.55;}
 }
 if(!swim)cat.position.y+=Math.sin(phase*2)*(d.build.bounce||0)*weight;
}
