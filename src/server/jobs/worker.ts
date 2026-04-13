import type { createJobRepository } from "@/server/jobs/repository";

type JobRepository = ReturnType<typeof createJobRepository>;

type Runner = {
  run: (input: {
    simcProfile: string;
    fightStyle: "patchwerk" | "dungeon_slice" | "target_dummy";
    numEnemies: number;
  }) => Promise<{
    resultSummary: {
      meanDps: number;
      errorMargin: number;
    };
    rawOutput: string;
  }>;
};

export function createJobWorker(dependencies: {
  repository: JobRepository;
  runner: Runner;
  now?: () => string;
}) {
  return {
    async process(jobId: string) {
      const job = await dependencies.repository.getById(jobId);

      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }

      const runningAt = dependencies.now?.() ?? new Date().toISOString();
      await dependencies.repository.update(jobId, {
        status: "running",
        updatedAt: runningAt,
      });

      try {
        const runResult = await dependencies.runner.run({
          simcProfile: job.simcProfileSnapshot,
          fightStyle: job.fightStyle,
          numEnemies: job.numEnemies,
        });

        await dependencies.repository.update(jobId, {
          status: "done",
          resultSummary: runResult.resultSummary,
          rawOutput: runResult.rawOutput,
          errorMessage: null,
          updatedAt: dependencies.now?.() ?? new Date().toISOString(),
        });
      } catch (error) {
        await dependencies.repository.update(jobId, {
          status: "failed",
          errorMessage:
            error instanceof Error ? error.message : "Simulation job failed",
          updatedAt: dependencies.now?.() ?? new Date().toISOString(),
        });
      }
    },
  };
}
