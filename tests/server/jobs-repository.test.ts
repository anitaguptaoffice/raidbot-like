import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createJobRepository,
  type JobRecord,
} from "@/server/jobs/repository";

const TEST_DIR = "/tmp/raidbot-like-tests/jobs-repository";

describe("job repository", () => {
  const repository = createJobRepository(TEST_DIR);

  beforeEach(async () => {
    await repository.clear();
  });

  afterEach(async () => {
    await repository.clear();
  });

  it("creates and reads a queued job", async () => {
    const record: JobRecord = {
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
    };

    await repository.save(record);

    await expect(repository.getById("sim_1")).resolves.toEqual(record);
  });

  it("updates status and result fields", async () => {
    const now = "2026-04-13T00:00:00.000Z";

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
      createdAt: now,
      updatedAt: now,
    });

    await repository.update("sim_2", {
      status: "done",
      resultSummary: {
        meanDps: 123456.7,
        errorMargin: 321.4,
      },
      rawOutput: "SimulationCraft output",
      updatedAt: "2026-04-13T00:05:00.000Z",
    });

    await expect(repository.getById("sim_2")).resolves.toMatchObject({
      status: "done",
      resultSummary: {
        meanDps: 123456.7,
        errorMargin: 321.4,
      },
      rawOutput: "SimulationCraft output",
    });
  });

  it("returns null for missing jobs", async () => {
    await expect(repository.getById("missing")).resolves.toBeNull();
  });
});
