export type FeedType = 'breastfeeding' | 'expressed' | 'formula' | 'food';
export type Unit = 'ml' | 'oz';
export type ActivityType = 'feed' | 'wee' | 'poop';

export interface FeedDetails {
  feedType: FeedType;
  durationMinutes?: number;
  amount?: number;
  unit?: Unit;
  foodName?: string;
}

export interface ActivityRecord {
  id: string;
  type: ActivityType;
  timestamp: string;
  details: FeedDetails | null;
}

export interface BabyProfile {
  id?: string | null;
  shareCode?: string | null;
  name: string;
  dateOfBirth: string | null;
  ageWeeks: number | null;
}

export interface DailyStats {
  key: string;
  dayLabel: string;
  dateLabel: string;
  expressedMl: number;
  formulaMl: number;
  breastfeedingMinutes: number;
  foodCount: number;
  weeCount: number;
  poopCount: number;
  feedCount: number;
}
