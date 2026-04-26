import Link from "next/link";

import { Bracket } from "@/components/bracket";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getRunningTournaments } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const tournaments = await getRunningTournaments().catch(() => []);

  return (
    <PageShell
      eyebrow="Public view"
      title="Run FlowPvP tournaments without trusting player reports"
      description="Create a single-elimination bracket, let players click once they finish, and the winner is detected from FlowPvP profile data server-side."
      actions={
        <Link href="/admin/new">
          <Button>Create tournament</Button>
        </Link>
      }
    >
      <div className="grid gap-6">
        {tournaments.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No live tournaments yet</CardTitle>
              <CardDescription>Create one from the admin page to get started.</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          tournaments.map((tournament) => (
            <Card key={tournament.id} className="overflow-hidden">
              <CardHeader className="border-b border-zinc-800">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>{tournament.name}</CardTitle>
                    <CardDescription>
                      {tournament.players.length} players • {tournament.ladder} ladder
                    </CardDescription>
                  </div>
                  <Link href={`/t/${tournament.id}`}>
                    <Button variant="secondary">Open bracket</Button>
                  </Link>
                </div>
              </CardHeader>
              <div className="p-6 pt-6">
                <Bracket tournament={tournament} publicMode />
              </div>
            </Card>
          ))
        )}
      </div>
    </PageShell>
  );
}
