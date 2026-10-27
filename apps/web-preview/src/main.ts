import {
  MIN_HOLD_DAYS,
  classifyAll,
  compileIntent,
  createRoster,
  demoEvidence,
  demoRoster,
  emptyRecycleBin,
  hold,
  restore,
  type Bucket,
  type ClassifiedMedia,
  type FamilyRoster,
  type NewRosterPerson,
  type PolicyAST,
  type RecycleBin,
  type ScanResult,
} from "../../../packages/core/src/index.js";

const DEFAULT_TEMPLATE = "保留有妈妈的；保留有爸爸的；保留有小朋友的";

interface State {
  showCousin: boolean;
  mentionCousin: boolean;
  template: string;
  selected: Set<string>;
  bin: RecycleBin;
  notice: string;
}

const state: State = {
  showCousin: false,
  mentionCousin: false,
  template: DEFAULT_TEMPLATE,
  selected: new Set<string>(),
  bin: emptyRecycleBin(),
  notice: "已填入三位家人，每人 3 张内置样例。",
};

interface Compiled {
  roster: FamilyRoster;
  policy: PolicyAST;
  scan: ScanResult;
}

function rosterNow(): FamilyRoster {
  const base: NewRosterPerson[] = demoRoster().people.map((person) => ({
    id: person.id,
    displayName: person.displayName,
    aliases: [...person.aliases],
    prototypes: person.prototypes,
  }));
  if (state.showCousin) {
    base.push({ id: "cousin", displayName: "表姐", aliases: [], prototypes: [] });
  }
  return createRoster(base);
}

function templateNow(): string {
  if (!state.mentionCousin) return state.template;
  return `${state.template}；保留有表姐的`;
}

function compile(): Compiled {
  const roster = rosterNow();
  const policy = compileIntent({ templates: [templateNow()], cards: [], roster });
  const scan = classifyAll(policy, demoEvidence(roster));
  const allowed = new Set(scan.deleteCand.map((row) => row.evidence.mediaId));
  for (const id of [...state.selected]) {
    if (!allowed.has(id)) state.selected.delete(id);
  }
  return { roster, policy, scan };
}

let current: Compiled = compile();

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function kindLabel(row: ClassifiedMedia): string {
  return row.evidence.kind === "video" ? "视频" : "照片";
}

function ymd(iso: string): string {
  return iso.slice(0, 10);
}

function bucketTitle(bucket: Bucket): string {
  if (bucket === "keep") return "我在乎的";
  if (bucket === "uncertain") return "不确定";
  return "建议移出图库";
}

function bucketCaption(bucket: Bucket): string {
  if (bucket === "keep") return "认出了你在乎的人，会留下。视频排在前面。";
  if (bucket === "uncertain") return "这些不会并进「建议移出图库」。先别移出。";
  return "只是分组建议。勾选并确认后才会进入回收站。";
}

function scopeLabel(policy: PolicyAST): string {
  if (policy.scope.media === "video") return "只看视频";
  if (policy.scope.media === "photo") return "只看照片";
  return "照片和视频";
}

function frameStrip(row: ClassifiedMedia): string {
  if (row.evidence.keyframes.length === 0) return "";
  const frames = row.evidence.keyframes
    .map(
      (frame, index) =>
        `<div class="frame" style="background:${esc(frame.tone)}">${esc(frame.label || `关键帧 ${index + 1}`)}</div>`,
    )
    .join("");
  return `<div class="frames">${frames}</div>`;
}

function heldEntry(mediaId: string) {
  return state.bin.entries.find((entry) => entry.mediaId === mediaId && entry.status === "held");
}

function mediaRow(row: ClassifiedMedia, bucket: Bucket): string {
  const id = esc(row.evidence.mediaId);
  const held = heldEntry(row.evidence.mediaId);
  const checked = state.selected.has(row.evidence.mediaId) ? " checked" : "";
  let box = "";
  if (bucket === "delete_cand") {
    box = held
      ? `<span class="pill held">已在回收站</span>`
      : `<input type="checkbox" data-media="${id}" aria-label="选中 ${esc(row.evidence.title)}"${checked} />`;
  }
  const reason = row.decision.reasons[0] ?? "";
  return `
    <div class="media">
      ${box}
      <div class="body">
        <div class="title">${esc(row.evidence.title)}</div>
        <div class="kind">${kindLabel(row)}</div>
        ${frameStrip(row)}
        <div class="reason">${esc(reason)}</div>
      </div>
      <div class="rule-tag">${esc(row.decision.rule)}</div>
    </div>`;
}

