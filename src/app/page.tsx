import { AboutSection } from "@/components/AboutSection";
import { FanClubSection } from "@/components/FanClubSection";
import { HeroBanner } from "@/components/HeroBanner";
import { MovieGallerySection } from "@/components/MovieGallerySection";
import { MusicRankingsSection } from "@/components/MusicRankingsSection";
import { NewsGallerySection } from "@/components/NewsGallerySection";
import { SiteToolbar } from "@/components/SiteToolbar";
import { getHomeData } from "@/lib/pageData";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { musicRankings, rankingsUpdatedAt, news, databaseReady, newsMode, updatedAt } = await getHomeData();

  return (
    <main className="shell">
      <SiteToolbar />
      <HeroBanner />

      <section className="grid">
        <MusicRankingsSection tracks={musicRankings} updatedAt={rankingsUpdatedAt} />
        <NewsGallerySection databaseReady={databaseReady} news={news} newsMode={newsMode} updatedAt={updatedAt} />
      </section>

      <FanClubSection />
      <MovieGallerySection />
      <AboutSection />
    </main>
  );
}
