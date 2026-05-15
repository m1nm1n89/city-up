-- =============================================================================
-- city-up : phase 2 — coin logic + RPC functions
--
-- Security model (this migration):
--   * coin_balance / coin_transactions / daily_checks / weekly_goals /
--     monthly_stats / user_settings への INSERT/UPDATE を authenticated から REVOKE
--   * 全ての書き込みは SECURITY DEFINER の RPC 関数経由に統一
--   * RPC は auth.uid() で本人確認、日付/月/週は SERVER 側で確定(クライアント送信を信頼しない)
--   * coin_transactions の UNIQUE(user_id, reason, reference_id) で
--     「同じソースから複数回コインを得る」攻撃を構造的に防ぐ
-- =============================================================================

-- ---------------------------------------------------------------------------
-- coin_transactions: コイン変動の履歴(append-only + 重複防止)
-- ---------------------------------------------------------------------------
CREATE TABLE public.coin_transactions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount       integer NOT NULL,
  reason       text NOT NULL CHECK (reason IN (
    'daily_check', 'weekly_goal', 'monthly_stats'
  )),
  reference_id uuid NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, reason, reference_id)
);

CREATE INDEX coin_transactions_user_idx
  ON public.coin_transactions (user_id, created_at DESC);

ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.coin_transactions FROM PUBLIC;
REVOKE ALL ON public.coin_transactions FROM anon;
GRANT SELECT ON public.coin_transactions TO authenticated;
GRANT ALL ON public.coin_transactions TO service_role;

CREATE POLICY "coin_transactions_self_select" ON public.coin_transactions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
-- INSERT/UPDATE/DELETE ポリシー無し → クライアントから書き込み不可。RPC のみ。

-- ---------------------------------------------------------------------------
-- 既存テーブルの書き込みを authenticated から剥奪
--   全書き込みは SECURITY DEFINER RPC 経由に統一
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "coin_balance_self_insert" ON public.coin_balance;
DROP POLICY IF EXISTS "coin_balance_self_update" ON public.coin_balance;
REVOKE INSERT, UPDATE ON public.coin_balance FROM authenticated;

DROP POLICY IF EXISTS "daily_checks_self_insert" ON public.daily_checks;
DROP POLICY IF EXISTS "daily_checks_self_update" ON public.daily_checks;
REVOKE INSERT, UPDATE ON public.daily_checks FROM authenticated;

DROP POLICY IF EXISTS "weekly_goals_self_insert" ON public.weekly_goals;
DROP POLICY IF EXISTS "weekly_goals_self_update" ON public.weekly_goals;
REVOKE INSERT, UPDATE ON public.weekly_goals FROM authenticated;

DROP POLICY IF EXISTS "monthly_stats_self_insert" ON public.monthly_stats;
DROP POLICY IF EXISTS "monthly_stats_self_update" ON public.monthly_stats;
REVOKE INSERT, UPDATE ON public.monthly_stats FROM authenticated;

DROP POLICY IF EXISTS "user_settings_self_insert" ON public.user_settings;
DROP POLICY IF EXISTS "user_settings_self_update" ON public.user_settings;
REVOKE INSERT, UPDATE ON public.user_settings FROM authenticated;

-- =============================================================================
-- 日付ヘルパー(全て Asia/Tokyo 固定)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.today_jst()
RETURNS date
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT (now() AT TIME ZONE 'Asia/Tokyo')::date;
$$;

-- 指定日を含む週の月曜日(ISO 週: 月曜開始)
CREATE OR REPLACE FUNCTION public.week_start_jst(p_date date)
RETURNS date
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT (p_date - ((EXTRACT(ISODOW FROM p_date) - 1)::int || ' days')::interval)::date;
$$;

CREATE OR REPLACE FUNCTION public.year_month_jst(p_date date)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT to_char(p_date, 'YYYY-MM');
$$;

-- =============================================================================
-- 内部ヘルパー: コイン残高に delta を反映
--   p_target_amount は「(user_id, reason, reference_id) の合計コインを何にすべきか」を表す。
--   現在の amount との差分だけが coin_balance に反映される。
--   これにより「同じソースから二重に獲得」が構造的に不可能。
-- =============================================================================
CREATE OR REPLACE FUNCTION public._apply_coin_target(
  p_user_id uuid,
  p_target_amount integer,
  p_reason text,
  p_reference_id uuid
)
RETURNS integer  -- new current_coins
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_existing integer;
  v_delta integer;
  v_new_current integer;
