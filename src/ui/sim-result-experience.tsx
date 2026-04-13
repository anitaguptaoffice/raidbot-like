"use client";

import React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { SimJobResponse } from "@/shared/sim-api";
import { SimResultPanel } from "@/ui/sim-result";

export function SimResultExperience({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [sim, setSim] = useState<SimJobResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const load = async () => {
      try {
        const response = await fetch(`/api/sims/${jobId}`);
        const data = (await response.json()) as SimJobResponse & { error?: string };

        if (!response.ok) {
          throw new Error(data.error ?? "读取模拟结果失败");
        }

        if (cancelled) {
          return;
        }

        setSim(data);
        setError(null);

        if (data.status === "queued" || data.status === "running") {
          timer = setTimeout(load, 1500);
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
  }, [jobId]);

  return (
    <main className="page-shell">
      {sim ? (
        <SimResultPanel
          isRetrying={isRetrying}
          onRetry={async (payload) => {
            setError(null);
            setIsRetrying(true);

            try {
              const response = await fetch("/api/sims", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
              });
              const data = (await response.json()) as { error?: string; jobId?: string };

              if (!response.ok || !data.jobId) {
                throw new Error(data.error ?? "重新提交模拟任务失败");
              }

              router.push(`/sims/${data.jobId}`);
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
      ) : (
        <section className="panel">加载中...</section>
      )}
      {error ? <div className="error-box page-error">{error}</div> : null}
    </main>
  );
}
