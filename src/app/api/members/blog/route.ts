import { z } from "zod";
import { createBlogPost } from "@/lib/blog";
import { json } from "@/lib/http";
import { getMemberFromRequest } from "@/lib/members";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const memberBlogSchema = z.object({
  title: z.string().trim().min(4).max(160),
  excerpt: z.string().trim().max(260).optional().default(""),
  body: z.string().trim().min(20).max(12000),
  imageUrl: z.string().trim().max(1_500_000).optional().default(""),
  tags: z.array(z.string().trim().max(40)).max(8).optional().default([])
});

export async function POST(request: Request) {
  const member = await getMemberFromRequest(request);

  if (!member) {
    return json({ message: "Bạn cần đăng nhập thành viên trước khi gửi bài." }, { status: 401 });
  }

  const parsed = memberBlogSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return json({ message: "Nội dung bài gửi chưa hợp lệ." }, { status: 400 });
  }

  const post = await createBlogPost({
    ...parsed.data,
    published: false,
    authorName: member.displayName,
    authorEmail: member.email
  });

  return json(
    {
      message: "Đã gửi bài blog. Bài sẽ hiển thị sau khi admin duyệt.",
      post
    },
    { status: 201 }
  );
}
