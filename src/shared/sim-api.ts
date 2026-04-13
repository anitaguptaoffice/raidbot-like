import type { FightStyle } from "@/shared/sim-types";

export type SimJobResponse = {
  jobId: string;
  jobType: "dps";
  status: "queued" | "running" | "done" | "failed";
  input: {
    spec: "warlock_demonology";
    fightStyle: FightStyle;
    numEnemies: number;
  };
  result: {
    meanDps: number;
    errorMargin: number;
  } | null;
  retryPayload: {
    simcProfile: string;
    fightStyle: FightStyle;
    numEnemies: number;
  };
  rawOutput: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};
