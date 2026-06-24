import { json } from "@/lib/http";
import { getMusicRankings } from "@/lib/musicRankings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 8), 20);
  const data = await getMusicRankings({ limit });

  return json(
    {
      data,
      mode: "live-deezer-apple",
      artist: "JISOO",
      updatedAt: new Date().toISOString()
    },
    { headers: { "cache-control": "no-store, max-age=0" } }
  );
}
