import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { format } from 'date-fns';
import { Activity, Baby, Clock3, Droplet, Milk, Pencil, Plus, Save, Timer } from 'lucide-react';
import ActionButton from './components/ActionButton';
import ActivityList from './components/ActivityList';
import DailyCharts from './components/DailyCharts';
import FeedModal from './components/FeedModal';
import HealthCheck from './components/HealthCheck';
import { useBabyTracker } from './hooks/useBabyTracker';
import { ageInWeeks, ageLabelFromBirthDate } from './lib/age';
import { breastfeedingEstimateMlRange, formatVolume, formatVolumeRange } from './lib/units';
import type { FeedDetails, Unit } from './types';

const legacyAgeLabel = (ageWeeks: number | null) => {
  if (ageWeeks === null) return 'Age not set';
  if (ageWeeks === 0) return 'Newborn';
  if (ageWeeks < 8) return `${ageWeeks} week${ageWeeks === 1 ? '' : 's'}`;

  const months = Math.floor(ageWeeks / 4);
  return `${months} month${months === 1 ? '' : 's'}`;
};

const stageLabel = (ageWeeks: number | null) => {
  if (ageWeeks === null) return 'Set up baby profile';
  if (ageWeeks < 4) return 'Newborn stage';
  if (ageWeeks < 26) return 'Early baby stage';
  if (ageWeeks < 52) return 'Growing baby stage';
  return 'Toddler stage';
};

