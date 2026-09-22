import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { initDb } from "./db/connection";
import authRoutes from "./routes/auth";
import chatRoutes from "./routes/chat";
import ticketsRoutes from "./routes/tickets";
import usersRoutes from "./routes/users";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/tickets", ticketsRoutes);
app.use("/api/users", usersRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

async function startServer() {
  try {
    await initDb();
    app.listen(Number(port), "0.0.0.0", () => {
      console.log(`Backend server running on http://0.0.0.0:${port}`);
    });
  } catch (err) {
    console.error("Failed to start server", err);
    process.exit(1);
  }
}

startServer();

export default app;
