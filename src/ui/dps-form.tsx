"use client";

import React from "react";
import { useState } from "react";

import { FIGHT_STYLE_OPTIONS, type FightStyle } from "@/shared/sim-types";

type DpsFormProps = {
  onSubmit: (payload: {
    simcProfile: string;
    fightStyle: FightStyle;
    numEnemies: number;
  }) => void | Promise<void>;
  isPending: boolean;
};

const FIGHT_STYLE_DETAILS: Record<FightStyle, string> = {
  patchwerk: "标准木桩单体，适合先看基础输出。",
  dungeon_slice: "6 分钟大秘境切片，适合看更接近实战的整体表现。",
  target_dummy: "训练假人风格场景，适合快速做稳定基线对比。",
};

export function DpsForm({ onSubmit, isPending }: DpsFormProps) {
  const [simcProfile, setSimcProfile] = useState("");
  const [fightStyle, setFightStyle] = useState<FightStyle>("patchwerk");
  const [numEnemies, setNumEnemies] = useState("1");
  const [validationError, setValidationError] = useState<string | null>(null);

  return (
    <form
      className="panel dps-form"
      onSubmit={async (event) => {
        event.preventDefault();
        const trimmedProfile = simcProfile.trim();
        const parsedNumEnemies = Number(numEnemies);

        if (!trimmedProfile) {
          setValidationError("请先粘贴 SimC profile。");
          return;
        }

        if (!Number.isInteger(parsedNumEnemies) || parsedNumEnemies < 1) {
          setValidationError("Num Enemies 必须是大于 0 的整数。");
          return;
        }

        setValidationError(null);
        await onSubmit({
          simcProfile: trimmedProfile,
          fightStyle,
          numEnemies: parsedNumEnemies,
        });
      }}
    >
      <div className="form-header">
        <div>
          <div className="eyebrow">DPS 模拟</div>
          <h1>恶魔术在线 DPS 模拟</h1>
        </div>
        <div className="hero-badge">SimulationCraft Runner</div>
      </div>
      <p className="muted">
        当前仅支持恶魔术。Fight Style 直接对齐 Raidbots / SimulationCraft。
      </p>
      <div className="info-strip">
        <span>AOE 通过 Num Enemies 表达。</span>
        <span>Dungeon Slice 适合大秘境切片。</span>
      </div>

      <div className="form-subgrid">
        <div className="callout-card">
          <div className="eyebrow">当前预设</div>
          <strong>{FIGHT_STYLE_OPTIONS.find((option) => option.value === fightStyle)?.label}</strong>
          <p className="muted helper-copy">{FIGHT_STYLE_DETAILS[fightStyle]}</p>
        </div>
        <div className="callout-card">
          <div className="eyebrow">本次输入</div>
          <strong>{numEnemies || "1"} Targets</strong>
          <p className="muted helper-copy">
            你粘贴的导出会原样保留，后端只替换 Fight Style 和目标数量。
          </p>
        </div>
      </div>

      <label className="field">
        <span>SimC Profile</span>
        <textarea
          aria-label="SimC Profile"
          value={simcProfile}
          onChange={(event) => {
            setSimcProfile(event.target.value);
            if (validationError) {
              setValidationError(null);
            }
          }}
          placeholder={"warlock=Demo\nspec=demonology"}
          rows={12}
        />
      </label>

      <div className="field-grid">
        <label className="field">
          <span>Fight Style</span>
          <select
            aria-label="Fight Style"
            value={fightStyle}
            onChange={(event) => setFightStyle(event.target.value as FightStyle)}
          >
            {FIGHT_STYLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Num Enemies</span>
          <input
            aria-label="Num Enemies"
            min={1}
            max={20}
            step={1}
            type="number"
            value={numEnemies}
            onChange={(event) => {
              setNumEnemies(event.target.value);
              if (validationError) {
                setValidationError(null);
              }
            }}
          />
        </label>
      </div>

      {validationError ? <div className="error-box">{validationError}</div> : null}

      <button className="primary-button" disabled={isPending} type="submit">
        {isPending ? "提交中..." : "开始模拟"}
      </button>
    </form>
  );
}
