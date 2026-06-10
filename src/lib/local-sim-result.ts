"use client";

export function parseLocalSimcResult(resultJson: string) {
  if (!resultJson.trim()) {
    throw new Error(
      "SimulationCraft 没有生成 result.json。请查看本地日志；多线程模式下通常是 pthread WASM 未重新编译、SharedArrayBuffer 不可用，或 COOP/COEP 响应头未生效。",
    );
  }

  const parsed = JSON.parse(resultJson) as {
    sim?: {
      players?: Array<{
        collected_data?: {
          dps?: {
            mean?: number;
            mean_std_dev?: number;
          };
        };
      }>;
      statistics?: {
        raid_dps?: {
          mean?: number;
          mean_error?: number;
        };
      };
    };
  };

  const meanDps =
    parsed.sim?.players?.[0]?.collected_data?.dps?.mean ??
    parsed.sim?.statistics?.raid_dps?.mean;
  const errorMargin =
    parsed.sim?.players?.[0]?.collected_data?.dps?.mean_std_dev ??
    parsed.sim?.statistics?.raid_dps?.mean_error;

  if (typeof meanDps !== "number" || typeof errorMargin !== "number") {
    throw new Error("SimulationCraft WASM 输出中没有 DPS 摘要。");
  }

  return {
    meanDps,
    errorMargin,
  };
}

export function getDefaultWasmAssetBaseUrl() {
  return process.env.NEXT_PUBLIC_SIMC_WASM_BASE_URL ?? "/simc-dist";
}
