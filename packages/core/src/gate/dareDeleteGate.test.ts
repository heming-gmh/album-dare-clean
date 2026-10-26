import assert from "node:assert/strict";
import test from "node:test";
import { demoEvidence, demoRoster } from "../demo/fixture.js";
import type { MediaEvidence } from "../evidence/observe.js";
import { compileIntent } from "../policy/intentCompiler.js";
import { classifyAll, decide } from "./dareDeleteGate.js";

const roster = demoRoster();

function policyFor(template: string) {
  return compileIntent({ templates: [template], cards: [], roster });
}

function item(overrides: Partial<MediaEvidence> & Pick<MediaEvidence, "mediaId">): MediaEvidence {
  return {
    kind: "video",
    title: overrides.mediaId,
    coverage: 0.99,
    faces: [],
    pHasFamily: 0,
    hasUnknownFace: false,
    keyframes: [
      { id: "k1", label: "关键帧 1", tone: "#ccc" },
      { id: "k2", label: "关键帧 2", tone: "#ddd" },
      { id: "k3", label: "关键帧 3", tone: "#eee" },
    ],
    capturedAt: "2026-02-01T00:00:00.000Z",
    ...overrides,
  };
}

const ready = policyFor("保留有妈妈的；保留有爸爸的；保留有小朋友的");

test("unknown face never enters delete_cand", () => {
  const gate = decide(
    ready,
    item({
      mediaId: "unknown",
      hasUnknownFace: true,
      pHasFamily: 0,
      faces: [{ faceId: "f", probability: 0.1, unknown: true }],
    }),
  );
  assert.equal(gate.bucket, "uncertain");
  assert.equal(gate.rule, "unknown_face");
  assert.equal(gate.suggestsRemoval, false);
});

test("low coverage never enters delete_cand", () => {
  const gate = decide(ready, item({ mediaId: "dark", coverage: 0.4 }));
  assert.equal(gate.bucket, "uncertain");
  assert.equal(gate.rule, "low_coverage");
});

test("recognized cared person stays in keep even with low coverage or another unknown face", () => {
  const brief = decide(
    ready,
    item({
      mediaId: "brief",
      coverage: 0.2,
      pHasFamily: 0.96,
      faces: [{ faceId: "f", rosterId: "mom", displayName: "妈妈", probability: 0.96, unknown: false }],
    }),
  );
  assert.equal(brief.bucket, "keep");
  const guest = decide(
    ready,
    item({
      mediaId: "guest",
      hasUnknownFace: true,
      pHasFamily: 0.97,
      faces: [
        { faceId: "a", rosterId: "mom", displayName: "妈妈", probability: 0.97, unknown: false },
        { faceId: "b", probability: 0, unknown: true },
      ],
    }),
  );
  assert.equal(guest.bucket, "keep");
  assert.equal(guest.rule, "keep_person");
});

test("high coverage and no family can be a removal suggestion", () => {
  const gate = decide(ready, item({ mediaId: "sky" }));
  assert.equal(gate.bucket, "delete_cand");
  assert.equal(gate.suggestsRemoval, true);
  assert.match(gate.reasons[0] ?? "", /建议移出图库/);
  assert.match(gate.reasons[0] ?? "", /关键帧/);
});

test("family who is not in the keep set stays uncertain", () => {
  const onlyMom = policyFor("保留有妈妈的");
  const gate = decide(
    onlyMom,
    item({
      mediaId: "dad-only",
      pHasFamily: 0.95,
      faces: [{ faceId: "f", rosterId: "dad", displayName: "爸爸", probability: 0.95, unknown: false }],
    }),
  );
  assert.equal(gate.bucket, "uncertain");
  assert.equal(gate.rule, "family_possible");
});

test("unresolved roster person produces no delete_cand", () => {
  const blocked = policyFor("保留有表姐的；保留有妈妈的");
  assert.equal(blocked.executableDelete, false);
  const scan = classifyAll(blocked, [
    item({ mediaId: "empty" }),
    item({
      mediaId: "mom",
      pHasFamily: 0.99,
      faces: [{ faceId: "f", rosterId: "mom", displayName: "妈妈", probability: 0.99, unknown: false }],
    }),
    item({
      mediaId: "stranger",
      hasUnknownFace: true,
      faces: [{ faceId: "f", probability: 0.2, unknown: true }],
    }),
  ]);
  assert.equal(scan.deleteCand.length, 0);
  assert.equal(scan.keep.map((row) => row.evidence.mediaId).join(","), "mom");
  assert.equal(scan.uncertain.length, 2);
});

test("aggressive unparsed text cannot put a landscape into delete_cand", () => {
  const policy = policyFor("全部删掉");
  const scan = classifyAll(policy, [item({ mediaId: "sky" })]);
  assert.equal(scan.deleteCand.length, 0);
  assert.equal(scan.uncertain[0]?.decision.rule, "roster_blocked");
});

test("photos are skipped when the scope is video, and are not removal candidates", () => {
  const videos = policyFor("保留有妈妈的视频");
  const scan = classifyAll(videos, [
    item({ mediaId: "photo-empty", kind: "photo", keyframes: [] }),
    item({ mediaId: "vid-empty" }),
  ]);
  assert.deepEqual(
    scan.skipped.map((row) => row.evidence.mediaId),
    ["photo-empty"],
  );
  assert.deepEqual(
    scan.deleteCand.map((row) => row.evidence.mediaId),
    ["vid-empty"],
  );
});

test("fixture scan never places unknown or low coverage into delete_cand", () => {
  const scan = classifyAll(ready, demoEvidence(roster));
  for (const row of scan.deleteCand) {
    assert.equal(row.evidence.hasUnknownFace, false);
    assert.ok(row.evidence.coverage >= ready.thresholds.tau);
    assert.ok(row.evidence.pHasFamily < ready.thresholds.epsilon);
    assert.equal(row.decision.suggestsRemoval, true);
  }
  const uncertainIds = scan.uncertain.map((row) => row.evidence.mediaId);
  assert.ok(uncertainIds.includes("vid-street"));
  assert.ok(uncertainIds.includes("vid-dark"));
  assert.ok(uncertainIds.includes("photo-unknown"));
  assert.ok(!uncertainIds.includes("vid-landscape"));
});
