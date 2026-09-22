import { LlmProvider, AiParseInput, AiParseResponse } from "./types";
import { GeminiProvider } from "./gemini";
import { OpenAiProvider } from "./openai";

export function getAiProvider(): LlmProvider {
  const providerName = (process.env.AI_PROVIDER || "").toLowerCase();

  if (providerName === "openai" || (!process.env.GEMINI_API_KEY && process.env.OPENAI_API_KEY)) {
    return new OpenAiProvider();
  }

  return new GeminiProvider();
}

export async function parseWithFallback(input: AiParseInput): Promise<AiParseResponse> {
  const provider = getAiProvider();

  try {
    return await provider.parseTicketIntent(input);
  } catch (firstErr) {
    console.error("AI attempt 1 failed:", firstErr);
    try {
      return await provider.parseTicketIntent(input);
    } catch (secondErr) {
      console.error("AI attempt 2 failed:", secondErr);
      return {
        status: "needs_clarification",
        reply_message: "I had a brief hiccup understanding that. Could you please describe the issue, who should fix it, and the due date again?",
        missing_fields: ["issue", "assignee", "due_date"],
        tags: [],
        priority: "Medium",
        detected_language: "en"
      };
    }
  }
}
