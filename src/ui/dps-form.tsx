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

export function DpsForm({ onSubmit, isPending }: DpsFormProps) {
  const [simcProfile, setSimcProfile] = useState("");
  const [fightStyle, setFightStyle] = useState<FightStyle>("patchwerk");
  const [numEnemies, setNumEnemies] = useState("1");

  return (
    <form
      className="panel"
      onSubmit={async (event) => {
        event.preventDefault();
        await onSubmit({
          simcProfile,
          fightStyle,
          numEnemies: Number(numEnemies),
        });
      }}
    >
      <div className="eyebrow">DPS 模拟</div>
      <h1>恶魔术在线 DPS 模拟</h1>
      <p className="muted">
        当前仅支持恶魔术。Fight Style 直接对齐 Raidbots / SimulationCraft。
      </p>

      <label className="field">
        <span>SimC Profile</span>
        <textarea
          aria-label="SimC Profile"
          value={simcProfile}
          onChange={(event) => setSimcProfile(event.target.value)}
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
            onChange={(event) => setNumEnemies(event.target.value)}
          />
        </label>
      </div>

      <button className="primary-button" disabled={isPending} type="submit">
        {isPending ? "提交中..." : "开始模拟"}
      </button>
    </form>
  );
}
