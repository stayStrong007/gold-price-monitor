/**
 * 合并金价数据：把新抓取的数据并入已有数据。
 * 纯函数：不读文件、不触网、不修改入参。
 *
 * @param {Array<{name:string,data:Array<{date:string,price:number}>}>} oldData 已有数据
 * @param {Array<{name:string,data:Array<{date:string,price:number}>}>} freshData 新抓取数据
 * @returns {Array<{name:string,data:Array<{date:string,price:number}>}>} 合并后的数据
 */
export function mergeGoldData(oldData, freshData) {
  // 品牌名取并集：oldData 的顺序优先，freshData 独有的品牌追加在后
  const names = [...oldData.map((b) => b.name)];
  for (const b of freshData) {
    if (!names.includes(b.name)) names.push(b.name);
  }

  return names.map((name) => {
    const old = oldData.find((b) => b.name === name);
    const fresh = freshData.find((b) => b.name === name);
    // 按 date 收敛去重；fresh 在后，故同日新值覆盖旧值
    const byDate = new Map();
    for (const point of [
      ...(old ? old.data : []),
      ...(fresh ? fresh.data : []),
    ]) {
      byDate.set(point.date, point);
    }
    const merged = [...byDate.values()];
    merged.sort((a, b) => a.date.localeCompare(b.date));
    return { name, data: merged };
  });
}
