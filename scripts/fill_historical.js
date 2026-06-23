// 对已有数据应用历史缺口填充:每个品牌在自己的 [第一天,最后一天] 区间内填充缺失日期。
// 不延伸末端(品牌到 06-20 就只填到 06-20,不因为 9999 到 06-23 就填到 06-23)。
import fs from 'fs';
import { fillHistoricalGaps } from './fill.js';

const DATA_PATH = 'data/gold_prices.json';
const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

for (const brand of data) {
  if (brand.data.length === 0) continue;

  const before = brand.data.length;
  const startBefore = brand.data[0].date;
  const endBefore = brand.data[brand.data.length - 1].date;

  brand.data = fillHistoricalGaps(brand.data);

  const after = brand.data.length;
  const startAfter = brand.data[0].date;
  const endAfter = brand.data[brand.data.length - 1].date;

  if (after !== before) {
    console.log(
      `${brand.name}: ${before}条→${after}条 (填充 ${after - before} 天), 区间 ${startBefore}→${endBefore}`
    );
  } else {
    console.log(`${brand.name}: ${before}条 (无缺口, ${startBefore}→${endBefore})`);
  }
}

fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
console.log(`\n✅ 填充完成,已写回 ${DATA_PATH}`);
