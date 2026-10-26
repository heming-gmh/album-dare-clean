import { findPerson, readyPeople, type FamilyRoster, type RosterPerson } from "../roster/familyRoster.js";

export const MATCH_FLOOR = 0.75;

export type MediaKind = "photo" | "video";

export interface Keyframe {
  id: string;
  label: string;
  /** Placeholder tone for the strip. Not an image byte. */
  tone: string;
}

export interface FaceEvidence {
  faceId: string;
  rosterId?: string;
  displayName?: string;
  probability: number;
  unknown: boolean;
}

export interface MediaEvidence {
  mediaId: string;
  kind: MediaKind;
  title: string;
  coverage: number;
  faces: FaceEvidence[];
  /** Highest probability among faces matched to a ready roster person. */
  pHasFamily: number;
  hasUnknownFace: boolean;
  keyframes: Keyframe[];
  capturedAt: string;
}

export interface FixtureFace {
  faceId: string;
  embedding: number[];
}

export interface FixtureMedia {
  mediaId: string;
  kind: MediaKind;
  title: string;
  coverage: number;
  faces: FixtureFace[];
  keyframes: Keyframe[];
  capturedAt: string;
}

export function cosine(left: number[], right: number[]): number {
  const length = Math.min(left.length, right.length);
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let index = 0; index < length; index += 1) {
    const a = left[index] ?? 0;
    const b = right[index] ?? 0;
    dot += a * b;
    leftNorm += a * a;
    rightNorm += b * b;
  }
  if (leftNorm === 0 || rightNorm === 0) return 0;
  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

interface PrototypeHit {
  person: RosterPerson;
  similarity: number;
}

function bestReadyMatch(roster: FamilyRoster, embedding: number[]): PrototypeHit | undefined {
  let best: PrototypeHit | undefined;
  for (const person of readyPeople(roster)) {
    for (const prototype of person.prototypes) {
      const similarity = cosine(embedding, prototype.embedding);
      if (!best || similarity > best.similarity) {
        best = { person, similarity };
      }
    }
  }
  return best;
}

/**
 * Turns fixture embeddings into evidence.
 * Incomplete roster people are not identifiable, so their faces stay unknown.
 */
export function observeFixture(roster: FamilyRoster, media: FixtureMedia): MediaEvidence {
  const faces: FaceEvidence[] = [];
  let pHasFamily = 0;
  let hasUnknownFace = false;

  for (const face of media.faces) {
    const hit = bestReadyMatch(roster, face.embedding);
    if (!hit || hit.similarity < MATCH_FLOOR) {
      hasUnknownFace = true;
      faces.push({
        faceId: face.faceId,
        probability: hit?.similarity ?? 0,
        unknown: true,
      });
      continue;
    }
    pHasFamily = Math.max(pHasFamily, hit.similarity);
    faces.push({
      faceId: face.faceId,
      rosterId: hit.person.id,
      displayName: hit.person.displayName,
      probability: hit.similarity,
      unknown: false,
    });
  }

  return {
    mediaId: media.mediaId,
    kind: media.kind,
    title: media.title,
    coverage: media.coverage,
    faces,
    pHasFamily,
    hasUnknownFace,
    keyframes: media.keyframes,
    capturedAt: media.capturedAt,
  };
}

export function personIsReady(roster: FamilyRoster, name: string): boolean {
  return findPerson(roster, name)?.status === "ready";
}
