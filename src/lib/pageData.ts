import { db } from "@/lib/db";
import { DEFAULT_HASHTAG, getLiveHashtagNews } from "@/lib/fallbackNews";
import { getMusicRankings } from "@/lib/musicRankings";

export type NewsCardData = {
  id: string;
  title: string;
  url: string;
  imageUrl: string | null;
  source: {
    name: string;
  } | null;
};

export type NewsData = {
  news: NewsCardData[];
  databaseReady: boolean;
  newsMode: "database" | "live-rss-fallback";
};

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
        news: dbNews.map((article) => ({
          id: article.id,
          title: article.title,
          url: article.url,
          imageUrl: article.imageUrl,
          source: article.source ? { name: article.source.name } : null
        })),
        databaseReady: true,
        newsMode: "database"
      };
    }

    const liveNews = await getLiveHashtagNews({ hashtag: DEFAULT_HASHTAG, limit });
    return {
      news: liveNews,
      databaseReady: true,
      newsMode: "live-rss-fallback"
    };
  } catch {
    // Preview mode still works without PostgreSQL.
  }

  const liveNews = await getLiveHashtagNews({ hashtag: DEFAULT_HASHTAG, limit });
  return {
    news: liveNews,
    databaseReady: false,
    newsMode: "live-rss-fallback"
  };
}

export async function getHomeData() {
  const [musicRankings, newsData] = await Promise.all([
    getMusicRankings({ limit: 8 }).catch(() => []),
    getNewsData(6)
  ]);

  return {
    musicRankings,
    ...newsData
  };
}
