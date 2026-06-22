// 每日更新脚本（薄壳）：读已有数据 → 只抓增量 → mergeGoldData 合并 → 写回。
// 抓取属网络 I/O（PRD Out of Scope，不写自动化测试）；合并逻辑已由 merge.test.js 覆盖。
import fs from 'fs';
import {
  brandUrls,
  fetchBrandSeries,
  fetchGold9999Series,
  generateDateRange,
  todayInBeijing,
} from './fetch.js';
import { mergeGoldData } from './merge.js';

const DATA_PATH = 'data/gold_prices.json';

// 把 YYYY-MM-DD 转成抓取用的 YYYYMMDD。
function compact(dateStr) {
  return dateStr.replace(/-/g, '');
}

// 求某品牌已有数据里的最后一天（升序，故取末尾）；无数据则返回 null。
function lastDateOf(series) {
  return series.length ? series[series.length - 1].date : null;
}

(async () => {
  // ============ 读已有数据 ============
  if (!fs.existsSync(DATA_PATH)) {
    console.error(`❌ ${DATA_PATH} 不存在，请先运行一次性初始化脚本 fetch_history.js`);
    process.exit(1);
  }
  const oldData = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const today = todayInBeijing();

  // ============ 抓增量 ============
  const freshData = [];

  // 品牌价：接口返回整段，直接交给 mergeGoldData 去重合并即可。
  console.log('📊 抓取品牌金价增量...\n');
  for (const brand of brandUrls) {
    console.log(`🔍 ${brand.name}...`);
    try {
      const data = await fetchBrandSeries(brand);
      freshData.push({ name: brand.name, data });
      console.log(`✅ ${brand.name}: ${data.length} 条`);
    } catch (e) {
      console.error(`❌ ${brand.name} 抓取失败:`, e.message);
    }
  }

  // 黄金9999：只抓「已有数据最后一天 → 今天」这几天（通常 1 天）。
  console.log('\n📊 抓取黄金9999增量...\n');
  const old9999 = oldData.find((b) => b.name === '黄金9999');
  const last = old9999 ? lastDateOf(old9999.data) : null;
  // 无历史则从今天起步；有历史则从最后一天起（端点重叠由 mergeGoldData 去重）。
  const start = last || today;
  const dates = generateDateRange(start, today).map(compact);
  const gold9999Data = await fetchGold9999Series(dates);
  if (gold9999Data.length > 0) {
    freshData.push({ name: '黄金9999', data: gold9999Data });
    console.log(`✅ 黄金9999: ${gold9999Data.length} 条`);
  } else {
    console.log('ℹ️ 黄金9999: 本次无新增');
  }

  // ============ 合并 + 写回 ============
  const newData = mergeGoldData(oldData, freshData);
  fs.writeFileSync(DATA_PATH, JSON.stringify(newData, null, 2));
  const totalCount = newData.reduce((sum, b) => sum + b.data.length, 0);
  console.log(`\n✅ 更新完成，共 ${totalCount} 条数据写回 ${DATA_PATH}`);
})();
