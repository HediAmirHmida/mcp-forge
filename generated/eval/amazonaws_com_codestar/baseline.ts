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
  "AssociateTeamMember",
  {
    title: "AssociateTeamMember",
    description: "Adds an IAM user to the team for an AWS CodeStar project.",
    inputSchema: { "X-Amz-Content-Sha256": z.string().optional(), "X-Amz-Date": z.string().optional(), "X-Amz-Algorithm": z.string().optional(), "X-Amz-Credential": z.string().optional(), "X-Amz-Security-Token": z.string().optional(), "X-Amz-Signature": z.string().optional(), "X-Amz-SignedHeaders": z.string().optional(), "X-Amz-Target": z.enum(["CodeStar_20170419.AssociateTeamMember"]), "body": z.object({ "projectId": z.any(), "clientRequestToken": z.any().optional(), "userArn": z.any(), "projectRole": z.any(), "remoteAccessAllowed": z.any().optional() }) },
  },
  async (args) => callApi({"method":"POST","path":"/#X-Amz-Target=CodeStar_20170419.AssociateTeamMember","params":[{"name":"X-Amz-Content-Sha256","in":"header"},{"name":"X-Amz-Date","in":"header"},{"name":"X-Amz-Algorithm","in":"header"},{"name":"X-Amz-Credential","in":"header"},{"name":"X-Amz-Security-Token","in":"header"},{"name":"X-Amz-Signature","in":"header"},{"name":"X-Amz-SignedHeaders","in":"header"},{"name":"X-Amz-Target","in":"header"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "CreateProject",
  {
    title: "CreateProject",
    description: "Creates a project, including project resources. This action creates a project based on a submitted project request. A set of source code files and a toolchain template file can be included with the project request. If these are not provided, an empty project is created.",
    inputSchema: { "X-Amz-Content-Sha256": z.string().optional(), "X-Amz-Date": z.string().optional(), "X-Amz-Algorithm": z.string().optional(), "X-Amz-Credential": z.string().optional(), "X-Amz-Security-Token": z.string().optional(), "X-Amz-Signature": z.string().optional(), "X-Amz-SignedHeaders": z.string().optional(), "X-Amz-Target": z.enum(["CodeStar_20170419.CreateProject"]), "body": z.object({ "name": z.any(), "id": z.any(), "description": z.any().optional(), "clientRequestToken": z.any().optional(), "sourceCode": z.any().optional(), "toolchain": z.any().optional(), "tags": z.any().optional() }) },
  },
  async (args) => callApi({"method":"POST","path":"/#X-Amz-Target=CodeStar_20170419.CreateProject","params":[{"name":"X-Amz-Content-Sha256","in":"header"},{"name":"X-Amz-Date","in":"header"},{"name":"X-Amz-Algorithm","in":"header"},{"name":"X-Amz-Credential","in":"header"},{"name":"X-Amz-Security-Token","in":"header"},{"name":"X-Amz-Signature","in":"header"},{"name":"X-Amz-SignedHeaders","in":"header"},{"name":"X-Amz-Target","in":"header"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "CreateUserProfile",
  {
    title: "CreateUserProfile",
    description: "Creates a profile for a user that includes user preferences, such as the display name and email address assocciated with the user, in AWS CodeStar. The user profile is not project-specific. Information in the user profile is displayed wherever the user's information appears to other users in AWS CodeStar.",
    inputSchema: { "X-Amz-Content-Sha256": z.string().optional(), "X-Amz-Date": z.string().optional(), "X-Amz-Algorithm": z.string().optional(), "X-Amz-Credential": z.string().optional(), "X-Amz-Security-Token": z.string().optional(), "X-Amz-Signature": z.string().optional(), "X-Amz-SignedHeaders": z.string().optional(), "X-Amz-Target": z.enum(["CodeStar_20170419.CreateUserProfile"]), "body": z.object({ "userArn": z.any(), "displayName": z.any(), "emailAddress": z.any(), "sshPublicKey": z.any().optional() }) },
  },
  async (args) => callApi({"method":"POST","path":"/#X-Amz-Target=CodeStar_20170419.CreateUserProfile","params":[{"name":"X-Amz-Content-Sha256","in":"header"},{"name":"X-Amz-Date","in":"header"},{"name":"X-Amz-Algorithm","in":"header"},{"name":"X-Amz-Credential","in":"header"},{"name":"X-Amz-Security-Token","in":"header"},{"name":"X-Amz-Signature","in":"header"},{"name":"X-Amz-SignedHeaders","in":"header"},{"name":"X-Amz-Target","in":"header"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "DeleteProject",
  {
    title: "DeleteProject",
    description: "Deletes a project, including project resources. Does not delete users associated with the project, but does delete the IAM roles that allowed access to the project.",
    inputSchema: { "X-Amz-Content-Sha256": z.string().optional(), "X-Amz-Date": z.string().optional(), "X-Amz-Algorithm": z.string().optional(), "X-Amz-Credential": z.string().optional(), "X-Amz-Security-Token": z.string().optional(), "X-Amz-Signature": z.string().optional(), "X-Amz-SignedHeaders": z.string().optional(), "X-Amz-Target": z.enum(["CodeStar_20170419.DeleteProject"]), "body": z.object({ "id": z.any(), "clientRequestToken": z.any().optional(), "deleteStack": z.any().optional() }) },
  },
  async (args) => callApi({"method":"POST","path":"/#X-Amz-Target=CodeStar_20170419.DeleteProject","params":[{"name":"X-Amz-Content-Sha256","in":"header"},{"name":"X-Amz-Date","in":"header"},{"name":"X-Amz-Algorithm","in":"header"},{"name":"X-Amz-Credential","in":"header"},{"name":"X-Amz-Security-Token","in":"header"},{"name":"X-Amz-Signature","in":"header"},{"name":"X-Amz-SignedHeaders","in":"header"},{"name":"X-Amz-Target","in":"header"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "DeleteUserProfile",
  {
    title: "DeleteUserProfile",
    description: "Deletes a user profile in AWS CodeStar, including all personal preference data associated with that profile, such as display name and email address. It does not delete the history of that user, for example the history of commits made by that user.",
    inputSchema: { "X-Amz-Content-Sha256": z.string().optional(), "X-Amz-Date": z.string().optional(), "X-Amz-Algorithm": z.string().optional(), "X-Amz-Credential": z.string().optional(), "X-Amz-Security-Token": z.string().optional(), "X-Amz-Signature": z.string().optional(), "X-Amz-SignedHeaders": z.string().optional(), "X-Amz-Target": z.enum(["CodeStar_20170419.DeleteUserProfile"]), "body": z.object({ "userArn": z.any() }) },
  },
  async (args) => callApi({"method":"POST","path":"/#X-Amz-Target=CodeStar_20170419.DeleteUserProfile","params":[{"name":"X-Amz-Content-Sha256","in":"header"},{"name":"X-Amz-Date","in":"header"},{"name":"X-Amz-Algorithm","in":"header"},{"name":"X-Amz-Credential","in":"header"},{"name":"X-Amz-Security-Token","in":"header"},{"name":"X-Amz-Signature","in":"header"},{"name":"X-Amz-SignedHeaders","in":"header"},{"name":"X-Amz-Target","in":"header"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "DescribeProject",
  {
    title: "DescribeProject",
    description: "Describes a project and its resources.",
    inputSchema: { "X-Amz-Content-Sha256": z.string().optional(), "X-Amz-Date": z.string().optional(), "X-Amz-Algorithm": z.string().optional(), "X-Amz-Credential": z.string().optional(), "X-Amz-Security-Token": z.string().optional(), "X-Amz-Signature": z.string().optional(), "X-Amz-SignedHeaders": z.string().optional(), "X-Amz-Target": z.enum(["CodeStar_20170419.DescribeProject"]), "body": z.object({ "id": z.any() }) },
  },
  async (args) => callApi({"method":"POST","path":"/#X-Amz-Target=CodeStar_20170419.DescribeProject","params":[{"name":"X-Amz-Content-Sha256","in":"header"},{"name":"X-Amz-Date","in":"header"},{"name":"X-Amz-Algorithm","in":"header"},{"name":"X-Amz-Credential","in":"header"},{"name":"X-Amz-Security-Token","in":"header"},{"name":"X-Amz-Signature","in":"header"},{"name":"X-Amz-SignedHeaders","in":"header"},{"name":"X-Amz-Target","in":"header"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "DescribeUserProfile",
  {
    title: "DescribeUserProfile",
    description: "Describes a user in AWS CodeStar and the user attributes across all projects.",
    inputSchema: { "X-Amz-Content-Sha256": z.string().optional(), "X-Amz-Date": z.string().optional(), "X-Amz-Algorithm": z.string().optional(), "X-Amz-Credential": z.string().optional(), "X-Amz-Security-Token": z.string().optional(), "X-Amz-Signature": z.string().optional(), "X-Amz-SignedHeaders": z.string().optional(), "X-Amz-Target": z.enum(["CodeStar_20170419.DescribeUserProfile"]), "body": z.object({ "userArn": z.any() }) },
  },
  async (args) => callApi({"method":"POST","path":"/#X-Amz-Target=CodeStar_20170419.DescribeUserProfile","params":[{"name":"X-Amz-Content-Sha256","in":"header"},{"name":"X-Amz-Date","in":"header"},{"name":"X-Amz-Algorithm","in":"header"},{"name":"X-Amz-Credential","in":"header"},{"name":"X-Amz-Security-Token","in":"header"},{"name":"X-Amz-Signature","in":"header"},{"name":"X-Amz-SignedHeaders","in":"header"},{"name":"X-Amz-Target","in":"header"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "DisassociateTeamMember",
  {
    title: "DisassociateTeamMember",
    description: "Removes a user from a project. Removing a user from a project also removes the IAM policies from that user that allowed access to the project and its resources. Disassociating a team member does not remove that user's profile from AWS CodeStar. It does not remove the user from IAM.",
    inputSchema: { "X-Amz-Content-Sha256": z.string().optional(), "X-Amz-Date": z.string().optional(), "X-Amz-Algorithm": z.string().optional(), "X-Amz-Credential": z.string().optional(), "X-Amz-Security-Token": z.string().optional(), "X-Amz-Signature": z.string().optional(), "X-Amz-SignedHeaders": z.string().optional(), "X-Amz-Target": z.enum(["CodeStar_20170419.DisassociateTeamMember"]), "body": z.object({ "projectId": z.any(), "userArn": z.any() }) },
  },
  async (args) => callApi({"method":"POST","path":"/#X-Amz-Target=CodeStar_20170419.DisassociateTeamMember","params":[{"name":"X-Amz-Content-Sha256","in":"header"},{"name":"X-Amz-Date","in":"header"},{"name":"X-Amz-Algorithm","in":"header"},{"name":"X-Amz-Credential","in":"header"},{"name":"X-Amz-Security-Token","in":"header"},{"name":"X-Amz-Signature","in":"header"},{"name":"X-Amz-SignedHeaders","in":"header"},{"name":"X-Amz-Target","in":"header"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "ListProjects",
  {
    title: "ListProjects",
    description: "Lists all projects in AWS CodeStar associated with your AWS account.",
    inputSchema: { "X-Amz-Content-Sha256": z.string().optional(), "X-Amz-Date": z.string().optional(), "X-Amz-Algorithm": z.string().optional(), "X-Amz-Credential": z.string().optional(), "X-Amz-Security-Token": z.string().optional(), "X-Amz-Signature": z.string().optional(), "X-Amz-SignedHeaders": z.string().optional(), "X-Amz-Target": z.enum(["CodeStar_20170419.ListProjects"]), "body": z.object({ "nextToken": z.any().optional(), "maxResults": z.any().optional() }) },
  },
  async (args) => callApi({"method":"POST","path":"/#X-Amz-Target=CodeStar_20170419.ListProjects","params":[{"name":"X-Amz-Content-Sha256","in":"header"},{"name":"X-Amz-Date","in":"header"},{"name":"X-Amz-Algorithm","in":"header"},{"name":"X-Amz-Credential","in":"header"},{"name":"X-Amz-Security-Token","in":"header"},{"name":"X-Amz-Signature","in":"header"},{"name":"X-Amz-SignedHeaders","in":"header"},{"name":"X-Amz-Target","in":"header"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "ListResources",
  {
    title: "ListResources",
    description: "Lists resources associated with a project in AWS CodeStar.",
    inputSchema: { "X-Amz-Content-Sha256": z.string().optional(), "X-Amz-Date": z.string().optional(), "X-Amz-Algorithm": z.string().optional(), "X-Amz-Credential": z.string().optional(), "X-Amz-Security-Token": z.string().optional(), "X-Amz-Signature": z.string().optional(), "X-Amz-SignedHeaders": z.string().optional(), "X-Amz-Target": z.enum(["CodeStar_20170419.ListResources"]), "body": z.object({ "projectId": z.any(), "nextToken": z.any().optional(), "maxResults": z.any().optional() }) },
  },
  async (args) => callApi({"method":"POST","path":"/#X-Amz-Target=CodeStar_20170419.ListResources","params":[{"name":"X-Amz-Content-Sha256","in":"header"},{"name":"X-Amz-Date","in":"header"},{"name":"X-Amz-Algorithm","in":"header"},{"name":"X-Amz-Credential","in":"header"},{"name":"X-Amz-Security-Token","in":"header"},{"name":"X-Amz-Signature","in":"header"},{"name":"X-Amz-SignedHeaders","in":"header"},{"name":"X-Amz-Target","in":"header"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "ListTagsForProject",
  {
    title: "ListTagsForProject",
    description: "Gets the tags for a project.",
    inputSchema: { "X-Amz-Content-Sha256": z.string().optional(), "X-Amz-Date": z.string().optional(), "X-Amz-Algorithm": z.string().optional(), "X-Amz-Credential": z.string().optional(), "X-Amz-Security-Token": z.string().optional(), "X-Amz-Signature": z.string().optional(), "X-Amz-SignedHeaders": z.string().optional(), "X-Amz-Target": z.enum(["CodeStar_20170419.ListTagsForProject"]), "body": z.object({ "id": z.any(), "nextToken": z.any().optional(), "maxResults": z.any().optional() }) },
  },
  async (args) => callApi({"method":"POST","path":"/#X-Amz-Target=CodeStar_20170419.ListTagsForProject","params":[{"name":"X-Amz-Content-Sha256","in":"header"},{"name":"X-Amz-Date","in":"header"},{"name":"X-Amz-Algorithm","in":"header"},{"name":"X-Amz-Credential","in":"header"},{"name":"X-Amz-Security-Token","in":"header"},{"name":"X-Amz-Signature","in":"header"},{"name":"X-Amz-SignedHeaders","in":"header"},{"name":"X-Amz-Target","in":"header"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "ListTeamMembers",
  {
    title: "ListTeamMembers",
    description: "Lists all team members associated with a project.",
    inputSchema: { "X-Amz-Content-Sha256": z.string().optional(), "X-Amz-Date": z.string().optional(), "X-Amz-Algorithm": z.string().optional(), "X-Amz-Credential": z.string().optional(), "X-Amz-Security-Token": z.string().optional(), "X-Amz-Signature": z.string().optional(), "X-Amz-SignedHeaders": z.string().optional(), "X-Amz-Target": z.enum(["CodeStar_20170419.ListTeamMembers"]), "body": z.object({ "projectId": z.any(), "nextToken": z.any().optional(), "maxResults": z.any().optional() }) },
  },
  async (args) => callApi({"method":"POST","path":"/#X-Amz-Target=CodeStar_20170419.ListTeamMembers","params":[{"name":"X-Amz-Content-Sha256","in":"header"},{"name":"X-Amz-Date","in":"header"},{"name":"X-Amz-Algorithm","in":"header"},{"name":"X-Amz-Credential","in":"header"},{"name":"X-Amz-Security-Token","in":"header"},{"name":"X-Amz-Signature","in":"header"},{"name":"X-Amz-SignedHeaders","in":"header"},{"name":"X-Amz-Target","in":"header"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "ListUserProfiles",
  {
    title: "ListUserProfiles",
    description: "Lists all the user profiles configured for your AWS account in AWS CodeStar.",
    inputSchema: { "X-Amz-Content-Sha256": z.string().optional(), "X-Amz-Date": z.string().optional(), "X-Amz-Algorithm": z.string().optional(), "X-Amz-Credential": z.string().optional(), "X-Amz-Security-Token": z.string().optional(), "X-Amz-Signature": z.string().optional(), "X-Amz-SignedHeaders": z.string().optional(), "X-Amz-Target": z.enum(["CodeStar_20170419.ListUserProfiles"]), "body": z.object({ "nextToken": z.any().optional(), "maxResults": z.any().optional() }) },
  },
  async (args) => callApi({"method":"POST","path":"/#X-Amz-Target=CodeStar_20170419.ListUserProfiles","params":[{"name":"X-Amz-Content-Sha256","in":"header"},{"name":"X-Amz-Date","in":"header"},{"name":"X-Amz-Algorithm","in":"header"},{"name":"X-Amz-Credential","in":"header"},{"name":"X-Amz-Security-Token","in":"header"},{"name":"X-Amz-Signature","in":"header"},{"name":"X-Amz-SignedHeaders","in":"header"},{"name":"X-Amz-Target","in":"header"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "TagProject",
  {
    title: "TagProject",
    description: "Adds tags to a project.",
    inputSchema: { "X-Amz-Content-Sha256": z.string().optional(), "X-Amz-Date": z.string().optional(), "X-Amz-Algorithm": z.string().optional(), "X-Amz-Credential": z.string().optional(), "X-Amz-Security-Token": z.string().optional(), "X-Amz-Signature": z.string().optional(), "X-Amz-SignedHeaders": z.string().optional(), "X-Amz-Target": z.enum(["CodeStar_20170419.TagProject"]), "body": z.object({ "id": z.any(), "tags": z.any() }) },
  },
  async (args) => callApi({"method":"POST","path":"/#X-Amz-Target=CodeStar_20170419.TagProject","params":[{"name":"X-Amz-Content-Sha256","in":"header"},{"name":"X-Amz-Date","in":"header"},{"name":"X-Amz-Algorithm","in":"header"},{"name":"X-Amz-Credential","in":"header"},{"name":"X-Amz-Security-Token","in":"header"},{"name":"X-Amz-Signature","in":"header"},{"name":"X-Amz-SignedHeaders","in":"header"},{"name":"X-Amz-Target","in":"header"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "UntagProject",
  {
    title: "UntagProject",
    description: "Removes tags from a project.",
    inputSchema: { "X-Amz-Content-Sha256": z.string().optional(), "X-Amz-Date": z.string().optional(), "X-Amz-Algorithm": z.string().optional(), "X-Amz-Credential": z.string().optional(), "X-Amz-Security-Token": z.string().optional(), "X-Amz-Signature": z.string().optional(), "X-Amz-SignedHeaders": z.string().optional(), "X-Amz-Target": z.enum(["CodeStar_20170419.UntagProject"]), "body": z.object({ "id": z.any(), "tags": z.any() }) },
  },
  async (args) => callApi({"method":"POST","path":"/#X-Amz-Target=CodeStar_20170419.UntagProject","params":[{"name":"X-Amz-Content-Sha256","in":"header"},{"name":"X-Amz-Date","in":"header"},{"name":"X-Amz-Algorithm","in":"header"},{"name":"X-Amz-Credential","in":"header"},{"name":"X-Amz-Security-Token","in":"header"},{"name":"X-Amz-Signature","in":"header"},{"name":"X-Amz-SignedHeaders","in":"header"},{"name":"X-Amz-Target","in":"header"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "UpdateProject",
  {
    title: "UpdateProject",
    description: "Updates a project in AWS CodeStar.",
    inputSchema: { "X-Amz-Content-Sha256": z.string().optional(), "X-Amz-Date": z.string().optional(), "X-Amz-Algorithm": z.string().optional(), "X-Amz-Credential": z.string().optional(), "X-Amz-Security-Token": z.string().optional(), "X-Amz-Signature": z.string().optional(), "X-Amz-SignedHeaders": z.string().optional(), "X-Amz-Target": z.enum(["CodeStar_20170419.UpdateProject"]), "body": z.object({ "id": z.any(), "name": z.any().optional(), "description": z.any().optional() }) },
  },
  async (args) => callApi({"method":"POST","path":"/#X-Amz-Target=CodeStar_20170419.UpdateProject","params":[{"name":"X-Amz-Content-Sha256","in":"header"},{"name":"X-Amz-Date","in":"header"},{"name":"X-Amz-Algorithm","in":"header"},{"name":"X-Amz-Credential","in":"header"},{"name":"X-Amz-Security-Token","in":"header"},{"name":"X-Amz-Signature","in":"header"},{"name":"X-Amz-SignedHeaders","in":"header"},{"name":"X-Amz-Target","in":"header"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "UpdateTeamMember",
  {
    title: "UpdateTeamMember",
    description: "Updates a team member's attributes in an AWS CodeStar project. For example, you can change a team member's role in the project, or change whether they have remote access to project resources.",
    inputSchema: { "X-Amz-Content-Sha256": z.string().optional(), "X-Amz-Date": z.string().optional(), "X-Amz-Algorithm": z.string().optional(), "X-Amz-Credential": z.string().optional(), "X-Amz-Security-Token": z.string().optional(), "X-Amz-Signature": z.string().optional(), "X-Amz-SignedHeaders": z.string().optional(), "X-Amz-Target": z.enum(["CodeStar_20170419.UpdateTeamMember"]), "body": z.object({ "projectId": z.any(), "userArn": z.any(), "projectRole": z.any().optional(), "remoteAccessAllowed": z.any().optional() }) },
  },
  async (args) => callApi({"method":"POST","path":"/#X-Amz-Target=CodeStar_20170419.UpdateTeamMember","params":[{"name":"X-Amz-Content-Sha256","in":"header"},{"name":"X-Amz-Date","in":"header"},{"name":"X-Amz-Algorithm","in":"header"},{"name":"X-Amz-Credential","in":"header"},{"name":"X-Amz-Security-Token","in":"header"},{"name":"X-Amz-Signature","in":"header"},{"name":"X-Amz-SignedHeaders","in":"header"},{"name":"X-Amz-Target","in":"header"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "UpdateUserProfile",
  {
    title: "UpdateUserProfile",
    description: "Updates a user's profile in AWS CodeStar. The user profile is not project-specific. Information in the user profile is displayed wherever the user's information appears to other users in AWS CodeStar. ",
    inputSchema: { "X-Amz-Content-Sha256": z.string().optional(), "X-Amz-Date": z.string().optional(), "X-Amz-Algorithm": z.string().optional(), "X-Amz-Credential": z.string().optional(), "X-Amz-Security-Token": z.string().optional(), "X-Amz-Signature": z.string().optional(), "X-Amz-SignedHeaders": z.string().optional(), "X-Amz-Target": z.enum(["CodeStar_20170419.UpdateUserProfile"]), "body": z.object({ "userArn": z.any(), "displayName": z.any().optional(), "emailAddress": z.any().optional(), "sshPublicKey": z.any().optional() }) },
  },
  async (args) => callApi({"method":"POST","path":"/#X-Amz-Target=CodeStar_20170419.UpdateUserProfile","params":[{"name":"X-Amz-Content-Sha256","in":"header"},{"name":"X-Amz-Date","in":"header"},{"name":"X-Amz-Algorithm","in":"header"},{"name":"X-Amz-Credential","in":"header"},{"name":"X-Amz-Security-Token","in":"header"},{"name":"X-Amz-Signature","in":"header"},{"name":"X-Amz-SignedHeaders","in":"header"},{"name":"X-Amz-Target","in":"header"}],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

await server.connect(new StdioServerTransport());
