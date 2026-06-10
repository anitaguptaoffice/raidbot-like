"use client";

import cloudbase from "@cloudbase/js-sdk";

type LoginState = {
  uid?: string;
  user?: {
    id?: string;
    uid?: string;
    email?: string;
    nickname?: string;
    username?: string;
    user_metadata?: {
      uid?: string;
      username?: string;
      nickName?: string;
      nickname?: string;
    };
  };
  credential?: string;
  loginType?: string;
};

type AuthLike = {
  signInWithPassword?: (payload: {
    username?: string;
    email?: string;
    password: string;
  }) => Promise<unknown>;
  signUp?: (payload: {
    email: string;
    username: string;
    password: string;
  }) => Promise<unknown>;
  signOut?: () => Promise<void>;
  getLoginState?: () => Promise<LoginState | null>;
  getSession?: () => Promise<{
    data?: {
      user?: LoginState["user"];
      session?: {
        access_token?: string;
        user?: LoginState["user"];
      };
    };
    error?: unknown;
  }>;
  getAccessToken?: () => Promise<{
    accessToken?: string;
  }>;
  getCredentials?: () => Promise<{
    access_token?: string;
    accessToken?: string;
    refresh_token?: string;
  }>;
  getUserInfo?: () => Promise<{
    uid?: string;
    nickname?: string;
    username?: string;
  } | null>;
};
type VerifyOtpCallback = (payload: { token: string; messageId?: string }) => Promise<unknown>;

let authInstance: AuthLike | null = null;
const pendingEmailVerifyCallbacks = new Map<string, VerifyOtpCallback>();
const E2E_FAKE_AUTH_ENABLED = process.env.NEXT_PUBLIC_E2E_FAKE_AUTH === "1";

const publicCloudbaseEnv = {
  NEXT_PUBLIC_TCB_ENV_ID: process.env.NEXT_PUBLIC_TCB_ENV_ID,
  NEXT_PUBLIC_TCB_ENV: process.env.NEXT_PUBLIC_TCB_ENV,
  NEXT_PUBLIC_TCB_REGION: process.env.NEXT_PUBLIC_TCB_REGION,
};

function readEnv(names: string[]) {
  for (const name of names) {
    const value = publicCloudbaseEnv[name as keyof typeof publicCloudbaseEnv];
    if (value) {
      return value;
    }
  }

  if (names.length > 0) {
    throw new Error(`${names.join(" / ")} 未配置，请先在 .env.local 中设置 CloudBase 参数。`);
  }

  throw new Error("CloudBase 参数未配置。");
}

function getAuth(): AuthLike {
  if (authInstance) {
    return authInstance;
  }

  const envId = readEnv(["NEXT_PUBLIC_TCB_ENV_ID", "NEXT_PUBLIC_TCB_ENV"]);
  const region = publicCloudbaseEnv.NEXT_PUBLIC_TCB_REGION ?? "ap-shanghai";

  const initConfig: {
    env: string;
    region: string;
  } = {
    env: envId,
    region,
  };

  const app = cloudbase.init(initConfig) as unknown as {
    auth: () => AuthLike;
  };

  authInstance = app.auth();
  return authInstance;
}

export type CloudbaseSession = {
  isSignedIn: boolean;
  uid: string | null;
  nickname: string | null;
};

export function isEmailAccount(account: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account.trim());
}

export function buildPasswordSignInPayload(account: string, password: string) {
  if (isEmailAccount(account)) {
    return {
      email: account.trim(),
      password,
    };
  }

  return {
    username: account.trim(),
    password,
  };
}

export function isUsernameValid(username: string) {
  return /^[A-Za-z0-9][A-Za-z0-9\-_.:+ @]{4,23}$/.test(username.trim());
}

export function unwrapCloudbaseResult<T>(result: T): T {
  const payload = result as {
    error?: unknown;
  } | null;

  const error = payload?.error;
  if (!error) {
    return result;
  }

  if (typeof error === "string") {
    throw new Error(error);
  }

  if (typeof error === "object" && error !== null) {
    const asRecord = error as Record<string, unknown>;
    const message =
      (typeof asRecord.message === "string" && asRecord.message) ||
      (typeof asRecord.error_description === "string" && asRecord.error_description) ||
      (typeof asRecord.error === "string" && asRecord.error) ||
      "CloudBase 请求失败";
    throw new Error(message);
  }

  throw new Error("CloudBase 请求失败");
}

export function getCloudbaseErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (typeof error === "object" && error !== null) {
    const asRecord = error as Record<string, unknown>;
    const message =
      (typeof asRecord.message === "string" && asRecord.message) ||
      (typeof asRecord.error_description === "string" && asRecord.error_description) ||
      (typeof asRecord.error === "string" && asRecord.error) ||
      "";
    return message;
  }

  return "";
}

