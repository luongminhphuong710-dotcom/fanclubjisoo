import { BlogSection } from "@/components/BlogSection";
import { HeroBanner } from "@/components/HeroBanner";
import { SiteToolbar } from "@/components/SiteToolbar";
import { listBlogPosts, listBlogTags } from "@/lib/blog";

export const dynamic = "force-dynamic";

type BlogPageProps = {
  searchParams: Promise<{
    tag?: string;
  }>;
};

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const { tag } = await searchParams;
  const [posts, tags] = await Promise.all([listBlogPosts({ limit: 100, tag }), listBlogTags()]);

  return (
    <main className="shell">
      <SiteToolbar />
      <HeroBanner
        compact
        eyebrow="Blog"
        title="Blog JISOO Vietnam Fanclub"
        text="Đọc các bài viết mới về JISOO, lọc theo hashtag và mở từng bài để xem đầy đủ nội dung."
      />
      <BlogSection posts={posts} selectedTag={tag} showFilters tags={tags} />
    </main>
  );
}
