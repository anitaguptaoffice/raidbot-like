import { createJobRepository } from "@/server/jobs/repository";
import { createJobWorker } from "@/server/jobs/worker";
import { createSimcRunner } from "@/server/simc/runner";

export const jobRepository = createJobRepository();
export const simcRunner = createSimcRunner();
export const jobWorker = createJobWorker({
  repository: jobRepository,
  runner: simcRunner,
});

export function enqueueJob(jobId: string) {
  setTimeout(() => {
    void jobWorker.process(jobId);
  }, 0);
}
