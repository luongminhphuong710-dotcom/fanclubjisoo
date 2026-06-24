import { json } from "@/lib/http";
import { getCachedMusicRankings } from "@/lib/musicRankings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const MUSIC_CACHE_HEADERS = {
  "cache-control": "public, max-age=0, s-maxage=300, stale-while-revalidate=600"
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 8), 20);
  const rankings = await getCachedMusicRankings({ limit });

  return json(
    {
      data: rankings.data,
      mode: "live-deezer-apple",
      artist: "JISOO",
      updatedAt: rankings.updatedAt,
      cache: rankings.cacheStatus
    },
    { headers: MUSIC_CACHE_HEADERS }
  );
}