export function isUserNotFoundError(error: unknown) {
  const message = getCloudbaseErrorMessage(error).toLowerCase();

  return (
    message.includes("user not found") ||
    message.includes("user_not_found") ||
    message.includes("not registered") ||
    message.includes("not found") ||
    message.includes("用户不存在") ||
    message.includes("账号不存在") ||
    message.includes("账户不存在")
  );
}

export async function signInWithPassword(account: string, password: string) {
  if (E2E_FAKE_AUTH_ENABLED) {
    void account;
    void password;
    return;
  }

  const auth = getAuth();
  const payload = buildPasswordSignInPayload(account, password);

  if (!auth.signInWithPassword) {
    throw new Error("当前 CloudBase SDK 不支持账号密码登录方法。");
  }

  const result = await auth.signInWithPassword(payload);
  unwrapCloudbaseResult(result);
}

export async function beginEmailPasswordSignUp(params: {
  email: string;
  username: string;
  password: string;
}) {
  if (E2E_FAKE_AUTH_ENABLED) {
    void params;
    return;
  }

  const auth = getAuth();

  if (!auth.signUp) {
    throw new Error("当前 CloudBase SDK 不支持邮箱注册。");
  }

  const normalizedEmail = params.email.trim();
  const normalizedUsername = params.username.trim();

  if (!isEmailAccount(normalizedEmail)) {
    throw new Error("请输入有效的邮箱地址。");
  }

  if (!isUsernameValid(normalizedUsername)) {
    throw new Error("用户名需为 5-24 位，支持英文、数字和 -_.:+ @，且必须以字母或数字开头。");
  }

  pendingEmailVerifyCallbacks.delete(normalizedEmail.toLowerCase());
  const result = await auth.signUp({
    email: normalizedEmail,
    username: normalizedUsername,
    password: params.password,
  });
  unwrapCloudbaseResult(result);

  const verifyOtp = (
    result as {
      data?: {
        verifyOtp?: VerifyOtpCallback;
      };
    }
  )?.data?.verifyOtp;

  if (!verifyOtp) {
    throw new Error("发送验证码失败：CloudBase 未返回验证会话。");
  }

  pendingEmailVerifyCallbacks.set(normalizedEmail.toLowerCase(), verifyOtp);
}

export async function verifyEmailPasswordSignUp(params: {
  email: string;
  verificationCode: string;
}) {
  if (E2E_FAKE_AUTH_ENABLED) {
    void params;
    return;
  }

  const normalizedEmail = params.email.trim();
  const emailKey = normalizedEmail.toLowerCase();
  const verifyOtp = pendingEmailVerifyCallbacks.get(emailKey) ?? null;

  if (!verifyOtp) {
    throw new Error("验证码无效或已过期，请重新发送验证码。");
  }

  const result = await verifyOtp({
    token: params.verificationCode.trim(),
  });
  unwrapCloudbaseResult(result);
  pendingEmailVerifyCallbacks.delete(emailKey);
}

export async function signOutCloudbase() {
  if (E2E_FAKE_AUTH_ENABLED) {
    return;
  }

  const auth = getAuth();
  await auth.signOut?.();
}

export async function getCloudbaseSession(): Promise<CloudbaseSession> {
  if (E2E_FAKE_AUTH_ENABLED) {
    return {
      isSignedIn: true,
      uid: "e2e-user",
      nickname: "E2E",
    };
  }

  const auth = getAuth();
  try {
    if (auth.getSession) {
      const sessionResult = await auth.getSession();
      unwrapCloudbaseResult(sessionResult);
      const sessionUser = sessionResult?.data?.session?.user ?? sessionResult?.data?.user;
      const sessionUid =
        sessionUser?.id ??
        sessionUser?.uid ??
        sessionUser?.user_metadata?.uid ??
        null;

      if (sessionUid) {
        return {
          isSignedIn: true,
          uid: sessionUid,
          nickname:
            sessionUser?.nickname ??
            sessionUser?.username ??
            sessionUser?.user_metadata?.nickname ??
            sessionUser?.user_metadata?.nickName ??
            sessionUser?.user_metadata?.username ??
            sessionUser?.email ??
            null,
        };
      }
    }

    // 只依赖本地登录态，避免 getUserInfo() 触发 /user/me 导致 revoked token 噪声。
    const loginState = await auth.getLoginState?.();
    const user = loginState?.user;

    const uid = user?.id ?? user?.uid ?? user?.user_metadata?.uid ?? loginState?.uid ?? null;
    const nickname =
      user?.nickname ??
      user?.username ??
      user?.user_metadata?.nickname ??
      user?.user_metadata?.nickName ??
      user?.user_metadata?.username ??
      user?.email ??
      null;
    const isSignedIn = Boolean(uid || loginState?.credential || loginState?.loginType);

    return {
      isSignedIn,
      uid,
      nickname,
    };
  } catch {
    return {
      isSignedIn: false,
      uid: null,
      nickname: null,
    };
  }
}
