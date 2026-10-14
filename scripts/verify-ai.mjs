import { spawn } from "node:child_process";
import { inferenceDiagnostics } from "./tail-diagnostics.mjs";
const tail = spawn(
  "npx",
  ["--no-install", "wrangler", "tail", "chichi-cat-world", "--format", "json"],
  {
    detached: process.platform !== "win32",
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
  },
);
let logs = "";
tail.stdout.on("data", (chunk) => {
  logs += chunk;
});
tail.stderr.on("data", () => {});
tail.on("error", () =>
  console.log("Worker log stream unavailable; continuing AI verification."),
);
try {
  await new Promise((resolve) => setTimeout(resolve, 4000));
  const code = await new Promise((resolve, reject) => {
    const check = spawn(process.execPath, ["scripts/connect-ai.mjs"], {
      stdio: "inherit",
      env: process.env,
    });
    check.on("error", reject);
    check.on("close", (code) => resolve(code ?? 1));
  });
  if (code !== 0) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    // Emit only our own inference-error messages, not request headers or full tail events.
    const errors = inferenceDiagnostics(logs);
    for (const message of [...new Set(errors)])
      console.error("Worker diagnostic:", message.slice(0, 600));
    if (!errors.length)
      console.error(
        "No inference errors received from Worker logs. See the verification error above; release or storage failures occur before AI scenarios.",
      );
  }
  process.exitCode = code;
} finally {
  if (tail.pid) {
    try {
      if (process.platform !== "win32") process.kill(-tail.pid, "SIGTERM");
      else tail.kill("SIGTERM");
    } catch (error) {
      if (error.code !== "ESRCH") throw error;
    }
  }
  tail.stdout.destroy();
  tail.stderr.destroy();
  tail.unref();
}
