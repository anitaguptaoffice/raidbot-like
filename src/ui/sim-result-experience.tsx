"use client";

import React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getLocalSimHistory, saveLocalSimHistory } from "@/lib/local-sim-history";
import { mapLocalHistoryToSimResponse } from "@/lib/local-sim-response";
import { getDefaultWasmAssetBaseUrl, parseLocalSimcResult } from "@/lib/local-sim-result";
import { runLocalSimc } from "@/lib/local-sim-runner";
import type { SimJobResponse } from "@/shared/sim-api";
import { normalizeSimulationOptions } from "@/shared/sim-types";
import { SimResultPanel } from "@/ui/sim-result";

export function SimResultExperience({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [sim, setSim] = useState<SimJobResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [reloadSeed, setReloadSeed] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const load = async () => {
      try {
        const record = await getLocalSimHistory(jobId);
        if (!record) {
          throw new Error("本地模拟记录不存在。");
        }

        if (!cancelled) {
          setSim(mapLocalHistoryToSimResponse(record));
          setError(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "读取模拟结果失败");
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [jobId, reloadSeed]);

  return (
    <main className="page-shell">
      {sim ? (
        <SimResultPanel
          isRetrying={isRetrying}
          onRetry={async (payload) => {
            setError(null);
            setIsRetrying(true);

            try {
              const simulationOptions = normalizeSimulationOptions(
                payload.simulationOptions ?? undefined,
              );
              const iterations = simulationOptions.highPrecision ? 100000 : 10000;
              const runner = runLocalSimc({
                profile: payload.simcProfile,
                fightStyle: payload.fightStyle,
                numEnemies: payload.numEnemies,
                fightLengthSeconds: simulationOptions.fightLengthSeconds,
                iterations,
                threadCount: simulationOptions.threadCount,
                assetBaseUrl: getDefaultWasmAssetBaseUrl(),
              });
              const result = await runner.promise;
              const resultSummary = parseLocalSimcResult(result.resultJson);
              const now = new Date().toISOString();
              const localJobId =
                typeof crypto !== "undefined" && "randomUUID" in crypto
                  ? `local_${crypto.randomUUID()}`
                  : `local_${Date.now()}`;

              await saveLocalSimHistory({
                id: localJobId,
                jobType: "dps",
                createdAt: now,
                updatedAt: now,
                simcVersionSha: null,
                input: {
                  simcProfile: payload.simcProfile,
                  fightStyle: payload.fightStyle,
                  numEnemies: payload.numEnemies,
                  simulationOptions,
                },
                resultSummary,
                topGear: null,
                rawOutput: result.rawLog,
                resultJson: result.resultJson,
              });

              router.push(`/sims/${localJobId}`);
            } catch (retryError) {
              setError(
                retryError instanceof Error
                  ? retryError.message
                  : "重新提交模拟任务失败",
              );
            } finally {
              setIsRetrying(false);
            }
          }}
          sim={sim}
        />
      ) : error ? (
        <section className="panel">
          <h1>读取失败</h1>
          <p className="muted">当前任务结果暂时不可用，请重试读取。</p>
          <button
            className="secondary-button"
            onClick={() => {
              setError(null);
              setReloadSeed((seed) => seed + 1);
            }}
            type="button"
          >
            重试读取
          </button>
        </section>
      ) : (
        <section className="panel">加载中...</section>
      )}
      {error ? <div className="error-box page-error">{error}</div> : null}
    </main>
  );
}
