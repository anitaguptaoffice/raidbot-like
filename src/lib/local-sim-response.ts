"use client";

import type { LocalSimHistoryRecord } from "@/lib/local-sim-history";
import type { SimJobResponse, SimHistoryItem } from "@/shared/sim-api";

export function mapLocalHistoryToSimResponse(record: LocalSimHistoryRecord): SimJobResponse {
  return {
    jobId: record.id,
    jobType: record.jobType,
    status: record.resultSummary ? "done" : "failed",
    input: {
      spec: "mage_frost",
      fightStyle: record.input.fightStyle,
      numEnemies: record.input.numEnemies,
      simulationOptions: record.input.simulationOptions,
    },
    result: record.resultSummary,
    progress: {
      phase: record.resultSummary ? "本地模拟完成" : "本地模拟未生成结果",
      percentage: record.resultSummary ? 100 : 0,
      logTail: record.rawOutput
        ? record.rawOutput
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean)
            .slice(-120)
        : [],
    },
    retryPayload: {
      simcProfile: record.input.simcProfile,
      fightStyle: record.input.fightStyle,
      numEnemies: record.input.numEnemies,
      simulationOptions: record.input.simulationOptions,
    },
    rawOutput: record.resultJson ?? record.rawOutput,
    simcInputPreview: [
      record.input.simcProfile.trim(),
      "",
      "# Simulation Options",
      `# simc_version_sha=${record.simcVersionSha ?? "local-wasm"}`,
      `fight_style=${record.input.fightStyle}`,
      `desired_targets=${record.input.numEnemies}`,
      `max_time=${record.input.simulationOptions.fightLengthSeconds}`,
      `threads=${record.input.simulationOptions.threadCount}`,
    ].join("\n"),
    errorMessage: record.resultSummary ? null : "本地模拟没有生成 DPS 结果。",
    topGear: record.topGear,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function mapLocalHistoryToListItem(record: LocalSimHistoryRecord): SimHistoryItem {
  return {
    jobId: record.id,
    jobType: record.jobType,
    status: record.resultSummary ? "done" : "failed",
    fightStyle: record.input.fightStyle,
    numEnemies: record.input.numEnemies,
    meanDps: record.resultSummary?.meanDps ?? null,
    errorMargin: record.resultSummary?.errorMargin ?? null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}
