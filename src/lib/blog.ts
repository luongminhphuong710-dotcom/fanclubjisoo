import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { db } from "@/lib/db";

export type BlogPostData = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  imageUrl: string | null;
  tags: string[];
  published: boolean;
  authorName: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BlogPostInput = {
  id?: string;
  title: string;
  excerpt?: string;
  body: string;
  imageUrl?: string;
  tags?: string[];
  published?: boolean;
};

export type ListBlogPostsOptions = {
  includeDrafts?: boolean;
  limit?: number;
  tag?: string | null;
};

const seedPosts: BlogPostData[] = [
  {
    id: "seed-jisoo-fanclub-note",
    slug: "jisoo-fanclub-note",
    title: "Chào mừng đến với Blog JISOO Vietnam Fanclub",
    excerpt: "Không gian cập nhật các bài viết, cảm nhận và hoạt động mới dành cho cộng đồng yêu JISOO.",
    body:
      "Blog là nơi admin chia sẻ các bài viết dài hơn về JISOO: lịch trình nổi bật, thành tích âm nhạc, vai diễn, hình ảnh đẹp và những khoảnh khắc đáng nhớ cùng BLINK Việt.",
    imageUrl: "/images/jisoo-vietnam-fanclub-cover.png",
    tags: ["JISOO", "Fanclub", "Mia"],
    published: true,
    authorName: "Mia",
    publishedAt: "2026-06-24T00:00:00.000Z",
    createdAt: "2026-06-24T00:00:00.000Z",
    updatedAt: "2026-06-24T00:00:00.000Z"
  }
];

function dataPath() {
  if (process.env.VERCEL) {
    return path.join(os.tmpdir(), "jisoo-blog-posts.json");
  }

  return path.join(process.cwd(), ".data", "blog-posts.json");
}

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : value;
}

function slugify(value: string): string {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || `bai-viet-${Date.now()}`;
}

function normalizeTag(value: string | null | undefined): string {
  return (value ?? "").replace(/^#/, "").trim().toLowerCase();
}

function normalizeTags(tags: string[] | undefined): string[] {
  return [...new Set((tags ?? []).map((tag) => tag.trim().replace(/^#/, "")).filter(Boolean))].slice(0, 8);
}

function filterByTag(posts: BlogPostData[], tag: string | null | undefined): BlogPostData[] {
  const normalizedTag = normalizeTag(tag);

  if (!normalizedTag) {
    return posts;
  }

  return posts.filter((post) => post.tags.some((item) => normalizeTag(item) === normalizedTag));
}

function serializeDbPost(post: {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  imageUrl: string | null;
  tags: string[];
  published: boolean;
  authorName: string;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): BlogPostData {
  return {
    ...post,
    publishedAt: toIso(post.publishedAt),
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString()
  };
}

async function readFallbackPosts(): Promise<BlogPostData[]> {
  try {
    const content = await readFile(dataPath(), "utf8");
    const posts = JSON.parse(content) as BlogPostData[];
    return posts.length > 0 ? posts : seedPosts;
  } catch {
    return seedPosts;
  }
}

async function writeFallbackPosts(posts: BlogPostData[]) {
  const filePath = dataPath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(posts, null, 2)}\n`, "utf8");
}

function sortPosts(posts: BlogPostData[]) {
  return [...posts].sort((a, b) => {
    const timeA = new Date(a.publishedAt ?? a.createdAt).getTime();
    const timeB = new Date(b.publishedAt ?? b.createdAt).getTime();
    return timeB - timeA;
  });
}

export async function listBlogPosts(options: ListBlogPostsOptions = {}) {
  const includeDrafts = options.includeDrafts ?? false;
  const limit = options.limit ?? 20;
  const take = Math.max(limit, 100);

  try {
    const posts = await db.blogPost.findMany({
      where: includeDrafts ? undefined : { published: true },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take
    });

    return filterByTag(posts.map(serializeDbPost), options.tag).slice(0, limit);
  } catch {
    const posts = await readFallbackPosts();
    return filterByTag(sortPosts(includeDrafts ? posts : posts.filter((post) => post.published)), options.tag).slice(
      0,
      limit
    );
  }
}

export async function getBlogPostBySlug(slug: string, options: { includeDrafts?: boolean } = {}) {
  try {
    const post = await db.blogPost.findUnique({ where: { slug } });

    if (!post || (!options.includeDrafts && !post.published)) {
      return null;
    }

    return serializeDbPost(post);
  } catch {
    const posts = await readFallbackPosts();
    return posts.find((post) => post.slug === slug && (options.includeDrafts || post.published)) ?? null;
  }
}

export async function listBlogTags() {
  const posts = await listBlogPosts({ limit: 100 });
  const tagMap = new Map<string, { label: string; count: number }>();

  for (const post of posts) {
    for (const tag of post.tags) {
      const key = normalizeTag(tag);
      const current = tagMap.get(key);

      tagMap.set(key, {
        label: current?.label ?? tag.replace(/^#/, ""),
        count: (current?.count ?? 0) + 1
      });
    }
  }

  return [...tagMap.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export async function listHotBlogPosts(options: { excludeSlug?: string; limit?: number } = {}) {
  const posts = await listBlogPosts({ limit: 100 });

  return posts.filter((post) => post.slug !== options.excludeSlug).slice(0, options.limit ?? 5);
}

export async function createBlogPost(input: BlogPostInput) {
  const now = new Date().toISOString();
  const slugBase = slugify(input.title);
  const published = input.published ?? true;
  const payload = {
    slug: `${slugBase}-${Date.now().toString(36)}`,
    title: input.title.trim(),
    excerpt: input.excerpt?.trim() || null,
    body: input.body.trim(),
    imageUrl: input.imageUrl?.trim() || null,
    tags: normalizeTags(input.tags),
    published,
    authorName: "Mia",
    publishedAt: published ? new Date(now) : null
  };

  try {
    const created = await db.blogPost.create({ data: payload });
    return serializeDbPost(created);
  } catch {
    const posts = await readFallbackPosts();
    const created: BlogPostData = {
      ...payload,
      id: crypto.randomUUID(),
      publishedAt: toIso(payload.publishedAt),
      createdAt: now,
      updatedAt: now
    };

    await writeFallbackPosts([created, ...posts]);
    return created;
  }
}

export async function updateBlogPost(id: string, input: BlogPostInput) {
  const now = new Date().toISOString();
  const published = input.published ?? true;
  const data = {
    title: input.title.trim(),
    excerpt: input.excerpt?.trim() || null,
    body: input.body.trim(),
    imageUrl: input.imageUrl?.trim() || null,
    tags: normalizeTags(input.tags),
    published,
    publishedAt: published ? new Date(now) : null
  };

  try {
    const updated = await db.blogPost.update({ where: { id }, data });
    return serializeDbPost(updated);
  } catch {
    const posts = await readFallbackPosts();
    const index = posts.findIndex((post) => post.id === id);

    if (index < 0) {
      return createBlogPost(input);
    }

    const updated: BlogPostData = {
      ...posts[index],
      ...data,
      publishedAt: toIso(data.publishedAt),
      updatedAt: now
    };

    posts[index] = updated;
    await writeFallbackPosts(posts);
    return updated;
  }
}
