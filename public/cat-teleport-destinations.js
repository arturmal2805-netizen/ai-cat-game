// Candidates are centred on REAL authored entry/interaction points. Each owner
// must validate them against its actual navigation surface before committing.
export function catArrivalCandidates(point,radius=.6,maxRadius=8){
  const out=[{...point}],step=Math.max(1.5,radius*2+.3);
  for(let r=step;r<=maxRadius;r+=step){const n=Math.ceil(2*Math.PI*r/step);for(let i=0;i<n;i++){const a=i/n*Math.PI*2;out.push({x:point.x+Math.cos(a)*r,y:point.y,z:point.z+Math.sin(a)*r});}}
  return out;
}
export function catTeleportDestination({destinationId,displayName=destinationId,worldId='autumn',zoneId=destinationId,targetType,portalTheme='default',arrivalAnimation='portal-hop',arrivalRotation=0,arrivalPoint=null,arrivalPoints,checkArrival,prepare,requiredConditions,fallbackPoint=null}){
  if(!destinationId||!targetType||typeof checkArrival!=='function')throw Error('Destination must retain a real ID, owner and physical arrival validator');
  return{destinationId,displayName,worldId,zoneId,targetType,portalTheme,arrivalAnimation,arrivalRotation,arrivalPoint,arrivalPoints,checkArrival,prepare,requiredConditions,fallbackPoint,interactionTarget:zoneId,occupancyRules:{separation:'native radius + native radius + 0.2m',reserveBeforeOpening:true}};
}
