import {
  announcements,
  quickLinks,
  recentUpdates,
  talkCategories,
  talks,
} from "@/data/mock/talks";
import { type TalkRepository } from "@/repositories/talk-repository";

export class MockTalkRepository implements TalkRepository {
  async getAnnouncements() {
    return announcements;
  }

  async getQuickLinks() {
    return quickLinks;
  }

  async getRecentUpdates() {
    return recentUpdates;
  }

  async getTalkCategories() {
    return talkCategories;
  }

  async getTalkList() {
    return talks;
  }

  async getTalkById(id: string) {
    return talks.find((talk) => talk.id === id) ?? null;
  }
}
