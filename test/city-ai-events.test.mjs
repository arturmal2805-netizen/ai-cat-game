import test from "node:test";
import assert from "node:assert/strict";
import { newGame, unlockBiome, loadGame, SAVE_KEY } from "../public/economy.js";
import { xpForLevel } from "../public/progression.js";
import {
  ensureJobCity,
  localJobPlan,
  applyJobPlan,
  cityClock,
} from "../public/jobcity-system.js";
import {
  nextCityAIEvent,
  reserveCityAIEvent,
  applyCityAIEvent,
  recoverCityAIFamilies,
  recoverCityAIReceipt,
  cityAIFamilyMessage,
} from "../public/city-ai-schedule.js";
import { validateCityAIState } from "../jobcity-ai.mjs";
import {
  cityLifeInput,
  cityLifeChoices,
  requestCityLife,
} from "../city-life-ai.mjs";
import { CityAIRequestLedger } from "../city-ai-vault.mjs";
import { mergeSharedWorld } from "../shared-world.mjs";
const epoch = 1700000000000;
function seed() {
  let g = newGame(epoch);
  g.coins = 90000;
  g.progression.xp = xpForLevel(30);
  g = unlockBiome(g, "jobcity", epoch);
  return applyJobPlan(g, localJobPlan(Object.values(g.jobCity.profiles), 0), 0);
}
const reload = (g) =>
  loadGame(
    { getItem: (k) => (k === SAVE_KEY ? JSON.stringify(g) : null) },
    epoch,
    { advance: false },
  );
function reply(state) {
  const c = cityLifeChoices(state);
  return {
    careers: c.careers.map((i) => [i, 1]),
    evenings: c.evenings.map((i) => [
      i,
      1,
      state.leisureOffers.length ? [0] : [],
    ]),
    houses: [],
    families: c.family ? [[
      state.cats.findIndex(p => p.sex === "male" && !p.partner),
      state.cats.findIndex(p => p.sex === "female" && !p.partner),
      "Люблять гуляти разом",
    ]] : [],
  };
}
async function establish() {
  let g = seed();
  const event = nextCityAIEvent(g, epoch);
  g = reserveCityAIEvent(g, event);
  const r = await requestCityLife(validateCityAIState(event), async () => ({
    response: reply(validateCityAIState(event)),
  }));
  return applyCityAIEvent(g, event, r);
}
function storage() {
  const map = new Map();
  let queue = Promise.resolve();
  return {
    map,
    get: async k => structuredClone(map.get(k)),
    transaction(fn) {
      const p = queue.then(async () => {
        const draft = new Map(map),
          r = await fn({
            get: async (k) => structuredClone(draft.get(k)),
            put: async (k, v) => draft.set(k, structuredClone(v)),
          });
        map.clear();
        for (const [k, v] of draft) map.set(k, v);
        return r;
      });
      queue = p.catch(() => {});
      return p;
    },
  };
}

