import { DemoMediaLibrary, DeviceMediaLibrary, MediaLibraryPort } from "./MediaLibraryAdapter";
import { DemoVision, DeviceVision, VisionPort } from "./VisionAdapter";

/** DEMO_FIXTURE 走内置样例；关掉之后走保守的本机空实现。 */
export function mediaLibraryFor(useDemoFixture: boolean): MediaLibraryPort {
  if (useDemoFixture) {
    return new DemoMediaLibrary();
  }
  return new DeviceMediaLibrary();
}

export function visionFor(useDemoFixture: boolean): VisionPort {
  if (useDemoFixture) {
    return new DemoVision();
  }
  return new DeviceVision();
}
