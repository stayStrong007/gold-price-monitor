import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeGoldData } from './merge.js';

test('新品牌：freshData 带来 oldData 里没有的品牌时，该品牌被纳入结果', () => {
  const oldData = [
    { name: '黄金9999', data: [{ date: '2026-06-20', price: 915 }] },
  ];
  const freshData = [
    { name: '黄金9999', data: [{ date: '2026-06-21', price: 916 }] },
    { name: '老凤祥', data: [{ date: '2026-06-21', price: 1260 }] }, // 旧数据里没有
  ];

  const result = mergeGoldData(oldData, freshData);

  const names = result.map((b) => b.name);
  assert.ok(names.includes('老凤祥'), '新出现的品牌应被纳入');
  const laofengxiang = result.find((b) => b.name === '老凤祥');
  assert.deepEqual(laofengxiang.data, [{ date: '2026-06-21', price: 1260 }]);
});

test('漏跑自愈：旧数据缺中间几天，新数据带来这些天 → 缺口补齐', () => {
  // 旧数据缺了 06-19、06-20（假设 Action 那两天漏跑）
  const oldData = [
    {
      name: '黄金9999',
      data: [
        { date: '2026-06-18', price: 910 },
        { date: '2026-06-21', price: 916 },
      ],
    },
  ];
  // 新数据一次性带来 06-19 ~ 06-22（薄壳会抓“最后一天→今天”这段）
  const freshData = [
    {
      name: '黄金9999',
      data: [
        { date: '2026-06-19', price: 912 },
        { date: '2026-06-20', price: 914 },
        { date: '2026-06-22', price: 918 },
      ],
    },
  ];

  const result = mergeGoldData(oldData, freshData);

  const dates = result[0].data.map((p) => p.date);
  assert.deepEqual(dates, [
    '2026-06-18',
    '2026-06-19',
    '2026-06-20',
    '2026-06-21',
    '2026-06-22',
  ]);
});

test('保留全部历史：很久以前的老数据合并后依然在，不裁剪（数据只增不减）', () => {
  const oldData = [
    {
      name: '黄金9999',
      data: [
        { date: '2025-01-01', price: 800 }, // 远早于 180 天前
        { date: '2026-06-20', price: 915 },
      ],
    },
  ];
  const freshData = [
    { name: '黄金9999', data: [{ date: '2026-06-22', price: 917 }] },
  ];

  const result = mergeGoldData(oldData, freshData);

  const dates = result[0].data.map((p) => p.date);
  assert.ok(dates.includes('2025-01-01'), '最老的历史数据应被保留');
  assert.deepEqual(dates, ['2025-01-01', '2026-06-20', '2026-06-22']);
});

test('重复日期：同一天出现两个价，以新数据为准（新值覆盖旧值）', () => {
  const oldData = [
    { name: '黄金9999', data: [{ date: '2026-01-01', price: 900 }] },
  ];
  const freshData = [
    { name: '黄金9999', data: [{ date: '2026-01-01', price: 905 }] },
  ];

  const result = mergeGoldData(oldData, freshData);

  assert.deepEqual(result[0].data, [{ date: '2026-01-01', price: 905 }]);
});

test('合并同名品牌的旧数据与新数据，结果按日期升序', () => {
  const oldData = [
    { name: '黄金9999', data: [{ date: '2026-01-01', price: 900 }] },
  ];
  const freshData = [
    { name: '黄金9999', data: [{ date: '2026-01-02', price: 910 }] },
  ];

  const result = mergeGoldData(oldData, freshData);

  assert.equal(result.length, 1);
  assert.equal(result[0].name, '黄金9999');
  assert.deepEqual(result[0].data, [
    { date: '2026-01-01', price: 900 },
    { date: '2026-01-02', price: 910 },
  ]);
});
