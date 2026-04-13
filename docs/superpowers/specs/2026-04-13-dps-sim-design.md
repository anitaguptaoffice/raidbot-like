# 恶魔术 DPS 模拟设计

## 摘要

目标是做一个仿照 Raidbots 的在线 `DPS 模拟` 首版，但范围严格收敛到一条可用链路：只支持 `恶魔术`，只支持用户粘贴 `SimulationCraft` profile，主要能力是提交一次模拟任务并查看结果。`Top Gear` 明确不在首版实现范围内，但底层任务与执行架构需要给它留出扩展位。

首版前端只暴露最少输入项：

- `SimC profile` 文本
- `Fight Style`
- `Num Enemies`

其中 `Fight Style` 对齐 Raidbots / SimC 命名：

- `Patchwerk`
- `Dungeon Slice`
- `Target Dummy`

`AOE` 不作为单独的 Fight Style；它通过 `Num Enemies` 体现。

## 产品范围

### 首版必须支持

- 单一入口页：`DPS 模拟`
- 粘贴恶魔术 `SimC profile`
- 选择 `Fight Style`
- 设置 `Num Enemies`
- 提交异步模拟任务
- 结果页轮询任务状态并展示结果
- 展示结构化结果摘要与原始 SimC 输出

### 明确不做

- `Top Gear`
- 战网角色导入
- 手工配装
- 多职业或多专精
- 高级自定义战斗参数
- 地下城路线、词缀、波次配置

## 用户流程

1. 用户进入 `DPS 模拟` 页面。
2. 用户粘贴恶魔术 `SimC profile`。
3. 用户选择一个 `Fight Style`：
   - `Patchwerk`
   - `Dungeon Slice`
   - `Target Dummy`
4. 用户输入 `Num Enemies`。
5. 用户点击开始模拟。
6. 前端调用创建任务接口，获得 `jobId`。
7. 页面跳转到结果页，并轮询任务状态。
8. 任务完成后显示结果摘要、模拟参数摘要和原始输出。
9. 如果任务失败，结果页展示错误并允许用户回退后重试。

## 信息架构

### 首页

首页只做一个核心卡片，不引入多功能导航。页面包含：

- 产品标题与简短说明
- 恶魔术专精限制提示
- `SimC profile` 输入框
- `Fight Style` 下拉框
- `Num Enemies` 输入控件
- 开始模拟按钮

### 结果页

结果页分为以下区块：

- 任务状态：`queued`、`running`、`done`、`failed`
- 核心结果：平均 DPS、误差范围或波动信息
- 参数摘要：`Fight Style`、`Num Enemies`、迭代次数、关键战斗设置
- 原始输出：可折叠的 SimC 文本

失败态需要明确显示：

- 失败原因
- 当前提交参数摘要
- 返回入口或重试入口

## 行为定义

### Fight Style

首版只允许以下值：

- `patchwerk`
- `dungeon_slice`
- `target_dummy`

前端展示名保持与 Raidbots UI 一致：

- `Patchwerk`
- `Dungeon Slice`
- `Target Dummy`

### Num Enemies

- 该字段独立于 `Fight Style`
- `AOE` 由 `Num Enemies > 1` 表达
- `Dungeon Slice` 不是 `AOE` 的别名，而是单独战斗模型

### 恶魔术限制

首版只支持恶魔术。校验策略：

- 前端给出明确提示，不承诺支持其他专精
- 接口层对输入做基础合法性校验
- 如果 profile 明显不是恶魔术，直接拒绝并返回可读错误

## 技术架构

系统拆成 4 个边界清晰的模块：

- Web 前端：输入、提交、轮询、展示
- API 服务：校验输入、创建任务、返回状态与结果
- Sim 执行层：把标准化任务转换为 SimC 调用并执行
- 结果存储：保存任务、输入快照、状态、结构化结果、原始输出

### 数据流

1. 前端把 `simcProfile`、`fightStyle`、`numEnemies` 发送给 API。
2. API 生成标准任务记录并返回 `jobId`。
3. 执行层异步拉取任务，调用 `SimulationCraft`。
4. 执行完成后，执行层保存结构化结果和原始输出。
5. 前端轮询查询接口，直到任务完成或失败。

## 接口草案

### `POST /api/sims`

请求体：

```json
{
  "jobType": "dps",
  "spec": "warlock_demonology",
  "simcProfile": "warlock=...",
  "fightStyle": "patchwerk",
  "numEnemies": 1
}
```

响应体：

```json
{
  "jobId": "sim_123",
  "status": "queued"
}
```

### `GET /api/sims/:jobId`

响应体示意：

```json
{
  "jobId": "sim_123",
  "jobType": "dps",
  "status": "done",
  "input": {
    "spec": "warlock_demonology",
    "fightStyle": "patchwerk",
    "numEnemies": 1
  },
  "result": {
    "meanDps": 123456.7,
    "errorMargin": 321.4
  },
  "rawOutput": "SimulationCraft 1100-01 ..."
}
```

## 数据模型

任务记录至少需要保存：

- `jobId`
- `jobType`
- `status`
- `spec`
- `fightStyle`
- `numEnemies`
- `simcProfileSnapshot`
- `resultSummary`
- `rawOutput`
- `errorMessage`
- `createdAt`
- `updatedAt`

即使首版只有 `jobType = dps`，该字段也要保留，为后续 `Top Gear` 扩展做准备。

## 失败处理

- 输入为空：前端立即拦截
- `Fight Style` 不合法：接口拒绝
- `Num Enemies` 非法：接口拒绝
- profile 不是恶魔术或无法解析：接口返回校验错误
- SimC 执行失败：任务标记为 `failed`
- 超时：任务标记为 `failed`，避免前端无限轮询

所有失败都要求：

- 返回人类可读错误信息
- 保留原始输出或错误上下文用于排障

## 测试策略

### 前端

- 首页可提交合法输入
- 三个 `Fight Style` 均可选择
- `Num Enemies` 输入合法性校验正确
- 结果页能正确处理 `queued/running/done/failed`

### 后端

- `Fight Style` 与执行参数映射正确
- 非恶魔术 profile 被拒绝
- 非法 `Num Enemies` 被拒绝
- 成功任务会保存结果
- 失败任务会保存错误

### 集成

- 使用固定恶魔术 `SimC profile` 跑通：
  - `Patchwerk + 1`
  - `Patchwerk + 多目标`
  - `Dungeon Slice + 合法目标数`
  - `Target Dummy + 合法目标数`

## 未来扩展

首版不实现 `Top Gear`，但以下设计必须兼容：

- 任务模型支持 `jobType`
- 执行层不要与“单次 DPS 模拟”硬绑定
- 结果存储支持未来聚合多个子任务结果

这样第二阶段做 `Top Gear` 时，只需要在现有任务与执行能力之上增加组合生成、批量调度与结果聚合，而不是重写底层。
