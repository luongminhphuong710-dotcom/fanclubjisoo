import { json, unauthorizedUnlessCron } from "@/lib/http";
import { getLiveHashtagNews } from "@/lib/fallbackNews";
import { syncNews } from "@/services/newsSync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const unauthorized = unauthorizedUnlessCron(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const result = await syncNews();
    return json(result);
  } catch (error) {
    const liveNews = await getLiveHashtagNews({ hashtag: "JISOO", limit: 10 });

    return json({
      mode: "preview-without-database",
      message: "PostgreSQL is not connected, so cron cannot save articles yet.",
      hashtag: "#JISOO",
      previewCount: liveNews.length,
      preview: liveNews,
      error: error instanceof Error ? error.message : "Unknown news sync error"
    });
  }
}
