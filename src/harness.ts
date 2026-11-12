import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { sampleFromSchema } from "./sample.js";

export interface ToolResult {
  tool: string;
  args: unknown;
  ok: boolean;
  error?: string;
}

export interface TestReport {
  server: string;
  total: number;
  passed: number;
  results: ToolResult[];
}

const PORT = 4010;

// Writes a copy of the spec with all security requirements removed,
// so the mock accepts requests without credentials.
function prepareMockSpec(specSource: string): string {
  const spec = JSON.parse(readFileSync(specSource, "utf8"));
  delete spec.security;
  for (const pathItem of Object.values<any>(spec.paths ?? {})) {
    for (const op of Object.values<any>(pathItem)) {
      if (op && typeof op === "object") delete op.security;
    }
  }
  mkdirSync("tmp", { recursive: true });
  const out = "tmp/mock-spec.json";
  writeFileSync(out, JSON.stringify(spec));
  return out;
}

function startPrism(specFile: string): ChildProcess {
  return spawn("npx", ["prism", "mock", "-d", "-p", String(PORT), specFile], {
    stdio: "ignore",
    shell: process.platform === "win32",
  });
}

function stopProcess(child: ChildProcess) {
  if (process.platform === "win32" && child.pid) {
    spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"]);
  } else {
    child.kill();
  }
}

async function waitForPrism(timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await fetch(`http://127.0.0.1:${PORT}/`); // any response means it's up
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error(
    "Prism did not start. Run the 'npx prism mock' command manually to see its error."
  );
}

export async function runTests(
  serverPath: string,
  specSource: string,
  basePath: string
): Promise<TestReport> {
  const mockSpec = prepareMockSpec(specSource);
  const prism = startPrism(mockSpec);
  try {
    await waitForPrism();

    const transport = new StdioClientTransport({
      command: "npx",
      args: ["tsx", serverPath],
      env: {
        ...(process.env as Record<string, string>),
        API_BASE_URL: `http://127.0.0.1:${PORT}${basePath}`,
      },
    });
    const client = new Client({ name: "harness", version: "1.0.0" });
    await client.connect(transport);

    const { tools } = await client.listTools();
    const results: ToolResult[] = [];

    for (const tool of tools) {
      const args = sampleFromSchema(tool.inputSchema);
      try {
        const res: any = await client.callTool({
          name: tool.name,
          arguments: args as Record<string, unknown>,
        });
        const text = res.content?.map((c: any) => c.text ?? "").join("") ?? "";
        results.push(
          res.isError
            ? { tool: tool.name, args, ok: false, error: text.slice(0, 500) }
            : { tool: tool.name, args, ok: true }
        );
      } catch (err) {
        results.push({ tool: tool.name, args, ok: false, error: String(err) });
      }
    }

    await client.close();
    return {
      server: serverPath,
      total: results.length,
      passed: results.filter((r) => r.ok).length,
      results,
    };
  } finally {
    stopProcess(prism);
  }
}