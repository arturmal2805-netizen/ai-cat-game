import {yieldSceneTask} from './scene-tasks.js';
import * as T from 'three';
import {MALL_SURFACES,MALL_SIGNS_URL,MALL_SIGN_RECTS} from './mall-art-assets.js';
let prepared=null,request;
export const mallArt=()=>prepared;
export function prepareMallArt(){
  if(typeof window==='undefined'||typeof createImageBitmap!=='function')return Promise.resolve(false);
  return request??=(async()=>{
    const queue=[...Object.entries(MALL_SURFACES).flatMap(([kind,maps])=>Object.entries(maps).map(([role,url])=>({kind,role,url}))),{kind:'signs',role:'distance',url:MALL_SIGNS_URL}],created=[],data={};
    try{
      const results=await Promise.allSettled(Array.from({length:3},async()=>{while(queue.length){const {kind,role,url}=queue.shift(),response=await fetch(url);if(!response.ok)throw Error('Mall art unavailable');
        let bitmap=await createImageBitmap(await response.blob(),{imageOrientation:'none',colorSpaceConversion:'none',premultiplyAlpha:'none'});let t;if(kind==='signs'){const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;const ctx=canvas.getContext('2d');ctx.drawImage(bitmap,0,0);const rgba=ctx.getImageData(0,0,bitmap.width,bitmap.height).data,red=new Uint8Array(bitmap.width*bitmap.height);for(let start=0;start<red.length;start+=262144){const end=Math.min(red.length,start+262144);for(let i=start;i<end;i++)red[i]=rgba[i*4];await yieldSceneTask();}t=new T.DataTexture(red,bitmap.width,bitmap.height,T.RedFormat);bitmap.close();}else t=new T.Texture(bitmap);created.push(t);
        t.name=`Cat Mall ${kind} ${role}`;t.flipY=false;t.colorSpace=role==='color'?T.SRGBColorSpace:T.NoColorSpace;
        t.wrapS=t.wrapT=kind==='signs'?T.ClampToEdgeWrapping:T.RepeatWrapping;t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.anisotropy=4;t.userData.sharedScenery=true;
        if(kind==='signs')t.format=T.RedFormat;t.needsUpdate=true;(data[kind]||={})[role]=t;
      }}));
      if(results.some(r=>r.status==='rejected'))throw Error('Incomplete mall art');prepared={surfaces:data,signs:{texture:data.signs.distance,rects:MALL_SIGN_RECTS}};return true;
    }catch{for(const t of created){t.dispose();t.image?.close?.();}return false;}
  })();
}
export function mallSignMaterial(texture){return new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,vertexColors:true,
  uniforms:{uLetters:{value:texture}},vertexShader:'varying vec2 v;varying vec3 ink;void main(){v=uv;ink=color;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'uniform sampler2D uLetters;varying vec2 v;varying vec3 ink;void main(){float d=texture2D(uLetters,v).r;float w=max(.002,fwidth(d)*.8);float core=smoothstep(.5-w,.5+w,d);float glow=smoothstep(.18,.5,d)*.19;gl_FragColor=vec4(ink*(1.+core*.3),max(core,glow));}',
});}
