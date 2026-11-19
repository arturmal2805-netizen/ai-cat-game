import {SPA_V7_ZONES} from '../public/resort-spa-services-v7.js';
import {SPA_PALACE as P} from '../public/resort-spa-layout-v7.js';
// Offline authoring only. Capture the actual prepared private game scene;
// never called from production and never adds gameplay render targets.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {deflateSync,gzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {RESORT_ZONES,resortSpaOrigin,RESORT_SPA as S} from '../public/resort-spa-data.js';
import {byBiome} from '../public/game-data.js';

const zones=process.env.CHICHI_SPA_V7_MASS_AUDIT?SPA_V7_ZONES:RESORT_ZONES,size=128,columns=4,rows=Math.ceil((zones.length+1)/columns),sha=data=>createHash('sha256').update(data).digest('hex');
const crcTable=Array.from({length:256},(_,i)=>{let n=i;for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function chunk(type,bytes){const t=Buffer.from(type),s=Buffer.alloc(4);s.writeUInt32BE(bytes.length);let n=0xffffffff;for(const x of Buffer.concat([t,bytes]))n=crcTable[(n^x)&255]^(n>>>8);const c=Buffer.alloc(4);c.writeUInt32BE((n^0xffffffff)>>>0);return Buffer.concat([s,t,bytes,c]);}
function png(bytes,width,height){const h=Buffer.alloc(13);h.writeUInt32BE(width,0);h.writeUInt32BE(height,4);h[8]=8;h[9]=6;const rows=Buffer.alloc((width*4+1)*height);for(let y=0;y<height;y++)rows.set(bytes.subarray(y*width*4,(y+1)*width*4),y*(width*4+1)+1);return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',h),chunk('IDAT',deflateSync(rows,{level:9})),chunk('IEND',Buffer.alloc(0))]);}
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}),workspaceState=()=>sha(git('rev-parse','HEAD')+git('diff','HEAD','--binary')+git('status','--porcelain=v1'));

export async function bakeResortNativeProbes({page,review,errors=[]}){
 const folder=join(review,'probes');await mkdir(folder,{recursive:true});const before=workspaceState(),sourceFiles=JSON.parse(await readFile(join(review,'source-files.json'),'utf8')),build=JSON.parse(await readFile(join(review,'qa-build.json'),'utf8'));
 const centre=resortSpaOrigin(byBiome('autumn').center),specs=zones.map(z=>({id:z.id,x:z.x,y:z.y+1.4,z:z.z+(z.key==='cafe'?13:0),target:{x:z.x,y:z.y+2,z:z.z}}));specs.push({id:'resort-sky-pool',x:0,y:S.y+(process.env.CHICHI_SPA_V7_MASS_AUDIT?P.rise*2+1.2:19.2),z:203,target:{x:0,y:S.y+(process.env.CHICHI_SPA_V7_MASS_AUDIT?P.rise*2+1.3:19.3),z:203}});
 // The ready promise may settle between frames, while the selected world's
 // visibility is still paused for preparation. Await an actual revealed frame;
 // do not force a hidden root visible or bake the loading representation.
 await page.evaluate(()=>{const q=__lagoonQA;q.targetFrames=q.frames+1;q.drawPaused=false;q.gpuFrames.clear();});
 await page.waitForFunction(()=>__lagoonQA.frames>=__lagoonQA.targetFrames&&__lagoonQA.resortSpa().root.visible,null,{timeout:240000});
 await page.evaluate(()=>{__lagoonQA.drawPaused=true;});
 // Keep the renderer and real static scene intact after the offline operation.
 await page.evaluate(()=>{const q=__lagoonQA;q.probeSaved={manualFrames:q.manualFrames,drawPaused:q.drawPaused};q.manualFrames=true;q.drawPaused=true;q.gpuFrames.clear();});
 const layers=[],captures=[];
 try{
  for(let layer=0;layer<specs.length;layer++){
   const spec=specs[layer];console.log('Offline SPA actual-scene probe',layer,spec.id);
   const result=await page.evaluate(({spec,centre,size})=>{
    const q=__lagoonQA,T=q.THREE,r=q.renderer,scene=q.scene,root=q.resortSpa().root,saved=[],hidden=new Set(),old={drawPaused:q.drawPaused,toneMapping:r.toneMapping,outputColorSpace:r.outputColorSpace,target:r.getRenderTarget(),viewport:r.getViewport(new T.Vector4()),scissor:r.getScissor(new T.Vector4()),scissorTest:r.getScissorTest(),autoReset:r.info.autoReset};
    const hide=o=>{if(!o||hidden.has(o))return;hidden.add(o);saved.push([o,o.visible]);o.visible=false;};
    // Characters and moving aquarium fish must not become permanent ghosts.
    hide(q.chichiCarrier);for(const n of q.npcs.values())hide(n.carrier);
    scene.traverse(o=>{if(o.isSkinnedMesh||o.userData?.body&&o.userData?.legs||o.name?.startsWith('SPA aquarium ')||o.name?.startsWith('SPA dynamic jacuzzi '))hide(o);if(o.isMesh&&o.material?.uniforms?.uWaterField)hide(o);});
    const cube=new T.WebGLCubeRenderTarget(size,{type:T.HalfFloatType,generateMipmaps:true,minFilter:T.LinearMipmapLinearFilter}),camera=new T.CubeCamera(.1,500,cube),target=new T.WebGLRenderTarget(size,size,{type:T.UnsignedByteType}),packScene=new T.Scene(),packCamera=new T.OrthographicCamera(-1,1,1,-1,0,1),geometry=new T.PlaneGeometry(2,2),material=new T.ShaderMaterial({uniforms:{uCube:{value:cube.texture}},vertexShader:'varying vec2 vProbeUv;void main(){vProbeUv=position.xy*.5+.5;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:'uniform samplerCube uCube;varying vec2 vProbeUv;void main(){vec2 p=vProbeUv*2.-1.;vec3 d=vec3(p.x,1.-abs(p.x)-abs(p.y),p.y);if(d.y<0.)d.xz=(1.-abs(d.zx))*sign(d.xz+vec2(.00001));gl_FragColor=vec4(clamp(textureCube(uCube,normalize(d)).rgb/4.,0.,1.),1.);}',toneMapped:false,depthTest:false,depthWrite:false});packScene.add(new T.Mesh(geometry,material));
    const sun=scene.children.find(o=>o.isDirectionalLight&&o.castShadow),sunPosition=sun?.position.clone(),sunTarget=sun?.target.position.clone();
    const started=performance.now();
    try{
     // manualFrames already pauses the world simulation. The QA renderer's
     // separate drawPaused wrapper must allow our explicit offscreen draws.
     q.drawPaused=false;r.toneMapping=T.NoToneMapping;r.outputColorSpace=T.LinearSRGBColorSpace;r.info.autoReset=false;r.info.reset();
     if(sun){sun.position.set(centre[0]+spec.target.x-14,35,centre[1]+spec.target.z+20);sun.target.position.set(centre[0]+spec.target.x,spec.target.y,centre[1]+spec.target.z);sun.updateWorldMatrix(true,false);sun.target.updateWorldMatrix(true,false);}
     camera.position.set(centre[0]+spec.x,spec.y,centre[1]+spec.z);camera.updateMatrixWorld(true);scene.updateMatrixWorld(true);camera.update(r,scene);r.setRenderTarget(target);r.render(packScene,packCamera);const data=new Uint8Array(size*size*4);r.readRenderTargetPixels(target,0,0,size,size,data);
     return{data:Array.from(data),eye:camera.position.toArray(),milliseconds:performance.now()-started,render:{...r.info.render},memory:{...r.info.memory},hiddenDynamicAndWater:hidden.size,rootVisible:root.visible,sceneVisible:scene.visible,cameraMask:camera.layers.mask,nativeCameraMask:q.camera.layers.mask,glError:r.getContext().getError(),lights:scene.children.filter(o=>o.isLight).map(o=>({type:o.type,color:o.color.getHex(),intensity:o.intensity,position:o.position.toArray()})),fog:scene.fog?{color:scene.fog.color.getHex(),density:scene.fog.density}:null};
    }finally{
     if(sun){sun.position.copy(sunPosition);sun.target.position.copy(sunTarget);sun.updateWorldMatrix(true,false);sun.target.updateWorldMatrix(true,false);}
     q.drawPaused=old.drawPaused;r.toneMapping=old.toneMapping;r.outputColorSpace=old.outputColorSpace;r.info.autoReset=old.autoReset;r.setRenderTarget(old.target);r.setViewport(old.viewport);r.setScissor(old.scissor);r.setScissorTest(old.scissorTest);for(const[o,v]of saved)o.visible=v;geometry.dispose();material.dispose();cube.dispose();target.dispose();
    }
   },{spec,centre,size});
   const bytes=Buffer.from(result.data);delete result.data;assert.equal(bytes.length,size*size*4);const file=png(bytes,size,size),name=spec.id+'.png';await writeFile(join(folder,name),file);
   if(result.render.calls<2||!bytes.some((n,i)=>i%4!==3&&n>10)||errors.length){await writeFile(join(folder,'FAILED-capture.json'),JSON.stringify({spec,layer,...result,firstPixels:[...bytes.subarray(0,64)],errors},null,2));assert.fail('Actual room radiance/draw work is empty or GPU errors occurred: '+errors.join('\n'));}
   layers.push(bytes);captures.push({...spec,layer,png:name,pngSha256:sha(file),rgbaSha256:sha(bytes),...result});await writeFile(join(folder,'capture-progress.json'),JSON.stringify(captures,null,2));
  }
 }finally{await page.evaluate(()=>{const q=__lagoonQA;q.manualFrames=q.probeSaved.manualFrames;q.drawPaused=q.probeSaved.drawPaused;delete q.probeSaved;});}
 assert.equal(workspaceState(),before,'source changed during native capture; keep evidence but do not promote probe');
 const atlas=Buffer.alloc(size*columns*size*rows*4);for(let layer=0;layer<layers.length;layer++)for(let y=0;y<size;y++){const start=(((Math.floor(layer/columns)*size+y)*columns*size)+(layer%columns)*size)*4;atlas.set(layers[layer].subarray(y*size*4,(y+1)*size*4),start);}
 const raw=Buffer.concat(layers),sheet=png(atlas,size*columns,size*rows),asset='spa-interiors-'+sha(sheet).slice(0,12)+'.png';await writeFile(join(folder,asset),sheet);await writeFile(join(folder,'probe-layers.rgba.gz'),gzipSync(raw));
 const resourcePaths=await page.evaluate(()=>[...new Set(performance.getEntriesByType('resource').map(x=>new URL(x.name).pathname).filter(p=>p.includes('/art/')))].sort()),assets={};for(const resource of resourcePaths){const relative=resource.replace(/^.*?\/art\//,'art/'),path=resolve('public',relative);assert(path.startsWith(resolve('public')+'/'));assets[relative]=sha(await readFile(path));}
 const producer=sha(await readFile(new URL(import.meta.url))),revision=sha(JSON.stringify({sourceFiles,assets,producer,specs,size,encoding:'linear-radiance-div4-bottom-row-first'}));
 const manifest={format:'chichi-spa-scene-probes',version:1,sourceHead:build.head,sourceDirty:build.dirty,qaBundleSha256:build.sha256,producerSha256:producer,revision,size,layers:specs.length,columns,rows,asset,assetSha256:sha(sheet),rgbaSha256:sha(raw),encoding:'linear-radiance-div4-bottom-row-first',colorSpace:'NoColorSpace',gain:4,scope:'Offline actual private game static scene; moving native cats/SPA fish and water masked. No gameplay cube captures. Not a final mirror/phone FPS claim.',captures,sourceFiles,assets};await writeFile(join(folder,'manifest.json'),JSON.stringify(manifest,null,2));console.log('PASS offline actual SPA probes',specs.length,'layers,',sheet.length,'PNG bytes, raw SHA256',manifest.rgbaSha256);
 return manifest;
}
