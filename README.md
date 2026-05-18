# city-up

発信系副業挑戦者向けの継続支援アプリ。Next.js + Supabase + Cloudflare Workers。

## 設計の前提

- **個人情報を持たない**。ユーザーネーム + パスワードだけで認証(内部ではダミーメールに変換して Supabase Auth に渡す)
- パスワード忘れ救済は **リカバリーコード**(12桁、サインアップ時に一度だけ表示、bcrypt でハッシュ化保存)
- 全テーブル **RLS 有効・Default Deny**、自分の行のみアクセス可、DELETE は完全禁止
- 詳細は [`docs/knowledge/`](./docs/knowledge/) 配下の MD を参照

---

## セットアップ(ローカル開発)

### 1. 必要環境

| 項目 | バージョン |
|---|---|
| Node.js | 22 以上 |
| pnpm | 11 以上 |

### 2. 依存インストール

```bash
pnpm install
```

`pnpm-workspace.yaml` で `minimumReleaseAge: 7200`(=5日)を設定済み。
**npm/yarn は使わないでください**(サプライチェーン対策が効かなくなります)。

### 3. 開発用 Supabase プロジェクトの準備

[Supabase Dashboard](https://app.supabase.com/) で新規プロジェクト(例: `city-up-dev`)を作成し、以下を取得します。

- **Project URL**: `Settings → API → Project URL`
- **anon public key**: `Settings → API → Project API keys → anon public`
- **service_role key**: `Settings → API → Project API keys → service_role`(秘密。漏らさない)

### 4. メール確認を無効化

Supabase Dashboard の `Authentication → Providers → Email` で
**Confirm email を OFF** にします。

> ダミーメール (`{username}@dummy.cityup.local`) は実際には受信できないため、
> メール確認を有効のままだとログインできなくなります。

### 5. `.env.local` の作成

プロジェクトルートに `.env.local` を作成して、以下を記入します。

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
DUMMY_EMAIL_DOMAIN=dummy.cityup.local

# 開発時はサインアップを開ける
NEXT_PUBLIC_SIGNUP_ENABLED=true

# デバッグツール(/day-override)を有効化
NEXT_PUBLIC_DEBUG_MODE=true
```

> `SUPABASE_SERVICE_ROLE_KEY` は絶対に `NEXT_PUBLIC_` 接頭辞を付けないでください。
> service_role は RLS をバイパスする神権限です。クライアントに渡したら全データが漏洩します。

### 6. マイグレーションの適用

`supabase/migrations/` 配下の SQL を **番号順** に Supabase Dashboard の
`SQL Editor → New query` に貼り付けて実行します。

| 順 | ファイル | 内容 |
|---|---|---|
| 1 | `0001_initial_schema.sql` | 初期テーブル + RLS(Default Deny) |
| 2 | `0002_coin_logic.sql` | コイン RPC・SECURITY DEFINER で改ざん耐性 |
| 3 | `0003_season_and_era.sql` | 季節列追加 + `set_season` / `set_current_era` RPC |
| 4 | `0004_fix_apply_coin_target.sql` | 0→1→0→1 バグの修正 |
| 5 | `0005_lock_milestone_progress.sql` | milestone_progress の直接 UPDATE 封じ(`set_current_era` 経由のみ) |

実行後、SQL Editor で以下を実行し、**全 8 テーブル(profiles / user_settings /
daily_checks / weekly_goals / monthly_stats / coin_balance / milestone_progress /
coin_transactions)** が `rls_enabled = true` かつ `policy_count = 1` であることを確認してください。

```sql
SELECT tablename, rowsecurity AS rls_enabled,
  (SELECT count(*) FROM pg_policies p
    WHERE p.schemaname = t.schemaname AND p.tablename = t.tablename) AS policy_count
FROM pg_tables t
WHERE schemaname = 'public'
ORDER BY tablename;
```

> `policy_count` が 3 のテーブルがあれば赤信号(0002/0003/0005 のどれかを適用し忘れている可能性)。
> 書き込み系は全て RPC(SECURITY DEFINER)経由にしてあるため、SELECT 用の 1 つだけが残っている状態が正解。

### 7. 開発サーバ起動

```bash
pnpm dev          # 開発サーバ (http://localhost:3000)
pnpm typecheck    # 型チェック
pnpm lint         # ESLint
pnpm build        # Next.js プロダクションビルド(Workers 用ではない)
```

---

## ローカルでの Cloudflare Workers 本番ビルド検証

実際のデプロイ前に、`pnpm preview` で OpenNext バンドル + wrangler を使ってローカル動作確認します。

### 1. `.dev.vars` の準備

wrangler は `.env.local` を読まないので、`.dev.vars` を別途用意します。

```bash
cp .env.local .dev.vars
```

中身は `.env.local` とほぼ同じでよいですが、サインアップを開けたい場合は
`NEXT_PUBLIC_SIGNUP_ENABLED=true` を入れます。サンプルは [`.dev.vars.example`](./.dev.vars.example) を参照。

> `.dev.vars` は `.gitignore` 済み。コミットしないでください。

### 2. プレビュー起動

```bash
pnpm preview
```

`opennextjs-cloudflare build && opennextjs-cloudflare preview` の合成です。
ビルド後 wrangler のローカルサーバ(通常 http://localhost:8787)が起動します。

> **R2 incremental cache について**
> 現状 [`open-next.config.ts`](./open-next.config.ts) では incremental cache を未設定にしています
> (このアプリは ISR を使わず、`revalidatePath` 中心のため)。
> マルチノードで cache invalidation を強化したくなった場合は `wrangler r2 bucket create city-up-cache`
> でバケットを作成し、`wrangler.jsonc` に binding(`NEXT_INC_CACHE_R2_BUCKET`)を追加した上で
> `open-next.config.ts` を R2 cache 戻し版に書き換えてください(ファイル冒頭コメント参照)。

### 3. 検証チェック項目

- サインアップ → リカバリーコード表示 → ログイン → ログアウト
- チェックボックス入力 → コイン獲得
- 週次目標 → 進捗記入
- 月次成果入力
- 街並み表示(マイルストーン演出含む)
- 振り返り画面(時代スライダー / 進捗スライダー / 過去比較)
- シェアカード生成(16:9 / 1:1)・Noto Sans JP で日本語が出ているか
- マイルストーン提案トースト(リロードで再表示されないか)
- 月次自動シェアカード生成(Day 90 以降)

### 0→1→0→1 リグレッションテスト(必須)

`0004` マイグレーションで修正済みのバグの再発防止チェック。

1. 今日のチェックを 3 つ全部 ON → コイン 4
2. 全部 OFF → コイン 0
3. 全部 ON → **エラーなしで** コイン 4
4. 何度も繰り返してもエラーが出ない

エラーが出た場合は [`docs/prompts/CLAUDE_CODE_PROMPT_PHASE5.md`](./docs/prompts/CLAUDE_CODE_PROMPT_PHASE5.md) の
「詰まった場合のデバッグ方法」セクションを参照してください。

---

## 本番デプロイ(Cloudflare Workers)

### 1. 本番用 Supabase プロジェクト

開発用とは **別の Supabase プロジェクト** を新規作成します(`city-up-prod` 推奨、リージョン Tokyo)。

- 開発用と同じ **5 つのマイグレーション**(`0001` → `0002` → `0003` → `0004` → `0005`)を**この順番**で適用
- メール確認を OFF
- 上記の点検クエリ(全テーブル `rls_enabled=true` / `policy_count=1`)が通ることを確認
- 3 つのキー(URL / anon / service_role)を取得

### 2. wrangler secret の登録

```bash
wrangler secret put NEXT_PUBLIC_SUPABASE_URL
wrangler secret put NEXT_PUBLIC_SUPABASE_ANON_KEY
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler secret put DUMMY_EMAIL_DOMAIN
# 本番ドメインを入れる場合のみ
wrangler secret put NEXT_PUBLIC_APP_URL
# サインアップを開ける場合のみ
wrangler secret put NEXT_PUBLIC_SIGNUP_ENABLED
```

`NEXT_PUBLIC_DEBUG_MODE` は **絶対に登録しないこと**。本番ビルドでは
`NODE_ENV !== "development"` で完全に無効化されますが、保険のためにも未設定が望ましい。

### 3. デプロイ実行

```bash
pnpm deploy
```

完了すると `https://city-up.<your-subdomain>.workers.dev` が払い出されます。

### 4. 本番動作確認

- 上記「検証チェック項目」と同じ流れを本番 URL で実施
- サインアップが **無効化されている**(`NEXT_PUBLIC_SIGNUP_ENABLED=true` を secret に入れない限り「クローズドベータ中」表示)
- 既存アカウント(事前に作っておく)でログインできる
- 0→1→0→1 リグレッションテスト

---

## サインアップゲート

`NEXT_PUBLIC_SIGNUP_ENABLED` 環境変数で開閉します(デフォルト = 閉じる)。

| 値 | 挙動 |
|---|---|
| (未設定) または `"false"` | サインアップ画面 / リンクが「クローズドベータ中」表示に切り替わる |
| `"true"` | 通常のサインアップフォームが表示される |

本番でアカウント作成したい場合は **先にローカルでアカウントを作成し、
本番 Supabase の `auth.users` に同じユーザーを INSERT する**か、
一時的にフラグを true にしてサインアップ → 即 false に戻す運用にしてください。

---

## 運用

### ログ確認

Cloudflare Workers のリアルタイムログ:

```bash
wrangler tail
```

ダッシュボード(集計):

- Cloudflare Dashboard → Workers & Pages → 該当 Worker → Logs / Analytics
- Supabase Dashboard → Database → Logs(PostgreSQL クエリログ)

### 障害対応の見方

- クライアント側エラー: ブラウザ DevTools → Console / Network
- サーバー側エラー: `wrangler tail` または Cloudflare Workers Analytics
- DB エラー: Supabase Dashboard → Database → Logs
- 認証エラー: Supabase Dashboard → Authentication → Logs

---

## デバッグツール

`/day-override` で Day 数とマイルストーン演出を強制発火できます。
DB は一切書き換えず、クライアント側ストア(`debugStore`)に override 値を入れるだけ。

**有効化条件**: `NODE_ENV === "development"` **かつ** `NEXT_PUBLIC_DEBUG_MODE === "true"`。
本番ビルドでは tree-shake により完全に消えます([`src/lib/debug/enabled.ts`](./src/lib/debug/enabled.ts) 参照)。

---

## ディレクトリ構成

```
.
├── docs/
│   ├── knowledge/                       # 仕様 / 認証セキュリティ MD
│   └── prompts/                         # 各フェーズの Claude Code 指示書
├── public/
│   └── fonts/
│       └── NotoSansJP-Regular.otf       # シェアカード用日本語フォント
├── src/
│   ├── app/
│   │   ├── (auth)/                      # サインアップ / ログイン / リカバリー
│   │   ├── (app)/                       # 認証後の画面
│   │   │   ├── dashboard/               # ホーム(街並み + チェック)
│   │   │   ├── reflection/              # 振り返り画面(時代/進捗スライダー + 過去比較)
│   │   │   ├── monthly/new/             # 月次成果入力
│   │   │   ├── weekly/{new,progress}/   # 週次目標
│   │   │   ├── settings/checkboxes/     # チェック候補編集
│   │   │   └── onboarding/              # 初回オンボーディング
│   │   ├── (debug)/day-override/        # 開発時のみ有効なデバッグ画面
│   │   ├── api/share-card/route.tsx     # シェアカード PNG 生成 (next/og)
│   │   ├── actions/                     # サーバーアクション群
│   │   ├── layout.tsx
│   │   ├── page.tsx                     # ランディング
│   │   └── globals.css
│   ├── middleware.ts
│   ├── components/
│   │   ├── auth/                        # 認証フォーム類
│   │   ├── city/                        # 街並み描画(live)
│   │   ├── share/                       # 静止画街並み + シェアカード
│   │   ├── reflection/                  # スライダー + 過去比較
│   │   ├── nav/                         # GlobalNav
│   │   ├── toast/                       # MilestoneToast
│   │   ├── checkboxes/                  # 日次チェック
│   │   ├── monthly/                     # 月次フォーム
│   │   ├── goals/                       # 目標 / 進捗フォーム
│   │   ├── banners/                     # 催促バナー
│   │   └── mentor/                      # メンターコメント
│   ├── lib/
│   │   ├── supabase/                    # client / server / middleware / admin
│   │   ├── auth/                        # 定数 / バリデータ / actions / signupGate
│   │   ├── city/                        # 時代 / 配置 / マイルストーン / snapshot
│   │   ├── coins/                       # コイン計算
│   │   ├── date/                        # JST 日付ヘルパー
│   │   ├── debug/                       # debug enabled ガード
│   │   ├── mentor/                      # メンターメッセージ engine
│   │   ├── reflection/                  # 過去比較ロジック
│   │   ├── share/                       # 共有カード定数
│   │   ├── stats/                       # streak 集計
│   │   └── stores/                      # Zustand(mentor / debug / shareModal)
│   └── types/
├── supabase/migrations/
│   ├── 0001_initial_schema.sql
│   ├── 0002_coin_logic.sql
│   ├── 0003_season_and_era.sql
│   └── 0004_fix_apply_coin_target.sql
├── pnpm-workspace.yaml                  # サプライチェーン対策
├── wrangler.jsonc                       # Cloudflare Workers 設定
├── open-next.config.ts                  # OpenNext 設定
├── .dev.vars.example                    # wrangler 用環境変数のサンプル
├── .env.local.example
└── package.json
```