test("initial careers are one saved event; established careers never appear in daily model choices over 40 days", async () => {
  const initialInput = cityLifeInput(
    validateCityAIState(nextCityAIEvent(seed(), epoch)),
  );
  assert.deepEqual(Object.keys(JSON.parse(initialInput.messages[1].content)), [
    "day",
    "careers",
  ]);
  let g = await establish();
  const professions = Object.fromEntries(
    Object.values(g.jobCity.profiles).map((p) => [p.id, p.profession]),
  );
  assert.equal(nextCityAIEvent(g, epoch), null);
  for (let day = 0; day < 40; day++) {
    const noon = epoch + day * 1440000;
    g = applyJobPlan(
      g,
      localJobPlan(Object.values(g.jobCity.profiles), day),
      day,
    );
    assert.equal(
      nextCityAIEvent(reload(g), noon),
      null,
      "no noon inference for existing careers",
    );
    const evening = noon + 420000,
      event = nextCityAIEvent(g, evening);
    assert.equal(event.phase, "evening");
    const s = validateCityAIState(event),
      input = JSON.parse(cityLifeInput(s).messages[1].content);
    assert.deepEqual(input.careers, []);
    assert.ok(s.cats.every((p) => p.canChangeProfession === false));
    g = reserveCityAIEvent(g, event);
    assert.equal(
      nextCityAIEvent(reload(g), evening),
      null,
      "request survives reload before ACK",
    );
    const result = await requestCityLife(s, async () => ({
      response: reply(s),
    }));
    g = applyCityAIEvent(g, event, result);
    assert.deepEqual(
      Object.fromEntries(
        Object.values(g.jobCity.profiles).map((p) => [p.id, p.profession]),
      ),
      professions,
    );
  }
});
test("only workers get after-shift activity choices; affordable houses and 14-day family reviews share that batch", async () => {
  let g = await establish();
  assert.equal(nextCityAIEvent(g, epoch + 419000), null);
  const ids = Object.keys(g.jobCity.profiles);
  g.jobCity.profiles[ids[0]].coins = 100000;
  g.jobCity.profiles[ids[1]].coins = 0;
  const event = nextCityAIEvent(g, epoch + 420000),
    s = validateCityAIState(event),
    c = cityLifeChoices(s);
  assert.equal(c.family, false);
  assert.ok(c.buyers.includes(s.cats.findIndex((p) => p.id === ids[0])));
  assert.ok(!c.buyers.includes(s.cats.findIndex((p) => p.id === ids[1])));
  assert.ok(c.evenings.every((i) => s.cats[i].scheduleJob !== "rest"));
  let calls = 0;
  await requestCityLife(s, async () => {
    calls++;
    return { response: reply(s) };
  });
  assert.equal(calls, 1);
  const review = nextCityAIEvent(g, epoch + (13 * 1440 + 420) * 1000);
  assert.equal(cityLifeChoices(validateCityAIState(review)).family, true);
  await assert.rejects(
    requestCityLife(s, async () => ({
      response: { ...reply(s), careers: [[0, 2]] },
    })),
    /Unrequested/,
  );
  await assert.rejects(
    requestCityLife(s, async () => ({
      response: {
        ...reply(s),
        houses: [[s.cats.findIndex((p) => p.id === ids[1]), 0, -1]],
      },
    })),
    /Unrequested/,
  );
});

