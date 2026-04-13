import type { FightStyle } from "@/shared/sim-types";

const SIMC_FIGHT_STYLE_MAP: Record<FightStyle, string> = {
  patchwerk: "Patchwerk",
  dungeon_slice: "DungeonSlice",
  target_dummy: "TargetDummy",
};

type BuildSimcArgsInput = {
  simcProfile: string;
  fightStyle: FightStyle;
  numEnemies: number;
};

export function buildSimcArgs(input: BuildSimcArgsInput) {
  const profileLines = input.simcProfile
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return [
    ...profileLines,
    `fight_style=${SIMC_FIGHT_STYLE_MAP[input.fightStyle]}`,
    `desired_targets=${input.numEnemies}`,
    "iterations=10000",
  ];
}
