import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
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

const BASE_URL = process.env.API_BASE_URL ?? "/api/v3";
const server = new McpServer({ name: "swagger-petstore-openapi-3-0", version: "1.0.0" });

server.registerTool(
  "add_pet",
  {
    title: "Add a new pet to the store.",
    description: "Add a new pet to the store with a request body. Use this when the user wants to list a brand new pet for sale.",
    inputSchema: { "body": z.object({ "id": z.number().int().optional(), "name": z.string(), "category": z.object({ "id": z.number().int().optional(), "name": z.string().optional() }).optional(), "photoUrls": z.array(z.string()), "tags": z.array(z.object({ "id": z.number().int().optional(), "name": z.string().optional() })).optional(), "status": z.enum(["available","pending","sold"]).optional() }) },
  },
  async (args) => callApi({"method":"POST","path":"/pet","params":[],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "find_pets_by_status",
  {
    title: "Finds Pets by status.",
    description: "Finds pets by their status value such as available, pending, or sold. Use this when searching for pets using their availability state.",
    inputSchema: { "status": z.enum(["available","pending","sold"]).describe("Status values that need to be considered for filter") },
  },
  async (args) => callApi({"method":"GET","path":"/pet/findByStatus","params":[{"name":"status","in":"query"}],"hasBody":false}, args as Record<string, unknown>)
);

server.registerTool(
  "get_pet_by_id",
  {
    title: "Find pet by ID.",
    description: "Finds a single pet by its unique integer ID. Use this when you need detailed information for a specific pet.",
    inputSchema: { "petId": z.number().int().describe("ID of pet to return") },
  },
  async (args) => callApi({"method":"GET","path":"/pet/{petId}","params":[{"name":"petId","in":"path"}],"hasBody":false}, args as Record<string, unknown>)
);

server.registerTool(
  "delete_pet",
  {
    title: "Deletes a pet.",
    description: "Deletes an existing pet by ID. Use this when a pet needs to be removed from the store inventory permanently.",
    inputSchema: { "api_key": z.string().optional(), "petId": z.number().int().describe("Pet id to delete") },
  },
  async (args) => callApi({"method":"DELETE","path":"/pet/{petId}","params":[{"name":"api_key","in":"header"},{"name":"petId","in":"path"}],"hasBody":false}, args as Record<string, unknown>)
);

server.registerTool(
  "get_inventory",
  {
    title: "Returns pet inventories by status.",
    description: "Returns pet inventories broken down by status. Use this to get a high-level summary of store stock levels.",
    inputSchema: {  },
  },
  async (args) => callApi({"method":"GET","path":"/store/inventory","params":[],"hasBody":false}, args as Record<string, unknown>)
);

server.registerTool(
  "place_order",
  {
    title: "Place an order for a pet.",
    description: "Place a new purchase order for a pet. Use this when a user wants to buy a pet and complete an order.",
    inputSchema: { "body": z.object({ "id": z.number().int().optional(), "petId": z.number().int().optional(), "quantity": z.number().int().optional(), "shipDate": z.string().optional(), "status": z.enum(["placed","approved","delivered"]).optional(), "complete": z.boolean().optional() }) },
  },
  async (args) => callApi({"method":"POST","path":"/store/order","params":[],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "get_order_by_id",
  {
    title: "Find purchase order by ID.",
    description: "Find a purchase order by its unique ID. Use this to check the status or details of an existing pet order.",
    inputSchema: { "orderId": z.number().int().describe("ID of order that needs to be fetched") },
  },
  async (args) => callApi({"method":"GET","path":"/store/order/{orderId}","params":[{"name":"orderId","in":"path"}],"hasBody":false}, args as Record<string, unknown>)
);

server.registerTool(
  "delete_order",
  {
    title: "Delete purchase order by identifier.",
    description: "Delete a purchase order by its ID. Use this when an existing order needs to be cancelled and removed.",
    inputSchema: { "orderId": z.number().int().describe("ID of the order that needs to be deleted") },
  },
  async (args) => callApi({"method":"DELETE","path":"/store/order/{orderId}","params":[{"name":"orderId","in":"path"}],"hasBody":false}, args as Record<string, unknown>)
);

server.registerTool(
  "create_user",
  {
    title: "Create user.",
    description: "Create a new user account in the system. Use this when registering a single new user profile.",
    inputSchema: { "body": z.object({ "id": z.number().int().optional(), "username": z.string().optional(), "firstName": z.string().optional(), "lastName": z.string().optional(), "email": z.string().optional(), "password": z.string().optional(), "phone": z.string().optional(), "userStatus": z.number().int().optional() }) },
  },
  async (args) => callApi({"method":"POST","path":"/user","params":[],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "login_user",
  {
    title: "Logs user into the system.",
    description: "Logs a user into the system using username and password credentials. Use this to authenticate a user session.",
    inputSchema: { "username": z.string().describe("The user name for login").optional(), "password": z.string().describe("The password for login in clear text").optional() },
  },
  async (args) => callApi({"method":"GET","path":"/user/login","params":[{"name":"username","in":"query"},{"name":"password","in":"query"}],"hasBody":false}, args as Record<string, unknown>)
);

server.registerTool(
  "get_user_by_name",
  {
    title: "Get user by user name.",
    description: "Retrieve user details by their username. Use this when looking up specific user profile information.",
    inputSchema: { "username": z.string().describe("The name that needs to be fetched. Use user1 for testing") },
  },
  async (args) => callApi({"method":"GET","path":"/user/{username}","params":[{"name":"username","in":"path"}],"hasBody":false}, args as Record<string, unknown>)
);

server.registerTool(
  "delete_user",
  {
    title: "Delete user resource.",
    description: "Delete a user account by username. Use this to completely remove a user from the system.",
    inputSchema: { "username": z.string().describe("The name that needs to be deleted") },
  },
  async (args) => callApi({"method":"DELETE","path":"/user/{username}","params":[{"name":"username","in":"path"}],"hasBody":false}, args as Record<string, unknown>)
);

await server.connect(new StdioServerTransport());
