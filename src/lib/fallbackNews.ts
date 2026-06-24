import { createRequire } from "node:module";
import Parser from "rss-parser";
import { getCachedData } from "@/lib/liveCache";
import { matchKeywords, scoreArticleMatch } from "@/lib/news/filter";

type RssItem = {
  content?: string;
  contentSnippet?: string;
  creator?: string;
  isoDate?: string;
  pubDate?: string;
  source?: string;
};

export type LiveNewsArticle = {
  id: string;
  title: string;
  excerpt: string | null;
  url: string;
  imageUrl: string | null;
  author: string | null;
  publishedAt: Date | null;
  matchedKeywords: string[];
  score: number;
  source: {
    name: string;
    type: "RSS";
  };
  idol: {
    slug: string;
    name: string;
  };
};

const parser = new Parser<unknown, RssItem>({
  customFields: {
    item: [["source", "source"]]
  }
});

const require = createRequire(import.meta.url);
const { GoogleDecoder } = require("google-news-url-decoder") as {
  GoogleDecoder: new () => {
    decode: (url: string) => Promise<{ status: boolean; decoded_url?: string; message?: string }>;
  };
};
const googleDecoder = new GoogleDecoder();

export const DEFAULT_HASHTAG = "JISOO";
export const LIVE_NEWS_CACHE_TTL_MS = 60_000;

const JISOO_FALLBACK_IMAGES = [
  "https://upload.wikimedia.org/wikipedia/commons/b/bd/20240226_Kim_Jisoo_%EA%B9%80%EC%A7%80%EC%88%98_03.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/2/2d/20240226_Kim_Jisoo_%EA%B9%80%EC%A7%80%EC%88%98_02.jpg"
];

function parseDate(value: string | undefined): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function normalizeHashtag(value: string | null | undefined): string {
  const cleaned = (value ?? DEFAULT_HASHTAG).replace(/^#/, "").trim();
  return cleaned.length > 0 ? cleaned.toUpperCase() : DEFAULT_HASHTAG;
}

function googleNewsRssUrl(hashtag: string): string {
  const tag = normalizeHashtag(hashtag);
  const query = [`#${tag}`, tag, `"BLACKPINK ${tag}"`, `"Kim Jisoo"`].join(" OR ");
  const url = new URL("https://news.google.com/rss/search");
  url.searchParams.set("q", query);
  url.searchParams.set("hl", "vi");
  url.searchParams.set("gl", "VN");
  url.searchParams.set("ceid", "VN:vi");

  return url.toString();
}

function cleanHtml(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  return value
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleWithoutSource(title: string, source: string | undefined): string {
  if (source && title.endsWith(` - ${source}`)) {
    return title.slice(0, -` - ${source}`.length).trim();
  }

  const parts = title.split(" - ");
  return parts.length > 1 ? parts.slice(0, -1).join(" - ").trim() : title;
}

function sourceFromTitle(title: string): string {
  const parts = title.split(" - ");
  return parts.length > 1 ? parts.at(-1)?.trim() ?? "Google News" : "Google News";
}

function fallbackImageFor(index: number): string {
  return JISOO_FALLBACK_IMAGES[index % JISOO_FALLBACK_IMAGES.length];
}

function withTimeout<T>(promise: Promise<T>, milliseconds: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Request timed out")), milliseconds);

    promise
      .then((value) => resolve(value))
      .catch((error) => reject(error))
      .finally(() => clearTimeout(timer));
  });
}

function absoluteUrl(value: string, baseUrl: string): string | null {
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return null;
  }
}

function extractMetaImage(html: string, pageUrl: string): string | null {
  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["'][^>]*>/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["'][^>]*>/i,
    /<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["'][^>]*>/i
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return absoluteUrl(match[1], pageUrl);
    }
  }

  return null;
}

async function resolveOriginalArticleUrl(url: string): Promise<string | null> {
  if (!url.includes("news.google.com")) {
    return url;
  }

  try {
    const result = await withTimeout(googleDecoder.decode(url), 3500);
    return result.status && result.decoded_url ? result.decoded_url : null;
  } catch {
    return null;
  }
}

async function getArticleImageUrl(articleUrl: string): Promise<string | null> {
  try {
    const response = await withTimeout(
      fetch(articleUrl, {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"
        },
        next: { revalidate: 1800 }
      }),
      3500
    );

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      return null;
    }

    const html = await response.text();
    return extractMetaImage(html, response.url);
  } catch {
    return null;
  }
}

async function enrichArticleImage<T extends LiveNewsArticle>(article: T, index: number): Promise<T> {
  const originalUrl = await resolveOriginalArticleUrl(article.url);
  const imageUrl = originalUrl ? await getArticleImageUrl(originalUrl) : null;

  return {
    ...article,
    url: originalUrl ?? article.url,
    imageUrl: imageUrl ?? article.imageUrl ?? fallbackImageFor(index)
  };
}

export async function getLiveHashtagNews(options: { hashtag?: string | null; limit?: number } = {}) {
  const hashtag = normalizeHashtag(options.hashtag);
  const limit = Math.min(options.limit ?? 10, 30);
  const keywords = [hashtag, `#${hashtag}`, `BLACKPINK ${hashtag}`, "Kim Jisoo", "Jisoo"];
  const feed = await parser.parseURL(googleNewsRssUrl(hashtag));

  const articles = feed.items
    .filter((item) => item.link && item.title)
    .map((item, index) => {
      const rawTitle = item.title ?? "";
      const sourceName = item.source ?? sourceFromTitle(rawTitle);
      const title = titleWithoutSource(rawTitle, sourceName);
      const excerpt = cleanHtml(item.contentSnippet ?? item.content)?.replace(sourceName, "").trim() ?? null;
      const searchableText = `${title} ${excerpt ?? ""}`;
      const matchedKeywords = matchKeywords(searchableText, keywords);

      return {
        id: item.guid ?? item.link ?? title,
        title,
        excerpt,
        url: item.link as string,
        imageUrl: null,
        author: item.creator ?? null,
        publishedAt: parseDate(item.isoDate ?? item.pubDate),
        matchedKeywords,
        score: scoreArticleMatch(title, excerpt ?? "", matchedKeywords),
        source: {
          name: sourceName,
          type: "RSS" as const
        },
        idol: {
          slug: "jisoo",
          name: "JISOO"
        }
      } satisfies LiveNewsArticle;
    })
    .filter((article) => article.matchedKeywords.length > 0)
    .sort((a, b) => {
      const timeA = a.publishedAt?.getTime() ?? 0;
      const timeB = b.publishedAt?.getTime() ?? 0;
      return timeB - timeA || b.score - a.score;
    })
    .slice(0, limit);

  return Promise.all(articles.map((article, index) => enrichArticleImage(article, index)));
}

export async function getCachedLiveHashtagNews(options: { hashtag?: string | null; limit?: number } = {}) {
  const hashtag = normalizeHashtag(options.hashtag);
  const limit = Math.min(options.limit ?? 10, 30);

  return getCachedData(`news:${hashtag}:${limit}`, LIVE_NEWS_CACHE_TTL_MS, () =>
    getLiveHashtagNews({ hashtag, limit })
  );
}
