import { DomainException } from 'src/common/exceptions';
import { ReviewStatus } from './schema/ewview.schema';

export function parseStatusCsv(q?: string): ReviewStatus[] | undefined {
  if (!q?.trim()) return undefined;
  const parts = q
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const allowed = new Set(Object.values(ReviewStatus));
  const out: ReviewStatus[] = [];
  for (const p of parts) {
    if (!allowed.has(p as ReviewStatus)) {
      throw new DomainException(
        `Invalid status: ${p}`,
        400,
        'BAD_REQUEST',
        'review.bad_request',
      );
    }
    out.push(p as ReviewStatus);
  }
  return out.length ? out : undefined;
}
