import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
export const CAT_PORTAL_THEMES=Object.freeze({default:[0xb88bff,0xffd18a],warehouse:[0x65e9ff,0xb88bff],spa:[0xff80cc,0xffd18a],mall:[0xffd18a,0xb88bff],trampoline:[0xb88bff,0x65e9ff],restaurant:[0xffc077,0xff80cc],waterfront:[0x65e9ff,0xffd18a],squish:[0xff80cc,0xcba6ff]});
// Bounded reusable portal pool: immutable shared geometry, three draws per
// visible portal, no dynamic lights, render targets or per-particle uploads.
export function createCatPortalVisuals(scene,{capacity=12,getCamera=()=>null}={}){
  const root=new T.Group();root.name='CHICHI · pooled magical cat portals';scene.add(root);
  const parts=[new T.TorusGeometry(1,.035,6,64)];
  for(const side of [-1,1]){const curve=new T.CatmullRomCurve3([new T.Vector3(side*.45,.88,0),new T.Vector3(side*.65,1.35,0),new T.Vector3(side*.88,.6,0)]);parts.push(new T.TubeGeometry(curve,10,.032,5,false));}
  const frameGeometry=mergeGeometries(parts);parts.forEach(g=>g.dispose());
  const disk=new T.CircleGeometry(.98,48),particles=new T.BufferGeometry(),data=new Float32Array(96*3);
  for(let i=0;i<96;i++){const a=i*2.399963;data.set([Math.cos(a)*(1+(i%7)*.05),Math.sin(a)*(1+(i%7)*.05),i/96],i*3);}particles.setAttribute('position',new T.BufferAttribute(data,3));
  const slots=Array.from({length:capacity},()=>{
    const group=new T.Group();group.visible=false;group.frustumCulled=true;root.add(group);
    const rim=new T.MeshBasicMaterial({color:0xffd18a,transparent:true,opacity:0,depthWrite:false,fog:false,toneMapped:false});
    const uniforms={time:{value:0},opacity:{value:0},colour:{value:new T.Color(0xb88bff)},accent:{value:new T.Color(0xffd18a)}};
    const material=new T.ShaderMaterial({uniforms,transparent:true,depthWrite:false,side:T.DoubleSide,
      vertexShader:'varying vec2 p;void main(){p=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:'uniform float time,opacity;uniform vec3 colour,accent;varying vec2 p;void main(){float r=length(p),a=atan(p.y,p.x);float swirl=.5+.5*sin(16.*r-3.*a-time*5.);float edge=1.-smoothstep(.72,.99,r);vec3 c=mix(colour,accent,pow(swirl,6.)*.6);gl_FragColor=vec4(c,opacity*edge*(.12+swirl*.23));}'});
    const particleMat=new T.ShaderMaterial({uniforms,transparent:true,depthWrite:false,
      vertexShader:'uniform float time,opacity;varying float light;void main(){float a=time*1.3+position.z*6.283;vec2 q=mat2(cos(a),-sin(a),sin(a),cos(a))*position.xy;light=sin(position.z*83.+time*4.)*.35+.65;vec4 v=modelViewMatrix*vec4(q,0.,1.);gl_Position=projectionMatrix*v;gl_PointSize=clamp(80./max(1.,-v.z),2.,7.);}',
      fragmentShader:'uniform float opacity;uniform vec3 colour,accent;varying float light;void main(){vec2 p=gl_PointCoord-.5;float star=max(0.,1.-min(abs(p.x)*9.+abs(p.y)*2.,abs(p.x)*2.+abs(p.y)*9.));gl_FragColor=vec4(mix(colour,accent,light),star*light*opacity);}'});
    group.add(new T.Mesh(frameGeometry,rim),new T.Mesh(disk,material),new T.Points(particles,particleMat));
    return{group,rim,uniforms,material,particleMat,used:false,radius:1};
  });
  return{
    acquire(theme,radius){const s=slots.find(s=>!s.used);if(!s)return null;s.used=true;s.radius=Math.max(1.2,radius*2.1);const [a,b]=CAT_PORTAL_THEMES[theme]||CAT_PORTAL_THEMES.default;s.uniforms.colour.value.setHex(a);s.uniforms.accent.value.setHex(b);s.rim.color.setHex(b);return s;},
    update(s,{age,from,to,relocated,reducedMotion}){if(!s)return;const p=relocated?to:from,opening=relocated?Math.max(0,1-(age-.4)/.3):Math.min(1,age/.2),fade=relocated?Math.min(1,(.7-age)/.12):Math.min(1,age/.12);s.group.visible=true;s.group.position.set(p.x,p.y+s.radius*.8,p.z);const camera=getCamera();if(camera)s.group.quaternion.copy(camera.quaternion);s.group.scale.setScalar(s.radius*(reducedMotion?1:.25+.75*opening));s.uniforms.time.value=reducedMotion?0:age;s.uniforms.opacity.value=Math.max(0,fade);s.rim.opacity=Math.max(0,fade)*.9;},
    release(s){if(!s)return;s.group.visible=false;s.used=false;},
    dispose(){root.removeFromParent();for(const s of slots){s.rim.dispose();s.material.dispose();s.particleMat.dispose();}frameGeometry.dispose();disk.dispose();particles.dispose();},
    get diagnostics(){return{capacity,active:slots.filter(s=>s.used).length,particlesPerPortal:96,lights:0,perFrameParticleUploads:0};},
  };
}