function bucket(bucketId: Bucket, rows: ClassifiedMedia[]): string {
  const badge = bucketId === "uncertain" ? `<span class="badge">先不要移出</span>` : "";
  const body =
    rows.length === 0
      ? `<div class="empty">这一组是空的</div>`
      : rows.map((row) => mediaRow(row, bucketId)).join("");
  return `
    <div class="bucket ${bucketId === "delete_cand" ? "delete" : bucketId}">
      <h3>${bucketTitle(bucketId)}${badge}</h3>
      <div class="cap">${bucketCaption(bucketId)}</div>
      ${body}
    </div>`;
}

function personRow(person: FamilyRoster["people"][number]): string {
  const ready = person.status === "ready";
  const pill = ready ? "能参与建议" : `还差 ${3 - person.prototypes.length} 张样例`;
  return `
    <div class="person">
      <span class="name">${esc(person.displayName)}</span>
      <span class="meta">${person.prototypes.length} 张内置样例</span>
      <span class="pill ${ready ? "ready" : "incomplete"}">${esc(pill)}</span>
    </div>`;
}

function rulesPanel(policy: PolicyAST): string {
  const unresolved = policy.unresolvedPersons.length > 0 ? policy.unresolvedPersons.join("、") : "无";
  const executable = policy.executableDelete ? "可以给出建议" : "不会建议移出";
  const eps = policy.thresholds.epsilon;
  const tau = policy.thresholds.tau;
  return `
    <div class="rules">
      <div class="rule"><b>这次范围</b>${scopeLabel(policy)}${policy.videoFirst ? " · 视频优先" : ""}</div>
      <div class="rule"><b>移出建议</b>${executable}</div>
      <div class="rule"><b>没建档的人</b>${esc(unresolved)}</div>
      <div class="rule"><b>阈值</b>ε ${eps} / τ ${tau}</div>
    </div>`;
}

function recyclePanel(): string {
  if (state.bin.entries.length === 0) {
    return `<div class="empty">回收站是空的。勾选「建议移出图库」里的项目，再确认放进回收站。</div>`;
  }
  return state.bin.entries
    .map((entry) => {
      const restoredRow = entry.status === "restored";
      const stamp = restoredRow
        ? `已恢复${entry.restoredAt ? ` · ${ymd(entry.restoredAt)}` : ""}`
        : `放入时间 ${ymd(entry.heldAt)} · 最早 ${ymd(entry.earliestReleaseAt)} 才能再处理`;
      const action = restoredRow
        ? ""
        : `<button class="ghost" data-restore="${esc(entry.id)}">恢复</button>`;
      return `
        <div class="recycle-item${restoredRow ? " restored" : ""}">
          <div>
            <div class="title">${esc(entry.title)}</div>
            <div class="stamp">${esc(stamp)}</div>
          </div>
          ${action}
        </div>`;
    })
    .join("");
}

function summaryLine(policy: PolicyAST): string {
  if (!policy.executableDelete) {
    return policy.blockReason ?? "这次不会建议移出图库。";
  }
  return `这次认出 ${policy.keep.length} 位在乎的人，建议移出 ${current.scan.deleteCand.length} 项。`;
}

