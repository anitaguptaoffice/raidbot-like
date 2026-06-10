const tcb = require("@cloudbase/node-sdk");
const cloudbase = require("@cloudbase/js-sdk");

const DEFAULT_FILE_ID =
  "cloud://raidbot-5gh3h2nx762bedc5.7261-raidbot-5gh3h2nx762bedc5-1251932919/simc-dist/current/simc.wasm.gz";
const DEFAULT_MAX_AGE = 1800;

const app = tcb.init({
  env: process.env.TCB_ENV || process.env.SCF_NAMESPACE || "raidbot-5gh3h2nx762bedc5",
});
const authApp = cloudbase.init({
  env: process.env.TCB_ENV || process.env.SCF_NAMESPACE || "raidbot-5gh3h2nx762bedc5",
  region: "ap-shanghai",
});

function pickUserIdentity(event, context) {
  const candidates = [
    context?.auth,
    context?.userInfo,
    event?.auth,
    event?.userInfo,
    event?.requestContext?.authorizer,
  ];

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") {
      continue;
    }

    const uid =
      candidate.uid ||
      candidate.userId ||
      candidate.openId ||
      candidate.openid ||
      candidate.sub ||
      candidate.id;
    const loginType =
      candidate.loginType ||
      candidate.login_type ||
      candidate.provider ||
      candidate.identityProvider ||
      null;

    if (uid || candidate.accessToken || candidate.access_token) {
      return {
        uid: uid || null,
        loginType,
      };
    }
  }

  return {
    uid: null,
    loginType: null,
  };
}

exports.main = async (event = {}, context = {}) => {
  let identity = pickUserIdentity(event, context);

  if (!identity.uid && event.credentials && typeof event.credentials === "object") {
    try {
      const auth = authApp.auth();
      await auth.setCredentials(event.credentials);
      const userInfo = await auth.getUserInfo();
      identity = {
        uid: userInfo?.uid || userInfo?.user_id || userInfo?.sub || null,
        loginType: userInfo?.type || null,
      };
    } catch (error) {
      console.warn("Failed to verify CloudBase credentials:", error && error.message ? error.message : error);
    }
  }

  if (!identity.uid) {
    return {
      code: "UNAUTHORIZED",
      message: "请先登录后再加载 SimulationCraft WASM。",
      debug: process.env.NODE_ENV === "development" ? { eventKeys: Object.keys(event), contextKeys: Object.keys(context) } : undefined,
    };
  }

  if (identity.loginType === "ANONYMOUS") {
    return {
      code: "ANONYMOUS_NOT_ALLOWED",
      message: "匿名登录不能加载 SimulationCraft WASM。",
    };
  }

  const fileID = process.env.SIMC_WASM_FILE_ID || DEFAULT_FILE_ID;
  const maxAge = Number(process.env.SIMC_WASM_URL_MAX_AGE || DEFAULT_MAX_AGE);
  const safeMaxAge = Number.isFinite(maxAge) && maxAge > 0 ? Math.min(maxAge, 3600) : DEFAULT_MAX_AGE;
  const result = await app.getTempFileURL({
    fileList: [
      {
        fileID,
        maxAge: safeMaxAge,
      },
    ],
  });
  const file = result.fileList && result.fileList[0];

  if (!file || file.code !== "SUCCESS" || !file.tempFileURL) {
    return {
      code: file?.code || "GET_WASM_URL_FAILED",
      message: file?.message || "获取 SimulationCraft WASM 下载链接失败。",
    };
  }

  return {
    code: "SUCCESS",
    wasmGzipUrl: file.tempFileURL,
    expiresIn: safeMaxAge,
  };
};
