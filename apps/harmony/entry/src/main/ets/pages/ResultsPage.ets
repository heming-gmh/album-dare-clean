import { router } from '@kit.ArkUI';
import { PageHeader } from '../components/PageHeader';
import { FrameSample, MediaRow } from '../model/Rows';
import { Session } from '../session/Session';

@Entry
@Component
struct ResultsPage {
  @StorageLink("albumSession") session: Session = new Session();

  aboutToAppear(): void {
    if (this.session.summary.length === 0) {
      this.session.compile();
    }
  }

  build() {
    Scroll() {
      Column({ space: 14 }) {
        PageHeader({ title: "分组建议" })
        Text(this.session.summary)
          .fontSize(14)
          .fontColor(this.session.executableDelete ? "#2F6B45" : "#8A5A00")
          .lineHeight(21)
        Text("已选 " + this.session.selectedCount().toString() + " 项")
          .fontSize(13)
          .fontColor("#6B645C")

        this.bucket("我在乎的", "认出了你在乎的人，会留下。", this.session.keepItems, "keep")
        this.bucket("不确定", "这些不会并进「建议移出图库」。先别移出。", this.session.uncertainItems, "uncertain")
        this.bucket("建议移出图库", "只是分组建议。勾选并确认后才会进入回收站。", this.session.deleteItems, "delete")

        Button("放进回收站")
          .width("100%")
          .height(48)
          .backgroundColor("#8A5A00")
          .enabled(this.session.selectedCount() > 0)
          .onClick(() => {
            const before = this.session.selectedCount();
            this.session.confirmHold(Date.now());
            if (before > 0) {
              router.pushUrl({ url: "pages/RecyclePage" });
            }
          })
        Text(this.session.notice)
          .fontSize(13)
          .fontColor("#6B645C")
        Button("调整这句话")
          .width("100%")
          .height(44)
          .backgroundColor("#E7E0D6")
          .fontColor("#1F1A17")
          .onClick(() => {
            router.back();
          })
      }
      .width("100%")
      .padding(20)
      .alignItems(HorizontalAlign.Start)
    }
    .width("100%")
    .height("100%")
    .backgroundColor("#F6F4EF")
    .align(Alignment.TopStart)
  }

  sectionColor(mode: string): string {
    if (mode === "uncertain") {
      return "#FFE7A3";
    }
    if (mode === "keep") {
      return "#E7F5EC";
    }
    return "#F7F4EF";
  }

  sectionBorder(mode: string): string {
    if (mode === "uncertain") {
      return "#8A5A00";
    }
    if (mode === "keep") {
      return "#B7D7C3";
    }
    return "#DDD6CC";
  }

  kindLabel(kind: string): string {
    if (kind === "video") {
      return "视频";
    }
    return "照片";
  }

  @Builder
  bucket(title: string, subtitle: string, items: MediaRow[], mode: string) {
    Column({ space: 8 }) {
      Row() {
        Text(title)
          .fontSize(18)
          .fontWeight(FontWeight.Bold)
          .fontColor("#1F1A17")
        if (mode === "uncertain") {
          Text("先不要移出")
            .fontSize(12)
            .fontColor("#FFFFFF")
            .backgroundColor("#8A5A00")
            .borderRadius(10)
            .padding({ left: 8, right: 8, top: 3, bottom: 3 })
            .margin({ left: 8 })
        }
      }
      .width("100%")
      Text(subtitle)
        .fontSize(13)
        .fontColor("#5C564E")
      if (items.length === 0) {
        Text("这一组是空的")
          .fontSize(13)
          .fontColor("#8A8178")
      }
      ForEach(items, (item: MediaRow) => {
        this.mediaCard(item, mode)
      }, (item: MediaRow) => mode + "-" + item.mediaId)
    }
    .width("100%")
    .padding(12)
    .borderRadius(16)
    .backgroundColor(this.sectionColor(mode))
    .border({ width: mode === "uncertain" ? 2 : 1, color: this.sectionBorder(mode) })
    .alignItems(HorizontalAlign.Start)
  }

  @Builder
  mediaCard(item: MediaRow, mode: string) {
    Column({ space: 6 }) {
      Row() {
        if (mode === "delete") {
          Checkbox()
            .select(this.session.isSelected(item.mediaId))
            .selectedColor("#8A5A00")
            .onChange((checked: boolean) => {
              this.session.toggleSelect(item.mediaId, checked);
            })
        }
        Column() {
          Text(item.title)
            .fontSize(16)
            .fontColor("#1F1A17")
          Text(this.kindLabel(item.kind))
            .fontSize(12)
            .fontColor("#6B645C")
            .margin({ top: 2 })
        }
        .alignItems(HorizontalAlign.Start)
        .margin({ left: mode === "delete" ? 8 : 0 })
      }
      .width("100%")
      if (item.keyframes.length > 0) {
        Text("关键帧预览")
          .fontSize(12)
          .fontColor("#5C564E")
        Row({ space: 6 }) {
          ForEach(item.keyframes, (frame: FrameSample) => {
            Column() {
              Text(frame.label)
                .fontSize(10)
                .fontColor("#3E3A36")
            }
            .width(64)
            .height(44)
            .borderRadius(8)
            .backgroundColor(frame.tone)
            .justifyContent(FlexAlign.Center)
          }, (frame: FrameSample) => frame.id)
        }
        .width("100%")
      }
      Text(item.reasons.length > 0 ? item.reasons[0] : "")
        .fontSize(13)
        .fontColor("#3E3A36")
        .lineHeight(19)
    }
    .width("100%")
    .padding(10)
    .borderRadius(12)
    .backgroundColor("#FFFCF7")
    .alignItems(HorizontalAlign.Start)
  }
}
