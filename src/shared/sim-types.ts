import { z } from "zod";

export const FIGHT_STYLE_OPTIONS = [
  { label: "Patchwerk", value: "patchwerk" },
  { label: "Dungeon Slice", value: "dungeon_slice" },
  { label: "Target Dummy", value: "target_dummy" },
] as const;

const fightStyleValues = ["patchwerk", "dungeon_slice", "target_dummy"] as const;
const simcVersionValues = ["weekly", "nightly", "latest"] as const;

export const FIGHT_LENGTH_OPTIONS = [
  20, 40, 60, 90, 120, 180, 240, 300, 360, 420, 480, 540, 600,
] as const;

export const simulationOptionsSchema = z
  .object({
    fightLengthSeconds: z
      .number({
        invalid_type_error: "Fight Length must be a number",
      })
      .int("Fight Length must be an integer")
      .refine((value) => FIGHT_LENGTH_OPTIONS.includes(value as (typeof FIGHT_LENGTH_OPTIONS)[number]), {
        message: "Fight Length is not supported",
      })
      .default(300),
    highPrecision: z.boolean().default(false),
    simcVersion: z.enum(simcVersionValues).default("weekly"),
    threadCount: z
      .number({
        invalid_type_error: "Threads must be a number",
      })
      .int("Threads must be an integer")
      .min(1, "Threads must be at least 1")
      .max(16, "Threads must be 16 or less")
      .default(4),
  })
  .default({
    fightLengthSeconds: 300,
    highPrecision: false,
    simcVersion: "weekly",
    threadCount: 4,
  });

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
  simulationOptions: simulationOptionsSchema.optional(),
});

export const createTopGearInputSchema = z.object({
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
  comboLimit: z
    .number({
      invalid_type_error: "Combo Limit must be a number",
    })
    .int("Combo Limit must be an integer")
    .min(1, "Combo Limit must be at least 1")
    .max(50, "Combo Limit must be 50 or less")
    .default(20),
  selectedTrinkets: z.array(z.string().trim().min(1)).max(50).optional(),
  simulationOptions: simulationOptionsSchema.optional(),
});

export type FightStyle = (typeof fightStyleValues)[number];
export type SimulationOptions = z.infer<typeof simulationOptionsSchema>;
export type CreateSimInput = z.infer<typeof createSimInputSchema>;
export type CreateTopGearInput = z.infer<typeof createTopGearInputSchema>;

export function validateCreateSimInput(input: unknown): CreateSimInput {
  return createSimInputSchema.parse(input);
}

export function validateCreateTopGearInput(input: unknown): CreateTopGearInput {
  return createTopGearInputSchema.parse(input);
}

export function normalizeSimulationOptions(input?: Partial<SimulationOptions>) {
  return simulationOptionsSchema.parse(input ?? {});
}

export function validateSimcProfileForFrostMage(profile: string): boolean {
  const normalized = profile.toLowerCase();

  return normalized.includes("mage=") && normalized.includes("spec=frost");
}
