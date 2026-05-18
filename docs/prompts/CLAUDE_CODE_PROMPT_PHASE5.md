# Claude Code 用プロンプト ─ フェーズ5: 本番デプロイ + ポリッシュ

このプロンプトは VSCode 内の Claude Code 拡張機能に渡す指示書です。
フェーズ4-Bまでで機能が完成しました。フェーズ5では**Cloudflare Workers への本番デプロイ**と**保留にしてきたポリッシュ項目**を片付けます。

---

## 前提

このフェーズに入る前に、以下を必ず確認してください:

1. プロジェクトルートの `CLAUDE.md` を読み、共通ルールを把握する
2. `docs/prompts/` 配下の過去プロンプトを全て確認
3. `docs/knowledge/` 配下のナレッジMDを確認
4. 既存のSupabaseマイグレーション(`supabase/migrations/0001` 〜 `0004`)を読み、各SQLの目的を理解する

過去のフェーズで決めたルール・命名規則・ファイル構造を踏襲してください。
変更が必要な場合は、変更理由を私に明示的に伝えた上で許可を取ってください。

---

## あなたの役割

経験豊富な Cloudflare Workers + Next.js + Supabase 運用エンジニアとして、本番デプロイを完遂してください。
セキュリティ運用ルールは過去フェーズと同様に厳守してください。

---

## このフェーズで作るもの

**フェーズ5のスコープ**: 本番投入と仕上げ。

1. **Cloudflare Workers 実機検証**(`pnpm preview` でローカル動作確認)
2. **本番用 Supabase プロジェクトのセットアップ**(開発用と分離)
3. **Cloudflare Workers への本番デプロイ**(`workers.dev` ドメイン、アクセス制限あり)
4. **アクセス制限ロジック**(招待制 or 自分しかサインアップできない仕組み)
5. **フェーズ4-B 留保点の解消**:
   - 日本語フォント対応(Noto Sans JP)
   - Web Share API 追加
   - マイルストーントーストの `sessionStorage` 永続化
6. **0→1→0→1 バグの再発防止テスト**(手動チェックリスト)
7. **本番運用準備**(エラーログ確認、デバッグツール削除)

**やらないこと**: 装飾デザインの差し替え・対外的な告知作業(別フェーズ or リリース後)

---

## セキュリティ運用ルール(絶対遵守)

`docs/knowledge/03a_Webアプリ_メイン_認証セキュリティ.md` の全ルールを厳守。

### このフェーズでの特に重要なポイント
- **本番用Supabaseの `service_role` キーは絶対にGitに上げない**
- 本番デプロイ時、`.env` 系ファイルがbundleに含まれていないか確認
- Cloudflare Workersの環境変数は wrangler の secret で管理する(平文で公開しない)
- 本番Supabaseの**RLSが全テーブルで有効になっているか**を最初に確認する
- 開発用Supabaseの設定をそのままコピーするのではなく、本番用に新規セットアップ

### Security Audit First
本番デプロイ前に、以下を内部で監査して結果を短く報告してください:
- service_role キーがクライアントコードや `NEXT_PUBLIC_*` に混入していないか
- 全テーブルでRLSが有効か
- 認証なしでAPIを叩いた時に401が返るか
- 本番ビルドの bundle に `.env.local` の内容が含まれていないか

---

## 仕様詳細

### 1. Cloudflare Workers 実機検証(最重要)

#### 目的
本番デプロイの前に、ローカルで OpenNext + wrangler を使って動作確認する。
これまで `pnpm build`(Next.js 標準)は通っていたが、`pnpm preview` は `.dev.vars` 未整備で動かしていなかった。

#### 手順
1. **`.dev.vars` の整備**:
   - プロジェクトルートに `.dev.vars` を作成(.gitignore済みであることを確認)
   - 開発用Supabaseの URL / anon key / service_role key を記入
   - 必要なら `.dev.vars.example` も作る(コミット可)

2. **OpenNext でビルド**:
   - `pnpm preview`(または同等のコマンド)を実行
   - エラーが出たら一つずつ潰す
   - よくある問題:
     - `node:` プレフィックスのモジュール参照
     - `process.env` の参照方法
     - 画像最適化の挙動

3. **実機検証チェック**(全部通すこと):
   - サインアップ → リカバリーコード表示 → ログイン → ログアウト
   - チェックボックス入力 → コイン獲得
   - 週次目標 → 進捗記入
   - 月次成果入力
   - 街並み表示(マイルストーン演出含む)
   - 振り返り画面(時代スライダー / 進捗スライダー)
   - 過去比較機能
   - シェアカード生成(16:9 と 1:1 両方)
   - マイルストーン提案トースト
   - 月次自動シェアカード生成(Day 90 以降)

