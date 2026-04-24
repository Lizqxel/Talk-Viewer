export type TalkDifficulty = "初級" | "中級" | "上級";

export type KnownTalkProduct = "hikari" | "denki" | "wifi" | "oa";

export type TalkProduct = KnownTalkProduct | (string & {});

export type TalkScene =
  | "kojin"
  | "hojin"
  | "objection"
  | "remind"
  | "reception"
  | "negotiation";

export type NodeKind = "opening" | "hearing" | "proposal" | "objection" | "closing" | "note";

export type TalkDetailLayout = "script-flow" | "tree";

export interface TalkPointBlock {
  afterLine: number;
  mindset: string;
  skill: string;
}

export interface TalkBranchGuide {
  afterLine: number;
  trigger: string;
  action: string;
  branches?: TalkBranchGuide[];
}

export interface TalkOutReply {
  out: string;
  reply: string;
}

export interface TalkSectionDef {
  id: string;
  title: string;
  nodeIds: string[];
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
  branchGuides?: TalkBranchGuide[];
  outReplies?: TalkOutReply[];
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
  detailLayout?: TalkDetailLayout;
  salesCommentTemplate?: string;
  sectionDefs?: TalkSectionDef[];
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
}
