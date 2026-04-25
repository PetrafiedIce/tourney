import { randomUUID } from "node:crypto";

import type { Match, Player } from "@prisma/client";

import { MATCH_CHECK_RATE_LIMIT_MS, TOURNAMENT_STATUSES } from "@/lib/constants";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import type { FlowPvPRecentMatch } from "@/lib/flowpvp";
import type { TournamentWithRelations } from "@/lib/types";

export const bracketInclude = {
  players: {
    orderBy: {
      seed: "asc" as const,
    },
  },
  matches: {
    include: {
      player1: true,
      player2: true,
      winner: true,
    },
    orderBy: [{ round: "asc" as const }, { slot: "asc" as const }],
  },
};

export async function getTournamentOrThrow(id: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: bracketInclude,
  });

  if (!tournament) {
    throw new AppError("not_found", "Tournament not found.", 404);
  }

  return tournament as TournamentWithRelations;
}

export function createAdminToken() {
  return randomUUID();
}

export async function assertAdminToken(tournamentId: string, adminToken: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { adminToken: true },
  });

  if (!tournament) {
    throw new AppError("not_found", "Tournament not found.", 404);
  }

  if (tournament.adminToken !== adminToken) {
    throw new AppError("admin_token_invalid", "Admin token is invalid.", 403);
  }
}

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function nextPowerOfTwo(value: number) {
  let size = 1;
  while (size < value) {
    size *= 2;
  }
  return size;
}

async function autoAdvanceByeMatch(matchId: string, winnerId: string) {
  await advanceWinner({
    matchId,
    winnerId,
    flowpvpMatchId: null,
    note: "Auto-advanced because this slot was a bye.",
    resolvedAt: new Date(),
  });
}

export async function generateInitialBracket(tournamentId: string, regenerate = false) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      players: true,
      matches: true,
    },
  });

  if (!tournament) {
    throw new AppError("not_found", "Tournament not found.", 404);
  }

  if (tournament.status !== TOURNAMENT_STATUSES.SETUP) {
    throw new AppError("bad_request", "Only setup tournaments can generate a bracket.", 400);
  }

  if (tournament.players.length < 2) {
    throw new AppError("bad_request", "At least two players are required to start the bracket.", 400);
  }

  if (regenerate) {
    await prisma.match.deleteMany({ where: { tournamentId } });
  } else if (tournament.matches.length > 0) {
    throw new AppError("bad_request", "Bracket already exists for this tournament.", 400);
  }

  const shuffledPlayers = shuffle(tournament.players);
  const fieldSize = nextPowerOfTwo(shuffledPlayers.length);
  const paddedPlayers = [
    ...shuffledPlayers,
    ...Array.from({ length: fieldSize - shuffledPlayers.length }, () => null),
  ];

  await prisma.$transaction([
    prisma.player.updateMany({
      where: { tournamentId },
      data: { eliminated: false },
    }),
    ...shuffledPlayers.map((player, index) =>
      prisma.player.update({
        where: { id: player.id },
        data: { seed: index + 1 },
      }),
    ),
  ]);

  const createdMatches: Match[] = [];
  for (let slot = 0; slot < paddedPlayers.length / 2; slot += 1) {
    const player1 = paddedPlayers[slot * 2];
    const player2 = paddedPlayers[slot * 2 + 1];
    const playable = Boolean(player1 && player2);
    const match = await prisma.match.create({
      data: {
        tournamentId,
        round: 1,
        slot,
        player1Id: player1?.id ?? null,
        player2Id: player2?.id ?? null,
        startedAt: playable ? new Date() : null,
      },
    });
    createdMatches.push(match);
  }

  for (const match of createdMatches) {
    if (match.player1Id && !match.player2Id) {
      await autoAdvanceByeMatch(match.id, match.player1Id);
    } else if (!match.player1Id && match.player2Id) {
      await autoAdvanceByeMatch(match.id, match.player2Id);
    }
  }

  return getTournamentOrThrow(tournamentId);
}

