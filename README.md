# テレアポ・トークポータル

社内向けのテレアポ品質向上ポータルです。  
単なるマニュアルではなく、毎日確認する社内ホームとして「周知事項」「よく使う導線」「最近の更新」を集約し、トーク再現性を高めることを目的としています。

## 概要

- ルーティング: `/` (Home), `/talks` (トーク一覧), `/talks/[id]` (トーク詳細), `/admin/script-permissions` (権限管理)
- UI方針: 固定サイドバー + 上部検索バー + 視認性重視のカード設計
- 技術: Next.js(App Router), TypeScript, Tailwind CSS, shadcn/ui, Lucide
- データ取得: 初期は local mock data、`repository` 層経由で参照

## セットアップ方法

```bash
npm install
npm run dev
```

`.env.local` を作成し、Apps Script の Web アプリURLを設定します。

```bash
NEXT_PUBLIC_TALK_API_URL=https://script.google.com/a/macros/bb-connection.com/s/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx/exec
```

ブラウザで `http://localhost:3000` を開いて確認します。

### GitHub Pages デプロイ時の環境変数

`NEXT_PUBLIC_TALK_API_URL` はビルド時に静的埋め込みされるため、`.env.local` だけでは GitHub Pages には反映されません。

1. GitHub リポジトリの `Settings` -> `Secrets and variables` -> `Actions` -> `Variables` を開く
2. `New repository variable` で以下を作成

```text
Name: NEXT_PUBLIC_TALK_API_URL
Value: https://script.google.com/.../exec
```

設定後に `main` へ push すると、Actions の `Deploy To GitHub Pages` で変数を読み取ってビルドします。

### 補助コマンド

```bash
npm run lint
npm run format:check
npm run format
npm run build
```

## ディレクトリ構成

```text
src/
	app/
		page.tsx                 # Home
		talks/page.tsx           # トーク一覧
		talks/[id]/page.tsx      # トーク詳細
		layout.tsx               # 全体レイアウト(AppShell)
	components/
		layout/                  # Sidebar / Header / Shell
		talk/                    # トーク詳細UI(Accordion)
		shared/                  # 共通見出しなど
		ui/                      # shadcn/ui primitives
	data/
		mock/talks.ts            # 初期ダミーデータ
	repositories/
		talk-repository.ts       # repository interface
		mock/mock-talk-repository.ts
	lib/
		repository.ts            # DIエントリ(現状Mock実装)
	types/
		talk.ts                  # ドメイン型
```

## 今後の拡張方針

1. **データソース差し替え**
	 - `TalkRepository` を実装追加して Google Sheets / DB へ接続
	 - 既存ページは `talkRepository` 参照のまま維持

2. **認証・権限管理**
	 - NextAuth等を導入し、閲覧者ロールと編集者ロールを分離
	 - 周知事項の投稿/承認フローを追加

3. **ログ収集と分析**
	 - 閲覧ログ・検索語・閲覧完了率のイベント設計
	 - 成果の高いトーク構成の比較分析を実装

4. **AI連携**
	 - 架電ログ要約・改善提案・NG検知を段階導入
	 - トークセクション単位の改善履歴を保持

## Apps Script 連携

- Apps Script のサンプル実装は `docs/apps-script-webapp-template.gs` を参照
- Web アプリ設定は「実行ユーザー: アクセスしているユーザー」を推奨
- サイトアクセスは Google アカウント/ドメイン判定ではなく、`PORTAL_ACCESS_PASSWORD` による共通パスワード認証で制御
- フロントは起動時に `action=bootstrap` でトークデータを取得
- 初回アクセス時はパスワード入力画面が表示され、認証成功後は同一ユーザーで再入力を省略
- 社内権限の反映が必要な場合はホーム画面の「社内メール連携」で実効メールアドレスを設定可能
- API URL は必ず Web アプリの `/exec` URL を使用（`/echo?user_content_key=...` は使用しない）
- `PORTAL_ACCESS_PASSWORD` は Script Properties へ必須設定
- 社内メール連携情報は Apps Script の User Properties に保存するため、追加シート作成は不要

### Closing シート設計（1 URL運用）

- シート名: `Closing`（Script Properties の `CLOSING_SHEET` で変更可能）
- 1ユーザー1行で管理し、日付・月替わりはAPI内部で自動リセット

```text
email,
day_key,
month_key,
today_closing_count,
today_acquired_pt,
today_dialog_count,
monthly_closing_count,
last_closing_at,
updated_at,
updated_by
```

- 監査ログは `ClosingAudit`（`CLOSING_AUDIT_SHEET`）へ追記
- `docs/apps-script-webapp-template.gs` をデプロイしたら、必ず「新しいデプロイ」を作成して `/exec` URL 側を更新

### 認証トラブル時の確認

1. `NEXT_PUBLIC_TALK_API_URL` が `/exec` 形式になっていることを確認
2. Script Properties に `PORTAL_ACCESS_PASSWORD` が設定されていることを確認
3. 初回アクセスでパスワード入力画面が表示されることを確認
4. メールアドレス判定が想定と異なる場合は、ホーム画面から社内メール連携を設定して再読み込み

### 編集機能

- トーク詳細ページで `canEdit=true` のユーザーにのみ「編集」ボタンを表示
- 編集ページは `/talks/[id]/edit` で、JSON編集後に保存すると `doPost(action=updateTalk)` で反映
- ホームページではログインユーザー本人が表示名を更新可能（`doPost(action=updateMyDisplayName)`）

### 権限管理（admin専用タブ）

- admin ユーザーにのみナビゲーションへ「権限管理」タブを表示
- ページは `/admin/script-permissions` で、Editors シートの権限を付与・更新・削除可能
- 一覧取得は `doGet(action=listEditorPermissions)`、更新は `doPost(action=upsertEditorPermission)`、削除は `doPost(action=deleteEditorPermission)`
- `Editors` シートは少なくとも以下の列を持つことを推奨

```text
email, name, can_edit, is_active, is_admin, updated_at, updated_by
```

- `name` を設定すると、管理画面のメンバー表示やランキングでメールアドレスの代わりに表示名を優先表示

- `is_admin=true` かつ `is_active=true` のユーザーのみ管理ページへアクセス可能

### 一括移行（モック -> Talksシート）

- 一括投入UIは恒常運用対象外のため、通常画面からは非表示
- 初回投入はターミナルで以下を実行

```bash
npm run dev
npm run migrate:talks
```

- `migrate:talks` は内部の投入ページを自動で開き、`autorun=1` で投入処理を開始
- 単体投入したい場合は `talkId` を付与して実行可能

```powershell
./scripts/run-talk-migration.ps1 -TalkId "hikari-kojin-standard"
```

- 直接URLを開く場合は `/talks/migrate?autorun=1&talkId=<トークID>` を使用
- 内部実装は `src/lib/talk-migration.ts` を使用
