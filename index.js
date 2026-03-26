const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// 1. 这里的连接池配置改为“排队模式”
const pool = new Pool({
  // 确保 process.env.DATABASE_URL 路径绝对正确
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 2, // 限制同时连接数，防止被 Supabase 免费版踢出来
  connectionTimeoutMillis: 15000, 
});

// 模拟分析函数
const analyzeOne = async (url) => {
  const mockScore = Math.floor(Math.random() * 60) + 20;
  const mockReasons = [
    `实时核查：链接 ${url.substring(0, 15)}... 状态正常`,
    "合规确认：未发现违规关键词",
    "风险检测：数据库匹配度极低"
  ];
  return { score: mockScore, reasons: mockReasons };
};

app.post('/api/analyze', async (req, res) => {
  // 适配前端传来的字段（支持单个 url 或 列表 urls）
  const { urls, url } = req.body;
  const targetUrls = urls || (url ? [url] : []);

  if (targetUrls.length === 0) return res.status(400).json({ error: '没有提供有效的链接' });

  const results = [];

  // 2. 关键：用 for...of 循环，一个写完再写下一个，绝对不抢
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
      // 就算单条失败，也不报错，继续跑下一个
    }
  }

  res.json({ message: '分析完成', data: results });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`稳定版引擎已就绪，端口: ${PORT}`));
