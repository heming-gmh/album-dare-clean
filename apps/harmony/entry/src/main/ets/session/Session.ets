import { mediaLibraryFor, visionFor } from "../adapter/EngineAdapter";
import { classifyAssets, compilePolicy, MIN_HOLD_MS } from "../core/LocalEngine";
import { MediaRow, PersonRow, PolarityCard, RecycleRow, VisionObservation } from "../model/Rows";

@Observed
export class Session {
  useDemoFixture: boolean = true;
  people: PersonRow[] = [];
  templateText: string = "保留有妈妈的；保留有爸爸的；保留有小朋友的";
  cards: PolarityCard[] = [];
  summary: string = "";
  executableDelete: boolean = false;
  blockReason: string = "";
  keepItems: MediaRow[] = [];
  uncertainItems: MediaRow[] = [];
  deleteItems: MediaRow[] = [];
  selectedIds: string[] = [];
  recycle: RecycleRow[] = [];
  notice: string = "";

  prepareFixture(): void {
    const mom = new PersonRow();
    mom.id = "mom";
    mom.displayName = "妈妈";
    mom.sampleCount = 3;
    const dad = new PersonRow();
    dad.id = "dad";
    dad.displayName = "爸爸";
    dad.sampleCount = 3;
    const child = new PersonRow();
    child.id = "child";
    child.displayName = "小朋友";
    child.sampleCount = 3;
    const next: PersonRow[] = [];
    next.push(mom);
    next.push(dad);
    next.push(child);
    this.people = next;
    this.templateText = "保留有妈妈的；保留有爸爸的；保留有小朋友的";
    this.cards = [];
    this.notice = "已填入三位家人，每人 3 张内置样例。";
  }

  readyCount(): number {
    let count = 0;
    for (let index = 0; index < this.people.length; index++) {
      if (this.people[index].ready()) {
        count++;
      }
    }
    return count;
  }

