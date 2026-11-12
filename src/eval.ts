import { copyFileSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { parseSpec } from "./parser.js";
import { generateServer } from "./generator.js";
import { planTools } from "./planner.js";
import { runTests } from "./harness.js";
import { repairServer, split } from "./repair.js";

interface Row {
  spec: string;
  status: string;
  endpoints?: number;
  baselineTools?: number;
  baselineRealFails?: number;
  baselineMockOnly?: number;
  plannedTools?: number;
  plannedRealFails?: number;
  repairedRealFails?: number;
  llmCalls?: number;
  tokens?: number;
  seconds?: number;
}

const only = process.argv.slice(2);
const files = readdirSync("specs").filter(
  (f) => f.endsWith(".json") && (only.length === 0 || only.includes(f))
);

mkdirSync("reports", { recursive: true });
const rows: Row[] = [];

for (const f of files) {
  const name = f.replace(/\.json$/, "");
  const specPath = `specs/${f}`;
  const dir = `generated/eval/${name}`;
  const started = Date.now();
  console.log(`\n=== ${name} ===`);
  const row: Row = { spec: name, status: "ok" };

  try {
    const spec = await parseSpec(specPath);
    row.endpoints = spec.endpoints.length;
    mkdirSync(dir, { recursive: true });

    // 1. Baseline: every endpoint, no LLM
    const baselinePath = `${dir}/baseline.ts`;
    copyFileSync; // (kept imported for clarity)
    writeFileSync(baselinePath, generateServer(spec));
    const base = await runTests(baselinePath, specPath, "");
    const baseSplit = split(base);
    row.baselineTools = base.total;
    row.baselineRealFails = baseSplit.real.length;
    row.baselineMockOnly = baseSplit.artifacts.length;
    console.log(
      `baseline: ${base.total} tools, ${baseSplit.real.length} real failures, ` +
        `${baseSplit.artifacts.length} mock-only`
    );

    // 2 + 3. Planned server, then repair (its first attempt IS the planned result)
    const plan = await planTools(spec);
    const plannedPath = `${dir}/planned.ts`;
    writeFileSync(plannedPath, generateServer(spec, plan.tools));
    const rep = await repairServer(spec, specPath, plannedPath, 3);
    row.plannedTools = rep.total;
    row.plannedRealFails = rep.attempts[0]?.realFailures.length ?? 0;
    row.repairedRealFails = rep.remainingRealFailures.length;
    row.llmCalls = rep.llmCalls + 1; // +1 for the planner call
    row.tokens = rep.inputTokens + rep.outputTokens;
  } catch (err) {
    row.status = "error: " + String(err).slice(0, 150);
    console.log(row.status);
  }

  row.seconds = Math.round((Date.now() - started) / 1000);
  rows.push(row);
  writeFileSync("reports/eval.json", JSON.stringify(rows, null, 2));
}

// Summary table
const lines = [
  "| spec | endpoints | baseline tools | baseline real fails | planned tools | planned real fails | after repair | seconds |",
  "|---|---|---|---|---|---|---|---|",
  ...rows.map(
    (r) =>
      `| ${r.spec} | ${r.endpoints ?? "-"} | ${r.baselineTools ?? "-"} | ${r.baselineRealFails ?? "-"} | ` +
      `${r.plannedTools ?? "-"} | ${r.plannedRealFails ?? "-"} | ${r.repairedRealFails ?? "-"} | ${r.seconds} |` +
      (r.status !== "ok" ? ` <- ${r.status}` : "")
  ),
];
writeFileSync("reports/eval.md", lines.join("\n") + "\n");
console.log("\n" + lines.join("\n"));