// 前端入口：fetch 数据 → 渲染 Hero（9999）+ 品牌价列表 + 多线对比图 + 品牌简介。
// 数据逻辑（切片/过滤/涨跌幅）在接缝 B ./scripts/chart.js，已被测；此处只做 DOM/ECharts 渲染。
import { sliceForChart, latestChange } from './scripts/chart.js';

const DATA_URL = './data/gold_prices.json';
const fmt = (n) => Number(n).toLocaleString('zh-CN', { maximumFractionDigits: 2 });

// 涨跌幅文本 + 颜色类（红涨绿跌；持平为灰）。
function changeMarkup(change) {
  if (!change || change.diff === null) return { text: '—', cls: 'text-slate-400' };
  const { diff, pct } = change;
  const cls = diff > 0 ? 'text-up' : diff < 0 ? 'text-down' : 'text-slate-400';
  const sign = diff > 0 ? '+' : '';
  const arrow = diff > 0 ? '▲' : diff < 0 ? '▼' : '';
  const text = `${arrow} ${sign}${fmt(diff)} (${sign}${pct.toFixed(2)}%)`;
  return { text, cls };
}

function renderHero(gold9999) {
  const change = latestChange(gold9999 ? gold9999.data : null);
  const priceEl = document.getElementById('hero-price');
  const changeEl = document.getElementById('hero-change');
  const dateEl = document.getElementById('hero-date');

  if (!change) {
    priceEl.textContent = '暂无数据';
    return;
  }
  priceEl.textContent = fmt(change.price);
  dateEl.textContent = change.date;
  const m = changeMarkup(change);
  changeEl.textContent = m.text;
  changeEl.className = `text-lg font-semibold tabular-nums ${m.cls}`;

  renderHeroChart(gold9999.data);
}

function renderHeroChart(series) {
  const chart = echarts.init(document.getElementById('hero-chart'));
  chart.setOption({
    grid: { left: 48, right: 16, top: 16, bottom: 28 },
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: series.map((p) => p.date),
      axisLabel: { color: '#94a3b8', fontSize: 11 },
      axisLine: { lineStyle: { color: '#e2e8f0' } },
    },
    yAxis: {
      type: 'value',
      scale: true,
      axisLabel: { color: '#94a3b8', fontSize: 11 },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
    },
    series: [{
      type: 'line',
      data: series.map((p) => p.price),
      smooth: true,
      symbol: 'none',
      lineStyle: { color: '#C8A15A', width: 2 },
      areaStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(200,161,90,0.25)' },
            { offset: 1, color: 'rgba(200,161,90,0.02)' },
          ],
        },
      },
    }],
  });
  window.addEventListener('resize', () => chart.resize());
}

function renderBrandTable(brands) {
  const tbody = document.getElementById('brand-rows');
  tbody.innerHTML = brands.map((brand) => {
    const change = latestChange(brand.data);
    if (!change) {
      return `<tr><td class="py-2.5">${brand.name}</td><td class="py-2.5 text-right text-slate-400" colspan="3">暂无数据</td></tr>`;
    }
    const m = changeMarkup(change);
    return `
      <tr class="hover:bg-gold-light/10">
        <td class="py-2.5 font-medium">${brand.name}</td>
        <td class="py-2.5 text-right tabular-nums">${fmt(change.price)}</td>
        <td class="py-2.5 text-right tabular-nums font-medium ${m.cls}">${m.text}</td>
        <td class="py-2.5 text-right text-slate-400 hidden sm:table-cell">${change.date}</td>
      </tr>`;
  }).join('');
}

// ============ 多线对比折线图 ============

const LINE_COLORS = [
  '#C8A15A', '#D14343', '#3A9D5D', '#4F86C6',
  '#9B59B6', '#E08E45', '#5D6D7E', '#16A085',
];
const RANGES = [30, 90, 180];

let compareChart = null;
let allData = [];
let selectedNames = new Set();
let currentDays = 30;

