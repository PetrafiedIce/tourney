import { prisma } from "@/lib/prisma";
import { bracketInclude } from "@/lib/tournaments";

export async function getRunningTournaments() {
  return prisma.tournament.findMany({
    where: { status: "running" },
    include: bracketInclude,
    orderBy: [{ startedAt: "desc" }, { createdAt: "desc" }],
  });
}

export async function getTournamentPageData(id: string) {
  return prisma.tournament.findUnique({
    where: { id },
    include: bracketInclude,
  });
}
