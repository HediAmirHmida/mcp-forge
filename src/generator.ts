import type { Endpoint, ParsedSpec } from "./parser.js";

// Converts a JSON Schema object into the *source code* of a Zod schema.
function toZod(schema: any, depth = 0): string {
  // depth limit protects against circular schemas
  if (!schema || depth > 4) return "z.any()";

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
      return `z.array(${toZod(schema.items, depth + 1)})`;
    case "object": {
      const required = new Set<string>(schema.required ?? []);
      const fields = Object.entries<any>(schema.properties ?? {}).map(
        ([key, value]) => {
          let code = toZod(value, depth + 1);
          if (!required.has(key)) code += ".optional()";
          return `${JSON.stringify(key)}: ${code}`;
        }
      );
      return `z.object({ ${fields.join(", ")} })`;
    }
    default:
      return "z.any()";
  }
}
function toolName(e: Endpoint): string {
    return e.operationId.replace(/[^a-zA-Z0-9_-]/g, "_");
  }
  
  function generateTool(e: Endpoint): string {
    const fields: string[] = [];
  
    for (const p of e.parameters) {
      let code = toZod(p.schema);
      if (p.description) code += `.describe(${JSON.stringify(p.description)})`;
      if (!p.required) code += ".optional()";
      fields.push(`${JSON.stringify(p.name)}: ${code}`);
    }
    if (e.requestBodySchema) {
      fields.push(`"body": ${toZod(e.requestBodySchema)}`);
    }
  
    const route = {
      method: e.method.toUpperCase(),
      path: e.path,
      params: e.parameters.map((p) => ({ name: p.name, in: p.in })),
      hasBody: Boolean(e.requestBodySchema),
    };
  
    const description =
      [e.summary, e.description].filter(Boolean).join(". ") ||
      `${route.method} ${route.path}`;
  
    return `server.registerTool(
    ${JSON.stringify(toolName(e))},
    {
      title: ${JSON.stringify(e.summary ?? e.operationId)},
      description: ${JSON.stringify(description)},
      inputSchema: { ${fields.join(", ")} },
    },
    async (args) => callApi(${JSON.stringify(route)}, args as Record<string, unknown>)
  );`;
  }
  const PRELUDE = `import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

interface Route {
  method: string;
  path: string;
  params: { name: string; in: string }[];
  hasBody: boolean;
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
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(args.body);
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

export function generateServer(spec: ParsedSpec): string {
  const slug =
    spec.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") ||
    "api";

  const header =
    PRELUDE +
    `\nconst BASE_URL = process.env.API_BASE_URL ?? ${JSON.stringify(spec.baseUrl)};\n` +
    `const server = new McpServer({ name: ${JSON.stringify(slug)}, version: "1.0.0" });\n\n`;

  const tools = spec.endpoints.map(generateTool).join("\n\n");

  return header + tools + "\n\nawait server.connect(new StdioServerTransport());\n";
}