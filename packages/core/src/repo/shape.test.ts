import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

function read(relative: string): string {
  return readFileSync(path.join(root, relative), "utf8");
}

function walk(dir: string, suffix: string): string[] {
  if (!existsSync(dir)) return [];
  const found: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === "node_modules" || name === "dist" || name === "oh_modules") continue;
      found.push(...walk(full, suffix));
    } else if (name.endsWith(suffix)) {
      found.push(full);
    }
  }
  return found;
}

test("Harmony project has the Stage files DevEco opens", () => {
  const required = [
    "apps/harmony/oh-package.json5",
    "apps/harmony/build-profile.json5",
    "apps/harmony/hvigorfile.ts",
    "apps/harmony/hvigor/hvigor-config.json5",
    "apps/harmony/AppScope/app.json5",
    "apps/harmony/AppScope/resources/base/element/string.json",
    "apps/harmony/AppScope/resources/base/media/app_icon.png",
    "apps/harmony/entry/oh-package.json5",
    "apps/harmony/entry/build-profile.json5",
    "apps/harmony/entry/hvigorfile.ts",
    "apps/harmony/entry/src/main/module.json5",
    "apps/harmony/entry/src/main/ets/entryability/EntryAbility.ets",
    "apps/harmony/entry/src/main/ets/pages/Index.ets",
    "apps/harmony/entry/src/main/ets/pages/OnboardingPage.ets",
    "apps/harmony/entry/src/main/ets/pages/IntentPage.ets",
    "apps/harmony/entry/src/main/ets/pages/ResultsPage.ets",
    "apps/harmony/entry/src/main/ets/pages/RecyclePage.ets",
    "apps/harmony/entry/src/main/resources/base/profile/main_pages.json",
    "apps/android/README.md",
    "apps/ios/README.md",
    "docs/AC.md",
    "docs/BLIND_TEST.md",
    "docs/ARCHITECTURE.md",
  ];
  for (const relative of required) {
    assert.equal(existsSync(path.join(root, relative)), true, relative);
  }

  const app = JSON.parse(read("apps/harmony/AppScope/app.json5")) as { app: { bundleName: string } };
  assert.equal(app.app.bundleName, "com.albumdare.clean");
  const profile = JSON.parse(read("apps/harmony/build-profile.json5")) as {
    app: { products: Array<{ compatibleSdkVersion: string; runtimeOS: string }> };
  };
  assert.equal(profile.app.products[0]?.compatibleSdkVersion, "5.0.0(12)");
  assert.equal(profile.app.products[0]?.runtimeOS, "HarmonyOS");
  const pages = JSON.parse(read("apps/harmony/entry/src/main/resources/base/profile/main_pages.json")) as {
    src: string[];
  };
  assert.ok(pages.src.includes("pages/Index"));
  assert.ok(pages.src.includes("pages/OnboardingPage"));
  assert.ok(pages.src.includes("pages/IntentPage"));
  assert.ok(pages.src.includes("pages/ResultsPage"));
  assert.ok(pages.src.includes("pages/RecyclePage"));
});

test("interface copy stays inside the allowed wording", () => {
  const files = walk(path.join(root, "apps/harmony"), ".ets");
  assert.ok(files.length >= 8);
  const combined = files.map((file) => readFileSync(file, "utf8")).join("\n");
  assert.equal(combined.includes("强力清理"), false);
  assert.equal(combined.includes("垃圾"), false);
  assert.equal(combined.includes("最佳照片"), false);
  assert.equal(combined.includes("相似"), false);
  assert.ok(combined.includes("智能整理"));
  assert.ok(combined.includes("分组建议"));
  assert.ok(combined.includes("建议移出图库"));
  assert.ok(combined.includes("不确定"));

  const coreFiles = walk(path.join(root, "packages/core/src"), ".ts").filter((file) => !file.endsWith(".test.ts"));
  const coreText = coreFiles.map((file) => readFileSync(file, "utf8")).join("\n");
  assert.equal(coreText.includes("强力清理"), false);
  assert.equal(coreText.includes("垃圾"), false);
});

test("Harmony fixture lists the same demo media ids", () => {
  const catalog = read("apps/harmony/entry/src/main/ets/core/FixtureData.ets");
  for (const id of [
    "vid-park-mom",
    "vid-home-dad",
    "vid-landscape",
    "vid-street",
    "vid-dark",
    "vid-mom-brief",
    "vid-mom-guest",
    "photo-child",
    "photo-ceiling",
    "photo-unknown",
  ]) {
    assert.equal(catalog.includes(id), true, id);
  }
  const adapter = read("apps/harmony/entry/src/main/ets/adapter/MediaLibraryAdapter.ets");
  assert.match(adapter, /photoAccessHelper/);
  assert.match(adapter, /TODO\(device\)/);
  const vision = read("apps/harmony/entry/src/main/ets/adapter/VisionAdapter.ets");
  assert.match(vision, /faceDetector/);
  assert.match(vision, /TODO\(device\)/);
});