async function fillNextMatchSlot(tournamentId: string, round: number, slot: number, winnerId: string) {
  const nextRound = round + 1;
  const nextSlot = Math.floor(slot / 2);
  const assignToPlayer1 = slot % 2 === 0;

  const existing = await prisma.match.findUnique({
    where: {
      tournamentId_round_slot: {
        tournamentId,
        round: nextRound,
        slot: nextSlot,
      },
    },
  });

  const data = assignToPlayer1 ? { player1Id: winnerId } : { player2Id: winnerId };

  const nextMatch = existing
    ? await prisma.match.update({
        where: { id: existing.id },
        data,
      })
    : await prisma.match.create({
        data: {
          tournamentId,
          round: nextRound,
          slot: nextSlot,
          ...data,
        },
      });

  const refreshed = await prisma.match.findUnique({ where: { id: nextMatch.id } });
  if (!refreshed) {
    return;
  }

  if (refreshed.player1Id && refreshed.player2Id && !refreshed.startedAt) {
    await prisma.match.update({
      where: { id: refreshed.id },
      data: { startedAt: new Date() },
    });
  }
}

async function maybeFinishTournament(tournamentId: string) {
  const remaining = await prisma.player.count({
    where: {
      tournamentId,
      eliminated: false,
    },
  });

  if (remaining <= 1) {
    await prisma.tournament.update({
      where: { id: tournamentId },
      data: { status: TOURNAMENT_STATUSES.FINISHED },
    });
  }
}

export async function advanceWinner({
  matchId,
  winnerId,
  flowpvpMatchId,
  note,
  resolvedAt,
  latestUsernames,
}: {
  matchId: string;
  winnerId: string;
  flowpvpMatchId: string | null;
  note?: string | null;
  resolvedAt?: Date;
  latestUsernames?: Record<string, string>;
}) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      tournament: true,
      player1: true,
      player2: true,
    },
  });

  if (!match) {
    throw new AppError("not_found", "Match not found.", 404);
  }

  if (match.winnerId && match.winnerId !== winnerId) {
    throw new AppError("bad_request", "Match already resolved with a different winner.", 400);
  }

  const loserId = match.player1Id === winnerId ? match.player2Id : match.player1Id;

  await prisma.$transaction(async (tx) => {
    await tx.match.update({
      where: { id: match.id },
      data: {
        winnerId,
        flowpvpMatchId,
        resolvedAt: resolvedAt ?? new Date(),
        notes: note ?? undefined,
      },
    });

    if (loserId) {
      await tx.player.update({
        where: { id: loserId },
        data: { eliminated: true },
      });
    }

    await tx.player.update({
      where: { id: winnerId },
      data: { eliminated: false },
    });

    if (match.player1Id && match.player1 && latestUsernames?.[match.player1.uuid]) {
      await tx.player.update({
        where: { id: match.player1Id },
        data: { username: latestUsernames[match.player1.uuid] },
      });
    }

    if (match.player2Id && match.player2 && latestUsernames?.[match.player2.uuid]) {
      await tx.player.update({
        where: { id: match.player2Id },
        data: { username: latestUsernames[match.player2.uuid] },
      });
    }
  });

  await fillNextMatchSlot(match.tournamentId, match.round, match.slot, winnerId);
  await maybeFinishTournament(match.tournamentId);

  return getTournamentOrThrow(match.tournamentId);
}

