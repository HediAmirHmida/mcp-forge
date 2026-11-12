import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { z } from "zod";
import type { Endpoint, ParsedSpec } from "./parser.js";
import { runTests, type TestReport, type ToolResult } from "./harness.js";
import { generateJson, usage } from "./llm.js";

export interface AttemptLog {
  attempt: number;
  passed: number;
  total: number;
  realFailures: string[];
  mockArtifacts: string[];
  patched: string[];
  accepted?: boolean;
  note?: string;
}

export interface RepairResult {
  initialPassed: number;
  finalPassed: number;
  total: number;
  remainingRealFailures: string[];
  mockArtifacts: string[];
  attempts: AttemptLog[];
  llmCalls: number;
  inputTokens: number;
  outputTokens: number;
}

const MAX_PATCHES_PER_ATTEMPT = 5;

// Errors caused by the Prism mock itself, not by the generated tool.
function isMockArtifact(r: ToolResult): boolean {
  const e = r.error ?? "";
  return (
    (/HTTP 5\d\d/.test(e) && e.includes("stoplight.io/prism")) ||
    e.includes("Invalid security scheme") ||
    e.includes("Cannot find serializer")
  );
}

function split(report: TestReport) {
  const failed = report.results.filter((r) => !r.ok);
  return {
    real: failed.filter((r) => !isMockArtifact(r)),
    artifacts: failed.filter(isMockArtifact),
  };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Finds one tool's registerTool(...) block inside the generated file.
function extractBlock(code: string, name: string) {
  const re = new RegExp(
    "server\\.registerTool\\(\\s*" + escapeRegExp(JSON.stringify(name)) + "\\s*,"
  );
  const m = re.exec(code);
  if (!m) return null;
  const start = m.index;
  const nextTool = code.indexOf("server.registerTool(", start + 10);
  const connect = code.indexOf("await server.connect(", start);
  const candidates = [nextTool, connect].filter((i) => i > start);
  const limit = candidates.length ? Math.min(...candidates) : code.length;
  const text = code.slice(start, limit).trimEnd();
  return { start, end: start + text.length, text };
}

// The block contains the route as JSON; use it to find the spec endpoint.
function findEndpoint(block: string, spec: ParsedSpec): Endpoint | undefined {
  const m = /callApi\((\{.*\}), args/.exec(block);
  if (!m) return undefined;
  try {
    const route = JSON.parse(m[1]);
    return spec.endpoints.find(
      (e) => e.method.toUpperCase() === route.method && e.path === route.path
    );
  } catch {
    return undefined;
  }
}

const PatchSchema = z.object({ replacement: z.string(), explanation: z.string() });
const patchJsonSchema = {
  type: "object",
  properties: {
    replacement: { type: "string" },
    explanation: { type: "string" },
  },
  required: ["replacement", "explanation"],
};

function buildPrompt(block: string, f: ToolResult, endpoint?: Endpoint): string {
  const specInfo = endpoint
    ? JSON.stringify(
        {
          method: endpoint.method,
          path: endpoint.path,
          summary: endpoint.summary,
          parameters: endpoint.parameters,
          requestBodyContentType: endpoint.requestBodyContentType,
          requestBodySchema: endpoint.requestBodySchema,
        },
        null,
        1
      ).slice(0, 8000)
    : "(endpoint not found in spec)";

  return `You are repairing one tool in a generated MCP server (TypeScript, zod).

The automated test called this tool with generated arguments against a mock of the API,
and the call failed. Fix the tool so valid requests are produced.

CURRENT TOOL CODE:
${block}

ARGUMENTS THE TEST SENT:
${JSON.stringify(f.args, null, 1).slice(0, 3000)}

ERROR RETURNED:
${(f.error ?? "").slice(0, 1500)}

MATCHING ENDPOINT FROM THE OPENAPI SPEC:
${specInfo}

RULES:
- Return the COMPLETE replacement block: it must start with server.registerTool( and end with );
- Keep the tool name string unchanged.
- Keep the handler as: async (args) => callApi(<route>, args as Record<string, unknown>)
  You may correct the route object (method, path, params, hasBody, contentType) if the spec shows it is wrong.
- The test arguments are generated automatically from inputSchema. If the schema has a wrong type,
  misses a required field, or lacks constraints, the generated request is invalid. Fix the schema.
- z is already imported. Do not add imports. Use only basic zod: z.string(), z.number(), z.number().int(),
  z.boolean(), z.enum([...]), z.array(...), z.object({...}), z.record(z.string(), ...), .optional(), .describe(...).
- Change as little as possible. Keep the description unless it is wrong.

Return JSON with "replacement" (the full block) and "explanation" (one sentence).`;
}

function validPatch(name: string, replacement: string): boolean {
  const flat = replacement.trim().replace(/\s+/g, " ");
  return (
    flat.startsWith("server.registerTool( " + JSON.stringify(name) + ",") &&
    flat.endsWith(");") &&
    flat.includes("callApi(") &&
    !flat.includes("import ")
  );
}

async function evaluate(
  serverPath: string,
  specSource: string
): Promise<TestReport | null> {
  try {
    return await runTests(serverPath, specSource, "");
  } catch (err) {
    console.error("Harness error:", String(err).slice(0, 300));
    return null;
  }
}

export async function repairServer(
  spec: ParsedSpec,
  specSource: string,
  serverPath: string,
  maxAttempts = 3
): Promise<RepairResult> {
  copyFileSync(serverPath, serverPath.replace(/\.ts$/, ".before-repair.ts"));
  const usageStart = { ...usage };

  let bestCode = readFileSync(serverPath, "utf8");
  let bestReport = await evaluate(serverPath, specSource);
  if (!bestReport) throw new Error("Server does not start; nothing to repair");

  const initialPassed = bestReport.passed;
  const attempts: AttemptLog[] = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { real, artifacts } = split(bestReport);
    const log: AttemptLog = {
      attempt,
      passed: bestReport.passed,
      total: bestReport.total,
      realFailures: real.map((r) => r.tool),
      mockArtifacts: artifacts.map((r) => r.tool),
      patched: [],
    };
    attempts.push(log);
    console.log(
      `Attempt ${attempt}: ${bestReport.passed}/${bestReport.total} passing, ` +
        `${real.length} real failure(s), ${artifacts.length} mock artifact(s)`
    );
    if (real.length === 0) break;

    let candidate = bestCode;
    for (const f of real.slice(0, MAX_PATCHES_PER_ATTEMPT)) {
      const block = extractBlock(candidate, f.tool);
      if (!block) continue;
      try {
        const out = await generateJson(
          buildPrompt(block.text, f, findEndpoint(block.text, spec)),
          patchJsonSchema,
          PatchSchema
        );
        if (!validPatch(f.tool, out.replacement)) {
          console.log(`  ${f.tool}: patch rejected (bad format)`);
          continue;
        }
        candidate =
          candidate.slice(0, block.start) +
          out.replacement.trim() +
          candidate.slice(block.end);
        log.patched.push(f.tool);
        console.log(`  ${f.tool}: ${out.explanation}`);
      } catch (err) {
        console.log(`  ${f.tool}: LLM error (${String(err).slice(0, 120)})`);
      }
    }

    if (log.patched.length === 0) {
      log.note = "no usable patches";
      break;
    }

    writeFileSync(serverPath, candidate);
    const report = await evaluate(serverPath, specSource);
    const newReal = report ? split(report).real.length : Infinity;

    if (report && newReal < real.length) {
      bestCode = candidate;
      bestReport = report;
      log.accepted = true;
    } else {
      writeFileSync(serverPath, bestCode); // roll back
      log.accepted = false;
      log.note = "patches did not reduce real failures; rolled back";
      console.log("  rolled back");
    }
  }

  writeFileSync(serverPath, bestCode);
  const final = split(bestReport);
  const result: RepairResult = {
    initialPassed,
    finalPassed: bestReport.passed,
    total: bestReport.total,
    remainingRealFailures: final.real.map((r) => r.tool),
    mockArtifacts: final.artifacts.map((r) => r.tool),
    attempts,
    llmCalls: usage.calls - usageStart.calls,
    inputTokens: usage.inputTokens - usageStart.inputTokens,
    outputTokens: usage.outputTokens - usageStart.outputTokens,
  };

  mkdirSync("reports", { recursive: true });
  writeFileSync(
    `reports/repair-${basename(serverPath, ".ts")}-${Date.now()}.json`,
    JSON.stringify(result, null, 2)
  );
  return result;
}