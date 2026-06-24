import { BlogSection } from "@/components/BlogSection";
import { HeroBanner } from "@/components/HeroBanner";
import { SiteToolbar } from "@/components/SiteToolbar";
import { listBlogPosts } from "@/lib/blog";

export const dynamic = "force-dynamic";

export default async function BlogPage() {
  const posts = await listBlogPosts({ limit: 20 });

  return (
    <main className="shell">
      <SiteToolbar />
      <HeroBanner
        compact
        eyebrow="Blog"
        title="Blog JISOO Vietnam Fanclub"
        text="Nơi admin Mia đăng bài, cập nhật câu chuyện, hình ảnh, âm nhạc và hoạt động mới về JISOO."
      />
      <BlogSection posts={posts} />
    </main>
  );
}
