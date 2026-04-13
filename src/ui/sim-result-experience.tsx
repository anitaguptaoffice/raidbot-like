"use client";

import React from "react";
import { useEffect, useState } from "react";

import type { SimJobResponse } from "@/shared/sim-api";
import { SimResultPanel } from "@/ui/sim-result";

export function SimResultExperience({ jobId }: { jobId: string }) {
  const [sim, setSim] = useState<SimJobResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      {sim ? <SimResultPanel sim={sim} /> : <section className="panel">加载中...</section>}
      {error ? <div className="error-box page-error">{error}</div> : null}
    </main>
  );
}
