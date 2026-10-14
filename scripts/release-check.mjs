import { execFileSync } from "node:child_process";
import { DECISION_PROTOCOL } from "../public/interactions.js";
export { DECISION_PROTOCOL };
export class ReleaseMismatch extends Error {
  constructor(expected, release, protocol) {
    super(
      `Worker release changed or is outdated: expected ${expected.slice(0, 12)} / ${DECISION_PROTOCOL}; received ${release?.slice(0, 12) || "unknown"} / ${protocol || "unknown"}`,
    );
    this.name = "ReleaseMismatch";
  }
}
export function releaseRevision(env = process.env) {
  const revision =
    env.GITHUB_SHA ||
    env.GAME_RELEASE ||
    execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  if (!/^[a-f0-9]{40}$/i.test(revision))
    throw Error("Deployment requires a full Git commit SHA");
  return revision;
}
export function checkReleaseResponse(response, expected) {
  const release = response.headers.get("X-Chichi-Release"),
    protocol = response.headers.get("X-Chichi-Protocol");
  if (release !== expected || protocol !== DECISION_PROTOCOL)
    throw new ReleaseMismatch(expected, release, protocol);
}
// Poll readiness without paid AI requests. A successful deploy command does
// not imply every workers.dev edge is already serving this commit.
export async function waitForRelease(
  apiBase,
  expected,
  {
    fetcher = fetch,
    wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    attempts = 12,
    onWait = () => {},
    requireCloudSave = false,
  } = {},
) {
  let reason = "No status received";
  const deadline = Date.now() + 60000;
  for (
    let attempt = 0;
    attempt < attempts && Date.now() < deadline;
    attempt++
  ) {
    try {
      const url = new URL("/api/status", apiBase);
      url.searchParams.set("revision", expected);
      url.searchParams.set("probe", String(attempt));
      const response = await fetcher(url, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
        signal: AbortSignal.timeout(
          Math.max(1, Math.min(5000, deadline - Date.now())),
        ),
      });
      if (!response.ok) throw Error(`Status HTTP ${response.status}`);
      const status = await response.json();
      if (status.release !== expected || status.protocol !== DECISION_PROTOCOL)
        throw Error(
          `received revision ${String(status.release || "unknown").slice(0, 12)}, protocol ${status.protocol || "unknown"}`,
        );
      checkReleaseResponse(response, expected);
      if (!status.configured)
        throw Error(
          "Expected Worker version is active, but AI binding is unavailable",
        );
      if (requireCloudSave && !status.cloudSave)
        throw Error(
          "Expected Worker version is active, but cloud save binding is unavailable",
        );
      return status;
    } catch (error) {
      reason = error.message;
    }
    if (attempt + 1 < attempts) {
      onWait(reason);
      await wait(Math.min(5000, Math.max(0, deadline - Date.now())));
    }
  }
  throw Error(
    `Deployed Worker ${expected.slice(0, 12)} is not ready at ${apiBase}: ${reason}. Verify the Deploy Cloudflare Worker log and competing deployments; no AI scenarios were run against this stale version.`,
  );
}
