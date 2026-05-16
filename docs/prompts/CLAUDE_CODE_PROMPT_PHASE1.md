# Claude Code 用プロンプト ─ フェーズ1: セットアップ + 認証 + DB設計

このプロンプトは VSCode 内の Claude Code 拡張機能に渡す指示書です。
プロジェクトの初期構築から、認証システム、DBスキーマ設計までを担当します。

---

## あなたの役割

あなたは経験豊富な Next.js + Supabase 開発者です。
セキュリティを最優先しながら、バイブコーディングのスピード感で開発を進めてください。

開発を始める前に、必ず `docs/` 配下のMDファイルを全て読み、プロジェクトの全体像を理解してから着手してください。

```
docs/
├── 03a_Webアプリ_メイン_概要.md          (コンセプト・体験設計)
├── 03a_Webアプリ_メイン_仕様詳細.md      (マイルストーン・コイン・入力・UI)
└── 03a_Webアプリ_メイン_認証セキュリティ.md (認証方式・Supabaseセキュリティ・技術スタック)
```

---

## このフェーズで作るもの

**フェーズ1のスコープ**: プロジェクト基盤の構築。UI・街並み演出・コインロジックなどは**まだ作りません**。

1. **プロジェクトセットアップ**(Next.js + TypeScript + Tailwind + 各種ライブラリ)
2. **サプライチェーン攻撃対策**(pnpm 11、5日間の minimumReleaseAge)
3. **Supabase クライアント設定**(SSR対応)
4. **認証システム**(ユーザーネーム + パスワード + リカバリーコード方式)
5. **DBスキーマ設計**(初期テーブル + RLS)
6. **Cloudflare Workers デプロイ準備**(OpenNext)

---

## 技術スタック(厳守)

| カテゴリ | 採用技術 |
|---|---|
| ランタイム | Node.js 22+ |
| フレームワーク | Next.js 最新版(App Router、TypeScript) |
| パッケージマネージャ | **pnpm 11+** (npmやyarnは使わない) |
| バックエンド | Supabase(Auth + Postgres) |
| スタイリング | Tailwind CSS |
| 状態管理 | Zustand |
| アニメーション | Framer Motion(このフェーズではまだ使わない) |
| デプロイ | Cloudflare Workers + `@opennextjs/cloudflare` |

---

## セキュリティ運用ルール(絶対遵守)

`docs/03a_Webアプリ_メイン_認証セキュリティ.md` に書かれた全ルールを必ず守ってください。
特に以下は鉄則です。

### RLS は鉄壁
- 新規テーブル作成時、まず `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`(Default Deny)
- `auth.uid()` を使ったポリシーで「自分のデータのみ」アクセス可能に
- `anon` ロールには未認証専用ページ以外で権限を与えない

### Key Management
- `service_role` キーは絶対にクライアントコードや `NEXT_PUBLIC_*` 環境変数に混入させない
- ログインユーザーのアクションは必ず `authenticated` ロール経由

### Security Audit First
- コードを提案する前に、その実装が「RLSを突破されないか」「他のユーザーのデータが漏洩しないか」を内部で監査し、結果を短く報告してください
- ユーザーの利便性とセキュリティがコンフリクトする場合は、必ずリスクを提示した上で最小権限(Least Privilege)の原則に則った案を出してください

---

## 認証方式の前提(重要)

**個人情報を一切持たない設計**です。詳細は `docs/03a_Webアプリ_メイン_認証セキュリティ.md` を参照。

要点:
- ユーザーには「ユーザーネーム + パスワード」のフォームで見せる
- 内部的には `{username}@dummy.yourapp.com` というダミーメールに変換して Supabase Auth に渡す
- パスワード忘れ救済は **リカバリーコード方式**(12桁、サインアップ時に1度だけ表示、ハッシュ化して保存)
- メアド・電話番号などPIIは一切取得しない

ダミードメインは仮で `dummy.cityup.local` とし、後で実ドメイン取得時に差し替え可能なように `lib/auth/constants.ts` などに定数化してください。

---

## DBスキーマ設計(初期テーブル)

このフェーズで作るテーブル。**全テーブルRLS有効、自分のデータのみアクセス可能**にしてください。

### `profiles`
- `id` (uuid, PK, auth.users.id への FK)
- `username` (text, unique, not null)
- `recovery_code_hash` (text, not null) — bcryptなどで強くハッシュ化
- `created_at` (timestamptz, default now())
- `started_at` (timestamptz, default now()) — Day 1 起点

