import { router } from '@kit.ArkUI';

@Component
export struct PageHeader {
  title: string = "";
  showBack: boolean = true;

  build() {
    Row() {
      if (this.showBack) {
        Text("返回")
          .fontSize(16)
          .fontColor("#8A5A00")
          .onClick(() => {
            router.back();
          })
      }
      Text(this.title)
        .fontSize(22)
        .fontWeight(FontWeight.Medium)
        .fontColor("#1F1A17")
        .margin({ left: this.showBack ? 12 : 0 })
    }
    .width("100%")
    .height(48)
    .alignItems(VerticalAlign.Center)
  }
}
