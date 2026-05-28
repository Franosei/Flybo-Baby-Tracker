import { differenceInCalendarDays, differenceInMonths } from 'date-fns';
import type { ActivityRecord, BabyProfile, DailyStats, Unit } from '../types';
import {
  breastfeedingEstimateMidpointMl,
  breastfeedingEstimateMlRange,
  formatVolume,
  formatVolumeRange,
  toMilliliters,
} from './units';

type HealthStatus = 'good' | 'watch' | 'attention' | 'info';

interface Range {
  min?: number;
  max?: number;
}

interface AgeBand {
  id: string;
  label: string;
  breastFeeds?: Range;
  formulaPerFeedMl?: Range;
  bottleTotalMl?: Range;
  weeMin: number;
  poopBreastfed?: Range;
  poopFormula?: Range;
  poopNote: string;
}

export interface HealthCheckItem {
  label: string;
  value: string;
  target: string;
  status: HealthStatus;
  message: string;
}

export interface HealthCheckResult {
  title: string;
  status: HealthStatus;
  summary: string;
  ageBandLabel: string;
  items: HealthCheckItem[];
}

const ageBands: AgeBand[] = [
  {
    id: '0-1-week',
    label: '0-1 week',
    breastFeeds: { min: 8, max: 12 },
    formulaPerFeedMl: { min: 30, max: 60 },
    weeMin: 6,
    poopBreastfed: { min: 3, max: 8 },
    poopFormula: { min: 1, max: 4 },
    poopNote: 'Early colour changes are normal: meconium, greenish, then yellow/soft.',
  },
  {
    id: '1-4-weeks',
    label: '1-4 weeks',
    breastFeeds: { min: 8, max: 12 },
    formulaPerFeedMl: { min: 60, max: 90 },
    bottleTotalMl: { min: 450, max: 700 },
    weeMin: 6,
    poopBreastfed: { min: 3 },
    poopFormula: { min: 1, max: 3 },
    poopNote: 'Yellow to brown and soft is expected.',
  },
  {
    id: '1-2-months',
    label: '1-2 months',
    breastFeeds: { min: 7, max: 9 },
    formulaPerFeedMl: { min: 90, max: 120 },
    bottleTotalMl: { min: 600, max: 900 },
    weeMin: 6,
    poopFormula: { min: 1, max: 2 },
    poopNote: 'Breastfed poop can be every feed or once every few days if soft.',
  },
  {
    id: '3-4-months',
    label: '3-4 months',
    breastFeeds: { min: 6, max: 8 },
    formulaPerFeedMl: { min: 120, max: 180 },
    bottleTotalMl: { min: 700, max: 1000 },
    weeMin: 5,
    poopFormula: { min: 1, max: 1 },
    poopNote: 'Poop may be variable for breastfed babies, but should stay soft.',
  },
  {
    id: '5-6-months',
    label: '5-6 months',
    breastFeeds: { min: 5, max: 8 },
    formulaPerFeedMl: { min: 150, max: 200 },
    bottleTotalMl: { min: 750, max: 1000 },
    weeMin: 5,
    poopFormula: { min: 1, max: 1 },
    poopNote: 'Similar to 3-4 months before solids; soft yellow/brown stools are typical.',
  },
  {
    id: '6-12-months',
    label: '6-12 months',
    bottleTotalMl: { min: 600, max: 900 },
    weeMin: 4,
    poopBreastfed: { min: 1, max: 2 },
    poopFormula: { min: 1, max: 2 },
    poopNote: 'Colour varies with food; hard pellets can suggest constipation.',
  },
  {
    id: '12-24-months',
    label: '12-24 months',
    bottleTotalMl: { min: 300, max: 400 },
    weeMin: 4,
    poopBreastfed: { min: 1, max: 2 },
    poopFormula: { min: 1, max: 2 },
    poopNote: 'Soft, formed stools are expected; colour varies with diet.',
  },
];

