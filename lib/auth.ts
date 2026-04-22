import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { type NextRequest, NextResponse } from "next/server";

export const ACCESS_COOKIE_NAME = "cronjob_access";
const ACCESS_TTL_SECONDS = 60 * 60 * 24 * 30;

interface AccessTokenPayload {
  email: string;
  exp: number;
}

function getAccessSigningSecret(): string {
  return process.env.STRIPE_WEBHOOK_SECRET || "local-dev-signing-secret-change-me";
}

function sign(value: string): string {
  return crypto.createHmac("sha256", getAccessSigningSecret()).update(value).digest("base64url");
}

export function createAccessToken(email: string): string {
  const payload: AccessTokenPayload = {
    email,
    exp: Math.floor(Date.now() / 1000) + ACCESS_TTL_SECONDS
  };

  const serializedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = sign(serializedPayload);

  return `${serializedPayload}.${signature}`;
}

export function verifyAccessToken(token: string | null | undefined): AccessTokenPayload | null {
  if (!token) {
    return null;
  }

  const [serializedPayload, signature] = token.split(".");
  if (!serializedPayload || !signature) {
    return null;
  }

  const expectedSignature = sign(serializedPayload);
  if (signature.length !== expectedSignature.length) {
    return null;
  }

  const signaturesMatch = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));

  if (!signaturesMatch) {
    return null;
  }

  let payload: AccessTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(serializedPayload, "base64url").toString("utf8")) as AccessTokenPayload;
  } catch {
    return null;
  }

  if (payload.exp <= Math.floor(Date.now() / 1000)) {
    return null;
  }

  return payload;
}

export function setAccessCookie(response: NextResponse, email: string): void {
  response.cookies.set({
    name: ACCESS_COOKIE_NAME,
    value: createAccessToken(email),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_TTL_SECONDS
  });
}

export function clearAccessCookie(response: NextResponse): void {
  response.cookies.set({
    name: ACCESS_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });
}

export function assertApiAccess(request: NextRequest): NextResponse | null {
  const token = request.cookies.get(ACCESS_COOKIE_NAME)?.value;
  const payload = verifyAccessToken(token);

  if (!payload) {
    return NextResponse.json(
      {
        error: "Payment required. Buy access, then claim your dashboard with your billing email."
      },
      { status: 402 }
    );
  }

  return null;
}

export async function getAccessEmailFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE_NAME)?.value;
  const payload = verifyAccessToken(token);

  return payload?.email ?? null;
}

export async function requireDashboardAccess(): Promise<void> {
  const email = await getAccessEmailFromCookies();

  if (!email) {
    redirect("/paywall");
  }
}
