import {
  type Announcement,
  type QuickLink,
  type RecentUpdate,
  type Talk,
  type TalkCategory,
} from "@/types/talk";

export const talkCategories: TalkCategory[] = [
  {
    id: "new-lead",
    name: "新規リード",
    description: "初回接触時の第一声とニーズ確認を標準化",
    talkCount: 2,
  },
  {
    id: "follow-up",
    name: "追客フォロー",
    description: "温度感別に再アプローチの成功率を上げる",
    talkCount: 1,
  },
  {
    id: "reactivation",
    name: "休眠掘り起こし",
    description: "過去接点先の再商談化を狙う",
    talkCount: 1,
  },
];

export const talks: Talk[] = [
  {
    id: "new-lead-smb-basic",
    title: "中小企業向け 初回架電ベーシック",
    categoryId: "new-lead",
    categoryName: "新規リード",
    summary:
      "30秒で目的を明確化し、担当者の課題を引き出して次回打ち合わせに接続する。",
    targetPersona: "従業員50名以下のバックオフィス責任者",
    difficulty: "初級",
    tags: ["初回接触", "課題ヒアリング", "日程化"],
    updatedAt: "2026-03-15",
    sections: [
      {
        id: "first-contact",
        kind: "firstContact",
        title: "第一声",
        intent: "安心感を与えつつ、電話の目的を簡潔に伝える",
        lines: [
          "お忙しいところ失礼します。◯◯社の△△と申します。1分だけ、業務効率化の情報提供でお時間よろしいでしょうか。",
          "突然のお電話で恐縮ですが、同規模企業様でご相談が増えている課題について共有したくご連絡しました。",
        ],
      },
      {
        id: "counter-questions",
        kind: "counter",
        title: "切り返し",
        intent: "断り文句を受け止め、相手の負担を増やさず会話を継続する",
        lines: [
          "今は忙しい → 承知しました。30秒で要点だけお伝えして、不要ならここで切っていただいて大丈夫です。",
          "必要ない → ありがとうございます。現状の運用で困りごとがないかだけ確認させてください。",
        ],
      },
      {
        id: "closing",
        kind: "closing",
        title: "クロージング",
        intent: "次回アクションを明確化して合意を取る",
        lines: [
          "詳細は10分でご説明できます。明日か明後日でご都合の良い時間はありますか。",
          "本日お伝えした要点を1枚にまとめて送ります。ご確認後に5分だけ意見をいただけますか。",
        ],
      },
      {
        id: "ng-examples",
        kind: "ng",
        title: "NG例",
        intent: "成果を下げる言い回しを避ける",
        lines: [
          "最初から機能説明に入る",
          "相手の状況確認なしに一方的に提案する",
          "曖昧な終わり方で次回アクションを決めない",
        ],
      },
    ],
  },
  {
    id: "new-lead-enterprise-objection",
    title: "エンプラ向け 反論対応テンプレート",
    categoryId: "new-lead",
    categoryName: "新規リード",
    summary: "稟議・セキュリティ懸念を想定し、初回で検討テーブルに乗せる。",
    targetPersona: "情報システム部門責任者",
    difficulty: "中級",
    tags: ["反論処理", "稟議", "セキュリティ"],
    updatedAt: "2026-03-12",
    sections: [
      {
        id: "enterprise-first",
        kind: "firstContact",
        title: "第一声",
        intent: "検討前提を崩さず、比較対象の一つとして認識してもらう",
        lines: [
          "既存運用を変えずに改善できる選択肢の共有です。比較検討の材料として2点だけご説明します。",
        ],
      },
      {
        id: "enterprise-counter",
        kind: "counter",
        title: "切り返し",
        intent: "障壁を要件として言語化し、次回提案に転換する",
        lines: [
          "セキュリティが不安 → 監査対応済みのチェックリストを先に共有できます。貴社基準と照合しませんか。",
          "稟議が通らない → 稟議資料の雛形をこちらで準備します。必要項目を先に確認させてください。",
        ],
      },
      {
        id: "enterprise-closing",
        kind: "closing",
        title: "クロージング",
        intent: "関係者を巻き込む場を設定する",
        lines: [
          "次回は運用担当の方にも同席いただき、要件擦り合わせを20分だけお願いできますか。",
        ],
      },
      {
        id: "enterprise-ng",
        kind: "ng",
        title: "NG例",
        intent: "エンプラ商談で失点しやすい挙動を避ける",
        lines: [
          "『他社でも導入している』だけで押し切る",
          "意思決定フローを聞かずに価格提示する",
        ],
      },
    ],
  },
  {
    id: "follow-up-weekly-checkin",
    title: "追客 週次チェックイン",
    categoryId: "follow-up",
    categoryName: "追客フォロー",
    summary: "失注回避のための状況確認と、温度感を上げる再提案トーク。",
    targetPersona: "検討中で停滞している担当者",
    difficulty: "初級",
    tags: ["追客", "再提案", "温度感"],
    updatedAt: "2026-03-10",
    sections: [
      {
        id: "follow-first",
        kind: "firstContact",
        title: "第一声",
        intent: "前回接点を起点に自然に会話へ入る",
        lines: ["前回のご相談内容、その後の状況確認でご連絡しました。2分だけお時間いただけますか。"],
      },
      {
        id: "follow-counter",
        kind: "counter",
        title: "切り返し",
        intent: "保留理由を解像度高く把握する",
        lines: ["検討停止中 → 承知しました。再開の判断基準だけ先に教えていただけると次回のご負担を減らせます。"],
      },
      {
        id: "follow-closing",
        kind: "closing",
        title: "クロージング",
        intent: "再提案日程を確定する",
        lines: ["来週の定例後に10分だけ、条件整理した最新版をご共有してもよろしいですか。"],
      },
      {
        id: "follow-ng",
        kind: "ng",
        title: "NG例",
        intent: "嫌悪感のある追客を防ぐ",
        lines: ["毎回同じ訴求を繰り返す", "相手の社内事情を無視して期限を迫る"],
      },
    ],
  },
  {
    id: "reactivation-lost-account",
    title: "休眠復活 失注先リカバリー",
    categoryId: "reactivation",
    categoryName: "休眠掘り起こし",
    summary: "過去失注理由を尊重しつつ、現状変化を起点に再提案する。",
    targetPersona: "6か月以上接点がない過去商談先",
    difficulty: "上級",
    tags: ["休眠", "失注リカバリー", "再商談化"],
    updatedAt: "2026-03-08",
    sections: [
      {
        id: "reactivation-first",
        kind: "firstContact",
        title: "第一声",
        intent: "過去経緯への配慮を示し、再接触の納得感を作る",
        lines: ["以前はご検討ありがとうございました。前回課題だった点が改善できたため、情報共有でお電話しました。"],
      },
      {
        id: "reactivation-counter",
        kind: "counter",
        title: "切り返し",
        intent: "当時の判断を否定せずに再検討へつなげる",
        lines: ["前回見送りだった → その判断は妥当だったと思います。変わったのは運用負荷を減らせる部分です。"],
      },
      {
        id: "reactivation-closing",
        kind: "closing",
        title: "クロージング",
        intent: "小さな再接点を合意する",
        lines: ["資料だけ先にお送りします。不要ならそれで完結で大丈夫なので、3分だけご確認いただけますか。"],
      },
      {
        id: "reactivation-ng",
        kind: "ng",
        title: "NG例",
        intent: "過去対応への不信を生まない",
        lines: ["過去失注理由を聞かずに売り込み直す", "前回の比較軸を無視する"],
      },
    ],
  },
];

