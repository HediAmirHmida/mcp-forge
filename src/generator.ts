import type { Endpoint, ParsedSpec } from "./parser.js";
import type { ToolPlanItem } from "./planner.js";

// Converts a JSON Schema object into the *source code* of a Zod schema.
// `seen` holds the schemas we are currently inside, so only a real cycle
// (not mere depth) makes us give up on a branch.
function toZod(schema: any, seen: Set<any> = new Set()): string {
  if (!schema || typeof schema !== "object") return "z.any()";
  if (seen.has(schema) || seen.size > 12) return "z.any()";
  const path = new Set(seen).add(schema);

  if (Array.isArray(schema.enum)) {
    const allStrings = schema.enum.every((v: any) => typeof v === "string");
    return allStrings && schema.enum.length > 0
      ? `z.enum(${JSON.stringify(schema.enum)})`
      : "z.any()";
  }

  switch (schema.type) {
    case "string":
      return "z.string()";
    case "integer":
      return "z.number().int()";
    case "number":
      return "z.number()";
    case "boolean":
      return "z.boolean()";
    case "array":
      return `z.array(${toZod(schema.items, path)})`;
    case "object": {
      const props = schema.properties ?? {};
      // an object with no fixed properties but additionalProperties is a map
      if (Object.keys(props).length === 0 && schema.additionalProperties) {
        const inner =
          schema.additionalProperties === true
            ? "z.any()"
            : toZod(schema.additionalProperties, path);
        return `z.record(z.string(), ${inner})`;
      }
      const required = new Set<string>(schema.required ?? []);
      const fields = Object.entries<any>(props).map(([key, value]) => {
        let code = toZod(value, path);
        if (!required.has(key)) code += ".optional()";
        return `${JSON.stringify(key)}: ${code}`;
      });
      return `z.object({ ${fields.join(", ")} })`;
    }
    default:
      return "z.any()";
  }
}

function toolName(e: Endpoint): string {
  return e.operationId.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function bodyZod(e: Endpoint): string {
  const ct = e.requestBodyContentType ?? "";
  if (ct.includes("json") || ct === "*/*") return toZod(e.requestBodySchema);
  // text/plain and similar: usually a raw string
  return e.requestBodySchema?.type ? toZod(e.requestBodySchema) : "z.string()";
}

// `plan` is optional: when present, its name and description (written by
// the LLM planner) replace the ones copied from the spec.
function generateTool(e: Endpoint, plan?: ToolPlanItem): string {
  const fields: string[] = [];

  for (const p of e.parameters) {
    let code = toZod(p.schema);
    if (p.description) code += `.describe(${JSON.stringify(p.description)})`;
    if (!p.required) code += ".optional()";
    fields.push(`${JSON.stringify(p.name)}: ${code}`);
  }
  if (e.requestBodySchema) {
    fields.push(`"body": ${bodyZod(e)}`);
  }

  const route = {
    method: e.method.toUpperCase(),
    path: e.path,
    params: e.parameters.map((p) => ({ name: p.name, in: p.in })),
    hasBody: Boolean(e.requestBodySchema),
    contentType:
      e.requestBodyContentType === "*/*"
        ? "application/json"
        : e.requestBodyContentType,
  };

  const description =
    plan?.description ??
    ([e.summary, e.description].filter(Boolean).join(". ") ||
      `${route.method} ${route.path}`);

  return `server.registerTool(
  ${JSON.stringify(plan?.name ?? toolName(e))},
  {
    title: ${JSON.stringify(e.summary ?? e.operationId)},
    description: ${JSON.stringify(description)},
    inputSchema: { ${fields.join(", ")} },
  },
  async (args) => callApi(${JSON.stringify(route)}, args as Record<string, unknown>)
);`;
}

// NOTE: this block is the text of the generated file. Keep it free of
// backticks and ${...}, which would be interpolated here.
const PRELUDE = `import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

interface Route {
  method: string;
  path: string;
  params: { name: string; in: string }[];
  hasBody: boolean;
  contentType?: string;
}

async function callApi(route: Route, args: Record<string, unknown>) {
  let path = route.path;
  const query = new URLSearchParams();
  const headers: Record<string, string> = { Accept: "application/json" };

  for (const p of route.params) {
    const value = args[p.name];
    if (value === undefined) continue;
    if (p.in === "path") {
      path = path.replace("{" + p.name + "}", encodeURIComponent(String(value)));
    } else if (p.in === "query") {
      if (Array.isArray(value)) value.forEach((v) => query.append(p.name, String(v)));
      else query.append(p.name, String(value));
    } else if (p.in === "header") {
      headers[p.name] = String(value);
    }
  }

  const qs = query.toString();
  const url = BASE_URL + path + (qs ? "?" + qs : "");
  const init: RequestInit = { method: route.method, headers };
  if (route.hasBody && args.body !== undefined) {
    const ct = route.contentType ?? "application/json";
    headers["Content-Type"] = ct;
    init.body = ct.includes("json") ? JSON.stringify(args.body) : String(args.body);
  }

  try {
    const res = await fetch(url, init);
    const text = await res.text();
    if (!res.ok) {
      return {
        isError: true,
        content: [{ type: "text" as const, text: "HTTP " + res.status + ": " + text.slice(0, 2000) }],
      };
    }
    return { content: [{ type: "text" as const, text: text.slice(0, 20000) }] };
  } catch (err) {
    return {
      isError: true,
      content: [{ type: "text" as const, text: "Network error: " + String(err) }],
    };
  }
}
`;

export function generateServer(
  spec: ParsedSpec,
  plan?: ToolPlanItem[]
): string {
  const slug =
    spec.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") ||
    "api";

  const header =
    PRELUDE +
    `\nconst BASE_URL = process.env.API_BASE_URL ?? ${JSON.stringify(spec.baseUrl)};\n` +
    `const server = new McpServer({ name: ${JSON.stringify(slug)}, version: "1.0.0" });\n\n`;

  // With a plan: only the selected endpoints, with the planner's names and
  // descriptions. Without one: every endpoint, as before.
  // (The arrow function matters: map(generateTool) would pass the array
  // index as the `plan` argument.)
  const tools = (
    plan
      ? plan.flatMap((p) => {
          const e = spec.endpoints.find((x) => x.operationId === p.operationId);
          return e ? [generateTool(e, p)] : [];
        })
      : spec.endpoints.map((e) => generateTool(e))
  ).join("\n\n");

  return header + tools + "\n\nawait server.connect(new StdioServerTransport());\n";
}