import type { BracketRound, MatchWithPlayers } from "@/lib/types";

export function getRounds(matches: MatchWithPlayers[]): BracketRound[] {
  const grouped = new Map<number, MatchWithPlayers[]>();

  for (const match of matches) {
    const bucket = grouped.get(match.round) ?? [];
    bucket.push(match);
    grouped.set(match.round, bucket);
  }

  return Array.from(grouped.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([round, roundMatches]) => ({
      round,
      matches: roundMatches.sort((a, b) => a.slot - b.slot),
    }));
}

export function buildPublicBracketLink(matchId: string) {
  return `https://flowpvp.gg/match/${matchId}`;
}
