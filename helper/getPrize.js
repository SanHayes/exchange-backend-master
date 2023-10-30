const Helper = require("../helpers");

function getPrize() {
  const config = Helper.getConfig('streak-challenge');
  if (!config) {
    return;
  }

  const range = config.range;

  const currentDate = new Date();
  const ONE_DAY_TO_MINS = 24 * 60;
  const currentMins = (currentDate.getHours() + currentDate.getMinutes()) / ONE_DAY_TO_MINS;
  return {
    sum: ((Number(range[1]) - Number(range[0])) * currentMins) + Number(range[0]),
    precent: Number(config.precentPrize)
  };
}

module.exports = { getPrize }