### `user_settings`
- `user_id` (uuid, PK/FK)
- `final_goal` (text) — 最終目標(初回入力)
- `selected_checkboxes` (jsonb) — 選んだ3つのチェック項目
- `available_checkboxes` (jsonb) — 候補10個

### `daily_checks`
- `id` (uuid, PK)
- `user_id` (uuid, FK)
- `check_date` (date, not null)
- `checks` (jsonb) — どのチェックを完了したか
- `coins_earned` (int)
- UNIQUE(user_id, check_date)

### `weekly_goals`
- `id` (uuid, PK)
- `user_id` (uuid, FK)
- `week_start_date` (date)
- `goal_text` (text)
- `progress_text` (text)
- `achieved` (boolean)
- `coins_earned` (int)

### `monthly_stats`
- `id` (uuid, PK)
- `user_id` (uuid, FK)
- `year_month` (text, '2026-05'形式)
- `post_count` (int)
- `revenue_jpy` (int) — 0円可
- `follower_count` (int, nullable)
- `pv_count` (int, nullable)
- `other_notes` (text, nullable)
- UNIQUE(user_id, year_month)

### `coin_balance`
- `user_id` (uuid, PK)
- `current_coins` (int, default 0)
- `total_earned` (int, default 0)
- `total_spent` (int, default 0)

### `milestone_progress`
- `user_id` (uuid, PK)
- `current_era` (text, default 'primitive') — primitive/ancient/medieval/modern/contemporary/future
- `days_acceleration_used` (int, default 0)
- `next_milestone_day` (int, default 1)

各テーブルに以下のRLSポリシーを設定してください:
- SELECT: `auth.uid() = user_id` のみ
- INSERT: `auth.uid() = user_id` のみ
- UPDATE: `auth.uid() = user_id` のみ
- DELETE: 必要な場合のみ。原則禁止方向で

`REVOKE ALL ON public.<table> FROM public;` も適用してください。

---

## ファイル/フォルダ構成(推奨)

このフェーズ完了時の最終構成:

```
プロジェクトルート/
├── docs/                        ← ナレッジMD(既存、編集しない)
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── signup/page.tsx
│   │   │   ├── login/page.tsx
│   │   │   └── recover/page.tsx
│   │   ├── (app)/
│   │   │   └── dashboard/page.tsx  ← 仮実装(認証後の遷移先)
│   │   ├── layout.tsx
│   │   └── page.tsx                ← ランディング(認証前)
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts           ← ブラウザ用
│   │   │   ├── server.ts           ← サーバー用
│   │   │   └── middleware.ts       ← セッション更新
│   │   ├── auth/
│   │   │   ├── constants.ts        ← ダミードメイン等
│   │   │   ├── recovery.ts         ← リカバリーコード生成・検証
│   │   │   └── validators.ts       ← username/password バリデーション
│   │   └── stores/                 ← Zustand(このフェーズではほぼ空)
│   ├── components/
│   │   └── auth/                   ← 認証フォーム類
│   └── types/
├── supabase/
│   └── migrations/
│       └── 0001_initial_schema.sql ← 初期スキーマ + RLS
├── public/
├── .env.local                       ← ユーザーが手動で記入(.gitignore済み)
├── .env.local.example               ← サンプル(コミット可)
├── .gitignore
├── package.json
├── pnpm-workspace.yaml              ← サプライチェーン対策設定
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── wrangler.jsonc                   ← Cloudflare Workers 設定
├── open-next.config.ts              ← OpenNext 設定
└── README.md
```

---

## 環境変数の取り扱い

ユーザーが手動で `.env.local` に書き込む前提です。プロジェクト直下に `.env.local.example` を作成し、以下の内容にしてください:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# 認証(ダミードメイン)
DUMMY_EMAIL_DOMAIN=dummy.cityup.local
```

`.gitignore` には `.env.local` を必ず含めてください。

---

## サプライチェーン攻撃対策(必須)

プロジェクトルートに `pnpm-workspace.yaml` を作り、以下を記述してください:

```yaml
pnpm:
  minimumReleaseAge: 7200       # 5日 = 7200分。これより新しいパッケージは入れない
  minimumReleaseAgeStrict: true # 古いバージョンへフォールバックせず、不適合なら失敗
  blockExoticSubdeps: true      # 非標準ソースからの依存解決をブロック(pnpm 11 デフォルト)
