import { test } from "node:test";
import assert from "node:assert/strict";
import { newGame, loadGame, saveGame } from "../public/economy.js";
import { BIOMES } from "../public/game-data.js";
import { ADOPTION_CATS } from "../public/cat-breeds.js";
import { activeCats } from "../public/cat-roster.js";
import {
  ensureJobCity,
  applyJobPlan,
  localJobPlan,
  validateJobAssignments,
} from "../public/jobcity-system.js";
import {
  applyFamilyDecisions,
  familyCalendar,
} from "../public/family-system.js";
import { completeLeisure, leisureOffers } from "../public/leisure-data.js";
import {
  createLeisureRuntime,
  familyFollowTarget,
} from "../public/leisure-runtime.js";
import { createCourtRuntime } from "../public/foodcourt-runtime.js";
import { courtObject } from "../public/foodcourt-data.js";
import { courtObstacles } from "../public/foodcourt-navigation.js";
import { catSex } from "../public/cat-sex.js";
import { mergeSharedWorld } from "../shared-world.mjs";
const now = Date.UTC(2026, 9, 19, 12),
  ids = ["chichi", "adopt-nimbus"];
function seed() {
  let g = newGame(now);
  g.unlocked = BIOMES.map((b) => b.id);
  g.adoption.cats = ADOPTION_CATS.map((c) => ({
    id: c.id,
    adoptedAt: now,
    homeBiome: "moon",
    centerId: "",
  }));
  g = ensureJobCity(g, now);
  return applyFamilyDecisions(g, 13, [
    { male: ids[1], female: ids[0], reason: "Люблять пригоди" },
  ]);
}
function itinerary(g, day = 13) {
  const plan = localJobPlan(Object.values(g.jobCity.profiles), day);
  for (const p of plan) {
    p.job = "rest";
    p.evening = "walk";
    p.outings = ids.includes(p.id) ? ["bikini-krusty"] : [];
  }
  return applyJobPlan(g, plan, day, "ai");
}
const evening = { day: 13, minute: 19 * 60 + 30, working: false };
const actors = () =>
  ids.map((id, i) => ({
    id,
    radius: 0.55,
    position: { x: -3 + i * 3, z: 8, y: 0.16 },
  }));

test("AI-selected partners share the same itinerary while retaining separate professions and shifts", () => {
  let g = seed();
  const plan = localJobPlan(Object.values(g.jobCity.profiles), 13);
  plan.find((p) => p.id === ids[0]).outings = ["bikini-krusty", "spa-jacuzzi"];
  plan.find((p) => p.id === ids[1]).outings = ["spa-lounge"];
  g = applyJobPlan(g, plan, 13, "ai");
  for (const id of ids) {
    assert.deepEqual(g.jobCity.profiles[id].schedule.outings, [
      "bikini-krusty",
      "spa-jacuzzi",
    ]);
    assert.equal(
      g.jobCity.profiles[id].schedule.job,
      plan.find((p) => p.id === id).job,
    );
    assert.equal(
      g.jobCity.profiles[id].profession,
      plan.find((p) => p.id === id).profession,
    );
  }
});

