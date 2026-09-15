import type { TimeInterval } from "./types.js";

/**
 * Checks if two half-open intervals [startA, endA) and [startB, endB) overlap.
 * Exactly contiguous intervals [10:00, 12:00) and [12:00, 14:00) DO NOT overlap.
 */
export function doIntervalsOverlap(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date
): boolean {
  const sA = new Date(startA).getTime();
  const eA = new Date(endA).getTime();
  const sB = new Date(startB).getTime();
  const eB = new Date(endB).getTime();

  return sA < eB && sB < eA;
}

/**
 * Calculates the overlap duration in minutes between two intervals, or 0 if no overlap.
 */
export function getOverlapMinutes(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date
): number {
  const sA = new Date(startA).getTime();
  const eA = new Date(endA).getTime();
  const sB = new Date(startB).getTime();
  const eB = new Date(endB).getTime();

  const maxStart = Math.max(sA, sB);
  const minEnd = Math.min(eA, eB);

  if (maxStart < minEnd) {
    return Math.round((minEnd - maxStart) / (1000 * 60));
  }
  return 0;
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(new Date(date).getTime() + minutes * 60 * 1000);
}

export function formatWindow(interval: TimeInterval): string {
  const s = new Date(interval.startTime).toISOString().slice(11, 16);
  const e = new Date(interval.endTime).toISOString().slice(11, 16);
  return `[${s} - ${e}Z]`;
}
