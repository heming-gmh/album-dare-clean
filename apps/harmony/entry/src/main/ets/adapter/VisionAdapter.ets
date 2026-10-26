import { findDemoMedia } from "../core/FixtureData";
import { VisionFace, VisionObservation } from "../model/Rows";

/**
 * 视觉端口。Core Vision 在这里只作为零件，花名册仍由应用自己维护。
 *
 * TODO(device): 只对用户同意的本机 PixelMap 做检测，检测完即可释放，不要上传原片。
 * import { faceDetector } from '@kit.CoreVisionKit';
 * import { image } from '@kit.ImageKit';
 * await faceDetector.init();
 * const faces = await faceDetector.detect({ pixelMap });
 * await faceDetector.release();
 * 匹配花名册原型应留在本机。匹配不上或覆盖不足时，观察结果保持 unknown / coverage 0，
 * 这样闸门不会给出「建议移出图库」。
 */
export interface VisionPort {
  observe(mediaId: string): VisionObservation;
}

export class DemoVision implements VisionPort {
  observe(mediaId: string): VisionObservation {
    const observation = new VisionObservation();
    observation.mediaId = mediaId;
    const sample = findDemoMedia(mediaId);
    if (sample === null) {
      observation.coverage = 0;
      const unknown = new VisionFace();
      unknown.unknown = true;
      observation.faces.push(unknown);
      return observation;
    }
    observation.coverage = sample.coverage;
    for (let index = 0; index < sample.faces.length; index++) {
      const face = new VisionFace();
      face.name = sample.faces[index].name;
      face.probability = sample.faces[index].probability;
      face.unknown = sample.faces[index].unknown;
      observation.faces.push(face);
    }
    return observation;
  }
}

export class DeviceVision implements VisionPort {
  observe(mediaId: string): VisionObservation {
    const observation = new VisionObservation();
    observation.mediaId = mediaId;
    observation.coverage = 0;
    const unknown = new VisionFace();
    unknown.unknown = true;
    observation.faces.push(unknown);
    return observation;
  }
}
