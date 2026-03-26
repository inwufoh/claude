// @vitest-environment node
import { describe, test, expect, vi, beforeEach } from "vitest";
import { SignJWT, jwtVerify } from "jose";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

const mockCookieStore = vi.hoisted(() => ({
  set: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue(mockCookieStore),
}));

import { createSession, getSession, deleteSession, verifySession } from "../auth";

const JWT_SECRET = new TextEncoder().encode("development-secret-key");

async function makeToken(
  payload: Record<string, unknown>,
  expiresAt: number | string = "7d"
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresAt)
    .sign(JWT_SECRET);
}

function expiredTimestamp(): number {
  return Math.floor(Date.now() / 1000) - 10;
}

describe("createSession", () => {
  beforeEach(() => vi.clearAllMocks());

  test("sets an httpOnly cookie named auth-token", async () => {
    await createSession("user-1", "a@example.com");

    expect(mockCookieStore.set).toHaveBeenCalledOnce();
    const [name, , options] = mockCookieStore.set.mock.calls[0];
    expect(name).toBe("auth-token");
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
  });

  test("token payload contains userId and email", async () => {
    await createSession("user-1", "a@example.com");

    const token = mockCookieStore.set.mock.calls[0][1];
    const { payload } = await jwtVerify(token, JWT_SECRET);
    expect(payload.userId).toBe("user-1");
    expect(payload.email).toBe("a@example.com");
  });

  test("cookie expiry is ~7 days from now", async () => {
    const before = Date.now();
    await createSession("user-1", "a@example.com");
    const after = Date.now();

    const options = mockCookieStore.set.mock.calls[0][2];
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    expect(options.expires.getTime()).toBeGreaterThanOrEqual(before + sevenDays - 2000);
    expect(options.expires.getTime()).toBeLessThanOrEqual(after + sevenDays + 2000);
  });

  test("token itself expires in ~7 days", async () => {
    const before = Date.now();
    await createSession("user-1", "a@example.com");
    const after = Date.now();

    const token = mockCookieStore.set.mock.calls[0][1];
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    expect(payload.exp! * 1000).toBeGreaterThanOrEqual(before + sevenDays - 2000);
    expect(payload.exp! * 1000).toBeLessThanOrEqual(after + sevenDays + 2000);
  });
});

describe("getSession", () => {
  beforeEach(() => vi.clearAllMocks());

  test("returns null when no cookie is present", async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    expect(await getSession()).toBeNull();
  });

  test("returns the session payload for a valid token", async () => {
    const token = await makeToken({ userId: "user-1", email: "a@example.com", expiresAt: new Date() });
    mockCookieStore.get.mockReturnValue({ value: token });

    const session = await getSession();
    expect(session?.userId).toBe("user-1");
    expect(session?.email).toBe("a@example.com");
  });

  test("returns null for a malformed token", async () => {
    mockCookieStore.get.mockReturnValue({ value: "not.a.jwt" });
    expect(await getSession()).toBeNull();
  });

  test("returns null for an expired token", async () => {
    const token = await makeToken({ userId: "user-1", email: "a@example.com" }, expiredTimestamp());
    mockCookieStore.get.mockReturnValue({ value: token });
    expect(await getSession()).toBeNull();
  });

  test("returns null for a token signed with the wrong secret", async () => {
    const wrongSecret = new TextEncoder().encode("wrong-secret");
    const token = await new SignJWT({ userId: "user-1", email: "a@example.com" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(wrongSecret);

    mockCookieStore.get.mockReturnValue({ value: token });
    expect(await getSession()).toBeNull();
  });
});

describe("deleteSession", () => {
  beforeEach(() => vi.clearAllMocks());

  test("deletes the auth-token cookie", async () => {
    await deleteSession();
    expect(mockCookieStore.delete).toHaveBeenCalledOnce();
    expect(mockCookieStore.delete).toHaveBeenCalledWith("auth-token");
  });
});

describe("verifySession", () => {
  test("returns null when request has no auth-token cookie", async () => {
    const req = new NextRequest("http://localhost/");
    expect(await verifySession(req)).toBeNull();
  });

  test("returns session payload for a valid token in the request", async () => {
    const token = await makeToken({ userId: "user-2", email: "b@example.com", expiresAt: new Date() });
    const req = new NextRequest("http://localhost/", {
      headers: { cookie: `auth-token=${token}` },
    });

    const session = await verifySession(req);
    expect(session?.userId).toBe("user-2");
    expect(session?.email).toBe("b@example.com");
  });

  test("returns null for a malformed token in the request", async () => {
    const req = new NextRequest("http://localhost/", {
      headers: { cookie: "auth-token=bad.token.value" },
    });
    expect(await verifySession(req)).toBeNull();
  });

  test("returns null for an expired token in the request", async () => {
    const token = await makeToken({ userId: "user-2", email: "b@example.com" }, expiredTimestamp());
    const req = new NextRequest("http://localhost/", {
      headers: { cookie: `auth-token=${token}` },
    });
    expect(await verifySession(req)).toBeNull();
  });

  test("returns null for a token signed with the wrong secret in the request", async () => {
    const wrongSecret = new TextEncoder().encode("wrong-secret");
    const token = await new SignJWT({ userId: "user-2" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(wrongSecret);

    const req = new NextRequest("http://localhost/", {
      headers: { cookie: `auth-token=${token}` },
    });
    expect(await verifySession(req)).toBeNull();
  });
});
