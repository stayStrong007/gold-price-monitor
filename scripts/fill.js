// 数据填充:对历史区间的缺失日期用前一天价格填充,消除图表缺口;但不填充末端缺口。

/**
 * 基础前向填充:从 start 到 end 之间,每个不在 data 里的日期用前一天价格填充。
 * @param {Array<{date:string,price:number}>} data 原始数据(升序)
 * @param {string} startDate YYYY-MM-DD
 * @param {string} endDate YYYY-MM-DD
 * @returns {Array<{date:string,price:number}>} 填充后的连续序列(升序)
 */
function forwardFill(data, startDate, endDate) {
  if (data.length === 0) return [];

  const byDate = Object.fromEntries(data.map((p) => [p.date, p.price]));
  const result = [];
  let lastPrice = null;

  const current = new Date(startDate);
  const end = new Date(endDate);
  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0];
    if (dateStr in byDate) {
      lastPrice = byDate[dateStr];
      result.push({ date: dateStr, price: lastPrice });
    } else if (lastPrice !== null) {
      result.push({ date: dateStr, price: lastPrice });
    }
    current.setDate(current.getDate() + 1);
  }
  return result;
}

/**
 * 对历史区间填充:填充该品牌自己的 [第一天, 最后一天] 区间内的所有缺口。
 * 不延伸到全局最新日期(即:不因为其他品牌更新了就把这个品牌也填到最新)。
 * @param {Array<{date:string,price:number}>} data 原始数据(升序)
 * @returns {Array<{date:string,price:number}>} 填充后的序列
 */
export function fillHistoricalGaps(data) {
  if (data.length === 0) return [];
  const start = data[0].date;
  const end = data[data.length - 1].date;
  return forwardFill(data, start, end);
}
