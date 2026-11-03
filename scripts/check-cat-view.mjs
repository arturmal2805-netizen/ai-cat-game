import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

// Run with CHICHI_CAT_VIEW_AUDIT=1 via check-aquarium.cjs. Private fixture only;
// the original native models, cameras, renderer and real RAF stay enabled.
export async function checkCatView(page, review) {
  const legacy = !!process.env.CHICHI_CAT_VIEW_LEGACY, rows = [];
  await page.waitForFunction(() => __lagoonQA.npcs.has('luna'));
  await page.evaluate(() => {
    const game=structuredClone(__lagoonSaveQA.getGame());
    game.unlocked=[...new Set([...game.unlocked,'atoll-park'])];
    __lagoonSaveQA.commit(game,false);
  });
  for (const [island, distances] of [['moon', [85, 109, 111, 140, 240]], ['atoll-park', [160, 650, 1400]]]) {
    const placed=await page.evaluate(id => {
      const q = __lagoonQA, w = __lagoonSaveQA.getWorld(), b = q.islands.get(id);
      q.freeze = false; w.focus(id);
      q.jobs.states.delete('luna');
      const moved=w.moveResident('luna', id, {x:b.position.x,z:b.position.z});
      const n=q.npcs.get('luna'); n.leisureBiome=id;
      n.manualUntil = performance.now() + 1e8;
      return {moved,unlocked:__lagoonSaveQA.getGame().unlocked};
    }, island);
    assert.ok(placed.moved,JSON.stringify({island,...placed}));
    for (const distance of distances) {
      await page.evaluate(({island,distance}) => {
        const q = __lagoonQA, b = q.islands.get(island);
        q.freeze = false; q.reviewView(b.position.x,b.position.z,distance);
      }, {island,distance});
      await page.waitForFunction(distance => {
        const q=__lagoonQA;
        return Math.abs(q.getDistance()-distance)<.03 && q.look.distanceTo(q.desiredLook)<.03 && q.shaderWarmup.idle();
      }, distance, {timeout:180000});
      const row = await page.evaluate(({island,distance}) => {
        const q=__lagoonQA,n=q.npcs.get('luna'), box=new q.THREE.Box3().setFromObject(n.carrier), size=box.getSize(new q.THREE.Vector3());
        const p=box.getCenter(new q.THREE.Vector3()).project(q.camera);
        const result={island,distance,visible:n.carrier.visible,position:n.carrier.position.toArray(),scale:n.model.scale.toArray(),size:size.toArray(),screen:p.toArray(),fog:q.scene.fog.density,dpr:q.renderer.getPixelRatio(),contextLost:q.renderer.getContext().isContextLost()};
        q.freeze=true; q.drawFrame(); return result;
      }, {island,distance});
      rows.push(row);
      await fs.writeFile(`${review}/cat-view.json`,JSON.stringify({legacy,rows},null,2));
      assert.equal(row.contextLost,false); assert.equal(row.dpr,2);
      assert.ok(Math.abs(row.screen[0])<1&&Math.abs(row.screen[1])<1);
      if (!legacy) {
        assert.equal(row.visible,true, `${island} ${distance}: native cat remains visible`);
        assert.ok(1-Math.exp(-((row.fog*distance)**2)) <= .116);
      }
      await page.screenshot({path:`${review}/${island}-${distance}.png`});
    }
  }
  assert.ok(rows.every(r=>JSON.stringify(r.scale)===JSON.stringify(rows[0].scale)), 'native scale never changes');
  await fs.writeFile(`${review}/cat-view.json`,JSON.stringify({legacy,rows},null,2));
  console.log(`CAT_VIEW: ${rows.length} actual native zoom views, unchanged model scale and original DPR.`);
}
