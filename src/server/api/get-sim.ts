import type { createJobRepository } from "@/server/jobs/repository";

type JobRepository = ReturnType<typeof createJobRepository>;

export async function getSimById(jobId: string, repository: JobRepository) {
  const record = await repository.getById(jobId);

  if (!record) {
    return null;
  }

  return {
    jobId: record.jobId,
    jobType: record.jobType,
    status: record.status,
    input: {
      spec: record.spec,
      fightStyle: record.fightStyle,
      numEnemies: record.numEnemies,
    },
    result: record.resultSummary,
    retryPayload: {
      simcProfile: record.simcProfileSnapshot,
      fightStyle: record.fightStyle,
      numEnemies: record.numEnemies,
    },
    rawOutput: record.rawOutput,
    errorMessage: record.errorMessage,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}
