import { classifyAll, type ScanResult } from "../gate/dareDeleteGate.js";
import { compileIntent } from "../policy/intentCompiler.js";
import type { IntentCard, PolicyAST } from "../policy/types.js";
import { emptyRecycleBin, hold, restore, type RecycleBin } from "../recycle/recycleBin.js";
import type { FamilyRoster } from "../roster/familyRoster.js";
import { demoEvidence, demoRoster } from "./fixture.js";

export const DEMO_FIXTURE = "DEMO_FIXTURE" as const;

export interface FixtureScan {
  mode: typeof DEMO_FIXTURE;
  roster: FamilyRoster;
  policy: PolicyAST;
  scan: ScanResult;
}

export interface DemoRun extends FixtureScan {
  recycle: RecycleBin;
  restoredId: string;
}

export interface FixtureScanInput {
  templates?: string[];
  cards?: IntentCard[];
  roster?: FamilyRoster;
}

const DEFAULT_TEMPLATE = "保留有妈妈的；保留有爸爸的；保留有小朋友的";

export function scanFixture(input: FixtureScanInput = {}): FixtureScan {
  const roster = input.roster ?? demoRoster();
  const policy = compileIntent({
    templates: input.templates ?? [DEFAULT_TEMPLATE],
    cards: input.cards ?? [],
    roster,
  });
  const scan = classifyAll(policy, demoEvidence(roster));
  return { mode: DEMO_FIXTURE, roster, policy, scan };
}

/**
 * Full demo path: roster → intent → three buckets → hold → restore one.
 * The hold is an explicit confirmation inside the fixture, not a silent delete.
 */
export function runDemoFixture(now: Date = new Date("2026-03-01T08:00:00.000Z")): DemoRun {
  const scanned = scanFixture();
  const requests = scanned.scan.deleteCand.map((row) => ({
    mediaId: row.evidence.mediaId,
    title: row.evidence.title,
    kind: row.evidence.kind,
    userConfirmed: true,
  }));
  const held = hold(emptyRecycleBin(), requests, now);
  const first = held.entries[0];
  if (!first) {
    return { ...scanned, recycle: held, restoredId: "" };
  }
  const recycle = restore(held, first.id, now);
  return { ...scanned, recycle, restoredId: first.id };
}
