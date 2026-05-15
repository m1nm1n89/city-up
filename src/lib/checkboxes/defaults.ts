export type Checkbox = {
  id: string;
  label: string;
};

/** デフォルトの10候補(サインアップ時にプリセットされる) */
export const DEFAULT_CHECKBOXES: readonly Checkbox[] = [
  { id: "x_post",      label: "Xに投稿した" },
  { id: "note_write",  label: "noteを執筆した" },
  { id: "blog_post",   label: "ブログ記事を書いた" },
  { id: "youtube",     label: "YouTube動画を撮影/編集した" },
  { id: "code",        label: "Webアプリのコードを書いた" },
  { id: "research",    label: "競合・参考記事をリサーチした" },
  { id: "learn",       label: "副業に関する本/教材を学んだ" },
  { id: "kpi",         label: "数字(KPI)を確認した" },
  { id: "monetize",    label: "アフィリ提携/収益化の作業をした" },
  { id: "ideation",    label: "アイデア出し・企画を考えた" },
];

/** サインアップ直後にデフォルトで選ばれる3つ(上位3つ) */
export const DEFAULT_SELECTED_IDS: readonly string[] = ["x_post", "note_write", "blog_post"];
