import type { Match, Player, Tournament } from "@prisma/client";

export type MatchWithPlayers = Match & {
  player1: Player | null;
  player2: Player | null;
  winner: Player | null;
};

export type TournamentWithRelations = Tournament & {
  players: Player[];
  matches: MatchWithPlayers[];
};

export type BracketRound = {
  round: number;
  matches: MatchWithPlayers[];
};
