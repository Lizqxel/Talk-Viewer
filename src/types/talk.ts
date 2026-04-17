export type TalkDifficulty = "初級" | "中級" | "上級";

export type TalkProduct = "hikari" | "denki" | "wifi" | "oa";

export type TalkScene =
  | "kojin"
  | "hojin"
  | "objection"
  | "remind"
  | "reception"
  | "negotiation";

export type NodeKind = "opening" | "hearing" | "proposal" | "objection" | "closing" | "note";

export interface TalkPointBlock {
  afterLine: number;
  mindset: string;
  skill: string;
}

export interface TalkNode {
  id: string;
  title: string;
  kind: NodeKind;
  reactionLabel?: string;
  lines: string[];
  readAloudScript?: string[];
  branchNotes?: string[];
  operatorNotes?: string[];
  conditions?: string[];
  doNotRead?: string[];
  pointBlocks?: TalkPointBlock[];
  inlineNotes?: {
    afterLine: number;
    text: string;
    tone?: "branch" | "operator" | "condition" | "warning";
  }[];
  intent: string;
  ngExamples: string[];
  tips: string[];
  nextNodeIds: string[];
}

export interface Talk {
  id: string;
  title: string;
  categoryId: string;
  categoryName: string;
  product: TalkProduct;
  scene: TalkScene;
  summary: string;
  targetPersona: string;
  difficulty: TalkDifficulty;
  tags: string[];
  updatedAt: string;
  sectionTitleOverrides?: Record<string, string>;
  rootNodeIds: string[];
  nodes: TalkNode[];
}

export interface TalkCategory {
  id: string;
  name: string;
  description: string;
  product: TalkProduct;
  scene: TalkScene;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  level: "info" | "warning" | "important";
  publishedAt: string;
}

export interface QuickLink {
  id: string;
  label: string;
  href: string;
  description: string;
}

export interface RecentUpdate {
  id: string;
  talkId?: string;
  title: string;
  detail: string;
  date: string;
  type: "talk" | "notice" | "system";
}

export interface FeaturedItem {
  id: string;
  talkId: string;
  reason: string;
  rank: number;
}

export interface DailyHighlight {
  id: string;
  title: string;
  detail: string;
  priority: "high" | "medium";
}
