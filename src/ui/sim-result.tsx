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

function formatErrorMargin(errorMargin: number) {
  return errorMargin.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function shortenJobId(jobId: string) {
  if (jobId.length <= 22) {
    return jobId;
  }

  return `${jobId.slice(0, 10)}...${jobId.slice(-6)}`;
}

function getProgressState(status: SimJobResponse["status"]) {
  if (status === "queued") {
    return {
      percentage: 24,
      currentStageIndex: 1,
      tone: "pending" as const,
    };
  }

  if (status === "running") {
    return {
      percentage: 76,
      currentStageIndex: 3,
      tone: "pending" as const,
    };
  }

  if (status === "done") {
    return {
      percentage: 100,
      currentStageIndex: 4,
      tone: "success" as const,
    };
  }

  return {
    percentage: 86,
    currentStageIndex: 3,
    tone: "failed" as const,
  };
}

const PROGRESS_STAGES = [
  "任务创建",
  "队列等待",
  "初始化 SimulationCraft",
  "分析计算中",
  "结果汇总",
];

function getStageIndexFromPhase(phase?: string) {
  if (!phase) {
    return null;
  }

  const normalized = phase.toLowerCase();
  if (normalized.includes("任务创建")) {
    return 0;
  }
  if (normalized.includes("队列等待")) {
    return 1;
  }
  if (normalized.includes("初始化")) {
    return 2;
  }
  if (normalized.includes("分析计算")) {
    return 3;
  }
  if (normalized.includes("汇总") || normalized.includes("报告")) {
    return 4;
  }
  if (normalized.includes("失败")) {
    return 3;
  }

  return null;
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
  const isTopGear = sim.jobType === "top_gear";
  const statusSummary = isPolling
    ? "任务已创建，正在等待真实 simc 结果。"
    : isTopGear
      ? "Top Gear 结果已生成，可直接查看饰品组合排名。"
      : "结果已生成，可以开始对比不同导出。";
  const resultHeadline =
    sim.status === "done"
      ? isTopGear
        ? `最佳组合 ${sim.result?.meanDps.toLocaleString("en-US") ?? "--"} DPS`
        : `${sim.result?.meanDps.toLocaleString("en-US") ?? "--"} DPS`
      : sim.status === "failed"
        ? "本次模拟未完成"
        : "等待 SimulationCraft 返回结果";
  const fallbackProgress = getProgressState(sim.status);
  const progressState = sim.progress
    ? {
        percentage: sim.progress.percentage,
        currentStageIndex:
          getStageIndexFromPhase(sim.progress.phase) ??
          (sim.progress.percentage >= 100
            ? 4
            : sim.progress.percentage >= 95
              ? 4
              : sim.progress.percentage >= 18
                ? 3
                : 1),
        tone:
          sim.status === "done"
            ? ("success" as const)
            : sim.status === "failed"
              ? ("failed" as const)
              : ("pending" as const),
      }
    : fallbackProgress;

  return (
    <section className="panel result-panel">
      <div className="status-row">
        <div>
          <div className="eyebrow">任务状态</div>
          <h1>{STATUS_LABELS[sim.status]}</h1>
        </div>
        <div className={`status-pill status-${sim.status}`} title={sim.jobId}>
          任务 ID: {shortenJobId(sim.jobId)}
        </div>
      </div>

      <section className={`progress-panel progress-${progressState.tone}`}>
        <div className="progress-head">
          <strong>分析进度</strong>
          <span>{progressState.percentage}%</span>
        </div>
        <div className="progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressState.percentage}>
          <div className="progress-fill" style={{ width: `${progressState.percentage}%` }} />
        </div>
        <div className="progress-stages">
          {PROGRESS_STAGES.map((stage, index) => {
            const isDone = index < progressState.currentStageIndex;
            const isCurrent = index === progressState.currentStageIndex;

            return (
              <span
                key={stage}
                className={[
                  "stage-chip",
                  isDone ? "stage-done" : "",
                  isCurrent ? "stage-current" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {stage}
              </span>
            );
          })}
        </div>
        {sim.progress?.phase ? (
          <div className="progress-phase">当前阶段：{sim.progress.phase}</div>
        ) : null}
      </section>

      {sim.progress?.logTail?.length ? (
        <section className="sim-log-panel">
          <div className="sim-log-header">
            {isPolling ? "SimulationCraft 实时日志" : "SimulationCraft 执行日志"}
          </div>
          <pre className="sim-log-body">{sim.progress.logTail.join("\n")}</pre>
        </section>
      ) : null}

      <div className="result-hero">
        <div className="result-hero-main">
          <div className="eyebrow">核心结果</div>
          <h2>{resultHeadline}</h2>
          <p className="muted">
            {sim.status === "done"
              ? isTopGear
                ? "当前结果来自 trinket1 + trinket2 组合对比，已按 DPS 从高到低排序。"
                : "这是一份可用于和其他导出直接对比的单次 DPS 结果。"
              : sim.status === "failed"
                ? "保留原始输出和输入快照，方便快速修正后重新提交。"
                : "任务会自动刷新，直到真实 simc 结果写回为止。"}
          </p>
        </div>
        <div className="result-hero-side">
          <div className="hero-stat">
            <span>平均 DPS</span>
            <strong>
              {sim.result ? sim.result.meanDps.toLocaleString("en-US") : "--"}
            </strong>
          </div>
          <div className="hero-stat">
            <span>误差范围 Error Margin</span>
            <strong>{sim.result ? formatErrorMargin(sim.result.errorMargin) : "--"}</strong>
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
          <div className="eyebrow">战斗风格 Fight Style</div>
          <strong>{formatFightStyle(sim.input.fightStyle)}</strong>
          <p className="muted">首版直接对齐 Raidbots 的 Fight Style 命名。</p>
        </article>
        <article className="result-card">
          <div className="eyebrow">目标数量 Num Enemies</div>
          <strong>{sim.input.numEnemies}</strong>
          <p className="muted">AOE 强度通过目标数量表达，而不是单独模式。</p>
        </article>
        <article className="result-card">
          <div className="eyebrow">专精 Spec</div>
          <strong>冰法</strong>
          <p className="muted">当前只开放 mage_frost 的单次 DPS 模拟。</p>
        </article>
        <article className="result-card">
          <div className="eyebrow">任务类型 Job Type</div>
          <strong>{(sim.jobType ?? "dps").toUpperCase()}</strong>
          <p className="muted">
            {isTopGear
              ? "当前任务为饰品组合 Top Gear。"
              : "后续可以在同一任务系统上继续扩展 Top Gear。"}
          </p>
        </article>
      </div>

      {isTopGear && sim.topGear?.result?.combos?.length ? (
        <section className="panel">
          <div className="eyebrow">Top Gear 排名</div>
          {sim.topGear.config?.selectedTrinkets?.length ? (
            <p className="muted">
              本次参与饰品：{sim.topGear.config.selectedTrinkets.length} 个（按你勾选范围生成组合）
            </p>
          ) : (
            <p className="muted">本次参与饰品：自动使用导出中的所有候选饰品。</p>
          )}
          <div className="topgear-table">
            {sim.topGear.result.combos.slice(0, 10).map((combo, index) => (
              <div className="topgear-row" key={`${combo.trinket1}-${combo.trinket2}-${index}`}>
                <div>
                  <strong>#{index + 1}</strong>
                </div>
                <div className="muted">
                  <div>trinket1={combo.trinket1}</div>
                  <div>trinket2={combo.trinket2}</div>
                </div>
                <div>
                  <strong>{combo.meanDps.toLocaleString("en-US")} DPS</strong>
                  <div className="muted">误差 {formatErrorMargin(combo.errorMargin)}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {sim.status === "failed" ? (
        <div className="error-box">{sim.errorMessage ?? "模拟失败"}</div>
      ) : null}

      <details className="raw-output" open={sim.status === "failed"}>
        <summary>原始输出</summary>
        <pre>{sim.rawOutput ?? "任务尚未生成输出。"}</pre>
      </details>

      <details className="raw-output">
        <summary>Show Simc Input</summary>
        <pre>{sim.simcInputPreview}</pre>
      </details>
    </section>
  );
}
