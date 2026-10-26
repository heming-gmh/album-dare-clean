import assert from "node:assert/strict";
import test from "node:test";
import { cosine, observeFixture } from "../evidence/observe.js";
import { createRoster } from "../roster/familyRoster.js";
import { DEMO_MEDIA_IDS } from "./fixture.js";
import { runDemoFixture, scanFixture } from "./runDemo.js";

test("closest of several prototypes wins", () => {
  const roster = createRoster([
    {
      id: "mom",
      displayName: "妈妈",
      prototypes: [
        { id: "m1", sampleRef: "fixture://roster/mom/1", embedding: [1, 0, 0, 0] },
        { id: "m2", sampleRef: "fixture://roster/mom/2", embedding: [0, 1, 0, 0] },
        { id: "m3", sampleRef: "fixture://roster/mom/3", embedding: [0, 0, 1, 0] },
      ],
    },
  ]);
  const evidence = observeFixture(roster, {
    mediaId: "x",
    kind: "photo",
    title: "样例",
    coverage: 1,
    capturedAt: "2026-01-01T00:00:00.000Z",
    keyframes: [],
    faces: [{ faceId: "f", embedding: [0, 0, 1, 0] }],
  });
  assert.equal(evidence.faces[0]?.unknown, false);
  assert.equal(evidence.faces[0]?.rosterId, "mom");
  assert.ok((evidence.faces[0]?.probability ?? 0) > 0.99);
  assert.ok(cosine([1, 0], [0, 1]) === 0);
});

test("incomplete prototypes do not count as family", () => {
  const roster = createRoster([
    {
      id: "mom",
      displayName: "妈妈",
      prototypes: [
        { id: "m1", sampleRef: "fixture://roster/mom/1", embedding: [1, 0, 0, 0] },
        { id: "m2", sampleRef: "fixture://roster/mom/2", embedding: [0.9, 0.1, 0, 0] },
      ],
    },
  ]);
  const evidence = observeFixture(roster, {
    mediaId: "x",
    kind: "video",
    title: "样例",
    coverage: 1,
    capturedAt: "2026-01-01T00:00:00.000Z",
    keyframes: [],
    faces: [{ faceId: "f", embedding: [1, 0, 0, 0] }],
  });
  assert.equal(evidence.hasUnknownFace, true);
  assert.equal(evidence.pHasFamily, 0);
});

test("DEMO_FIXTURE walks roster, intent, buckets, hold, and restore", () => {
  const run = runDemoFixture();
  assert.equal(run.mode, "DEMO_FIXTURE");
  assert.equal(run.roster.people.length, 3);
  assert.equal(run.policy.executableDelete, true);
  assert.deepEqual(
    run.scan.keep.map((row) => row.evidence.mediaId),
    ["vid-home-dad", "vid-mom-brief", "vid-mom-guest", "vid-park-mom", "photo-child"],
  );
  assert.deepEqual(
    run.scan.uncertain.map((row) => row.evidence.mediaId),
    ["vid-dark", "vid-street", "photo-unknown"],
  );
  assert.deepEqual(
    run.scan.deleteCand.map((row) => row.evidence.mediaId),
    ["vid-landscape", "photo-ceiling"],
  );
  const landscape = run.scan.deleteCand[0];
  assert.ok(landscape);
  assert.ok(landscape.evidence.keyframes.length >= 3);
  assert.match(landscape.decision.reasons[0] ?? "", /建议移出图库/);

  const restored = run.recycle.entries.find((entry) => entry.id === run.restoredId);
  assert.equal(restored?.status, "restored");
  assert.equal(restored?.mediaId, "vid-landscape");
  const stillHeld = run.recycle.entries.filter((entry) => entry.status === "held");
  assert.equal(stillHeld.length, 1);
  assert.equal(stillHeld[0]?.mediaId, "photo-ceiling");
});

test("naming someone who is not on the roster empties delete_cand", () => {
  const scanned = scanFixture({
    templates: ["保留有妈妈的"],
    cards: [{ id: "cousin", personName: "表姐", polarity: "suggest_remove" }],
  });
  assert.equal(scanned.policy.executableDelete, false);
  assert.equal(scanned.scan.deleteCand.length, 0);
  assert.ok(scanned.scan.keep.some((row) => row.evidence.mediaId === "vid-park-mom"));
});

test("demo ids stay stable for the Harmony fixture", () => {
  assert.deepEqual(DEMO_MEDIA_IDS, [
    "vid-park-mom",
    "vid-home-dad",
    "vid-landscape",
    "vid-street",
    "vid-dark",
    "vid-mom-brief",
    "vid-mom-guest",
    "photo-child",
    "photo-ceiling",
    "photo-unknown",
  ]);
});
