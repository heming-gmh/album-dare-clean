export { DEFAULT_EPSILON, DEFAULT_TAU, compileIntent, splitClauses } from "./policy/intentCompiler.js";
export { POLICY_AST_VERSION } from "./policy/types.js";
export type {
  CardPolarity,
  CompileInput,
  GateThresholds,
  HasPersonPredicate,
  IntentCard,
  MediaScope,
  PersonRef,
  PolicyAST,
  PolicyAstVersion,
} from "./policy/types.js";

export {
  MIN_PROTOTYPES,
  RosterError,
  assertFixtureRef,
  createRoster,
  findPerson,
  normalizeName,
  readyPeople,
} from "./roster/familyRoster.js";
export type { FamilyRoster, NewRosterPerson, PrototypeStub, RosterPerson, RosterStatus } from "./roster/familyRoster.js";

export { MATCH_FLOOR, cosine, observeFixture, personIsReady } from "./evidence/observe.js";
export type { FaceEvidence, FixtureFace, FixtureMedia, Keyframe, MediaEvidence, MediaKind } from "./evidence/observe.js";

export { classifyAll, decide } from "./gate/dareDeleteGate.js";
export type { Bucket, ClassifiedMedia, GateDecision, RuleId, ScanResult } from "./gate/dareDeleteGate.js";

export {
  MIN_HOLD_DAYS,
  MS_PER_DAY,
  RecycleError,
  assertReleaseAllowed,
  emptyRecycleBin,
  heldEntries,
  hold,
  holdWindowElapsed,
  restore,
} from "./recycle/recycleBin.js";
export type { HoldRequest, RecycleBin, RecycleEntry, RecycleStatus } from "./recycle/recycleBin.js";

export { DEMO_MEDIA, DEMO_MEDIA_IDS, demoEvidence, demoRoster } from "./demo/fixture.js";
export { DEMO_FIXTURE, runDemoFixture, scanFixture } from "./demo/runDemo.js";
export type { DemoRun, FixtureScan, FixtureScanInput } from "./demo/runDemo.js";
