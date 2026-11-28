// Ordinary manual-control jump. Venue transports retain their own physics.
// Absolute height integrates real gravity at fixed60Hz, independent of camera.
export function createChichiGroundJump({launchSpeed=6,gravity=9.81}={}){
  let airborne=false,y=0,vy=0,held=false,pending=false,accumulator=0,landing=0,launches=0;
  return {
    request(){if(!airborne)pending=true;},
    cancelPending(){pending=false;held=false;},
    reset(){airborne=false;vy=0;held=false;pending=false;accumulator=0;landing=0;},
    advance(dt,ground,jump=false){
      if(!Number.isFinite(ground)||!Number.isFinite(dt)||dt<0)return {y:ground,airborne,landing};
      const rising=jump&&!held;held=jump;
      if(!airborne&&(pending||rising)){airborne=true;y=ground;vy=launchSpeed;pending=false;launches++;}
      if(!airborne)y=ground;
      accumulator+=Math.min(.1,dt);
      let n=0;
      while(accumulator+1e-10>=1/60&&n++<6){
        accumulator-=1/60;landing*=Math.exp(-12/60);
        if(!airborne)continue;
        y+=vy/60-.5*gravity/(60*60);vy-=gravity/60;
        if(y<=ground&&vy<=0){y=ground;landing=Math.abs(vy);vy=0;airborne=false;}
      }
      return {y,airborne,landing,velocity:vy};
    },
    get airborne(){return airborne;},
    get diagnostics(){return {airborne,y,velocity:vy,launches,fixedStep:1/60,gravity};},
  };
}
