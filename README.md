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
- 「アクセスできるユーザー」は運用時に `bb-connection.com` ドメイン内に限定
- フロントは起動時に `action=bootstrap` でトークデータを取得
- 初回認証は `action=authorize` で行い、成功後は `return_to` で元ページへ自動復帰
- API URL は必ず Web アプリの `/exec` URL を使用（`/echo?user_content_key=...` は使用しない）
- `ALLOWED_RETURN_HOSTS` に許可する戻り先ホストを設定（例: `lizqxel.github.io,localhost:3000`）

### 認証トラブル時の確認

1. `NEXT_PUBLIC_TALK_API_URL` が `/exec` 形式になっていることを確認
2. 非許可アカウントでアクセスした場合は画面上に「許可されていないアカウントです」と表示されることを確認
3. 初回アクセスで自動認証リダイレクトされるため、通常は手動で長い認証URLを開く必要なし
4. 自動で戻らない場合のみ「認証ページを開く」から再認証

### 編集機能

- トーク詳細ページで `canEdit=true` のユーザーにのみ「編集」ボタンを表示
- 編集ページは `/talks/[id]/edit` で、JSON編集後に保存すると `doPost(action=updateTalk)` で反映

### 権限管理（admin専用タブ）

- admin ユーザーにのみナビゲーションへ「権限管理」タブを表示
- ページは `/admin/script-permissions` で、Editors シートの権限を付与・更新可能
- 一覧取得は `doGet(action=listEditorPermissions)`、更新は `doPost(action=upsertEditorPermission)`
- `Editors` シートは少なくとも以下の列を持つことを推奨

```text
email, can_edit, is_active, is_admin, updated_at, updated_by
```

- `is_admin=true` かつ `is_active=true` のユーザーのみ管理ページへアクセス可能

### 一括移行（モック -> Talksシート）

- 一括投入UIは恒常運用対象外のため、通常画面からは非表示
- 初回投入はターミナルで以下を実行

```bash
npm run dev
npm run migrate:talks
```

- `migrate:talks` は内部の投入ページを自動で開き、`autorun=1` で投入処理を開始
- 内部実装は `src/lib/talk-migration.ts` を使用
