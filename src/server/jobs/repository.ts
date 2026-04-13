import fs from "node:fs/promises";
import path from "node:path";

import type { FightStyle } from "@/shared/sim-types";

export type JobStatus = "queued" | "running" | "done" | "failed";

export type JobRecord = {
  jobId: string;
  jobType: "dps";
  status: JobStatus;
  spec: "warlock_demonology";
  fightStyle: FightStyle;
  numEnemies: number;
  simcProfileSnapshot: string;
  resultSummary: {
    meanDps: number;
    errorMargin: number;
  } | null;
  rawOutput: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

type JobUpdates = Partial<Omit<JobRecord, "jobId">>;

export function createJobRepository(baseDir?: string) {
  const rootDir = baseDir ?? path.join(process.cwd(), ".data", "jobs");

  async function ensureDir() {
    await fs.mkdir(rootDir, { recursive: true });
  }

  function getFilePath(jobId: string) {
    return path.join(rootDir, `${jobId}.json`);
  }

  return {
    async save(record: JobRecord) {
      await ensureDir();
      await fs.writeFile(getFilePath(record.jobId), JSON.stringify(record, null, 2));
      return record;
    },

    async getById(jobId: string) {
      try {
        const content = await fs.readFile(getFilePath(jobId), "utf8");
        return JSON.parse(content) as JobRecord;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          return null;
        }

        throw error;
      }
    },

    async update(jobId: string, updates: JobUpdates) {
      const existing = await this.getById(jobId);

      if (!existing) {
        throw new Error(`Job ${jobId} not found`);
      }

      const nextRecord = { ...existing, ...updates };
      await this.save(nextRecord);
      return nextRecord;
    },

    async clear() {
      await fs.rm(rootDir, { recursive: true, force: true });
    },
  };
}
