import { addMonths, addYears, differenceInMonths, differenceInWeeks, differenceInYears, isAfter } from 'date-fns';

const plural = (value: number, singular: string) => `${value} ${singular}${value === 1 ? '' : 's'}`;

const parseBirthDate = (dateOfBirth: string | null) => {
  if (!dateOfBirth) return null;
  const date = new Date(`${dateOfBirth}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const ageInWeeks = (dateOfBirth: string | null) => {
  const birthDate = parseBirthDate(dateOfBirth);
  if (!birthDate || isAfter(birthDate, new Date())) return null;

  return Math.max(differenceInWeeks(new Date(), birthDate), 0);
};

export const ageLabelFromBirthDate = (dateOfBirth: string | null) => {
  const birthDate = parseBirthDate(dateOfBirth);
  if (!birthDate) return 'Birth date not set';

  const today = new Date();
  if (isAfter(birthDate, today)) return 'Birth date is in the future';

  const years = differenceInYears(today, birthDate);
  if (years >= 1) {
    const monthsAfterYears = differenceInMonths(today, addYears(birthDate, years));
    return monthsAfterYears > 0
      ? `${plural(years, 'year')} ${plural(monthsAfterYears, 'month')}`
      : plural(years, 'year');
  }

  const months = differenceInMonths(today, birthDate);
  if (months >= 1) {
    const weeksAfterMonths = differenceInWeeks(today, addMonths(birthDate, months));
    return weeksAfterMonths > 0
      ? `${plural(months, 'month')} ${plural(weeksAfterMonths, 'week')}`
      : plural(months, 'month');
  }

  const weeks = differenceInWeeks(today, birthDate);
  return weeks === 0 ? 'Newborn' : plural(weeks, 'week');
};
