# album-dare-clean

用一句话把一小部分相册分成三桶：「我在乎的」「不确定」「建议移出图库」。视频排在前面。只有在花名册完整、画面看全、也没有未识别的脸时，才会给出移出建议。建议不会自己执行。确认之后进入应用自己的回收站，至少放 30 天，可以恢复。

这个仓库是体验版骨架。规则在 `packages/core` 里可以单测。鸿蒙壳可以在 DevEco Studio 里打开，并用内置样例走完界面。这里没有真实照片，也没有签名证书。

## 目录

| 路径 | 内容 |
| --- | --- |
| `packages/core` | PolicyAST v0.3、轨 A 编译、花名册、证据、DareDeleteGate、回收站、`DEMO_FIXTURE` |
| `apps/harmony` | HarmonyOS NEXT / API 12 的 entry 模块和四个流程页 |
| `apps/web-preview` | 单文件浏览器预览。不用 DevEco、不用真机，双击就能走完三桶和回收站 |
| `apps/android`、`apps/ios` | 占位说明 |
| `docs/AC.md` | AC-1 到 AC-8 |
| `docs/BLIND_TEST.md` | T1 到 T8。演示前 T1 和 T3 必须通过 |
| `docs/ARCHITECTURE.md` | 规则和适配层 |
| `docs/PRODUCT-DIRECTIONS.md` | 三个产品方向的对比与取舍 |
| `docs/PRD.md` | v0.1 产品方案：三个假设、六屏结构、出第一版之前不做的事 |
| `design/hifi-prototype.html` | 六屏高保真原型，双击打开，可点着走完流程 |

## 先看产品，再看代码

功能开发暂时停在这里。现在要回答的是「这个产品立在哪」，不是「再写一个功能」。

- `docs/PRODUCT-DIRECTIONS.md`：家庭相册「敢删」/ 存储清理 / 回忆发现，三个方向的取舍。
- `docs/PRD.md`：选定方向后的 v0.1 方案。最关键的假设是**零建档启动**——不让人先建花名册也能开始。
- `design/hifi-prototype.html`：六屏原型，打开就能点。每屏右侧写了这一屏在验证什么。


## 跑 core

需要 Node.js 22。

```bash
cd packages/core
npm install
npm test
```

pnpm 同样：

```bash
cd packages/core
pnpm install
pnpm test
```

看一次确定性样例的分桶：

```bash
cd packages/core
npm run demo
```

`npm run demo` 会打印 keep、uncertain、delete_cand，以及回收站里被恢复的那一条。数据来自 `runDemoFixture()`，不读本机相册。

## DEMO_FIXTURE

样例模式用来在没有图库权限时把链路走通：

1. 三位家人，每人 3 个 `fixture://` 原型。
2. 模板句 `保留有妈妈的；保留有爸爸的；保留有小朋友的`。
3. 10 条假媒体进三桶。可建议移出的视频带关键帧说明。
4. 明确确认后进入回收站，再恢复其中一条。

鸿蒙首页的开关默认开着「演示样例」。关掉之后，本机适配层返回空列表，并说明图库还没接通，不会猜测哪些可以移出。

把句子改成含有「表姐」这类没建档的人，可删候选会变空。样例不足 3 张的人同样不能产生移出建议。

## 不用 DevEco 也能先看一遍

`apps/web-preview/dist/index.html` 是单个 HTML 文件，直接双击打开即可。它复用 `packages/core` 的同一套规则，离线运行，不发网络请求，也不需要 HarmonyOS SDK。花名册里的两个开关可以复现盲测 T1：句子里出现没建档的人时，「建议移出图库」必须是空的。

改完 `packages/core` 或预览代码后重新生成：

```bash
cd apps/web-preview
npm install
npm run build
open dist/index.html
```

## 用 DevEco 打开并安装

当前环境没有 DevEco，不能在这里打出 HAP。下一步是在你自己的电脑上安装 DevEco Studio，打开这个壳再签名安装。

1. 安装 DevEco Studio 5，并下载 HarmonyOS NEXT SDK，Compatible SDK 选 `5.0.0(12)`。
2. 用 **Open** 打开 `apps/harmony`，等 ohpm 和 hvigor 同步完成。不要新建一个空工程再把文件拷进去。
3. 配置调试签名：`File > Project Structure > Signing Configs`。可以用自动签名，也可以用你自己的调试证书。
4. 不要把 `.p12`、`.p7b`、`.cer`、证书口令或本机 SDK 路径提交到仓库。`local.properties` 已被忽略。如果 DevEco 把 `signingConfigs` 写进 `build-profile.json5`，提交前删掉其中的路径和口令。仓库里的签名配置应保持为空。
5. 菜单 **Build > Build Hap(s)/APP(s) > Build Hap(s)**。
6. 安装并启动。HAP 的具体路径会随 hvigor 版本变化，在 `entry/build` 下找：

```bash
find apps/harmony/entry/build -name '*.hap'
hdc list targets
hdc install <hap路径>
hdc shell aa start -b com.albumdare.clean -a EntryAbility
```

装好后从「建立家人花名册」走到回收站。真机点选记录写在 `docs/BLIND_TEST.md`，演示前先确认 T1 和 T3。

## 真机接口还没接

壳里的 `MediaLibraryPort` 和 `VisionPort` 是适配边界。演示实现读内置样例。设备实现目前返回空，或返回「覆盖不足且未识别」，因此闸门不会给出移出建议。

以后接本机时：

- 媒体用 `@kit.MediaLibraryKit` 的 `photoAccessHelper.getAssets`，或只用 `PhotoViewPicker` 让用户点选。权限是 `ohos.permission.READ_IMAGEVIDEO`。
- 人脸用 `@kit.CoreVisionKit` 的 `faceDetector`，输入是本机 `PixelMap`。
- 不把原片上传。不调用系统图库的删除接口。移出只进应用回收站。

## 这个版本不做的事

- 不上传原片，样例也不使用网络地址。
- 不做相似图、最佳照片整理。
- 不在午夜或任何时钟到达时自动删除。
- 花名册里没完成的人，不能产生可执行的移出建议。
