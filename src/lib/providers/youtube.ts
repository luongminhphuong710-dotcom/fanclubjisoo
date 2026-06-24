type YouTubeVideoResponse = {
  items?: Array<{
    id: string;
    snippet?: {
      title?: string;
      channelTitle?: string;
      publishedAt?: string;
      thumbnails?: Record<string, { url: string; width?: number; height?: number }>;
    };
    statistics?: {
      viewCount?: string;
      likeCount?: string;
      commentCount?: string;
    };
  }>;
};

export type YouTubeVideoStat = {
  id: string;
  title: string;
  channelTitle: string;
  publishedAt: string | null;
  thumbnailUrl: string | null;
  viewCount: bigint;
  likeCount: bigint | null;
  commentCount: bigint | null;
};

function parseBigInt(value: string | undefined): bigint | null {
  if (!value) {
    return null;
  }

  return BigInt(value);
}

export async function getYouTubeVideoStatistics(videoIds: string[]): Promise<YouTubeVideoStat[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    throw new Error("Missing YOUTUBE_API_KEY");
  }

  if (videoIds.length === 0) {
    return [];
  }

  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.set("part", "snippet,statistics");
  url.searchParams.set("id", videoIds.slice(0, 50).join(","));
  url.searchParams.set("key", apiKey);

  const response = await fetch(url, { next: { revalidate: 0 } });
  if (!response.ok) {
    throw new Error(`YouTube videos request failed: ${response.status}`);
  }

  const data = (await response.json()) as YouTubeVideoResponse;

  return (data.items ?? []).map((item) => {
    const thumbnails = item.snippet?.thumbnails ?? {};
    const thumbnail =
      thumbnails.maxres ?? thumbnails.standard ?? thumbnails.high ?? thumbnails.medium ?? thumbnails.default;

    return {
      id: item.id,
      title: item.snippet?.title ?? "Untitled video",
      channelTitle: item.snippet?.channelTitle ?? "Unknown channel",
      publishedAt: item.snippet?.publishedAt ?? null,
      thumbnailUrl: thumbnail?.url ?? null,
      viewCount: parseBigInt(item.statistics?.viewCount) ?? 0n,
      likeCount: parseBigInt(item.statistics?.likeCount),
      commentCount: parseBigInt(item.statistics?.commentCount)
    };
  });
}
