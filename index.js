const linkedIn = require('linkedin-jobs-api');

// 创建搜索配置
const queryOptions = {
    keyword: 'full stack developer',
    location: 'Israel',
    dateSincePosted: 'past Week',
    jobType: 'graduate',
    limit: '10',
    page: "0"
};

// 定义主要函数
async function searchJobs() {
    try {
        // 发起搜索请求
        const jobs = await linkedIn.query(queryOptions);
        
        // 处理结果
        console.log('Number of jobs found:', jobs.length);
        
        // 打印每个职位的基本信息
        jobs.forEach((job, index) => {
            console.log(`\n--- Job ${index + 1} ---`);
            console.log('Position:', job.position);
            console.log('Company:', job.company);
            console.log('Location:', job.location);
            console.log('Posted:', job.agoTime);
            console.log('Details:', job.jobUrl);
        });
    } catch (error) {
        console.error('Search error:', error);
    }
}

// 运行搜索
// searchJobs();