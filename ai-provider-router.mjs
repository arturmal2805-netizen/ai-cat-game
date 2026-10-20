export const PRIMARY_AI_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
export const BACKUP_AI_MODEL = "dots-studio/dots-3-note-preview:free";
const routers = new WeakMap();
export function aiProviderRouter(
  env,
  { fetcher = fetch, clock = Date.now } = {},
) {
  if (routers.has(env)) return routers.get(env);
  let primaryBlockedUntil = 0;
  const router = {
    async run(input) {
      let failure = Error("Primary AI unavailable");
      if (env.AI && clock() >= primaryBlockedUntil) {
        try {
          return await env.AI.run(PRIMARY_AI_MODEL, input);
        } catch (error) {
          failure = error;
          primaryBlockedUntil =
            /4006|daily free allocation|daily.*neurons/i.test(
              String(error?.message),
            )
              ? (Math.floor(clock() / 86400000) + 1) * 86400000
              : clock() + 60000;
        }
      }
      if (!env.BACKUP_AI_API_KEY) throw failure;
      const response = await fetcher(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + env.BACKUP_AI_API_KEY,
            "HTTP-Referer":
              "https://arturmal2805-netizen.github.io/ai-cat-game/",
            "X-Title": "Chichi Cat World",
          },
          body: JSON.stringify({
            ...input,
            model: env.BACKUP_AI_MODEL || BACKUP_AI_MODEL,
            // The game budgets answer tokens, not hidden reasoning. A random
            // free reasoner can exhaust that small budget with null content.
            reasoning: { enabled: false },
            provider: { require_parameters: true },
          }),
          signal: AbortSignal.timeout(35000),
        },
      );
      if (!response.ok) {
        // Never echo provider bodies: they may contain account/key diagnostics.
        throw Error("OpenRouter backup unavailable: HTTP " + response.status);
      }
      const data = await response.json(),
        content = data?.choices?.[0]?.message?.content;
      if (typeof content !== "string" || !content.trim())
        throw Error("OpenRouter backup returned no answer");
      return { response: content, usage: data.usage, provider: "openrouter" };
    },
  };
  routers.set(env, router);
  return router;
}
