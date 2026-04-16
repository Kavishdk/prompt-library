import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { Pool } from "pg";
import { createClient } from "redis";
import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

async function startServer() {
  const app = express();
  app.use(express.json());

  let db: any;
  let useRedis = false;
  let redisClient: any;

  // Attempt PostgreSQL Connection
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 2000,
  });

  try {
    await pool.query('SELECT 1');
    console.log("🐘 PostgreSQL connected successfully.");
    db = {
      query: (text: string, params?: any[]) => pool.query(text, params),
      all: async (text: string, params?: any[]) => (await pool.query(text, params)).rows,
      get: async (text: string, params?: any[]) => (await pool.query(text, params)).rows[0],
      run: (text: string, params?: any[]) => pool.query(text, params),
      isPostgres: true
    };
  } catch (e) {
    console.warn("⚠️ PostgreSQL not found. Falling back to SQLite.");
    const sqliteDb = await open({
      filename: 'prompt_lib.db',
      driver: sqlite3.Database
    });
    db = {
      query: (text: string, params: any[] = []) => {
        // Convert $1, $2 to ? for sqlite
        const sql = text.replace(/\$\d+/g, '?');
        return sqliteDb.run(sql, params);
      },
      all: (text: string, params: any[] = []) => {
        const sql = text.replace(/\$\d+/g, '?');
        return sqliteDb.all(sql, params);
      },
      get: (text: string, params: any[] = []) => {
        const sql = text.replace(/\$\d+/g, '?');
        return sqliteDb.get(sql, params);
      },
      run: (text: string, params: any[] = []) => {
        const sql = text.replace(/\$\d+/g, '?');
        return sqliteDb.run(sql, params);
      },
      isPostgres: false
    };
  }

  // Attempt Redis Connection
  redisClient = createClient({ url: process.env.REDIS_URL });
  try {
    await redisClient.connect();
    console.log("🚀 Redis connected successfully.");
    useRedis = true;
  } catch (e) {
    console.warn("⚠️ Redis not found. Falling back to In-Memory counter.");
    const memoryCounter: Record<string, number> = {};
    redisClient = {
      incr: async (key: string) => {
        memoryCounter[key] = (memoryCounter[key] || 0) + 1;
        return memoryCounter[key];
      }
    };
  }

  // Initialize Schema
  const schema = `
    CREATE TABLE IF NOT EXISTS users (
      id ${db.isPostgres ? 'UUID' : 'TEXT'} PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS prompts (
      id ${db.isPostgres ? 'UUID' : 'TEXT'} PRIMARY KEY,
      user_id ${db.isPostgres ? 'UUID' : 'TEXT'} REFERENCES users(id),
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      complexity INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tags (
      id ${db.isPostgres ? 'UUID' : 'TEXT'} PRIMARY KEY,
      name TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS prompt_tags (
      prompt_id ${db.isPostgres ? 'UUID' : 'TEXT'} REFERENCES prompts(id) ON DELETE CASCADE,
      tag_id ${db.isPostgres ? 'UUID' : 'TEXT'} REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (prompt_id, tag_id)
    );
  `;

  if (db.isPostgres) {
    await pool.query(schema);
  } else {
    // SQLite uses slightly different syntax for some things, but this basic schema works
    const sqliteSchema = schema.replace(/TIMESTAMP DEFAULT CURRENT_TIMESTAMP/g, 'DATETIME DEFAULT CURRENT_TIMESTAMP');
    // Using .exec for multi-statement in sqlite
    // Since our db wrapper doesn't have exec, we use raw pool if possible, but here we just run them one by one
    for (const statement of sqliteSchema.split(';')) {
      if (statement.trim()) await db.run(statement);
    }
  }

  // Default Tags
  const defaultTags = ['Cyberpunk', 'Fantasy', 'Anime', 'Sci-Fi', 'Nature'];
  for (const tag of defaultTags) {
    try {
      await db.run('INSERT INTO tags (id, name) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING', [uuidv4(), tag]);
    } catch (e) {
      // SQLite conflict handling
      try {
        await db.run('INSERT OR IGNORE INTO tags (id, name) VALUES ($1, $2)', [uuidv4(), tag]);
      } catch { }
    }
  }

  // Middleware: Auth
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  };

  // Auth Endpoints
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { username, password } = req.body;
      const hashedPassword = await bcrypt.hash(password, 10);
      const id = uuidv4();
      await db.run('INSERT INTO users (id, username, password) VALUES ($1, $2, $3)', [id, username, hashedPassword]);
      res.status(201).json({ message: 'User created' });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await db.get('SELECT * FROM users WHERE username = $1', [username]);
    if (!user) return res.status(400).json({ error: 'User not found' });

    if (await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ id: user.id, username }, JWT_SECRET);
      res.json({ token, username });
    } else {
      res.status(400).json({ error: 'Wrong password' });
    }
  });

  // Prompt Endpoints
  app.get('/api/prompts', async (req, res) => {
    try {
      const { tag } = req.query;
      let query = `
        SELECT p.id, p.title, p.complexity, p.created_at, ${db.isPostgres ? 'array_agg(t.name)' : 'group_concat(t.name)'} as tags
        FROM prompts p
        LEFT JOIN prompt_tags pt ON p.id = pt.prompt_id
        LEFT JOIN tags t ON pt.tag_id = t.id
      `;
      let params: any[] = [];

      if (tag) {
        query += ` WHERE p.id IN (SELECT prompt_id FROM prompt_tags pt2 JOIN tags t2 ON pt2.tag_id = t2.id WHERE t2.name = $1)`;
        params.push(tag);
      }

      query += ` GROUP BY p.id ORDER BY p.created_at DESC`;

      const promptsArr = await db.all(query, params);
      // SQLite group_concat returns a string, split it
      const result = promptsArr.map((p: any) => ({
        ...p,
        tags: typeof p.tags === 'string' ? p.tags.split(',') : (p.tags || [])
      }));
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.get('/api/tags', async (req, res) => {
    const tags = await db.all('SELECT * FROM tags');
    res.json(tags);
  });

  app.post('/api/prompts', authenticateToken, async (req: any, res) => {
    try {
      const { title, content, complexity, tags } = req.body;
      const id = uuidv4();
      await db.run(
        'INSERT INTO prompts (id, user_id, title, content, complexity) VALUES ($1, $2, $3, $4, $5)',
        [id, req.user.id, title, content, complexity]
      );

      if (tags && Array.isArray(tags)) {
        for (const tagName of tags) {
          const tag = await db.get('SELECT id FROM tags WHERE name = $1', [tagName]);
          if (tag) {
            await db.run('INSERT INTO prompt_tags (prompt_id, tag_id) VALUES ($1, $2)', [id, tag.id]);
          }
        }
      }

      res.status(201).json({ id });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.get('/api/prompts/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const viewCount = await redisClient.incr(`prompt:${id}:views`);

      const prompt = await db.get(`
        SELECT p.*, ${db.isPostgres ? 'array_agg(t.name)' : 'group_concat(t.name)'} as tags
        FROM prompts p
        LEFT JOIN prompt_tags pt ON p.id = pt.prompt_id
        LEFT JOIN tags t ON pt.tag_id = t.id
        WHERE p.id = $1
        GROUP BY p.id
      `, [id]);

      if (!prompt) return res.status(404).json({ error: 'Prompt not found' });

      res.json({
        ...prompt,
        tags: typeof prompt.tags === 'string' ? prompt.tags.split(',') : (prompt.tags || []),
        view_count: viewCount
      });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // Vite/Static
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Connection Status: ${db.isPostgres ? 'PostgreSQL' : 'SQLite (Fallback)'} | ${useRedis ? 'Redis' : 'Memory (Fallback)'}`);
  });
}

startServer();
