import { parseSpec } from "./parser.js";

const source = process.argv[2];
if (!source) {
  console.error("Usage: npm run parse -- <path-or-url-to-openapi-spec>");
  process.exit(1);
}

const spec = await parseSpec(source);

console.log(`\n${spec.title}  (${spec.baseUrl})`);
console.log(`${spec.endpoints.length} endpoints\n`);

for (const e of spec.endpoints) {
  const params = e.parameters
    .map((p) => `${p.name}${p.required ? "*" : ""}(${p.in})`)
    .join(", ");
  console.log(
    `${e.method.toUpperCase().padEnd(6)} ${e.path.padEnd(32)} ${e.operationId}` +
      (params ? `\n         params: ${params}` : "") +
      (e.requestBodySchema ? "\n         body: yes" : "")
  );
}