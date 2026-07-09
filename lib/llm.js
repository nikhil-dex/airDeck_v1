// Single seam for AI text generation. API routes call llmComplete and never
// talk to a provider directly — adding another provider (OpenAI, Ollama,
// OpenRouter...) means extending this file, not touching the routes.
import { sendRequestToGemini, geminiText, geminiBlockReason } from "./gemini";

export async function llmComplete(prompt, { apiKey } = {}) {
  const result = await sendRequestToGemini(prompt, { apiKey });
  return {
    text: geminiText(result),
    blockReason: geminiBlockReason(result),
  };
}
