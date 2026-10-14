import { spawn } from "node:child_process";
import { releaseRevision } from "./release-check.mjs";
const release = releaseRevision();
console.log(`Deploying Chichi commit ${release}`);
const delays = [30000, 60000];
for (let attempt = 0; attempt <= delays.length; attempt++) {
  let output = "";
  const code = await new Promise((resolve, reject) => {
    const child = spawn("npx", ["--no-install", "wrangler", "deploy"], {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
    });
    child.stdout.on("data", (chunk) => {
      process.stdout.write(chunk);
      output += chunk;
    });
    child.stderr.on("data", (chunk) => {
      process.stderr.write(chunk);
      output += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? 1));
  });
  if (code === 0) break;
  if (
    !/10429|rate limited|HTTP\s+429/i.test(output) ||
    attempt === delays.length
  ) {
    process.exitCode = code;
    break;
  }
  console.log(
    `Cloudflare rate limit: waiting ${delays[attempt] / 1000}s before retry ${attempt + 1}.`,
  );
  await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
}
