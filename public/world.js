import * as THREE from 'three';
import {createCat,animateCat,moodNames} from './cat-model.js';
export const destinations={home:[-5,-3],pond:[4,1],garden:[-4,3],tree:[4,-4],picnic:[.5,3.5]};
export function createWorld(container){
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.setClearColor(0xeaf0dc);container.prepend(renderer.domElement);renderer.domElement.setAttribute('aria-label','Трёхмерный сад Чичи');
 const scene=new THREE.Scene();scene.fog=new THREE.Fog(0xeaf0dc,28,50);const camera=new THREE.PerspectiveCamera(38,1,.1,100);camera.position.set(15,15,19);camera.lookAt(0,0,0);
 scene.add(new THREE.HemisphereLight(0xfff7e6,0x8caa78,2.5));const sun=new THREE.DirectionalLight(0xfff2db,3);sun.position.set(-8,14,7);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-12;sun.shadow.camera.right=12;sun.shadow.camera.top=12;sun.shadow.camera.bottom=-12;scene.add(sun);
 const materials=new Map();const mat=color=>{if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.85}));return materials.get(color);};
 function mesh(geometry,color,x,y,z,parent=scene){const obj=new THREE.Mesh(geometry,mat(color));obj.position.set(x,y,z);obj.castShadow=true;obj.receiveShadow=true;parent.add(obj);return obj;}
 const land=mesh(new THREE.CylinderGeometry(8.8,8.3,.7,64),0xc2d49a,0,-.4,0);mesh(new THREE.CylinderGeometry(8.3,8.1,.8,64),0xb3a582,0,-1.05,0);
 mesh(new THREE.CylinderGeometry(2.5,2.5,.06,40),0xe9d9b3,0,0,0);
 for(const [x,z] of Object.values(destinations)){const path=mesh(new THREE.BoxGeometry(.85,.05,Math.hypot(x,z)),0xe9d9b3,x/2,.01,z/2);path.rotation.y=Math.atan2(x,z);}
 const house=new THREE.Group();house.position.set(-5,0,-3);scene.add(house);mesh(new THREE.BoxGeometry(2,1.7,1.7),0xf3d5b0,0,.85,0,house);const roof=mesh(new THREE.ConeGeometry(1.75,1,4),0xcb8062,0,2.15,0,house);roof.rotation.y=Math.PI/4;mesh(new THREE.BoxGeometry(.65,.9,.06),0x8b7463,0,.48,.88,house);mesh(new THREE.BoxGeometry(.45,.45,.08),0xffe9a6,-.6,1.15,.9,house);
 function tree(x,z,size=1){mesh(new THREE.CylinderGeometry(.16*size,.25*size,1.8*size,8),0x967654,x,.9*size,z);for(const [dx,dy,dz] of [[0,2.1,0],[-.5,1.8,.1],[.5,1.9,-.2]])mesh(new THREE.SphereGeometry(.85*size,12,8),0x7da47b,x+dx*size,dy*size,z+dz*size);}
 tree(4,-4,1.35);tree(-6,1,.7);tree(1,-6,.8);tree(6,-1,.7);
 const pond=mesh(new THREE.CylinderGeometry(1.7,1.7,.06,40),0x9fc5bd,4,.06,1);pond.scale.z=.75;
 for(let i=0;i<5;i++){const x=4+Math.cos(i*1.8)*1.7,z=1+Math.sin(i*1.8)*1.3;mesh(new THREE.SphereGeometry(.28,8,6),0xe3decc,x,.13,z).scale.y=.5;}
 function flower(x,z,color){mesh(new THREE.CylinderGeometry(.025,.025,.32,5),0x7c9966,x,.18,z);mesh(new THREE.SphereGeometry(.12,8,6),color,x,.4,z);}
 for(let i=0;i<22;i++){const x=-4+(i%5)*.35-.7,z=3+Math.floor(i/5)*.28-.5;flower(x,z,[0xf1b5c4,0xffdc8c,0xcbace4][i%3]);}
 const blanket=mesh(new THREE.BoxGeometry(1.5,.04,1.1),0xe5a394,.5,.08,3.5);mesh(new THREE.CylinderGeometry(.35,.45,.2,24),0xede4d2,.5,.21,3.5);mesh(new THREE.SphereGeometry(.16,12,8),0xc78150,.5,.36,3.5);
 // Seeded arrangement keeps the garden consistent across reloads.
 for(let i=0;i<30;i++){const a=i*2.399,r=5.5+(i%3)*.65,x=Math.cos(a)*r,z=Math.sin(a)*r;if(i%4===0)flower(x,z,0xfff0a3);else mesh(new THREE.SphereGeometry(.12,7,5),0x9eb879,x,.07,z).scale.y=.5;}
 let cat=createCat('happy');const carrier=new THREE.Group();carrier.position.set(-5,0,-2);carrier.add(cat);scene.add(carrier);
 let from=carrier.position.clone(),target=from.clone(),started=0,moving=false;
 function decide(decision){carrier.remove(cat);cat.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});cat=createCat(decision.mood);carrier.add(cat);from=carrier.position.clone();const [x,z]=destinations[decision.target];target=new THREE.Vector3(x,0,z+1);started=performance.now();moving=true;}
 const resize=new ResizeObserver(()=>{const {width,height}=container.getBoundingClientRect();renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();});resize.observe(container);
 let pointerDown=false,lastX=0,angle=0;renderer.domElement.addEventListener('pointerdown',e=>{pointerDown=true;lastX=e.clientX;renderer.domElement.setPointerCapture(e.pointerId);});renderer.domElement.addEventListener('pointerup',()=>pointerDown=false);renderer.domElement.addEventListener('pointercancel',()=>pointerDown=false);renderer.domElement.addEventListener('pointermove',e=>{if(!pointerDown)return;angle+=(e.clientX-lastX)*.006;lastX=e.clientX;camera.position.set(Math.sin(angle+.67)*24,15,Math.cos(angle+.67)*24);camera.lookAt(0,0,0);});
 function loop(now){if(moving){const fraction=reduced?1:Math.min((now-started)/2600,1);carrier.position.lerpVectors(from,target,fraction*fraction*(3-2*fraction));const direction=target.clone().sub(from);if(direction.length()>.01)carrier.rotation.y=Math.atan2(direction.x,direction.z);if(fraction===1)moving=false;}animateCat(cat,now/1000,moving,reduced);renderer.render(scene,camera);requestAnimationFrame(loop);}requestAnimationFrame(loop);
 // Each mood gets a separate rendered portrait of the same 3D model.
 const portraitRenderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});portraitRenderer.setSize(256,256);portraitRenderer.setPixelRatio(1);
 for(const mood of moodNames){const portrait=new THREE.Scene();portrait.add(new THREE.HemisphereLight(0xfff4e2,0xb29b83,3));const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(3,5,5);portrait.add(light);const model=createCat(mood);portrait.add(model);const view=new THREE.PerspectiveCamera(35,1,.1,20);view.position.set(2,2.2,4);view.lookAt(0,.9,0);portraitRenderer.render(portrait,view);document.querySelector(`[data-mood-image="${mood}"]`).src=portraitRenderer.domElement.toDataURL('image/png');model.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});}
 portraitRenderer.dispose();
 return {decide};
}
