/**
 * メンターのセリフ定義。
 *
 * トーン原則(必ず守る):
 *   - ですます調、丁寧
 *   - 過度な励ましは禁止(「すごい!」「がんばって!」は使わない)
 *   - 機械的にならないよう、語尾に「〜ね」「〜よ」を時々混ぜる
 *   - 数字が動かない時期の人にも刺さらない優しさ
 *   - ビルの受付の女性が、忙しすぎず暇でもなく、
 *     ちょうどよく目を合わせてくれる距離感
 *
 * 編集方法:
 *   - 同じ trigger に複数行追加可能(weight 付き重み付きランダムで選ばれる)
 *   - 新しい trigger を追加する場合は MentorTrigger 型にも追加してください
 *   - 編集後は型チェックで未知 trigger を検出できます
 */

export type MentorTrigger =
  | "first_login"
  | "daily_return"
  | "check_one_done"
  | "check_all_done"
  | "milestone_day7"
  | "milestone_day30"
  | "milestone_day90"
  | "milestone_day180"
  | "milestone_day270"
  | "milestone_day365"
  | "weekly_achieved"
  | "monthly_done"
  | "monthly_overdue"
  | "long_absence";

export type MentorMessage = {
  id: string;
  trigger: MentorTrigger;
  weight?: number; // default 1
  text: string;
};

export const mentorMessages: MentorMessage[] = [
  // ---- 初回 ----
  {
    id: "welcome-first",
    trigger: "first_login",
    text: "ようこそ。今日から一緒に街を育てていきましょう",
  },

  // ---- 日常の戻り ----
  {
    id: "daily-return-a",
    trigger: "daily_return",
    text: "おかえりなさい。今日も少しだけ進めましょうか",
  },
  {
    id: "daily-return-b",
    trigger: "daily_return",
    text: "こんにちは。よくいらっしゃいましたね",
  },

  // ---- チェック完了系 ----
  {
    id: "check-one",
    trigger: "check_one_done",
    text: "いいですね、一歩進みましたよ",
  },
  {
    id: "check-all",
    trigger: "check_all_done",
    text: "今日のノルマ達成です。お疲れ様でした",
  },

  // ---- マイルストーン ----
  {
    id: "milestone-7",
    trigger: "milestone_day7",
    text: "1週間、よく続けられましたね。ささやかですが、住人がひとり訪れました",
  },
  {
    id: "milestone-30",
    trigger: "milestone_day30",
    text: "30日です。街が時代を進めましたよ",
  },
  {
    id: "milestone-90",
    trigger: "milestone_day90",
    text: "3ヶ月。ここまで来る人はそう多くないですよ",
  },
  {
    id: "milestone-180",
    trigger: "milestone_day180",
    text: "半年。立派なものです",
  },
  {
    id: "milestone-270",
    trigger: "milestone_day270",
    text: "9ヶ月目。あと少しで卒業ですね",
  },
  {
    id: "milestone-365",
    trigger: "milestone_day365",
    text: "1年、お疲れ様でした。ここから先は、あなたのペースで",
  },

  // ---- 週次/月次 ----
  {
    id: "weekly-achieved",
    trigger: "weekly_achieved",
    text: "今週もきっちり進められましたね",
  },
  {
    id: "monthly-done",
    trigger: "monthly_done",
    text: "今月の記録、確かに受け取りました",
  },
  {
    id: "monthly-overdue",
    trigger: "monthly_overdue",
    text: "先月の成果、少しだけ振り返ってみませんか",
  },

  // ---- 長期不在 ----
  {
    id: "long-absence",
    trigger: "long_absence",
    text: "お帰りなさい。街はちゃんとここで待っていましたよ",
  },
];
