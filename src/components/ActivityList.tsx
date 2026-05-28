import { format } from 'date-fns';
import { Activity, Droplet, Milk, X } from 'lucide-react';
import type { ActivityRecord } from '../types';

interface ActivityListProps {
  activities: ActivityRecord[];
  onDelete: (id: string) => void;
}

const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  return format(date, 'MMM d, h:mm a');
};

const typeLabel = (record: ActivityRecord) => {
  if (record.type === 'feed') {
    return record.details?.feedType === 'breastfeeding'
      ? 'Breastfeeding'
      : record.details?.feedType === 'expressed'
        ? 'Expressed milk'
        : 'Formula';
  }

  return record.type === 'wee' ? 'Wee' : 'Poop';
};

const detailsLabel = (record: ActivityRecord) => {
  if (record.type !== 'feed' || !record.details) return '';

  if (record.details.feedType === 'breastfeeding') {
    return `${record.details.durationMinutes ?? 0} min`;
  }

  return `${record.details.amount ?? 0} ${record.details.unit ?? 'ml'}`;
};

const iconForRecord = (record: ActivityRecord) => {
  if (record.type === 'feed') return <Milk size={18} />;
  if (record.type === 'wee') return <Droplet size={18} />;
  return <Activity size={18} />;
};

const ActivityList = ({ activities, onDelete }: ActivityListProps) => (
  <section className="panel">
    <div className="panel-header">
      <div>
        <span className="section-kicker">History</span>
        <h2>Recent activity</h2>
      </div>
      <span className="count-pill">{activities.length}</span>
    </div>
    <ul className="activity-list">
      {activities.length === 0 ? (
        <li className="empty-state">No events recorded yet. Start with Feed, Wee, or Poop.</li>
      ) : (
        activities.map((record) => (
          <li key={record.id} className="activity-item">
            <div className={`activity-badge activity-badge--${record.type}`}>{iconForRecord(record)}</div>
            <div className="activity-main">
              <div>
                <strong>{typeLabel(record)}</strong>
                <div className="activity-meta">{formatTimestamp(record.timestamp)}</div>
              </div>
              {record.details ? <div className="activity-value">{detailsLabel(record)}</div> : null}
            </div>
            <button
              type="button"
              className="icon-button subtle"
              onClick={() => onDelete(record.id)}
              aria-label={`Delete ${typeLabel(record)} record`}
            >
              <X size={17} />
            </button>
          </li>
        ))
      )}
    </ul>
  </section>
);

export default ActivityList;