export async function resetMatchResult(matchId: string, note: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      tournament: true,
      player1: true,
      player2: true,
    },
  });

  if (!match) {
    throw new AppError("not_found", "Match not found.", 404);
  }

  if (!match.winnerId) {
    return getTournamentOrThrow(match.tournamentId);
  }

  if (match.round > 1) {
    const downstream = await prisma.match.findFirst({
      where: {
        tournamentId: match.tournamentId,
        round: { gt: match.round },
        OR: [
          { player1Id: match.winnerId },
          { player2Id: match.winnerId },
          { winnerId: match.winnerId },
        ],
      },
    });

    if (downstream) {
      throw new AppError(
        "bad_request",
        "Undo is only allowed before the winner has been used in a later round.",
        400,
      );
    }
  }

  const previousWinnerId = match.winnerId;
  const previousLoserId = match.player1Id === previousWinnerId ? match.player2Id : match.player1Id;

  const nextRound = match.round + 1;
  const nextSlot = Math.floor(match.slot / 2);
  const nextMatch = await prisma.match.findUnique({
    where: {
      tournamentId_round_slot: {
        tournamentId: match.tournamentId,
        round: nextRound,
        slot: nextSlot,
      },
    },
  });

  await prisma.$transaction(async (tx) => {
    await tx.match.update({
      where: { id: match.id },
      data: {
        winnerId: null,
        flowpvpMatchId: null,
        resolvedAt: null,
        notes: note,
      },
    });

    if (previousLoserId) {
      await tx.player.update({ where: { id: previousLoserId }, data: { eliminated: false } });
    }

    if (nextMatch && previousWinnerId) {
      if (nextMatch.player1Id === previousWinnerId) {
        await tx.match.update({
          where: { id: nextMatch.id },
          data: { player1Id: null, startedAt: null },
        });
      } else if (nextMatch.player2Id === previousWinnerId) {
        await tx.match.update({
          where: { id: nextMatch.id },
          data: { player2Id: null, startedAt: null },
        });
      }
    }

    await tx.tournament.update({
      where: { id: match.tournamentId },
      data: { status: TOURNAMENT_STATUSES.RUNNING },
    });
  });

  return getTournamentOrThrow(match.tournamentId);
}

export function canCheckMatch(match: Match) {
  if (!match.lastCheckedAt) {
    return { allowed: true, retryAfterMs: 0 };
  }

  const elapsed = Date.now() - match.lastCheckedAt.getTime();
  if (elapsed >= MATCH_CHECK_RATE_LIMIT_MS) {
    return { allowed: true, retryAfterMs: 0 };
  }

  return { allowed: false, retryAfterMs: MATCH_CHECK_RATE_LIMIT_MS - elapsed };
}

export function selectFirstQualifyingResult({
  player1,
  player2,
  ladder,
  startedAt,
  knownIds,
  recentMatches,
}: {
  player1: Player;
  player2: Player;
  ladder: string;
  startedAt: Date | null;
  knownIds: Set<string>;
  recentMatches: FlowPvPRecentMatch[];
}) {
  const startedAtMs = startedAt?.getTime() ?? 0;

  return recentMatches
    .filter((match) => {
      const participants = new Set([...match.winningPlayers, ...match.losingPlayers]);
      return (
        participants.has(player1.uuid) &&
        participants.has(player2.uuid) &&
        match.ladder?._id === ladder &&
        match.endedAt > startedAtMs &&
        !knownIds.has(match._id)
      );
    })
    .sort((a, b) => a.endedAt - b.endedAt)[0];
}

export function deriveWinnerFromFlowMatch(match: FlowPvPRecentMatch, player1: Player, player2: Player) {
  if (match.winningPlayers.includes(player1.uuid)) {
    return {
      winnerId: player1.id,
      winnerUsername: match.postMatchPlayers?.[player1.uuid]?.lastUsername ?? player1.username,
    };
  }

  if (match.winningPlayers.includes(player2.uuid)) {
    return {
      winnerId: player2.id,
      winnerUsername: match.postMatchPlayers?.[player2.uuid]?.lastUsername ?? player2.username,
    };
  }

  throw new AppError("bad_request", "Unable to determine winner from FlowPvP data.", 500);
}

export function latestDisplayName(match: FlowPvPRecentMatch, player: Player) {
  return match.postMatchPlayers?.[player.uuid]?.lastUsername ?? player.username;
}
