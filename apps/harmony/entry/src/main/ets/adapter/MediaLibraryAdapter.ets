import { demoAssetRefs } from "../core/LocalEngine";
import { MediaAssetRef } from "../model/Rows";

/**
 * 图库端口。
 * DEMO_FIXTURE 返回内置 id。
 * 真机路径留空，避免在未确认时扫全库，也避免任何上传。
 *
 * TODO(device): 用户同意后再读本机媒体。不要把像素发到进程外。
 * import { photoAccessHelper } from '@kit.MediaLibraryKit';
 * import { dataSharePredicates } from '@kit.ArkData';
 * const helper = photoAccessHelper.getPhotoAccessHelper(context);
 * const predicates = new dataSharePredicates.DataSharePredicates();
 * const fetch = await helper.getAssets({ fetchColumns: [], predicates });
 * 权限：ohos.permission.READ_IMAGEVIDEO，或改用 PhotoViewPicker 只拿用户点选的 URI。
 * 本应用不调用系统删除接口。移出只进入应用回收站。
 */
export interface MediaLibraryPort {
  listSample(limit: number): MediaAssetRef[];
}

export class DemoMediaLibrary implements MediaLibraryPort {
  listSample(limit: number): MediaAssetRef[] {
    const all = demoAssetRefs();
    const count = limit < all.length ? limit : all.length;
    const sliced: MediaAssetRef[] = [];
    for (let index = 0; index < count; index++) {
      sliced.push(all[index]);
    }
    return sliced;
  }
}

export class DeviceMediaLibrary implements MediaLibraryPort {
  listSample(limit: number): MediaAssetRef[] {
    if (limit < 0) {
      return [];
    }
    return [];
  }
}
