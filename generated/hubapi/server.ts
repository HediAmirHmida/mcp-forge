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

const BASE_URL = process.env.API_BASE_URL ?? "https://api.hubapi.com/";
const server = new McpServer({ name: "custom-workflow-actions", version: "1.0.0" });

server.registerTool(
  "post-_automation_v4_actions_callbacks_complete_completeBatch",
  {
    title: "Complete a batch of callbacks",
    description: "Complete a batch of callbacks. Completes the given action callbacks.",
    inputSchema: { "body": z.object({ "inputs": z.array(z.object({ "callbackId": z.string(), "outputFields": z.record(z.string(), z.string()) })) }) },
  },
  async (args) => callApi({"method":"POST","path":"/automation/v4/actions/callbacks/complete","params":[],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "post-_automation_v4_actions_callbacks__callbackId__complete_complete",
  {
    title: "Complete a callback",
    description: "Complete a callback. Completes the given action callback.",
    inputSchema: { "callbackId": z.string().describe("The ID of the target app."), "body": z.object({ "outputFields": z.record(z.string(), z.string()) }) },
  },
  async (args) => callApi({"method":"POST","path":"/automation/v4/actions/callbacks/{callbackId}/complete","params":[{"name":"callbackId","in":"path"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "get-_automation_v4_actions__appId__getPage",
  {
    title: "Get all custom actions",
    description: "Get all custom actions. Returns a list of all custom workflow actions.",
    inputSchema: { "limit": z.number().int().describe("Maximum number of results per page.").optional(), "after": z.string().describe("The paging cursor token of the last successfully read resource will be returned as the `paging.next.after` JSON property of a paged response containing more results.").optional(), "archived": z.boolean().describe("Whether to include archived custom actions.").optional(), "appId": z.number().int() },
  },
  async (args) => callApi({"method":"GET","path":"/automation/v4/actions/{appId}","params":[{"name":"limit","in":"query"},{"name":"after","in":"query"},{"name":"archived","in":"query"},{"name":"appId","in":"path"}],"hasBody":false}, args as Record<string, unknown>)
);

server.registerTool(
  "post-_automation_v4_actions__appId__create",
  {
    title: "Create new custom action",
    description: "Create new custom action. Creates a new custom workflow action.",
    inputSchema: { "appId": z.number().int(), "body": z.object({ "actionUrl": z.string(), "archivedAt": z.number().int().optional(), "functions": z.array(z.object({ "functionSource": z.string(), "functionType": z.enum(["PRE_ACTION_EXECUTION","PRE_FETCH_OPTIONS","POST_FETCH_OPTIONS"]), "id": z.string().optional() })), "inputFieldDependencies": z.array(z.any()).optional(), "inputFields": z.array(z.object({ "isRequired": z.boolean(), "supportedValueTypes": z.array(z.enum(["STATIC_VALUE","OBJECT_PROPERTY","FIELD_DATA"])).optional(), "typeDefinition": z.object({ "fieldType": z.enum(["booleancheckbox","checkbox","date","file","number","phonenumber","radio","select","text","textarea","calculation_equation","calculation_rollup","calculation_score","calculation_read_time","unknown"]).optional(), "name": z.string(), "options": z.array(z.object({ "description": z.string(), "displayOrder": z.number().int(), "doubleData": z.number(), "hidden": z.boolean(), "label": z.string(), "readOnly": z.boolean(), "value": z.string() })), "optionsUrl": z.string().optional(), "referencedObjectType": z.enum(["CONTACT","COMPANY","DEAL","ENGAGEMENT","TICKET","OWNER","PRODUCT","LINE_ITEM","BET_DELIVERABLE_SERVICE","CONTENT","CONVERSATION","BET_ALERT","PORTAL","QUOTE","FORM_SUBMISSION_INBOUNDDB","QUOTA","UNSUBSCRIBE","COMMUNICATION","FEEDBACK_SUBMISSION","ATTRIBUTION","SALESFORCE_SYNC_ERROR","RESTORABLE_CRM_OBJECT","HUB","LANDING_PAGE","PRODUCT_OR_FOLDER","TASK","FORM","MARKETING_EMAIL","AD_ACCOUNT","AD_CAMPAIGN","AD_GROUP","AD","KEYWORD","CAMPAIGN","SOCIAL_CHANNEL","SOCIAL_POST","SITE_PAGE","BLOG_POST","IMPORT","EXPORT","CTA","TASK_TEMPLATE","AUTOMATION_PLATFORM_FLOW","OBJECT_LIST","NOTE","MEETING_EVENT","CALL","EMAIL","PUBLISHING_TASK","CONVERSATION_SESSION","CONTACT_CREATE_ATTRIBUTION","INVOICE","MARKETING_EVENT","CONVERSATION_INBOX","CHATFLOW","MEDIA_BRIDGE","SEQUENCE","SEQUENCE_STEP","FORECAST","SNIPPET","TEMPLATE","UNKNOWN"]).optional(), "type": z.enum(["string","number","bool","datetime","enumeration","date","phone_number","currency_number","json","object_coordinates"]) }) })), "labels": z.record(z.string(), z.object({ "actionCardContent": z.string().optional(), "actionDescription": z.string().optional(), "actionName": z.string(), "appDisplayName": z.string().optional(), "inputFieldDescriptions": z.record(z.string(), z.string()).optional(), "inputFieldLabels": z.record(z.string(), z.string()).optional() })), "objectRequestOptions": z.object({ "properties": z.array(z.string()) }).optional(), "objectTypes": z.array(z.string()), "published": z.boolean() }) },
  },
  async (args) => callApi({"method":"POST","path":"/automation/v4/actions/{appId}","params":[{"name":"appId","in":"path"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "get-_automation_v4_actions__appId___definitionId__getById",
  {
    title: "Get a custom action",
    description: "Get a custom action. Returns a single custom workflow action with the specified ID.",
    inputSchema: { "definitionId": z.string().describe("The ID of the custom workflow action."), "archived": z.boolean().describe("Whether to include archived custom actions.").optional(), "appId": z.number().int() },
  },
  async (args) => callApi({"method":"GET","path":"/automation/v4/actions/{appId}/{definitionId}","params":[{"name":"definitionId","in":"path"},{"name":"archived","in":"query"},{"name":"appId","in":"path"}],"hasBody":false}, args as Record<string, unknown>)
);

server.registerTool(
  "patch-_automation_v4_actions__appId___definitionId__update",
  {
    title: "Update a custom action",
    description: "Update a custom action. Updates a custom workflow action with new values for the specified fields.",
    inputSchema: { "definitionId": z.string().describe("The ID of the custom workflow action."), "appId": z.number().int(), "body": z.object({ "actionUrl": z.string().optional(), "inputFieldDependencies": z.array(z.any()).optional(), "inputFields": z.array(z.object({ "isRequired": z.boolean(), "supportedValueTypes": z.array(z.enum(["STATIC_VALUE","OBJECT_PROPERTY","FIELD_DATA"])).optional(), "typeDefinition": z.object({ "fieldType": z.enum(["booleancheckbox","checkbox","date","file","number","phonenumber","radio","select","text","textarea","calculation_equation","calculation_rollup","calculation_score","calculation_read_time","unknown"]).optional(), "name": z.string(), "options": z.array(z.object({ "description": z.string(), "displayOrder": z.number().int(), "doubleData": z.number(), "hidden": z.boolean(), "label": z.string(), "readOnly": z.boolean(), "value": z.string() })), "optionsUrl": z.string().optional(), "referencedObjectType": z.enum(["CONTACT","COMPANY","DEAL","ENGAGEMENT","TICKET","OWNER","PRODUCT","LINE_ITEM","BET_DELIVERABLE_SERVICE","CONTENT","CONVERSATION","BET_ALERT","PORTAL","QUOTE","FORM_SUBMISSION_INBOUNDDB","QUOTA","UNSUBSCRIBE","COMMUNICATION","FEEDBACK_SUBMISSION","ATTRIBUTION","SALESFORCE_SYNC_ERROR","RESTORABLE_CRM_OBJECT","HUB","LANDING_PAGE","PRODUCT_OR_FOLDER","TASK","FORM","MARKETING_EMAIL","AD_ACCOUNT","AD_CAMPAIGN","AD_GROUP","AD","KEYWORD","CAMPAIGN","SOCIAL_CHANNEL","SOCIAL_POST","SITE_PAGE","BLOG_POST","IMPORT","EXPORT","CTA","TASK_TEMPLATE","AUTOMATION_PLATFORM_FLOW","OBJECT_LIST","NOTE","MEETING_EVENT","CALL","EMAIL","PUBLISHING_TASK","CONVERSATION_SESSION","CONTACT_CREATE_ATTRIBUTION","INVOICE","MARKETING_EVENT","CONVERSATION_INBOX","CHATFLOW","MEDIA_BRIDGE","SEQUENCE","SEQUENCE_STEP","FORECAST","SNIPPET","TEMPLATE","UNKNOWN"]).optional(), "type": z.enum(["string","number","bool","datetime","enumeration","date","phone_number","currency_number","json","object_coordinates"]) }) })).optional(), "labels": z.record(z.string(), z.object({ "actionCardContent": z.string().optional(), "actionDescription": z.string().optional(), "actionName": z.string(), "appDisplayName": z.string().optional(), "inputFieldDescriptions": z.record(z.string(), z.string()).optional(), "inputFieldLabels": z.record(z.string(), z.string()).optional() })).optional(), "objectRequestOptions": z.object({ "properties": z.array(z.string()) }).optional(), "objectTypes": z.array(z.string()).optional(), "published": z.boolean().optional() }) },
  },
  async (args) => callApi({"method":"PATCH","path":"/automation/v4/actions/{appId}/{definitionId}","params":[{"name":"definitionId","in":"path"},{"name":"appId","in":"path"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "delete-_automation_v4_actions__appId___definitionId__archive",
  {
    title: "Archive a custom action",
    description: "Archive a custom action. Archives a single custom workflow action with the specified ID. Workflows that currently use this custom action will stop attempting to execute the action, and all future executions will be marked as a failure.",
    inputSchema: { "definitionId": z.string().describe("The ID of the custom workflow action."), "appId": z.number().int() },
  },
  async (args) => callApi({"method":"DELETE","path":"/automation/v4/actions/{appId}/{definitionId}","params":[{"name":"definitionId","in":"path"},{"name":"appId","in":"path"}],"hasBody":false}, args as Record<string, unknown>)
);

server.registerTool(
  "get-_automation_v4_actions__appId___definitionId__functions_getPage",
  {
    title: "Get all custom action functions",
    description: "Get all custom action functions. Returns a list of all functions that are associated with the given custom workflow action.",
    inputSchema: { "definitionId": z.string().describe("The ID of the custom workflow action."), "appId": z.number().int() },
  },
  async (args) => callApi({"method":"GET","path":"/automation/v4/actions/{appId}/{definitionId}/functions","params":[{"name":"definitionId","in":"path"},{"name":"appId","in":"path"}],"hasBody":false}, args as Record<string, unknown>)
);

server.registerTool(
  "get-_automation_v4_actions__appId___definitionId__functions__functionType__getByFunctionType",
  {
    title: "Get a custom action function",
    description: "Get a custom action function. Returns the given function for a custom workflow action.",
    inputSchema: { "definitionId": z.string().describe("The ID of the custom workflow action."), "functionType": z.enum(["PRE_ACTION_EXECUTION","PRE_FETCH_OPTIONS","POST_FETCH_OPTIONS"]).describe("The type of function. This determines when the function will be called."), "appId": z.number().int() },
  },
  async (args) => callApi({"method":"GET","path":"/automation/v4/actions/{appId}/{definitionId}/functions/{functionType}","params":[{"name":"definitionId","in":"path"},{"name":"functionType","in":"path"},{"name":"appId","in":"path"}],"hasBody":false}, args as Record<string, unknown>)
);

server.registerTool(
  "put-_automation_v4_actions__appId___definitionId__functions__functionType__createOrReplaceByFunctionType",
  {
    title: "Create or replace a custom action function",
    description: "Create or replace a custom action function. Creates or replaces a function for a custom workflow action.",
    inputSchema: { "definitionId": z.string().describe("The ID of the custom workflow action."), "functionType": z.enum(["PRE_ACTION_EXECUTION","PRE_FETCH_OPTIONS","POST_FETCH_OPTIONS"]).describe("The type of function. This determines when the function will be called."), "appId": z.number().int(), "body": z.string() },
  },
  async (args) => callApi({"method":"PUT","path":"/automation/v4/actions/{appId}/{definitionId}/functions/{functionType}","params":[{"name":"definitionId","in":"path"},{"name":"functionType","in":"path"},{"name":"appId","in":"path"}],"hasBody":true,"contentType":"text/plain"}, args as Record<string, unknown>)
);

server.registerTool(
  "delete-_automation_v4_actions__appId___definitionId__functions__functionType__archiveByFunctionType",
  {
    title: "Delete a custom action function",
    description: "Delete a custom action function. Delete a function for a custom workflow action. This will remove the function itself as well as removing the association between the function and the custom action. This can't be undone.",
    inputSchema: { "definitionId": z.string().describe("The ID of the custom workflow action."), "functionType": z.enum(["PRE_ACTION_EXECUTION","PRE_FETCH_OPTIONS","POST_FETCH_OPTIONS"]).describe("The type of function. This determines when the function will be called."), "appId": z.number().int() },
  },
  async (args) => callApi({"method":"DELETE","path":"/automation/v4/actions/{appId}/{definitionId}/functions/{functionType}","params":[{"name":"definitionId","in":"path"},{"name":"functionType","in":"path"},{"name":"appId","in":"path"}],"hasBody":false}, args as Record<string, unknown>)
);

server.registerTool(
  "get-_automation_v4_actions__appId___definitionId__functions__functionType___functionId__getById",
  {
    title: "Get a custom action function",
    description: "Get a custom action function. Returns the given function for a custom workflow action.",
    inputSchema: { "definitionId": z.string().describe("The ID of the custom workflow action."), "functionType": z.enum(["PRE_ACTION_EXECUTION","PRE_FETCH_OPTIONS","POST_FETCH_OPTIONS"]).describe("The type of function. This determines when the function will be called."), "functionId": z.string().describe("The ID qualifier for the function. This is used to specify which input field a function is associated with for `PRE_FETCH_OPTIONS` and `POST_FETCH_OPTIONS` function types."), "appId": z.number().int() },
  },
  async (args) => callApi({"method":"GET","path":"/automation/v4/actions/{appId}/{definitionId}/functions/{functionType}/{functionId}","params":[{"name":"definitionId","in":"path"},{"name":"functionType","in":"path"},{"name":"functionId","in":"path"},{"name":"appId","in":"path"}],"hasBody":false}, args as Record<string, unknown>)
);

server.registerTool(
  "put-_automation_v4_actions__appId___definitionId__functions__functionType___functionId__createOrReplace",
  {
    title: "Create or replace a custom action function",
    description: "Create or replace a custom action function. Creates or replaces a function for a custom workflow action.",
    inputSchema: { "definitionId": z.string().describe("The ID of the custom workflow action."), "functionType": z.enum(["PRE_ACTION_EXECUTION","PRE_FETCH_OPTIONS","POST_FETCH_OPTIONS"]).describe("The type of function. This determines when the function will be called."), "functionId": z.string().describe("The ID qualifier for the function. This is used to specify which input field a function is associated with for `PRE_FETCH_OPTIONS` and `POST_FETCH_OPTIONS` function types."), "appId": z.number().int(), "body": z.string() },
  },
  async (args) => callApi({"method":"PUT","path":"/automation/v4/actions/{appId}/{definitionId}/functions/{functionType}/{functionId}","params":[{"name":"definitionId","in":"path"},{"name":"functionType","in":"path"},{"name":"functionId","in":"path"},{"name":"appId","in":"path"}],"hasBody":true,"contentType":"text/plain"}, args as Record<string, unknown>)
);

server.registerTool(
  "delete-_automation_v4_actions__appId___definitionId__functions__functionType___functionId__archive",
  {
    title: "Delete a custom action function",
    description: "Delete a custom action function. Delete a function for a custom workflow action. This will remove the function itself as well as removing the association between the function and the custom action. This can't be undone.",
    inputSchema: { "definitionId": z.string().describe("The ID of the custom workflow action"), "functionType": z.enum(["PRE_ACTION_EXECUTION","PRE_FETCH_OPTIONS","POST_FETCH_OPTIONS"]).describe("The type of function. This determines when the function will be called."), "functionId": z.string().describe("The ID qualifier for the function. This is used to specify which input field a function is associated with for `PRE_FETCH_OPTIONS` and `POST_FETCH_OPTIONS` function types."), "appId": z.number().int() },
  },
  async (args) => callApi({"method":"DELETE","path":"/automation/v4/actions/{appId}/{definitionId}/functions/{functionType}/{functionId}","params":[{"name":"definitionId","in":"path"},{"name":"functionType","in":"path"},{"name":"functionId","in":"path"},{"name":"appId","in":"path"}],"hasBody":false}, args as Record<string, unknown>)
);

server.registerTool(
  "get-_automation_v4_actions__appId___definitionId__revisions_getPage",
  {
    title: "Get all revisions for a custom action",
    description: "Get all revisions for a custom action. Returns a list of revisions for a custom workflow action.",
    inputSchema: { "definitionId": z.string().describe("The ID of the custom workflow action"), "limit": z.number().int().describe("Maximum number of results per page.").optional(), "after": z.string().describe("The paging cursor token of the last successfully read resource will be returned as the `paging.next.after` JSON property of a paged response containing more results.").optional(), "appId": z.number().int() },
  },
  async (args) => callApi({"method":"GET","path":"/automation/v4/actions/{appId}/{definitionId}/revisions","params":[{"name":"definitionId","in":"path"},{"name":"limit","in":"query"},{"name":"after","in":"query"},{"name":"appId","in":"path"}],"hasBody":false}, args as Record<string, unknown>)
);

server.registerTool(
  "get-_automation_v4_actions__appId___definitionId__revisions__revisionId__getById",
  {
    title: "Get a revision for a custom action",
    description: "Get a revision for a custom action. Returns the given version of a custom workflow action.",
    inputSchema: { "definitionId": z.string().describe("The ID of the custom workflow action."), "revisionId": z.string().describe("The version of the custom workflow action."), "appId": z.number().int() },
  },
  async (args) => callApi({"method":"GET","path":"/automation/v4/actions/{appId}/{definitionId}/revisions/{revisionId}","params":[{"name":"definitionId","in":"path"},{"name":"revisionId","in":"path"},{"name":"appId","in":"path"}],"hasBody":false}, args as Record<string, unknown>)
);

await server.connect(new StdioServerTransport());
