export type TalkSectionKind = "firstContact" | "counter" | "closing" | "ng";

export interface TalkSection {
  id: string;
  kind: TalkSectionKind;
  title: string;
  intent: string;
  lines: string[];
}

export interface Talk {
  id: string;
  title: string;
  categoryId: string;
  categoryName: string;
  summary: string;
  targetPersona: string;
  difficulty: "初級" | "中級" | "上級";
  tags: string[];
  updatedAt: string;
  sections: TalkSection[];
}

export interface TalkCategory {
  id: string;
  name: string;
  description: string;
  talkCount: number;
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
  title: string;
  detail: string;
  date: string;
  type: "talk" | "notice" | "system";
}
