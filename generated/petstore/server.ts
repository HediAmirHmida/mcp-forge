import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
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

const BASE_URL = process.env.API_BASE_URL ?? "https://petstore3.swagger.io/api/v3";
const server = new McpServer({ name: "swagger-petstore-openapi-3-0", version: "1.0.0" });

server.registerTool(
    "addPet",
    {
      title: "Add a new pet to the store.",
      description: "Add a new pet to the store.. Add a new pet to the store.",
      inputSchema: { "body": z.object({ "id": z.number().int().optional(), "name": z.string(), "category": z.object({ "id": z.number().int().optional(), "name": z.string().optional() }).optional(), "photoUrls": z.array(z.string()), "tags": z.array(z.object({ "id": z.number().int().optional(), "name": z.string().optional() })).optional(), "status": z.enum(["available","pending","sold"]).optional() }) },
    },
    async (args) => callApi({"method":"POST","path":"/pet","params":[],"hasBody":true}, args as Record<string, unknown>)
  );

server.registerTool(
    "updatePet",
    {
      title: "Update an existing pet.",
      description: "Update an existing pet.. Update an existing pet by Id.",
      inputSchema: { "body": z.object({ "id": z.number().int().optional(), "name": z.string(), "category": z.object({ "id": z.number().int().optional(), "name": z.string().optional() }).optional(), "photoUrls": z.array(z.string()), "tags": z.array(z.object({ "id": z.number().int().optional(), "name": z.string().optional() })).optional(), "status": z.enum(["available","pending","sold"]).optional() }) },
    },
    async (args) => callApi({"method":"PUT","path":"/pet","params":[],"hasBody":true}, args as Record<string, unknown>)
  );

server.registerTool(
    "findPetsByStatus",
    {
      title: "Finds Pets by status.",
      description: "Finds Pets by status.. Multiple status values can be provided with comma separated strings.",
      inputSchema: { "status": z.enum(["available","pending","sold"]).describe("Status values that need to be considered for filter") },
    },
    async (args) => callApi({"method":"GET","path":"/pet/findByStatus","params":[{"name":"status","in":"query"}],"hasBody":false}, args as Record<string, unknown>)
  );

server.registerTool(
    "findPetsByTags",
    {
      title: "Finds Pets by tags.",
      description: "Finds Pets by tags.. Multiple tags can be provided with comma separated strings. Use tag1, tag2, tag3 for testing.",
      inputSchema: { "tags": z.array(z.string()).describe("Tags to filter by") },
    },
    async (args) => callApi({"method":"GET","path":"/pet/findByTags","params":[{"name":"tags","in":"query"}],"hasBody":false}, args as Record<string, unknown>)
  );

server.registerTool(
    "getPetById",
    {
      title: "Find pet by ID.",
      description: "Find pet by ID.. Returns a single pet.",
      inputSchema: { "petId": z.number().int().describe("ID of pet to return") },
    },
    async (args) => callApi({"method":"GET","path":"/pet/{petId}","params":[{"name":"petId","in":"path"}],"hasBody":false}, args as Record<string, unknown>)
  );

server.registerTool(
    "updatePetWithForm",
    {
      title: "Updates a pet in the store with form data.",
      description: "Updates a pet in the store with form data.. Updates a pet resource based on the form data.",
      inputSchema: { "petId": z.number().int().describe("ID of pet that needs to be updated"), "name": z.string().describe("Name of pet that needs to be updated").optional(), "status": z.string().describe("Status of pet that needs to be updated").optional() },
    },
    async (args) => callApi({"method":"POST","path":"/pet/{petId}","params":[{"name":"petId","in":"path"},{"name":"name","in":"query"},{"name":"status","in":"query"}],"hasBody":false}, args as Record<string, unknown>)
  );

server.registerTool(
    "deletePet",
    {
      title: "Deletes a pet.",
      description: "Deletes a pet.. Delete a pet.",
      inputSchema: { "api_key": z.string().optional(), "petId": z.number().int().describe("Pet id to delete") },
    },
    async (args) => callApi({"method":"DELETE","path":"/pet/{petId}","params":[{"name":"api_key","in":"header"},{"name":"petId","in":"path"}],"hasBody":false}, args as Record<string, unknown>)
  );

server.registerTool(
    "uploadFile",
    {
      title: "Uploads an image.",
      description: "Uploads an image.. Upload image of the pet.",
      inputSchema: { "petId": z.number().int().describe("ID of pet to update"), "additionalMetadata": z.string().describe("Additional Metadata").optional() },
    },
    async (args) => callApi({"method":"POST","path":"/pet/{petId}/uploadImage","params":[{"name":"petId","in":"path"},{"name":"additionalMetadata","in":"query"}],"hasBody":false}, args as Record<string, unknown>)
  );

server.registerTool(
    "getInventory",
    {
      title: "Returns pet inventories by status.",
      description: "Returns pet inventories by status.. Returns a map of status codes to quantities.",
      inputSchema: {  },
    },
    async (args) => callApi({"method":"GET","path":"/store/inventory","params":[],"hasBody":false}, args as Record<string, unknown>)
  );

