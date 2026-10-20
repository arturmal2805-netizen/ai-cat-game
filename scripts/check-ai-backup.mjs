// One explicit activation probe; routine deployments do NOT invoke this file.
// A fresh private ledger token never reads/writes a player's world.
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { JOB_KINDS } from "../public/jobcity-data.js";
const base =
  process.argv[2] || "https://chichi-cat-world.arturmal2805.workers.dev";
const status = await (
  await fetch(base + "/api/status", { signal: AbortSignal.timeout(15000) })
).json();
assert.equal(
  status.backupConfigured,
  true,
  "Worker must have the server-only OpenRouter key",
);
const response = await fetch(base + "/api/jobcity/plan", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Chichi-Save-Token": randomBytes(32).toString("hex"),
  },
  body: JSON.stringify({
    day: 0,
    phase: "careers",
    epoch: Date.now(),
    minute: 720,
    initialIds: ["chichi"],
    familyReview: { due: false, slots: 0 },
    leisureOffers: [],
    cats: [
      {
        id: "chichi",
        name: "QA котик",
        coins: 0,
        skills: Object.fromEntries(JOB_KINDS.map((k) => [k, 2])),
        preferences: ["estate", "bank"],
        profession: null,
        canChangeProfession: false,
        personality: "Спокійна",
      },
    ],
  }),
  signal: AbortSignal.timeout(105000),
});
const result = await response.json();
assert.equal(response.status, 200, JSON.stringify(result));
assert.equal(
  result.provider,
  "openrouter",
  "This probe must exercise the actual reserve, not just report a configured key",
);
assert.equal(result.assignments.length, 1);
assert.ok(JOB_KINDS.includes(result.assignments[0].profession));
console.log(
  JSON.stringify({
    release: status.release,
    provider: result.provider,
    configured: true,
    actualFallbackVerified: true,
    profession: result.assignments[0].profession,
  }),
);
