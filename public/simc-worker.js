let modulePromise = null;
const logTail = [];

function postStatus(text, percentage) {
  self.postMessage({
    type: "status",
    text,
    percentage,
  });
}

function buildInput(profile, options) {
  const lines = [
    profile.trim(),
    `fight_style=${options.fightStyle}`,
    `desired_targets=${options.numEnemies}`,
    `max_time=${options.fightLengthSeconds}`,
    `vary_combat_length=0`,
    `iterations=${options.iterations}`,
    `threads=${options.threadCount}`,
    "process_priority=normal",
    "json2=/work/result.json",
  ];

  return `${lines.filter(Boolean).join("\n")}\n`;
}

function pushLog(text) {
  const normalized = String(text ?? "").trim();
  if (!normalized) {
    return;
  }

  logTail.push(normalized);
  if (logTail.length > 80) {
    logTail.shift();
  }
}

async function getModule(assetBaseUrl) {
  if (!modulePromise) {
    const normalizedBase = assetBaseUrl.replace(/\/$/, "");
    const simcModule = await import(`${normalizedBase}/simc.js`);

    modulePromise = simcModule.default({
      locateFile(path) {
        if (path.endsWith(".wasm")) {
          return `${normalizedBase}/${path}`;
        }

        return `${normalizedBase}/${path}`;
      },
      print(text) {
        pushLog(text);
        self.postMessage({ type: "log", text });
      },
      printErr(text) {
        pushLog(text);
        self.postMessage({ type: "log", text });
      },
      noInitialRun: true,
      pthreadPoolSize: 16,
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
    postStatus("初始化 SimulationCraft WASM", 8);
    const mod = await getModule(payload.assetBaseUrl);

    try {
      mod.FS.mkdir("/work");
    } catch {
      // Directory already exists.
    }

    postStatus("写入 SimC profile", 14);
    mod.FS.writeFile("/work/input.simc", buildInput(payload.profile, payload));

    postStatus("开始本地模拟", 20);
    mod.callMain(["/work/input.simc"]);

    postStatus("读取结果", 96);
    let resultJson = "";
    try {
      resultJson = mod.FS.readFile("/work/result.json", { encoding: "utf8" });
    } catch {
      // Keep empty result and return logs/raw output to caller.
    }

    if (!resultJson.trim()) {
      throw new Error(
        [
          "SimulationCraft 没有生成 result.json。",
          "最近日志：",
          logTail.slice(-24).join("\n") || "(无日志)",
        ].join("\n"),
      );
    }

    self.postMessage({
      type: "done",
      resultJson,
    });
  } catch (error) {
    self.postMessage({
      type: "error",
      error: error instanceof Error ? error.stack || error.message : String(error),
    });
  }
};
