import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sliceForChart, latestChange } from './chart.js';

test('latestChange：下跌时 diff/pct 为负', () => {
  const series = [
    { date: '2026-06-21', price: 936 },
    { date: '2026-06-22', price: 917 },
  ];
  const c = latestChange(series);
  assert.equal(c.price, 917);
  assert.equal(c.date, '2026-06-22');
  assert.equal(c.diff, -19);
  assert.ok(c.pct < 0 && Math.abs(c.pct - (-19 / 936) * 100) < 1e-9);
});

test('latestChange：上涨时 diff/pct 为正', () => {
  const c = latestChange([
    { date: '2026-06-21', price: 900 },
    { date: '2026-06-22', price: 909 },
  ]);
  assert.equal(c.diff, 9);
  assert.ok(c.pct > 0);
});

test('latestChange：只有一天数据时 diff/pct 为 null（数据不足）', () => {
  const c = latestChange([{ date: '2026-06-22', price: 917 }]);
  assert.equal(c.price, 917);
  assert.equal(c.diff, null);
  assert.equal(c.pct, null);
});

test('latestChange：空序列返回 null', () => {
  assert.equal(latestChange([]), null);
});

test('按全局最新日期定统一窗口：末端滞后的线只保留落在窗口内的点（右端留空）', () => {
  const data = [
    {
      name: '黄金9999',
      data: [
        { date: '2026-06-18', price: 910 },
        { date: '2026-06-19', price: 912 },
        { date: '2026-06-20', price: 914 },
        { date: '2026-06-21', price: 916 },
        { date: '2026-06-22', price: 917 }, // 全局最新
      ],
    },
    {
      name: '老凤祥',
      data: [
        { date: '2026-06-17', price: 1250 },
        { date: '2026-06-18', price: 1255 },
        { date: '2026-06-19', price: 1265 },
        { date: '2026-06-20', price: 1258 }, // 末端滞后于 9999
      ],
    },
  ];

  // days=3 → 窗口 [06-20, 06-22]（以全局最新 06-22 为基准）
  const result = sliceForChart(data, 3, ['黄金9999', '老凤祥']);

  const g = result.find((b) => b.name === '黄金9999');
  const lfx = result.find((b) => b.name === '老凤祥');
  assert.deepEqual(
    g.data.map((p) => p.date),
    ['2026-06-20', '2026-06-21', '2026-06-22']
  );
  // 老凤祥只有 06-20 落在窗口内；06-17/18/19 在窗口左界之外，被排除
  assert.deepEqual(
    lfx.data.map((p) => p.date),
    ['2026-06-20']
  );
});

test('每条线只保留最近 days 天的数据点', () => {
  const data = [
    {
      name: '黄金9999',
      data: [
        { date: '2026-06-18', price: 910 },
        { date: '2026-06-19', price: 912 },
        { date: '2026-06-20', price: 914 },
        { date: '2026-06-21', price: 916 },
        { date: '2026-06-22', price: 917 },
      ],
    },
  ];

  const result = sliceForChart(data, 3, ['黄金9999']);

  const dates = result[0].data.map((p) => p.date);
  assert.deepEqual(dates, ['2026-06-20', '2026-06-21', '2026-06-22']);
});

test('只返回 selectedNames 里的线，其余过滤掉', () => {
  const data = [
    { name: '黄金9999', data: [{ date: '2026-06-22', price: 917 }] },
    { name: '老凤祥', data: [{ date: '2026-06-22', price: 1258 }] },
    { name: '周大福', data: [{ date: '2026-06-22', price: 1261 }] },
  ];

  const result = sliceForChart(data, 180, ['黄金9999', '老凤祥']);

  const names = result.map((b) => b.name);
  assert.deepEqual(names, ['黄金9999', '老凤祥']);
});