test("shared free-time reservations do not overlap, survive reload and advance only after each completed native restaurant visit", () => {
  let g = itinerary(seed());
  const runtime = createLeisureRuntime(),
    people = actors(),
    phases = new Map(ids.map((id) => [id, new Set()])),
    receipts = [];
  const court = createCourtRuntime({
    getObstacles: (b) => courtObstacles([], b),
    onComplete: (r) => {
      receipts.push(r);
      const v = runtime.finish(r.catId);
      assert.ok(v);
      g = completeLeisure(g, r.catId, v.day, v.index, "bikini");
    },
  });
  const offers = new Map(leisureOffers(g).map((o) => [o.id, o]));
  const options = {
    clock: evening,
    offers,
    start: (id, o) =>
      !!court.start({
        catId: id,
        objectId: o.id,
        position: people.find((a) => a.id === id).position,
        radius: 0.55,
        now,
      }),
    destination: (o, a) => a.position,
  };
  for (let i = 0; i < 9000 && receipts.length < 2; i++) {
    runtime.step(g, people, 1 / 30, i / 30, options);
    court.step(1 / 30, i / 30);
    for (const p of people) {
      const v = court.get(p.id);
      if (v) {
        p.position = { ...v.position };
        phases.get(p.id).add(v.phase);
      } else if (runtime.frame(p.id))
        p.position = { ...runtime.frame(p.id).position };
    }
    const both = ids.map((id) => court.get(id));
    if (both.every(Boolean) && both.every((v) => v.phase === "consume"))
      assert.ok(
        Math.hypot(
          both[0].position.x - both[1].position.x,
          both[0].position.z - both[1].position.z,
        ) > 1.1,
      );
  }
  assert.equal(receipts.length, 2);
  assert.equal(new Set(receipts.map((r) => r.id)).size, 2);
  for (const id of ids) {
    assert.ok(phases.get(id).has("prepare"));
    assert.ok(phases.get(id).has("consume"));
    assert.equal(g.jobCity.profiles[id].leisureProgress.done, 1);
  }
  const store = new Map(),
    storage = {
      getItem: (k) => store.get(k) || null,
      setItem: (k, v) => store.set(k, v),
    };
  saveGame(storage, g);
  g = loadGame(storage, now, { advance: false });
  const restarted = createLeisureRuntime();
  restarted.step(g, people, 1 / 30, 0, options);
  assert.equal(restarted.visits.size, 0);
});

test("work, player commands and loss of simulation ownership immediately release automatic visits", () => {
  for (const cause of ["work", "manual", "ownership"]) {
    const g = itinerary(seed()),
      r = createLeisureRuntime(),
      p = actors(),
      stopped = [];
    const options = {
      clock: evening,
      offers: new Map(leisureOffers(g).map((o) => [o.id, o])),
      stop: (id) => stopped.push(id),
    };
    r.step(g, p, 0.05, 0, options);
    assert.equal(r.visits.size, 2);
    if (cause === "work") {
      for (const id of ids)
        g.jobCity.profiles[id].schedule.job = g.jobCity.profiles[id].profession;
      options.clock = { ...evening, minute: 12 * 60, working: true };
    } else if (cause === "manual") options.blocked = () => true;
    else options.allow = false;
    r.step(g, p, 0.05, 2, options);
    assert.equal(r.visits.size, 0);
    assert.deepEqual(stopped.sort(), [...ids].sort());
  }
});

test("a working partner is not pulled out of their own job by the other cat’s outing", () => {
  const g = itinerary(seed()),
    r = createLeisureRuntime();
  g.jobCity.profiles[ids[1]].schedule.job =
    g.jobCity.profiles[ids[1]].profession;
  r.step(g, actors(), 0.05, 0, {
    clock: { ...evening, minute: 13 * 60, working: true },
    offers: new Map(leisureOffers(g).map((o) => [o.id, o])),
  });
  assert.ok(r.has(ids[0]));
  assert.equal(r.has(ids[1]), false);
});

test("removed venues and full queues do not strand a daily itinerary, and a completed partner is never charged twice", () => {
  let g = itinerary(seed()),
    r = createLeisureRuntime();
  const skipped = [];
  const options = {
    clock: evening,
    offers: new Map(),
    skip: (id, v) => {
      skipped.push(id);
      g = completeLeisure(g, id, v.day, v.index);
    },
  };
  r.step(g, actors(), 0.05, 0, options);
  assert.deepEqual(skipped.sort(), [...ids].sort());
  assert.equal(r.visits.size, 0);
  g = itinerary(seed());
  r = createLeisureRuntime();
  options.offers = new Map(leisureOffers(g).map((o) => [o.id, o]));
  r.step(g, actors(), 0.05, 0, options);
  for (let i = 1; i < 1500; i++) r.step(g, actors(), 0.05, i * 0.05, options);
  assert.equal(r.visits.size, 0);
  assert.equal(g.jobCity.profiles[ids[0]].leisureProgress.done, 1);
  g = itinerary(seed());
  g = completeLeisure(g, ids[0], 13, 0, "bikini");
  r = createLeisureRuntime();
  r.step(g, actors(), 0.05, 0, options);
  assert.equal(r.visits.size, 1);
  assert.equal(r.has(ids[0]), false);
  assert.ok(r.has(ids[1]));
});

