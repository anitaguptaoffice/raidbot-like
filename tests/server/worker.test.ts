import { describe, expect, it, vi } from "vitest";

import { createJobRepository } from "@/server/jobs/repository";
import { createJobWorker } from "@/server/jobs/worker";

const TEST_DIR = "/tmp/raidbot-like-tests/worker";

describe("job-worker", () => {
  it("moves a queued job to done and stores the result", async () => {
    const repository = createJobRepository(TEST_DIR);
    await repository.clear();

    await repository.save({
      jobId: "sim_1",
      jobType: "dps",
      status: "queued",
      spec: "warlock_demonology",
      fightStyle: "patchwerk",
      numEnemies: 1,
      simcProfileSnapshot: "warlock=Demo\nspec=demonology",
      resultSummary: null,
      rawOutput: null,
      errorMessage: null,
      createdAt: "2026-04-13T00:00:00.000Z",
      updatedAt: "2026-04-13T00:00:00.000Z",
    });

    const worker = createJobWorker({
      repository,
      runner: {
        run: vi.fn().mockResolvedValue({
          resultSummary: {
            meanDps: 111111.1,
            errorMargin: 222.2,
          },
          rawOutput: "SimulationCraft output",
        }),
      },
      now: () => "2026-04-13T00:02:00.000Z",
    });

    await worker.process("sim_1");

    await expect(repository.getById("sim_1")).resolves.toMatchObject({
      status: "done",
      resultSummary: {
        meanDps: 111111.1,
        errorMargin: 222.2,
      },
      rawOutput: "SimulationCraft output",
      errorMessage: null,
    });
  });

  it("marks the job as failed when execution throws", async () => {
    const repository = createJobRepository(TEST_DIR);
    await repository.clear();

    await repository.save({
      jobId: "sim_2",
      jobType: "dps",
      status: "queued",
      spec: "warlock_demonology",
      fightStyle: "dungeon_slice",
      numEnemies: 5,
      simcProfileSnapshot: "warlock=Demo\nspec=demonology",
      resultSummary: null,
      rawOutput: null,
      errorMessage: null,
      createdAt: "2026-04-13T00:00:00.000Z",
      updatedAt: "2026-04-13T00:00:00.000Z",
    });

    const worker = createJobWorker({
      repository,
      runner: {
        run: vi.fn().mockRejectedValue(new Error("timeout")),
      },
      now: () => "2026-04-13T00:03:00.000Z",
    });

    await worker.process("sim_2");

    await expect(repository.getById("sim_2")).resolves.toMatchObject({
      status: "failed",
      errorMessage: "timeout",
    });
  });
});
