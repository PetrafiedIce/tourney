import { NextResponse } from "next/server";

import { jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { assertAdminToken, generateInitialBracket } from "@/lib/tournaments";
import { startTournamentSchema } from "@/lib/validators";

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
