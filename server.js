const express = require('express');
const { Pool } = require('pg');
const app = express();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

app.use(express.json());
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    next();
});

app.get('/api/messages', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM messages ORDER BY created_at DESC LIMIT 50');
    res.json(result.rows);
  } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/messages', async (req, res) => {
  const { username, message } = req.body;
  await pool.query('INSERT INTO messages (username, message) VALUES ($1, $2)', [username, message]);
  res.sendStatus(200);
});

app.listen(process.env.PORT || 3000);
