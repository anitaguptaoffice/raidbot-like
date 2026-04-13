import { describe, expect, it, vi } from "vitest";

import { createSimcRunner, parseSimcResult } from "@/server/simc/runner";

describe("simc-runner", () => {
  it("parses mean dps and error margin from SimC JSON", () => {
    const result = parseSimcResult(
      JSON.stringify({
        sim: {
          statistics: {
            raid_dps: {
              mean: 123456.7,
              mean_error: 321.4,
            },
          },
        },
      }),
    );

    expect(result).toEqual({
      meanDps: 123456.7,
      errorMargin: 321.4,
    });
  });

  it("runs the command and returns parsed output", async () => {
    const execFile = vi.fn().mockResolvedValue({
      stdout: JSON.stringify({
        sim: {
          statistics: {
            raid_dps: {
              mean: 98765.4,
              mean_error: 210.5,
            },
          },
        },
      }),
      stderr: "",
    });

    const runner = createSimcRunner({
      execFile,
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
      rawOutput: expect.stringContaining('"mean":98765.4'),
    });

    expect(execFile).toHaveBeenCalledOnce();
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
