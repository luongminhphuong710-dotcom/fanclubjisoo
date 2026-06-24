import { AdminBlogEditor } from "@/components/AdminBlogEditor";
import { HeroBanner } from "@/components/HeroBanner";
import { SiteToolbar } from "@/components/SiteToolbar";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  return (
    <main className="shell">
      <SiteToolbar />
      <HeroBanner
        compact
        eyebrow="Admin"
        title="Quản trị JISOO Fanclub"
        text="Đăng nhập tài khoản admin để đăng blog, duyệt bài thành viên, bình luận và xem danh sách thành viên."
      />
      <AdminBlogEditor />
    </main>
  );
}
