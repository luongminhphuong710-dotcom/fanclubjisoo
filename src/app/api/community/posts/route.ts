import { db } from "@/lib/db";
import { json } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const take = Math.min(Number(url.searchParams.get("limit") ?? 20), 50);

  try {
    const posts = await db.communityPost.findMany({
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      take,
      include: {
        author: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            role: true
          }
        },
        _count: {
          select: {
            comments: true,
            likes: true
          }
        }
      }
    });

    return json({ data: posts, databaseReady: true });
  } catch {
    return json({ data: [], databaseReady: false });
  }
}
