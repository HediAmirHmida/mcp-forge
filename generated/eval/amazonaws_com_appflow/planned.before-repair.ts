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

const BASE_URL = process.env.API_BASE_URL ?? "http://appflow.{region}.amazonaws.com";
const server = new McpServer({ name: "amazon-appflow", version: "1.0.0" });

server.registerTool(
  "create_flow",
  {
    title: "CreateFlow",
    description: "Creates a new data integration flow in Amazon AppFlow. Use this when you need to set up a new data transfer between a source and destination. Do not use this for updating existing flows.",
    inputSchema: { "X-Amz-Content-Sha256": z.string().optional(), "X-Amz-Date": z.string().optional(), "X-Amz-Algorithm": z.string().optional(), "X-Amz-Credential": z.string().optional(), "X-Amz-Security-Token": z.string().optional(), "X-Amz-Signature": z.string().optional(), "X-Amz-SignedHeaders": z.string().optional(), "body": z.object({ "flowName": z.string(), "description": z.string().optional(), "kmsArn": z.string().optional(), "triggerConfig": z.object({ "triggerType": z.any().optional(), "triggerProperties": z.any().optional() }), "sourceFlowConfig": z.object({ "connectorType": z.any().optional(), "apiVersion": z.any().optional(), "connectorProfileName": z.any().optional(), "sourceConnectorProperties": z.any().optional(), "incrementalPullConfig": z.any().optional() }), "destinationFlowConfigList": z.array(z.object({ "connectorType": z.any(), "apiVersion": z.any().optional(), "connectorProfileName": z.any().optional(), "destinationConnectorProperties": z.any() })), "tasks": z.array(z.object({ "sourceFields": z.any(), "connectorOperator": z.any().optional(), "destinationField": z.any().optional(), "taskType": z.any(), "taskProperties": z.any().optional() })), "tags": z.record(z.string(), z.string()).optional(), "metadataCatalogConfig": z.object({ "glueDataCatalog": z.any().optional() }).optional(), "clientToken": z.string().optional() }) },
  },
  async (args) => callApi({"method":"POST","path":"/create-flow","params":[{"name":"X-Amz-Content-Sha256","in":"header"},{"name":"X-Amz-Date","in":"header"},{"name":"X-Amz-Algorithm","in":"header"},{"name":"X-Amz-Credential","in":"header"},{"name":"X-Amz-Security-Token","in":"header"},{"name":"X-Amz-Signature","in":"header"},{"name":"X-Amz-SignedHeaders","in":"header"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "describe_flow",
  {
    title: "DescribeFlow",
    description: "Retrieves detailed configuration information about a specific Amazon AppFlow flow. Use this to inspect the source, destination, and trigger settings of a flow.",
    inputSchema: { "X-Amz-Content-Sha256": z.string().optional(), "X-Amz-Date": z.string().optional(), "X-Amz-Algorithm": z.string().optional(), "X-Amz-Credential": z.string().optional(), "X-Amz-Security-Token": z.string().optional(), "X-Amz-Signature": z.string().optional(), "X-Amz-SignedHeaders": z.string().optional(), "body": z.object({ "flowName": z.string() }) },
  },
  async (args) => callApi({"method":"POST","path":"/describe-flow","params":[{"name":"X-Amz-Content-Sha256","in":"header"},{"name":"X-Amz-Date","in":"header"},{"name":"X-Amz-Algorithm","in":"header"},{"name":"X-Amz-Credential","in":"header"},{"name":"X-Amz-Security-Token","in":"header"},{"name":"X-Amz-Signature","in":"header"},{"name":"X-Amz-SignedHeaders","in":"header"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "list_flows",
  {
    title: "ListFlows",
    description: "Returns a summary list of all flows associated with your AWS account. Use this when you need to discover existing flows or search for a flow name.",
    inputSchema: { "X-Amz-Content-Sha256": z.string().optional(), "X-Amz-Date": z.string().optional(), "X-Amz-Algorithm": z.string().optional(), "X-Amz-Credential": z.string().optional(), "X-Amz-Security-Token": z.string().optional(), "X-Amz-Signature": z.string().optional(), "X-Amz-SignedHeaders": z.string().optional(), "maxResults": z.string().describe("Pagination limit").optional(), "nextToken": z.string().describe("Pagination token").optional(), "body": z.object({ "maxResults": z.number().int().optional(), "nextToken": z.string().optional() }) },
  },
  async (args) => callApi({"method":"POST","path":"/list-flows","params":[{"name":"X-Amz-Content-Sha256","in":"header"},{"name":"X-Amz-Date","in":"header"},{"name":"X-Amz-Algorithm","in":"header"},{"name":"X-Amz-Credential","in":"header"},{"name":"X-Amz-Security-Token","in":"header"},{"name":"X-Amz-Signature","in":"header"},{"name":"X-Amz-SignedHeaders","in":"header"},{"name":"maxResults","in":"query"},{"name":"nextToken","in":"query"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "update_flow",
  {
    title: "UpdateFlow",
    description: "Updates an existing Amazon AppFlow flow's configuration. Use this when you need to modify source, destination, or trigger details of a flow.",
    inputSchema: { "X-Amz-Content-Sha256": z.string().optional(), "X-Amz-Date": z.string().optional(), "X-Amz-Algorithm": z.string().optional(), "X-Amz-Credential": z.string().optional(), "X-Amz-Security-Token": z.string().optional(), "X-Amz-Signature": z.string().optional(), "X-Amz-SignedHeaders": z.string().optional(), "body": z.object({ "flowName": z.string(), "description": z.string().optional(), "triggerConfig": z.object({ "triggerType": z.any().optional(), "triggerProperties": z.any().optional() }), "sourceFlowConfig": z.object({ "connectorType": z.any().optional(), "apiVersion": z.any().optional(), "connectorProfileName": z.any().optional(), "sourceConnectorProperties": z.any().optional(), "incrementalPullConfig": z.any().optional() }), "destinationFlowConfigList": z.array(z.object({ "connectorType": z.any(), "apiVersion": z.any().optional(), "connectorProfileName": z.any().optional(), "destinationConnectorProperties": z.any() })), "tasks": z.array(z.object({ "sourceFields": z.any(), "connectorOperator": z.any().optional(), "destinationField": z.any().optional(), "taskType": z.any(), "taskProperties": z.any().optional() })), "metadataCatalogConfig": z.object({ "glueDataCatalog": z.any().optional() }).optional(), "clientToken": z.string().optional() }) },
  },
  async (args) => callApi({"method":"POST","path":"/update-flow","params":[{"name":"X-Amz-Content-Sha256","in":"header"},{"name":"X-Amz-Date","in":"header"},{"name":"X-Amz-Algorithm","in":"header"},{"name":"X-Amz-Credential","in":"header"},{"name":"X-Amz-Security-Token","in":"header"},{"name":"X-Amz-Signature","in":"header"},{"name":"X-Amz-SignedHeaders","in":"header"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "delete_flow",
  {
    title: "DeleteFlow",
    description: "Deletes an existing Amazon AppFlow flow. Use this when a data integration flow is no longer needed and should be permanently removed.",
    inputSchema: { "X-Amz-Content-Sha256": z.string().optional(), "X-Amz-Date": z.string().optional(), "X-Amz-Algorithm": z.string().optional(), "X-Amz-Credential": z.string().optional(), "X-Amz-Security-Token": z.string().optional(), "X-Amz-Signature": z.string().optional(), "X-Amz-SignedHeaders": z.string().optional(), "body": z.object({ "flowName": z.string(), "forceDelete": z.boolean().optional() }) },
  },
  async (args) => callApi({"method":"POST","path":"/delete-flow","params":[{"name":"X-Amz-Content-Sha256","in":"header"},{"name":"X-Amz-Date","in":"header"},{"name":"X-Amz-Algorithm","in":"header"},{"name":"X-Amz-Credential","in":"header"},{"name":"X-Amz-Security-Token","in":"header"},{"name":"X-Amz-Signature","in":"header"},{"name":"X-Amz-SignedHeaders","in":"header"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "start_flow",
  {
    title: "StartFlow",
    description: "Activates or triggers an existing flow to run immediately or enable its schedule. Use this to execute on-demand data transfers.",
    inputSchema: { "X-Amz-Content-Sha256": z.string().optional(), "X-Amz-Date": z.string().optional(), "X-Amz-Algorithm": z.string().optional(), "X-Amz-Credential": z.string().optional(), "X-Amz-Security-Token": z.string().optional(), "X-Amz-Signature": z.string().optional(), "X-Amz-SignedHeaders": z.string().optional(), "body": z.object({ "flowName": z.string(), "clientToken": z.string().optional() }) },
  },
  async (args) => callApi({"method":"POST","path":"/start-flow","params":[{"name":"X-Amz-Content-Sha256","in":"header"},{"name":"X-Amz-Date","in":"header"},{"name":"X-Amz-Algorithm","in":"header"},{"name":"X-Amz-Credential","in":"header"},{"name":"X-Amz-Security-Token","in":"header"},{"name":"X-Amz-Signature","in":"header"},{"name":"X-Amz-SignedHeaders","in":"header"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "stop_flow",
  {
    title: "StopFlow",
    description: "Deactivates a scheduled or event-triggered flow. Do not use this for on-demand flows.",
    inputSchema: { "X-Amz-Content-Sha256": z.string().optional(), "X-Amz-Date": z.string().optional(), "X-Amz-Algorithm": z.string().optional(), "X-Amz-Credential": z.string().optional(), "X-Amz-Security-Token": z.string().optional(), "X-Amz-Signature": z.string().optional(), "X-Amz-SignedHeaders": z.string().optional(), "body": z.object({ "flowName": z.string() }) },
  },
  async (args) => callApi({"method":"POST","path":"/stop-flow","params":[{"name":"X-Amz-Content-Sha256","in":"header"},{"name":"X-Amz-Date","in":"header"},{"name":"X-Amz-Algorithm","in":"header"},{"name":"X-Amz-Credential","in":"header"},{"name":"X-Amz-Security-Token","in":"header"},{"name":"X-Amz-Signature","in":"header"},{"name":"X-Amz-SignedHeaders","in":"header"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "describe_flow_execution_records",
  {
    title: "DescribeFlowExecutionRecords",
    description: "Fetches the execution history and run status of a specific flow. Use this to monitor past data transfer successes and failures.",
    inputSchema: { "X-Amz-Content-Sha256": z.string().optional(), "X-Amz-Date": z.string().optional(), "X-Amz-Algorithm": z.string().optional(), "X-Amz-Credential": z.string().optional(), "X-Amz-Security-Token": z.string().optional(), "X-Amz-Signature": z.string().optional(), "X-Amz-SignedHeaders": z.string().optional(), "maxResults": z.string().describe("Pagination limit").optional(), "nextToken": z.string().describe("Pagination token").optional(), "body": z.object({ "flowName": z.string(), "maxResults": z.number().int().optional(), "nextToken": z.string().optional() }) },
  },
  async (args) => callApi({"method":"POST","path":"/describe-flow-execution-records","params":[{"name":"X-Amz-Content-Sha256","in":"header"},{"name":"X-Amz-Date","in":"header"},{"name":"X-Amz-Algorithm","in":"header"},{"name":"X-Amz-Credential","in":"header"},{"name":"X-Amz-Security-Token","in":"header"},{"name":"X-Amz-Signature","in":"header"},{"name":"X-Amz-SignedHeaders","in":"header"},{"name":"maxResults","in":"query"},{"name":"nextToken","in":"query"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "create_connector_profile",
  {
    title: "CreateConnectorProfile",
    description: "Creates a new connector profile storing authentication credentials for a service. Use this before creating flows that require authentication.",
    inputSchema: { "X-Amz-Content-Sha256": z.string().optional(), "X-Amz-Date": z.string().optional(), "X-Amz-Algorithm": z.string().optional(), "X-Amz-Credential": z.string().optional(), "X-Amz-Security-Token": z.string().optional(), "X-Amz-Signature": z.string().optional(), "X-Amz-SignedHeaders": z.string().optional(), "body": z.object({ "connectorProfileName": z.string(), "kmsArn": z.string().optional(), "connectorType": z.enum(["Salesforce","Singular","Slack","Redshift","S3","Marketo","Googleanalytics","Zendesk","Servicenow","Datadog","Trendmicro","Snowflake","Dynatrace","Infornexus","Amplitude","Veeva","EventBridge","LookoutMetrics","Upsolver","Honeycode","CustomerProfiles","SAPOData","CustomConnector","Pardot"]), "connectorLabel": z.string().optional(), "connectionMode": z.enum(["Public","Private"]), "connectorProfileConfig": z.object({ "connectorProfileProperties": z.any().optional(), "connectorProfileCredentials": z.any().optional() }), "clientToken": z.string().optional() }) },
  },
  async (args) => callApi({"method":"POST","path":"/create-connector-profile","params":[{"name":"X-Amz-Content-Sha256","in":"header"},{"name":"X-Amz-Date","in":"header"},{"name":"X-Amz-Algorithm","in":"header"},{"name":"X-Amz-Credential","in":"header"},{"name":"X-Amz-Security-Token","in":"header"},{"name":"X-Amz-Signature","in":"header"},{"name":"X-Amz-SignedHeaders","in":"header"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "describe_connector_profiles",
  {
    title: "DescribeConnectorProfiles",
    description: "Returns details of existing connector profiles. Use this to check connection configurations and authentication status.",
    inputSchema: { "X-Amz-Content-Sha256": z.string().optional(), "X-Amz-Date": z.string().optional(), "X-Amz-Algorithm": z.string().optional(), "X-Amz-Credential": z.string().optional(), "X-Amz-Security-Token": z.string().optional(), "X-Amz-Signature": z.string().optional(), "X-Amz-SignedHeaders": z.string().optional(), "maxResults": z.string().describe("Pagination limit").optional(), "nextToken": z.string().describe("Pagination token").optional(), "body": z.object({ "connectorProfileNames": z.array(z.string()).optional(), "connectorType": z.enum(["Salesforce","Singular","Slack","Redshift","S3","Marketo","Googleanalytics","Zendesk","Servicenow","Datadog","Trendmicro","Snowflake","Dynatrace","Infornexus","Amplitude","Veeva","EventBridge","LookoutMetrics","Upsolver","Honeycode","CustomerProfiles","SAPOData","CustomConnector","Pardot"]).optional(), "connectorLabel": z.string().optional(), "maxResults": z.number().int().optional(), "nextToken": z.string().optional() }) },
  },
  async (args) => callApi({"method":"POST","path":"/describe-connector-profiles","params":[{"name":"X-Amz-Content-Sha256","in":"header"},{"name":"X-Amz-Date","in":"header"},{"name":"X-Amz-Algorithm","in":"header"},{"name":"X-Amz-Credential","in":"header"},{"name":"X-Amz-Security-Token","in":"header"},{"name":"X-Amz-Signature","in":"header"},{"name":"X-Amz-SignedHeaders","in":"header"},{"name":"maxResults","in":"query"},{"name":"nextToken","in":"query"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "list_connector_entities",
  {
    title: "ListConnectorEntities",
    description: "Lists available data entities supported by a connector, such as Salesforce objects or tables. Use this to discover available data sources before configuring a flow.",
    inputSchema: { "X-Amz-Content-Sha256": z.string().optional(), "X-Amz-Date": z.string().optional(), "X-Amz-Algorithm": z.string().optional(), "X-Amz-Credential": z.string().optional(), "X-Amz-Security-Token": z.string().optional(), "X-Amz-Signature": z.string().optional(), "X-Amz-SignedHeaders": z.string().optional(), "body": z.object({ "connectorProfileName": z.string().optional(), "connectorType": z.enum(["Salesforce","Singular","Slack","Redshift","S3","Marketo","Googleanalytics","Zendesk","Servicenow","Datadog","Trendmicro","Snowflake","Dynatrace","Infornexus","Amplitude","Veeva","EventBridge","LookoutMetrics","Upsolver","Honeycode","CustomerProfiles","SAPOData","CustomConnector","Pardot"]).optional(), "entitiesPath": z.string().optional(), "apiVersion": z.string().optional(), "maxResults": z.number().int().optional(), "nextToken": z.string().optional() }) },
  },
  async (args) => callApi({"method":"POST","path":"/list-connector-entities","params":[{"name":"X-Amz-Content-Sha256","in":"header"},{"name":"X-Amz-Date","in":"header"},{"name":"X-Amz-Algorithm","in":"header"},{"name":"X-Amz-Credential","in":"header"},{"name":"X-Amz-Security-Token","in":"header"},{"name":"X-Amz-Signature","in":"header"},{"name":"X-Amz-SignedHeaders","in":"header"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "describe_connector_entity",
  {
    title: "DescribeConnectorEntity",
    description: "Provides the data model and field descriptions for a specific connector entity. Use this to understand field structures before mapping data fields in a flow.",
    inputSchema: { "X-Amz-Content-Sha256": z.string().optional(), "X-Amz-Date": z.string().optional(), "X-Amz-Algorithm": z.string().optional(), "X-Amz-Credential": z.string().optional(), "X-Amz-Security-Token": z.string().optional(), "X-Amz-Signature": z.string().optional(), "X-Amz-SignedHeaders": z.string().optional(), "body": z.object({ "connectorEntityName": z.string(), "connectorType": z.enum(["Salesforce","Singular","Slack","Redshift","S3","Marketo","Googleanalytics","Zendesk","Servicenow","Datadog","Trendmicro","Snowflake","Dynatrace","Infornexus","Amplitude","Veeva","EventBridge","LookoutMetrics","Upsolver","Honeycode","CustomerProfiles","SAPOData","CustomConnector","Pardot"]).optional(), "connectorProfileName": z.string().optional(), "apiVersion": z.string().optional() }) },
  },
  async (args) => callApi({"method":"POST","path":"/describe-connector-entity","params":[{"name":"X-Amz-Content-Sha256","in":"header"},{"name":"X-Amz-Date","in":"header"},{"name":"X-Amz-Algorithm","in":"header"},{"name":"X-Amz-Credential","in":"header"},{"name":"X-Amz-Security-Token","in":"header"},{"name":"X-Amz-Signature","in":"header"},{"name":"X-Amz-SignedHeaders","in":"header"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

await server.connect(new StdioServerTransport());
