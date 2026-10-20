// Actual colour/depth equivalence, including moving casters and invalidation.
import { build } from "esbuild";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const { chromium } = createRequire(import.meta.url)(process.env.CHICHI_PLAYWRIGHT_MODULE || "playwright");
const output = await build({ stdin: {resolveDir: process.cwd(), loader: "js", contents: `
import * as T from 'three';import {createShadowDepthCache}from'./public/shadow-depth-cache.js';
const r=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});r.setPixelRatio(2);r.setSize(390,560);r.shadowMap.enabled=true;r.shadowMap.type=T.PCFShadowMap;document.body.append(r.domElement);
const s=new T.Scene();s.background=new T.Color(0xaabbdd);s.add(new T.HemisphereLight(0xffeedb,0x8b9e85,1.2));const l=new T.DirectionalLight(0xffd8b7,2.2);l.position.set(-10,20,8);l.castShadow=true;l.shadow.mapSize.set(1024,1024);l.shadow.camera.left=l.shadow.camera.bottom=-20;l.shadow.camera.right=l.shadow.camera.top=20;l.shadow.bias=-.0005;s.add(l,l.target);
const ground=new T.Mesh(new T.PlaneGeometry(45,45),new T.MeshStandardMaterial({color:0xaac58f}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;s.add(ground);
const boxes=[];for(let i=0;i<100;i++){const b=new T.Mesh(new T.BoxGeometry(1,2,1),new T.MeshStandardMaterial({color:0xbbeedd,side:i%2?T.FrontSide:T.DoubleSide}));b.userData.staticModel=true;b.position.set(i%10*2-9,1,Math.floor(i/10)*2-9);b.castShadow=b.receiveShadow=true;s.add(b);boxes.push(b);}
const moving=new T.Mesh(new T.SphereGeometry(1,20,14),new T.MeshStandardMaterial({color:0xeebb88}));moving.position.set(0,2,0);moving.castShadow=true;s.add(moving);
const c=new T.PerspectiveCamera(40,390/560,.5,150);c.position.set(26,28,38);c.lookAt(0,0,0);const cache=createShadowDepthCache(r,s,l,{minTriangles:0}),gl=r.getContext();
window.audit=()=>{const rows=[],a=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4),b=new Uint8Array(a.length);const read=p=>gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,p);const draw=()=>r.render(s,c);const warm=()=>{cache.setEnabled(true);for(let i=0;i<4;i++)draw();};
 const compare=name=>{draw();read(b);const fast={...r.info.render},stats={...cache.stats};cache.setEnabled(false);draw();read(a);let changed=0,max=0;for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-b[i]);if(d){changed++;max=Math.max(max,d);}}rows.push({name,changed,max,native:{...r.info.render},fast,stats});warm();};
 warm();compare('stationary');moving.position.x+=2;compare('animated caster moves');boxes[0].position.x+=3;compare('static object moved');boxes[1].visible=false;compare('static object hidden');boxes[2].removeFromParent();compare('static object removed');boxes[3].material.side=T.BackSide;compare('different native depth sides');c.position.x-=9;c.lookAt(0,0,0);compare('camera orbit');l.position.x+=1;compare('light moved');const error=gl.getError();cache.dispose();return{rows,error};};window.ready=true;
` }, bundle:true, format:"esm",write:false });
const server=createServer((_req,res)=>res.end('<script type="module">'+output.outputFiles[0].text+'</script>'));
await new Promise(r=>server.listen(0,"127.0.0.1",r));
const browser=await chromium.launch({executablePath:process.env.CHICHI_CHROMIUM,args:["--no-sandbox","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
try {
 const page=await browser.newPage(),errors=[];
 page.on("pageerror",e=>errors.push(e.message));page.on("console",m=>{if(m.type()==="error")errors.push(m.text());});
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.ready);
 const result=await page.evaluate(()=>audit());
 await writeFile('/tmp/shadow-depth-probe.json',JSON.stringify({...result,errors},null,2));
 console.log(JSON.stringify(result));assert.deepEqual(errors,[]);assert.equal(result.error,0);
 for(const row of result.rows)assert.equal(row.changed,0,JSON.stringify(row));
 assert.ok(result.rows[0].stats.skippedDraws>=100);assert.ok(result.rows[1].stats.skippedDraws>=100);
}finally{await browser.close();await new Promise(r=>server.close(r));}
