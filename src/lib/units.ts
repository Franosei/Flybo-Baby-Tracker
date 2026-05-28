import type { Unit } from '../types';

const ML_PER_OUNCE = 29.5735;

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

export const convertVolumeInput = (amount: number, fromUnit: Unit, toUnit: Unit) => {
  if (fromUnit === toUnit) return amount;
  const nextAmount = fromMilliliters(toMilliliters(amount, fromUnit), toUnit);
  return toUnit === 'oz' ? Number(nextAmount.toFixed(1)) : Math.round(nextAmount);
};
