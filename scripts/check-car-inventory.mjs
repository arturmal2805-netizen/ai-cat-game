import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Private browser world only. Exercise the real world car view with shared
// templates; the ownership/save tests separately run complete driving phases.
export async function checkCarInventory(page, review) {
  await page.evaluate(() => {
    document.querySelector('[data-biome="jobcity"]').click();
    const q=__lagoonQA,b=q.islands.get('jobcity');
    q.reviewView(b.position.x,b.position.z,110);
  });
  await page.waitForFunction(()=>!__lagoonQA.islands.get('jobcity').userData.lowOnly &&
    __lagoonQA.shaderWarmup.idle(),null,{timeout:180000});
  const row=await page.evaluate(()=>{
    const q=__lagoonQA;q.freeze=true;
    const save=JSON.stringify(__lagoonSaveQA.getGame()),baseline=q.cityCars.size,
      geometries=new Map(),ids=Array.from({length:32},(_,i)=>'qa-car-return-'+i);
    for(let repeat=0;repeat<20;repeat++){
      for(const [i,id] of ids.entries()){
        q.updateCityCar(id,{carVisible:true,car:'car-peach',carPosition:{x:-32+i*2,z:40},yaw:.1,steer:0},0);
        const car=q.cityCars.get(id),geometry=car.getObjectByName('CityWheel').children[0].geometry;
        if(geometries.has(id)&&geometries.get(id)!==geometry)throw Error('Car template geometry was rebuilt');
        geometries.set(id,geometry);
        if(car.parent!==q.scene||!car.visible)throw Error('Active car missing');
      }
      if(q.cityCars.size!==baseline+32)throw Error('Missing/duplicate active car');
      for(const id of ids)q.updateCityCar(id,{carVisible:false},0);
      if(q.cityCars.size!==baseline)throw Error('Parked car retained');
    }
    if(save!==JSON.stringify(__lagoonSaveQA.getGame()))throw Error('Display changed the save');
    q.drawFrame();
    return {cycles:20,carsPerCycle:32,parkedViews:ids.filter(id=>q.cityCars.has(id)).length,
      sharedGeometry:true,saveUnchanged:true,dpr:q.renderer.getPixelRatio(),
      contextLost:q.renderer.getContext().isContextLost(),glError:q.renderer.getContext().getError()};
  });
  assert.equal(row.parkedViews,0);assert.equal(row.glError,0);assert.equal(row.contextLost,false);
  await page.screenshot({path:path.join(review,'city-after-inventory-return.png')});
  fs.writeFileSync(path.join(review,'car-inventory.json'),JSON.stringify(row,null,2));
  console.log('CAR_INVENTORY',JSON.stringify(row));
}
