import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { ensureDataFiles, findUserById } from "@/lib/db";

export const runtime = "nodejs";

export async function POST() {
  await ensureDataFiles();
  const session = await getAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const user = await findUserById(session.user.id);
  const response = NextResponse.json({ paid: Boolean(user?.paid) });

  if (user?.paid) {
    response.cookies.set("cronjob_paid", "1", {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30
    });
  } else {
    response.cookies.delete("cronjob_paid");
  }

  return response;
}
