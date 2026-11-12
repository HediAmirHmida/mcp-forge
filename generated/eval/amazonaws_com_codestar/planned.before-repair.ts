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

const BASE_URL = process.env.API_BASE_URL ?? "http://codestar.{region}.amazonaws.com";
const server = new McpServer({ name: "aws-codestar", version: "1.0.0" });

server.registerTool(
  "create_project",
  {
    title: "CreateProject",
    description: "Creates a new AWS CodeStar project including its associated resources and source code. Use this when you need to bootstrap a new development project environment. Do not use this for updating existing projects.",
    inputSchema: { "X-Amz-Content-Sha256": z.string().optional(), "X-Amz-Date": z.string().optional(), "X-Amz-Algorithm": z.string().optional(), "X-Amz-Credential": z.string().optional(), "X-Amz-Security-Token": z.string().optional(), "X-Amz-Signature": z.string().optional(), "X-Amz-SignedHeaders": z.string().optional(), "X-Amz-Target": z.enum(["CodeStar_20170419.CreateProject"]), "body": z.object({ "name": z.any(), "id": z.any(), "description": z.any().optional(), "clientRequestToken": z.any().optional(), "sourceCode": z.any().optional(), "toolchain": z.any().optional(), "tags": z.any().optional() }) },
  },
  async (args) => callApi({"method":"POST","path":"/#X-Amz-Target=CodeStar_20170419.CreateProject","params":[{"name":"X-Amz-Content-Sha256","in":"header"},{"name":"X-Amz-Date","in":"header"},{"name":"X-Amz-Algorithm","in":"header"},{"name":"X-Amz-Credential","in":"header"},{"name":"X-Amz-Security-Token","in":"header"},{"name":"X-Amz-Signature","in":"header"},{"name":"X-Amz-SignedHeaders","in":"header"},{"name":"X-Amz-Target","in":"header"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "describe_project",
  {
    title: "DescribeProject",
    description: "Retrieves detailed information about a specific AWS CodeStar project and its resources. Use this to check project status and configuration details. Do not use this for listing all projects.",
    inputSchema: { "X-Amz-Content-Sha256": z.string().optional(), "X-Amz-Date": z.string().optional(), "X-Amz-Algorithm": z.string().optional(), "X-Amz-Credential": z.string().optional(), "X-Amz-Security-Token": z.string().optional(), "X-Amz-Signature": z.string().optional(), "X-Amz-SignedHeaders": z.string().optional(), "X-Amz-Target": z.enum(["CodeStar_20170419.DescribeProject"]), "body": z.object({ "id": z.any() }) },
  },
  async (args) => callApi({"method":"POST","path":"/#X-Amz-Target=CodeStar_20170419.DescribeProject","params":[{"name":"X-Amz-Content-Sha256","in":"header"},{"name":"X-Amz-Date","in":"header"},{"name":"X-Amz-Algorithm","in":"header"},{"name":"X-Amz-Credential","in":"header"},{"name":"X-Amz-Security-Token","in":"header"},{"name":"X-Amz-Signature","in":"header"},{"name":"X-Amz-SignedHeaders","in":"header"},{"name":"X-Amz-Target","in":"header"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "list_projects",
  {
    title: "ListProjects",
    description: "Lists all AWS CodeStar projects associated with your AWS account. Use this when you need to find project IDs or get an overview of available projects. Do not use this to check details of a single project.",
    inputSchema: { "X-Amz-Content-Sha256": z.string().optional(), "X-Amz-Date": z.string().optional(), "X-Amz-Algorithm": z.string().optional(), "X-Amz-Credential": z.string().optional(), "X-Amz-Security-Token": z.string().optional(), "X-Amz-Signature": z.string().optional(), "X-Amz-SignedHeaders": z.string().optional(), "X-Amz-Target": z.enum(["CodeStar_20170419.ListProjects"]), "body": z.object({ "nextToken": z.any().optional(), "maxResults": z.any().optional() }) },
  },
  async (args) => callApi({"method":"POST","path":"/#X-Amz-Target=CodeStar_20170419.ListProjects","params":[{"name":"X-Amz-Content-Sha256","in":"header"},{"name":"X-Amz-Date","in":"header"},{"name":"X-Amz-Algorithm","in":"header"},{"name":"X-Amz-Credential","in":"header"},{"name":"X-Amz-Security-Token","in":"header"},{"name":"X-Amz-Signature","in":"header"},{"name":"X-Amz-SignedHeaders","in":"header"},{"name":"X-Amz-Target","in":"header"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "update_project",
  {
    title: "UpdateProject",
    description: "Updates an existing AWS CodeStar project's details such as display name or description. Use this when project metadata needs modification. Do not use this for changing team members or project resources.",
    inputSchema: { "X-Amz-Content-Sha256": z.string().optional(), "X-Amz-Date": z.string().optional(), "X-Amz-Algorithm": z.string().optional(), "X-Amz-Credential": z.string().optional(), "X-Amz-Security-Token": z.string().optional(), "X-Amz-Signature": z.string().optional(), "X-Amz-SignedHeaders": z.string().optional(), "X-Amz-Target": z.enum(["CodeStar_20170419.UpdateProject"]), "body": z.object({ "id": z.any(), "name": z.any().optional(), "description": z.any().optional() }) },
  },
  async (args) => callApi({"method":"POST","path":"/#X-Amz-Target=CodeStar_20170419.UpdateProject","params":[{"name":"X-Amz-Content-Sha256","in":"header"},{"name":"X-Amz-Date","in":"header"},{"name":"X-Amz-Algorithm","in":"header"},{"name":"X-Amz-Credential","in":"header"},{"name":"X-Amz-Security-Token","in":"header"},{"name":"X-Amz-Signature","in":"header"},{"name":"X-Amz-SignedHeaders","in":"header"},{"name":"X-Amz-Target","in":"header"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "delete_project",
  {
    title: "DeleteProject",
    description: "Deletes a project and its associated resources in AWS CodeStar. Use this action only when a project is permanently decommissioned. Do not use this if you only want to remove team members.",
    inputSchema: { "X-Amz-Content-Sha256": z.string().optional(), "X-Amz-Date": z.string().optional(), "X-Amz-Algorithm": z.string().optional(), "X-Amz-Credential": z.string().optional(), "X-Amz-Security-Token": z.string().optional(), "X-Amz-Signature": z.string().optional(), "X-Amz-SignedHeaders": z.string().optional(), "X-Amz-Target": z.enum(["CodeStar_20170419.DeleteProject"]), "body": z.object({ "id": z.any(), "clientRequestToken": z.any().optional(), "deleteStack": z.any().optional() }) },
  },
  async (args) => callApi({"method":"POST","path":"/#X-Amz-Target=CodeStar_20170419.DeleteProject","params":[{"name":"X-Amz-Content-Sha256","in":"header"},{"name":"X-Amz-Date","in":"header"},{"name":"X-Amz-Algorithm","in":"header"},{"name":"X-Amz-Credential","in":"header"},{"name":"X-Amz-Security-Token","in":"header"},{"name":"X-Amz-Signature","in":"header"},{"name":"X-Amz-SignedHeaders","in":"header"},{"name":"X-Amz-Target","in":"header"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "list_resources",
  {
    title: "ListResources",
    description: "Lists all resources associated with a specific AWS CodeStar project. Use this to inspect project dependencies like repositories, pipelines, and compute resources.",
    inputSchema: { "X-Amz-Content-Sha256": z.string().optional(), "X-Amz-Date": z.string().optional(), "X-Amz-Algorithm": z.string().optional(), "X-Amz-Credential": z.string().optional(), "X-Amz-Security-Token": z.string().optional(), "X-Amz-Signature": z.string().optional(), "X-Amz-SignedHeaders": z.string().optional(), "X-Amz-Target": z.enum(["CodeStar_20170419.ListResources"]), "body": z.object({ "projectId": z.any(), "nextToken": z.any().optional(), "maxResults": z.any().optional() }) },
  },
  async (args) => callApi({"method":"POST","path":"/#X-Amz-Target=CodeStar_20170419.ListResources","params":[{"name":"X-Amz-Content-Sha256","in":"header"},{"name":"X-Amz-Date","in":"header"},{"name":"X-Amz-Algorithm","in":"header"},{"name":"X-Amz-Credential","in":"header"},{"name":"X-Amz-Security-Token","in":"header"},{"name":"X-Amz-Signature","in":"header"},{"name":"X-Amz-SignedHeaders","in":"header"},{"name":"X-Amz-Target","in":"header"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "associate_team_member",
  {
    title: "AssociateTeamMember",
    description: "Adds an IAM user to the team for a specific AWS CodeStar project with a designated role. Use this to grant project access to a team member.",
    inputSchema: { "X-Amz-Content-Sha256": z.string().optional(), "X-Amz-Date": z.string().optional(), "X-Amz-Algorithm": z.string().optional(), "X-Amz-Credential": z.string().optional(), "X-Amz-Security-Token": z.string().optional(), "X-Amz-Signature": z.string().optional(), "X-Amz-SignedHeaders": z.string().optional(), "X-Amz-Target": z.enum(["CodeStar_20170419.AssociateTeamMember"]), "body": z.object({ "projectId": z.any(), "clientRequestToken": z.any().optional(), "userArn": z.any(), "projectRole": z.any(), "remoteAccessAllowed": z.any().optional() }) },
  },
  async (args) => callApi({"method":"POST","path":"/#X-Amz-Target=CodeStar_20170419.AssociateTeamMember","params":[{"name":"X-Amz-Content-Sha256","in":"header"},{"name":"X-Amz-Date","in":"header"},{"name":"X-Amz-Algorithm","in":"header"},{"name":"X-Amz-Credential","in":"header"},{"name":"X-Amz-Security-Token","in":"header"},{"name":"X-Amz-Signature","in":"header"},{"name":"X-Amz-SignedHeaders","in":"header"},{"name":"X-Amz-Target","in":"header"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "list_team_members",
  {
    title: "ListTeamMembers",
    description: "Lists all team members associated with an AWS CodeStar project. Use this to audit or view who currently has access to a project.",
    inputSchema: { "X-Amz-Content-Sha256": z.string().optional(), "X-Amz-Date": z.string().optional(), "X-Amz-Algorithm": z.string().optional(), "X-Amz-Credential": z.string().optional(), "X-Amz-Security-Token": z.string().optional(), "X-Amz-Signature": z.string().optional(), "X-Amz-SignedHeaders": z.string().optional(), "X-Amz-Target": z.enum(["CodeStar_20170419.ListTeamMembers"]), "body": z.object({ "projectId": z.any(), "nextToken": z.any().optional(), "maxResults": z.any().optional() }) },
  },
  async (args) => callApi({"method":"POST","path":"/#X-Amz-Target=CodeStar_20170419.ListTeamMembers","params":[{"name":"X-Amz-Content-Sha256","in":"header"},{"name":"X-Amz-Date","in":"header"},{"name":"X-Amz-Algorithm","in":"header"},{"name":"X-Amz-Credential","in":"header"},{"name":"X-Amz-Security-Token","in":"header"},{"name":"X-Amz-Signature","in":"header"},{"name":"X-Amz-SignedHeaders","in":"header"},{"name":"X-Amz-Target","in":"header"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "disassociate_team_member",
  {
    title: "DisassociateTeamMember",
    description: "Removes a user from an AWS CodeStar project and revokes their project access. Use this when a team member no longer requires project access.",
    inputSchema: { "X-Amz-Content-Sha256": z.string().optional(), "X-Amz-Date": z.string().optional(), "X-Amz-Algorithm": z.string().optional(), "X-Amz-Credential": z.string().optional(), "X-Amz-Security-Token": z.string().optional(), "X-Amz-Signature": z.string().optional(), "X-Amz-SignedHeaders": z.string().optional(), "X-Amz-Target": z.enum(["CodeStar_20170419.DisassociateTeamMember"]), "body": z.object({ "projectId": z.any(), "userArn": z.any() }) },
  },
  async (args) => callApi({"method":"POST","path":"/#X-Amz-Target=CodeStar_20170419.DisassociateTeamMember","params":[{"name":"X-Amz-Content-Sha256","in":"header"},{"name":"X-Amz-Date","in":"header"},{"name":"X-Amz-Algorithm","in":"header"},{"name":"X-Amz-Credential","in":"header"},{"name":"X-Amz-Security-Token","in":"header"},{"name":"X-Amz-Signature","in":"header"},{"name":"X-Amz-SignedHeaders","in":"header"},{"name":"X-Amz-Target","in":"header"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "create_user_profile",
  {
    title: "CreateUserProfile",
    description: "Creates a user profile in AWS CodeStar containing user preferences such as display name and email address. Use this before adding a user to projects if no profile exists.",
    inputSchema: { "X-Amz-Content-Sha256": z.string().optional(), "X-Amz-Date": z.string().optional(), "X-Amz-Algorithm": z.string().optional(), "X-Amz-Credential": z.string().optional(), "X-Amz-Security-Token": z.string().optional(), "X-Amz-Signature": z.string().optional(), "X-Amz-SignedHeaders": z.string().optional(), "X-Amz-Target": z.enum(["CodeStar_20170419.CreateUserProfile"]), "body": z.object({ "userArn": z.any(), "displayName": z.any(), "emailAddress": z.any(), "sshPublicKey": z.any().optional() }) },
  },
  async (args) => callApi({"method":"POST","path":"/#X-Amz-Target=CodeStar_20170419.CreateUserProfile","params":[{"name":"X-Amz-Content-Sha256","in":"header"},{"name":"X-Amz-Date","in":"header"},{"name":"X-Amz-Algorithm","in":"header"},{"name":"X-Amz-Credential","in":"header"},{"name":"X-Amz-Security-Token","in":"header"},{"name":"X-Amz-Signature","in":"header"},{"name":"X-Amz-SignedHeaders","in":"header"},{"name":"X-Amz-Target","in":"header"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "describe_user_profile",
  {
    title: "DescribeUserProfile",
    description: "Describes a user profile in AWS CodeStar across all projects. Use this to retrieve global user attributes and preferences.",
    inputSchema: { "X-Amz-Content-Sha256": z.string().optional(), "X-Amz-Date": z.string().optional(), "X-Amz-Algorithm": z.string().optional(), "X-Amz-Credential": z.string().optional(), "X-Amz-Security-Token": z.string().optional(), "X-Amz-Signature": z.string().optional(), "X-Amz-SignedHeaders": z.string().optional(), "X-Amz-Target": z.enum(["CodeStar_20170419.DescribeUserProfile"]), "body": z.object({ "userArn": z.any() }) },
  },
  async (args) => callApi({"method":"POST","path":"/#X-Amz-Target=CodeStar_20170419.DescribeUserProfile","params":[{"name":"X-Amz-Content-Sha256","in":"header"},{"name":"X-Amz-Date","in":"header"},{"name":"X-Amz-Algorithm","in":"header"},{"name":"X-Amz-Credential","in":"header"},{"name":"X-Amz-Security-Token","in":"header"},{"name":"X-Amz-Signature","in":"header"},{"name":"X-Amz-SignedHeaders","in":"header"},{"name":"X-Amz-Target","in":"header"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "list_user_profiles",
  {
    title: "ListUserProfiles",
    description: "Lists all user profiles configured for your AWS account in CodeStar. Use this to view all registered users in the account system.",
    inputSchema: { "X-Amz-Content-Sha256": z.string().optional(), "X-Amz-Date": z.string().optional(), "X-Amz-Algorithm": z.string().optional(), "X-Amz-Credential": z.string().optional(), "X-Amz-Security-Token": z.string().optional(), "X-Amz-Signature": z.string().optional(), "X-Amz-SignedHeaders": z.string().optional(), "X-Amz-Target": z.enum(["CodeStar_20170419.ListUserProfiles"]), "body": z.object({ "nextToken": z.any().optional(), "maxResults": z.any().optional() }) },
  },
  async (args) => callApi({"method":"POST","path":"/#X-Amz-Target=CodeStar_20170419.ListUserProfiles","params":[{"name":"X-Amz-Content-Sha256","in":"header"},{"name":"X-Amz-Date","in":"header"},{"name":"X-Amz-Algorithm","in":"header"},{"name":"X-Amz-Credential","in":"header"},{"name":"X-Amz-Security-Token","in":"header"},{"name":"X-Amz-Signature","in":"header"},{"name":"X-Amz-SignedHeaders","in":"header"},{"name":"X-Amz-Target","in":"header"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

await server.connect(new StdioServerTransport());
