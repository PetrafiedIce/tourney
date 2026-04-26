import { NextResponse } from "next/server";

import { AppError } from "@/lib/errors";
import { resolveFlowPvPIdentity } from "@/lib/flowpvp";
import { prisma } from "@/lib/prisma";
import { registerPlayersSchema } from "@/lib/validators";

function jsonError(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json({ code: error.code, message: error.message }, { status: error.status });
  }

  console.error(error);
  return NextResponse.json({ code: "internal_error", message: "Unexpected server error." }, { status: 500 });
}

export async function POST(request: Request, ctx: RouteContext<"/api/tournaments/[id]/register-players">) {
  try {
    const { id } = await ctx.params;
    const payload = registerPlayersSchema.parse(await request.json());
    const tournament = await prisma.tournament.findUnique({ where: { id } });
    if (!tournament) {
      throw new AppError("not_found", "Tournament not found.", 404);
    }
    if (tournament.status !== "setup") {
      throw new AppError("bad_request", "Players can only be registered before the tournament starts.", 400);
    }

    const players = [];
    for (const username of payload.usernames) {
      players.push(await resolveFlowPvPIdentity(username));
    }

    await prisma.player.createMany({
      data: players.map((player) => ({
        tournamentId: id,
        username: player.username,
        uuid: player.uuid,
      })),
      skipDuplicates: true,
    });

    return NextResponse.json({ count: players.length, message: "Players registered." });
  } catch (error) {
    return jsonError(error);
  }
}
