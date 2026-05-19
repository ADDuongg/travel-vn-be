export function toSlug(input: string): string {
  if (typeof input !== 'string' || !input.trim()) {
    return 'item';
  }
  return (
    input
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'item'
  );
}

export async function withUniqueSuffix(
  base: string,
  isTaken: (slug: string) => Promise<boolean>,
): Promise<string> {
  let candidate = base;
  let n = 1;
  while (await isTaken(candidate)) {
    n += 1;
    candidate = `${base}-${n}`;
  }
  return candidate;
}
