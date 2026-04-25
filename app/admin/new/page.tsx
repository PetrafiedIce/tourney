import { PageShell } from "@/components/page-shell";
import { TournamentForm } from "@/components/tournament-form";

export default function NewTournamentPage() {
  return (
    <PageShell
      eyebrow="Admin"
      title="Create a FlowPvP tournament"
      description="The app verifies each FlowPvP username, stores UUIDs, and can start a bracket that resolves round winners from scraped match history."
    >
      <TournamentForm />
    </PageShell>
  );
}
