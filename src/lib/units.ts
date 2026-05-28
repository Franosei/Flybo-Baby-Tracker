import type { Unit } from '../types';

const ML_PER_OUNCE = 29.5735;
const BREASTFEED_MIN_ML_PER_MINUTE = 2;
const BREASTFEED_MAX_ML_PER_MINUTE = 3;

export const toMilliliters = (amount: number, unit: Unit) => {
  return unit === 'oz' ? amount * ML_PER_OUNCE : amount;
};

export const fromMilliliters = (amountMl: number, unit: Unit) => {
  return unit === 'oz' ? amountMl / ML_PER_OUNCE : amountMl;
};

export const formatVolume = (amountMl: number, unit: Unit) => {
  if (unit === 'oz') {
    const ounces = fromMilliliters(amountMl, unit);
    return `${Number(ounces.toFixed(1)).toLocaleString()} oz`;
  }

  return `${Math.round(amountMl).toLocaleString()} ml`;
};

export const formatVolumeRange = (minMl: number, maxMl: number, unit: Unit) => {
  if (Math.round(minMl) === Math.round(maxMl)) return formatVolume(minMl, unit);

  if (unit === 'oz') {
    const minOz = Number(fromMilliliters(minMl, unit).toFixed(1));
    const maxOz = Number(fromMilliliters(maxMl, unit).toFixed(1));
    return `${minOz.toLocaleString()}-${maxOz.toLocaleString()} oz`;
  }

  return `${Math.round(minMl).toLocaleString()}-${Math.round(maxMl).toLocaleString()} ml`;
};

export const convertVolumeInput = (amount: number, fromUnit: Unit, toUnit: Unit) => {
  if (fromUnit === toUnit) return amount;
  const nextAmount = fromMilliliters(toMilliliters(amount, fromUnit), toUnit);
  return toUnit === 'oz' ? Number(nextAmount.toFixed(1)) : Math.round(nextAmount);
};

export const breastfeedingEstimateMlRange = (minutes: number) => ({
  min: minutes * BREASTFEED_MIN_ML_PER_MINUTE,
  max: minutes * BREASTFEED_MAX_ML_PER_MINUTE,
});

export const breastfeedingEstimateMidpointMl = (minutes: number) => {
  const estimate = breastfeedingEstimateMlRange(minutes);
  return (estimate.min + estimate.max) / 2;
};
