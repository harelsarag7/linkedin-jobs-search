require('dotenv').config();
const express = require('express');
const linkedIn = require('linkedin-jobs-api');
const cors = require('cors');
const app = express();
const rateLimit = require('express-rate-limit');
const cache = require('node-cache');
const axios = require('axios');

// 更详细的 CORS 配置
app.use(cors({
    origin: process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3000' 
        : ['your-production-domain.vercel.app'],
    methods: ['GET', 'POST'],
    credentials: true
}));
app.use(express.json());
app.use(express.static('public'));

// 创建缓存实例
const jobsCache = new cache({ stdTTL: 3600 }); // 缓存1小时

// 创建限流器
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟窗口
    max: 100 // 限制每个IP 15分钟内最多100个请求
});

// 应用限流中间件
app.use('/api/', limiter);

// 基础欢迎路由
app.get('/api', (req, res) => {
    res.json({ message: 'LinkedIn Jobs API Demo Server is running!' });
});

// 搜索路由
app.post('/api/jobs/search', async (req, res) => {
    try {
        // 生成缓存键
        const cacheKey = JSON.stringify(req.body);
        
        // 检查缓存
        const cachedResult = jobsCache.get(cacheKey);
        if (cachedResult) {
            return res.json(cachedResult);
        }

        // 构建查询选项
        const queryOptions = {
            keyword: req.body.keyword,
            location: req.body.location,
            dateSincePosted: req.body.dateSincePosted,
            jobType: req.body.jobType,
            remoteFilter: req.body.remoteFilter,
            salary: req.body.salary,
            experienceLevel: req.body.experienceLevel,
            limit: req.body.limit || '10',
            sortBy: req.body.sortBy,
            page: req.body.page || '0'
        };

        // 移除空值
        Object.keys(queryOptions).forEach(key => {
            if (!queryOptions[key]) {
                delete queryOptions[key];
            }
        });

        console.log('Searching with options:', queryOptions);

        // 执行搜索
        const jobs = await linkedIn.query(queryOptions);

        console.log(`Found ${jobs.length} jobs`);

        // 存入缓存
        jobsCache.set(cacheKey, {
            success: true,
            jobs: jobs,
            searchParams: queryOptions
        });

        // 返回结果
        res.json({
            success: true,
            jobs: jobs,
            searchParams: queryOptions
        });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'An error occurred during the search'
        });
    }
});

// 添加代理中间件
app.get('/api/proxy-linkedin', async (req, res) => {
    try {
        const { url } = req.query;
        
        // 验证 URL 是否为 LinkedIn 域名
        if (!url.startsWith('https://www.linkedin.com/')) {
            return res.status(400).json({ error: 'Invalid URL' });
        }

        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        res.send(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch LinkedIn page' });
    }
});

// 修改服务器启动逻辑
const PORT = process.env.PORT || 3000;
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`✨ Server is running on http://localhost:${PORT}`);
        console.log(`🚀 API endpoint: http://localhost:${PORT}/api`);
        console.log(`📝 Search endpoint: http://localhost:${PORT}/api/jobs/search`);
    });
}

module.exports = app;