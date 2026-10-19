import { test } from "node:test";
import fs from "node:fs";
import assert from "node:assert/strict";
import { newGame, loadGame, SAVE_KEY } from "../public/economy.js";
import { BIOMES } from "../public/game-data.js";
import { ADOPTION_CATS } from "../public/cat-breeds.js";
import {
  JOB_KINDS,
  JOB_CARS,
  JOB_CAPACITY,
  JOB_BUSINESSES,
} from "../public/jobcity-data.js";
import {
  ensureJobCity,
  localJobPlan,
  applyJobPlan,
  recordJobAttendance,
  advanceJobCity,
  advanceCityEvening,
  jobAIState,
  finishCatDrive,
} from "../public/jobcity-system.js";
import {
  createJobCityRuntime,
  jobCatFrame,
} from "../public/jobcity-runtime.js";
import { HOUSE_TYPES } from "../public/housing-data.js";
import { ownedHomes, buyCatHome } from "../public/housing-system.js";
import {
  homeRestTime,
  createHousingRuntime,
} from "../public/housing-runtime.js";
import {
  requestCityPlan,
  validateCityAIState,
  cityPlanInput,
  expandCityPlan,
} from "../jobcity-ai.mjs";
const epoch = Date.UTC(2026, 9, 19, 12),
  at = (day, minute) => epoch + (day * 1440 + minute - 720) * 1000;
function seed() {
  let g = newGame(epoch);
  g.unlocked = BIOMES.map((b) => b.id);
  g.adoption.cats = ADOPTION_CATS.map((c) => ({
    id: c.id,
    adoptedAt: epoch,
    homeBiome: "moon",
    centerId: "",
  }));
  return ensureJobCity(g, epoch);
}

test("the one daily AI batch includes all 147 cats with unique identities, preferences, skills and permanent-career constraints", async () => {
  const g = seed(),
    state = validateCityAIState(jobAIState(g, epoch));
  assert.equal(state.cats.length, 147);
  assert.equal(new Set(state.cats.map((p) => p.id)).size, 147);
  const assignments = localJobPlan(Object.values(g.jobCity.profiles), 0),
    input = cityPlanInput(state);
  assert.ok(
    input.messages[1].content.length < 20000,
    "full roster must fit the fast model context",
  );
  assert.ok(input.max_tokens <= 6500);
  let calls = 0;
  const response = await requestCityPlan(state, async () => {
    calls++;
    return {
      response: {
        assignments: assignments.map((a) => [
          state.cats.findIndex((p) => p.id === a.id),
          a.job === "rest" ? -1 : JOB_KINDS.indexOf(a.job),
          JOB_KINDS.indexOf(a.profession),
          ["rest", "walk", "drive"].indexOf(a.evening),
          -1,
          -1,
        ]),
      },
    };
  });
  assert.equal(calls, 1);
  assert.equal(response.assignments.length, 147);
  const n = applyJobPlan(g, response.assignments, 0, "ai");
  assert.ok(
    Object.values(n.jobCity.profiles).every(
      (p) => p.profession && p.professionSource === "ai",
    ),
  );
  assert.throws(
    () => expandCityPlan({ assignments: [[999, 0, 0, 0, -1, -1]] }, state),
    /compact/,
  );
});

