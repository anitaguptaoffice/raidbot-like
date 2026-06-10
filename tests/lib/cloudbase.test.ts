import { describe, expect, it } from "vitest";

import {
  buildPasswordSignInPayload,
  isEmailAccount,
  unwrapCloudbaseResult,
} from "@/lib/cloudbase";

describe("cloudbase helpers", () => {
  it("recognizes email accounts", () => {
    expect(isEmailAccount("user@example.com")).toBe(true);
    expect(isEmailAccount("demo_user")).toBe(false);
  });

  it("builds email sign-in payload", () => {
    expect(buildPasswordSignInPayload("user@example.com", "pw123")).toEqual({
      email: "user@example.com",
      password: "pw123",
    });
  });

  it("builds username sign-in payload", () => {
    expect(buildPasswordSignInPayload("demo_user", "pw123")).toEqual({
      username: "demo_user",
      password: "pw123",
    });
  });

  it("throws when cloudbase returns an error object", () => {
    expect(() =>
      unwrapCloudbaseResult({
        error: {
          message: "user_already_exists",
        },
      }),
    ).toThrow("user_already_exists");
  });

  it("passes through when cloudbase has no error", () => {
    expect(
      unwrapCloudbaseResult({
        data: { ok: true },
        error: null,
      }),
    ).toEqual({
      data: { ok: true },
      error: null,
    });
  });
});
