import { buildDemoMedia } from "./FixtureData";
import {
  CompiledPolicy,
  FrameSample,
  MediaAssetRef,
  MediaRow,
  PersonRow,
  PolarityCard,
  ScanBundle,
  VisionFace,
  VisionObservation
} from "../model/Rows";

/**
 * 壳内轨 A 与 DareDeleteGate。判定顺序与 packages/core 一致，单测以 core 为准。
 * 不读取图库，不上传原片，也不提供午夜清除。
 */
export const EPSILON = 0.2;
export const TAU = 0.85;
export const MIN_HOLD_DAYS = 30;
export const MIN_HOLD_MS = MIN_HOLD_DAYS * 24 * 60 * 60 * 1000;

class DraftPerson {
  name: string = "";
  inKeep: boolean = false;
  inAbsence: boolean = false;
}

function clean(value: string): string {
  return value.split("\u3000").join(" ").trim();
}

function splitClauses(template: string): string[] {
  const raw = template.split(/[；;\n，,]+/);
  const clauses: string[] = [];
  for (let index = 0; index < raw.length; index++) {
    const clause = clean(raw[index]);
    if (clause.length > 0) {
      clauses.push(clause);
    }
  }
  return clauses;
}

function validName(name: string): boolean {
  if (name.length < 1 || name.length > 12) {
    return false;
  }
  return name.indexOf("的") < 0 && name.indexOf(" ") < 0 && name.indexOf("；") < 0 && name.indexOf("，") < 0;
}

function parseKeep(clause: string): string[] {
  const prefix = "保留有";
  if (clause.indexOf(prefix) !== 0) {
    return [];
  }
  let rest = clause.substring(prefix.length);
  let kind = "";
  if (rest.endsWith("的视频")) {
    kind = "video";
    rest = rest.substring(0, rest.length - "的视频".length);
  } else if (rest.endsWith("的照片")) {
    kind = "photo";
    rest = rest.substring(0, rest.length - "的照片".length);
  } else if (rest.endsWith("的")) {
    rest = rest.substring(0, rest.length - 1);
  } else {
    return [];
  }
  if (!validName(rest)) {
    return [];
  }
  const parsed: string[] = [];
  parsed.push(rest);
  parsed.push(kind);
  return parsed;
}

function parseAbsence(clause: string): string {
  const prefix = "没有";
  if (clause.indexOf(prefix) !== 0) {
    return "";
  }
  const rest = clause.substring(prefix.length);
  const suffixes: string[] = ["的可以建议移出", "的可建议移出", "可以建议移出", "可建议移出", "的建议移出", "建议移出"];
  for (let index = 0; index < suffixes.length; index++) {
    const suffix = suffixes[index];
    if (rest.endsWith(suffix) && rest.length > suffix.length) {
      const name = rest.substring(0, rest.length - suffix.length);
      if (validName(name)) {
        return name;
      }
    }
  }
  return "";
}

function resolveName(people: PersonRow[], name: string): string {
  let mapped = name;
  if (name === "母亲") {
    mapped = "妈妈";
  } else if (name === "父亲") {
    mapped = "爸爸";
  } else if (name === "孩子") {
    mapped = "小朋友";
  }
  for (let index = 0; index < people.length; index++) {
    if (people[index].displayName === mapped) {
      return mapped;
    }
  }
  return name;
}

function findDraft(drafts: DraftPerson[], name: string): DraftPerson | null {
  for (let index = 0; index < drafts.length; index++) {
    if (drafts[index].name === name) {
      return drafts[index];
    }
  }
  return null;
}

function personReady(people: PersonRow[], name: string): boolean {
  for (let index = 0; index < people.length; index++) {
    if (people[index].displayName === name && people[index].ready()) {
      return true;
    }
  }
  return false;
}

function containsName(names: string[], name: string): boolean {
  for (let index = 0; index < names.length; index++) {
    if (names[index] === name) {
      return true;
    }
  }
  return false;
}

class IntentBuilder {
  policy: CompiledPolicy = new CompiledPolicy();
  drafts: DraftPerson[] = [];
  people: PersonRow[] = [];
  scope: string = "any";
  scopeSet: boolean = false;

  setScope(next: string): void {
    if (!this.scopeSet) {
      this.scope = next;
      this.scopeSet = true;
      return;
    }
    if (this.scope !== next) {
      this.policy.diagnostics.push("整理范围互相矛盾");
    }
  }

