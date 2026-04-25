import { notFound } from "next/navigation";

import { AdminTournamentActions } from "@/components/admin-actions";
import { Bracket } from "@/components/bracket";
import { PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getTournamentPageData } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AdminTournamentPage(props: PageProps<"/admin/t/[tournamentId]">) {
  const { tournamentId } = await props.params;
  const searchParams = await props.searchParams;
  const token = searchParams.token;
  const adminToken = Array.isArray(token) ? token[0] : token;
  const tournament = await getTournamentPageData(tournamentId);

  if (!tournament) {
    notFound();
  }

  const authorized = Boolean(adminToken && adminToken === tournament.adminToken);

  return (
    <PageShell
      eyebrow="Admin bracket"
      title={tournament.name}
      description={authorized ? "You can start the event, regenerate pre-start seeding, and manually override or undo match results." : "Admin token missing or invalid."}
      actions={
        authorized ? <AdminTournamentActions tournamentId={tournament.id} adminToken={tournament.adminToken} status={tournament.status} /> : null
      }
    >
      {!authorized ? (
        <Card>
          <CardHeader>
            <CardTitle>Admin token required</CardTitle>
            <CardDescription>Open this page with ?token=&lt;adminToken&gt; to unlock admin actions.</CardDescription>
          </CardHeader>
        </Card>
      ) : null}
      <div className="mb-6 flex flex-wrap gap-3">
        <Badge>Token auth enabled</Badge>
        <Badge>{tournament.status}</Badge>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Bracket</CardTitle>
          <CardDescription>Use manual controls only if FlowPvP scraping fails or a result needs correction.</CardDescription>
        </CardHeader>
        <CardContent>
          <Bracket tournament={tournament} publicMode={!authorized} adminToken={authorized ? tournament.adminToken : undefined} />
        </CardContent>
      </Card>
    </PageShell>
  );
}
