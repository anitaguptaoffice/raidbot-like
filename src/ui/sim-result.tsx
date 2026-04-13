import React from "react";
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

export function SimResultPanel({ sim }: { sim: SimJobResponse }) {
  return (
    <section className="panel result-panel">
      <div className="status-row">
        <div>
          <div className="eyebrow">任务状态</div>
          <h1>{STATUS_LABELS[sim.status]}</h1>
        </div>
        <div className={`status-pill status-${sim.status}`}>{sim.jobId}</div>
      </div>

      <div className="summary-grid">
        <article className="result-card">
          <div className="eyebrow">Fight Style</div>
          <strong>{formatFightStyle(sim.input.fightStyle)}</strong>
        </article>
        <article className="result-card">
          <div className="eyebrow">Num Enemies</div>
          <strong>{sim.input.numEnemies}</strong>
        </article>
        <article className="result-card">
          <div className="eyebrow">Mean DPS</div>
          <strong>
            {sim.result ? sim.result.meanDps.toLocaleString("en-US") : "--"}
          </strong>
        </article>
        <article className="result-card">
          <div className="eyebrow">Error Margin</div>
          <strong>{sim.result ? sim.result.errorMargin : "--"}</strong>
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
