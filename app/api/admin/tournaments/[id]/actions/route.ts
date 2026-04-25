import { NextResponse } from "next/server";

import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { generateInitialBracket } from "@/lib/tournaments";
import { adminTournamentActionSchema } from "@/lib/validators";

function jsonError(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json({ code: error.code, message: error.message }, { status: error.status });
  }

  console.error(error);
  return NextResponse.json({ code: "internal_error", message: "Unexpected server error." }, { status: 500 });
}

export async function POST(request: Request, ctx: RouteContext<"/api/admin/tournaments/[id]/actions">) {
  try {
    const { id } = await ctx.params;
    const payload = adminTournamentActionSchema.parse(await request.json());
    const tournament = await prisma.tournament.findUnique({ where: { id } });
    if (!tournament) {
      throw new AppError("not_found", "Tournament not found.", 404);
    }

    if (payload.adminToken !== tournament.adminToken) {
      throw new AppError("admin_token_invalid", "Admin token is invalid.", 403);
    }

    if (payload.action === "regenerate") {
      await generateInitialBracket(id, true);
      return NextResponse.json({ message: "Bracket regenerated." });
    }

    await prisma.tournament.update({ where: { id }, data: { status: "finished" } });
    return NextResponse.json({ message: "Tournament marked as finished." });
  } catch (error) {
    return jsonError(error);
  }
}
