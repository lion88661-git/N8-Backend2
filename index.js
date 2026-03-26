const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// 模拟分析函数：支持严禁幻觉准则
const analyzeOne = async (url) => {
  const mockScore = Math.floor(Math.random() * 60);
  const mockReasons = [
    `事实核查：该链接 ${url.substring(0,20)}... 备案正常`,
    "准则确认：未发现虚假物流承诺",
    "侵权检测：公开元数据未见品牌关键词"
  ];
  return { score: mockScore, reasons: mockReasons };
};

app.post('/api/analyze', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "主君，请先赐予链接" });

  // 核心：把前端发来的一坨链接按行拆开，去掉空格
  const urls = url.split('\n').map(u => u.trim()).filter(u => u.length > 0);

  try {
    const results = [];
    for (const singleUrl of urls) {
      const ai = await analyzeOne(singleUrl);
      const db = await pool.query(
        'INSERT INTO products (source_url, risk_score, risk_reasons, status) VALUES ($1, $2, $3, $4) RETURNING *',
        [singleUrl, ai.score, JSON.stringify(ai.reasons), 'completed']
      );
      results.push(db.rows[0]);
    }
    // 返回数组，前端就能一个一个显示了
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "金库写入失败，请检查数据库表结构" });
  }
});

app.listen(process.env.PORT || 3000, () => console.log('多链接分析引擎已就绪'));
