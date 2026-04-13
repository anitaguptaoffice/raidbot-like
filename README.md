# raidbot-like

一个仿照 Raidbots 的最小在线模拟器首版，当前只实现 `恶魔术 DPS 模拟`。

## 当前范围

- 只支持恶魔术
- 输入方式只支持粘贴 `SimulationCraft profile`
- `Fight Style` 支持：
  - `Patchwerk`
  - `Dungeon Slice`
  - `Target Dummy`
- `AOE` 通过 `Num Enemies` 表达

## 开发命令

```bash
npm install
npm run dev
```

测试与构建：

```bash
npm test
npm run build
```

## SimulationCraft

运行真实模拟需要本机安装 `SimulationCraft` CLI，并保证命令可执行。

默认会调用：

```bash
simc
```

如果你的二进制路径不同，可以设置：

```bash
SIMC_BIN=/absolute/path/to/simc
```

## 当前实现说明

- 任务通过本地文件仓储保存在 `.data/jobs/`
- 创建任务后会异步触发 worker 执行
- 结果页通过轮询 `/api/sims/:jobId` 获取状态
- 当前已为后续 `Top Gear` 预留 `jobType` 字段，但尚未实现相关逻辑
