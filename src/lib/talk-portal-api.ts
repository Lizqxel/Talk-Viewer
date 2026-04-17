import {
  type Announcement,
  type DailyHighlight,
  type FeaturedItem,
  type QuickLink,
  type RecentUpdate,
  type Talk,
  type TalkCategory,
  type TalkNode,
  type TalkProduct,
  type TalkScene,
} from "@/types/talk";
import { MockTalkRepository } from "@/repositories/mock/mock-talk-repository";

export interface TalkPortalUser {
  email?: string;
  canEdit?: boolean;
  isAdmin?: boolean;
}

export interface ScriptEditorPermission {
  email: string;
  canEdit: boolean;
  isActive: boolean;
  isAdmin: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

export interface UpsertScriptEditorPermissionInput {
  email: string;
  canEdit: boolean;
  isActive: boolean;
  isAdmin: boolean;
}

export interface ScriptEditorPermissionUpsertResult {
  email: string;
  canEdit: boolean;
  isActive: boolean;
  isAdmin: boolean;
}

export interface ScriptEditorPermissionDeleteResult {
  email: string;
}

export interface TalkBootstrapPayload {
  announcements: Announcement[];
  dailyHighlights: DailyHighlight[];
  quickLinks: QuickLink[];
  featuredItems: FeaturedItem[];
  recentUpdates: RecentUpdate[];
  talkCategories: TalkCategory[];
  talkTags: string[];
  productLabels: Record<TalkProduct, string>;
  sceneLabels: Record<TalkScene, string>;
  talks: Talk[];
  user?: TalkPortalUser;
}

export interface TalkBootstrapMeta {
  source: "api" | "mock";
}

export interface TalkUpdateResult {
  talkId: string;
  revision?: number;
  transport: "fetch" | "no-cors";
}

type ApiEnvelope = {
  ok?: boolean;
  message?: string;
  error?: {
    code?: string;
    message?: string;
  };
  user?: TalkPortalUser;
  data?: Partial<TalkBootstrapPayload>;
} & Partial<TalkBootstrapPayload>;

type LooseRecord = Record<string, unknown>;

export class TalkPortalApiError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 500, code = "UNKNOWN") {
    super(message);
    this.name = "TalkPortalApiError";
    this.status = status;
    this.code = code;
  }
}

const API_URL = process.env.NEXT_PUBLIC_TALK_API_URL?.trim() ?? "";
const BOOTSTRAP_FETCH_TIMEOUT_MS = 12000;

export const DEFAULT_PRODUCT_LABELS: Record<TalkProduct, string> = {
  hikari: "光回線",
  denki: "電気",
  wifi: "WiFi",
  oa: "OA機器",
};

export const DEFAULT_SCENE_LABELS: Record<TalkScene, string> = {
  kojin: "個人宅向け",
  hojin: "法人向け",
  objection: "断り切り返し",
  remind: "リマインド",
  reception: "受付突破",
  negotiation: "商談",
};

function resolvePayload(raw: unknown): Partial<TalkBootstrapPayload> {
  if (!raw || typeof raw !== "object") {
    return {};
  }

  const envelope = raw as ApiEnvelope;
  if (envelope.data && typeof envelope.data === "object") {
    return envelope.data;
  }

  return envelope;
}

function stripInvisible(text: string) {
  return text.replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
}

function asRecord(value: unknown): LooseRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as LooseRecord;
}

function pickFirstValue(source: LooseRecord, keys: string[]) {
  for (const key of keys) {
    if (key in source) {
      return source[key];
    }
  }

  return undefined;
}

function pickArray<T>(source: LooseRecord, keys: string[]): T[] {
  const value = pickFirstValue(source, keys);
  return Array.isArray(value) ? (value as T[]) : [];
}

function pickRecord(source: LooseRecord, keys: string[]): LooseRecord | null {
  return asRecord(pickFirstValue(source, keys));
}

function toBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  if (typeof value === "string") {
    const normalized = stripInvisible(value).toLowerCase();
    if (!normalized) {
      return fallback;
    }

    if (normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "y" || normalized === "on") {
      return true;
    }

    if (normalized === "false" || normalized === "0" || normalized === "no" || normalized === "n" || normalized === "off") {
      return false;
    }
  }

  return fallback;
}

function toOptionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return toBoolean(value, false);
}

