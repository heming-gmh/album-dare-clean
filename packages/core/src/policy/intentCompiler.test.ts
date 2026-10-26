import assert from "node:assert/strict";
import test from "node:test";
import { createRoster } from "../roster/familyRoster.js";
import { demoRoster } from "../demo/fixture.js";
import { compileIntent } from "./intentCompiler.js";

const roster = demoRoster();

test("template compiles to PolicyAST v0.3 and keeps named people", () => {
  const policy = compileIntent({
    templates: ["保留有妈妈的；保留有爸爸的；只看视频"],
    cards: [],
    roster,
  });
  assert.equal(policy.version, "0.3");
  assert.equal(policy.track, "A");
  assert.equal(policy.scope.media, "video");
  assert.equal(policy.executableDelete, true);
  assert.deepEqual(
    policy.keep.map((item) => item.person.rosterId),
    ["mom", "dad"],
  );
  assert.equal(policy.thresholds.epsilon, 0.2);
  assert.equal(policy.thresholds.tau, 0.85);
  assert.equal(policy.videoFirst, true);
});

test("alias in a template resolves to the roster id", () => {
  const policy = compileIntent({
    templates: ["保留有母亲的照片"],
    cards: [],
    roster,
  });
  assert.equal(policy.executableDelete, true);
  assert.equal(policy.scope.media, "photo");
  assert.equal(policy.keep[0]?.person.rosterId, "mom");
  assert.equal(policy.keep[0]?.person.name, "母亲");
});

test("absence sentence protects the person when present", () => {
  const policy = compileIntent({
    templates: ["没有妈妈的可以建议移出"],
    cards: [],
    roster,
  });
  assert.equal(policy.executableDelete, true);
  assert.equal(policy.keep[0]?.person.rosterId, "mom");
  assert.equal(policy.deleteIfAbsent[0]?.person.rosterId, "mom");
});

test("cards merge with templates", () => {
  const policy = compileIntent({
    templates: ["保留有妈妈的"],
    cards: [
      { id: "c-dad", personName: "爸爸", polarity: "keep" },
      { id: "c-child", personName: "小朋友", polarity: "suggest_remove" },
    ],
    roster,
  });
  assert.equal(policy.executableDelete, true);
  assert.deepEqual(
    policy.keep.map((item) => item.person.name),
    ["妈妈", "爸爸", "小朋友"],
  );
  assert.deepEqual(
    policy.deleteIfAbsent.map((item) => item.person.name),
    ["妈妈", "爸爸", "小朋友"],
  );
  assert.equal(policy.sources.cards.length, 2);
});

test("unresolved person blocks executable delete_cand", () => {
  const policy = compileIntent({
    templates: ["保留有表姐的；保留有妈妈的"],
    cards: [],
    roster,
  });
  assert.equal(policy.executableDelete, false);
  assert.deepEqual(policy.unresolvedPersons, ["表姐"]);
  assert.match(policy.blockReason ?? "", /表姐/);
  assert.equal(policy.keep[1]?.person.rosterId, "mom");
});

test("fewer than three prototypes is unresolved for deletion", () => {
  const thin = createRoster([
    {
      id: "mom",
      displayName: "妈妈",
      prototypes: [
        { id: "a", sampleRef: "fixture://roster/mom/1", embedding: [1, 0] },
        { id: "b", sampleRef: "fixture://roster/mom/2", embedding: [1, 0] },
      ],
    },
  ]);
  const policy = compileIntent({
    templates: ["保留有妈妈的"],
    cards: [],
    roster: thin,
  });
  assert.equal(policy.executableDelete, false);
  assert.deepEqual(policy.unresolvedPersons, ["妈妈"]);
});

test("an unrecognized sentence cannot become a delete-all policy", () => {
  const policy = compileIntent({
    templates: ["全部删掉"],
    cards: [],
    roster,
  });
  assert.equal(policy.executableDelete, false);
  assert.match(policy.diagnostics[0] ?? "", /没看懂/);
});

test("a valid clause plus an unknown clause still blocks removal", () => {
  const policy = compileIntent({
    templates: ["保留有妈妈的；把剩下的都清掉"],
    cards: [],
    roster,
  });
  assert.equal(policy.executableDelete, false);
  assert.equal(policy.keep[0]?.person.rosterId, "mom");
});

test("contradictory scope is not executable", () => {
  const policy = compileIntent({
    templates: ["保留有妈妈的视频；保留有爸爸的照片"],
    cards: [],
    roster,
  });
  assert.equal(policy.executableDelete, false);
  assert.match(policy.diagnostics.join(" "), /矛盾/);
});

test("remote sample refs are rejected", () => {
  assert.throws(() =>
    createRoster([
      {
        id: "mom",
        displayName: "妈妈",
        prototypes: [{ id: "a", sampleRef: "https://example.test/a.jpg", embedding: [1] }],
      },
    ]),
  );
});
