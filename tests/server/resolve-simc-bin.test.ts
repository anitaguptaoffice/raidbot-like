import { describe, expect, it } from "vitest";

import { resolveSimcBin } from "@/server/simc/resolve-simc-bin";

describe("resolve-simc-bin", () => {
  it("prefers the explicit SIMC_BIN env var", () => {
    expect(
      resolveSimcBin({
        env: {
          SIMC_BIN: "/custom/simc",
          PATH: "/usr/bin:/bin",
        },
        projectRoot: "/app",
        existingPaths: new Set(["/custom/simc", "/app/.tools/bin/simc"]),
      }),
    ).toBe("/custom/simc");
  });

  it("falls back to the project-local compiled binary", () => {
    expect(
      resolveSimcBin({
        env: {
          PATH: "/usr/bin:/bin",
        },
        projectRoot: "/app",
        existingPaths: new Set(["/app/.tools/bin/simc"]),
      }),
    ).toBe("/app/.tools/bin/simc");
  });

  it("falls back to simc on PATH when no project-local binary exists", () => {
    expect(
      resolveSimcBin({
        env: {
          PATH: "/opt/homebrew/bin:/usr/bin:/bin",
        },
        projectRoot: "/app",
        existingPaths: new Set(["/opt/homebrew/bin/simc"]),
      }),
    ).toBe("/opt/homebrew/bin/simc");
  });

  it("returns the bare command name when no path candidate exists", () => {
    expect(
      resolveSimcBin({
        env: {
          PATH: "/usr/bin:/bin",
        },
        projectRoot: "/app",
        existingPaths: new Set(),
      }),
    ).toBe("simc");
  });
});
