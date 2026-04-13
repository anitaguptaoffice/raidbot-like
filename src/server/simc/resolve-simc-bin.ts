import path from "node:path";

type ResolveSimcBinOptions = {
  env?: NodeJS.ProcessEnv;
  projectRoot?: string;
  existingPaths?: Set<string>;
};

function hasPath(candidate: string, existingPaths?: Set<string>) {
  if (existingPaths) {
    return existingPaths.has(candidate);
  }

  try {
    return require("node:fs").existsSync(candidate);
  } catch {
    return false;
  }
}

export function resolveSimcBin(options?: ResolveSimcBinOptions) {
  const env = options?.env ?? process.env;
  const projectRoot = options?.projectRoot ?? process.cwd();
  const existingPaths = options?.existingPaths;

  if (env.SIMC_BIN) {
    return env.SIMC_BIN;
  }

  const localBinary = path.join(projectRoot, ".tools", "bin", "simc");
  if (hasPath(localBinary, existingPaths)) {
    return localBinary;
  }

  const pathEntries = (env.PATH ?? "").split(":").filter(Boolean);
  for (const entry of pathEntries) {
    const candidate = path.join(entry, "simc");
    if (hasPath(candidate, existingPaths)) {
      return candidate;
    }
  }

  return "simc";
}
