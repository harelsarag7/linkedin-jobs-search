const express = require('express');
const router = express.Router();
const jobsController = require('../controllers/jobsController');

// 基础搜索
router.post('/search', jobsController.searchJobs);

// 高级搜索
router.post('/advanced-search', jobsController.advancedSearch);

// 获取最新职位
router.get('/recent', jobsController.getRecentJobs);

// 按经验级别搜索
router.post('/by-experience', jobsController.searchByExperience);

// 按薪资范围搜索
router.post('/by-salary', jobsController.searchBySalary);

// 远程工作机会
router.post('/remote', jobsController.searchRemoteJobs);

// 分页搜索
router.post('/paginated', jobsController.paginatedSearch);

module.exports = router;