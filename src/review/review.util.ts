import { BadRequestException } from '@nestjs/common';
import { ReviewStatus } from './schema/ewview.schema';

/**
 * Parse a comma-separated `status` query value into a typed array.
 * Throws BadRequestException if any value is not part of `ReviewStatus`.
 */
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
      throw new BadRequestException(`Invalid status: ${p}`);
    }
    out.push(p as ReviewStatus);
  }
  return out.length ? out : undefined;
}
