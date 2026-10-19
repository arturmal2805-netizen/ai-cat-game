import { test } from "node:test";
import assert from "node:assert/strict";
import { newGame, loadGame, saveGame, SAVE_KEY } from "../public/economy.js";
import { BIOMES } from "../public/game-data.js";
import { ADOPTION_CATS } from "../public/cat-breeds.js";
import {
  ensureJobCity,
  localJobPlan,
  applyJobPlan,
  jobAIState,
} from "../public/jobcity-system.js";
import { catSex, sexSymbol } from "../public/cat-sex.js";
import {
  familyReview,
  familyCalendar,
  familyPartners,
  applyFamilyDecisions,
  familyLimit,
} from "../public/family-system.js";
import { buyCatHome, ownedHomes } from "../public/housing-system.js";
import { mergeSharedWorld } from "../shared-world.mjs";
import { leisureOffers, completeLeisure } from "../public/leisure-data.js";
import {
  validateCityAIState,
  requestCityPlan,
  cityPlanInput,
} from "../jobcity-ai.mjs";
const now = Date.UTC(2026, 9, 19, 12);
function seed() {
  let g = newGame(now);
  g.unlocked = BIOMES.map((b) => b.id);
  g.adoption.cats = ADOPTION_CATS.map((c) => ({
    id: c.id,
    adoptedAt: now,
    homeBiome: "moon",
    centerId: "",
  }));
  return ensureJobCity(g, now);
}
function choices(g, count = 2) {
  const used = familyPartners(g),
    p = Object.values(g.jobCity.profiles).filter((p) => !used.has(p.id)),
    m = p.filter((p) => catSex(p) === "male"),
    f = p.filter((p) => catSex(p) === "female");
  return Array.from(
    { length: Math.min(count, m.length, f.length) },
    (_, i) => ({
      male: m[i].id,
      female: f[i].id,
      reason: "Обидва люблять затишок і прогулянки",
    }),
  );
}
test("all current cats have a stable sex without changing their approved meshes or names", () => {
  const g = seed();
  assert.equal(Object.keys(g.jobCity.profiles).length, 147);
  for (const p of Object.values(g.jobCity.profiles)) {
    assert.equal(p.sex, catSex(p));
    assert.equal(catSex({ ...p, name: "Нове ім'я" }), p.sex);
    assert.ok(["♂", "♀"].includes(sexSymbol(p)));
  }
  assert.equal(catSex("chichi"), "female");
});
test("the new calendar begins on day one without resetting existing work, wallets or wages", () => {
  const g = seed();
  assert.equal(familyCalendar(g, 0).number, 1);
  assert.equal(familyCalendar(g, 13).number, 14);
  assert.equal(familyCalendar(g, 13).date, "2026-11-01");
  assert.equal(familyReview(g, 12).due, false);
  assert.equal(familyReview(g, 13).due, true);
  const n = applyFamilyDecisions(g, 13, choices(g));
  assert.equal(familyReview(n, 26).due, false);
  assert.equal(familyReview(n, 27).due, true);
  assert.deepEqual(n.jobCity, g.jobCity);
});
test("only real AI creates lifelong families, at most a quarter of cats, with no replayed or daily replacement", () => {
  let g = seed();
  const plan = localJobPlan(Object.values(g.jobCity.profiles), 13),
    p = choices(g);
  assert.equal(
    Object.keys(applyJobPlan(g, plan, 13, "local", p).family.couples).length,
    0,
  );
  g = applyJobPlan(g, plan, 13, "ai", p);
  const first = structuredClone(g.family.couples);
  assert.equal(Object.keys(first).length, 2);
  assert.equal(applyFamilyDecisions(g, 13, p), g);
  assert.equal(applyFamilyDecisions(g, 14, choices(g)), g);
  for (let day = 27; day < 300; day += 14)
    g = applyFamilyDecisions(g, day, choices(g));
  assert.equal(
    Object.keys(g.family.couples).length,
    familyLimit(Object.values(g.jobCity.profiles)),
  );
  assert.equal(familyPartners(g).size, 36);
  for (const [id, pair] of Object.entries(first))
    assert.deepEqual(g.family.couples[id], pair);
});
test("partners live in one owned house, preserve the private price and remain there after extra property purchases", () => {
  let g = seed();
  const pair = choices(g, 1)[0];
  g.jobCity.profiles[pair.male].coins = 10000;
  g = buyCatHome(g, pair.male, "home-sage", `buy-${pair.male}-1`);
  g = applyFamilyDecisions(g, 13, [pair]);
  const home = g.housing.residences[pair.male];
  assert.equal(g.housing.residences[pair.female], home);
  assert.equal(g.housing.homes[home].roommate, pair.female);
  g = buyCatHome(g, pair.male, "home-lavender", `buy-${pair.male}-2`);
  assert.equal(ownedHomes(g, pair.male).length, 2);
  assert.equal(g.housing.residences[pair.female], home);
  assert.equal(g.housing.residences[pair.male], home);
  assert.equal(g.jobCity.profiles[pair.male].coins, 5800);
});
test("twenty reloads preserve every family, calendar, home, partner sex and private balance", () => {
  let g = seed();
  const pair = choices(g, 1)[0];
  g = applyFamilyDecisions(g, 13, [pair]);
  const snapshot = structuredClone(g.family),
    map = new Map(),
    storage = {
      getItem: (k) => map.get(k) || null,
      setItem: (k, v) => map.set(k, v),
    };
  for (let i = 0; i < 20; i++) {
    assert.ok(saveGame(storage, g));
    g = loadGame(storage, now, { advance: false });
    assert.deepEqual(g.family, snapshot);
    assert.equal(g.jobCity.profiles[pair.female].sex, "female");
  }
});
test("two phones merge independent couples, reject competing lifelong partners and preserve families from cached clients", () => {
  const g = seed(),
    pairs = choices(g),
    a = applyFamilyDecisions(g, 13, [pairs[0]]),
    b = applyFamilyDecisions(g, 13, [pairs[1]]);
  for (const [one, two] of [
    [a, b],
    [b, a],
  ]) {
    const n = mergeSharedWorld(g, one, two);
    assert.equal(Object.keys(n.family.couples).length, 2);
    const cached = structuredClone(g);
    delete cached.family;
    assert.deepEqual(mergeSharedWorld(g, n, cached).family, n.family);
  }
  const other = { ...pairs[0], female: pairs[1].female };
  assert.throws(
    () => mergeSharedWorld(g, a, applyFamilyDecisions(g, 13, [other])),
    /Партнера|партнера/,
  );
});
test("a corrupted primary family never silently erases a permanent pair instead of using a valid backup", () => {
  const g = applyFamilyDecisions(seed(), 13, choices(seed())),
    bad = structuredClone(g);
  const pair = Object.values(bad.family.couples)[0];
  pair.female = pair.male;
  const storage = {
    getItem: (k) =>
      k === SAVE_KEY
        ? JSON.stringify(bad)
        : k === SAVE_KEY + ":backup"
          ? JSON.stringify(g)
          : null,
  };
  assert.deepEqual(loadGame(storage, now, { advance: false }).family, g.family);
});
test("AI sees all currently available islands and activities, exact indices and rare family review, while leisure progress is idempotent", async () => {
  let g = seed();
  g.jobCity.profiles.chichi.coins = 10000;
  const state = validateCityAIState(jobAIState(g, now + 13 * 1440000));
  assert.equal(state.familyReview.due, true);
  assert.ok(state.leisureOffers.some((o) => o.id === "bikini-krusty"));
  assert.ok(state.leisureOffers.some((o) => o.action === "ride"));
  const pairs = choices(g, 1),
    assignments = localJobPlan(Object.values(g.jobCity.profiles), 13);
  assignments[0].outings = [state.leisureOffers[0].id];
  const result = await requestCityPlan(state, async () => ({
    response: { assignments, families: pairs },
  }));
  g = applyJobPlan(g, result.assignments, 13, "ai", result.families);
  assert.equal(Object.keys(g.family.couples).length, 1);
  g = completeLeisure(g, assignments[0].id, 13, 0, "moon");
  assert.equal(completeLeisure(g, assignments[0].id, 13, 0, "moon"), g);
  const input = cityPlanInput(state);
  assert.ok(input.max_tokens <= 6500);
  assert.ok(input.messages[1].content.length < 45000);
});

test("every resident card uses an existing offline portrait of the approved model, without building GPU previews in the menu", async () => {
  const { CAT_PORTRAITS, CHICHI_PORTRAITS } = await import(
    "../public/cat-portrait-manifest.js"
  );
  const { NEIGHBORS } = await import("../public/game-data.js");
  const fs = await import("node:fs");
  for (const c of NEIGHBORS) {
    const url = CAT_PORTRAITS[c.id];
    assert.ok(url, c.id);
    assert.ok(
      fs.existsSync(
        new URL(
          "../public/" + url.replace(/^\.\//, "").split("?")[0],
          import.meta.url,
        ),
      ),
      c.id,
    );
  }
  assert.ok(CHICHI_PORTRAITS.happy);
});
