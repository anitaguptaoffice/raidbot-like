import { describe, expect, it } from "vitest";

import {
  FIGHT_STYLE_OPTIONS,
  validateCreateSimInput,
  validateSimcProfileForFrostMage,
} from "@/shared/sim-types";

describe("sim-types", () => {
  it("accepts a valid create sim payload", () => {
    const result = validateCreateSimInput({
      simcProfile: "mage=Demo\nspec=frost",
      fightStyle: "patchwerk",
      numEnemies: 1,
    });

    expect(result.fightStyle).toBe("patchwerk");
    expect(result.numEnemies).toBe(1);
  });

  it("rejects an unsupported fight style", () => {
    expect(() =>
      validateCreateSimInput({
        simcProfile: "mage=Demo\nspec=frost",
        fightStyle: "aoe",
        numEnemies: 1,
      }),
    ).toThrow(/fight style/i);
  });

  it("rejects a non-positive enemy count", () => {
    expect(() =>
      validateCreateSimInput({
        simcProfile: "mage=Demo\nspec=frost",
        fightStyle: "patchwerk",
        numEnemies: 0,
      }),
    ).toThrow(/num enemies/i);
  });

  it("recognizes a frost mage profile", () => {
    expect(validateSimcProfileForFrostMage("mage=Demo\nspec=frost")).toBe(true);
    expect(validateSimcProfileForFrostMage("warlock=Demo\nspec=demonology")).toBe(false);
  });

  it("exposes the three supported fight styles", () => {
    expect(FIGHT_STYLE_OPTIONS).toEqual([
      { label: "Patchwerk", value: "patchwerk" },
      { label: "Dungeon Slice", value: "dungeon_slice" },
      { label: "Target Dummy", value: "target_dummy" },
    ]);
  });
});
