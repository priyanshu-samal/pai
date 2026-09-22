import { LlmProvider, AiParseInput, AiParseResponse, AiParseResponseSchema } from "./types";
import { buildSystemPrompt } from "./prompts";

export class OpenAiProvider implements LlmProvider {
  name = "openai";
  private apiKey: string;
  private baseUrl: string;
  private modelName: string;

  constructor(apiKey?: string, baseUrl?: string, modelName?: string) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || "";
    this.baseUrl = baseUrl || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
    this.modelName = modelName || process.env.OPENAI_MODEL || "gpt-4o-mini";
  }

  async parseTicketIntent(input: AiParseInput): Promise<AiParseResponse> {
    const systemPrompt = buildSystemPrompt(input);

    const messages = [
      { role: "system", content: systemPrompt },
      ...input.conversation.map((msg) => ({
        role: msg.role,
        content: msg.content
      }))
    ];

    const url = `${this.baseUrl.replace(/\/+$/, "")}/chat/completions`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.modelName,
        messages,
        response_format: { type: "json_object" },
        temperature: 0.1
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`OpenAI API error: ${res.status} ${errorText}`);
    }

    const data = await res.json();
    const rawText = data.choices?.[0]?.message?.content;
    if (!rawText) {
      throw new Error("Empty response from OpenAI API");
    }

    const cleanedText = rawText.trim().replace(/^```json\s*/, "").replace(/\s*```$/, "");
    const parsedJson = JSON.parse(cleanedText);
    return AiParseResponseSchema.parse(parsedJson);
  }
}
