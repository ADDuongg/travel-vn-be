import { toSlug, withUniqueSuffix } from 'src/utils/slug.util';
import type { Model } from 'mongoose';

export type EditorJsBlock = {
  id: string;
  type: string;
  data?: Record<string, unknown>;
};

export type TocItem = {
  id: string;
  text: string;
  level: number;
};

/** Words per minute for reading time — Vietnamese slightly slower. */
const WPM: Record<string, number> = {
  vi: 200,
  en: 250,
  default: 220,
};

/**
 * Coerce any value into Editor.js blocks (best-effort).
 */
export function normalizeEditorBlocks(raw: unknown): EditorJsBlock[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    const out: EditorJsBlock[] = [];
    for (const b of raw) {
      if (!b || typeof b !== 'object') continue;
      const o = b as Record<string, unknown>;
      const id =
        typeof o.id === 'string'
          ? o.id
          : typeof o.id === 'number'
            ? String(o.id)
            : '';
      const type = typeof o.type === 'string' ? o.type : 'paragraph';
      const data: Record<string, unknown> =
        o.data && typeof o.data === 'object'
          ? (o.data as Record<string, unknown>)
          : {};
      if (!id) continue;
      out.push({ id, type, data });
    }
    return out;
  }
  return [];
}

/**
 * Extract plain text from a single block for length / reading time.
 */
function blockToPlainText(block: EditorJsBlock): string {
  const d = block.data || {};
  switch (block.type) {
    case 'paragraph':
    case 'header':
    case 'quote': {
      const t = d.text;
      return typeof t === 'string' ? t : '';
    }
    case 'list': {
      const items = d.items;
      if (Array.isArray(items)) {
        return items
          .map((i) =>
            typeof i === 'string'
              ? i
              : ((i as { content: string })?.content ?? ''),
          )
          .join(' ');
      }
      return '';
    }
    case 'code': {
      const t = d.code;
      return typeof t === 'string' ? t : '';
    }
    case 'table': {
      const content = d.content;
      if (Array.isArray(content)) {
        return content
          .map((row) => (Array.isArray(row) ? row.join(' ') : ''))
          .join(' ');
      }
      return '';
    }
    case 'warning': {
      const title = d.title;
      const message = d.message;
      return [title, message].filter((s) => typeof s === 'string').join(' ');
    }
    default:
      return '';
  }
}

export function countWordsInBlocks(blocks: EditorJsBlock[]): number {
  const text = blocks.map(blockToPlainText).join(' ').trim();
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

/**
 * Returns estimated reading time in minutes (minimum 1 if there is any content).
 */
export function readingTimeMinutesFromBlocks(
  blocks: EditorJsBlock[],
  lang: string,
): number {
  const wordCount = countWordsInBlocks(blocks);
  if (wordCount === 0) return 0;
  const wpm = WPM[lang] ?? WPM.default;
  return Math.max(1, Math.round(wordCount / wpm) || 1);
}

/**
 * Build TOC from header blocks.
 */
export function buildTableOfContents(blocks: EditorJsBlock[]): TocItem[] {
  const out: TocItem[] = [];
  for (const b of blocks) {
    if (b.type !== 'header' || !b.id) continue;
    const d = b.data || {};
    const text = typeof d.text === 'string' ? d.text : '';
    const level = typeof d.level === 'number' ? d.level : 1;
    if (text) {
      out.push({ id: b.id, text, level: Math.min(6, Math.max(1, level)) });
    }
  }
  return out;
}

/**
 * Enrich all translation blocks with readingTime and tableOfContents.
 */
export function enrichTranslationBlocks(
  translations: Record<
    string,
    {
      content?: unknown;
      [key: string]: unknown;
    }
  >,
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...translations };
  for (const [lang, block] of Object.entries(translations)) {
    if (!block || typeof block !== 'object') continue;
    const raw = (block as { content?: unknown }).content;
    const content = normalizeEditorBlocks(raw);
    const readingTime = readingTimeMinutesFromBlocks(content, lang);
    const tableOfContents = buildTableOfContents(content);
    next[lang] = {
      ...block,
      content,
      readingTime,
      tableOfContents,
    };
  }
  return next;
}

export function pickTitleForSlug(
  translations: Record<string, { title?: string }>,
): string {
  const t = translations?.vi?.title || translations?.en?.title;
  if (t?.trim()) return t;
  for (const v of Object.values(translations)) {
    if (v?.title?.trim()) return v.title;
  }
  return 'post';
}

/**
 * Generate unique slug for blog post (and categories/tags reuse `withUniqueSuffix` + `toSlug` alone).
 */
export async function uniqueBlogPostSlug(
  baseTitle: string,

  blogPostModel: Model<any>,
  excludeId?: string,
): Promise<string> {
  const base = toSlug(baseTitle);
  return withUniqueSuffix(base, async (s) => {
    const found = await blogPostModel.findOne({
      slug: s,
      isDeleted: { $ne: true },
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    });
    return Boolean(found);
  });
}
