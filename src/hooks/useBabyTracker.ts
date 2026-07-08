import { format, isSameDay, subDays } from 'date-fns';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ActivityRecord, BabyProfile, DailyStats, FeedDetails } from '../types';
import {
  createActivityApi,
  deleteActivityApi,
  fetchBootstrap,
  joinProfileApi,
  saveProfileApi,
  updateActivityTimeApi,
} from '../lib/api';
import {
  defaultProfile,
  loadActivities,
  loadKnownProfiles,
  loadProfile,
  loadUnit,
  saveActivities,
  saveKnownProfiles,
  saveProfile,
  saveUnit,
} from '../lib/storage';
import { toMilliliters } from '../lib/units';

const nowIso = () => new Date().toISOString();

const sortActivitiesByTime = (records: ActivityRecord[]) =>
  [...records].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

const emptyDailyStats = (date: Date): DailyStats => ({
  key: format(date, 'yyyy-MM-dd'),
  dayLabel: format(date, 'EEE'),
  dateLabel: format(date, 'MMM d'),
  expressedMl: 0,
  formulaMl: 0,
  breastfeedingMinutes: 0,
  foodCount: 0,
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

  if (entry.details.feedType === 'food') {
    stats.foodCount += 1;
    return;
  }

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

const upsertKnownProfile = (profiles: BabyProfile[], nextProfile: BabyProfile) => {
  if (!nextProfile.shareCode) return profiles;

  const withoutCurrent = profiles.filter((item) => item.shareCode !== nextProfile.shareCode);
  return [nextProfile, ...withoutCurrent].slice(0, 12);
};

export const useBabyTracker = () => {
  const [profile, setProfileState] = useState(loadProfile);
  const [knownProfiles, setKnownProfiles] = useState<BabyProfile[]>(loadKnownProfiles);
  const [activities, setActivities] = useState<ActivityRecord[]>(loadActivities);
  const [unit, setUnit] = useState(loadUnit);
  const [isApiConnected, setApiConnected] = useState(false);
  const [isSavingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');

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
        setKnownProfiles((currentProfiles) => upsertKnownProfile(currentProfiles, apiProfile));
        setActivities(sortActivitiesByTime(apiActivities));
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
    saveKnownProfiles(knownProfiles);
  }, [knownProfiles]);

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

  const rememberProfile = useCallback((nextProfile: BabyProfile) => {
    setKnownProfiles((currentProfiles) => upsertKnownProfile(currentProfiles, nextProfile));
  }, []);

  const setProfile = useCallback(async (nextProfile: BabyProfile) => {
    setProfileState(nextProfile);
    setSavingProfile(true);
    setProfileError('');

    try {
      const { profile: savedProfile } = await saveProfileApi(nextProfile);
      setProfileState(savedProfile);
      rememberProfile(savedProfile);
      setApiConnected(true);
      return true;
    } catch {
      setApiConnected(false);
      setProfileError('Shared Baby ID could not be created. Check that the API is running and DATABASE_URL points to Neon.');
      return false;
    } finally {
      setSavingProfile(false);
    }
  }, [rememberProfile]);

  const joinProfile = useCallback(async (shareCode: string) => {
    const trimmedCode = shareCode.trim();
    if (!trimmedCode) return false;

    try {
      const { profile: joinedProfile, activities: joinedActivities } = await joinProfileApi(trimmedCode);
      setProfileState(joinedProfile);
      setActivities(sortActivitiesByTime(joinedActivities));
      rememberProfile(joinedProfile);
      setApiConnected(true);
      setProfileError('');
      return true;
    } catch {
      setApiConnected(false);
      return false;
    }
  }, [rememberProfile]);

  const switchProfile = useCallback(async (shareCode: string) => {
    return joinProfile(shareCode);
  }, [joinProfile]);

  const startNewProfile = useCallback(() => {
    setProfileState({ ...defaultProfile });
    setActivities([]);
    setApiConnected(false);
    setProfileError('');
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
        setActivities((prev) => sortActivitiesByTime(prev.map((entry) => (entry.id === record.id ? savedRecord : entry))));
        setApiConnected(true);
      })
      .catch(() => setApiConnected(false));
  }, [profile.shareCode]);

  const updateRecordTime = useCallback((id: string, timestamp: string, details?: Partial<FeedDetails> | null) => {
    const record = activities.find((entry) => entry.id === id);
    if (!record) return;

    const nextDetails = details && record.details
      ? { ...record.details, ...details }
      : record.details;

    setActivities((prev) => sortActivitiesByTime(
      prev.map((entry) => (entry.id === id ? { ...entry, timestamp, details: nextDetails } : entry)),
    ));

    if (!profile.shareCode) return;

    updateActivityTimeApi(record, timestamp, details, profile.shareCode)
      .then(({ record: savedRecord }) => {
        setActivities((prev) => sortActivitiesByTime(
          prev.map((entry) => (entry.id === id ? savedRecord : entry)),
        ));
        setApiConnected(true);
      })
      .catch(() => setApiConnected(false));
  }, [activities, profile.shareCode]);

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
    knownProfiles,
    switchProfile,
    startNewProfile,
    activities,
    unit,
    setUnit,
    todayStats,
    dailyStats,
    addRecord,
    updateRecordTime,
    removeRecord,
    joinProfile,
    isApiConnected,
    isSavingProfile,
    profileError,
  };
};
