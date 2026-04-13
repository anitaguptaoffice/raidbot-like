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
          status: "running",
          input: {
            spec: "warlock_demonology",
            fightStyle: "patchwerk",
            numEnemies: 1,
          },
          retryPayload: {
            simcProfile: "warlock=Demo\nspec=demonology",
            fightStyle: "patchwerk",
            numEnemies: 1,
          },
          result: null,
          rawOutput: null,
          errorMessage: null,
          createdAt: "2026-04-13T00:00:00.000Z",
          updatedAt: "2026-04-13T00:01:00.000Z",
        }}
      />,
    );

    expect(screen.getByText(/运行中/i)).toBeInTheDocument();
    expect(screen.getByText(/Patchwerk/i)).toBeInTheDocument();
    expect(screen.getByText(/自动刷新中/i)).toBeInTheDocument();
    expect(screen.getByText(/任务已创建，正在等待真实 simc 结果/i)).toBeInTheDocument();
  });

  it("renders the completed result summary", () => {
    render(
      <SimResultPanel
        sim={{
          jobId: "sim_2",
          status: "done",
          input: {
            spec: "warlock_demonology",
            fightStyle: "dungeon_slice",
            numEnemies: 5,
          },
          retryPayload: {
            simcProfile: "warlock=Demo\nspec=demonology",
            fightStyle: "dungeon_slice",
            numEnemies: 5,
          },
          result: {
            meanDps: 123456.7,
            errorMargin: 321.4,
          },
          rawOutput: "SimulationCraft output",
          errorMessage: null,
          createdAt: "2026-04-13T00:00:00.000Z",
          updatedAt: "2026-04-13T00:02:00.000Z",
        }}
      />,
    );

    expect(
      screen.getByRole("heading", { level: 2, name: /123,456.7 dps/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/321.4/i)).toBeInTheDocument();
    expect(screen.getByText(/Dungeon Slice/i)).toBeInTheDocument();
    expect(screen.getByText(/SimulationCraft output/i)).toBeInTheDocument();
    expect(screen.getByText(/结果已生成，可以开始对比不同导出/i)).toBeInTheDocument();
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
          status: "failed",
          input: {
            spec: "warlock_demonology",
            fightStyle: "target_dummy",
            numEnemies: 8,
          },
          retryPayload: {
            simcProfile: "warlock=Demo\nspec=demonology",
            fightStyle: "target_dummy",
            numEnemies: 8,
          },
          result: null,
          rawOutput: null,
          errorMessage: "simc missing",
          createdAt: "2026-04-13T00:00:00.000Z",
          updatedAt: "2026-04-13T00:03:00.000Z",
        }}
      />,
    );

    expect(screen.getByText(/失败/i)).toBeInTheDocument();
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
          status: "failed",
          input: {
            spec: "warlock_demonology",
            fightStyle: "patchwerk",
            numEnemies: 1,
          },
          retryPayload: {
            simcProfile: "warlock=Demo\nspec=demonology",
            fightStyle: "patchwerk",
            numEnemies: 1,
          },
          result: null,
          rawOutput: null,
          errorMessage: "boom",
          createdAt: "2026-04-13T00:00:00.000Z",
          updatedAt: "2026-04-13T00:03:00.000Z",
        }}
      />,
    );

    await user.click(screen.getByRole("button", { name: /重新模拟/i }));

    expect(onRetry).toHaveBeenCalledWith({
      simcProfile: "warlock=Demo\nspec=demonology",
      fightStyle: "patchwerk",
      numEnemies: 1,
    });
  });
});
