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

const BASE_URL = process.env.API_BASE_URL ?? "https://tpu.googleapis.com/";
const server = new McpServer({ name: "cloud-tpu-api", version: "1.0.0" });

server.registerTool(
  "list_nodes",
  {
    title: "tpu.projects.locations.nodes.list",
    description: "Lists all TPU nodes in a given project and location. Use this tool when you need to inspect existing TPU resources and check their states.",
    inputSchema: { "$.xgafv": z.enum(["1","2"]).describe("V1 error format.").optional(), "access_token": z.string().describe("OAuth access token.").optional(), "alt": z.enum(["json","media","proto"]).describe("Data format for response.").optional(), "callback": z.string().describe("JSONP").optional(), "fields": z.string().describe("Selector specifying which fields to include in a partial response.").optional(), "key": z.string().describe("API key. Your API key identifies your project and provides you with API access, quota, and reports. Required unless you provide an OAuth 2.0 token.").optional(), "oauth_token": z.string().describe("OAuth 2.0 token for the current user.").optional(), "prettyPrint": z.boolean().describe("Returns response with indentations and line breaks.").optional(), "quotaUser": z.string().describe("Available to use for quota purposes for server-side applications. Can be any arbitrary string assigned to a user, but should not exceed 40 characters.").optional(), "upload_protocol": z.string().describe("Upload protocol for media (e.g. \"raw\", \"multipart\").").optional(), "uploadType": z.string().describe("Legacy upload protocol for media (e.g. \"media\", \"multipart\").").optional(), "parent": z.string().describe("Required. The parent resource name."), "pageSize": z.number().int().describe("The maximum number of items to return.").optional(), "pageToken": z.string().describe("The next_page_token value returned from a previous List request, if any.").optional() },
  },
  async (args) => callApi({"method":"GET","path":"/v2/{parent}/nodes","params":[{"name":"$.xgafv","in":"query"},{"name":"access_token","in":"query"},{"name":"alt","in":"query"},{"name":"callback","in":"query"},{"name":"fields","in":"query"},{"name":"key","in":"query"},{"name":"oauth_token","in":"query"},{"name":"prettyPrint","in":"query"},{"name":"quotaUser","in":"query"},{"name":"upload_protocol","in":"query"},{"name":"uploadType","in":"query"},{"name":"parent","in":"path"},{"name":"pageSize","in":"query"},{"name":"pageToken","in":"query"}],"hasBody":false}, args as Record<string, unknown>)
);

