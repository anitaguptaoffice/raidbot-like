import { execFile as execFileCallback } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
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
  const parsed = JSON.parse(extractSimcJson(rawOutput)) as {
    sim?: {
      players?: Array<{
        collected_data?: {
          dps?: {
            mean?: number;
            mean_std_dev?: number;
          };
        };
      }>;
      statistics?: {
        raid_dps?: {
          mean?: number;
          mean_error?: number;
        };
      };
    };
  };

  const meanDps =
    parsed.sim?.players?.[0]?.collected_data?.dps?.mean ??
    parsed.sim?.statistics?.raid_dps?.mean;
  const errorMargin =
    parsed.sim?.players?.[0]?.collected_data?.dps?.mean_std_dev ??
    parsed.sim?.statistics?.raid_dps?.mean_error;

  if (typeof meanDps !== "number" || typeof errorMargin !== "number") {
    throw new Error("SimulationCraft output did not include DPS summary data");
  }

  return {
    meanDps,
    errorMargin,
  };
}

export function extractSimcJson(rawOutput: string) {
  const firstBraceIndex = rawOutput.indexOf("{");

  if (firstBraceIndex === -1) {
    throw new Error("SimulationCraft output did not contain JSON");
  }

  return rawOutput.slice(firstBraceIndex);
}

export function createSimcRunner(dependencies?: {
  execFile?: ExecFileLike;
  simcBin?: string;
  fileSystem?: {
    mkdtemp: typeof fs.mkdtemp;
    writeFile: typeof fs.writeFile;
    readFile: typeof fs.readFile;
    rm: typeof fs.rm;
  };
}) {
  const runExecFile = dependencies?.execFile ?? execFile;
  const simcBin = dependencies?.simcBin ?? resolveSimcBin();
  const fileSystem = dependencies?.fileSystem ?? {
    mkdtemp: fs.mkdtemp,
    writeFile: fs.writeFile,
    readFile: fs.readFile,
    rm: fs.rm,
  };

  return {
    async run(input: RunInput) {
      const tempDir = await fileSystem.mkdtemp(path.join(os.tmpdir(), "simc-runner-"));
      const profilePath = path.join(tempDir, "input.simc");
      const jsonOutputPath = path.join(tempDir, "result.json");

      try {
        await fileSystem.writeFile(profilePath, input.simcProfile, "utf8");

        const args = [profilePath, ...buildSimcArgs(input), `json2=${jsonOutputPath}`];
        const { stdout, stderr } = await runExecFile(simcBin, args);
        const rawOutput = [stdout, stderr].filter(Boolean).join("\n").trim();
        const jsonOutput = await fileSystem.readFile(jsonOutputPath, "utf8");

        return {
          resultSummary: parseSimcResult(jsonOutput),
          rawOutput: rawOutput || jsonOutput,
        };
      } catch (error) {
        throw new Error(
          error instanceof Error ? error.message : "SimulationCraft execution failed",
        );
      } finally {
        await fileSystem.rm(tempDir, { recursive: true, force: true });
      }
    },
  };
}
