# 浏览器预览（不用 DevEco）

`dist/index.html` 是单个 HTML 文件，双击就能打开。它复用 `packages/core` 的同一套规则，离线运行，不发网络请求，也不需要 HarmonyOS SDK。

演示路径：花名册 → 模板句 → 三桶 → 勾选 → 进回收站 → 恢复。两个开关用来复现盲测 T1：句子里提到没建档的人时，「建议移出图库」必须为空。

```bash
# 需要 Node.js 22
npm install        # 只有 esbuild
npm run build      # 生成 dist/index.html（单文件）
open dist/index.html
```

`npm run build` 结束时会顺手检查文案：出现「强力清理」这类词，或者少了「智能整理」「分组建议」「建议移出图库」「不确定」，构建直接失败。

和鸿蒙壳的区别：`apps/harmony` 里的 `LocalEngine.ets` 是同一判定顺序的手写副本，真机要它；预览版直接 import TypeScript 的 `packages/core`，所以它的行为就是单测覆盖的那份行为。两者的分桶结果应当一致，不一致时以 `packages/core` 为准。
