import { type NodeKind, type Talk, type TalkNode } from "@/types/talk";

export interface TalkSection {
  id: string;
  title: string;
  nodes: TalkNode[];
}

export const HIKARI_SCRIPT_SECTION_DEFS = [
  {
    id: "opening",
    title: "アプローチ",
    nodeIds: ["hikari-hojin-opening", "hikari-open"],
  },
  {
    id: "requirement",
    title: "主旨 / メリット説明",
    nodeIds: ["hikari-hojin-purpose", "hikari-hojin-merit", "hikari-purpose", "hikari-benefit"],
  },
  {
    id: "age-check",
    title: "年齢確認",
    nodeIds: ["hikari-hojin-age-check", "hikari-age-check"],
  },
  {
    id: "benefit",
    title: "料金説明/テストクロージング",
    nodeIds: ["hikari-hojin-benefit", "hikari-price-closing"],
  },
  {
    id: "hearing",
    title: "ご本人様確認",
    nodeIds: ["hikari-hojin-hearing", "hikari-confirm-1"],
  },
  {
    id: "closing",
    title: "流れ説明 / 二重確認案内",
    nodeIds: ["hikari-hojin-next-steps", "hikari-hojin-double-check", "hikari-next-steps", "hikari-contact", "hikari-double-check"],
  },
] as const;

const DEFAULT_KIND_SECTION_TITLE: Record<NodeKind, string> = {
  opening: "オープニング",
  hearing: "ヒアリング",
  proposal: "提案",
  objection: "切り返し",
  closing: "クロージング",
  note: "メモ",
};

const KIND_ORDER: NodeKind[] = ["opening", "hearing", "proposal", "objection", "closing", "note"];

function withSectionOverride(talk: Talk, sectionId: string, fallbackTitle: string) {
  const override = talk.sectionTitleOverrides?.[sectionId];
  return override && override.trim() ? override : fallbackTitle;
}

function resolveScriptSections(talk: Talk): TalkSection[] {
  const nodeById = new Map(talk.nodes.map((node) => [node.id, node]));

  return HIKARI_SCRIPT_SECTION_DEFS
    .map((sectionDef) => {
      const sectionNodes = sectionDef.nodeIds
        .map((nodeId) => nodeById.get(nodeId))
        .filter((node): node is TalkNode => Boolean(node));

      return {
        id: sectionDef.id,
        title: withSectionOverride(talk, sectionDef.id, sectionDef.title),
        nodes: sectionNodes,
      };
    })
    .filter((section) => section.nodes.length > 0);
}

function resolveKindSections(talk: Talk): TalkSection[] {
  const groupedByKind: Partial<Record<NodeKind, TalkNode[]>> = {};

  for (const node of talk.nodes) {
    if (!groupedByKind[node.kind]) {
      groupedByKind[node.kind] = [];
    }
    groupedByKind[node.kind]?.push(node);
  }

  return KIND_ORDER
    .filter((kind) => (groupedByKind[kind]?.length ?? 0) > 0)
    .map((kind) => ({
      id: kind,
      title: withSectionOverride(talk, kind, DEFAULT_KIND_SECTION_TITLE[kind]),
      nodes: groupedByKind[kind] ?? [],
    }));
}

export function deriveTalkSections(talk: Talk): TalkSection[] {
  const scriptedSections = resolveScriptSections(talk);
  if (scriptedSections.length > 0) {
    return scriptedSections;
  }

  return resolveKindSections(talk);
}
