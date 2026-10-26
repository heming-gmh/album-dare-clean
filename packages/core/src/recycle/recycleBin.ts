import type { MediaKind } from "../evidence/observe.js";

/** App-level hold. There is no midnight job and no system-library delete here. */
export const MIN_HOLD_DAYS = 30;
export const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type RecycleStatus = "held" | "restored";

export interface RecycleEntry {
  id: string;
  mediaId: string;
  title: string;
  kind: MediaKind;
  heldAt: string;
  /** Earliest time a later explicit release could be offered. Not a scheduler. */
  earliestReleaseAt: string;
  restoredAt?: string;
  status: RecycleStatus;
}

export interface RecycleBin {
  entries: RecycleEntry[];
}

export interface HoldRequest {
  mediaId: string;
  title: string;
  kind: MediaKind;
  /** Required. The gate's suggestion is not confirmation. */
  userConfirmed: boolean;
}

export class RecycleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RecycleError";
  }
}

export function emptyRecycleBin(): RecycleBin {
  return { entries: [] };
}

export function hold(bin: RecycleBin, requests: HoldRequest[], now: Date): RecycleBin {
  for (const request of requests) {
    if (!request.userConfirmed) {
      throw new RecycleError("放进回收站必须经过明确确认");
    }
  }

  const entries = bin.entries.map((entry) => ({ ...entry }));
  for (const request of requests) {
    const already = entries.some((entry) => entry.mediaId === request.mediaId && entry.status === "held");
    if (already) continue;
    const heldAt = now.toISOString();
    const earliest = new Date(now.getTime() + MIN_HOLD_DAYS * MS_PER_DAY);
    entries.push({
      id: `hold:${request.mediaId}:${heldAt}`,
      mediaId: request.mediaId,
      title: request.title,
      kind: request.kind,
      heldAt,
      earliestReleaseAt: earliest.toISOString(),
      status: "held",
    });
  }
  return { entries };
}

export function restore(bin: RecycleBin, entryId: string, now: Date): RecycleBin {
  let found = false;
  const entries = bin.entries.map((entry) => {
    if (entry.id !== entryId) return { ...entry };
    found = true;
    if (entry.status === "restored") return { ...entry };
    return { ...entry, status: "restored" as const, restoredAt: now.toISOString() };
  });
  if (!found) throw new RecycleError("回收站里没有这项");
  return { entries };
}

export function holdWindowElapsed(entry: RecycleEntry, now: Date): boolean {
  return now.getTime() - Date.parse(entry.heldAt) >= MIN_HOLD_DAYS * MS_PER_DAY;
}

/**
 * Safety latch for a future explicit purge. It never removes an entry.
 * Before 30 days, or without a new confirmation, it throws.
 */
export function assertReleaseAllowed(entry: RecycleEntry, now: Date, userConfirmed: boolean): void {
  if (!userConfirmed) throw new RecycleError("清除必须再次确认");
  if (entry.status !== "held") throw new RecycleError("已经恢复的项目不能清除");
  if (!holdWindowElapsed(entry, now)) throw new RecycleError("未满 30 天，不能清除");
}

export function heldEntries(bin: RecycleBin): RecycleEntry[] {
  return bin.entries.filter((entry) => entry.status === "held");
}
