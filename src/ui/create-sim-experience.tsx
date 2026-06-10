"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useState } from "react";

import {
  beginEmailPasswordSignUp,
  getCloudbaseSession,
  isEmailAccount,
  isUserNotFoundError,
  signInWithPassword,
  verifyEmailPasswordSignUp,
  signOutCloudbase,
} from "@/lib/cloudbase";
import { listLocalSimHistory, saveLocalSimHistory } from "@/lib/local-sim-history";
import { mapLocalHistoryToListItem } from "@/lib/local-sim-response";
import { parseLocalSimcResult, getDefaultWasmAssetBaseUrl } from "@/lib/local-sim-result";
import { runLocalSimc, type LocalSimProgress } from "@/lib/local-sim-runner";
import {
  applyLocalTopGearComboToProfile,
  buildLocalTopGearCombos,
  extractLocalTopGearCandidates,
} from "@/lib/local-top-gear";
import type { SimHistoryItem } from "@/shared/sim-api";
import { FIGHT_STYLE_OPTIONS, normalizeSimulationOptions } from "@/shared/sim-types";
import { AuthPanel } from "@/ui/auth-panel";
import { DpsForm } from "@/ui/dps-form";
import { TopGearForm } from "@/ui/top-gear-form";

const STATUS_LABELS: Record<SimHistoryItem["status"], string> = {
  queued: "排队中",
  running: "运行中",
  done: "已完成",
  failed: "失败",
};

