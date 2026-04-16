import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { Pool } from "pg";
import { createClient } from "redis";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

// ── In-Memory Store (used when PostgreSQL is unavailable) ──
class MemoryDB {
  private users: any[] = [];
  private prompts: any[] = [];
  private tags: any[] = [];
  private promptTags: any[] = [];

  async addUser(id: string, username: string, password: string) {
    if (this.users.find(u => u.username === username)) throw new Error('User already exists');
    const user = { id, username, password, created_at: new Date().toISOString() };
    this.users.push(user);
    return user;
  }
  async getUser(username: string) {
    return this.users.find(u => u.username === username) || null;
  }
  async addPrompt(id: string, user_id: string, title: string, content: string, complexity: number) {
    const prompt = { id, user_id, title, content, complexity, created_at: new Date().toISOString() };
    this.prompts.push(prompt);
    return prompt;
  }
  async getPrompt(id: string) {
    const prompt = this.prompts.find(p => p.id === id);
    if (!prompt) return null;
    const tagIds = this.promptTags.filter(pt => pt.prompt_id === id).map(pt => pt.tag_id);
    const tags = this.tags.filter(t => tagIds.includes(t.id)).map(t => t.name);
    return { ...prompt, tags };
  }
  async getPrompts(tagFilter?: string) {
    let filtered = [...this.prompts];
    if (tagFilter) {
      const tag = this.tags.find(t => t.name === tagFilter);
      if (tag) {
        const promptIds = this.promptTags.filter(pt => pt.tag_id === tag.id).map(pt => pt.prompt_id);
        filtered = filtered.filter(p => promptIds.includes(p.id));
      } else {
        filtered = [];
      }
    }
    return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(p => {
      const tagIds = this.promptTags.filter(pt => pt.prompt_id === p.id).map(pt => pt.tag_id);
      const tags = this.tags.filter(t => tagIds.includes(t.id)).map(t => t.name);
      return { ...p, tags };
    });
  }
  async addTag(id: string, name: string) {
    if (!this.tags.find(t => t.name === name)) {
      this.tags.push({ id, name });
    }
  }
  async getTags() { return [...this.tags]; }
  async getTagByName(name: string) { return this.tags.find(t => t.name === name) || null; }
  async linkPromptTag(prompt_id: string, tag_id: string) {
    this.promptTags.push({ prompt_id, tag_id });
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  let usePostgres = false;
  let useRedis = false;
  let pool: Pool | null = null;
  let redisClient: any;
  const memDb = new MemoryDB();

  // ── Attempt PostgreSQL Connection ──
  if (process.env.DATABASE_URL) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 3000 });
    try {
      await pool.query('SELECT 1');
      console.log("🐘 PostgreSQL connected successfully.");
      usePostgres = true;

      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS prompts (
          id UUID PRIMARY KEY, user_id UUID REFERENCES users(id), title TEXT NOT NULL, content TEXT NOT NULL, complexity INTEGER NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS tags (
          id UUID PRIMARY KEY, name TEXT UNIQUE NOT NULL
        );
        CREATE TABLE IF NOT EXISTS prompt_tags (
          prompt_id UUID REFERENCES prompts(id) ON DELETE CASCADE, tag_id UUID REFERENCES tags(id) ON DELETE CASCADE, PRIMARY KEY (prompt_id, tag_id)
        );
      `);
    } catch (e) {
      console.warn("⚠️ PostgreSQL connection failed. Using In-Memory store.");
      usePostgres = false;
      pool = null;
    }
  } else {
    console.warn("⚠️ No DATABASE_URL set. Using In-Memory store.");
  }

  // ── Attempt Redis Connection ──
  if (process.env.REDIS_URL) {
    redisClient = createClient({ url: process.env.REDIS_URL });
    try {
      await redisClient.connect();
      console.log("🚀 Redis connected successfully.");
      useRedis = true;
    } catch (e) {
      console.warn("⚠️ Redis connection failed. Using In-Memory counter.");
    }
  } else {
    console.warn("⚠️ No REDIS_URL set. Using In-Memory counter.");
  }

  if (!useRedis) {
    const memoryCounter: Record<string, number> = {};
    redisClient = {
      incr: async (key: string) => {
        memoryCounter[key] = (memoryCounter[key] || 0) + 1;
        return memoryCounter[key];
      }
    };
  }

  // ── Seed Default Tags ──
  const defaultTags = ['Cyberpunk', 'Fantasy', 'Anime', 'Sci-Fi', 'Nature'];
  for (const tag of defaultTags) {
    if (usePostgres && pool) {
      await pool.query('INSERT INTO tags (id, name) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING', [uuidv4(), tag]);
    } else {
      await memDb.addTag(uuidv4(), tag);
    }
  }

  // ── Middleware: Auth ──
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

  // ── Auth Endpoints ──
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { username, password } = req.body;
      const hashedPassword = await bcrypt.hash(password, 10);
      const id = uuidv4();
      if (usePostgres && pool) {
        await pool.query('INSERT INTO users (id, username, password) VALUES ($1, $2, $3)', [id, username, hashedPassword]);
      } else {
        await memDb.addUser(id, username, hashedPassword);
      }
      res.status(201).json({ message: 'User created' });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      let user: any;
      if (usePostgres && pool) {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        user = result.rows[0];
      } else {
        user = await memDb.getUser(username);
      }
      if (!user) return res.status(400).json({ error: 'User not found' });

      if (await bcrypt.compare(password, user.password)) {
        const token = jwt.sign({ id: user.id, username }, JWT_SECRET);
        res.json({ token, username });
      } else {
        res.status(400).json({ error: 'Wrong password' });
      }
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // ── Prompt Endpoints ──
  app.get('/api/prompts', async (req, res) => {
    try {
      const { tag } = req.query;
      if (usePostgres && pool) {
        let query = `
          SELECT p.id, p.title, p.complexity, p.created_at, array_agg(t.name) as tags
          FROM prompts p LEFT JOIN prompt_tags pt ON p.id = pt.prompt_id LEFT JOIN tags t ON pt.tag_id = t.id
        `;
        let params: any[] = [];
        if (tag) {
          query += ` WHERE p.id IN (SELECT prompt_id FROM prompt_tags pt2 JOIN tags t2 ON pt2.tag_id = t2.id WHERE t2.name = $1)`;
          params.push(tag);
        }
        query += ` GROUP BY p.id ORDER BY p.created_at DESC`;
        const result = await pool.query(query, params);
        res.json(result.rows);
      } else {
        const prompts = await memDb.getPrompts(tag as string | undefined);
        res.json(prompts);
      }
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.get('/api/tags', async (req, res) => {
    try {
      if (usePostgres && pool) {
        const result = await pool.query('SELECT * FROM tags');
        res.json(result.rows);
      } else {
        res.json(await memDb.getTags());
      }
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.post('/api/prompts', authenticateToken, async (req: any, res) => {
    try {
      const { title, content, complexity, tags } = req.body;
      const id = uuidv4();
      if (usePostgres && pool) {
        await pool.query('INSERT INTO prompts (id, user_id, title, content, complexity) VALUES ($1, $2, $3, $4, $5)', [id, req.user.id, title, content, complexity]);
        if (tags && Array.isArray(tags)) {
          for (const tagName of tags) {
            const tag = await pool.query('SELECT id FROM tags WHERE name = $1', [tagName]);
            if (tag.rows.length > 0) {
              await pool.query('INSERT INTO prompt_tags (prompt_id, tag_id) VALUES ($1, $2)', [id, tag.rows[0].id]);
            }
          }
        }
      } else {
        await memDb.addPrompt(id, req.user.id, title, content, complexity);
        if (tags && Array.isArray(tags)) {
          for (const tagName of tags) {
            const tag = await memDb.getTagByName(tagName);
            if (tag) await memDb.linkPromptTag(id, tag.id);
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

      let prompt: any;
      if (usePostgres && pool) {
        const result = await pool.query(`
          SELECT p.*, array_agg(t.name) as tags FROM prompts p
          LEFT JOIN prompt_tags pt ON p.id = pt.prompt_id LEFT JOIN tags t ON pt.tag_id = t.id
          WHERE p.id = $1 GROUP BY p.id
        `, [id]);
        prompt = result.rows[0];
      } else {
        prompt = await memDb.getPrompt(id);
      }

      if (!prompt) return res.status(404).json({ error: 'Prompt not found' });
      res.json({ ...prompt, view_count: viewCount });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  // ── Vite / Static ──
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n🎨 AI Prompt Library running on http://localhost:${PORT}`);
    console.log(`   Database: ${usePostgres ? '🐘 PostgreSQL' : '💾 In-Memory'}`);
    console.log(`   Cache:    ${useRedis ? '🚀 Redis' : '💾 In-Memory'}\n`);
  });
}

startServer();
