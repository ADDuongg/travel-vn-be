import { MAX_STAY_NIGHTS } from 'src/validators/max-stay.validator';

export function clampDateRange(from: Date, to: Date): { from: Date; to: Date } {
  const start = new Date(
    Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()),
  );

  const end = new Date(
    Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()),
  );

  const maxEnd = new Date(start);
  maxEnd.setUTCDate(maxEnd.getUTCDate() + MAX_STAY_NIGHTS);

  if (end > maxEnd) {
    return {
      from: start,
      to: maxEnd,
    };
  }

  return { from: start, to: end };
}
