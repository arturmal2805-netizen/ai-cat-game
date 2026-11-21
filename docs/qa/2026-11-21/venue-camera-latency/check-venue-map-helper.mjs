import {checkNativeMapFrames as nativeFrames} from './check-native-map-fairness-ready.mjs';
// Preparation only: avoid raster competition on this software GPU before the
// actual full-RAF, full-DPR camera/input sampling starts. No production change.
export async function checkNativeMapFrames(page,review){
 await page.evaluate(async()=>{const q=__lagoonQA;q.drawPaused=true;document.querySelector('[data-biome="autumn"]').click();await Promise.all([q.mall().ensure(),q.resortSpa().ensure()]);});
 await page.waitForFunction(()=>{const q=__lagoonQA;return q.mall().ready&&q.resortSpa().ready&&!q.islands.get('autumn').userData.lowOnly&&q.shaderWarmup.idle();},null,{timeout:600000});
 console.log('PREPARATION_ONLY_PAUSE_COMPLETE; native full RAF/DPR2 sampling starts');
 await page.evaluate(()=>{__lagoonQA.drawPaused=false;});
 return nativeFrames(page,review);
}