test("family spacing scales with actual body radii, including very large fluffy cats", () => {
  for (const [a, b] of [
    [0.55, 0.55],
    [1.6, 0.9],
    [2.4, 1.8],
  ])
    for (const yaw of [0, 0.7, Math.PI]) {
      const leader = { position: { x: 12, y: 0.16, z: 4 }, yaw },
        p = familyFollowTarget(leader, a, b);
      assert.ok(Math.hypot(p.x - 12, p.z - 4) > a + b + 0.35);
      assert.equal(p.y, 0.16);
    }
});

test("invalid, duplicate, locked or unbuilt AI destinations fail validation without changing careers or money", () => {
  const g = seed(),
    p = localJobPlan(Object.values(g.jobCity.profiles), 13);
  for (const bad of [
    ["bikini-krusty", "bikini-krusty"],
    ["bad!"],
    [1],
    ["a", "b", "c", "d"],
    "a",
  ]) {
    const a = structuredClone(p);
    a[0].outings = bad;
    assert.throws(() =>
      validateJobAssignments(
        { assignments: a },
        Object.values(g.jobCity.profiles),
      ),
    );
  }
  const a = structuredClone(p);
  a[0].outings = ["not-built-venue"];
  const before = structuredClone(g);
  assert.throws(() => applyJobPlan(g, a, 13, "ai"), /недоступне/);
  assert.deepEqual(g, before);
});

test("a paired venue kitten remains available when its counter is stored; gender and partner survive migration", () => {
  let g = seed();
  const venue = activeCats(g).find((c) => c.venue);
  if (!venue) {
    g.placements.push({
      id: "qa-hotdog",
      item: "business-hotdog",
      biome: "moon",
      x: 4,
      z: 4,
    });
    g = ensureJobCity(g, now);
  }
  const kitten = activeCats(g).find((c) => c.venue);
  assert.ok(kitten);
  const sex = catSex(kitten),
    partner = Object.values(g.jobCity.profiles).find(
      (p) => catSex(p) !== sex && !ids.includes(p.id),
    );
  g = applyFamilyDecisions(g, 27, [
    {
      male: sex === "male" ? kitten.id : partner.id,
      female: sex === "female" ? kitten.id : partner.id,
    },
  ]);
  g.placements = g.placements.filter((p) => p.item !== kitten.venue);
  assert.ok(activeCats(g).some((c) => c.id === kitten.id));
  const store = new Map(),
    storage = {
      getItem: (k) => store.get(k) || null,
      setItem: (k, v) => store.set(k, v),
    };
  saveGame(storage, g);
  const restored = loadGame(storage, now, { advance: false });
  assert.deepEqual(restored.family, g.family);
  assert.ok(restored.jobCity.profiles[kitten.id]);
});

test("concurrent family decisions share one introduction budget, including responses on adjacent days", () => {
  let g = seed();
  const keep = Object.values(g.jobCity.profiles).slice(0, 16);
  g.jobCity.profiles = Object.fromEntries(keep.map((p) => [p.id, p]));
  g.family.couples = {};
  g.family.lastReviewDay = 12;
  const males = keep.filter((p) => catSex(p) === "male"),
    females = keep.filter((p) => catSex(p) === "female");
  const pair = (i) => ({ male: males[i].id, female: females[i].id });
  const a = applyFamilyDecisions(g, 26, [pair(0), pair(1)]),
    b = applyFamilyDecisions(g, 26, [pair(2)]);
  assert.throws(() => mergeSharedWorld(g, a, b), /сім|Сім|family/i);
  const nextDay = applyFamilyDecisions(g, 27, [pair(2)]);
  assert.throws(() => mergeSharedWorld(g, a, nextDay), /сім|Сім|family/i);
  const later = applyFamilyDecisions(a, 40, [pair(2)]);
  const merged = mergeSharedWorld(a, a, later);
  assert.equal(Object.keys(merged.family.couples).length, 3);
  assert.deepEqual(
    merged.family.couples[
      a.family.couples[Object.keys(a.family.couples)[0]].id
    ],
    Object.values(a.family.couples)[0],
  );
});