BEGIN
  SELECT amount INTO v_existing
  FROM public.coin_transactions
  WHERE user_id = p_user_id
    AND reason = p_reason
    AND reference_id = p_reference_id;

  v_existing := COALESCE(v_existing, 0);
  v_delta := p_target_amount - v_existing;

  IF v_existing = 0 AND p_target_amount = 0 THEN
    -- 何もしない
    SELECT current_coins INTO v_new_current
    FROM public.coin_balance WHERE user_id = p_user_id;
    RETURN COALESCE(v_new_current, 0);
  END IF;

  IF v_existing = 0 THEN
    INSERT INTO public.coin_transactions (user_id, amount, reason, reference_id)
    VALUES (p_user_id, p_target_amount, p_reason, p_reference_id);
  ELSE
    UPDATE public.coin_transactions
    SET amount = p_target_amount, updated_at = now()
    WHERE user_id = p_user_id
      AND reason = p_reason
      AND reference_id = p_reference_id;
  END IF;

  UPDATE public.coin_balance
  SET current_coins = current_coins + v_delta,
      total_earned = total_earned + GREATEST(v_delta, 0),
      updated_at = now()
  WHERE user_id = p_user_id
  RETURNING current_coins INTO v_new_current;

  RETURN v_new_current;
END;
$$;

REVOKE ALL ON FUNCTION public._apply_coin_target(uuid, integer, text, uuid) FROM PUBLIC;
-- authenticated には GRANT しない → 直接呼べない(他RPCの中だけで使う)