function render(): void {
  const { roster, policy, scan } = current;
  const app = document.getElementById("app");
  if (!app) return;
  const selectedCount = state.selected.size;

  app.innerHTML = `
    <section>
      <h2>家人花名册</h2>
      <p class="hint">每人至少 3 张样例才算建档完成。没建完的人出现在句子里时，本次不会建议移出图库。</p>
      <div class="row">${roster.people.map(personRow).join("")}</div>
      <div class="row" style="margin-top:12px">
        <label class="toggle"><input type="checkbox" id="show-cousin"${state.showCousin ? " checked" : ""} /> 花名册里加上「表姐」（0 张样例）</label>
        <label class="toggle"><input type="checkbox" id="mention-cousin"${state.mentionCousin ? " checked" : ""} /> 句子里提到「表姐」</label>
      </div>
    </section>

    <section>
      <h2>这次怎么整理</h2>
      <p class="hint">轨 A：模板句或人物卡片。多句用「；」分开。看不懂的句子不会变成全部可删。</p>
      <textarea id="template" spellcheck="false">${esc(state.template)}</textarea>
      <div class="row" style="margin-top:10px">
        <button class="primary" id="compile">生成分组建议</button>
        <button class="ghost" id="reset">恢复默认句子</button>
        <span class="notice" id="notice">${esc(state.notice)}</span>
      </div>
      ${rulesPanel(policy)}
    </section>

    <section>
      <h2>分组建议</h2>
      <p class="hint">智能整理只给建议：同一条媒体只出现在一桶里。</p>
      <p class="notice">${esc(summaryLine(policy))}</p>
      ${bucket("keep", scan.keep)}
      ${bucket("uncertain", scan.uncertain)}
      ${bucket("delete_cand", scan.deleteCand)}
      <div class="row" style="margin-top:14px">
        <button class="primary" id="hold"${selectedCount > 0 ? "" : " disabled"}>放进回收站（已选 ${selectedCount} 项）</button>
      </div>
    </section>

    <section>
      <h2>回收站</h2>
      <p class="hint">只进应用自己的回收站。至少 ${MIN_HOLD_DAYS} 天，没有定时清除，也没有永久删除按钮。</p>
      ${recyclePanel()}
      <div class="notice" id="notice-bin"></div>
    </section>`;

  bind();
}

function bind(): void {
  const compileButton = document.getElementById("compile");
  compileButton?.addEventListener("click", () => {
    const box = document.getElementById("template");
    if (box instanceof HTMLTextAreaElement) state.template = box.value;
    current = compile();
    state.notice = "分组建议已更新。";
    render();
  });

  document.getElementById("reset")?.addEventListener("click", () => {
    state.template = DEFAULT_TEMPLATE;
    current = compile();
    state.notice = "已恢复默认句子。";
    render();
  });

  document.querySelectorAll<HTMLInputElement>("input[data-media]").forEach((box) => {
    box.addEventListener("change", () => {
      const mediaId = box.dataset.media;
      if (!mediaId) return;
      if (box.checked) state.selected.add(mediaId);
      else state.selected.delete(mediaId);
      render();
    });
  });

  document.getElementById("hold")?.addEventListener("click", () => {
    const requests = current.scan.deleteCand
      .filter((row) => state.selected.has(row.evidence.mediaId))
      .map((row) => ({
        mediaId: row.evidence.mediaId,
        title: row.evidence.title,
        kind: row.evidence.kind,
        userConfirmed: true,
      }));
    if (requests.length === 0) {
      state.notice = "先勾选要移出的项目。";
      render();
      return;
    }
    state.bin = hold(state.bin, requests, new Date());
    state.selected.clear();
    state.notice = "已放进回收站。未满 30 天不会清除，也可以随时恢复。";
    render();
    const binNotice = document.getElementById("notice-bin");
    if (binNotice) binNotice.textContent = state.notice;
  });

  document.querySelectorAll<HTMLElement>("[data-restore]").forEach((button) => {
    button.addEventListener("click", () => {
      const entryId = button.dataset.restore;
      if (!entryId) return;
      state.bin = restore(state.bin, entryId, new Date());
      state.notice = "已恢复。这项不再留在回收站里。";
      render();
    });
  });

  const cousin = document.getElementById("show-cousin");
  if (cousin instanceof HTMLInputElement) {
    cousin.addEventListener("change", () => {
      state.showCousin = cousin.checked;
      state.notice = state.showCousin ? "表姐还没有样例，本次不会建议移出图库。" : "花名册已回到三位家人。";
      current = compile();
      render();
    });
  }

  const mention = document.getElementById("mention-cousin");
  if (mention instanceof HTMLInputElement) {
    mention.addEventListener("change", () => {
      state.mentionCousin = mention.checked;
      state.notice = state.mentionCousin ? "句子里出现了没建档的人。" : "句子里不再提到表姐。";
      current = compile();
      render();
    });
  }
}

render();
