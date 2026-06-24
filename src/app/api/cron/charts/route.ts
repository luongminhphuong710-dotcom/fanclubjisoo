import { json, unauthorizedUnlessCron } from "@/lib/http";
import { syncAllCharts } from "@/services/chartSync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const unauthorized = unauthorizedUnlessCron(request);
  if (unauthorized) {
    return unauthorized;
  }

  const result = await syncAllCharts();
  return json(result);
}
