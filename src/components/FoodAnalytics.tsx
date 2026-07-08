import { format, isSameDay } from 'date-fns';
import type { ActivityRecord } from '../types';

interface FoodAnalyticsProps {
  activities: ActivityRecord[];
}

interface FoodLog {
  id: string;
  name: string;
  timestamp: string;
  time: number;
}

interface FoodRank {
  name: string;
  count: number;
  lastTime: number;
}

const normalizeFoodName = (value?: string) => {
  const name = value?.trim();
  return name || 'Food';
};

const getWeekStart = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 6);
  return start.getTime();
};

const FoodAnalytics = ({ activities }: FoodAnalyticsProps) => {
  const today = new Date();
  const weekStart = getWeekStart();

  const foodLogs = activities
    .filter((activity) => activity.type === 'feed' && activity.details?.feedType === 'food')
    .map<FoodLog>((activity) => ({
      id: activity.id,
      name: normalizeFoodName(activity.details?.foodName),
      timestamp: activity.timestamp,
      time: new Date(activity.timestamp).getTime(),
    }))
    .filter((food) => !Number.isNaN(food.time));

  const todayFoods = foodLogs.filter((food) => isSameDay(new Date(food.timestamp), today));
  const weekFoods = foodLogs.filter((food) => food.time >= weekStart);
  const loggedDays = new Set(weekFoods.map((food) => format(new Date(food.timestamp), 'yyyy-MM-dd'))).size;
  const foodCounts = new Map<string, FoodRank>();

  weekFoods.forEach((food) => {
    const key = food.name.toLocaleLowerCase();
    const current = foodCounts.get(key);

    foodCounts.set(key, {
      name: current?.name ?? food.name,
      count: (current?.count ?? 0) + 1,
      lastTime: Math.max(current?.lastTime ?? 0, food.time),
    });
  });

  const rankedFoods = [...foodCounts.values()]
    .sort((a, b) => b.count - a.count || b.lastTime - a.lastTime)
    .slice(0, 5);
  const mostRepeated = rankedFoods[0]?.name ?? 'None';

  return (
    <section className="panel food-panel">
      <div className="panel-header">
        <div>
          <span className="section-kicker">Food</span>
          <h2>Food analytics</h2>
        </div>
        <span className="count-pill">{weekFoods.length}</span>
      </div>

      <div className="food-metric-grid">
        <article className="food-metric">
          <span>Today</span>
          <strong>{todayFoods.length}</strong>
        </article>
        <article className="food-metric">
          <span>7-day logs</span>
          <strong>{weekFoods.length}</strong>
        </article>
        <article className="food-metric">
          <span>Variety</span>
          <strong>{foodCounts.size}</strong>
        </article>
        <article className="food-metric">
          <span>Food days</span>
          <strong>{loggedDays}</strong>
        </article>
      </div>

      <div className="food-analytics-grid">
        <div>
          <h3>Today foods</h3>
          {todayFoods.length ? (
            <div className="food-chip-list">
              {todayFoods.map((food) => (
                <span key={food.id} className="food-chip">{food.name}</span>
              ))}
            </div>
          ) : (
            <p className="food-empty">No food logged today.</p>
          )}
        </div>
        <div>
          <h3>7-day favourites</h3>
          {rankedFoods.length ? (
            <ol className="food-rank-list">
              {rankedFoods.map((food) => (
                <li key={food.name}>
                  <span>{food.name}</span>
                  <strong>{food.count}</strong>
                </li>
              ))}
            </ol>
          ) : (
            <p className="food-empty">No food logged this week.</p>
          )}
        </div>
      </div>

      <p className="food-note">Most repeated: <strong>{mostRepeated}</strong></p>
    </section>
  );
};

export default FoodAnalytics;
