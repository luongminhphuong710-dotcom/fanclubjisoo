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
        title="Quản trị Blog JISOO"
        text="Đăng nhập tài khoản admin để đăng bài và cập nhật nội dung blog."
      />
      <AdminBlogEditor />
    </main>
  );
}
