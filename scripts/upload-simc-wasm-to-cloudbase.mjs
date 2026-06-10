#!/usr/bin/env node

import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const CloudBase = require("@cloudbase/manager-node");

function readEnv(name, fallback = "") {
  return process.env[name] || fallback;
}

function requireEnv(names) {
  for (const name of names) {
    const value = readEnv(name);
    if (value) {
      return value;
    }
  }

  throw new Error(`${names.join(" / ")} 未配置。`);
}

function normalizePrefix(prefix) {
  return prefix.replace(/^\/+|\/+$/g, "");
}

function joinUrl(...parts) {
  return parts
    .map((part, index) => {
      const value = String(part);
      if (index === 0) {
        return value.replace(/\/+$/g, "");
      }

      return value.replace(/^\/+|\/+$/g, "");
    })
    .filter(Boolean)
    .join("/");
}

const secretId = requireEnv(["TCB_SECRET_ID", "TENCENTCLOUD_SECRET_ID"]);
const secretKey = requireEnv(["TCB_SECRET_KEY", "TENCENTCLOUD_SECRET_KEY"]);
const envId = requireEnv(["TCB_ENV_ID", "NEXT_PUBLIC_TCB_ENV_ID", "NEXT_PUBLIC_TCB_ENV"]);
const region = readEnv("TCB_REGION", readEnv("NEXT_PUBLIC_TCB_REGION", "ap-shanghai"));
const publicBaseUrl = requireEnv(["TCB_STORAGE_PUBLIC_BASE_URL", "NEXT_PUBLIC_SIMC_WASM_PUBLIC_BASE_URL"]);
const sourceDir = readEnv("SIMC_WASM_DIST_DIR", "labs/simc-wasm/public/dist");
const prefix = normalizePrefix(readEnv("TCB_WASM_CLOUD_PREFIX", "simc-dist"));
const simcSha = requireEnv(["SIMC_SHA", "GITHUB_SHA"]);
const version = readEnv("SIMC_VERSION", simcSha.slice(0, 12));

const app = CloudBase.init({
  secretId,
  secretKey,
  envId,
  region,
});

const files = [
  {
    localPath: path.join(sourceDir, "simc.js"),
    name: "simc.js",
  },
  {
    localPath: path.join(sourceDir, "simc.wasm.gz"),
    name: "simc.wasm.gz",
  },
  {
    localPath: path.join(sourceDir, "manifest.json"),
    name: "manifest.json",
  },
];

const targets = ["current", `versions/${version}`];
const uploadFiles = targets.flatMap((target) =>
  files.map((file) => ({
    localPath: file.localPath,
    cloudPath: `${prefix}/${target}/${file.name}`,
  })),
);

console.log(`Uploading ${uploadFiles.length} files to CloudBase env ${envId}...`);
await app.storage.uploadFiles({
  files: uploadFiles,
  parallel: 3,
  retryCount: 2,
  retryInterval: 1000,
  onFileFinish(error, _res, fileData) {
    if (error) {
      console.error(`Upload failed: ${fileData?.cloudFileKey || fileData?.cloudPath || "unknown"}`);
      console.error(error);
      return;
    }

    console.log(`Uploaded: ${fileData?.cloudFileKey || fileData?.cloudPath || "unknown"}`);
  },
});

const currentBaseUrl = joinUrl(publicBaseUrl, prefix, "current");
console.log(`SIMC_WASM_PUBLIC_BASE_URL=${currentBaseUrl}`);

