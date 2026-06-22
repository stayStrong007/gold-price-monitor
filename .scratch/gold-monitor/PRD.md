# PRD: 金价监控网站

Status: ready-for-agent

## Problem Statement

普通消费者想买金饰或关注金价时，缺一个简单、直观、可信的地方一眼看清：今天的金价（黄金9999/大盘）是多少、比昨天涨还是跌、各大品牌今天报价多少、最近一段时间走势如何。现有渠道要么是面向交易者的复杂行情站（信息过载、术语劝退），要么是各品牌官网各自为政（无法横向对比）。消费者需要的是“参考数据”，不是交易工具。

## Solution

一个面向普通消费者的**单页静态网站**，部署在 GitHub Pages，每天通过 GitHub Action 自动抓取并更新数据。页面自上而下呈现：

1. **Hero 区** —— 黄金9999（即“大盘”）当前价 + 今日涨跌幅 + 走势图，作为视觉与信息焦点。
2. **品牌价列表** —— 7 个主流品牌（老凤祥、周大福、周六福、周生生、六福珠宝、老庙黄金、周大生）今日价格 + 今日涨跌幅，表格呈现。
3. **多线对比折线图** —— 顶部复选框选择展示哪些线（默认勾选黄金9999），并可切换时间区间（30 / 90 / 180 天），用于横向对比大盘与各品牌走势。
4. **品牌简介** —— 页面底部，纯文字无序列表，手写静态文本。

数据初始版本即包含最近 180 天历史，之后每日自动增量更新。视觉追求“简单但好看”：纯 HTML/CSS/JS 无框架，借助 Tailwind CDN（排版）与 ECharts（图表）达成精致度，浅色卡片式布局 + 金色点缀，遵循中国习惯**红涨绿跌**。

## User Stories

1. As a 普通消费者, I want to see 黄金9999 当前价格 at the top of the page, so that I can quickly know today's benchmark gold price.
2. As a 普通消费者, I want to see 黄金9999 今日涨跌幅 (相对前一天), so that I can tell at a glance whether gold went up or down today.
3. As a 普通消费者, I want a 走势图 for 黄金9999 in the Hero area, so that I can sense the recent trend without reading numbers.
4. As a 普通消费者, I want a list of 各品牌今日价格, so that I can compare what each major brand charges today.
5. As a 普通消费者, I want each brand row to show 今日涨跌幅, so that I can see which brands moved and by how much.
6. As a 普通消费者, I want 涨跌幅以红涨绿跌 colour-coded, so that the direction matches my cultural intuition.
7. As a 普通消费者, I want a 多线对比折线图, so that I can compare the trend of 大盘 against specific brands.
8. As a 普通消费者, I want 复选框 to choose which lines appear on the comparison chart, so that I can declutter and focus on lines I care about.
9. As a 普通消费者, I want 黄金9999 勾选 by default on the comparison chart, so that the benchmark is always my reference point.
10. As a 普通消费者, I want to switch the chart range between 30 / 90 / 180 天, so that I can zoom between recent moves and the longer trend.
11. As a 普通消费者, I want 品牌简介 at the bottom of the page, so that I understand who each brand is.
12. As a 普通消费者, I want the site to load fresh data each day, so that the prices I see are current.
13. As a 普通消费者, I want the page to work without logging in or any interaction barrier, so that I can just open it and read.
14. As a 网站维护者, I want a one-off 初始化脚本 that fetches the last 180 days, so that the first published version already has data.
15. As a 网站维护者, I want a 每日更新脚本 that reads existing data, fetches only the increment, merges, and writes back, so that updates are cheap and don't re-scrape history.
16. As a 网站维护者, I want the 每日脚本 to tolerate a missed day, so that a skipped run self-heals by backfilling the gap on the next run.
17. As a 网站维护者, I want the merge to never overwrite good history with a partial failure, so that the site doesn't silently lose data.
18. As a 网站维护者, I want data to start at 180 天 and only ever grow (never trimmed), so that history accumulates as a record of fact while the front end decides how much to show.
19. As a 网站维护者, I want a GitHub Action to run the 每日脚本 on a schedule and commit the updated data file, so that updates are fully automated.
20. As a 网站维护者, I want the front end to fetch the data file at runtime, so that no build step is needed and the Action only commits data.
21. As a 网站维护者, I want to hand-write each brand's 简介 once as static text, so that I never have to scrape or maintain descriptions.

## Implementation Decisions

### 数据源与采集
- **单数据源** `sczxdx.com`。品牌价经其 `api.php`（先从品牌页提取 symbol 再请求接口，接口返回该品牌一整段历史序列）；黄金9999 按日期逐天解析其历史页 HTML。
- **不做兜底/不做失败报警**：这是一个有意识的取舍（求简单），将来若发现更新有问题再改。仅依赖 GitHub Action 在脚本非零退出时的默认失败通知（无需额外编码）。

### 数据形态与范围
- 初始区间：**最近 180 天**起步；之后**数据只增不减**（合并时不裁剪，历史累积保留）。展示由前端按 30/90/180 切片决定，与数据存量解耦。
- 黄金9999：初始化时主动抓最近 180 天（今天向前推 180 天）。
- 品牌价：`api.php` 返回多少存多少（数据源客观限制，不强行补齐、也不主动裁剪）。
- 数据持久化为单个 JSON 文件，结构沿用现有脚本约定：一个数组，每个元素 `{ name, data: [{ date, price }] }`，`date` 为 `YYYY-MM-DD`，按北京时间（UTC+8）归一。每个品牌的 `data` 统一**按日期升序**排列。“大盘” = 名为 `黄金9999` 的那个元素，无单独数据源。

