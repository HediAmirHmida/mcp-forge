import { parseSpec } from "./parser.js";
import { repairServer } from "./repair.js";

const [specSource, serverPath] = process.argv.slice(2);
if (!specSource || !serverPath) {
  console.error("Usage: npm run repair -- <spec.json> <generated-server.ts>");
  process.exit(1);
}

const spec = await parseSpec(specSource);
const r = await repairServer(spec, specSource, serverPath);

console.log(
  `\nRepair finished: ${r.initialPassed}/${r.total} -> ${r.finalPassed}/${r.total} tools passing`
);
console.log(
  `LLM calls: ${r.llmCalls}  tokens: ${r.inputTokens} in / ${r.outputTokens} out`
);
if (r.remainingRealFailures.length) {
  console.log("Still failing:", r.remainingRealFailures.join(", "));
}
if (r.mockArtifacts.length) {
  console.log("Mock-only failures (not counted as bugs):", r.mockArtifacts.join(", "));
}