# city-up

発信系副業挑戦者向けの継続支援アプリ。Next.js + Supabase + Cloudflare Workers。

## 設計の前提

- **個人情報を持たない**。ユーザーネーム + パスワードだけで認証(内部ではダミーメールに変換して Supabase Auth に渡す)
- パスワード忘れ救済は **リカバリーコード**(12桁、サインアップ時に一度だけ表示、bcrypt でハッシュ化保存)
- 全テーブル **RLS 有効・Default Deny**、自分の行のみアクセス可、DELETE は完全禁止
- 詳細は [`docs/`](./docs/) 配下の MD を参照

---

## セットアップ

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

### 3. Supabase プロジェクトの準備

[Supabase Dashboard](https://app.supabase.com/) で新規プロジェクトを作成し、以下を取得します。

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
```

> `SUPABASE_SERVICE_ROLE_KEY` は絶対に `NEXT_PUBLIC_` 接頭辞を付けないでください。
> service_role は RLS をバイパスする神権限です。クライアントに渡したら全データが漏洩します。

### 6. 初期スキーマの適用

[`supabase/migrations/0001_initial_schema.sql`](./supabase/migrations/0001_initial_schema.sql) を
Supabase Dashboard の `SQL Editor → New query` に貼り付けて実行します。

実行後、`Database → Tables` で以下のテーブルが作成され、
すべて `RLS enabled` になっていることを確認してください。

- `profiles`
- `user_settings`
- `daily_checks`
- `weekly_goals`
- `monthly_stats`
- `coin_balance`
- `milestone_progress`

---

## 開発

```bash
pnpm dev          # 開発サーバ (http://localhost:3000)
pnpm typecheck    # 型チェック
pnpm lint         # ESLint
pnpm build        # プロダクションビルド
```

---

## デプロイ(Cloudflare Workers)

このフェーズでは **設定ファイルの準備のみ** が完了しています。実際のデプロイは次フェーズで行います。

```bash
pnpm preview      # ローカルで OpenNext + Workers を試す
pnpm deploy       # Cloudflare にデプロイ
```

デプロイ前に環境変数をシークレットとして登録します。

```bash
wrangler secret put NEXT_PUBLIC_SUPABASE_URL
wrangler secret put NEXT_PUBLIC_SUPABASE_ANON_KEY
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

> Next.js コードで `export const runtime = "edge"` を使わないこと。
> `@opennextjs/cloudflare` は Node.js runtime のみ対応。

---

## ディレクトリ構成

```
.
├── docs/                              # ナレッジ MD(編集しない)
├── src/
│   ├── app/
│   │   ├── (auth)/                    # 認証画面(layout 共通)
│   │   │   ├── signup/page.tsx
│   │   │   ├── login/page.tsx
│   │   │   └── recover/page.tsx
│   │   ├── (app)/
│   │   │   └── dashboard/page.tsx     # 認証後のホーム(仮実装)
│   │   ├── layout.tsx
│   │   ├── page.tsx                   # ランディング
│   │   └── globals.css
│   ├── middleware.ts                  # 全リクエストでセッション更新
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts              # ブラウザ用クライアント
│   │   │   ├── server.ts              # Server Component / Action 用
│   │   │   ├── middleware.ts          # セッション更新ロジック
│   │   │   └── admin.ts               # service_role(サーバー専用)
│   │   ├── auth/
│   │   │   ├── constants.ts           # ダミードメイン、パスワードルール
│   │   │   ├── recovery.ts            # リカバリーコード生成/ハッシュ/検証
│   │   │   ├── validators.ts          # username / password バリデーション
│   │   │   └── actions.ts             # Server Actions
│   │   └── stores/                    # Zustand(空)
│   ├── components/
│   │   └── auth/                      # 認証フォーム類
│   └── types/
├── supabase/migrations/
│   └── 0001_initial_schema.sql        # 初期スキーマ + RLS
├── pnpm-workspace.yaml                # サプライチェーン対策
├── wrangler.jsonc
├── open-next.config.ts
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.mjs
├── eslint.config.mjs
└── tsconfig.json
```

---

## このフェーズの完了範囲

- [x] プロジェクトセットアップ + サプライチェーン対策
- [x] Supabase クライアント(SSR 対応)
- [x] 認証(サインアップ / ログイン / リカバリー / ログアウト)
- [x] DB スキーマ + RLS(初期 7 テーブル + coin_transactions = 8 テーブル)
- [x] 入力ロジック(チェック/週次/月次)とコインシステム(RPC 経由・改ざん耐性)
- [x] 街並み UI(時代別建物、季節エフェクト、住人 NPC、マイルストーン演出)
- [x] メンターコメント機能
- [x] Cloudflare Workers 設定ファイル

---

## デバッグツール(フェーズ3完了時に削除する)

`/day-override` は開発時に Day 数やマイルストーン演出を強制発火するためのツールです。
**`NODE_ENV=development` かつ `NEXT_PUBLIC_DEBUG_MODE=true` の両方を満たす時のみ動作**し、
本番ビルドでは `notFound()` を返します。DB は一切書き換えません。

### 削除手順(本番リリース前に実施)

1. フォルダ削除: `src/app/(debug)/`
2. デバッグストア削除: `src/lib/stores/debugStore.ts`
3. デバッグガード削除: `src/lib/debug/enabled.ts`
4. `src/app/(app)/dashboard/DashboardClient.tsx` から以下を取り除く:
   - `useDebugStore` / `useEffectiveDay` / `DEBUG_ENABLED` の import 行
   - `consumeForced` を使った useEffect 全体
   - 末尾の `{DEBUG_ENABLED && (...)} ` ブロック
   - `day = useEffectiveDay(props.serverDay)` → `day = props.serverDay`
5. `src/components/city/CityScene.tsx` の `useEffectiveSeason` 呼び出しを外し、
   `effective = season` に置き換え
6. `.env.local` から `NEXT_PUBLIC_DEBUG_MODE` 行を削除
7. `pnpm build` を実行してエラーが出ないか確認
