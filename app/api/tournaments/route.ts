import { NextResponse } from "next/server";

import { jsonError } from "@/lib/api";
import { resolveFlowPvPIdentity } from "@/lib/flowpvp";
import { prisma } from "@/lib/prisma";
import { createAdminToken } from "@/lib/tournaments";
import { createTournamentSchema, normalizeUsernames } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const rawPayload = (await request.json()) as {
      name?: string;
      ladder?: string;
      usernames?: string;
      adminToken?: string;
    };
    const payload = createTournamentSchema.parse({
      ...rawPayload,
      adminToken: rawPayload.adminToken?.trim() ? rawPayload.adminToken : undefined,
    });
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
