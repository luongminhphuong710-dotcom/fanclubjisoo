import { Provider } from "@prisma/client";
import { db } from "@/lib/db";
import { json } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseProvider(value: string | null): Provider | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.toUpperCase();
  return Object.values(Provider).includes(normalized as Provider) ? (normalized as Provider) : undefined;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const provider = parseProvider(url.searchParams.get("provider"));
  const take = Math.min(Number(url.searchParams.get("limit") ?? 20), 100);

  try {
    const snapshot = await db.chartSnapshot.findFirst({
      where: provider ? { provider } : undefined,
      orderBy: { capturedAt: "desc" },
      include: {
        entries: {
          orderBy: [{ rank: "asc" }, { metricValue: "desc" }],
          take,
          include: {
            track: true
          }
        }
      }
    });

    if (!snapshot) {
      return json({ data: null, entries: [], databaseReady: true });
    }

    return json({
      data: {
        id: snapshot.id,
        provider: snapshot.provider,
        market: snapshot.market,
        capturedAt: snapshot.capturedAt,
        entries: snapshot.entries.map((entry) => ({
          id: entry.id,
          rank: entry.rank,
          title: entry.title,
          artistName: entry.artistName,
          metricName: entry.metricName,
          metricValue: entry.metricValue?.toString() ?? null,
          metricText: entry.metricText,
          coverUrl: entry.track?.coverUrl ?? null,
          providerUrl: entry.track?.providerUrl ?? null
        }))
      },
      databaseReady: true
    });
  } catch {
    return json({ data: null, entries: [], databaseReady: false });
  }
}
