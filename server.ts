import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Database from "better-sqlite3";

const db = new Database("storage.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS storage (
    key TEXT PRIMARY KEY,
    value TEXT,
    is_shared INTEGER DEFAULT 0
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/storage/:key", (req, res) => {
    const { key } = req.params;
    const row = db.prepare("SELECT value FROM storage WHERE key = ?").get(key) as { value: string } | undefined;
    res.json({ value: row ? row.value : null });
  });

  app.post("/api/storage", (req, res) => {
    const { key, value, isShared } = req.body;
    const stmt = db.prepare("INSERT OR REPLACE INTO storage (key, value, is_shared) VALUES (?, ?, ?)");
    stmt.run(key, value, isShared ? 1 : 0);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
