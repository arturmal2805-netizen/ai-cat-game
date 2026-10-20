// Explicit manual diagnostic: one real inference, no player world involved.
import { aiProviderRouter } from "../ai-provider-router.mjs";
import { requestCityLife } from "../city-life-ai.mjs";
import { validateCityAIState } from "../jobcity-ai.mjs";
import { JOB_KINDS } from "../public/jobcity-data.js";
const key = process.env.BACKUP_AI_API_KEY?.trim();
if (!key) throw Error("Missing reserve key");
const count = process.env.CITY_QA_ROSTER === "147" ? 147 : 1;
const family = process.env.CITY_QA_PHASE === "families";
const cats = Array.from({ length: count }, (_, i) => ({
  id: i === 0 ? "chichi" : "qa-cat-" + i,
  name: "QA " + i,
  coins: 0,
  skills: Object.fromEntries(JOB_KINDS.map((k, j) => [k, ((i + j) % 7) + 2])),
  preferences: [JOB_KINDS[i % 6], JOB_KINDS[(i + 1) % 6]],
  profession: family ? JOB_KINDS[i % 6] : null,
  scheduleJob: "rest",
  canChangeProfession: false,
  personality: ["Calm", "Adventurous", "Sociable", "Dreamy"][i % 4],
}));
const s = validateCityAIState({
  day: family ? 27 : 0,
  phase: family ? "evening" : "careers",
  epoch: Date.now(),
  minute: family ? 1140 : 720,
  initialIds: family ? [] : cats.map((c) => c.id),
  familyReview: { due: family, slots: family ? Math.max(1,Math.floor(count/8)) : 0 },
  leisureOffers: [],
  cats,
});
const router = aiProviderRouter(
  {
    BACKUP_AI_API_KEY: key,
    AI: {
      run: async () => {
        throw Error("4006: simulated exhausted primary");
      },
    },
  },
  {
    fetcher: async (url, options) => {
      const body = JSON.parse(options.body);
      console.log(
        "RESERVE_REQUEST",
        JSON.stringify({ model: body.model, maxTokens: body.max_tokens }),
      );
      const r = await fetch(url, options);
      let data;
      try {
        data = await r.clone().json();
      } catch {}
      if (!r.ok)
        console.log(
          "RESERVE_HTTP_ERROR",
          JSON.stringify({
            status: r.status,
            code: data?.error?.code,
            message: String(data?.error?.message || "")
              .replaceAll(key, "[redacted]")
              .slice(0, 240),
          }),
        );
      else {
        const content = data?.choices?.[0]?.message?.content;
        let parsed;
        try {
          parsed = JSON.parse(content);
        } catch {}
        console.log(
          "RESERVE_ANSWER",
          JSON.stringify({
            model: data?.model,
            provider: data?.provider,
            cost: data?.usage?.cost,
            finish: data?.choices?.[0]?.finish_reason,
            outputTokens: data?.usage?.completion_tokens,
            contentType: typeof content,
            keys: parsed ? Object.keys(parsed) : null,
            careers: parsed?.careers,
          }),
        );
      }
      return r;
    },
  },
);
const answer = await requestCityLife(s, (input, validate) => router.run(input, validate));
if (family && !answer.families.length) throw Error("Expected an actual AI-selected family");
console.log(
  "RESERVE_CITY_CONTRACT_PASSED",
  JSON.stringify({
    provider: answer.provider,
    cats: answer.assignments.length,
    professions: [...new Set(answer.assignments.map((a) => a.profession))],
    families: answer.families.length,
  }),
);