test("due family introductions require a real AI-selected pair in the same evening batch; empty answers cannot reset the review", async () => {
  const g = await establish(), event = nextCityAIEvent(g,epoch+(13*1440+420)*1000),
    state = validateCityAIState(event);
  assert.equal(state.familyReview.due,true);
  const body = reply(state);
  await assert.rejects(requestCityLife(state,async()=>({response:{...body,families:[]}})),/Missing family choice/);
  let calls=0;
  const result=await requestCityLife(state,async()=>{calls++;return {response:body};});
  assert.equal(calls,1);
  assert.equal(result.families.length,1);
  const next=applyCityAIEvent(reserveCityAIEvent(g,event),event,result);
  assert.equal(Object.keys(next.family.couples).length,1);
  assert.equal(nextCityAIEvent(next,epoch+(13*1440+420)*1000),null,
    "a successful introduction must not create another inference event");
});
test("released established local/AI professions do not become new initial choices; old clients cannot erase request markers", async () => {
  let base = await establish();
  for (const p of Object.values(base.jobCity.profiles)) {
    delete p.careerAIPending;
    delete p.careerAIRequestedDay;
    p.professionSource = "local";
  }
  base = reload(base);
  assert.ok(
    Object.values(base.jobCity.profiles).every((p) => !p.careerAIPending),
  );
  assert.equal(nextCityAIEvent(base, epoch), null);
  const event = nextCityAIEvent(base, epoch + 420000),
    current = reserveCityAIEvent(base, event),
    old = structuredClone(base);
  delete old.jobCity.eveningAIRequestedDay;
  old.coins--;
  const merged = mergeSharedWorld(base, current, old);
  assert.equal(merged.jobCity.eveningAIRequestedDay, 0);
  assert.equal(nextCityAIEvent(reload(merged), epoch + 420000), null);
});
test("shared durable ledger coalesces concurrent devices, restarts and lost career ACKs without paying twice", async () => {
  const g = seed(),
    s = validateCityAIState(nextCityAIEvent(g, epoch)),
    store = storage();
  let calls = 0;
  const ai = {
    run: async () => {
      calls++;
      await new Promise((r) => setTimeout(r, 5));
      return { response: reply(s) };
    },
  };
  const a = new CityAIRequestLedger(store, ai),
    b = new CityAIRequestLedger(store, ai);
  const results = await Promise.all([a.plan(s), a.plan(s), b.plan(s)]);
  assert.equal(calls, 1);
  assert.equal(results[0].status, 200);
  const retry = await new CityAIRequestLedger(store, ai).plan(s);
  assert.deepEqual(retry, results[0]);
  assert.equal(calls, 1);
  const nextDay = { ...s, day: 1 };
  const replay = await new CityAIRequestLedger(store, ai).plan(nextDay);
  assert.equal(replay.status, 200);
  assert.equal(replay.body.day, 1);
  assert.equal(calls, 1);
  assert.deepEqual(
    replay.body.assignments.map((a) => a.profession),
    results[0].body.assignments.map((a) => a.profession),
  );
});
test("quota failures stop additional inference until reset, and a failed durable reservation never calls the model", async () => {
  const g = await establish(),
    s = validateCityAIState(nextCityAIEvent(g, epoch + 420000)),
    store = storage();
  let calls = 0;
  const ai = {
    run: async () => {
      calls++;
      throw Error("4006: daily free allocation of 10,000 neurons");
    },
  };
  let r = await new CityAIRequestLedger(store, ai).plan(s);
  assert.equal(r.status, 429);
  assert.equal(calls, 1);
  r = await new CityAIRequestLedger(store, ai).plan({ ...s, day: 1 });
  assert.equal(r.status, 429);
  assert.equal(calls, 1);
  const bad = new CityAIRequestLedger(
    {
      transaction: async () => {
        throw Error("disk failure");
      },
    },
    ai,
  );
  await assert.rejects(bad.plan(s), /disk/);
  assert.equal(calls, 1);
  const safe = await new CityAIRequestLedger(storage(), {
    run: async () => {
      throw Error("private provider payload must never be echoed");
    },
  }).plan(s);
  assert.equal(safe.status, 502);
  assert.equal(safe.body.reason, "provider_or_contract");
  assert.ok(!JSON.stringify(safe).includes("private provider payload"));
});

test("night adoption waits for work opening; resuming after days offline never replays a backlog of AI days", async () => {
  const g = seed();
  assert.equal(
    nextCityAIEvent(g, epoch + 720000),
    null,
    "midnight is not a new work plan",
  );
  const current = await establish(),
    event = nextCityAIEvent(current, epoch + (21 * 1440 + 420) * 1000);
  assert.equal(event.day, 21);
  const reserved = reserveCityAIEvent(current, event);
  assert.equal(
    nextCityAIEvent(reserved, epoch + (21 * 1440 + 420) * 1000),
    null,
  );
});

test("family decoding schema bounds the real provider output and restricts each partner to eligible sex indices", async () => {
  const g = await establish(), event = nextCityAIEvent(g,epoch+(27*1440+420)*1000),
    state = validateCityAIState(event), format = cityLifeInput(state).response_format;
  assert.equal(format.type, "json_schema");
  const pairs = format.json_schema.schema.properties.families;
  assert.equal(pairs.maxItems, state.familyReview.slots);
  assert.equal(pairs.minItems, 1);
  for (const sex of ["male", "female"]) {
    const allowed = pairs.items.properties[sex].enum;
    assert.ok(allowed.length);
    assert.ok(allowed.every(i => state.cats[i].sex === sex && !state.cats[i].partner));
  }
  const body = reply(state), [male,female,reason] = body.families[0];
  const result = await requestCityLife(state, async()=>({response:{...body,families:[{male,female,reason}]}}));
  assert.equal(result.families[0].male, state.cats[male].id);
  await assert.rejects(requestCityLife(state, async()=>({response:{...body,families:Array.from({length:state.familyReview.slots+1},()=>({male,female,reason}))}})),/вибір сімей/);
});

