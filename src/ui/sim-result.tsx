import React from "react";
import Link from "next/link";

import type { SimJobResponse } from "@/shared/sim-api";
import { FIGHT_STYLE_OPTIONS } from "@/shared/sim-types";

const STATUS_LABELS: Record<SimJobResponse["status"], string> = {
  queued: "排队中",
  running: "运行中",
  done: "已完成",
  failed: "失败",
};

function formatFightStyle(value: SimJobResponse["input"]["fightStyle"]) {
  return FIGHT_STYLE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function SimResultPanel({
  sim,
  onRetry,
  isRetrying = false,
}: {
  sim: SimJobResponse;
  onRetry?: (payload: SimJobResponse["retryPayload"]) => void | Promise<void>;
  isRetrying?: boolean;
}) {
  const isPolling = sim.status === "queued" || sim.status === "running";
  const statusSummary = isPolling
    ? "任务已创建，正在等待真实 simc 结果。"
    : "结果已生成，可以开始对比不同导出。";
  const resultHeadline =
    sim.status === "done"
      ? `${sim.result?.meanDps.toLocaleString("en-US") ?? "--"} DPS`
      : sim.status === "failed"
        ? "本次模拟未完成"
        : "等待 SimulationCraft 返回结果";

  return (
    <section className="panel result-panel">
      <div className="status-row">
        <div>
          <div className="eyebrow">任务状态</div>
          <h1>{STATUS_LABELS[sim.status]}</h1>
        </div>
        <div className={`status-pill status-${sim.status}`}>{sim.jobId}</div>
      </div>

      <div className="result-hero">
        <div className="result-hero-main">
          <div className="eyebrow">核心结果</div>
          <h2>{resultHeadline}</h2>
          <p className="muted">
            {sim.status === "done"
              ? "这是一份可用于和其他导出直接对比的单次 DPS 结果。"
              : sim.status === "failed"
                ? "保留原始输出和输入快照，方便快速修正后重新提交。"
                : "任务会自动刷新，直到真实 simc 结果写回为止。"}
          </p>
        </div>
        <div className="result-hero-side">
          <div className="hero-stat">
            <span>Mean DPS</span>
            <strong>
              {sim.result ? sim.result.meanDps.toLocaleString("en-US") : "--"}
            </strong>
          </div>
          <div className="hero-stat">
            <span>Error Margin</span>
            <strong>{sim.result ? sim.result.errorMargin : "--"}</strong>
          </div>
        </div>
      </div>

      <div className="result-toolbar">
        <div className="toolbar-copy">
          <div className="muted">{isPolling ? "自动刷新中" : "结果已固定"}</div>
          <div className="toolbar-summary">{statusSummary}</div>
        </div>
        <div className="toolbar-actions">
          {sim.status === "failed" && onRetry ? (
            <button
              className="secondary-button"
              disabled={isRetrying}
              onClick={() => void onRetry(sim.retryPayload)}
              type="button"
            >
              {isRetrying ? "重新提交中..." : "重新模拟"}
            </button>
          ) : null}
          <Link className="secondary-link" href="/">
            返回首页
          </Link>
        </div>
      </div>

      <div className="summary-grid">
        <article className="result-card">
          <div className="eyebrow">Fight Style</div>
          <strong>{formatFightStyle(sim.input.fightStyle)}</strong>
          <p className="muted">首版直接对齐 Raidbots 的 Fight Style 命名。</p>
        </article>
        <article className="result-card">
          <div className="eyebrow">Num Enemies</div>
          <strong>{sim.input.numEnemies}</strong>
          <p className="muted">AOE 强度通过目标数量表达，而不是单独模式。</p>
        </article>
        <article className="result-card">
          <div className="eyebrow">Spec</div>
          <strong>恶魔术</strong>
          <p className="muted">当前只开放 warlock_demonology 的单次 DPS 模拟。</p>
        </article>
        <article className="result-card">
          <div className="eyebrow">Job Type</div>
          <strong>{(sim.jobType ?? "dps").toUpperCase()}</strong>
          <p className="muted">后续可以在同一任务系统上继续扩展 Top Gear。</p>
        </article>
      </div>

      {sim.status === "failed" ? (
        <div className="error-box">{sim.errorMessage ?? "模拟失败"}</div>
      ) : null}

      <details className="raw-output" open={sim.status === "failed"}>
        <summary>原始输出</summary>
        <pre>{sim.rawOutput ?? "任务尚未生成输出。"}</pre>
      </details>
    </section>
  );
}
