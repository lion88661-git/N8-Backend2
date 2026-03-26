const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// 连接金库的油管
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// 分析接口
app.post('/api/analyze', async (req, res) => {
  const { url } = req.body;
  try {
    // 模拟扣费并分析，存入数据库
    const result = await pool.query(
      'INSERT INTO products (source_url, risk_score, status) VALUES ($1, $2, $3) RETURNING *',
      [url, Math.random() * 100, 'completed']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(process.env.PORT || 3000, () => console.log('Engine running'));