test("the daily AI batch preserves chosen professions while reserving valid shifts and never spawns an unowned car", async () => {
  const { requestCityPlan, validateCityAIState } = await import(
    "../jobcity-ai.mjs"
  );
  const { jobAIState } = await import("../public/jobcity-system.js");
  const g = seed(),
    s = validateCityAIState(jobAIState(g, now + 13 * 1440000));
  const plan = localJobPlan(Object.values(g.jobCity.profiles), 13).map(
    (a, i) => ({
      ...a,
      job: ["bank", "crypto", "factory", "furniture", "estate", "cars"][
        (i + 1) % 6
      ],
      evening: "drive",
    }),
  );
  const response = await requestCityPlan(s, async () => ({
    response: { assignments: plan, families: [] },
  }));
  assert.equal(response.assignments.length, s.cats.length);
  for (const a of response.assignments) {
    assert.equal(a.profession, plan.find((p) => p.id === a.id).profession);
    assert.ok(a.job === "rest" || a.job === a.profession);
    assert.equal(a.evening, "walk");
  }
});

test("storing a ride while its native visit is cancelled releases the reservation and advances safely", () => {
  let g = itinerary(seed());
  const r = createLeisureRuntime(),
    people = actors();
  let active = true;
  const options = {
    clock: evening,
    offers: new Map(leisureOffers(g).map((o) => [o.id, o])),
    start: () => true,
    active: () => active,
    skip: (id, v) => {
      g = completeLeisure(g, id, v.day, v.index);
    },
  };
  for (let i = 0; i < 60; i++) r.step(g, people, 0.05, i * 0.05, options);
  assert.ok([...r.visits.values()].every((v) => v.phase === "activity"));
  active = false;
  r.step(g, people, 0.05, 4, options);
  assert.equal(r.visits.size, 0);
  for (const id of ids)
    assert.equal(g.jobCity.profiles[id].leisureProgress.done, 1);
});

test("all 147 cats get a first leisure turn before repeat outings, with six concurrent reservations and varied daily priority", () => {
  let g = itinerary(seed());
  for (const p of Object.values(g.jobCity.profiles)) {
    p.schedule = {
      day: 13,
      job: "rest",
      evening: "walk",
      outings: ["bikini-krusty", "spa-lounge", "spa-jacuzzi"],
    };
    p.leisureProgress = { day: 13, done: 0 };
  }
  const people = Object.values(g.jobCity.profiles).map((p, i) => ({
    id: p.id,
    radius: 0.55,
    position: { x: i * 2, y: 0.16, z: 0 },
  }));
  const r = createLeisureRuntime(),
    offers = new Map(leisureOffers(g).map((o) => [o.id, o])),
    finished = new Set();
  let max = 0;
  for (let i = 0; i < 15000 && finished.size < people.length; i++) {
    r.step(g, people, 0.05, i * 0.05, {
      clock: evening,
      offers,
      start: () => true,
    });
    max = Math.max(max, r.visits.size);
    for (const [id, v] of [...r.visits])
      if (v.phase === "activity") {
        assert.equal(
          v.index,
          0,
          "No repeats while another cat has not had a first turn",
        );
        r.finish(id);
        g = completeLeisure(g, id, v.day, v.index, v.offer.biome);
        finished.add(id);
      }
  }
  assert.equal(finished.size, 147);
  assert.ok(max <= 6);
  const first = [];
  for (let day = 14; day < 20; day++) {
    const n = structuredClone(g);
    for (const p of Object.values(n.jobCity.profiles)) {
      p.schedule.day = day;
      p.leisureProgress = { day, done: 0 };
    }
    const runtime = createLeisureRuntime();
    runtime.step(n, people, 0.05, 0, { clock: { ...evening, day }, offers });
    first.push([...runtime.visits.keys()].sort().join(","));
  }
  assert.ok(
    new Set(first).size >= 5,
    "Daily priority should not always favour the same roster entries",
  );
});

