-- =============================================================================
-- city-up : milestone_progress を RPC 経由のみに統一する hotfix
--
-- 0001 で作成した milestone_progress_self_insert / _self_update を残したままだったため、
-- 認証ユーザーが自分の milestone_progress.current_era を直接 UPDATE できる状態だった。
-- これでは set_current_era RPC の「巻き戻し禁止 / enum 範囲チェック / 自然到達のみ」
-- ガードを迂回して任意の時代に飛べてしまう(自己チート)。
--
-- 他テーブル(coin_balance / daily_checks / weekly_goals / monthly_stats / user_settings)
-- は 0002 で、profiles は 0003 で、それぞれ同様の処理を施してある。
-- 本マイグレーションはそれと対称の修正で、milestone_progress も RPC 経由のみに統一する。
--
-- 影響:
--   - signup 時の初期行作成は actions.ts が admin (service_role) クライアントで実施するため OK
--   - era 更新は set_current_era RPC (SECURITY DEFINER) が auth.uid() で書く形なので OK
-- =============================================================================

DROP POLICY IF EXISTS "milestone_progress_self_insert" ON public.milestone_progress;
DROP POLICY IF EXISTS "milestone_progress_self_update" ON public.milestone_progress;

REVOKE INSERT, UPDATE ON public.milestone_progress FROM authenticated;

-- 残るポリシーは milestone_progress_self_select のみ。
