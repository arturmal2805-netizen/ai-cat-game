import { requestDecision, validateState } from "./ai.mjs";
import {
  DECISION_PROTOCOL,
  MAX_DECISION_BYTES,
} from "./public/interactions.js";
import { cloudSave, accountAccess } from "./save-vault.mjs";
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
                "Content-Type, X-Chichi-Save-Token",
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
        configured: !!env.AI,
        protocol: DECISION_PROTOCOL,
        release: deployedRevision(env),
        versionId: env.CF_VERSION_METADATA?.id || null,
        cloudSave: !!env.SAVE_VAULT,
      });
    if (path === "/api/account" && request.method === "POST")
      return accountAccess(request, env);
    if (path === "/api/save" && ["GET", "PUT", "POST"].includes(request.method))
      return cloudSave(request, env);
    if (path === "/api/decide" && request.method === "POST") {
      if (!env.AI) return json({ error: "Cloudflare AI не подключён." }, 503);
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
            env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", input),
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
