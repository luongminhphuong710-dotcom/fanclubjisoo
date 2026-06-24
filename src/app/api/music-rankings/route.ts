import { json } from "@/lib/http";
import { getMusicRankings } from "@/lib/musicRankings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 8), 20);
  const data = await getMusicRankings({ limit });

  return json({
    data,
    mode: "live-deezer-apple",
    artist: "JISOO"
  });
}
