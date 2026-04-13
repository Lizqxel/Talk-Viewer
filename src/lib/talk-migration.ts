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

export async function migrateMockTalksToSheet(onProgress?: ProgressHandler) {
  const payload = await getMockBootstrapPayload();
  return pushTalksToSheet(payload.talks, onProgress);
}
