// sczxdx.com 抓取逻辑（品牌价 API + 黄金9999 HTML 解析）。
// 一次性脚本与每日脚本共享，使抓取脆弱点收敛到一处。
import https from 'https';

export const brandUrls = [
  { name: '老凤祥', url: 'https://www.sczxdx.com/pinpaijinjia/laofengxiang.html' },
  { name: '周大福', url: 'https://www.sczxdx.com/pinpaijinjia/zhoudafu.html' },
  { name: '周六福', url: 'https://www.sczxdx.com/pinpaijinjia/zhouliufu.html' },
  { name: '周生生', url: 'https://www.sczxdx.com/pinpaijinjia/zhoushengsheng.html' },
  { name: '六福珠宝', url: 'https://www.sczxdx.com/pinpaijinjia/liufu.html' },
  { name: '老庙黄金', url: 'https://www.sczxdx.com/pinpaijinjia/laomiao.html' },
  { name: '周大生', url: 'https://www.sczxdx.com/pinpaijinjia/zhoudasheng.html' },
];

// ============ 品牌金价采集（API方式） ============

export function extractSymbol(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let html = '';
      res.on('data', (chunk) => (html += chunk));
      res.on('end', () => {
        const match = html.match(/TOOLCMS\s*=\s*({[^;]+});/);
        if (match) {
          const config = eval(`(${match[1]})`);
          resolve(config.symbol);
        } else {
          reject(new Error('未找到品种代码'));
        }
      });
    }).on('error', reject);
  });
}

export function fetchData(symbol) {
  return new Promise((resolve, reject) => {
    const url = `https://www.sczxdx.com/api.php?symbol=${symbol}&auth=www.sczxdx.com`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.data.data);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// 抓取单个品牌的整段序列，归一为 [{date, price}]（北京时间 UTC+8）升序。
export async function fetchBrandSeries(brand) {
  const symbol = await extractSymbol(brand.url);
  const priceData = await fetchData(symbol);
  return priceData.map(([timestamp, price]) => {
    const bjDate = new Date(timestamp + 8 * 3600 * 1000);
    return { date: bjDate.toISOString().split('T')[0], price };
  });
}

// ============ 黄金9999采集（HTML解析方式） ============

export function fetchGold9999Price(dateStr) {
  return new Promise((resolve, reject) => {
    const url = `https://www.sczxdx.com/lishijinjia/${dateStr}.html`;
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        return resolve(null);
      }
      let html = '';
      res.on('data', (chunk) => (html += chunk));
      res.on('end', () => {
        // 匹配带千位分隔符的价格,如 1,008 或 1,148.5 或 982.8
        const match = html.match(/黄金9999[\s\S]*?<div class="xj[^"]*">([0-9,]+\.?[0-9]*)/);
        if (match) {
          // 去掉逗号后转数字
          const priceStr = match[1].replace(/,/g, '');
          resolve(parseFloat(priceStr));
        } else {
          resolve(null);
        }
      });
    }).on('error', reject);
  });
}

// 生成 [startDate, endDate] 之间每天的 YYYYMMDD 字符串（含端点）。
export function generateDateRange(startDate, endDate) {
  const dates = [];
  const current = new Date(startDate);
  const end = new Date(endDate);
  while (current <= end) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    dates.push(`${y}${m}${d}`);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

// 抓取一段日期区间的黄金9999，归一为 [{date, price}]（仅保留抓到的天）。
export async function fetchGold9999Series(dateStrs) {
  const series = [];
  for (const dateStr of dateStrs) {
    const price = await fetchGold9999Price(dateStr);
    if (price) {
      const date = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
      series.push({ date, price });
    }
  }
  return series;
}

// 今天的日期（北京时间 UTC+8），返回 YYYY-MM-DD。
export function todayInBeijing() {
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().split('T')[0];
}