function normalizeProductLabels(raw: LooseRecord | null): Record<TalkProduct, string> {
  if (!raw) {
    return DEFAULT_PRODUCT_LABELS;
  }

  return {
    hikari: String(raw.hikari ?? DEFAULT_PRODUCT_LABELS.hikari),
    denki: String(raw.denki ?? DEFAULT_PRODUCT_LABELS.denki),
    wifi: String(raw.wifi ?? DEFAULT_PRODUCT_LABELS.wifi),
    oa: String(raw.oa ?? DEFAULT_PRODUCT_LABELS.oa),
  };
}

function normalizeSceneLabels(raw: LooseRecord | null): Record<TalkScene, string> {
  const result: Record<TalkScene, string> = { ...DEFAULT_SCENE_LABELS };

  if (!raw) {
    return result;
  }

  for (const [rawKey, rawValue] of Object.entries(raw)) {
    const normalizedKey = stripInvisible(rawKey).toLowerCase().replace(/\s+/g, "");
    const label = String(rawValue);

    if (normalizedKey === "kojin") {
      result.kojin = label;
      continue;
    }

    if (normalizedKey === "hojin") {
      result.hojin = label;
      continue;
    }

    if (normalizedKey === "objection") {
      result.objection = label;
      continue;
    }

    if (normalizedKey === "remind" || normalizedKey === "reminder" || normalizedKey === "提醒") {
      result.remind = label;
      continue;
    }

    if (normalizedKey === "reception" || normalizedKey === "受付" || normalizedKey === "受付突破") {
      result.reception = label;
      continue;
    }

    if (normalizedKey === "negotiation" || normalizedKey === "交渉") {
      result.negotiation = label;
    }
  }

  return result;
}

function resolveUserFromRecord(source: LooseRecord | null): TalkPortalUser | undefined {
  if (!source) {
    return undefined;
  }

  const email = pickFirstValue(source, ["email", "メール"]);
  const canEdit = pickFirstValue(source, ["canEdit", "編集可", "can_edit"]);
  const isAdmin = pickFirstValue(source, ["isAdmin", "管理者", "is_admin"]);

  return {
    email: email ? String(email) : undefined,
    canEdit: toOptionalBoolean(canEdit),
    isAdmin: toOptionalBoolean(isAdmin),
  };
}

function resolveUser(raw: unknown): TalkPortalUser | undefined {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }

  const envelope = raw as ApiEnvelope;
  const payload = envelope.data;

  if (payload && typeof payload === "object") {
    const payloadRecord = payload as LooseRecord;
    const fromPayload = resolveUserFromRecord(pickRecord(payloadRecord, ["user", "ユーザー"]));
    if (fromPayload) {
      return fromPayload;
    }
  }

  const envelopeRecord = envelope as LooseRecord;
  const fromEnvelope = resolveUserFromRecord(pickRecord(envelopeRecord, ["user", "ユーザー"]));
  return fromEnvelope ?? envelope.user;
}

type LegacySectionTips = {
  mindset?: unknown;
  skill?: unknown;
};

function clampAfterLine(value: number, maxLine: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(Math.max(0, Math.trunc(value)), maxLine);
}

function getNodeScriptLines(node: TalkNode) {
  return node.readAloudScript && node.readAloudScript.length > 0 ? node.readAloudScript : node.lines;
}

function tryParseLegacyBranchText(text: string): { trigger: string; action: string } | null {
  const arrow = text.includes("→") ? "→" : text.includes("->") ? "->" : null;
  if (!arrow) {
    return null;
  }

  const [triggerRaw, actionRaw] = text.split(arrow, 2);
  const trigger = String(triggerRaw ?? "").trim();
  const action = String(actionRaw ?? "").trim();

  if (!trigger || !action) {
    return null;
  }

  return { trigger, action };
}

function normalizeTalkListForBranchGuides(talks: Talk[]): Talk[] {
  return talks.map((talk) => ({
    ...talk,
    nodes: talk.nodes.map((node) => {
      const scriptLines = getNodeScriptLines(node);
      const maxAfterLine = scriptLines.length;

      const normalizedStructuredGuides = (node.branchGuides ?? []).map((guide) => ({
        afterLine: clampAfterLine(guide.afterLine, maxAfterLine),
        trigger: String(guide.trigger ?? ""),
        action: String(guide.action ?? ""),
      }));

      const legacyGuides = (node.inlineNotes ?? [])
        .filter((note) => note.tone === "branch")
        .map((note) => {
          const parsed = tryParseLegacyBranchText(String(note.text ?? ""));
          if (!parsed) {
            return null;
          }

          return {
            afterLine: clampAfterLine(note.afterLine, maxAfterLine),
            trigger: parsed.trigger,
            action: parsed.action,
          };
        })
        .filter((guide): guide is { afterLine: number; trigger: string; action: string } => Boolean(guide));

      const mergedGuides = [...normalizedStructuredGuides];
      for (const legacyGuide of legacyGuides) {
        const duplicated = mergedGuides.some(
          (guide) =>
            guide.afterLine === legacyGuide.afterLine &&
            guide.trigger === legacyGuide.trigger &&
            guide.action === legacyGuide.action,
        );

        if (!duplicated) {
          mergedGuides.push(legacyGuide);
        }
      }

      const remainingInlineNotes = (node.inlineNotes ?? []).filter((note) => note.tone !== "branch");

      return {
        ...node,
        branchGuides: mergedGuides.length > 0 ? mergedGuides : undefined,
        inlineNotes: remainingInlineNotes.length > 0 ? remainingInlineNotes : undefined,
      };
    }),
  }));
}

