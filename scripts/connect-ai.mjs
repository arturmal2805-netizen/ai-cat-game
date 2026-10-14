import {
  releaseRevision,
  waitForRelease,
  checkReleaseResponse,
} from "./release-check.mjs";
import { writeFile } from "node:fs/promises";
import { newGame, worldSnapshot } from "../public/economy.js";
import { fillBowl } from "../public/care-system.js";
import { parseDecision, validateState } from "../ai.mjs";
import { verifyCloudSave } from "./cloud-check.mjs";
const account = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_API_TOKEN;
if (!account || !token)
  throw new Error("Missing Cloudflare deployment credentials");
const response = await fetch(
  `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account)}/workers/subdomain`,
  {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(20000),
  },
);
if (!response.ok)
  throw new Error(`Cannot discover Worker subdomain: HTTP ${response.status}`);
const data = await response.json();
const subdomain = data.result?.subdomain;
if (!data.success || !subdomain || !/^[a-z0-9-]+$/i.test(subdomain))
  throw new Error("Cloudflare workers.dev subdomain is not configured");
const apiBase = `https://chichi-cat-world.${subdomain}.workers.dev`;
const expectedRelease = releaseRevision();
await waitForRelease(apiBase, expectedRelease, {
  requireCloudSave: true,
  onWait: (reason) => console.log("Waiting for deployed Worker: " + reason),
});
console.log(`Serving verified commit ${expectedRelease}`);
await verifyCloudSave(apiBase, expectedRelease, fetch, {
  onWait: (reason) => console.log("Waiting for cloud save release: " + reason),
});
console.log("Cloud save write, read-back and idempotent retry verified.");
let verified = false;
for (let attempt = 0; attempt < 3; attempt++) {
  try {
    if (attempt > 0)
      await waitForRelease(apiBase, expectedRelease, {
        attempts: 4,
        onWait: (reason) =>
          console.log("Waiting for deployed Worker: " + reason),
      });
    const cases = [
      {
        location: "home",
        hunger: 10,
        energy: 5,
        happiness: 60,
        mood: "happy",
        expected: "sleep",
      },
      {
        location: "home",
        hunger: 98,
        energy: 85,
        happiness: 20,
        mood: "happy",
        expected: "crazy hungry",
      },
      {
        location: "garden",
        hunger: 5,
        energy: 95,
        happiness: 95,
        mood: "happy",
        expected: "happy",
      },
      {
        location: "garden",
        hunger: 5,
        energy: 95,
        happiness: 95,
        mood: "happy",
        expected: "happy",
        world: {
          biomes: ["moon"],
          activities: [
            { id: "welcome-yarn", type: "yarn", biome: "moon" },
            { id: "welcome-party", type: "party", biome: "moon" },
            {
              id: "welcome-farm",
              type: "farm-field",
              biome: "moon",
              harvestReady: 2,
              emptyPlots: 1,
            },
          ],
          friends: [{ id: "luna", closeness: 15 }],
        },
      },
    ];
    for (const scenario of cases) {
      const { expected, ...input } = scenario;
      const state = {
        ...input,
        world:
          input.world ||
          worldSnapshot(
            (() => {
              const g = newGame();
              g.farm.stock.wheat = 2;
              return fillBowl(g, "wheat", 2);
            })(),
          ),
      };
      console.log(
        `Checking real AI: energy=${state.energy}, hunger=${state.hunger}, happiness=${state.happiness}; expected ${expected}${state.world ? " with world activities" : ""}`,
      );
      const decision = await fetch(`${apiBase}/api/decide`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://arturmal2805-netizen.github.io",
        },
        body: JSON.stringify(state),
        signal: AbortSignal.timeout(30000),
      });
      checkReleaseResponse(decision, expectedRelease);
      if (!decision.ok) {
        const failure = await decision.json().catch(() => ({}));
        throw new Error(
          `AI decision failed: HTTP ${decision.status}; ${failure.code || "UNKNOWN"}; ${failure.error || "No details"}`,
        );
      }
      if (
        decision.headers.get("Access-Control-Allow-Origin") !==
        "https://arturmal2805-netizen.github.io"
      )
        throw new Error("GitHub Pages CORS is missing");
      const value = parseDecision(await decision.json(), validateState(state));
      if (value.mood !== expected)
        throw new Error(
          `AI mood scenario failed: expected ${expected}, got ${value.mood}`,
        );
      console.log(
        `Real AI verified: ${value.mood}${value.action ? " / " + value.action : ""}`,
      );
    }
    verified = true;
    break;
  } catch (error) {
    if (attempt === 2) throw error;
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}
if (!verified) throw new Error("AI was not verified");
await writeFile(
  "public/config.js",
  `export const apiBase = ${JSON.stringify(apiBase)};\n`,
);
console.log(`Cloudflare AI verified. Pages will connect to ${apiBase}`);
