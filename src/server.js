require('dotenv').config();
const express = require('express');
const linkedIn = require('linkedin-jobs-api');
const app = express();

app.use(express.json());
app.use(express.static('public'));

// 基础欢迎路由
app.get('/', (req, res) => {
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
            error: error.message || '搜索过程中发生错误'
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to access the application`);
});