### 脚本（两个，分工明确）
- **一次性初始化脚本**（改造现有脚本）：将写死的近两年日期区间改为“今天向前推 180 天”；存盘前统一按日期升序排序、并确保 `data/` 目录存在。负责生成首版数据文件。
- **每日更新脚本**（新建）：核心逻辑 = `读取已有数据 → 只抓增量 → 合并去重排序（不裁剪）→ 写回`。品牌价直接拿接口整段与旧数据按 `date` 合并；黄金9999 仅抓“数���中最后一天 → 今天”这几天。读旧数据再合并的设计天然容忍漏跑（次日自动补齐缺口）。

### 核心模块（测试接缝 A，最高价值接缝）
- 抽出一个**纯函数** `mergeGoldData(oldData, freshData) → newData`，承载全部按 `date` 合并 / 去重（同日新值覆盖旧值）/ 升序排序 / 保留全部历史（**不裁剪**）/ 缺天经新数据补齐的逻辑，不含任何网络 I/O、不改入参。每日脚本只负责“抓取 → 调用纯函数 → 写文件”这层薄壳。

### 前端（单页，无路由，无框架，无构建步骤）
- 纯 HTML/CSS/JS。**Tailwind CDN** 负责排版，**ECharts** 负责所有图表。
- **运行时 fetch**：页面加载时 `fetch` 数据 JSON 直接渲染；网站本身不参与每日构建。
- 布局：Hero（9999 价 + 今日涨跌幅 + 走势图）→ 品牌价列表（表格）→ 多线对比折线图（复选框选线，默认勾 9999；时间区间 30/90/180 切换）→ 品牌简介（底部纯文字无序列表，手写）。
- 视觉：浅色卡片式 + 金色点缀；**红涨绿跌**。
- “今日涨跌幅” = 最新一天价格相对前一天价格的百分比变化。

### 前端切片模块（测试接缝 B）
- 抽出一个**纯函数**（概念名 `sliceForChart(data, days, selectedNames) → 待渲染数据`），承载“按所选区间切片 + 按所选线过滤 + 涨跌幅计算”，与 ECharts 渲染解耦。

### 部署/自动化
- **GitHub Pages** 托管单页站。
- **GitHub Action**：定时（每天固定一次，具体时刻取一个建议值，可调）运行每日更新脚本 → 将变更后的数据 JSON 自动 commit & push 回仓库 → Pages 监听 push 自动发布。

## Testing Decisions

- **好测试的标准**：只验证外部可观察行为，不绑定实现细节。测试喂入构造好的输入数据、断言输出数据，重命名内部变量或调整内部步骤不应使其失败。测试读起来像规格说明。
- **测试接缝 A（主）—— 数据合并纯函数**：
  - 喂构造的旧数据 + 新抓数据，断言：重复日期正确去重（同日新值覆盖旧值）；合并后升序排列；**全部历史被保留、不丢任何老数据（不裁剪）**；漏跑场景下缺失天数经新数据补齐；品牌数据不足时按实保留、不报错。
  - 完全不触网，快速、稳定、不依赖 `sczxdx.com`。
- **测试接缝 B —— 前端切片纯函数**：
  - 断言：选 30 天仅返回 30 天；切换选中的线仅返回选中项；涨跌幅按“最新 vs 前一天”计算。
- **Prior art**：当前仓库无既有测试，本特性建立首套测试约定。
- 采用 vertical slice / tracer bullet 方式逐个 red-green，不一次性写完所有测试。

## Out of Scope

- 实际抓取 `sczxdx.com` 的网络 I/O 与其 HTML 结构解析，**不纳入自动化测试**（脆、慢、依赖外部站点），靠手动运行脚本验证。
- ECharts 渲染本身的测试（属图库职责）。
- 抓取失败的主动报警 / 多数据源容错 / 兜底机制（明确取舍，未来按需再加）。
- 品牌详情页、路由、多页面（确定为单页）。
- 历史涨跌幅趋势图（曾考虑，已砍掉）。
- 品牌价与 9999 的双 Y 轴（量级接近，同轴即可）。
- 品牌简介的抓取（手写静态文本）。
- 更长区间视图（如“1 年”“全部”）：v1 前端只提供 30/90/180 切换；但数据层只增不减地累积全部历史，故将来加更长视图无需改数据，零成本。

## Further Notes

- 现有一次性脚本中，品牌价与黄金9999 走两条不同采集路径（接口 vs HTML 解析），改造与新建脚本时需分别处理；时间统一按北京时间 UTC+8 归一为 `YYYY-MM-DD`。
- “大盘”与“黄金9999”是同一数据，仅展示层面将其作为基准突出，PRD 与后续 issue 中统一使用 `黄金9999` 指代该数据、用“大盘”指代其在 Hero 区的呈现角色。
- 仓库当前无 `CONTEXT.md` / `docs/adr`，符合 single-context 懒创建约定；若后续术语或决策需要固化，由 domain-modeling 流程懒创建。
