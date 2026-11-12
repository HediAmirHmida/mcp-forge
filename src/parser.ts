import SwaggerParser from "@apidevtools/swagger-parser";

export interface Param {
  name: string;
  in: string; // "path" | "query" | "header" | "cookie"
  required: boolean;
  description?: string;
  schema: any;
}

export interface Endpoint {
  operationId: string;
  method: string;
  path: string;
  summary?: string;
  description?: string;
  parameters: Param[];
  requestBodyContentType?: string;
  requestBodySchema?: any;
}

export interface ParsedSpec {
  title: string;
  baseUrl: string;
  endpoints: Endpoint[];
}

const METHODS = ["get", "post", "put", "patch", "delete"];

export async function parseSpec(source: string): Promise<ParsedSpec> {
  // dereference() loads the spec and replaces every $ref with the real object
  const api: any = await SwaggerParser.dereference(source);

  const endpoints: Endpoint[] = [];

  for (const [path, pathItem] of Object.entries<any>(api.paths ?? {})) {
    for (const method of METHODS) {
      const op = pathItem[method];
      if (!op) continue;

      // Parameters can be declared on the path or on the operation
      const rawParams = [...(pathItem.parameters ?? []), ...(op.parameters ?? [])];
      const parameters: Param[] = rawParams.map((p: any) => ({
        name: p.name,
        in: p.in,
        required: Boolean(p.required),
        description: p.description,
        schema: p.schema ?? {},
      }));

      // Prefer a JSON body; otherwise take whatever content type is declared
      const bodyContent = op.requestBody?.content ?? {};
      const bodyType =
        "application/json" in bodyContent
          ? "application/json"
          : Object.keys(bodyContent)[0];

      endpoints.push({
        operationId:
          op.operationId ??
          `${method}_${path.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "")}`,
        method,
        path,
        summary: op.summary,
        description: op.description,
        parameters,
        requestBodyContentType: bodyType,
        requestBodySchema: bodyType
          ? bodyContent[bodyType].schema ?? {}
          : undefined,
      });
    }
  }

  return {
    title: api.info?.title ?? "Untitled API",
    baseUrl: api.servers?.[0]?.url ?? "",
    endpoints,
  };
}