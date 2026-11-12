import { mkdirSync, writeFileSync } from "node:fs";

const WANT = Number(process.argv[2] ?? 3); // how many specs to save
const MIN_OPS = 5;
const MAX_OPS = 30;
const METHODS = ["get", "post", "put", "patch", "delete"];

const list: Record<string, any> = await (
  await fetch("https://api.apis.guru/v2/list.json")
).json();

// Keep only APIs whose preferred version is OpenAPI 3.x
const candidates: { id: string; url: string }[] = [];
for (const [id, entry] of Object.entries(list)) {
  const versions = entry.versions ?? entry.apis ?? {};
  const v = versions[entry.preferred];
  if (v?.openapiVer?.startsWith("3.") && v.swaggerUrl) {
    candidates.push({ id, url: v.swaggerUrl });
  }
}
console.log(`${candidates.length} OpenAPI 3.x candidates in the directory`);

// Random order so each run gives different APIs
candidates.sort(() => Math.random() - 0.5);

mkdirSync("specs", { recursive: true });
let saved = 0;

for (const c of candidates) {
  if (saved >= WANT) break;
  try {
    const res = await fetch(c.url);
    if (!res.ok) continue;
    const spec: any = await res.json();

    let ops = 0;
    for (const item of Object.values<any>(spec.paths ?? {})) {
      for (const m of METHODS) if (item[m]) ops++;
    }
    if (ops < MIN_OPS || ops > MAX_OPS) continue;

    const file = `specs/${c.id.replace(/[^a-zA-Z0-9]+/g, "_")}.json`;
    writeFileSync(file, JSON.stringify(spec, null, 2));
    console.log(`saved ${file}  (${ops} operations)`);
    saved++;
  } catch {
    // skip specs that fail to download or parse
  }
}
console.log(`Done: ${saved} specs saved`);