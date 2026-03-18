import {
  type Announcement,
  type QuickLink,
  type RecentUpdate,
  type Talk,
  type TalkCategory,
} from "@/types/talk";

export interface TalkRepository {
  getAnnouncements(): Promise<Announcement[]>;
  getQuickLinks(): Promise<QuickLink[]>;
  getRecentUpdates(): Promise<RecentUpdate[]>;
  getTalkCategories(): Promise<TalkCategory[]>;
  getTalkList(): Promise<Talk[]>;
  getTalkById(id: string): Promise<Talk | null>;
}
