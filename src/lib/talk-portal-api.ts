import {
  type Announcement,
  type DailyHighlight,
  type FeaturedItem,
  type QuickLink,
  type RecentUpdate,
  type Talk,
  type TalkCategory,
  type TalkProduct,
  type TalkScene,
} from "@/types/talk";
import { MockTalkRepository } from "@/repositories/mock/mock-talk-repository";

export interface TalkPortalUser {
  email?: string;
  canEdit?: boolean;
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

  return {
    email: email ? String(email) : undefined,
    canEdit: typeof canEdit === "boolean" ? canEdit : String(canEdit).toLowerCase() === "true",
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

function normalizeBootstrap(raw: unknown): TalkBootstrapPayload {
  const payload = resolvePayload(raw) as LooseRecord;

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
    talks: pickArray<Talk>(payload, ["talks", "トーク"]),
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
    talks: mockTalks,
    user: {
      canEdit: false,
    },
  };
}
