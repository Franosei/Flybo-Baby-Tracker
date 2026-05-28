import type { ActivityRecord, BabyProfile, Unit } from '../types';

const profileKey = 'flybo-baby-tracker-profile';
const activityKey = 'flybo-baby-tracker-activities';
const unitKey = 'flybo-baby-tracker-unit';

const defaultProfile: BabyProfile = {
  id: null,
  shareCode: null,
  name: '',
  dateOfBirth: null,
  ageWeeks: null,
};

const hasStorage = () => typeof window !== 'undefined' && Boolean(window.localStorage);

const readJson = <T,>(key: string, fallback: T): T => {
  if (!hasStorage()) return fallback;

  const raw = localStorage.getItem(key);
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown) => {
  if (!hasStorage()) return;
  localStorage.setItem(key, JSON.stringify(value));
};

export const loadProfile = (): BabyProfile => {
  const profile = readJson<Partial<BabyProfile>>(profileKey, defaultProfile);
  const ageWeeks = Number(profile.ageWeeks);

  return {
    id: typeof profile.id === 'string' ? profile.id : null,
    shareCode: typeof profile.shareCode === 'string' ? profile.shareCode : null,
    name: typeof profile.name === 'string' ? profile.name : '',
    dateOfBirth: typeof profile.dateOfBirth === 'string' ? profile.dateOfBirth : null,
    ageWeeks: Number.isFinite(ageWeeks) && ageWeeks >= 0 ? ageWeeks : null,
  };
};

export const saveProfile = (profile: BabyProfile) => {
  writeJson(profileKey, profile);
};

export const loadActivities = (): ActivityRecord[] => {
  const activities = readJson<ActivityRecord[]>(activityKey, []);
  return Array.isArray(activities) ? activities : [];
};

export const saveActivities = (activities: ActivityRecord[]) => {
  writeJson(activityKey, activities);
};

export const loadUnit = (): Unit => {
  if (!hasStorage()) return 'ml';
  const storedUnit = localStorage.getItem(unitKey);
  return storedUnit === 'oz' ? 'oz' : 'ml';
};

export const saveUnit = (unit: Unit) => {
  if (!hasStorage()) return;
  localStorage.setItem(unitKey, unit);
};
