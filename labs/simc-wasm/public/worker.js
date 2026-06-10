import createSimcModule from "./dist/simc.js";

let modulePromise = null;

function postStatus(text) {
  self.postMessage({ type: "status", text });
}

function buildInput(profile, options) {
  const lines = [
    profile.trim(),
    `fight_style=${options.fightStyle}`,
    `desired_targets=${options.numEnemies}`,
    `max_time=${options.fightLength}`,
    `vary_combat_length=0`,
    `iterations=${options.iterations}`,
    "json2=/work/result.json",
  ];

  return `${lines.filter(Boolean).join("\n")}\n`;
}

async function getModule() {
  if (!modulePromise) {
    modulePromise = createSimcModule({
      locateFile(path) {
        if (path.endsWith(".wasm")) {
          return `./dist/${path}`;
        }
        return path;
      },
      print(text) {
        self.postMessage({ type: "log", text });
      },
      printErr(text) {
        self.postMessage({ type: "log", text });
      },
      noInitialRun: true,
    });
  }

  return modulePromise;
}

self.onmessage = async (event) => {
  if (event.data?.type !== "run") {
    return;
  }

  try {
    const payload = event.data.payload;
    postStatus("初始化 SimulationCraft wasm...");
    const mod = await getModule();

    try {
      mod.FS.mkdir("/work");
    } catch {
      // Directory already exists.
    }

    postStatus("写入 SimC profile...");
    mod.FS.writeFile("/work/input.simc", buildInput(payload.profile, payload));

    postStatus("开始本地模拟...");
    mod.callMain(["/work/input.simc"]);

    postStatus("读取结果...");
    let output = "未找到 /work/result.json。请查看上方日志。";
    try {
      output = mod.FS.readFile("/work/result.json", { encoding: "utf8" });
    } catch {
      // Keep fallback output.
    }

    self.postMessage({ type: "done", output });
  } catch (error) {
    self.postMessage({
      type: "error",
      error: error instanceof Error ? error.stack || error.message : String(error),
    });
  }
};

