const cron = require("cron");
var db = require("../database");

const job = new cron.CronJob({
  cronTime: "0 0 1 * *", // 0h tháng mới
  onTick: async () => {
      cleanData();
  }
});

async function cleanData() {
  db.query(`delete from trade_history WHERE MONTH(created_at) != MONTH(now())`);
  db.query(`delete from commission_history WHERE MONTH(created_at) != MONTH(now())`);
  db.query(`delete from bet_history WHERE MONTH(created_at) != MONTH(now())`);
}

job.start();