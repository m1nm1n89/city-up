-- =============================================================================
-- city-up : initial schema (phase 1)
--
-- Security model:
--   * 全テーブルで RLS を有効化(Default Deny)
--   * anon ロールから全権限を REVOKE(認証必須)
--   * authenticated ロールに SELECT / INSERT / UPDATE のみ付与
--     - DELETE はポリシー未定義 + GRANT もしないため、二重に拒否される
--   * すべてのポリシーで auth.uid() = (自分の user_id) を強制
-- =============================================================================

-- ---------------------------------------------------------------------------
-- profiles
--   auth.users と 1:1。ユーザーネームとリカバリーコードハッシュを持つ。
--   id は auth.users.id への FK。
-- ---------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id                   uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username             text NOT NULL UNIQUE,
  recovery_code_hash   text NOT NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  started_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX profiles_username_idx ON public.profiles (lower(username));

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.profiles FROM PUBLIC;
REVOKE ALL ON public.profiles FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

CREATE POLICY "profiles_self_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "profiles_self_insert" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_self_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- user_settings
--   ユーザーごとの目標とチェックボックス設定。1ユーザー1行。
-- ---------------------------------------------------------------------------
CREATE TABLE public.user_settings (
  user_id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  final_goal           text,
  selected_checkboxes  jsonb NOT NULL DEFAULT '[]'::jsonb,
  available_checkboxes jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_settings FROM PUBLIC;
REVOKE ALL ON public.user_settings FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.user_settings TO authenticated;

CREATE POLICY "user_settings_self_select" ON public.user_settings
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "user_settings_self_insert" ON public.user_settings
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_settings_self_update" ON public.user_settings
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- daily_checks
--   日次のチェック達成記録。1ユーザー × 日付ごとに1行。
-- ---------------------------------------------------------------------------
CREATE TABLE public.daily_checks (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  check_date           date NOT NULL,
  checks               jsonb NOT NULL DEFAULT '{}'::jsonb,
  coins_earned         integer NOT NULL DEFAULT 0,
  created_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, check_date)
);

CREATE INDEX daily_checks_user_date_idx
  ON public.daily_checks (user_id, check_date DESC);

ALTER TABLE public.daily_checks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.daily_checks FROM PUBLIC;
REVOKE ALL ON public.daily_checks FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.daily_checks TO authenticated;

CREATE POLICY "daily_checks_self_select" ON public.daily_checks
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "daily_checks_self_insert" ON public.daily_checks
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "daily_checks_self_update" ON public.daily_checks
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- weekly_goals
--   週次の小目標。1ユーザー × 週の開始日ごとに1行。
-- ---------------------------------------------------------------------------
CREATE TABLE public.weekly_goals (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start_date      date NOT NULL,
  goal_text            text,
  progress_text        text,
  achieved             boolean NOT NULL DEFAULT false,
  coins_earned         integer NOT NULL DEFAULT 0,
  created_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start_date)
);

CREATE INDEX weekly_goals_user_week_idx
  ON public.weekly_goals (user_id, week_start_date DESC);

ALTER TABLE public.weekly_goals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.weekly_goals FROM PUBLIC;
REVOKE ALL ON public.weekly_goals FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.weekly_goals TO authenticated;

CREATE POLICY "weekly_goals_self_select" ON public.weekly_goals
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "weekly_goals_self_insert" ON public.weekly_goals
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "weekly_goals_self_update" ON public.weekly_goals
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- monthly_stats
--   月次の自己申告数値。1ユーザー × 年月ごとに1行。
-- ---------------------------------------------------------------------------
CREATE TABLE public.monthly_stats (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year_month           text NOT NULL CHECK (year_month ~ '^\d{4}-\d{2}$'),
  post_count           integer NOT NULL DEFAULT 0 CHECK (post_count >= 0),
  revenue_jpy          integer NOT NULL DEFAULT 0 CHECK (revenue_jpy >= 0),
  follower_count       integer CHECK (follower_count IS NULL OR follower_count >= 0),
  pv_count             integer CHECK (pv_count IS NULL OR pv_count >= 0),
  other_notes          text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, year_month)
);

CREATE INDEX monthly_stats_user_ym_idx
  ON public.monthly_stats (user_id, year_month DESC);

ALTER TABLE public.monthly_stats ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.monthly_stats FROM PUBLIC;
REVOKE ALL ON public.monthly_stats FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.monthly_stats TO authenticated;

CREATE POLICY "monthly_stats_self_select" ON public.monthly_stats
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "monthly_stats_self_insert" ON public.monthly_stats
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "monthly_stats_self_update" ON public.monthly_stats
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- coin_balance
--   ユーザーごとのコイン残高。1ユーザー1行。
--   ※ クライアントから直接 UPDATE せず、必ず Server Action 経由で更新する想定。
-- ---------------------------------------------------------------------------
CREATE TABLE public.coin_balance (
  user_id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_coins        integer NOT NULL DEFAULT 0 CHECK (current_coins >= 0),
  total_earned         integer NOT NULL DEFAULT 0 CHECK (total_earned >= 0),
  total_spent          integer NOT NULL DEFAULT 0 CHECK (total_spent >= 0),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.coin_balance ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.coin_balance FROM PUBLIC;
REVOKE ALL ON public.coin_balance FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.coin_balance TO authenticated;

CREATE POLICY "coin_balance_self_select" ON public.coin_balance
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "coin_balance_self_insert" ON public.coin_balance
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "coin_balance_self_update" ON public.coin_balance
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- milestone_progress
--   ユーザーごとのマイルストーン進捗。1ユーザー1行。
-- ---------------------------------------------------------------------------
CREATE TABLE public.milestone_progress (
  user_id                  uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_era              text NOT NULL DEFAULT 'primitive'
    CHECK (current_era IN ('primitive','ancient','medieval','modern','contemporary','future')),
  days_acceleration_used   integer NOT NULL DEFAULT 0 CHECK (days_acceleration_used >= 0),
  next_milestone_day       integer NOT NULL DEFAULT 1 CHECK (next_milestone_day >= 0),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.milestone_progress ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.milestone_progress FROM PUBLIC;
REVOKE ALL ON public.milestone_progress FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.milestone_progress TO authenticated;

CREATE POLICY "milestone_progress_self_select" ON public.milestone_progress
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "milestone_progress_self_insert" ON public.milestone_progress
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "milestone_progress_self_update" ON public.milestone_progress
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- RPC: username の重複チェック(サインアップ前に anon でも呼べるよう SECURITY DEFINER)
--   profiles テーブル全体の SELECT 権限は anon には与えていないので、
--   存在/不在の真偽値だけを返す関数を作る。
-- =============================================================================
CREATE OR REPLACE FUNCTION public.is_username_available(p_username text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE lower(username) = lower(p_username)
  );
$$;

REVOKE ALL ON FUNCTION public.is_username_available(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_username_available(text) TO anon, authenticated;
