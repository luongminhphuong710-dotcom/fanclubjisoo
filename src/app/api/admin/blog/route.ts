import { z } from "zod";
import { isAdminRequest } from "@/lib/adminAuth";
import { createBlogPost, listBlogPosts } from "@/lib/blog";
import { json } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const blogPostSchema = z.object({
  title: z.string().trim().min(4).max(160),
  excerpt: z.string().trim().max(260).optional().default(""),
  body: z.string().trim().min(20).max(12000),
  imageUrl: z.string().trim().max(1_500_000).optional().default(""),
  tags: z.array(z.string().trim().max(40)).max(8).optional().default([]),
  published: z.boolean().optional().default(true)
});

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return json({ message: "Bạn cần đăng nhập admin." }, { status: 401 });
  }

  const posts = await listBlogPosts({ includeDrafts: true, limit: 100 });
  return json({ data: posts });
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return json({ message: "Bạn cần đăng nhập admin." }, { status: 401 });
  }

  const parsed = blogPostSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return json({ message: "Nội dung bài viết chưa hợp lệ." }, { status: 400 });
  }

  const post = await createBlogPost({ ...parsed.data, authorName: "Mia", authorEmail: "admin@jisoo.vn" });
  return json({ message: "Đã đăng bài blog.", post }, { status: 201 });
}