function formatFightStyle(value: SimHistoryItem["fightStyle"]) {
  return FIGHT_STYLE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("zh-CN", {
    hour12: false,
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CreateSimExperience() {
  const router = useRouter();
  const [activeTool, setActiveTool] = useState<"dps" | "top_gear">("dps");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isTopGearPending, setIsTopGearPending] = useState(false);
  const [runProgress, setRunProgress] = useState<LocalSimProgress | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyItems, setHistoryItems] = useState<SimHistoryItem[]>([]);
  const [historyReloadSeed, setHistoryReloadSeed] = useState(0);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [session, setSession] = useState<{
    isSignedIn: boolean;
    uid: string | null;
    nickname: string | null;
  }>({
    isSignedIn: false,
    uid: null,
    nickname: null,
  });

  useEffect(() => {
    let cancelled = false;

    const loadSession = async () => {
      setAuthLoading(true);
      setAuthError(null);
      setAuthNotice(null);

      try {
        const nextSession = await getCloudbaseSession();
        if (!cancelled) {
          setSession(nextSession);
        }
      } catch (loadError) {
        if (!cancelled) {
          setAuthError(loadError instanceof Error ? loadError.message : "读取登录态失败");
          setAuthNotice(null);
          setSession({
            isSignedIn: false,
            uid: null,
            nickname: null,
          });
        }
      } finally {
        if (!cancelled) {
          setAuthLoading(false);
        }
      }
    };

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!session.isSignedIn) {
      setHistoryItems([]);
      setHistoryError(null);
      setHistoryLoading(false);
      return;
    }

    let cancelled = false;

    const loadHistory = async () => {
      setHistoryLoading(true);
      setHistoryError(null);

      try {
        const records = await listLocalSimHistory(12);

        if (!cancelled) {
          setHistoryItems(records.map(mapLocalHistoryToListItem));
        }
      } catch (loadError) {
        if (!cancelled) {
          setHistoryError(loadError instanceof Error ? loadError.message : "读取历史记录失败");
        }
      } finally {
        if (!cancelled) {
          setHistoryLoading(false);
        }
      }
    };

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, [session.isSignedIn, historyReloadSeed]);

  return (
    <main className="page-shell">
      <div className="hero-surface">
        <div className="hero-copy">
          <div className="eyebrow">Raidbots-like</div>
          <h2>先把冰法 DPS 模拟做稳。</h2>
          <p className="muted">
            当前范围只做单次 DPS 模拟。Top Gear 预留扩展位，但不在首版上线。
          </p>
        </div>
        <div className="hero-metrics">
          <article className="metric-card">
            <span>Fight Styles</span>
            <strong>3</strong>
            <p className="muted">Patchwerk / Dungeon Slice / Target Dummy</p>
          </article>
          <article className="metric-card">
            <span>Spec</span>
            <strong>冰法</strong>
            <p className="muted">首版只开放单专精，先把真实链路跑稳。</p>
          </article>
        </div>
      </div>

      <AuthPanel
        signedIn={session.isSignedIn}
        nickname={session.nickname}
        uid={session.uid}
        loading={authLoading}
        error={authError}
        notice={authNotice}
        onSubmitCredentials={async ({ account, password }) => {
          if (!account || !password) {
            setAuthError("请输入登录账号和密码。");
            setAuthNotice(null);
            return "signed_in";
          }

          setAuthLoading(true);
          setAuthError(null);
          setAuthNotice(null);

          try {
            await signInWithPassword(account, password);
            const nextSession = await getCloudbaseSession();
            setSession(nextSession);
            return "signed_in";
          } catch (signInError) {
            if (isUserNotFoundError(signInError)) {
              setAuthNotice(
                isEmailAccount(account)
                  ? "没有找到这个邮箱账号，请补充用户名后验证邮箱。"
                  : "没有找到这个用户名，请补充邮箱后创建账号。",
              );
              return "needs_profile";
            }

            setAuthError(signInError instanceof Error ? signInError.message : "登录失败");
            return "signed_in";
          } finally {
            setAuthLoading(false);
          }
        }}
        onCompleteProfile={async ({ email, username, password }) => {
          if (!email || !username || !password) {
            setAuthError("请填写邮箱、用户名和密码。");
            setAuthNotice(null);
            return;
          }

          setAuthLoading(true);
          setAuthError(null);
          setAuthNotice(null);

          try {
            await beginEmailPasswordSignUp({ email, username, password });
            setAuthNotice("验证码已发送，请检查邮箱。");
          } catch (completeError) {
            setAuthError(
              completeError instanceof Error ? completeError.message : "发送验证码失败",
            );
            setAuthNotice(null);
          } finally {
            setAuthLoading(false);
          }
        }}
        onVerifySignup={async ({ email, verificationCode }) => {
          if (!email || !verificationCode) {
            setAuthError("请填写邮箱和验证码。");
            setAuthNotice(null);
            return;
          }

          setAuthLoading(true);
          setAuthError(null);
          setAuthNotice(null);

          try {
            await verifyEmailPasswordSignUp({ email, verificationCode });
            const nextSession = await getCloudbaseSession();
            setSession(nextSession);
          } catch (signUpError) {
            const fallbackSession = await getCloudbaseSession();
            if (fallbackSession.isSignedIn) {
              setSession(fallbackSession);
              setAuthError(null);
              setAuthNotice("已登录成功。");
            } else {
              setAuthError(signUpError instanceof Error ? signUpError.message : "注册失败");
              setAuthNotice(null);
            }
          } finally {
            setAuthLoading(false);
          }
        }}
        onSignOut={async () => {
          setAuthLoading(true);
          setAuthError(null);
          setAuthNotice(null);

          try {
            await signOutCloudbase();
            setSession({
              isSignedIn: false,
              uid: null,
              nickname: null,
            });
          } catch (signOutError) {
            setAuthError(signOutError instanceof Error ? signOutError.message : "退出失败");
          } finally {
            setAuthLoading(false);
          }
        }}
      />

      {!session.isSignedIn ? (
        <section className="panel">
          <div className="eyebrow">使用权限</div>
          <h3>登录后才能使用模拟器</h3>
          <p className="muted">
            模拟会在你的浏览器本地运行，历史记录后续也只保存在本机。
          </p>
        </section>
      ) : null}

      {session.isSignedIn ? (
        <>
      <section className="panel">
        <div className="auth-mode-tabs">
          <button
            className={`auth-mode-tab ${activeTool === "dps" ? "auth-mode-tab-active" : ""}`}
            onClick={() => setActiveTool("dps")}
            type="button"
          >
            DPS 模拟
          </button>
          <button
            className={`auth-mode-tab ${activeTool === "top_gear" ? "auth-mode-tab-active" : ""}`}
            onClick={() => setActiveTool("top_gear")}
            type="button"
          >
            Top Gear
          </button>
        </div>
      </section>

      {activeTool === "dps" ? (
        <DpsForm
          disabled={authLoading || !session.isSignedIn}
          isPending={isPending}
          onSubmit={async (payload) => {
            if (!session.isSignedIn) {
              setError("请先登录 CloudBase 账号，再提交模拟任务。");
              return;
            }

            setError(null);
            setRunProgress({
              phase: "准备本地 SimulationCraft WASM",
              percentage: 1,
              logTail: [],
            });
            setIsPending(true);

            try {
              const simulationOptions = normalizeSimulationOptions(payload.simulationOptions);
              const iterations = simulationOptions.highPrecision ? 100000 : 10000;
              const runner = runLocalSimc(
                {
                  profile: payload.simcProfile,
                  fightStyle: payload.fightStyle,
                  numEnemies: payload.numEnemies,
                  fightLengthSeconds: simulationOptions.fightLengthSeconds,
                  iterations,
                  threadCount: simulationOptions.threadCount,
                  assetBaseUrl: getDefaultWasmAssetBaseUrl(),
                },
                setRunProgress,
              );
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

              startTransition(() => {
                router.push(`/sims?jobId=${encodeURIComponent(localJobId)}`);
              });
            } catch (submitError) {
              setError(
                submitError instanceof Error ? submitError.message : "本地模拟失败",
              );
              setRunProgress(null);
            } finally {
              setIsPending(false);
            }
          }}
        />
      ) : (
        <TopGearForm
          disabled={authLoading || !session.isSignedIn}
          isPending={isTopGearPending}
          onSubmit={async (payload) => {
            if (!session.isSignedIn) {
              setError("请先登录 CloudBase 账号，再提交 Top Gear 任务。");
              return;
            }

            setError(null);
            setRunProgress({
              phase: "准备本地 Top Gear",
              percentage: 1,
              logTail: [],
            });
            setIsTopGearPending(true);

            try {
              const simulationOptions = normalizeSimulationOptions(payload.simulationOptions);
              const iterations = simulationOptions.highPrecision ? 100000 : 10000;
              const candidates = extractLocalTopGearCandidates(payload.simcProfile);
              const selectedSet = new Set(payload.selectedTrinkets);
              const filteredCandidates =
                selectedSet.size >= 2
                  ? candidates.filter((candidate) => selectedSet.has(candidate.key))
                  : candidates;
              const combos = buildLocalTopGearCombos(filteredCandidates, payload.comboLimit);

              if (combos.length === 0) {
                throw new Error("未找到可用饰品组合，请先解析并至少选择 2 个饰品。");
              }

              const ranked: Array<{
                trinket1: string;
                trinket2: string;
                meanDps: number;
                errorMargin: number;
              }> = [];
              const rawOutputs: string[] = [];

              for (let index = 0; index < combos.length; index += 1) {
                const combo = combos[index];
                const profile = applyLocalTopGearComboToProfile(payload.simcProfile, combo);
                const runner = runLocalSimc({
                  profile,
                  fightStyle: payload.fightStyle,
                  numEnemies: payload.numEnemies,
                  fightLengthSeconds: simulationOptions.fightLengthSeconds,
                  iterations,
                  threadCount: simulationOptions.threadCount,
                  assetBaseUrl: getDefaultWasmAssetBaseUrl(),
                }, (progress) => {
                  const base = 5;
                  const span = 90;
                  const comboProgress = (index + progress.percentage / 100) / combos.length;
                  setRunProgress({
                    phase: `Top Gear 组合 ${index + 1}/${combos.length}：${progress.phase}`,
                    percentage: Math.min(95, Math.floor(base + comboProgress * span)),
                    logTail: progress.logTail,
                  });
                });
                const result = await runner.promise;
                const summary = parseLocalSimcResult(result.resultJson);

                ranked.push({
                  trinket1: combo.trinket1.key,
                  trinket2: combo.trinket2.key,
                  meanDps: summary.meanDps,
                  errorMargin: summary.errorMargin,
                });
                rawOutputs.push(`Combo ${index + 1}: ${combo.trinket1.key} + ${combo.trinket2.key}`);
                rawOutputs.push(result.rawLog);
              }

              ranked.sort((a, b) => b.meanDps - a.meanDps);
              const best = ranked[0];
              const now = new Date().toISOString();
              const localJobId =
                typeof crypto !== "undefined" && "randomUUID" in crypto
                  ? `local_${crypto.randomUUID()}`
                  : `local_${Date.now()}`;

              await saveLocalSimHistory({
                id: localJobId,
                jobType: "top_gear",
                createdAt: now,
                updatedAt: now,
                simcVersionSha: null,
                input: {
                  simcProfile: payload.simcProfile,
                  fightStyle: payload.fightStyle,
                  numEnemies: payload.numEnemies,
                  simulationOptions,
                },
                resultSummary: best
                  ? {
                      meanDps: best.meanDps,
                      errorMargin: best.errorMargin,
                    }
                  : null,
                topGear: {
                  config: {
                    comboLimit: payload.comboLimit,
                    selectedTrinkets: payload.selectedTrinkets,
                  },
                  result: {
                    combos: ranked,
                    bestIndex: 0,
                  },
                },
                rawOutput: rawOutputs.join("\n"),
                resultJson: JSON.stringify({ topGear: ranked }, null, 2),
              });

              startTransition(() => {
                router.push(`/sims?jobId=${encodeURIComponent(localJobId)}`);
              });
            } catch (submitError) {
              setError(
                submitError instanceof Error ? submitError.message : "本地 Top Gear 失败",
              );
              setRunProgress(null);
            } finally {
              setIsTopGearPending(false);
            }
          }}
        />
      )}

      {runProgress ? (
        <section className="panel progress-panel progress-pending">
          <div className="progress-head">
            <strong>本地 WASM 运行中</strong>
            <span>{runProgress.percentage}%</span>
          </div>
          <div
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={runProgress.percentage}
            className="progress-track"
            role="progressbar"
          >
            <div className="progress-fill" style={{ width: `${runProgress.percentage}%` }} />
          </div>
          <div className="progress-phase">当前阶段：{runProgress.phase}</div>
          {runProgress.logTail.length > 0 ? (
            <section className="sim-log-panel">
              <div className="sim-log-header">SimulationCraft 本地日志</div>
              <pre className="sim-log-body">{runProgress.logTail.join("\n")}</pre>
            </section>
          ) : null}
        </section>
      ) : null}

      {error ? <div className="error-box page-error">{error}</div> : null}

        <section className="panel history-panel">
          <div className="history-header">
            <div>
              <div className="eyebrow">我的模拟</div>
              <h3>历史记录</h3>
            </div>
            <button
              className="secondary-button"
              disabled={historyLoading}
              onClick={() => setHistoryReloadSeed((seed) => seed + 1)}
              type="button"
            >
              {historyLoading ? "刷新中..." : "刷新记录"}
            </button>
          </div>

          {historyError ? <div className="error-box">{historyError}</div> : null}

          {historyItems.length === 0 ? (
            <p className="muted">
              {historyLoading ? "正在读取历史记录..." : "还没有记录，先提交一次模拟。"}
            </p>
          ) : (
            <div className="history-list">
              {historyItems.map((item) => (
                <Link className="history-item" href={`/sims?jobId=${encodeURIComponent(item.jobId)}`} key={item.jobId}>
                  <div className="history-item-main">
                    <strong>{formatFightStyle(item.fightStyle)}</strong>
                    <span className="muted">
                      {item.numEnemies} 目标 · {formatTime(item.createdAt)}
                    </span>
                  </div>
                  <div className="history-item-side">
                    <span className={`history-status status-${item.status}`}>
                      {STATUS_LABELS[item.status]}
                    </span>
                    <strong className="history-dps">
                      {item.meanDps ? `${item.meanDps.toLocaleString("en-US")} DPS` : "--"}
                    </strong>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
        </>
      ) : null}
    </main>
  );
}
