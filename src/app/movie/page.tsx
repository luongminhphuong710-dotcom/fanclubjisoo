import { HeroBanner } from "@/components/HeroBanner";
import { MovieGallerySection } from "@/components/MovieGallerySection";
import { SiteToolbar } from "@/components/SiteToolbar";

export default function MoviePage() {
  return (
    <main className="shell">
      <SiteToolbar />
      <HeroBanner
        compact
        eyebrow="Movie"
        title="Phim và series của JISOO"
        text="Thư viện phim, series và vai cameo của JISOO với poster và link xem/tham khảo uy tín."
      />
      <MovieGallerySection />
    </main>
  );
}
