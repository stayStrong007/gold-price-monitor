// 一次性初始化脚本：抓取最近 180 天数据，生成首版 data/gold_prices.json。
// 抓取逻辑复用 ./fetch.js；合并/排序复用 ./merge.js 的纯函数（此处从空数据起步）。
import fs from 'fs';
import {
  brandUrls,
  fetchBrandSeries,
  fetchGold9999Series,
  generateDateRange,
  todayInBeijing,
} from './fetch.js';
import { fillHistoricalGaps } from './fill.js';

(async () => {
  const allData = [];

  // ============ 采集品牌金价 ============
  console.log('📊 开始采集品牌金价...\n');
  for (const brand of brandUrls) {
    console.log(`🔍 ${brand.name}...`);
    try {
      const data = await fetchBrandSeries(brand);
      allData.push({ name: brand.name, data });
      console.log(`✅ ${brand.name}: ${data.length} 条数据`);
    } catch (e) {
      console.error(`❌ ${brand.name} 采集失败:`, e.message);
    }
  }

  // ============ 采集黄金9999（今天往前推 180 天）============
  console.log('\n📊 开始采集黄金9999...\n');
  const today = todayInBeijing();
  const start = new Date(Date.now() + 8 * 3600 * 1000 - 180 * 24 * 3600 * 1000)
    .toISOString()
    .split('T')[0];
  const dates = generateDateRange(start, today);
  const gold9999Data = await fetchGold9999Series(dates);

  if (gold9999Data.length > 0) {
    allData.push({ name: '黄金9999', data: gold9999Data });
    console.log(`✅ 黄金9999: ${gold9999Data.length} 条数据`);
  } else {
    console.log('❌ 黄金9999: 未采集到数据');
  }

  // ============ 排序 + 填充历史缺口 + 保存 ============
  // 统一按日期升序（旧→新），让磁盘上的 JSON 顺序确定，下游无需各自处理
  for (const brand of allData) {
    brand.data.sort((a, b) => a.date.localeCompare(b.date));
    // 填充该品牌自己区间内的历史缺口(不延伸末端)
    brand.data = fillHistoricalGaps(brand.data);
  }
  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync('data/gold_prices.json', JSON.stringify(allData, null, 2));
  const totalCount = allData.reduce((sum, b) => sum + b.data.length, 0);
  console.log(`\n✅ 总计 ${totalCount} 条数据已保存到 data/gold_prices.json`);
})();
