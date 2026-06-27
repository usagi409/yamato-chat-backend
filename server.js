const express = require('express');
const { Pool } = require('pg');
const app = express();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// 起動時にテーブルとカラムを自動セットアップ
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
        // colorカラムとreply_to_idカラムが存在しない場合に追加
        await pool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS color VARCHAR(20);`).catch(() => {});
        await pool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_id INT;`).catch(() => {});
    } catch (err) {
        console.error("DB初期化エラー:", err);
    }
}
setupDB();

app.use(express.json());
// 強力なCORS設定
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

app.get('/api/messages', async (req, res) => {
  try {
    // リミッターを外し、古い順（ASC）に全件取得するように変更
    const result = await pool.query('SELECT * FROM messages ORDER BY created_at ASC');
    res.json(result.rows);
  } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/messages', async (req, res) => {
  try {
    // フロントから送られてきた color を受け取って保存する
    const { username, color, message, reply_to_id } = req.body;
    await pool.query(
        'INSERT INTO messages (username, color, message, reply_to_id) VALUES ($1, $2, $3, $4)', 
        [username, color, message, reply_to_id]
    );
    res.sendStatus(200);
  } catch (err) { res.status(500).send(err.message); }
});

app.listen(process.env.PORT || 3000);
