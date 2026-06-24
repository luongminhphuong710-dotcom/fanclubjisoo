import { AboutSection } from "@/components/AboutSection";
import { BlogSection } from "@/components/BlogSection";
import { HeroBanner } from "@/components/HeroBanner";
import { MovieGallerySection } from "@/components/MovieGallerySection";
import { MusicRankingsSection } from "@/components/MusicRankingsSection";
import { NewsGallerySection } from "@/components/NewsGallerySection";
import { RegisterSection } from "@/components/RegisterSection";
import { SiteToolbar } from "@/components/SiteToolbar";
import { listBlogPosts } from "@/lib/blog";
import { getHomeData } from "@/lib/pageData";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [{ musicRankings, rankingsUpdatedAt, news, databaseReady, newsMode, updatedAt }, blogPosts] =
    await Promise.all([getHomeData(), listBlogPosts({ limit: 3 })]);

  return (
    <main className="shell">
      <SiteToolbar />
      <HeroBanner />

      <section className="singleColumn">
        <MusicRankingsSection tracks={musicRankings} updatedAt={rankingsUpdatedAt} />
        <NewsGallerySection databaseReady={databaseReady} news={news} newsMode={newsMode} updatedAt={updatedAt} />
      </section>

      <BlogSection posts={blogPosts} />
      <MovieGallerySection />
      <AboutSection />
      <RegisterSection />
    </main>
  );
}
