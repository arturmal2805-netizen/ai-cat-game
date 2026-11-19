import test from 'node:test';import assert from 'node:assert/strict';
import {resortPalaceRecovery,resolvePalaceRecovery,spaPalaceCommonHall} from '../public/resort-spa-layout-recovery.js';
import {SPA_V6_ROOMS,SPA_PALACE as P} from '../public/resort-spa-layout-v7.js';
import {resortSpaModelSteps} from '../public/resort-spa-model.js';
import {createResortSpaNavigation} from '../public/resort-spa-navigation.js';
import {normalizeCatLocations,captureCatLocations,mergeCatLocations} from '../public/cat-locations.js';
import {newGame,loadGame,SAVE_KEY} from '../public/economy.js';import {byBiome} from '../public/game-data.js';
const now=Date.UTC(2026,10,19,12),saved=r=>({biome:'autumn',x:r.x,y:r.y+.012,z:r.z-20,yaw:.3,at:now});
test('legacy SPA floor positions redirect once; real divers, cabin seats, other islands and new layout remain untouched',()=>{
 const rooms=Object.fromEntries(SPA_V6_ROOMS.map(r=>[r.key,saved(r)])),game={unlocked:['autumn'],catLocations:{...rooms,diver:{...rooms.vip,y:-70},new:{...rooms.vip,spaLayout:7},other:{...rooms.vip,biome:'water'},cabin:{...rooms.vip,x:18.5,z:278.5,y:-82.75}},jobCity:{profiles:{amber:{mall:{goal:{storeId:'resort-amber'}}},jacuzzi:{mall:{goal:{storeId:'resort-jacuzzi'}}}}}};
 const copy=structuredClone(game),r=resortPalaceRecovery(game);assert.equal(r.get('amber').destination,'resort-midnight');assert.equal(r.get('jacuzzi').destination,'resort-vip');for(const key of ['nap','meditation','beauty','sauna'])assert(r.get(key).retired);for(const key of ['diver','new','other','cabin'])assert(!r.has(key));assert.deepEqual(game,copy);
 assert(!resortPalaceRecovery({...game,catLocations:{chichi:rooms.vip},mosasaurSubmarine:{explorer:{}}}).has('chichi'));
});
test('multiple legacy guests repair to disjoint full-body supported positions on actual palace geometry',()=>{
 let s,it=resortSpaModelSteps({layoutVersion:7});while(!(s=it.next()).done);const root=s.value;try{const nav=createResortSpaNavigation(root),catLocations=Object.fromEntries(SPA_V6_ROOMS.map(r=>[r.key,saved(r)])),game={unlocked:['autumn'],catLocations},records=resortPalaceRecovery(game),actors=[...records.keys()].map(id=>({id,radius:.571})),out=resolvePalaceRecovery(records,nav,actors);assert.equal(out.size,records.size);
 for(const[id,p]of out){if(records.get(id).retired)assert(spaPalaceCommonHall(p.x,p.z),'retired guests recover into the public hall');assert(nav.support({...p,y:p.y-P.baseY},.571),id);for(const[j,q]of out)if(id!==j&&Math.abs(p.y-q.y)<2)assert(Math.hypot(p.x-q.x,p.z-q.z)>1.142);}
 }finally{root.userData.dispose();}
});
test('SPA layout marker survives reload and ordinary timestamp merge without altering economy or marking unrelated locations',()=>{
 const g=newGame(now);g.unlocked.push('autumn');const b=byBiome('autumn'),a={id:'chichi',position:{x:b.center[0]-20,y:P.baseY+P.rise*2+.012,z:b.center[1]+210},yaw:.2,spaLayout:7};const current=captureCatLocations(g,g,[a],now);assert.equal(current.catLocations.chichi.spaLayout,7);assert.equal(current.coins,g.coins);assert.deepEqual(current.inventory,g.inventory);assert.deepEqual(current.jobCity,g.jobCity);
 const reload=loadGame({getItem:k=>k===SAVE_KEY?JSON.stringify(current):null},now,{advance:false});assert.equal(reload.catLocations.chichi.spaLayout,7);assert(!resortPalaceRecovery(reload).has('chichi'));assert.equal(captureCatLocations(current,current,[a],now+1),current);
 const stale={chichi:{...current.catLocations.chichi,spaLayout:undefined,at:now-1}};assert.equal(mergeCatLocations(current.catLocations,stale).chichi.spaLayout,7);
 const ordinary=captureCatLocations(current,current,[{...a,spaLayout:undefined,position:{x:0,y:.16,z:0}}],now+2);assert.equal(ordinary.catLocations.chichi.spaLayout,undefined);const malformed=normalizeCatLocations({chichi:{...ordinary.catLocations.chichi,spaLayout:7}},ordinary,now+2);assert.equal(malformed.chichi.spaLayout,undefined);
});