test("120 simulated days produce actual attended wages, different success and wealth, automatic houses and car purchases without starving later cats", () => {
  let g = seed();
  const profiles = () => Object.values(g.jobCity.profiles),
    earnedByDay12 = new Set(),
    carsBought = new Set();
  const firstProfession = new Map();
  for (let day = 0; day < 120; day++) {
    const plan = localJobPlan(profiles(), day);
    for (const a of plan) {
      const p = g.jobCity.profiles[a.id],
        house = HOUSE_TYPES[(p.id.length + day) % HOUSE_TYPES.length],
        hasCar = JOB_CARS.some((c) => p.inventory[c.id]);
      if (
        p.coins >= house.price &&
        (!ownedHomes(g, p.id).length ||
          (hasCar && day % 21 === 0 && p.coins > house.price + 2500))
      )
        a.house = { type: house.id, roommate: null };
    }
    g = applyJobPlan(g, plan, day, "ai");
    for (const a of plan) {
      const p = g.jobCity.profiles[a.id];
      if (!firstProfession.has(p.id)) firstProfession.set(p.id, p.profession);
      assert.equal(p.profession, firstProfession.get(p.id));
      if (a.job !== "rest")
        g = recordJobAttendance(
          g,
          a.id,
          a.job,
          true,
          at(day, 750 + (p.id.length % 20)),
        );
    }
    g = advanceCityEvening(advanceJobCity(g, at(day, 1140)), at(day, 1140));
    for (const p of profiles()) {
      if (day <= 12 && p.earnedTotal > 0) earnedByDay12.add(p.id);
      if (JOB_CARS.some((c) => p.inventory[c.id])) carsBought.add(p.id);
      if (p.trip) g = finishCatDrive(g, p.id, p.trip.id);
      assert.ok(p.coins >= 0);
    }
    if (day % 10 === 0)
      g = loadGame(
        { getItem: (k) => (k === SAVE_KEY ? JSON.stringify(g) : null) },
        at(day, 1200),
        { advance: false },
      );
  }
  assert.equal(
    earnedByDay12.size,
    147,
    "no cat is permanently excluded by a full profession",
  );
  assert.equal(
    carsBought.size,
    147,
    "every cat can eventually afford their own desired car",
  );
  assert.ok(profiles().every((p) => ownedHomes(g, p.id).length >= 1));
  assert.ok(new Set(profiles().map((p) => p.earnedTotal)).size > 10);
  assert.ok(new Set(profiles().map((p) => p.coins)).size > 30);
  assert.ok(
    Object.keys(g.housing.homes).length > 147,
    "some owners buy additional distinct homes",
  );
  assert.ok(profiles().every((p) => p.professionChanges === 0));
  console.log(
    JSON.stringify({
      simulatedDays: 120,
      cats: profiles().length,
      owners: profiles().filter((p) => ownedHomes(g, p.id).length).length,
      carOwners: carsBought.size,
      houses: Object.keys(g.housing.homes).length,
      differentEarnings: new Set(profiles().map((p) => p.earnedTotal)).size,
      differentBalances: new Set(profiles().map((p) => p.coins)).size,
      minCoins: Math.min(...profiles().map((p) => p.coins)),
      maxCoins: Math.max(...profiles().map((p) => p.coins)),
    }),
  );
});

test("homeowners respect 12–19 work and their AI evening choice: walks and drives before 22, quiet rest earlier, and one active home overnight", () => {
  let g = seed();
  g.jobCity.profiles.chichi.coins = 5000;
  g = buyCatHome(g, "chichi", HOUSE_TYPES[0].id, "buy-chichi-1");
  const p = g.jobCity.profiles.chichi;
  for (const evening of ["rest", "walk", "drive"]) {
    p.schedule = { day: 0, job: "estate", evening };
    assert.equal(homeRestTime(g, p.id, at(1, 719)), true);
    assert.equal(homeRestTime(g, p.id, at(0, 720)), false);
    assert.equal(homeRestTime(g, p.id, at(0, 1139)), false);
    assert.equal(homeRestTime(g, p.id, at(0, 1140)), evening === "rest");
    assert.equal(homeRestTime(g, p.id, at(0, 1319)), evening === "rest");
    assert.equal(homeRestTime(g, p.id, at(0, 1320)), true);
    const rt = createHousingRuntime(),
      actors = [{ id: p.id }];
    rt.step(g, actors, 1 / 30, 0, {
      night: true,
      eligible: (a) => homeRestTime(g, a.id, at(0, 1200)),
    });
    assert.equal(rt.visits.size, evening === "rest" ? 1 : 0);
    rt.step(g, actors, 1 / 30, 0, {
      night: true,
      eligible: (a) => homeRestTime(g, a.id, at(0, 1320)),
    });
    assert.equal(rt.visits.size, 1);
    rt.step(g, actors, 1 / 30, 0, { night: false });
    assert.equal(rt.visits.size, 0);
  }
});

