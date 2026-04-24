import { type Talk } from "@/types/talk";

export const DEFAULT_DOCOMO_SALES_COMMENT_TEMPLATE = [
  "名前：",
  "フリガナ：",
  "性別：",
  "年代：",
  "住まい：",
  "携帯キャリア：",
  "転番取得方法：",
  "客層/備考：",
].join("\n");

export function resolveSalesCommentTemplate(template: string | undefined) {
  const normalized = String(template ?? "");

  if (!normalized.trim()) {
    return DEFAULT_DOCOMO_SALES_COMMENT_TEMPLATE;
  }

  return normalized;
}

export function isDocomoTalk(talk: Pick<Talk, "id" | "title">) {
  const normalizedId = String(talk.id ?? "").toLowerCase();
  const normalizedTitle = String(talk.title ?? "").toLowerCase();

  return normalizedId.includes("docomo") || normalizedTitle.includes("docomo") || talk.title.includes("ドコモ");
}