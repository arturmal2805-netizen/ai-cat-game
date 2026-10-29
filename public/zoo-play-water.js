import * as T from 'three';
// Fixed transparent instances. Only endpoint/time uniforms change; no matrices,
// geometry, texture transfers, targets or particle allocation during updates.
export function zooPlayWater(){
 const geo=new T.InstancedBufferGeometry();geo.setIndex([0,1,2,0,2,3]);geo.setAttribute('position',new T.Float32BufferAttribute([-.5,-.5,0,.5,-.5,0,.5,.5,0,-.5,.5,0],3));geo.setAttribute('uv',new T.Float32BufferAttribute([0,0,1,0,1,1,0,1],2));
 geo.setAttribute('aSeed',new T.InstancedBufferAttribute(Float32Array.from({length:128},(_,i)=>i),1));geo.instanceCount=128;
 const uniforms={uTime:{value:0},uStart:{value:new T.Vector3()},uEnd:{value:new T.Vector3()},uMode:{value:0},uStrength:{value:0}};
 const mat=new T.ShaderMaterial({uniforms,transparent:true,depthWrite:false,vertexShader:`attribute float aSeed;uniform float uTime,uMode,uStrength;uniform vec3 uStart,uEnd;varying vec2 vUv;varying float vAlpha;void main(){float seed=aSeed,phase=fract(uTime*1.35+seed*.6180339),a=seed*2.39996;vec3 p;float size;
 if(uMode<.5&&seed<96.){p=mix(uStart,uEnd,phase);p.y+=4.*1.6*phase*(1.-phase);p.x+=sin(a)*.08;p.z+=cos(a)*.08;size=.045+.025*sin(seed);vAlpha=uStrength*(1.-phase*.35);}
 else{float age=mod(uTime+seed*.013,1.8),speed=1.3+fract(seed*.37)*1.6;float r=speed*age;p=uEnd+vec3(sin(a)*r,3.*age-4.905*age*age,cos(a)*r);size=.04+.025*fract(seed*.31);vAlpha=uStrength*max(0.,1.-age/.65);}
 vec4 view=modelViewMatrix*vec4(p,1.);view.xy+=position.xy*size;vUv=uv;gl_Position=projectionMatrix*view;}`,fragmentShader:`varying vec2 vUv;varying float vAlpha;void main(){vec2 q=(vUv-.5)*2.;float d=dot(q,q);if(d>1.)discard;float shine=pow(max(0.,1.-length(q-vec2(-.3,.35))),4.);gl_FragColor=vec4(mix(vec3(.15,.8,1.),vec3(.92,1.,1.),shine+.2),vAlpha*(1.-smoothstep(.6,1.,d))*.8);}`});
 const mesh=new T.Mesh(geo,mat);mesh.name='Zoo · playful water (fixed 128 drops)';mesh.frustumCulled=false;mesh.visible=false;
 mesh.userData.play=(start,end,time,strength=1,mode=0)=>{uniforms.uStart.value.copy(start);uniforms.uEnd.value.copy(end);uniforms.uTime.value=time;uniforms.uStrength.value=strength;uniforms.uMode.value=mode;mesh.visible=strength>.001;};
 mesh.userData.stop=()=>{mesh.visible=false;};return mesh;
}
