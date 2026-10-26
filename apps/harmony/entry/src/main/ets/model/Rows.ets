/** Shared rows for the shell. Field assignments stay explicit for ArkTS. */

@Observed
export class PersonRow {
  id: string = "";
  displayName: string = "";
  sampleCount: number = 0;

  ready(): boolean {
    return this.sampleCount >= 3;
  }
}

@Observed
export class PolarityCard {
  id: string = "";
  personName: string = "";
  /** "keep" or "suggest_remove". */
  polarity: string = "keep";
}

export class FrameSample {
  id: string = "";
  label: string = "";
  tone: string = "";
}

export class FaceSample {
  name: string = "";
  probability: number = 0;
  unknown: boolean = false;
}

export class MediaSample {
  mediaId: string = "";
  kind: string = "";
  title: string = "";
  coverage: number = 0;
  faces: FaceSample[] = [];
  keyframes: FrameSample[] = [];
}

export class MediaAssetRef {
  mediaId: string = "";
  kind: string = "";
  title: string = "";
  keyframes: FrameSample[] = [];
}

export class VisionFace {
  name: string = "";
  probability: number = 0;
  unknown: boolean = false;
}

export class VisionObservation {
  mediaId: string = "";
  coverage: number = 0;
  faces: VisionFace[] = [];
}

export class CompiledPolicy {
  executableDelete: boolean = false;
  blockReason: string = "";
  scope: string = "any";
  videoFirst: boolean = true;
  keepNames: string[] = [];
  unresolved: string[] = [];
  summary: string = "";
  epsilon: number = 0.2;
  tau: number = 0.85;
  diagnostics: string[] = [];
}

export class MediaRow {
  mediaId: string = "";
  kind: string = "";
  title: string = "";
  bucket: string = "";
  reasons: string[] = [];
  keyframes: FrameSample[] = [];
  coverage: number = 0;
}

export class ScanBundle {
  keep: MediaRow[] = [];
  uncertain: MediaRow[] = [];
  deleteCand: MediaRow[] = [];
  skipped: number = 0;
}

@Observed
export class RecycleRow {
  id: string = "";
  mediaId: string = "";
  title: string = "";
  kind: string = "";
  heldAtMs: number = 0;
  earliestReleaseAtMs: number = 0;
  restoredAtMs: number = 0;
  status: string = "held";
}
