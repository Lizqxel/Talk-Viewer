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

export interface TalkRepository {
  getAnnouncements(): Promise<Announcement[]>;
  getDailyHighlights(): Promise<DailyHighlight[]>;
  getQuickLinks(): Promise<QuickLink[]>;
  getFeaturedItems(): Promise<FeaturedItem[]>;
  getRecentUpdates(): Promise<RecentUpdate[]>;
  getTalkCategories(): Promise<TalkCategory[]>;
  getTalkTags(): Promise<string[]>;
  getProductLabels(): Promise<Record<TalkProduct, string>>;
  getSceneLabels(): Promise<Record<TalkScene, string>>;
  getTalkList(): Promise<Talk[]>;
  getTalkById(id: string): Promise<Talk | null>;
}
