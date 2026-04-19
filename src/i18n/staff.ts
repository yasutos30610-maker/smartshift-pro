export type Lang = "ja" | "en";

const dict = {
  // ── Login ──
  staffPortal:          { ja: "スタッフポータル",          en: "Staff Portal" },
  store:                { ja: "店舗",                      en: "Store" },
  pleaseSelect:         { ja: "選択してください",           en: "Please select" },
  name:                 { ja: "名前",                      en: "Name" },
  password:             { ja: "パスワード",                 en: "Password" },
  passwordPlaceholder:  { ja: "パスワードを入力",           en: "Enter password" },
  login:                { ja: "ログイン",                   en: "Log in" },
  logout:               { ja: "ログアウト",                 en: "Log out" },
  loading:              { ja: "読み込み中...",              en: "Loading..." },
  noStoreData:          { ja: "店舗データが見つかりません", en: "No store data found" },
  contactAdmin:         { ja: "管理者にお問い合わせください", en: "Please contact your administrator" },
  noPassSet:            { ja: "PASSが設定されていません。管理者に設定を依頼してください", en: "No password set. Please ask your administrator." },
  wrongPass:            { ja: "パスワードが違います",       en: "Incorrect password" },

  // ── Tabs ──
  tabSubmit:            { ja: "シフト提出",                en: "Shift Request" },
  tabDaily:             { ja: "シフト(Daily)",             en: "Schedule (Daily)" },
  tabWeekly:            { ja: "シフト(Weekly)",            en: "Schedule (Weekly)" },

  // ── SubmitTab ──
  targetMonth:          { ja: "対象月",                    en: "Month" },
  submitted:            { ja: "提出済み",                  en: "Submitted" },
  resubmitted:          { ja: "再申請済み",                en: "Resubmitted" },
  reflected:            { ja: "反映済み",                  en: "Reflected" },
  pending:              { ja: "確認中",                    en: "Pending" },
  existingDays:         { ja: (n: number) => `既存の${n}日に上書き追加されます`, en: (n: number) => `Will be added to existing ${n} days` },
  addOrChange:          { ja: "新しい日付を追加、または変更したい日を入力して再申請すると", en: "Add new dates or edit existing ones to resubmit." },
  daysSelected:         { ja: (n: number) => `${n}日 選択中`, en: (n: number) => `${n} day${n !== 1 ? "s" : ""} selected` },
  sendShift:            { ja: "シフト希望を送信",           en: "Submit Request" },
  resubmit:             { ja: "再申請する",                en: "Resubmit" },
  sending:              { ja: "送信中...",                  en: "Sending..." },
  dayOff:               { ja: "公休",                      en: "Off" },
  sentTitle:            { ja: "送信完了！",                en: "Sent!" },
  resubmitTitle:        { ja: "再申請完了！",              en: "Resubmitted!" },
  enterAgain:           { ja: "もう一度入力する",           en: "Enter again" },
  sentMsg:              { ja: (y: number, m: number, resub: boolean) => `${y}年${m}月のシフト希望を${resub ? "再申請" : "送信"}しました。\n管理者が確認後に反映されます。`, en: (y: number, m: number, resub: boolean) => `Your shift request for ${y}/${m} has been ${resub ? "resubmitted" : "sent"}.\nIt will be reflected after admin review.` },
  inheritedMsg:         { ja: "前回分を引き継いで上書き提出しました", en: "Submitted with previous data carried over" },
  noShiftError:         { ja: "希望シフトを1日以上入力してください", en: "Please enter at least 1 shift day" },
  sendFailed:           { ja: "送信に失敗しました。もう一度お試しください", en: "Failed to send. Please try again." },
  prevSubmit:           { ja: (d: string) => `${d}提出`, en: (d: string) => `Submitted ${d}` },
  blueNote:             { ja: "提出分 ▶ 青字", en: "prev. submission ▶ blue" },
  weekLabel:            { ja: (m: number, day: number) => `${m}/${day}〜`, en: (m: number, day: number) => `${m}/${day}–` },
  periodLabel:          { ja: (w: number, s: string, e: string) => `第${w}週: ${s} 〜 ${e}`, en: (w: number, s: string, e: string) => `W${w}: ${s} – ${e}` },
  daysCount:            { ja: (n: number) => `${n}日間`, en: (n: number) => `${n} day${n !== 1 ? "s" : ""}` },

  // ── DailyView ──
  notPublished:         { ja: "まだシフトが発表されていません", en: "Schedule not published yet" },
  notPublishedSub:      { ja: "管理者がシフトを確定後、ここに表示されます", en: "Will be shown after the manager confirms the schedule" },
  confirmed:            { ja: "確定済み", en: "Confirmed" },
  noShift:              { ja: "シフトなし", en: "No shifts" },
  weekNotConfirmed:     { ja: "この週は未確定です", en: "This week is not confirmed" },
  staffCount:           { ja: (n: number) => `${n}名`, en: (n: number) => `${n} staff` },

  // ── WeeklyView ──
  staffCol:             { ja: "スタッフ", en: "Staff" },
  total:                { ja: "合計",     en: "Total" },
  offDay:               { ja: "公休",     en: "Off" },
  confirmedBadge:       { ja: "確定",     en: "✓" },
} as const;

type DictKey = keyof typeof dict;
type DictValue<K extends DictKey> = typeof dict[K];

export function useT(lang: Lang) {
  return function t<K extends DictKey>(
    key: K,
    ...args: DictValue<K>[Lang] extends (...a: infer A) => string ? A : []
  ): string {
    const val = dict[key][lang] as ((...a: unknown[]) => string) | string;
    if (typeof val === "function") return (val as (...a: unknown[]) => string)(...args);
    return val as string;
  };
}
