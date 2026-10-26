import { FaceSample, FrameSample, MediaSample } from "../model/Rows";

/**
 * DEMO_FIXTURE catalog. Ids and coverages match packages/core/src/demo/fixture.ts.
 * These are labels and tones, not pixels and not uploads.
 */
function face(name: string, probability: number, unknown: boolean): FaceSample {
  const value = new FaceSample();
  value.name = name;
  value.probability = probability;
  value.unknown = unknown;
  return value;
}

function frame(id: string, label: string, tone: string): FrameSample {
  const value = new FrameSample();
  value.id = id;
  value.label = label;
  value.tone = tone;
  return value;
}

function frames(mediaId: string, tones: string[]): FrameSample[] {
  const list: FrameSample[] = [];
  for (let index = 0; index < tones.length; index++) {
    list.push(frame(mediaId + "-k" + (index + 1).toString(), "关键帧 " + (index + 1).toString(), tones[index]));
  }
  return list;
}

function media(mediaId: string, kind: string, title: string, coverage: number, faces: FaceSample[],
  keyframes: FrameSample[]): MediaSample {
  const value = new MediaSample();
  value.mediaId = mediaId;
  value.kind = kind;
  value.title = title;
  value.coverage = coverage;
  value.faces = faces;
  value.keyframes = keyframes;
  return value;
}

export function buildDemoMedia(): MediaSample[] {
  const list: MediaSample[] = [];
  list.push(media("vid-park-mom", "video", "周末公园", 0.96, [face("妈妈", 0.96, false)],
    frames("vid-park-mom", ["#8FBF9F", "#6EA4C4", "#E6C07B", "#C4B7A6"])));
  list.push(media("vid-home-dad", "video", "家里晚饭", 0.93, [face("爸爸", 0.96, false)],
    frames("vid-home-dad", ["#D7B48A", "#8AA6C1", "#C9C1B5"])));
  list.push(media("vid-landscape", "video", "窗外的云", 0.99, [],
    frames("vid-landscape", ["#9EC3E0", "#E7EEF4", "#C5D4C0", "#F2E6C9"])));
  list.push(media("vid-street", "video", "路边行人", 0.97, [face("", 0, true)],
    frames("vid-street", ["#C8C2B8", "#A9B1B8", "#E4D7C5"])));
  list.push(media("vid-dark", "video", "夜里模糊", 0.42, [],
    frames("vid-dark", ["#4E5560", "#6B7380"])));
  list.push(media("vid-mom-brief", "video", "妈妈一闪而过", 0.35, [face("妈妈", 0.96, false)],
    frames("vid-mom-brief", ["#E7D3C5", "#B7C4B0"])));
  list.push(media("vid-mom-guest", "video", "妈妈和客人", 0.95,
    [face("妈妈", 0.96, false), face("", 0, true)],
    frames("vid-mom-guest", ["#E8C7B0", "#B9C7D6", "#D9D3C7"])));
  list.push(media("photo-child", "photo", "小朋友画画", 0.98, [face("小朋友", 0.96, false)], []));
  list.push(media("photo-ceiling", "photo", "空白天花板", 0.97, [], []));
  list.push(media("photo-unknown", "photo", "没见过的人", 0.96, [face("", 0, true)], []));
  return list;
}

export function findDemoMedia(mediaId: string): MediaSample | null {
  const list = buildDemoMedia();
  for (let index = 0; index < list.length; index++) {
    if (list[index].mediaId === mediaId) {
      return list[index];
    }
  }
  return null;
}
