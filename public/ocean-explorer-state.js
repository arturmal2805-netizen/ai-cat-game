import {oceanWaterContains} from './ocean-water-domain.js';
import {MALL_LAYOUT as L} from './mall-layout.js';

export function normalizeOceanExplorer(raw){
  if(raw==null)return null;
  if(!['swimming','mall'].includes(raw.mode)||!['x','y','z','yaw'].every(k=>Number.isFinite(raw[k]))||!oceanWaterContains(raw.x,raw.z,2)||raw.y< -198||raw.y>60)throw Error('Пошкоджене положення Чічі під водою');
  const floor=raw.mode==='mall'?raw.floor:0;
  if(raw.mode==='mall'&&(!Number.isInteger(floor)||floor<1||floor>7||Math.abs(raw.y-(L.y+(floor-1)*L.rise))>L.rise+2))throw Error('Пошкоджений поверх Чічі у ТРЦ');
  return {mode:raw.mode,x:raw.x,y:raw.y,z:raw.z,yaw:Math.atan2(Math.sin(raw.yaw),Math.cos(raw.yaw)),floor,returning:raw.returning===true};
}
