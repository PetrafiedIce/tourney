"use client";

import Image from "next/image";
import { useState } from "react";

import { MatchActions } from "@/components/match-actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { buildPublicBracketLink, getRounds } from "@/lib/bracket";
import type { TournamentWithRelations } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  tournament: TournamentWithRelations;
  publicMode: boolean;
  adminToken?: string;
};

function PlayerRow({
  uuid,
  username,
  highlighted,
  dimmed,
}: {
  uuid?: string;
  username?: string;
  highlighted?: boolean;
  dimmed?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border px-3 py-2",
        highlighted
          ? "border-emerald-500/40 bg-emerald-500/10"
          : "border-zinc-800 bg-zinc-950/50",
        dimmed ? "opacity-50" : "opacity-100",
      )}
    >
      {uuid ? (
        <Image
          src={`https://mc-heads.net/avatar/${uuid}/64`}
          alt={username ?? "Minecraft avatar"}
          width={32}
          height={32}
          className="rounded-md"
          unoptimized
        />
      ) : (
        <div className="h-8 w-8 rounded-md bg-zinc-800" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-50">{username ?? "Bye"}</p>
      </div>
    </div>
  );
}

export function Bracket({ tournament, publicMode, adminToken }: Props) {
  const rounds = getRounds(tournament.matches);
  const [compact, setCompact] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 px-4 py-3 text-sm text-zinc-400">
        <span>{tournament.players.length} entrants</span>
        <span>Status: {tournament.status}</span>
        <span>Ladder: {tournament.ladder}</span>
        <Button size="sm" variant="outline" onClick={() => setCompact((value) => !value)}>
          {compact ? "Standard Zoom" : "Compact Zoom"}
        </Button>
      </div>
      <div className="overflow-x-auto pb-4">
        <div className={cn("flex min-w-max items-start gap-4", compact && "scale-90 origin-top-left")}>
          {rounds.map((round) => (
            <div key={round.round} className={cn("shrink-0 space-y-4", compact ? "w-[280px]" : "w-[320px]")}>
              <div className="sticky top-0 z-10 rounded-xl border border-zinc-800 bg-zinc-950/90 px-4 py-2 text-sm font-medium text-zinc-200 backdrop-blur">
                Round {round.round}
              </div>
              {round.matches.map((match) => {
                const winnerId = match.winnerId;
                const player1Highlighted = winnerId === match.player1Id;
                const player2Highlighted = winnerId === match.player2Id;
                return (
                  <Card key={match.id} className="space-y-3 p-4">
                    <div className="space-y-2">
                      <PlayerRow
                        uuid={match.player1?.uuid}
                        username={match.player1?.username}
                        highlighted={player1Highlighted}
                        dimmed={Boolean(winnerId && !player1Highlighted)}
                      />
                      <PlayerRow
                        uuid={match.player2?.uuid}
                        username={match.player2?.username}
                        highlighted={player2Highlighted}
                        dimmed={Boolean(winnerId && !player2Highlighted)}
                      />
                    </div>
                    <div className="space-y-2 text-xs text-zinc-400">
                      <p>Slot {match.slot + 1}</p>
                      {match.startedAt ? <p>Playable since {new Date(match.startedAt).toLocaleString()}</p> : <p>Waiting for previous round</p>}
                      {match.flowpvpMatchId ? (
                        <a
                          href={buildPublicBracketLink(match.flowpvpMatchId)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-300 hover:text-emerald-200"
                        >
                          View FlowPvP match
                        </a>
                      ) : null}
                    </div>
                    <MatchActions
                      matchId={match.id}
                      publicMode={publicMode}
                      adminToken={adminToken}
                      player1Id={match.player1Id}
                      player2Id={match.player2Id}
                      winnerId={match.winnerId}
                    />
                  </Card>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
