import test from "node:test";
import assert from "node:assert/strict";
import { aiProviderRouter, BACKUP_AI_MODEL } from "../ai-provider-router.mjs";
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
