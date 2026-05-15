-- =============================================================================
-- city-up : phase 3 — season setting + current_era guard
--
-- 1. user_settings に current_season を追加(CHECK 制約あり)
-- 2. set_season / set_current_era RPC(共に SECURITY DEFINER + 入力検証)
-- 3. profiles の UPDATE を authenticated から剥奪(started_at の改ざん封じ)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- user_settings.current_season
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_settings
  ADD COLUMN current_season text NOT NULL DEFAULT 'spring'
  CHECK (current_season IN ('spring','summer','autumn','winter'));

-- ---------------------------------------------------------------------------
-- RPC: set_season
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_season(p_season text)
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
  IF p_season NOT IN ('spring','summer','autumn','winter') THEN
    RAISE EXCEPTION 'invalid season';
  END IF;

  UPDATE public.user_settings
  SET current_season = p_season,
      updated_at = now()
  WHERE user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'user_settings row not found';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_season(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_season(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- RPC: set_current_era
--   サーバー側で「経過日数から到達した時代」を判定したら呼ぶ。
--   降順(past era への巻き戻し)は不可、enum の範囲チェックあり。
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_current_era(p_era text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_current text;
  v_rank int;
  v_new_rank int;
  v_eras text[] := ARRAY['primitive','ancient','medieval','modern','contemporary','future'];
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;
  IF NOT (p_era = ANY (v_eras)) THEN
    RAISE EXCEPTION 'invalid era';
  END IF;

  SELECT current_era INTO v_current
  FROM public.milestone_progress
  WHERE user_id = v_user_id;

  IF v_current IS NULL THEN
    RAISE EXCEPTION 'milestone_progress row not found';
  END IF;

  -- 巻き戻し禁止
  SELECT array_position(v_eras, v_current)  INTO v_rank;
  SELECT array_position(v_eras, p_era)      INTO v_new_rank;
  IF v_new_rank <= v_rank THEN
    RETURN; -- no-op
  END IF;

  UPDATE public.milestone_progress
  SET current_era = p_era,
      updated_at = now()
  WHERE user_id = v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_current_era(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_current_era(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- profiles: UPDATE を完全剥奪
--   recovery_code 更新は admin client (service_role) 経由のみ。
--   started_at を本人が動かせると改ざんに繋がるので INSERT/UPDATE 全停止。
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_insert" ON public.profiles;
REVOKE INSERT, UPDATE ON public.profiles FROM authenticated;
-- SELECT(自分の行のみ)は維持
