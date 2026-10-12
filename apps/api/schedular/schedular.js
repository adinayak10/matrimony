const cron = require('node-cron');
const runInterestMonitor = require('../services/detectInterestMonitor');
const { emitSecondChanceSuggestions } = require('../services/secondChange');

// 🕒 Interest Monitor (Every 15 minutes)
cron.schedule('*/15 * * * *', async () => {
  const start = new Date();
  console.log(`[${start.toISOString()}] 🕒 Starting Interest Monitor Task...`);

  try {
    await runInterestMonitor();
    const end = new Date();
    console.log(`[${end.toISOString()}] ✅ Interest Monitor Completed in ${((end - start) / 1000).toFixed(2)}s`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] ❌ Interest Monitor Error:`, err);
  }
});

// ⏰ Second Chance Timer (Every 30 minutes)
cron.schedule('*/30 * * * *', async () => {
  const start = new Date();
  console.log(`[${start.toISOString()}] ⏰ Starting Second Chance Timer Task...`);

  try {
    await emitSecondChanceSuggestions();
    const end = new Date();
    console.log(`[${end.toISOString()}] ✅ Second Chance Timer Completed in ${((end - start) / 1000).toFixed(2)}s`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] ❌ Second Chance Timer Error:`, err);
  }
});
