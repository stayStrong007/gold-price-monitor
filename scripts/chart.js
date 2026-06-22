// 接缝 B：对比折线图的数据逻辑（切片/过滤）+ 涨跌幅计算。纯函数，不碰 DOM/ECharts、不改入参。

/**
 * 最新一天相对前一天的涨跌。
 * @param {Array<{date:string,price:number}>} series 升序的价格序列
 * @returns {{price:number,date:string,diff:number|null,pct:number|null}|null}
 *   空序列返回 null；只有一天时 diff/pct 为 null。
 */
export function latestChange(series) {
  if (!series || series.length === 0) return null;
  const last = series[series.length - 1];
  if (series.length === 1) {
    return { price: last.price, date: last.date, diff: null, pct: null };
  }
  const prev = series[series.length - 2];
  const diff = last.price - prev.price;
  const pct = (diff / prev.price) * 100;
  return { price: last.price, date: last.date, diff, pct };
}

/**
 * 为对比折线图准备数据：按 selectedNames 过滤出要画的线。
 * @param {Array<{name:string,data:Array<{date:string,price:number}>}>} data 完整数据
 * @param {number} days 区间天数（30|90|180）
 * @param {string[]} selectedNames 勾选的线
 * @returns {Array<{name:string,data:Array<{date:string,price:number}>}>}
 */
export function sliceForChart(data, days, selectedNames) {
  const selected = data.filter((b) => selectedNames.includes(b.name));

  // 全局最新日期 = 所有选中线里最大的那天，作为统一窗口右界。
  let latest = '';
  for (const b of selected) {
    const last = b.data.length ? b.data[b.data.length - 1].date : '';
    if (last > latest) latest = last;
  }
  if (!latest) return selected.map((b) => ({ name: b.name, data: [] }));

  // 窗口左界 = 最新日期往前 days-1 天（含两端共 days 天）。
  const cutoff = new Date(latest);
  cutoff.setDate(cutoff.getDate() - (days - 1));
  const cutoffStr = cutoff.toISOString().split('T')[0];

  return selected.map((b) => ({
    name: b.name,
    data: b.data.filter((p) => p.date >= cutoffStr),
  }));
}
