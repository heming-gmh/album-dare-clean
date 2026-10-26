import { observeFixture, type FixtureMedia, type MediaEvidence } from "../evidence/observe.js";
import { createRoster, type FamilyRoster, type PrototypeStub } from "../roster/familyRoster.js";

const MOM = [1, 0, 0, 0];
const DAD = [0, 1, 0, 0];
const CHILD = [0, 0, 1, 0];
const UNKNOWN = [0, 0, 0, 1];

function prototypes(person: string, base: number[]): PrototypeStub[] {
  return [0, 1, 2].map((index) => {
    const embedding = base.map((value, axis) => {
      if (value === 0) return index === axis ? 0.08 : 0;
      return 1 - index * 0.03;
    });
    return {
      id: `${person}-${index + 1}`,
      sampleRef: `fixture://roster/${person}/${index + 1}`,
      embedding,
    };
  });
}

function frames(mediaId: string, tones: string[]): FixtureMedia["keyframes"] {
  return tones.map((tone, index) => ({
    id: `${mediaId}-k${index + 1}`,
    label: `关键帧 ${index + 1}`,
    tone,
  }));
}

/** Deterministic stand-in media. No pixels, no device library, no network. */
export const DEMO_MEDIA: FixtureMedia[] = [
  {
    mediaId: "vid-park-mom",
    kind: "video",
    title: "周末公园",
    coverage: 0.96,
    capturedAt: "2026-02-01T03:00:00.000Z",
    faces: [{ faceId: "f1", embedding: [0.99, 0.02, 0, 0] }],
    keyframes: frames("vid-park-mom", ["#8FBF9F", "#6EA4C4", "#E6C07B", "#C4B7A6"]),
  },
  {
    mediaId: "vid-home-dad",
    kind: "video",
    title: "家里晚饭",
    coverage: 0.93,
    capturedAt: "2026-02-02T11:00:00.000Z",
    faces: [{ faceId: "f1", embedding: [0.02, 0.98, 0, 0] }],
    keyframes: frames("vid-home-dad", ["#D7B48A", "#8AA6C1", "#C9C1B5"]),
  },
  {
    mediaId: "vid-landscape",
    kind: "video",
    title: "窗外的云",
    coverage: 0.99,
    capturedAt: "2026-02-03T02:00:00.000Z",
    faces: [],
    keyframes: frames("vid-landscape", ["#9EC3E0", "#E7EEF4", "#C5D4C0", "#F2E6C9"]),
  },
  {
    mediaId: "vid-street",
    kind: "video",
    title: "路边行人",
    coverage: 0.97,
    capturedAt: "2026-02-04T08:00:00.000Z",
    faces: [{ faceId: "f1", embedding: UNKNOWN }],
    keyframes: frames("vid-street", ["#C8C2B8", "#A9B1B8", "#E4D7C5"]),
  },
  {
    mediaId: "vid-dark",
    kind: "video",
    title: "夜里模糊",
    coverage: 0.42,
    capturedAt: "2026-02-05T14:00:00.000Z",
    faces: [],
    keyframes: frames("vid-dark", ["#4E5560", "#6B7380"]),
  },
  {
    mediaId: "vid-mom-brief",
    kind: "video",
    title: "妈妈一闪而过",
    coverage: 0.35,
    capturedAt: "2026-02-06T01:00:00.000Z",
    faces: [{ faceId: "f1", embedding: [0.97, 0.04, 0, 0] }],
    keyframes: frames("vid-mom-brief", ["#E7D3C5", "#B7C4B0"]),
  },
  {
    mediaId: "vid-mom-guest",
    kind: "video",
    title: "妈妈和客人",
    coverage: 0.95,
    capturedAt: "2026-02-07T06:00:00.000Z",
    faces: [
      { faceId: "f1", embedding: [0.98, 0.01, 0, 0] },
      { faceId: "f2", embedding: UNKNOWN },
    ],
    keyframes: frames("vid-mom-guest", ["#E8C7B0", "#B9C7D6", "#D9D3C7"]),
  },
  {
    mediaId: "photo-child",
    kind: "photo",
    title: "小朋友画画",
    coverage: 0.98,
    capturedAt: "2026-02-08T04:00:00.000Z",
    faces: [{ faceId: "f1", embedding: [0, 0.04, 0.98, 0] }],
    keyframes: [],
  },
  {
    mediaId: "photo-ceiling",
    kind: "photo",
    title: "空白天花板",
    coverage: 0.97,
    capturedAt: "2026-02-09T04:00:00.000Z",
    faces: [],
    keyframes: [],
  },
  {
    mediaId: "photo-unknown",
    kind: "photo",
    title: "没见过的人",
    coverage: 0.96,
    capturedAt: "2026-02-10T04:00:00.000Z",
    faces: [{ faceId: "f1", embedding: UNKNOWN }],
    keyframes: [],
  },
];

export function demoRoster(): FamilyRoster {
  return createRoster([
    {
      id: "mom",
      displayName: "妈妈",
      aliases: ["母亲"],
      prototypes: prototypes("mom", MOM),
    },
    {
      id: "dad",
      displayName: "爸爸",
      aliases: ["父亲"],
      prototypes: prototypes("dad", DAD),
    },
    {
      id: "child",
      displayName: "小朋友",
      aliases: ["孩子"],
      prototypes: prototypes("child", CHILD),
    },
  ]);
}

export function demoEvidence(roster: FamilyRoster = demoRoster()): MediaEvidence[] {
  return DEMO_MEDIA.map((media) => observeFixture(roster, media));
}

export const DEMO_MEDIA_IDS = DEMO_MEDIA.map((media) => media.mediaId);
