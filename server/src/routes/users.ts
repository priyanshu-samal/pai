import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { query } from "../db/connection";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const result = await query(
      "SELECT id, name, email, role, department, created_at FROM users ORDER BY name ASC"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

router.post("/", async (req: Request, res: Response) => {
  const { name, email, role, department, password } = req.body;

  if (!name || !email) {
    res.status(400).json({ error: "Name and email are required" });
    return;
  }

  try {
    const existing = await query("SELECT id FROM users WHERE email = $1", [email.toLowerCase().trim()]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: "User already exists with this email" });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passHash = await bcrypt.hash(password || "password123", salt);

    const result = await query(
      "INSERT INTO users (name, email, password_hash, role, department) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role, department, created_at",
      [name.trim(), email.toLowerCase().trim(), passHash, role || "member", department || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to create user" });
  }
});

export default router;
