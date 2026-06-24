import { clearAdminCookie } from "@/lib/adminAuth";
import { json } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return json(
    { message: "Đã đăng xuất admin." },
    {
      headers: {
        "set-cookie": clearAdminCookie()
      }
    }
  );
}
