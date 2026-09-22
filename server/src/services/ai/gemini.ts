import { LlmProvider, AiParseInput, AiParseResponse, AiParseResponseSchema } from "./types";
import { buildSystemPrompt } from "./prompts";

export class GeminiProvider implements LlmProvider {
  name = "gemini";
  private apiKey: string;
  private candidateModels: string[];

  constructor(apiKey?: string, modelName?: string) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || "";
    const requested = modelName || process.env.GEMINI_MODEL;
    this.candidateModels = requested
      ? [requested, "gemini-3.5-flash-lite", "gemini-3.6-flash", "gemini-flash-latest"]
      : ["gemini-3.5-flash-lite", "gemini-3.6-flash", "gemini-flash-latest"];
  }

  async parseTicketIntent(input: AiParseInput): Promise<AiParseResponse> {
    const systemInstruction = buildSystemPrompt(input);

    const historyParts = input.conversation.map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }]
    }));

    const contents = [
      {
        role: "user",
        parts: [{ text: systemInstruction }]
      },
      ...historyParts
    ];

    let lastError: any = null;

    for (const model of this.candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            contents,
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.1
            }
          })
        });

        if (!res.ok) {
          const errorText = await res.text();
          lastError = new Error(`Gemini API error (${model}): ${res.status} ${errorText}`);
          continue;
        }

        const data = await res.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) {
          lastError = new Error(`Empty response from Gemini API (${model})`);
          continue;
        }

        const cleanedText = rawText.trim().replace(/^```json\s*/, "").replace(/\s*```$/, "");
        const parsedJson = JSON.parse(cleanedText);
        return AiParseResponseSchema.parse(parsedJson);
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError || new Error("All Gemini models failed");
  }
}
