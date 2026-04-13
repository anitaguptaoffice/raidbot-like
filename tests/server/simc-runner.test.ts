import { describe, expect, it, vi } from "vitest";

import {
  createSimcRunner,
  extractSimcJson,
  parseSimcResult,
} from "@/server/simc/runner";

describe("simc-runner", () => {
  it("parses mean dps and error margin from SimC JSON", () => {
    const result = parseSimcResult(
      JSON.stringify({
        sim: {
          players: [
            {
              collected_data: {
                dps: {
                  mean: 123456.7,
                  mean_std_dev: 321.4,
                },
              },
            },
          ],
        },
      }),
    );

    expect(result).toEqual({
      meanDps: 123456.7,
      errorMargin: 321.4,
    });
  });

  it("still supports the legacy raid_dps shape used by current unit tests", () => {
    const result = parseSimcResult(
      JSON.stringify({
        sim: {
          statistics: {
            raid_dps: {
              mean: 65432.1,
              mean_error: 123.4,
            },
          },
        },
      }),
    );

    expect(result).toEqual({
      meanDps: 65432.1,
      errorMargin: 123.4,
    });
  });

  it("extracts JSON from mixed stdout output", () => {
    const mixed = `SimulationCraft 1125-01\n\nSimulating...\n{"sim":{"players":[{"collected_data":{"dps":{"mean":1,"mean_std_dev":2}}}]}}`;

    expect(extractSimcJson(mixed)).toBe(
      '{"sim":{"players":[{"collected_data":{"dps":{"mean":1,"mean_std_dev":2}}}]}}',
    );
  });

  it("runs the command and returns parsed output", async () => {
    const execFile = vi.fn().mockResolvedValue({
      stdout: "SimulationCraft text output",
      stderr: "",
    });
    const readFile = vi.fn().mockResolvedValue(
      JSON.stringify({
        sim: {
          players: [
            {
              collected_data: {
                dps: {
                  mean: 98765.4,
                  mean_std_dev: 210.5,
                },
              },
            },
          ],
        },
      }),
    );
    const mkdtemp = vi.fn().mockResolvedValue("/tmp/simc-runner-test");
    const rm = vi.fn().mockResolvedValue(undefined);

    const runner = createSimcRunner({
      execFile,
      fileSystem: {
        mkdtemp,
        readFile,
        rm,
      },
      simcBin: "simc",
    });

    await expect(
      runner.run({
        simcProfile: "warlock=Demo\nspec=demonology",
        fightStyle: "patchwerk",
        numEnemies: 1,
      }),
    ).resolves.toEqual({
      resultSummary: {
        meanDps: 98765.4,
        errorMargin: 210.5,
      },
      rawOutput: "SimulationCraft text output",
    });

    expect(execFile).toHaveBeenCalledOnce();
    expect(readFile).toHaveBeenCalledOnce();
    expect(rm).toHaveBeenCalledOnce();
  });

  it("throws a readable error when command execution fails", async () => {
    const runner = createSimcRunner({
      execFile: vi.fn().mockRejectedValue(new Error("simc missing")),
      simcBin: "simc",
    });

    await expect(
      runner.run({
        simcProfile: "warlock=Demo\nspec=demonology",
        fightStyle: "patchwerk",
        numEnemies: 1,
      }),
    ).rejects.toThrow(/simc missing/i);
  });
});
