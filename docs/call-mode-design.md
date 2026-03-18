# 架電モード 完全設計書（MVP〜運用拡張）

最終更新: 2026-03-18

## 1. 目的

架電モードは「架電者が迷わず、速く、品質を一定に保って通話できること」を最優先にする。

このモードでは以下を満たす。

1. 台本を読み上げるための表示が最短で見つかる。
2. お客様アウト（反応）を選ぶと、即座に次の返しが表示される。
3. 通話の流れ（どの分岐を辿ったか）が記録される。
4. 終話時の結果入力が短時間で完了する。

## 2. スコープ

### 2.1 In Scope（今回の設計対象）

1. 架電中UI（読み上げ・アウト選択・次ノード遷移）
2. セッション状態管理（開始/進行/終了）
3. 通話ログ（イベント列）の記録
4. 終話処理（結果・メモ・再架電予定）
5. 最低限の失敗時リカバリ（誤タップ戻る、保存失敗時の再試行）

### 2.2 Out of Scope（後続）

1. 管理画面（台本編集、承認ワークフロー）
2. 本格分析ダッシュボード
3. 外部CTI連携
4. AI要約・自動提案

## 3. ユーザーと利用文脈

### 3.1 主ユーザー

1. 架電者（オペレーター）
2. SV（スーパーバイザー）

### 3.2 使用環境

1. PCブラウザ（優先）
2. 高ストレス環境（連続架電、短時間判断）
3. 片手マウス + 片手キーボード操作が多い

### 3.3 UX原則

1. 1画面1判断
2. 表示遅延より情報過多を避ける
3. 誤操作から即復帰できる
4. 重要操作は常に同じ位置

## 4. 情報設計（IA）

架電モードは以下の3エリア固定とする。

1. ヘッダー帯（セッション情報）
2. 中央主エリア（現在ノードの台本）
3. 右サイド（アウトボタン + 補助情報）

### 4.1 ヘッダー帯

1. セッションID
2. 経過時間
3. 現在カテゴリ/シナリオ名
4. 一時停止（将来）
5. 終話ボタン（常時表示）

### 4.2 中央主エリア（読み上げ領域）

1. ノード種別バッジ（opening/hearing/proposal/objection/closing/note）
2. ノードタイトル
3. 読み上げ本文（line配列）
4. 意図（オペレーター向け）
5. NG例
6. コツ

### 4.3 右サイド（反応選択領域）

1. 想定アウトのボタン一覧
2. 「その他」ボタン
3. 1手戻る
4. 次ノード候補のプレビュー

## 5. 画面仕様

## 5.1 画面A: 架電準備（Pre-call）

目的: 通話開始前の最短セットアップ

表示項目:

1. シナリオ選択（カテゴリ/商材/シーン）
2. 開始ノード確認
3. 顧客識別情報（任意）
4. 通話開始ボタン

操作:

1. 「開始」でCall Sessionを作成
2. 状態をactiveへ遷移
3. 架電実行画面へ遷移

## 5.2 画面B: 架電実行（In-call）

目的: 台本読み上げと分岐遷移を高速化

表示優先順位:

1. 現在ノードの読み上げ本文
2. お客様アウト選択ボタン
3. 戻る
4. ノード補助情報（意図/NG/コツ）

操作:

1. アウト選択で遷移イベントを記録し、次ノードへ
2. 末端ノード時は終話導線を強調
3. 「戻る」は直前イベントの巻き戻し

## 5.3 画面C: 終話処理（Wrap-up）

目的: 通話結果を短時間で記録

入力項目:

1. 結果種別（必須）
2. 再架電日時（条件付き必須）
3. 短文メモ（任意）
4. 不成立理由（任意、将来必須化可）

操作:

1. 保存成功でsession=completed
2. 失敗時はローカル保持 + 再送キュー

## 6. 状態遷移設計

Call Session のライフサイクル:

1. idle
2. preparing
3. active
4. wrapping
5. completed
6. abandoned

主要イベント:

1. START_SESSION
2. SELECT_OUTCOME
3. GO_BACK
4. OPEN_WRAPUP
5. SUBMIT_WRAPUP
6. SAVE_FAILED
7. RETRY_SAVE
8. CANCEL_SESSION

状態遷移ルール:

1. idle -> preparing はシナリオ選択開始時
2. preparing -> active は開始ボタン押下時
3. active -> wrapping は終話押下または終端ノード到達時
4. wrapping -> completed は保存成功
5. wrapping -> wrapping は保存失敗（再試行可）
6. active -> abandoned は強制中断

## 7. 分岐遷移ロジック

前提:

1. NodeはnextNodeIdsを持つ
2. 各nextNodeにreactionLabelを持たせ、アウト選択ボタンと対応

ルール:

1. アウト選択時に一致するreactionLabelノードへ遷移
2. 一致が複数なら優先順位で1つ決定
3. 一致なしは「その他」ハンドラへ遷移
4. 遷移不能時はフォールバックノードへ

フォールバック優先:

1. category default node
2. global fallback node
3. 現在ノード維持 + エラー表示

## 8. データモデル（型設計）