function normalizeTalkListForPointBlocks(talks: Talk[]): Talk[] {
  return talks.map((talk) => ({
    ...talk,
    nodes: talk.nodes.map((node) => {
      const nodeRecord = node as unknown as Record<string, unknown>;
      const legacyTips = nodeRecord.sectionTips as LegacySectionTips | undefined;

      if (!legacyTips || typeof legacyTips !== "object") {
        return node;
      }

      const mindset = String(legacyTips.mindset ?? "");
      const skill = String(legacyTips.skill ?? "");
      const hasTipContent = Boolean(mindset.trim() || skill.trim());
      const scriptLines = node.readAloudScript && node.readAloudScript.length > 0 ? node.readAloudScript : node.lines;
      const afterLine = scriptLines.length;
      const existingPointBlocks = node.pointBlocks ?? [];
      const alreadyExists = existingPointBlocks.some(
        (item) => item.afterLine === afterLine && item.mindset === mindset && item.skill === skill,
      );

      const nextPointBlocks = hasTipContent && !alreadyExists
        ? [...existingPointBlocks, { afterLine, mindset, skill }]
        : existingPointBlocks;

      const { sectionTips: _legacySectionTips, ...restNode } = nodeRecord;

      return {
        ...(restNode as TalkNode),
        pointBlocks: nextPointBlocks,
      } as typeof node;
    }),
  }));
}

function normalizeBootstrap(raw: unknown): TalkBootstrapPayload {
  const payload = resolvePayload(raw) as LooseRecord;
  const talks = pickArray<Talk>(payload, ["talks", "トーク"]);
  const normalizedTalks = normalizeTalkListForBranchGuides(normalizeTalkListForPointBlocks(talks));

  return {
    announcements: pickArray<Announcement>(payload, ["announcements", "アナウンス"]),
    dailyHighlights: pickArray<DailyHighlight>(payload, ["dailyHighlights", "デイリーハイライト"]),
    quickLinks: pickArray<QuickLink>(payload, ["quickLinks"]),
    featuredItems: pickArray<FeaturedItem>(payload, ["featuredItems"]),
    recentUpdates: pickArray<RecentUpdate>(payload, ["recentUpdates"]),
    talkCategories: pickArray<TalkCategory>(payload, ["talkCategories", "talkCatalog", "トークカテゴリ"]),
    talkTags: pickArray<string>(payload, ["talkTags"]),
    productLabels: normalizeProductLabels(pickRecord(payload, ["productLabels"])),
    sceneLabels: normalizeSceneLabels(pickRecord(payload, ["sceneLabels"])),
    talks: normalizedTalks,
    user: resolveUser(raw),
  };
}

function toMessage(json: unknown, fallback: string): string {
  if (!json || typeof json !== "object") {
    return fallback;
  }

  const envelope = json as ApiEnvelope;
  return envelope.error?.message || envelope.message || fallback;
}

function toCode(json: unknown, fallback: string): string {
  if (!json || typeof json !== "object") {
    return fallback;
  }

  const envelope = json as ApiEnvelope;
  return envelope.error?.code || fallback;
}

function normalizeUpdateResponse(raw: unknown, fallbackTalkId: string) {
  if (!raw || typeof raw !== "object") {
    return {
      talkId: fallbackTalkId,
      revision: undefined,
    };
  }

  const envelope = raw as Record<string, unknown>;
  const data = envelope.data && typeof envelope.data === "object"
    ? (envelope.data as Record<string, unknown>)
    : envelope;

  const talkIdRaw = data.talkId ?? data.talk_id ?? fallbackTalkId;
  const revisionRaw = data.revision;

  return {
    talkId: String(talkIdRaw),
    revision: typeof revisionRaw === "number" ? revisionRaw : undefined,
  };
}

