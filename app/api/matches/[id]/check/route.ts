import { NextResponse } from "next/server";

import { jsonError } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { getRecentMatches } from "@/lib/flowpvp";
import { prisma } from "@/lib/prisma";
import {
  advanceWinner,
  canCheckMatch,
  deriveWinnerFromFlowMatch,
  latestDisplayName,
  selectFirstQualifyingResult,
} from "@/lib/tournaments";

export async function POST(_request: Request, ctx: RouteContext<"/api/matches/[id]/check">) {
  try {
    const { id } = await ctx.params;
    const match = await prisma.match.findUnique({
      where: { id },
      include: {
        tournament: true,
        player1: true,
        player2: true,
      },
    });

    if (!match || !match.player1 || !match.player2) {
      throw new AppError("not_found", "Playable match not found.", 404);
    }

    if (match.tournament.status !== "running") {
      throw new AppError("tournament_not_running", "Tournament is not running.", 400);
    }

    if (match.winnerId) {
      throw new AppError("match_already_resolved", "This match was already resolved.", 400);
    }

    const rateLimit = canCheckMatch(match);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          code: "match_rate_limited",
          message: "This match was checked recently. Try again shortly.",
          retryAfterMs: rateLimit.retryAfterMs,
        },
        { status: 429 },
      );
    }

    await prisma.match.update({ where: { id: match.id }, data: { lastCheckedAt: new Date() } });

    const [player1Profile, player2Profile, usedMatches] = await Promise.all([
      getRecentMatches(match.player1.username),
      getRecentMatches(match.player2.username),
      prisma.match.findMany({
        where: { tournamentId: match.tournamentId, flowpvpMatchId: { not: null } },
        select: { flowpvpMatchId: true },
      }),
    ]);

    const dedupedMatches = new Map<string, (typeof player1Profile.recentMatches)[number]>();
    for (const flowMatch of [...player1Profile.recentMatches, ...player2Profile.recentMatches]) {
      dedupedMatches.set(flowMatch._id, flowMatch);
    }

    const qualifyingMatch = selectFirstQualifyingResult({
      player1: match.player1,
      player2: match.player2,
      ladder: match.tournament.ladder,
      startedAt: match.startedAt,
      knownIds: new Set(usedMatches.map((entry) => entry.flowpvpMatchId ?? "")),
      recentMatches: [...dedupedMatches.values()],
    });

    if (!qualifyingMatch) {
      return NextResponse.json({
        found: false,
        hint: "Play your match on FlowPvP first, then click again in a few seconds.",
      });
    }

    const winner = deriveWinnerFromFlowMatch(qualifyingMatch, match.player1, match.player2);
    await advanceWinner({
      matchId: match.id,
      winnerId: winner.winnerId,
      flowpvpMatchId: qualifyingMatch._id,
      note: `Auto-detected from FlowPvP at ${new Date(qualifyingMatch.endedAt).toISOString()}`,
      resolvedAt: new Date(qualifyingMatch.endedAt),
      latestUsernames: {
        [match.player1.uuid]: latestDisplayName(qualifyingMatch, match.player1),
        [match.player2.uuid]: latestDisplayName(qualifyingMatch, match.player2),
      },
    });

    return NextResponse.json({
      found: true,
      winnerId: winner.winnerId,
      winnerUsername: winner.winnerUsername,
      flowpvpMatchId: qualifyingMatch._id,
      player1DisplayName: latestDisplayName(qualifyingMatch, match.player1),
      player2DisplayName: latestDisplayName(qualifyingMatch, match.player2),
      message: `Detected FlowPvP match ${qualifyingMatch._id} and advanced ${winner.winnerUsername}.`,
    });
  } catch (error) {
    return jsonError(error);
  }
}