  mark(rawName: string, inKeep: boolean, inAbsence: boolean): void {
    const name = resolveName(this.people, rawName.trim());
    const existing = findDraft(this.drafts, name);
    if (existing !== null) {
      if (inKeep) {
        existing.inKeep = true;
      }
      if (inAbsence) {
        existing.inAbsence = true;
      }
      return;
    }
    const created = new DraftPerson();
    created.name = name;
    created.inKeep = inKeep;
    created.inAbsence = inAbsence;
    this.drafts.push(created);
  }
}

export function compilePolicy(templateText: string, cards: PolarityCard[], people: PersonRow[]): CompiledPolicy {
  const builder = new IntentBuilder();
  builder.people = people;
  builder.policy.epsilon = EPSILON;
  builder.policy.tau = TAU;

  const templates = splitClauses(templateText);
  for (let index = 0; index < templates.length; index++) {
    const clause = templates[index];
    if (clause === "只看视频") {
      builder.setScope("video");
      continue;
    }
    if (clause === "只看照片") {
      builder.setScope("photo");
      continue;
    }
    if (clause === "照片和视频" || clause === "视频和照片") {
      builder.setScope("any");
      continue;
    }
    if (clause === "视频优先") {
      builder.policy.videoFirst = true;
      continue;
    }
    const keep = parseKeep(clause);
    if (keep.length === 2) {
      if (keep[1].length > 0) {
        builder.setScope(keep[1]);
      }
      builder.mark(keep[0], true, false);
      continue;
    }
    const absenceName = parseAbsence(clause);
    if (absenceName.length > 0) {
      builder.mark(absenceName, true, true);
      continue;
    }
    builder.policy.diagnostics.push("没看懂这一句：" + clause);
  }

  for (let index = 0; index < cards.length; index++) {
    const card = cards[index];
    const name = card.personName.trim();
    if (!validName(name)) {
      builder.policy.diagnostics.push("有一张卡片没有可用的人物");
      continue;
    }
    if (card.polarity === "keep") {
      builder.mark(name, true, false);
    } else if (card.polarity === "suggest_remove") {
      builder.mark(name, true, true);
    } else {
      builder.policy.diagnostics.push("卡片极性无法识别");
    }
  }

  let absenceCount = 0;
  for (let index = 0; index < builder.drafts.length; index++) {
    if (builder.drafts[index].inKeep) {
      builder.drafts[index].inAbsence = true;
    }
    if (builder.drafts[index].inAbsence) {
      absenceCount++;
    }
  }
  if (builder.drafts.length === 0) {
    builder.policy.diagnostics.push("还没有指定在乎的人");
  }

  for (let index = 0; index < builder.drafts.length; index++) {
    const draft = builder.drafts[index];
    if (draft.inKeep) {
      builder.policy.keepNames.push(draft.name);
    }
    if (!personReady(people, draft.name)) {
      builder.policy.unresolved.push(draft.name);
    }
  }

  const policy = builder.policy;
  policy.scope = builder.scope;
  const canDelete = policy.unresolved.length === 0 && policy.diagnostics.length === 0 && absenceCount > 0;
  policy.executableDelete = canDelete;
  if (!canDelete) {
    if (policy.unresolved.length > 0) {
      policy.blockReason = "还有人没建档完成：" + policy.unresolved.join("、") + "。本次不会建议移出图库。";
    } else if (policy.diagnostics.length > 0) {
      policy.blockReason = policy.diagnostics[0];
    } else {
      policy.blockReason = "本次不会建议移出图库。";
    }
  }

  const scopeLabel = policy.scope === "video" ? "只看视频" : policy.scope === "photo" ? "只看照片" : "照片和视频";
  const peopleLabel = policy.keepNames.length > 0 ? policy.keepNames.join("、") : "还没有";
  if (policy.executableDelete) {
    policy.summary = "在乎的人：" + peopleLabel + "。范围：" + scopeLabel + "。可以给出分组建议。";
  } else {
    policy.summary = policy.blockReason;
  }
  return policy;
}

function copyFrames(frames: FrameSample[]): FrameSample[] {
  const copy: FrameSample[] = [];
  for (let index = 0; index < frames.length; index++) {
    const frame = new FrameSample();
    frame.id = frames[index].id;
    frame.label = frames[index].label;
    frame.tone = frames[index].tone;
    copy.push(frame);
  }
  return copy;
}

function observationFor(asset: MediaAssetRef, seen: VisionObservation[]): VisionObservation {
  for (let index = 0; index < seen.length; index++) {
    if (seen[index].mediaId === asset.mediaId) {
      return seen[index];
    }
  }
  const missing = new VisionObservation();
  missing.mediaId = asset.mediaId;
  missing.coverage = 0;
  const unknown = new VisionFace();
  unknown.unknown = true;
  missing.faces.push(unknown);
  return missing;
}

