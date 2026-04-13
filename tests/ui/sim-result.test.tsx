import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

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

    expect(screen.getByText(/123,456.7/i)).toBeInTheDocument();
    expect(screen.getByText(/321.4/i)).toBeInTheDocument();
    expect(screen.getByText(/Dungeon Slice/i)).toBeInTheDocument();
    expect(screen.getByText(/SimulationCraft output/i)).toBeInTheDocument();
  });

  it("renders failures", () => {
    render(
      <SimResultPanel
        sim={{
          jobId: "sim_3",
          status: "failed",
          input: {
            spec: "warlock_demonology",
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
  });
});
