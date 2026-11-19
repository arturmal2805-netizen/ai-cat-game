import * as T from 'three';
import {SPA_PROBE} from './resort-spa-probe-assets.js';
import {unpackSpaProbeSheet,verifySpaProbeBytes} from './resort-spa-probe-data.js';
// One selected-only coalesced decode, no runtime cameras/targets or frame uploads.
export function createSpaReflectionLoader({fetchSheet,decodeSheet,verify=verifySpaProbeBytes,manifest=SPA_PROBE}){
 let texture=null,request,status='unprepared';
 return {get:()=>texture?{texture,gain:manifest.gain,revision:manifest.revision}:null,status:()=>status,
  prepare(){return request??=(async()=>{status='loading';try{
   const bytes=await fetchSheet(manifest.url);await verify(bytes,manifest.assetSha256);
   const image=await decodeSheet(bytes),data=unpackSpaProbeSheet(image,manifest);
   await verify(data,manifest.rgbaSha256);
   const candidate=new T.DataArrayTexture(data,manifest.size,manifest.size,manifest.layers);
   candidate.name='Actual native SPA room reflections · linear radiance / 4';
   candidate.colorSpace=T.NoColorSpace;candidate.flipY=false;candidate.magFilter=T.LinearFilter;
   candidate.minFilter=T.LinearMipmapLinearFilter;candidate.generateMipmaps=true;
   candidate.userData.sharedScenery=true;candidate.userData.sourceHead=manifest.sourceHead;
   candidate.needsUpdate=true;texture=candidate;status='ready';return true;
  }catch{status='fallback';return false;}})();}
 };
}
const loader=createSpaReflectionLoader({
 async fetchSheet(url){const response=await fetch(url,{signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('SPA reflection unavailable');return new Uint8Array(await response.arrayBuffer());},
 async decodeSheet(bytes){let bitmap;try{
  bitmap=await createImageBitmap(new Blob([bytes],{type:'image/png'}),{imageOrientation:'none',colorSpaceConversion:'none',premultiplyAlpha:'none'});
  const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;
  const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)throw Error('SPA reflection decoder unavailable');
  context.drawImage(bitmap,0,0);return{data:context.getImageData(0,0,bitmap.width,bitmap.height).data,width:bitmap.width,height:bitmap.height};
 }finally{bitmap?.close();}}
});
export const resortReflections=()=>loader.get();
export const resortReflectionStatus=()=>loader.status();
export function prepareResortReflections(){
 if(typeof window==='undefined'||typeof createImageBitmap!=='function')return Promise.resolve(false);
 return loader.prepare();
}
export function applyResortWaterReflection(material,layer){
 const probe=resortReflections();if(!probe)return false;
 if(!Number.isInteger(layer)||layer<0||layer>=SPA_PROBE.layers)throw Error('Invalid SPA reflection layer');
 const lookup='texture2D(uWaterEnvironment,environmentUv(reflected),waterProbeLod)';
 if(!material.fragmentShader.includes(lookup))throw Error('SPA water reflection hook changed');
 material.fragmentShader='uniform highp sampler2DArray uSpaWaterProbe;uniform float uSpaWaterLayer;\n'+material.fragmentShader.replace(lookup,'texture(uSpaWaterProbe,vec3(environmentUv(reflected),uSpaWaterLayer),waterProbeLod)');
 material.uniforms.uSpaWaterProbe={value:probe.texture};material.uniforms.uSpaWaterLayer={value:layer};
 material.uniforms.uWaterEnvironmentGain.value=probe.gain;material.needsUpdate=true;return true;
}
export function applyResortFinishReflection(shader,probe){
 if(!probe)return;
 const lookup='texture2D(uMallProbe,mallOct*.5+.5,roughnessFactor*3.)';
 if(!shader.fragmentShader.includes(lookup))throw Error('SPA finish reflection hook changed');
 shader.uniforms.uSpaRoomProbe={value:probe.texture};shader.uniforms.uMallProbeGain.value=probe.gain*.8;
 // Each authored room reserves exactly four existing lamp IDs, starting at1.
 shader.vertexShader='varying float vSpaProbeLayer;\n'+shader.vertexShader;
 shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\n vSpaProbeLayer=clamp(floor((aMallRoom-1.)/4.),0.,13.);');
 shader.fragmentShader='uniform highp sampler2DArray uSpaRoomProbe;varying float vSpaProbeLayer;\n'+shader.fragmentShader.replace(lookup,'texture(uSpaRoomProbe,vec3(mallOct*.5+.5,vSpaProbeLayer),roughnessFactor*3.)');
}
