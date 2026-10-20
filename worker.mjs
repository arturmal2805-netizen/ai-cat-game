import {
  JOB_AI_LIMIT,
  validateCityAIState,
  requestCityPlan,
} from "./jobcity-ai.mjs";
import { requestDecision, validateState } from "./ai.mjs";
import {
  DECISION_PROTOCOL,
  MAX_DECISION_BYTES,
} from "./public/interactions.js";
import { cloudSave, accountAccess } from "./save-vault.mjs";
import { requestCityLife } from "./city-life-ai.mjs";
import { localJobPlan } from "./public/jobcity-system.js";
import { aiProviderRouter } from "./ai-provider-router.mjs";
export { SaveVault } from "./save-vault.mjs";
// Replaced by esbuild for every deployment, including Cloudflare Git builds.
// The env fallback supports direct source execution in local tests.
const sourceRevision =
  typeof __CHICHI_SOURCE_REVISION__ === "undefined"
    ? null
    : __CHICHI_SOURCE_REVISION__;
const deployedRevision = (env) =>
  sourceRevision || env.GAME_RELEASE || "development";
const json = (data, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");
    const allowed = origin === "https://arturmal2805-netizen.github.io";
    if (request.method === "OPTIONS")
      return new Response(null, {
        status: allowed ? 204 : 403,
        headers: allowed
          ? {
              "Access-Control-Allow-Origin": origin,
              "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
              "Access-Control-Allow-Headers":
                "Content-Type, Content-Encoding, X-Chichi-Save-Token",
              Vary: "Origin",
            }
          : {},
      });
    const response = await this.handle(request, env);
    const api = new URL(request.url).pathname.startsWith("/api/");
    if (!allowed && !api) return response;
    const headers = new Headers(response.headers);
    if (api) {
      headers.set("X-Chichi-Release", deployedRevision(env));
      headers.set("X-Chichi-Protocol", DECISION_PROTOCOL);
    }
    if (allowed) {
      headers.set("Access-Control-Allow-Origin", origin);
      headers.set(
        "Access-Control-Expose-Headers",
        "X-Chichi-Release, X-Chichi-Protocol",
      );
      headers.set("Vary", "Origin");
    }
    return new Response(response.body, { status: response.status, headers });
  },
  async handle(request, env) {
    const path = new URL(request.url).pathname;
    if (path === "/api/status" && request.method === "GET")
      return json({
        configured: !!(env.AI || env.BACKUP_AI_API_KEY),
        backupConfigured: !!env.BACKUP_AI_API_KEY,
        backupProvider: env.BACKUP_AI_API_KEY ? "openrouter" : null,
        protocol: DECISION_PROTOCOL,
        release: deployedRevision(env),
        versionId: env.CF_VERSION_METADATA?.id || null,
        cloudSave: !!env.SAVE_VAULT,
      });
    if (path === "/api/account" && request.method === "POST")
      return accountAccess(request, env);
    if (path === "/api/save" && ["GET", "PUT", "POST"].includes(request.method))
      return cloudSave(request, env);
    if (path === "/api/jobcity/plan" && request.method === "POST") {
      if (!env.AI && !env.BACKUP_AI_API_KEY)
        return json({ error: "AI unavailable" }, 503);
      if (Number(request.headers.get("content-length")) > JOB_AI_LIMIT)
        return json({ error: "Request too large" }, 413);
      let state;
      try {
        const reader = request.body?.getReader();
        if (!reader) throw Error("Missing body");
        const chunks = [];
        let size = 0;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.length;
          if (size > JOB_AI_LIMIT) {
            await reader.cancel();
            return json({ error: "Request too large" }, 413);
          }
          chunks.push(value);
        }
        const bytes = new Uint8Array(size);
        let offset = 0;
        for (const c of chunks) {
          bytes.set(c, offset);
          offset += c.length;
        }
        state = validateCityAIState(
          JSON.parse(new TextDecoder().decode(bytes)),
        );
      } catch {
        return json({ error: "Invalid work profiles" }, 400);
      }
      try {
        if (state.phase) {
          if (env.SAVE_VAULT) {
            const internal = new Request(
              new URL("/internal-city-ai", request.url),
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "X-Chichi-Save-Token":
                    request.headers.get("X-Chichi-Save-Token") || "",
                },
                body: JSON.stringify(state),
              },
            );
            return cloudSave(internal, env);
          }
          return json(
            await requestCityLife(state, (input) =>
              aiProviderRouter(env).run(input),
            ),
          );
        }
        // Cached released tabs may still ask for a complete noon re-plan.
        // Their established careers need no inference; keep the saved jobs.
        if (state.cats.every((p) => p.profession))
          return json({
            day: state.day,
            assignments: localJobPlan(state.cats, state.day),
          });
        return json(
          await requestCityPlan(state, (input) =>
            aiProviderRouter(env).run(input),
          ),
        );
      } catch {
        return json(
          { error: "Daily AI plan unavailable; use the local plan" },
          502,
        );
      }
    }
    if (path === "/api/decide" && request.method === "POST") {
      if (!env.AI && !env.BACKUP_AI_API_KEY)
        return json({ error: "Cloudflare AI не подключён." }, 503);
      if (Number(request.headers.get("content-length")) > MAX_DECISION_BYTES)
        return json({ error: "Слишком большой запрос" }, 413);
      const reader = request.body?.getReader();
      if (!reader) return json({ error: "Нет состояния" }, 400);
      let size = 0,
        chunks = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > MAX_DECISION_BYTES) {
          await reader.cancel();
          return json({ error: "Слишком большой запрос" }, 413);
        }
        chunks.push(value);
      }
      let state;
      try {
        const bytes = new Uint8Array(size);
        let offset = 0;
        for (const chunk of chunks) {
          bytes.set(chunk, offset);
          offset += chunk.length;
        }
        state = validateState(JSON.parse(new TextDecoder().decode(bytes)));
      } catch {
        return json({ error: "Некорректное состояние котика" }, 400);
      }
      try {
        return json(
          await requestDecision(state, (input) =>
            aiProviderRouter(env).run(input),
          ),
        );
      } catch (error) {
        if (error.code === "AI_INVALID_DECISION") {
          console.error(
            "Cloudflare AI returned an invalid decision:",
            String(error.cause?.message || "Invalid response").slice(0, 300),
          );
          return json(
            {
              code: "AI_INVALID_DECISION",
              error: "ИИ вернул некорректное решение. Повторите попытку.",
            },
            502,
          );
        }
        console.error(
          "Cloudflare AI inference failed:",
          String(error?.message || "Unknown error").slice(0, 500),
        );
        return json(
          {
            code: "AI_INFERENCE_FAILED",
            error:
              "Cloudflare AI не смог выполнить запрос. Проверьте лимит и доступ к Workers AI.",
          },
          502,
        );
      }
    }
    if (path.startsWith("/api/")) return json({ error: "Not found" }, 404);
    return env.ASSETS.fetch(request);
  },
};
