import type { BlogPost } from './schema/blog-post.schema';

export type BlogPostListResponse = {
  items: Array<BlogPost | Record<string, unknown>>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};