#### 詰まった場合のデバッグ手順
- ブラウザの開発者ツールでネットワークタブを確認(エラーレスポンスの中身を見る)
- wranglerのターミナル出力を確認(サーバー側エラー)
- `wrangler tail` でリアルタイムログを取得
- Cloudflare Workers の制約(CPU時間、メモリ等)に当たっていないか確認

---

### 2. 本番用 Supabase プロジェクトのセットアップ

#### 手順(ユーザーが実施、Claude Codeは案内する)

1. Supabase ダッシュボードで**新規プロジェクトを作成**
   - プロジェクト名: `city-up-prod`(推奨)
   - リージョン: Tokyo (ap-northeast-1)
   - データベースパスワードを安全に保管

2. **3つのキーを取得**(開発用とは別):
   - Project URL
   - anon public key
   - service_role key

3. **マイグレーションを順番に適用**(Claude Codeが案内):
   - `0001_initial_schema.sql`(初期スキーマ + RLS)
   - `0002_coin_logic.sql`(コインRPC関数)
   - `0003_season_and_era.sql`(季節とera関連)
   - `0004_fix_apply_coin_target.sql`(コインバグ修正)

   **重要**: 各マイグレーションの適用順序を厳守してください。
   Supabase Dashboard の SQL Editor に貼り付けて実行する形式。

4. **適用後の確認**:
   - 全テーブルが作成されている
   - 全テーブルで RLS が有効
   - RPC関数が登録されている
   - `0004` のバグ修正が適用されている(後述のテストで確認)

---

### 3. Cloudflare Workers への本番デプロイ

#### 手順

1. **環境変数を Cloudflare Workers の secret に登録**:
   - `wrangler secret put NEXT_PUBLIC_SUPABASE_URL` (本番URL)
   - `wrangler secret put NEXT_PUBLIC_SUPABASE_ANON_KEY` (本番anon key)
   - `wrangler secret put SUPABASE_SERVICE_ROLE_KEY` (本番service_role key)
   - `wrangler secret put DUMMY_EMAIL_DOMAIN` (本番用ダミードメイン)
   - その他 `.env.local` で使っている変数すべて

2. **wrangler.jsonc の確認・調整**:
   - プロジェクト名
   - compatibility_date が最新版か
   - compatibility_flags(nodejs_compat など)が適切か

3. **デプロイ実行**:
   - `pnpm deploy`(または `wrangler deploy`)
   - 完了したら `https://your-project.workers.dev` でアクセス可能

4. **本番動作確認**:
   - 上記「実機検証チェック」と同じ項目を本番環境で実行

---

### 4. アクセス制限ロジック(招待制)

#### 目的
本番だが当面は自分しか触れない状態にする。
バグや問題が出たら、対外的な影響を最小化できる。

#### 実装方針(Claude Codeが選択)

選択肢A: **サインアップ無効化** + 既存ユーザーのみログイン可
- 一番シンプル
- 自分のアカウントを本番Supabaseに事前作成しておく
- サインアップ画面を「現在クローズドベータ中です」と表示にする
- `app/(auth)/signup/page.tsx` に環境変数フラグで分岐(`NEXT_PUBLIC_SIGNUP_ENABLED`)

選択肢B: **招待コード制**
- サインアップ時に招待コードを要求
- 自分が知っているコードのみ通過
- 後で他人を招待するのも簡単

**推奨**: 選択肢A。MVPは自分しか使わないシンプルな状態が最も安全。
後で公開する時に環境変数 `NEXT_PUBLIC_SIGNUP_ENABLED=true` に切り替えるだけで開放できる。

#### 実装後
- 本番URLにアクセスしてサインアップが**できない**ことを確認
- 既存アカウント(あなたが事前に作ったもの)でログインできることを確認

---

### 5. フェーズ4-B 留保点の解消

#### 5-1. 日本語フォント対応(Noto Sans JP)

シェアカードに日本語を入れたくなった時のため、Noto Sans JPに対応させる。

実装方針:
- `public/fonts/` に Noto Sans JP の TTF を配置(または CDN から取得)
- `app/api/share-card/route.tsx` で `fonts:` 配列に渡す
- Satoriが日本語を正しくレンダリングできることを確認

シェアカードの定型文を日本語化する例:
- 「Month X」→「{X}ヶ月目」
- 「Day NNN」→「{NNN}日目」
- 表示する文言は最終的にあなた(ユーザー)に確認を取る

#### 5-2. Web Share API 追加

モバイル向けに `navigator.share` を使えるようにする。

実装方針:
- `components/share/ShareCardModal.tsx` で `navigator.share` の対応判定
- 対応している場合: Web Share API を優先(画像と一緒にネイティブ共有シート)
- 非対応の場合: 既存の X intent にフォールバック
- 共有テキストは控えめに(「Day NNN、街がここまで育ちました。」程度)

