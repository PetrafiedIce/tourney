import cloudscraper from "cloudscraper";

import {
  API_ERROR_CODES,
  FLOWPVP_BROWSER_USER_AGENT,
  PROFILE_CACHE_TTL_MS,
  PROFILE_RATE_LIMIT_MS,
} from "@/lib/constants";
import { AppError } from "@/lib/errors";

export type FlowPvPRecentMatch = {
  _id: string;
  winningPlayers: string[];
  losingPlayers: string[];
  endedAt: number;
  ladder: {
    _id: string;
    displayName: string;
  };
  postMatchPlayers?: Record<string, { lastUsername?: string }>;
};

export type FlowPvPProfile = {
  player: {
    uniqueId: string;
    username: string;
  };
  recentMatches: FlowPvPRecentMatch[];
};

const profileCache = new Map<string, { expiresAt: number; value: FlowPvPProfile }>();
const rateLimitMap = new Map<string, number>();

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function findRecentMatchesPayload(value: unknown): FlowPvPProfile | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  if (
    "recentMatches" in value &&
    "player" in value &&
    Array.isArray((value as { recentMatches?: unknown }).recentMatches)
  ) {
    return value as FlowPvPProfile;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findRecentMatchesPayload(item);
      if (found) {
        return found;
      }
    }

    return null;
  }

  for (const nested of Object.values(value as Record<string, unknown>)) {
    const found = findRecentMatchesPayload(nested);
    if (found) {
      return found;
    }
  }

  return null;
}

function extractBalancedJsonObject(input: string, startIndex: number) {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = startIndex; index < input.length; index += 1) {
    const char = input[index];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === '"') {
        inString = false;
      }

      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return input.slice(startIndex, index + 1);
      }
    }
  }

  return null;
}

function extractRecentMatchesFromRawHtml(html: string) {
  const recentMatchesIndex = html.indexOf('\\"recentMatches\\"');
  if (recentMatchesIndex === -1) {
    return null;
  }

  const objectStart = html.lastIndexOf('{\\"player\\":', recentMatchesIndex);
  if (objectStart === -1) {
    return null;
  }

  const rawObject = extractBalancedJsonObject(html, objectStart);
  if (!rawObject) {
    return null;
  }

  try {
    const decoded = JSON.parse(`"${rawObject}"`) as string;
    const payload = JSON.parse(decoded) as unknown;
    return findRecentMatchesPayload(payload);
  } catch {
    return null;
  }
}

export function extractRecentMatches(html: string) {
  const re = /self\.__next_f\.push\(\[1,\s*"([\s\S]+?)"\]\)/g;

  for (const match of html.matchAll(re)) {
    try {
      const raw = JSON.parse(`"${match[1]}"`) as string;
      if (!raw.includes('"recentMatches"')) {
        continue;
      }

      const jsonStr = raw.replace(/^[0-9a-f]+:/, "");
      const payload = JSON.parse(jsonStr) as unknown;
      const extracted = findRecentMatchesPayload(payload);
      if (extracted) {
        return extracted;
      }
    } catch {
      continue;
    }
  }

  const fallbackPayload = extractRecentMatchesFromRawHtml(html);
  if (fallbackPayload) {
    return fallbackPayload;
  }

  throw new AppError(
    API_ERROR_CODES.PARSER_FAILED,
    "FlowPvP changed its HTML format and recent matches could not be parsed.",
    502,
  );
}

async function fetchWithBrowserHeaders(url: string) {
  return fetch(url, {
    headers: {
      "user-agent": FLOWPVP_BROWSER_USER_AGENT,
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "accept-language": "en-US,en;q=0.9",
      pragma: "no-cache",
      "cache-control": "no-cache",
    },
    cache: "no-store",
  });
}

async function fetchViaCloudscraper(url: string) {
  return (await cloudscraper({
    uri: url,
    method: "GET",
    headers: {
      "user-agent": FLOWPVP_BROWSER_USER_AGENT,
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "accept-language": "en-US,en;q=0.9",
    },
  })) as string;
}

async function getProfileHtml(username: string) {
  const url = `https://flowpvp.gg/user/${encodeURIComponent(username)}`;
  const response = await fetchWithBrowserHeaders(url);

  if (response.ok) {
    return response.text();
  }

  if (response.status === 403 || response.status === 503) {
    try {
      return await fetchViaCloudscraper(url);
    } catch (error) {
      throw new AppError(
        API_ERROR_CODES.CLOUD_FLARE_BLOCKED,
        "FlowPvP blocked the profile request. Please try again in a few seconds or use an admin override.",
        503,
        error,
      );
    }
  }

  if (response.status === 404) {
    throw new AppError(API_ERROR_CODES.NOT_FOUND, `FlowPvP user ${username} does not exist.`, 404);
  }

  throw new AppError(
    API_ERROR_CODES.BAD_REQUEST,
    `Failed to fetch FlowPvP profile for ${username} (${response.status}).`,
    502,
  );
}

export async function getRecentMatches(username: string) {
  const normalized = username.trim();
  const cached = profileCache.get(normalized);
  const now = Date.now();

  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const lastAttempt = rateLimitMap.get(normalized) ?? 0;
  const waitTime = PROFILE_RATE_LIMIT_MS - (now - lastAttempt);
  if (waitTime > 0) {
    await sleep(waitTime);
  }

  rateLimitMap.set(normalized, Date.now());
  const html = await getProfileHtml(normalized);
  const profile = extractRecentMatches(html);

  profileCache.set(normalized, {
    value: profile,
    expiresAt: Date.now() + PROFILE_CACHE_TTL_MS,
  });

  return profile;
}

export async function resolveFlowPvPIdentity(username: string) {
  let profile: FlowPvPProfile;

  try {
    profile = await getRecentMatches(username);
  } catch (error) {
    if (error instanceof AppError && error.code === API_ERROR_CODES.PARSER_FAILED) {
      throw new AppError(
        error.code,
        `FlowPvP parsing failed for username ${username}.`,
        error.status,
        { username },
      );
    }

    throw error;
  }

  if (!profile.player.uniqueId) {
    throw new AppError(API_ERROR_CODES.NOT_FOUND, `Could not resolve UUID for ${username}.`, 404);
  }

  return {
    username: profile.player.username,
    uuid: profile.player.uniqueId,
  };
}
