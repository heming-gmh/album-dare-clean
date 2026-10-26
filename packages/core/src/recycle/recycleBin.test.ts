import assert from "node:assert/strict";
import test from "node:test";
import {
  MIN_HOLD_DAYS,
  MS_PER_DAY,
  assertReleaseAllowed,
  emptyRecycleBin,
  heldEntries,
  hold,
  holdWindowElapsed,
  restore,
} from "./recycleBin.js";

const now = new Date("2026-03-01T08:00:00.000Z");

test("hold requires confirmation and keeps the item for at least 30 days", () => {
  const bin = emptyRecycleBin();
  assert.throws(() =>
    hold(bin, [{ mediaId: "vid-landscape", title: "窗外的云", kind: "video", userConfirmed: false }], now),
  );
  assert.equal(bin.entries.length, 0);

  const held = hold(
    bin,
    [{ mediaId: "vid-landscape", title: "窗外的云", kind: "video", userConfirmed: true }],
    now,
  );
  const entry = held.entries[0];
  assert.ok(entry);
  assert.equal(entry.status, "held");
  const span = Date.parse(entry.earliestReleaseAt) - Date.parse(entry.heldAt);
  assert.equal(span, MIN_HOLD_DAYS * MS_PER_DAY);
  assert.equal(holdWindowElapsed(entry, new Date(now.getTime() + 29 * MS_PER_DAY)), false);
  assert.throws(() => assertReleaseAllowed(entry, new Date(now.getTime() + 29 * MS_PER_DAY), true));
  assert.doesNotThrow(() => assertReleaseAllowed(entry, new Date(now.getTime() + 30 * MS_PER_DAY), true));
  assert.equal(entry.status, "held");
});

test("restore puts the item back and a second hold can start a new stay", () => {
  const held = hold(
    emptyRecycleBin(),
    [
      { mediaId: "vid-landscape", title: "窗外的云", kind: "video", userConfirmed: true },
      { mediaId: "photo-ceiling", title: "空白天花板", kind: "photo", userConfirmed: true },
    ],
    now,
  );
  const target = held.entries[0];
  assert.ok(target);
  const restored = restore(held, target.id, now);
  assert.equal(restored.entries[0]?.status, "restored");
  assert.equal(restored.entries[0]?.restoredAt, now.toISOString());
  assert.equal(heldEntries(restored).map((entry) => entry.mediaId).join(","), "photo-ceiling");

  const again = hold(
    restored,
    [{ mediaId: "vid-landscape", title: "窗外的云", kind: "video", userConfirmed: true }],
    new Date(now.getTime() + 60_000),
  );
  assert.equal(heldEntries(again).length, 2);
});

test("duplicate confirmation does not stack two holds", () => {
  const once = hold(
    emptyRecycleBin(),
    [{ mediaId: "vid-landscape", title: "窗外的云", kind: "video", userConfirmed: true }],
    now,
  );
  const twice = hold(
    once,
    [{ mediaId: "vid-landscape", title: "窗外的云", kind: "video", userConfirmed: true }],
    now,
  );
  assert.equal(twice.entries.length, 1);
});

test("missing restore target throws and does not invent a deletion", () => {
  assert.throws(() => restore(emptyRecycleBin(), "missing", now));
});
