import { requestCityLife } from "./city-life-ai.mjs";
import { JOB_KINDS } from "./public/jobcity-data.js";
const quotaError = (e) =>
  /4006|daily free allocation|daily.*neurons/i.test(String(e?.message || e));
const result = (body, status = 200) => ({ body, status });
function failureReason(error) {
  const message = String(error?.message || "");
  const http = /^OpenRouter backup unavailable: HTTP (\d{3})$/.exec(message);
  if (http) return "reserve_http_" + http[1];
  if (message === "OpenRouter backup returned no answer")
    return "reserve_empty";
  if (error?.name === "SyntaxError") return "invalid_json";
  const known = {
    "Unrequested AI choice": "unrequested_choice",
    "Missing AI life choices": "missing_choices",
    "Missing family choice": "missing_family",
    "Invalid initial profession": "invalid_profession",
    "Invalid evening choice": "invalid_evening",
    "Invalid house choice": "invalid_house",
    "AI event timeout": "timeout",
  };
  return known[message] || "provider_or_contract";
}
export class CityAIRequestLedger {
  constructor(storage, ai) {
    this.storage = storage;
    this.ai = ai;
    this.inflight = new Map();
  }
  async status() {
    const ledger = await this.storage.get("city-ai-ledger");
    return {
      epoch: ledger?.epoch ?? null,
      events: [...(ledger?.records || []), ...(ledger?.familyReceipt &&
        !ledger.records.some(r => r.key === ledger.familyReceipt.key) ? [ledger.familyReceipt] : [])].flatMap((record) => {
        let event;
        try { event = JSON.parse(record.key); } catch { return []; }
        const [epoch, phase, day] = event;
        if (!Number.isFinite(epoch) || !Number.isSafeInteger(day) ||
            !["careers", "evening"].includes(phase)) return [];
        return [{ epoch, phase, day, pending: !record.result,
          status: record.result?.status ?? 409,
          ...(record.result ? { body: record.result.body } : {}) }];
      }),
    };
  }
  async plan(state) {
    const key = JSON.stringify([
      state.epoch,
      state.phase,
      state.day,
      [...state.initialIds].sort(),
    ]);
    if (this.inflight.has(key)) return this.inflight.get(key);
    const promise = this.execute(state, key);
    this.inflight.set(key, promise);
    try {
      return await promise;
    } finally {
      this.inflight.delete(key);
    }
  }
  async execute(state, key) {
    const now = Date.now();
    const reserved = await this.storage.transaction(async (t) => {
      const ledger = (await t.get("city-ai-ledger")) || {
        records: [],
        careers: {},
        careerAttempts: {},
        eveningDay: -1,
        epoch: state.epoch,
        blockedUntil: 0,
      };
      if (ledger.epoch !== state.epoch) {
        // A merged/imported shared save can legitimately retain a different
        // clock origin. Only the already persisted world can authorize that
        // origin; stale tabs cannot reset the ledger or reroll careers.
        const current = await t.get("current");
        if (current?.game?.jobCity?.epoch !== state.epoch)
          return { cached: result({ code: "AI_WORLD_EPOCH_MISMATCH" }, 409) };
        const shift = Math.round((ledger.epoch - state.epoch) / 1440000);
        if (ledger.eveningDay >= 0) ledger.eveningDay = Math.max(-1, ledger.eveningDay + shift);
        for (const id of Object.keys(ledger.careerAttempts))
          ledger.careerAttempts[id] = Math.max(-1, ledger.careerAttempts[id] + shift);
        ledger.epoch = state.epoch;
        await t.put("city-ai-ledger", ledger);
      }
      const old = ledger.records.find((r) => r.key === key);
      if (old)
        return {
          cached: old.result || result({ code: "AI_EVENT_PENDING" }, 409),
        };
      const initialIds = state.initialIds.filter((id) => !ledger.careers[id]);
      if (state.phase === "careers" && !initialIds.length)
        return { replay: ledger.careers };
      // A quota recorded before the reserve was configured must not disable
      // that newly available provider until midnight. The event reservation
      // below still permits only one attempt per day and caches failed ACKs.
      if (ledger.blockedUntil > now && !this.ai.reserveConfigured)
        return {
          cached: result(
            { code: "AI_DAILY_LIMIT", retryAt: ledger.blockedUntil },
            429,
          ),
        };
      if (
        (state.phase === "evening" && ledger.eveningDay >= state.day) ||
        (state.phase === "careers" &&
          initialIds.some(
            (id) => (ledger.careerAttempts[id] ?? -1) >= state.day,
          ))
      )
        return { cached: result({ code: "AI_EVENT_ALREADY_REQUESTED" }, 409) };
      if (state.phase === "evening") ledger.eveningDay = state.day;
      for (const id of initialIds) ledger.careerAttempts[id] = state.day;
      ledger.records = [...ledger.records, { key, reservedAt: now }].slice(-2);
      await t.put("city-ai-ledger", ledger);
      return { careers: ledger.careers, initialIds };
    });
    if (reserved.cached) return reserved.cached;
    const replay = async (choices) =>
      requestCityLife(state, async () => ({
        response: {
          careers: state.initialIds.map((id) => [
            state.cats.findIndex((p) => p.id === id),
            JOB_KINDS.indexOf(choices[id]),
          ]),
        },
      }));
    if (reserved.replay)
      return result({ ...(await replay(reserved.replay)), provider: "cached" });
    let response, timer;
    try {
      let body = await Promise.race([
        requestCityLife(
          { ...state, initialIds: reserved.initialIds },
          (input, validate) =>
            this.ai.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", input, validate),
        ),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(Error("AI event timeout")), 100000);
        }),
      ]);
      if (state.phase === "careers") {
        const provider = body.provider;
        const choices = { ...reserved.careers };
        for (const a of body.assignments)
          if (reserved.initialIds.includes(a.id)) choices[a.id] = a.profession;
        body = await replay(choices);
        body.provider = provider;
      }
      response = result(body);
    } catch (e) {
      response = quotaError(e)
        ? result(
            {
              code: "AI_DAILY_LIMIT",
              retryAt: Math.floor(now / 86400000) * 86400000 + 86400000,
            },
            429,
          )
        : result({ code: "AI_EVENT_FAILED", reason: failureReason(e) }, 502);
    } finally {
      clearTimeout(timer);
    }
    await this.storage.transaction(async (t) => {
      const ledger = await t.get("city-ai-ledger"),
        record = ledger.records.find((r) => r.key === key);
      if (record) record.result = response;
      if (response.status === 200 && state.phase === "evening" && response.body.families?.length)
        ledger.familyReceipt = { key, result: result({ phase: "evening", day: state.day, families: response.body.families }) };
      if (response.status === 200 && state.phase === "careers")
        for (const a of response.body.assignments)
          if (state.initialIds.includes(a.id))
            ledger.careers[a.id] = a.profession;
      if (response.body.retryAt) ledger.blockedUntil = response.body.retryAt;
      await t.put("city-ai-ledger", ledger);
    });
    return response;
  }
}
