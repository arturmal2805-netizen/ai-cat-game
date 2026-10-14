import { test } from "node:test";
import assert from "node:assert/strict";
import {
  waitForRelease,
  checkReleaseResponse,
  releaseRevision,
  DECISION_PROTOCOL,
} from "../scripts/release-check.mjs";
import worker from "../worker.mjs";
import { worldSnapshot, newGame } from "../public/economy.js";
const revision = "a".repeat(40),
  oldRevision = "b".repeat(40);
const response = (
  release = revision,
  protocol = DECISION_PROTOCOL,
  configured = true,
) =>
  Response.json(
    { release, protocol, configured },
    { headers: { "X-Chichi-Release": release, "X-Chichi-Protocol": protocol } },
  );
test("release readiness waits for the current commit and protocol without calling AI", async () => {
  const visits = [],
    delays = [];
  let probe = 0;
  const status = await waitForRelease("https://cat.example", revision, {
    fetcher: async (url, options) => {
      visits.push(url.toString());
      assert.equal(options.cache, "no-store");
      assert.equal(options.headers["Cache-Control"], "no-cache");
      return probe++ === 0
        ? Response.json({ configured: true })
        : probe === 2
          ? response(oldRevision)
          : response();
    },
    wait: async (ms) => delays.push(ms),
    attempts: 4,
  });
  assert.equal(status.release, revision);
  assert.equal(visits.length, 3);
  assert.equal(delays.length, 2);
  assert.ok(visits.every((url) => url.includes("/api/status?revision=")));
  assert.equal(new Set(visits).size, 3);
});
test("an old 200 reply like the screenshot is rejected as an old deployment before decision parsing", () => {
  const legacy = Response.json({
    target: "home",
    mood: "sleep",
    action: "rest",
    thought: "Я сытая, но лапки совсем устали. Пора поспать.",
  });
  assert.throws(() => checkReleaseResponse(legacy, revision), /outdated/);
  assert.throws(
    () => checkReleaseResponse(response(oldRevision), revision),
    /outdated/,
  );
  assert.doesNotThrow(() => checkReleaseResponse(response(), revision));
});
test("persistent old deployment fails with an actionable version diagnosis", async () => {
  let probes = 0;
  await assert.rejects(
    waitForRelease("https://cat.example", revision, {
      fetcher: async () => {
        probes++;
        return response(oldRevision);
      },
      wait: async () => {},
      attempts: 3,
    }),
    /competing deployments/,
  );
  assert.equal(probes, 3);
});
test("matching release alone cannot hide a missing AI binding or wrong response header", async () => {
  await assert.rejects(
    waitForRelease("https://cat.example", revision, {
      fetcher: async () => response(revision, DECISION_PROTOCOL, false),
      attempts: 1,
    }),
    /AI binding is unavailable/,
  );
  await assert.rejects(
    waitForRelease("https://cat.example", revision, {
      fetcher: async () =>
        Response.json({
          release: revision,
          protocol: DECISION_PROTOCOL,
          configured: true,
        }),
      attempts: 1,
    }),
    /received unknown/,
  );
});
test("the Worker exposes the deployed commit and enforces physical IDs after readiness", async () => {
  let calls = 0;
  const env = {
    GAME_RELEASE: revision,
    CF_VERSION_METADATA: { id: "uploaded-version" },
    AI: {
      run: async () => {
        calls++;
        return {
          response: {
            target: "home",
            mood: "sleep",
            action: "rest",
            thought: "Посплю на моей подушке.",
            ...(calls > 1 ? { activityId: "chichi-bed" } : {}),
          },
        };
      },
    },
  };
  const ready = await waitForRelease("https://cat.example", revision, {
    fetcher: async (url) => worker.fetch(new Request(url), env),
    attempts: 1,
  });
  assert.equal(ready.versionId, "uploaded-version");
  assert.equal(calls, 0);
  const result = await worker.fetch(
    new Request("https://cat.example/api/decide", {
      method: "POST",
      headers: { Origin: "https://arturmal2805-netizen.github.io" },
      body: JSON.stringify({
        location: "home",
        mood: "happy",
        energy: 5,
        hunger: 10,
        happiness: 60,
        world: worldSnapshot(newGame()),
      }),
    }),
    env,
  );
  assert.equal(result.status, 200);
  checkReleaseResponse(result, revision);
  assert.equal((await result.json()).activityId, "chichi-bed");
  assert.equal(calls, 2);
  assert.ok(
    result.headers
      .get("Access-Control-Expose-Headers")
      .includes("X-Chichi-Release"),
  );
});
test("incomplete physical answers remain failures even on the expected deployment", async () => {
  const result = await worker.fetch(
    new Request("https://cat.example/api/decide", {
      method: "POST",
      body: JSON.stringify({
        location: "home",
        energy: 5,
        hunger: 10,
        happiness: 60,
        world: worldSnapshot(newGame()),
      }),
    }),
    {
      GAME_RELEASE: revision,
      AI: {
        run: async () => ({
          response: {
            target: "home",
            mood: "sleep",
            action: "rest",
            thought: "Пора спать.",
          },
        }),
      },
    },
  );
  assert.equal(result.status, 502);
  checkReleaseResponse(result, revision);
  assert.equal((await result.json()).code, "AI_INVALID_DECISION");
});
test("deployment stamps use the actual checkout SHA rather than a development label", () => {
  assert.equal(
    releaseRevision({ GITHUB_SHA: revision, GAME_RELEASE: oldRevision }),
    revision,
  );
  assert.throws(
    () => releaseRevision({ GITHUB_SHA: "development" }),
    /full Git commit SHA/,
  );
});
test("publication requires the cloud storage binding as well as AI readiness", async () => {
  await assert.rejects(
    waitForRelease("https://cat.example", revision, {
      fetcher: async () => response(),
      attempts: 1,
      requireCloudSave: true,
    }),
    /cloud save binding is unavailable/,
  );
});
