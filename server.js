const express = require('express');
const { Pool } = require('pg');
const app = express();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// 起動時にテーブルとカラムを自動セットアップ
async function setupDB() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS messages (
            id SERIAL PRIMARY KEY,
            username VARCHAR(50),
            message TEXT,
            reply_to_id INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);
    // カラムがない場合に追加する安全策
    await pool.query(`
        ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_id INT;
    `).catch(() => {});
}
setupDB();

app.use(express.json());
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

app.get('/api/messages', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM messages ORDER BY created_at DESC LIMIT 50');
    res.json(result.rows);
  } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/messages', async (req, res) => {
  try {
    const { username, message, reply_to_id } = req.body;
    await pool.query('INSERT INTO messages (username, message, reply_to_id) VALUES ($1, $2, $3)', [username, message, reply_to_id]);
    res.sendStatus(200);
  } catch (err) { res.status(500).send(err.message); }
});

app.listen(process.env.PORT || 3000);
