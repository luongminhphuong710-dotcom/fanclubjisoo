import { ArticleStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { DEFAULT_HASHTAG, getLiveHashtagNews, normalizeHashtag } from "@/lib/fallbackNews";
import { json } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
      const liveNews = await getLiveHashtagNews({ hashtag, limit: take });

      return json({
        data: liveNews,
        databaseReady: true,
        mode: "live-rss-fallback",
        hashtag: `#${hashtag}`
      });
    }

    return json({
      data,
      databaseReady: true
    });
  } catch {
    const liveNews = await getLiveHashtagNews({ hashtag, limit: take });
    return json({
      data: liveNews,
      databaseReady: false,
      mode: "live-rss-fallback",
      hashtag: `#${hashtag}`
    });
  }
}
