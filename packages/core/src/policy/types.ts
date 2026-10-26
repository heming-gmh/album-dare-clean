/**
 * PolicyAST v0.3 — Track A only.
 * Keep is the OR of has-person predicates.
 * A removal suggestion is possible only when the gate also passes.
 * Track B (free-form model parsing) is intentionally absent.
 */
export const POLICY_AST_VERSION = "0.3" as const;

export type PolicyAstVersion = typeof POLICY_AST_VERSION;
export type IntentTrack = "A";
export type MediaKind = "photo" | "video";
export type MediaScope = "photo" | "video" | "any";
export type CardPolarity = "keep" | "suggest_remove";

export interface PersonRef {
  /** Spelling from the template or card. */
  name: string;
  /** Set when FamilyRoster resolves this name to a ready or incomplete person. */
  rosterId?: string;
}

export interface HasPersonPredicate {
  op: "has_person";
  person: PersonRef;
}

export interface ScopeClause {
  media: MediaScope;
}

export interface GateThresholds {
  /** Removal suggestion requires P(has_family) < epsilon. */
  epsilon: number;
  /** Removal suggestion requires coverage >= tau. */
  tau: number;
}

export interface IntentCard {
  id: string;
  personName: string;
  polarity: CardPolarity;
}

export interface PolicyAST {
  version: PolicyAstVersion;
  track: IntentTrack;
  scope: ScopeClause;
  /** Videos are ordered first when this is true. It does not hide photos. */
  videoFirst: boolean;
  /** Keep = OR(has person_i). */
  keep: HasPersonPredicate[];
  /**
   * Absence of every deleteIfAbsent person is necessary before a removal
   * suggestion. Presence of a keep person is sufficient to keep.
   */
  deleteIfAbsent: HasPersonPredicate[];
  unresolvedPersons: string[];
  /**
   * False when any referenced person is missing or has fewer than 3 prototypes,
   * or when a clause could not be parsed. The gate must not emit delete_cand.
   */
  executableDelete: boolean;
  blockReason?: string;
  diagnostics: string[];
  thresholds: GateThresholds;
  sources: {
    templates: string[];
    cards: IntentCard[];
  };
}

export interface CompileInput {
  templates: string[];
  cards: IntentCard[];
  roster: import("../roster/familyRoster.js").FamilyRoster;
  thresholds?: Partial<GateThresholds>;
}
