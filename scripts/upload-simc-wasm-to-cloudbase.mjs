#!/usr/bin/env node

import { createRequire } from "node:module";
import path from "node:path";
import { URL } from "node:url";

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

const token = readEnv("TCB_TOKEN", readEnv("CLOUDBASE_API_KEY"));
const secretId = readEnv("TCB_SECRET_ID", readEnv("TENCENTCLOUD_SECRET_ID"));
const secretKey = readEnv("TCB_SECRET_KEY", readEnv("TENCENTCLOUD_SECRET_KEY"));

if (!token && (!secretId || !secretKey)) {
  throw new Error("TCB_TOKEN / CLOUDBASE_API_KEY 或 TCB_SECRET_ID + TCB_SECRET_KEY 未配置。");
}

const envId = requireEnv(["TCB_ENV_ID", "NEXT_PUBLIC_TCB_ENV_ID", "NEXT_PUBLIC_TCB_ENV"]);
const region = readEnv("TCB_REGION", readEnv("NEXT_PUBLIC_TCB_REGION", "ap-shanghai"));
const publicBaseUrl = requireEnv(["TCB_STORAGE_PUBLIC_BASE_URL", "NEXT_PUBLIC_SIMC_WASM_PUBLIC_BASE_URL"]);
const bucketId =
  readEnv("TCB_STORAGE_BUCKET_ID") || new URL(publicBaseUrl).hostname.replace(/\.tcb\.qcloud\.la$/i, "");
const sourceDir = readEnv("SIMC_WASM_DIST_DIR", "labs/simc-wasm/public/dist");
const prefix = normalizePrefix(readEnv("TCB_WASM_CLOUD_PREFIX", "simc-dist"));
const simcSha = requireEnv(["SIMC_SHA", "GITHUB_SHA"]);
const version = readEnv("SIMC_VERSION", simcSha.slice(0, 12));

const app = CloudBase.init({
  secretId,
  secretKey,
  token,
  envId,
  region,
});

const files = [
  {
    localPath: path.join(sourceDir, "simc.js"),
    name: "simc.js",
    contentType: "application/javascript; charset=utf-8",
    cacheControl: "public, max-age=31536000, immutable",
  },
  {
    localPath: path.join(sourceDir, "simc.wasm.gz"),
    name: "simc.wasm.gz",
    contentType: "application/gzip",
    cacheControl: "public, max-age=31536000, immutable",
  },
  {
    localPath: path.join(sourceDir, "manifest.json"),
    name: "manifest.json",
    contentType: "application/json; charset=utf-8",
    cacheControl: "no-cache",
  },
];

const targets = ["current", `versions/${version}`];
const uploadFiles = targets.flatMap((target) =>
  files.map((file) => ({
    localPath: file.localPath,
    cloudPath: `${prefix}/${target}/${file.name}`,
    contentType: file.contentType,
    cacheControl: file.cacheControl,
  })),
);

console.log(`Uploading ${uploadFiles.length} files to CloudBase env ${envId}...`);
if (token) {
  for (const file of uploadFiles) {
    await app.storage.uploadObject({
      accessToken: token,
      bucketId,
      envId,
      objectName: file.cloudPath,
      localPath: file.localPath,
      contentType: file.contentType,
      cacheControl: file.cacheControl,
      usePut: true,
    });
    console.log(`Uploaded: ${file.cloudPath}`);
  }
} else {
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
}

const currentBaseUrl = joinUrl(publicBaseUrl, prefix, "current");
console.log(`SIMC_WASM_PUBLIC_BASE_URL=${currentBaseUrl}`);
