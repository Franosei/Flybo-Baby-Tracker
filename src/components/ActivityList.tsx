import { Fragment, useEffect, useMemo, useState, type FormEvent } from 'react';
import { format, isSameDay } from 'date-fns';
import { Activity, Check, ChevronLeft, ChevronRight, Droplet, Milk, Pencil, X } from 'lucide-react';
import type { ActivityRecord, FeedDetails } from '../types';

interface ActivityListProps {
  activities: ActivityRecord[];
  onDelete: (id: string) => void;
  onUpdateTime: (id: string, timestamp: string, details?: Partial<FeedDetails>) => void;
}

const PAGE_SIZE = 12;

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp);
  return format(date, 'HH:mm');
};

const formatDateLabel = (timestamp: string) => {
  const date = new Date(timestamp);
  return isSameDay(date, new Date()) ? 'Today' : format(date, 'EEE, MMM d, yyyy');
};

const toDateTimeInputValue = (timestamp: string) => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';

  const timezoneOffsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
};

const toIsoTimestamp = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
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

const ActivityList = ({ activities, onDelete, onUpdateTime }: ActivityListProps) => {
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTime, setDraftTime] = useState('');
  const [draftValue, setDraftValue] = useState('');

  const totalPages = Math.max(1, Math.ceil(activities.length / PAGE_SIZE));

  useEffect(() => {
    setPage((currentPage) => Math.min(currentPage, totalPages));
  }, [totalPages]);

  const visibleActivities = useMemo(() => {
    const startIndex = (page - 1) * PAGE_SIZE;
    return activities.slice(startIndex, startIndex + PAGE_SIZE);
  }, [activities, page]);

  const firstVisible = activities.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastVisible = Math.min(page * PAGE_SIZE, activities.length);

  const beginEditing = (record: ActivityRecord) => {
    setEditingId(record.id);
    setDraftTime(toDateTimeInputValue(record.timestamp));
    if (record.type === 'feed' && record.details) {
      const raw = record.details.feedType === 'breastfeeding'
        ? record.details.durationMinutes
        : record.details.amount;
      setDraftValue(raw != null ? String(raw) : '');
    } else {
      setDraftValue('');
    }
  };

  const cancelEditing = () => {
    setEditingId(null);
    setDraftTime('');
    setDraftValue('');
  };

  const saveEditedTime = (event: FormEvent<HTMLFormElement>, record: ActivityRecord) => {
    event.preventDefault();
    const nextTimestamp = toIsoTimestamp(draftTime);
    if (!nextTimestamp) return;

    let details: Partial<FeedDetails> | undefined;
    if (record.type === 'feed' && record.details && draftValue !== '') {
      const numeric = parseFloat(draftValue);
      if (!Number.isNaN(numeric) && numeric > 0) {
        details = record.details.feedType === 'breastfeeding'
          ? { durationMinutes: Math.round(numeric) }
          : { amount: numeric };
      }
    }

    onUpdateTime(record.id, nextTimestamp, details);
    cancelEditing();
  };

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <span className="section-kicker">History</span>
          <h2>Recent activity</h2>
        </div>
        <span className="count-pill">{activities.length}</span>
      </div>

      {activities.length > PAGE_SIZE ? (
        <div className="history-controls">
          <span>
            {firstVisible}-{lastVisible} of {activities.length}
          </span>
          <div className="history-pager" aria-label="History pages">
            <button
              type="button"
              className="icon-button subtle"
              onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
              disabled={page === 1}
              aria-label="Previous history page"
            >
              <ChevronLeft size={18} />
            </button>
            <strong>
              {page} / {totalPages}
            </strong>
            <button
              type="button"
              className="icon-button subtle"
              onClick={() => setPage((currentPage) => Math.min(totalPages, currentPage + 1))}
              disabled={page === totalPages}
              aria-label="Next history page"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      ) : null}

      <ul className="activity-list">
        {activities.length === 0 ? (
          <li className="empty-state">No events recorded yet. Start with Feed, Wee, or Poop.</li>
        ) : (
          visibleActivities.map((record, index) => {
            const previousRecord = visibleActivities[index - 1];
            const showDateLabel = !previousRecord
              || !isSameDay(new Date(record.timestamp), new Date(previousRecord.timestamp));
            const isEditing = editingId === record.id;

            return (
              <Fragment key={record.id}>
                {showDateLabel ? (
                  <li className="activity-date-row">{formatDateLabel(record.timestamp)}</li>
                ) : null}
                <li className="activity-item">
                  <div className={`activity-badge activity-badge--${record.type}`}>{iconForRecord(record)}</div>
                  <div className="activity-main">
                    <div className="activity-text">
                      <strong>{typeLabel(record)}</strong>
                      <div className="activity-meta">{formatTime(record.timestamp)}</div>
                      {isEditing ? (
                        <form className="activity-edit-form" onSubmit={(event) => saveEditedTime(event, record)}>
                          <input
                            className="activity-time-input"
                            type="datetime-local"
                            value={draftTime}
                            onChange={(event) => setDraftTime(event.currentTarget.value)}
                            aria-label={`New time for ${typeLabel(record)} record`}
                            required
                          />
                          {record.type === 'feed' && record.details ? (
                            <input
                              className="activity-amount-input"
                              type="number"
                              min="0"
                              step={record.details.feedType === 'breastfeeding' ? '1' : '0.1'}
                              value={draftValue}
                              onChange={(event) => setDraftValue(event.currentTarget.value)}
                              placeholder={record.details.feedType === 'breastfeeding' ? 'min' : (record.details.unit ?? 'ml')}
                              aria-label={record.details.feedType === 'breastfeeding' ? 'Duration in minutes' : `Amount in ${record.details.unit ?? 'ml'}`}
                            />
                          ) : null}
                          <button type="submit" className="icon-button confirm" aria-label="Save activity time">
                            <Check size={17} />
                          </button>
                          <button type="button" className="icon-button subtle" onClick={cancelEditing} aria-label="Cancel time edit">
                            <X size={17} />
                          </button>
                        </form>
                      ) : null}
                    </div>
                    {record.details ? <div className="activity-value">{detailsLabel(record)}</div> : null}
                  </div>
                  <div className="activity-actions">
                    <button
                      type="button"
                      className="icon-button subtle"
                      onClick={() => beginEditing(record)}
                      aria-label={`Edit time for ${typeLabel(record)} record`}
                    >
                      <Pencil size={17} />
                    </button>
                    <button
                      type="button"
                      className="icon-button subtle"
                      onClick={() => onDelete(record.id)}
                      aria-label={`Delete ${typeLabel(record)} record`}
                    >
                      <X size={17} />
                    </button>
                  </div>
                </li>
              </Fragment>
            );
          })
        )}
      </ul>
    </section>
  );
};

export default ActivityList;
