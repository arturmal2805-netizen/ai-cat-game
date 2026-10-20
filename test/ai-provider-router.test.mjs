import test from "node:test";
import assert from "node:assert/strict";
import { aiProviderRouter, BACKUP_AI_MODEL } from "../ai-provider-router.mjs";
import { requestCityLife } from "../city-life-ai.mjs";
import { validateCityAIState } from "../jobcity-ai.mjs";
import { JOB_KINDS } from "../public/jobcity-data.js";
import { SaveVault } from "../save-vault.mjs";
import worker from "../worker.mjs";
const input = {
  messages: [{ role: "user", content: "Only JSON" }],
  max_tokens: 100,
  response_format: { type: "json_object" },
};
test("primary success spends nothing on backup and preserves the model response", async () => {
  const response = { response: '{"ok":1}' };
  let backup = 0;
  const env = {
    AI: { run: async () => response },
    BACKUP_AI_API_KEY: "private-test-key",
  };
  assert.equal(
    await aiProviderRouter(env, {
      fetcher: async () => {
        backup++;
      },
    }).run(input),
    response,
  );
  assert.equal(backup, 0);
});
test("quota failure switches once to the server-only free OpenRouter model; following requests skip the exhausted primary", async () => {
  let primary = 0,
    backup = 0;
  const env = {
    AI: {
      run: async () => {
        primary++;
        throw Error("4006: daily free allocation");
      },
    },
    BACKUP_AI_API_KEY: "private-test-key",
  };
  const router = aiProviderRouter(env, {
    clock: () => 1700000000000,
    fetcher: async (url, options) => {
      backup++;
      assert.equal(url, "https://openrouter.ai/api/v1/chat/completions");
      assert.equal(options.headers.Authorization, "Bearer private-test-key");
      const body = JSON.parse(options.body);
      assert.equal(body.model, BACKUP_AI_MODEL);
      assert.deepEqual(body.reasoning, { enabled: false });
      assert.deepEqual(body.messages, input.messages);
      assert.deepEqual(body.response_format, input.response_format);
      assert.ok(!options.body.includes("private-test-key"));
      return Response.json({ choices: [{ message: { content: '{"ok":1}' } }] });
    },
  });
  for (let i = 0; i < 3; i++)
    assert.deepEqual(await router.run(input), {
      response: '{"ok":1}',
      usage: undefined,
      provider: "openrouter",
    });
  assert.equal(primary, 1);
  assert.equal(backup, 3);
});
test("bad backup authentication is bounded and never echoes the provider body or key", async () => {
  let calls = 0;
  const env = { BACKUP_AI_API_KEY: "private-test-key" };
  const router = aiProviderRouter(env, {
    fetcher: async () => {
      calls++;
      return new Response("private-test-key account diagnostics", {
        status: 401,
      });
    },
  });
  await assert.rejects(
    router.run(input),
    (e) => e.message === "OpenRouter backup unavailable: HTTP 401",
  );
  assert.equal(calls, 1);
});
test("primary circuit retries after the actual daily reset and no missing backup creates a fake decision", async () => {
  let now = 1700000000000,
    calls = 0;
  const router = aiProviderRouter(
    {
      AI: {
        run: async () => {
          calls++;
          throw Error("4006: daily free allocation");
        },
      },
    },
    { clock: () => now },
  );
  await assert.rejects(router.run(input));
  await assert.rejects(router.run(input));
  assert.equal(calls, 1);
  now = (Math.floor(now / 86400000) + 1) * 86400000;
  await assert.rejects(router.run(input));
  assert.equal(calls, 2);
});

for (const malformed of ["not JSON", '{"careers":[[0,999]]}'])
  test(`invalid primary city decision (${malformed}) uses one validated reserve and keeps its initial choice`, async () => {
    const state = validateCityAIState({
      day: 0, phase: "careers", epoch: 1700000000000, minute: 720,
      initialIds: ["qa-cat"], familyReview: { due: false, slots: 0 },
      leisureOffers: [], cats: [{
        id: "qa-cat", name: "QA", coins: 0, profession: null,
        skills: Object.fromEntries(JOB_KINDS.map(k => [k, 2])),
        preferences: ["bank"],
      }],
    });
    let primary = 0, reserve = 0;
    const router = aiProviderRouter({
      AI: { run: async () => { primary++; return { response: malformed }; } },
      BACKUP_AI_API_KEY: "private-test-key",
    }, { fetcher: async (_url, options) => {
      reserve++;
      assert.ok(!options.body.includes("validate"));
      return Response.json({ choices: [{ message: { content: '{"careers":[[0,1]]}' } }] });
    } });
    const result = await requestCityLife(state, (input, validate) => router.run(input, validate));
    assert.equal(result.provider, "openrouter");
    assert.equal(result.assignments[0].profession, JOB_KINDS[1]);
    assert.equal(primary, 1);
    assert.equal(reserve, 1);
  });

test("two invalid decisions stop after primary plus reserve without retrying or fabricating a career", async () => {
  let reserve = 0;
  const router = aiProviderRouter({
    AI: { run: async () => ({ response: "bad primary" }) },
    BACKUP_AI_API_KEY: "private-test-key",
  }, { fetcher: async () => {
    reserve++;
    return Response.json({ choices: [{ message: { content: "bad reserve" } }] });
  } });
  await assert.rejects(router.run(input, r => JSON.parse(r.response)), SyntaxError);
  assert.equal(reserve, 1);
});

test("public city endpoint validates primary through the durable vault and saves one reserve result across repeated requests", async () => {
  let primary = 0, reserve = 0;
  const map = new Map(), storage = {
    get: async k => structuredClone(map.get(k)),
    put: async (k, v) => map.set(k, structuredClone(v)),
    transaction: async fn => fn(storage),
  };
  const env = {
    AI: { run: async () => { primary++; return { response: "invalid JSON" }; } },
    BACKUP_AI_API_KEY: "private-test-key",
  };
  const vault = new SaveVault({ storage }, env);
  env.SAVE_VAULT = { idFromName: n => n, get: () => vault };
  const nativeFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    assert.equal(url, "https://openrouter.ai/api/v1/chat/completions");
    reserve++;
    return Response.json({ choices: [{ message: { content: '{"careers":[[0,1]]}' } }] });
  };
  try {
    const state = {
      day: 0, phase: "careers", epoch: 1700000000000, minute: 720,
      initialIds: ["qa-cat"], familyReview: { due: false, slots: 0 },
      leisureOffers: [], cats: [{
        id: "qa-cat", name: "QA", coins: 0, profession: null,
        skills: Object.fromEntries(JOB_KINDS.map(k => [k, 2])), preferences: [],
      }],
    };
    let first;
    for (let i = 0; i < 2; i++) {
      const response = await worker.fetch(new Request("https://cat.test/api/jobcity/plan", {
        method: "POST", headers: { "X-Chichi-Save-Token": "a".repeat(64) },
        body: JSON.stringify(state),
      }), env);
      const answer = await response.json();
      assert.equal(response.status, 200, JSON.stringify(answer));
      assert.equal(answer.provider, "openrouter");
      assert.equal(answer.assignments[0].profession, JOB_KINDS[1]);
      if (!i) first = answer;
      else assert.deepEqual(answer, first);
    }
    assert.equal(primary, 1);
    assert.equal(reserve, 1);
    assert.ok(!map.has("current"), "AI diagnostics never write a player save");
  } finally {
    globalThis.fetch = nativeFetch;
  }
});
