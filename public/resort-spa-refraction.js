import * as T from 'three';
// V11 SPA-only screen refraction: copy the current opaque framebuffer once,
// immediately before the first visible SPA water draw. No second scene render,
// per-pool target, CPU pixel readback or reference-image stand-in.
export function createSpaRefraction(root){
 const pixels=new T.Vector2(),materials=new Set(),hooks=[],fallback=new T.DataTexture(new Uint8Array([0,0,0,255]),1,1);fallback.needsUpdate=true;
 let texture=null,width=0,height=0,frame=-1,camera=null,disposed=false;
 const stats={enabled:true,copies:0,sceneRenders:0,textureBytes:4,resizes:0};
 root.traverse(mesh=>{const m=mesh.material;if(!mesh.isMesh||!m?.uniforms?.uSpaRefractionReady)return;materials.add(m);const previous=mesh.onBeforeRender;
  mesh.onBeforeRender=function(renderer,scene,view,...args){previous.call(this,renderer,scene,view,...args);if(disposed)return;
   // Warmup and reflection authoring use render targets/linear output. Keep
   // their original optical fallback; never sample a differently encoded frame.
   if(!stats.enabled||renderer.getRenderTarget()||renderer.outputColorSpace!==T.SRGBColorSpace){m.uniforms.uSpaRefractionReady.value=0;return;}
   const current=renderer.info.render.frame;if(current===frame&&view===camera)return;
   renderer.getDrawingBufferSize(pixels);const w=Math.floor(pixels.x),h=Math.floor(pixels.y);if(w<1||h<1)return;
   if(w!==width||h!==height){texture?.dispose();texture=new T.FramebufferTexture(w,h);texture.name='SPA one opaque framebuffer copy';texture.colorSpace=T.NoColorSpace;texture.minFilter=texture.magFilter=T.LinearFilter;width=w;height=h;stats.resizes++;stats.textureBytes=w*h*4;for(const material of materials){material.uniforms.uSpaSceneColor.value=texture;material.uniforms.uSpaViewport.value.set(w,h);}}
   renderer.copyFramebufferToTexture(texture);frame=current;camera=view;stats.copies++;for(const material of materials)material.uniforms.uSpaRefractionReady.value=1;
  };hooks.push([mesh,previous]);m.uniforms.uSpaSceneColor.value=fallback;
 });
 return{stats,dispose(){if(disposed)return;disposed=true;for(const[mesh,previous]of hooks)mesh.onBeforeRender=previous;for(const m of materials){m.uniforms.uSpaRefractionReady.value=0;m.uniforms.uSpaSceneColor.value=null;}texture?.dispose();fallback.dispose();stats.textureBytes=0;}};
}