test("mixed scheduled family and house responses use nullable roommate objects without changing private prices or careers", async () => {
  const g = await establish(), id = Object.keys(g.jobCity.profiles)[0];
  g.jobCity.profiles[id].coins = 10000;
  const state = validateCityAIState(nextCityAIEvent(g,epoch+(27*1440+420)*1000));
  const c = cityLifeChoices(state), body = reply(state);
  const i = c.buyers[0];
  const schema = cityLifeInput(state).response_format.json_schema.schema.properties.houses.items;
  assert.ok(schema.properties.roommate.enum.includes(null));
  const result = await requestCityLife(state,async()=>({response:{...body,houses:[{cat:i,house:0,roommate:null}]}}));
  assert.equal(result.assignments.find(a => a.id === state.cats[i].id).house.roommate,null);
  assert.ok(result.assignments.every(a => a.profession === state.cats.find(p => p.id === a.id).profession));
});

test("a newly configured reserve can handle the next evening despite an old primary-only quota block, without replaying today's failed request", async () => {
  const g = await establish(), state = validateCityAIState(nextCityAIEvent(g,epoch+420000)), store = storage();
  const failed = await new CityAIRequestLedger(store,{run:async()=>{throw Error("4006 daily free allocation");}}).plan(state);
  assert.equal(failed.status,429);
  let calls = 0;
  const ready = { reserveConfigured:true, run:async(_model,input)=>{
    calls++;
    const day = JSON.parse(input.messages[1].content).day;
    return {response:reply({...state,day}),provider:"openrouter"};
  } };
  const ledger = new CityAIRequestLedger(store,ready);
  assert.equal((await ledger.plan(state)).status,429);
  assert.equal(calls,0,"the old event stays idempotent and cannot spend again");
  const next = {...state,day:state.day+1};
  assert.equal((await ledger.plan(next)).status,200);
  assert.equal((await new CityAIRequestLedger(store,ready).plan(next)).status,200);
  assert.equal(calls,1,"new provider capability permits one next-day batch, not a retry loop");
});


test("a lost family ACK recovers from the saved server receipt after reload and a later local work plan without replaying schedules or purchases", async () => {
  let g = await establish();
  const event = nextCityAIEvent(g, epoch+(13*1440+420)*1000);
  const state = validateCityAIState(event), store = storage();
  let calls = 0;
  const ledger = new CityAIRequestLedger(store, {run:async()=>{calls++;return {response:reply(state)};}});
  assert.equal((await ledger.plan(state)).status,200);
  g = reload(reserveCityAIEvent(g,event)); // Browser closed before applying the ACK.
  g = applyJobPlan(g, localJobPlan(Object.values(g.jobCity.profiles),15),15);
  const jobs = structuredClone(g.jobCity), wallets = Object.values(g.jobCity.profiles).map(p=>p.coins);
  const snapshot = await ledger.status();
  const next = recoverCityAIFamilies(g,snapshot,epoch+15*1440000);
  assert.equal(Object.keys(next.family.couples).length,1);
  assert.equal(Object.values(next.family.couples)[0].formedDay,15);
  assert.deepEqual(next.jobCity,jobs);
  assert.deepEqual(Object.values(next.jobCity.profiles).map(p=>p.coins),wallets);
  assert.equal(recoverCityAIFamilies(next,snapshot,epoch+15*1440000),next);
  const before = structuredClone([...store.map]);
  await new CityAIRequestLedger(store,{}).status();
  assert.deepEqual([...store.map],before,"receipt reads never write storage or call inference");
  assert.equal(calls,1);
  assert.equal(recoverCityAIFamilies(g,{...snapshot,events:snapshot.events.map(e=>({...e,epoch:e.epoch+1}))},epoch+15*1440000),g);
});

