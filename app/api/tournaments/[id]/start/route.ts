import { NextResponse } from "next/server";

import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { assertAdminToken, generateInitialBracket } from "@/lib/tournaments";
import { startTournamentSchema } from "@/lib/validators";

function jsonError(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json({ code: error.code, message: error.message }, { status: error.status });
  }

  console.error(error);
  return NextResponse.json({ code: "internal_error", message: "Unexpected server error." }, { status: 500 });
}

export async function POST(request: Request, ctx: RouteContext<"/api/tournaments/[id]/start">) {
  try {
    const { id } = await ctx.params;
    const payload = startTournamentSchema.parse(await request.json().catch(() => ({})));

    await assertAdminToken(id, payload.adminToken);
    await generateInitialBracket(id, payload.regenerate);
    const tournament = await prisma.tournament.update({
      where: { id },
      data: {
        status: "running",
        startedAt: new Date(),
      },
    });

    return NextResponse.json({ tournamentId: tournament.id, message: "Tournament started." });
  } catch (error) {
    return jsonError(error);
  }
}
