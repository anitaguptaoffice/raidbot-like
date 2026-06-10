# raidbot-like

一个仿照 Raidbots 的本地 WASM 模拟器首版，当前聚焦 `冰法 DPS 模拟` 与饰品 `Top Gear`。

项目级协作规则见 [AGENTS.md](/Users/allyin/raidbot-like/AGENTS.md)，当前约定为中文优先文案，术语按需保留英文原词。

## 当前范围

- 只支持冰法
- 输入方式只支持粘贴 `SimulationCraft profile`
- 必须登录后使用
- 模拟在用户浏览器本地通过 `simc.wasm` 运行
- 模拟记录只保存在本机 IndexedDB
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

当前应用运行真实模拟依赖浏览器加载 `simc.wasm`。原生 `SimulationCraft` CLI 只用于本地构建/验证 wasm 产物，不再作为网站运行时依赖。

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

## SimulationCraft WASM（本地运行）

当前改造方向是登录后在浏览器本地运行 `simc.wasm`。开发时可以先用实验构建产物：

```bash
./scripts/install-simc-macos.sh
./labs/simc-wasm/build.sh
mkdir -p public/simc-dist
cp labs/simc-wasm/public/dist/simc.js public/simc-dist/simc.js
cp labs/simc-wasm/public/dist/simc.wasm public/simc-dist/simc.wasm
```

默认 WASM 构建会启用 pthread 多线程。浏览器运行多线程 WASM 必须满足：

- 页面响应头包含 `Cross-Origin-Opener-Policy: same-origin`
- 页面响应头包含 `Cross-Origin-Embedder-Policy: require-corp`
- `simc.js`、`simc.wasm` 和 worker 资源同源或满足跨源隔离要求

如果只想构建单线程调试产物：

```bash
SIMC_WASM_PTHREADS=0 ./labs/simc-wasm/build.sh
```

也可以通过环境变量指定远端资产目录：

```bash
NEXT_PUBLIC_SIMC_WASM_BASE_URL=https://example.com/simc-wasm
```

目录下需要包含：

- `simc.js`
- `simc.wasm`

生产建议由 GitHub Actions 编译后发布到 GitHub Releases，再把 `NEXT_PUBLIC_SIMC_WASM_BASE_URL` 指向对应 release 资产目录或 CDN 镜像。

## CloudBase 身份认证（开发环境）

本项目已接入 CloudBase Web Auth（`@cloudbase/js-sdk`），并采用“必须登录后可用”的策略。
CloudBase 只负责身份认证；模拟计算和历史记录都不写入 CloudBase 数据库。

先在 `.env.local` 配置：

```bash
NEXT_PUBLIC_TCB_ENV_ID=你的环境ID
NEXT_PUBLIC_TCB_REGION=ap-shanghai
```

然后在 CloudBase 控制台开启对应登录方式（建议开启“用户名/邮箱 + 密码登录”与“邮箱验证码注册”）。
不需要配置匿名访问令牌。

## 当前实现说明

- 登录后才渲染 DPS / Top Gear 工具。
- DPS 模拟通过浏览器 Web Worker 调用 `simc.wasm`。
- Top Gear 会在浏览器本地枚举 `trinket1 + trinket2` 组合并逐个调用 WASM。
- 结果页从 IndexedDB 读取 `local_*` 记录，不再依赖服务端任务 API。
- 服务端 SimC/job API 已移除。
