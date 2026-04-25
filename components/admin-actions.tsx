"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";

export function AdminTournamentActions({
  tournamentId,
  adminToken,
  status,
}: {
  tournamentId: string;
  adminToken: string;
  status: string;
}) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  async function run(url: string, body: unknown, loadingKey: string, successTitle: string) {
    setLoading(loadingKey);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as Record<string, unknown>;
      if (!response.ok) {
        throw new Error(typeof data.message === "string" ? data.message : "Request failed.");
      }
      pushToast({ title: successTitle, description: typeof data.message === "string" ? data.message : undefined });
      router.refresh();
    } catch (error) {
      pushToast({
        title: "Admin action failed",
        description: error instanceof Error ? error.message : "Unexpected error.",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-3">
      {status === "setup" ? (
        <>
          <Button onClick={() => run(`/api/tournaments/${tournamentId}/start`, { adminToken, regenerate: false }, "start", "Tournament started")}
            disabled={loading !== null}>
            {loading === "start" ? "Starting..." : "Start Tournament"}
          </Button>
          <Button
            variant="secondary"
            onClick={() => run(`/api/admin/tournaments/${tournamentId}/actions`, { adminToken, action: "regenerate" }, "regenerate", "Bracket regenerated")}
            disabled={loading !== null}
          >
            {loading === "regenerate" ? "Regenerating..." : "Regenerate Bracket"}
          </Button>
        </>
      ) : null}
      {status !== "finished" ? (
        <Button
          variant="outline"
          onClick={() => run(`/api/admin/tournaments/${tournamentId}/actions`, { adminToken, action: "finish" }, "finish", "Tournament finished")}
          disabled={loading !== null}
        >
          {loading === "finish" ? "Finishing..." : "Finish Tournament"}
        </Button>
      ) : null}
    </div>
  );
}
