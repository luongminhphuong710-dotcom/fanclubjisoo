import { z } from "zod";
import { isAdminRequest } from "@/lib/adminAuth";
import { createBlogComment, listBlogComments } from "@/lib/blogComments";
import { json } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const commentSchema = z.object({
  body: z.string().trim().min(2).max(2000)
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  if (!isAdminRequest(request)) {
    return json({ message: "Bạn cần đăng nhập admin." }, { status: 401 });
  }

  const { id } = await context.params;
  const comments = await listBlogComments(id);
  return json({ data: comments });
}

export async function POST(request: Request, context: RouteContext) {
  if (!isAdminRequest(request)) {
    return json({ message: "Bạn cần đăng nhập admin." }, { status: 401 });
  }

  const parsed = commentSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return json({ message: "Nội dung bình luận chưa hợp lệ." }, { status: 400 });
  }

  const { id } = await context.params;
  const comment = await createBlogComment({
    postId: id,
    authorName: "Admin Mia",
    body: parsed.data.body
  });

  return json({ message: "Đã thêm bình luận admin.", comment }, { status: 201 });
}
