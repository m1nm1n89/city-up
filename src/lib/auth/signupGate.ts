/**
 * サインアップの開放/閉鎖を環境変数で制御するゲート。
 *
 * 設計:
 *   - 既定値は「閉じている」(secure by default)
 *   - NEXT_PUBLIC_SIGNUP_ENABLED=true で明示的に開ける
 *   - 開発時もこのフラグが必要(.env.local に書く)
 *
 * 本番デプロイ初期はクローズドベータ(自分のアカウントだけ)。
 * 公開する時に Cloudflare Workers の secret で true を渡すか、
 * wrangler.jsonc の vars に書き込む。
 */
export const SIGNUP_ENABLED =
  process.env.NEXT_PUBLIC_SIGNUP_ENABLED === "true";
