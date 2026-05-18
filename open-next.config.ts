import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * OpenNext + Cloudflare Workers の設定。
 *
 * このアプリは ISR を使っておらず、サーバーアクションでの revalidatePath は
 * 単一 worker isolate 内のリクエストキャッシュにのみ効けば十分なため、
 * R2 incremental cache は **未設定**(デフォルトのインメモリ挙動に任せる)。
 *
 * もしマルチノードでの cache invalidation を行いたくなった場合は:
 *   1. `wrangler r2 bucket create city-up-cache` で R2 バケット作成
 *   2. wrangler.jsonc に r2_buckets binding "NEXT_INC_CACHE_R2_BUCKET" を追加
 *   3. ここに以下を戻す
 *      import incrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
 *      ... { incrementalCache } ...
 */
export default defineCloudflareConfig({});
