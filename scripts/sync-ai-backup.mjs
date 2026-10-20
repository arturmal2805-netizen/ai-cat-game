import { spawn } from "node:child_process";
const key = process.env.BACKUP_AI_API_KEY?.trim();
if (!key) {
  console.log(
    "No new OpenRouter key in GitHub; retaining any existing Worker secret.",
  );
} else {
  const child = spawn(
    "npx",
    ["--no-install", "wrangler", "secret", "put", "BACKUP_AI_API_KEY"],
    {
      stdio: ["pipe", "inherit", "inherit"],
      env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
    },
  );
  child.stdin.end(key + "\n");
  await new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0 ? resolve() : reject(Error("OpenRouter secret upload failed")),
    );
  });
}
