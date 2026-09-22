import { Router, Request, Response } from "express";
import { query } from "../db/connection";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  const { status, assignee, priority, search, page = "1", limit = "20" } = req.query;

  const pageNumber = Math.max(1, parseInt(page as string, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
  const offset = (pageNumber - 1) * pageSize;

  const conditions: string[] = [];
  const values: any[] = [];
  let index = 1;

  if (status && status !== "all") {
    conditions.push(`t.status = $${index++}`);
    values.push(status);
  }

  if (assignee && assignee !== "all") {
    conditions.push(`t.assignee_id = $${index++}`);
    values.push(parseInt(assignee as string, 10));
  }

  if (priority && priority !== "all") {
    conditions.push(`t.priority = $${index++}`);
    values.push(priority);
  }

  if (search) {
    conditions.push(`(t.title ILIKE $${index} OR t.description ILIKE $${index})`);
    values.push(`%${search}%`);
    index++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    const countSql = `SELECT COUNT(*) as total FROM tickets t ${whereClause}`;
    const countResult = await query(countSql, values);
    const total = parseInt(countResult.rows[0].total, 10);

    const listSql = `
      SELECT
        t.id,
        t.title,
        t.description,
        t.assignee_id,
        t.due_date,
        t.priority,
        t.status,
        t.tags,
        t.language,
        t.source_message_id,
        t.created_at,
        t.updated_at,
        u.name as assignee_name,
        u.email as assignee_email,
        u.department as assignee_department
      FROM tickets t
      LEFT JOIN users u ON t.assignee_id = u.id
      ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT $${index++} OFFSET $${index++}
    `;

    const listValues = [...values, pageSize, offset];
    const listResult = await query(listSql, listValues);

    res.json({
      tickets: listResult.rows,
      pagination: {
        page: pageNumber,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch tickets" });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const sql = `
      SELECT
        t.*,
        u.name as assignee_name,
        u.email as assignee_email,
        u.department as assignee_department,
        m.content as source_message_content,
        m.detected_language as source_message_language,
        m.session_id as source_session_id
      FROM tickets t
      LEFT JOIN users u ON t.assignee_id = u.id
      LEFT JOIN chat_messages m ON t.source_message_id = m.id
      WHERE t.id = $1
    `;

    const result = await query(sql, [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch ticket" });
  }
});

router.patch("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, assignee_id, due_date, priority, title, description } = req.body;

  const updates: string[] = [];
  const values: any[] = [];
  let index = 1;

  if (status !== undefined) {
    updates.push(`status = $${index++}`);
    values.push(status);
  }

  if (assignee_id !== undefined) {
    updates.push(`assignee_id = $${index++}`);
    values.push(assignee_id === null ? null : parseInt(assignee_id, 10));
  }

  if (due_date !== undefined) {
    updates.push(`due_date = $${index++}`);
    values.push(due_date);
  }

  if (priority !== undefined) {
    updates.push(`priority = $${index++}`);
    values.push(priority);
  }

  if (title !== undefined) {
    updates.push(`title = $${index++}`);
    values.push(title);
  }

  if (description !== undefined) {
    updates.push(`description = $${index++}`);
    values.push(description);
  }

  if (updates.length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(id);

  try {
    const sql = `UPDATE tickets SET ${updates.join(", ")} WHERE id = $${index} RETURNING *`;
    const result = await query(sql, values);

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to update ticket" });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await query("DELETE FROM tickets WHERE id = $1 RETURNING id", [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }

    res.json({ success: true, id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete ticket" });
  }
});

export default router;
