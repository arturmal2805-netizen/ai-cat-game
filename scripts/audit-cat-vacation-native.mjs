import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';

export async function auditCatVacationNative({page,review,errors,now,getAICalls}){
 const id='adopt-nimbus';
 const snapshot=()=>page.evaluate(id=>{const g=__familySave.getGame(),p=g.jobCity.profiles[id],v=__familyQA.housingLife.get(id),job=__familyQA.jobs.get(id);return {vacation:p.vacation,profession:p.profession,coins:p.coins,inventory:p.inventory,schedule:p.schedule,home:g.housing.residences[id],homes:g.housing.homes,homePhase:v?.phase,workPhase:job?.phase,job:job?.job,epoch:g.jobCity.epoch};},id);
 const persist=async()=>{await page.evaluate(()=>{window.dispatchEvent(new Event('pagehide'));__familySave.cloud.flush();});await page.waitForFunction(()=>!__familySave.cloud.dirty&&!__familySave.cloud.pending&&!__familySave.cloud.retryEntry);};
 const initial=await snapshot();assert.equal(initial.schedule.job,'rest');assert.equal(initial.workPhase,undefined);
 await page.evaluate(()=>__familySave.open());await page.selectOption('#jobcity-cat',id);
 const dialog=page.locator('#jobcity-dialog');assert.match(await dialog.innerText(),/Відпустка/);assert.match(await dialog.innerText(),/ще 2 ігр/);await dialog.getByText(/🏖 Відпустка/).scrollIntoViewIfNeeded();await page.screenshot({path:join(review,'vacation-phone-card.png')});
 await dialog.getByRole('button',{name:'Закрити Cat Job City'}).click();
 await page.evaluate(home=>__familySave.world.showCatHome(home),initial.home);
 await page.waitForFunction(home=>__familyQA.islands.get('cat-homes')?.userData.houses.has(home),initial.home);
 await page.evaluate(()=>__familyQA.vacationHomeStep(250));
 await page.waitForFunction(id=>__familyQA.housingLife.get(id)?.phase==='relax',id);
 assert.equal((await snapshot()).workPhase,undefined);
 await page.evaluate(()=>__familyQA.capture());await page.screenshot({path:join(review,'vacation-native-home.png')});
 const home=await snapshot();assert.equal(home.homePhase,'relax');await persist();
 await page.reload();await page.waitForFunction(()=>window.__familyQA&&__familySave?.cloud.editable);
 const reloaded=await snapshot();assert.deepEqual(reloaded.vacation,initial.vacation);assert.equal(reloaded.profession,initial.profession);assert.equal(reloaded.coins,initial.coins);
 console.log('Vacation: private SQLite reload retained deadline, profession and wallet.');
 await page.clock.setFixedTime(new Date(now+1440*1000));
 await page.evaluate(()=>__familySave.open());await page.selectOption('#jobcity-cat',id);assert.match(await dialog.innerText(),/Відпустка/);assert.match(await dialog.innerText(),/ще 1 ігр/);await dialog.getByRole('button',{name:'Закрити Cat Job City'}).click();
 await page.clock.setFixedTime(new Date(now+(2*1440-720+1)*1000)); // day30 00:01: exercise a valid cached pre-shift assignment
 await page.evaluate(()=>__familySave.plan(30));
 await page.waitForFunction(()=>__familySave.getGame().jobCity.plan?.day===30);
 await persist();await page.reload();await page.waitForFunction(()=>window.__familyQA&&window.__familySave?.cloud.editable);
 const beforeDeadline=await snapshot();assert.equal(beforeDeadline.vacation.endDay,30);assert.equal(beforeDeadline.workPhase,undefined);assert.equal(beforeDeadline.schedule.job,initial.profession);
 await page.clock.setFixedTime(new Date(now+(2*1440-179)*1000)); // day30 09:01, after the exact 09:00 deadline
 await page.waitForFunction(id=>{const p=__familySave.getGame().jobCity.profiles[id];return p.schedule?.day===30&&p.schedule.job===p.profession;},id);
 await page.evaluate(()=>__familyQA.vacationWorkStep(180));
 await page.waitForFunction(id=>__familyQA.jobs.get(id)?.phase==='work',id);
 const returned=await snapshot();assert.equal(returned.profession,initial.profession);assert.equal(returned.job,initial.profession);assert.equal(returned.coins,initial.coins);assert.deepEqual(returned.inventory,initial.inventory);assert.deepEqual(returned.homes,initial.homes);assert.equal(returned.epoch,initial.epoch);
 await page.evaluate(()=>__familySave.open());await page.selectOption('#jobcity-cat',id);assert.doesNotMatch(await dialog.innerText(),/Відпустка/);await page.screenshot({path:join(review,'vacation-returned-to-work-card.png')});await dialog.getByRole('button',{name:'Закрити Cat Job City'}).click();
 await persist();await page.reload();await page.waitForFunction(()=>window.__familyQA&&__familySave?.cloud.editable);const final=await snapshot();assert.deepEqual(final.vacation,initial.vacation);assert.equal(final.schedule.job,initial.profession);assert.equal(final.profession,initial.profession);assert.equal(final.coins,initial.coins);
 assert.equal(getAICalls(),0,'vacations must not add per-cat or catch-up AI requests');assert.deepEqual(errors,[]);
 await writeFile(join(review,'vacation-results.json'),JSON.stringify({initial,home,reloaded,beforeDeadline,returned,final,aiCalls:getAICalls(),errors,renderer:'Actual game, Chromium SwiftShader at phone DPR2; not physical-device FPS'},null,2));
 console.log('PASS: real vacation card/home routine, private SQLite reload, offline expiry, same-job native shift, second reload and zero AI requests.');
}