const todayRecords = (activities: ActivityRecord[]) => {
  const today = new Date();

  return activities.filter((activity) => {
    const timestamp = new Date(activity.timestamp);
    return timestamp.toDateString() === today.toDateString();
  });
};

const ageInDays = (profile: BabyProfile) => {
  if (profile.dateOfBirth) {
    const birthDate = new Date(`${profile.dateOfBirth}T00:00:00`);
    if (!Number.isNaN(birthDate.getTime())) {
      return Math.max(differenceInCalendarDays(new Date(), birthDate), 0);
    }
  }

  return profile.ageWeeks === null ? null : profile.ageWeeks * 7;
};

const getAgeBand = (profile: BabyProfile) => {
  const days = ageInDays(profile);
  if (days === null) return null;

  if (days < 7) return ageBands[0];
  if (days < 28) return ageBands[1];

  const months = profile.dateOfBirth
    ? differenceInMonths(new Date(), new Date(`${profile.dateOfBirth}T00:00:00`))
    : Math.floor(days / 30.44);

  if (months < 3) return ageBands[2];
  if (months < 5) return ageBands[3];
  if (months < 7) return ageBands[4];
  if (months < 12) return ageBands[5];
  if (months < 24) return ageBands[6];

  return null;
};

const expectedWeeMinimum = (profile: BabyProfile, band: AgeBand) => {
  const days = ageInDays(profile);
  if (band.id !== '0-1-week' || days === null) return band.weeMin;

  const dayOfLife = days + 1;
  if (dayOfLife <= 3) return dayOfLife;

  return 6;
};

const compareMin = (value: number, min: number) => value >= min;

const rangeLabel = (range: Range, unit?: Unit) => {
  if (range.min !== undefined && range.max !== undefined) {
    return unit ? `${formatVolume(range.min, unit)}-${formatVolume(range.max, unit)}` : `${range.min}-${range.max}`;
  }

  if (range.min !== undefined) {
    return unit ? `${formatVolume(range.min, unit)}+` : `${range.min}+`;
  }

  if (range.max !== undefined) {
    return unit ? `up to ${formatVolume(range.max, unit)}` : `up to ${range.max}`;
  }

  return 'variable';
};

const rangeStatus = (value: number, range: Range) => {
  if (range.min !== undefined && value < range.min) return 'attention';
  if (range.max !== undefined && value > range.max) return 'watch';
  return 'good';
};

const statusFromItems = (items: HealthCheckItem[]): HealthStatus => {
  if (items.some((item) => item.status === 'attention')) return 'attention';
  if (items.some((item) => item.status === 'watch')) return 'watch';
  if (items.some((item) => item.status === 'good')) return 'good';
  return 'info';
};

const summaryFromStatus = (status: HealthStatus) => {
  if (status === 'good') return 'Today looks in range for the logged data.';
  if (status === 'watch') return 'Some numbers are outside the usual range.';
  if (status === 'attention') return 'One or more basics are below the usual range.';
  return 'Add more logs to compare today with the age guide.';
};

