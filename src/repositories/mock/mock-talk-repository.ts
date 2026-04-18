import {
  announcements,
  dailyHighlights,
  featuredItems,
  productLabels,
  quickLinks,
  recentUpdates,
  sceneLabels,
  talkCategories,
  talkTags,
  talks,
} from "@/data/mock/talks";
import { type Talk } from "@/types/talk";
import { type TalkRepository } from "@/repositories/talk-repository";

const allowedTalkIds = new Set([
  "hikari-kojin-standard",
  "hikari-hojin-standard",
  "docomo-hikari-apo-basic-2",
]);

const talkTitleOverrides: Record<string, string> = {
  "hikari-kojin-standard": "アナログ電話→NP 特殊ライトプラン変更トーク",
  "hikari-hojin-standard": "光回線　法人トーク",
};

function toDisplayTalk(talk: Talk): Talk {
  const overriddenTitle = talkTitleOverrides[talk.id];

  if (!overriddenTitle) {
    return talk;
  }

  return {
    ...talk,
    title: overriddenTitle,
  };
}

export class MockTalkRepository implements TalkRepository {
  async getAnnouncements() {
    return announcements;
  }

  async getDailyHighlights() {
    return dailyHighlights;
  }

  async getQuickLinks() {
    return quickLinks;
  }

  async getFeaturedItems() {
    return featuredItems;
  }

  async getRecentUpdates() {
    return recentUpdates;
  }

  async getTalkCategories() {
    return talkCategories.filter((category) =>
      talks.some((talk) => allowedTalkIds.has(talk.id) && talk.categoryId === category.id),
    );
  }

  async getTalkTags() {
    return talkTags;
  }

  async getProductLabels() {
    return productLabels;
  }

  async getSceneLabels() {
    return sceneLabels;
  }

  async getTalkList() {
    return talks
      .filter((talk) => allowedTalkIds.has(talk.id))
      .map((talk) => toDisplayTalk(talk));
  }

  async getTalkById(id: string) {
    const talk = talks.find((item) => item.id === id);

    if (!talk || !allowedTalkIds.has(talk.id)) {
      return null;
    }

    return toDisplayTalk(talk);
  }
}
