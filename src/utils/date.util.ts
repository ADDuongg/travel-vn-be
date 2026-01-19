export function normalizeDate(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function todayInVietnam(): string {
  const now = new Date();

  // chuyển sang giờ VN
  const vnTime = new Date(
    now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }),
  );

  return vnTime.toISOString().substring(0, 10); // YYYY-MM-DD
}
export function normalizeDateOnly(input: string | Date): string {
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return input;
  }

  const date = new Date(input);

  if (isNaN(date.getTime())) {
    throw new Error('Invalid date input');
  }

  return date.toLocaleDateString('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
  }); // YYYY-MM-DD
}

/* export function validateBookingDates(from: string, to: string) {
  const today = new Date().toLocaleDateString('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
  });

  if (from < today) {
    throw new Error('Check-in must be today or later');
  }

  if (to <= from) {
    throw new Error('Check-out must be after check-in');
  }
} */
export function validateFutureDateRange(from: Date, to: Date) {
  const todayVN = todayInVietnam();

  const fromDate = from.toISOString().substring(0, 10);
  const toDate = to.toISOString().substring(0, 10);

  if (fromDate < todayVN) {
    throw new Error('Check-in date must be today or later');
  }

  if (toDate <= fromDate) {
    throw new Error('Check-out date must be after check-in date');
  }
}
/* export function parseDateOnlyToUTC(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
} */

export function parseDateOnly(input: string | Date): Date {
  if (input instanceof Date) {
    return new Date(
      Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()),
    );
  }

  const [y, m, d] = input.substring(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function diffInDays(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

/* export function buildNights(from: Date, to: Date): Date[] {
  const start = normalizeDate(from);
  const end = normalizeDate(to);

  if (start >= end) return [];

  const nights: Date[] = [];
  const cursor = new Date(start);

  while (cursor < end) {
    nights.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return nights;
} */
function normalizeToUtcMidnight(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}
export function buildNights(from: Date, to: Date): Date[] {
  const start = normalizeToUtcMidnight(from);
  const end = normalizeToUtcMidnight(to);

  const nights: Date[] = [];
  const current = new Date(start);

  while (current < end) {
    nights.push(new Date(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return nights;
}

export function getDatesInRange(checkIn: Date, checkOut: Date): Date[] {
  const dates: Date[] = [];

  const current = new Date(checkIn);

  while (current < checkOut) {
    dates.push(new Date(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}
