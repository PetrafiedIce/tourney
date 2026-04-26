"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";

type Props = {
  matchId: string;
  publicMode: boolean;
  adminToken?: string;
  player1Id?: string | null;
  player2Id?: string | null;
  winnerId?: string | null;
};

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    const message = typeof data.message === "string" ? data.message : "Request failed.";
    throw new Error(message);
  }

  return data;
}

export function MatchActions({ matchId, publicMode, adminToken, player1Id, player2Id, winnerId }: Props) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [loading, setLoading] = useState(false);

  async function checkMatch() {
    setLoading(true);
    try {
      const data = await postJson(`/api/matches/${matchId}/check`, {});
      if (data.found) {
        pushToast({
          title: `Match recorded - winner is ${String(data.winnerUsername ?? "unknown")}`,
          description: typeof data.message === "string" ? data.message : "The bracket has been advanced.",
        });
      } else {
        pushToast({
          title: "No match found yet on FlowPvP",
          description:
            typeof data.hint === "string"
              ? data.hint
              : "Play your bracket match on FlowPvP first, then click again.",
        });
      }
      router.refresh();
    } catch (error) {
      pushToast({
        title: "Unable to check FlowPvP right now",
        description: error instanceof Error ? error.message : "Unexpected error.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function overrideWinner(nextWinnerId: string | null) {
    if (!adminToken) {
      return;
    }

    const note = nextWinnerId ? "Manual admin override" : "Manual admin undo";
    setLoading(true);
    try {
      await postJson(`/api/admin/matches/${matchId}/override`, {
        adminToken,
        winnerId: nextWinnerId,
        note,
      });
      pushToast({
        title: nextWinnerId ? "Manual winner saved" : "Match result cleared",
        description: note,
      });
      router.refresh();
    } catch (error) {
      pushToast({
        title: "Admin action failed",
        description: error instanceof Error ? error.message : "Unexpected error.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {!winnerId && player1Id && player2Id ? (
        <Button onClick={checkMatch} disabled={loading} size="sm">
          {loading ? "Checking..." : "I Played My Match"}
        </Button>
      ) : null}
      {!publicMode && adminToken && player1Id ? (
        <Button onClick={() => overrideWinner(player1Id)} disabled={loading} size="sm" variant="secondary">
          Advance P1
        </Button>
      ) : null}
      {!publicMode && adminToken && player2Id ? (
        <Button onClick={() => overrideWinner(player2Id)} disabled={loading} size="sm" variant="secondary">
          Advance P2
        </Button>
      ) : null}
      {!publicMode && adminToken && winnerId ? (
        <Button onClick={() => overrideWinner(null)} disabled={loading} size="sm" variant="outline">
          Undo Result
        </Button>
      ) : null}
    </div>
  );
}
