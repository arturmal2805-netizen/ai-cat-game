// Shared optical implementation. Venue wrappers supply physical dimensions,
// finite outlet geometry and actual scenery probes; they do not repaint water.
export const WATER_MEDIUM=Object.freeze({extinction:Object.freeze([.045,.012,.005]),scatterRate:.022});
export const WATER_WAVES_GLSL=`
vec3 sharedWaterWaves(vec2 point,float seconds,vec4 a,vec4 b,vec4 c,vec3 offset){
 vec3 phase=vec3(dot(point,a.xy),dot(point,b.xy),dot(point,c.xy))-seconds*vec3(a.w,b.w,c.w)+offset;
 vec3 height=sin(phase)*vec3(a.z,b.z,c.z),gradient=cos(phase)*vec3(a.z,b.z,c.z);
 return vec3(height.x+height.y+height.z,dot(gradient,vec3(a.x,b.x,c.x)),dot(gradient,vec3(a.y,b.y,c.y)));
}
`;
export const WATER_FIELD_GLSL=`
void sharedWaterField(vec2 metres,vec2 flow,out vec4 a,out vec4 b){
 a=texture2D(uWaterField,metres*.075+flow*.75);
 vec2 warped=metres+(a.rg-.5)*.25;
 b=texture2D(uWaterField,warped.yx*.137-flow*.53+(a.rg-.5)*.12);
}
vec2 sharedWaterSlope(vec4 a,vec4 b){return (a.rg-.5)*.085+(b.gr-.5)*.135;}
`;
export const WATER_SURFACE_GLSL=`
 vec3 base=normalize(vWaterNormal);
 if(!gl_FrontFacing)base=-base;
 float side=base.y>=0.0?1.0:-1.0;
 float basisA=-1.0/(side+base.y),basisB=base.x*base.z*basisA;
 vec3 tangent=vec3(1.0+side*base.x*base.x*basisA,-side*base.x,side*basisB);
 vec3 bitangent=vec3(basisB,-base.z,side+base.z*base.z*basisA);
 vec3 n=normalize(base+tangent*slope.x+bitangent*slope.y);
 vec3 view=normalize(cameraPosition-vWaterPoint);
 float facing=clamp(abs(dot(n,view)),0.0,1.0);
 float fresnel=.0204+.9796*pow(1.0-facing,5.0);
 vec2 normalChange=vec2(length(dFdx(n)),length(dFdy(n)));
 float variance=dot(normalChange,normalChange);
 vec3 reflected=reflect(-view,n);
 float waterProbeLod=.6+clamp(sqrt(variance)*5.,0.,2.5);
 vec3 sky=texture2D(uWaterEnvironment,environmentUv(reflected),waterProbeLod).rgb*uWaterEnvironmentGain;
 vec3 sunDirection=normalize(vec3(-14.,35.,20.));
 vec3 halfSun=normalize(view+sunDirection);
 float gloss=max(dot(n,halfSun),0.0);
 float roughness=.085;
 float alphaRough=min(.22,roughness*roughness+variance*.35);
 float a2=alphaRough*alphaRough;
 float denominator=max(.0001,gloss*gloss*(a2-1.0)+1.0);
 float distribution=a2/(3.14159*denominator*denominator);
 float sunFacing=max(dot(n,sunDirection),0.0),nv=max(facing,.025);
 float visibility=.5/max(.0001,sunFacing*sqrt(nv*nv*(1.-a2)+a2)+nv*sqrt(sunFacing*sunFacing*(1.-a2)+a2));
 float sunFresnel=.0204+.9796*pow(1.-max(dot(view,halfSun),0.),5.);
 float glint=distribution*visibility*sunFresnel*sunFacing*.035;
 float edge=length((vWaterUv-.5)*2.0);
 float waterDepth=mix(.23,uWaterDepth*(1.-.8*smoothstep(.55,1.,edge)),uLake);
 float shallow=1.-exp2(-max(0.,waterDepth)*.12);
 vec3 body=mix(uShoreColor,uColor*vec3(.62,.82,.95),shallow*.85+.15);
 // Object extinction already measures its submerged camera ray. The interface
 // adds bounded scatter, not another 200m absorption layer over a nearby fish.
 float scatter=(.035+.15*(1.-exp2(-max(0.,waterDepth)*.08)))*clamp(uOpacity/.62,.2,1.4);
 float sunCoverage=min(glint,.18);
 float reflection=clamp(fresnel+sunCoverage,0.,.98);
 float coverage=reflection+(1.-reflection)*min(.3,scatter);
 vec3 color=(sky*fresnel+vec3(1.,.95,.83)*sunCoverage+body*(1.-reflection)*scatter)/max(.001,coverage);
 float shoreLace=smoothstep(.57,.92,fieldA.a*.45+fieldB.a*.55);
 float shoreFoam=(1.-smoothstep(.25,1.8,waterDepth))*shoreLace*.28*uLake;
 float foam=clamp(shoreFoam+wakeFoam,0.,.48);
 if(uFlowing>.5){
  float across=abs(vWaterUv.x-.5)*2.;
  float rim=smoothstep(.89,.995,across)*(.025+fieldA.a*.12);
  float turbulence=clamp(1.-abs(vWaterNormal.y),0.,1.);
  float aeration=smoothstep(.76,.96,fieldA.a)*smoothstep(.55,.9,fieldB.a)*(.05+turbulence*.15);
  foam=clamp(foam+rim+aeration,0.,.34);
 }
 color=mix(color,vec3(.93,.985,1.),foam);
 float alpha=clamp(1.-(1.-coverage)*(1.-foam*.65),.025,.98);
 // WATER_OUTLET_MERGE
 gl_FragColor=vec4(max(color,vec3(0.0)),alpha);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
`;
