import { MAX_STAY_NIGHTS } from 'src/validators/max-stay.validator';

export function clampDateRange(from: Date, to: Date): { from: Date; to: Date } {
  const start = new Date(from);
  start.setHours(0, 0, 0, 0);

  const end = new Date(to);
  end.setHours(0, 0, 0, 0);

  const maxEnd = new Date(start);
  maxEnd.setDate(maxEnd.getDate() + MAX_STAY_NIGHTS);

  if (end > maxEnd) {
    return {
      from: start,
      to: maxEnd,
    };
  }

  return { from: start, to: end };
}
