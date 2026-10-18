// Actual GPU pose/normal audit plus close views of the real game fish meshes.
import { build } from "esbuild";
import { createServer } from "node:http";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import assert from "node:assert/strict";
const { chromium } = createRequire(import.meta.url)(
  process.env.CHICHI_PLAYWRIGHT_MODULE || "playwright",
);
const folder = process.env.CHICHI_FISH_REVIEW || "/tmp/chichi-fish-motion";
await mkdir(folder, { recursive: true });
const source = `
import * as T from 'three';
import {AQUARIUM_TANKS} from './public/aquarium-data.js';
import {courtVenue} from './public/foodcourt-assets.js';
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(800,620);renderer.toneMapping=T.ACESFilmicToneMapping;
document.body.style='margin:0';document.body.append(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color(0xc5d9e3);scene.add(new T.HemisphereLight(0xffeedf,0x8591a4,1.5));const sun=new T.DirectionalLight(0xffeedb,2.2);sun.position.set(-8,14,15);scene.add(sun);
const camera=new T.PerspectiveCamera(35,800/620,.1,150);let tank;
window.load=async(index)=>{if(tank){tank.userData.shoal.removeFromParent();tank.removeFromParent();}tank=courtVenue(AQUARIUM_TANKS[index]);scene.add(tank);tank.userData.update(4,true);await renderer.compileAsync(scene,camera);return tank.userData.stats;};
window.gpuAudit=()=>{
 const mesh=tank.userData.shoal.children[0],pal=tank.userData.shoal.userData.palette,g=mesh.geometry,gl=renderer.getContext();
 const shader={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};mesh.material.onBeforeCompile(shader,renderer);
 const end=shader.vertexShader.indexOf('varying vec2 vWaterLightPoint;');if(end<0)throw Error('Missing real pose shader');
 const prefix=shader.vertexShader.slice(0,end).replaceAll('attribute ','in ').replaceAll('varying ','out ');
 const vs=gl.createShader(gl.VERTEX_SHADER);gl.shaderSource(vs,'#version 300 es\\nprecision highp float;\\nin vec3 position;in vec3 normal;\\n'+prefix+'\\nout vec3 qaPosition;out vec3 qaNormal;void main(){qaPosition=aquariumPose(position,true);qaNormal=aquariumPose(normal,false);gl_Position=vec4(0.,0.,0.,1.);}');gl.compileShader(vs);if(!gl.getShaderParameter(vs,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(vs));
 const fs=gl.createShader(gl.FRAGMENT_SHADER);gl.shaderSource(fs,'#version 300 es\\nprecision highp float;out vec4 c;void main(){c=vec4(1.);}');gl.compileShader(fs);
 const program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.transformFeedbackVaryings(program,['qaPosition','qaNormal'],gl.INTERLEAVED_ATTRIBS);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
 const vao=gl.createVertexArray();gl.bindVertexArray(vao);gl.useProgram(program);const buffers=[],ids=[],positions=[],normals=[],parts=[];
 const step=Math.max(1,Math.floor(g.attributes.position.count/256));
 for(let i=0;i<g.attributes.position.count;i+=step){ids.push(i);positions.push(g.attributes.position.getX(i),g.attributes.position.getY(i),g.attributes.position.getZ(i));normals.push(g.attributes.normal.getX(i),g.attributes.normal.getY(i),g.attributes.normal.getZ(i));parts.push(g.attributes.aFishPart.getX(i));}
 for(const [name,data,size] of [['position',positions,3],['normal',normals,3],['aFishPart',parts,1]]){const b=gl.createBuffer();buffers.push(b);gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);const a=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,size,gl.FLOAT,false,0,0);}
 const tf=gl.createTransformFeedback(),output=gl.createBuffer(),values=new Float32Array(ids.length*mesh.count*6);gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,tf);gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER,output);gl.bufferData(gl.TRANSFORM_FEEDBACK_BUFFER,values.byteLength,gl.STREAM_READ);gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,output);
 let maxPositionError=0,maxNormalError=0,samples=0;
 const matrix=new T.Matrix4(),normalMatrix=new T.Matrix3(),p=new T.Vector3(),n=new T.Vector3();
 try{
  for(const [time,reduced] of [[0,false],[4.75,false],[18.3,false],[59.9,false],[32,true],[71,true]]){
   tank.userData.update(time,reduced);
   for(const [name,u] of [['uFishPlace',pal.place],['uFishHeading',pal.heading],['uFishLimbs',pal.limbs]])gl.uniform4fv(gl.getUniformLocation(program,name+'[0]'),u.value);
   gl.enable(gl.RASTERIZER_DISCARD);gl.beginTransformFeedback(gl.POINTS);gl.drawArraysInstanced(gl.POINTS,0,ids.length,mesh.count);gl.endTransformFeedback();gl.disable(gl.RASTERIZER_DISCARD);gl.getBufferSubData(gl.TRANSFORM_FEEDBACK_BUFFER,0,values);
   for(let fish=0;fish<mesh.count;fish++)for(let v=0;v<ids.length;v++){
    const k=(fish*ids.length+v)*6,part=['body','tail','leftFin','rightFin'][parts[v]];pal.matrixAt(fish,part,matrix);normalMatrix.getNormalMatrix(matrix);
    p.fromArray(positions,v*3).applyMatrix4(matrix);n.fromArray(normals,v*3).applyMatrix3(normalMatrix).multiplyScalar(pal.poses[fish].scale);
    maxPositionError=Math.max(maxPositionError,p.distanceTo(new T.Vector3().fromArray(values,k)));maxNormalError=Math.max(maxNormalError,n.distanceTo(new T.Vector3().fromArray(values,k+3)));samples++;
   }
  }
  if(gl.getError()!==gl.NO_ERROR)throw Error('GPU pose probe raised a WebGL error');
 }finally{gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,null);gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,null);gl.bindVertexArray(null);for(const b of [...buffers,output])gl.deleteBuffer(b);gl.deleteTransformFeedback(tf);gl.deleteProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);renderer.resetState();}
 return{samples,maxPositionError,maxNormalError,fish:mesh.count,draws:tank.userData.stats.instancedFishDraws};
};
window.beauty=async(angle=0,phone=false)=>{
 const shoal=tank.userData.shoal;shoal.removeFromParent();scene.add(shoal);tank.visible=false;tank.userData.update(4,true);
 const m=new T.Matrix4();shoal.children[0].getMatrixAt(0,m);const q=new T.Quaternion(),scale=new T.Vector3(),pos=new T.Vector3();m.decompose(pos,q,scale);
 const target=new T.Vector3(0,.28,1.2).applyMatrix4(m);camera.position.copy(target).add(new T.Vector3(Math.sin(angle),.13,Math.cos(angle)).applyQuaternion(q).multiplyScalar(scale.x*3.6));camera.lookAt(target);
 renderer.setPixelRatio(phone?2:1);renderer.setSize(phone?390:800,phone?560:620);camera.aspect=phone?390/560:800/620;camera.updateProjectionMatrix();await renderer.compileAsync(scene,camera);const count=shoal.children[0].count;shoal.children[0].count=1;renderer.render(scene,camera);shoal.children[0].count=count;
};window.ready=true;`;
const result = await build({
  stdin: { contents: source, resolveDir: process.cwd(), loader: "js" },
  bundle: true,
  format: "esm",
  write: false,
});
const server = createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end('<script type="module">' + result.outputFiles[0].text + "</script>");
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({
  executablePath: process.env.CHICHI_CHROMIUM,
  args: [
    "--no-sandbox",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
try {
  const page = await browser.newPage({ viewport: { width: 800, height: 620 } }),
    errors = [],
    report = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto("http://127.0.0.1:" + server.address().port);
  await page.waitForFunction(() => window.ready);
  for (let i = 0; i < 5; i++) {
    await page.evaluate((i) => window.load(i), i);
    const r = await page.evaluate(() => gpuAudit());
    report.push(r);
    assert.ok(r.maxPositionError < 0.00002, JSON.stringify(r));
    assert.ok(r.maxNormalError < 0.000002, JSON.stringify(r));
    assert.equal(r.draws, 1);
    console.log("Tank", i, r);
    if (i === 1) {
      for (const [name, angle, phone] of [
        ["front", 0, false],
        ["three-quarter", 0.55, false],
        ["profile", 1.15, false],
        ["phone", 0.35, true],
      ]) {
        await page.evaluate(([a, p]) => beauty(a, p), [angle, phone]);
        await page.screenshot({
          path: folder + "/kitten-fish-" + name + ".png",
        });
      }
    }
  }
  assert.deepEqual(errors, []);
  await writeFile(
    folder + "/gpu-motion.json",
    JSON.stringify({ report, errors }, null, 2),
  );
} finally {
  await browser.close();
  server.close();
}
