import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve('.'),review=resolve(process.env.CHICHI_REVIEW_DIR||'/workspace/qa/meadow-packing-native');
await mkdir(review,{recursive:true});
const spec=JSON.parse(await readFile('docs/assets/meadow-turf-packed.json','utf8'));
const paths=[spec.inputs[0].path,spec.inputs[1].path,spec.path],assets=new Map();
for(let i=0;i<paths.length;i++)assets.set('/map-'+i,await readFile(join(root,paths[i])));
const source=`<canvas width="2" height="2"></canvas><script type="module">
window.check=async()=>{
 const gl=document.querySelector('canvas').getContext('webgl2'),levels=[],data=[];
 if(!gl)throw Error('WebGL2 unavailable');
 const fb=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,fb);
 for(let i=0;i<3;i++){
  const response=await fetch('/map-'+i),bitmap=await createImageBitmap(await response.blob(),{imageOrientation:'flipY',colorSpaceConversion:'none',premultiplyAlpha:'none'});
  const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,gl.RGBA,gl.UNSIGNED_BYTE,bitmap);gl.generateMipmap(gl.TEXTURE_2D);
  const images=[];for(let n=bitmap.width,level=0;n>=1;n>>=1,level++){
   gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,level);
   if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('Incomplete mip target');
   const bytes=new Uint8Array(n*n*4);gl.readPixels(0,0,n,n,gl.RGBA,gl.UNSIGNED_BYTE,bytes);images.push(bytes);
  }data.push(images);gl.deleteTexture(texture);bitmap.close();
 }
 for(let level=0;level<data[0].length;level++){
  let changed=0,maxDelta=0;for(let i=0;i<data[0][level].length;i+=4){let different=false;for(let c=0;c<4;c++){const expected=c===3?data[1][level][i]:data[0][level][i+c],actual=data[2][level][i+c],d=Math.abs(expected-actual);maxDelta=Math.max(maxDelta,d);different ||=d>0;}if(different)changed++;}
  levels.push({level,pixels:data[0][level].length/4,changed,maxDelta});
 }
 const ext=gl.getExtension('WEBGL_debug_renderer_info');const renderer=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);
 const error=gl.getError();gl.deleteFramebuffer(fb);return {levels,renderer,error,contextLost:gl.isContextLost()};
};window.ready=true;</script>`;
const server=createServer((req,res)=>{if(assets.has(req.url)){res.writeHead(200,{'Content-Type':'application/octet-stream'});res.end(assets.get(req.url));}else if(req.url==='/favicon.ico'){res.writeHead(204);res.end();}else{res.writeHead(200,{'Content-Type':'text/html'});res.end(source);}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 const {chromium}=createRequire(import.meta.url)(process.env.CHICHI_PLAYWRIGHT_MODULE||'playwright');
 browser=await chromium.launch({executablePath:process.env.CHICHI_CHROMIUM,headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.ready);
 const result=await page.evaluate(()=>window.check());
 await writeFile(join(review,'packing-results.json'),JSON.stringify({completed:result.levels.every(l=>l.changed===0)&&!result.error&&!errors.length,inputs:paths.map((path,i)=>({path,sha256:createHash('sha256').update(assets.get('/map-'+i)).digest('hex')})),...result,errors},null,2));
 assert.deepEqual(errors,[]);assert.equal(result.error,0);assert.equal(result.contextLost,false);assert.equal(result.levels.length,11);for(const level of result.levels){assert.equal(level.changed,0);assert.equal(level.maxDelta,0);}
 console.log('PASS: actual browser decode and all 11 GPU mip levels preserve every normal RGB and roughness value.');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
