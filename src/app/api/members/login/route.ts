import { z } from "zod";
import { json } from "@/lib/http";
import { authenticateMember, createMemberCookie } from "@/lib/members";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const loginSchema = z.object({
  email: z.string().trim().email().max(160),
  password: z.string().min(1).max(120)
});

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return json({ message: "Thông tin đăng nhập chưa hợp lệ." }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const member = await authenticateMember(email, password);

  if (!member) {
    return json({ message: "Email hoặc mật khẩu chưa đúng." }, { status: 401 });
  }

  return json(
    {
      message: "Đăng nhập thành viên thành công.",
      user: member
    },
    {
      headers: {
        "set-cookie": createMemberCookie(member.id, member.email)
      }
    }
  );
}
