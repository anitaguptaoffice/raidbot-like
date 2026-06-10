# simc-wasm 实验

这个目录用于验证“把 SimulationCraft 编译成 WebAssembly，在用户浏览器本地运行”的可行性。

它不接入当前 Next.js 主应用，也不改变现有服务端 simc 链路。

## 当前目标

- 使用仓库已有的 `.tools/simc-src` 作为 SimulationCraft 源码。
- 用 Emscripten 生成 `public/dist/simc.js` 和 `public/dist/simc.wasm`。
- 在浏览器 Web Worker 中运行 wasm，避免阻塞页面。
- 输入一段 SimC profile，输出原始日志和 JSON 结果片段。

## 前置条件

先确保本机有 SimulationCraft 源码：

```bash
./scripts/install-simc-macos.sh
```

再安装并激活 Emscripten SDK。示例：

```bash
git clone https://github.com/emscripten-core/emsdk.git /tmp/emsdk
/tmp/emsdk/emsdk install latest
/tmp/emsdk/emsdk activate latest
source /tmp/emsdk/emsdk_env.sh
```

激活后确认：

```bash
emcc --version
em++ --version
```

## 构建

```bash
./labs/simc-wasm/build.sh
```

产物会写入：

```text
labs/simc-wasm/public/dist/simc.js
labs/simc-wasm/public/dist/simc.wasm
```

## 本地测试

```bash
cd labs/simc-wasm/public
python3 -m http.server 8787
```

然后打开：

```text
http://localhost:8787
```

## 已知风险

- 这个实验会直接尝试用 SimC 的 Makefile 走 Emscripten 工具链，首次编译可能失败，需要按报错继续裁剪依赖。
- 浏览器多线程需要额外配置 COOP/COEP，本实验先不启用 wasm pthread。
- `Top Gear` 不适合第一阶段本地 wasm 测试，先只验证单次 DPS。
- wasm 产物可能很大，实际产品化前必须评估下载体积、缓存策略和运行时间。

