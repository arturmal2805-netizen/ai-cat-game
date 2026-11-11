// Internal geometry review of the replacement builder. Native game integration
// and old-save/lift tests remain separate mandatory gates before publication.
import fs from 'node:fs/promises';
import http from 'node:http';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.CHICHI_PLAYWRIGHT_MODULE||'playwright');
const folder=process.env.CHICHI_MALL_REVIEW||'/workspace/qa/mall-horizontal-prototype';await fs.mkdir(folder,{recursive:true});
const bundle=await build({stdin:{resolveDir:process.cwd(),contents:`
import * as T from 'three';import{prepareMallArt}from'./public/mall-art.js';import{prepareMosaWaterReflection}from'./public/mosasaur-water-probe.js';import{createMallRebuildModel}from'./public/mall-rebuild-model.js';import{MALL_LAYOUT as MALL,mallRoomContacts}from'./public/mall-layout.js';import{createCat,animateCat}from'./public/cat-model.js';
await Promise.all([prepareMallArt(),prepareMosaWaterReflection()]);
const r=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});r.setPixelRatio(1);r.setSize(1400,900);r.setClearColor(0x08647b);r.toneMapping=T.ACESFilmicToneMapping;document.body.append(r.domElement);
const scene=new T.Scene(),camera=new T.PerspectiveCamera(60,1400/900,.2,1500);scene.add(new T.HemisphereLight(0xfff0de,0x86b6ba,1.2));const sun=new T.DirectionalLight(0xffe5bf,2.2);sun.position.set(-14,35,20);scene.add(sun);const rim=new T.DirectionalLight(0x93dcff,.9);rim.position.set(20,16,-30);scene.add(rim);
const mall=createMallRebuildModel();scene.add(mall);const staff=[];
for(const f of mall.userData.floors.keys()){const s=[...mall.userData.stores.values()].find(s=>s.floor===f),p=mallRoomContacts(s.kind).vendor,c=createCat('happy',{detail:'npc'}),g=new T.Group();c.scale.setScalar(.63);g.position.set(s.x+Math.cos(s.placement.yaw)*p.x+Math.sin(s.placement.yaw)*p.z,s.y+p.y,s.z-Math.sin(s.placement.yaw)*p.x+Math.cos(s.placement.yaw)*p.z);g.rotation.y=s.placement.yaw+Math.PI;g.add(c);scene.add(g);staff.push({floor:f,cat:c,carrier:g});}
window.qa={mall,r,camera,scene};window.view=async(floor=null,id=null,phone=false)=>{r.setPixelRatio(phone?2:1);r.setSize(phone?430:1400,phone?850:900);camera.aspect=phone?430/850:1400/900;mall.userData.focusFloor(floor);staff.forEach(s=>{s.carrier.visible=!floor||floor===s.floor;animateCat(s.cat,4,false,false);});
let target=new T.Vector3(0,floor?MALL.y+(floor-1)*MALL.rise+2:MALL.y+45,MALL.z),d=115,e=floor?.5:.15,a=floor?-.35:-.08,half=floor?1.7:1.8;
if(id){const s=mall.userData.stores.get(id);target.set(s.x,s.y+3,s.z);d=45;e=.45;a=s.placement.yaw+.12;half=.44;}
camera.fov=Math.max(40,Math.min(150,Math.atan(half/camera.aspect)*360/Math.PI));camera.updateProjectionMatrix();camera.position.copy(target).add(new T.Vector3(Math.sin(a)*Math.cos(e)*d,Math.sin(e)*d,Math.cos(a)*Math.cos(e)*d));camera.lookAt(target);await r.compileAsync(scene,camera);r.render(scene,camera);return{calls:r.info.render.calls,triangles:r.info.render.triangles,textures:r.info.memory.textures,glError:r.getContext().getError()};};window.ready=true;
`},bundle:true,format:'esm',write:false});
const server=http.createServer(async(req,res)=>{if(req.url==='/app.js'){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles[0].contents);}else if(req.url.startsWith('/art/')){try{res.setHeader('Content-Type','image/png');res.end(await fs.readFile('public'+req.url));}catch{res.writeHead(404);res.end();}}else{res.setHeader('Content-Type','text/html');res.end('<style>body{margin:0}canvas{display:block}</style><script type="module" src="/app.js"></script>');}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.CHICHI_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{const page=await browser.newPage({viewport:{width:1400,height:900}}),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log(e.message);});page.on('console',m=>{if(m.type()==='error'){errors.push(m.text());console.log(m.text());}});await page.goto(`http://127.0.0.1:${server.address().port}`);await page.waitForFunction(()=>window.ready,null,{timeout:240000});const views=[];
for(const [floor,id]of (process.env.CHICHI_MALL_VIEWS?JSON.parse(process.env.CHICHI_MALL_VIEWS):[[null,null],[1,null],[2,null],[3,null],[4,null],[2,'mall-vuitton'],[3,'mall-mcd'],[4,'mall-cinema']])){const stats=await page.evaluate(([floor,id])=>window.view(floor,id),[floor,id]);views.push({floor,id,stats});await page.screenshot({path:folder+`/${id||'floor-'+(floor||'all')}.png`});console.log(JSON.stringify(views.at(-1)));}
await page.setViewportSize({width:430,height:850});views.push({phone:true,stats:await page.evaluate(()=>window.view(null,null,true))});await page.screenshot({path:folder+'/phone-all.png'});await fs.writeFile(folder+'/evidence.json',JSON.stringify({views,errors,scope:'Replacement geometry authoring review; not yet native-game integration or physical-device FPS'},null,2));assert.deepEqual(errors,[]);
}finally{await browser.close();server.close();}
