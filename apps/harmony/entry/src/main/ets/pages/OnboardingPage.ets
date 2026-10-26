import { router } from '@kit.ArkUI';
import { PageHeader } from '../components/PageHeader';
import { PersonRow } from '../model/Rows';
import { Session } from '../session/Session';

@Entry
@Component
struct OnboardingPage {
  @StorageLink("albumSession") session: Session = new Session();
  @State draftName: string = "";

  aboutToAppear(): void {
    if (this.session.people.length === 0) {
      this.session.prepareFixture();
    }
  }

  build() {
    Scroll() {
      Column({ space: 14 }) {
        PageHeader({ title: "家人花名册" })
        Text("建议先留下 2 到 3 位家人。每人至少 3 张样例，样例不足的人不能产生「建议移出图库」。")
          .fontSize(14)
          .fontColor("#4E4944")
          .lineHeight(21)
        Button("填入内置样例")
          .width("100%")
          .height(44)
          .backgroundColor("#E7E0D6")
          .fontColor("#1F1A17")
          .onClick(() => {
            this.session.prepareFixture();
          })

        ForEach(this.session.people, (person: PersonRow) => {
          this.personBlock(person)
        }, (person: PersonRow) => person.id)

        Column({ space: 8 }) {
          Text("添加一位")
            .fontSize(16)
            .fontColor("#1F1A17")
          TextInput({ text: this.draftName, placeholder: "称呼，例如表姐" })
            .width("100%")
            .height(44)
            .backgroundColor("#FFFFFF")
            .onChange((value: string) => {
              this.draftName = value;
            })
          Button("添加")
            .width("100%")
            .height(40)
            .backgroundColor("#8A5A00")
            .onClick(() => {
              this.session.addPerson(this.draftName);
              this.draftName = "";
            })
        }
        .width("100%")
        .padding(14)
        .borderRadius(16)
        .backgroundColor("#FFFCF7")

        Text(this.session.notice)
          .fontSize(13)
          .fontColor("#6B645C")
        Text(this.session.readyCount() >= 2 ? "可以继续写分组建议。" : "至少两位家人、每人 3 张样例后才能继续。")
          .fontSize(13)
          .fontColor(this.session.readyCount() >= 2 ? "#2F6B45" : "#8A5A00")
        Button("下一步")
          .width("100%")
          .height(48)
          .backgroundColor("#8A5A00")
          .enabled(this.session.readyCount() >= 2)
          .onClick(() => {
            router.pushUrl({ url: "pages/IntentPage" });
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

  @Builder
  personBlock(person: PersonRow) {
    Column({ space: 8 }) {
      Row() {
        Text(person.displayName)
          .fontSize(18)
          .fontWeight(FontWeight.Medium)
          .fontColor("#1F1A17")
        Blank()
        Text(person.ready() ? "样例已够" : "样例不足")
          .fontSize(12)
          .fontColor(person.ready() ? "#2F6B45" : "#8A5A00")
      }
      .width("100%")
      Row({ space: 8 }) {
        if (person.sampleCount >= 1) {
          this.sampleChip("样例 1")
        }
        if (person.sampleCount >= 2) {
          this.sampleChip("样例 2")
        }
        if (person.sampleCount >= 3) {
          this.sampleChip("样例 3")
        }
      }
      .width("100%")
      Row({ space: 8 }) {
        Button("加一张样例")
          .height(36)
          .fontSize(14)
          .backgroundColor("#8A5A00")
          .enabled(person.sampleCount < 3)
          .onClick(() => {
            this.session.addSample(person.id);
          })
        Button("移除")
          .height(36)
          .fontSize(14)
          .backgroundColor("#E7E0D6")
          .fontColor("#1F1A17")
          .onClick(() => {
            this.session.removePerson(person.id);
          })
      }
    }
    .width("100%")
    .padding(14)
    .borderRadius(16)
    .backgroundColor("#FFFCF7")
    .alignItems(HorizontalAlign.Start)
  }

  @Builder
  sampleChip(label: string) {
    Text(label)
      .fontSize(12)
      .fontColor("#1F1A17")
      .textAlign(TextAlign.Center)
      .width(72)
      .height(36)
      .borderRadius(8)
      .backgroundColor("#E7D7B8")
  }
}
