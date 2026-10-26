import { PageHeader } from '../components/PageHeader';
import { formatDay } from '../core/LocalEngine';
import { RecycleRow } from '../model/Rows';
import { Session } from '../session/Session';

@Entry
@Component
struct RecyclePage {
  @StorageLink("albumSession") session: Session = new Session();

  build() {
    Scroll() {
      Column({ space: 14 }) {
        PageHeader({ title: "回收站" })
        Text("放进来的项目至少保留 30 天。没有午夜自动移出。恢复会立刻把它从回收站拿回。")
          .fontSize(14)
          .fontColor("#4E4944")
          .lineHeight(21)
        if (this.session.recycle.length === 0) {
          Text("回收站是空的。")
            .fontSize(15)
            .fontColor("#6B645C")
        }
        ForEach(this.session.recycle, (row: RecycleRow) => {
          this.recycleCard(row)
        }, (row: RecycleRow) => row.id + "-" + row.status)

        Text(this.session.notice)
          .fontSize(13)
          .fontColor("#6B645C")
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

  kindLabel(kind: string): string {
    if (kind === "video") {
      return "视频";
    }
    return "照片";
  }

  @Builder
  recycleCard(row: RecycleRow) {
    Column({ space: 6 }) {
      Text(row.title)
        .fontSize(16)
        .fontColor("#1F1A17")
      Text(this.kindLabel(row.kind) + (row.status === "restored" ? " · 已恢复" : " · 仍在回收站"))
        .fontSize(13)
        .fontColor(row.status === "restored" ? "#2F6B45" : "#8A5A00")
      Text("放入 " + formatDay(row.heldAtMs))
        .fontSize(12)
        .fontColor("#6B645C")
      Text("最早可再处理 " + formatDay(row.earliestReleaseAtMs) + "（满 30 天）")
        .fontSize(12)
        .fontColor("#6B645C")
      if (row.status === "held") {
        Button("恢复")
          .width("100%")
          .height(40)
          .backgroundColor("#2F6B45")
          .onClick(() => {
            this.session.restore(row.id, Date.now());
          })
      }
    }
    .width("100%")
    .padding(14)
    .borderRadius(16)
    .backgroundColor(row.status === "restored" ? "#E7F5EC" : "#FFFCF7")
    .alignItems(HorizontalAlign.Start)
  }
}
