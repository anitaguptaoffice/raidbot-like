"use client";

import React from "react";
import { useState } from "react";

import { extractLocalTopGearCandidates } from "@/lib/local-top-gear";
import type { TopGearCandidate } from "@/shared/sim-api";
import {
  FIGHT_LENGTH_OPTIONS,
  FIGHT_STYLE_OPTIONS,
  type FightStyle,
} from "@/shared/sim-types";

type TopGearFormProps = {
  onSubmit: (payload: {
    simcProfile: string;
    fightStyle: FightStyle;
    numEnemies: number;
    comboLimit: number;
    selectedTrinkets: string[];
    simulationOptions: {
      fightLengthSeconds: number;
      highPrecision: boolean;
      simcVersion: "weekly" | "nightly" | "latest";
      threadCount: number;
    };
  }) => void | Promise<void>;
  isPending: boolean;
  disabled?: boolean;
};

export function TopGearForm({
  onSubmit,
  isPending,
  disabled = false,
}: TopGearFormProps) {
  const [simcProfile, setSimcProfile] = useState("");
  const [fightStyle, setFightStyle] = useState<FightStyle>("patchwerk");
  const [numEnemies, setNumEnemies] = useState("1");
  const [comboLimit, setComboLimit] = useState("20");
  const [fightLengthSeconds, setFightLengthSeconds] = useState("300");
  const [threadCount, setThreadCount] = useState(() =>
    typeof navigator === "undefined"
      ? "4"
      : String(Math.max(1, Math.min(4, navigator.hardwareConcurrency || 4))),
  );
  const [highPrecision, setHighPrecision] = useState(false);
  const [simcVersion, setSimcVersion] = useState<"weekly" | "nightly" | "latest">("weekly");
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [candidates, setCandidates] = useState<TopGearCandidate[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);

  return (
    <form
      className="panel dps-form"
      onSubmit={async (event) => {
        event.preventDefault();
        const trimmedProfile = simcProfile.trim();
        const parsedNumEnemies = Number(numEnemies);
        const parsedComboLimit = Number(comboLimit);
        const parsedFightLength = Number(fightLengthSeconds);
        const parsedThreadCount = Number(threadCount);

        if (!trimmedProfile) {
          setValidationError("请先粘贴 SimC profile。");
          return;
        }

        if (!Number.isInteger(parsedNumEnemies) || parsedNumEnemies < 1) {
          setValidationError("Num Enemies 必须是大于 0 的整数。");
          return;
        }

        if (!Number.isInteger(parsedComboLimit) || parsedComboLimit < 1 || parsedComboLimit > 50) {
          setValidationError("组合上限必须是 1 到 50 的整数。");
          return;
        }
        if (
          !Number.isInteger(parsedFightLength) ||
          !FIGHT_LENGTH_OPTIONS.includes(parsedFightLength as (typeof FIGHT_LENGTH_OPTIONS)[number])
        ) {
          setValidationError("Fight Length 配置无效。");
          return;
        }
        if (!Number.isInteger(parsedThreadCount) || parsedThreadCount < 1 || parsedThreadCount > 16) {
          setValidationError("Threads 必须是 1 到 16 之间的整数。");
          return;
        }

        if (selected.length > 0 && selected.length < 2) {
          setValidationError("至少勾选 2 个饰品，才能生成组合。");
          return;
        }

        setValidationError(null);
        if (disabled) {
          setValidationError("请先登录后再提交模拟。");
          return;
        }

        await onSubmit({
          simcProfile: trimmedProfile,
          fightStyle,
          numEnemies: parsedNumEnemies,
          comboLimit: parsedComboLimit,
          selectedTrinkets: selected,
          simulationOptions: {
            fightLengthSeconds: parsedFightLength,
            highPrecision,
            simcVersion,
            threadCount: parsedThreadCount,
          },
        });
      }}
    >
      <div className="form-header">
        <div>
          <div className="eyebrow">Top Gear</div>
          <h1>饰品组合 Top Gear</h1>
        </div>
        <div className="hero-badge">Trinket 1 + Trinket 2</div>
      </div>
      <p className="muted">先解析候选饰品，再勾选要参与组合的条目。</p>

      <label className="field">
        <span>SimC Profile</span>
        <textarea
          aria-label="TopGear SimC Profile"
          value={simcProfile}
          onChange={(event) => {
            setSimcProfile(event.target.value);
            if (validationError) {
              setValidationError(null);
            }
          }}
          placeholder={"mage=Demo\nspec=frost"}
          rows={10}
        />
      </label>

      <div className="field">
        <button
          className="secondary-button"
          disabled={candidateLoading || isPending || disabled}
          onClick={async () => {
            const trimmedProfile = simcProfile.trim();
            if (!trimmedProfile) {
              setValidationError("请先粘贴 SimC profile，再解析候选饰品。");
              return;
            }

            setValidationError(null);
            setCandidateLoading(true);
            try {
              const items = extractLocalTopGearCandidates(trimmedProfile);
              if (items.length === 0) {
                throw new Error("未找到可用饰品，请确认 SimC 导出包含 trinket1/trinket2。");
              }

              setCandidates(items);
              setSelected(items.map((item) => item.key));
            } catch (error) {
              setValidationError(error instanceof Error ? error.message : "解析候选饰品失败");
            } finally {
              setCandidateLoading(false);
            }
          }}
          type="button"
        >
          {candidateLoading ? "解析中..." : "解析候选饰品"}
        </button>
      </div>

      {candidates.length > 0 ? (
        <section className="topgear-candidates">
          <div className="muted">
            已解析 {candidates.length} 个候选饰品，已勾选 {selected.length} 个。
          </div>
          <div className="topgear-candidate-list">
            {candidates.map((item) => {
              const checked = selected.includes(item.key);
              return (
                <label className="topgear-candidate-item" key={`${item.id}-${item.key}`}>
                  <input
                    checked={checked}
                    onChange={(event) => {
                      const next = event.currentTarget.checked
                        ? Array.from(new Set([...selected, item.key]))
                        : selected.filter((value) => value !== item.key);
                      setSelected(next);
                    }}
                    type="checkbox"
                  />
                  <span className="topgear-candidate-content">
                    {item.wowheadUrl ? (
                      <a
                        className="topgear-item-link"
                        data-wowhead={item.wowheadQuery ?? undefined}
                        href={item.wowheadUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {item.name}
                      </a>
                    ) : (
                      <strong>{item.name}</strong>
                    )}
                    <span className="muted">
                      {item.itemLevel ? ` ilvl ${item.itemLevel}` : " ilvl --"} ·{" "}
                      {item.source === "equipped" ? "已装备" : "背包"} · {item.slot}
                    </span>
                    <code className="topgear-item-key">{item.key}</code>
                  </span>
                </label>
              );
            })}
          </div>
        </section>
      ) : null}

      <div className="field-grid">
        <label className="field">
          <span>Fight Style</span>
          <select
            aria-label="TopGear Fight Style"
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
            aria-label="TopGear Num Enemies"
            min={1}
            max={20}
            step={1}
            type="number"
            value={numEnemies}
            onChange={(event) => setNumEnemies(event.target.value)}
          />
        </label>
      </div>

      <label className="field">
        <span>组合上限 Combo Limit</span>
        <input
          aria-label="TopGear Combo Limit"
          min={1}
          max={50}
          step={1}
          type="number"
          value={comboLimit}
          onChange={(event) => setComboLimit(event.target.value)}
        />
      </label>

      <div className="field-grid">
        <label className="field">
          <span>Fight Length</span>
          <select
            aria-label="TopGear Fight Length"
            value={fightLengthSeconds}
            onChange={(event) => setFightLengthSeconds(event.target.value)}
          >
            {FIGHT_LENGTH_OPTIONS.map((seconds) => (
              <option key={seconds} value={seconds}>
                {seconds < 60
                  ? `${seconds} seconds`
                  : seconds % 60 === 0
                    ? `${seconds / 60} minutes`
                    : `${Math.floor(seconds / 60)} minute, ${seconds % 60} seconds`}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>SimC Version</span>
          <select
            aria-label="TopGear SimC Version"
            value={simcVersion}
            onChange={(event) => setSimcVersion(event.target.value as "weekly" | "nightly" | "latest")}
          >
            <option value="weekly">Weekly</option>
            <option value="nightly">Nightly</option>
            <option value="latest">Latest</option>
          </select>
        </label>
        <label className="field">
          <span>Threads</span>
          <input
            aria-label="TopGear Threads"
            min={1}
            max={16}
            step={1}
            type="number"
            value={threadCount}
            onChange={(event) => {
              setThreadCount(event.target.value);
              if (validationError) {
                setValidationError(null);
              }
            }}
          />
        </label>
      </div>

      <label className="field topgear-candidate-item">
        <input
          aria-label="TopGear High Precision"
          checked={highPrecision}
          onChange={(event) => setHighPrecision(event.target.checked)}
          type="checkbox"
        />
        <span>
          <strong>High Precision（更高精度，耗时更长）</strong>
        </span>
      </label>

      {validationError ? <div className="error-box">{validationError}</div> : null}

      <button className="primary-button" disabled={isPending || disabled} type="submit">
        {isPending ? "提交中..." : "开始 Top Gear"}
      </button>
    </form>
  );
}
