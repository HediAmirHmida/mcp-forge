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
  "CreateConnectorProfile",
  {
    title: "CreateConnectorProfile",
    description: " Creates a new connector profile associated with your Amazon Web Services account. There is a soft quota of 100 connector profiles per Amazon Web Services account. If you need more connector profiles than this quota allows, you can submit a request to the Amazon AppFlow team through the Amazon AppFlow support channel. In each connector profile that you create, you can provide the credentials and properties for only one connector.",
    inputSchema: { "X-Amz-Content-Sha256": z.string().optional(), "X-Amz-Date": z.string().optional(), "X-Amz-Algorithm": z.string().optional(), "X-Amz-Credential": z.string().optional(), "X-Amz-Security-Token": z.string().optional(), "X-Amz-Signature": z.string().optional(), "X-Amz-SignedHeaders": z.string().optional(), "body": z.object({ "connectorProfileName": z.string(), "kmsArn": z.string().optional(), "connectorType": z.enum(["Salesforce","Singular","Slack","Redshift","S3","Marketo","Googleanalytics","Zendesk","Servicenow","Datadog","Trendmicro","Snowflake","Dynatrace","Infornexus","Amplitude","Veeva","EventBridge","LookoutMetrics","Upsolver","Honeycode","CustomerProfiles","SAPOData","CustomConnector","Pardot"]), "connectorLabel": z.string().optional(), "connectionMode": z.enum(["Public","Private"]), "connectorProfileConfig": z.object({ "connectorProfileProperties": z.any().optional(), "connectorProfileCredentials": z.any().optional() }), "clientToken": z.string().optional() }) },
  },
  async (args) => callApi({"method":"POST","path":"/create-connector-profile","params":[{"name":"X-Amz-Content-Sha256","in":"header"},{"name":"X-Amz-Date","in":"header"},{"name":"X-Amz-Algorithm","in":"header"},{"name":"X-Amz-Credential","in":"header"},{"name":"X-Amz-Security-Token","in":"header"},{"name":"X-Amz-Signature","in":"header"},{"name":"X-Amz-SignedHeaders","in":"header"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "CreateFlow",
  {
    title: "CreateFlow",
    description: " Enables your application to create a new flow using Amazon AppFlow. You must create a connector profile before calling this API. Please note that the Request Syntax below shows syntax for multiple destinations, however, you can only transfer data to one item in this list at a time. Amazon AppFlow does not currently support flows to multiple destinations at once. ",
    inputSchema: { "X-Amz-Content-Sha256": z.string().optional(), "X-Amz-Date": z.string().optional(), "X-Amz-Algorithm": z.string().optional(), "X-Amz-Credential": z.string().optional(), "X-Amz-Security-Token": z.string().optional(), "X-Amz-Signature": z.string().optional(), "X-Amz-SignedHeaders": z.string().optional(), "body": z.object({ "flowName": z.string(), "description": z.string().optional(), "kmsArn": z.string().optional(), "triggerConfig": z.object({ "triggerType": z.any().optional(), "triggerProperties": z.any().optional() }), "sourceFlowConfig": z.object({ "connectorType": z.any().optional(), "apiVersion": z.any().optional(), "connectorProfileName": z.any().optional(), "sourceConnectorProperties": z.any().optional(), "incrementalPullConfig": z.any().optional() }), "destinationFlowConfigList": z.array(z.object({ "connectorType": z.any(), "apiVersion": z.any().optional(), "connectorProfileName": z.any().optional(), "destinationConnectorProperties": z.any() })), "tasks": z.array(z.object({ "sourceFields": z.any(), "connectorOperator": z.any().optional(), "destinationField": z.any().optional(), "taskType": z.any(), "taskProperties": z.any().optional() })), "tags": z.record(z.string(), z.string()).optional(), "metadataCatalogConfig": z.object({ "glueDataCatalog": z.any().optional() }).optional(), "clientToken": z.string().optional() }) },
  },
  async (args) => callApi({"method":"POST","path":"/create-flow","params":[{"name":"X-Amz-Content-Sha256","in":"header"},{"name":"X-Amz-Date","in":"header"},{"name":"X-Amz-Algorithm","in":"header"},{"name":"X-Amz-Credential","in":"header"},{"name":"X-Amz-Security-Token","in":"header"},{"name":"X-Amz-Signature","in":"header"},{"name":"X-Amz-SignedHeaders","in":"header"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "DeleteConnectorProfile",
  {
    title: "DeleteConnectorProfile",
    description: " Enables you to delete an existing connector profile. ",
    inputSchema: { "X-Amz-Content-Sha256": z.string().optional(), "X-Amz-Date": z.string().optional(), "X-Amz-Algorithm": z.string().optional(), "X-Amz-Credential": z.string().optional(), "X-Amz-Security-Token": z.string().optional(), "X-Amz-Signature": z.string().optional(), "X-Amz-SignedHeaders": z.string().optional(), "body": z.object({ "connectorProfileName": z.string(), "forceDelete": z.boolean().optional() }) },
  },
  async (args) => callApi({"method":"POST","path":"/delete-connector-profile","params":[{"name":"X-Amz-Content-Sha256","in":"header"},{"name":"X-Amz-Date","in":"header"},{"name":"X-Amz-Algorithm","in":"header"},{"name":"X-Amz-Credential","in":"header"},{"name":"X-Amz-Security-Token","in":"header"},{"name":"X-Amz-Signature","in":"header"},{"name":"X-Amz-SignedHeaders","in":"header"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "DeleteFlow",
  {
    title: "DeleteFlow",
    description: " Enables your application to delete an existing flow. Before deleting the flow, Amazon AppFlow validates the request by checking the flow configuration and status. You can delete flows one at a time. ",
    inputSchema: { "X-Amz-Content-Sha256": z.string().optional(), "X-Amz-Date": z.string().optional(), "X-Amz-Algorithm": z.string().optional(), "X-Amz-Credential": z.string().optional(), "X-Amz-Security-Token": z.string().optional(), "X-Amz-Signature": z.string().optional(), "X-Amz-SignedHeaders": z.string().optional(), "body": z.object({ "flowName": z.string(), "forceDelete": z.boolean().optional() }) },
  },
  async (args) => callApi({"method":"POST","path":"/delete-flow","params":[{"name":"X-Amz-Content-Sha256","in":"header"},{"name":"X-Amz-Date","in":"header"},{"name":"X-Amz-Algorithm","in":"header"},{"name":"X-Amz-Credential","in":"header"},{"name":"X-Amz-Security-Token","in":"header"},{"name":"X-Amz-Signature","in":"header"},{"name":"X-Amz-SignedHeaders","in":"header"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "DescribeConnector",
  {
    title: "DescribeConnector",
    description: "Describes the given custom connector registered in your Amazon Web Services account. This API can be used for custom connectors that are registered in your account and also for Amazon authored connectors.",
    inputSchema: { "X-Amz-Content-Sha256": z.string().optional(), "X-Amz-Date": z.string().optional(), "X-Amz-Algorithm": z.string().optional(), "X-Amz-Credential": z.string().optional(), "X-Amz-Security-Token": z.string().optional(), "X-Amz-Signature": z.string().optional(), "X-Amz-SignedHeaders": z.string().optional(), "body": z.object({ "connectorType": z.enum(["Salesforce","Singular","Slack","Redshift","S3","Marketo","Googleanalytics","Zendesk","Servicenow","Datadog","Trendmicro","Snowflake","Dynatrace","Infornexus","Amplitude","Veeva","EventBridge","LookoutMetrics","Upsolver","Honeycode","CustomerProfiles","SAPOData","CustomConnector","Pardot"]), "connectorLabel": z.string().optional() }) },
  },
  async (args) => callApi({"method":"POST","path":"/describe-connector","params":[{"name":"X-Amz-Content-Sha256","in":"header"},{"name":"X-Amz-Date","in":"header"},{"name":"X-Amz-Algorithm","in":"header"},{"name":"X-Amz-Credential","in":"header"},{"name":"X-Amz-Security-Token","in":"header"},{"name":"X-Amz-Signature","in":"header"},{"name":"X-Amz-SignedHeaders","in":"header"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "DescribeConnectorEntity",
  {
    title: "DescribeConnectorEntity",
    description: " Provides details regarding the entity used with the connector, with a description of the data model for each field in that entity. ",
    inputSchema: { "X-Amz-Content-Sha256": z.string().optional(), "X-Amz-Date": z.string().optional(), "X-Amz-Algorithm": z.string().optional(), "X-Amz-Credential": z.string().optional(), "X-Amz-Security-Token": z.string().optional(), "X-Amz-Signature": z.string().optional(), "X-Amz-SignedHeaders": z.string().optional(), "body": z.object({ "connectorEntityName": z.string(), "connectorType": z.enum(["Salesforce","Singular","Slack","Redshift","S3","Marketo","Googleanalytics","Zendesk","Servicenow","Datadog","Trendmicro","Snowflake","Dynatrace","Infornexus","Amplitude","Veeva","EventBridge","LookoutMetrics","Upsolver","Honeycode","CustomerProfiles","SAPOData","CustomConnector","Pardot"]).optional(), "connectorProfileName": z.string().optional(), "apiVersion": z.string().optional() }) },
  },
  async (args) => callApi({"method":"POST","path":"/describe-connector-entity","params":[{"name":"X-Amz-Content-Sha256","in":"header"},{"name":"X-Amz-Date","in":"header"},{"name":"X-Amz-Algorithm","in":"header"},{"name":"X-Amz-Credential","in":"header"},{"name":"X-Amz-Security-Token","in":"header"},{"name":"X-Amz-Signature","in":"header"},{"name":"X-Amz-SignedHeaders","in":"header"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "DescribeConnectorProfiles",
  {
    title: "DescribeConnectorProfiles",
    description: "<p> Returns a list of <code>connector-profile</code> details matching the provided <code>connector-profile</code> names and <code>connector-types</code>. Both input lists are optional, and you can use them to filter the result. </p> <p>If no names or <code>connector-types</code> are provided, returns all connector profiles in a paginated form. If there is no match, this operation returns an empty list.</p>",
    inputSchema: { "X-Amz-Content-Sha256": z.string().optional(), "X-Amz-Date": z.string().optional(), "X-Amz-Algorithm": z.string().optional(), "X-Amz-Credential": z.string().optional(), "X-Amz-Security-Token": z.string().optional(), "X-Amz-Signature": z.string().optional(), "X-Amz-SignedHeaders": z.string().optional(), "maxResults": z.string().describe("Pagination limit").optional(), "nextToken": z.string().describe("Pagination token").optional(), "body": z.object({ "connectorProfileNames": z.array(z.string()).optional(), "connectorType": z.enum(["Salesforce","Singular","Slack","Redshift","S3","Marketo","Googleanalytics","Zendesk","Servicenow","Datadog","Trendmicro","Snowflake","Dynatrace","Infornexus","Amplitude","Veeva","EventBridge","LookoutMetrics","Upsolver","Honeycode","CustomerProfiles","SAPOData","CustomConnector","Pardot"]).optional(), "connectorLabel": z.string().optional(), "maxResults": z.number().int().optional(), "nextToken": z.string().optional() }) },
  },
  async (args) => callApi({"method":"POST","path":"/describe-connector-profiles","params":[{"name":"X-Amz-Content-Sha256","in":"header"},{"name":"X-Amz-Date","in":"header"},{"name":"X-Amz-Algorithm","in":"header"},{"name":"X-Amz-Credential","in":"header"},{"name":"X-Amz-Security-Token","in":"header"},{"name":"X-Amz-Signature","in":"header"},{"name":"X-Amz-SignedHeaders","in":"header"},{"name":"maxResults","in":"query"},{"name":"nextToken","in":"query"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "DescribeConnectors",
  {
    title: "DescribeConnectors",
    description: " Describes the connectors vended by Amazon AppFlow for specified connector types. If you don't specify a connector type, this operation describes all connectors vended by Amazon AppFlow. If there are more connectors than can be returned in one page, the response contains a <code>nextToken</code> object, which can be be passed in to the next call to the <code>DescribeConnectors</code> API operation to retrieve the next page. ",
    inputSchema: { "X-Amz-Content-Sha256": z.string().optional(), "X-Amz-Date": z.string().optional(), "X-Amz-Algorithm": z.string().optional(), "X-Amz-Credential": z.string().optional(), "X-Amz-Security-Token": z.string().optional(), "X-Amz-Signature": z.string().optional(), "X-Amz-SignedHeaders": z.string().optional(), "maxResults": z.string().describe("Pagination limit").optional(), "nextToken": z.string().describe("Pagination token").optional(), "body": z.object({ "connectorTypes": z.array(z.enum(["Salesforce","Singular","Slack","Redshift","S3","Marketo","Googleanalytics","Zendesk","Servicenow","Datadog","Trendmicro","Snowflake","Dynatrace","Infornexus","Amplitude","Veeva","EventBridge","LookoutMetrics","Upsolver","Honeycode","CustomerProfiles","SAPOData","CustomConnector","Pardot"])).optional(), "maxResults": z.number().int().optional(), "nextToken": z.string().optional() }) },
  },
  async (args) => callApi({"method":"POST","path":"/describe-connectors","params":[{"name":"X-Amz-Content-Sha256","in":"header"},{"name":"X-Amz-Date","in":"header"},{"name":"X-Amz-Algorithm","in":"header"},{"name":"X-Amz-Credential","in":"header"},{"name":"X-Amz-Security-Token","in":"header"},{"name":"X-Amz-Signature","in":"header"},{"name":"X-Amz-SignedHeaders","in":"header"},{"name":"maxResults","in":"query"},{"name":"nextToken","in":"query"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "DescribeFlow",
  {
    title: "DescribeFlow",
    description: " Provides a description of the specified flow. ",
    inputSchema: { "X-Amz-Content-Sha256": z.string().optional(), "X-Amz-Date": z.string().optional(), "X-Amz-Algorithm": z.string().optional(), "X-Amz-Credential": z.string().optional(), "X-Amz-Security-Token": z.string().optional(), "X-Amz-Signature": z.string().optional(), "X-Amz-SignedHeaders": z.string().optional(), "body": z.object({ "flowName": z.string() }) },
  },
  async (args) => callApi({"method":"POST","path":"/describe-flow","params":[{"name":"X-Amz-Content-Sha256","in":"header"},{"name":"X-Amz-Date","in":"header"},{"name":"X-Amz-Algorithm","in":"header"},{"name":"X-Amz-Credential","in":"header"},{"name":"X-Amz-Security-Token","in":"header"},{"name":"X-Amz-Signature","in":"header"},{"name":"X-Amz-SignedHeaders","in":"header"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "DescribeFlowExecutionRecords",
  {
    title: "DescribeFlowExecutionRecords",
    description: " Fetches the execution history of the flow. ",
    inputSchema: { "X-Amz-Content-Sha256": z.string().optional(), "X-Amz-Date": z.string().optional(), "X-Amz-Algorithm": z.string().optional(), "X-Amz-Credential": z.string().optional(), "X-Amz-Security-Token": z.string().optional(), "X-Amz-Signature": z.string().optional(), "X-Amz-SignedHeaders": z.string().optional(), "maxResults": z.string().describe("Pagination limit").optional(), "nextToken": z.string().describe("Pagination token").optional(), "body": z.object({ "flowName": z.string(), "maxResults": z.number().int().optional(), "nextToken": z.string().optional() }) },
  },
  async (args) => callApi({"method":"POST","path":"/describe-flow-execution-records","params":[{"name":"X-Amz-Content-Sha256","in":"header"},{"name":"X-Amz-Date","in":"header"},{"name":"X-Amz-Algorithm","in":"header"},{"name":"X-Amz-Credential","in":"header"},{"name":"X-Amz-Security-Token","in":"header"},{"name":"X-Amz-Signature","in":"header"},{"name":"X-Amz-SignedHeaders","in":"header"},{"name":"maxResults","in":"query"},{"name":"nextToken","in":"query"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "ListConnectorEntities",
  {
    title: "ListConnectorEntities",
    description: " Returns the list of available connector entities supported by Amazon AppFlow. For example, you can query Salesforce for <i>Account</i> and <i>Opportunity</i> entities, or query ServiceNow for the <i>Incident</i> entity. ",
    inputSchema: { "X-Amz-Content-Sha256": z.string().optional(), "X-Amz-Date": z.string().optional(), "X-Amz-Algorithm": z.string().optional(), "X-Amz-Credential": z.string().optional(), "X-Amz-Security-Token": z.string().optional(), "X-Amz-Signature": z.string().optional(), "X-Amz-SignedHeaders": z.string().optional(), "body": z.object({ "connectorProfileName": z.string().optional(), "connectorType": z.enum(["Salesforce","Singular","Slack","Redshift","S3","Marketo","Googleanalytics","Zendesk","Servicenow","Datadog","Trendmicro","Snowflake","Dynatrace","Infornexus","Amplitude","Veeva","EventBridge","LookoutMetrics","Upsolver","Honeycode","CustomerProfiles","SAPOData","CustomConnector","Pardot"]).optional(), "entitiesPath": z.string().optional(), "apiVersion": z.string().optional(), "maxResults": z.number().int().optional(), "nextToken": z.string().optional() }) },
  },
  async (args) => callApi({"method":"POST","path":"/list-connector-entities","params":[{"name":"X-Amz-Content-Sha256","in":"header"},{"name":"X-Amz-Date","in":"header"},{"name":"X-Amz-Algorithm","in":"header"},{"name":"X-Amz-Credential","in":"header"},{"name":"X-Amz-Security-Token","in":"header"},{"name":"X-Amz-Signature","in":"header"},{"name":"X-Amz-SignedHeaders","in":"header"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "ListConnectors",
  {
    title: "ListConnectors",
    description: "Returns the list of all registered custom connectors in your Amazon Web Services account. This API lists only custom connectors registered in this account, not the Amazon Web Services authored connectors. ",
    inputSchema: { "X-Amz-Content-Sha256": z.string().optional(), "X-Amz-Date": z.string().optional(), "X-Amz-Algorithm": z.string().optional(), "X-Amz-Credential": z.string().optional(), "X-Amz-Security-Token": z.string().optional(), "X-Amz-Signature": z.string().optional(), "X-Amz-SignedHeaders": z.string().optional(), "maxResults": z.string().describe("Pagination limit").optional(), "nextToken": z.string().describe("Pagination token").optional(), "body": z.object({ "maxResults": z.number().int().optional(), "nextToken": z.string().optional() }) },
  },
  async (args) => callApi({"method":"POST","path":"/list-connectors","params":[{"name":"X-Amz-Content-Sha256","in":"header"},{"name":"X-Amz-Date","in":"header"},{"name":"X-Amz-Algorithm","in":"header"},{"name":"X-Amz-Credential","in":"header"},{"name":"X-Amz-Security-Token","in":"header"},{"name":"X-Amz-Signature","in":"header"},{"name":"X-Amz-SignedHeaders","in":"header"},{"name":"maxResults","in":"query"},{"name":"nextToken","in":"query"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "ListFlows",
  {
    title: "ListFlows",
    description: " Lists all of the flows associated with your account. ",
    inputSchema: { "X-Amz-Content-Sha256": z.string().optional(), "X-Amz-Date": z.string().optional(), "X-Amz-Algorithm": z.string().optional(), "X-Amz-Credential": z.string().optional(), "X-Amz-Security-Token": z.string().optional(), "X-Amz-Signature": z.string().optional(), "X-Amz-SignedHeaders": z.string().optional(), "maxResults": z.string().describe("Pagination limit").optional(), "nextToken": z.string().describe("Pagination token").optional(), "body": z.object({ "maxResults": z.number().int().optional(), "nextToken": z.string().optional() }) },
  },
  async (args) => callApi({"method":"POST","path":"/list-flows","params":[{"name":"X-Amz-Content-Sha256","in":"header"},{"name":"X-Amz-Date","in":"header"},{"name":"X-Amz-Algorithm","in":"header"},{"name":"X-Amz-Credential","in":"header"},{"name":"X-Amz-Security-Token","in":"header"},{"name":"X-Amz-Signature","in":"header"},{"name":"X-Amz-SignedHeaders","in":"header"},{"name":"maxResults","in":"query"},{"name":"nextToken","in":"query"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "ListTagsForResource",
  {
    title: "ListTagsForResource",
    description: " Retrieves the tags that are associated with a specified flow. ",
    inputSchema: { "X-Amz-Content-Sha256": z.string().optional(), "X-Amz-Date": z.string().optional(), "X-Amz-Algorithm": z.string().optional(), "X-Amz-Credential": z.string().optional(), "X-Amz-Security-Token": z.string().optional(), "X-Amz-Signature": z.string().optional(), "X-Amz-SignedHeaders": z.string().optional(), "resourceArn": z.string().describe(" The Amazon Resource Name (ARN) of the specified flow. ") },
  },
  async (args) => callApi({"method":"GET","path":"/tags/{resourceArn}","params":[{"name":"X-Amz-Content-Sha256","in":"header"},{"name":"X-Amz-Date","in":"header"},{"name":"X-Amz-Algorithm","in":"header"},{"name":"X-Amz-Credential","in":"header"},{"name":"X-Amz-Security-Token","in":"header"},{"name":"X-Amz-Signature","in":"header"},{"name":"X-Amz-SignedHeaders","in":"header"},{"name":"resourceArn","in":"path"}],"hasBody":false}, args as Record<string, unknown>)
);

server.registerTool(
  "TagResource",
  {
    title: "TagResource",
    description: " Applies a tag to the specified flow. ",
    inputSchema: { "X-Amz-Content-Sha256": z.string().optional(), "X-Amz-Date": z.string().optional(), "X-Amz-Algorithm": z.string().optional(), "X-Amz-Credential": z.string().optional(), "X-Amz-Security-Token": z.string().optional(), "X-Amz-Signature": z.string().optional(), "X-Amz-SignedHeaders": z.string().optional(), "resourceArn": z.string().describe(" The Amazon Resource Name (ARN) of the flow that you want to tag. "), "body": z.object({ "tags": z.record(z.string(), z.string()) }) },
  },
  async (args) => callApi({"method":"POST","path":"/tags/{resourceArn}","params":[{"name":"X-Amz-Content-Sha256","in":"header"},{"name":"X-Amz-Date","in":"header"},{"name":"X-Amz-Algorithm","in":"header"},{"name":"X-Amz-Credential","in":"header"},{"name":"X-Amz-Security-Token","in":"header"},{"name":"X-Amz-Signature","in":"header"},{"name":"X-Amz-SignedHeaders","in":"header"},{"name":"resourceArn","in":"path"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "RegisterConnector",
  {
    title: "RegisterConnector",
    description: "Registers a new custom connector with your Amazon Web Services account. Before you can register the connector, you must deploy the associated AWS lambda function in your account.",
    inputSchema: { "X-Amz-Content-Sha256": z.string().optional(), "X-Amz-Date": z.string().optional(), "X-Amz-Algorithm": z.string().optional(), "X-Amz-Credential": z.string().optional(), "X-Amz-Security-Token": z.string().optional(), "X-Amz-Signature": z.string().optional(), "X-Amz-SignedHeaders": z.string().optional(), "body": z.object({ "connectorLabel": z.string().optional(), "description": z.string().optional(), "connectorProvisioningType": z.enum(["LAMBDA"]).optional(), "connectorProvisioningConfig": z.object({ "lambda": z.any().optional() }).optional(), "clientToken": z.string().optional() }) },
  },
  async (args) => callApi({"method":"POST","path":"/register-connector","params":[{"name":"X-Amz-Content-Sha256","in":"header"},{"name":"X-Amz-Date","in":"header"},{"name":"X-Amz-Algorithm","in":"header"},{"name":"X-Amz-Credential","in":"header"},{"name":"X-Amz-Security-Token","in":"header"},{"name":"X-Amz-Signature","in":"header"},{"name":"X-Amz-SignedHeaders","in":"header"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "StartFlow",
  {
    title: "StartFlow",
    description: " Activates an existing flow. For on-demand flows, this operation runs the flow immediately. For schedule and event-triggered flows, this operation activates the flow. ",
    inputSchema: { "X-Amz-Content-Sha256": z.string().optional(), "X-Amz-Date": z.string().optional(), "X-Amz-Algorithm": z.string().optional(), "X-Amz-Credential": z.string().optional(), "X-Amz-Security-Token": z.string().optional(), "X-Amz-Signature": z.string().optional(), "X-Amz-SignedHeaders": z.string().optional(), "body": z.object({ "flowName": z.string(), "clientToken": z.string().optional() }) },
  },
  async (args) => callApi({"method":"POST","path":"/start-flow","params":[{"name":"X-Amz-Content-Sha256","in":"header"},{"name":"X-Amz-Date","in":"header"},{"name":"X-Amz-Algorithm","in":"header"},{"name":"X-Amz-Credential","in":"header"},{"name":"X-Amz-Security-Token","in":"header"},{"name":"X-Amz-Signature","in":"header"},{"name":"X-Amz-SignedHeaders","in":"header"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "StopFlow",
  {
    title: "StopFlow",
    description: " Deactivates the existing flow. For on-demand flows, this operation returns an <code>unsupportedOperationException</code> error message. For schedule and event-triggered flows, this operation deactivates the flow. ",
    inputSchema: { "X-Amz-Content-Sha256": z.string().optional(), "X-Amz-Date": z.string().optional(), "X-Amz-Algorithm": z.string().optional(), "X-Amz-Credential": z.string().optional(), "X-Amz-Security-Token": z.string().optional(), "X-Amz-Signature": z.string().optional(), "X-Amz-SignedHeaders": z.string().optional(), "body": z.object({ "flowName": z.string() }) },
  },
  async (args) => callApi({"method":"POST","path":"/stop-flow","params":[{"name":"X-Amz-Content-Sha256","in":"header"},{"name":"X-Amz-Date","in":"header"},{"name":"X-Amz-Algorithm","in":"header"},{"name":"X-Amz-Credential","in":"header"},{"name":"X-Amz-Security-Token","in":"header"},{"name":"X-Amz-Signature","in":"header"},{"name":"X-Amz-SignedHeaders","in":"header"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "UnregisterConnector",
  {
    title: "UnregisterConnector",
    description: "Unregisters the custom connector registered in your account that matches the connector label provided in the request.",
    inputSchema: { "X-Amz-Content-Sha256": z.string().optional(), "X-Amz-Date": z.string().optional(), "X-Amz-Algorithm": z.string().optional(), "X-Amz-Credential": z.string().optional(), "X-Amz-Security-Token": z.string().optional(), "X-Amz-Signature": z.string().optional(), "X-Amz-SignedHeaders": z.string().optional(), "body": z.object({ "connectorLabel": z.string(), "forceDelete": z.boolean().optional() }) },
  },
  async (args) => callApi({"method":"POST","path":"/unregister-connector","params":[{"name":"X-Amz-Content-Sha256","in":"header"},{"name":"X-Amz-Date","in":"header"},{"name":"X-Amz-Algorithm","in":"header"},{"name":"X-Amz-Credential","in":"header"},{"name":"X-Amz-Security-Token","in":"header"},{"name":"X-Amz-Signature","in":"header"},{"name":"X-Amz-SignedHeaders","in":"header"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "UntagResource",
  {
    title: "UntagResource",
    description: " Removes a tag from the specified flow. ",
    inputSchema: { "X-Amz-Content-Sha256": z.string().optional(), "X-Amz-Date": z.string().optional(), "X-Amz-Algorithm": z.string().optional(), "X-Amz-Credential": z.string().optional(), "X-Amz-Security-Token": z.string().optional(), "X-Amz-Signature": z.string().optional(), "X-Amz-SignedHeaders": z.string().optional(), "resourceArn": z.string().describe(" The Amazon Resource Name (ARN) of the flow that you want to untag. "), "tagKeys": z.array(z.string()).describe(" The tag keys associated with the tag that you want to remove from your flow. ") },
  },
  async (args) => callApi({"method":"DELETE","path":"/tags/{resourceArn}#tagKeys","params":[{"name":"X-Amz-Content-Sha256","in":"header"},{"name":"X-Amz-Date","in":"header"},{"name":"X-Amz-Algorithm","in":"header"},{"name":"X-Amz-Credential","in":"header"},{"name":"X-Amz-Security-Token","in":"header"},{"name":"X-Amz-Signature","in":"header"},{"name":"X-Amz-SignedHeaders","in":"header"},{"name":"resourceArn","in":"path"},{"name":"tagKeys","in":"query"}],"hasBody":false}, args as Record<string, unknown>)
);

server.registerTool(
  "UpdateConnectorProfile",
  {
    title: "UpdateConnectorProfile",
    description: " Updates a given connector profile associated with your account. ",
    inputSchema: { "X-Amz-Content-Sha256": z.string().optional(), "X-Amz-Date": z.string().optional(), "X-Amz-Algorithm": z.string().optional(), "X-Amz-Credential": z.string().optional(), "X-Amz-Security-Token": z.string().optional(), "X-Amz-Signature": z.string().optional(), "X-Amz-SignedHeaders": z.string().optional(), "body": z.object({ "connectorProfileName": z.string(), "connectionMode": z.enum(["Public","Private"]), "connectorProfileConfig": z.object({ "connectorProfileProperties": z.any().optional(), "connectorProfileCredentials": z.any().optional() }), "clientToken": z.string().optional() }) },
  },
  async (args) => callApi({"method":"POST","path":"/update-connector-profile","params":[{"name":"X-Amz-Content-Sha256","in":"header"},{"name":"X-Amz-Date","in":"header"},{"name":"X-Amz-Algorithm","in":"header"},{"name":"X-Amz-Credential","in":"header"},{"name":"X-Amz-Security-Token","in":"header"},{"name":"X-Amz-Signature","in":"header"},{"name":"X-Amz-SignedHeaders","in":"header"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "UpdateConnectorRegistration",
  {
    title: "UpdateConnectorRegistration",
    description: "<p>Updates a custom connector that you've previously registered. This operation updates the connector with one of the following:</p> <ul> <li> <p>The latest version of the AWS Lambda function that's assigned to the connector</p> </li> <li> <p>A new AWS Lambda function that you specify</p> </li> </ul>",
    inputSchema: { "X-Amz-Content-Sha256": z.string().optional(), "X-Amz-Date": z.string().optional(), "X-Amz-Algorithm": z.string().optional(), "X-Amz-Credential": z.string().optional(), "X-Amz-Security-Token": z.string().optional(), "X-Amz-Signature": z.string().optional(), "X-Amz-SignedHeaders": z.string().optional(), "body": z.object({ "connectorLabel": z.string(), "description": z.string().optional(), "connectorProvisioningConfig": z.object({ "lambda": z.any().optional() }).optional(), "clientToken": z.string().optional() }) },
  },
  async (args) => callApi({"method":"POST","path":"/update-connector-registration","params":[{"name":"X-Amz-Content-Sha256","in":"header"},{"name":"X-Amz-Date","in":"header"},{"name":"X-Amz-Algorithm","in":"header"},{"name":"X-Amz-Credential","in":"header"},{"name":"X-Amz-Security-Token","in":"header"},{"name":"X-Amz-Signature","in":"header"},{"name":"X-Amz-SignedHeaders","in":"header"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "UpdateFlow",
  {
    title: "UpdateFlow",
    description: " Updates an existing flow. ",
    inputSchema: { "X-Amz-Content-Sha256": z.string().optional(), "X-Amz-Date": z.string().optional(), "X-Amz-Algorithm": z.string().optional(), "X-Amz-Credential": z.string().optional(), "X-Amz-Security-Token": z.string().optional(), "X-Amz-Signature": z.string().optional(), "X-Amz-SignedHeaders": z.string().optional(), "body": z.object({ "flowName": z.string(), "description": z.string().optional(), "triggerConfig": z.object({ "triggerType": z.any().optional(), "triggerProperties": z.any().optional() }), "sourceFlowConfig": z.object({ "connectorType": z.any().optional(), "apiVersion": z.any().optional(), "connectorProfileName": z.any().optional(), "sourceConnectorProperties": z.any().optional(), "incrementalPullConfig": z.any().optional() }), "destinationFlowConfigList": z.array(z.object({ "connectorType": z.any(), "apiVersion": z.any().optional(), "connectorProfileName": z.any().optional(), "destinationConnectorProperties": z.any() })), "tasks": z.array(z.object({ "sourceFields": z.any(), "connectorOperator": z.any().optional(), "destinationField": z.any().optional(), "taskType": z.any(), "taskProperties": z.any().optional() })), "metadataCatalogConfig": z.object({ "glueDataCatalog": z.any().optional() }).optional(), "clientToken": z.string().optional() }) },
  },
  async (args) => callApi({"method":"POST","path":"/update-flow","params":[{"name":"X-Amz-Content-Sha256","in":"header"},{"name":"X-Amz-Date","in":"header"},{"name":"X-Amz-Algorithm","in":"header"},{"name":"X-Amz-Credential","in":"header"},{"name":"X-Amz-Security-Token","in":"header"},{"name":"X-Amz-Signature","in":"header"},{"name":"X-Amz-SignedHeaders","in":"header"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

await server.connect(new StdioServerTransport());
