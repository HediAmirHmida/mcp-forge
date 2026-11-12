import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import type { ZodType } from "zod";

function need(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Set ${name} in your .env file`);
  return v;
}

const API_KEY = need("GEMINI_API_KEY");
const MODEL = need("GEMINI_MODEL");
const ai = new GoogleGenAI({ apiKey: API_KEY });

export const usage = { calls: 0, inputTokens: 0, outputTokens: 0 };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function generateJson<T>(
  prompt: string,
  jsonSchema: object,
  validator: ZodType<T>,
  maxAttempts = 5
): Promise<T> {
  let lastError: unknown;
  let currentPrompt = prompt;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: currentPrompt,
        config: {
          responseMimeType: "application/json",
          responseJsonSchema: jsonSchema,
        },
      });

      usage.calls++;
      usage.inputTokens += response.usageMetadata?.promptTokenCount ?? 0;
      usage.outputTokens += response.usageMetadata?.candidatesTokenCount ?? 0;

      const parsed = validator.safeParse(JSON.parse(response.text ?? ""));
      if (parsed.success) return parsed.data;

      // Valid JSON but wrong shape: tell the model what was wrong and retry
      lastError = parsed.error;
      currentPrompt =
        prompt +
        "\n\nYour previous answer was invalid: " +
        parsed.error.message +
        "\nReturn corrected JSON.";
    } catch (err) {
      lastError = err;
      const status = (err as any)?.status;
      const retryable =
        status === 429 || (typeof status === "number" && status >= 500) ||
        err instanceof SyntaxError;
      if (!retryable) throw err;
      const wait = Math.min(60000, 5000 * 2 ** (attempt - 1));
      console.error(`LLM call failed (${status ?? "bad JSON"}), retrying in ${wait / 1000}s...`);
      await sleep(wait);
    }
  }
  throw new Error("LLM call failed after retries: " + String(lastError));
}