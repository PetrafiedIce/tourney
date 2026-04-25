import "dotenv/config";

import { prisma } from "@/lib/prisma";

async function main() {
  const existing = await prisma.tournament.count();
  if (existing > 0) {
    console.log("Database already has tournaments; skipping seed.");
    return;
  }

  const adminToken = process.env.ADMIN_DEFAULT_TOKEN?.trim() || "demo-admin-token";
  const tournament = await prisma.tournament.create({
    data: {
      name: "Demo FlowPvP Cup",
      ladder: "mace",
      status: "setup",
      adminToken,
    },
  });

  await prisma.player.createMany({
    data: [
      { tournamentId: tournament.id, username: "StevePvP", uuid: "11111111-1111-1111-1111-111111111111" },
      { tournamentId: tournament.id, username: "AlexClutch", uuid: "22222222-2222-2222-2222-222222222222" },
      { tournamentId: tournament.id, username: "TotemKing", uuid: "33333333-3333-3333-3333-333333333333" },
      { tournamentId: tournament.id, username: "AnchorMain", uuid: "44444444-4444-4444-4444-444444444444" },
    ],
  });

  console.log(`Seeded demo tournament ${tournament.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
