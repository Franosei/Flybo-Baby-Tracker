import { useMemo, useState } from 'react';
import { Milk, Timer, X } from 'lucide-react';
import { convertVolumeInput } from '../lib/units';
import type { FeedDetails, FeedType, Unit } from '../types';

interface FeedModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (details: FeedDetails) => void;
  unit: Unit;
  setUnit: (next: Unit) => void;
}

const feedOptions: { label: string; value: FeedType; shortLabel: string }[] = [
  { label: 'Breastfeeding', value: 'breastfeeding', shortLabel: 'Breast' },
  { label: 'Expressed breast milk', value: 'expressed', shortLabel: 'Expressed' },
  { label: 'Formula', value: 'formula', shortLabel: 'Formula' },
];

const FeedModal = ({ open, onClose, onSave, unit, setUnit }: FeedModalProps) => {
  const [feedType, setFeedType] = useState<FeedType>('breastfeeding');
  const [durationMinutes, setDurationMinutes] = useState(20);
  const [amount, setAmount] = useState(120);

  const canSave = useMemo(() => {
    if (feedType === 'breastfeeding') {
      return durationMinutes > 0;
    }

    return amount > 0;
  }, [feedType, durationMinutes, amount]);

  const handleUnitChange = (nextUnit: Unit) => {
    setAmount((currentAmount) => convertVolumeInput(currentAmount, unit, nextUnit));
    setUnit(nextUnit);
  };

  const handleSave = () => {
    if (!canSave) return;

    onSave(
      feedType === 'breastfeeding'
        ? { feedType, durationMinutes }
        : { feedType, amount, unit },
    );

    setDurationMinutes(20);
    setAmount(unit === 'oz' ? 4 : 120);
    setFeedType('breastfeeding');
  };

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="feed-modal-title">
      <form
        className="modal-panel"
        onSubmit={(event) => {
          event.preventDefault();
          handleSave();
        }}
      >
        <div className="modal-header">
          <div>
            <span className="section-kicker">Feed</span>
            <h2 id="feed-modal-title">Record feed</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close feed modal">
            <X size={20} />
          </button>
        </div>

        <div className="form-group">
          <span className="field-label">Feed type</span>
          <div className="choice-grid" role="group" aria-label="Feed type">
            {feedOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={feedType === option.value ? 'choice-button active' : 'choice-button'}
                onClick={() => setFeedType(option.value)}
                aria-label={option.label}
                aria-pressed={feedType === option.value}
              >
                {option.value === 'breastfeeding' ? <Timer size={18} /> : <Milk size={18} />}
                <span>{option.shortLabel}</span>
              </button>
            ))}
          </div>
        </div>

        {feedType === 'breastfeeding' ? (
          <div className="form-group">
            <label htmlFor="duration">Duration (minutes)</label>
            <input
              id="duration"
              type="number"
              value={durationMinutes}
              min={1}
              inputMode="numeric"
              onChange={(event) => setDurationMinutes(Number(event.target.value))}
            />
          </div>
        ) : (
          <div className="form-group">
            <div className="field-row">
              <label htmlFor="amount">Quantity</label>
              <div className="segmented-control" aria-label="Bottle unit">
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
            <input
              id="amount"
              type="number"
              value={amount}
              min={unit === 'oz' ? 0.1 : 1}
              step={unit === 'oz' ? 0.1 : 1}
              inputMode="decimal"
              onChange={(event) => setAmount(Number(event.target.value))}
            />
          </div>
        )}

        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="primary-button" disabled={!canSave}>
            Save feed
          </button>
        </div>
      </form>
    </div>
  );
};

export default FeedModal;