server.registerTool(
  "create_node",
  {
    title: "tpu.projects.locations.nodes.create",
    description: "Creates a new TPU node with specified configurations. Use this tool when the user wants to provision a new TPU resource.",
    inputSchema: { "$.xgafv": z.enum(["1","2"]).describe("V1 error format.").optional(), "access_token": z.string().describe("OAuth access token.").optional(), "alt": z.enum(["json","media","proto"]).describe("Data format for response.").optional(), "callback": z.string().describe("JSONP").optional(), "fields": z.string().describe("Selector specifying which fields to include in a partial response.").optional(), "key": z.string().describe("API key. Your API key identifies your project and provides you with API access, quota, and reports. Required unless you provide an OAuth 2.0 token.").optional(), "oauth_token": z.string().describe("OAuth 2.0 token for the current user.").optional(), "prettyPrint": z.boolean().describe("Returns response with indentations and line breaks.").optional(), "quotaUser": z.string().describe("Available to use for quota purposes for server-side applications. Can be any arbitrary string assigned to a user, but should not exceed 40 characters.").optional(), "upload_protocol": z.string().describe("Upload protocol for media (e.g. \"raw\", \"multipart\").").optional(), "uploadType": z.string().describe("Legacy upload protocol for media (e.g. \"media\", \"multipart\").").optional(), "parent": z.string().describe("Required. The parent resource name."), "nodeId": z.string().describe("The unqualified resource name.").optional(), "body": z.object({ "acceleratorConfig": z.object({ "topology": z.string().optional(), "type": z.enum(["TYPE_UNSPECIFIED","V2","V3","V4"]).optional() }).optional(), "acceleratorType": z.string().optional(), "apiVersion": z.enum(["API_VERSION_UNSPECIFIED","V1_ALPHA1","V1","V2_ALPHA1","V2"]).optional(), "cidrBlock": z.string().optional(), "createTime": z.string().optional(), "dataDisks": z.array(z.object({ "mode": z.enum(["DISK_MODE_UNSPECIFIED","READ_WRITE","READ_ONLY"]).optional(), "sourceDisk": z.string().optional() })).optional(), "description": z.string().optional(), "health": z.enum(["HEALTH_UNSPECIFIED","HEALTHY","TIMEOUT","UNHEALTHY_TENSORFLOW","UNHEALTHY_MAINTENANCE"]).optional(), "healthDescription": z.string().optional(), "id": z.string().optional(), "labels": z.record(z.string(), z.string()).optional(), "metadata": z.record(z.string(), z.string()).optional(), "name": z.string().optional(), "networkConfig": z.object({ "canIpForward": z.boolean().optional(), "enableExternalIps": z.boolean().optional(), "network": z.string().optional(), "subnetwork": z.string().optional() }).optional(), "networkEndpoints": z.array(z.object({ "accessConfig": z.object({ "externalIp": z.string().optional() }).optional(), "ipAddress": z.string().optional(), "port": z.number().int().optional() })).optional(), "runtimeVersion": z.string().optional(), "schedulingConfig": z.object({ "preemptible": z.boolean().optional(), "reserved": z.boolean().optional() }).optional(), "serviceAccount": z.object({ "email": z.string().optional(), "scope": z.array(z.string()).optional() }).optional(), "shieldedInstanceConfig": z.object({ "enableSecureBoot": z.boolean().optional() }).optional(), "state": z.enum(["STATE_UNSPECIFIED","CREATING","READY","RESTARTING","REIMAGING","DELETING","REPAIRING","STOPPED","STOPPING","STARTING","PREEMPTED","TERMINATED","HIDING","HIDDEN","UNHIDING"]).optional(), "symptoms": z.array(z.object({ "createTime": z.string().optional(), "details": z.string().optional(), "symptomType": z.enum(["SYMPTOM_TYPE_UNSPECIFIED","LOW_MEMORY","OUT_OF_MEMORY","EXECUTE_TIMED_OUT","MESH_BUILD_FAIL","HBM_OUT_OF_MEMORY","PROJECT_ABUSE"]).optional(), "workerId": z.string().optional() })).optional(), "tags": z.array(z.string()).optional() }) },
  },
  async (args) => callApi({"method":"POST","path":"/v2/{parent}/nodes","params":[{"name":"$.xgafv","in":"query"},{"name":"access_token","in":"query"},{"name":"alt","in":"query"},{"name":"callback","in":"query"},{"name":"fields","in":"query"},{"name":"key","in":"query"},{"name":"oauth_token","in":"query"},{"name":"prettyPrint","in":"query"},{"name":"quotaUser","in":"query"},{"name":"upload_protocol","in":"query"},{"name":"uploadType","in":"query"},{"name":"parent","in":"path"},{"name":"nodeId","in":"query"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "update_node",
  {
    title: "tpu.projects.locations.nodes.patch",
    description: "Updates the configurations of an existing TPU node using an update mask. Use this tool when modifying node parameters like metadata or tags.",
    inputSchema: { "$.xgafv": z.enum(["1","2"]).describe("V1 error format.").optional(), "access_token": z.string().describe("OAuth access token.").optional(), "alt": z.enum(["json","media","proto"]).describe("Data format for response.").optional(), "callback": z.string().describe("JSONP").optional(), "fields": z.string().describe("Selector specifying which fields to include in a partial response.").optional(), "key": z.string().describe("API key. Your API key identifies your project and provides you with API access, quota, and reports. Required unless you provide an OAuth 2.0 token.").optional(), "oauth_token": z.string().describe("OAuth 2.0 token for the current user.").optional(), "prettyPrint": z.boolean().describe("Returns response with indentations and line breaks.").optional(), "quotaUser": z.string().describe("Available to use for quota purposes for server-side applications. Can be any arbitrary string assigned to a user, but should not exceed 40 characters.").optional(), "upload_protocol": z.string().describe("Upload protocol for media (e.g. \"raw\", \"multipart\").").optional(), "uploadType": z.string().describe("Legacy upload protocol for media (e.g. \"media\", \"multipart\").").optional(), "name": z.string().describe("Output only. Immutable. The name of the TPU."), "updateMask": z.string().describe("Required. Mask of fields from Node to update. Supported fields: [description, tags, labels, metadata, network_config.enable_external_ips].").optional(), "body": z.object({ "acceleratorConfig": z.object({ "topology": z.string().optional(), "type": z.enum(["TYPE_UNSPECIFIED","V2","V3","V4"]).optional() }).optional(), "acceleratorType": z.string().optional(), "apiVersion": z.enum(["API_VERSION_UNSPECIFIED","V1_ALPHA1","V1","V2_ALPHA1","V2"]).optional(), "cidrBlock": z.string().optional(), "createTime": z.string().optional(), "dataDisks": z.array(z.object({ "mode": z.enum(["DISK_MODE_UNSPECIFIED","READ_WRITE","READ_ONLY"]).optional(), "sourceDisk": z.string().optional() })).optional(), "description": z.string().optional(), "health": z.enum(["HEALTH_UNSPECIFIED","HEALTHY","TIMEOUT","UNHEALTHY_TENSORFLOW","UNHEALTHY_MAINTENANCE"]).optional(), "healthDescription": z.string().optional(), "id": z.string().optional(), "labels": z.record(z.string(), z.string()).optional(), "metadata": z.record(z.string(), z.string()).optional(), "name": z.string().optional(), "networkConfig": z.object({ "canIpForward": z.boolean().optional(), "enableExternalIps": z.boolean().optional(), "network": z.string().optional(), "subnetwork": z.string().optional() }).optional(), "networkEndpoints": z.array(z.object({ "accessConfig": z.object({ "externalIp": z.string().optional() }).optional(), "ipAddress": z.string().optional(), "port": z.number().int().optional() })).optional(), "runtimeVersion": z.string().optional(), "schedulingConfig": z.object({ "preemptible": z.boolean().optional(), "reserved": z.boolean().optional() }).optional(), "serviceAccount": z.object({ "email": z.string().optional(), "scope": z.array(z.string()).optional() }).optional(), "shieldedInstanceConfig": z.object({ "enableSecureBoot": z.boolean().optional() }).optional(), "state": z.enum(["STATE_UNSPECIFIED","CREATING","READY","RESTARTING","REIMAGING","DELETING","REPAIRING","STOPPED","STOPPING","STARTING","PREEMPTED","TERMINATED","HIDING","HIDDEN","UNHIDING"]).optional(), "symptoms": z.array(z.object({ "createTime": z.string().optional(), "details": z.string().optional(), "symptomType": z.enum(["SYMPTOM_TYPE_UNSPECIFIED","LOW_MEMORY","OUT_OF_MEMORY","EXECUTE_TIMED_OUT","MESH_BUILD_FAIL","HBM_OUT_OF_MEMORY","PROJECT_ABUSE"]).optional(), "workerId": z.string().optional() })).optional(), "tags": z.array(z.string()).optional() }) },
  },
  async (args) => callApi({"method":"PATCH","path":"/v2/{name}","params":[{"name":"$.xgafv","in":"query"},{"name":"access_token","in":"query"},{"name":"alt","in":"query"},{"name":"callback","in":"query"},{"name":"fields","in":"query"},{"name":"key","in":"query"},{"name":"oauth_token","in":"query"},{"name":"prettyPrint","in":"query"},{"name":"quotaUser","in":"query"},{"name":"upload_protocol","in":"query"},{"name":"uploadType","in":"query"},{"name":"name","in":"path"},{"name":"updateMask","in":"query"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "start_node",
  {
    title: "tpu.projects.locations.nodes.start",
    description: "Starts a specified TPU node. Use this tool when a stopped node needs to be powered on and made operational.",
    inputSchema: { "$.xgafv": z.enum(["1","2"]).describe("V1 error format.").optional(), "access_token": z.string().describe("OAuth access token.").optional(), "alt": z.enum(["json","media","proto"]).describe("Data format for response.").optional(), "callback": z.string().describe("JSONP").optional(), "fields": z.string().describe("Selector specifying which fields to include in a partial response.").optional(), "key": z.string().describe("API key. Your API key identifies your project and provides you with API access, quota, and reports. Required unless you provide an OAuth 2.0 token.").optional(), "oauth_token": z.string().describe("OAuth 2.0 token for the current user.").optional(), "prettyPrint": z.boolean().describe("Returns response with indentations and line breaks.").optional(), "quotaUser": z.string().describe("Available to use for quota purposes for server-side applications. Can be any arbitrary string assigned to a user, but should not exceed 40 characters.").optional(), "upload_protocol": z.string().describe("Upload protocol for media (e.g. \"raw\", \"multipart\").").optional(), "uploadType": z.string().describe("Legacy upload protocol for media (e.g. \"media\", \"multipart\").").optional(), "name": z.string().describe("Required. The resource name."), "body": z.object({  }) },
  },
  async (args) => callApi({"method":"POST","path":"/v2/{name}:start","params":[{"name":"$.xgafv","in":"query"},{"name":"access_token","in":"query"},{"name":"alt","in":"query"},{"name":"callback","in":"query"},{"name":"fields","in":"query"},{"name":"key","in":"query"},{"name":"oauth_token","in":"query"},{"name":"prettyPrint","in":"query"},{"name":"quotaUser","in":"query"},{"name":"upload_protocol","in":"query"},{"name":"uploadType","in":"query"},{"name":"name","in":"path"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "stop_node",
  {
    title: "tpu.projects.locations.nodes.stop",
    description: "Stops a specified single TPU node. Use this tool to power off a node, but note it is only available for single TPU nodes.",
    inputSchema: { "$.xgafv": z.enum(["1","2"]).describe("V1 error format.").optional(), "access_token": z.string().describe("OAuth access token.").optional(), "alt": z.enum(["json","media","proto"]).describe("Data format for response.").optional(), "callback": z.string().describe("JSONP").optional(), "fields": z.string().describe("Selector specifying which fields to include in a partial response.").optional(), "key": z.string().describe("API key. Your API key identifies your project and provides you with API access, quota, and reports. Required unless you provide an OAuth 2.0 token.").optional(), "oauth_token": z.string().describe("OAuth 2.0 token for the current user.").optional(), "prettyPrint": z.boolean().describe("Returns response with indentations and line breaks.").optional(), "quotaUser": z.string().describe("Available to use for quota purposes for server-side applications. Can be any arbitrary string assigned to a user, but should not exceed 40 characters.").optional(), "upload_protocol": z.string().describe("Upload protocol for media (e.g. \"raw\", \"multipart\").").optional(), "uploadType": z.string().describe("Legacy upload protocol for media (e.g. \"media\", \"multipart\").").optional(), "name": z.string().describe("Required. The resource name."), "body": z.object({  }) },
  },
  async (args) => callApi({"method":"POST","path":"/v2/{name}:stop","params":[{"name":"$.xgafv","in":"query"},{"name":"access_token","in":"query"},{"name":"alt","in":"query"},{"name":"callback","in":"query"},{"name":"fields","in":"query"},{"name":"key","in":"query"},{"name":"oauth_token","in":"query"},{"name":"prettyPrint","in":"query"},{"name":"quotaUser","in":"query"},{"name":"upload_protocol","in":"query"},{"name":"uploadType","in":"query"},{"name":"name","in":"path"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "get_guest_attributes",
  {
    title: "tpu.projects.locations.nodes.getGuestAttributes",
    description: "Retrieves guest attributes for a TPU node. Use this tool to inspect metadata and diagnostic information from inside the guest OS.",
    inputSchema: { "$.xgafv": z.enum(["1","2"]).describe("V1 error format.").optional(), "access_token": z.string().describe("OAuth access token.").optional(), "alt": z.enum(["json","media","proto"]).describe("Data format for response.").optional(), "callback": z.string().describe("JSONP").optional(), "fields": z.string().describe("Selector specifying which fields to include in a partial response.").optional(), "key": z.string().describe("API key. Your API key identifies your project and provides you with API access, quota, and reports. Required unless you provide an OAuth 2.0 token.").optional(), "oauth_token": z.string().describe("OAuth 2.0 token for the current user.").optional(), "prettyPrint": z.boolean().describe("Returns response with indentations and line breaks.").optional(), "quotaUser": z.string().describe("Available to use for quota purposes for server-side applications. Can be any arbitrary string assigned to a user, but should not exceed 40 characters.").optional(), "upload_protocol": z.string().describe("Upload protocol for media (e.g. \"raw\", \"multipart\").").optional(), "uploadType": z.string().describe("Legacy upload protocol for media (e.g. \"media\", \"multipart\").").optional(), "name": z.string().describe("Required. The resource name."), "body": z.object({ "queryPath": z.string().optional(), "workerIds": z.array(z.string()).optional() }) },
  },
  async (args) => callApi({"method":"POST","path":"/v2/{name}:getGuestAttributes","params":[{"name":"$.xgafv","in":"query"},{"name":"access_token","in":"query"},{"name":"alt","in":"query"},{"name":"callback","in":"query"},{"name":"fields","in":"query"},{"name":"key","in":"query"},{"name":"oauth_token","in":"query"},{"name":"prettyPrint","in":"query"},{"name":"quotaUser","in":"query"},{"name":"upload_protocol","in":"query"},{"name":"uploadType","in":"query"},{"name":"name","in":"path"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "list_accelerator_types",
  {
    title: "tpu.projects.locations.acceleratorTypes.list",
    description: "Lists accelerator types supported by the API in a given location. Use this tool to see what TPU hardware variations are available for provisioning.",
    inputSchema: { "$.xgafv": z.enum(["1","2"]).describe("V1 error format.").optional(), "access_token": z.string().describe("OAuth access token.").optional(), "alt": z.enum(["json","media","proto"]).describe("Data format for response.").optional(), "callback": z.string().describe("JSONP").optional(), "fields": z.string().describe("Selector specifying which fields to include in a partial response.").optional(), "key": z.string().describe("API key. Your API key identifies your project and provides you with API access, quota, and reports. Required unless you provide an OAuth 2.0 token.").optional(), "oauth_token": z.string().describe("OAuth 2.0 token for the current user.").optional(), "prettyPrint": z.boolean().describe("Returns response with indentations and line breaks.").optional(), "quotaUser": z.string().describe("Available to use for quota purposes for server-side applications. Can be any arbitrary string assigned to a user, but should not exceed 40 characters.").optional(), "upload_protocol": z.string().describe("Upload protocol for media (e.g. \"raw\", \"multipart\").").optional(), "uploadType": z.string().describe("Legacy upload protocol for media (e.g. \"media\", \"multipart\").").optional(), "parent": z.string().describe("Required. The parent resource name."), "filter": z.string().describe("List filter.").optional(), "orderBy": z.string().describe("Sort results.").optional(), "pageSize": z.number().int().describe("The maximum number of items to return.").optional(), "pageToken": z.string().describe("The next_page_token value returned from a previous List request, if any.").optional() },
  },
  async (args) => callApi({"method":"GET","path":"/v2/{parent}/acceleratorTypes","params":[{"name":"$.xgafv","in":"query"},{"name":"access_token","in":"query"},{"name":"alt","in":"query"},{"name":"callback","in":"query"},{"name":"fields","in":"query"},{"name":"key","in":"query"},{"name":"oauth_token","in":"query"},{"name":"prettyPrint","in":"query"},{"name":"quotaUser","in":"query"},{"name":"upload_protocol","in":"query"},{"name":"uploadType","in":"query"},{"name":"parent","in":"path"},{"name":"filter","in":"query"},{"name":"orderBy","in":"query"},{"name":"pageSize","in":"query"},{"name":"pageToken","in":"query"}],"hasBody":false}, args as Record<string, unknown>)
);

server.registerTool(
  "list_runtime_versions",
  {
    title: "tpu.projects.locations.runtimeVersions.list",
    description: "Lists runtime versions supported by the API. Use this tool when you need to check available software environments for TPU nodes.",
    inputSchema: { "$.xgafv": z.enum(["1","2"]).describe("V1 error format.").optional(), "access_token": z.string().describe("OAuth access token.").optional(), "alt": z.enum(["json","media","proto"]).describe("Data format for response.").optional(), "callback": z.string().describe("JSONP").optional(), "fields": z.string().describe("Selector specifying which fields to include in a partial response.").optional(), "key": z.string().describe("API key. Your API key identifies your project and provides you with API access, quota, and reports. Required unless you provide an OAuth 2.0 token.").optional(), "oauth_token": z.string().describe("OAuth 2.0 token for the current user.").optional(), "prettyPrint": z.boolean().describe("Returns response with indentations and line breaks.").optional(), "quotaUser": z.string().describe("Available to use for quota purposes for server-side applications. Can be any arbitrary string assigned to a user, but should not exceed 40 characters.").optional(), "upload_protocol": z.string().describe("Upload protocol for media (e.g. \"raw\", \"multipart\").").optional(), "uploadType": z.string().describe("Legacy upload protocol for media (e.g. \"media\", \"multipart\").").optional(), "parent": z.string().describe("Required. The parent resource name."), "filter": z.string().describe("List filter.").optional(), "orderBy": z.string().describe("Sort results.").optional(), "pageSize": z.number().int().describe("The maximum number of items to return.").optional(), "pageToken": z.string().describe("The next_page_token value returned from a previous List request, if any.").optional() },
  },
  async (args) => callApi({"method":"GET","path":"/v2/{parent}/runtimeVersions","params":[{"name":"$.xgafv","in":"query"},{"name":"access_token","in":"query"},{"name":"alt","in":"query"},{"name":"callback","in":"query"},{"name":"fields","in":"query"},{"name":"key","in":"query"},{"name":"oauth_token","in":"query"},{"name":"prettyPrint","in":"query"},{"name":"quotaUser","in":"query"},{"name":"upload_protocol","in":"query"},{"name":"uploadType","in":"query"},{"name":"parent","in":"path"},{"name":"filter","in":"query"},{"name":"orderBy","in":"query"},{"name":"pageSize","in":"query"},{"name":"pageToken","in":"query"}],"hasBody":false}, args as Record<string, unknown>)
);

server.registerTool(
  "get_runtime_version",
  {
    title: "tpu.projects.locations.runtimeVersions.get",
    description: "Gets details for a specific runtime version. Use this tool when you need detailed information about a particular TPU software version.",
    inputSchema: { "$.xgafv": z.enum(["1","2"]).describe("V1 error format.").optional(), "access_token": z.string().describe("OAuth access token.").optional(), "alt": z.enum(["json","media","proto"]).describe("Data format for response.").optional(), "callback": z.string().describe("JSONP").optional(), "fields": z.string().describe("Selector specifying which fields to include in a partial response.").optional(), "key": z.string().describe("API key. Your API key identifies your project and provides you with API access, quota, and reports. Required unless you provide an OAuth 2.0 token.").optional(), "oauth_token": z.string().describe("OAuth 2.0 token for the current user.").optional(), "prettyPrint": z.boolean().describe("Returns response with indentations and line breaks.").optional(), "quotaUser": z.string().describe("Available to use for quota purposes for server-side applications. Can be any arbitrary string assigned to a user, but should not exceed 40 characters.").optional(), "upload_protocol": z.string().describe("Upload protocol for media (e.g. \"raw\", \"multipart\").").optional(), "uploadType": z.string().describe("Legacy upload protocol for media (e.g. \"media\", \"multipart\").").optional(), "name": z.string().describe("Required. The resource name.") },
  },
  async (args) => callApi({"method":"GET","path":"/v2/{name}","params":[{"name":"$.xgafv","in":"query"},{"name":"access_token","in":"query"},{"name":"alt","in":"query"},{"name":"callback","in":"query"},{"name":"fields","in":"query"},{"name":"key","in":"query"},{"name":"oauth_token","in":"query"},{"name":"prettyPrint","in":"query"},{"name":"quotaUser","in":"query"},{"name":"upload_protocol","in":"query"},{"name":"uploadType","in":"query"},{"name":"name","in":"path"}],"hasBody":false}, args as Record<string, unknown>)
);

server.registerTool(
  "list_operations",
  {
    title: "tpu.projects.locations.operations.list",
    description: "Lists long-running operations matching a filter. Use this tool to monitor the progress of asynchronous tasks like node creation or deletion.",
    inputSchema: { "$.xgafv": z.enum(["1","2"]).describe("V1 error format.").optional(), "access_token": z.string().describe("OAuth access token.").optional(), "alt": z.enum(["json","media","proto"]).describe("Data format for response.").optional(), "callback": z.string().describe("JSONP").optional(), "fields": z.string().describe("Selector specifying which fields to include in a partial response.").optional(), "key": z.string().describe("API key. Your API key identifies your project and provides you with API access, quota, and reports. Required unless you provide an OAuth 2.0 token.").optional(), "oauth_token": z.string().describe("OAuth 2.0 token for the current user.").optional(), "prettyPrint": z.boolean().describe("Returns response with indentations and line breaks.").optional(), "quotaUser": z.string().describe("Available to use for quota purposes for server-side applications. Can be any arbitrary string assigned to a user, but should not exceed 40 characters.").optional(), "upload_protocol": z.string().describe("Upload protocol for media (e.g. \"raw\", \"multipart\").").optional(), "uploadType": z.string().describe("Legacy upload protocol for media (e.g. \"media\", \"multipart\").").optional(), "name": z.string().describe("The name of the operation's parent resource."), "filter": z.string().describe("The standard list filter.").optional(), "pageSize": z.number().int().describe("The standard list page size.").optional(), "pageToken": z.string().describe("The standard list page token.").optional() },
  },
  async (args) => callApi({"method":"GET","path":"/v2/{name}/operations","params":[{"name":"$.xgafv","in":"query"},{"name":"access_token","in":"query"},{"name":"alt","in":"query"},{"name":"callback","in":"query"},{"name":"fields","in":"query"},{"name":"key","in":"query"},{"name":"oauth_token","in":"query"},{"name":"prettyPrint","in":"query"},{"name":"quotaUser","in":"query"},{"name":"upload_protocol","in":"query"},{"name":"uploadType","in":"query"},{"name":"name","in":"path"},{"name":"filter","in":"query"},{"name":"pageSize","in":"query"},{"name":"pageToken","in":"query"}],"hasBody":false}, args as Record<string, unknown>)
);

server.registerTool(
  "cancel_operation",
  {
    title: "tpu.projects.locations.operations.cancel",
    description: "Starts asynchronous cancellation on a long-running operation. Use this tool if a pending TPU operation needs to be aborted.",
    inputSchema: { "$.xgafv": z.enum(["1","2"]).describe("V1 error format.").optional(), "access_token": z.string().describe("OAuth access token.").optional(), "alt": z.enum(["json","media","proto"]).describe("Data format for response.").optional(), "callback": z.string().describe("JSONP").optional(), "fields": z.string().describe("Selector specifying which fields to include in a partial response.").optional(), "key": z.string().describe("API key. Your API key identifies your project and provides you with API access, quota, and reports. Required unless you provide an OAuth 2.0 token.").optional(), "oauth_token": z.string().describe("OAuth 2.0 token for the current user.").optional(), "prettyPrint": z.boolean().describe("Returns response with indentations and line breaks.").optional(), "quotaUser": z.string().describe("Available to use for quota purposes for server-side applications. Can be any arbitrary string assigned to a user, but should not exceed 40 characters.").optional(), "upload_protocol": z.string().describe("Upload protocol for media (e.g. \"raw\", \"multipart\").").optional(), "uploadType": z.string().describe("Legacy upload protocol for media (e.g. \"media\", \"multipart\").").optional(), "name": z.string().describe("The name of the operation resource to be cancelled.") },
  },
  async (args) => callApi({"method":"POST","path":"/v2/{name}:cancel","params":[{"name":"$.xgafv","in":"query"},{"name":"access_token","in":"query"},{"name":"alt","in":"query"},{"name":"callback","in":"query"},{"name":"fields","in":"query"},{"name":"key","in":"query"},{"name":"oauth_token","in":"query"},{"name":"prettyPrint","in":"query"},{"name":"quotaUser","in":"query"},{"name":"upload_protocol","in":"query"},{"name":"uploadType","in":"query"},{"name":"name","in":"path"}],"hasBody":false}, args as Record<string, unknown>)
);

server.registerTool(
  "list_locations",
  {
    title: "tpu.projects.locations.list",
    description: "Lists information about supported locations for the TPU service. Use this tool to discover valid regions and zones for resource deployment.",
    inputSchema: { "$.xgafv": z.enum(["1","2"]).describe("V1 error format.").optional(), "access_token": z.string().describe("OAuth access token.").optional(), "alt": z.enum(["json","media","proto"]).describe("Data format for response.").optional(), "callback": z.string().describe("JSONP").optional(), "fields": z.string().describe("Selector specifying which fields to include in a partial response.").optional(), "key": z.string().describe("API key. Your API key identifies your project and provides you with API access, quota, and reports. Required unless you provide an OAuth 2.0 token.").optional(), "oauth_token": z.string().describe("OAuth 2.0 token for the current user.").optional(), "prettyPrint": z.boolean().describe("Returns response with indentations and line breaks.").optional(), "quotaUser": z.string().describe("Available to use for quota purposes for server-side applications. Can be any arbitrary string assigned to a user, but should not exceed 40 characters.").optional(), "upload_protocol": z.string().describe("Upload protocol for media (e.g. \"raw\", \"multipart\").").optional(), "uploadType": z.string().describe("Legacy upload protocol for media (e.g. \"media\", \"multipart\").").optional(), "name": z.string().describe("The resource that owns the locations collection, if applicable."), "filter": z.string().describe("A filter to narrow down results to a preferred subset. The filtering language accepts strings like `\"displayName=tokyo\"`, and is documented in more detail in [AIP-160](https://google.aip.dev/160).").optional(), "pageSize": z.number().int().describe("The maximum number of results to return. If not set, the service selects a default.").optional(), "pageToken": z.string().describe("A page token received from the `next_page_token` field in the response. Send that page token to receive the subsequent page.").optional() },
  },
  async (args) => callApi({"method":"GET","path":"/v2/{name}/locations","params":[{"name":"$.xgafv","in":"query"},{"name":"access_token","in":"query"},{"name":"alt","in":"query"},{"name":"callback","in":"query"},{"name":"fields","in":"query"},{"name":"key","in":"query"},{"name":"oauth_token","in":"query"},{"name":"prettyPrint","in":"query"},{"name":"quotaUser","in":"query"},{"name":"upload_protocol","in":"query"},{"name":"uploadType","in":"query"},{"name":"name","in":"path"},{"name":"filter","in":"query"},{"name":"pageSize","in":"query"},{"name":"pageToken","in":"query"}],"hasBody":false}, args as Record<string, unknown>)
);

await server.connect(new StdioServerTransport());
