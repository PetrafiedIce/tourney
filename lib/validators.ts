import { z } from "zod";

import { LADDER_IDS, TOURNAMENT_STATUSES } from "@/lib/constants";

const usernameRegex = /^[A-Za-z0-9_]{3,16}$/;

export const createTournamentSchema = z.object({
  name: z.string().trim().min(3).max(80),
  ladder: z
    .string()
    .trim()
    .transform((value) => value.toLowerCase())
    .refine((value) => LADDER_IDS.has(value), "Unsupported ladder"),
  usernames: z.string().optional(),
  adminToken: z
    .string()
    .trim()
    .transform((value) => value || undefined)
    .pipe(z.string().min(8).max(128).optional()),
});

export const registerPlayersSchema = z.object({
  usernames: z
    .array(z.string().trim().regex(usernameRegex, "Invalid FlowPvP username"))
    .min(2)
    .max(256),
});

export const startTournamentSchema = z.object({
  adminToken: z.string().trim().min(1),
  regenerate: z.boolean().optional().default(false),
});

export const adminOverrideSchema = z.object({
  adminToken: z.string().trim().min(1),
  winnerId: z.string().trim().min(1).nullable().optional(),
  note: z.string().trim().min(3).max(500),
});

export const adminTournamentActionSchema = z.object({
  adminToken: z.string().trim().min(1),
  action: z.enum(["regenerate", "finish"]),
});

export function normalizeUsernames(input: string) {
  return Array.from(
    new Set(
      input
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
    ),
  );
}

export function isTournamentRunning(status: string) {
  return status === TOURNAMENT_STATUSES.RUNNING;
}