test("the captured real 147-cat AI response keeps every chosen profession while the scheduler reserves only real available seats", async () => {
  const g = seed();
  Object.values(g.jobCity.profiles).forEach((p, i) => {
    p.profession = JOB_KINDS[i % 6];
    p.professionSource = "ai";
    p.professionSinceDay = 0;
  });
  const state = validateCityAIState(jobAIState(g, epoch)),
    raw = JSON.parse(
      fs.readFileSync(
        new URL("./fixtures/city-ai-full-roster.json", import.meta.url),
      ),
    );
  const out = await requestCityPlan(state, async () => ({ response: raw }));
  assert.equal(out.assignments.length, 147);
  for (const a of out.assignments)
    assert.equal(
      a.profession,
      state.cats.find((c) => c.id === a.id).profession,
    );
  for (const job of JOB_KINDS)
    assert.ok(
      out.assignments.filter((a) => a.job === job).length <= JOB_CAPACITY,
    );
  assert.ok(out.assignments.some((a) => a.evening === "walk"));
});
test("a real initial AI career batch opens available shifts immediately instead of leaving the whole city without wages", async () => {
  const g = seed(),
    state = validateCityAIState(jobAIState(g, epoch)),
    raw = JSON.parse(
      fs.readFileSync(
        new URL("./fixtures/city-ai-initial-roster.json", import.meta.url),
      ),
    );
  const out = await requestCityPlan(state, async () => ({ response: raw }));
  assert.equal(out.assignments.length, 147);
  assert.ok(out.assignments.filter((a) => a.job !== "rest").length >= 30);
  const next = applyJobPlan(g, out.assignments, 0, "ai");
  assert.ok(
    Object.values(next.jobCity.profiles).every(
      (p) => p.professionSource === "ai",
    ),
  );
  for (const job of JOB_KINDS)
    assert.ok(
      out.assignments.filter((a) => a.job === job).length <= JOB_CAPACITY,
    );
  const later = {
    ...state,
    day: 5,
    cats: state.cats.map((p, i) => ({
      ...p,
      profession: out.assignments.find((a) => a.id === p.id).profession,
      lastPaidDay: i < 30 ? 4 : -1,
    })),
  };
  const nextDay = await requestCityPlan(later, async () => ({ response: raw }));
  assert.ok(
    nextDay.assignments
      .filter((a) => a.job !== "rest")
      .every((a) => later.cats.find((p) => p.id === a.id).lastPaidDay === -1),
  );
});
test("a homeowner physically completes an evening drive, keeps free time, reaches their bed at night and returns to a work seat next day", () => {
  let g = seed();
  const p = g.jobCity.profiles.chichi;
  p.coins = 5000;
  p.profession = "estate";
  p.professionSource = "ai";
  p.professionSinceDay = 0;
  p.inventory[JOB_CARS[0].id] = 1;
  p.schedule = { day: 0, job: "estate", evening: "drive" };
  g = buyCatHome(g, "chichi", HOUSE_TYPES[0].id, "buy-chichi-1");
  g = advanceCityEvening(g, at(0, 1140));
  assert.ok(g.jobCity.profiles.chichi.trip);
  let now = at(0, 1140),
    arrivals = 0;
  const jobs = createJobCityRuntime({
      onAttendance: (id, job, active) => {
        g = recordJobAttendance(g, id, job, active, now);
        if (active) arrivals++;
      },
      onTripDone: (id, trip, position) => {
        g = finishCatDrive(g, id, trip, position);
      },
    }),
    home = createHousingRuntime();
  const actor = {
    id: "chichi",
    index: -1,
    biome: "jobcity",
    local: { x: 0, z: 56, y: 0.32 },
  };
  for (let i = 0; i < 3000; i++) {
    now = at(0, 1140 + i / 30);
    jobs.step(g, [actor], 1 / 30, i / 30, {
      now,
      blocked: () =>
        homeRestTime(g, actor.id, now) && !g.jobCity.profiles.chichi.trip,
    });
    const frame = jobs.get(actor.id) && jobCatFrame(jobs.get(actor.id), i / 30);
    if (frame) actor.local = { ...frame.position };
    home.step(g, [{ id: actor.id }], 1 / 30, i / 30, {
      night: true,
      eligible: (a) => homeRestTime(g, a.id, now),
      blocked: () => !!g.jobCity.profiles.chichi.trip || jobs.has(actor.id),
    });
  }
  assert.equal(g.jobCity.profiles.chichi.trip, null);
  assert.equal(
    home.visits.size,
    0,
    "free evening must not become forced sleep",
  );
  now = at(0, 1320);
  jobs.step(g, [actor], 1 / 30, 200, { now, blocked: () => true });
  for (let i = 0; i < 4000; i++)
    home.step(g, [{ id: actor.id }], 1 / 30, i / 30, {
      night: true,
      eligible: (a) => homeRestTime(g, a.id, now),
    });
  const sleeping = home.get(actor.id);
  assert.equal(sleeping.phase, "relax");
  actor.local = {
    x: sleeping.position.x - 160,
    y: sleeping.position.y,
    z: sleeping.position.z,
  };
  actor.biome = "cat-homes";
  const plan = localJobPlan(Object.values(g.jobCity.profiles), 1);
  for (const a of plan) a.job = a.id === "chichi" ? "estate" : "rest";
  g = applyJobPlan(g, plan, 1, "ai");
  home.step(g, [{ id: actor.id }], 1 / 30, 201, { night: false });
  for (let i = 0; i < 2000; i++) {
    now = at(1, 720 + i / 30);
    jobs.step(g, [actor], 1 / 30, i / 30, { now });
    const frame = jobs.get(actor.id) && jobCatFrame(jobs.get(actor.id), i / 30);
    if (frame) actor.local = { ...frame.position };
  }
  assert.equal(jobs.get(actor.id).phase, "work");
  assert.ok(arrivals > 0);
  assert.ok(g.jobCity.profiles.chichi.attendance?.active);
  assert.equal(home.visits.size, 0);
});
