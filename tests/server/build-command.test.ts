import { describe, expect, it } from "vitest";

import { buildSimcArgs } from "@/server/simc/build-command";

describe("build-command", () => {
  it("builds a patchwerk command with one target", () => {
    expect(
      buildSimcArgs({
        simcProfile: "warlock=Demo\nspec=demonology",
        fightStyle: "patchwerk",
        numEnemies: 1,
      }),
    ).toEqual(
      expect.arrayContaining(["fight_style=Patchwerk", "desired_targets=1"]),
    );
  });

  it("maps dungeon slice to the SimC fight style name", () => {
    expect(
      buildSimcArgs({
        simcProfile: "warlock=Demo\nspec=demonology",
        fightStyle: "dungeon_slice",
        numEnemies: 5,
      }),
    ).toEqual(
      expect.arrayContaining([
        "fight_style=DungeonSlice",
        "desired_targets=5",
      ]),
    );
  });

  it("keeps aoe as a target count rather than a fight style alias", () => {
    expect(
      buildSimcArgs({
        simcProfile: "warlock=Demo\nspec=demonology",
        fightStyle: "target_dummy",
        numEnemies: 8,
      }),
    ).toEqual(
      expect.arrayContaining([
        "fight_style=TargetDummy",
        "desired_targets=8",
      ]),
    );
  });

  it("does not hardcode json output redirection in the shared args builder", () => {
    expect(
      buildSimcArgs({
        simcProfile: "warlock=Demo\nspec=demonology",
        fightStyle: "patchwerk",
        numEnemies: 1,
      }),
    ).not.toEqual(expect.arrayContaining(["json2=stdout"]));
  });
});
