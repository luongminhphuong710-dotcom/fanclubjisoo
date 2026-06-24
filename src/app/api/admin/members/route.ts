import { isAdminRequest } from "@/lib/adminAuth";
import { json } from "@/lib/http";
import { listMembers } from "@/lib/members";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return json({ message: "Bạn cần đăng nhập admin." }, { status: 401 });
  }

  const members = await listMembers();
  return json({ data: members });
}
