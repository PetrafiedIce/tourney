export const LADDERS = [
  { id: "mace", label: "Mace" },
  { id: "sword", label: "Sword" },
  { id: "axe", label: "Axe" },
  { id: "uhc", label: "UHC" },
  { id: "pot", label: "Pot" },
  { id: "netheriteop", label: "NetheriteOP" },
  { id: "smp", label: "SMP" },
  { id: "diamondsmp", label: "DiamondSMP" },
  { id: "vanilla", label: "Vanilla" },
  { id: "cart", label: "Cart" },
  { id: "spearelytra", label: "Spear Elytra" },
  { id: "spearmace", label: "Spear Mace" },
  { id: "shieldlessuhc", label: "Shieldless UHC" },
] as const;

export const LADDER_IDS = new Set<string>(LADDERS.map((ladder) => ladder.id));

export const TOURNAMENT_STATUSES = {
  SETUP: "setup",
  RUNNING: "running",
  FINISHED: "finished",
} as const;

export const FLOWPVP_BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36";

export const PROFILE_CACHE_TTL_MS = 30_000;
export const PROFILE_RATE_LIMIT_MS = 10_000;
export const MATCH_CHECK_RATE_LIMIT_MS = 10_000;

export const API_ERROR_CODES = {
  ADMIN_TOKEN_INVALID: "admin_token_invalid",
  BAD_REQUEST: "bad_request",
  CLOUD_FLARE_BLOCKED: "cloudflare_blocked",
  MATCH_ALREADY_RESOLVED: "match_already_resolved",
  MATCH_RATE_LIMITED: "match_rate_limited",
  NOT_FOUND: "not_found",
  PARSER_FAILED: "parser_failed",
  TOURNAMENT_NOT_RUNNING: "tournament_not_running",
  UNKNOWN_USERNAMES: "unknown_usernames",
} as const;