function pushRow(bundle: ScanBundle, row: MediaRow): void {
  if (row.bucket === "keep") {
    bundle.keep.push(row);
  } else if (row.bucket === "uncertain") {
    bundle.uncertain.push(row);
  } else if (row.bucket === "delete_cand") {
    bundle.deleteCand.push(row);
  }
}

function compareRows(videoFirst: boolean, left: MediaRow, right: MediaRow): number {
  if (videoFirst && left.kind !== right.kind) {
    if (left.kind === "video") {
      return -1;
    }
    return 1;
  }
  if (left.mediaId < right.mediaId) {
    return -1;
  }
  if (left.mediaId > right.mediaId) {
    return 1;
  }
  return 0;
}

export function classifyAssets(policy: CompiledPolicy, assets: MediaAssetRef[],
  observations: VisionObservation[]): ScanBundle {
  const bundle = new ScanBundle();
  for (let index = 0; index < assets.length; index++) {
    const asset = assets[index];
    const seen = observationFor(asset, observations);
    const row = new MediaRow();
    row.mediaId = asset.mediaId;
    row.kind = asset.kind;
    row.title = asset.title;
    row.coverage = seen.coverage;
    row.keyframes = copyFrames(asset.keyframes);

    if (policy.scope !== "any" && policy.scope !== asset.kind) {
      bundle.skipped++;
      continue;
    }

    let keptName = "";
    let familyProbability = 0;
    let unknownFace = false;
    for (let faceIndex = 0; faceIndex < seen.faces.length; faceIndex++) {
      const seenFace = seen.faces[faceIndex];
      if (seenFace.unknown) {
        unknownFace = true;
        continue;
      }
      if (seenFace.probability > familyProbability) {
        familyProbability = seenFace.probability;
      }
      if (seenFace.probability >= policy.epsilon && containsName(policy.keepNames, seenFace.name)) {
        keptName = seenFace.name;
      }
    }

    if (keptName.length > 0) {
      row.bucket = "keep";
      row.reasons.push("识别到在乎的人：" + keptName + "。留在我在乎的。");
    } else if (!policy.executableDelete) {
      row.bucket = "uncertain";
      row.reasons.push(policy.blockReason.length > 0 ? policy.blockReason : "花名册还没建完，不会建议移出图库。");
    } else if (unknownFace) {
      row.bucket = "uncertain";
      row.reasons.push("有未识别的人脸，放在不确定里，不会建议移出。");
    } else if (seen.coverage < policy.tau) {
      row.bucket = "uncertain";
      row.reasons.push("画面没有看全，放在不确定里，不会建议移出。");
    } else if (familyProbability >= policy.epsilon) {
      row.bucket = "uncertain";
      row.reasons.push("像是花名册里的人，但这次没有放进「在乎」。先放在不确定里。");
    } else {
      row.bucket = "delete_cand";
      const preview = asset.kind === "video" && asset.keyframes.length > 0
        ? "可先看 " + asset.keyframes.length.toString() + " 张关键帧。"
        : "";
      row.reasons.push("覆盖 " + Math.round(seen.coverage * 100).toString() +
        "%。没有在乎的人，也没有未识别人脸。建议移出图库。" + preview);
    }
    pushRow(bundle, row);
  }

  sortRows(bundle.keep, policy.videoFirst);
  sortRows(bundle.uncertain, policy.videoFirst);
  sortRows(bundle.deleteCand, policy.videoFirst);
  return bundle;
}

function sortRows(rows: MediaRow[], videoFirst: boolean): void {
  for (let index = 1; index < rows.length; index++) {
    const current = rows[index];
    let position = index - 1;
    while (position >= 0 && compareRows(videoFirst, rows[position], current) > 0) {
      rows[position + 1] = rows[position];
      position--;
    }
    rows[position + 1] = current;
  }
}

export function demoAssetRefs(): MediaAssetRef[] {
  const media = buildDemoMedia();
  const assets: MediaAssetRef[] = [];
  for (let index = 0; index < media.length; index++) {
    const asset = new MediaAssetRef();
    asset.mediaId = media[index].mediaId;
    asset.kind = media[index].kind;
    asset.title = media[index].title;
    asset.keyframes = copyFrames(media[index].keyframes);
    assets.push(asset);
  }
  return assets;
}

export function formatDay(ms: number): string {
  const date = new Date(ms);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const monthText = month < 10 ? "0" + month.toString() : month.toString();
  const dayText = day < 10 ? "0" + day.toString() : day.toString();
  return date.getFullYear().toString() + "-" + monthText + "-" + dayText;
}
