import * as T from 'three';
import {copyGeometryBuffers} from './geometry-tasks.js';
import {mosaWaterReflection} from './mosasaur-water-probe.js';

// One immutable 2 KiB light table for the new rooms. A byte per vertex chooses
// its own room, so a warm shop never lights through the next shop's wall.
// Native cats retain their approved materials and the normal scene lighting.
export function createMallRoomLights(){
  const size=64,data=new Float32Array(size*2*4),texture=new T.DataTexture(data,size,2,T.RGBAFormat,T.FloatType);
  texture.name='Mall bounded room lamps';texture.magFilter=texture.minFilter=T.NearestFilter;texture.generateMipmaps=false;
  let next=1;const copies=new Map();
  return {texture,
    register(x,z,color=0xffd6a0){
      if(next>=size)throw Error('Mall room light table is full');
      const id=next++,c=new T.Color(color);data.set([x,6.4,z,21],id*4);data.set([c.r,c.g,c.b,1.65],(size+id)*4);return id;
    },
    *stamp(root,id=0){
      const meshes=[];root.traverse(o=>{if(o.isMesh&&!o.geometry.hasAttribute('aMallRoom'))meshes.push(o);});
      for(const mesh of meshes){
        yield;let variants=copies.get(mesh.geometry);if(!variants)copies.set(mesh.geometry,variants=new Map());
        let geometry=variants.get(id);
        if(!geometry){geometry=copyGeometryBuffers(mesh.geometry);geometry.userData.sharedScenery=false;const count=geometry.attributes.position.count;geometry.setAttribute('aMallRoom',new T.Uint8BufferAttribute(new Uint8Array(count).fill(id),1));variants.set(id,geometry);}
        mesh.geometry=geometry;
      }
    },
    finishFloor(){copies.clear();},finish(){copies.clear();texture.needsUpdate=true;},
  };
}
export function mallRoomLightMaterial(material,lights,gain=.18){
  const probe=mosaWaterReflection();
  material.onBeforeCompile=s=>{
    s.uniforms.uMallRoomLamps={value:lights.texture};s.uniforms.uMallProbe={value:probe.texture};s.uniforms.uMallProbeGain={value:probe.gain*gain};
    s.vertexShader='attribute float aMallRoom;uniform sampler2D uMallRoomLamps;varying vec3 vMallLamp;varying vec4 vMallLampColor;varying float vMallLampRange;\n'+s.vertexShader;
    s.vertexShader=s.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
      vec4 roomLamp=texture2D(uMallRoomLamps,vec2((aMallRoom+.5)/64.,.25));
      vMallLamp=(modelViewMatrix*vec4(roomLamp.xyz,1.)).xyz-mvPosition.xyz;
      vMallLampColor=texture2D(uMallRoomLamps,vec2((aMallRoom+.5)/64.,.75));
      vMallLampRange=roomLamp.w;`);
    s.fragmentShader='uniform sampler2D uMallProbe;uniform float uMallProbeGain;varying vec3 vMallLamp;varying vec4 vMallLampColor;varying float vMallLampRange;\n'+s.fragmentShader;
    s.fragmentShader=s.fragmentShader.replace('#include <opaque_fragment>',`
      float lampDistance=length(vMallLamp);
      vec3 lampDirection=vMallLamp/max(.001,lampDistance);
      float lampFalloff=pow(max(0.,1.-lampDistance/max(.001,vMallLampRange)),2.);
      float lampDiffuse=max(0.,dot(normal,lampDirection));
      vec3 lampHalf=normalize(lampDirection+normalize(vViewPosition));
      float lampSpecular=pow(max(0.,dot(normal,lampHalf)),mix(90.,8.,roughnessFactor));
      outgoingLight+=vMallLampColor.rgb*vMallLampColor.a*lampFalloff*(diffuseColor.rgb*(.12+.88*lampDiffuse)+lampSpecular*(.12+.3*metalnessFactor));
      vec3 mallR=inverseTransformDirection(reflect(-normalize(vViewPosition),normal),viewMatrix);
      vec2 mallOct=mallR.xz/(abs(mallR.x)+abs(mallR.y)+abs(mallR.z));
      if(mallR.y<0.)mallOct=(1.-abs(mallOct.yx))*sign(mallOct);
      outgoingLight+=texture2D(uMallProbe,mallOct*.5+.5).rgb*uMallProbeGain*(.2+.8*pow(1.-abs(dot(normalize(vViewPosition),normal)),3.));
      #include <opaque_fragment>`);
  };
  material.customProgramCacheKey=()=>`mall-room-lamps-v1-${gain}`;return material;
}
