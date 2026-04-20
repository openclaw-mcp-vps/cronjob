import { NextResponse } from "next/server";
import { z } from "zod";

import { createUser, ensureDataFiles } from "@/lib/db";

export const runtime = "nodejs";

const registerSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[a-z]/, "Password must include a lowercase letter")
    .regex(/[A-Z]/, "Password must include an uppercase letter")
    .regex(/[0-9]/, "Password must include a number"),
  notificationEmail: z.string().email().optional()
});

export async function POST(request: Request) {
  await ensureDataFiles();
  const payload = await request.json();
  const parsed = registerSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Invalid registration payload.",
        issues: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  try {
    const user = await createUser(parsed.data);

    return NextResponse.json({
      id: user.id,
      email: user.email,
      message: "Account created successfully."
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create user.";
    return NextResponse.json({ message }, { status: 409 });
  }
}