```

これにより、5日以内に公開された npm パッケージは一切インストールされなくなります。
**この設定は最初の `pnpm install` の前に必ず作成**してください。

---

## Cloudflare Workers デプロイ準備

**重要**: `@cloudflare/next-on-pages` は廃止済みです。**必ず `@opennextjs/cloudflare` を使ってください**。

このフェーズではデプロイ自体はせず、**設定ファイルの準備のみ**行ってください:

- `wrangler.jsonc` の作成
- `open-next.config.ts` の作成
- `package.json` に `preview` / `deploy` スクリプトを追加
- `.gitignore` に `.open-next/` を追加
- Next.js コードで `export const runtime = "edge"` を使わないこと(Node.js runtime のみ対応)

---

## ユーザーへの指示(あなたが私に求めるべきもの)

以下のものは**私(ユーザー)自身が用意する**情報なので、必要なタイミングで明示的に聞いてください:

1. **Supabase の3つのキー**(取得済み):
   - Project URL
   - anon public key
   - service_role key
   → `.env.local` への記入方法を案内してください

2. **初期スキーマ SQL の実行方法**: Supabase Dashboard の SQL Editor に貼り付けて実行する手順を簡潔に案内してください

3. **その他、私が知っておくべき注意点があれば随時報告**してください

---

## 進め方の指示

以下の順番で進めてください。**各ステップで動作確認できる状態にしてから次へ**進んでください。

### ステップ 1: プロジェクト初期化
- pnpm でプロジェクト作成
- `pnpm-workspace.yaml` で minimumReleaseAge 設定(これを **最初に** やる)
- 必要なパッケージのインストール
- TypeScript / Tailwind / ESLint 設定

### ステップ 2: Supabase クライアント設定
- `lib/supabase/client.ts` / `server.ts` / `middleware.ts` の実装
- Next.js middleware でセッション更新

### ステップ 3: DBスキーマ作成
- `supabase/migrations/0001_initial_schema.sql` の作成
- RLS ポリシーをすべて含める
- 私に「Supabase Dashboard で実行してください」と案内

### ステップ 4: 認証ロジック実装
- リカバリーコード生成(12桁、英数字)とハッシュ化
- ユーザーネーム → ダミーメール変換ロジック
- username/password バリデーション
- サインアップ・ログイン・リカバリー画面

### ステップ 5: 仮の dashboard ページ
- ログイン後の遷移先として最小限のページを用意(「ようこそ、{username}さん」程度)
- ログアウトボタンも実装

### ステップ 6: Cloudflare Workers 設定ファイルの準備
- `wrangler.jsonc`、`open-next.config.ts` の作成
- 動作確認は次フェーズに送る(設定の存在だけ)

### ステップ 7: README.md 作成
- セットアップ手順、開発サーバ起動、デプロイ方法を簡潔にまとめる

---

## このフェーズで **やらない** こと

- 街並みUIの実装
- チェックボックスのコインロジック
- マイルストーン演出
- シェアカード生成
- 月次サマリー機能
- 装飾アイテム
- 本番デプロイ(設定の準備だけ)

これらは次フェーズ以降で扱います。

---

## あなたが私に最初に確認すべきこと

開発を始める前に、以下を私に確認してください:

1. Node.js のバージョンが 22 以上か
2. pnpm がインストール済みか、バージョンは 11 以上か
3. プロジェクトを置きたいディレクトリのパス
4. プロジェクト名(英小文字+ハイフン推奨。デフォルト案: `city-up`)
5. `docs/` 配下にナレッジMD3つが配置されているか

確認後、ステップ1から順に進めてください。

---

## 完了の定義

フェーズ1が完了したと判断する条件:

- [ ] `pnpm dev` でローカルサーバが起動する
- [ ] サインアップでユーザー作成 → リカバリーコード表示 → ログイン → ログアウトの一連フローが動く
- [ ] リカバリーコードでパスワードリセットができる
- [ ] Supabase Dashboard で初期スキーマが反映され、全テーブルでRLSが有効になっている
- [ ] `.env.local.example` と README が整備されている
- [ ] Cloudflare Workers 用の設定ファイルが存在する(動作確認は不要)
- [ ] ユニットテスト、E2Eテストはこのフェーズでは不要(後フェーズで追加)

完了したら、私に「フェーズ1完了報告」を出してください。次のフェーズに進みます。
