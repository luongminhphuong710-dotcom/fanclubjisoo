import Parser from "rss-parser";
import { ArticleStatus, Prisma, SourceType } from "@prisma/client";
import { db } from "@/lib/db";
import { toJsonValue } from "@/lib/http";
import { matchKeywords, scoreArticleMatch } from "@/lib/news/filter";
import { searchRecentPosts } from "@/lib/providers/x";

const rssParser = new Parser<
  unknown,
  {
    author?: string;
    content?: string;
    contentSnippet?: string;
    creator?: string;
    isoDate?: string;
    pubDate?: string;
  }
>();

type NewsCandidate = {
  url: string;
  title: string;
  excerpt?: string | null;
  imageUrl?: string | null;
  author?: string | null;
  publishedAt?: Date | null;
  raw: unknown;
};

function parseDate(value: string | undefined): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function allKeywords(
  sourceKeywords: string[],
  idols: Array<{ name: string; keywords: string[] }>
): string[] {
  return Array.from(new Set([...sourceKeywords, ...idols.flatMap((idol) => [idol.name, ...idol.keywords])]));
}

async function rssCandidates(endpoint: string): Promise<NewsCandidate[]> {
  const feed = await rssParser.parseURL(endpoint);

  return feed.items
    .filter((item) => item.link && item.title)
    .map((item) => ({
      url: item.link as string,
      title: item.title as string,
      excerpt: item.contentSnippet ?? item.content?.slice(0, 280) ?? null,
      author: item.creator ?? item.author ?? null,
      publishedAt: parseDate(item.isoDate ?? item.pubDate),
      raw: item
    }));
}

async function xCandidates(query: string): Promise<NewsCandidate[]> {
  const posts = await searchRecentPosts(query, 25);

  return posts.map((post) => ({
    url: `https://x.com/i/web/status/${post.id}`,
    title: post.text.slice(0, 120),
    excerpt: post.text,
    author: post.authorUsername ? `@${post.authorUsername}` : post.authorId,
    publishedAt: parseDate(post.createdAt ?? undefined),
    raw: post
  }));
}

async function candidatesForSource(source: { type: SourceType; endpoint: string }) {
  switch (source.type) {
    case SourceType.RSS:
      return rssCandidates(source.endpoint);
    case SourceType.X:
      return xCandidates(source.endpoint);
    case SourceType.INSTAGRAM:
      return [];
    case SourceType.MANUAL:
      return [];
    default:
      return [];
  }
}

export async function syncNews() {
  const [sources, idols] = await Promise.all([
    db.newsSource.findMany({ where: { enabled: true } }),
    db.idol.findMany({
      where: { active: true },
      select: { id: true, name: true, keywords: true }
    })
  ]);

  const errors: Array<{ sourceId: string; message: string }> = [];
  let insertedOrUpdated = 0;
  let skipped = 0;

  for (const source of sources) {
    try {
      const candidates = await candidatesForSource(source);
      const keywords = allKeywords(source.keywords, idols);

      for (const candidate of candidates) {
        const searchableText = `${candidate.title} ${candidate.excerpt ?? ""}`;
        const matchedKeywords = matchKeywords(searchableText, keywords);

        if (matchedKeywords.length === 0) {
          skipped += 1;
          continue;
        }

        const idol = idols.find((item) =>
          matchKeywords(searchableText, [item.name, ...item.keywords]).length > 0
        );
        const score = scoreArticleMatch(candidate.title, candidate.excerpt ?? "", matchedKeywords);

        await db.newsArticle.upsert({
          where: { url: candidate.url },
          update: {
            title: candidate.title,
            excerpt: candidate.excerpt,
            imageUrl: candidate.imageUrl,
            author: candidate.author,
            publishedAt: candidate.publishedAt,
            status: ArticleStatus.PUBLISHED,
            matchedKeywords,
            score,
            raw: toJsonValue(candidate.raw) as Prisma.InputJsonValue
          },
          create: {
            sourceId: source.id,
            idolId: idol?.id,
            url: candidate.url,
            title: candidate.title,
            excerpt: candidate.excerpt,
            imageUrl: candidate.imageUrl,
            author: candidate.author,
            publishedAt: candidate.publishedAt,
            status: ArticleStatus.PUBLISHED,
            matchedKeywords,
            score,
            raw: toJsonValue(candidate.raw) as Prisma.InputJsonValue
          }
        });

        insertedOrUpdated += 1;
      }

      await db.newsSource.update({
        where: { id: source.id },
        data: { lastFetchedAt: new Date() }
      });
    } catch (error) {
      errors.push({
        sourceId: source.id,
        message: error instanceof Error ? error.message : "Unknown news sync error"
      });
    }
  }

  return {
    sources: sources.length,
    insertedOrUpdated,
    skipped,
    errors,
    syncedAt: new Date().toISOString()
  };
}