#### 5-3. マイルストーントーストの `sessionStorage` 永続化

現状: メモリのみで、リロードすると再表示される
修正: `sessionStorage` に「shown」を保存して、同セッション内では再表示しない

実装方針:
- `components/toast/MilestoneToast.tsx` または対応する Zustand ストア(`mentorStore.ts` あたり?)を確認
- `sessionStorage.setItem('milestone-shown-{day}', 'true')` で記録
- 表示前に `sessionStorage.getItem` でチェック
- セッション = ブラウザタブを閉じるまで(タブを閉じると消える)

---

### 6. 0→1→0→1 バグの再発防止テスト

#### 背景
フェーズ2時点で「全チェックを外した後、再チェックしようとするとエラー」というバグが発生し、
`0004_fix_apply_coin_target.sql` で修正された。本番デプロイ後にこのバグが再発していないか手動で確認する。

#### 手動テスト手順

1. 開発環境でテスト用アカウントにログイン
2. 今日のチェックを3つ全部 ON
3. コインが 4 になっていることを確認(チェック3個ボーナス込)
4. 3つ全部 OFF に戻す
5. コインが 0 に戻ることを確認
6. 再度 3つ全部 ON
7. **エラーが出ずに**コインが 4 になることを確認
8. 0→1→0→1 を繰り返してもエラーが出ないことを確認

#### 詰まった場合のデバッグ方法

エラーが再発した場合、以下を順に確認:

1. **ブラウザの開発者ツール → コンソール**:
   - クライアント側のエラーメッセージを確認

2. **ブラウザの開発者ツール → ネットワーク**:
   - Server Action や RPC のレスポンスを確認
   - エラーレスポンスの中身(エラーコード・メッセージ)を読む

3. **Supabase Dashboard → Logs**:
   - PostgreSQL のエラーログを確認
   - `apply_coin_target` または類似のRPC関数でエラーが出ていないか

4. **コード調査**:
   - `src/app/actions/checks.ts` のチェックON/OFFロジック
   - `src/lib/coins/calculator.ts` のコイン計算ロジック
   - `supabase/migrations/0004_fix_apply_coin_target.sql` の修正内容
   - 上記3つの整合性を確認

5. **クライアント側の状態とサーバー側の状態のズレ**を疑う:
   - Zustand などのクライアント状態
   - サーバー側のレコード
   - どちらが「正」になっているか確認

修正後、再度0→1→0→1テストを通すまで完了としない。

---

### 7. 本番運用準備

#### 7-1. デバッグツールの削除

フェーズ3で導入したデバッグツール(`app/(debug)/`)を削除する。

手順:
1. `src/app/(debug)/` フォルダごと削除
2. `src/lib/debug/enabled.ts` を削除(または環境変数で本番無効化されているなら残してもよい)
3. `src/lib/stores/debugStore.ts` を削除
4. グローバルナビなどから debug へのリンクを削除
5. `.env.local.example` から `NEXT_PUBLIC_DEBUG_MODE` を削除

**注意**: 開発環境では引き続きデバッグツールを使いたいので、**本番ビルドのみで削除される設計**にするのも一案。
ただし、削除する方が確実(コードベースから消える)。

ユーザーに確認: 「デバッグツールを完全削除しますか? それとも開発環境では残しますか?」

#### 7-2. エラーログ確認

Cloudflare Workersのログを確認できる状態にする:
- `wrangler tail` でリアルタイムログ
- Cloudflare Dashboard の Workers Analytics
- Supabase Dashboard の Database Logs

これらの確認方法を README に追記しておく。

#### 7-3. 本番URLを定数化

シェアカードで使う「アプリ名・URL」が本番URLになるよう、環境変数 or 定数を更新:
- `src/lib/share/constants.ts` などで管理
- 開発時は `localhost:3000`、本番時は `your-project.workers.dev`

---

## ファイル/フォルダ構成の変更

新規追加:
```
.dev.vars                                  ← Cloudflare Workers ローカル開発用(.gitignore済み)
.dev.vars.example                          ← サンプル(コミット可)
public/fonts/NotoSansJP-Regular.ttf       ← Noto Sans JP(または別配置)
```

削除予定:
```
src/app/(debug)/                          ← デバッグツール削除
src/lib/debug/                            ← (確認の上、削除)
src/lib/stores/debugStore.ts              ← (確認の上、削除)
```

更新:
```
.env.local.example                        ← DEBUG_MODE削除
src/app/api/share-card/route.tsx          ← Noto Sans JP対応
src/components/share/ShareCardModal.tsx   ← Web Share API追加
src/components/toast/MilestoneToast.tsx   ← sessionStorage化(or 関連ストア)
src/app/(auth)/signup/page.tsx            ← サインアップ無効化フラグ
src/lib/share/constants.ts                ← 本番URL対応
README.md                                  ← デプロイ手順・ログ確認方法
```