  addPerson(name: string): void {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      this.notice = "先写一个称呼。";
      return;
    }
    const person = new PersonRow();
    person.id = "person-" + Date.now().toString();
    person.displayName = trimmed;
    person.sampleCount = 0;
    const next: PersonRow[] = [];
    for (let index = 0; index < this.people.length; index++) {
      next.push(this.people[index]);
    }
    next.push(person);
    this.people = next;
    this.notice = "已添加" + trimmed + "。还需要 3 张样例。";
  }

  addSample(personId: string): void {
    const next: PersonRow[] = [];
    for (let index = 0; index < this.people.length; index++) {
      const person = this.people[index];
      if (person.id === personId && person.sampleCount < 3) {
        person.sampleCount = person.sampleCount + 1;
      }
      next.push(person);
    }
    this.people = next;
  }

  removePerson(personId: string): void {
    const next: PersonRow[] = [];
    for (let index = 0; index < this.people.length; index++) {
      if (this.people[index].id !== personId) {
        next.push(this.people[index]);
      }
    }
    this.people = next;
    const cards: PolarityCard[] = [];
    for (let index = 0; index < this.cards.length; index++) {
      let stillThere = false;
      for (let personIndex = 0; personIndex < next.length; personIndex++) {
        if (next[personIndex].displayName === this.cards[index].personName) {
          stillThere = true;
        }
      }
      if (stillThere) {
        cards.push(this.cards[index]);
      }
    }
    this.cards = cards;
  }

  setCard(personName: string, polarity: string): void {
    const next: PolarityCard[] = [];
    let found = false;
    for (let index = 0; index < this.cards.length; index++) {
      const card = this.cards[index];
      if (card.personName === personName) {
        card.polarity = polarity;
        found = true;
      }
      next.push(card);
    }
    if (!found) {
      const card = new PolarityCard();
      card.id = "card-" + personName;
      card.personName = personName;
      card.polarity = polarity;
      next.push(card);
    }
    this.cards = next;
  }

  cardPolarity(personName: string): string {
    for (let index = 0; index < this.cards.length; index++) {
      if (this.cards[index].personName === personName) {
        return this.cards[index].polarity;
      }
    }
    return "";
  }

  compile(): void {
    const library = mediaLibraryFor(this.useDemoFixture);
    const vision = visionFor(this.useDemoFixture);
    const assets = library.listSample(10);
    const observations: VisionObservation[] = [];
    for (let index = 0; index < assets.length; index++) {
      observations.push(vision.observe(assets[index].mediaId));
    }
    if (!this.useDemoFixture) {
      this.executableDelete = false;
      this.blockReason = "本机图库还没接通。不会猜测哪些可以移出。";
      this.summary = this.blockReason;
      this.keepItems = [];
      this.uncertainItems = [];
      this.deleteItems = [];
      this.selectedIds = [];
      this.notice = this.blockReason;
      return;
    }
    const policy = compilePolicy(this.templateText, this.cards, this.people);
    const scan = classifyAssets(policy, assets, observations);
    this.executableDelete = policy.executableDelete;
    this.blockReason = policy.blockReason;
    this.summary = policy.summary;
    this.keepItems = scan.keep;
    this.uncertainItems = scan.uncertain;
    this.deleteItems = scan.deleteCand;
    this.selectedIds = [];
    this.notice = policy.executableDelete ? "分组建议已更新。" : policy.blockReason;
  }

  isSelected(mediaId: string): boolean {
    for (let index = 0; index < this.selectedIds.length; index++) {
      if (this.selectedIds[index] === mediaId) {
        return true;
      }
    }
    return false;
  }

  toggleSelect(mediaId: string, checked: boolean): void {
    const next: string[] = [];
    for (let index = 0; index < this.selectedIds.length; index++) {
      if (this.selectedIds[index] !== mediaId) {
        next.push(this.selectedIds[index]);
      }
    }
    if (checked) {
      next.push(mediaId);
    }
    this.selectedIds = next;
  }

  selectedCount(): number {
    return this.selectedIds.length;
  }

  confirmHold(nowMs: number): string {
    const chosen: MediaRow[] = [];
    for (let index = 0; index < this.deleteItems.length; index++) {
      if (this.isSelected(this.deleteItems[index].mediaId)) {
        chosen.push(this.deleteItems[index]);
      }
    }
    if (chosen.length === 0) {
      this.notice = "先勾选要移出的项目。";
      return this.notice;
    }
    const next: RecycleRow[] = [];
    for (let index = 0; index < this.recycle.length; index++) {
      next.push(this.recycle[index]);
    }
    for (let index = 0; index < chosen.length; index++) {
      const item = chosen[index];
      let already = false;
      for (let heldIndex = 0; heldIndex < next.length; heldIndex++) {
        if (next[heldIndex].mediaId === item.mediaId && next[heldIndex].status === "held") {
          already = true;
        }
      }
      if (already) {
        continue;
      }
      const row = new RecycleRow();
      row.id = "hold-" + item.mediaId + "-" + nowMs.toString();
      row.mediaId = item.mediaId;
      row.title = item.title;
      row.kind = item.kind;
      row.heldAtMs = nowMs;
      row.earliestReleaseAtMs = nowMs + MIN_HOLD_MS;
      row.status = "held";
      next.push(row);
    }
    this.recycle = next;
    this.selectedIds = [];
    this.notice = "已放进回收站。未满 30 天不会清除，也可以随时恢复。";
    return this.notice;
  }

  restore(entryId: string, nowMs: number): void {
    const next: RecycleRow[] = [];
    for (let index = 0; index < this.recycle.length; index++) {
      const row = this.recycle[index];
      if (row.id === entryId && row.status === "held") {
        row.status = "restored";
        row.restoredAtMs = nowMs;
      }
      next.push(row);
    }
    this.recycle = next;
    this.notice = "已恢复。这项不再留在回收站里。";
  }

  heldCount(): number {
    let count = 0;
    for (let index = 0; index < this.recycle.length; index++) {
      if (this.recycle[index].status === "held") {
        count++;
      }
    }
    return count;
  }
}

export const session: Session = new Session();

AppStorage.setOrCreate("albumSession", session);
