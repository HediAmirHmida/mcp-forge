import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "npx",
  args: ["tsx", "src/server.ts"],
});

const client = new Client({ name: "test-client", version: "1.0.0" });
await client.connect(transport);

const { tools } = await client.listTools();
console.log("Tools:", tools.map((t) => t.name));

const ok = await client.callTool({
  name: "get_pokemon",
  arguments: { name: "pikachu" },
});
console.log("Pikachu:", ok.content);

const bad = await client.callTool({
  name: "get_pokemon",
  arguments: { name: "zzz" },
});
console.log("Fake name:", bad.isError, bad.content);

await client.close();