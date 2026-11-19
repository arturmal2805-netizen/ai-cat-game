import * as T from 'three';
// Reflect the SAME three bounded room lamps used by the opaque SPA surfaces.
// Small uniform arrays, no new scene lights/textures/targets or per-frame bake.
export function installSpaWaterHighlights(root){
 const data=root.userData.roomLightTexture.image.data,seen=new Set();
 root.traverse(o=>{const m=o.material;if(!m?.userData?.spaWaterQuality||seen.has(m))return;seen.add(m);
  const layer=m.uniforms.uSpaWaterLayer?.value??({thermal:0,vip:1,aroma:4,cafe:6,waterfall:7}[m.userData.spaWaterQuality.kind]??0),room=Math.min(7,layer);
  const positions=[],colors=[];for(let j=0;j<3;j++){const id=room*4+j+1;positions.push(new T.Vector4().fromArray(data,id*4));colors.push(new T.Vector4().fromArray(data,(64+id)*4));}
  Object.assign(m.uniforms,{uSpaLampPositions:{value:positions},uSpaLampColors:{value:colors},uSpaOrigin:{value:root.position}});
  const declarations='uniform vec4 uSpaLampPositions[3],uSpaLampColors[3];uniform vec3 uSpaOrigin;\n';
  m.fragmentShader=declarations+m.fragmentShader.replace('gl_FragColor.a=1.;',`
 if(uFall<.5){
  vec3 n=normalize(vWaterNormal+vec3(slope.x,0.,slope.y));
  vec3 view=normalize(cameraPosition-vWaterPoint);
  float fresnel=.0204+.9796*pow(1.-abs(dot(n,view)),5.);
  vec3 lamps=vec3(0.);
  for(int i=0;i<3;i++){
   vec3 delta=uSpaLampPositions[i].xyz+uSpaOrigin-vWaterPoint;
   float distance=length(delta),range=uSpaLampPositions[i].w;
   vec3 direction=delta/max(.001,distance),halfLamp=normalize(direction+view);
   float lobe=pow(max(0.,dot(n,halfLamp)),mix(180.,44.,clamp(uSpaRoughness*3.,0.,1.)));
   float falloff=pow(max(0.,1.-distance/max(1.,range)),2.);
   lamps+=uSpaLampColors[i].rgb*uSpaLampColors[i].a*lobe*falloff*max(0.,direction.y)*fresnel*9.;
  }
  // The captured image and output are already tone mapped. A bounded local
  // highlight retains HDR lamp contrast without brightening the whole scene.
  gl_FragColor.rgb+=min(spaEncoded(lamps)*uSpaReflection,vec3(.42));
 }
 gl_FragColor.a=1.;`);
  m.needsUpdate=true;
 });
}
