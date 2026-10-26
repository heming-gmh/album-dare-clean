import { findPerson, type FamilyRoster } from "../roster/familyRoster.js";
import {
  POLICY_AST_VERSION,
  type CardPolarity,
  type CompileInput,
  type GateThresholds,
  type HasPersonPredicate,
  type IntentCard,
  type MediaScope,
  type PersonRef,
  type PolicyAST,
} from "./types.js";

export const DEFAULT_EPSILON = 0.2;
export const DEFAULT_TAU = 0.85;

interface DraftPerson {
  name: string;
  inKeep: boolean;
  inAbsence: boolean;
}

interface KeepClause {
  name: string;
  kind?: "photo" | "video";
}

function clean(value: string): string {
  return value.replace(/\u3000/g, " ").trim();
}

export function splitClauses(template: string): string[] {
  const parts = template.split(/[；;\n，,]+/);
  const clauses: string[] = [];
  for (const part of parts) {
    const clause = clean(part);
    if (clause.length > 0) clauses.push(clause);
  }
  return clauses;
}

function validName(name: string): boolean {
  if (name.length < 1 || name.length > 12) return false;
  return !/[的\s；;，,]/.test(name);
}

function parseKeep(clause: string): KeepClause | undefined {
  const prefix = "保留有";
  if (!clause.startsWith(prefix)) return undefined;
  let rest = clause.slice(prefix.length);
  let kind: "photo" | "video" | undefined;
  if (rest.endsWith("的视频")) {
    kind = "video";
    rest = rest.slice(0, -"的视频".length);
  } else if (rest.endsWith("的照片")) {
    kind = "photo";
    rest = rest.slice(0, -"的照片".length);
  } else if (rest.endsWith("的")) {
    rest = rest.slice(0, -1);
  } else {
    return undefined;
  }
  if (!validName(rest)) return undefined;
  return kind ? { name: rest, kind } : { name: rest };
}

function parseAbsence(clause: string): string | undefined {
  const prefix = "没有";
  if (!clause.startsWith(prefix)) return undefined;
  const rest = clause.slice(prefix.length);
  const suffixes = ["的可以建议移出", "的可建议移出", "可以建议移出", "可建议移出", "的建议移出", "建议移出"];
  for (const suffix of suffixes) {
    if (rest.endsWith(suffix) && rest.length > suffix.length) {
      const name = rest.slice(0, rest.length - suffix.length);
      if (validName(name)) return name;
    }
  }
  return undefined;
}

function personRef(roster: FamilyRoster, name: string): { ref: PersonRef; ready: boolean; known: boolean } {
  const found = findPerson(roster, name);
  if (!found) return { ref: { name }, ready: false, known: false };
  if (found.status !== "ready") return { ref: { name, rosterId: found.id }, ready: false, known: true };
  return { ref: { name, rosterId: found.id }, ready: true, known: true };
}

function predicate(ref: PersonRef): HasPersonPredicate {
  return { op: "has_person", person: { ...ref } };
}

function thresholdsOf(input: Partial<GateThresholds> | undefined, diagnostics: string[]): GateThresholds {
  const thresholds = {
    epsilon: input?.epsilon ?? DEFAULT_EPSILON,
    tau: input?.tau ?? DEFAULT_TAU,
  };
  if (!(thresholds.epsilon > 0 && thresholds.epsilon < 1)) {
    diagnostics.push("ε 必须在 0 和 1 之间");
  }
  if (!(thresholds.tau > 0 && thresholds.tau <= 1)) {
    diagnostics.push("τ 必须在 0 和 1 之间");
  }
  return thresholds;
}

function isPolarity(value: string): value is CardPolarity {
  return value === "keep" || value === "suggest_remove";
}

/**
 * Track A: template sentences and person/polarity cards merge into PolicyAST v0.3.
 * An unrecognized sentence or an unfinished person blocks removal suggestions.
 * A keep mention still protects that person when they are recognized.
 */
