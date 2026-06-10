import type { FightStyle } from "@/shared/sim-types";
import type { SimulationOptions } from "@/shared/sim-types";

export type TopGearCandidate = {
  id: string;
  key: string;
  source: "equipped" | "bags";
  slot: "trinket1" | "trinket2";
  itemId: number | null;
  name: string;
  itemLevel: number | null;
  bonusId: string | null;
  wowheadUrl: string | null;
  wowheadQuery: string | null;
};

export type SimJobResponse = {
  jobId: string;
  jobType: "dps" | "top_gear";
  status: "queued" | "running" | "done" | "failed";
  input: {
    spec: "mage_frost";
    fightStyle: FightStyle;
    numEnemies: number;
    simulationOptions?: SimulationOptions | null;
  };
  result: {
    meanDps: number;
    errorMargin: number;
  } | null;
  progress: {
    phase: string;
    percentage: number;
    logTail: string[];
  } | null;
  retryPayload: {
    simcProfile: string;
    fightStyle: FightStyle;
    numEnemies: number;
    comboLimit?: number;
    selectedTrinkets?: string[];
    simulationOptions?: SimulationOptions | null;
  };
  rawOutput: string | null;
  simcInputPreview: string;
  errorMessage: string | null;
  topGear: {
    config: {
      comboLimit: number;
      selectedTrinkets?: string[];
    } | null;
    result: {
      combos: Array<{
        trinket1: string;
        trinket2: string;
        meanDps: number;
        errorMargin: number;
      }>;
      bestIndex: number;
    } | null;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export type SimHistoryItem = {
  jobId: string;
  jobType: "dps" | "top_gear";
  status: "queued" | "running" | "done" | "failed";
  fightStyle: FightStyle;
  numEnemies: number;
  meanDps: number | null;
  errorMargin: number | null;
  createdAt: string;
  updatedAt: string;
};
