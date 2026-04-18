import { type Talk } from "@/types/talk";
import { getMockBootstrapPayload, updateTalkByApi } from "@/lib/talk-portal-api";

export interface TalkMigrationFailure {
  talkId: string;
  message: string;
}

export interface TalkMigrationReport {
  total: number;
  success: number;
  failed: number;
  failures: TalkMigrationFailure[];
}

export interface TalkMigrationProgress {
  index: number;
  total: number;
  talkId: string;
}

export interface TalkMigrationCandidate {
  id: string;
  title: string;
}

export interface MigrateMockTalksToSheetOptions {
  talkIds?: string[];
  onProgress?: ProgressHandler;
}

type ProgressHandler = (progress: TalkMigrationProgress) => void;

function toErrorMessage(value: unknown) {
  if (value instanceof Error) {
    return value.message;
  }

  return String(value);
}

async function pushTalksToSheet(talks: Talk[], onProgress?: ProgressHandler): Promise<TalkMigrationReport> {
  const failures: TalkMigrationFailure[] = [];
  let success = 0;

  for (let index = 0; index < talks.length; index += 1) {
    const talk = talks[index];

    onProgress?.({
      index: index + 1,
      total: talks.length,
      talkId: talk.id,
    });

    try {
      await updateTalkByApi(talk);
      success += 1;
    } catch (caught) {
      failures.push({
        talkId: talk.id,
        message: toErrorMessage(caught),
      });
    }
  }

  return {
    total: talks.length,
    success,
    failed: failures.length,
    failures,
  };
}

function normalizeTalkIds(talkIds: string[] | undefined) {
  if (!talkIds) {
    return [];
  }

  const uniqueTalkIds = new Set<string>();

  for (const talkId of talkIds) {
    const normalized = String(talkId ?? "").trim();
    if (!normalized) {
      continue;
    }

    uniqueTalkIds.add(normalized);
  }

  return Array.from(uniqueTalkIds);
}

function resolveTargetTalks(talks: Talk[], targetTalkIds: string[]) {
  if (targetTalkIds.length === 0) {
    return {
      targetTalks: talks,
      missingTalkIds: [] as string[],
    };
  }

  const talkMap = new Map(talks.map((talk) => [talk.id, talk] as const));
  const targetTalks: Talk[] = [];
  const missingTalkIds: string[] = [];

  for (const talkId of targetTalkIds) {
    const talk = talkMap.get(talkId);

    if (!talk) {
      missingTalkIds.push(talkId);
      continue;
    }

    targetTalks.push(talk);
  }

  return {
    targetTalks,
    missingTalkIds,
  };
}

export async function listMockTalkMigrationCandidates(): Promise<TalkMigrationCandidate[]> {
  const payload = await getMockBootstrapPayload();

  return payload.talks.map((talk) => ({
    id: talk.id,
    title: talk.title,
  }));
}

export async function migrateMockTalksToSheet(options: MigrateMockTalksToSheetOptions = {}) {
  const payload = await getMockBootstrapPayload();

  const targetTalkIds = normalizeTalkIds(options.talkIds);
  const { targetTalks, missingTalkIds } = resolveTargetTalks(payload.talks, targetTalkIds);
  const report = await pushTalksToSheet(targetTalks, options.onProgress);

  if (missingTalkIds.length === 0) {
    return report;
  }

  const missingFailures: TalkMigrationFailure[] = missingTalkIds.map((talkId) => ({
    talkId,
    message: "ローカルのモックトークに存在しないため送信できませんでした",
  }));

  return {
    total: report.total + missingFailures.length,
    success: report.success,
    failed: report.failed + missingFailures.length,
    failures: [...report.failures, ...missingFailures],
  };
}
