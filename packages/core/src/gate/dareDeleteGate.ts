import type { MediaEvidence } from "../evidence/observe.js";
import type { PolicyAST } from "../policy/types.js";

export type Bucket = "keep" | "uncertain" | "delete_cand" | "out_of_scope";

export type RuleId =
  | "out_of_scope"
  | "keep_person"
  | "roster_blocked"
  | "unknown_face"
  | "low_coverage"
  | "family_possible"
  | "delete_cand";

export interface GateDecision {
  mediaId: string;
  bucket: Bucket;
  rule: RuleId;
  reasons: string[];
  /** True only for a removal suggestion. Never means a delete already happened. */
  suggestsRemoval: boolean;
}

export interface ClassifiedMedia {
  evidence: MediaEvidence;
  decision: GateDecision;
}

export interface ScanResult {
  keep: ClassifiedMedia[];
  uncertain: ClassifiedMedia[];
  deleteCand: ClassifiedMedia[];
  skipped: ClassifiedMedia[];
}

function keepIds(policy: PolicyAST): Set<string> {
  const ids = new Set<string>();
  for (const predicate of policy.keep) {
    if (predicate.person.rosterId) ids.add(predicate.person.rosterId);
  }
  return ids;
}

function inScope(policy: PolicyAST, evidence: MediaEvidence): boolean {
  return policy.scope.media === "any" || policy.scope.media === evidence.kind;
}

function decision(evidence: MediaEvidence, bucket: Bucket, rule: RuleId, reasons: string[]): GateDecision {
  return {
    mediaId: evidence.mediaId,
    bucket,
    rule,
    reasons,
    suggestsRemoval: bucket === "delete_cand",
  };
}

/**
 * Conservative gate.
 * delete_cand only when the policy is executable AND
 * P(has_family) < ε AND coverage ≥ τ AND there is no unknown face AND the item is in scope
 * AND no cared-about person was recognized.
 * Anything short of that stays out of delete_cand.
 */
export function decide(policy: PolicyAST, evidence: MediaEvidence): GateDecision {
  if (!inScope(policy, evidence)) {
    return decision(evidence, "out_of_scope", "out_of_scope", ["不在这次整理范围里。"]);
  }

  const ids = keepIds(policy);
  for (const face of evidence.faces) {
    if (face.unknown || !face.rosterId || !face.displayName) continue;
    if (!ids.has(face.rosterId)) continue;
    if (face.probability < policy.thresholds.epsilon) continue;
    return decision(evidence, "keep", "keep_person", [
      `识别到在乎的人：${face.displayName}。留在我在乎的。`,
    ]);
  }

  if (!policy.executableDelete) {
    return decision(evidence, "uncertain", "roster_blocked", [
      policy.blockReason ?? "花名册还没建完，不会建议移出图库。",
    ]);
  }
  if (evidence.hasUnknownFace) {
    return decision(evidence, "uncertain", "unknown_face", [
      "有未识别的人脸，放在不确定里，不会建议移出。",
    ]);
  }
  if (evidence.coverage < policy.thresholds.tau) {
    return decision(evidence, "uncertain", "low_coverage", [
      "画面没有看全，放在不确定里，不会建议移出。",
    ]);
  }
  if (evidence.pHasFamily >= policy.thresholds.epsilon) {
    return decision(evidence, "uncertain", "family_possible", [
      "像是花名册里的人，但这次没有放进「在乎」。先放在不确定里。",
    ]);
  }

  const coverageText = `覆盖 ${Math.round(evidence.coverage * 100)}%`;
  const preview =
    evidence.kind === "video" && evidence.keyframes.length > 0
      ? `可先看 ${evidence.keyframes.length} 张关键帧。`
      : "";
  return decision(evidence, "delete_cand", "delete_cand", [
    `${coverageText}。没有在乎的人，也没有未识别人脸。建议移出图库。${preview}`,
  ]);
}

function compare(videoFirst: boolean, left: ClassifiedMedia, right: ClassifiedMedia): number {
  if (videoFirst && left.evidence.kind !== right.evidence.kind) {
    return left.evidence.kind === "video" ? -1 : 1;
  }
  if (left.evidence.mediaId < right.evidence.mediaId) return -1;
  if (left.evidence.mediaId > right.evidence.mediaId) return 1;
  return 0;
}

export function classifyAll(policy: PolicyAST, items: MediaEvidence[]): ScanResult {
  const keep: ClassifiedMedia[] = [];
  const uncertain: ClassifiedMedia[] = [];
  const deleteCand: ClassifiedMedia[] = [];
  const skipped: ClassifiedMedia[] = [];

  for (const evidence of items) {
    const gate = decide(policy, evidence);
    const row = { evidence, decision: gate };
    if (gate.bucket === "keep") keep.push(row);
    else if (gate.bucket === "uncertain") uncertain.push(row);
    else if (gate.bucket === "delete_cand") deleteCand.push(row);
    else skipped.push(row);
  }

  const order = (left: ClassifiedMedia, right: ClassifiedMedia): number => compare(policy.videoFirst, left, right);
  keep.sort(order);
  uncertain.sort(order);
  deleteCand.sort(order);
  skipped.sort(order);
  return { keep, uncertain, deleteCand, skipped };
}
