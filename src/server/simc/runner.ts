import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";

import type { FightStyle } from "@/shared/sim-types";
import { buildSimcArgs } from "@/server/simc/build-command";
import { resolveSimcBin } from "@/server/simc/resolve-simc-bin";

const execFile = promisify(execFileCallback);

type RunInput = {
  simcProfile: string;
  fightStyle: FightStyle;
  numEnemies: number;
};

type ExecFileLike = (
  file: string,
  args: string[],
) => Promise<{
  stdout: string;
  stderr: string;
}>;

export function parseSimcResult(rawOutput: string) {
  const parsed = JSON.parse(rawOutput) as {
    sim?: {
      statistics?: {
        raid_dps?: {
          mean?: number;
          mean_error?: number;
        };
      };
    };
  };

  const meanDps = parsed.sim?.statistics?.raid_dps?.mean;
  const errorMargin = parsed.sim?.statistics?.raid_dps?.mean_error;

  if (typeof meanDps !== "number" || typeof errorMargin !== "number") {
    throw new Error("SimulationCraft output did not include raid_dps statistics");
  }

  return {
    meanDps,
    errorMargin,
  };
}

export function createSimcRunner(dependencies?: {
  execFile?: ExecFileLike;
  simcBin?: string;
}) {
  const runExecFile = dependencies?.execFile ?? execFile;
  const simcBin = dependencies?.simcBin ?? resolveSimcBin();

  return {
    async run(input: RunInput) {
      try {
        const args = buildSimcArgs(input);
        const { stdout, stderr } = await runExecFile(simcBin, args);
        const rawOutput = stdout || stderr;

        return {
          resultSummary: parseSimcResult(rawOutput),
          rawOutput,
        };
      } catch (error) {
        throw new Error(
          error instanceof Error ? error.message : "SimulationCraft execution failed",
        );
      }
    },
  };
}
