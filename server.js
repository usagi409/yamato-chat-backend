const express = require('express');
const { Pool } = require('pg');
const app = express();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// ★環境変数からパスワード取得 (なければデフォルト値)
const GATE_PASSWORD = process.env.GATE_PASSWORD || "yamato2026";

async function setupDB() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50),
                color VARCHAR(20),
                message TEXT,
                reply_to_id INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        await pool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS color VARCHAR(20);`).catch(() => {});
        await pool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_id INT;`).catch(() => {});
    } catch (err) {
        console.error("DB初期化エラー:", err);
    }
}
setupDB();

app.use(express.json());

// CORS設定 (★x-gate-pass を許可リストに追加)
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, x-gate-pass");
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

// ★認証ミドルウェア (ガードマン)
const checkAuth = (req, res, next) => {
    const pass = req.headers['x-gate-pass'];
    if (pass === GATE_PASSWORD) {
        next(); // OKなら通過
    } else {
        res.status(401).json({ error: "Unauthorized" }); // NGなら追い返す
    }
};

// ★ヘルスチェック用 (認証不要)
app.get('/api/ping', (req, res) => res.send("ok"));

// ★パスワード検証用 (認証不要)
app.post('/api/auth', (req, res) => {
    const { password } = req.body;
    if (password === GATE_PASSWORD) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: "パスワードが違います" });
    }
});

// ★メッセージ取得 (★checkAuth 必須)
app.get('/api/messages', checkAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM messages ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) { res.status(500).send(err.message); }
});

// ★メッセージ投稿 (★checkAuth 必須)
app.post('/api/messages', checkAuth, async (req, res) => {
  try {
    const { username, color, message, reply_to_id } = req.body;
    await pool.query(
        'INSERT INTO messages (username, color, message, reply_to_id) VALUES ($1, $2, $3, $4)', 
        [username, color, message, reply_to_id]
    );
    res.sendStatus(200);
  } catch (err) { res.status(500).send(err.message); }
});

app.listen(process.env.PORT || 3000);
