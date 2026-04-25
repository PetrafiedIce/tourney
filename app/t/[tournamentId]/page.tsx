import { notFound } from "next/navigation";

import { Bracket } from "@/components/bracket";
import { PageShell } from "@/components/page-shell";
import { getTournamentPageData } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function TournamentPage(props: PageProps<"/t/[tournamentId]">) {
  const { tournamentId } = await props.params;
  const tournament = await getTournamentPageData(tournamentId);

  if (!tournament) {
    notFound();
  }

  return (
    <PageShell
      eyebrow="Public bracket"
      title={tournament.name}
      description="Anyone can click the match button, but only FlowPvP result data decides who advances."
    >
      <Bracket tournament={tournament} publicMode />
    </PageShell>
  );
}
