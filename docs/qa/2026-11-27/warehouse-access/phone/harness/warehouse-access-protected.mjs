import {writeFile}from'node:fs/promises';import{join}from'node:path';
export async function waterfrontProtected({page,review,errors,httpErrors}){
 await page.evaluate(async()=>{const q=__lagoonQA;q.drawPaused=true;q.reviewHour=12;document.querySelector('[data-biome="autumn"]').click();await Promise.all([q.mall().ensure(),q.resortSpa().ensure()]);});
 await page.waitForFunction(()=>__lagoonQA.mall().ready&&__lagoonQA.resortSpa().ready&&!__lagoonQA.islands.get('autumn').userData.lowOnly&&__lagoonQA.shaderWarmup.idle(),null,{timeout:600000});
 // Directional lights follow the island camera target. Compare them at the
 // same released target, rather than the newly widened overview centre.
 await page.evaluate(()=>{const q=__lagoonQA;q.freeze=false;q.manualFrames=true;q.drawPaused=true;q.look.set(800,-55,900);q.desiredLook.copy(q.look);q.terrainClock=7;q.manualStepping=true;try{q.step(performance.now()+100);}finally{q.manualStepping=false;}});
 const report=await page.evaluate(async()=>{
  const q=__lagoonQA,T=q.THREE;q.manualFrames=true;q.freeze=true;q.mall().exit(false);q.resortSpa().exit(false);const island=q.islands.get('autumn'),roots={mall:q.mall().root,spa:q.resortSpa().root,warehouse:island.userData.ocean.warehouse};
  const digest=async a=>{const b=a.isInterleavedBufferAttribute?a.data.array:a.array;const bytes=new Uint8Array(b.buffer,b.byteOffset,b.byteLength);return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');};
  const geometries=new Map(),materials=new Map(),out={};
  // Native moving fish and approved service rigs are sampled at one explicit
  // animation time in BOTH the historical source and candidate. Source mesh
  // buffers, materials, root transforms and the complete hierarchy remain exact.
  q.mall().root.userData.update?.(7,false);q.resortSpa().root.userData.update?.(7,false);
  for(const root of Object.values(roots)){root.traverse(o=>{if(o.userData.referenceFamily||o.userData.reference){q.setCatMood(o,'happy',{immediate:true});q.animateCat(o,7,false,false);}});root.updateWorldMatrix(true,true);root.traverse(o=>{if(o.isSkinnedMesh)o.skeleton?.update();});}

  for(const[key,root]of Object.entries(roots)){
   root.updateWorldMatrix(true,true);const nodes=[];root.traverse(o=>nodes.push(o));const hierarchy=[];
   for(const o of nodes){let geometry=null,material=null;
    if(o.geometry){if(!geometries.has(o.geometry)){const g=o.geometry,attributes={};for(const[n,a]of Object.entries(g.attributes))attributes[n]={count:a.count,itemSize:a.itemSize,normalized:a.normalized,type:(a.isInterleavedBufferAttribute?a.data.array:a.array).constructor.name,sha256:await digest(a)};geometries.set(g,{attributes,index:g.index?{count:g.index.count,sha256:await digest(g.index)}:null,groups:g.groups});}geometry=geometries.get(o.geometry);}
    if(o.material){const list=Array.isArray(o.material)?o.material:[o.material];material=list.map(m=>{if(!materials.has(m))materials.set(m,{type:m.type,color:m.color?.getHex(),emissive:m.emissive?.getHex(),emissiveIntensity:m.emissiveIntensity,opacity:m.opacity,transparent:m.transparent,roughness:m.roughness,metalness:m.metalness,side:m.side,depthWrite:m.depthWrite,vertexColors:m.vertexColors,blending:m.blending,vertexShader:m.vertexShader,fragmentShader:m.fragmentShader,mapSize:m.map?.image?[m.map.image.width,m.map.image.height]:null});return materials.get(m);});}
    hierarchy.push({name:o.name,type:o.type,parent:nodes.indexOf(o.parent),position:o.position.toArray(),rotation:o.rotation.toArray(),scale:o.scale.toArray(),geometry,material});
   }
   const b=new T.Box3().setFromObject(root,true);out[key]={position:root.position.toArray(),rotation:root.rotation.toArray(),scale:root.scale.toArray(),matrixWorld:root.matrixWorld.toArray(),bounds:{min:b.min.toArray(),max:b.max.toArray()},hierarchy};
  }
  return{buildings:out,lights:q.scene.children.filter(o=>o.isLight).map(o=>({type:o.type,color:o.color.getHex(),intensity:o.intensity,position:o.position.toArray()})),dpr:q.renderer.getPixelRatio(),toneMapping:q.renderer.toneMapping,shadowType:q.renderer.shadowMap.type,fog:{color:q.scene.fog.color.getHex(),near:q.scene.fog.near,far:q.scene.fog.far},errors:[]};
 });
 await writeFile(join(review,'protected-buildings.json'),JSON.stringify({...report,errors,httpErrors},null,2));console.log('Protected buildings baseline captured',Object.fromEntries(Object.entries(report.buildings).map(([k,v])=>[k,{nodes:v.hierarchy.length,bounds:v.bounds}])));
}
