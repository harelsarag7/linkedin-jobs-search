const express = require('express');
const cors = require('cors');
const jobsRouter = require('./routes/jobs');

const app = express();

// 中间件
app.use(cors());
app.use(express.json());

// 路由
app.use('/api/jobs', jobsRouter);

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        error: err.message
    });
});

module.exports = app;