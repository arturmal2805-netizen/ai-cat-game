import {waterfallSteps} from './lagoon.js';
import {advanceWater} from './water-shading.js';
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
// Decorative reef ambience, not an additional zoo species or AI actor.
export function zooWaterlife(scale=1){
 const group=new T.Group(),clock={value:0},dummy=new T.Object3D();
 const bubbles=new T.InstancedMesh(new T.SphereGeometry(.045,10,7),new T.MeshBasicMaterial({color:0xc4f7ff,transparent:true,opacity:.55,depthWrite:false}),40);
 bubbles.material.onBeforeCompile=s=>{s.uniforms.uZooBubbleTime=clock;s.vertexShader='uniform float uZooBubbleTime;\n'+s.vertexShader.replace('#include <project_vertex>',`vec4 bubblePoint=instanceMatrix*vec4(transformed,1.);bubblePoint.y=.5+mod(bubblePoint.y-.5+uZooBubbleTime*.35,3.35);vec4 mvPosition=modelViewMatrix*bubblePoint;gl_Position=projectionMatrix*mvPosition;`);};bubbles.material.customProgramCacheKey=()=> 'zoo-bubbles-fixed-v1';bubbles.frustumCulled=false;bubbles.renderOrder=5;
 for(let i=0;i<40;i++){dummy.position.set(Math.sin(i*2.399)*(1+(i%5)*.35)*scale,.5+(i*.71)%3.35,Math.cos(i*2.399)*(1+(i%3)*.5)*scale);dummy.scale.setScalar(.6+(i%3)*.3);dummy.updateMatrix();bubbles.setMatrixAt(i,dummy.matrix);}group.add(bubbles);
 const body=new T.SphereGeometry(1,12,8);body.scale(.18,.1,.08);const tail=new T.ConeGeometry(.1,.17,3);tail.rotateZ(Math.PI/2);tail.translate(-.22,0,0);const geo=mergeGeometries([body,tail]);body.dispose();tail.dispose();
 const fish=new T.InstancedMesh(geo,new T.MeshStandardMaterial({color:0xffffff,roughness:.45}),14);fish.material.onBeforeCompile=s=>{s.uniforms.uZooFishTime=clock;s.vertexShader='uniform float uZooFishTime;\n'+s.vertexShader.replace('#include <project_vertex>',`vec4 fishPoint=instanceMatrix*vec4(transformed,1.);fishPoint.x+=sin(uZooFishTime*.45+float(gl_InstanceID))*.65;fishPoint.y+=sin(uZooFishTime*.8+float(gl_InstanceID)*1.8)*.13;vec4 mvPosition=modelViewMatrix*fishPoint;gl_Position=projectionMatrix*mvPosition;`);};fish.material.customProgramCacheKey=()=> 'zoo-reef-fish-fixed-v1';fish.frustumCulled=false;
 for(let i=0;i<14;i++){dummy.position.set(Math.sin(i*2.399)*2.4*scale,1+(i%4)*.5,Math.cos(i*2.399)*2.2*scale);dummy.scale.setScalar(.65+(i%3)*.18);dummy.updateMatrix();fish.setMatrixAt(i,dummy.matrix);fish.setColorAt(i,new T.Color([0xffb45b,0xffda74,0xcb9fee,0xff8eac][i%4]));}group.add(fish);group.userData.update=(t,reduced=false)=>{clock.value=reduced?0:t;};return group;
}

// Native waterfall appearance and all eighteen streaks; only a uniform changes.
export function* zooWaterfallSteps(...args){
 const g=yield*waterfallSteps(...args),clock={value:0},height=args[3]||4;
 const lines=g.children.find(c=>c.isInstancedMesh),sheet=g.children.find(c=>c.isMesh&&!c.isInstancedMesh&&c.geometry.type==='PlaneGeometry');
 lines.material.onBeforeCompile=s=>{s.uniforms.uZooFallTime=clock;s.vertexShader='uniform float uZooFallTime;\n'+s.vertexShader.replace('#include <project_vertex>',`vec4 point=instanceMatrix*vec4(transformed,1.);point.y=${height/2}-mod(${height/2}-point.y+uZooFallTime*2.1,${height.toFixed(4)});vec4 mvPosition=modelViewMatrix*point;gl_Position=projectionMatrix*mvPosition;`);};
 lines.material.customProgramCacheKey=()=> 'zoo-fall-fixed-'+height;
 g.userData.update=(t,reduced=false)=>{clock.value=reduced?0:t;advanceWater(sheet.material,t,reduced);};return g;
}
