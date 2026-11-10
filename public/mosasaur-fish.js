import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {applyUnderwaterLighting} from './water-shading.js';
import {MOSA_SEA} from './mosasaur-data.js';

export function mosaFishStates(deep=false){return Array.from({length:deep?54:48},(_,i)=>deep?{phase:i%18*2.399,radius:7+(i%6)*1.4,speed:[.055,-.055,.055][Math.floor(i/18)],depth:[-6,-16,-25][Math.floor(i/18)]+i%5*.35,scale:.65+i%4*.22,rx:1,rz:1,index:i}:{phase:i*2.399+1,radius:.25+i%6*.11,speed:.16+i%5*.025,depth:-.19-i%4*.075,scale:.8+i%3*.12,rx:MOSA_SEA.rx,rz:MOSA_SEA.rz,index:i});}
export function mosaFishFrame(state,time,reduced=false,out={}){const t=reduced?0:time,a=state.phase+t*state.speed;
 out.x=(state.cx||0)+Math.cos(a)*state.rx*state.radius;out.y=state.depth+Math.sin(a*2)*.025;out.z=(state.cz||0)+Math.sin(a)*state.rz*state.radius;out.yaw=Math.atan2(-Math.sin(a)*state.rx,Math.cos(a)*state.rz);out.roll=reduced?0:Math.sin(t*.7+state.phase)*.045;out.tail=reduced?0:Math.sin(t*6+state.phase)*.35;out.fin=reduced?0:Math.sin(t*7+state.phase)*.22;out.scale=state.scale;return out;}
