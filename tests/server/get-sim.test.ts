import { describe, expect, it } from "vitest";

import { getSimById } from "@/server/api/get-sim";
import { createJobRepository } from "@/server/jobs/repository";

const TEST_DIR = "/tmp/raidbot-like-tests/get-sim";

describe("get-sim", () => {
  it("returns a stored sim result", async () => {
    const repository = createJobRepository(TEST_DIR);
    await repository.clear();
    await repository.save({
      jobId: "sim_1",
      jobType: "dps",
      status: "done",
      spec: "warlock_demonology",
      fightStyle: "target_dummy",
      numEnemies: 3,
      simcProfileSnapshot: "warlock=Demo\nspec=demonology",
      resultSummary: {
        meanDps: 98765.4,
        errorMargin: 432.1,
      },
      rawOutput: "SimulationCraft output",
      errorMessage: null,
      createdAt: "2026-04-13T00:00:00.000Z",
      updatedAt: "2026-04-13T00:10:00.000Z",
    });

    await expect(getSimById("sim_1", repository)).resolves.toMatchObject({
      jobId: "sim_1",
      status: "done",
      input: {
        fightStyle: "target_dummy",
        numEnemies: 3,
      },
      result: {
        meanDps: 98765.4,
      },
    });
  });

  it("returns null for a missing sim", async () => {
    const repository = createJobRepository(TEST_DIR);
    await repository.clear();

    await expect(getSimById("missing", repository)).resolves.toBeNull();
  });
});
