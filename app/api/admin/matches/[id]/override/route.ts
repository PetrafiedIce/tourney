import { NextResponse } from "next/server";

import { jsonError } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { advanceWinner, resetMatchResult } from "@/lib/tournaments";
import { adminOverrideSchema } from "@/lib/validators";

export async function POST(request: Request, ctx: RouteContext<"/api/admin/matches/[id]/override">) {
  try {
    const { id } = await ctx.params;
    const payload = adminOverrideSchema.parse(await request.json());
    const match = await prisma.match.findUnique({
      where: { id },
      include: { tournament: true },
    });

    if (!match) {
      throw new AppError("not_found", "Match not found.", 404);
    }

    if (payload.adminToken !== match.tournament.adminToken) {
      throw new AppError("admin_token_invalid", "Admin token is invalid.", 403);
    }

    if (payload.winnerId) {
      await advanceWinner({
        matchId: id,
        winnerId: payload.winnerId,
        flowpvpMatchId: null,
        note: payload.note,
      });
      return NextResponse.json({ message: "Manual winner saved." });
    }

    await resetMatchResult(id, payload.note);
    return NextResponse.json({ message: "Match result cleared." });
  } catch (error) {
    return jsonError(error);
  }
}