function normalizeEditorPermission(raw: unknown): ScriptEditorPermission | null {
  const record = asRecord(raw);
  if (!record) {
    return null;
  }

  const emailRaw = pickFirstValue(record, ["email", "メール", "mail"]);
  const email = emailRaw ? String(emailRaw).trim().toLowerCase() : "";

  if (!email) {
    return null;
  }

  const canEdit = pickFirstValue(record, ["canEdit", "can_edit", "編集可"]);
  const isActive = pickFirstValue(record, ["isActive", "is_active", "有効"]);
  const isAdmin = pickFirstValue(record, ["isAdmin", "is_admin", "管理者"]);
  const updatedAt = pickFirstValue(record, ["updatedAt", "updated_at", "更新日時"]);
  const updatedBy = pickFirstValue(record, ["updatedBy", "updated_by", "更新者"]);

  return {
    email,
    canEdit: toBoolean(canEdit, false),
    isActive: toBoolean(isActive, false),
    isAdmin: toBoolean(isAdmin, false),
    updatedAt: updatedAt ? String(updatedAt) : undefined,
    updatedBy: updatedBy ? String(updatedBy) : undefined,
  };
}

function normalizeEditorPermissionList(raw: unknown): ScriptEditorPermission[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item) => normalizeEditorPermission(item))
    .filter((item): item is ScriptEditorPermission => Boolean(item))
    .sort((a, b) => a.email.localeCompare(b.email));
}

function resolveEditorPermissionList(raw: unknown): ScriptEditorPermission[] {
  const envelope = asRecord(raw);
  if (!envelope) {
    return [];
  }

  const candidates: unknown[] = [];
  if ("data" in envelope) {
    candidates.push(envelope.data);
  }
  candidates.push(raw);

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return normalizeEditorPermissionList(candidate);
    }

    const record = asRecord(candidate);
    if (!record) {
      continue;
    }

    const nested = pickFirstValue(record, ["editorPermissions", "editors", "permissions", "items", "rows", "list"]);
    if (Array.isArray(nested)) {
      return normalizeEditorPermissionList(nested);
    }
  }

  return [];
}

function resolveEditorPermission(raw: unknown): ScriptEditorPermission | null {
  const direct = normalizeEditorPermission(raw);
  if (direct) {
    return direct;
  }

  const envelope = asRecord(raw);
  if (!envelope) {
    return null;
  }

  const candidates: unknown[] = [];
  if ("data" in envelope) {
    candidates.push(envelope.data);
  }
  candidates.push(raw);

  for (const candidate of candidates) {
    const record = asRecord(candidate);
    if (!record) {
      continue;
    }

    const nested = pickFirstValue(record, ["editor", "permission", "item", "row"]);
    const resolved = normalizeEditorPermission(nested);
    if (resolved) {
      return resolved;
    }
  }

  return null;
}

function resolveDeletedEditorEmail(raw: unknown): string | null {
  const envelope = asRecord(raw);
  if (!envelope) {
    return null;
  }

  const candidates: unknown[] = [];
  if ("data" in envelope) {
    candidates.push(envelope.data);
  }
  candidates.push(raw);

  for (const candidate of candidates) {
    const record = asRecord(candidate);
    if (!record) {
      continue;
    }

    const deleted = pickFirstValue(record, ["deleted", "removed", "editor", "item"]);
    const deletedRecord = asRecord(deleted);
    if (deletedRecord) {
      const deletedEmail = pickFirstValue(deletedRecord, ["email", "mail", "メール"]);
      if (deletedEmail) {
        return String(deletedEmail).trim().toLowerCase();
      }
    }

    const directEmail = pickFirstValue(record, ["email", "editorEmail", "targetEmail", "mail", "メール"]);
    if (directEmail) {
      return String(directEmail).trim().toLowerCase();
    }
  }

  return null;
}

function assertEnvelopeOk(raw: unknown, fallbackMessage: string) {
  if (!raw || typeof raw !== "object") {
    return;
  }

  const envelope = raw as Record<string, unknown>;
  if ("ok" in envelope && envelope.ok === false) {
    throw new TalkPortalApiError(
      toMessage(raw, fallbackMessage),
      403,
      toCode(raw, "API_ENVELOPE_ERROR"),
    );
  }
}

function assertAllowedViewer(payload: TalkBootstrapPayload) {
  if (!payload.user?.email) {
    throw new TalkPortalApiError(
      "ユーザー認証情報を取得できませんでした。許可されたGoogleアカウントで再ログインしてください。",
      401,
      "UNAUTHENTICATED_USER",
    );
  }
}