function renderCompareControls(data) {
  const box = document.getElementById('compare-checkboxes');
  box.innerHTML = data.map((b, i) => {
    const checked = selectedNames.has(b.name) ? 'checked' : '';
    return `
      <label class="inline-flex items-center gap-1.5 cursor-pointer select-none text-sm">
        <input type="checkbox" value="${b.name}" ${checked}
          class="accent-gold rounded" data-color="${LINE_COLORS[i % LINE_COLORS.length]}" />
        <span>${b.name}</span>
      </label>`;
  }).join('');
  box.querySelectorAll('input[type=checkbox]').forEach((cb) => {
    cb.addEventListener('change', () => {
      if (cb.checked) selectedNames.add(cb.value);
      else selectedNames.delete(cb.value);
      drawCompareChart();
    });
  });

  const rangeBox = document.getElementById('compare-ranges');
  rangeBox.innerHTML = RANGES.map((d) => `
    <button data-days="${d}"
      class="px-3 py-1 rounded-full text-sm border transition
      ${d === currentDays ? 'bg-gold text-white border-gold' : 'border-slate-200 text-slate-500 hover:border-gold'}">
      ${d}天
    </button>`).join('');
  rangeBox.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentDays = Number(btn.dataset.days);
      renderCompareControls(allData); // 刷新按钮高亮
      drawCompareChart();
    });
  });
}

function drawCompareChart() {
  if (!compareChart) {
    compareChart = echarts.init(document.getElementById('compare-chart'));
    window.addEventListener('resize', () => compareChart.resize());
  }
  const names = [...selectedNames];
  const sliced = sliceForChart(allData, currentDays, names);

  // 统一 x 轴：取所有选中线日期的并集并排序
  const dateSet = new Set();
  sliced.forEach((b) => b.data.forEach((p) => dateSet.add(p.date)));
  const dates = [...dateSet].sort();

  const colorOf = (name) => {
    const idx = allData.findIndex((b) => b.name === name);
    return LINE_COLORS[idx % LINE_COLORS.length];
  };

  compareChart.setOption({
    grid: { left: 48, right: 16, top: 16, bottom: 28 },
    tooltip: { trigger: 'axis' },
    legend: { show: false },
    xAxis: {
      type: 'category', data: dates,
      axisLabel: { color: '#94a3b8', fontSize: 11 },
      axisLine: { lineStyle: { color: '#e2e8f0' } },
    },
    yAxis: {
      type: 'value', scale: true,
      axisLabel: { color: '#94a3b8', fontSize: 11 },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
    },
    series: sliced.map((b) => {
      const byDate = Object.fromEntries(b.data.map((p) => [p.date, p.price]));
      return {
        name: b.name, type: 'line', smooth: true, symbol: 'none',
        connectNulls: false,
        data: dates.map((d) => (d in byDate ? byDate[d] : null)),
        lineStyle: { color: colorOf(b.name), width: 2 },
        itemStyle: { color: colorOf(b.name) },
      };
    }),
  }, true);
}

// ============ 品牌简介 ============

const BRAND_INTROS = {
  老凤祥: '老凤祥创始于 1848 年，是中国民族品牌中历史悠久的珠宝企业之一，以传统金银工艺著称。',
  周大福: '周大福创立于 1929 年，源自香港，是华人地区知名的珠宝品牌，门店遍布两岸三地。',
  周六福: '周六福成立于 2004 年，定位大众时尚珠宝，主打高性价比黄金与镶嵌产品。',
  周生生: '周生生创立于 1934 年，香港老牌珠宝商，以工艺与设计见长。',
  六福珠宝: '六福珠宝创立于 1991 年，香港知名珠宝品牌，产品线覆盖黄金、钻石与翡翠。',
  老庙黄金: '老庙黄金始于 1906 年的上海，以“福”文化与足金饰品闻名。',
  周大生: '周大生成立于 1999 年，定位时尚珠宝，是国内门店数量较多的品牌之一。',
};

function renderBrandIntros(brands) {
  const ul = document.getElementById('brand-intros');
  ul.innerHTML = brands.map((b) => {
    const intro = BRAND_INTROS[b.name] || '';
    return `<li><span class="font-medium text-slate-700">${b.name}</span>：${intro}</li>`;
  }).join('');
}

async function main() {
  try {
    const res = await fetch(DATA_URL);
    if (!res.ok) throw new Error(`加载数据失败 (${res.status})`);
    const data = await res.json();

    const gold9999 = data.find((b) => b.name === '黄金9999');
    const brands = data.filter((b) => b.name !== '黄金9999');

    renderHero(gold9999);
    renderBrandTable(brands);

    // 对比图：默认勾选黄金9999
    allData = data;
    selectedNames = new Set(['黄金9999']);
    renderCompareControls(allData);
    drawCompareChart();

    renderBrandIntros(brands);
  } catch (e) {
    const el = document.getElementById('error');
    el.textContent = e.message;
    el.classList.remove('hidden');
  }
}

main();