server.registerTool(
    "placeOrder",
    {
      title: "Place an order for a pet.",
      description: "Place an order for a pet.. Place a new order in the store.",
      inputSchema: { "body": z.object({ "id": z.number().int().optional(), "petId": z.number().int().optional(), "quantity": z.number().int().optional(), "shipDate": z.string().optional(), "status": z.enum(["placed","approved","delivered"]).optional(), "complete": z.boolean().optional() }) },
    },
    async (args) => callApi({"method":"POST","path":"/store/order","params":[],"hasBody":true}, args as Record<string, unknown>)
  );

server.registerTool(
    "getOrderById",
    {
      title: "Find purchase order by ID.",
      description: "Find purchase order by ID.. For valid response try integer IDs with value <= 5 or > 10. Other values will generate exceptions.",
      inputSchema: { "orderId": z.number().int().describe("ID of order that needs to be fetched") },
    },
    async (args) => callApi({"method":"GET","path":"/store/order/{orderId}","params":[{"name":"orderId","in":"path"}],"hasBody":false}, args as Record<string, unknown>)
  );

server.registerTool(
    "deleteOrder",
    {
      title: "Delete purchase order by identifier.",
      description: "Delete purchase order by identifier.. For valid response try integer IDs with value < 1000. Anything above 1000 or non-integers will generate API errors.",
      inputSchema: { "orderId": z.number().int().describe("ID of the order that needs to be deleted") },
    },
    async (args) => callApi({"method":"DELETE","path":"/store/order/{orderId}","params":[{"name":"orderId","in":"path"}],"hasBody":false}, args as Record<string, unknown>)
  );

server.registerTool(
    "createUser",
    {
      title: "Create user.",
      description: "Create user.. This can only be done by the logged in user.",
      inputSchema: { "body": z.object({ "id": z.number().int().optional(), "username": z.string().optional(), "firstName": z.string().optional(), "lastName": z.string().optional(), "email": z.string().optional(), "password": z.string().optional(), "phone": z.string().optional(), "userStatus": z.number().int().optional() }) },
    },
    async (args) => callApi({"method":"POST","path":"/user","params":[],"hasBody":true}, args as Record<string, unknown>)
  );

server.registerTool(
    "createUsersWithListInput",
    {
      title: "Creates list of users with given input array.",
      description: "Creates list of users with given input array.. Creates list of users with given input array.",
      inputSchema: { "body": z.array(z.object({ "id": z.number().int().optional(), "username": z.string().optional(), "firstName": z.string().optional(), "lastName": z.string().optional(), "email": z.string().optional(), "password": z.string().optional(), "phone": z.string().optional(), "userStatus": z.number().int().optional() })) },
    },
    async (args) => callApi({"method":"POST","path":"/user/createWithList","params":[],"hasBody":true}, args as Record<string, unknown>)
  );

server.registerTool(
    "loginUser",
    {
      title: "Logs user into the system.",
      description: "Logs user into the system.. Log into the system.",
      inputSchema: { "username": z.string().describe("The user name for login").optional(), "password": z.string().describe("The password for login in clear text").optional() },
    },
    async (args) => callApi({"method":"GET","path":"/user/login","params":[{"name":"username","in":"query"},{"name":"password","in":"query"}],"hasBody":false}, args as Record<string, unknown>)
  );

server.registerTool(
    "logoutUser",
    {
      title: "Logs out current logged in user session.",
      description: "Logs out current logged in user session.. Log user out of the system.",
      inputSchema: {  },
    },
    async (args) => callApi({"method":"GET","path":"/user/logout","params":[],"hasBody":false}, args as Record<string, unknown>)
  );

server.registerTool(
    "getUserByName",
    {
      title: "Get user by user name.",
      description: "Get user by user name.. Get user detail based on username.",
      inputSchema: { "username": z.string().describe("The name that needs to be fetched. Use user1 for testing") },
    },
    async (args) => callApi({"method":"GET","path":"/user/{username}","params":[{"name":"username","in":"path"}],"hasBody":false}, args as Record<string, unknown>)
  );

server.registerTool(
    "updateUser",
    {
      title: "Update user resource.",
      description: "Update user resource.. This can only be done by the logged in user.",
      inputSchema: { "username": z.string().describe("name that need to be deleted"), "body": z.object({ "id": z.number().int().optional(), "username": z.string().optional(), "firstName": z.string().optional(), "lastName": z.string().optional(), "email": z.string().optional(), "password": z.string().optional(), "phone": z.string().optional(), "userStatus": z.number().int().optional() }) },
    },
    async (args) => callApi({"method":"PUT","path":"/user/{username}","params":[{"name":"username","in":"path"}],"hasBody":true}, args as Record<string, unknown>)
  );

server.registerTool(
    "deleteUser",
    {
      title: "Delete user resource.",
      description: "Delete user resource.. This can only be done by the logged in user.",
      inputSchema: { "username": z.string().describe("The name that needs to be deleted") },
    },
    async (args) => callApi({"method":"DELETE","path":"/user/{username}","params":[{"name":"username","in":"path"}],"hasBody":false}, args as Record<string, unknown>)
  );

await server.connect(new StdioServerTransport());