---

## 進め方の指示

各ステップ完了ごとに動作確認してから次へ進んでください。

### ステップ 1: ローカル実機検証(`pnpm preview`)
- `.dev.vars` 整備
- OpenNext + wrangler でローカル動作
- 全機能の動作確認
- 詰まったらユーザーに報告(私が一緒に解決します)

### ステップ 2: フェーズ4-B 留保点の解消
- 日本語フォント対応
- Web Share API
- sessionStorage 化

### ステップ 3: 0→1→0→1 バグの再発防止テスト
- 手動テスト実施
- エラーが出たらデバッグ手順に従って原因究明

### ステップ 4: 本番Supabaseセットアップ
- 新規プロジェクト作成のユーザー案内
- マイグレーション順次適用
- RLS確認

### ステップ 5: アクセス制限ロジック
- サインアップ無効化フラグ実装
- 動作確認

### ステップ 6: 本番運用準備
- デバッグツール削除(ユーザーに確認)
- 本番URL定数化
- README更新

### ステップ 7: Cloudflare Workers デプロイ
- wrangler secret 登録
- `pnpm deploy` 実行
- 本番URLでの動作確認

### ステップ 8: 最終チェック
- 全機能の本番動作確認
- セキュリティ監査結果報告
- ユーザーに完了報告

---

## このフェーズで **やらない** こと

- 装飾デザインの差し替え(プレースホルダーのまま)
- 対外的な告知(Xポスト等はユーザーが自分でやる)
- 独自ドメインの取得
- ステージング環境の構築
- 大規模リファクタリング

---

## ユーザーへの確認事項

開発を始める前に、以下を私(ユーザー)に確認してください:

1. 本番用 Supabase プロジェクトの作成は私(ユーザー)が行うか、Claude Code が手順を案内するだけか
2. デバッグツールを完全削除するか、開発環境では残すか
3. 日本語フォント対応で、シェアカードの定型文も日本語化するか(その場合の文言)
4. 0→1→0→1 バグの修正内容(`0004` SQL)を読んで理解できたか(できたら簡単に内容を共有してほしい)

---

## ⚠️ フェーズ完了時の必須作業

実装完了後、**完了報告を出す前に**以下を必ず実行してください:

1. **`docs/prompts/README.md` の進捗表を更新**
   - フェーズ5 の状態を `🚧進行中` から `✅完了` に変更
2. **デバッグツール削除のコミット**
3. **本番URLをユーザーに通知**

---

## 完了の定義

- [ ] `pnpm preview`(OpenNext + wrangler)でローカル動作確認できた
- [ ] 全機能(認証・チェック・週次・月次・街並み・振り返り・シェアカード)がローカル本番ビルドで動く
- [ ] 0→1→0→1 のチェック切り替えでエラーが出ない
- [ ] 日本語フォント(Noto Sans JP)がシェアカードで正しくレンダリングされる
- [ ] Web Share API がモバイルで動く(対応端末で確認)
- [ ] マイルストーントーストが同セッション内で再表示されない
- [ ] 本番用 Supabase プロジェクトが作成され、全マイグレーションが適用済み
- [ ] 全テーブルで RLS が有効
- [ ] Cloudflare Workers の secret が登録済み
- [ ] サインアップが無効化されている(招待制状態)
- [ ] デバッグツールが削除済み
- [ ] `pnpm deploy` で本番デプロイ完了
- [ ] 本番URLで全機能が動作する
- [ ] セキュリティ監査結果が報告済み
- [ ] `docs/prompts/README.md` を更新済み

---

## 完了後の TODO(ユーザー自身が行うこと、Claude Code は実施しない)

フェーズ5完了報告を受け取った後、私(ユーザー)が自分で行うこと:

- [ ] **Xで本番リリースのポスト**
  - 個人情報を含まない設計なので、リリース告知は比較的安全
  - 投稿バランス7:2:1 の「宣伝1」枠として活用
  - 「個人事業主向けの継続支援アプリを公開しました」程度の控えめなトーン
- [ ] **noteで開発記録を書く**(振り返り記事)
- [ ] **サブアプリ(診断系)からの導線を作る**
- [ ] **エラーログを定期的に確認する習慣をつける**(週1程度)
- [ ] **MVP後の検討事項**:
  - 装飾アイテムの種類(MVP後判断)
  - ガチャ実装(リリース後判断)
  - 独自ドメイン取得
  - 本格的なイラストへの差し替え

完了したら「フェーズ5完了報告」を出してください。本番デプロイが完了して、本番URLが取得できた状態で報告してください。
