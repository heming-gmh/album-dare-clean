import { router } from '@kit.ArkUI';
import { PageHeader } from '../components/PageHeader';
import { Session } from '../session/Session';

@Entry
@Component
struct Index {
  @StorageLink("albumSession") session: Session = new Session();

  build() {
    Scroll() {
      Column({ space: 16 }) {
        PageHeader({ title: "智能整理", showBack: false })
        Text("分组建议")
          .fontSize(16)
          .fontColor("#8A5A00")
        Text("把一小部分照片和视频分成「我在乎的」「不确定」和「建议移出图库」。原片留在这台设备上。")
          .fontSize(15)
          .fontColor("#4E4944")
          .lineHeight(22)
        Column({ space: 8 }) {
          Row() {
            Column() {
              Text(this.session.useDemoFixture ? "演示样例" : "本机图库")
                .fontSize(16)
                .fontColor("#1F1A17")
              Text(this.session.useDemoFixture ? "用内置样例走完分组，不读取真实相册。" : "本机读取尚未接通，不会猜测可以移出的内容。")
                .fontSize(13)
                .fontColor("#6B645C")
                .margin({ top: 4 })
            }
            .layoutWeight(1)
            .alignItems(HorizontalAlign.Start)
            Toggle({ type: ToggleType.Switch, isOn: this.session.useDemoFixture })
              .selectedColor("#8A5A00")
              .onChange((isOn: boolean) => {
                this.session.useDemoFixture = isOn;
              })
          }
          .width("100%")
        }
        .width("100%")
        .padding(16)
        .borderRadius(16)
        .backgroundColor("#FFFCF7")

        Button("建立家人花名册")
          .width("100%")
          .height(48)
          .fontSize(16)
          .backgroundColor("#8A5A00")
          .onClick(() => {
            if (this.session.people.length === 0) {
              this.session.prepareFixture();
            }
            router.pushUrl({ url: "pages/OnboardingPage" });
          })
        Button("查看回收站")
          .width("100%")
          .height(48)
          .fontSize(16)
          .backgroundColor("#E7E0D6")
          .fontColor("#1F1A17")
          .onClick(() => {
            router.pushUrl({ url: "pages/RecyclePage" });
          })
        Text("不会在午夜自动移出。移出只发生在你勾选并确认之后，而且先进入回收站。")
          .fontSize(13)
          .fontColor("#6B645C")
          .lineHeight(20)
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
}