async function parseJsonResponse(response: Response): Promise<unknown> {
  const bodyText = await response.text();

  if (!bodyText) {
    return {};
  }

  const trimmed = bodyText.trim();
  if (trimmed.startsWith("<!DOCTYPE html") || trimmed.startsWith("<html") || trimmed.includes("ServiceLogin")) {
    throw new TalkPortalApiError(
      "Google認証ページへリダイレクトされました。許可されたGoogleアカウントで再ログインして再試行してください。",
      response.status || 401,
      "AUTH_REDIRECT",
    );
  }

  try {
    return JSON.parse(bodyText);
  } catch {
    throw new TalkPortalApiError("APIレスポンスがJSONではありません", response.status, "INVALID_JSON");
  }
}

export function hasTalkPortalApiConfig() {
  return Boolean(API_URL);
}

export function getTalkPortalAuthorizeUrl(returnTo?: string) {
  if (!API_URL) {
    return "";
  }

  const endpoint = new URL(API_URL);
  endpoint.searchParams.set("action", "authorize");
  if (returnTo) {
    endpoint.searchParams.set("return_to", returnTo);
  }
  endpoint.searchParams.set("_ts", String(Date.now()));
  return endpoint.toString();
}

function createTimeoutSignal(parentSignal: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController();
  let timedOut = false;

  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const abortByParent = () => {
    controller.abort();
  };

  if (parentSignal) {
    if (parentSignal.aborted) {
      controller.abort();
    } else {
      parentSignal.addEventListener("abort", abortByParent, { once: true });
    }
  }

  const cleanup = () => {
    clearTimeout(timeoutId);
    if (parentSignal) {
      parentSignal.removeEventListener("abort", abortByParent);
    }
  };

  return {
    signal: controller.signal,
    didTimeout: () => timedOut,
    cleanup,
  };
}

function isAbortError(value: unknown) {
  return value instanceof Error && value.name === "AbortError";
}

export async function fetchTalkBootstrap(signal?: AbortSignal): Promise<TalkBootstrapPayload> {
  if (!API_URL) {
    throw new TalkPortalApiError(
      "NEXT_PUBLIC_TALK_API_URL が設定されていません",
      500,
      "MISSING_API_URL",
    );
  }

  const endpoint = new URL(API_URL);
  endpoint.searchParams.set("action", "bootstrap");

  const timeoutSignal = createTimeoutSignal(signal, BOOTSTRAP_FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(endpoint.toString(), {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
      signal: timeoutSignal.signal,
    });
  } catch (caught) {
    if (isAbortError(caught) && timeoutSignal.didTimeout()) {
      throw new TalkPortalApiError(
        "Apps Script API の応答がタイムアウトしました。許可されたGoogleアカウントで認証後に再試行してください。",
        408,
        "BOOTSTRAP_TIMEOUT",
      );
    }

    throw caught;
  } finally {
    timeoutSignal.cleanup();
  }

  const json = await parseJsonResponse(response);
  assertEnvelopeOk(json, "データ取得に失敗しました");

  if (!response.ok) {
    throw new TalkPortalApiError(
      toMessage(json, "データ取得に失敗しました"),
      response.status,
      toCode(json, "HTTP_ERROR"),
    );
  }

  const payload = normalizeBootstrap(json);

  if (!Array.isArray(payload.talks)) {
    throw new TalkPortalApiError("トークデータ形式が不正です", 500, "INVALID_PAYLOAD");
  }

  assertAllowedViewer(payload);

  return payload;
}

