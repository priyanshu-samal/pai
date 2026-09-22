import bcrypt from "bcryptjs";
import pool, { query, initDb } from "./connection";

export async function seed() {
  await initDb();

  const salt = await bcrypt.genSalt(10);
  const adminPassword = await bcrypt.hash("admin123", salt);
  const memberPassword = await bcrypt.hash("password123", salt);

  const usersList = [
    { name: "Admin User", email: "admin@chattoticket.com", password: adminPassword, role: "admin", department: "Operations" },
    { name: "Priya", email: "priya@example.com", password: memberPassword, role: "member", department: "Backend" },
    { name: "Rahul Sharma", email: "rahul.sharma@example.com", password: memberPassword, role: "member", department: "Backend" },
    { name: "Rahul Verma", email: "rahul.verma@example.com", password: memberPassword, role: "member", department: "Frontend" },
    { name: "Amit", email: "amit@example.com", password: memberPassword, role: "member", department: "DevOps" },
    { name: "Sneha Rao", email: "sneha@example.com", password: memberPassword, role: "member", department: "Product" }
  ];

  for (const item of usersList) {
    const existing = await query("SELECT id FROM users WHERE email = $1", [item.email]);
    if (existing.rows.length === 0) {
      await query(
        "INSERT INTO users (name, email, password_hash, role, department) VALUES ($1, $2, $3, $4, $5)",
        [item.name, item.email, item.password, item.role, item.department]
      );
    }
  }

  const priyaUser = await query("SELECT id FROM users WHERE email = $1", ["priya@example.com"]);
  const priyaId = priyaUser.rows[0]?.id;

  const rahulVermaUser = await query("SELECT id FROM users WHERE email = $1", ["rahul.verma@example.com"]);
  const rahulVermaId = rahulVermaUser.rows[0]?.id;

  const ticketsCount = await query("SELECT COUNT(*) as count FROM tickets");
  if (parseInt(ticketsCount.rows[0].count, 10) === 0) {
    if (priyaId) {
      await query(
        `INSERT INTO tickets (title, description, assignee_id, due_date, priority, status, tags, language)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          "Checkout page throwing 500 errors",
          "Checkout page is throwing 500 errors for some users on production.",
          priyaId,
          "2026-09-25",
          "High",
          "Open",
          ["checkout", "bug", "p0"],
          "en"
        ]
      );
    }

    if (rahulVermaId) {
      await query(
        `INSERT INTO tickets (title, description, assignee_id, due_date, priority, status, tags, language)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          "Fix mobile navigation drawer lag",
          "Drawer animation drops frames on low-tier mobile devices.",
          rahulVermaId,
          "2026-09-22",
          "Medium",
          "In Progress",
          ["frontend", "mobile", "perf"],
          "en"
        ]
      );
    }
  }
}

if (require.main === module) {
  seed()
    .then(() => {
      console.log("Database seeded successfully");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Seeding failed", err);
      process.exit(1);
    });
}
