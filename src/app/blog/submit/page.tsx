import { HeroBanner } from "@/components/HeroBanner";
import { MemberBlogSubmitForm } from "@/components/MemberBlogSubmitForm";
import { SiteToolbar } from "@/components/SiteToolbar";

export const dynamic = "force-dynamic";

export default function BlogSubmitPage() {
  return (
    <main className="shell">
      <SiteToolbar />
      <HeroBanner
        compact
        eyebrow="Blog"
        title="Gửi bài cộng đồng JISOO"
        text="Thành viên có thể gửi bài, ảnh và hashtag. Admin sẽ duyệt trước khi bài xuất hiện công khai."
      />
      <MemberBlogSubmitForm />
    </main>
  );
}
