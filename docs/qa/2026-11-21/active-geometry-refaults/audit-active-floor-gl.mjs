import assert from 'node:assert/strict';import{writeFile}from'node:fs/promises';import{join}from'node:path';
export async function auditActiveFloorGl({page,review}){
 const result=await page.evaluate(()=>{
  const q=__lagoonQA,T=q.THREE; q.freeze=true;
  const renderer=new T.WebGLRenderer({antialias:true,alpha:false});renderer.setSize(64,64);renderer.setPixelRatio(1);
  const gl=renderer.getContext(),uploads=q.trackUploads(gl),camera=new T.PerspectiveCamera(40,1,.1,30);camera.position.set(0,0,14);camera.lookAt(0,0,0);
  const references=[new Uint8Array(64*64*4),new Uint8Array(64*64*4)],pixels=new Uint8Array(64*64*4),rows=[];
  try{for(const[role,factory]of [['baseline',globalThis.__baselineGeometryResidencyFactory],['candidate',q.geometryResidencyFactory]]){
   let now=0;const scene=new T.Scene(),meshes=Array.from({length:10},(_,i)=>new T.Mesh(new T.BoxGeometry(),new T.MeshBasicMaterial({color:[0xe4b3dc,0xa2d8ce,0xc4b2e7,0xf3dc9d,0x8dc9e1][i%5]})));
   meshes.forEach((m,i)=>{if(i<8)m.position.set((i%4)*2-3,i<4?-1.2:1.2,0);else m.position.z=.5;});scene.add(...meshes);
   const g=meshes[0].geometry,bytes=[g.index,...Object.values(g.attributes)].reduce((n,a)=>n+a.array.byteLength,0),cache=factory(renderer,{budget:3*bytes,refaultBudget:bytes,activeGrace:250,grace:10000,clock:()=>now});
   uploads.clear();let changed=0,lateStart;
   for(let frame=1;frame<=180;frame++){
    now=frame*40;const active=Math.floor((frame-1)/10)%2;meshes[8].visible=active===0;meshes[9].visible=active===1;
    renderer.render(scene,camera);cache.sweep(now);gl.readPixels(0,0,64,64,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
    if(role==='baseline'&&(frame===1||frame===11))references[active].set(pixels);
    else for(let i=0;i<pixels.length;i++)if(pixels[i]!==references[active][i])changed++;
    if(frame===40)lateStart=uploads.snapshot();
   }
   const transfers=uploads.snapshot(),stats={...cache.stats};now=30000;cache.sweep(now);
   rows.push({role,changed,bytesPerGeometry:bytes,transfers,lateDataBytes:transfers.dataBytes-lateStart.dataBytes,cache:stats,afterAbandon:cache.stats.bytes});cache.dispose();
   for(const m of meshes){m.geometry.dispose();m.material.dispose();}
  }
  return{rows,error:gl.getError(),contextLost:gl.isContextLost(),gameDpr:q.renderer.getPixelRatio(),scope:'Real isolated64x64GPU allocation/pixel proof; actual game remainsDPR2. Not hardwareFPS.'};
  }finally{uploads.dispose();renderer.dispose();q.freeze=false;q.gpuFrames.clear();}
 });
 await writeFile(join(review,'active-floor-gl.json'),JSON.stringify(result,null,2));const[a,b]=result.rows;
 assert.equal(result.error,0);assert.equal(result.contextLost,false);assert.equal(result.gameDpr,2);assert.equal(a.changed,0);assert.equal(b.changed,0);
 assert(a.cache.rapidRefaults>=10);assert.equal(b.cache.rapidRefaults,2);assert.equal(b.lateDataBytes,0);assert(a.lateDataBytes>0);
 assert.equal(a.cache.peakBytes,b.cache.peakBytes);assert(b.afterAbandon<=3*b.bytesPerGeometry);
 console.log('ACTIVE_FLOOR_GL_PASS',JSON.stringify(result));
}