-- =============================================================================
-- RPC: set_final_goal
-- =============================================================================
CREATE OR REPLACE FUNCTION public.set_final_goal(p_final_goal text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;
  IF p_final_goal IS NULL OR length(trim(p_final_goal)) < 1 THEN
    RAISE EXCEPTION 'final_goal cannot be empty';
  END IF;
  IF length(p_final_goal) > 500 THEN
    RAISE EXCEPTION 'final_goal too long';
  END IF;

  UPDATE public.user_settings
  SET final_goal = trim(p_final_goal),
      updated_at = now()
  WHERE user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'user_settings row not found';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_final_goal(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_final_goal(text) TO authenticated;

-- =============================================================================
-- RPC: set_checkboxes
--   available_checkboxes は [{id,label}, ...] 形式、10件固定
--   selected_checkboxes は available の id 配列、3件固定
-- =============================================================================
CREATE OR REPLACE FUNCTION public.set_checkboxes(
  p_available jsonb,
  p_selected jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_ids text[];
  v_sel text[];
  v_id text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  IF jsonb_typeof(p_available) <> 'array' THEN
    RAISE EXCEPTION 'available must be an array';
  END IF;
  IF jsonb_array_length(p_available) <> 10 THEN
    RAISE EXCEPTION 'available must have exactly 10 items';
  END IF;
  IF jsonb_typeof(p_selected) <> 'array' THEN
    RAISE EXCEPTION 'selected must be an array';
  END IF;
  IF jsonb_array_length(p_selected) <> 3 THEN
    RAISE EXCEPTION 'selected must have exactly 3 items';
  END IF;

  -- available の各要素が {id:text, label:text} を持つこと
  SELECT array_agg(item->>'id') INTO v_ids
  FROM jsonb_array_elements(p_available) AS item
  WHERE jsonb_typeof(item) = 'object'
    AND item ? 'id' AND item ? 'label'
    AND jsonb_typeof(item->'id') = 'string'
    AND jsonb_typeof(item->'label') = 'string'
    AND length(item->>'id') BETWEEN 1 AND 64
    AND length(item->>'label') BETWEEN 1 AND 100;

  IF v_ids IS NULL OR array_length(v_ids, 1) <> 10 THEN
    RAISE EXCEPTION 'each available item must have {id,label} (id<=64, label<=100)';
  END IF;
  IF (SELECT count(DISTINCT x) FROM unnest(v_ids) AS x) <> 10 THEN
    RAISE EXCEPTION 'available ids must be unique';
  END IF;

  -- selected が available のサブセットであること
  SELECT array_agg(value::text) INTO v_sel
  FROM jsonb_array_elements_text(p_selected) AS value;

  IF (SELECT count(DISTINCT x) FROM unnest(v_sel) AS x) <> 3 THEN
    RAISE EXCEPTION 'selected ids must be unique';
  END IF;
  FOREACH v_id IN ARRAY v_sel LOOP
    IF NOT (v_id = ANY(v_ids)) THEN
      RAISE EXCEPTION 'selected id % is not in available', v_id;
    END IF;
  END LOOP;

  UPDATE public.user_settings
  SET available_checkboxes = p_available,
      selected_checkboxes = p_selected,
      updated_at = now()
  WHERE user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'user_settings row not found';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_checkboxes(jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_checkboxes(jsonb, jsonb) TO authenticated;

-- =============================================================================
-- RPC: record_daily_checks
--   p_checks: { "<check_id>": true|false, ... }
--   常に「今日(Asia/Tokyo)」のレコードを upsert する。
--   コインは selected_checkboxes の中の true 数だけ、3個達成で +1、上限4。
-- =============================================================================
CREATE OR REPLACE FUNCTION public.record_daily_checks(p_checks jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_today date := public.today_jst();
  v_daily_id uuid;
  v_selected jsonb;
  v_count int;
  v_new_coins int;
  v_current int;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;
  IF jsonb_typeof(p_checks) <> 'object' THEN
    RAISE EXCEPTION 'checks must be an object';
  END IF;

  SELECT selected_checkboxes INTO v_selected
  FROM public.user_settings
  WHERE user_id = v_user_id;

  IF v_selected IS NULL OR jsonb_array_length(v_selected) <> 3 THEN
    RAISE EXCEPTION 'selected_checkboxes not configured';
  END IF;

  -- 「選択中の3つ」のうち true になっている数
  SELECT count(*) INTO v_count
  FROM jsonb_array_elements_text(v_selected) AS sel(check_id)
  WHERE COALESCE((p_checks->>sel.check_id)::boolean, false) = true;

  v_count := LEAST(GREATEST(v_count, 0), 3);
  v_new_coins := LEAST(4, v_count + CASE WHEN v_count >= 3 THEN 1 ELSE 0 END);

  -- daily_checks を upsert(p_checks のうち selected の3つだけを残す)
  WITH normalized AS (
    SELECT jsonb_object_agg(sel.check_id,
                            COALESCE((p_checks->>sel.check_id)::boolean, false)) AS checks
    FROM jsonb_array_elements_text(v_selected) AS sel(check_id)
  )
  INSERT INTO public.daily_checks (user_id, check_date, checks, coins_earned)
  SELECT v_user_id, v_today, normalized.checks, v_new_coins FROM normalized
  ON CONFLICT (user_id, check_date)
  DO UPDATE SET checks = EXCLUDED.checks, coins_earned = EXCLUDED.coins_earned
  RETURNING id INTO v_daily_id;

  v_current := public._apply_coin_target(v_user_id, v_new_coins, 'daily_check', v_daily_id);

  RETURN jsonb_build_object(
    'current_coins', v_current,
    'day_coins', v_new_coins,
    'check_date', v_today
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_daily_checks(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_daily_checks(jsonb) TO authenticated;

-- =============================================================================
-- RPC: set_weekly_goal
--   今週(または過去の週)の目標を設定/更新。コイン無し。
-- =============================================================================
CREATE OR REPLACE FUNCTION public.set_weekly_goal(
  p_week_start date,
  p_goal_text text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_id uuid;
  v_current_week date := public.week_start_jst(public.today_jst());
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;
  IF p_goal_text IS NULL OR length(trim(p_goal_text)) < 1 THEN
    RAISE EXCEPTION 'goal_text cannot be empty';
  END IF;
  IF length(p_goal_text) > 500 THEN
    RAISE EXCEPTION 'goal_text too long';
  END IF;
  IF p_week_start <> public.week_start_jst(p_week_start) THEN
    RAISE EXCEPTION 'week_start must be a Monday';
  END IF;
  IF p_week_start > v_current_week THEN
    RAISE EXCEPTION 'cannot set goal for a future week';
  END IF;

  INSERT INTO public.weekly_goals (user_id, week_start_date, goal_text)
  VALUES (v_user_id, p_week_start, trim(p_goal_text))
  ON CONFLICT (user_id, week_start_date)
  DO UPDATE SET goal_text = EXCLUDED.goal_text
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_weekly_goal(date, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_weekly_goal(date, text) TO authenticated;

-- =============================================================================
-- RPC: record_weekly_progress
--   その週の進捗 + 達成可否を記録。達成と申告で 3 コイン(撤回すると -3 で相殺)。
-- =============================================================================
CREATE OR REPLACE FUNCTION public.record_weekly_progress(
  p_week_start date,
  p_progress_text text,
  p_achieved boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_id uuid;
  v_target int;
  v_current int;
  v_current_week date := public.week_start_jst(public.today_jst());
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;
  IF p_week_start <> public.week_start_jst(p_week_start) THEN
    RAISE EXCEPTION 'week_start must be a Monday';
  END IF;
  IF p_week_start > v_current_week THEN
    RAISE EXCEPTION 'cannot record progress for a future week';
  END IF;
  IF p_progress_text IS NOT NULL AND length(p_progress_text) > 1000 THEN
    RAISE EXCEPTION 'progress_text too long';
  END IF;

  SELECT id INTO v_id
  FROM public.weekly_goals
  WHERE user_id = v_user_id AND week_start_date = p_week_start;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'weekly goal for this week is not set yet';
  END IF;

  v_target := CASE WHEN p_achieved THEN 3 ELSE 0 END;

  UPDATE public.weekly_goals
  SET progress_text = CASE WHEN p_progress_text IS NULL THEN progress_text ELSE p_progress_text END,
      achieved = p_achieved,
      coins_earned = v_target
  WHERE id = v_id;

  v_current := public._apply_coin_target(v_user_id, v_target, 'weekly_goal', v_id);

  RETURN jsonb_build_object(
    'current_coins', v_current,
    'awarded', v_target,
    'week_start', p_week_start
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_weekly_progress(date, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_weekly_progress(date, text, boolean) TO authenticated;

-- =============================================================================
-- RPC: record_monthly_stats
--   月次の自己申告数値。完了すると 5 コイン(同月の上書きでは加算しない)。
-- =============================================================================
CREATE OR REPLACE FUNCTION public.record_monthly_stats(
  p_year_month text,
  p_post_count integer,
  p_revenue_jpy integer,
  p_follower_count integer,
  p_pv_count integer,
  p_other_notes text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_id uuid;
  v_current_ym text := public.year_month_jst(public.today_jst());
  v_current int;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;
  IF p_year_month !~ '^\d{4}-\d{2}$' THEN
    RAISE EXCEPTION 'invalid year_month format';
  END IF;
  IF p_year_month > v_current_ym THEN
    RAISE EXCEPTION 'cannot record stats for a future month';
  END IF;
  IF p_post_count IS NULL OR p_post_count < 0 THEN
    RAISE EXCEPTION 'post_count must be >= 0';
  END IF;
  IF p_revenue_jpy IS NULL OR p_revenue_jpy < 0 THEN
    RAISE EXCEPTION 'revenue_jpy must be >= 0';
  END IF;
  IF p_follower_count IS NOT NULL AND p_follower_count < 0 THEN
    RAISE EXCEPTION 'follower_count must be >= 0';
  END IF;
  IF p_pv_count IS NOT NULL AND p_pv_count < 0 THEN
    RAISE EXCEPTION 'pv_count must be >= 0';
  END IF;
  IF p_other_notes IS NOT NULL AND length(p_other_notes) > 2000 THEN
    RAISE EXCEPTION 'other_notes too long';
  END IF;

  INSERT INTO public.monthly_stats (
    user_id, year_month, post_count, revenue_jpy,
    follower_count, pv_count, other_notes
  )
  VALUES (
    v_user_id, p_year_month, p_post_count, p_revenue_jpy,
    p_follower_count, p_pv_count, p_other_notes
  )
  ON CONFLICT (user_id, year_month)
  DO UPDATE SET
    post_count = EXCLUDED.post_count,
    revenue_jpy = EXCLUDED.revenue_jpy,
    follower_count = EXCLUDED.follower_count,
    pv_count = EXCLUDED.pv_count,
    other_notes = EXCLUDED.other_notes
  RETURNING id INTO v_id;

  -- 5 コイン(同月の再提出では既に 5 が記録されているので net 0 になる)
  v_current := public._apply_coin_target(v_user_id, 5, 'monthly_stats', v_id);

  RETURN jsonb_build_object(
    'current_coins', v_current,
    'year_month', p_year_month
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_monthly_stats(text, integer, integer, integer, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_monthly_stats(text, integer, integer, integer, integer, text) TO authenticated;
