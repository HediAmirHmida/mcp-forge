# mcp-forge

An agent pipeline that turns an OpenAPI spec into a working, tested
[MCP](https://modelcontextprotocol.io) server. It generates the server,
tests every tool against a mock API, uses an LLM to design better tools,
and repairs failures automatically.

## Pipeline

```
OpenAPI spec
   │ 1. parse        deterministic: endpoints, params, body schemas
   ▼
Endpoint list
   │ 2. plan (LLM)   pick the most useful endpoints, write names and
   ▼                 descriptions an AI can use
Tool plan
   │ 3. generate     deterministic: TypeScript MCP server (zod schemas)
   ▼
Server code
   │ 4. test         Prism mock API + MCP client calls every tool
   ▼
Pass / fail report
   │ 5. repair (LLM) patch failing tools, re-test, keep only improvements
   ▼
Working server + report
```

## Why it is built this way
- **Deterministic first, LLM second.** Parsing, code generation and testing
  are plain code. The LLM only does what needs judgment (choosing tools,
  writing descriptions, fixing failures), which makes results reproducible
  and gives a no-LLM baseline to measure against.
- **Failures are classified.** Errors caused by the mock server (for example
  Prism returning 500 for wildcard content types) are separated from real
  tool bugs, so the LLM is never asked to "fix" working code.
- **Repair cannot make things worse.** Each repair round re-runs the full
  test suite and keeps the patch only if real failures decrease; otherwise it
  rolls back.
- **The LLM layer is swappable.** All model calls go through `src/llm.ts`
  (retries, rate-limit backoff, schema-validated JSON, token accounting).
  The current implementation uses the Gemini API.

## Quick start
Requires Node 20+.

```bash
npm install
```

Create a `.env` file (never commit it):

```
GEMINI_API_KEY=your-key
GEMINI_MODEL=your-model-id
```

Specs must be local JSON files (Prism cannot fetch URLs on recent Node
versions). Download a few samples from the APIs.guru directory:

```bash
npm run fetch:specs -- 3
```

Generate a server (add `--plan` to let the LLM choose and describe tools):

```bash
npm run generate -- specs/petstore.json generated/petstore/server.ts
npm run generate -- specs/petstore.json generated/petstore-planned/server.ts --plan
```

Test it (starts a Prism mock, calls every tool):

```bash
npm run test:server -- specs/petstore.json generated/petstore/server.ts
```

Repair a failing server:

```bash
npm run repair -- specs/petstore.json generated/petstore-planned/server.ts
```

Compare baseline, planned and repaired across all specs in `specs/`:

```bash
npm run eval
```

## Results
Measured with the included harness (mock API, tools called with
schema-generated arguments; "pass" means a successful response).

| Spec | Endpoints | Generator only | Planner + repair |
|---|---|---|---|
| Swagger Petstore | 19 | 19/19 tools pass | n/a |
| Google Cloud TPU | 14 | 14/14 | 12 tools selected, 12/12 |
| HubSpot Automation | 16 | 13/16 → 16/16 after fixing two generator bugs found by the harness | 12 tools selected, 12/12 |

Other findings:
- **Planner:** reduces large APIs to a focused tool set (for example 16 → 12
  endpoints) with usage-oriented descriptions.
- **Repair loop:** in a controlled test with an injected schema fault on
  Petstore, it restored 12/12 in one LLM call (~760 tokens). This was a
  synthetic fault, not a naturally occurring failure.
- **Bugs the harness exposed:** schemas truncated by a depth limit, and
  request bodies with non-JSON content types being dropped.

## Known limitations
- The mock only validates request shape and status codes. Tool responses are
  not validated against the spec's response schemas, and there is no test yet
  of whether an AI actually selects the right tool.
- Authentication is stripped for testing, so auth flows are not exercised.
- Not supported: Swagger 2.0, XML or multipart bodies, pagination, file
  uploads, and AWS-style specs whose operation is encoded as
  `/#X-Amz-Target=...` (the fragment never reaches the server).
- Repair can overfit to the mock: it satisfies the mock's validation, which
  is not proof the tool is correct for the real API.
- Free-tier LLM rate limits slow large evaluations (handled with retries).
- The evaluation covers a sample of public specs, not a statistically
  meaningful benchmark.

## Project structure
```
src/
  parser.ts        OpenAPI -> endpoint list
  planner.ts       LLM tool selection and descriptions
  generator.ts     endpoints -> MCP server source (zod)
  generate.ts      CLI: generate a server
  harness.ts       Prism mock + MCP client test runner
  sample.ts        schema -> valid test arguments
  repair.ts        repair loop with rollback and failure classification
  repair-cli.ts    CLI: repair a server
  eval.ts          baseline vs planned vs repaired comparison
  llm.ts           LLM wrapper: retries, validation, token accounting
  fetch-specs.ts   download sample specs from APIs.guru
examples/          hand-written MCP server and LLM test scripts (learning)
```

## Possible next steps
- Usability test: give a fresh model only the tool list and measure whether
  it picks the right tool for natural-language tasks.
- Fault-injection benchmark to measure repair success at scale.
- Response-schema validation and authentication support.
- Publish as an npm package or add a web dashboard.