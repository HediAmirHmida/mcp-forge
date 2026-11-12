import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { parseSpec } from "./parser.js";
import { generateServer } from "./generator.js";
import { planTools, type PlanResult } from "./planner.js";
import { usage } from "./llm.js";

const args = process.argv.slice(2);
const usePlan = args.includes("--plan");
const [source, out] = args.filter((a) => !a.startsWith("--"));
if (!source || !out) {
  console.error(
    "Usage: npm run generate -- <spec-path> <output-file> [--plan]"
  );
  process.exit(1);
}

const spec = await parseSpec(source);

let plan: PlanResult | undefined;
if (usePlan) {
  plan = await planTools(spec);
}

const code = generateServer(spec, plan?.tools);

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, code);

if (plan) {
  writeFileSync(
    out.replace(/\.ts$/, ".plan.json"),
    JSON.stringify(plan, null, 2)
  );
  console.log(
    `Planner kept ${plan.tools.length} of ${plan.totalEndpoints} endpoints ` +
      `(${usage.calls} LLM call(s), ${usage.inputTokens} in / ${usage.outputTokens} out tokens)`
  );
}
console.log(
  `Generated ${plan ? plan.tools.length : spec.endpoints.length} tools -> ${out}`
);