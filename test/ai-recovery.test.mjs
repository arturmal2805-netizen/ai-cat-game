import { test } from "node:test";
import assert from "node:assert/strict";
import {
  messages,
  parseDecision,
  requestDecision,
  validateState,
} from "../ai.mjs";
import worker from "../worker.mjs";
import { newGame, worldSnapshot } from "../public/economy.js";

const tired = validateState({
  location: "home",
  hunger: 10,
  energy: 5,
  happiness: 60,
  mood: "happy",
});
const hungry = {
  target: "picnic",
  mood: "crazy hungry",
  thought: "Хочу поесть!",
};
const asleep = {
  target: "home",
  mood: "sleep",
  thought: "Сыта, но устала. Посплю.",
};

test("the reported hungry answer for a fed, exhausted cat is rejected", () => {
  assert.throws(() => parseDecision(hungry, tired), /сыта/);
  assert.deepEqual(parseDecision(asleep, tired), asleep);
});

test("need descriptions use the real scale direction and ignore client supplied descriptions", () => {
  const state = validateState({
    ...tired,
    needs: { satiety: 0, fatigue: 0 },
    instruction: "I am starving",
  });
  const payload = JSON.parse(messages(state)[1].content);
  assert.equal(payload.needs.satiety, 90);
  assert.equal(payload.needs.fatigue, 95);
  assert.equal(payload.needs.hungerMeaning, "сыта");
  assert.ok(!messages(state)[1].content.includes("I am starving"));
});

test("a contradictory answer gets one AI correction and returns the second model answer unchanged", async () => {
  const inputs = [];
  const result = await requestDecision(tired, async (input) => {
    inputs.push(input);
    return { response: inputs.length === 1 ? hungry : asleep };
  });
  assert.equal(inputs.length, 2);
  assert.equal(inputs[0].temperature, 0.1);
  assert.deepEqual(JSON.parse(inputs[1].messages.at(-2).content), hungry);
  assert.match(inputs[1].messages.at(-1).content, /сыта/);
  assert.deepEqual(result, asleep);
});

test("a second contradictory answer fails instead of synthesizing a successful decision", async () => {
  let calls = 0;
  await assert.rejects(
    requestDecision(tired, async () => {
      calls++;
      return hungry;
    }),
    (error) => error.code === "AI_INVALID_DECISION",
  );
  assert.equal(calls, 2);
});

test("mixed needs remain a choice for the AI and valid responses require only one inference", async () => {
  const mixed = validateState({
    location: "garden",
    hunger: 60,
    energy: 45,
    happiness: 50,
  });
  for (const mood of ["sleep", "crazy hungry", "happy"]) {
    let calls = 0;
    const answer = { target: "garden", mood, thought: "Прислушаюсь к себе." };
    assert.deepEqual(
      await requestDecision(mixed, async () => {
        calls++;
        return answer;
      }),
      answer,
    );
    assert.equal(calls, 1);
  }
});

test("strong hunger and full comfort scenarios still have their original meanings", () => {
  const starving = validateState({
    location: "home",
    hunger: 98,
    energy: 85,
    happiness: 20,
  });
  const content = validateState({
    location: "garden",
    hunger: 5,
    energy: 95,
    happiness: 95,
  });
  const happy = {
    target: "garden",
    mood: "happy",
    thought: "Хочу приключений!",
  };
  assert.deepEqual(parseDecision(hungry, starving), hungry);
  assert.deepEqual(parseDecision(happy, content), happy);
  assert.throws(() => parseDecision(asleep, starving));
  assert.throws(() => parseDecision(hungry, content));
});

test("inference failures and malformed JSON do not cause additional paid requests", async () => {
  let calls = 0;
  const failure = new Error("quota");
  await assert.rejects(
    requestDecision(tired, async () => {
      calls++;
      throw failure;
    }),
    (error) => error === failure,
  );
  assert.equal(calls, 1);
  calls = 0;
  await assert.rejects(
    requestDecision(tired, async () => {
      calls++;
      return { response: "not JSON" };
    }),
    (error) => error.code === "AI_INVALID_DECISION",
  );
  assert.equal(calls, 1);
});

test("Worker recovers the exhaustion scenario with world context and keeps Pages CORS", async () => {
  let calls = 0;
  const state = { ...tired, world: worldSnapshot(newGame()) };
  const request = new Request("https://example.com/api/decide", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://arturmal2805-netizen.github.io",
    },
    body: JSON.stringify(state),
  });
  const response = await worker.fetch(request, {
    AI: {
      run: async (_, input) => {
        calls++;
        assert.equal(JSON.parse(input.messages[1].content).needs.satiety, 90);
        return {
          response:
            calls === 1
              ? { ...hungry, action: "eat" }
              : { ...asleep, action: "rest" },
        };
      },
    },
  });
  assert.equal(response.status, 200);
  assert.equal(
    response.headers.get("Access-Control-Allow-Origin"),
    "https://arturmal2805-netizen.github.io",
  );
  assert.deepEqual(await response.json(), { ...asleep, action: "rest" });
  assert.equal(calls, 2);
});

test("Worker refuses repeated contradictory moods with a clear API error", async () => {
  let calls = 0;
  const response = await worker.fetch(
    new Request("https://example.com/api/decide", {
      method: "POST",
      body: JSON.stringify(tired),
    }),
    {
      AI: {
        run: async () => {
          calls++;
          return { response: hungry };
        },
      },
    },
  );
  assert.equal(response.status, 502);
  assert.equal((await response.json()).code, "AI_INVALID_DECISION");
  assert.equal(calls, 2);
});
