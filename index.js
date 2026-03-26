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

// 模拟分析函数
const analyzeOne = async (url) => {
  const mockScore = Math.floor(Math.random() * 60);
  const mockReasons = [
    `事实核查：链接 ${url.substring(0, 20)}... 备案正常`,
    "准则确认：未发现虚假物流承诺",
    "侵权检测：暂未命中高危词库"
  ];
  return { score: mockScore, reasons: mockReasons };
};

app.post('/api/analyze', async (req, res) => {
  const { url } = req.body;
  // 【文案已更改】
  if (!url) return res.status(400).json({ error: "请先填写链接" });

  const urls = url.match(/https?:\/\/(?:(?!https?:\/\/)[^\s])+/g) || [];

  if (urls.length === 0) {
    return res.status(400).json({ error: "未检测到有效的 http/https 链接，请检查格式" });
  }

  if (urls.length > 15) {
    return res.status(400).json({ error: `批阅过载！单次最多 15 个，当前检测到 ${urls.length} 个` });
  }

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
    res.json(results);
  } catch (err) {
    console.error("数据库写入失败:", err);
    res.status(500).json({ error: "金库写入失败，可能是链接太长或数据库断开连接" });
  }
});

app.listen(process.env.PORT || 3000, () => console.log('多链接智能切割引擎已就绪'));
