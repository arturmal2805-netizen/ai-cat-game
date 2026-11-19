import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
// Authoring-only readback: verify uploaded array layers before judging art.
export async function auditSpaReflections({page,review}){
 const result=await page.evaluate(async()=>{
  const q=__lagoonQA,T=q.THREE,r=q.renderer,basins=q.resortSpa().root.userData.basins,texture=basins[0].userData.surface.material.uniforms.uSpaWaterProbe?.value;
  if(!texture?.isDataArrayTexture)throw Error('SPA reflection fell back instead of loading the verified array');
  const image=texture.image,hash=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
  const old={manualFrames:q.manualFrames,drawPaused:q.drawPaused,target:r.getRenderTarget(),viewport:r.getViewport(new T.Vector4()),scissor:r.getScissor(new T.Vector4()),scissorTest:r.getScissorTest(),toneMapping:r.toneMapping,outputColorSpace:r.outputColorSpace};
  const target=new T.WebGLRenderTarget(image.width,image.height,{type:T.UnsignedByteType,depthBuffer:false}),scene=new T.Scene(),camera=new T.OrthographicCamera(-1,1,1,-1,0,1),geometry=new T.PlaneGeometry(2,2),material=new T.ShaderMaterial({uniforms:{uArray:{value:texture},uLayer:{value:0}},vertexShader:'varying vec2 vUV;void main(){vUV=position.xy*.5+.5;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:'uniform highp sampler2DArray uArray;uniform float uLayer;varying vec2 vUV;void main(){gl_FragColor=texture(uArray,vec3(vUV,uLayer));}',toneMapped:false,depthWrite:false,depthTest:false});scene.add(new T.Mesh(geometry,material));const layers=[];
  try{
   q.manualFrames=true;q.drawPaused=false;r.toneMapping=T.NoToneMapping;r.outputColorSpace=T.LinearSRGBColorSpace;
   for(const layer of [0,3,7,10,14]){material.uniforms.uLayer.value=layer;r.setRenderTarget(target);r.render(scene,camera);const bytes=new Uint8Array(image.width*image.height*4);r.readRenderTargetPixels(target,0,0,image.width,image.height,bytes);const expected=image.data.subarray(layer*bytes.length,(layer+1)*bytes.length);let maximum=0;for(let i=0;i<bytes.length;i++)maximum=Math.max(maximum,Math.abs(bytes[i]-expected[i]));layers.push({layer,maximumByteError:maximum,sha256:await hash(bytes),expectedSha256:await hash(expected)});}
   return{layers,rawSha256:await hash(image.data),dimensions:[image.width,image.height,image.depth],colorSpace:texture.colorSpace,flipY:texture.flipY,mipmaps:texture.generateMipmaps,sourceHead:texture.userData.sourceHead,glError:r.getContext().getError(),poolLayers:basins.map(b=>b.userData.surface.material.uniforms.uSpaWaterLayer?.value)};
  }finally{q.manualFrames=old.manualFrames;q.drawPaused=old.drawPaused;r.setRenderTarget(old.target);r.setViewport(old.viewport);r.setScissor(old.scissor);r.setScissorTest(old.scissorTest);r.toneMapping=old.toneMapping;r.outputColorSpace=old.outputColorSpace;geometry.dispose();material.dispose();target.dispose();}
 });
 await writeFile(join(review,'actual-reflection-array.json'),JSON.stringify(result,null,2));
 assert.deepEqual(result.dimensions,[128,128,15]);assert.equal(result.rawSha256,'74df01edbe5923cea6b3105f7056c7a8f58a68928f9ba14d081840a1320de679');assert.equal(result.glError,0);
 for(const layer of result.layers)assert.equal(layer.maximumByteError,0,'actual array sampling changed byte order, color space or layer');
 assert.equal(result.poolLayers.length,21);assert(result.poolLayers.every(n=>Number.isInteger(n)&&n>=0&&n<15));assert(result.poolLayers.includes(14));
 console.log('PASS native SPA array reflection decode, GLSL sampling/readback, 21 pool profiles and exact linear bytes');
}
