"use client";

import type { FightStyle } from "@/shared/sim-types";

export type LocalSimRunInput = {
  profile: string;
  fightStyle: FightStyle;
  numEnemies: number;
  fightLengthSeconds: number;
  iterations: number;
  threadCount: number;
  assetBaseUrl: string;
};

export type LocalSimProgress = {
  phase: string;
  percentage: number;
  logTail: string[];
};

export type LocalSimRunResult = {
  resultJson: string;
  rawLog: string;
};

type WorkerMessage =
  | {
      type: "status";
      text: string;
      percentage?: number;
    }
  | {
      type: "log";
      text: string;
    }
  | {
      type: "done";
      resultJson: string;
    }
  | {
      type: "error";
      error: string;
    };

function toSimcFightStyle(fightStyle: FightStyle) {
  if (fightStyle === "dungeon_slice") {
    return "DungeonSlice";
  }

  if (fightStyle === "target_dummy") {
    return "TargetDummy";
  }

  return "Patchwerk";
}

export function runLocalSimc(
  input: LocalSimRunInput,
  onProgress?: (progress: LocalSimProgress) => void,
) {
  const worker = new Worker("/simc-worker.js", {
    type: "module",
  });
  const logTail: string[] = [];

  const pushLog = (line: string) => {
    const normalized = line.trim();
    if (!normalized) {
      return;
    }

    logTail.push(normalized);
    if (logTail.length > 120) {
      logTail.shift();
    }
  };

  const promise = new Promise<LocalSimRunResult>((resolve, reject) => {
    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const message = event.data;

      if (message.type === "status") {
        onProgress?.({
          phase: message.text,
          percentage: message.percentage ?? 0,
          logTail: [...logTail],
        });
        return;
      }

      if (message.type === "log") {
        pushLog(message.text);
        onProgress?.({
          phase: "SimulationCraft 输出日志",
          percentage: 50,
          logTail: [...logTail],
        });
        return;
      }

      if (message.type === "done") {
        resolve({
          resultJson: message.resultJson,
          rawLog: logTail.join("\n"),
        });
        worker.terminate();
        return;
      }

      if (message.type === "error") {
        reject(new Error(message.error));
        worker.terminate();
      }
    };

    worker.onerror = (event) => {
      reject(new Error(event.message));
      worker.terminate();
    };
  });

  worker.postMessage({
    type: "run",
    payload: {
      ...input,
      fightStyle: toSimcFightStyle(input.fightStyle),
    },
  });

  return {
    promise,
    cancel() {
      worker.terminate();
    },
  };
}