test("only the persisted shared world can realign an AI ledger clock, preserving daily guards and existing career choices", async () => {
  const g = await establish(), state = validateCityAIState(nextCityAIEvent(g,epoch+420000)), store = storage();
  let calls = 0;
  const ai = {run:async(_model,input)=>{calls++;return {response:reply({...state,day:JSON.parse(input.messages[1].content).day})};}};
  const ledger = new CityAIRequestLedger(store,ai);
  assert.equal((await ledger.plan(state)).status,200);
  const shifted = {...state,epoch:state.epoch+60000};
  assert.equal((await ledger.plan(shifted)).body.code,"AI_WORLD_EPOCH_MISMATCH");
  store.map.set("current",{game:{jobCity:{epoch:shifted.epoch}}});
  assert.equal((await ledger.plan(shifted)).body.code,"AI_EVENT_ALREADY_REQUESTED");
  assert.equal(calls,1,"changing a confirmed clock does not reroll today's AI");
  assert.equal((await ledger.plan({...shifted,day:shifted.day+1})).status,200);
  assert.equal(calls,2);
  assert.equal((await ledger.status()).epoch,shifted.epoch);
});

test("family status explains waiting for after-work and failed decisions instead of silently presenting an empty successful review", async () => {
  const g = await establish(), now=epoch+14*1440000;
  assert.match(cityAIFamilyMessage(g,null,now),/19:00/);
  assert.match(cityAIFamilyMessage(g,{state:"failed"},now),/не завершився/);
  assert.match(cityAIFamilyMessage(g,{state:"pending"},now),/відновиться/);
});


test("the last unapplied family receipt survives bounded daily-event eviction without retaining old work plans", async () => {
  const g=await establish(), store=storage();
  const state=validateCityAIState(nextCityAIEvent(g,epoch+(13*1440+420)*1000));
  const ledger=new CityAIRequestLedger(store,{run:async(_model,input)=> {
    const day=JSON.parse(input.messages[1].content).day;
    return {response:reply({...state,day,familyReview:day===state.day?state.familyReview:{...state.familyReview,due:false}})};
  }});
  await ledger.plan(state);
  for(let i=1;i<4;i++) await ledger.plan({...state,day:state.day+i,familyReview:{...state.familyReview,due:false}});
  assert.equal(store.map.get("city-ai-ledger").records.length,2);
  const receipt=(await ledger.status()).events.find(e=>e.day===state.day);
  assert.equal(receipt.body.families.length,1);
  assert.equal(receipt.body.assignments,undefined);
});


test("a lost 19:00 plan recovers real AI activities and a house exactly once, including after reload and a cached-device merge", async () => {
  let g=await establish();
  g=applyJobPlan(g,localJobPlan(Object.values(g.jobCity.profiles),13),13);
  const owner=Object.values(g.jobCity.profiles)[0]; owner.coins=100000;
  const now=epoch+(13*1440+420)*1000, event=nextCityAIEvent(g,now), state=validateCityAIState(event);
  const body=reply(state), index=state.cats.findIndex(p=>p.id===owner.id);
  body.houses=[{cat:index,house:0,roommate:null}];
  const result=await requestCityLife(state,async()=>({response:body}));
  g=reload(reserveCityAIEvent(g,event));
  const snapshot={events:[{...event,status:200,body:result}]};
  const next=recoverCityAIReceipt(g,snapshot,now);
  assert.equal(next.jobCity.plan.source,"ai");
  assert.equal(next.jobCity.eveningAIAppliedDay,event.day);
  assert.equal(Object.keys(next.housing.homes).length,1);
  assert.ok(next.jobCity.profiles[owner.id].coins<g.jobCity.profiles[owner.id].coins);
  const visitor=result.assignments.find(p=>p.outings?.length);
  assert.ok(visitor,"the fixture must contain an AI leisure choice");
  assert.deepEqual(next.jobCity.profiles[visitor.id].schedule.outings,visitor.outings);
  const loaded=reload(next);
  assert.equal(recoverCityAIReceipt(loaded,snapshot,now),loaded);
  const cached=structuredClone(g);delete cached.jobCity.eveningAIAppliedDay;cached.coins--;
  const merged=mergeSharedWorld(g,next,cached);
  assert.equal(merged.jobCity.eveningAIAppliedDay,event.day);
  assert.deepEqual(merged.housing,next.housing);
  assert.equal(merged.jobCity.profiles[owner.id].coins,next.jobCity.profiles[owner.id].coins);
});