export function compileIntent(input: CompileInput): PolicyAST {
  const diagnostics: string[] = [];
  const drafts = new Map<string, DraftPerson>();
  let media: MediaScope = "any";
  let scopeSet = false;
  let videoFirst = true;

  const setScope = (next: MediaScope): void => {
    if (!scopeSet) {
      media = next;
      scopeSet = true;
      return;
    }
    if (media !== next) diagnostics.push("整理范围互相矛盾");
  };

  const mark = (name: string, inKeep: boolean, inAbsence: boolean): void => {
    const key = name.trim().toLowerCase();
    const current = drafts.get(key) ?? { name: name.trim(), inKeep: false, inAbsence: false };
    current.inKeep = current.inKeep || inKeep;
    current.inAbsence = current.inAbsence || inAbsence;
    drafts.set(key, current);
  };

  for (const template of input.templates) {
    for (const clause of splitClauses(template)) {
      if (clause === "只看视频") {
        setScope("video");
        continue;
      }
      if (clause === "只看照片") {
        setScope("photo");
        continue;
      }
      if (clause === "照片和视频" || clause === "视频和照片") {
        setScope("any");
        continue;
      }
      if (clause === "视频优先") {
        videoFirst = true;
        continue;
      }
      const keep = parseKeep(clause);
      if (keep) {
        if (keep.kind) setScope(keep.kind);
        mark(keep.name, true, false);
        continue;
      }
      const absenceName = parseAbsence(clause);
      if (absenceName) {
        mark(absenceName, true, true);
        continue;
      }
      diagnostics.push(`没看懂这一句：${clause}`);
    }
  }

  for (const card of input.cards) {
    const name = card.personName.trim();
    if (!validName(name)) {
      diagnostics.push("有一张卡片没有可用的人物");
      continue;
    }
    if (!isPolarity(card.polarity)) {
      diagnostics.push("卡片极性无法识别");
      continue;
    }
    if (card.polarity === "keep") mark(name, true, false);
    else mark(name, true, true);
  }

  const listed = [...drafts.values()];
  // Removal suggestions are the complement of Keep. Every cared-about person
  // is protected when present, and is also part of the absence check.
  for (const person of listed) {
    if (person.inKeep) person.inAbsence = true;
  }
  if (listed.length === 0) diagnostics.push("还没有指定在乎的人");

  const unresolved: string[] = [];
  const keep: HasPersonPredicate[] = [];
  const deleteIfAbsent: HasPersonPredicate[] = [];
  for (const person of listed) {
    const resolved = personRef(input.roster, person.name);
    if (!resolved.ready) unresolved.push(person.name);
    if (person.inKeep) keep.push(predicate(resolved.ref));
    if (person.inAbsence) deleteIfAbsent.push(predicate(resolved.ref));
  }

  const thresholds = thresholdsOf(input.thresholds, diagnostics);
  const executableDelete =
    unresolved.length === 0 && diagnostics.length === 0 && listed.length > 0 && deleteIfAbsent.length > 0;

  let blockReason: string | undefined;
  if (!executableDelete) {
    if (unresolved.length > 0) {
      blockReason = `还有人没建档完成：${unresolved.join("、")}。本次不会建议移出图库。`;
    } else if (diagnostics.length > 0) {
      blockReason = diagnostics[0];
    } else {
      blockReason = "本次不会建议移出图库。";
    }
  }

  const policy: PolicyAST = {
    version: POLICY_AST_VERSION,
    track: "A",
    scope: { media },
    videoFirst,
    keep,
    deleteIfAbsent,
    unresolvedPersons: unresolved,
    executableDelete,
    diagnostics,
    thresholds,
    sources: {
      templates: [...input.templates],
      cards: input.cards.map((card) => ({ ...card })),
    },
  };
  if (blockReason) policy.blockReason = blockReason;
  return policy;
}

export type { IntentCard };