const App = () => {
  const {
    profile,
    setProfile,
    knownProfiles,
    switchProfile,
    startNewProfile,
    joinProfile,
    activities,
    unit,
    setUnit,
    todayStats,
    dailyStats,
    addRecord,
    updateRecordTime,
    removeRecord,
    isApiConnected,
    isSavingProfile,
    profileError,
  } =
    useBabyTracker();
  const [isFeedModalOpen, setFeedModalOpen] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState(!profile.shareCode && !profile.dateOfBirth);
  const [joinError, setJoinError] = useState('');
  const [switchError, setSwitchError] = useState('');

  const babyName = profile.name.trim() || 'Baby';
  const currentAgeWeeks = ageInWeeks(profile.dateOfBirth) ?? profile.ageWeeks;
  const babyAgeLabel = profile.dateOfBirth ? ageLabelFromBirthDate(profile.dateOfBirth) : legacyAgeLabel(profile.ageWeeks);
  const bottleTotalMl = todayStats.expressedMl + todayStats.formulaMl;
  const breastEstimate = breastfeedingEstimateMlRange(todayStats.breastfeedingMinutes);
  const totalMilkMinMl = bottleTotalMl + breastEstimate.min;
  const totalMilkMaxMl = bottleTotalMl + breastEstimate.max;
  const milkIntakeLabel = todayStats.breastfeedingMinutes > 0
    ? formatVolumeRange(totalMilkMinMl, totalMilkMaxMl, unit)
    : formatVolume(bottleTotalMl, unit);
  const breastEstimateLabel = todayStats.breastfeedingMinutes > 0
    ? formatVolumeRange(breastEstimate.min, breastEstimate.max, unit)
    : formatVolume(0, unit);

  const todayLabel = useMemo(() => format(new Date(), 'EEE, MMM d'), []);

  const recordFeed = (details: FeedDetails) => {
    addRecord('feed', details);
    setFeedModalOpen(false);
  };

  const handleSaveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get('babyName') ?? '').trim();
    const dateOfBirth = String(formData.get('dateOfBirth') ?? '').trim() || null;

    const didSave = await setProfile({
      id: profile.id,
      shareCode: profile.shareCode,
      name,
      dateOfBirth,
      ageWeeks: ageInWeeks(dateOfBirth),
    });

    if (didSave) {
      setSwitchError('');
      setShowProfileForm(false);
    }
  };

  const handleJoinProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const shareCode = String(formData.get('shareCode') ?? '').trim();

    setJoinError('');
    const didJoin = await joinProfile(shareCode);
    if (didJoin) {
      setSwitchError('');
      setShowProfileForm(false);
      event.currentTarget.reset();
      return;
    }

    setJoinError('Baby ID not found. Check the number and try again.');
  };

  const handleSwitchProfile = async (event: ChangeEvent<HTMLSelectElement>) => {
    const nextShareCode = event.currentTarget.value;
    if (!nextShareCode || nextShareCode === profile.shareCode) return;

    setSwitchError('');
    const didSwitch = await switchProfile(nextShareCode);
    if (!didSwitch) {
      setSwitchError('Could not open that baby profile. Try entering the Baby ID again.');
    }
  };

  const handleNewProfile = () => {
    startNewProfile();
    setJoinError('');
    setSwitchError('');
    setShowProfileForm(true);
  };

  const handleUnitChange = (nextUnit: Unit) => {
    setUnit(nextUnit);
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            <Baby size={24} />
          </span>
          <div>
            <span>Flybo</span>
            <strong>Baby Tracker</strong>
          </div>
        </div>
        <div className="topbar-actions">
          {knownProfiles.length > 0 ? (
            <label className="baby-switcher">
              <span>Baby</span>
              <select value={profile.shareCode ?? ''} onChange={handleSwitchProfile}>
                <option value="" disabled>
                  Select baby
                </option>
                {knownProfiles.map((knownProfile) => (
                  <option key={knownProfile.shareCode} value={knownProfile.shareCode ?? ''}>
                    {(knownProfile.name.trim() || 'Baby')} ({knownProfile.shareCode})
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <button type="button" className="secondary-button compact" onClick={handleNewProfile}>
            <Plus size={17} />
            New baby
          </button>
          <button type="button" className="secondary-button compact" onClick={() => setShowProfileForm(true)}>
            <Pencil size={17} />
            Profile
          </button>
        </div>
      </header>
      {switchError ? <p className="form-message top-message">{switchError}</p> : null}

      <section className="dashboard-head">
        <div className="baby-overview">
          <span className="section-kicker">{stageLabel(currentAgeWeeks)}</span>
          <h1>{babyName}</h1>
          <p>{babyAgeLabel}</p>
        </div>
        <div className="today-card">
          <Clock3 size={20} />
          <div>
            <span>Today</span>
            <strong>{todayLabel}</strong>
          </div>
        </div>
        <div className="share-card">
          <span>Baby ID</span>
          <strong>{profile.shareCode ?? (isSavingProfile ? 'Creating...' : 'Create profile')}</strong>
          <small>{profile.shareCode && isApiConnected ? 'Shared sync on' : 'Not shared yet'}</small>
        </div>
      </section>

      {showProfileForm ? (
        <section className="panel profile-panel">
          <div className="panel-header">
            <div>
              <span className="section-kicker">Baby profile</span>
              <h2>Profile details</h2>
            </div>
          </div>
          <div className="profile-panel-grid">
            <form className="profile-form" onSubmit={handleSaveProfile}>
              <div className="form-group">
                <label htmlFor="babyName">Baby name</label>
                <input id="babyName" name="babyName" type="text" defaultValue={profile.name} placeholder="Optional" />
              </div>
              <div className="form-group">
                <label htmlFor="dateOfBirth">Date of birth</label>
                <input
                  id="dateOfBirth"
                  name="dateOfBirth"
                  type="date"
                  defaultValue={profile.dateOfBirth ?? ''}
                  max={format(new Date(), 'yyyy-MM-dd')}
                />
              </div>
              <div className="share-id-card">
                <span>Baby ID</span>
                <strong>{profile.shareCode ?? (isSavingProfile ? 'Creating...' : 'Created after saving')}</strong>
              </div>
              {profileError ? <p className="form-message wide">{profileError}</p> : null}
              <div className="button-row">
                {profile.shareCode || profile.dateOfBirth ? (
                  <button type="button" className="secondary-button" onClick={() => setShowProfileForm(false)}>
                    Cancel
                  </button>
                ) : null}
                <button type="submit" className="primary-button" disabled={isSavingProfile}>
                  <Save size={17} />
                  {isSavingProfile ? 'Saving...' : 'Save profile'}
                </button>
              </div>
            </form>

            <form className="join-card" onSubmit={handleJoinProfile}>
              <div>
                <span className="section-kicker">Shared access</span>
                <h3>Open with Baby ID</h3>
              </div>
              <div className="form-group">
                <label htmlFor="shareCode">Baby ID number</label>
                <input
                  id="shareCode"
                  name="shareCode"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="123456"
                />
              </div>
              {joinError ? <p className="form-message">{joinError}</p> : null}
              <button type="submit" className="secondary-button">
                Open shared baby
              </button>
            </form>
          </div>
        </section>
      ) : null}

      <section className="panel action-panel" aria-label="Quick log actions">
        <ActionButton label="Feed" onClick={() => setFeedModalOpen(true)} icon={<Milk size={28} />} tone="feed" />
        <ActionButton label="Wee" onClick={() => addRecord('wee', null)} icon={<Droplet size={28} />} tone="wee" />
        <ActionButton label="Poop" onClick={() => addRecord('poop', null)} icon={<Activity size={28} />} tone="poop" />
      </section>

      <section className="panel summary-panel">
        <div className="panel-header">
          <div>
            <span className="section-kicker">Today</span>
            <h2>Care summary</h2>
          </div>
          <div className="segmented-control" aria-label="Volume unit">
            <button
              type="button"
              className={unit === 'ml' ? 'segment active' : 'segment'}
              onClick={() => handleUnitChange('ml')}
            >
              ml
            </button>
            <button
              type="button"
              className={unit === 'oz' ? 'segment active' : 'segment'}
              onClick={() => handleUnitChange('oz')}
            >
              oz
            </button>
          </div>
        </div>

        <div className="summary-grid">
          <article className="summary-card">
            <span className="summary-icon summary-icon--feed">
              <Milk size={21} />
            </span>
            <div>
              <span>Milk intake</span>
              <strong>{milkIntakeLabel}</strong>
            </div>
          </article>
          <article className="summary-card">
            <span className="summary-icon summary-icon--breast">
              <Timer size={21} />
            </span>
            <div>
              <span>Breastfeeding</span>
              <strong>{todayStats.breastfeedingMinutes} min</strong>
            </div>
          </article>
          <article className="summary-card">
            <span className="summary-icon summary-icon--wee">
              <Droplet size={21} />
            </span>
            <div>
              <span>Wee</span>
              <strong>{todayStats.weeCount}</strong>
            </div>
          </article>
          <article className="summary-card">
            <span className="summary-icon summary-icon--poop">
              <Activity size={21} />
            </span>
            <div>
              <span>Poop</span>
              <strong>{todayStats.poopCount}</strong>
            </div>
          </article>
        </div>

        <div className="split-summary">
          <div>
            <span>Expressed milk</span>
            <strong>{formatVolume(todayStats.expressedMl, unit)}</strong>
          </div>
          <div>
            <span>Formula</span>
            <strong>{formatVolume(todayStats.formulaMl, unit)}</strong>
          </div>
          <div>
            <span>Breast estimate</span>
            <strong>{breastEstimateLabel}</strong>
          </div>
          <div>
            <span>Bottle logged</span>
            <strong>{formatVolume(bottleTotalMl, unit)}</strong>
          </div>
          <div>
            <span>Feed sessions</span>
            <strong>{todayStats.feedCount}</strong>
          </div>
          <div>
            <span>Total entries</span>
            <strong>{activities.length}</strong>
          </div>
        </div>
        <p className="estimate-note">Breastfeeding estimate uses 30 min as about 60-90 ml.</p>
      </section>

      <HealthCheck profile={profile} activities={activities} todayStats={todayStats} unit={unit} />

      <DailyCharts dailyStats={dailyStats} unit={unit} />

      <ActivityList activities={activities} onDelete={removeRecord} onUpdateTime={updateRecordTime} />
      <FeedModal
        open={isFeedModalOpen}
        onClose={() => setFeedModalOpen(false)}
        onSave={recordFeed}
        unit={unit}
        setUnit={setUnit}
      />
    </main>
  );
};

export default App;
