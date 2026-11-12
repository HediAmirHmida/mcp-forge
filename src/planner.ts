import { z } from "zod";
import type { Endpoint, ParsedSpec } from "./parser.js";
import { generateJson } from "./llm.js";

export interface ToolPlanItem {
  operationId: string;
  name: string;
  description: string;
}

export interface PlanResult {
  tools: ToolPlanItem[];
  totalEndpoints: number;
}

const PlanSchema = z.object({
  tools: z.array(
    z.object({
      operationId: z.string(),
      name: z.string(),
      description: z.string(),
    })
  ),
});

const jsonSchema = {
  type: "object",
  properties: {
    tools: {
      type: "array",
      items: {
        type: "object",
        properties: {
          operationId: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
        },
        required: ["operationId", "name", "description"],
      },
    },
  },
  required: ["tools"],
};

// One compact line per endpoint keeps the prompt small
function summarize(e: Endpoint): string {
  const params = e.parameters
    .map((p) => `${p.name}${p.required ? "*" : ""}`)
    .join(", ");
  const text = (e.summary ?? e.description ?? "").replace(/\s+/g, " ").slice(0, 140);
  return (
    `${e.operationId} | ${e.method.toUpperCase()} ${e.path} | ${text}` +
    (params ? ` | params: ${params}` : "") +
    (e.requestBodySchema ? " | has body" : "")
  );
}

export async function planTools(
  spec: ParsedSpec,
  maxTools = 12
): Promise<PlanResult> {
  const prompt = `You are designing an MCP server so an AI assistant can use the "${spec.title}" API.

Below are ALL endpoints, one per line: operationId | METHOD path | summary | params (* = required).

Select at most ${maxTools} endpoints that are the most useful for an AI assistant.
Prefer core read, search and create operations. Skip niche, redundant or purely administrative ones.

For each selected endpoint return:
- operationId: exactly as listed
- name: snake_case, verb_noun style, unique, max 40 characters
- description: 1-3 sentences. Say what the tool does, WHEN an AI should use it, and (if it could be confused with another tool) when NOT to use it. Mention important parameters only if they are not obvious.

Endpoints:
${spec.endpoints.map(summarize).join("\n")}`;

  const raw = await generateJson(prompt, jsonSchema, PlanSchema);

  // Never trust LLM output: keep only real, unique operationIds and clean names
  const known = new Set(spec.endpoints.map((e) => e.operationId));
  const usedIds = new Set<string>();
  const usedNames = new Set<string>();
  const tools: ToolPlanItem[] = [];

  for (const t of raw.tools) {
    if (!known.has(t.operationId) || usedIds.has(t.operationId)) continue;
    let name =
      t.name
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 40) || "tool";
    while (usedNames.has(name)) name += "_2";
    usedIds.add(t.operationId);
    usedNames.add(name);
    tools.push({
      operationId: t.operationId,
      name,
      description: t.description.trim(),
    });
    if (tools.length >= maxTools) break;
  }

  if (tools.length === 0) throw new Error("Planner returned no valid tools");
  return { tools, totalEndpoints: spec.endpoints.length };
}