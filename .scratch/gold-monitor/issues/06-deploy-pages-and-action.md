# 06 · 部署：GitHub Pages + Action 每日自动更新

Status: ready-for-agent

## 切片目标（tracer bullet）

最后一条端到端细线：把站点发布到 **GitHub Pages**，并用 **GitHub Action** 定时跑切片 03 的每日脚本、自动 commit 更新后的数据 JSON，触发 Pages 重新发布。

做完这片，整个系统**全自动闭环**：人不再介入，每天数据自己更新、网站自己刷新。

## 完成的样子（可亲眼验证）

- 站点通过 GitHub Pages 公网可访问，展示真实数据。
- Action 按 cron 每天固定一次运行每日更新脚本。
- 脚本产生数据变更后，Action 自动 commit & push 回仓库。
- Pages 监听 push 自动发布，页面运行时 fetch 到的是最新 JSON。
- 手动触发一次 Action 验证整条链路跑通。

## 不在本切片

- 抓取失败的主动报警/多源容错（PRD 取舍，未来按需）。

## 备注

- cron 取一个建议时刻（可调）。
- 前端是运行时 fetch，无构建步骤，故 Action 只需「跑脚本 + commit 数据」，不碰前端构建。
- 依赖 Action 非零退出的默认失败通知作为唯一「报警」。
