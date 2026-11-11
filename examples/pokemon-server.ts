import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({ name: "pokemon", version: "1.0.0" });
server.registerTool(
    "get_pokemon",
    {
      title: "Get Pokémon",
      description:
        "Look up a Pokémon by name and return its id, types, height and weight. " +
        "Use when the user asks about a specific Pokémon.",
      inputSchema: { name: z.string().describe("Pokémon name, e.g. 'pikachu'") },
    },
    async ({ name }) => {
      const res = await fetch(
        `https://pokeapi.co/api/v2/pokemon/${name.toLowerCase()}`
      );
      if (!res.ok) {
        return {
          isError: true,
          content: [{ type: "text", text: `Pokémon '${name}' not found` }],
        };
      }
      const data = await res.json();
      const summary = {
        id: data.id,
        name: data.name,
        types: data.types.map((t: any) => t.type.name),
        height: data.height,
        weight: data.weight,
      };
      return { content: [{ type: "text", text: JSON.stringify(summary) }] };
    }
  );
  await server.connect(new StdioServerTransport());