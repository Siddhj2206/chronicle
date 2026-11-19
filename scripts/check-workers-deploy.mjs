const ci = process.env.CI;
const [command, ...args] = process.argv.slice(2);
let environment = process.env.CLOUDFLARE_ENV;
for (let index = 0; index < args.length; index++) {
  const arg = args[index];
  if (arg === "--env" || arg === "-e") environment = args[++index];
  else if (arg.startsWith("--env=")) environment = arg.slice(6);
  else if (arg.startsWith("-e=")) environment = arg.slice(3);
}
const defaultWranglerDeployment = ["deploy", "versions upload"].includes(
  process.env.WRANGLER_COMMAND,
);
const remoteOperation =
  ["deploy", "upload"].includes(command) ||
  (command === "populateCache" && args.includes("remote"));
if (
  ci &&
  !["false", "0"].includes(ci.toLowerCase()) &&
  (defaultWranglerDeployment || (remoteOperation && environment !== "preview"))
) {
  console.error(
    "Refusing default-environment deployment in CI. Use bun run preview:deploy (--env preview).",
  );
  process.exit(1);
}
