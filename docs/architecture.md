# Architecture

## 模块

- `src/app/`
  - Next.js App Router 页面和 API routes
- `src/ui/`
  - 首页表单、结果页和交互组件
- `src/shared/`
  - 输入类型、公共 API 返回类型
- `src/server/jobs/`
  - 任务仓储与 worker
- `src/server/simc/`
  - SimC 参数构建与执行器

## 当前任务流

1. 首页提交 `simcProfile + fightStyle + numEnemies`
2. `POST /api/sims` 创建 `queued` 任务
3. 后端异步 worker 将任务推进到 `running`
4. 调用 `SimulationCraft` CLI
5. 成功则写入 `done + resultSummary + rawOutput`
6. 失败则写入 `failed + errorMessage`
7. 结果页轮询 `GET /api/sims/:jobId`

## 扩展位

- `jobType` 已保留，后续可扩展到 `topgear`
- `createSimcRunner` 与 `createJobWorker` 已解耦，可用于后续批量任务执行