export async function fetchTalkBootstrapViaJsonp(
  timeoutMs = 12000,
): Promise<TalkBootstrapPayload> {
  if (!API_URL) {
    throw new TalkPortalApiError(
      "NEXT_PUBLIC_TALK_API_URL が設定されていません",
      500,
      "MISSING_API_URL",
    );
  }

  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new TalkPortalApiError("JSONPはブラウザ環境でのみ利用できます", 500, "JSONP_UNAVAILABLE");
  }

  const callbackName = `talkPortalJsonp_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const endpoint = new URL(API_URL);
  endpoint.searchParams.set("action", "bootstrap");
  endpoint.searchParams.set("callback", callbackName);
  endpoint.searchParams.set("_ts", String(Date.now()));

  const globalScope = window as unknown as Record<string, unknown>;

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    let settled = false;

    const cleanup = () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      delete globalScope[callbackName];
      window.clearTimeout(timerId);
    };

    const finishReject = (error: TalkPortalApiError) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      reject(error);
    };

    const finishResolve = (raw: unknown) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();

      try {
        assertEnvelopeOk(raw, "データ取得に失敗しました");
        const payload = normalizeBootstrap(raw);
        if (!Array.isArray(payload.talks)) {
          throw new TalkPortalApiError("トークデータ形式が不正です", 500, "INVALID_PAYLOAD");
        }
        assertAllowedViewer(payload);
        resolve(payload);
      } catch (caught) {
        finishReject(
          caught instanceof TalkPortalApiError
            ? caught
            : new TalkPortalApiError(String(caught), 500, "JSONP_PARSE_ERROR"),
        );
      }
    };

    const timerId = window.setTimeout(() => {
      finishReject(
        new TalkPortalApiError(
          "JSONPタイムアウト: Apps Scriptからの応答を受信できませんでした",
          0,
          "JSONP_TIMEOUT",
        ),
      );
    }, timeoutMs);

    globalScope[callbackName] = (raw: unknown) => {
      finishResolve(raw);
    };

    script.async = true;
    script.src = endpoint.toString();
    script.onerror = () => {
      finishReject(
        new TalkPortalApiError(
          "JSONP読み込みに失敗しました（認証リダイレクトの可能性）",
          0,
          "JSONP_LOAD_ERROR",
        ),
      );
    };

    document.head.appendChild(script);
  });
}

async function fetchScriptEditorPermissionsViaJsonp(
  timeoutMs = 12000,
): Promise<ScriptEditorPermission[]> {
  if (!API_URL) {
    throw new TalkPortalApiError(
      "NEXT_PUBLIC_TALK_API_URL が設定されていません",
      500,
      "MISSING_API_URL",
    );
  }

  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new TalkPortalApiError("JSONPはブラウザ環境でのみ利用できます", 500, "JSONP_UNAVAILABLE");
  }

  const callbackName = `talkPortalEditorJsonp_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const endpoint = new URL(API_URL);
  endpoint.searchParams.set("action", "listEditorPermissions");
  endpoint.searchParams.set("callback", callbackName);
  endpoint.searchParams.set("_ts", String(Date.now()));

  const globalScope = window as unknown as Record<string, unknown>;

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    let settled = false;

    const cleanup = () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      delete globalScope[callbackName];
      window.clearTimeout(timerId);
    };

    const finishReject = (error: TalkPortalApiError) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      reject(error);
    };

    const finishResolve = (raw: unknown) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();

      try {
        assertEnvelopeOk(raw, "編集権限一覧の取得に失敗しました");
        resolve(resolveEditorPermissionList(raw));
      } catch (caught) {
        finishReject(
          caught instanceof TalkPortalApiError
            ? caught
            : new TalkPortalApiError(String(caught), 500, "JSONP_PARSE_ERROR"),
        );
      }
    };

    const timerId = window.setTimeout(() => {
      finishReject(
        new TalkPortalApiError(
          "JSONPタイムアウト: Apps Scriptからの応答を受信できませんでした",
          0,
          "JSONP_TIMEOUT",
        ),
      );
    }, timeoutMs);

    globalScope[callbackName] = (raw: unknown) => {
      finishResolve(raw);
    };

    script.async = true;
    script.src = endpoint.toString();
    script.onerror = () => {
      finishReject(
        new TalkPortalApiError(
          "JSONP読み込みに失敗しました（認証リダイレクトの可能性）",
          0,
          "JSONP_LOAD_ERROR",
        ),
      );
    };

    document.head.appendChild(script);
  });
}

export async function updateTalkByApi(talk: Talk): Promise<TalkUpdateResult> {
  if (!API_URL) {
    throw new TalkPortalApiError(
      "NEXT_PUBLIC_TALK_API_URL が設定されていません",
      500,
      "MISSING_API_URL",
    );
  }

  const endpoint = new URL(API_URL);
  const body = JSON.stringify({
    action: "updateTalk",
    talk,
  });

  try {
    const response = await fetch(endpoint.toString(), {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: {
        "Content-Type": "text/plain;charset=UTF-8",
        Accept: "application/json",
      },
      body,
    });

    const json = await parseJsonResponse(response);
    assertEnvelopeOk(json, "トーク保存に失敗しました");

    if (!response.ok) {
      throw new TalkPortalApiError(
        toMessage(json, "トーク保存に失敗しました"),
        response.status,
        toCode(json, "HTTP_ERROR"),
      );
    }

    const normalized = normalizeUpdateResponse(json, talk.id);

    return {
      talkId: normalized.talkId,
      revision: normalized.revision,
      transport: "fetch",
    };
  } catch (caught) {
    const canRetryWithNoCors =
      caught instanceof TypeError ||
      (caught instanceof TalkPortalApiError &&
        (caught.code === "NETWORK_ERROR" ||
          caught.code === "AUTH_REDIRECT" ||
          caught.code === "INVALID_JSON" ||
          caught.code === "HTTP_ERROR"));

    if (!canRetryWithNoCors) {
      throw caught;
    }

    try {
      await fetch(endpoint.toString(), {
        method: "POST",
        mode: "no-cors",
        credentials: "include",
        cache: "no-store",
        headers: {
          "Content-Type": "text/plain;charset=UTF-8",
        },
        body,
      });
    } catch {
      throw new TalkPortalApiError(
        "トーク保存リクエストを送信できませんでした",
        0,
        "POST_NETWORK_ERROR",
      );
    }

    const verification = await fetchTalkBootstrapViaJsonp();
    const savedTalk = verification.talks.find((item) => item.id === talk.id);

    if (!savedTalk) {
      throw new TalkPortalApiError(
        "保存後の再取得でトークが確認できませんでした",
        0,
        "UPDATE_VERIFY_FAILED",
      );
    }

    return {
      talkId: talk.id,
      transport: "no-cors",
    };
  }
}

