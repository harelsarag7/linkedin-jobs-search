require('dotenv').config();
const express = require('express');
const linkedIn = require('linkedin-jobs-api');
const cors = require('cors');
const app = express();

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

// 基础欢迎路由
app.get('/api', (req, res) => {
    res.json({ message: 'LinkedIn Jobs API Demo Server is running!' });
});

// 搜索路由
app.post('/api/jobs/search', async (req, res) => {
    try {
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