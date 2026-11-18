import{test}from'node:test';import assert from'node:assert/strict';
import{createResortMassagePavilion}from'../public/resort-spa-massage.js';
import{resortZone}from'../public/resort-spa-data.js';
import{manualBuildingSupport}from'../public/manual-building-navigation.js';
test('all six actual massage cabins keep full-body door routes, solid tables, walls and separate staff contacts',()=>{
 const z=resortZone('resort-massage'),root=createResortMassagePavilion(z),nav=root.userData.navigation,r=.571;
 assert.equal(root.userData.contacts.length,6);
 for(const c of root.userData.contacts){
  let from={x:c.x,y:.01,z:c.z+6};
  for(let d=6;d>=2.5;d-=.08){const p={x:c.x,y:from.y,z:c.z+d};const support=manualBuildingSupport(nav,p,r,{ground:.01,from});assert.ok(support,'whole body must pass real door, cabinet '+c.cabinet);from={...p,y:support.y};}
  assert.equal(manualBuildingSupport(nav,{x:c.x,y:.01,z:c.z},r,{ground:.01}),null,'table remains solid');
  assert.ok(manualBuildingSupport(nav,{...c.staff,y:.01},r,{ground:.01}),'staff does not intersect table/wall');
  assert.equal(manualBuildingSupport(nav,{x:c.x+3.7,y:.01,z:c.z},r,{ground:.01}),null,'side wall retained');
 }
 root.userData.dispose();
});
