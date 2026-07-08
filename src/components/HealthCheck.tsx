import { AlertTriangle, CheckCircle2, Info, Stethoscope } from 'lucide-react';
import type { ActivityRecord, BabyProfile, DailyStats, Unit } from '../types';
import { buildHealthCheck } from '../lib/healthGuidance';

interface HealthCheckProps {
  profile: BabyProfile;
  activities: ActivityRecord[];
  todayStats: DailyStats;
  unit: Unit;
}

const statusIcon = {
  good: <CheckCircle2 size={19} />,
  watch: <Info size={19} />,
  attention: <AlertTriangle size={19} />,
  info: <Info size={19} />,
};

const statusLabel = {
  good: 'On track',
  watch: 'Watch',
  attention: 'Review',
  info: 'Guide',
};

const HealthCheck = ({ profile, activities, todayStats, unit }: HealthCheckProps) => {
  const check = buildHealthCheck(profile, activities, todayStats, unit);

  return (
    <section className={`panel health-panel health-panel--${check.status}`}>
      <div className="panel-header">
        <div>
          <span className="section-kicker">{check.ageBandLabel}</span>
          <h2>{check.title}</h2>
        </div>
        <span className={`health-status health-status--${check.status}`}>
          {statusIcon[check.status]}
          {statusLabel[check.status]}
        </span>
      </div>

      <div className="health-summary">
        <Stethoscope size={22} />
        <p>{check.summary}</p>
      </div>

      {check.items.length ? (
        <div className="health-grid">
          {check.items.map((item) => (
            <article className={`health-card health-card--${item.status}`} key={item.label}>
              <div>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
              <div className="health-target">
                <span>Guide</span>
                <strong>{item.target}</strong>
              </div>
              <p>{item.message}</p>
            </article>
          ))}
        </div>
      ) : null}

      <p className="health-note">
        This is a guide only. Seek medical advice for poor feeding, fewer wet nappies, dehydration signs, hard stools,
        fever, unusual sleepiness, or anything that worries you.
      </p>
    </section>
  );
};

export default HealthCheck;
