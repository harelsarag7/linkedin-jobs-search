const linkedIn = require('linkedin-jobs-api');

// 创建搜索配置
const queryOptions = {
    keyword: 'software engineer',     // 搜索关键词
    location: 'new zealand',             // 地点
    dateSincePosted: 'past Week',    // 过去一周发布的职位
    jobType: 'graduate',            // 全职
    limit: '100',                     // 限制返回10条结果
    page: "0"                        // 第一页
};

// 定义主要函数
async function searchJobs() {
    try {
        // 发起搜索请求
        const jobs = await linkedIn.query(queryOptions);
        
        // 处理结果
        console.log('找到的职位数量:', jobs.length);
        
        // 打印每个职位的基本信息
        jobs.forEach((job, index) => {
            console.log(`\n--- 职位 ${index + 1} ---`);
            console.log('职位名称:', job.position);
            console.log('公司:', job.company);
            console.log('地点:', job.location);
            console.log('发布时间:', job.agoTime);
            console.log('详情链接:', job.jobUrl);
            console.log('------------------------');
        });
    } catch (error) {
        console.error('搜索出错:', error);
    }
}

// 运行搜索
searchJobs();