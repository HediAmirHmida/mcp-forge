import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { parseSpec } from "./parser.js";
import { generateServer } from "./generator.js";

const [source, out] = process.argv.slice(2);
if (!source || !out) {
  console.error("Usage: npm run generate -- <spec-path-or-url> <output-file>");
  process.exit(1);
}

const spec = await parseSpec(source);
const code = generateServer(spec);

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, code);
console.log(`Generated ${spec.endpoints.length} tools -> ${out}`);