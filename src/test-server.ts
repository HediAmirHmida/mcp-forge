import { mkdirSync, writeFileSync } from "node:fs";
import { runTests } from "./harness.js";

const [specSource, serverPath] = process.argv.slice(2);
if (!specSource || !serverPath) {
  console.error(
    "Usage: npm run test:server -- <spec.json> <generated-server.ts>"
  );
  process.exit(1);
}

// Prism serves routes without the server's path prefix (e.g. /api/v3)
const basePath = "";

const report = await runTests(serverPath, specSource, basePath);

for (const r of report.results) {
  console.log(
    `${r.ok ? "PASS" : "FAIL"}  ${r.tool}${r.ok ? "" : "\n        " + r.error}`
  );
}
console.log(`\n${report.passed}/${report.total} tools passed`);

mkdirSync("reports", { recursive: true });
writeFileSync("reports/latest.json", JSON.stringify(report, null, 2));