export const announcements: Announcement[] = [
  {
    id: "notice-1",
    title: "Q2トーク品質レビューの運用開始",
    body: "今週から全架電ログのうち上位20%と下位20%を対象に、トーク差分レビューを実施します。",
    level: "important",
    publishedAt: "2026-03-17",
  },
  {
    id: "notice-2",
    title: "新しいNGフレーズ基準を追加",
    body: "“機能押し売り型”の表現をNG集へ追加。詳細は各トーク詳細のNG例を確認してください。",
    level: "warning",
    publishedAt: "2026-03-14",
  },
  {
    id: "notice-3",
    title: "月次ロープレ会の資料公開",
    body: "トップセールスの切り返し実演動画リンクを社内Driveに掲載しました。",
    level: "info",
    publishedAt: "2026-03-11",
  },
];

export const quickLinks: QuickLink[] = [
  {
    id: "ql-1",
    label: "新規リードの基本トーク",
    href: "/talks/new-lead-smb-basic",
    description: "まず全員が合わせるべき標準トーク",
  },
  {
    id: "ql-2",
    label: "反論対応テンプレート",
    href: "/talks/new-lead-enterprise-objection",
    description: "頻出の断り文句に対する切り返し集",
  },
  {
    id: "ql-3",
    label: "トーク一覧を開く",
    href: "/talks",
    description: "カテゴリ別に全トークを確認",
  },
];

export const recentUpdates: RecentUpdate[] = [
  {
    id: "update-1",
    title: "中小企業向け 初回架電ベーシック",
    detail: "クロージングの文言をABテスト結果に基づいて更新",
    date: "2026-03-15",
    type: "talk",
  },
  {
    id: "update-2",
    title: "NGフレーズ運用ルール",
    detail: "レビュー指標に“相手主語率”を追加",
    date: "2026-03-14",
    type: "notice",
  },
  {
    id: "update-3",
    title: "ポータルUI初期版",
    detail: "ホーム導線とトーク詳細の閲覧導線を改善",
    date: "2026-03-13",
    type: "system",
  },
];
