export type Checkbox = { id: string; label: string };

export type Profile = {
  id: string;
  username: string;
  created_at: string;
  started_at: string;
};

export type UserSettings = {
  user_id: string;
  final_goal: string | null;
  selected_checkboxes: string[];
  available_checkboxes: Checkbox[];
  updated_at: string;
};

export type DailyChecks = {
  id: string;
  user_id: string;
  check_date: string; // 'YYYY-MM-DD'
  checks: Record<string, boolean>;
  coins_earned: number;
  created_at: string;
};

export type WeeklyGoal = {
  id: string;
  user_id: string;
  week_start_date: string;
  goal_text: string | null;
  progress_text: string | null;
  achieved: boolean;
  coins_earned: number;
  created_at: string;
};

export type MonthlyStats = {
  id: string;
  user_id: string;
  year_month: string; // 'YYYY-MM'
  post_count: number;
  revenue_jpy: number;
  follower_count: number | null;
  pv_count: number | null;
  other_notes: string | null;
  created_at: string;
};

export type CoinBalance = {
  user_id: string;
  current_coins: number;
  total_earned: number;
  total_spent: number;
  updated_at: string;
};

export type CoinTransaction = {
  id: string;
  user_id: string;
  amount: number;
  reason: "daily_check" | "weekly_goal" | "monthly_stats";
  reference_id: string;
  created_at: string;
  updated_at: string;
};
