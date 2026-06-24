import { z } from "zod";
import { createAdminCookie, getAdminCredentials, verifyAdminCredentials } from "@/lib/adminAuth";
import { json } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1)
});

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  const credentials = getAdminCredentials();

  if (!credentials.configured) {
    return json({ message: "Chưa cấu hình tài khoản admin." }, { status: 503 });
  }

  if (!parsed.success || !verifyAdminCredentials(parsed.data.email, parsed.data.password)) {
    return json({ message: "Email hoặc mật khẩu admin chưa đúng." }, { status: 401 });
  }

  return json(
    {
      message: "Đăng nhập admin thành công.",
      admin: {
        email: credentials.email
      }
    },
    {
      headers: {
        "set-cookie": createAdminCookie()
      }
    }
  );
}
