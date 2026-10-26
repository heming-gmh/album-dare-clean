import { router } from '@kit.ArkUI';
import { PageHeader } from '../components/PageHeader';
import { PersonRow } from '../model/Rows';
import { Session } from '../session/Session';

@Entry
@Component
struct IntentPage {
  @StorageLink("albumSession") session: Session = new Session();

  build() {
    Scroll() {
      Column({ space: 14 }) {
        PageHeader({ title: "分组建议" })
        Text("用一句模板，或给每个人一张卡片。没建档的人写进来之后，这次不会出现「建议移出图库」。")
          .fontSize(14)
          .fontColor("#4E4944")
          .lineHeight(21)
        Text("模板")
          .fontSize(16)
          .fontColor("#1F1A17")
        TextArea({ text: this.session.templateText, placeholder: "例如：保留有妈妈的；只看视频" })
          .width("100%")
          .height(120)
          .fontSize(15)
          .backgroundColor("#FFFFFF")
          .onChange((value: string) => {
            this.session.templateText = value;
          })

        Text("人物卡片")
          .fontSize(16)
          .fontColor("#1F1A17")
        ForEach(this.session.people, (person: PersonRow) => {
          this.cardRow(person)
        }, (person: PersonRow) => "card-" + person.id)

        if (this.session.summary.length > 0) {
          Text(this.session.summary)
            .fontSize(14)
            .fontColor(this.session.executableDelete ? "#2F6B45" : "#8A5A00")
            .lineHeight(21)
        }
        Button("生成分组建议")
          .width("100%")
          .height(48)
          .backgroundColor("#8A5A00")
          .onClick(() => {
            this.session.compile();
            router.pushUrl({ url: "pages/ResultsPage" });
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
  cardRow(person: PersonRow) {
    Column({ space: 8 }) {
      Text(person.displayName + (person.ready() ? "" : " · 样例不足"))
        .fontSize(16)
        .fontColor("#1F1A17")
      Row({ space: 8 }) {
        Button("在乎")
          .height(36)
          .fontSize(14)
          .backgroundColor(this.session.cardPolarity(person.displayName) === "keep" ? "#2F6B45" : "#E7E0D6")
          .fontColor(this.session.cardPolarity(person.displayName) === "keep" ? "#FFFFFF" : "#1F1A17")
          .onClick(() => {
            this.session.setCard(person.displayName, "keep");
          })
        Button("缺席可建议移出")
          .height(36)
          .fontSize(14)
          .backgroundColor(this.session.cardPolarity(person.displayName) === "suggest_remove" ? "#8A5A00" : "#E7E0D6")
          .fontColor(this.session.cardPolarity(person.displayName) === "suggest_remove" ? "#FFFFFF" : "#1F1A17")
          .onClick(() => {
            this.session.setCard(person.displayName, "suggest_remove");
          })
      }
    }
    .width("100%")
    .padding(14)
    .borderRadius(16)
    .backgroundColor("#FFFCF7")
    .alignItems(HorizontalAlign.Start)
  }
}