function fishGeometry(){const parts=[];
 function add(g,color,part=0,coat=0,gloss=0){let p=g;if(p.index){p=g.toNonIndexed();g.dispose();}const count=p.attributes.position.count,c=new T.Color(color),colors=new Float32Array(count*3);for(let i=0;i<count;i++)c.toArray(colors,i*3);p.setAttribute('color',new T.BufferAttribute(colors,3));for(const [name,value] of [['aFishPart',part],['aFishCoat',coat],['aFishGloss',gloss]])p.setAttribute(name,new T.BufferAttribute(new Float32Array(count).fill(value),1));parts.push(p);}
 function oval(x,y,z,sx,sy,sz,color,coat=0,gloss=0){add(new T.SphereGeometry(1,coat===1?24:gloss?12:10,coat===1?16:gloss?8:6).scale(sx,sy,sz).translate(x,y,z),color,0,coat,gloss);}
 oval(0,0,0,.11,.075,.26,0xffffff,1);
 // Curved, split tail and leaflike fins have a real outline and thickness.
 const tail=new T.Shape();tail.moveTo(0,-.025);tail.bezierCurveTo(-.10,-.05,-.12,-.13,-.08,-.15);tail.quadraticCurveTo(0,-.08,.08,-.15);tail.bezierCurveTo(.12,-.13,.10,-.05,0,-.025);
 const tg=new T.ExtrudeGeometry(tail,{depth:.012,bevelEnabled:true,bevelSize:.006,bevelThickness:.004,bevelSegments:2,curveSegments:10});tg.rotateX(Math.PI/2);tg.translate(0,.006,-.205);add(tg,0xffe1aa,1,.7);
 for(const sign of [-1,1]){const f=new T.Shape();f.moveTo(0,0);f.quadraticCurveTo(.10,.02,.12,-.075);f.quadraticCurveTo(.04,-.06,0,0);const fg=new T.ShapeGeometry(f,10);fg.rotateX(-Math.PI/2);if(sign<0)fg.scale(-1,1,1);fg.translate(sign*.07,-.025,-.01);add(fg,0xffedc4,sign<0?2:3,.45);}
 // Dorsal sail, warm cheeks, round eyes, irises and two crisp catchlights.
 oval(0,.065,-.04,.022,.05,.11,0xffdfae,.5);
 for(const sign of [-1,1]){
  oval(sign*.087,.022,.145,.031,.034,.031,0xf6fbff,0,.8);
  oval(sign*.108,.024,.158,.012,.024,.021,0x285779,0,1);
  oval(sign*.115,.024,.162,.008,.019,.015,0x101e36,0,1);
  oval(sign*.120,.035,.172,.005,.007,.006,0xffffff,0,1);
  oval(sign*.121,.018,.17,.0025,.003,.003,0xffffff,0,1);
  oval(sign*.087,-.012,.185,.018,.012,.014,0xffb9ad);
  const gill=new T.CatmullRomCurve3([new T.Vector3(sign*.104,.035,.08),new T.Vector3(sign*.115,0,.065),new T.Vector3(sign*.104,-.03,.08)]);add(new T.TubeGeometry(gill,10,.0024,4,false),0x506b8b);
 }
 const smile=new T.CatmullRomCurve3([new T.Vector3(-.029,-.016,.249),new T.Vector3(0,-.026,.258),new T.Vector3(.029,-.016,.249)]);add(new T.TubeGeometry(smile,12,.0026,4,false),0x39557a);
 const g=mergeGeometries(parts);for(const p of parts)p.dispose();return g;
}
export function fishLocalVertex(position,part,frame,out=new T.Vector3()){
 out.copy(position);let angle=0,px=0,pz=0;
 if(part===1){angle=frame.tail;pz=-.23;}else if(part===2||part===3){angle=frame.fin*(part===2?-1:1);px=part===2?-.07:.07;pz=-.01;}
 if(angle){const x=out.x-px,z=out.z-pz,c=Math.cos(angle),s=Math.sin(angle);out.x=x*c+z*s+px;out.z=-x*s+z*c+pz;}
 out.applyAxisAngle(new T.Vector3(0,0,1),frame.roll).applyAxisAngle(new T.Vector3(0,1,0),frame.yaw).multiplyScalar(frame.scale);out.x+=frame.x;out.y+=frame.y;out.z+=frame.z;return out;
}
export function fishLocalNormal(normal,part,frame,out=new T.Vector3()){const angle=part===1?frame.tail:part===2?-frame.fin:part===3?frame.fin:0;return out.copy(normal).applyAxisAngle(new T.Vector3(0,1,0),angle).applyAxisAngle(new T.Vector3(0,0,1),frame.roll).applyAxisAngle(new T.Vector3(0,1,0),frame.yaw).normalize();}
export function createMosaFish({deep=false,school=null}={}){
 const root=new T.Group(),hits={value:Array.from({length:6},()=>new T.Vector4())},hitCount={value:0},states=school||mosaFishStates(deep),geometry=fishGeometry(),clock={value:0},motion={value:1},mesh=new T.InstancedMesh(geometry,new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.38,side:T.DoubleSide}),states.length),params=[],orbit=[],tints=[];
 root.name=deep?'Detailed deep tropical fish schools':'Cute tropical lagoon fish';
 const colors=[0xffbf54,0x5adce8,0xf39fcb,0x96dfb1,0xaaa1ec,0xffedb1];
 states.forEach((p,i)=>{mesh.setMatrixAt(i,new T.Matrix4());params.push(p.phase,p.radius,p.speed,p.scale);orbit.push(p.rx,p.rz,p.depth,i%3);const c=new T.Color(colors[i%colors.length]);tints.push(c.r,c.g,c.b);});
 geometry.setAttribute('aFishParams',new T.InstancedBufferAttribute(new Float32Array(params),4));geometry.setAttribute('aFishOrbit',new T.InstancedBufferAttribute(new Float32Array(orbit),4));geometry.setAttribute('aFishTint',new T.InstancedBufferAttribute(new Float32Array(tints),3));mesh.instanceMatrix.needsUpdate=true;
 const poseRows={value:new Float32Array(states.length*4)},headingRows={value:new Float32Array(states.length*4)},limbRows={value:new Float32Array(states.length*4)},frames=states.map(()=>({}));
 function populate(){for(let i=0;i<states.length;i++){const f=mosaFishFrame(states[i],clock.value,!motion.value,frames[i]);for(let h=0;h<hitCount.value;h++){const p=hits.value[h],age=clock.value-p.z,dx=f.x-p.x,dz=f.z-p.y,dist=Math.hypot(dx,dz);if(age>=0&&age<2&&dist<1.1&&motion.value){const push=(1.1-dist)*.22*(1-age/2);f.x+=dx/(dist||1)*push;f.z+=dz/(dist||1)*push;}}const k=i*4;const p=poseRows.value,h=headingRows.value,l=limbRows.value;p[k]=f.x;p[k+1]=f.y;p[k+2]=f.z;p[k+3]=f.scale;h[k]=Math.cos(f.yaw);h[k+1]=Math.sin(f.yaw);h[k+2]=Math.cos(f.roll);h[k+3]=Math.sin(f.roll);l[k]=Math.cos(f.tail);l[k+1]=Math.sin(f.tail);l[k+2]=Math.cos(f.fin);l[k+3]=Math.sin(f.fin);}}
 geometry.setAttribute('aFishId',new T.InstancedBufferAttribute(Float32Array.from({length:states.length},(_,i)=>i),1));
 const declarations=`uniform vec4 uFishPlace[${states.length}];uniform vec4 uFishHeading[${states.length}];uniform vec4 uFishLimbs[${states.length}];attribute float aFishId;uniform float uMosaFishTime;uniform float uMosaFishMotion;uniform vec4 uFishHits[6];uniform int uFishHitCount;attribute vec4 aFishParams;attribute vec4 aFishOrbit;attribute vec3 aFishTint;attribute float aFishPart;attribute float aFishCoat;attribute float aFishGloss;varying vec3 vFishTint;varying vec3 vFishLocal;varying float vFishCoat;varying float vFishGloss;varying float vFishPattern;
 mat3 turnFish(float a){float c=cos(a),s=sin(a);return mat3(c,0.,-s,0.,1.,0.,s,0.,c);}mat3 rollFish(float a){float c=cos(a),s=sin(a);return mat3(c,s,0.,-s,c,0.,0.,0.,1.);}`;
 mesh.material.onBeforeCompile=shader=>{
  shader.uniforms.uFishPlace=poseRows;shader.uniforms.uFishHeading=headingRows;shader.uniforms.uFishLimbs=limbRows;shader.uniforms.uMosaFishTime=clock;shader.uniforms.uMosaFishMotion=motion;shader.uniforms.uFishHits=hits;shader.uniforms.uFishHitCount=hitCount;
  shader.vertexShader=declarations+'\n'+shader.vertexShader.replace('#include <beginnormal_vertex>',`#include <beginnormal_vertex>
   int id=int(aFishId+.5);vec4 place=uFishPlace[id],heading=uFishHeading[id],limbs=uFishLimbs[id];
   vec2 limb=vec2(1.,0.);vec3 pivot=vec3(0.);
   if(aFishPart>.5&&aFishPart<1.5){limb=limbs.xy;pivot.z=-.23;}
   else if(aFishPart>1.5){limb=vec2(limbs.z,limbs.w*(aFishPart<2.5?-1.:1.));pivot=vec3(aFishPart<2.5?-.07:.07,0.,-.01);}
   mat3 yawMatrix=mat3(heading.x,0.,-heading.y,0.,1.,0.,heading.y,0.,heading.x);
   mat3 rollMatrix=mat3(heading.z,heading.w,0.,-heading.w,heading.z,0.,0.,0.,1.);
   mat3 limbMatrix=mat3(limb.x,0.,-limb.y,0.,1.,0.,limb.y,0.,limb.x);
   mat3 fishRotation=yawMatrix*rollMatrix*limbMatrix;objectNormal=fishRotation*objectNormal;`)
   .replace('#include <begin_vertex>',`#include <begin_vertex>
    transformed=fishRotation*(position-pivot)+yawMatrix*rollMatrix*pivot;
    transformed=transformed*place.w+place.xyz;
    vFishTint=aFishTint;vFishLocal=position;vFishCoat=aFishCoat;vFishGloss=aFishGloss;vFishPattern=aFishOrbit.w;`);
  shader.fragmentShader='varying vec3 vFishTint;varying vec3 vFishLocal;varying float vFishCoat;varying float vFishGloss;varying float vFishPattern;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float bands=smoothstep(.30,.48,abs(sin(vFishLocal.z*38.)));
   float freckles=smoothstep(.80,.94,sin(vFishLocal.z*95.)*sin(vFishLocal.y*150.));
   vec3 coat=vFishTint;if(vFishPattern<.5)coat=mix(vFishTint,vec3(.94,.98,1.),bands*.65);else if(vFishPattern>1.5)coat*=1.-freckles*.32;
   diffuseColor.rgb*=mix(vec3(1.),coat,vFishCoat);`).replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,.12,vFishGloss);');
 };
 mesh.material.customProgramCacheKey=()=> 'mosa-cute-fish-palette-v2-'+states.length;applyUnderwaterLighting(mesh.material,clock,0x51d8f0,{level:{value:MOSA_SEA.surfaceY}});
 const r=deep?14:Math.max(MOSA_SEA.rx,MOSA_SEA.rz)*.81+1;mesh.boundingSphere=new T.Sphere(new T.Vector3(0,deep?-15:0,0),deep?23:r);mesh.boundingBox=new T.Box3(new T.Vector3(-r,deep?-26:-1,-r),new T.Vector3(r,1,r));if(school){const box=new T.Box3();for(const s of states){box.expandByPoint(new T.Vector3((s.cx||0)-Math.abs(s.rx*s.radius)-.7,s.depth-.4,(s.cz||0)-Math.abs(s.rz*s.radius)-.7));box.expandByPoint(new T.Vector3((s.cx||0)+Math.abs(s.rx*s.radius)+.7,s.depth+.4,(s.cz||0)+Math.abs(s.rz*s.radius)+.7));}mesh.boundingBox=box;mesh.boundingSphere=box.getBoundingSphere(new T.Sphere());}root.add(mesh);
 root.userData.fishCount=states.length;root.userData.mesh=mesh;root.userData.states=states;root.userData.frameAt=(i,out={})=>Object.assign(out,frames[i]);root.userData.palette={poseRows,headingRows,limbRows};
 let hitIndex=0;root.userData.disturb=(x,z,time)=>{hits.value[hitIndex++%6].set(x,z,time,1);hitCount.value=Math.min(6,hitCount.value+1);populate();};
 root.userData.update=(t,reduced=false)=>{clock.value=reduced?0:t;motion.value=reduced?0:1;if(reduced){hitCount.value=0;hitIndex=0;}populate();};populate();return root;
}
