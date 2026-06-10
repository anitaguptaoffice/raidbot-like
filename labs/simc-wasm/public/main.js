const runButton = document.querySelector("#run");
const statusEl = document.querySelector("#status");
const outputEl = document.querySelector("#output");

let worker = null;

function setStatus(text) {
  statusEl.textContent = text;
}

function appendOutput(text) {
  outputEl.textContent = `${outputEl.textContent}\n${text}`.trim();
}

function getPayload() {
  return {
    profile: document.querySelector("#profile").value,
    fightStyle: document.querySelector("#fightStyle").value,
    numEnemies: Number(document.querySelector("#numEnemies").value),
    fightLength: Number(document.querySelector("#fightLength").value),
    iterations: Number(document.querySelector("#iterations").value),
  };
}

runButton.addEventListener("click", () => {
  if (worker) {
    worker.terminate();
  }

  outputEl.textContent = "";
  runButton.disabled = true;
  setStatus("正在加载 wasm...");

  worker = new Worker("./worker.js", { type: "module" });

  worker.onmessage = (event) => {
    const message = event.data;

    if (message.type === "status") {
      setStatus(message.text);
    }

    if (message.type === "log") {
      appendOutput(message.text);
    }

    if (message.type === "done") {
      setStatus("运行完成");
      appendOutput(message.output);
      runButton.disabled = false;
    }

    if (message.type === "error") {
      setStatus("运行失败");
      appendOutput(message.error);
      runButton.disabled = false;
    }
  };

  worker.onerror = (event) => {
    setStatus("运行失败");
    appendOutput(event.message);
    runButton.disabled = false;
  };

  worker.postMessage({
    type: "run",
    payload: getPayload(),
  });
});

