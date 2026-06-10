import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AuthPanel } from "@/ui/auth-panel";

function renderAuthPanel(overrides?: Partial<React.ComponentProps<typeof AuthPanel>>) {
  return render(
    <AuthPanel
      signedIn={false}
      nickname={null}
      uid={null}
      loading={false}
      error={null}
      onSubmitCredentials={vi.fn().mockResolvedValue("signed_in")}
      onCompleteProfile={vi.fn()}
      onVerifySignup={vi.fn()}
      onSignOut={vi.fn()}
      {...overrides}
    />,
  );
}

describe("auth-panel", () => {
  it("submits username/email account sign-in", async () => {
    const user = userEvent.setup();
    const onSubmitCredentials = vi.fn().mockResolvedValue("signed_in");

    renderAuthPanel({ onSubmitCredentials });

    await user.type(screen.getByLabelText(/邮箱或用户名/i), " user@example.com ");
    await user.type(screen.getByLabelText(/^密码$/i), "pw123456");
    await user.click(screen.getByRole("button", { name: /继续/i }));

    expect(onSubmitCredentials).toHaveBeenCalledWith({
      account: "user@example.com",
      password: "pw123456",
    });
  });

  it("asks for username when email account does not exist", async () => {
    const user = userEvent.setup();
    const onSubmitCredentials = vi.fn().mockResolvedValue("needs_profile");
    const onCompleteProfile = vi.fn().mockResolvedValue(undefined);

    renderAuthPanel({ onSubmitCredentials, onCompleteProfile });

    await user.type(screen.getByLabelText(/邮箱或用户名/i), "new@example.com");
    await user.type(screen.getByLabelText(/^密码$/i), "pw123456");
    await user.click(screen.getByRole("button", { name: /继续/i }));

    expect(await screen.findByLabelText(/用户名/i)).toHaveValue("");
    expect(screen.getByLabelText(/^邮箱$/i)).toHaveValue("new@example.com");

    await user.type(screen.getByLabelText(/用户名/i), "new_user");
    await user.click(screen.getByRole("button", { name: /发送验证码/i }));

    expect(onCompleteProfile).toHaveBeenCalledWith({
      email: "new@example.com",
      username: "new_user",
      password: "pw123456",
    });
  });

  it("verifies signup code and enforces resend cooldown", async () => {
    const user = userEvent.setup();
    const onSubmitCredentials = vi.fn().mockResolvedValue("needs_profile");
    const onCompleteProfile = vi.fn().mockResolvedValue(undefined);
    const onVerifySignup = vi.fn().mockResolvedValue(undefined);

    renderAuthPanel({ onSubmitCredentials, onCompleteProfile, onVerifySignup });

    await user.type(screen.getByLabelText(/邮箱或用户名/i), "new_user");
    await user.type(screen.getByLabelText(/^密码$/i), "pw123456");
    await user.click(screen.getByRole("button", { name: /继续/i }));

    expect(await screen.findByLabelText(/用户名/i)).toHaveValue("new_user");
    await user.type(screen.getByLabelText(/^邮箱$/i), "new@example.com");
    await user.click(screen.getByRole("button", { name: /发送验证码/i }));

    expect(screen.getByRole("button", { name: /60s 后可重发/i })).toBeDisabled();

    await user.type(screen.getByLabelText(/邮箱验证码/i), "123456");
    await user.click(screen.getByRole("button", { name: /验证并进入/i }));

    expect(onVerifySignup).toHaveBeenCalledWith({
      email: "new@example.com",
      verificationCode: "123456",
    });
  });
});
