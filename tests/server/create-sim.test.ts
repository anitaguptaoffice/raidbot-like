import { describe, expect, it, vi } from "vitest";

import { createJobRepository } from "@/server/jobs/repository";
import { createSim } from "@/server/api/create-sim";

const TEST_DIR = "/tmp/raidbot-like-tests/create-sim";

describe("create-sim", () => {
  it("creates a queued dps job for demonology warlock", async () => {
    const repository = createJobRepository(TEST_DIR);
    await repository.clear();
    const enqueue = vi.fn();

    const response = await createSim(
      {
        simcProfile: "warlock=Demo\nspec=demonology",
        fightStyle: "patchwerk",
        numEnemies: 1,
      },
      {
        repository,
        enqueue,
        now: () => "2026-04-13T00:00:00.000Z",
        createJobId: () => "sim_1",
      },
    );

    expect(response).toEqual({
      jobId: "sim_1",
      status: "queued",
    });

    await expect(repository.getById("sim_1")).resolves.toMatchObject({
      jobId: "sim_1",
      jobType: "dps",
      status: "queued",
      spec: "warlock_demonology",
      fightStyle: "patchwerk",
      numEnemies: 1,
    });
    expect(enqueue).toHaveBeenCalledWith("sim_1");
  });

  it("rejects a non-demonology profile", async () => {
    const repository = createJobRepository(TEST_DIR);
    await repository.clear();

    await expect(
      createSim(
        {
          simcProfile: "priest=Shadow\nspec=shadow",
          fightStyle: "patchwerk",
          numEnemies: 1,
        },
        {
          repository,
          enqueue: vi.fn(),
          now: () => "2026-04-13T00:00:00.000Z",
          createJobId: () => "sim_2",
        },
      ),
    ).rejects.toThrow(/demonology/i);
  });
});