```ts
export type CallSessionStatus =
  | "idle"
  | "preparing"
  | "active"
  | "wrapping"
  | "completed"
  | "abandoned";

export type WrapUpResult =
  | "no-answer"
  | "callback"
  | "rejected"
  | "interested"
  | "appointment"
  | "invalid-number";

export interface CallSession {
  id: string;
  operatorId: string;
  talkId: string;
  status: CallSessionStatus;
  startedAt?: string;
  endedAt?: string;
  currentNodeId?: string;
  pathNodeIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CallSessionEvent {
  id: string;
  sessionId: string;
  at: string;
  type:
    | "session-started"
    | "node-entered"
    | "outcome-selected"
    | "node-back"
    | "wrapup-opened"
    | "wrapup-submitted"
    | "session-completed"
    | "session-abandoned";
  fromNodeId?: string;
  toNodeId?: string;
  outcomeLabel?: string;
  note?: string;
}

export interface CallWrapUp {
  sessionId: string;
  result: WrapUpResult;
  callbackAt?: string;
  memo?: string;
  reasonCode?: string;
  savedAt?: string;
}
```

## 9. コンポーネント設計（現行構成へのマッピング）

新規コンポーネント案:

1. call/call-session-shell.tsx
2. call/current-script-panel.tsx
3. call/outcome-selector.tsx
4. call/session-timeline-mini.tsx
5. call/wrapup-dialog.tsx

既存再利用:

1. ui/button.tsx
2. ui/card.tsx
3. ui/badge.tsx
4. motion/motion-primitives.tsx

ページ案:

1. app/call/page.tsx（準備画面）
2. app/call/live/[sessionId]/page.tsx（架電実行）

## 10. ストア/状態管理

MVP方針:

1. 画面内状態はReact state
2. セッション状態はContext + Reducer
3. 保存層はRepository interface経由

Reducerアクション:

1. startSession
2. selectOutcome
3. goBack
4. openWrapup
5. submitWrapupSuccess
6. submitWrapupFailed

設計理由:

1. 遷移ルールが明文化できる
2. テストしやすい
3. Zustand等へ移行しやすい

## 11. Repository設計拡張

現在のTalkRepositoryに加えてCallSessionRepositoryを追加する。

```ts
export interface CallSessionRepository {
  createSession(input: {
    operatorId: string;
    talkId: string;
    startedAt: string;
    rootNodeId: string;
  }): Promise<CallSession>;

  appendEvent(input: Omit<CallSessionEvent, "id">): Promise<CallSessionEvent>;

  updateCurrentNode(input: {
    sessionId: string;
    currentNodeId: string;
    updatedAt: string;
  }): Promise<void>;

  completeSession(input: {
    sessionId: string;
    endedAt: string;
    wrapup: CallWrapUp;
  }): Promise<void>;

  getSessionById(sessionId: string): Promise<CallSession | null>;
}
```

MVPではmock実装から開始し、将来DBへ差し替える。

## 12. バリデーションと業務ルール

1. active中は必ずcurrentNodeIdが存在
2. wrapup結果がcallbackならcallbackAt必須
3. completed後は編集不可（管理者権限を除く）
4. GO_BACKは先頭ノードでは無効
5. 同一タイムスタンプ衝突時はイベントID順で整列

## 13. 失敗時設計（エラーハンドリング）

1. 保存失敗時はトースト表示 + リトライボタン
2. イベントは一時キューに積んで再送可能にする
3. ネットワーク断時はローカル保持し、復旧後同期
4. 遷移不能時はフォールバック + ログ記録

## 14. 操作効率設計（キーボード）

1. 1〜9キーでアウト選択
2. Backspaceで1手戻る
3. Enterで終話ダイアログ決定
4. Escでダイアログ閉じる

注意:

1. フォーカス可視化を必須化
2. ショートカットは画面に常時表示

## 15. アクセシビリティ

1. アウトボタンにaria-labelを付与
2. 状態変化はlive regionで通知
3. 色だけに依存しない（アイコン/文言併用）
4. 文字サイズを大きめ基準（最小14px、本文16px推奨）

## 16. 監視指標（最低限）

1. 平均通話時間
2. ノード到達率
3. 分岐別の終話結果率
4. GO_BACK発生率（分岐の分かりにくさ指標）
5. 保存失敗率

## 17. 受け入れ条件（Definition of Done）

1. セッション開始から終話保存まで一連操作が可能
2. 分岐選択で次ノードが正しく表示される
3. 通話パスがイベントとして保存される
4. Wrap-up必須条件が機能する
5. 誤タップ時に1手戻れる
6. 主要操作がキーボードでも実行可能

## 18. 実装順（推奨）

1. 型追加（CallSession, Event, WrapUp）
2. Repository interface + mock実装
3. call/page.tsx（準備画面）
4. call/live/[sessionId]/page.tsx（実行画面）
5. wrapup-dialog実装
6. バリデーションとエラーハンドリング
7. テスト（遷移、wrapup条件、戻る）

## 19. テスト観点

ユニット:

1. outcome->nextNode 解決
2. GO_BACK 巻き戻し
3. wrapupバリデーション

結合:

1. 開始->分岐->終話保存の通し
2. 保存失敗時の再試行

E2E:

1. 代表シナリオ3本で完走
2. キーボード操作で完走

## 20. 将来拡張の接続点

1. CTI着信情報でpre-call自動入力
2. 音声認識でアウト推定候補を提示
3. 成約率の高い分岐を優先表示
4. スクリプト改訂のABテスト

---

この設計を基準に、次工程では「型とモックRepository」から着手すると、既存のTalkRepository構成を崩さずに拡張できる。