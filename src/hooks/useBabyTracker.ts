import { format, isSameDay, subDays } from 'date-fns';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ActivityRecord, BabyProfile, DailyStats, FeedDetails } from '../types';
import { createActivityApi, deleteActivityApi, fetchBootstrap, joinProfileApi, saveProfileApi } from '../lib/api';
import { loadActivities, loadProfile, loadUnit, saveActivities, saveProfile, saveUnit } from '../lib/storage';
import { toMilliliters } from '../lib/units';

const nowIso = () => new Date().toISOString();

const emptyDailyStats = (date: Date): DailyStats => ({
  key: format(date, 'yyyy-MM-dd'),
  dayLabel: format(date, 'EEE'),
  dateLabel: format(date, 'MMM d'),
  expressedMl: 0,
  formulaMl: 0,
  breastfeedingMinutes: 0,
  weeCount: 0,
  poopCount: 0,
  feedCount: 0,
});

const addRecordToStats = (stats: DailyStats, entry: ActivityRecord) => {
  if (entry.type === 'wee') {
    stats.weeCount += 1;
    return;
  }

  if (entry.type === 'poop') {
    stats.poopCount += 1;
    return;
  }

  stats.feedCount += 1;

  if (!entry.details) return;

  if (entry.details.feedType === 'breastfeeding') {
    stats.breastfeedingMinutes += entry.details.durationMinutes ?? 0;
    return;
  }

  const amount = entry.details.amount ?? 0;
  const feedUnit = entry.details.unit ?? 'ml';
  const amountMl = toMilliliters(amount, feedUnit);

  if (entry.details.feedType === 'expressed') {
    stats.expressedMl += amountMl;
  } else if (entry.details.feedType === 'formula') {
    stats.formulaMl += amountMl;
  }
};

export const useBabyTracker = () => {
  const [profile, setProfileState] = useState(loadProfile);
  const [activities, setActivities] = useState<ActivityRecord[]>(loadActivities);
  const [unit, setUnit] = useState(loadUnit);
  const [isApiConnected, setApiConnected] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const storedProfile = loadProfile();

    if (!storedProfile.shareCode) {
      setApiConnected(false);
      return () => {
        isMounted = false;
      };
    }

    fetchBootstrap(storedProfile.shareCode)
      .then(({ profile: apiProfile, activities: apiActivities }) => {
        if (!isMounted) return;
        setProfileState(apiProfile);
        setActivities(apiActivities);
        setApiConnected(true);
      })
      .catch(() => {
        if (!isMounted) return;
        setApiConnected(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    saveProfile(profile);
  }, [profile]);

  useEffect(() => {
    saveActivities(activities);
  }, [activities]);

  useEffect(() => {
    saveUnit(unit);
  }, [unit]);

  const todayStats = useMemo(() => {
    const today = new Date();
    const stats = emptyDailyStats(today);

    activities
      .filter((entry) => isSameDay(new Date(entry.timestamp), today))
      .forEach((entry) => addRecordToStats(stats, entry));

    return stats;
  }, [activities]);

  const dailyStats = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, index) => emptyDailyStats(subDays(new Date(), 6 - index)));
    const dayMap = new Map(days.map((day) => [day.key, day]));

    activities.forEach((entry) => {
      const entryKey = format(new Date(entry.timestamp), 'yyyy-MM-dd');
      const stats = dayMap.get(entryKey);
      if (stats) addRecordToStats(stats, entry);
    });

    return days;
  }, [activities]);

  const setProfile = useCallback((nextProfile: BabyProfile) => {
    setProfileState(nextProfile);

    saveProfileApi(nextProfile)
      .then(({ profile: savedProfile }) => {
        setProfileState(savedProfile);
        setApiConnected(true);
      })
      .catch(() => setApiConnected(false));
  }, []);

  const joinProfile = useCallback(async (shareCode: string) => {
    const trimmedCode = shareCode.trim();
    if (!trimmedCode) return false;

    try {
      const { profile: joinedProfile, activities: joinedActivities } = await joinProfileApi(trimmedCode);
      setProfileState(joinedProfile);
      setActivities(joinedActivities);
      setApiConnected(true);
      return true;
    } catch {
      setApiConnected(false);
      return false;
    }
  }, []);

  const addRecord = useCallback((type: ActivityRecord['type'], details: FeedDetails | null) => {
    const record: ActivityRecord = {
      id: crypto.randomUUID(),
      type,
      timestamp: nowIso(),
      details,
    };

    setActivities((prev) => [record, ...prev]);

    if (!profile.shareCode) return;

    createActivityApi(type, details, profile.shareCode)
      .then(({ record: savedRecord }) => {
        setActivities((prev) => prev.map((entry) => (entry.id === record.id ? savedRecord : entry)));
        setApiConnected(true);
      })
      .catch(() => setApiConnected(false));
  }, [profile.shareCode]);

  const removeRecord = useCallback((id: string) => {
    const record = activities.find((entry) => entry.id === id);
    setActivities((prev) => prev.filter((entry) => entry.id !== id));

    if (!record) return;
    if (!profile.shareCode) return;

    deleteActivityApi(record, profile.shareCode)
      .then(() => setApiConnected(true))
      .catch(() => setApiConnected(false));
  }, [activities, profile.shareCode]);

  return {
    profile,
    setProfile,
    activities,
    unit,
    setUnit,
    todayStats,
    dailyStats,
    addRecord,
    removeRecord,
    joinProfile,
    isApiConnected,
  };
};
