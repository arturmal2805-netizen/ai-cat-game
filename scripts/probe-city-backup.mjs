// Explicit manual diagnostic: one real inference, no player world involved.
import { aiProviderRouter } from "../ai-provider-router.mjs";
import { requestCityLife } from "../city-life-ai.mjs";
import { validateCityAIState } from "../jobcity-ai.mjs";
import { JOB_KINDS } from "../public/jobcity-data.js";
const key = process.env.BACKUP_AI_API_KEY?.trim();
if (!key) throw Error("Missing reserve key");
const s = validateCityAIState({
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
      name: "QA",
      coins: 0,
      skills: Object.fromEntries(JOB_KINDS.map((k) => [k, 2])),
      preferences: ["estate", "bank"],
      profession: null,
      canChangeProfession: false,
      personality: "Спокійна",
    },
  ],
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
const answer = await requestCityLife(s, (input) => router.run(input));
console.log(
  "RESERVE_CITY_CONTRACT_PASSED",
  JSON.stringify({
    provider: answer.provider,
    profession: answer.assignments[0].profession,
  }),
);
