import { z } from "zod";
import { json } from "@/lib/http";
import { registerMember } from "@/lib/members";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const memberSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(160),
  password: z.string().min(8).max(120),
  fanName: z.string().trim().max(80).optional().default(""),
  favoriteSong: z.string().trim().max(80).optional().default("")
});

export async function POST(request: Request) {
  const parsed = memberSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return json({ message: "Thông tin đăng ký chưa hợp lệ." }, { status: 400 });
  }

  const member = await registerMember(parsed.data);

  return json({
    message: "Tài khoản thành viên đã được tạo/cập nhật.",
    user: member
  });
}