test("a couple waits for two free reservations instead of overflowing a six-cat leisure budget", () => {
  const g = itinerary(seed()),
    r = createLeisureRuntime(),
    people = Object.values(g.jobCity.profiles).map((p) => ({
      id: p.id,
      radius: 0.55,
      position: { x: 0, y: 0.16, z: 0 },
    })),
    offer = leisureOffers(g).find((o) => o.id === "bikini-krusty");
  const occupied = people.filter((p) => !ids.includes(p.id)).slice(0, 5);
  for (const p of occupied)
    r.visits.set(p.id, {
      catId: p.id,
      day: 13,
      index: 0,
      phase: "activity",
      offer,
    });
  const options = { clock: evening, offers: new Map([[offer.id, offer]]) };
  r.step(g, people, 0.05, 0, options);
  assert.equal(r.visits.size, 5);
  assert.equal(r.has("chichi"), false);
  r.finish(occupied[0].id);
  r.step(g, people, 0.05, 2, options);
  assert.equal(r.visits.size, 6);
  assert.ok(r.has("chichi"));
  assert.ok(r.has("adopt-nimbus"));
});

test("an invalid AI career suggestion cannot reset a permanent profession or discard a valid new family and leisure plan", async () => {
  const { requestCityPlan, validateCityAIState, cityPlanInput } = await import(
    "../jobcity-ai.mjs"
  );
  const { jobAIState } = await import("../public/jobcity-system.js");
  let g = itinerary(seed());
  const state = validateCityAIState(jobAIState(g, now + 27 * 1440000));
  for (const p of state.cats) p.canChangeProfession = false;
  const free = state.cats.filter((p) => !p.partner),
    male = free.find((p) => p.sex === "male"),
    female = free.find((p) => p.sex === "female");
  const wrong = localJobPlan(Object.values(g.jobCity.profiles), 27).map(
    (a, i) => ({
      ...a,
      profession: ["bank", "crypto", "factory", "furniture", "estate", "cars"][
        (i + 2) % 6
      ],
      outings: ["bikini-krusty"],
    }),
  );
  const result = await requestCityPlan(state, async () => ({
    response: {
      assignments: wrong,
      families: [
        { male: "adopt-nimbus", female: "chichi" },
        { male: male.id, female: female.id, reason: "Люблять гуляти разом" },
      ],
    },
  }));
  assert.equal(result.assignments.length, 147);
  for (const a of result.assignments) {
    assert.equal(
      a.profession,
      state.cats.find((p) => p.id === a.id).profession,
    );
    assert.deepEqual(a.outings, ["bikini-krusty"]);
  }
  assert.equal(result.families.length, 1);
  assert.equal(result.families[0].male, male.id);
  const input = JSON.parse(cityPlanInput(state).messages[1].content);
  for (const index of input.familyCandidates.males) {
    assert.equal(state.cats[index].sex, "male");
    assert.equal(state.cats[index].partner, null);
  }
  for (const index of input.familyCandidates.females) {
    assert.equal(state.cats[index].sex, "female");
    assert.equal(state.cats[index].partner, null);
  }
});

test("a phantom extra AI row is ignored only when all real cats have exactly one complete decision", async () => {
  const { requestCityPlan, validateCityAIState } = await import(
    "../jobcity-ai.mjs"
  );
  const { jobAIState } = await import("../public/jobcity-system.js");
  const { JOB_KINDS } = await import("../public/jobcity-data.js");
  const g = seed(),
    state = validateCityAIState(jobAIState(g, now + 13 * 1440000));
  const rows = localJobPlan(Object.values(g.jobCity.profiles), 13).map((a) => [
    state.cats.findIndex((p) => p.id === a.id),
    a.job === "rest" ? -1 : JOB_KINDS.indexOf(a.job),
    JOB_KINDS.indexOf(a.profession),
    0,
    -1,
    -1,
    "",
    [],
  ]);
  const phantom = [147, 0, 0, 0, -1, -1, "", []];
  const result = await requestCityPlan(state, async () => ({
    response: { assignments: [...rows, phantom], families: [] },
  }));
  assert.equal(result.assignments.length, 147);
  await assert.rejects(
    requestCityPlan(state, async () => ({
      response: { assignments: [...rows.slice(1), phantom] },
    })),
  );
  await assert.rejects(
    requestCityPlan(state, async () => ({
      response: { assignments: [...rows, rows[0], phantom] },
    })),
  );
});
