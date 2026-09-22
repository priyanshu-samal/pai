import { Router, Request, Response } from "express";
import crypto from "crypto";
import { query } from "../db/connection";
import { parseWithFallback } from "../services/ai";
import { MessageHistory, UserSummary } from "../services/ai/types";

const router = Router();

router.post("/message", async (req: Request, res: Response) => {
  const { message, sessionId, timezone, referenceDate } = req.body;

  if (!message || typeof message !== "string" || !message.trim()) {
    res.status(400).json({ error: "Message is required" });
    return;
  }

  const activeSessionId = sessionId && sessionId.trim() ? sessionId.trim() : crypto.randomUUID();
  const activeTimezone = timezone || process.env.TIMEZONE || "Asia/Kolkata";
  const activeDate = referenceDate || "2026-09-19";

  try {
    const sessionResult = await query("SELECT * FROM chat_sessions WHERE id = $1", [activeSessionId]);
    let session = sessionResult.rows[0];

    if (!session) {
      await query("INSERT INTO chat_sessions (id, pending_ticket) VALUES ($1, $2)", [activeSessionId, null]);
      session = { id: activeSessionId, pending_ticket: null };
    }

    const userMessageResult = await query(
      "INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3) RETURNING id, role, content, created_at",
      [activeSessionId, "user", message.trim()]
    );
    const userMessageId = userMessageResult.rows[0].id;

    const historyResult = await query(
      "SELECT role, content FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC, id ASC",
      [activeSessionId]
    );
    const conversation: MessageHistory[] = historyResult.rows.map((row) => ({
      role: row.role as "user" | "assistant",
      content: row.content
    }));

    const usersResult = await query("SELECT id, name, department FROM users ORDER BY id ASC");
    const knownUsers: UserSummary[] = usersResult.rows;

    const aiResult = await parseWithFallback({
      conversation,
      currentDate: activeDate,
      timezone: activeTimezone,
      knownUsers,
      pendingTicket: session.pending_ticket
    });

    if (aiResult.detected_language) {
      await query("UPDATE chat_messages SET detected_language = $1 WHERE id = $2", [
        aiResult.detected_language,
        userMessageId
      ]);
    }

    if (aiResult.status === "cancelled") {
      await query("UPDATE chat_sessions SET pending_ticket = NULL WHERE id = $1", [activeSessionId]);

      const replyContent = aiResult.reply_message || "Cancelled. The draft has been discarded.";
      await query(
        "INSERT INTO chat_messages (session_id, role, content, detected_language) VALUES ($1, $2, $3, $4)",
        [activeSessionId, "assistant", replyContent, aiResult.detected_language || "en"]
      );

      res.json({
        sessionId: activeSessionId,
        status: "cancelled",
        reply: replyContent,
        ticket: null
      });
      return;
    }

    if (aiResult.status === "non_ticket") {
      const replyContent = aiResult.reply_message || "Hello! How can I help you today?";
      await query(
        "INSERT INTO chat_messages (session_id, role, content, detected_language) VALUES ($1, $2, $3, $4)",
        [activeSessionId, "assistant", replyContent, aiResult.detected_language || "en"]
      );

      res.json({
        sessionId: activeSessionId,
        status: "non_ticket",
        reply: replyContent,
        ticket: null
      });
      return;
    }

    if (aiResult.status === "needs_clarification") {
      const mergedDraft = {
        ...(session.pending_ticket || {}),
        ...(aiResult.updated_draft || {}),
        title: aiResult.title || session.pending_ticket?.title || message.trim(),
        description: aiResult.description || session.pending_ticket?.description || message.trim()
      };

      if (aiResult.assignee_id !== undefined && aiResult.assignee_id !== null) {
        mergedDraft.assignee_id = aiResult.assignee_id;
        mergedDraft.assignee_name = aiResult.assignee_name;
      }
      if (aiResult.due_date) {
        mergedDraft.due_date = aiResult.due_date;
      }
      if (aiResult.priority) {
        mergedDraft.priority = aiResult.priority;
      }

      await query("UPDATE chat_sessions SET pending_ticket = $1 WHERE id = $2", [
        JSON.stringify(mergedDraft),
        activeSessionId
      ]);

      const replyContent = aiResult.reply_message;
      await query(
        "INSERT INTO chat_messages (session_id, role, content, detected_language) VALUES ($1, $2, $3, $4)",
        [activeSessionId, "assistant", replyContent, aiResult.detected_language || "en"]
      );

      res.json({
        sessionId: activeSessionId,
        status: "needs_clarification",
        reply: replyContent,
        missingFields: aiResult.missing_fields,
        ticket: null
      });
      return;
    }

    const ticketTitle = aiResult.title || "Untitled Ticket";
    const ticketDescription = aiResult.description || message.trim();
    const assigneeId = aiResult.assignee_id !== undefined ? aiResult.assignee_id : null;
    const dueDate = aiResult.due_date || null;
    const priority = aiResult.priority || "Medium";
    const tags = aiResult.tags || [];
    const language = aiResult.detected_language || "en";

    const insertTicketSql = `
      INSERT INTO tickets (
        title,
        description,
        assignee_id,
        due_date,
        priority,
        status,
        tags,
        language,
        source_message_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const ticketResult = await query(insertTicketSql, [
      ticketTitle,
      ticketDescription,
      assigneeId,
      dueDate,
      priority,
      "Open",
      tags,
      language,
      userMessageId
    ]);

    const createdTicket = ticketResult.rows[0];

    let assigneeName = "Unassigned";
    if (createdTicket.assignee_id) {
      const matchedUser = knownUsers.find((u) => u.id === createdTicket.assignee_id);
      if (matchedUser) {
        assigneeName = matchedUser.name;
      }
    }
    createdTicket.assignee_name = assigneeName;

    await query("UPDATE chat_sessions SET pending_ticket = NULL WHERE id = $1", [activeSessionId]);

    let finalReply = aiResult.reply_message;
    if (!finalReply) {
      finalReply = `Ticket #${createdTicket.id} created. ${createdTicket.title} | Assignee: ${assigneeName} | Due: ${createdTicket.due_date || "No deadline"} | Priority: ${createdTicket.priority}`;
    }

    await query(
      "INSERT INTO chat_messages (session_id, role, content, detected_language) VALUES ($1, $2, $3, $4)",
      [activeSessionId, "assistant", finalReply, language]
    );

    res.json({
      sessionId: activeSessionId,
      status: "complete",
      reply: finalReply,
      ticket: createdTicket
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to process message" });
  }
});

router.get("/sessions/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const sessionResult = await query("SELECT * FROM chat_sessions WHERE id = $1", [id]);
    if (sessionResult.rows.length === 0) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    const messagesResult = await query(
      "SELECT id, role, content, detected_language, created_at FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC, id ASC",
      [id]
    );

    res.json({
      session: sessionResult.rows[0],
      messages: messagesResult.rows
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch session" });
  }
});

export default router;
