import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
export async function auditSquishInterior({
  page,
  review,
  errors,
  httpErrors,
  desktop,
}) {
  const activate = (s) =>
    desktop ? page.locator(s).click() : page.locator(s).tap();
  await page.evaluate(() => {
    const q = __lagoonQA;
    q.freeze = false;
    q.manualFrames = false;
    q.drawPaused = true;
    q.reviewHour = 12;
    q.terrainClock = 7;
    document.querySelector('[data-biome="autumn"]').click();
  });
  await page.waitForFunction(
    () => !!__lagoonQA.islands.get("autumn")?.userData.ocean?.warehouse,
    { timeout: 240000 },
  );
  await activate(".warehouse-access");
  await activate("[data-warehouse-interior]");
  await page.waitForFunction(() => !!__lagoonQA.warehouse().interior, {
    timeout: 180000,
  });
  await page.evaluate(() => {
    const q = __lagoonQA;
    q.manualFrames = true;
    q.drawPaused = true;
    q.testNow = Math.max(q.testNow||0,performance.now());
  });
  const step = (n) =>
    page.evaluate((n) => {
      const q = __lagoonQA;
      for (let i = 0; i < n; i++) {
        q.testNow += 1000 / 60;
        q.manualStepping = true;
        try {
          q.step(q.testNow);
        } finally {
          q.manualStepping = false;
        }
      }
    }, n);
  const frames = [];
  const shot = async (id) => {
    await step(120);
    const r = await page.evaluate(() => {
      const q = __lagoonQA,
        w = q.warehouse(),
        a = w.interior.userData.art;
      q.drawFrame();
      q.renderer.getContext().finish();
      return {
        raw: q.renderer.domElement.toDataURL("image/png").split(",")[1],
        camera: {
          position: q.camera.position.toArray(),
          target: q.look.toArray(),
          fov: q.camera.fov,
          aspect: q.camera.aspect,
          near: q.camera.near,
          far: q.camera.far,
        },
        renderer: {
          dpr: q.renderer.getPixelRatio(),
          shadow: q.renderer.shadowMap.type,
          toneMapping: q.renderer.toneMapping,
          info: { ...q.renderer.info.render },
        },
        sceneTime: q.terrainClock,
        reviewHour: q.reviewHour,
        seed: 4419,
        sectorCount: a.userData.sectors.length,
        collectables: a.userData.collectables,
        environments: [...new Set([...a.children].filter(o=>o.isMesh).map(o=>o.material))].map(m=>({colour:m.color?.getHex(),metalness:m.metalness,emissive:m.emissive?.getHex(),intensity:m.envMapIntensity,inputMap:!!m.envMap,preparedMap:!!q.renderer.properties.get(m).envMap,preparedMapping:q.renderer.properties.get(m).envMap?.mapping,textureType:q.renderer.properties.get(m).envMap?.type})),
        materials: w.interior.userData.toys.map((t) => ({
          sector: t.userData.sectorId,
          material: t.userData.material,
          solver: t.userData.solver.diagnostics(),
        })),
      };
    });
    await writeFile(
      join(review, `interior-${id}.png`),
      Buffer.from(r.raw, "base64"),
    );
    delete r.raw;
    await writeFile(
      join(review, `interior-${id}.json`),
      JSON.stringify(r, null, 2),
    );
    frames.push({ id, ...r });
    assert.deepEqual(errors, [], "GL errors in " + id);
    assert.equal(r.sectorCount, 10);
    assert(r.collectables >= 2000);
    console.log("SQUISH_INTERIOR_FRAME", id);
  };
  if(!process.env.CHICHI_SQUISH_V20_CLOSE){
  await activate("[data-squish-overview]");
  await shot("overview");
  for (const id of [
    "butter",
    "slime",
    "cloud",
    "giant",
    "jelly",
    "crunchy",
    "collection",
    "mochi",
    "foam",
    "sensory",
  ]) {
    await activate(`[data-squish-zone="${id}"]`);
    await shot(id);
  }
  }
  for(const id of ['jelly','giant','collection']){
    await page.evaluate(id=>{const q=__lagoonQA,t=q.warehouse().interior.userData.toys.find(t=>t.userData.sectorId===id),p=t.getWorldPosition(new q.THREE.Vector3()),large=id==='giant';q.oceanReviewCamera={eye:[p.x+(large?16:7),p.y+(large?10:5.5),p.z+(large?22:10)],target:[p.x,p.y+(large?4:2),p.z],fov:48,far:20000};},id);
    await shot('close-'+id);
  }
  if(process.env.CHICHI_SQUISH_LIGHT_PROBE){
    for(const gain of [0,1.5,5,15]){
      const r=await page.evaluate(gain=>{const q=__lagoonQA,t=q.warehouse().interior.userData.toys.find(t=>t.userData.sectorId==='jelly'),p=t.getWorldPosition(new q.THREE.Vector3());q.oceanReviewCamera={eye:[p.x+7,p.y+5.5,p.z+10],target:[p.x,p.y+2,p.z],fov:48,far:20000};for(const m of t.userData.meshes.map(o=>o.material)){m.envMapIntensity=gain;m.needsUpdate=true;}q.manualStepping=true;q.step(q.testNow+=100);q.manualStepping=false;q.drawFrame();q.renderer.getContext().finish();const m=t.userData.meshes[0].material,props=q.renderer.properties.get(m);return{raw:q.renderer.domElement.toDataURL('image/png').split(',')[1],gain,uniformGain:props.uniforms?.envMapIntensity?.value,preparedMap:props.envMap?.image,inputMap:{width:m.envMap.image.width,height:m.envMap.image.height,maximum:m.envMap.image.data.reduce((a,b)=>Math.max(a,b),0)},camera:q.camera.position.toArray()};},gain);
      await writeFile(join(review,`light-probe-${gain}.png`),Buffer.from(r.raw,'base64'));delete r.raw;await writeFile(join(review,`light-probe-${gain}.json`),JSON.stringify(r,null,2));
    }
  }
  if(process.env.CHICHI_SQUISH_LIGHT_PROBE){
    const r=await page.evaluate(()=>{const q=__lagoonQA,T=q.THREE,m=q.warehouse().interior.userData.toys[0].userData.meshes[0].material,prepared=q.renderer.properties.get(m).envMap,scene=new T.Scene(),camera=new T.OrthographicCamera(-1,1,1,-1,0,2),geometry=new T.PlaneGeometry(2,2),material=new T.MeshBasicMaterial({map:prepared,toneMapped:false,depthTest:false}),mesh=new T.Mesh(geometry,material),target=new T.WebGLRenderTarget(336,256),old=q.renderer.getRenderTarget();scene.add(mesh);camera.position.z=1;q.renderer.setRenderTarget(target);q.renderer.render(scene,camera);const pixels=new Uint8Array(336*256*4);q.renderer.readRenderTargetPixels(target,0,0,336,256,pixels);q.renderer.setRenderTarget(old);const canvas=document.createElement('canvas');canvas.width=336;canvas.height=256;canvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(pixels),336,256),0,0);const result={raw:canvas.toDataURL('image/png').split(',')[1],maximum:pixels.reduce((a,b,i)=>i%4===3?a:Math.max(a,b),0),mean:pixels.reduce((a,b,i)=>i%4===3?a:a+b,0)/(336*256*3),materialName:m.name};target.dispose();material.dispose();geometry.dispose();return result;});await writeFile(join(review,'probe-map.png'),Buffer.from(r.raw,'base64'));delete r.raw;await writeFile(join(review,'probe-map.json'),JSON.stringify(r,null,2));
  }
  assert.deepEqual(httpErrors, []);
  await writeFile(
    join(review, "interior-result.json"),
    JSON.stringify(
      {
        passed: true,
        desktop,
        frames,
        errors,
        httpErrors,
        paidInferenceCalled: false,
        limitations:
          "Architecture and shader validation only. Full material sequences, native manual support, AI/audio/LOD and final acceptance remain separate stages.",
      },
      null,
      2,
    ),
  );
  console.log("SQUISH_INTERIOR_NATIVE_PASS");
}
