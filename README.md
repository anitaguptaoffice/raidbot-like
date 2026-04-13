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

这个项目的查找顺序是：

1. `SIMC_BIN`
2. 项目内本地编译的 `.tools/bin/simc`
3. 系统 PATH 里的 `simc`

默认会调用：

```bash
simc
```

如果你的二进制路径不同，可以设置：

```bash
SIMC_BIN=/absolute/path/to/simc
```

### macOS 安装

根据官方 GitHub wiki，macOS 上构建 CLI 的标准方式是进入源码目录的 `engine/` 后执行 `make optimized`，会生成 `simc` 可执行文件。这个仓库已经封装了一个安装脚本：

```bash
./scripts/install-simc-macos.sh
```

脚本会：

- 从官方仓库拉取 `simulationcraft/simc`
- 在本地编译 CLI
- 生成项目内可直接使用的 `.tools/bin/simc`

编译前提：

- `Xcode Command Line Tools`
- `git`
- `make`

你的机器当前已经具备这些基础条件。

## 当前实现说明

- 任务通过本地文件仓储保存在 `.data/jobs/`
- 创建任务后会异步触发 worker 执行
- 结果页通过轮询 `/api/sims/:jobId` 获取状态
- 当前已为后续 `Top Gear` 预留 `jobType` 字段，但尚未实现相关逻辑
