import {MALL_LAYOUT as L} from './mall-layout.js';
export const MALL_AIRLOCK=Object.freeze({x:-43,z:114.5,w:8,d:8,h:7.25,y:L.y,floor:1,
  outside:Object.freeze({x:-43,y:L.y+2.5,z:123.8}),inside:Object.freeze({x:-43,y:L.y+.18,z:105})});
const mix=(a,b,t)=>a+(b-a)*t;
export function createMallAirlockTransit(entering,start=null){
  const a=MALL_AIRLOCK,chamber={x:a.x,y:a.y+.18,z:a.z},wet={...chamber,y:a.outside.y};
  const stages=entering?[
    [1.2,1,0,1,a.outside],[2.4,1,0,1,wet],[1.2,0,0,1,wet],[2.4,0,0,0,chamber],[1.2,0,1,0,chamber],[2.8,0,1,0,a.inside],[1.2,0,0,0,a.inside],
  ]:[
    [1.2,0,1,0,a.inside],[2.8,0,1,0,chamber],[1.2,0,0,0,chamber],[2.4,0,0,1,wet],[1.2,1,0,1,wet],[2.4,1,0,1,a.outside],[1.2,0,0,1,a.outside],
  ];
  let index=0,elapsed=0,from={outer:0,inner:0,water:entering?1:0,position:{...(start||(entering?a.outside:a.inside))}};
  const frame={...from,position:{...from.position},done:false,entering};
  return {frame,step(dt){
    if(frame.done)return frame;
    elapsed+=Math.max(0,dt);
    while(index<stages.length&&elapsed>=stages[index][0]){
      const [duration,outer,inner,water,position]=stages[index++];elapsed-=duration;from={outer,inner,water,position};
    }
    if(index===stages.length){Object.assign(frame,from,{position:{...from.position},done:true});return frame;}
    const [duration,outer,inner,water,position]=stages[index],u=elapsed/duration,t=u*u*(3-2*u);
    for(const key of ['outer','inner','water'])frame[key]=mix(from[key],{outer,inner,water}[key],t);
    for(const key of ['x','y','z'])frame.position[key]=mix(from.position[key],position[key],t);
    return frame;
  }};
}
