import { db } from "@/lib/db";
import { DEFAULT_HASHTAG, getCachedLiveHashtagNews } from "@/lib/fallbackNews";
import { getCachedMusicRankings } from "@/lib/musicRankings";

export type NewsCardData = {
  id: string;
  title: string;
  url: string;
  imageUrl: string | null;
  publishedAt: string | null;
  source: {
    name: string;
  } | null;
};

export type NewsData = {
  news: NewsCardData[];
  databaseReady: boolean;
  newsMode: "database" | "live-rss-fallback";
  updatedAt: string;
};

function serializeNewsArticle(article: {
  id: string;
  title: string;
  url: string;
  imageUrl: string | null;
  publishedAt?: Date | string | null;
  source: { name: string } | null;
}): NewsCardData {
  return {
    id: article.id,
    title: article.title,
    url: article.url,
    imageUrl: article.imageUrl,
    publishedAt:
      article.publishedAt instanceof Date ? article.publishedAt.toISOString() : article.publishedAt ?? null,
    source: article.source ? { name: article.source.name } : null
  };
}

export async function getNewsData(limit = 6): Promise<NewsData> {
  try {
    const dbNews = await db.newsArticle.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: limit,
      include: { source: true }
    });

    if (dbNews.length > 0) {
      return {
        news: dbNews.map(serializeNewsArticle),
        databaseReady: true,
        newsMode: "database",
        updatedAt: new Date().toISOString()
      };
    }

    const liveNews = await getCachedLiveHashtagNews({ hashtag: DEFAULT_HASHTAG, limit });
    return {
      news: liveNews.data.map(serializeNewsArticle),
      databaseReady: true,
      newsMode: "live-rss-fallback",
      updatedAt: liveNews.updatedAt
    };
  } catch {
    // Preview mode still works without PostgreSQL.
  }

  const liveNews = await getCachedLiveHashtagNews({ hashtag: DEFAULT_HASHTAG, limit });
  return {
    news: liveNews.data.map(serializeNewsArticle),
    databaseReady: false,
    newsMode: "live-rss-fallback",
    updatedAt: liveNews.updatedAt
  };
}

export async function getHomeData() {
  const [musicRankings, newsData] = await Promise.all([
    getCachedMusicRankings({ limit: 8 }).catch(() => ({ data: [], updatedAt: new Date().toISOString() })),
    getNewsData(6)
  ]);

  return {
    musicRankings: musicRankings.data,
    rankingsUpdatedAt: musicRankings.updatedAt,
    ...newsData
  };
}