export const buildHealthCheck = (
  profile: BabyProfile,
  activities: ActivityRecord[],
  todayStats: DailyStats,
  unit: Unit,
): HealthCheckResult => {
  const band = getAgeBand(profile);

  if (!band) {
    return {
      title: 'Care check',
      status: 'info',
      summary: 'Set a birth date for age-based feeding, wee, and poop guidance.',
      ageBandLabel: 'No age band',
      items: [],
    };
  }

  const records = todayRecords(activities);
  const feedRecords = records.filter((record) => record.type === 'feed');
  const breastfeedingCount = feedRecords.filter((record) => record.details?.feedType === 'breastfeeding').length;
  const formulaRecords = feedRecords.filter((record) => record.details?.feedType === 'formula');
  const expressedRecords = feedRecords.filter((record) => record.details?.feedType === 'expressed');
  const bottleTotalMl = todayStats.formulaMl + todayStats.expressedMl;
  const breastEstimate = breastfeedingEstimateMlRange(todayStats.breastfeedingMinutes);
  const totalMilkMinMl = bottleTotalMl + breastEstimate.min;
  const totalMilkMaxMl = bottleTotalMl + breastEstimate.max;
  const totalMilkMidpointMl = bottleTotalMl + breastfeedingEstimateMidpointMl(todayStats.breastfeedingMinutes);
  const hasBreastEstimate = todayStats.breastfeedingMinutes > 0;
  const hasAnyMilk = bottleTotalMl > 0 || hasBreastEstimate;
  const formulaOnly = formulaRecords.length > 0 && breastfeedingCount === 0 && expressedRecords.length === 0;
  const weeMin = expectedWeeMinimum(profile, band);

  const bottleAmountsMl = [...formulaRecords, ...expressedRecords].map((record) =>
    toMilliliters(record.details?.amount ?? 0, record.details?.unit ?? 'ml'),
  );
  const averageBottleMl = bottleAmountsMl.length
    ? bottleAmountsMl.reduce((sum, amount) => sum + amount, 0) / bottleAmountsMl.length
    : 0;

  const items: HealthCheckItem[] = [];

  if (band.bottleTotalMl && hasAnyMilk) {
    const status = rangeStatus(totalMilkMidpointMl, band.bottleTotalMl);
    items.push({
      label: 'Milk intake',
      value: hasBreastEstimate
        ? formatVolumeRange(totalMilkMinMl, totalMilkMaxMl, unit)
        : formatVolume(bottleTotalMl, unit),
      target: rangeLabel(band.bottleTotalMl, unit),
      status,
      message: hasBreastEstimate
        ? 'Breastfeeding is estimated as 30 min around 60-90 ml.'
        : status === 'good'
          ? 'Bottle total is in the usual range.'
          : 'Compare with hunger cues and weight gain.',
    });
  } else if (band.breastFeeds) {
    const status = feedRecords.length === 0 ? 'attention' : rangeStatus(feedRecords.length, band.breastFeeds);
    items.push({
      label: 'Feed sessions',
      value: `${feedRecords.length}`,
      target: `${rangeLabel(band.breastFeeds)}/day`,
      status,
      message: breastfeedingCount > 0 ? 'Breastfeeding is usually measured by sessions and baby cues.' : 'Log feeds to improve this check.',
    });
  }

  if (band.formulaPerFeedMl && averageBottleMl > 0) {
    const status = rangeStatus(averageBottleMl, band.formulaPerFeedMl);
    items.push({
      label: 'Average bottle',
      value: formatVolume(averageBottleMl, unit),
      target: `${rangeLabel(band.formulaPerFeedMl, unit)}/feed`,
      status,
      message: status === 'good' ? 'Average bottle size is in the usual range.' : 'Bottle size can vary by baby and feeding pattern.',
    });
  }

  items.push({
    label: 'Wee',
    value: `${todayStats.weeCount}`,
    target: `${weeMin}+ wet nappies`,
    status: compareMin(todayStats.weeCount, weeMin) ? 'good' : 'attention',
    message: compareMin(todayStats.weeCount, weeMin)
      ? 'Wet nappies look on track.'
      : 'Low wet nappies can be a hydration warning sign.',
  });

  const poopRange = formulaOnly ? band.poopFormula : band.poopBreastfed ?? band.poopFormula;
  if (poopRange) {
    const status = rangeStatus(todayStats.poopCount, poopRange);
    items.push({
      label: 'Poop',
      value: `${todayStats.poopCount}`,
      target: `${rangeLabel(poopRange)}/day`,
      status,
      message: status === 'good' ? band.poopNote : 'Texture, comfort, and colour matter as much as count.',
    });
  } else {
    items.push({
      label: 'Poop',
      value: `${todayStats.poopCount}`,
      target: 'variable',
      status: 'info',
      message: band.poopNote,
    });
  }

  const status = statusFromItems(items);

  return {
    title: 'Care check',
    status,
    summary: summaryFromStatus(status),
    ageBandLabel: band.label,
    items,
  };
};
