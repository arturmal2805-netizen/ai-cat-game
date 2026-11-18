import {test} from 'node:test';import assert from 'node:assert/strict';import {resortSpaModelSteps} from '../public/resort-spa-model.js';import {createResortSpaNavigation} from '../public/resort-spa-navigation.js';
test('third-person camera respects actual pressure glass, floors and closed aquarium while the real rear atrium opening stays open',()=>{const it=resortSpaModelSteps();let s;do{s=it.next();}while(!s.done);const root=s.value,nav=createResortSpaNavigation(root);assert.equal(nav.cameraClear({x:34,y:1.3,z:203},{x:38,y:1.3,z:203}),false);assert.equal(nav.cameraClear({x:15,y:10.3,z:203},{x:15,y:7,z:203}),false);assert.equal(nav.cameraClear({x:15,y:7,z:203},{x:15,y:10.3,z:203}),false);
 // The new physical tank cap occupies the centre; an open tank is not an
 // atrium passage. The actual service-bar floor leaves a separate rear void.
 for(const [a,b]of [[10.3,7],[7,10.3]]){assert.equal(nav.cameraClear({x:0,y:a,z:203},{x:0,y:b,z:203}),false,'sealed tank cap');assert.equal(nav.cameraClear({x:0,y:a,z:194},{x:0,y:b,z:194}),true,'real rear atrium opening');}
 root.userData.dispose();});
