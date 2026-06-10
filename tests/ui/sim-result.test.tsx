import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { vi } from "vitest";

import { SimResultPanel } from "@/ui/sim-result";

describe("sim-result", () => {
  it("renders loading states", () => {
    render(
      <SimResultPanel
        sim={{
          jobId: "sim_1",
          jobType: "dps",
          status: "running",
          input: {
            spec: "mage_frost",
            fightStyle: "patchwerk",
            numEnemies: 1,
          },
          retryPayload: {
            simcProfile: "mage=Demo\nspec=frost",
            fightStyle: "patchwerk",
            numEnemies: 1,
          },
          result: null,
          progress: {
            phase: "分析计算中",
            percentage: 76,
            logTail: ["Generating Baseline: Demo [=>........] 1200/10000"],
          },
          rawOutput: null,
          simcInputPreview: "mage=Demo\nspec=frost\niterations=10000",
          errorMessage: null,
          topGear: null,
          createdAt: "2026-04-13T00:00:00.000Z",
          updatedAt: "2026-04-13T00:01:00.000Z",
        }}
      />,
    );

    expect(screen.getByText(/运行中/i)).toBeInTheDocument();
    expect(screen.getByText(/Patchwerk/i)).toBeInTheDocument();
    expect(screen.getByText(/自动刷新中/i)).toBeInTheDocument();
    expect(screen.getByText(/任务已创建，正在等待真实 simc 结果/i)).toBeInTheDocument();
    expect(screen.getByText(/分析进度/i)).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "76");
    expect(screen.getByText(/当前阶段：分析计算中/i)).toBeInTheDocument();
    expect(screen.getByText(/simulationcraft 实时日志/i)).toBeInTheDocument();
  });

  it("renders the completed result summary", () => {
    render(
      <SimResultPanel
        sim={{
          jobId: "sim_2",
          jobType: "dps",
          status: "done",
          input: {
            spec: "mage_frost",
            fightStyle: "dungeon_slice",
            numEnemies: 5,
          },
          retryPayload: {
            simcProfile: "mage=Demo\nspec=frost",
            fightStyle: "dungeon_slice",
            numEnemies: 5,
          },
          result: {
            meanDps: 123456.7,
            errorMargin: 321.4,
          },
          progress: {
            phase: "结果汇总完成",
            percentage: 100,
            logTail: ["Generating reports..."],
          },
          rawOutput: "SimulationCraft output",
          simcInputPreview: "mage=Demo\nspec=frost\niterations=10000",
          errorMessage: null,
          topGear: null,
          createdAt: "2026-04-13T00:00:00.000Z",
          updatedAt: "2026-04-13T00:02:00.000Z",
        }}
      />,
    );

    expect(
      screen.getByRole("heading", { level: 2, name: /123,456.7 dps/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/321.40/i)).toBeInTheDocument();
    expect(screen.getByText(/Dungeon Slice/i)).toBeInTheDocument();
    expect(screen.getByText(/SimulationCraft output/i)).toBeInTheDocument();
    expect(screen.getByText(/结果已生成，可以开始对比不同导出/i)).toBeInTheDocument();
    expect(screen.getByText(/战斗风格 Fight Style/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /返回首页/i })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("renders failures", () => {
    const onRetry = vi.fn();
    render(
      <SimResultPanel
        onRetry={onRetry}
        sim={{
          jobId: "sim_3",
          jobType: "dps",
          status: "failed",
          input: {
            spec: "mage_frost",
            fightStyle: "target_dummy",
            numEnemies: 8,
          },
          retryPayload: {
            simcProfile: "mage=Demo\nspec=frost",
            fightStyle: "target_dummy",
            numEnemies: 8,
          },
          result: null,
          progress: {
            phase: "执行失败",
            percentage: 80,
            logTail: ["Generating Baseline: Demo [=>........] 3200/10000"],
          },
          rawOutput: null,
          simcInputPreview: "mage=Demo\nspec=frost\niterations=10000",
          errorMessage: "simc missing",
          topGear: null,
          createdAt: "2026-04-13T00:00:00.000Z",
          updatedAt: "2026-04-13T00:03:00.000Z",
        }}
      />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "失败" })).toBeInTheDocument();
    expect(screen.getByText(/simc missing/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /重新模拟/i })).toBeInTheDocument();
  });

  it("retries directly from the failed state", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    render(
      <SimResultPanel
        onRetry={onRetry}
        isRetrying={false}
        sim={{
          jobId: "sim_4",
          jobType: "dps",
          status: "failed",
          input: {
            spec: "mage_frost",
            fightStyle: "patchwerk",
            numEnemies: 1,
          },
          retryPayload: {
            simcProfile: "mage=Demo\nspec=frost",
            fightStyle: "patchwerk",
            numEnemies: 1,
          },
          result: null,
          progress: {
            phase: "执行失败",
            percentage: 80,
            logTail: ["Generating Baseline: Demo [=>........] 3200/10000"],
          },
          rawOutput: null,
          simcInputPreview: "mage=Demo\nspec=frost\niterations=10000",
          errorMessage: "boom",
          topGear: null,
          createdAt: "2026-04-13T00:00:00.000Z",
          updatedAt: "2026-04-13T00:03:00.000Z",
        }}
      />,
    );

    await user.click(screen.getByRole("button", { name: /重新模拟/i }));

    expect(onRetry).toHaveBeenCalledWith({
      simcProfile: "mage=Demo\nspec=frost",
      fightStyle: "patchwerk",
      numEnemies: 1,
    });
  });
});
