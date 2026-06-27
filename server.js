const express = require('express');
const { Pool } = require('pg');
const app = express();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// 自動テーブル作成
pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50),
        message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
`).catch(err => console.error(err));

app.use(express.json());

// 【重要】強力なCORS設定
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    
    // OPTIONSメソッド（プリフライト）には即座に200を返す
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
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
    const { username, message } = req.body;
    await pool.query('INSERT INTO messages (username, message) VALUES ($1, $2)', [username, message]);
    res.sendStatus(200);
  } catch (err) { res.status(500).send(err.message); }
});

app.listen(process.env.PORT || 3000);
