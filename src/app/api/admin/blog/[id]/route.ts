import { z } from "zod";
import { isAdminRequest } from "@/lib/adminAuth";
import { updateBlogPost } from "@/lib/blog";
import { json } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const blogPostSchema = z.object({
  title: z.string().trim().min(4).max(160),
  excerpt: z.string().trim().max(260).optional().default(""),
  body: z.string().trim().min(20).max(12000),
  imageUrl: z.string().trim().max(800).optional().default(""),
  tags: z.array(z.string().trim().max(40)).max(8).optional().default([]),
  published: z.boolean().optional().default(true)
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  if (!isAdminRequest(request)) {
    return json({ message: "Bạn cần đăng nhập admin." }, { status: 401 });
  }

  const parsed = blogPostSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return json({ message: "Nội dung bài viết chưa hợp lệ." }, { status: 400 });
  }

  const { id } = await context.params;
  const post = await updateBlogPost(id, parsed.data);
  return json({ message: "Đã cập nhật bài blog.", post });
}
