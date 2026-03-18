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
import { type TalkRepository } from "@/repositories/talk-repository";

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
    return talkCategories;
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
    return talks;
  }

  async getTalkById(id: string) {
    return talks.find((talk) => talk.id === id) ?? null;
  }
}
