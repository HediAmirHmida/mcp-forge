import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL;
if (!apiKey || !model) {
  console.error("Set GEMINI_API_KEY and GEMINI_MODEL in your .env file");
  process.exit(1);
}
const ai = new GoogleGenAI({ apiKey });

// 1. The shape we want, as JSON Schema (sent to the model)
const jsonSchema = {
  type: "object",
  properties: {
    tools: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
        },
        required: ["name", "description"],
      },
    },
  },
  required: ["tools"],
};

// 2. The same shape as a Zod schema (used to validate what comes back)
const Plan = z.object({
  tools: z.array(z.object({ name: z.string(), description: z.string() })),
});

const prompt = `You are designing tools for an AI assistant.
Here are the API endpoints:
GET /pets - list all pets
POST /pets - create a pet
DELETE /pets/{id} - delete a pet

Give each endpoint a snake_case tool name and a one-sentence description
that says WHEN an AI should use the tool.`;

const response = await ai.models.generateContent({
  model,
  contents: prompt,
  config: {
    responseMimeType: "application/json",
    responseJsonSchema: jsonSchema,
  },
});

const plan = Plan.parse(JSON.parse(response.text ?? ""));
console.log(JSON.stringify(plan, null, 2));