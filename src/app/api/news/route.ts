import { ArticleStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { DEFAULT_HASHTAG, getCachedLiveHashtagNews, normalizeHashtag } from "@/lib/fallbackNews";
import { json } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const NEWS_CACHE_HEADERS = {
  "cache-control": "public, max-age=0, s-maxage=30, stale-while-revalidate=120"
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const take = Math.min(Number(url.searchParams.get("limit") ?? 20), 100);
  const idolSlug = url.searchParams.get("idol");
  const hashtag = normalizeHashtag(url.searchParams.get("hashtag") ?? DEFAULT_HASHTAG);

  try {
    const articles = await db.newsArticle.findMany({
      where: {
        status: ArticleStatus.PUBLISHED,
        ...(idolSlug
          ? {
              idol: {
                slug: idolSlug
              }
            }
          : {})
      },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take,
      include: {
        idol: {
          select: { slug: true, name: true }
        },
        source: {
          select: { name: true, type: true }
        }
      }
    });

    const data = articles.map((article) => ({
        id: article.id,
        title: article.title,
        excerpt: article.excerpt,
        url: article.url,
        imageUrl: article.imageUrl,
        author: article.author,
        publishedAt: article.publishedAt,
        matchedKeywords: article.matchedKeywords,
        source: article.source,
        idol: article.idol
      }));

    if (data.length === 0) {
      const liveNews = await getCachedLiveHashtagNews({ hashtag, limit: take });

      return json(
        {
        data: liveNews.data,
        databaseReady: true,
        mode: "live-rss-fallback",
        hashtag: `#${hashtag}`,
        updatedAt: liveNews.updatedAt,
        cache: liveNews.cacheStatus
        },
        { headers: NEWS_CACHE_HEADERS }
      );
    }

    return json(
      {
      data,
      databaseReady: true,
      mode: "database",
      updatedAt: new Date().toISOString()
      },
      { headers: NEWS_CACHE_HEADERS }
    );
  } catch {
    const liveNews = await getCachedLiveHashtagNews({ hashtag, limit: take });
    return json(
      {
      data: liveNews.data,
      databaseReady: false,
      mode: "live-rss-fallback",
      hashtag: `#${hashtag}`,
      updatedAt: liveNews.updatedAt,
      cache: liveNews.cacheStatus
      },
      { headers: NEWS_CACHE_HEADERS }
    );
  }
}
