import { useMemo, useState } from 'react';
import { formatVolume } from '../lib/units';
import type { DailyStats, Unit } from '../types';

type ChartView = 'bottle' | 'breastfeeding' | 'nappies';

interface DailyChartsProps {
  dailyStats: DailyStats[];
  unit: Unit;
}

const chartViews: { label: string; value: ChartView }[] = [
  { label: 'Bottle', value: 'bottle' },
  { label: 'Breastfeeding', value: 'breastfeeding' },
  { label: 'Nappies', value: 'nappies' },
];

const widthFor = (value: number, max: number) => {
  if (value <= 0) return 0;
  return Math.max((value / max) * 100, 4);
};

const DailyCharts = ({ dailyStats, unit }: DailyChartsProps) => {
  const [view, setView] = useState<ChartView>('bottle');

  const maxBottleMl = useMemo(
    () => Math.max(...dailyStats.map((day) => day.expressedMl + day.formulaMl), 1),
    [dailyStats],
  );
  const maxBreastfeedingMinutes = useMemo(
    () => Math.max(...dailyStats.map((day) => day.breastfeedingMinutes), 1),
    [dailyStats],
  );
  const maxNappyCount = useMemo(
    () => Math.max(...dailyStats.map((day) => Math.max(day.weeCount, day.poopCount)), 1),
    [dailyStats],
  );

  return (
    <section className="panel chart-panel">
      <div className="panel-header">
        <div>
          <span className="section-kicker">Trends</span>
          <h2>Daily charts</h2>
        </div>
        <div className="segmented-control" role="tablist" aria-label="Chart view">
          {chartViews.map((item) => (
            <button
              key={item.value}
              type="button"
              className={view === item.value ? 'segment active' : 'segment'}
              onClick={() => setView(item.value)}
              role="tab"
              aria-selected={view === item.value}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {view === 'bottle' ? (
        <div className="chart-list" role="list">
          {dailyStats.map((day) => {
            const totalMl = day.expressedMl + day.formulaMl;

            return (
              <div className="chart-row" key={day.key} role="listitem">
                <div className="chart-date">
                  <strong>{day.dayLabel}</strong>
                  <span>{day.dateLabel}</span>
                </div>
                <div className="bar-track stacked" aria-label={`${day.dateLabel} bottle intake`}>
                  <span
                    className="bar-fill expressed"
                    style={{ width: `${widthFor(day.expressedMl, maxBottleMl)}%` }}
                  />
                  <span
                    className="bar-fill formula"
                    style={{ width: `${widthFor(day.formulaMl, maxBottleMl)}%` }}
                  />
                </div>
                <strong className="chart-value">{formatVolume(totalMl, unit)}</strong>
              </div>
            );
          })}
          <div className="chart-legend">
            <span>
              <i className="legend-dot expressed" />
              Expressed milk
            </span>
            <span>
              <i className="legend-dot formula" />
              Formula
            </span>
          </div>
        </div>
      ) : null}

      {view === 'breastfeeding' ? (
        <div className="chart-list" role="list">
          {dailyStats.map((day) => (
            <div className="chart-row" key={day.key} role="listitem">
              <div className="chart-date">
                <strong>{day.dayLabel}</strong>
                <span>{day.dateLabel}</span>
              </div>
              <div className="bar-track" aria-label={`${day.dateLabel} breastfeeding minutes`}>
                <span
                  className="bar-fill breastfeeding"
                  style={{ width: `${widthFor(day.breastfeedingMinutes, maxBreastfeedingMinutes)}%` }}
                />
              </div>
              <strong className="chart-value">{day.breastfeedingMinutes} min</strong>
            </div>
          ))}
        </div>
      ) : null}

      {view === 'nappies' ? (
        <div className="chart-list" role="list">
          {dailyStats.map((day) => (
            <div className="chart-row duo" key={day.key} role="listitem">
              <div className="chart-date">
                <strong>{day.dayLabel}</strong>
                <span>{day.dateLabel}</span>
              </div>
              <div className="duo-track" aria-label={`${day.dateLabel} wee and poop count`}>
                <div className="duo-bar">
                  <span>Wee</span>
                  <div className="bar-track mini">
                    <span className="bar-fill wee" style={{ width: `${widthFor(day.weeCount, maxNappyCount)}%` }} />
                  </div>
                  <strong>{day.weeCount}</strong>
                </div>
                <div className="duo-bar">
                  <span>Poop</span>
                  <div className="bar-track mini">
                    <span className="bar-fill poop" style={{ width: `${widthFor(day.poopCount, maxNappyCount)}%` }} />
                  </div>
                  <strong>{day.poopCount}</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
};

export default DailyCharts;
