const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// 1. 这里的连接池配置改为“排队模式”
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 2, // 限制同时连接数，防止被金库踢出来
  connectionTimeoutMillis: 15000, 
});

// 模拟分析函数
const analyzeOne = async (url) => {
  const mockScore = Math.floor(Math.random() * 60) + 20;
  const mockReasons = [
    `事实核查：链接 ${url.substring(0, 15)}... 备案正常`,
    "准则确认：未发现虚假物流承诺",
    "侵权检测：暂未命中高危词库"
  ];
  return { score: mockScore, reasons: mockReasons };
};

app.post('/api/analyze', async (req, res) => {
  // 注意：这里要适配你前端传过来的字段，是 url 还是 urls
  const { urls, url } = req.body;
  const targetUrls = urls || (url ? [url] : []);

  if (targetUrls.length === 0) return res.status(400).json({ error: '没有提供有效的链接' });

  const results = [];

  // 2. 关键：用 for 循环一个一个写，不要抢
  for (const link of targetUrls) {
    const analysis = await analyzeOne(link);
    try {
      await pool.query(
        'INSERT INTO products (source_url, risk_score, risk_reasons, status) VALUES ($1, $2, $3, $4)',
        [link, analysis.score, JSON.stringify(analysis.reasons), 'analyzed']
      );
      results.push({ url: link, ...analysis, status: 'success' });
    } catch (err) {
      console.error('单条入库失败:', err.message);
      // 就算这一条失败了，也得让后面的继续跑
    }
  }

  res.json({ message: '分析完成', data: results });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`稳定版引擎已就绪，端口: ${PORT}`));
