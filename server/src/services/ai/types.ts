import { z } from "zod";

export interface UserSummary {
  id: number;
  name: string;
  department?: string | null;
}

export interface MessageHistory {
  role: "user" | "assistant";
  content: string;
}

export interface TicketDraft {
  title?: string;
  description?: string;
  assignee_id?: number | null;
  assignee_name?: string | null;
  due_date?: string | null;
  priority?: "Low" | "Medium" | "High" | "Urgent";
  tags?: string[];
  detected_language?: string;
}

export const AiParseResponseSchema = z.object({
  status: z.enum(["complete", "needs_clarification", "cancelled", "non_ticket"]),
  title: z.string().optional(),
  original_title: z.string().optional(),
  description: z.string().optional(),
  assignee_id: z.number().nullable().optional(),
  assignee_name: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(),
  priority: z.enum(["Low", "Medium", "High", "Urgent"]).optional().default("Medium"),
  tags: z.array(z.string()).optional().default([]),
  detected_language: z.string().optional().default("en"),
  missing_fields: z.array(z.string()).optional().default([]),
  reply_message: z.string(),
  updated_draft: z.record(z.string(), z.any()).optional().nullable()
});

export type AiParseResponse = z.infer<typeof AiParseResponseSchema>;

export interface AiParseInput {
  conversation: MessageHistory[];
  currentDate: string;
  timezone: string;
  knownUsers: UserSummary[];
  pendingTicket?: TicketDraft | null;
}

export interface LlmProvider {
  name: string;
  parseTicketIntent(input: AiParseInput): Promise<AiParseResponse>;
}
