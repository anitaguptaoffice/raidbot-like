import { randomUUID } from "node:crypto";

import { validateCreateSimInput, validateSimcProfileForDemonology } from "@/shared/sim-types";
import type { createJobRepository } from "@/server/jobs/repository";

type JobRepository = ReturnType<typeof createJobRepository>;

type CreateSimDependencies = {
  repository: JobRepository;
  enqueue: (jobId: string) => void;
  now?: () => string;
  createJobId?: () => string;
};

export async function createSim(
  input: unknown,
  dependencies: CreateSimDependencies,
) {
  const payload = validateCreateSimInput(input);

  if (!validateSimcProfileForDemonology(payload.simcProfile)) {
    throw new Error("Only demonology warlock SimC profiles are supported");
  }

  const now = dependencies.now?.() ?? new Date().toISOString();
  const jobId = dependencies.createJobId?.() ?? `sim_${randomUUID()}`;

  await dependencies.repository.save({
    jobId,
    jobType: "dps",
    status: "queued",
    spec: "warlock_demonology",
    fightStyle: payload.fightStyle,
    numEnemies: payload.numEnemies,
    simcProfileSnapshot: payload.simcProfile,
    resultSummary: null,
    rawOutput: null,
    errorMessage: null,
    createdAt: now,
    updatedAt: now,
  });

  dependencies.enqueue(jobId);

  return {
    jobId,
    status: "queued" as const,
  };
}