export async function fetchScriptEditorPermissions(): Promise<ScriptEditorPermission[]> {
  if (!API_URL) {
    throw new TalkPortalApiError(
      "NEXT_PUBLIC_TALK_API_URL が設定されていません",
      500,
      "MISSING_API_URL",
    );
  }

  const endpoint = new URL(API_URL);
  endpoint.searchParams.set("action", "listEditorPermissions");

  try {
    const response = await fetch(endpoint.toString(), {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    const json = await parseJsonResponse(response);
    assertEnvelopeOk(json, "編集権限一覧の取得に失敗しました");

    if (!response.ok) {
      throw new TalkPortalApiError(
        toMessage(json, "編集権限一覧の取得に失敗しました"),
        response.status,
        toCode(json, "HTTP_ERROR"),
      );
    }

    return resolveEditorPermissionList(json);
  } catch (caught) {
    const canRetryWithJsonp =
      caught instanceof TypeError ||
      (caught instanceof TalkPortalApiError &&
        (caught.code === "AUTH_REDIRECT" ||
          caught.code === "INVALID_JSON" ||
          caught.code === "HTTP_ERROR" ||
          caught.code === "NETWORK_ERROR"));

    if (!canRetryWithJsonp) {
      throw caught;
    }

    return fetchScriptEditorPermissionsViaJsonp();
  }
}

export async function upsertScriptEditorPermission(
  input: UpsertScriptEditorPermissionInput,
): Promise<ScriptEditorPermissionUpsertResult> {
  if (!API_URL) {
    throw new TalkPortalApiError(
      "NEXT_PUBLIC_TALK_API_URL が設定されていません",
      500,
      "MISSING_API_URL",
    );
  }

  const email = input.email.trim().toLowerCase();
  if (!email) {
    throw new TalkPortalApiError("メールアドレスを入力してください", 400, "INVALID_EDITOR_EMAIL");
  }

  const endpoint = new URL(API_URL);

  const body = JSON.stringify({
    action: "upsertEditorPermission",
    editor: {
      email,
      canEdit: input.canEdit,
      isActive: input.isActive,
      isAdmin: input.isAdmin,
    },
  });

  try {
    const response = await fetch(endpoint.toString(), {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: {
        "Content-Type": "text/plain;charset=UTF-8",
        Accept: "application/json",
      },
      body,
    });

    const json = await parseJsonResponse(response);
    assertEnvelopeOk(json, "編集権限の更新に失敗しました");

    if (!response.ok) {
      throw new TalkPortalApiError(
        toMessage(json, "編集権限の更新に失敗しました"),
        response.status,
        toCode(json, "HTTP_ERROR"),
      );
    }

    const permission = resolveEditorPermission(json);

    return {
      email: permission?.email ?? email,
      canEdit: permission?.canEdit ?? input.canEdit,
      isActive: permission?.isActive ?? input.isActive,
      isAdmin: permission?.isAdmin ?? input.isAdmin,
    };
  } catch (caught) {
    const canRetryWithNoCors =
      caught instanceof TypeError ||
      (caught instanceof TalkPortalApiError &&
        (caught.code === "NETWORK_ERROR" ||
          caught.code === "AUTH_REDIRECT" ||
          caught.code === "INVALID_JSON" ||
          caught.code === "HTTP_ERROR"));

    if (!canRetryWithNoCors) {
      throw caught;
    }

    try {
      await fetch(endpoint.toString(), {
        method: "POST",
        mode: "no-cors",
        credentials: "include",
        cache: "no-store",
        headers: {
          "Content-Type": "text/plain;charset=UTF-8",
        },
        body,
      });
    } catch {
      throw new TalkPortalApiError(
        "編集権限更新リクエストを送信できませんでした",
        0,
        "POST_NETWORK_ERROR",
      );
    }

    const verification = await fetchScriptEditorPermissionsViaJsonp();
    const savedPermission = verification.find((item) => item.email === email);

    if (!savedPermission) {
      throw new TalkPortalApiError(
        "更新後の再取得で編集権限が確認できませんでした",
        0,
        "UPDATE_VERIFY_FAILED",
      );
    }

    return {
      email: savedPermission.email,
      canEdit: savedPermission.canEdit,
      isActive: savedPermission.isActive,
      isAdmin: savedPermission.isAdmin,
    };
  }
}

export async function deleteScriptEditorPermission(
  emailInput: string,
): Promise<ScriptEditorPermissionDeleteResult> {
  if (!API_URL) {
    throw new TalkPortalApiError(
      "NEXT_PUBLIC_TALK_API_URL が設定されていません",
      500,
      "MISSING_API_URL",
    );
  }

  const email = emailInput.trim().toLowerCase();
  if (!email) {
    throw new TalkPortalApiError("削除対象のメールアドレスを入力してください", 400, "INVALID_EDITOR_EMAIL");
  }

  const endpoint = new URL(API_URL);
  const body = JSON.stringify({
    action: "deleteEditorPermission",
    email,
  });

  try {
    const response = await fetch(endpoint.toString(), {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: {
        "Content-Type": "text/plain;charset=UTF-8",
        Accept: "application/json",
      },
      body,
    });

    const json = await parseJsonResponse(response);
    assertEnvelopeOk(json, "編集権限の削除に失敗しました");

    if (!response.ok) {
      throw new TalkPortalApiError(
        toMessage(json, "編集権限の削除に失敗しました"),
        response.status,
        toCode(json, "HTTP_ERROR"),
      );
    }

    return {
      email: resolveDeletedEditorEmail(json) ?? email,
    };
  } catch (caught) {
    const canRetryWithNoCors =
      caught instanceof TypeError ||
      (caught instanceof TalkPortalApiError &&
        (caught.code === "NETWORK_ERROR" ||
          caught.code === "AUTH_REDIRECT" ||
          caught.code === "INVALID_JSON" ||
          caught.code === "HTTP_ERROR"));

    if (!canRetryWithNoCors) {
      throw caught;
    }

    try {
      await fetch(endpoint.toString(), {
        method: "POST",
        mode: "no-cors",
        credentials: "include",
        cache: "no-store",
        headers: {
          "Content-Type": "text/plain;charset=UTF-8",
        },
        body,
      });
    } catch {
      throw new TalkPortalApiError(
        "編集権限削除リクエストを送信できませんでした",
        0,
        "POST_NETWORK_ERROR",
      );
    }

    const verification = await fetchScriptEditorPermissionsViaJsonp();
    const stillExists = verification.some((item) => item.email === email);

    if (stillExists) {
      throw new TalkPortalApiError(
        "削除後の再取得で編集権限が残っています",
        0,
        "DELETE_VERIFY_FAILED",
      );
    }

    return { email };
  }
}

export async function getMockBootstrapPayload(): Promise<TalkBootstrapPayload> {
  const repository = new MockTalkRepository();

  const [
    mockAnnouncements,
    mockDailyHighlights,
    mockQuickLinks,
    mockFeaturedItems,
    mockRecentUpdates,
    mockTalkCategories,
    mockTalkTags,
    mockProductLabels,
    mockSceneLabels,
    mockTalks,
  ] = await Promise.all([
    repository.getAnnouncements(),
    repository.getDailyHighlights(),
    repository.getQuickLinks(),
    repository.getFeaturedItems(),
    repository.getRecentUpdates(),
    repository.getTalkCategories(),
    repository.getTalkTags(),
    repository.getProductLabels(),
    repository.getSceneLabels(),
    repository.getTalkList(),
  ]);

  return {
    announcements: mockAnnouncements,
    dailyHighlights: mockDailyHighlights,
    quickLinks: mockQuickLinks,
    featuredItems: mockFeaturedItems,
    recentUpdates: mockRecentUpdates,
    talkCategories: mockTalkCategories,
    talkTags: mockTalkTags,
    productLabels: mockProductLabels,
    sceneLabels: mockSceneLabels,
    talks: normalizeTalkListForBranchGuides(normalizeTalkListForPointBlocks(mockTalks)),
    user: {
      canEdit: false,
      isAdmin: false,
    },
  };
}
