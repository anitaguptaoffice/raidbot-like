"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";

import { DpsForm } from "@/ui/dps-form";

export function CreateSimExperience() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  return (
    <main className="page-shell">
      <div className="hero-copy">
        <div className="eyebrow">Raidbots-like</div>
        <h2>先把恶魔术 DPS 模拟做稳。</h2>
        <p className="muted">
          当前范围只做单次 DPS 模拟。Top Gear 预留扩展位，但不在首版上线。
        </p>
      </div>

      <DpsForm
        isPending={isPending}
        onSubmit={async (payload) => {
          setError(null);
          setIsPending(true);

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
              throw new Error(data.error ?? "创建模拟任务失败");
            }

            startTransition(() => {
              router.push(`/sims/${data.jobId}`);
            });
          } catch (submitError) {
            setError(
              submitError instanceof Error ? submitError.message : "创建模拟任务失败",
            );
          } finally {
            setIsPending(false);
          }
        }}
      />

      {error ? <div className="error-box page-error">{error}</div> : null}
    </main>
  );
}
