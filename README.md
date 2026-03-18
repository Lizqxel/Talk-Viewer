# テレアポ・トークポータル

社内向けのテレアポ品質向上ポータルです。  
単なるマニュアルではなく、毎日確認する社内ホームとして「周知事項」「よく使う導線」「最近の更新」を集約し、トーク再現性を高めることを目的としています。

## 概要

- ルーティング: `/` (Home), `/talks` (トーク一覧), `/talks/[id]` (トーク詳細)
- UI方針: 固定サイドバー + 上部検索バー + 視認性重視のカード設計
- 技術: Next.js(App Router), TypeScript, Tailwind CSS, shadcn/ui, Lucide
- データ取得: 初期は local mock data、`repository` 層経由で参照

## セットアップ方法

```bash
npm install
npm run dev
```

ブラウザで `http://localhost:3000` を開いて確認します。

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
