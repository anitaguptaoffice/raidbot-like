"use client";

import React, { useEffect, useState } from "react";

type AuthPanelProps = {
  signedIn: boolean;
  nickname: string | null;
  uid: string | null;
  loading: boolean;
  error: string | null;
  notice?: string | null;
  onSubmitCredentials: (payload: {
    account: string;
    password: string;
  }) => Promise<"signed_in" | "needs_profile">;
  onCompleteProfile: (payload: {
    email: string;
    username: string;
    password: string;
  }) => Promise<void>;
  onVerifySignup: (payload: {
    email: string;
    verificationCode: string;
  }) => Promise<void>;
  onSignOut: () => Promise<void>;
};

export function AuthPanel({
  signedIn,
  nickname,
  uid,
  loading,
  error,
  notice,
  onSubmitCredentials,
  onCompleteProfile,
  onVerifySignup,
  onSignOut,
}: AuthPanelProps) {
  const [step, setStep] = useState<"credentials" | "completeProfile" | "verifySignup">(
    "credentials",
  );
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [sendCooldown, setSendCooldown] = useState(0);
  const isEmailAccount = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account.trim());

  useEffect(() => {
    if (sendCooldown <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setSendCooldown((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [sendCooldown]);

  return (
    <section className="panel auth-panel">
      <div className="form-header">
        <div>
          <div className="eyebrow">CloudBase Auth</div>
          <h3>{signedIn ? "已登录" : "账号登录"}</h3>
        </div>
        <div className={`auth-state ${signedIn ? "auth-signed-in" : "auth-signed-out"}`}>
          {signedIn ? "Signed In" : "Signed Out"}
        </div>
      </div>

      {signedIn ? (
        <div className="auth-user">
          <p className="muted">昵称：{nickname ?? "未设置"}</p>
          <p className="muted">UID：{uid ?? "未知"}</p>
          <button
            className="secondary-button"
            disabled={loading}
            onClick={() => void onSignOut()}
            type="button"
          >
            {loading ? "处理中..." : "退出登录"}
          </button>
        </div>
      ) : (
        <>
          {step === "credentials" ? (
            <form
              className="auth-form"
              onSubmit={async (event) => {
                event.preventDefault();
                const result = await onSubmitCredentials({
                  account: account.trim(),
                  password,
                });

                if (result === "needs_profile") {
                  if (isEmailAccount) {
                    setEmail(account.trim());
                    setUsername("");
                  } else {
                    setUsername(account.trim());
                    setEmail("");
                  }
                  setStep("completeProfile");
                }
              }}
            >
              <p className="muted">已有账号会直接登录；首次使用需要补全信息并验证邮箱。</p>
              <label className="field">
                <span>邮箱或用户名</span>
                <input
                  aria-label="邮箱或用户名"
                  type="text"
                  value={account}
                  onChange={(event) => setAccount(event.target.value)}
                  placeholder="输入用户名或邮箱"
                />
              </label>
              <label className="field">
                <span>密码</span>
                <input
                  aria-label="密码"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="输入密码"
                />
              </label>
              <button className="primary-button" disabled={loading} type="submit">
                {loading ? "处理中..." : "继续"}
              </button>
            </form>
          ) : null}

          {step === "completeProfile" ? (
            <form
              className="auth-form"
              onSubmit={async (event) => {
                event.preventDefault();
                await onCompleteProfile({
                  email: email.trim(),
                  username: username.trim(),
                  password,
                });
                setVerificationCode("");
                setSendCooldown(60);
                setStep("verifySignup");
              }}
            >
              <p className="muted">没有找到这个账号。补全信息后会发送邮箱验证码。</p>
              <label className="field">
                <span>邮箱</span>
                <input
                  aria-label="邮箱"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="用于接收验证码"
                />
              </label>
              <label className="field">
                <span>用户名</span>
                <input
                  aria-label="用户名"
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="5-24 位，英文/数字开头"
                />
              </label>
              <div className="auth-inline-row">
                <button
                  className="secondary-button"
                  disabled={loading}
                  onClick={() => setStep("credentials")}
                  type="button"
                >
                  返回
                </button>
                <button className="primary-button" disabled={loading} type="submit">
                  {loading ? "发送中..." : "发送验证码"}
                </button>
              </div>
            </form>
          ) : null}

          {step === "verifySignup" ? (
            <form
              className="auth-form"
              onSubmit={async (event) => {
                event.preventDefault();
                await onVerifySignup({
                  email: email.trim(),
                  verificationCode: verificationCode.trim(),
                });
              }}
            >
              <p className="muted">验证码已发送到 {email}，验证成功后会自动登录。</p>
              <div className="auth-inline-row">
                <label className="field">
                  <span>邮箱验证码</span>
                  <input
                    aria-label="邮箱验证码"
                    type="text"
                    value={verificationCode}
                    onChange={(event) => setVerificationCode(event.target.value)}
                    placeholder="输入验证码"
                  />
                </label>
                <button
                  className="secondary-button auth-send-code-button"
                  disabled={loading || sendCooldown > 0}
                  onClick={async () => {
                    await onCompleteProfile({
                      email: email.trim(),
                      username: username.trim(),
                      password,
                    });
                    setSendCooldown(60);
                  }}
                  type="button"
                >
                  {sendCooldown > 0 ? `${sendCooldown}s 后可重发` : "重新发送"}
                </button>
              </div>
              <div className="auth-inline-row">
                <button
                  className="secondary-button"
                  disabled={loading}
                  onClick={() => setStep("completeProfile")}
                  type="button"
                >
                  修改信息
                </button>
                <button className="primary-button" disabled={loading} type="submit">
                  {loading ? "验证中..." : "验证并进入"}
                </button>
              </div>
            </form>
          ) : null}
        </>
      )}

      {error ? <div className="error-box">{error}</div> : null}
      {notice ? <div className="info-box">{notice}</div> : null}
    </section>
  );
}
