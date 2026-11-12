import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL;
if (!apiKey || !model) {
  console.error("Set GEMINI_API_KEY and GEMINI_MODEL in your .env file");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

const response = await ai.models.generateContent({
  model,
  contents: "Say hello in one short sentence.",
});

console.log(response.text);