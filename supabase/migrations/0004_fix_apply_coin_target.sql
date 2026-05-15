-- =============================================================================
-- city-up : phase 3 hotfix — _apply_coin_target の存在判定バグ修正
--
-- 旧版は v_existing = 0 で「行が無い」と判定していたが、
-- 「行は存在するが amount=0」(=チェックを全部外した直後)と区別できていなかった。
-- その結果、再度チェックを付けると INSERT を試みて UNIQUE 制約に衝突していた。
--
-- このマイグレーションは関数本体だけ差し替える(GRANT/REVOKE は維持)。
-- =============================================================================

CREATE OR REPLACE FUNCTION public._apply_coin_target(
  p_user_id uuid,
  p_target_amount integer,
  p_reason text,
  p_reference_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_existing integer;
  v_exists boolean;
  v_delta integer;
  v_new_current integer;
BEGIN
  SELECT amount INTO v_existing
  FROM public.coin_transactions
  WHERE user_id = p_user_id
    AND reason = p_reason
    AND reference_id = p_reference_id;

  v_exists := FOUND;
  v_existing := COALESCE(v_existing, 0);
  v_delta := p_target_amount - v_existing;

  IF NOT v_exists AND p_target_amount = 0 THEN
    -- 行も無く target も 0 → 何もしない
    SELECT current_coins INTO v_new_current
    FROM public.coin_balance WHERE user_id = p_user_id;
    RETURN COALESCE(v_new_current, 0);
  END IF;

  IF NOT v_exists THEN
    INSERT INTO public.coin_transactions (user_id, amount, reason, reference_id)
    VALUES (p_user_id, p_target_amount, p_reason, p_reference_id);
  ELSE
    UPDATE public.coin_transactions
    SET amount = p_target_amount, updated_at = now()
    WHERE user_id = p_user_id
      AND reason = p_reason
      AND reference_id = p_reference_id;
  END IF;

  IF v_delta <> 0 THEN
    UPDATE public.coin_balance
    SET current_coins = current_coins + v_delta,
        total_earned = total_earned + GREATEST(v_delta, 0),
        updated_at = now()
    WHERE user_id = p_user_id
    RETURNING current_coins INTO v_new_current;
  ELSE
    SELECT current_coins INTO v_new_current
    FROM public.coin_balance WHERE user_id = p_user_id;
  END IF;

  RETURN COALESCE(v_new_current, 0);
END;
$$;
