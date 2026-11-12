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
  "get_custom_actions",
  {
    title: "Get all custom actions",
    description: "Retrieves a paginated list of all custom workflow actions for a specific app. Use this when you need to explore or audit existing custom actions. Do not use this if you are looking for functions or revisions of a single action.",
    inputSchema: { "limit": z.number().int().describe("Maximum number of results per page.").optional(), "after": z.string().describe("The paging cursor token of the last successfully read resource will be returned as the `paging.next.after` JSON property of a paged response containing more results.").optional(), "archived": z.boolean().describe("Whether to include archived custom actions.").optional(), "appId": z.number().int() },
  },
  async (args) => callApi({"method":"GET","path":"/automation/v4/actions/{appId}","params":[{"name":"limit","in":"query"},{"name":"after","in":"query"},{"name":"archived","in":"query"},{"name":"appId","in":"path"}],"hasBody":false}, args as Record<string, unknown>)
);

server.registerTool(
  "create_custom_action",
  {
    title: "Create new custom action",
    description: "Creates a new custom workflow action definition for an app. Use this when the user wants to introduce a new automated action into their workflow system. Requires a valid appId and definition payload.",
    inputSchema: { "appId": z.number().int(), "body": z.object({ "actionUrl": z.string(), "archivedAt": z.number().int().optional(), "functions": z.array(z.object({ "functionSource": z.string(), "functionType": z.enum(["PRE_ACTION_EXECUTION","PRE_FETCH_OPTIONS","POST_FETCH_OPTIONS"]), "id": z.string().optional() })), "inputFieldDependencies": z.array(z.any()).optional(), "inputFields": z.array(z.object({ "isRequired": z.boolean(), "supportedValueTypes": z.array(z.enum(["STATIC_VALUE","OBJECT_PROPERTY","FIELD_DATA"])).optional(), "typeDefinition": z.object({ "fieldType": z.enum(["booleancheckbox","checkbox","date","file","number","phonenumber","radio","select","text","textarea","calculation_equation","calculation_rollup","calculation_score","calculation_read_time","unknown"]).optional(), "name": z.string(), "options": z.array(z.object({ "description": z.string(), "displayOrder": z.number().int(), "doubleData": z.number(), "hidden": z.boolean(), "label": z.string(), "readOnly": z.boolean(), "value": z.string() })), "optionsUrl": z.string().optional(), "referencedObjectType": z.enum(["CONTACT","COMPANY","DEAL","ENGAGEMENT","TICKET","OWNER","PRODUCT","LINE_ITEM","BET_DELIVERABLE_SERVICE","CONTENT","CONVERSATION","BET_ALERT","PORTAL","QUOTE","FORM_SUBMISSION_INBOUNDDB","QUOTA","UNSUBSCRIBE","COMMUNICATION","FEEDBACK_SUBMISSION","ATTRIBUTION","SALESFORCE_SYNC_ERROR","RESTORABLE_CRM_OBJECT","HUB","LANDING_PAGE","PRODUCT_OR_FOLDER","TASK","FORM","MARKETING_EMAIL","AD_ACCOUNT","AD_CAMPAIGN","AD_GROUP","AD","KEYWORD","CAMPAIGN","SOCIAL_CHANNEL","SOCIAL_POST","SITE_PAGE","BLOG_POST","IMPORT","EXPORT","CTA","TASK_TEMPLATE","AUTOMATION_PLATFORM_FLOW","OBJECT_LIST","NOTE","MEETING_EVENT","CALL","EMAIL","PUBLISHING_TASK","CONVERSATION_SESSION","CONTACT_CREATE_ATTRIBUTION","INVOICE","MARKETING_EVENT","CONVERSATION_INBOX","CHATFLOW","MEDIA_BRIDGE","SEQUENCE","SEQUENCE_STEP","FORECAST","SNIPPET","TEMPLATE","UNKNOWN"]).optional(), "type": z.enum(["string","number","bool","datetime","enumeration","date","phone_number","currency_number","json","object_coordinates"]) }) })), "labels": z.record(z.string(), z.object({ "actionCardContent": z.string().optional(), "actionDescription": z.string().optional(), "actionName": z.string(), "appDisplayName": z.string().optional(), "inputFieldDescriptions": z.record(z.string(), z.string()).optional(), "inputFieldLabels": z.record(z.string(), z.string()).optional() })), "objectRequestOptions": z.object({ "properties": z.array(z.string()) }).optional(), "objectTypes": z.array(z.string()), "published": z.boolean() }) },
  },
  async (args) => callApi({"method":"POST","path":"/automation/v4/actions/{appId}","params":[{"name":"appId","in":"path"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "get_custom_action",
  {
    title: "Get a custom action",
    description: "Retrieves the full details of a specific custom workflow action by its definitionId. Use this when inspecting configuration or metadata of a single action. Do not use this for fetching revision history.",
    inputSchema: { "definitionId": z.string().describe("The ID of the custom workflow action."), "archived": z.boolean().describe("Whether to include archived custom actions.").optional(), "appId": z.number().int() },
  },
  async (args) => callApi({"method":"GET","path":"/automation/v4/actions/{appId}/{definitionId}","params":[{"name":"definitionId","in":"path"},{"name":"archived","in":"query"},{"name":"appId","in":"path"}],"hasBody":false}, args as Record<string, unknown>)
);

server.registerTool(
  "update_custom_action",
  {
    title: "Update a custom action",
    description: "Updates an existing custom workflow action definition. Use this when modifying parameters, labels, or settings of a specific action. Requires both appId and definitionId.",
    inputSchema: { "definitionId": z.string().describe("The ID of the custom workflow action."), "appId": z.number().int(), "body": z.object({ "actionUrl": z.string().optional(), "inputFieldDependencies": z.array(z.any()).optional(), "inputFields": z.array(z.object({ "isRequired": z.boolean(), "supportedValueTypes": z.array(z.enum(["STATIC_VALUE","OBJECT_PROPERTY","FIELD_DATA"])).optional(), "typeDefinition": z.object({ "fieldType": z.enum(["booleancheckbox","checkbox","date","file","number","phonenumber","radio","select","text","textarea","calculation_equation","calculation_rollup","calculation_score","calculation_read_time","unknown"]).optional(), "name": z.string(), "options": z.array(z.object({ "description": z.string(), "displayOrder": z.number().int(), "doubleData": z.number(), "hidden": z.boolean(), "label": z.string(), "readOnly": z.boolean(), "value": z.string() })), "optionsUrl": z.string().optional(), "referencedObjectType": z.enum(["CONTACT","COMPANY","DEAL","ENGAGEMENT","TICKET","OWNER","PRODUCT","LINE_ITEM","BET_DELIVERABLE_SERVICE","CONTENT","CONVERSATION","BET_ALERT","PORTAL","QUOTE","FORM_SUBMISSION_INBOUNDDB","QUOTA","UNSUBSCRIBE","COMMUNICATION","FEEDBACK_SUBMISSION","ATTRIBUTION","SALESFORCE_SYNC_ERROR","RESTORABLE_CRM_OBJECT","HUB","LANDING_PAGE","PRODUCT_OR_FOLDER","TASK","FORM","MARKETING_EMAIL","AD_ACCOUNT","AD_CAMPAIGN","AD_GROUP","AD","KEYWORD","CAMPAIGN","SOCIAL_CHANNEL","SOCIAL_POST","SITE_PAGE","BLOG_POST","IMPORT","EXPORT","CTA","TASK_TEMPLATE","AUTOMATION_PLATFORM_FLOW","OBJECT_LIST","NOTE","MEETING_EVENT","CALL","EMAIL","PUBLISHING_TASK","CONVERSATION_SESSION","CONTACT_CREATE_ATTRIBUTION","INVOICE","MARKETING_EVENT","CONVERSATION_INBOX","CHATFLOW","MEDIA_BRIDGE","SEQUENCE","SEQUENCE_STEP","FORECAST","SNIPPET","TEMPLATE","UNKNOWN"]).optional(), "type": z.enum(["string","number","bool","datetime","enumeration","date","phone_number","currency_number","json","object_coordinates"]) }) })).optional(), "labels": z.record(z.string(), z.object({ "actionCardContent": z.string().optional(), "actionDescription": z.string().optional(), "actionName": z.string(), "appDisplayName": z.string().optional(), "inputFieldDescriptions": z.record(z.string(), z.string()).optional(), "inputFieldLabels": z.record(z.string(), z.string()).optional() })).optional(), "objectRequestOptions": z.object({ "properties": z.array(z.string()) }).optional(), "objectTypes": z.array(z.string()).optional(), "published": z.boolean().optional() }) },
  },
  async (args) => callApi({"method":"PATCH","path":"/automation/v4/actions/{appId}/{definitionId}","params":[{"name":"definitionId","in":"path"},{"name":"appId","in":"path"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "archive_custom_action",
  {
    title: "Archive a custom action",
    description: "Archives a custom workflow action, removing it from active use. Use this only when a custom action is explicitly requested for deletion or deprecation.",
    inputSchema: { "definitionId": z.string().describe("The ID of the custom workflow action."), "appId": z.number().int() },
  },
  async (args) => callApi({"method":"DELETE","path":"/automation/v4/actions/{appId}/{definitionId}","params":[{"name":"definitionId","in":"path"},{"name":"appId","in":"path"}],"hasBody":false}, args as Record<string, unknown>)
);

server.registerTool(
  "get_action_functions",
  {
    title: "Get all custom action functions",
    description: "Retrieves all custom action functions associated with a specific action definition. Use this to inspect the executable logic or serverless code tied to an action.",
    inputSchema: { "definitionId": z.string().describe("The ID of the custom workflow action."), "appId": z.number().int() },
  },
  async (args) => callApi({"method":"GET","path":"/automation/v4/actions/{appId}/{definitionId}/functions","params":[{"name":"definitionId","in":"path"},{"name":"appId","in":"path"}],"hasBody":false}, args as Record<string, unknown>)
);

server.registerTool(
  "save_action_function",
  {
    title: "Create or replace a custom action function",
    description: "Creates or replaces a custom action function by its functionType. Use this when deploying or updating the code/logic block for a workflow action.",
    inputSchema: { "definitionId": z.string().describe("The ID of the custom workflow action."), "functionType": z.enum(["PRE_ACTION_EXECUTION","PRE_FETCH_OPTIONS","POST_FETCH_OPTIONS"]).describe("The type of function. This determines when the function will be called."), "appId": z.number().int(), "body": z.string() },
  },
  async (args) => callApi({"method":"PUT","path":"/automation/v4/actions/{appId}/{definitionId}/functions/{functionType}","params":[{"name":"definitionId","in":"path"},{"name":"functionType","in":"path"},{"name":"appId","in":"path"}],"hasBody":true,"contentType":"text/plain"}, args as Record<string, unknown>)
);

server.registerTool(
  "delete_action_function",
  {
    title: "Delete a custom action function",
    description: "Deletes a specific custom action function by its functionType. Use this when removing serverless logic tied to a workflow action.",
    inputSchema: { "definitionId": z.string().describe("The ID of the custom workflow action."), "functionType": z.enum(["PRE_ACTION_EXECUTION","PRE_FETCH_OPTIONS","POST_FETCH_OPTIONS"]).describe("The type of function. This determines when the function will be called."), "appId": z.number().int() },
  },
  async (args) => callApi({"method":"DELETE","path":"/automation/v4/actions/{appId}/{definitionId}/functions/{functionType}","params":[{"name":"definitionId","in":"path"},{"name":"functionType","in":"path"},{"name":"appId","in":"path"}],"hasBody":false}, args as Record<string, unknown>)
);

server.registerTool(
  "get_action_revisions",
  {
    title: "Get all revisions for a custom action",
    description: "Retrieves a paginated list of all past revisions for a custom action definition. Use this when tracking the version history or auditing changes made to an action over time.",
    inputSchema: { "definitionId": z.string().describe("The ID of the custom workflow action"), "limit": z.number().int().describe("Maximum number of results per page.").optional(), "after": z.string().describe("The paging cursor token of the last successfully read resource will be returned as the `paging.next.after` JSON property of a paged response containing more results.").optional(), "appId": z.number().int() },
  },
  async (args) => callApi({"method":"GET","path":"/automation/v4/actions/{appId}/{definitionId}/revisions","params":[{"name":"definitionId","in":"path"},{"name":"limit","in":"query"},{"name":"after","in":"query"},{"name":"appId","in":"path"}],"hasBody":false}, args as Record<string, unknown>)
);

server.registerTool(
  "get_action_revision",
  {
    title: "Get a revision for a custom action",
    description: "Retrieves the details of a specific revision of a custom action by its revisionId. Use this when inspecting an older version of an action configuration.",
    inputSchema: { "definitionId": z.string().describe("The ID of the custom workflow action."), "revisionId": z.string().describe("The version of the custom workflow action."), "appId": z.number().int() },
  },
  async (args) => callApi({"method":"GET","path":"/automation/v4/actions/{appId}/{definitionId}/revisions/{revisionId}","params":[{"name":"definitionId","in":"path"},{"name":"revisionId","in":"path"},{"name":"appId","in":"path"}],"hasBody":false}, args as Record<string, unknown>)
);

server.registerTool(
  "complete_callback",
  {
    title: "Complete a callback",
    description: "Completes a single asynchronous workflow action callback using its callbackId. Use this when an async operation has finished and you need to resume the workflow. Provide the outcome payload in the body.",
    inputSchema: { "callbackId": z.string().describe("The ID of the target app."), "body": z.object({ "outputFields": z.record(z.string(), z.string()) }) },
  },
  async (args) => callApi({"method":"POST","path":"/automation/v4/actions/callbacks/{callbackId}/complete","params":[{"name":"callbackId","in":"path"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "complete_callback_batch",
  {
    title: "Complete a batch of callbacks",
    description: "Completes a batch of asynchronous workflow action callbacks in a single request. Use this when multiple async callbacks need to be resolved simultaneously for efficiency.",
    inputSchema: { "body": z.object({ "inputs": z.array(z.object({ "callbackId": z.string(), "outputFields": z.record(z.string(), z.string()) })) }) },
  },
  async (args) => callApi({"method":"POST","path":"/automation/v4/actions/callbacks/complete","params":[],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

await server.connect(new StdioServerTransport());
