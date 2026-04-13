import { z } from "zod";

export const FIGHT_STYLE_OPTIONS = [
  { label: "Patchwerk", value: "patchwerk" },
  { label: "Dungeon Slice", value: "dungeon_slice" },
  { label: "Target Dummy", value: "target_dummy" },
] as const;

const fightStyleValues = ["patchwerk", "dungeon_slice", "target_dummy"] as const;

export const createSimInputSchema = z.object({
  simcProfile: z.string().trim().min(1, "SimC profile is required"),
  fightStyle: z.enum(fightStyleValues, {
    errorMap: () => ({ message: "Fight style is not supported" }),
  }),
  numEnemies: z
    .number({
      invalid_type_error: "Num Enemies must be a number",
    })
    .int("Num Enemies must be an integer")
    .positive("Num Enemies must be greater than 0")
    .max(20, "Num Enemies must be 20 or less"),
});

export type FightStyle = (typeof fightStyleValues)[number];
export type CreateSimInput = z.infer<typeof createSimInputSchema>;

export function validateCreateSimInput(input: unknown): CreateSimInput {
  return createSimInputSchema.parse(input);
}

export function validateSimcProfileForDemonology(profile: string): boolean {
  const normalized = profile.toLowerCase();

  return normalized.includes("warlock=") && normalized.includes("spec=demonology");
}
