import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { setAccessCookie } from "@/lib/auth";
import { ensureSchema, query } from "@/lib/db";

const claimSchema = z.object({
  email: z.string().email()
});

interface PaidRow {
  email: string;
}

export async function POST(request: NextRequest) {
  try {
    await ensureSchema();

    const body = await request.json();
    const parsed = claimSchema.parse(body);
    const normalizedEmail = parsed.email.toLowerCase().trim();

    const paidResult = await query<PaidRow>(`SELECT email FROM paid_customers WHERE email = $1 LIMIT 1`, [normalizedEmail]);

    if (!paidResult.rows.length && process.env.NODE_ENV === "production") {
      return NextResponse.json(
        {
          error:
            "No completed payment found for this email yet. Finish checkout, wait up to 30 seconds, then try again."
        },
        { status: 404 }
      );
    }

    if (!paidResult.rows.length && process.env.NODE_ENV !== "production") {
      await query(
        `
          INSERT INTO paid_customers (email, source, purchased_at, updated_at)
          VALUES ($1, 'development-override', NOW(), NOW())
          ON CONFLICT (email)
          DO UPDATE SET updated_at = NOW()
        `,
        [normalizedEmail]
      );
    }

    const response = NextResponse.json({ ok: true, email: normalizedEmail });
    setAccessCookie(response, normalizedEmail);
    return response;
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not claim access"
      },
      { status: 400 }
    );
  }
}
