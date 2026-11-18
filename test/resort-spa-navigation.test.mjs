import{test}from'node:test';import assert from'node:assert/strict';import{resortSpaModelSteps}from'../public/resort-spa-model.js';import{createResortSpaNavigation}from'../public/resort-spa-navigation.js';
function candidate(){const it=resortSpaModelSteps();let s;do{s=it.next();}while(!s.done);return s.value;}
test('actual resort supports dry reception while open thermal water is not an invisible floor',()=>{const root=candidate(),nav=createResortSpaNavigation(root);assert(nav.support({x:0,y:.18,z:181}));assert.equal(nav.support({x:0,y:.18,z:266}),null);assert.equal(nav.segmentClear({x:0,y:.18,z:242},{x:0,y:.18,z:266}),false);root.userData.dispose();});

test('translated live island retains ocean-local support and holes',()=>{const root=candidate();root.position.x=1320;root.position.z=-870;root.updateWorldMatrix(true,true);const nav=createResortSpaNavigation(root);assert(nav.support({x:0,y:.18,z:181}));assert.equal(nav.support({x:0,y:.18,z:266}),null);root.userData.dispose();});
