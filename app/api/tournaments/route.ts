import { NextResponse } from "next/server";

import { AppError } from "@/lib/errors";
import { resolveFlowPvPIdentity } from "@/lib/flowpvp";
import { prisma } from "@/lib/prisma";
import { createAdminToken } from "@/lib/tournaments";
import { createTournamentSchema, normalizeUsernames } from "@/lib/validators";

function jsonError(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json({ code: error.code, message: error.message, details: error.details }, { status: error.status });
  }

  console.error(error);
  return NextResponse.json({ code: "internal_error", message: "Unexpected server error." }, { status: 500 });
}

export async function POST(request: Request) {
  try {
    const payload = createTournamentSchema.parse(await request.json());
    const usernames = normalizeUsernames(payload.usernames ?? "");
    const adminToken = payload.adminToken?.trim() || createAdminToken();

    const players = [];
    if (usernames.length > 0) {
      for (const username of usernames) {
        const identity = await resolveFlowPvPIdentity(username);
        players.push(identity);
      }
    }

    const tournament = await prisma.tournament.create({
      data: {
        name: payload.name,
        ladder: payload.ladder,
        status: "setup",
        adminToken,
        players: players.length
          ? {
              create: players.map((player) => ({
                username: player.username,
                uuid: player.uuid,
              })),
            }
          : undefined,
      },
    });

    return NextResponse.json({
      tournamentId: tournament.id,
      adminToken,
      message: usernames.length > 0 ? "Tournament created and players registered." : "Tournament created.",
    });
  } catch (error) {
    return jsonError(error);
  }
}
