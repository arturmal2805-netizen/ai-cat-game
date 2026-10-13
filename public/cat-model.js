import * as THREE from 'three';
export const moodNames=['sleep','crazy hungry','happy'];
export function createCat(mood='happy'){
 const cat=new THREE.Group();cat.name='Chichi';
 const materials={fur:new THREE.MeshStandardMaterial({color:0xf2b479,roughness:.8}),cream:new THREE.MeshStandardMaterial({color:0xffe7bd,roughness:.8}),pink:new THREE.MeshStandardMaterial({color:0xf09e9f}),dark:new THREE.MeshStandardMaterial({color:0x43342c}),stripe:new THREE.MeshStandardMaterial({color:0xd18c56}),collar:new THREE.MeshStandardMaterial({color:0x688d82})};
 function ball(parent,name,material,pos,scale){const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),materials[material]);mesh.name=name;mesh.position.set(...pos);mesh.scale.set(...scale);mesh.castShadow=true;parent.add(mesh);return mesh;}
 const body=ball(cat,'Body','fur',[0,.85,0],[.54,.6,.8]);ball(cat,'Chest','cream',[0,.86,.61],[.4,.43,.2]);
 const head=new THREE.Group();head.name='Head';head.position.set(0,1.48,.52);cat.add(head);
 ball(head,'Face','fur',[0,0,0],[.61,.53,.5]);
 for(const side of [-1,1]){
  const ear=new THREE.Mesh(new THREE.ConeGeometry(.24,.5,3),materials.fur);ear.name=side<0?'LeftEar':'RightEar';ear.position.set(side*.4,.47,0);ear.rotation.z=side*-.22;ear.rotation.y=Math.PI;ear.castShadow=true;head.add(ear);
  const inner=new THREE.Mesh(new THREE.ConeGeometry(.13,.29,3),materials.pink);inner.position.set(side*.4,.48,.105);inner.rotation.copy(ear.rotation);head.add(inner);
  ball(head,'Cheek'+side,'cream',[side*.16,-.17,.43],[.21,.16,.1]);
  const eye=ball(head,'Eye'+side,'dark',[side*.235,.055,.452],[.067,.105,.032]);
  if(mood==='sleep'){eye.scale.set(.11,.016,.028);eye.rotation.z=side*.15;}
  if(mood==='crazy hungry'){eye.scale.set(.105,.13,.034);ball(head,'EyeShine'+side,'cream',[side*.235-.02,.085,.484],[.025,.033,.01]);}
  if(mood==='happy'){ball(head,'EyeShine'+side,'cream',[side*.235-.015,.085,.482],[.022,.026,.01]);ball(head,'Blush'+side,'pink',[side*.4,-.1,.39],[.07,.038,.017]);}
  for(let line=0;line<3;line++){const whisker=new THREE.Mesh(new THREE.CylinderGeometry(.009,.009,.28,6),materials.dark);whisker.position.set(side*.47,-.17+line*.065,.43);whisker.rotation.z=Math.PI/2+side*(line-1)*.13;head.add(whisker);}
 }
 ball(head,'Nose','pink',[0,-.13,.535],[.055,.043,.035]);
 ball(head,'Mouth','dark',[0,-.25,.48],mood==='crazy hungry'?[.085,.1,.02]:[.045,.015,.018]);
 for(const side of [-1,1])for(const front of [-1,1]){const leg=ball(cat,`Leg${side}_${front}`,'fur',[side*.34,.33,front*.49],[.16,.34,.18]);ball(leg,'Paw','cream',[0,-.8,.15],[1.04,.4,1.1]);}
 for(let i=0;i<3;i++)ball(head,'ForeheadStripe'+i,'stripe',[(i-1)*.14,.3,.37],[.035,.11,.035]);
 const tail=new THREE.Group();tail.name='Tail';tail.position.set(0,.88,-.62);cat.add(tail);
 const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(.12,.2,-.35),new THREE.Vector3(.18,.65,-.45),new THREE.Vector3(.08,.85,-.3)]);
 const tailMesh=new THREE.Mesh(new THREE.TubeGeometry(curve,20,.105,10,false),materials.fur);tailMesh.castShadow=true;tail.add(tailMesh);
 const collar=new THREE.Mesh(new THREE.TorusGeometry(.33,.06,8,32),materials.collar);collar.rotation.x=Math.PI/2;collar.position.set(0,1.2,.44);cat.add(collar);ball(cat,'Bell','cream',[0,1.15,.81],[.065,.07,.065]);
 if(mood==='sleep'){head.rotation.x=.18;cat.scale.y=.63;cat.position.y=.015;tail.rotation.z=.7;}
 if(mood==='crazy hungry'){head.rotation.z=-.13;tail.rotation.x=-.35;}
 cat.userData={mood,head,tail,body};return cat;
}
export function animateCat(cat,time,walking=false,reduced=false){
 const {head,tail,mood}=cat.userData;if(reduced)return;
 const speed=mood==='crazy hungry'?7:2.4;
 tail.rotation.z=(mood==='sleep'?.7:0)+Math.sin(time*speed)*.15;
 head.rotation.z=(mood==='crazy hungry'?-.13:0)+Math.sin(time*speed*.7)*.045;
 cat.position.y=(mood==='sleep'?.015:0)+Math.sin(time*(walking?10:speed))*(walking?.05:.018);
 for(const mesh of cat.children){if(mesh.name.startsWith('Leg'))mesh.rotation.x=walking?Math.sin(time*10+(mesh.position.x*mesh.position.z>0?Math.PI:0))*.3:0;}
}
