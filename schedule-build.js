import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 设置定时间隔（毫秒），这里设置为1小时（3600000毫秒）
const INTERVAL_MS = 5000; // 1秒

function runBuild() {
  console.log(`[${new Date().toISOString()}] 开始执行 npm run build`);

  exec('npm run build', { cwd: __dirname }, (error, stdout, stderr) => {
    if (error) {
      console.error(`[${new Date().toISOString()}] 执行失败: ${error.message}`);
      return;
    }

    if (stderr) {
      console.error(`[${new Date().toISOString()}] 标准错误: ${stderr}`);
    }

    console.log(`[${new Date().toISOString()}] 执行成功: ${stdout}`);
  });
}

// 立即执行一次
runBuild();

// 设置定时器，每隔指定时间执行一次
setInterval(runBuild, INTERVAL_MS);

console.log(`定时任务已启动，每 ${INTERVAL_MS / 1000 / 60} 分钟执行一次 npm run build`);